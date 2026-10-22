/**
 * SEO multilingue (fr sans préfixe, de sous /de) : canonical, hreflang, titres uniques, h1 unique,
 * JSON-LD fidèle, robots.txt, sitemap avec alternates, noindex des pages à jeton, manifest.
 */
import { expect, test, type Page } from '@playwright/test';

const PAGES = ['/', '/coiffures', '/faq', '/contact', '/infos-pratiques', '/galerie'];
const LOCALES = [
  { code: 'fr', prefix: '' },
  { code: 'de', prefix: '/de' },
] as const;

type Ld = Record<string, unknown> & { '@type': string };

async function jsonLd(page: Page): Promise<Ld[]> {
  const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return texts.map((text) => JSON.parse(text) as Ld);
}

const seenTitles = new Map<string, string>();

for (const { code, prefix } of LOCALES) {
  test.describe(`SEO ${code}`, () => {
    for (const path of PAGES) {
      const url = prefix + (path === '/' ? (prefix ? '' : '/') : path);
      test(`métadonnées de ${url}`, async ({ page }) => {
        const res = await page.goto(url);
        expect(res?.status()).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('lang', code);
        await expect(page.locator('h1')).toHaveCount(1);

        const title = await page.title();
        expect(title.length).toBeGreaterThan(5);
        const clash = seenTitles.get(title);
        expect(clash, `titre dupliqué « ${title} » (${clash} / ${url})`).toBeUndefined();
        seenTitles.set(title, url);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{30,}/);

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(new URL(canonical!).pathname).toBe(url);
        const alternates = await page
          .locator('link[rel="alternate"][hreflang]')
          .evaluateAll((els) =>
            Object.fromEntries(
              els.map((e) => [e.getAttribute('hreflang'), e.getAttribute('href')]),
            ),
          );
        expect(new URL(alternates['fr']!).pathname).toBe(path);
        expect(new URL(alternates['de']!).pathname).toBe(path === '/' ? '/de' : `/de${path}`);
        expect(alternates['x-default']).toBe(alternates['fr']);
        await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
          'content',
          code === 'fr' ? 'fr_DE' : 'de_DE',
        );
        const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
        expect(new URL(ogImage!).pathname).toBe(`${prefix}/opengraph-image`);
        for (const img of await page.locator('main img').all()) {
          expect(await img.getAttribute('alt')).not.toBeNull();
        }
      });
    }

    test(`JSON-LD de ${code}`, async ({ page }) => {
      await page.goto(prefix || '/');
      const home = await jsonLd(page);
      const business = home.find((x) => x['@type'] === 'HealthAndBeautyBusiness') as Ld;
      expect(business).toBeTruthy();
      expect(business['sameAs']).toContain('https://www.tiktok.com/@sarielle6');
      expect(business['openingHoursSpecification']).toHaveLength(7);
      expect(business['inLanguage']).toBe(code);
      expect(business['telephone']).toBeUndefined();

      await page.goto(`${prefix}/faq`);
      const faq = await jsonLd(page);
      expect(faq.some((x) => x['@type'] === 'BreadcrumbList')).toBe(true);
      const faqLd = faq.find((x) => x['@type'] === 'FAQPage') as Ld;
      expect((faqLd['mainEntity'] as unknown[]).length).toBeGreaterThan(3);

      await page.goto(`${prefix}/coiffures`);
      const firstService = await page
        .locator(`a[href^="${prefix}/coiffures/"]`)
        .first()
        .getAttribute('href');
      await page.goto(firstService!);
      const service = await jsonLd(page);
      expect(service.some((x) => x['@type'] === 'BreadcrumbList')).toBe(true);
      const serviceLd = service.find((x) => x['@type'] === 'Service' && x['offers']) as
        Ld | undefined;
      if (serviceLd) {
        expect(JSON.stringify(serviceLd['offers'])).toContain('"priceCurrency":"EUR"');
      }
      // Aucune note inventée : AggregateRating seulement avec de vrais avis affichés.
      const rated = service.find((x) => x['aggregateRating']);
      const visibleReviews = await page.locator('#avis article, #avis li').count();
      if (!visibleReviews) expect(rated).toBeUndefined();
    });
  });
}

test.describe('SEO transverse', () => {
  test('robots.txt exclut espace privé et pages à jeton, fr et de', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    for (const rule of [
      '/dashboard/',
      '/api/',
      '/connexion',
      '/annulation/',
      '/avis/',
      '/de/annulation/',
      '/de/avis/',
    ]) {
      expect(body).toContain(`Disallow: ${rule}`);
    }
    expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test('sitemap multilingue avec alternates et prestations', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('xhtml:link');
    expect(xml).toMatch(/hreflang="de"/);
    expect(xml).toMatch(/hreflang="x-default"/);
    expect(xml).toMatch(/<loc>[^<]*\/de\/faq<\/loc>/);
    expect(xml).toMatch(/<loc>[^<]*\/coiffures\/[a-z0-9-]+<\/loc>/);
    expect(xml).toMatch(/<loc>[^<]*\/de\/coiffures\/[a-z0-9-]+<\/loc>/);
    expect(xml).not.toContain('/dashboard');
    expect(xml).not.toContain('/annulation');
  });

  test('pages à jeton et 404 en noindex', async ({ page }) => {
    for (const url of [
      '/annulation/' + 'a'.repeat(64),
      '/de/annulation/' + 'a'.repeat(64),
      '/de/avis/xyz',
      '/de/nicht-da',
    ]) {
      await page.goto(url);
      const robots = await page
        .locator('meta[name="robots"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('content') ?? ''));
      expect(robots.length).toBeGreaterThan(0);
      for (const content of robots) expect(content).toMatch(/noindex/);
    }
  });

  test('manifest, icônes et images sociales par langue', async ({ request }) => {
    const manifest = await request.get('/site.webmanifest');
    expect(manifest.status()).toBe(200);
    const json = (await manifest.json()) as { icons: Array<{ src: string }> };
    for (const icon of json.icons) expect((await request.get(icon.src)).status()).toBe(200);
    for (const url of ['/opengraph-image', '/de/opengraph-image', '/twitter-image']) {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }
  });
});

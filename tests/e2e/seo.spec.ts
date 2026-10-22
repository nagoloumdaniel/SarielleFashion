import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

function readEnv(name: string): string | undefined {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"]*)"?\\s*$`));
      if (match?.[1]) return match[1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function login(page: Page): Promise<void> {
  await page.goto('/connexion?callbackUrl=/dashboard');
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL || readEnv('AUTH_ADMIN_EMAIL') || '');
  await page
    .locator('input[name="password"]')
    .fill(ADMIN_PASSWORD || readEnv('AUTH_ADMIN_PASSWORD') || '');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
}

test.describe('SEO et métadonnées', () => {
  test('should expose complete public metadata and social tags', async ({ page, request }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Hairstyle by Patricia/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /localhost:3000\/?$/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();

    const og = await request.get('/opengraph-image');
    expect(og.status()).toBe(200);
    expect(og.headers()['content-type']).toContain('image/png');

    await page.goto('/coiffures');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/coiffures$/);
  });

  test('should publish robots and sitemap rules', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain('Disallow: /dashboard');
    expect(robotsBody).toContain('Sitemap:');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain('/demandes-personnalisees');
    expect(sitemapBody).toContain('/coiffures');
  });

  test('should mark the dashboard as noindex', async ({ page }) => {
    if (ADMIN_EMAIL === '' && readEnv('AUTH_ADMIN_EMAIL') === undefined) {
      test.skip(true, 'Identifiants admin absents.');
    }
    await login(page);
    await page.goto('/dashboard');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

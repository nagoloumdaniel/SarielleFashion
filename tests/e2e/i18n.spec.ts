/**
 * i18n : site bilingue (français sans préfixe, allemand sous /de).
 * Vérifie html lang, hreflang/canonical, sélecteur de langue, pages clés en allemand,
 * redirections de routes privées et absence de préfixe /fr.
 */
import { expect, test } from '@playwright/test';

const DE_PAGES = ['/de', '/de/coiffures', '/de/faq', '/de/contact', '/de/infos-pratiques'];

test.describe('i18n fr/de', () => {
  test('le français reste sans préfixe avec lang=fr', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  for (const path of DE_PAGES) {
    test(`page allemande ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
      // Les liens internes conservent le préfixe /de.
      const hrefs = await page
        .locator('header nav[aria-label="Hauptnavigation"] a[href^="/"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) expect(href.startsWith('/de')).toBe(true);
    });
  }

  test('canonical et hreflang fr/de/x-default', async ({ page }) => {
    await page.goto('/de/faq');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toMatch(/\/de\/faq$/);
    const langs = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((els) =>
        Object.fromEntries(els.map((e) => [e.getAttribute('hreflang'), e.getAttribute('href')])),
      );
    expect(langs['de']).toMatch(/\/de\/faq$/);
    expect(langs['fr']).toMatch(/\/faq$/);
    expect(langs['fr']).not.toMatch(/\/de\//);
    expect(langs['x-default']).toBe(langs['fr']);
  });

  test('le sélecteur de langue conserve la page et bascule', async ({ page }) => {
    await page.goto('/coiffures');
    const switcher = page.getByRole('navigation', { name: 'Langue' }).first();
    await switcher.getByRole('link', { name: /Deutsch/ }).click();
    await expect(page).toHaveURL(/\/de\/coiffures$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    const back = page.getByRole('navigation', { name: 'Sprache' }).first();
    await expect(back.locator('[aria-current="true"]')).toHaveText('DE');
    await back.getByRole('link', { name: /Français/ }).click();
    await expect(page).toHaveURL(/\/coiffures$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('routes privées non localisées et /fr redirigé', async ({ request }) => {
    const priv = await request.get('/de/dashboard', { maxRedirects: 0 });
    expect(priv.status()).toBe(308);
    expect(priv.headers()['location']).toContain('/dashboard');
    const fr = await request.get('/fr/faq', { maxRedirects: 0 });
    expect(fr.status()).toBe(308);
    expect(new URL(fr.headers()['location']!, 'http://x').pathname).toBe('/faq');
  });

  test('404 allemande', async ({ page }) => {
    const response = await page.goto('/de/gibt-es-nicht');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });
});

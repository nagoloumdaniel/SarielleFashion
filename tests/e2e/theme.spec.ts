/**
 * Thème clair / sombre : détection au chargement, persistance et couverture
 * de toutes les interfaces (public, catalogue, réservation, dashboard, mobile).
 *
 * Preuves : attribut data-theme sur <html>, couleurs calculées, préférence
 * enregistrée, absence d'erreur console, captures desktop et mobile.
 */

import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

const TOGGLE = 'header button[data-theme-toggle]:visible';

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

const envEmail = process.env.E2E_ADMIN_EMAIL ?? readEnv('AUTH_ADMIN_EMAIL') ?? ADMIN_EMAIL;
const envPassword =
  process.env.E2E_ADMIN_PASSWORD ?? readEnv('AUTH_ADMIN_PASSWORD') ?? ADMIN_PASSWORD;

async function login(page: Page, callbackUrl = '/dashboard/calendrier'): Promise<void> {
  await page.goto(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel('E-mail').fill(envEmail);
  await page.locator('input[name="password"]').fill(envPassword);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
}

async function dashboardIsLight(page: Page): Promise<void> {
  // Pas de bascule de thème dans le dashboard : seul l'attribut est vérifié.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
}

async function themeIs(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  const visibleIcon = theme === 'dark' ? '.theme-icon-dark:visible' : '.theme-icon-light:visible';
  await expect(page.locator(visibleIcon).first()).toBeVisible();
}

async function bodyColors(page: Page): Promise<{ background: string; color: string }> {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.body);
    return { background: styles.backgroundColor, color: styles.color };
  });
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `débordement horizontal sur ${label}`).toBeLessThanOrEqual(1);
}

async function trackConsoleErrors(page: Page, errors: string[]): Promise<void> {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
}

test.describe('Thème clair et sombre', () => {
  test('should detect the system light theme, toggle to dark and persist after reload', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();
    const errors: string[] = [];
    await trackConsoleErrors(page, errors);

    await page.goto('/');
    await themeIs(page, 'light');
    await expect
      .poll(async () => (await bodyColors(page)).background, { timeout: 2000 })
      .toBe('rgb(255, 248, 247)');
    expect((await bodyColors(page)).color).toBe('rgb(39, 23, 25)');
    await page.screenshot({
      path: 'tests/e2e/screenshots/theme-light-home.png',
      fullPage: true,
      caret: 'initial',
    });

    await page.locator(TOGGLE).click();
    await themeIs(page, 'dark');
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(async () => (await bodyColors(page)).background, { timeout: 2000 })
      .toBe('rgb(21, 16, 17)');
    expect((await bodyColors(page)).color).toBe('rgb(255, 244, 242)');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe('#151011');
    await page.screenshot({
      path: 'tests/e2e/screenshots/theme-dark-home.png',
      fullPage: true,
      caret: 'initial',
    });

    await page.reload();
    await themeIs(page, 'dark');

    await page.goto('/coiffures');
    await themeIs(page, 'dark');
    await assertNoOverflow(page, '/coiffures en sombre');
    await page.screenshot({
      path: 'tests/e2e/screenshots/theme-dark-catalogue.png',
      fullPage: true,
      caret: 'initial',
    });

    expect(errors, errors.join('\n')).toEqual([]);
    await context.close();
  });

  test('should follow the system dark preference and let the user switch back to light', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    const errors: string[] = [];
    await trackConsoleErrors(page, errors);

    await page.goto('/reserver');
    await themeIs(page, 'dark');

    await page.locator(TOGGLE).focus();
    await page.keyboard.press('Space');
    await themeIs(page, 'light');
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

    await page.reload();
    await themeIs(page, 'light');
    expect(errors, errors.join('\n')).toEqual([]);
    await context.close();
  });

  test('should keep the theme across navigation and apply it to the dashboard', async ({
    browser,
  }) => {
    test.skip(envEmail === '' || envPassword === '', 'Identifiants admin absents.');
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();
    const errors: string[] = [];
    await trackConsoleErrors(page, errors);

    await page.goto('/');
    await page.locator(TOGGLE).click();
    await themeIs(page, 'dark');

    // Design : dashboard toujours en thème clair (DashboardThemeLock, DESIGN-RULES.md).
    await login(page);
    await dashboardIsLight(page);
    await expect(page.getByRole('heading', { name: 'Calendrier' })).toBeVisible();
    await expect(page.getByText('Chargement du calendrier…')).toBeHidden({ timeout: 20_000 });

    await page.goto('/dashboard/reservations');
    await dashboardIsLight(page);
    await assertNoOverflow(page, 'réservations en sombre');

    await page.goto('/dashboard/disponibilites');
    await dashboardIsLight(page);
    await expect(page.getByRole('heading', { name: 'Disponibilités', exact: true })).toBeVisible();
    await assertNoOverflow(page, 'disponibilités en sombre');

    await page.goto('/dashboard/calendrier');
    await dashboardIsLight(page);
    await expect(page.getByText('Chargement du calendrier…')).toBeHidden({ timeout: 20_000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: 'tests/e2e/screenshots/theme-dark-calendar.png',
      fullPage: true,
      caret: 'initial',
    });

    expect(errors, errors.join('\n')).toEqual([]);
    await context.close();
  });

  test('should show the toggle on mobile and keep dark mode without overflow', async ({
    browser,
  }) => {
    test.skip(envEmail === '' || envPassword === '', 'Identifiants admin absents.');
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      colorScheme: 'light',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    await trackConsoleErrors(page, errors);

    await page.goto('/');
    await expect(page.locator(TOGGLE)).toBeVisible();
    await page.locator(TOGGLE).click();
    await themeIs(page, 'dark');
    await expect
      .poll(async () => (await bodyColors(page)).background, { timeout: 2000 })
      .toBe('rgb(21, 16, 17)');
    await assertNoOverflow(page, 'accueil mobile en sombre');
    await page.waitForTimeout(250);
    await page.screenshot({
      path: 'tests/e2e/screenshots/theme-dark-mobile.png',
      caret: 'initial',
    });

    await page.goto('/coiffures');
    await themeIs(page, 'dark');
    await assertNoOverflow(page, 'catalogue mobile en sombre');

    await page.goto('/reserver');
    await themeIs(page, 'dark');
    await assertNoOverflow(page, 'réservation mobile en sombre');

    await login(page);
    await dashboardIsLight(page);
    await assertNoOverflow(page, 'dashboard mobile en sombre');

    expect(errors, errors.join('\n')).toEqual([]);
    await context.close();
  });
});

/**
 * P10.5 : parcours public et dashboard sur desktop, tablette et mobile.
 * Vérifie l'absence de débordement horizontal, les titres, les images
 * chargées, le lien d'évitement et l'accès au thème.
 */

import { readFileSync } from 'node:fs';
import { devices, test, expect, type Page } from '@playwright/test';

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

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `débordement horizontal sur ${label}`).toBeLessThanOrEqual(1);
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

test.describe('Responsive et accessibilité de base', () => {
  test('should load public pages without overflow and with loaded images', async ({ page }) => {
    test.setTimeout(120_000);
    const paths = [
      '/',
      '/coiffures',
      '/reserver',
      '/contact',
      '/faq',
      '/demandes-personnalisees',
      '/confidentialite',
    ];

    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await assertNoOverflow(page, path);
    }

    await page.goto('/coiffures');
    const firstService = page.locator('a[href^="/coiffures/"]:not([aria-hidden="true"])').first();
    // Catalogue vide (base fraîchement nettoyée) : pas de fiche à contrôler.
    if ((await firstService.count()) === 0) {
      test.info().annotations.push({ type: 'skip-part', description: 'Catalogue vide' });
      return;
    }
    const href = await firstService.getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await assertNoOverflow(page, href!);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.alt || image.src.slice(0, 80)),
    );
    expect(broken, broken.join(', ')).toEqual([]);
  });

  test('should keep the skip link and theme toggle reachable', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.getByRole('link', { name: 'Aller au contenu' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(page.locator('header button[data-theme-toggle]:visible')).toBeVisible();
  });

  test('should keep dashboard pages usable without horizontal overflow', async ({ page }) => {
    test.skip(
      ADMIN_EMAIL === '' && readEnv('AUTH_ADMIN_EMAIL') === undefined,
      'Identifiants admin absents.',
    );
    test.setTimeout(120_000);
    await login(page);
    for (const path of [
      '/dashboard',
      '/dashboard/calendrier',
      '/dashboard/reservations',
      '/dashboard/messages',
      '/dashboard/notifications',
      '/dashboard/demandes',
      '/dashboard/clients',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await assertNoOverflow(page, path);
    }
  });

  test('should render on an iPhone viewport', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Une seule exécution suffit.');
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await assertNoOverflow(page, 'iPhone');
    await page.goto('/reserver');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await assertNoOverflow(page, 'réservation iPhone');
    await context.close();
  });

  test('should have no serious or critical axe violations', async ({ page }) => {
    test.setTimeout(180_000);
    const axeModule = (await import('axe-core')) as {
      source?: string;
      default?: { source?: string };
    };
    const axeSource = axeModule.source ?? axeModule.default?.source ?? '';
    expect(axeSource.length).toBeGreaterThan(0);
    const pages = ['/', '/coiffures', '/reserver', '/contact', '/demandes-personnalisees', '/faq'];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForTimeout(1500); // laisse finir l'animation d'entrée des titres
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const results = await (
          window as unknown as {
            axe: {
              run: (context: unknown) => Promise<{
                violations: Array<{ id: string; impact: string | null; nodes: unknown[] }>;
              }>;
            };
          }
        ).axe.run(document);
        return results.violations
          .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
          .map((violation) => ({ id: violation.id, nodes: violation.nodes.length }));
      });
      expect(violations, `${path}: ${JSON.stringify(violations)}`).toEqual([]);
    }

    if (ADMIN_EMAIL !== '' || readEnv('AUTH_ADMIN_EMAIL') !== undefined) {
      await login(page);
      for (const path of ['/dashboard', '/dashboard/calendrier', '/dashboard/notifications']) {
        await page.goto(path);
        await page.waitForTimeout(1500); // laisse finir l'animation d'entrée des titres
        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate(async () => {
          const results = await (
            window as unknown as {
              axe: {
                run: (context: unknown) => Promise<{
                  violations: Array<{ id: string; impact: string | null; nodes: unknown[] }>;
                }>;
              };
            }
          ).axe.run(document);
          return results.violations
            .filter(
              (violation) => violation.impact === 'serious' || violation.impact === 'critical',
            )
            .map((violation) => ({
              id: violation.id,
              nodes: violation.nodes.length,
              sample: (violation.nodes as Array<{ html: string }>)
                .slice(0, 3)
                .map((n) => n.html.slice(0, 140)),
            }));
        });
        expect(violations, `${path}: ${JSON.stringify(violations)}`).toEqual([]);
      }
    }
  });
});

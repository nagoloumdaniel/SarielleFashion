/**
 * Infos métier Sarielle : TikTok, horaires 5h - 22h, aucun téléphone du salon,
 * paiement sur place (espèces ou virement), délai d'annulation en minutes,
 * frais de déplacement « à partir de X € », aucune mention fiscale.
 */

import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import type { PrismaClient } from '@prisma/client';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

function readEnv(name: string): string | undefined {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const match = line.match(new RegExp(`^\s*${name}\s*=\s*"?([^"]*)"?\s*$`));
      if (match?.[1]) return match[1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}
const envDatabaseUrl = readEnv('DATABASE_URL');
if (envDatabaseUrl) process.env.DATABASE_URL = envDatabaseUrl;

const FORBIDDEN = /steuernummer|ust-?id|\bUStG\b|\bTVA\b|umsatzsteuer/i;

test.describe('Infos métier : pages publiques', () => {
  test('should show TikTok, hours and no salon phone on the contact page', async ({ page }) => {
    await page.goto('/contact');
    const tiktok = page.getByRole('link', { name: /TikTok/ }).first();
    await expect(tiktok).toHaveAttribute('href', /tiktok\.com\/@sarielle6/);
    await expect(page.getByText('Lundi - Dimanche : 5h - 22h')).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  });

  test('should show TikTok in the footer and the hours on the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer').getByRole('link', { name: /TikTok/ })).toBeVisible();
    await expect(page.getByText('Lundi - Dimanche : 5h - 22h')).toBeVisible();
  });

  test('should expose 7 opening days in the JSON-LD, without phone', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const json = scripts.find((text) => text.includes('openingHoursSpecification'));
    expect(json).toBeTruthy();
    const business = JSON.parse(json ?? '{}');
    expect(business.openingHoursSpecification).toHaveLength(7);
    expect(business.openingHoursSpecification[0]).toMatchObject({
      opens: '05:00',
      closes: '22:00',
    });
    expect(business.telephone).toBeUndefined();
  });

  test('should state payment on site by cash or transfer, and the 30 minute delay', async ({
    page,
  }) => {
    await page.goto('/infos-pratiques');
    await expect(page.getByRole('heading', { name: 'Paiement', exact: true })).toBeVisible();
    await expect(page.getByText(/en espèces ou par virement/).first()).toBeVisible();
    await expect(page.getByText('Lundi - Dimanche : 5h - 22h')).toBeVisible();
    await expect(page.getByText(/30 minutes/).first()).toBeVisible();
    await expect(page.getByText('Téléphone', { exact: true })).toHaveCount(0);

    await page.goto('/faq');
    await page.getByRole('button', { name: /Comment et quand puis-je payer/ }).click();
    await expect(page.getByText(/en espèces ou par virement/)).toBeVisible();
    await page.getByRole('button', { name: /politique d’annulation/ }).click();
    await expect(page.getByText(/jusqu’à 30 minutes avant/)).toBeVisible();
  });

  test('should keep legal pages free of fiscal mentions', async ({ page }) => {
    for (const path of ['/mentions-legales', '/confidentialite', '/infos-pratiques', '/faq']) {
      await page.goto(path);
      const text = await page.locator('body').innerText();
      expect(text, path).not.toMatch(FORBIDDEN);
    }
    await page.goto('/mentions-legales');
    await expect(page.getByText('Clausthal-Zellerfeld, Allemagne')).toBeVisible();
    await expect(page.getByText('sarielletalla@gmail.com').first()).toBeVisible();
  });
});

test.describe('Infos métier : paramètres dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  let db: PrismaClient;
  let original: {
    minCancelNoticeMinutes: number;
    homeServiceEnabled: boolean;
    travelFeeCents: number;
  };

  test.beforeAll(async () => {
    const { PrismaClient: Client } = await import('@prisma/client');
    db = new Client();
    const row = await db.salonSettings.findUniqueOrThrow({ where: { id: 1 } });
    original = {
      minCancelNoticeMinutes: row.minCancelNoticeMinutes,
      homeServiceEnabled: row.homeServiceEnabled,
      travelFeeCents: row.travelFeeCents,
    };
  });

  test.afterAll(async () => {
    await db.salonSettings.update({ where: { id: 1 }, data: original });
    await db.$disconnect();
  });

  async function login(page: Page, callbackUrl: string): Promise<void> {
    await page.goto(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
  }

  test('should save the cancellation delay in minutes and reflect it publicly', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page, '/dashboard/disponibilites');
    const input = page.getByLabel('Délai minimum d’annulation (min)');
    await expect(input).toHaveValue(String(original.minCancelNoticeMinutes));
    await input.fill('45');
    await page.getByRole('button', { name: 'Enregistrer les paramètres' }).click();
    await expect(page.getByText('Paramètres de réservation enregistrés.').first()).toBeVisible({
      timeout: 20_000,
    });
    const row = await db.salonSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(row.minCancelNoticeMinutes).toBe(45);

    await page.goto('/infos-pratiques');
    await expect(page.getByText(/jusqu’à 45 minutes avant/).first()).toBeVisible();
  });

  test('should have no salon phone field and announce the fixed travel fee', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page, '/dashboard/parametres');
    await page.getByLabel('Proposer la coiffure à domicile').check();
    await page.getByLabel('Frais de déplacement (€)').fill('15');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Paramètres enregistrés.').first()).toBeVisible();
    await expect(page.getByLabel('Nom professionnel')).toBeVisible();
    await expect(page.getByLabel('Téléphone')).toHaveCount(0);

    await page.goto('/faq');
    await page.getByRole('button', { name: /Te déplaces-tu à domicile/ }).click();
    await expect(page.getByText(/à partir de 15\s€/)).toBeVisible();
    await page.goto('/infos-pratiques');
    await expect(page.getByText(/à partir de 15\s€/)).toBeVisible();
  });
});

/**
 * P9.11 : recette sécurité.
 * Vérifie les accès serveur, les en-têtes, les cookies, l'export RGPD,
 * la purge de rétention, la sonde de santé et l'échappement XSS.
 */

import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const stamp = Date.now().toString(36);
const prefix = `zz-e2e-sec-${stamp}`;
const categorySlug = `${prefix}-cat`;
const serviceSlug = `${prefix}-service`;
const customerEmail = `${prefix}@example.com`;
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

const envDatabaseUrl = readEnv('DATABASE_URL');
if (envDatabaseUrl) process.env.DATABASE_URL = envDatabaseUrl;
const CRON_SECRET = readEnv('CRON_SECRET') ?? '';

/* eslint-disable @typescript-eslint/no-explicit-any */
let db: any;
/* eslint-enable @typescript-eslint/no-explicit-any */
let categoryId = '';
let serviceId = '';
let customerId = '';
let appointmentId = '';
let assessmentId = '';
let requestId = '';

async function login(page: Page): Promise<void> {
  await page.goto('/connexion?callbackUrl=/dashboard');
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
}

async function cleanup(): Promise<void> {
  if (!db) return;
  const notifications = await db.notification.findMany({
    where: {
      OR: [{ recipient: { startsWith: prefix } }, { link: { contains: requestId || 'none' } }],
    },
    select: { id: true },
  });
  await db.notification.deleteMany({
    where: { id: { in: notifications.map((row: { id: string }) => row.id) } },
  });
  if (requestId) {
    await db.customRequestDecision.deleteMany({ where: { customRequestId: requestId } });
    await db.customRequest.deleteMany({ where: { id: requestId } });
  }
  if (assessmentId) await db.hairAssessment.deleteMany({ where: { id: assessmentId } });
  if (appointmentId) await db.appointment.deleteMany({ where: { id: appointmentId } });
  if (customerId) await db.customer.deleteMany({ where: { id: customerId } });
  if (serviceId) await db.service.deleteMany({ where: { id: serviceId } });
  if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
  await db.auditLog.deleteMany({
    where: {
      OR: [
        { entityType: 'Customer', entityId: customerId || 'none' },
        { entityType: 'CustomRequest', entityId: requestId || 'none' },
      ],
    },
  });
  await db.$disconnect();
}

test.describe('Sécurité et RGPD', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    db = new PrismaClient();
    const category = await db.category.create({
      data: { name: `ZZ E2E Sec ${stamp}`, slug: categorySlug, order: 99, active: true },
    });
    categoryId = category.id;
    const service = await db.service.create({
      data: {
        name: `ZZ E2E Sécurité ${stamp}`,
        slug: serviceSlug,
        description: 'Prestation de test sécurité.',
        categoryId: category.id,
        durationMinutes: 60,
        status: 'PUBLISHED',
      },
    });
    serviceId = service.id;
    const customer = await db.customer.create({
      data: { name: 'Cliente Sécurité E2E', email: customerEmail, phone: '06 00 00 00 00' },
    });
    customerId = customer.id;
    const startsAt = new Date(Date.now() - 7 * 24 * 3_600_000);
    const appointment = await db.appointment.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60_000),
        status: 'COMPLETED',
        priceCents: 5000,
        durationMinutes: 60,
        selectedOptions: [],
        hairInfo: {},
      },
    });
    appointmentId = appointment.id;
    const oldDate = new Date(Date.now() - 120 * 24 * 3_600_000);
    const assessment = await db.hairAssessment.create({
      data: {
        serviceId: service.id,
        customerId: customer.id,
        answers: { length: 'LONG' },
        photoKeys: [`assessments/${prefix}-missing.jpg`],
        status: 'RECEIVED',
        createdAt: oldDate,
      },
    });
    assessmentId = assessment.id;
    const request = await db.customRequest.create({
      data: {
        customerId: customer.id,
        requesterName: 'Cliente Sécurité E2E',
        requesterEmail: customerEmail,
        description: `<script>alert('xss')</script> Demande de test sécurité avec du contenu hostile.`,
        status: 'NEW',
      },
    });
    requestId = request.id;
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('should block unauthenticated dashboard and admin API access', async ({ page, request }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/connexion/);

    const unauthExport = await request.get(`/api/admin/clients/${customerId}/export`, {
      maxRedirects: 0,
    });
    expect(unauthExport.status()).toBe(401);
  });

  test('should send security headers and expose a minimal health probe', async ({ request }) => {
    const home = await request.get('/');
    expect(home.status()).toBe(200);
    expect(home.headers()['x-content-type-options']).toBe('nosniff');
    expect(home.headers()['x-frame-options']).toBe('DENY');
    expect(home.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(home.headers()['permissions-policy']).toContain('camera=()');
    expect(home.headers()['x-powered-by']).toBeUndefined();

    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    const body = (await health.json()) as { status: string; database: string };
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
    expect(health.headers()['cache-control']).toBe('no-store');
  });

  test('should use an HttpOnly SameSite session cookie', async ({ page, context }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page);
    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name.includes('session-token'));
    expect(session).not.toBeUndefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');
  });

  test('should export client data for the administrator only', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page);
    const response = await page.request.get(`/api/admin/clients/${customerId}/export`);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const body = (await response.json()) as {
      customer: { email: string } | null;
      appointments: unknown[];
    };
    expect(body.customer?.email).toBe(customerEmail);
    expect(body.appointments.length).toBeGreaterThanOrEqual(1);
  });

  test('should escape hostile content in the admin view', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page);
    let dialog = false;
    page.on('dialog', (event) => {
      dialog = true;
      void event.dismiss();
    });
    await page.goto(`/dashboard/demandes/${requestId}`);
    await page.waitForTimeout(500);
    expect(dialog).toBe(false);
    const visibleText = await page.locator('body').textContent();
    expect(visibleText).toContain("<script>alert('xss')</script>");
  });

  test('should anonymize a client from the RGPD procedure', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page);
    await page.goto(`/dashboard/clients/${customerId}`);
    await page.getByLabel(/Pour confirmer, saisissez ANONYMISER/).fill('ANONYMISER');
    await page.getByRole('button', { name: 'Anonymiser la fiche' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Anonymiser définitivement' })
      .click();
    await expect(page.getByText(/Fiche anonymisée/).first()).toBeVisible({ timeout: 20_000 });

    const anonymized = await db.customer.findUnique({ where: { id: customerId } });
    expect(anonymized.name).toBe('Cliente supprimée');
    expect(anonymized.email).toContain('deleted-');
    expect(await db.hairAssessment.count({ where: { customerId } })).toBe(0);
    expect(await db.customRequest.count({ where: { customerId } })).toBe(0);
    const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
    expect(appointment.hairInfo).toBeNull();
    expect(appointment.cancelToken).toBeNull();
  });

  test('should purge expired private photos and refuse an unauthorized cron call', async ({
    request,
  }) => {
    const oldDate = new Date(Date.now() - 120 * 24 * 3_600_000);
    const retentionAssessment = await db.hairAssessment.create({
      data: {
        serviceId,
        customerId,
        answers: { length: 'LONG' },
        photoKeys: [`assessments/${prefix}-retention-missing.jpg`],
        status: 'RECEIVED',
        createdAt: oldDate,
      },
    });
    assessmentId = retentionAssessment.id;

    const unauthorized = await request.post('/api/cron/retention');
    expect(unauthorized.status()).toBe(401);

    const cron = await request.post('/api/cron/retention', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cron.ok()).toBe(true);
    const summary = (await cron.json()) as { assessmentsPurged: number; photosDeleted: number };
    expect(summary.assessmentsPurged).toBeGreaterThanOrEqual(1);

    const assessment = await db.hairAssessment.findUnique({ where: { id: assessmentId } });
    expect(assessment?.photoKeys).toEqual([]);
  });
});

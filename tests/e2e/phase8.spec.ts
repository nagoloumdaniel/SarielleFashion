/**
 * P8.1 à P8.7 : demandes personnalisées, clientes, paramètres,
 * tableau de bord et statistiques.
 * Photos de référence : couvertes par le module privé, non envoyées ici
 * pour garder le test indépendant du stockage objet.
 */

import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { selectOption, pickDateTime, pickDate } from './helpers/fields';

const stamp = Date.now().toString(36);
const prefix = `zz-e2e-p8-${stamp}`;
const categorySlug = `${prefix}-cat`;
const serviceSlug = `${prefix}-service`;
const serviceName = `ZZ E2E P8 ${stamp}`;
const requesterEmail = `${prefix}@example.com`;
const subjectDescription =
  'Je souhaite une coiffure personnalisée avec des tresses et des perles pour un mariage.';

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
let originalSettings: Record<string, unknown> | null = null;
let categoryId = '';
let serviceId = '';
let completedAppointmentId = '';
let noShowAppointmentId = '';
let requestId = '';

function desiredDateISO(): string {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function login(page: Page, callbackUrl = '/dashboard'): Promise<void> {
  await page.goto(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
}

async function cleanup(): Promise<void> {
  if (!db) return;
  const requests = await db.customRequest.findMany({
    where: { OR: [{ requesterEmail: { startsWith: prefix } }, { id: requestId || 'none' }] },
    select: { id: true },
  });
  const requestIds = requests.map((row: { id: string }) => row.id);
  const notifications = await db.notification.findMany({
    where: {
      OR: [
        { recipient: { contains: prefix } },
        ...requestIds.map((id: string) => ({ idempotencyKey: { contains: id } })),
        ...requestIds.map((id: string) => ({ link: { contains: id } })),
      ],
    },
    select: { id: true },
  });
  await db.notification.deleteMany({
    where: { id: { in: notifications.map((row: { id: string }) => row.id) } },
  });
  if (requestIds.length > 0) {
    await db.customRequestDecision.deleteMany({ where: { customRequestId: { in: requestIds } } });
    await db.customRequest.deleteMany({ where: { id: { in: requestIds } } });
  }
  if (completedAppointmentId) {
    await db.appointment.deleteMany({ where: { id: completedAppointmentId } });
  }
  if (noShowAppointmentId) {
    await db.appointment.deleteMany({ where: { id: noShowAppointmentId } });
  }
  await db.customer.deleteMany({ where: { email: { startsWith: prefix } } });
  if (serviceId) await db.service.deleteMany({ where: { id: serviceId } });
  if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
  await db.auditLog.deleteMany({
    where: {
      OR: [
        { entityType: 'CustomRequest', entityId: { in: requestIds } },
        { entityType: 'SalonSettings', entityId: '1' },
      ],
    },
  });
  if (originalSettings) {
    await db.salonSettings.update({
      where: { id: 1 },
      data: {
        name: originalSettings.name,
        contactEmail: originalSettings.contactEmail,
        phone: originalSettings.phone,
        address: originalSettings.address,
        openingHours: originalSettings.openingHours ?? null,
        emailSignature: originalSettings.emailSignature,
        cancellationPolicy: originalSettings.cancellationPolicy,
        bookingPolicy: originalSettings.bookingPolicy,
        logoUrl: originalSettings.logoUrl,
      },
    });
  }
  await db.$disconnect();
}

test.describe('Demandes personnalisées, clientes et pilotage', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    db = new PrismaClient();
    originalSettings = await db.salonSettings.findUnique({ where: { id: 1 } });

    const category = await db.category.create({
      data: { name: `ZZ E2E P8 ${stamp}`, slug: categorySlug, order: 99, active: true },
    });
    categoryId = category.id;
    const service = await db.service.create({
      data: {
        name: serviceName,
        slug: serviceSlug,
        description: 'Prestation de test P8.',
        categoryId: category.id,
        durationMinutes: 90,
        status: 'PUBLISHED',
      },
    });
    serviceId = service.id;
    const customer = await db.customer.create({
      data: {
        name: 'Cliente P8 E2E',
        email: `${prefix}-cliente@example.com`,
        phone: '06 50 60 70 80',
      },
    });

    const past = new Date(Date.now() - 3 * 24 * 3_600_000);
    const completed = await db.appointment.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        startsAt: past,
        endsAt: new Date(past.getTime() + 90 * 60_000),
        status: 'COMPLETED',
        priceCents: 5000,
        durationMinutes: 90,
        selectedOptions: [],
        hairInfo: {},
      },
    });
    completedAppointmentId = completed.id;
    const noShow = await db.appointment.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        startsAt: new Date(past.getTime() - 24 * 3_600_000),
        endsAt: new Date(past.getTime() + 66 * 60_000),
        status: 'NO_SHOW',
        priceCents: 5000,
        durationMinutes: 90,
        selectedOptions: [],
        hairInfo: {},
      },
    });
    noShowAppointmentId = noShow.id;
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('should submit a custom request with hair details and queue notifications', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/demandes-personnalisees');
    await expect(
      page.getByRole('heading', { name: /Une coiffure qui n’est pas au catalogue/ }),
    ).toBeVisible();

    await page.getByLabel('Nom et prénom').fill('Amina P8 E2E');
    await page.getByLabel('E-mail').fill(requesterEmail);
    await page.getByLabel('Téléphone (facultatif)').fill('06 12 34 56 78');
    await page.getByLabel('Décrivez la coiffure souhaitée').fill(subjectDescription);
    await selectOption(page, 'Longueur actuelle', 'LONG');
    await page.getByLabel('Type de cheveux').fill('Cheveux naturels épais');
    await page.getByLabel('Coiffure actuelle (facultatif)').fill('Tresses depuis deux semaines');
    await pickDate(page, 'Date souhaitée (facultatif)', desiredDateISO());
    await page.getByLabel('Précisions complémentaires (facultatif)').fill('Budget 150 euros.');
    await page.getByLabel(/J’accepte que mes informations/).check();
    await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
    await expect(page.getByRole('heading', { name: 'Demande bien reçue' })).toBeVisible({
      timeout: 20_000,
    });

    const record = await db.customRequest.findFirst({
      where: { requesterEmail },
      include: { customer: true },
    });
    expect(record).not.toBeNull();
    requestId = record.id;
    expect(record.status).toBe('NEW');
    expect(record.customer?.email).toBe(requesterEmail);
    expect(record.hairInfo.length).toBe('LONG');
    expect(record.hairInfo.type).toContain('naturels');
    expect(record.photoKeys).toEqual([]);
    expect(record.desiredDate).not.toBeNull();

    const queued = await db.notification.findMany({
      where: { idempotencyKey: { contains: requestId } },
    });
    expect(queued).toHaveLength(3);
    expect(queued.some((row: { channel: string }) => row.channel === 'IN_APP')).toBe(true);
    expect(
      queued.some((row: { templateKey: string }) => row.templateKey === 'custom_request_received'),
    ).toBe(true);

    const cron = await request.post('/api/cron/notifications', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cron.ok()).toBe(true);
    await expect
      .poll(
        async () =>
          (
            await db.notification.findFirst({
              where: { templateKey: 'custom_request_received', recipient: requesterEmail },
            })
          )?.status,
        { timeout: 20_000 },
      )
      .toBe('SENT');
  });

  test('should decide, quote and record the custom request without creating an appointment', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    test.setTimeout(150_000);
    await login(page);
    await page.goto('/dashboard/demandes');
    await expect(page.getByText('Amina P8 E2E')).toBeVisible();
    await page.goto(`/dashboard/demandes/${requestId}`);
    await expect(page.getByRole('heading', { name: /Demande de Amina P8 E2E/ })).toBeVisible();
    await expect(page.getByText(subjectDescription)).toBeVisible();

    await selectOption(page, 'Décision', 'ACCEPTED');
    await page.getByLabel('Prix estimatif (FCFA, facultatif)').fill('150');
    await selectOption(page, 'Prestation du catalogue à proposer (facultatif)', serviceId);
    await pickDateTime(page, 'proposedSlotLocal', `${desiredDateISO()}T10:00`);
    await page
      .getByLabel(/^Message à la cliente/)
      .fill('Votre projet est réalisable. Voici un créneau et un prix estimatif.');
    await page.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Accepter', exact: true }).click();

    await expect
      .poll(
        async () => {
          const row = await db.customRequest.findUnique({ where: { id: requestId } });
          return row?.status;
        },
        { timeout: 20_000 },
      )
      .toBe('ACCEPTED');

    const updated = await db.customRequest.findUnique({ where: { id: requestId } });
    expect(updated.estimatedPriceCents).toBe(15_000);
    expect(updated.proposedServiceId).toBe(serviceId);
    expect(updated.proposedSlot).not.toBeNull();

    const decisions = await db.customRequestDecision.findMany({
      where: { customRequestId: requestId },
    });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].action).toBe('ACCEPTED');
    expect(decisions[0].priceCents).toBe(15_000);

    const appointment = await db.appointment.count({
      where: { customer: { email: requesterEmail } },
    });
    expect(appointment).toBe(0);

    const decisionEmail = await db.notification.findFirst({
      where: { templateKey: 'custom_request_decision', recipient: requesterEmail },
    });
    expect(decisionEmail).not.toBeNull();

    await page.reload();
    await expect(page.getByText('Demande acceptée')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: 'tests/e2e/screenshots/demande-personnalisee-desktop.png',
      caret: 'initial',
    });
  });

  test('should expose the client file with request and reservation history', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page, '/dashboard/clients');
    await page.goto(`/dashboard/clients?q=${encodeURIComponent(`${prefix}-cliente@example.com`)}`);
    await expect(page.getByText('Cliente P8 E2E')).toBeVisible();
    const customer = await db.customer.findFirst({
      where: { email: { startsWith: `${prefix}-cliente` } },
    });
    expect(customer).not.toBeNull();
    await page.goto(`/dashboard/clients/${customer.id}`);
    await expect(page.getByRole('heading', { name: 'Cliente P8 E2E' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rendez-vous' })).toBeVisible();
    await expect(page.getByRole('link', { name: serviceName }).first()).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/fiche-cliente-desktop.png',
      fullPage: true,
      caret: 'initial',
    });
  });

  test('should save the salon identity and policies', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page, '/dashboard/parametres');
    await page.goto('/dashboard/parametres');
    await page.getByLabel('Nom professionnel').fill(`Salon E2E ${stamp}`);
    await page.getByLabel('E-mail public').fill(`${prefix}-salon@example.com`);
    await page.getByLabel('Adresse ou quartier').fill('12 rue de Test, Dakar');
    await page.getByLabel('Règles d’annulation').fill('Annulation au moins 24 h avant.');
    await page.getByLabel('Règles de réservation').fill('Paiement sur place.');
    await page.getByLabel('Signature des e-mails').fill('À bientôt, Patricia');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Paramètres enregistrés.').first()).toBeVisible();

    const settings = await db.salonSettings.findUnique({ where: { id: 1 } });
    expect(settings.name).toBe(`Salon E2E ${stamp}`);
    expect(settings.contactEmail).toBe(`${prefix}-salon@example.com`);
    expect(settings.cancellationPolicy).toContain('24 h');
    expect(settings.emailSignature).toContain('Patricia');
  });

  test('should show the overview and defined statistics', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page);
    await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
    await expect(page.getByText('Revenus estimés').first()).toBeVisible();
    await expect(page.getByText('Prochains rendez-vous')).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/tableau-de-bord-desktop.png',
      fullPage: true,
      caret: 'initial',
    });

    await page.goto('/dashboard/statistiques');
    await expect(page.getByRole('heading', { name: 'Statistiques' })).toBeVisible();
    await expect(page.getByText(/prix figés/)).toBeVisible();
    await expect(page.getByText(/50[\s  ]*F[\s  ]*CFA/).first()).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/statistiques-desktop.png',
      fullPage: true,
      caret: 'initial',
    });
  });

  test('should render the custom request form on mobile without overflow', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto('/demandes-personnalisees');
    await expect(
      page.getByRole('heading', { name: /Une coiffure qui n’est pas au catalogue/ }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'tests/e2e/screenshots/demande-personnalisee-mobile.png',
      fullPage: false,
      caret: 'initial',
    });
    await context.close();
  });
});

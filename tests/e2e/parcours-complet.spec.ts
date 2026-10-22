/**
 * P11.2 : parcours de bout en bout visiteur et admin.
 *
 * Visiteur : catalogue → compatibilité → réservation → confirmation → notification.
 * Admin : validation d'une évaluation → confirmation d'un rendez-vous.
 * Les autres segments admin (création de prestation, règles, annulation) sont
 * couverts par dashboard.spec.ts, compatibilite.spec.ts et reservations.spec.ts.
 */

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { selectOption, pickDate } from './helpers/fields';

const stamp = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
const prefix = `zz-e2e-parcours-${stamp}`;
const categorySlug = `${prefix}-cat`;
const serviceSlug = `${prefix}-service`;
const serviceName = `ZZ E2E Parcours ${stamp}`;
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

/* eslint-disable @typescript-eslint/no-explicit-any */
let db: any;
/* eslint-enable @typescript-eslint/no-explicit-any */
let categoryId = '';
let serviceId = '';
let availabilityRuleId = '';
let customerId = '';
let assessmentId = '';

function futureDateISO(days = 3): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const dateISO = futureDateISO();

async function login(page: Page): Promise<void> {
  await page.goto('/connexion?callbackUrl=/dashboard');
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
}

async function cleanup(): Promise<void> {
  if (!db) return;
  const appointments = await db.appointment.findMany({
    where: { OR: [{ serviceId }, { customer: { email: { startsWith: prefix } } }] },
    select: { id: true },
  });
  const appointmentIds = appointments.map((row: { id: string }) => row.id);
  const assessments = await db.hairAssessment.findMany({
    where: { OR: [{ serviceId }, { customer: { email: { startsWith: prefix } } }] },
    select: { id: true },
  });
  const assessmentIds = assessments.map((row: { id: string }) => row.id);
  const notifications = await db.notification.findMany({
    where: { OR: [{ recipient: { startsWith: prefix } }, { recipient: { contains: prefix } }] },
    select: { id: true },
  });
  await db.notification.deleteMany({
    where: {
      OR: [
        { id: { in: notifications.map((row: { id: string }) => row.id) } },
        ...appointmentIds.map((id: string) => ({ idempotencyKey: { contains: id } })),
      ],
    },
  });
  if (assessmentIds.length > 0) {
    await db.hairAssessment.deleteMany({ where: { id: { in: assessmentIds } } });
  }
  if (appointmentIds.length > 0) {
    await db.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }
  await db.customer.deleteMany({ where: { email: { startsWith: prefix } } });
  if (availabilityRuleId) {
    await db.availabilityRule.deleteMany({ where: { id: availabilityRuleId } });
  }
  if (serviceId) await db.service.deleteMany({ where: { id: serviceId } });
  if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
  await db.auditLog.deleteMany({
    where: {
      OR: [
        { entityType: 'Appointment', entityId: { in: appointmentIds } },
        { entityType: 'HairAssessment', entityId: { in: assessmentIds } },
      ],
    },
  });
  await db.$disconnect();
}

test.describe('Parcours complet', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Parcours métier exécuté une seule fois (desktop) ; le responsive est couvert par responsive.spec.ts.',
    );
    const { PrismaClient } = await import('@prisma/client');
    db = new PrismaClient();
    const category = await db.category.create({
      data: { name: `ZZ E2E Parcours ${stamp}`, slug: categorySlug, order: 99, active: true },
    });
    categoryId = category.id;
    const service = await db.service.create({
      data: {
        name: serviceName,
        slug: serviceSlug,
        description: 'Prestation de test du parcours complet.',
        categoryId: category.id,
        priceFromCents: 5000,
        priceToCents: 5000,
        durationMinutes: 60,
        status: 'PUBLISHED',
        compatibility: {
          create: {
            acceptedLengths: ['LONG', 'VERY_LONG'],
            acceptedHairTypes: [],
            requiresLocs: false,
            incompatibleLocs: true,
            photoPolicy: 'OPTIONAL',
            autoApprove: true,
            conditionsNote: 'Prévoir un soin avant la pose.',
            incompatibleMessage: 'Cette coiffure nécessite des cheveux longs.',
            uncertainMessage: 'Une vérification est nécessaire.',
          },
        },
      },
    });
    serviceId = service.id;
    const rule = await db.availabilityRule.create({
      data: {
        kind: 'SPECIFIC',
        date: dateISO,
        startMinute: 9 * 60,
        endMinute: 18 * 60,
        active: true,
      },
    });
    availabilityRuleId = rule.id;
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('should follow catalogue, compatibility, booking and notification', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`/coiffures?search=${encodeURIComponent(serviceName)}`);
    await expect(page.getByText(serviceName).first()).toBeVisible();
    await page.goto(`/coiffures/${serviceSlug}`);
    await expect(page.getByRole('heading', { level: 1, name: serviceName })).toBeVisible();

    await page.getByRole('link', { name: /Vérifier ma compatibilité/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Votre coiffure est-elle compatible ?' }),
    ).toBeVisible();
    await page.getByLabel('Longs', { exact: true }).check();
    await page.getByLabel('Non, je ne porte pas de locs').check();
    await page.getByRole('button', { name: 'Vérifier ma compatibilité' }).click();
    await expect(page.getByText('Bonne nouvelle')).toBeVisible();
    await page.getByRole('link', { name: 'Réserver cette prestation' }).click();

    await expect(page.getByRole('heading', { name: 'Vos informations capillaires' })).toBeVisible();
    await page.getByLabel('Longs', { exact: true }).check();
    await page.getByLabel('Non, je ne porte pas de locs').check();
    await page.getByRole('button', { name: 'Vérifier et continuer' }).click();

    await expect(page.getByRole('heading', { name: 'Options et précisions' })).toBeVisible();
    await page.getByRole('button', { name: 'Choisir un créneau' }).click();
    await pickDate(page, 'Date souhaitée', dateISO);
    const slot = page.getByRole('button', { name: '10:00', exact: true });
    await expect(slot).toBeVisible({ timeout: 20_000 });
    await slot.click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    await page.getByLabel('Nom et prénom').fill('Cliente Parcours E2E');
    await page.getByLabel('E-mail').fill(customerEmail);
    await page.getByLabel('Téléphone').fill('06 12 34 56 78');
    await page.getByLabel(/J’accepte/).check();
    await page.getByRole('button', { name: 'Voir le récapitulatif' }).click();
    await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer ma réservation' }).click();
    await expect(page.getByRole('heading', { name: 'Votre rendez-vous est confirmé' })).toBeVisible(
      { timeout: 20_000 },
    );

    const appointment = await db.appointment.findFirst({
      where: { serviceId, customer: { email: customerEmail } },
      include: { customer: true },
    });
    expect(appointment).not.toBeNull();
    customerId = appointment?.customerId ?? '';
    expect(appointment?.status).toBe('CONFIRMED');
    expect(appointment?.priceCents).toBe(5000);

    const clientNotification = await db.notification.findFirst({
      where: { recipient: customerEmail, templateKey: 'booking_confirmed' },
    });
    expect(clientNotification).not.toBeNull();
    expect(clientNotification.status).toBe('PENDING');

    await page.screenshot({
      path: 'tests/e2e/screenshots/parcours-complet-confirmation.png',
      caret: 'initial',
    });
  });

  test('should validate an assessment and confirm an appointment from the dashboard', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    test.setTimeout(150_000);
    const assessment = await db.hairAssessment.create({
      data: {
        serviceId,
        customerId,
        answers: { hair_length: 'LONG', has_locs: 'NO' },
        photoKeys: [],
        status: 'RECEIVED',
      },
    });
    assessmentId = assessment.id;

    await login(page);
    await page.goto(`/dashboard/evaluations/${assessmentId}`);
    await selectOption(page, 'Décision', { label: 'Accepter la compatibilité' });
    await page
      .getByLabel(/^Message pour la cliente/)
      .fill('Votre coiffure est compatible, vous pouvez réserver un créneau.');
    await page.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Accepter', exact: true }).click();
    await expect
      .poll(
        async () => {
          const row = await db.hairAssessment.findUnique({ where: { id: assessmentId } });
          return row?.status;
        },
        { timeout: 20_000 },
      )
      .toBe('ACCEPTED');

    const start = new Date(`${dateISO}T14:00:00.000Z`);
    const appointment = await db.appointment.create({
      data: {
        customerId,
        serviceId,
        startsAt: start,
        endsAt: new Date(start.getTime() + 60 * 60_000),
        status: 'PENDING',
        priceCents: 5000,
        durationMinutes: 60,
        selectedOptions: [],
        hairInfo: {},
        holdExpiresAt: new Date(Date.now() + 30 * 60_000),
        cancelToken: randomBytes(32).toString('hex'),
        cancelTokenExpiresAt: new Date(start.getTime() + 30 * 24 * 3_600_000),
      },
    });
    await page.goto(`/dashboard/reservations/${appointment.id}`);
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
    await expect
      .poll(
        async () => {
          const row = await db.appointment.findUnique({ where: { id: appointment.id } });
          return row?.status;
        },
        { timeout: 20_000 },
      )
      .toBe('CONFIRMED');

    await expect(page.getByText(/Confirmé|Confirmée/).first()).toBeVisible();
  });
});

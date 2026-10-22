/**
 * P6.12, tests de bout en bout réservation, annulation et calendrier.
 *
 * Fixtures créées en base avec le préfixe « ZZ E2E » :
 * - une catégorie, une prestation avec une option ;
 * - une disponibilité spécifique sur une date de test ;
 * - deux rendez-vous pour les actions admin et l'annulation hors délai.
 *
 * Scénarios :
 * - réservation publique complète (option, créneau, coordonnées, récap, confirmation) ;
 * - instantanés prix/durée, notification outbox ;
 * - annulation client par lien signé et libération du créneau ;
 * - calendrier dashboard, reprogrammation atomique, annulation admin, confirmation ;
 * - avertissement de conflit lors d'un blocage de disponibilité ;
 * - annulation hors délai refusée ;
 * - concurrence : deux clientes sur le même créneau, une seule réussite ;
 * - responsive mobile.
 */

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import type { PrismaClient } from '@prisma/client';
import { pickDateTime, pickDate } from './helpers/fields';

const stamp = Date.now().toString(36);
const categorySlug = `zz-e2e-resa-categorie-${stamp}`;
const categoryName = `ZZ E2E Résa Catégorie ${stamp}`;
const serviceSlug = `zz-e2e-resa-${stamp}`;
const serviceName = `ZZ E2E Réservation ${stamp}`;
const optionName = `Soin E2E ${stamp}`;
const customerPrefix = `zz-e2e-resa-${stamp}`;

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

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localDateISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function testDateISO(): string {
  const date = new Date();
  date.setDate(date.getDate() + Number(process.env.E2E_DAY_OFFSET ?? 3));
  return localDateISO(date);
}

function localMinute(iso: string, timeZone = 'Europe/Berlin'): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

const dateISO = testDateISO();
const slotHour = 10;
const concurrencyHour = 11;

let db: PrismaClient;
let originalSettings: Awaited<ReturnType<PrismaClient['salonSettings']['findUnique']>> = null;
let categoryId = '';
let serviceId = '';
let specificRuleId = '';
let adminAppointmentId = '';
let pendingAppointmentId = '';
let delayedAppointmentId = '';
let expiredAppointmentId = '';

async function cleanup(): Promise<void> {
  if (!db) return;
  const appointments = await db.appointment.findMany({
    where: {
      OR: [{ serviceId }, { customer: { email: { startsWith: customerPrefix } } }],
    },
    select: { id: true, customerId: true },
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);

  if (appointmentIds.length > 0) {
    await db.notification.deleteMany({
      where: {
        OR: appointmentIds.map((id) => ({ idempotencyKey: { contains: id } })),
      },
    });
    await db.auditLog.deleteMany({
      where: { entityType: 'Appointment', entityId: { in: appointmentIds } },
    });
    await db.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }
  await db.customer.deleteMany({ where: { email: { startsWith: customerPrefix } } });
  if (specificRuleId) await db.availabilityRule.deleteMany({ where: { id: specificRuleId } });
  if (serviceId) await db.service.deleteMany({ where: { id: serviceId } });
  if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
  if (originalSettings) {
    await db.salonSettings.update({
      where: { id: 1 },
      data: {
        holdSlotMinutes: originalSettings.holdSlotMinutes,
        minCancelNoticeMinutes: originalSettings.minCancelNoticeMinutes,
        reminderLeadHours: originalSettings.reminderLeadHours,
        bufferMinutes: originalSettings.bufferMinutes,
        slotIntervalMinutes: originalSettings.slotIntervalMinutes,
        maxAdvanceDays: originalSettings.maxAdvanceDays,
        minLeadTimeMinutes: originalSettings.minLeadTimeMinutes,
        cancelReasonRequired: originalSettings.cancelReasonRequired,
        contactEmail: originalSettings.contactEmail,
      },
    });
  }
  await db.$disconnect();
}

async function login(page: Page, callbackUrl = '/dashboard/calendrier'): Promise<void> {
  await page.goto(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
}

async function fillBookingDetailsToSummary(page: Page, slot: string, email: string): Promise<void> {
  await page.goto(`/reserver?service=${serviceSlug}`);
  await expect(page.getByRole('heading', { name: 'Options et précisions' })).toBeVisible();
  await page.getByLabel(new RegExp(optionName)).check();
  await page.getByRole('button', { name: 'Choisir un créneau' }).click();
  await pickDate(page, 'Date souhaitée', dateISO);
  const slotButton = page.getByRole('button', { name: slot, exact: true });
  await expect(slotButton).toBeVisible({ timeout: 20_000 });
  await slotButton.click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Nom et prénom').fill('Amina Test Réservation');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Téléphone').fill('06 12 34 56 78');
  await page.getByLabel(/J’accepte/).check();
  await page.getByRole('button', { name: 'Voir le récapitulatif' }).click();
  await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
}

test.describe('Réservations, annulations et calendrier', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const { PrismaClient: Client } = await import('@prisma/client');
    db = new Client();

    originalSettings = await db.salonSettings.findUnique({ where: { id: 1 } });
    await db.salonSettings.upsert({
      where: { id: 1 },
      update: {
        holdSlotMinutes: 30,
        minCancelNoticeMinutes: 30,
        bufferMinutes: 0,
        slotIntervalMinutes: 30,
        maxAdvanceDays: 60,
        minLeadTimeMinutes: 0,
        cancelReasonRequired: false,
        contactEmail: ADMIN_EMAIL || null,
      },
      create: { id: 1 },
    });

    const category = await db.category.create({
      data: { name: categoryName, slug: categorySlug, order: 99, active: true },
    });
    categoryId = category.id;

    const service = await db.service.create({
      data: {
        name: serviceName,
        slug: serviceSlug,
        description: 'Prestation de test P6.12.',
        categoryId: category.id,
        priceFromCents: 6000,
        priceToCents: 6000,
        durationMinutes: 90,
        status: 'PUBLISHED',
        options: {
          create: {
            name: optionName,
            priceCents: 1000,
            durationMinutes: 15,
            active: true,
          },
        },
      },
      include: { options: true },
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
    specificRuleId = rule.id;

    // Rendez-vous pour les actions admin (reprogrammation, annulation, confirmation).
    const adminCustomer = await db.customer.create({
      data: {
        name: 'Cliente Admin E2E',
        email: `${customerPrefix}-admin@example.com`,
        phone: '06 11 22 33 44',
      },
    });
    const [y, m, d] = dateISO.split('-').map(Number);
    const adminStart = new Date(y, (m ?? 1) - 1, d, 14, 0, 0);
    const adminAppointment = await db.appointment.create({
      data: {
        customerId: adminCustomer.id,
        serviceId: service.id,
        startsAt: adminStart,
        endsAt: new Date(adminStart.getTime() + 90 * 60_000),
        status: 'CONFIRMED',
        priceCents: 6000,
        durationMinutes: 90,
        selectedOptions: [],
        hairInfo: {},
        cancelToken: randomBytes(32).toString('hex'),
        cancelTokenExpiresAt: new Date(adminStart.getTime() + 30 * 24 * 3_600_000),
      },
    });
    adminAppointmentId = adminAppointment.id;

    const pendingCustomer = await db.customer.create({
      data: {
        name: 'Cliente En Attente E2E',
        email: `${customerPrefix}-pending@example.com`,
        phone: '06 55 66 77 88',
      },
    });
    const pendingStart = new Date(y, (m ?? 1) - 1, d, 16, 0, 0);
    const pendingAppointment = await db.appointment.create({
      data: {
        customerId: pendingCustomer.id,
        serviceId: service.id,
        startsAt: pendingStart,
        endsAt: new Date(pendingStart.getTime() + 90 * 60_000),
        status: 'PENDING',
        priceCents: 6000,
        durationMinutes: 90,
        selectedOptions: [],
        hairInfo: {},
        holdExpiresAt: new Date(Date.now() + 30 * 60_000),
        cancelToken: randomBytes(32).toString('hex'),
        cancelTokenExpiresAt: new Date(pendingStart.getTime() + 30 * 24 * 3_600_000),
      },
    });
    pendingAppointmentId = pendingAppointment.id;

    // Annulation hors délai (30 min) : rendez-vous dans 20 minutes.
    const delayedCustomer = await db.customer.create({
      data: {
        name: 'Cliente Hors Délai E2E',
        email: `${customerPrefix}-delayed@example.com`,
        phone: '06 99 88 77 66',
      },
    });
    const delayedStart = new Date(Date.now() + 20 * 60_000);
    const delayedAppointment = await db.appointment.create({
      data: {
        customerId: delayedCustomer.id,
        serviceId: service.id,
        startsAt: delayedStart,
        endsAt: new Date(delayedStart.getTime() + 90 * 60_000),
        status: 'CONFIRMED',
        priceCents: 6000,
        durationMinutes: 90,
        selectedOptions: [],
        hairInfo: {},
        cancelToken: randomBytes(32).toString('hex'),
        cancelTokenExpiresAt: new Date(delayedStart.getTime() + 30 * 24 * 3_600_000),
      },
    });
    delayedAppointmentId = delayedAppointment.id;

    // Créneau en attente expiré : doit être libéré automatiquement.
    const expiredCustomer = await db.customer.create({
      data: {
        name: 'Cliente Expirée E2E',
        email: `${customerPrefix}-expired@example.com`,
        phone: '06 44 55 66 77',
      },
    });
    const expiredStart = new Date(y, (m ?? 1) - 1, d, 17, 0, 0);
    const expiredAppointment = await db.appointment.create({
      data: {
        customerId: expiredCustomer.id,
        serviceId: service.id,
        startsAt: expiredStart,
        endsAt: new Date(expiredStart.getTime() + 90 * 60_000),
        status: 'PENDING',
        priceCents: 6000,
        durationMinutes: 90,
        selectedOptions: [],
        hairInfo: {},
        holdExpiresAt: new Date(Date.now() - 60_000),
        cancelToken: randomBytes(32).toString('hex'),
        cancelTokenExpiresAt: new Date(expiredStart.getTime() + 30 * 24 * 3_600_000),
      },
    });
    expiredAppointmentId = expiredAppointment.id;
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('should book with options, price snapshot, then cancel by secure link', async ({ page }) => {
    test.setTimeout(150_000);
    await fillBookingDetailsToSummary(page, '10:00', `${customerPrefix}-client@example.com`);

    await expect(page.getByText('Paiement sur place').last()).toBeVisible();
    await expect(page.getByText(/en espèces ou par virement/)).toBeVisible();
    await expect(page.getByText(/jusqu’à 30 minutes avant le rendez-vous/)).toBeVisible();
    await expect(page.getByText(/70[\s  ]*€/)).toBeVisible();

    await page.getByRole('button', { name: 'Confirmer ma réservation' }).click();
    await expect(page.getByRole('heading', { name: 'Votre rendez-vous est confirmé' })).toBeVisible(
      { timeout: 20_000 },
    );
    await expect(page.getByText(/AP-/)).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/reservation-confirmation-desktop.png',
      fullPage: true,
      caret: 'initial',
    });

    const appointment = await db.appointment.findFirst({
      where: { serviceId, customer: { email: `${customerPrefix}-client@example.com` } },
      include: { customer: true },
    });
    expect(appointment).not.toBeNull();
    expect(appointment?.status).toBe('CONFIRMED');
    expect(appointment?.priceCents).toBe(7000);
    expect(appointment?.durationMinutes).toBe(105);
    expect(appointment?.cancelToken).toHaveLength(64);
    const options = appointment?.selectedOptions as Array<{ name: string }>;
    expect(options[0]?.name).toBe(optionName);
    expect(localMinute(appointment!.startsAt.toISOString())).toBe(slotHour * 60);

    const notificationCount = await db.notification.count({
      where: { idempotencyKey: { contains: appointment!.id } },
    });
    expect(notificationCount).toBeGreaterThanOrEqual(2);

    const cancelLink = page.getByRole('link', { name: 'Gérer ou annuler mon rendez-vous' });
    const cancelHref = await cancelLink.getAttribute('href');
    expect(cancelHref).toMatch(/^\/annulation\/[0-9a-f]{64}$/);

    await page.goto(cancelHref!);
    await expect(page.getByRole('heading', { name: 'Annuler ce rendez-vous' })).toBeVisible();
    await page.getByLabel(/Motif/).fill('Empêchement personnel');
    await page.getByRole('button', { name: 'Confirmer l’annulation' }).click();
    await expect(page.getByText(/n’est plus actif/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Annulée par la cliente/).first()).toBeVisible();

    const cancelled = await db.appointment.findUnique({ where: { id: appointment!.id } });
    expect(cancelled?.status).toBe('CANCELLED_BY_CUSTOMER');
    expect(cancelled?.cancelledAt).not.toBeNull();
    expect(cancelled?.cancelReason).toContain('Empêchement');

    const activeOnSlot = await db.appointment.count({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        startsAt: cancelled?.startsAt,
      },
    });
    expect(activeOnSlot).toBe(0);
  });

  test('should show the calendar, reschedule atomically and cancel from the dashboard', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    test.setTimeout(150_000);

    await login(page);
    await expect(page.getByRole('heading', { name: 'Calendrier' })).toBeVisible();
    await page.getByRole('button', { name: 'Liste', exact: true }).click();
    await expect(page.getByText('Cliente Admin E2E').first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Semaine', exact: true }).click();
    await expect(page.getByText('Chargement du calendrier…')).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText('Cliente Admin E2E').first()).toBeVisible();
    await page.screenshot({
      path: 'tests/e2e/screenshots/calendrier-desktop.png',
      fullPage: true,
      caret: 'initial',
    });

    await page.goto('/dashboard/reservations/' + adminAppointmentId);
    await expect(page.getByRole('heading', { name: /Réservation AP-/ })).toBeVisible();

    await page.getByRole('button', { name: 'Reprogrammer', exact: true }).click();
    const rescheduleDialog = page.getByRole('dialog', { name: 'Reprogrammer le rendez-vous' });
    await pickDate(page, 'Nouvelle date', dateISO);
    const slot = rescheduleDialog.getByRole('button', { name: '10:00', exact: true });
    await expect(slot).toBeVisible({ timeout: 20_000 });
    await slot.click();
    await rescheduleDialog.getByRole('button', { name: 'Valider', exact: true }).click();
    await expect(page.getByText(/Rendez-vous reprogrammé/).first()).toBeVisible();

    const rescheduled = await db.appointment.findUnique({
      where: { id: adminAppointmentId },
    });
    expect(rescheduled?.status).toBe('RESCHEDULED');
    expect(rescheduled?.rescheduledFrom).not.toBeNull();
    expect(localMinute(rescheduled!.startsAt.toISOString())).toBe(10 * 60);

    // L'ancien créneau est libéré dans la même transaction.
    const activeOnOldSlot = await db.appointment.findMany({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        startsAt: rescheduled!.rescheduledFrom!,
      },
      select: { id: true, status: true, customerId: true },
    });
    expect(
      activeOnOldSlot,
      `ancien créneau encore occupé : ${JSON.stringify(activeOnOldSlot)} (rendez-vous reprogrammé : ${adminAppointmentId})`,
    ).toEqual([]);

    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    const cancelDialog = page.getByRole('dialog', { name: 'Annuler le rendez-vous' });
    await cancelDialog.getByLabel(/Motif communiqué à la cliente/).fill('Indisponibilité du salon');
    await cancelDialog.getByRole('button', { name: 'Annuler le rendez-vous' }).click();
    await expect
      .poll(
        async () => {
          const row = await db.appointment.findUnique({ where: { id: adminAppointmentId } });
          return row?.status;
        },
        { timeout: 20_000 },
      )
      .toBe('CANCELLED_BY_ADMIN');

    const cancelled = await db.appointment.findUnique({
      where: { id: adminAppointmentId },
    });
    expect(cancelled?.status).toBe('CANCELLED_BY_ADMIN');
    expect(cancelled?.cancelReason).toContain('Indisponibilité');
  });

  test('should confirm a pending appointment from the dashboard', async ({ page }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    await login(page, '/dashboard/reservations');
    await page.goto(`/dashboard/reservations/${pendingAppointmentId}`);
    await expect(page.getByText('En attente de confirmation').first()).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
    await expect
      .poll(
        async () => {
          const row = await db.appointment.findUnique({ where: { id: pendingAppointmentId } });
          return row?.status;
        },
        { timeout: 20_000 },
      )
      .toBe('CONFIRMED');

    const confirmed = await db.appointment.findUnique({
      where: { id: pendingAppointmentId },
    });
    expect(confirmed?.holdExpiresAt).toBeNull();
  });

  test('should warn before blocking availability that overlaps an appointment', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');

    await login(page, '/dashboard/disponibilites');
    await expect(page.getByRole('heading', { name: 'Disponibilités', exact: true })).toBeVisible();

    await pickDateTime(page, 'startsAtLocal', `${dateISO}T15:30`);
    await pickDateTime(page, 'endsAtLocal', `${dateISO}T17:00`);
    await page.getByLabel('Motif (facultatif)').fill('Blocage test E2E');
    await page.getByRole('button', { name: 'Bloquer cette période' }).click();

    // Des rendez-vous actifs sont touchés : une confirmation explicite est demandée.
    const warning = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(warning.getByText(/affecte \d+ rendez-vous actif/)).toBeVisible({
      timeout: 20_000,
    });
    await warning.getByRole('button', { name: 'Continuer', exact: true }).click();
    await expect(page.getByText('Indisponibilité enregistrée.')).toBeVisible({ timeout: 20_000 });

    await db.blockedPeriod.deleteMany({ where: { reason: 'Blocage test E2E' } });
  });

  test('should refuse a late cancellation through the secure link', async ({ page }) => {
    const delayed = await db.appointment.findUnique({ where: { id: delayedAppointmentId } });
    await page.goto(`/annulation/${delayed!.cancelToken}`);
    await expect(
      page.getByRole('heading', { name: 'Annulation en ligne indisponible' }),
    ).toBeVisible();
    await expect(page.getByText(/moins de 30 minutes/)).toBeVisible();
  });

  test('should allow only one of two simultaneous bookings on the same slot', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const contextA = await browser.newContext({ timezoneId: 'Europe/Berlin' });
    const contextB = await browser.newContext({ timezoneId: 'Europe/Berlin' });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await fillBookingDetailsToSummary(
      pageA,
      `${concurrencyHour}:00`,
      `${customerPrefix}-race-a@example.com`,
    );
    await fillBookingDetailsToSummary(
      pageB,
      `${concurrencyHour}:00`,
      `${customerPrefix}-race-b@example.com`,
    );

    await Promise.all([
      pageA.getByRole('button', { name: 'Confirmer ma réservation' }).click(),
      pageB.getByRole('button', { name: 'Confirmer ma réservation' }).click(),
    ]);

    await expect
      .poll(
        async () => {
          const successA = await pageA.getByText('Votre rendez-vous est confirmé').count();
          const successB = await pageB.getByText('Votre rendez-vous est confirmé').count();
          return successA + successB;
        },
        { timeout: 30_000 },
      )
      .toBe(1);

    const raceAppointments = await db.appointment.count({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        customer: { email: { startsWith: `${customerPrefix}-race` } },
      },
    });
    expect(raceAppointments).toBe(1);

    const failedPage = (await pageA.getByText('Votre rendez-vous est confirmé').count())
      ? pageB
      : pageA;
    await expect(failedPage.getByText(/n’est plus disponible/)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test('should release an expired pending hold when slots are requested', async ({ page }) => {
    await page.goto(`/reserver?service=${serviceSlug}`);
    await page.getByRole('button', { name: 'Choisir un créneau' }).click();
    await pickDate(page, 'Date souhaitée', dateISO);
    await expect(page.getByRole('button', { name: '09:00', exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await expect
      .poll(
        async () => {
          const row = await db.appointment.findUnique({ where: { id: expiredAppointmentId } });
          return row?.status;
        },
        { timeout: 20_000 },
      )
      .toBe('CANCELLED_BY_ADMIN');

    const expired = await db.appointment.findUnique({ where: { id: expiredAppointmentId } });
    expect(expired?.cancelReason).toContain('Délai');
  });

  test('should render booking and calendar on mobile without page overflow', async ({
    browser,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();

    await page.goto(`/reserver?service=${serviceSlug}`);
    await expect(page.getByRole('heading', { name: 'Options et précisions' })).toBeVisible();
    const bookingOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(bookingOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'tests/e2e/screenshots/reservation-mobile.png',
      fullPage: true,
      caret: 'initial',
    });

    await login(page);
    await page.getByRole('button', { name: 'Liste', exact: true }).click();
    // Le rendez-vous de test a été annulé par le test précédent : on affiche aussi les annulés.
    await page.getByRole('button', { name: 'Annulées', exact: true }).click();
    await expect(page.getByText('Chargement du calendrier…')).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText('Cliente Admin E2E').first()).toBeVisible({ timeout: 20_000 });
    const calendarOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(calendarOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'tests/e2e/screenshots/calendrier-mobile.png',
      fullPage: true,
      caret: 'initial',
    });

    await page.goto('/dashboard/disponibilites');
    await expect(page.getByRole('heading', { name: 'Disponibilités', exact: true })).toBeVisible();
    const availabilityOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(availabilityOverflow).toBeLessThanOrEqual(1);

    await context.close();
  });
});

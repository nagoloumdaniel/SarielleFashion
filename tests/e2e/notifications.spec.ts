/**
 * P7.9 : notifications, e-mails, rappels et messagerie dashboard.
 *
 * Fixtures : catégorie, prestation, cliente et rendez-vous confirmé à H+12.
 * Les e-mails sont simulés côté serveur avec EMAIL_MODE="console".
 */

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const stamp = Date.now().toString(36);
const prefix = `zz-e2e-notif-${stamp}`;
const categorySlug = `${prefix}-cat`;
const serviceSlug = `${prefix}-service`;
const customerEmail = `${prefix}@example.com`;
const subject = `Question E2E ${stamp}`;
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
let customerId = '';
let appointmentId = '';
let conversationId = '';
let failedNotificationId = '';

async function login(page: Page, callbackUrl = '/dashboard/messages'): Promise<void> {
  await page.goto(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
}

async function cleanup(): Promise<void> {
  if (!db) return;
  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ subject: { contains: stamp } }, { customerId }],
    },
    select: { id: true },
  });
  const conversationIds = conversations.map((row: { id: string }) => row.id);
  const notifications = await db.notification.findMany({
    where: {
      OR: [
        { recipient: { contains: prefix } },
        { idempotencyKey: { contains: prefix } },
        { idempotencyKey: { contains: appointmentId || 'none' } },
        ...conversationIds.map((id: string) => ({ idempotencyKey: { contains: id } })),
        ...conversationIds.map((id: string) => ({ link: { contains: id } })),
      ],
    },
    select: { id: true },
  });
  await db.notification.deleteMany({
    where: { id: { in: notifications.map((row: { id: string }) => row.id) } },
  });
  if (conversationIds.length > 0) {
    await db.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await db.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }
  if (appointmentId) await db.appointment.deleteMany({ where: { id: appointmentId } });
  if (customerId) await db.customer.deleteMany({ where: { id: customerId } });
  await db.customer.deleteMany({ where: { email: { startsWith: prefix } } });
  if (serviceId) await db.service.deleteMany({ where: { id: serviceId } });
  if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
  await db.auditLog.deleteMany({
    where: {
      OR: [
        { entityType: 'Conversation', entityId: { in: conversationIds } },
        { entityType: 'Notification', entityId: failedNotificationId || 'none' },
      ],
    },
  });
  if (originalSettings) {
    await db.salonSettings.update({
      where: { id: 1 },
      data: { reminderLeadHours: originalSettings.reminderLeadHours },
    });
  }
  await db.$disconnect();
}

test.describe('Notifications et messagerie', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    db = new PrismaClient();
    originalSettings = await db.salonSettings.findUnique({ where: { id: 1 } });
    await db.salonSettings.upsert({
      where: { id: 1 },
      update: { reminderLeadHours: 24 },
      create: { id: 1, reminderLeadHours: 24 },
    });

    const category = await db.category.create({
      data: { name: `ZZ E2E Notif ${stamp}`, slug: categorySlug, order: 99, active: true },
    });
    categoryId = category.id;
    const service = await db.service.create({
      data: {
        name: `ZZ E2E Notification ${stamp}`,
        slug: serviceSlug,
        description: 'Prestation de test P7.9.',
        categoryId: category.id,
        durationMinutes: 90,
        status: 'PUBLISHED',
      },
    });
    serviceId = service.id;
    const customer = await db.customer.create({
      data: {
        name: 'Cliente Notification E2E',
        email: customerEmail,
        phone: '06 10 20 30 40',
      },
    });
    customerId = customer.id;
    const startsAt = new Date(Date.now() + 12 * 3_600_000);
    const appointment = await db.appointment.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 90 * 60_000),
        status: 'CONFIRMED',
        priceCents: 7000,
        durationMinutes: 90,
        selectedOptions: [],
        hairInfo: {},
        cancelToken: randomBytes(32).toString('hex'),
        cancelTokenExpiresAt: new Date(startsAt.getTime() + 30 * 24 * 3_600_000),
      },
    });
    appointmentId = appointment.id;
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('should persist a contact message and queue then send its e-mails', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/contact');
    await page.locator('input[name="name"]').fill('Cliente Notification E2E');
    await page.locator('input[name="email"]').fill(customerEmail);
    await page.getByLabel('Téléphone (facultatif)').fill('06 10 20 30 40');
    await page.getByLabel('Sujet').fill(subject);
    await page
      .getByLabel('Message')
      .fill('Bonjour Patricia, je souhaite des renseignements sur les tresses collées.');
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByText(/Message envoyé/)).toBeVisible({ timeout: 20_000 });

    const conversation = await db.conversation.findFirst({
      where: { subject },
      include: { messages: true, customer: true },
    });
    expect(conversation).not.toBeNull();
    conversationId = conversation!.id;
    expect(conversation!.status).toBe('NEW');
    expect(conversation!.source).toBe('CONTACT');
    expect(conversation!.customer?.email).toBe(customerEmail);
    expect(conversation!.messages).toHaveLength(1);
    expect(conversation!.messages[0].author).toBe('CUSTOMER');

    const queued = await db.notification.findMany({
      where: { idempotencyKey: { contains: conversationId } },
    });
    expect(queued).toHaveLength(3);
    expect(queued.filter((row: { channel: string }) => row.channel === 'EMAIL')).toHaveLength(2);
    expect(queued.some((row: { channel: string }) => row.channel === 'IN_APP')).toBe(true);
    // L'envoi immédiat (flushEmailsSoon) peut déjà avoir traité les e-mails : PENDING, PROCESSING ou SENT.
    expect(
      queued.every((row: { status: string }) =>
        ['PENDING', 'PROCESSING', 'SENT'].includes(row.status),
      ),
    ).toBe(true);

    const unauthorized = await request.post('/api/cron/notifications');
    expect(unauthorized.status()).toBe(401);

    const cron = await request.post('/api/cron/notifications', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cron.ok()).toBe(true);
    await expect
      .poll(
        async () =>
          db.notification.count({
            where: {
              idempotencyKey: { contains: conversationId },
              channel: 'EMAIL',
              status: 'SENT',
            },
          }),
        { timeout: 20_000 },
      )
      .toBeGreaterThanOrEqual(2);

    const sent = await db.notification.findMany({
      where: { idempotencyKey: { contains: conversationId } },
    });
    const emails = sent.filter((row: { channel: string }) => row.channel === 'EMAIL');
    expect(emails.every((row: { status: string }) => row.status === 'SENT')).toBe(true);
    expect(
      emails.every((row: { providerMessageId: string }) =>
        row.providerMessageId.startsWith('console-'),
      ),
    ).toBe(true);
  });

  test('should show the inbox, keep internal notes private and reply by e-mail', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    test.setTimeout(150_000);
    await login(page);
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(page.getByText(subject)).toBeVisible();
    await page.getByText(subject).click();
    await expect(page.getByRole('heading', { name: subject })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/renseignements sur les tresses/)).toBeVisible();

    const notificationsBefore = await db.notification.count({
      where: { idempotencyKey: { contains: conversationId } },
    });
    await page.getByRole('button', { name: 'Note interne', exact: true }).click();
    await page.getByLabel('Votre note interne').fill('Cliente à rappeler avant le rendez-vous.');
    await page.getByRole('button', { name: 'Ajouter la note', exact: true }).click();
    await expect
      .poll(async () => db.message.count({ where: { conversationId, isInternal: true } }), {
        timeout: 20_000,
      })
      .toBe(1);
    const internal = await db.message.findFirst({
      where: { conversationId, isInternal: true },
    });
    expect(internal?.content).toContain('rappeler');
    expect(
      await db.notification.count({ where: { idempotencyKey: { contains: conversationId } } }),
    ).toBe(notificationsBefore);

    await page.getByRole('button', { name: 'Répondre', exact: true }).click();
    await page
      .getByLabel('Votre réponse à la cliente')
      .fill('Bonjour, merci pour votre message. Nous vous répondons avec plaisir.');
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect
      .poll(
        async () =>
          db.message.count({ where: { conversationId, author: 'ADMIN', isInternal: false } }),
        { timeout: 20_000 },
      )
      .toBe(1);
    const adminMessage = await db.message.findFirst({
      where: { conversationId, author: 'ADMIN', isInternal: false },
    });
    expect(adminMessage?.content).toContain('merci pour votre message');
    const replyNotification = await db.notification.findFirst({
      where: { templateKey: 'conversation_reply', recipient: customerEmail },
    });
    expect(replyNotification).not.toBeNull();

    await page.getByTitle(/^Statut :/).click();
    await page
      .getByRole('dialog', { name: 'Statut de la conversation' })
      .getByRole('button', { name: /^Traité/ })
      .click();
    await expect
      .poll(
        async () => {
          const row = await db.conversation.findUnique({ where: { id: conversationId } });
          return row?.status;
        },
        { timeout: 15_000 },
      )
      .toBe('TREATED');

    await page.reload();
    await expect(page.getByTitle('Statut : Traité')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/e2e/screenshots/messagerie-conversation-desktop.png',
      caret: 'initial',
    });

    await page.goto('/dashboard/notifications');
    await expect(page.getByText(subject).first()).toBeVisible();
    await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
    await page.waitForTimeout(500);
    const unread = await db.notification.count({
      where: { channel: 'IN_APP', readAt: null },
    });
    expect(unread).toBe(0);
    await page.screenshot({
      path: 'tests/e2e/screenshots/notifications-desktop.png',
      fullPage: true,
      caret: 'initial',
    });
  });

  test('should expose a failed e-mail and retry it from the dashboard', async ({
    page,
    request,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    const notification = await db.notification.create({
      data: {
        idempotencyKey: `${prefix}:failed-email`,
        recipient: customerEmail,
        templateKey: 'booking_confirmed',
        status: 'FAILED',
        attempts: 2,
        error: 'Erreur simulée pour le test.',
        payload: {
          kind: 'appointment',
          appointmentId,
          customerName: 'Cliente Notification E2E',
          serviceName: `ZZ E2E Notification ${stamp}`,
          startsAt: new Date().toISOString(),
          status: 'CONFIRMED',
        },
      },
    });
    failedNotificationId = notification.id;

    await login(page, '/dashboard/notifications?filter=failed');
    await page.goto('/dashboard/notifications?filter=failed');
    await expect(page.getByText('Erreur simulée pour le test.')).toBeVisible();
    await page.getByRole('button', { name: 'Relancer' }).first().click();
    await expect
      .poll(async () => {
        const row = await db.notification.findUnique({ where: { id: notification.id } });
        return row?.status;
      })
      .toBe('PENDING');

    const cron = await request.post('/api/cron/notifications', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cron.ok()).toBe(true);
    await expect
      .poll(async () => {
        const row = await db.notification.findUnique({ where: { id: notification.id } });
        return row?.status;
      })
      .toBe('SENT');
  });

  test('should queue reminders once and never duplicate them', async ({ request }) => {
    const first = await request.post('/api/cron/reminders', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(first.ok()).toBe(true);
    const firstBody = (await first.json()) as { reminders: { queued: number } };
    expect(firstBody.reminders.queued).toBeGreaterThanOrEqual(1);

    const second = await request.post('/api/cron/reminders', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(second.ok()).toBe(true);
    const secondBody = (await second.json()) as { reminders: { queued: number } };
    expect(secondBody.reminders.queued).toBe(0);

    const reminders = await db.notification.findMany({
      where: { idempotencyKey: { contains: `appointment:${appointmentId}:reminder` } },
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].status).toBe('SENT');
    expect(reminders[0].templateKey).toBe('booking_reminder');
  });

  test('should render messaging on mobile without overflow', async ({ browser }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await login(page);
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'tests/e2e/screenshots/messagerie-mobile.png',
      fullPage: false,
      caret: 'initial',
    });
    await context.close();
  });
});

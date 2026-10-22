import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { queueAppointmentNotifications } from './notifications';

/**
 * P11.1 : les clés d'idempotence doivent être stables et uniques par
 * événement, destinataire et canal. L'unicité en base est la dernière barrière.
 */
function fakeTransaction() {
  const rows: Array<Record<string, unknown>> = [];
  const keys = new Set<string>();
  const tx = {
    notification: {
      createMany: async ({
        data,
      }: {
        data: Array<Record<string, unknown>>;
        skipDuplicates?: boolean;
      }) => {
        for (const row of data) {
          const key = String(row.idempotencyKey);
          if (keys.has(key)) continue;
          keys.add(key);
          rows.push(row);
        }
        return { count: data.length };
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, rows };
}

const context = {
  appointmentId: 'appointment-1',
  customerName: 'Amina',
  customerEmail: 'amina@example.com',
  customerPhone: '06 12 34 56 78',
  serviceName: 'Tresses BOX',
  startsAt: new Date('2026-10-22T08:00:00.000Z'),
  endsAt: new Date('2026-10-22T09:45:00.000Z'),
  status: 'CONFIRMED',
  cancelToken: 'a'.repeat(64),
  settings: { contactEmail: 'patron@example.com' },
};

describe('queueAppointmentNotifications', () => {
  it('should create client and admin notifications with unique stable keys', async () => {
    const { tx, rows } = fakeTransaction();
    await queueAppointmentNotifications(tx, 'created', context);
    await queueAppointmentNotifications(tx, 'created', context);

    expect(rows).toHaveLength(3);
    const keys = rows.map((row) => String(row.idempotencyKey));
    expect(new Set(keys).size).toBe(3);
    expect(keys.every((key) => key.startsWith('appointment:appointment-1:created:'))).toBe(true);
    expect(rows.some((row) => row.channel === 'IN_APP')).toBe(true);
    expect(rows.some((row) => row.templateKey === 'admin_new_booking')).toBe(true);
  });

  it('should use the event suffix when provided to separate legitimate sends', async () => {
    const { tx, rows } = fakeTransaction();
    await queueAppointmentNotifications(tx, 'created', { ...context, status: 'PENDING' });
    await queueAppointmentNotifications(tx, 'created', {
      ...context,
      status: 'PENDING',
      idempotencySuffix: 'retry',
    });
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((row) => String(row.idempotencyKey))).size).toBe(6);
  });

  it('should not create admin email when no recipient is configured', async () => {
    vi.stubEnv('ADMIN_EMAIL', '');
    const { tx, rows } = fakeTransaction();
    await queueAppointmentNotifications(tx, 'created', {
      ...context,
      settings: { contactEmail: null },
    });
    expect(rows.every((row) => String(row.idempotencyKey).includes(':client:'))).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe('queueAppointmentNotifications locale', () => {
  it('should carry the customer locale and a localized cancel link in the payload', async () => {
    const { tx, rows } = fakeTransaction();
    await queueAppointmentNotifications(tx, 'created', { ...context, locale: 'de' });
    const client = rows.find((row) => row.templateKey === 'booking_received');
    const payload = client?.payload as { locale: string; cancelUrl: string };
    expect(payload.locale).toBe('de');
    expect(payload.cancelUrl).toBe(`http://localhost:3000/de/annulation/${'a'.repeat(64)}`);
  });

  it('should default to French without a prefix', async () => {
    const { tx, rows } = fakeTransaction();
    await queueAppointmentNotifications(tx, 'created', context);
    const payload = rows[0]?.payload as { locale: string; cancelUrl: string };
    expect(payload.locale).toBe('fr');
    expect(payload.cancelUrl).toBe(`http://localhost:3000/annulation/${'a'.repeat(64)}`);
  });
});

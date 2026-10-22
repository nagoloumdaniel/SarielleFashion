import type { SalonSettings } from '@prisma/client';
import { db } from '@/lib/db';

/* ============================================================
 * Lectures des disponibilités et paramètres du salon (P6.1, P6.10)
 * ============================================================ */

export interface SalonSettingsData {
  name: string;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  holdSlotMinutes: number;
  minCancelNoticeHours: number;
  reminderLeadHours: number;
  bufferMinutes: number;
  slotIntervalMinutes: number;
  maxAdvanceDays: number;
  minLeadTimeMinutes: number;
  cancelReasonRequired: boolean;
  logoUrl: string | null;
  openingHours: unknown;
  emailSignature: string | null;
  cancellationPolicy: string | null;
  bookingPolicy: string | null;
  dataRetentionMonths: number;
  photoRetentionDays: number;
  /** Coiffure à domicile proposée en option payante. */
  homeServiceEnabled: boolean;
  /** Frais de déplacement, en 1/100 FCFA (affichage = valeur / 100). */
  travelFeeCents: number;
}

export const DEFAULT_SALON_SETTINGS: SalonSettingsData = {
  name: 'Hairstyle by Patricia',
  contactEmail: null,
  phone: null,
  address: null,
  holdSlotMinutes: 30,
  minCancelNoticeHours: 24,
  reminderLeadHours: 24,
  bufferMinutes: 0,
  slotIntervalMinutes: 15,
  maxAdvanceDays: 60,
  minLeadTimeMinutes: 120,
  cancelReasonRequired: false,
  logoUrl: null,
  openingHours: null,
  emailSignature: null,
  cancellationPolicy: null,
  bookingPolicy: null,
  dataRetentionMonths: 36,
  photoRetentionDays: 90,
  homeServiceEnabled: false,
  travelFeeCents: 0,
};

export function mapSalonSettings(row: SalonSettings): SalonSettingsData {
  return {
    name: row.name,
    contactEmail: row.contactEmail,
    phone: row.phone,
    address: row.address,
    holdSlotMinutes: row.holdSlotMinutes,
    minCancelNoticeHours: row.minCancelNoticeHours,
    reminderLeadHours: row.reminderLeadHours,
    bufferMinutes: row.bufferMinutes,
    slotIntervalMinutes: row.slotIntervalMinutes,
    maxAdvanceDays: row.maxAdvanceDays,
    minLeadTimeMinutes: row.minLeadTimeMinutes,
    cancelReasonRequired: row.cancelReasonRequired,
    logoUrl: row.logoUrl,
    openingHours: row.openingHours,
    emailSignature: row.emailSignature,
    cancellationPolicy: row.cancellationPolicy,
    bookingPolicy: row.bookingPolicy,
    dataRetentionMonths: row.dataRetentionMonths,
    photoRetentionDays: row.photoRetentionDays,
    homeServiceEnabled: row.homeServiceEnabled,
    travelFeeCents: row.travelFeeCents,
  };
}

export async function getSalonSettings(): Promise<SalonSettingsData> {
  const row = await db.salonSettings.findUnique({ where: { id: 1 } });
  return row ? mapSalonSettings(row) : DEFAULT_SALON_SETTINGS;
}

export async function listAvailabilityRules() {
  return db.availabilityRule.findMany({
    orderBy: [{ kind: 'asc' }, { weekday: 'asc' }, { date: 'asc' }, { startMinute: 'asc' }],
  });
}

export async function listBlockedPeriods() {
  const now = new Date();
  return db.blockedPeriod.findMany({
    where: { endsAt: { gte: new Date(now.getTime() - 7 * 24 * 3_600_000) } },
    orderBy: { startsAt: 'asc' },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });
}

import type { AppointmentStatus } from '@prisma/client';
import { AppError } from '@/lib/errors';

/* ============================================================
 * Machine à statuts des réservations (P6.5)
 * Toute transition est décidée côté serveur, jamais par le client.
 * ============================================================ */

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'RESCHEDULED',
];

export const TERMINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_ADMIN',
  'COMPLETED',
  'NO_SHOW',
];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'En attente de confirmation',
  CONFIRMED: 'Confirmée',
  RESCHEDULED: 'Reprogrammée',
  CANCELLED_BY_CUSTOMER: 'Annulée par la cliente',
  CANCELLED_BY_ADMIN: 'Annulée par Patricia',
  COMPLETED: 'Terminée',
  NO_SHOW: 'Cliente absente',
};

export const APPOINTMENT_STATUS_SHORT_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  RESCHEDULED: 'Reprogrammée',
  CANCELLED_BY_CUSTOMER: 'Annulée cliente',
  CANCELLED_BY_ADMIN: 'Annulée Patricia',
  COMPLETED: 'Terminée',
  NO_SHOW: 'Absente',
};

export const APPOINTMENT_STATUS_TONES: Record<
  AppointmentStatus,
  'accent' | 'success' | 'alert' | 'neutral'
> = {
  PENDING: 'accent',
  CONFIRMED: 'success',
  RESCHEDULED: 'accent',
  CANCELLED_BY_CUSTOMER: 'alert',
  CANCELLED_BY_ADMIN: 'alert',
  COMPLETED: 'neutral',
  NO_SHOW: 'alert',
};

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'RESCHEDULED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'],
  CONFIRMED: ['RESCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'],
  RESCHEDULED: [
    'CONFIRMED',
    'RESCHEDULED',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED_BY_CUSTOMER',
    'CANCELLED_BY_ADMIN',
  ],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_ADMIN: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function isActiveAppointmentStatus(status: AppointmentStatus): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.includes(status);
}

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: AppointmentStatus): AppointmentStatus[] {
  return [...(TRANSITIONS[from] ?? [])];
}

export function assertTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cette action est impossible depuis le statut « ${APPOINTMENT_STATUS_LABELS[from] ?? from} ».`,
      409,
    );
  }
}

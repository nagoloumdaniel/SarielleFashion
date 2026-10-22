import { z } from 'zod';

/* ============================================================
 * Validation Zod des réservations et annulations (P6.3 à P6.8)
 * ============================================================ */

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (timeZone) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Fuseau horaire invalide.' },
  );

export const dateISOSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.');

const nameSchema = z.string().trim().min(2, 'Indiquez votre nom.').max(80, 'Le nom est trop long.');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email('Adresse e-mail invalide.'));

const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Numéro de téléphone trop court.')
  .max(30, 'Numéro de téléphone trop long.')
  .regex(/^[0-9+\s().-]+$/, 'Numéro de téléphone invalide.');

const commentSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : ''),
  z.string().max(1000, 'Le commentaire est limité à 1000 caractères.').default(''),
);

const consentSchema = z.preprocess(
  (value) => value === 'on' || value === true || value === 'true',
  z.boolean().refine((value) => value, {
    message: 'Vous devez accepter les conditions de réservation.',
  }),
);

const homeServiceSchema = z.preprocess(
  (value) => value === 'on' || value === true || value === 'true',
  z.boolean().default(false),
);

/** Adresse ou quartier de la cliente pour la coiffure à domicile (texte libre borné). */
export const HOME_ADDRESS_MIN = 5;
export const HOME_ADDRESS_MAX = 300;

const homeAddressSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : ''),
  z.string().max(HOME_ADDRESS_MAX, `L’adresse est limitée à ${HOME_ADDRESS_MAX} caractères.`),
);

export const bookingRequestSchema = z
  .object({
    serviceSlug: z.string().trim().min(1, 'Prestation manquante.').max(160),
    dateISO: dateISOSchema,
    startsAt: z.string().datetime({ offset: true }),
    timeZone: timeZoneSchema,
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    comment: commentSchema,
    consent: consentSchema,
    // Code promo facultatif : seulement borné ici, la validité réelle est revérifiée par createBooking.
    promoCode: z.string().trim().max(40, 'Code promo invalide.').default(''),
    // Coiffure à domicile : seule la demande est lue ici, les frais sont recalculés côté serveur.
    homeService: homeServiceSchema,
    homeAddress: homeAddressSchema,
  })
  .superRefine((value, ctx) => {
    if (value.homeService && value.homeAddress.length < HOME_ADDRESS_MIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['homeAddress'],
        message: 'Indiquez votre adresse ou votre quartier pour la coiffure à domicile.',
      });
    }
  })
  .transform((value) => ({
    ...value,
    homeAddress: value.homeService ? value.homeAddress : '',
  }));

export const promoCodeRequestSchema = z.object({
  serviceSlug: z.string().trim().min(1, 'Prestation manquante.').max(160),
  code: z
    .string()
    .trim()
    .min(1, 'Saisissez un code promo.')
    .max(40, 'Ce code promo n’est pas valide.'),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const bookingSlotsSchema = z.object({
  serviceSlug: z.string().trim().min(1).max(160),
  dateISO: dateISOSchema,
  timeZone: timeZoneSchema,
});

export const adminCancelSchema = z.object({
  appointmentId: z.string().trim().min(1, 'Rendez-vous manquant.'),
  reason: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().max(500, 'Le motif est limité à 500 caractères.').default(''),
  ),
});

export const customerCancelSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{64}$/, 'Lien d’annulation invalide.'),
  reason: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z.string().max(500, 'Le motif est limité à 500 caractères.').default(''),
  ),
});

export const adminRescheduleSchema = z.object({
  appointmentId: z.string().trim().min(1, 'Rendez-vous manquant.'),
  dateISO: dateISOSchema,
  startsAt: z.string().datetime({ offset: true }),
  timeZone: timeZoneSchema,
});

export const adminRescheduleSlotsSchema = z.object({
  appointmentId: z.string().trim().min(1),
  dateISO: dateISOSchema,
  timeZone: timeZoneSchema,
});

export const APPOINTMENT_ACTION_STATUSES = ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] as const;

export const adminStatusSchema = z.object({
  appointmentId: z.string().trim().min(1, 'Rendez-vous manquant.'),
  status: z.enum(APPOINTMENT_ACTION_STATUSES),
});

export const calendarQuerySchema = z.object({
  view: z.enum(['day', 'week', 'month', 'list']).default('week'),
  dateISO: dateISOSchema.optional(),
  timeZone: timeZoneSchema,
});

export const bookingReference = (appointmentId: string): string =>
  `AP-${appointmentId.slice(-6).toUpperCase()}`;

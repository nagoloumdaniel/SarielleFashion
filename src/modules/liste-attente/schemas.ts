import { z } from 'zod';

export const waitlistEntrySchema = z.object({
  serviceId: z.string().trim().min(1, 'Prestation invalide.').max(64),
  startsAtISO: z.string().trim().min(1, 'Créneau invalide.'),
  name: z.string().trim().min(2, 'Nom requis (2 caractères minimum).').max(100),
  email: z.string().trim().email('E-mail invalide.').max(200),
  phone: z
    .string()
    .trim()
    .min(8, 'Téléphone invalide.')
    .max(30)
    .regex(/^[+\d\s().-]*$/, 'Téléphone invalide (chiffres, espaces et + uniquement).'),
  website: z.string().optional().default(''), // honeypot anti-spam
});

export type WaitlistEntryInput = z.infer<typeof waitlistEntrySchema>;

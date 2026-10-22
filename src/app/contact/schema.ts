import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis (2 caractères minimum)').max(100),
  email: z.string().email('E-mail invalide').max(200),
  // Facultatif : une valeur vide (champ laissé blanc) est acceptée, sinon 8 caractères minimum.
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === '' || value.length >= 8, 'Téléphone invalide')
    .optional()
    .default(''),
  subject: z.string().min(3, 'Sujet requis').max(200),
  message: z.string().trim().min(10, 'Message trop court (10 caractères minimum)').max(2000),
  // Honeypot : champ caché, doit rester vide pour un humain.
  website: z.string().optional().default(''),
});

import { z } from 'zod';

/** Erreur applicative contrôlée - jamais leakée telle quelle au client. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const loginSchema = z.object({
  email: z.string().email('E-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

/**
 * Valide une entrée brute (FormData, JSON…) contre un schéma Zod.
 * Toute entrée utilisateur doit passer par ici (P1.9).
 */
export function parseInput<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new AppError('VALIDATION', 'Données invalides', 400);
  }
  return result.data;
}

export { loginSchema };

'use server';

import { z } from 'zod';
import { AuthError } from 'next-auth';
import { compare, hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { parseInput } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/modules/stats/audit';
import { signIn, signOut } from './auth';
import { invalidateAdminCache, requireAdmin } from './guards';

export interface LoginFormState {
  error?: string;
}

const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email('E-mail invalide')),
  password: z.string().min(1, 'Mot de passe requis').max(200),
});

/**
 * Connexion administrateur (P1.7 + P1.9) - validation Zod centralisée
 * via parseInput, messages d'erreur volontairement identiques
 * (e-mail inconnu / mot de passe faux) pour ne pas révéler quels
 * comptes existent. Le callbackUrl est validé séparément : seules
 * les destinations /dashboard* sont autorisées (anti open-redirect).
 */
export async function login(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  let credentials: z.infer<typeof loginFormSchema>;
  try {
    credentials = parseInput(loginFormSchema, Object.fromEntries(formData));
  } catch {
    return { error: 'E-mail ou mot de passe incorrect.' };
  }
  const rawCallback = String(formData.get('callbackUrl') ?? '/dashboard');
  const redirectTo =
    rawCallback === '/dashboard' || rawCallback.startsWith('/dashboard/')
      ? rawCallback
      : '/dashboard';

  try {
    await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'E-mail ou mot de passe incorrect.' };
    }
    throw error; // erreurs de redirection attendues d'Auth.js
  }

  return {};
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/connexion' });
}

/* ------------------------------------------------------------------ */
/* Sécurité du compte admin : révocation des sessions, mot de passe   */
/* ------------------------------------------------------------------ */

export interface AccountActionState {
  error?: string;
  success?: string;
}

const PASSWORD_WINDOW_MS = 15 * 60_000;
const PASSWORD_MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 12;

/** Redirection Next.js (signOut/redirect) : à laisser remonter, pas à traiter comme erreur. */
function isRedirect(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis.').max(200),
    newPassword: z
      .string()
      .min(12, 'Le nouveau mot de passe doit contenir au moins 12 caractères.')
      .max(200, 'Mot de passe trop long.')
      .regex(/[A-Z]/, 'Ajoutez au moins une majuscule.')
      .regex(/[a-z]/, 'Ajoutez au moins une minuscule.')
      .regex(/\d/, 'Ajoutez au moins un chiffre.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'La confirmation ne correspond pas au nouveau mot de passe.',
    path: ['confirmPassword'],
  });

/**
 * Déconnecte tous les appareils : incrémente User.sessionVersion (les JWT portant
 * l'ancienne version sont refusés par requireAdmin), puis déconnecte l'appelante.
 */
export async function revokeAllSessions(): Promise<AccountActionState> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Accès interdit.' };
  try {
    await db.user.update({
      where: { id: admin.id },
      data: { sessionVersion: { increment: 1 } },
    });
  } catch (error) {
    console.error('[auth] revokeAllSessions', error);
    return { error: 'Impossible de révoquer les sessions. Réessayez.' };
  }
  invalidateAdminCache(admin.id);
  await logAudit({
    userId: admin.id,
    action: 'auth.sessions.revoke',
    entityType: 'User',
    entityId: admin.id,
  });
  // Redirection (lève NEXT_REDIRECT) : la session courante porte l'ancienne version.
  await signOut({ redirectTo: '/connexion' });
  return { success: 'Sessions révoquées.' };
}

/**
 * Changement de mot de passe admin. Incrémente sessionVersion (révoque les autres
 * appareils) puis ré-authentifie l'appelante avec le nouveau mot de passe pour
 * réémettre son JWT avec le nouveau sv (elle reste connectée). Si la
 * ré-authentification échoue : déconnexion propre vers /connexion.
 */
export async function changeAdminPassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Accès interdit.' };

  const limit = await rateLimit(`auth:password:${admin.id}`, {
    max: PASSWORD_MAX_ATTEMPTS,
    windowMs: PASSWORD_WINDOW_MS,
  });
  if (!limit.allowed) return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' };

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  const input = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id: admin.id },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) return { error: 'Accès interdit.' };
    if (!(await compare(input.currentPassword, user.passwordHash))) {
      return { error: 'Mot de passe actuel incorrect.' };
    }
    if (input.newPassword === input.currentPassword) {
      return { error: 'Le nouveau mot de passe doit être différent de l’actuel.' };
    }
    const passwordHash = await hash(input.newPassword, BCRYPT_ROUNDS);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    invalidateAdminCache(user.id);
    await logAudit({
      userId: user.id,
      action: 'auth.password.change',
      entityType: 'User',
      entityId: user.id,
    });

    try {
      await signIn('credentials', {
        email: user.email,
        password: input.newPassword,
        redirect: false,
      });
    } catch {
      await signOut({ redirectTo: '/connexion' });
    }
    return { success: 'Mot de passe modifié. Les autres appareils sont déconnectés.' };
  } catch (error) {
    if (isRedirect(error)) throw error;
    console.error('[auth] changeAdminPassword', error);
    return { error: 'Impossible de modifier le mot de passe. Réessayez.' };
  }
}

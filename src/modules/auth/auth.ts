import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { authConfig } from './auth.config';

const credentialsSchema = z.object({
  email: z.string().email('E-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const DUMMY_HASH = '$2b$10$TkaaGaapCpXjproisoFh8ODsB3AT.QiuJFDYXqcE/XWE3V.sFUwma';

const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_EMAIL_MAX = 8;
const LOGIN_IP_MAX = 30;
/** Backoff simple : au-delà de 3 tentatives sur un e-mail, 400 ms de délai par tentative en plus. */
const BACKOFF_FREE_ATTEMPTS = 3;
const BACKOFF_STEP_MS = 400;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // P9.3 : limitation par e-mail (sans IP : un attaquant ne la contourne pas en la
        // changeant) ET par IP. Réponse identique à un mauvais mot de passe (anti-énumération).
        const ip = await getClientIp();
        const [emailLimit, ipLimit] = await Promise.all([
          rateLimit(`login:email:${email}`, { max: LOGIN_EMAIL_MAX, windowMs: LOGIN_WINDOW_MS }),
          rateLimit(`login:ip:${ip}`, { max: LOGIN_IP_MAX, windowMs: LOGIN_WINDOW_MS }),
        ]);
        if (!emailLimit.allowed || !ipLimit.allowed) return null;
        const attempt = LOGIN_EMAIL_MAX - emailLimit.remaining;
        if (attempt > BACKOFF_FREE_ATTEMPTS) {
          await sleep((attempt - BACKOFF_FREE_ATTEMPTS) * BACKOFF_STEP_MS);
        }

        const user = await db.user.findUnique({ where: { email } });
        // Comparaison systématique (hash factice) : pas d'énumération par le temps de réponse.
        const valid = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});

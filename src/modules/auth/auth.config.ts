import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@prisma/client';

const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Configuration Auth.js partagée middleware (edge, sans Prisma) et
 * serveur (src/modules/auth/auth.ts). P1.7/P1.8.
 */
export const authConfig = {
  pages: {
    signIn: '/connexion',
  },
  // Session persistante : l'admin reste connectée jusqu'à la déconnexion explicite.
  // Le JWT est renouvelé à chaque visite (au plus une fois par jour) : tant que la
  // dashboard est utilisée au moins une fois par an, la session ne tombe pas.
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 24 * 60 * 60,
  },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  // P9.4 : cookie de session explicite, HttpOnly, SameSite Lax et Secure en production.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
  },
  // Pas de provider ici : le middleware ne doit jamais importer Prisma
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        // Version de session au login : requireAdmin la compare à la base (révocation).
        token.sv = user.sessionVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.role = (typeof token.role === 'string' ? token.role : 'ADMIN') as Role;
        // Jetons émis avant l'introduction de sv : équivalent à la version par défaut (0).
        session.user.sv = typeof token.sv === 'number' ? token.sv : 0;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

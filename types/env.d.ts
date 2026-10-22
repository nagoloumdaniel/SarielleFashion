/**
 * Typage strict des variables d'environnement (P0.6 + P0.7).
 *
 * Seules les variables effectivement lues par le code sont requises.
 * Les variables des phases futures restent optionnelles : les renseigner
 * ne sert a rien tant que le module correspondant n'existe pas.
 * `tsc --noEmit` (pre-commit + CI) echoue sur toute lecture d'une
 * variable non declaree : c'est le garde-fou des oublis de config.
 *
 * Toutes les variables non prefixees NEXT_PUBLIC_ restent cote serveur
 * et ne doivent jamais etre lues dans un composant client (§15.1).
 */
declare namespace NodeJS {
  interface ProcessEnv {
    // --- Base de donnees (Neon / PostgreSQL), lues par Prisma ---
    readonly DATABASE_URL: string;
    readonly DIRECT_URL: string;

    // --- Application ---
    readonly NEXT_PUBLIC_APP_URL: string;
    readonly NEXT_PUBLIC_APP_LOCALE: string;
    readonly ADMIN_EMAIL?: string;

    // --- Authentification (Auth.js + seed P1.6/P1.7) ---
    readonly AUTH_SECRET: string;
    readonly NEXTAUTH_URL?: string;
    readonly AUTH_ADMIN_EMAIL?: string;
    readonly AUTH_ADMIN_PASSWORD?: string;

    // --- E-mails (Gmail SMTP) ---
    readonly EMAIL_FROM?: string;

    // --- Phases futures (S3/R2, Sentry, politique salon) ---
    readonly S3_ENDPOINT?: string;
    readonly S3_REGION?: string;
    readonly S3_BUCKET?: string;
    readonly S3_ACCESS_KEY_ID?: string;
    readonly S3_SECRET_ACCESS_KEY?: string;
    readonly SIGNED_URL_TTL_SECONDS?: string;
    readonly UPLOAD_MAX_BYTES?: string;
    readonly UPLOAD_ALLOWED_MIME?: string;
    readonly REMINDER_LEAD_HOURS?: string;
    readonly TOKEN_SIGNATURE_SECRET?: string;
    readonly CANCEL_LINK_TTL_HOURS?: string;
    readonly HOLD_SLOT_MINUTES?: string;
    readonly MIN_CANCEL_NOTICE_HOURS?: string;
    readonly NEXT_PUBLIC_SENTRY_DSN?: string;
    readonly SENTRY_AUTH_TOKEN?: string;

    // --- Environnement (injected by Vercel / Node) ---
    readonly NODE_ENV?: 'development' | 'production' | 'test';
    readonly VERCEL?: string;
    readonly PORT?: string;
  }
}

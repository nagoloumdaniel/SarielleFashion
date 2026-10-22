/* Content-Security-Policy partagée entre next.config.ts (pages publiques statiques)
   et le middleware (pages privées dynamiques, CSP stricte à nonce). */

/** Domaine du bucket S3/R2 (P4.4, P8.11) : présent seulement si configuré. */
function storageHostname(): string | null {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) return null;
  try {
    return new URL(endpoint).hostname;
  } catch {
    return null;
  }
}

/** Sources d'images autorisées : plus de https: générique. */
export function imgSources(): string[] {
  const host = storageHostname();
  return [
    "'self'",
    'data:',
    'blob:',
    'https://images.pexels.com',
    // URLs signées du bucket R2 (path-style : <compte>.r2.cloudflarestorage.com) et hôte configuré.
    'https://*.r2.cloudflarestorage.com',
    ...(host ? [`https://${host}`] : []),
  ];
}

const COMMON = (): string[] => [
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSources().join(' ')}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
];

/** Pages publiques statiques : Next injecte des scripts inline d'hydratation, sans nonce possible. */
export function publicCsp(): string {
  return ["default-src 'self'", "script-src 'self' 'unsafe-inline'", ...COMMON()].join('; ');
}

/** Pages dynamiques privées : seuls les scripts portant le nonce (ou une empreinte listée) s'exécutent. */
export function strictCsp(nonce: string, scriptHashes: string[]): string {
  const hashes = scriptHashes.map((hash) => `'sha256-${hash}'`).join(' ');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${hashes}`.trim(),
    ...COMMON(),
  ].join('; ');
}

import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { strictCsp } from '@/lib/csp';
import { DASHBOARD_THEME_SCRIPT, THEME_SCRIPT } from '@/lib/inline-scripts';
import { authConfig } from '@/modules/auth/auth.config';

// Middleware edge-safe : décode le JWT uniquement, n'importe JAMAIS
// Prisma ici (P1.8).
const { auth } = NextAuth(authConfig);

const isProduction = process.env.NODE_ENV === 'production';

/* Empreintes sha256 (base64) des scripts inline écrits à la main, calculées une seule fois. */
let scriptHashes: Promise<string[]> | null = null;
function inlineScriptHashes(): Promise<string[]> {
  scriptHashes ??= Promise.all(
    [THEME_SCRIPT, DASHBOARD_THEME_SCRIPT].map(async (script) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script));
      return btoa(String.fromCharCode(...new Uint8Array(digest)));
    }),
  );
  return scriptHashes;
}

export default auth(async (req) => {
  const isLoggedIn = req.auth?.user?.role === 'ADMIN';
  const { pathname } = req.nextUrl;
  const isOnDashboard = pathname.startsWith('/dashboard');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (isAdminApi && !isLoggedIn) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  if (isOnDashboard && !isLoggedIn) {
    const loginUrl = new URL('/connexion', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Pages privées dynamiques : CSP stricte à nonce (Next ajoute le nonce à ses scripts
  // en lisant l'en-tête de requête). Les pages publiques gardent la CSP statique de next.config.ts.
  if (isProduction && (isOnDashboard || pathname === '/connexion')) {
    const nonce = btoa(crypto.randomUUID());
    const csp = strictCsp(nonce, await inlineScriptHashes());
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('Content-Security-Policy', csp);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  return NextResponse.next();
});

export const config = {
  // Dashboard, API admin et page de connexion (CSP à nonce)
  matcher: ['/dashboard/:path*', '/api/admin/:path*', '/connexion'],
};

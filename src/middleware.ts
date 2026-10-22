import NextAuth from 'next-auth';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { strictCsp } from '@/lib/csp';
import { DASHBOARD_THEME_SCRIPT, THEME_SCRIPT } from '@/lib/inline-scripts';
import { authConfig } from '@/modules/auth/auth.config';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isUnlocalizedPath,
  stripLocale,
  type Locale,
} from '@/i18n/config';

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

/* Espace privé (français, hors i18n) : dashboard, API admin, connexion. */
const authMiddleware = auth(async (req) => {
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
    requestHeaders.set(LOCALE_HEADER, DEFAULT_LOCALE);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, DEFAULT_LOCALE);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

function isPrivatePath(pathname: string): boolean {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/api/admin/') ||
    pathname === '/connexion'
  );
}

/* Site public bilingue : français sans préfixe, allemand sous /de.
   /de/... est réécrit vers la même route interne (aucun dossier [locale]) ;
   la langue est transmise aux composants serveur par l'en-tête x-locale. */
function localeMiddleware(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;
  const { locale, path: internalPath } = stripLocale(pathname);

  // /de/dashboard, /de/connexion, /de/api... n'existent pas : retour à la route réelle.
  if (locale !== DEFAULT_LOCALE && isUnlocalizedPath(internalPath)) {
    const url = req.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.redirect(url, 308);
  }
  // /fr/... : le français n'a pas de préfixe (une seule URL canonique par page).
  if (pathname === '/fr' || pathname.startsWith('/fr/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === '/fr' ? '/' : pathname.slice(3);
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  let response: NextResponse;
  if (locale === DEFAULT_LOCALE) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    const url = req.nextUrl.clone();
    url.pathname = internalPath.split('?')[0] ?? '/';
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  rememberLocale(req, response, locale);
  return response;
}

/** Mémorise la dernière langue visitée (cookie 1 an, sans effet sur l'URL ni de redirection). */
function rememberLocale(req: NextRequest, response: NextResponse, locale: Locale) {
  if (req.method !== 'GET') return;
  if (req.cookies.get(LOCALE_COOKIE)?.value === locale) return;
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: isProduction,
  });
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isPrivatePath(req.nextUrl.pathname)) {
    return (authMiddleware as unknown as (r: NextRequest, e: NextFetchEvent) => Promise<Response>)(
      req,
      event,
    );
  }
  return localeMiddleware(req);
}

export const config = {
  // Tout sauf : assets Next, fichiers avec extension (robots.txt, sitemap.xml, images...) et API publiques.
  // /api/admin reste couvert (authentification).
  matcher: ['/((?!_next/|api/|.*\\..*).*)', '/api/admin/:path*'],
};

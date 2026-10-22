'use client';

import NextLink from 'next/link';
import { useRouter as useNextRouter, usePathname as useNextPathname } from 'next/navigation';
import { useCallback, useMemo, type ComponentProps } from 'react';
import { localePath, stripLocale } from './config';
import { useLocale } from './client';

/* <Link> qui préfixe automatiquement /de en allemand (chemins internes uniquement). */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const resolved = typeof href === 'string' ? localePath(locale, href) : href;
  return <NextLink href={resolved} {...props} />;
}

/** Routeur dont push/replace/prefetch conservent la langue. */
export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  const push = useCallback(
    (href: string, o?: Parameters<typeof router.push>[1]) =>
      router.push(localePath(locale, href), o),
    [router, locale],
  );
  const replace = useCallback(
    (href: string, o?: Parameters<typeof router.replace>[1]) =>
      router.replace(localePath(locale, href), o),
    [router, locale],
  );
  const prefetch = useCallback(
    (href: string) => router.prefetch(localePath(locale, href)),
    [router, locale],
  );
  return useMemo(() => ({ ...router, push, replace, prefetch }), [router, push, replace, prefetch]);
}

/** Chemin courant SANS préfixe de langue (comparaisons de navigation active). */
export function usePathname(): string {
  return stripLocale(useNextPathname() ?? '/').path;
}

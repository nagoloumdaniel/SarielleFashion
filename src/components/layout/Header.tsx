'use client';

import { CalendarDays, Menu, X } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { Link, usePathname } from '@/i18n/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/shared/Logo';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SocialLinks } from './SocialLinks';
import { ThemeToggle } from './ThemeToggle';

/* Barre de navigation pleine largeur en verre (web + mobile), bordure basse,
   menu mobile déployé dessous. Règles : DESIGN-RULES.md. */
const LINKS = [
  { href: '/', key: 'home' },
  { href: '/coiffures', key: 'catalogue' },
  { href: '/galerie', key: 'gallery' },
  { href: '/faq', key: 'faq' },
  { href: '/demandes-personnalisees', key: 'custom' },
  { href: '/contact', key: 'contact' },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname.startsWith('/connexion') || pathname.startsWith('/dashboard')) return null;

  return (
    <>
      {/* Réserve la hauteur de la navbar fixe pour ne pas masquer le contenu. */}
      <div aria-hidden="true" className="h-16 md:h-[4.5rem]" />
      <header className="nav-floating glass-strong" data-open={open}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="shrink-0" aria-label={t('nav.homeAria')}>
            <Logo markClassName="h-8 w-auto text-fg" wordmarkClassName="hidden sm:inline" />
          </Link>
          <nav aria-label={t('nav.main')} className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active =
                l.href === '/'
                  ? pathname === '/'
                  : pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-semibold transition ${
                    active ? 'bg-accent-soft text-fg' : 'text-fg hover:bg-accent-soft'
                  }`}
                >
                  {t(`nav.${l.key}`)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <SocialLinks />
            <LanguageSwitcher className="hidden sm:block" />
            <ThemeToggle />
            <ButtonLink href="/coiffures" size="sm" icon={CalendarDays}>
              {t('nav.reserve')}
            </ButtonLink>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              icon={open ? X : Menu}
              aria-expanded={open}
              aria-controls="menu-mobile"
              title={open ? t('nav.closeMenu') : t('nav.openMenu')}
              onClick={() => setOpen((v) => !v)}
              className="md:hidden"
            >
              {open ? t('nav.closeMenu') : t('nav.openMenu')}
            </Button>
          </div>
        </div>
        {open ? (
          <nav
            id="menu-mobile"
            aria-label={t('nav.mobile')}
            className="border-t border-line px-3 pb-3 pt-2 md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={pathname === l.href ? 'page' : undefined}
                    className="block rounded-[var(--radius-md)] px-4 py-3 font-bold text-fg hover:bg-accent-soft aria-[current=page]:bg-accent-soft"
                  >
                    {t(`nav.${l.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
            <LanguageSwitcher className="mt-3 px-1 sm:hidden" />
          </nav>
        ) : null}
      </header>
    </>
  );
}

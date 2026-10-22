import { LogoMark } from '@/components/shared/Logo';
import { getI18n } from '@/i18n/server';
import { Link } from '@/i18n/link';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SOCIALS } from './socials';

/* P2.5 : pied de page : coordonnées, réseaux, liens légaux. Distinct du dashboard. */
export async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="mt-16 bg-footer text-panel-fg">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="flex items-center gap-2 font-heading text-lg font-bold">
            <LogoMark className="h-8 w-auto text-panel-fg" />
            Sarielle Fashion
          </p>
          <p className="mt-2 text-sm opacity-80">
            {t('nav.footer.tagline')}
          </p>
        </div>
        <nav aria-label={t('nav.footer.practicalAria')}>
          <p className="font-semibold">{t('nav.footer.practical')}</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <Link href="/coiffures" className="opacity-80 hover:opacity-100 hover:underline">
                {t('nav.catalogue')}
              </Link>
            </li>
            <li>
              <Link href="/galerie" className="opacity-80 hover:opacity-100 hover:underline">
                {t('nav.gallery')}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="opacity-80 hover:opacity-100 hover:underline">
                {t('nav.faq')}
              </Link>
            </li>
            <li>
              <Link
                href="/infos-pratiques"
                className="opacity-80 hover:opacity-100 hover:underline"
              >
                {t('nav.footer.info')}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="opacity-80 hover:opacity-100 hover:underline">
                {t('nav.contact')}
              </Link>
            </li>
            <li>
              <Link
                href="/mentions-legales"
                className="opacity-80 hover:opacity-100 hover:underline"
              >
                {t('nav.footer.legal')}
              </Link>
            </li>
            <li>
              <Link
                href="/confidentialite"
                className="opacity-80 hover:opacity-100 hover:underline"
              >
                {t('nav.footer.privacy')}
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          {SOCIALS.length > 0 ? (
            <>
              <p className="font-semibold">{t('nav.footer.follow')}</p>
              <ul className="mt-3 flex gap-2" aria-label={t('common.social.label')}>
                {SOCIALS.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${label} (${t('common.newTab')})`}
                      className="flex size-10 items-center justify-center rounded-full bg-panel-fg/10 transition hover:bg-panel-fg/20"
                    >
                      <Icon aria-hidden="true" className="size-[1.1rem]" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className={`font-semibold ${SOCIALS.length > 0 ? 'mt-6' : ''}`}>
            {t('nav.language.label')}
          </p>
          <LanguageSwitcher tone="dark" className="mt-3" />
        </div>
      </div>
      <p className="border-t border-panel-fg/20 py-4 text-center text-xs opacity-70">
        © {new Date().getFullYear()} Sarielle Fashion. {t('nav.footer.rights')}
      </p>
    </footer>
  );
}

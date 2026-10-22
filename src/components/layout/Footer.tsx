import Link from 'next/link';
import { LogoMark } from '@/components/shared/Logo';
import { SOCIALS } from './SocialLinks';

/* P2.5 : pied de page : coordonnées, réseaux, liens légaux. Distinct du dashboard. */
export function Footer() {
  return (
    <footer className="mt-16 bg-footer text-panel-fg">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="flex items-center gap-2 font-heading text-lg font-bold">
            <LogoMark className="h-8 w-auto text-panel-fg" />
            Sarielle Fashion
          </p>
          <p className="mt-2 text-sm opacity-80">
            Coiffure, make-up, lace et cils à Clausthal-Zellerfeld.
          </p>
        </div>
        <nav aria-label="Liens pratiques">
          <p className="font-semibold">Pratique</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <Link href="/coiffures" className="opacity-80 hover:opacity-100 hover:underline">
                Catalogue
              </Link>
            </li>
            <li>
              <Link href="/faq" className="opacity-80 hover:opacity-100 hover:underline">
                FAQ
              </Link>
            </li>
            <li>
              <Link
                href="/infos-pratiques"
                className="opacity-80 hover:opacity-100 hover:underline"
              >
                Infos pratiques
              </Link>
            </li>
            <li>
              <Link href="/contact" className="opacity-80 hover:opacity-100 hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <Link
                href="/mentions-legales"
                className="opacity-80 hover:opacity-100 hover:underline"
              >
                Mentions légales
              </Link>
            </li>
            <li>
              <Link
                href="/confidentialite"
                className="opacity-80 hover:opacity-100 hover:underline"
              >
                Confidentialité
              </Link>
            </li>
          </ul>
        </nav>
        {SOCIALS.length > 0 ? (
          <div>
            <p className="font-semibold">Me suivre</p>
            <ul className="mt-3 flex gap-2" aria-label="Réseaux sociaux">
              {SOCIALS.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label} (nouvel onglet)`}
                    className="flex size-10 items-center justify-center rounded-full bg-panel-fg/10 transition hover:bg-panel-fg/20"
                  >
                    <Icon aria-hidden="true" className="size-[1.1rem]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <p className="border-t border-panel-fg/20 py-4 text-center text-xs opacity-70">
        © {new Date().getFullYear()} Sarielle Fashion. Tous droits réservés.
      </p>
    </footer>
  );
}

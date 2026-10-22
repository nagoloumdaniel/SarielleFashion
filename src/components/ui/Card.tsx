import { Link } from '@/i18n/link';
import type { ReactNode } from 'react';

/* P2.3 : carte surface blanche, angles arrondis, ombre douce. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-line/60 bg-card p-4 shadow-soft sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/* Carte entièrement cliquable (remplace les boutons « Voir plus » / « Détails »).
   Pas de zoom au survol : bordure + ombre uniquement. */
export function CardLink({
  href,
  children,
  className = '',
  label,
  prefetch,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Libellé accessible si le contenu seul n'est pas explicite. */
  label?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      prefetch={prefetch}
      className={`block rounded-[var(--radius-lg)] border border-line/60 bg-card p-4 shadow-soft transition hover:border-cacao hover:shadow-lift sm:p-5 ${className}`}
    >
      {children}
    </Link>
  );
}

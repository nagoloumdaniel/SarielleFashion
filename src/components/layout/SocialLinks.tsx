import type { IconType } from 'react-icons';

/* Réseaux sociaux (icônes). Remplacer les URL par les comptes réels de Sarielle. */
export type Social = { href: string; label: string; Icon: IconType };

/* Aucun compte renseigné pour l'instant : ajouter { href, label, Icon } ici. */
export const SOCIALS: readonly Social[] = [];

export function SocialLinks({ className = '' }: { className?: string }) {
  if (SOCIALS.length === 0) return null;
  return (
    <ul className={`flex items-center gap-1 ${className}`} aria-label="Réseaux sociaux">
      {SOCIALS.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${label} (nouvel onglet)`}
            className="flex size-10 items-center justify-center rounded-full text-fg transition hover:bg-accent-soft"
          >
            <Icon aria-hidden="true" className="size-[1.1rem]" />
          </a>
        </li>
      ))}
    </ul>
  );
}

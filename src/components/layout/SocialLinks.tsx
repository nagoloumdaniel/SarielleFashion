import { FaTiktok } from 'react-icons/fa6';

/* Réseaux sociaux (icônes). Remplacer les URL par les comptes réels de Patricia. */
export const SOCIALS = [
  {
    href: 'https://www.tiktok.com/@hairstyle.by.pati?_r=1&_t=ZS-9AhxNxbeson',
    label: 'TikTok',
    Icon: FaTiktok,
  },
] as const;

export function SocialLinks({ className = '' }: { className?: string }) {
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

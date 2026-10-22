import type { IconType } from 'react-icons';
import { FaTiktok } from 'react-icons/fa6';

/* Réseaux sociaux (icônes), affichés dans la navbar, le pied de page et la page contact. */
export type Social = { href: string; label: string; Icon: IconType };

export const SOCIALS: readonly Social[] = [
  {
    href: 'https://www.tiktok.com/@sarielle6?_r=1&_t=ZS-9Al1HOcMyVp',
    label: 'TikTok',
    Icon: FaTiktok,
  },
];

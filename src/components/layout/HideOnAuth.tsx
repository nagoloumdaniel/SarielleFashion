'use client';

import { usePathname } from '@/i18n/link';
import type { ReactNode } from 'react';

/* Masque son contenu (ex. footer) sur la connexion et le dashboard admin. */
export function HideOnAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith('/connexion') || pathname.startsWith('/dashboard') ? null : children;
}

'use client';

import { Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';

/* Accès aux paramètres depuis la barre du haut (desktop). Sur mobile : entrée du menu « Menu ». */
export function TopbarSettingsLink() {
  const pathname = usePathname();
  const active =
    pathname === '/dashboard/parametres' || !!pathname?.startsWith('/dashboard/parametres/');
  return (
    <span className="hidden lg:inline-flex">
      <ButtonLink
        href="/dashboard/parametres"
        variant={active ? 'secondary' : 'ghost'}
        size="sm"
        iconOnly
        icon={Settings}
        aria-current={active ? 'page' : undefined}
        aria-label="Paramètres"
      >
        Paramètres
      </ButtonLink>
    </span>
  );
}

import { CalendarDays, CalendarOff } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { CalendarClient } from './calendar-client';

export const metadata: Metadata = { title: 'Calendrier - Tableau de bord' };

export default async function CalendrierPage() {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/calendrier');

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Calendrier"
        actions={
          <ButtonLink
            href="/dashboard/disponibilites"
            variant="secondary"
            icon={CalendarOff}
            iconOnly="mobile"
          >
            Bloquer un créneau
          </ButtonLink>
        }
      />
      <CalendarClient />
    </div>
  );
}

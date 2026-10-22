import { CalendarOff, ChevronRight, Settings } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { CardLink } from '@/components/ui/Card';
import { requireAdmin } from '@/modules/auth/guards';
import { getSalonSettings } from '@/modules/disponibilites/queries';
import { PasswordCard, SessionsCard } from './account-security';
import { SalonProfileForm } from './salon-profile-form';

export const metadata: Metadata = { title: 'Paramètres - Tableau de bord' };

export default async function SettingsPage() {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/parametres');
  const settings = await getSalonSettings();

  return (
    <div>
      <PageHeader icon={Settings} title="Paramètres" />

      {/* Règles de créneaux et d'annulation : carte entière cliquable vers Disponibilités. */}
      <CardLink href="/dashboard/disponibilites" className="mb-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent"
          >
            <CalendarOff className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-fg">
              Disponibilités et règles de réservation
            </span>
            <span className="block text-sm text-muted">
              Rappel {settings.reminderLeadHours} h avant · annulation possible jusqu’à{' '}
              {settings.minCancelNoticeHours} h avant
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
        </div>
      </CardLink>

      <SalonProfileForm settings={settings} />

      {/* Sécurité du compte : mot de passe et sessions. */}
      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
        <PasswordCard />
        <SessionsCard />
      </div>
    </div>
  );
}

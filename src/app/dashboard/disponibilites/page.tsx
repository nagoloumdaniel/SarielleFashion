import { CalendarOff } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import {
  getSalonSettings,
  listAvailabilityRules,
  listBlockedPeriods,
} from '@/modules/disponibilites/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  BlockedPeriodsEditor,
  BookingSettingsEditor,
  SpecificDatesEditor,
  WeeklyScheduleEditor,
} from './availability-editors';

export const metadata: Metadata = { title: 'Disponibilités - Tableau de bord' };

export default async function DisponibilitesPage() {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/disponibilites');

  const [rules, blockedPeriods, settings] = await Promise.all([
    listAvailabilityRules(),
    listBlockedPeriods(),
    getSalonSettings(),
  ]);

  // Les exceptions passées n'ont plus d'effet : on n'affiche que celles à venir.
  const today = new Date().toISOString().slice(0, 10);
  const weekly = rules
    .filter((rule) => rule.kind === 'WEEKLY' && rule.active)
    .map((rule) => ({
      id: rule.id,
      weekday: rule.weekday ?? 0,
      startMinute: rule.startMinute,
      endMinute: rule.endMinute,
    }));
  const specific = rules
    .filter((rule) => rule.kind === 'SPECIFIC' && rule.active && rule.date && rule.date >= today)
    .map((rule) => ({
      id: rule.id,
      date: rule.date as string,
      startMinute: rule.startMinute,
      endMinute: rule.endMinute,
    }));
  const blocked = blockedPeriods.map((period) => ({
    id: period.id,
    startsAt: period.startsAt.toISOString(),
    endsAt: period.endsAt.toISOString(),
    reason: period.reason,
    createdByName: period.createdBy.name,
  }));

  return (
    <div>
      <PageHeader
        icon={CalendarOff}
        title="Disponibilités"
        description="Une modification touchant des rendez-vous demande confirmation."
      />

      <div className="grid items-start gap-3 xl:grid-cols-2">
        <Card>
          <h2 className="font-heading text-lg font-bold text-fg">Horaires habituels</h2>
          <p className="mb-3 mt-1 text-sm text-muted">Un jour non coché est fermé.</p>
          <WeeklyScheduleEditor rules={weekly} />
        </Card>

        <div className="grid gap-3">
          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Dates spécifiques</h2>
            <p className="mb-3 mt-1 text-sm text-muted">
              Remplace l’horaire habituel. Décochez « Ouvert » pour fermer ce jour-là.
            </p>
            <SpecificDatesEditor rules={specific} />
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Indisponibilités</h2>
            <p className="mb-3 mt-1 text-sm text-muted">
              Les créneaux concernés disparaissent de la réservation.
            </p>
            <BlockedPeriodsEditor periods={blocked} />
          </Card>
        </div>

        <Card className="xl:col-span-2">
          <h2 className="font-heading text-lg font-bold text-fg">Paramètres de réservation</h2>
          <BookingSettingsEditor settings={settings} />
        </Card>
      </div>
    </div>
  );
}

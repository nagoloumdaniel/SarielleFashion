import { CalendarClock, Hourglass, Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import {
  WAITLIST_STATUS_LABELS,
  WAITLIST_STATUS_TONES,
  listWaitlistEntries,
} from '@/modules/liste-attente/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { parsePage } from '@/lib/pagination';
import { CancelEntryButton } from './cancel-entry-button';

export const metadata: Metadata = { title: 'Liste d’attente - Tableau de bord' };

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/liste-attente');

  const params = await searchParams;
  const rawAll = params.all;
  const all = (Array.isArray(rawAll) ? rawAll[0] : rawAll) === '1';
  const { rows, counts, page, totalPages } = await listWaitlistEntries({
    onlyOpen: !all,
    page: parsePage(params.page),
  });
  const open = (counts.WAITING ?? 0) + (counts.NOTIFIED ?? 0);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div>
      <PageHeader
        icon={Hourglass}
        title="Liste d’attente"
        description="Les clientes sont prévenues par e-mail dès qu’un créneau se libère."
      />

      <nav aria-label="Filtres de la liste d’attente" className="mb-3 flex gap-2">
        <ButtonLink
          href="/dashboard/liste-attente"
          size="sm"
          variant={!all ? 'primary' : 'secondary'}
          aria-current={!all ? 'page' : undefined}
        >
          {`En cours (${open})`}
        </ButtonLink>
        <ButtonLink
          href="/dashboard/liste-attente?all=1"
          size="sm"
          variant={all ? 'primary' : 'secondary'}
          aria-current={all ? 'page' : undefined}
        >
          {`Tout (${total})`}
        </ButtonLink>
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Aucune demande"
          message={
            all
              ? 'Aucune cliente ne s’est inscrite sur la liste d’attente.'
              : 'Aucune cliente en attente pour le moment.'
          }
        />
      ) : (
        <ul className="grid gap-2">
          {rows.map((entry) => {
            const canCancel = entry.status === 'WAITING' || entry.status === 'NOTIFIED';
            return (
              <li key={entry.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{entry.customerName}</p>
                      <p className="truncate text-sm text-muted">{entry.service.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={WAITLIST_STATUS_TONES[entry.status]}>
                        {WAITLIST_STATUS_LABELS[entry.status]}
                      </Badge>
                      {canCancel ? (
                        <CancelEntryButton
                          entryId={entry.id}
                          customerName={entry.customerName}
                          notified={entry.status === 'NOTIFIED'}
                        />
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <CalendarClock aria-hidden="true" className="size-4 text-accent" />
                    Créneau souhaité :{' '}
                    <LocalDateTime
                      iso={entry.desiredStartsAt.toISOString()}
                      dateStyle="medium"
                      timeStyle="short"
                    />
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <a
                      href={`mailto:${entry.customerEmail}`}
                      className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
                    >
                      <Mail aria-hidden="true" className="size-4" />
                      {entry.customerEmail}
                    </a>
                    <a
                      href={`tel:${entry.customerPhone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
                    >
                      <Phone aria-hidden="true" className="size-4" />
                      {entry.customerPhone}
                    </a>
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(next) => {
          const query = new URLSearchParams();
          if (all) query.set('all', '1');
          if (next > 1) query.set('page', String(next));
          const value = query.toString();
          return value ? `/dashboard/liste-attente?${value}` : '/dashboard/liste-attente';
        }}
        label="Pagination de la liste d’attente"
      />
    </div>
  );
}

import { CalendarClock, Mail, Wand2 } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { CustomRequestStatus } from '@prisma/client';
import { requireAdmin } from '@/modules/auth/guards';
import {
  CUSTOM_REQUEST_STATUSES,
  CUSTOM_REQUEST_STATUS_LABELS,
  CUSTOM_REQUEST_STATUS_TONES,
  countCustomRequestsByStatus,
  listCustomRequests,
} from '@/modules/demandes/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ButtonLink } from '@/components/ui/Button';
import { CardLink } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Demandes personnalisées - Tableau de bord' };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function hrefFor(status?: CustomRequestStatus, page = 1): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/dashboard/demandes?${query}` : '/dashboard/demandes';
}

export default async function CustomRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/demandes');

  const params = await searchParams;
  const rawStatus = first(params.status);
  const status = CUSTOM_REQUEST_STATUSES.includes(rawStatus as CustomRequestStatus)
    ? (rawStatus as CustomRequestStatus)
    : undefined;
  const rawPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [counts, result] = await Promise.all([
    countCustomRequestsByStatus(),
    listCustomRequests({ status, page }),
  ]);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div>
      <PageHeader
        icon={Wand2}
        title="Demandes personnalisées"
        description="Une demande acceptée propose un créneau sans jamais le réserver."
      />

      <nav
        aria-label="Filtres des demandes"
        className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <ButtonLink
          href={hrefFor()}
          size="sm"
          variant={!status ? 'primary' : 'secondary'}
          aria-current={!status ? 'page' : undefined}
        >
          {`Toutes (${total})`}
        </ButtonLink>
        {CUSTOM_REQUEST_STATUSES.map((item) => (
          <ButtonLink
            key={item}
            href={hrefFor(item)}
            size="sm"
            variant={status === item ? 'primary' : 'secondary'}
            aria-current={status === item ? 'page' : undefined}
          >
            {`${CUSTOM_REQUEST_STATUS_LABELS[item]} (${counts[item]})`}
          </ButtonLink>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Aucune demande"
          message={
            status
              ? 'Aucune demande avec ce statut.'
              : 'Les demandes envoyées depuis la page sur mesure apparaîtront ici.'
          }
        />
      ) : (
        <ul className="grid gap-2">
          {result.items.map((request) => (
            <li key={request.id}>
              <CardLink
                href={`/dashboard/demandes/${request.id}`}
                label={`Demande de ${request.requesterName}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{request.requesterName}</p>
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                      <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                      {request.requesterEmail}
                    </p>
                  </div>
                  <Badge tone={CUSTOM_REQUEST_STATUS_TONES[request.status]} className="shrink-0">
                    {CUSTOM_REQUEST_STATUS_LABELS[request.status]}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-fg">{request.description}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    Reçue le{' '}
                    <LocalDateTime
                      iso={request.createdAt.toISOString()}
                      dateStyle="medium"
                      timeStyle="short"
                    />
                  </span>
                  {request.desiredDate ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock aria-hidden="true" className="size-3.5" />
                      Souhaitée le{' '}
                      {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
                        request.desiredDate,
                      )}
                    </span>
                  ) : null}
                </p>
              </CardLink>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(next) => hrefFor(status, next)}
        label="Pagination des demandes"
      />
    </div>
  );
}

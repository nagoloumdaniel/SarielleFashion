import { Camera, ClipboardCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { AssessmentStatus } from '@prisma/client';
import { requireAdmin } from '@/modules/auth/guards';
import { countAssessmentsByStatus, listAssessments } from '@/modules/compatibilite/queries';
import { ASSESSMENT_STATUS_LABELS } from '@/modules/compatibilite/schemas';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ButtonLink } from '@/components/ui/Button';
import { CardLink } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Évaluations capillaires - Tableau de bord' };

const STATUS_TONES: Record<string, 'accent' | 'success' | 'alert' | 'neutral'> = {
  RECEIVED: 'accent',
  IN_PROGRESS: 'accent',
  INFO_REQUESTED: 'neutral',
  ACCEPTED: 'success',
  REFUSED: 'alert',
  BOOKING_PENDING: 'neutral',
  CONFIRMED: 'success',
};

const STATUSES = Object.keys(ASSESSMENT_STATUS_LABELS) as AssessmentStatus[];

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function pageHref(status: string, page: number): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/dashboard/evaluations?${query}` : '/dashboard/evaluations';
}

export default async function EvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/evaluations');

  const params = await searchParams;
  const rawStatus = firstValue(params.status);
  const status = (STATUSES.includes(rawStatus as AssessmentStatus) ? rawStatus : '') as
    AssessmentStatus | '';
  const rawPage = Number.parseInt(firstValue(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [counts, result] = await Promise.all([
    countAssessmentsByStatus(),
    listAssessments({
      status: status || undefined,
      page,
      // À traiter : les plus anciennes d'abord ; décisions prises : les plus récentes d'abord.
      order:
        status === 'ACCEPTED' || status === 'REFUSED' || status === 'CONFIRMED' ? 'desc' : 'asc',
    }),
  ]);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Évaluations capillaires"
        description="Une décision ne crée jamais de réservation."
      />

      <nav
        aria-label="Filtres des évaluations"
        className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <ButtonLink
          href={pageHref('', 1)}
          size="sm"
          variant={!status ? 'primary' : 'secondary'}
          aria-current={!status ? 'page' : undefined}
        >
          {`Toutes (${total})`}
        </ButtonLink>
        {STATUSES.map((item) => (
          <ButtonLink
            key={item}
            href={pageHref(item, 1)}
            size="sm"
            variant={status === item ? 'primary' : 'secondary'}
            aria-current={status === item ? 'page' : undefined}
          >
            {`${ASSESSMENT_STATUS_LABELS[item]} (${counts[item] ?? 0})`}
          </ButtonLink>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Aucune évaluation"
          message={
            status
              ? 'Aucune évaluation ne correspond à ce statut.'
              : 'Les demandes envoyées depuis le parcours de compatibilité apparaîtront ici.'
          }
        />
      ) : (
        <ul className="grid gap-2">
          {result.items.map((assessment) => (
            <li key={assessment.id}>
              <CardLink
                href={`/dashboard/evaluations/${assessment.id}`}
                label={`Évaluation de ${assessment.customerName}, ${assessment.serviceName}`}
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{assessment.customerName}</p>
                    <p className="truncate text-sm text-muted">{assessment.serviceName}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span className="flex items-center gap-3 text-sm text-muted">
                      <LocalDateTime
                        iso={assessment.createdAt.toISOString()}
                        dateStyle="medium"
                        timeStyle="short"
                      />
                      <span className="inline-flex items-center gap-1">
                        <Camera aria-hidden="true" className="size-4 text-accent" />
                        {assessment.photoCount}
                        <span className="sr-only">
                          {' '}
                          photo{assessment.photoCount > 1 ? 's' : ''}
                        </span>
                      </span>
                    </span>
                    <Badge tone={STATUS_TONES[assessment.status] ?? 'neutral'}>
                      {ASSESSMENT_STATUS_LABELS[assessment.status] ?? assessment.status}
                    </Badge>
                  </div>
                </div>
              </CardLink>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(next) => pageHref(status, next)}
        label="Pagination des évaluations"
      />
    </div>
  );
}

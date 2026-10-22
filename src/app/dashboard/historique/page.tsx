import { ChevronRight, History } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { FilterChips } from '@/components/ui/FilterChips';
import { Pagination } from '@/components/ui/Pagination';
import { RowCard, rowLinkClass } from '@/components/ui/RowCard';
import { actionLabel, entityHref, entityLabel } from './labels';
import { HISTORY_GROUPS, HISTORY_GROUP_KEYS, listHistory, type HistoryGroup } from './queries';

export const metadata: Metadata = { title: 'Historique - Tableau de bord' };

/* Heure de Berlin fixée côté serveur (heure d'été gérée par Intl). */
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Berlin',
});

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function hrefFor(group: HistoryGroup | undefined, entityId: string, page = 1): string {
  const query = new URLSearchParams();
  if (group) query.set('groupe', group);
  if (entityId) query.set('entityId', entityId);
  if (page > 1) query.set('page', String(page));
  const value = query.toString();
  return value ? `/dashboard/historique?${value}` : '/dashboard/historique';
}

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/historique');

  const params = await searchParams;
  const rawGroup = first(params.groupe);
  const group = HISTORY_GROUP_KEYS.includes(rawGroup as HistoryGroup)
    ? (rawGroup as HistoryGroup)
    : undefined;
  // Référence d'élément : identifiant opaque, borné pour éviter toute requête abusive.
  const entityId = first(params.entityId).slice(0, 64);
  const rawPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const result = await listHistory({ group, entityId: entityId || undefined, page });

  return (
    <div>
      <PageHeader
        icon={History}
        title="Historique"
        actions={
          entityId ? (
            <ButtonLink href={hrefFor(group, '')} variant="secondary">
              Voir tout l’historique
            </ButtonLink>
          ) : null
        }
      />

      <FilterChips
        label="Filtrer par domaine"
        items={[
          { href: hrefFor(undefined, entityId), label: 'Tout', active: !group },
          ...HISTORY_GROUP_KEYS.map((key) => ({
            href: hrefFor(key, entityId),
            label: HISTORY_GROUPS[key].label,
            active: group === key,
          })),
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Aucune action enregistrée"
          message={
            group || entityId
              ? 'Aucune action ne correspond à ce filtre.'
              : 'Les modifications faites dans le dashboard apparaîtront ici avec leur auteur et leur date.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.items.map((entry) => {
            const href = entityHref(entry.entityType, entry.entityId, entry.action);
            const label = actionLabel(entry.action);
            const body = (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className={`block font-semibold text-fg ${rowLinkClass}`}>
                      {label}
                    </Link>
                  ) : (
                    <p className="font-semibold text-fg">{label}</p>
                  )}
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
                    <Badge tone="neutral" size="sm">
                      {entityLabel(entry.entityType)}
                    </Badge>
                    <span>{entry.userName ?? 'Système'}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={entry.createdAt.toISOString()}>
                      {dateFormatter.format(entry.createdAt)}
                    </time>
                  </p>
                </div>
                {href ? (
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                ) : null}
              </div>
            );
            return (
              <li key={entry.id}>
                {href ? (
                  <RowCard>{body}</RowCard>
                ) : (
                  <div className="rounded-[var(--radius-lg)] bg-card p-3 shadow-soft sm:p-4">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(nextPage) => hrefFor(group, entityId, nextPage)}
        label="Pagination de l’historique"
      />
      {result.total > 0 ? (
        <p className="mt-2 text-center text-xs text-muted">
          {result.total} action{result.total > 1 ? 's' : ''} enregistrée
          {result.total > 1 ? 's' : ''}
        </p>
      ) : null}
    </div>
  );
}

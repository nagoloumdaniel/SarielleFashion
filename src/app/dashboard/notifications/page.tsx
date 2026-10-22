import { Bell, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import {
  countUnreadNotifications,
  listAdminNotifications,
  listFailedEmails,
  notificationDeliveryStats,
  type AdminNotificationView,
} from '@/modules/notifications/queries';
import { openNotificationForm } from '@/modules/notifications/actions';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { FilterChips } from '@/components/ui/FilterChips';
import { Pagination } from '@/components/ui/Pagination';
import { RowCard, rowLinkClass } from '@/components/ui/RowCard';
import {
  NotificationRowActions,
  NotificationsHeaderActions,
  RetryEmailButton,
} from './notification-actions';

export const metadata: Metadata = { title: 'Notifications - Tableau de bord' };

type Filter = 'all' | 'unread' | 'failed';

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Notifications' },
  { value: 'unread', label: 'Non lues' },
  { value: 'failed', label: 'Échecs e-mail' },
];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

const hrefFor = (filter: Filter, page = 1) => {
  const query = new URLSearchParams();
  if (filter !== 'all') query.set('filter', filter);
  if (page > 1) query.set('page', String(page));
  const value = query.toString();
  return value ? `/dashboard/notifications?${value}` : '/dashboard/notifications';
};

/* Carte d'une alerte : entièrement cliquable vers l'objet lié (ouvre + marque comme lue). */
function NotificationRow({ notification }: { notification: AdminNotificationView }) {
  const isInApp = notification.channel === 'IN_APP';
  const unread = isInApp && !notification.readAt;
  const failedEmail = notification.channel === 'EMAIL' && notification.status === 'FAILED';
  const team =
    notification.templateKey.includes('admin') ||
    notification.templateKey === 'conversation_reply_sent';

  const title = (
    <span className={`truncate ${unread ? 'font-bold' : 'font-semibold'} text-fg`}>
      {notification.title}
    </span>
  );

  return (
    <RowCard
      highlighted={unread}
      actions={
        isInApp ? (
          <NotificationRowActions id={notification.id} read={!unread} />
        ) : failedEmail ? (
          <RetryEmailButton id={notification.id} />
        ) : null
      }
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`mt-2 size-2 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-line'}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isInApp && notification.link ? (
              <form action={openNotificationForm} className="min-w-0 flex-1">
                <input type="hidden" name="id" value={notification.id} />
                <button type="submit" className={`block max-w-full text-left ${rowLinkClass}`}>
                  {title}
                </button>
              </form>
            ) : (
              <p className="min-w-0 flex-1 truncate">{title}</p>
            )}
            {isInApp && notification.link ? (
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
            ) : null}
          </div>
          {notification.detail ? (
            <p className="line-clamp-2 text-sm text-muted">{notification.detail}</p>
          ) : null}
          {failedEmail ? (
            <div className="min-w-0 text-sm text-muted">
              <p className="truncate">
                {notification.recipient} · {notification.attempts} tentative
                {notification.attempts > 1 ? 's' : ''}
              </p>
              {notification.error ? (
                <details className="group">
                  <summary
                    title={notification.error}
                    className="relative z-10 cursor-pointer list-none rounded-sm focus-visible:outline-2 focus-visible:outline-cacao group-open:[&>span]:line-clamp-none"
                  >
                    <span className="line-clamp-2 break-words">{notification.error}</span>
                    <span className="sr-only">Afficher ou masquer le détail de l’erreur</span>
                  </summary>
                </details>
              ) : null}
            </div>
          ) : null}
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <LocalDateTime
              iso={notification.createdAt.toISOString()}
              dateStyle="short"
              timeStyle="short"
            />
            <span aria-hidden="true">·</span>
            <span>{isInApp ? 'Dashboard' : 'E-mail'}</span>
            <Badge tone={failedEmail ? 'alert' : team ? 'accent' : 'neutral'} size="sm">
              {failedEmail ? 'Échec' : team ? 'Équipe' : 'Cliente'}
            </Badge>
          </p>
        </div>
      </div>
    </RowCard>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/notifications');

  const params = await searchParams;
  const rawFilter = first(params.filter);
  const filter: Filter = FILTERS.some((item) => item.value === rawFilter)
    ? (rawFilter as Filter)
    : 'all';
  const rawPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [result, failed, stats, unreadCount] = await Promise.all([
    listAdminNotifications({ filter, page }),
    filter === 'failed' ? Promise.resolve([]) : listFailedEmails(),
    notificationDeliveryStats(),
    countUnreadNotifications(),
  ]);
  const hasRead = result.items.some((item) => item.channel === 'IN_APP' && item.readAt);

  return (
    <div>
      <PageHeader
        icon={Bell}
        title="Notifications"
        actions={
          <NotificationsHeaderActions
            hasUnread={unreadCount > 0}
            hasRead={hasRead}
            hasFailed={stats.failed > 0}
          />
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone="accent" size="sm">
          E-mails en attente : {stats.pending}
        </Badge>
        <Badge tone="success" size="sm">
          Envoyés : {stats.sent}
        </Badge>
        <Badge tone={stats.failed > 0 ? 'alert' : 'neutral'} size="sm">
          Échecs : {stats.failed}
        </Badge>
      </div>

      <FilterChips
        label="Filtrer les notifications"
        items={FILTERS.map((item) => ({
          href: hrefFor(item.value),
          label: item.label,
          count: item.value === 'unread' ? unreadCount : undefined,
          active: filter === item.value,
        }))}
      />

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title={filter === 'unread' ? 'Tout est lu' : 'Aucune notification'}
          message={
            filter === 'failed'
              ? 'Aucun échec d’envoi. La file fonctionne normalement.'
              : filter === 'unread'
                ? 'Aucune alerte en attente de lecture.'
                : 'Les nouvelles réservations et les messages de contact apparaîtront ici.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.items.map((notification) => (
            <li key={notification.id}>
              <NotificationRow notification={notification} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(nextPage) => hrefFor(filter, nextPage)}
        label="Pagination des notifications"
      />

      {failed.length > 0 ? (
        <section className="mt-6" aria-labelledby="failed-title">
          <h2 id="failed-title" className="font-heading text-lg font-bold text-fg">
            Derniers échecs d’envoi
          </h2>
          <p className="mb-2 mt-0.5 text-sm text-muted">
            Réessayé automatiquement ; relancez à la main après vérification.
          </p>
          <ul className="flex flex-col gap-2">
            {failed.map((item) => (
              <li key={item.id}>
                <NotificationRow notification={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

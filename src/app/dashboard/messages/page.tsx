import { MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ConversationStatus } from '@prisma/client';
import { requireAdmin } from '@/modules/auth/guards';
import {
  CONVERSATION_SOURCE_LABELS,
  CONVERSATION_STATUSES,
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUS_TONES,
  countConversationsByStatus,
  listConversations,
} from '@/modules/messagerie/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { FilterChips } from '@/components/ui/FilterChips';
import { Pagination } from '@/components/ui/Pagination';
import { Avatar } from '@/components/ui/Avatar';
import { RowCard, rowLinkClass } from '@/components/ui/RowCard';
import { ConversationRowActions, MarkAllConversationsRead } from './conversation-list-actions';

export const metadata: Metadata = { title: 'Messages - Tableau de bord' };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/messages');

  const params = await searchParams;
  const rawStatus = first(params.status);
  const status = CONVERSATION_STATUSES.includes(rawStatus as ConversationStatus)
    ? (rawStatus as ConversationStatus)
    : undefined;
  const rawPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [counts, result] = await Promise.all([
    countConversationsByStatus(),
    listConversations({ status, page }),
  ]);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const anyUnread = result.items.some((item) => item.unreadCount > 0);

  const hrefFor = (nextStatus?: ConversationStatus, nextPage = 1) => {
    const query = new URLSearchParams();
    if (nextStatus) query.set('status', nextStatus);
    if (nextPage > 1) query.set('page', String(nextPage));
    const value = query.toString();
    return value ? `/dashboard/messages?${value}` : '/dashboard/messages';
  };

  return (
    <div>
      <PageHeader
        icon={MessageSquare}
        title="Messages"
        actions={anyUnread ? <MarkAllConversationsRead /> : null}
      />

      <FilterChips
        label="Filtrer par statut"
        items={[
          { href: hrefFor(), label: 'Toutes', count: total, active: !status },
          ...CONVERSATION_STATUSES.map((item) => ({
            href: hrefFor(item),
            label: CONVERSATION_STATUS_LABELS[item],
            count: counts[item],
            active: status === item,
          })),
        ]}
      />

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Aucune conversation"
          message={
            status
              ? 'Aucune conversation avec ce statut pour le moment.'
              : 'Les messages envoyés depuis la page contact apparaîtront ici avec leur statut.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.items.map((conversation) => {
            const unread = conversation.unreadCount > 0;
            return (
              <li key={conversation.id}>
                <RowCard
                  highlighted={unread}
                  actions={
                    <ConversationRowActions
                      conversationId={conversation.id}
                      unread={unread}
                      subject={conversation.subject}
                    />
                  }
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={conversation.customerName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/dashboard/messages/${conversation.id}`}
                          className={`truncate ${unread ? 'font-bold' : 'font-semibold'} text-fg ${rowLinkClass}`}
                        >
                          {conversation.subject}
                        </Link>
                        <LocalDateTime
                          iso={conversation.lastMessageAt.toISOString()}
                          dateStyle="short"
                          timeStyle="short"
                          className="shrink-0 text-xs text-muted"
                        />
                      </div>
                      <p className="truncate text-sm text-muted">
                        {conversation.customerName}
                        {conversation.customerEmail ? ` · ${conversation.customerEmail}` : ''}
                      </p>
                      {conversation.lastMessage ? (
                        <p
                          className={`mt-0.5 line-clamp-1 text-sm ${unread ? 'text-fg' : 'text-muted'}`}
                        >
                          {conversation.lastMessage}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {unread ? (
                          <Badge tone="accent" size="sm">
                            {conversation.unreadCount} non lu
                            {conversation.unreadCount > 1 ? 's' : ''}
                          </Badge>
                        ) : null}
                        <Badge tone={CONVERSATION_STATUS_TONES[conversation.status]} size="sm">
                          {CONVERSATION_STATUS_LABELS[conversation.status]}
                        </Badge>
                        <Badge tone="neutral" size="sm">
                          {CONVERSATION_SOURCE_LABELS[conversation.source]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </RowCard>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(nextPage) => hrefFor(status, nextPage)}
        label="Pagination des messages"
      />
    </div>
  );
}

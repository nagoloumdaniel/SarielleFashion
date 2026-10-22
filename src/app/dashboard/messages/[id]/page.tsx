import { Lock, MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import {
  CONVERSATION_SOURCE_LABELS,
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUS_TONES,
  getConversationAdmin,
} from '@/modules/messagerie/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { ConversationComposer } from '../conversation-composer';
import { ConversationHeaderActions } from '../conversation-header-actions';
import { ConversationReadMarker } from '../conversation-read-marker';

export const metadata: Metadata = { title: 'Conversation - Tableau de bord' };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!user) redirect(`/connexion?callbackUrl=/dashboard/messages/${id}`);

  const conversation = await getConversationAdmin(id);
  if (!conversation) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        back={<BackButton fallbackHref="/dashboard/messages" />}
        icon={MessageSquare}
        title={conversation.subject}
        description={
          <>
            {conversation.customerName}
            {conversation.customerPhone ? (
              <>
                {' · '}
                <a
                  href={`tel:${conversation.customerPhone.replace(/\s+/g, '')}`}
                  className="text-cacao hover:underline"
                >
                  {conversation.customerPhone}
                </a>
              </>
            ) : null}
            {conversation.customerEmail ? (
              <>
                {' · '}
                <a
                  href={`mailto:${conversation.customerEmail}`}
                  className="text-cacao hover:underline"
                >
                  {conversation.customerEmail}
                </a>
              </>
            ) : null}
          </>
        }
        actions={
          <ConversationHeaderActions
            conversationId={conversation.id}
            status={conversation.status}
            customerId={conversation.customerId}
            subject={conversation.subject}
          />
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={CONVERSATION_STATUS_TONES[conversation.status]} size="sm">
          {CONVERSATION_STATUS_LABELS[conversation.status]}
        </Badge>
        <Badge tone="neutral" size="sm">
          {CONVERSATION_SOURCE_LABELS[conversation.source]}
        </Badge>
      </div>

      <ol aria-label="Échanges" className="flex flex-col gap-2">
        {conversation.messages.map((message) => {
          const isCustomer = message.author === 'CUSTOMER';
          const author = message.isInternal
            ? 'Note interne'
            : isCustomer
              ? conversation.customerName
              : message.author === 'ADMIN'
                ? 'Sarielle'
                : 'Système';
          const side = message.isInternal
            ? 'w-full border border-dashed border-alert/50 bg-alert-soft'
            : isCustomer
              ? 'mr-auto max-w-[88%] bg-card shadow-soft'
              : message.author === 'ADMIN'
                ? 'ml-auto max-w-[88%] bg-accent-soft'
                : 'mx-auto max-w-[88%] bg-line';
          return (
            <li key={message.id} className={`rounded-[var(--radius-lg)] px-3 py-2 ${side}`}>
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span className="flex items-center gap-1 font-semibold">
                  {message.isInternal ? <Lock aria-hidden="true" className="size-3" /> : null}
                  {author}
                </span>
                <LocalDateTime
                  iso={message.sentAt.toISOString()}
                  dateStyle="short"
                  timeStyle="short"
                />
              </div>
              <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-fg">
                {message.content}
              </p>
              {message.isInternal ? (
                <p className="mt-1 text-xs font-medium text-alert">
                  Visible uniquement dans le dashboard
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <ConversationComposer
        conversationId={conversation.id}
        customerEmail={conversation.customerEmail}
      />
      <ConversationReadMarker
        conversationId={conversation.id}
        unreadCount={conversation.unreadCount}
        messageCount={conversation.messages.length}
      />
    </div>
  );
}

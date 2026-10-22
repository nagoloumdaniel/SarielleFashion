'use client';

import { CheckCheck, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import {
  adminDeleteConversation,
  adminMarkAllConversationsRead,
  adminMarkConversationRead,
} from '@/modules/messagerie/actions';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';

/* Actions secondaires d'une ligne de conversation (hors lien : ne déclenchent pas la navigation). */
export function ConversationRowActions({
  conversationId,
  unread,
  subject,
}: {
  conversationId: string;
  unread: boolean;
  subject: string;
}) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  function markRead() {
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set('conversationId', conversationId);
        await adminMarkConversationRead(data);
        notify('Conversation marquée comme lue.', 'success');
      } catch {
        notify('Action impossible. Réessayez.', 'error');
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: 'Supprimer la conversation ?',
      message: `« ${subject} » et tous ses messages (notes internes comprises) seront supprimés définitivement.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await adminDeleteConversation(conversationId);
      if (result.error) notify(result.error, 'error');
      else notify(result.success ?? 'Conversation supprimée.', 'success');
    });
  }

  return (
    <>
      {unread ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={CheckCheck}
          iconOnly
          loading={pending}
          onClick={markRead}
        >
          Marquer comme lue
        </Button>
      ) : null}
      <Button
        type="button"
        variant="danger"
        size="sm"
        icon={Trash2}
        iconOnly
        disabled={pending}
        onClick={remove}
      >
        Supprimer
      </Button>
    </>
  );
}

export function MarkAllConversationsRead() {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      icon={CheckCheck}
      iconOnly="mobile"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await adminMarkAllConversationsRead();
          if (result.error) notify(result.error, 'error');
          else notify(result.success ?? 'Tout est marqué comme lu.', 'success');
        })
      }
    >
      Tout marquer comme lu
    </Button>
  );
}

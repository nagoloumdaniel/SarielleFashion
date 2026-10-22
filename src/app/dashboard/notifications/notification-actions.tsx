'use client';

import { Check, CheckCheck, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { useTransition } from 'react';
import {
  deleteNotification,
  deleteFailedEmails,
  deleteReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  retryFailedNotification,
  type NotificationActionState,
} from '@/modules/notifications/actions';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';

/* Exécute une action serveur avec état de chargement + toast succès / erreur. */
function useRun() {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const run = (task: () => Promise<NotificationActionState>) =>
    startTransition(async () => {
      try {
        const result = await task();
        if (result.error) notify(result.error, 'error');
        else if (result.success) notify(result.success, 'success');
      } catch {
        notify('Action impossible. Réessayez.', 'error');
      }
    });
  return { pending, run };
}

function idData(id: string): FormData {
  const data = new FormData();
  data.set('id', id);
  return data;
}

/* Actions secondaires d'une alerte (lu / non lu, suppression), hors du lien principal. */
export function NotificationRowActions({ id, read }: { id: string; read: boolean }) {
  const { pending, run } = useRun();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        iconOnly
        icon={read ? Undo2 : Check}
        disabled={pending}
        onClick={() =>
          run(() =>
            read ? markNotificationUnread({}, idData(id)) : markNotificationRead({}, idData(id)),
          )
        }
      >
        {read ? 'Marquer comme non lue' : 'Marquer comme lue'}
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        iconOnly
        icon={Trash2}
        disabled={pending}
        onClick={() => run(() => deleteNotification(id))}
      >
        Supprimer
      </Button>
    </>
  );
}

export function RetryEmailButton({ id }: { id: string }) {
  const { pending, run } = useRun();
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      icon={RotateCcw}
      iconOnly="mobile"
      loading={pending}
      onClick={() => run(() => retryFailedNotification({}, idData(id)))}
    >
      Relancer
    </Button>
  );
}

export function NotificationsHeaderActions({
  hasUnread,
  hasRead,
  hasFailed,
}: {
  hasUnread: boolean;
  hasRead: boolean;
  hasFailed: boolean;
}) {
  const confirm = useConfirm();
  const { pending, run } = useRun();
  return (
    <>
      {hasUnread ? (
        <Button
          type="button"
          variant="secondary"
          icon={CheckCheck}
          iconOnly="mobile"
          loading={pending}
          onClick={() => run(() => markAllNotificationsRead())}
        >
          Tout marquer comme lu
        </Button>
      ) : null}
      {hasRead ? (
        <Button
          type="button"
          variant="danger"
          icon={Trash2}
          iconOnly="mobile"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              title: 'Supprimer les notifications lues ?',
              message: 'Seules les alertes déjà lues sont supprimées. Cette action est définitive.',
              confirmLabel: 'Supprimer',
            });
            if (ok) run(() => deleteReadNotifications());
          }}
        >
          Supprimer les lues
        </Button>
      ) : null}
      {hasFailed ? (
        <Button
          type="button"
          variant="danger"
          icon={Trash2}
          iconOnly="mobile"
          loading={pending}
          onClick={async () => {
            const ok = await confirm({
              title: 'Supprimer les échecs d’envoi ?',
              message:
                'Seuls les e-mails en échec sont supprimés, sans nouvel envoi. Cette action est définitive.',
              confirmLabel: 'Supprimer',
            });
            if (ok) run(() => deleteFailedEmails());
          }}
        >
          Supprimer les échecs d’envoi
        </Button>
      ) : null}
    </>
  );
}

'use client';

import type { ConversationStatus } from '@prisma/client';
import { Check, CircleDot, Trash2, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { adminDeleteConversation, adminSetConversationStatus } from '@/modules/messagerie/actions';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const STATUS_OPTIONS: ReadonlyArray<{ value: ConversationStatus; label: string; hint: string }> = [
  { value: 'NEW', label: 'Nouveau', hint: 'Pas encore traité' },
  { value: 'IN_PROGRESS', label: 'En cours', hint: 'Je m’en occupe' },
  { value: 'WAITING_RESPONSE', label: 'Attente réponse', hint: 'J’attends la cliente' },
  { value: 'TREATED', label: 'Traité', hint: 'Échange terminé' },
  { value: 'ARCHIVED', label: 'Archivé', hint: 'Masqué du suivi courant' },
];

/* Actions de l'en-tête d'une conversation : statut (modale), fiche cliente, suppression. */
export function ConversationHeaderActions({
  conversationId,
  status,
  customerId,
  subject,
}: {
  conversationId: string;
  status: ConversationStatus;
  customerId: string | null;
  subject: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const currentLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

  function applyStatus(next: ConversationStatus) {
    if (next === status) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set('conversationId', conversationId);
        data.set('status', next);
        const result = await adminSetConversationStatus({}, data);
        if (result.error) {
          notify(result.error, 'error');
          return;
        }
        notify(result.success ?? 'Statut mis à jour.', 'success');
        setOpen(false);
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
      try {
        // Sans revalidation côté serveur : sinon la page [id] supprimée est re-rendue (notFound)
        // avant la navigation. On navigue d'abord, puis on rafraîchit la liste et le layout.
        const result = await adminDeleteConversation(conversationId, { revalidate: false });
        if (result.error) {
          notify(result.error, 'error');
          return;
        }
        notify(result.success ?? 'Conversation supprimée.', 'success');
        router.replace('/dashboard/messages');
        router.refresh();
      } catch {
        notify('Suppression impossible. Réessayez.', 'error');
      }
    });
  }

  return (
    <>
      {customerId ? (
        <ButtonLink
          href={`/dashboard/clients/${customerId}`}
          variant="secondary"
          icon={UserRound}
          iconOnly="mobile"
        >
          Fiche cliente
        </ButtonLink>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        icon={CircleDot}
        iconOnly="mobile"
        title={`Statut : ${currentLabel}`}
        onClick={() => setOpen(true)}
      >
        {currentLabel}
      </Button>
      <Button
        type="button"
        variant="danger"
        icon={Trash2}
        iconOnly="mobile"
        disabled={pending}
        onClick={remove}
      >
        Supprimer
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Statut de la conversation" size="sm">
        <ul className="flex flex-col gap-2">
          {STATUS_OPTIONS.map((option) => {
            const current = option.value === status;
            return (
              <li key={option.value}>
                <Button
                  type="button"
                  variant={current ? 'primary' : 'secondary'}
                  icon={current ? Check : undefined}
                  className="w-full justify-start"
                  disabled={pending}
                  aria-pressed={current}
                  onClick={() => applyStatus(option.value)}
                >
                  {option.label}
                  <span className="text-xs font-normal opacity-80">{option.hint}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}

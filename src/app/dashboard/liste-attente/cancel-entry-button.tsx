'use client';

import { UserMinus } from 'lucide-react';
import { useTransition } from 'react';
import { adminCancelWaitlistEntry } from '@/modules/liste-attente/admin-actions';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';

/* Retire une cliente de la liste d'attente (confirmation, anti double clic, toast). */
export function CancelEntryButton({
  entryId,
  customerName,
  notified,
}: {
  entryId: string;
  customerName: string;
  notified: boolean;
}) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  async function onClick() {
    const ok = await confirm({
      title: 'Retirer de la liste d’attente ?',
      message: notified
        ? `${customerName} a déjà été prévenue : son lien expire et le créneau est proposé à la suivante.`
        : `${customerName} ne sera plus prévenue si ce créneau se libère.`,
      confirmLabel: 'Retirer',
    });
    if (!ok) return;
    const data = new FormData();
    data.set('id', entryId);
    startTransition(async () => {
      try {
        const state = await adminCancelWaitlistEntry({}, data);
        if (state.error) notify(state.error, 'error');
        else notify(state.success ?? 'Demande retirée.', 'success');
      } catch {
        notify('Connexion impossible. Réessayez.', 'error');
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      icon={UserMinus}
      iconOnly
      loading={pending}
      onClick={() => void onClick()}
    >
      {`Retirer ${customerName} de la liste d’attente`}
    </Button>
  );
}

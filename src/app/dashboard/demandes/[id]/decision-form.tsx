'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { decideCustomRequest } from '@/modules/demandes/actions';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

const ACTIONS = [
  { value: 'IN_REVIEW', label: 'Prendre en charge' },
  { value: 'INFO_REQUESTED', label: 'Demander des précisions' },
  { value: 'QUOTED', label: 'Envoyer un devis' },
  { value: 'ACCEPTED', label: 'Accepter la demande' },
  { value: 'REFUSED', label: 'Refuser la demande' },
  { value: 'CLOSED', label: 'Clôturer' },
] as const;

type ActionValue = (typeof ACTIONS)[number]['value'];

/* Décisions qui ferment ou engagent la demande : confirmation avant l'envoi à la cliente. */
const CONFIRM_TEXT: Partial<
  Record<ActionValue, { title: string; message: string; label: string }>
> = {
  ACCEPTED: {
    title: 'Accepter la demande ?',
    message: 'La cliente reçoit votre réponse par e-mail. Aucun créneau n’est réservé.',
    label: 'Accepter',
  },
  REFUSED: {
    title: 'Refuser la demande ?',
    message: 'La cliente reçoit votre message de refus par e-mail.',
    label: 'Refuser',
  },
  CLOSED: {
    title: 'Clôturer la demande ?',
    message: 'Une demande clôturée n’accepte plus de décision.',
    label: 'Clôturer',
  },
};

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
  } catch {
    return 'Europe/Berlin';
  }
}

export function CustomRequestDecisionForm({
  requestId,
  services,
  currentStatus,
}: {
  requestId: string;
  services: Array<{ id: string; name: string }>;
  currentStatus: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<ActionValue>(
    currentStatus === 'NEW' ? 'IN_REVIEW' : 'QUOTED',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const closed = currentStatus === 'CLOSED';
  const withProposal = action === 'QUOTED' || action === 'ACCEPTED';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set('requestId', requestId);
    data.set('timeZone', deviceTimeZone());
    const text = CONFIRM_TEXT[action];
    if (text) {
      const ok = await confirm({
        title: text.title,
        message: text.message,
        confirmLabel: text.label,
        tone: action === 'ACCEPTED' ? 'primary' : 'danger',
      });
      if (!ok) return;
    }
    setError('');
    startTransition(async () => {
      try {
        const state = await decideCustomRequest({}, data);
        if (state.error) {
          setError(state.error);
          notify(state.error, 'error');
          return;
        }
        notify(state.success ?? 'Décision enregistrée.', 'success');
        setMessage('');
        router.refresh();
      } catch {
        setError('Connexion impossible. Réessayez.');
        notify('Connexion impossible. Réessayez.', 'error');
      }
    });
  }

  if (closed) {
    return (
      <p className="rounded-[var(--radius-md)] bg-line px-3 py-2.5 text-sm text-muted">
        Cette demande est clôturée : plus aucune décision n’est possible.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Select
        label="Décision"
        name="action"
        value={action}
        onChange={(event) => setAction(event.target.value as ActionValue)}
        options={ACTIONS}
      />
      {withProposal ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Prix estimatif (€, facultatif)"
            name="estimatedPriceEur"
            type="number"
            inputMode="numeric"
            min={0}
            max={10000000}
            step={1}
            placeholder="Ex. 25000"
          />
          <Input
            label="Créneau proposé (facultatif)"
            name="proposedSlotLocal"
            type="datetime-local"
            hint="Une proposition ne réserve pas le créneau."
          />
          <div className="sm:col-span-2">
            <Select
              label="Prestation du catalogue à proposer (facultatif)"
              name="serviceId"
              defaultValue=""
              options={[
                { value: '', label: 'Aucune' },
                ...services.map((service) => ({ value: service.id, label: service.name })),
              ]}
            />
          </div>
        </div>
      ) : null}
      <Textarea
        label="Message à la cliente"
        name="message"
        placeholder="Ex. Merci pour ta demande, voici ma réponse…"
        rows={4}
        required={action !== 'IN_REVIEW'}
        maxLength={3000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        hint={
          action === 'IN_REVIEW'
            ? 'Facultatif : une simple prise en charge n’envoie aucun e-mail.'
            : 'Enregistré dans l’historique et envoyé par e-mail.'
        }
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" icon={Save} loading={pending}>
          Enregistrer la décision
        </Button>
      </div>
    </form>
  );
}

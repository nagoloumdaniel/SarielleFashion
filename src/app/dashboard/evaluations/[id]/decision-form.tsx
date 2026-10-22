'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { decideAssessment } from '@/modules/compatibilite/actions';
import {
  ASSESSMENT_DECISIONS,
  ASSESSMENT_DECISION_LABELS,
  type AssessmentDecision,
} from '@/modules/compatibilite/schemas';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

/* ============================================================
 * Décision de Sarielle sur une évaluation.
 * Rappel : la décision ne crée aucune réservation.
 * ============================================================ */

const DECISION_HINTS: Record<AssessmentDecision, string> = {
  ACCEPT: 'La cliente pourra réserver, sous réserve que le créneau choisi soit encore disponible.',
  REFUSE:
    'Expliquez pourquoi la prestation ne peut pas être réalisée et proposez une alternative si possible.',
  REQUEST_INFO:
    'Indiquez précisément quelles informations ou quelles photos complémentaires sont attendues.',
  PROPOSE_ALTERNATIVE:
    'Proposez une autre coiffure adaptée à la situation capillaire décrite par la cliente.',
  ALLOW_CONDITIONAL:
    'Précisez les conditions de réalisation : longueur minimale, options, temps supplémentaire, soin préalable…',
};

/* Décisions définitives (le serveur refuse ensuite toute nouvelle décision). */
const FINAL_DECISIONS: AssessmentDecision[] = ['ACCEPT', 'REFUSE'];

export function DecisionForm({
  assessmentId,
  terminal,
}: {
  assessmentId: string;
  terminal: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState<AssessmentDecision>('ACCEPT');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (terminal) {
    return (
      <p className="rounded-[var(--radius-md)] bg-line px-3 py-2.5 text-sm text-muted">
        Une décision définitive a déjà été enregistrée pour cette évaluation. L’historique
        ci-dessous conserve la décision et son message.
      </p>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (FINAL_DECISIONS.includes(decision)) {
      const ok = await confirm({
        title: decision === 'ACCEPT' ? 'Accepter la compatibilité ?' : 'Refuser la prestation ?',
        message: 'Cette décision est définitive : elle ne pourra plus être modifiée.',
        confirmLabel: decision === 'ACCEPT' ? 'Accepter' : 'Refuser',
        tone: decision === 'ACCEPT' ? 'primary' : 'danger',
      });
      if (!ok) return;
    }
    const data = new FormData();
    data.set('assessmentId', assessmentId);
    data.set('decision', decision);
    data.set('decisionMessage', message);
    data.set('decisionNote', note);
    setError('');
    startTransition(async () => {
      try {
        const state = await decideAssessment({}, data);
        if (state.error) {
          setError(state.error);
          notify(state.error, 'error');
          return;
        }
        notify(state.success ?? 'Décision enregistrée.', 'success');
        router.refresh();
      } catch {
        setError('Connexion impossible. Réessayez.');
        notify('Connexion impossible. Réessayez.', 'error');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Select
        label="Décision"
        value={decision}
        onChange={(event) => setDecision(event.target.value as AssessmentDecision)}
        options={ASSESSMENT_DECISIONS.map((value) => ({
          value,
          label: ASSESSMENT_DECISION_LABELS[value],
        }))}
      />
      <p className="-mt-1 text-sm text-muted">{DECISION_HINTS[decision]}</p>

      <Textarea
        label="Message pour la cliente"
        required
        rows={4}
        minLength={3}
        maxLength={1000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        hint="Conservé avec la décision dans l’historique."
      />
      <Textarea
        label="Note interne (facultatif)"
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        hint="Visible uniquement dans le dashboard."
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" icon={Save} loading={pending}>
          Enregistrer la décision
        </Button>
        <p className="text-sm text-muted">Aucun rendez-vous n’est créé par cette action.</p>
      </div>
    </form>
  );
}

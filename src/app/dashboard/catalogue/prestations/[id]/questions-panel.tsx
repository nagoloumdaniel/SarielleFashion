'use client';

import {
  GitBranch,
  KeyRound,
  List,
  ListChecks,
  MessageCircleQuestion,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { AdminQuestion } from '@/lib/catalogue-admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  adminCreateQuestion,
  adminDeleteQuestion,
  adminReorderQuestions,
  adminUpdateQuestion,
  type CatalogueActionState,
} from '@/modules/catalogue/actions';
import {
  CheckboxField,
  EmptyBlock,
  FormError,
  ReorderButtons,
  formDataOf,
  useFormAction,
  useReorderableList,
  useRunAction,
} from '../../catalogue-ui';

/* ============================================================
 * P4.8 - Éditeur des questions capillaires par prestation.
 * Les questions peuvent être conditionnelles (affichées selon
 * la réponse à une autre question). L'ordre se règle avec les flèches.
 * ============================================================ */

const ANSWER_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Choix unique' },
  { value: 'MULTI_CHOICE', label: 'Choix multiple' },
  { value: 'BOOLEAN', label: 'Oui / Non' },
  { value: 'TEXT', label: 'Texte libre' },
  { value: 'PHOTO', label: 'Photo' },
] as const;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ANSWER_TYPES.map((type) => [type.value, type.label]),
);

function conditionOf(condition: unknown): { dependsOn: string; equals: string } {
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    const record = condition as Record<string, unknown>;
    return {
      dependsOn: typeof record.dependsOn === 'string' ? record.dependsOn : '',
      equals: typeof record.equals === 'string' ? record.equals : '',
    };
  }
  return { dependsOn: '', equals: '' };
}

function QuestionForm({
  action,
  serviceId,
  initial,
  submitLabel,
  defaultOrder,
  onDone,
}: {
  action: (prev: CatalogueActionState, formData: FormData) => Promise<CatalogueActionState>;
  serviceId: string;
  initial?: AdminQuestion;
  submitLabel: string;
  /** Ordre d'une nouvelle question (en fin de liste). */
  defaultOrder: number;
  onDone: () => void;
}) {
  const { state, onSubmit, pending } = useFormAction(action, onDone);
  const [type, setType] = useState<string>(initial?.type ?? 'SINGLE_CHOICE');
  const condition = conditionOf(initial?.condition);
  const hasChoices = type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="serviceId" value={serviceId} />
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="order" value={initial?.order ?? defaultOrder} />

      <Input
        label="Question posée à la cliente"
        name="label"
        icon={MessageCircleQuestion}
        required
        autoFocus
        defaultValue={initial?.label ?? ''}
        hint="Formulation claire et directe."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Clé technique"
          name="key"
          icon={KeyRound}
          required
          defaultValue={initial?.key ?? ''}
          hint="Minuscules, chiffres, tirets bas. Ex. longueur_actuelle."
        />
        <Select
          label="Type de réponse"
          name="type"
          icon={ListChecks}
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={ANSWER_TYPES.map((item) => ({ value: item.value, label: item.label }))}
        />
      </div>

      {hasChoices ? (
        <Input
          label="Choix proposés"
          name="options"
          icon={List}
          defaultValue={initial?.options?.join(', ') ?? ''}
          hint="Séparez les choix par des virgules."
        />
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <CheckboxField
          name="required"
          label="Réponse obligatoire"
          defaultChecked={initial?.required ?? true}
        />
        <CheckboxField
          name="active"
          label="Question active"
          defaultChecked={initial?.active ?? true}
        />
      </div>

      <fieldset className="rounded-[var(--radius-md)] border border-line p-3">
        <legend className="px-2 text-sm font-semibold">Affichage conditionnel (facultatif)</legend>
        <p className="mb-3 text-sm text-muted">
          N’afficher cette question que si une autre question a une réponse donnée.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Clé de la question de départ"
            name="conditionDependsOn"
            icon={GitBranch}
            defaultValue={condition.dependsOn}
            hint="Exemple : porte_des_locs"
          />
          <Input
            label="Valeur attendue"
            name="conditionEquals"
            icon={GitBranch}
            defaultValue={condition.equals}
            hint="Exemple : oui"
          />
        </div>
      </fieldset>

      <FormError message={state.error} />
      <Button type="submit" icon={Save} loading={pending} className="self-end">
        {submitLabel}
      </Button>
    </form>
  );
}

function QuestionRow({
  serviceId,
  question,
  index,
  count,
  pendingOrder,
  onMove,
}: {
  serviceId: string;
  question: AdminQuestion;
  index: number;
  count: number;
  pendingOrder: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const confirm = useConfirm();
  const remove = useRunAction();
  const condition = conditionOf(question.condition);

  async function onDelete() {
    const ok = await confirm({
      title: 'Supprimer cette question ?',
      message: `« ${question.label} » sera retirée du questionnaire.`,
    });
    if (!ok) return;
    remove.run(() => adminDeleteQuestion({}, formDataOf({ id: question.id })));
  }

  return (
    <li className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-card p-2 sm:gap-3 sm:p-3">
      <ReorderButtons
        index={index}
        count={count}
        pending={pendingOrder}
        onMove={(direction) => onMove(index, direction)}
        label={question.label}
      />
      {/* Toute la zone texte ouvre la modification. */}
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label={`Modifier la question ${question.label}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] p-1 text-left transition hover:bg-accent-soft/50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{question.label}</span>
            {question.required ? (
              <Badge tone="accent">Obligatoire</Badge>
            ) : (
              <Badge tone="neutral">Facultative</Badge>
            )}
            {question.active ? null : <Badge tone="alert">Inactive</Badge>}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {question.key} · {TYPE_LABELS[question.type] ?? question.type}
          </span>
          {condition.dependsOn ? (
            <span className="mt-0.5 block text-sm text-muted">
              Affichée si « {condition.dependsOn} » = « {condition.equals} »
            </span>
          ) : null}
        </span>
        <Pencil
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition group-hover:text-accent"
        />
      </button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        iconOnly
        icon={Trash2}
        loading={remove.pending}
        onClick={onDelete}
        aria-label={`Supprimer la question ${question.label}`}
        title="Supprimer"
      >
        Supprimer
      </Button>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la question">
        <QuestionForm
          action={adminUpdateQuestion}
          serviceId={serviceId}
          initial={question}
          submitLabel="Enregistrer"
          defaultOrder={question.order}
          onDone={() => setEditOpen(false)}
        />
      </Modal>
    </li>
  );
}

export function QuestionsPanel({
  serviceId,
  questions,
}: {
  serviceId: string;
  questions: AdminQuestion[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const { list, move, pending } = useReorderableList(questions, (orderedIds) =>
    adminReorderQuestions(serviceId, orderedIds),
  );

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-card p-3 shadow-soft sm:p-4">
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          size="sm"
          icon={Plus}
          iconOnly="mobile"
          onClick={() => setCreateOpen(true)}
        >
          Ajouter une question
        </Button>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle question">
        <QuestionForm
          action={adminCreateQuestion}
          serviceId={serviceId}
          submitLabel="Ajouter la question"
          defaultOrder={questions.length}
          onDone={() => setCreateOpen(false)}
        />
      </Modal>

      {list.length === 0 ? (
        <EmptyBlock>
          Aucune question. La réservation utilisera le questionnaire par défaut.
        </EmptyBlock>
      ) : (
        <ol className="flex flex-col gap-2">
          {list.map((question, index) => (
            <QuestionRow
              key={question.id}
              serviceId={serviceId}
              question={question}
              index={index}
              count={list.length}
              pendingOrder={pending}
              onMove={move}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

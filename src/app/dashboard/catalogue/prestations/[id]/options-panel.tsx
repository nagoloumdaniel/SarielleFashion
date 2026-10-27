'use client';

import { Eye, EyeOff, Pencil, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AdminServiceOption } from '@/lib/catalogue-admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  adminCreateOption,
  adminDeleteOption,
  adminReorderOptions,
  adminToggleOption,
  adminUpdateOption,
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
 * P4.3 - Options payantes d'une prestation (prix et durée
 * additionnels). Prix en euros (colonne en centimes).
 * ============================================================ */

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCents(cents: number): string {
  return priceFormatter.format(cents / 100);
}

function OptionForm({
  action,
  serviceId,
  initial,
  submitLabel,
  onDone,
}: {
  action: (prev: CatalogueActionState, formData: FormData) => Promise<CatalogueActionState>;
  serviceId: string;
  initial?: AdminServiceOption;
  submitLabel: string;
  onDone: () => void;
}) {
  const { state, onSubmit, pending } = useFormAction(action, onDone);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="serviceId" value={serviceId} />
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <Input
        label="Nom de l'option"
        name="name"
        icon={Sparkles}
        placeholder="Ex. Retouche"
        autoComplete="off"
        required
        autoFocus
        defaultValue={initial?.name ?? ''}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Prix (€)"
          name="priceEuros"
          placeholder="Ex. 10"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          defaultValue={initial ? String(initial.priceCents / 100) : ''}
        />
        <Input
          label="Durée ajoutée (minutes)"
          name="durationMinutes"
          placeholder="Ex. 15"
          type="number"
          inputMode="numeric"
          min={0}
          max={480}
          defaultValue={String(initial?.durationMinutes ?? 0)}
          hint="0 si l'option n'allonge pas la prestation."
        />
      </div>
      <CheckboxField name="active" label="Option active" defaultChecked={initial?.active ?? true} />
      <FormError message={state.error} />
      <Button type="submit" icon={Save} loading={pending} className="self-end">
        {submitLabel}
      </Button>
    </form>
  );
}

function OptionRow({
  serviceId,
  option,
  index,
  count,
  pendingOrder,
  onMove,
}: {
  serviceId: string;
  option: AdminServiceOption;
  index: number;
  count: number;
  pendingOrder: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const confirm = useConfirm();
  const toggle = useRunAction();
  const remove = useRunAction();
  const nextActive = !option.active;

  async function onDelete() {
    const ok = await confirm({
      title: 'Supprimer cette option ?',
      message: `« ${option.name} » sera retirée de la prestation.`,
    });
    if (!ok) return;
    remove.run(() => adminDeleteOption({}, formDataOf({ id: option.id })));
  }

  return (
    <li className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-card p-2 sm:gap-3 sm:p-3">
      <ReorderButtons
        index={index}
        count={count}
        pending={pendingOrder}
        onMove={(direction) => onMove(index, direction)}
        label={option.name}
      />
      {/* Toute la zone texte ouvre la modification. */}
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label={`Modifier l'option ${option.name}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] p-1 text-left transition hover:bg-accent-soft/50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold">{option.name}</span>
            {option.active ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="alert">Désactivée</Badge>
            )}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {formatCents(option.priceCents)}
            {option.durationMinutes > 0
              ? ` · +${option.durationMinutes} min`
              : ' · sans durée ajoutée'}
          </span>
        </span>
        <Pencil
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition group-hover:text-accent"
        />
      </button>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          icon={option.active ? EyeOff : Eye}
          loading={toggle.pending}
          onClick={() =>
            toggle.run(() =>
              adminToggleOption({}, formDataOf({ id: option.id, active: nextActive })),
            )
          }
          aria-label={`${nextActive ? 'Activer' : 'Désactiver'} l'option ${option.name}`}
          title={nextActive ? 'Activer' : 'Désactiver'}
        >
          {nextActive ? 'Activer' : 'Désactiver'}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          iconOnly
          icon={Trash2}
          loading={remove.pending}
          onClick={onDelete}
          aria-label={`Supprimer l'option ${option.name}`}
          title="Supprimer"
        >
          Supprimer
        </Button>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Modifier ${option.name}`}>
        <OptionForm
          action={adminUpdateOption}
          serviceId={serviceId}
          initial={option}
          submitLabel="Enregistrer"
          onDone={() => setEditOpen(false)}
        />
      </Modal>
    </li>
  );
}

export function OptionsPanel({
  serviceId,
  options,
}: {
  serviceId: string;
  options: AdminServiceOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const { list, move, pending } = useReorderableList(options, (orderedIds) =>
    adminReorderOptions(serviceId, orderedIds),
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
          Ajouter une option
        </Button>
      </div>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle option">
        <OptionForm
          action={adminCreateOption}
          serviceId={serviceId}
          submitLabel="Ajouter l'option"
          onDone={() => setCreateOpen(false)}
        />
      </Modal>

      {list.length === 0 ? (
        <EmptyBlock>Aucune option. La prestation s’ajoute au panier sans supplément.</EmptyBlock>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((option, index) => (
            <OptionRow
              key={option.id}
              serviceId={serviceId}
              option={option}
              index={index}
              count={list.length}
              pendingOrder={pending}
              onMove={move}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

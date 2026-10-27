'use client';

import { Eye, EyeOff, FolderOpen, FolderPlus, Pencil, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import type { AdminCategory } from '@/lib/catalogue-admin';
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminReorderCategories,
  adminSetCategoryActive,
  adminUpdateCategory,
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
} from './catalogue-ui';

/* ============================================================
 * P4.2 - CRUD des catégories : créer, modifier (clic sur la ligne),
 * activer/désactiver, monter/descendre (optimistic), supprimer si vide.
 * ============================================================ */

function CategoryForm({
  action,
  initial,
  nextOrder,
  submitLabel,
  onDone,
}: {
  action: (prev: CatalogueActionState, formData: FormData) => Promise<CatalogueActionState>;
  initial?: AdminCategory;
  /** Ordre attribué à une nouvelle catégorie (en fin de liste). */
  nextOrder: number;
  submitLabel: string;
  onDone: () => void;
}) {
  const { state, onSubmit, pending } = useFormAction(action, onDone);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {/* L'ordre se règle avec les flèches de la liste : on conserve la valeur existante. */}
      <input type="hidden" name="order" value={initial?.order ?? nextOrder} />
      <Input
        label="Nom"
        name="name"
        icon={FolderOpen}
        placeholder="Ex. Robes"
        autoComplete="off"
        required
        autoFocus
        defaultValue={initial?.name ?? ''}
      />
      <Textarea
        label="Description (facultative)"
        name="description"
        placeholder="Ex. Robes et ensembles sur mesure pour toutes les occasions."
        rows={3}
        defaultValue={initial?.description ?? ''}
      />
      <CheckboxField
        name="active"
        label="Catégorie active"
        description="Visible sur le site public."
        defaultChecked={initial?.active ?? true}
      />
      <FormError message={state.error} />
      <Button type="submit" icon={Save} loading={pending} className="self-end">
        {submitLabel}
      </Button>
    </form>
  );
}

function CategoryRow({
  category,
  index,
  count,
  nextOrder,
  pendingOrder,
  onMove,
}: {
  category: AdminCategory;
  index: number;
  count: number;
  nextOrder: number;
  pendingOrder: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const confirm = useConfirm();
  const toggle = useRunAction();
  const remove = useRunAction();
  const nextActive = !category.active;
  const hasServices = category.serviceCount > 0;

  async function onToggleActive() {
    if (category.active) {
      const ok = await confirm({
        title: 'Désactiver cette catégorie ?',
        message: `« ${category.name} » et ses prestations ne seront plus visibles sur le site. Vous pourrez la réactiver à tout moment.`,
        confirmLabel: 'Désactiver',
        tone: 'primary',
      });
      if (!ok) return;
    }
    toggle.run(() =>
      adminSetCategoryActive({}, formDataOf({ id: category.id, active: nextActive })),
    );
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Supprimer cette catégorie ?',
      message: `« ${category.name} » sera supprimée définitivement.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    remove.run(() => adminDeleteCategory({}, formDataOf({ id: category.id })));
  }

  return (
    <li className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-card p-2 sm:gap-3 sm:p-3">
      <ReorderButtons
        index={index}
        count={count}
        pending={pendingOrder}
        onMove={(direction) => onMove(index, direction)}
        label={category.name}
      />
      {/* Toute la zone texte ouvre la modification (pas de bouton « Modifier »). */}
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label={`Modifier la catégorie ${category.name}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] p-1 text-left transition hover:bg-accent-soft/50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold">{category.name}</span>
            {category.active ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="alert">Désactivée</Badge>
            )}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {category.serviceCount} prestation
            {category.serviceCount > 1 ? 's' : ''}
          </span>
          {category.description ? (
            <span className="mt-0.5 line-clamp-1 block text-sm text-muted">
              {category.description}
            </span>
          ) : null}
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
          icon={category.active ? EyeOff : Eye}
          loading={toggle.pending}
          onClick={onToggleActive}
          aria-label={`${nextActive ? 'Activer' : 'Désactiver'} la catégorie ${category.name}`}
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
          disabled={hasServices}
          onClick={onDelete}
          aria-label={`Supprimer la catégorie ${category.name}`}
          title={
            hasServices ? 'Impossible : des prestations utilisent cette catégorie' : 'Supprimer'
          }
        >
          Supprimer
        </Button>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Modifier ${category.name}`}>
        <CategoryForm
          action={adminUpdateCategory}
          initial={category}
          nextOrder={nextOrder}
          submitLabel="Enregistrer"
          onDone={() => setEditOpen(false)}
        />
      </Modal>
    </li>
  );
}

export function CategoriesTab({ categories }: { categories: AdminCategory[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { list, move, pending } = useReorderableList(categories, adminReorderCategories);

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {categories.length} catégorie{categories.length > 1 ? 's' : ''}
        </p>
        <Button
          type="button"
          size="sm"
          icon={FolderPlus}
          iconOnly="mobile"
          onClick={() => setCreateOpen(true)}
        >
          Nouvelle catégorie
        </Button>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle catégorie">
        <CategoryForm
          action={adminCreateCategory}
          nextOrder={categories.length}
          submitLabel="Créer la catégorie"
          onDone={() => setCreateOpen(false)}
        />
      </Modal>

      {list.length === 0 ? (
        <EmptyBlock>Aucune catégorie. Créez la première pour organiser le catalogue.</EmptyBlock>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              index={index}
              count={list.length}
              nextOrder={categories.length}
              pendingOrder={pending}
              onMove={move}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { Clock, FolderOpen, Hash, Link2, Plus, Save, Scissors, Tag, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { AdminServiceCore } from '@/lib/catalogue-admin';
import { PRICE_MODE_LABELS, PRICE_MODES, type PriceMode } from '@/modules/catalogue/schemas';
import { centsToEurosInput, priceModeFromService } from '@/modules/catalogue/pricing';
import type { CatalogueActionState } from '@/modules/catalogue/actions';
import { FormError, useFormAction } from './catalogue-ui';

/* ============================================================
 * P4.3 - Formulaire prestation : identité, catégorie, prix
 * (fixe, départ, fourchette, à confirmer), durée et statut.
 * Prix saisis en FCFA, sans décimales.
 * ============================================================ */

interface CategoryOption {
  id: string;
  name: string;
  active: boolean;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

const PRICE_HINTS: Record<PriceMode, string> = {
  FIXED: 'Un prix unique est affiché.',
  FROM: 'Le site affichera « À partir de ».',
  RANGE: 'Le site affichera une fourchette de prix.',
  ON_REQUEST: 'Aucun montant ne sera affiché.',
};

export function ServiceForm({
  action,
  categories,
  initial,
  submitLabel,
}: {
  action: (prev: CatalogueActionState, formData: FormData) => Promise<CatalogueActionState>;
  categories: CategoryOption[];
  initial?: AdminServiceCore;
  submitLabel: string;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.id));
  const [priceMode, setPriceMode] = useState<PriceMode>(() =>
    initial ? priceModeFromService(initial) : 'FROM',
  );

  const fromDefault = initial ? centsToEurosInput(initial.priceFromCents) : '';
  const toDefault = initial ? centsToEurosInput(initial.priceToCents) : '';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Nom de la prestation"
          name="name"
          icon={Scissors}
          required
          value={name}
          onChange={(event) => {
            const next = event.target.value;
            setName(next);
            if (!slugTouched) setSlug(slugify(next));
          }}
        />
        <Input
          label="Slug"
          name="slug"
          icon={Link2}
          required
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          hint="Utilisé dans l'URL publique, par exemple /coiffures/tresses-collees."
        />
      </div>

      <Textarea
        label="Description"
        name="description"
        defaultValue={initial?.description ?? ''}
        hint="Décrivez la prestation, le rendu attendu et les conseils d'entretien."
        rows={4}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Catégorie"
          name="categoryId"
          icon={FolderOpen}
          required
          defaultValue={initial?.categoryId ?? ''}
          options={[
            { value: '', label: 'Choisir une catégorie' },
            ...categories.map((category) => ({
              value: category.id,
              label: category.active ? category.name : `${category.name} (désactivée)`,
            })),
          ]}
        />
        <Select
          label="Mode de prix"
          name="priceMode"
          icon={Wallet}
          value={priceMode}
          onChange={(event) => setPriceMode(event.target.value as PriceMode)}
          options={PRICE_MODES.map((mode) => ({ value: mode, label: PRICE_MODE_LABELS[mode] }))}
        />
        <Select
          label="Statut"
          name="status"
          icon={Tag}
          defaultValue={initial?.status ?? 'DRAFT'}
          options={[
            { value: 'DRAFT', label: 'Brouillon (invisible sur le site)' },
            { value: 'PUBLISHED', label: 'Publié (visible sur le site)' },
            { value: 'ARCHIVED', label: 'Archivé' },
          ]}
        />
      </div>

      {priceMode === 'ON_REQUEST' ? (
        <p className="rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-sm">
          Le prix sera affiché « Prix à confirmer » sur le site. Vous pourrez le préciser ensuite.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={priceMode === 'RANGE' ? 'Prix minimum (FCFA)' : 'Prix (FCFA)'}
            name="priceFromEuros"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            defaultValue={fromDefault}
            hint={`Exemple : 15000. ${PRICE_HINTS[priceMode]}`}
          />
          {priceMode === 'RANGE' ? (
            <Input
              label="Prix maximum (FCFA)"
              name="priceToEuros"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={toDefault}
              hint="Laissez vide si le prix exact reste à confirmer."
            />
          ) : null}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Durée (minutes)"
          name="durationMinutes"
          icon={Clock}
          type="number"
          inputMode="numeric"
          min={1}
          max={480}
          defaultValue={initial?.durationMinutes ?? ''}
          hint="Facultative si la durée dépend de la longueur des cheveux."
        />
        <Input
          label="Ordre d'affichage"
          name="order"
          icon={Hash}
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={String(initial?.order ?? 0)}
          hint="Les plus petits nombres apparaissent en premier."
        />
      </div>

      <FormError message={state.error} />

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" icon={initial ? Save : Plus} loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

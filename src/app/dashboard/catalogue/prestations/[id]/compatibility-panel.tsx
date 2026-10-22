'use client';

import { Camera, Save } from 'lucide-react';
import type { AdminCompatibilityRule } from '@/lib/catalogue-admin';
import { HAIR_TYPE_OPTIONS } from '@/modules/compatibilite/questions';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { adminSaveCompatibility } from '@/modules/catalogue/actions';
import { CheckboxField, FormError, useFormAction } from '../../catalogue-ui';

/* ============================================================
 * P4.7 - Éditeur des règles de compatibilité capillaire.
 * Ces règles sont évaluées côté serveur par le moteur P5.
 * ============================================================ */

const HAIR_LENGTHS = [
  { value: 'SHORT', label: 'Cheveux courts' },
  { value: 'MEDIUM', label: 'Longueur moyenne' },
  { value: 'LONG', label: 'Cheveux longs' },
  { value: 'VERY_LONG', label: 'Cheveux très longs' },
] as const;

const PHOTO_POLICIES = [
  { value: 'OPTIONAL', label: 'Photo facultative' },
  { value: 'REQUIRED', label: 'Photo obligatoire' },
  { value: 'FORBIDDEN', label: 'Photo inutile pour cette prestation' },
] as const;

export function CompatibilityPanel({
  serviceId,
  rule,
}: {
  serviceId: string;
  rule: AdminCompatibilityRule | null;
}) {
  const { state, onSubmit, pending } = useFormAction(adminSaveCompatibility);
  const accepted = new Set(rule?.acceptedLengths ?? []);
  const acceptedHairTypes = new Set(rule?.acceptedHairTypes ?? []);

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-card p-3 shadow-soft sm:p-4"
    >
      <input type="hidden" name="serviceId" value={serviceId} />

      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded-[var(--radius-md)] border border-line p-3">
          <legend className="px-2 text-sm font-semibold">Longueurs de cheveux acceptées</legend>
          <p className="mb-3 text-sm text-muted">
            Aucune case cochée : aucune restriction de longueur.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {HAIR_LENGTHS.map((length) => (
              <CheckboxField
                key={length.value}
                name="acceptedLengths"
                value={length.value}
                label={length.label}
                defaultChecked={accepted.has(length.value)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-[var(--radius-md)] border border-line p-3">
          <legend className="px-2 text-sm font-semibold">Types de cheveux acceptés</legend>
          <p className="mb-3 text-sm text-muted">
            Aucune case cochée : tous les types sont acceptés. Un type non listé déclenche une
            demande d’évaluation.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {HAIR_TYPE_OPTIONS.map((hairType) => (
              <CheckboxField
                key={hairType}
                name="acceptedHairTypes"
                value={hairType}
                label={hairType}
                defaultChecked={acceptedHairTypes.has(hairType)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded-[var(--radius-md)] border border-line p-3">
          <legend className="px-2 text-sm font-semibold">Locs</legend>
          <div className="flex flex-col gap-3">
            <CheckboxField
              name="requiresLocs"
              label="Les locs sont obligatoires"
              description="La cliente doit déjà porter des locs."
              defaultChecked={rule?.requiresLocs ?? false}
            />
            <CheckboxField
              name="incompatibleLocs"
              label="Les locs sont incompatibles"
              description="La prestation est refusée si la cliente porte des locs."
              defaultChecked={rule?.incompatibleLocs ?? false}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-[var(--radius-md)] border border-line p-3">
          <legend className="px-2 text-sm font-semibold">Photo et validation</legend>
          <div className="flex flex-col gap-3">
            <Select
              label="Photo de la cliente"
              name="photoPolicy"
              icon={Camera}
              defaultValue={rule?.photoPolicy ?? 'OPTIONAL'}
              options={PHOTO_POLICIES.map((policy) => ({
                value: policy.value,
                label: policy.label,
              }))}
            />
            <CheckboxField
              name="autoApprove"
              label="Accepter automatiquement l’évaluation"
              description="Décochée, l’évaluation arrive dans la file de validation."
              defaultChecked={rule?.autoApprove ?? false}
            />
          </div>
        </fieldset>
      </div>

      <div className="grid gap-3">
        <Textarea
          label="Conditions particulières (facultatif)"
          name="conditionsNote"
          defaultValue={rule?.conditionsNote ?? ''}
          hint="Affichées à la cliente et à Sarielle, par exemple un soin préalable ou un temps supplémentaire."
          rows={2}
        />
        <Textarea
          label="Message si la prestation est incompatible"
          name="incompatibleMessage"
          defaultValue={rule?.incompatibleMessage ?? ''}
          hint="Expliquez pourquoi et proposez une alternative. Vide : message par défaut."
          rows={3}
        />
        <Textarea
          label="Message si la compatibilité est incertaine"
          name="uncertainMessage"
          defaultValue={rule?.uncertainMessage ?? ''}
          hint="Par exemple : envoyez une photo pour que Sarielle confirme."
          rows={3}
        />
      </div>

      <FormError message={state.error} />

      <Button type="submit" icon={Save} loading={pending} className="self-end">
        Enregistrer les règles
      </Button>
    </form>
  );
}

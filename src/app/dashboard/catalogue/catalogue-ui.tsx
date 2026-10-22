'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { CatalogueActionState } from '@/modules/catalogue/actions';
import { moveItem } from '@/modules/catalogue/ordering';

/* ============================================================
 * Briques communes du back-office catalogue : formulaires avec
 * toast, actions directes (transition + toast), monter/descendre
 * en optimistic UI avec retour arrière automatique en cas d'erreur.
 * ============================================================ */

type FormAction = (prev: CatalogueActionState, formData: FormData) => Promise<CatalogueActionState>;

/* Formulaire : état, bouton en chargement, toast de succès, rappel onSuccess.
   On soumet via `onSubmit` (et non `<form action>`) : React 19 réinitialise sinon les champs non
   contrôlés après l'action, ce qui efface la saisie quand le serveur renvoie une erreur.
   L'erreur reste affichée dans le formulaire (FormError) : un toast serait sous la modale.
   Pas de `useActionState` : son état et son `pending` voyagent dans la même transition que la mise
   à jour du routeur (revalidatePath). Si ce rendu reste suspendu, le résultat n'est appliqué qu'au
   prochain rendu urgent : bouton en chargement, modale ouverte, aucun toast. Ici le résultat est
   appliqué par des mises à jour urgentes, une fois la server action terminée. */
export function useFormAction(action: FormAction, onSuccess?: () => void) {
  const [state, setState] = useState<CatalogueActionState>({});
  const [pending, setPending] = useState(false);
  const busyRef = useRef(false);
  const { notify } = useToast();
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    const formData = new FormData(event.currentTarget);
    let result: CatalogueActionState;
    try {
      result = await action({}, formData);
    } catch {
      result = { error: 'Une erreur est survenue. Réessayez plus tard.' };
    }
    busyRef.current = false;
    setState(result);
    setPending(false);
    if (result.success) {
      notify(result.success, 'success');
      onSuccessRef.current?.();
    }
  }
  return { state, onSubmit, pending };
}

/* FormData à partir de champs simples, pour appeler une action `(prev, formData)` sans formulaire. */
export function formDataOf(fields: Record<string, string | boolean>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, String(value));
  return formData;
}

/* Action directe (bouton icône, bascule…) : transition (anti double-clic) + toast succès / erreur. */
export function useRunAction() {
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();
  function run(fn: () => Promise<CatalogueActionState | void>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await fn();
      if (!result) return;
      if (result.error) {
        notify(result.error, 'error');
        return;
      }
      if (result.success) notify(result.success, 'success');
      onSuccess?.();
    });
  }
  return { pending, run };
}

/* Liste ordonnable : le déplacement s'affiche tout de suite (optimistic) ; si le serveur refuse,
   la liste revient seule à l'état des props. La revalidation serveur remplace ensuite l'état. */
export function useReorderableList<T extends { id: string }>(
  items: readonly T[],
  persist: (orderedIds: string[]) => Promise<CatalogueActionState>,
) {
  const [pending, startTransition] = useTransition();
  const [list, setList] = useOptimistic<readonly T[]>(items);
  const { notify } = useToast();

  function move(index: number, direction: -1 | 1) {
    const next = moveItem(list, index, direction);
    if (next === list) return;
    startTransition(async () => {
      setList(next);
      const result = await persist(next.map((item) => item.id));
      if (result.error) notify(result.error, 'error');
    });
  }
  return { list, move, pending };
}

/* Boutons monter / descendre (désactivés en bord de liste ou pendant l'enregistrement). */
export function ReorderButtons({
  index,
  count,
  pending,
  onMove,
  label,
}: {
  index: number;
  count: number;
  pending: boolean;
  onMove: (direction: -1 | 1) => void;
  /** Nom de l'élément, pour les libellés accessibles. */
  label: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        iconOnly
        icon={ChevronUp}
        disabled={pending || index <= 0}
        onClick={() => onMove(-1)}
        aria-label={`Monter ${label}`}
        title="Monter"
      >
        Monter
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        iconOnly
        icon={ChevronDown}
        disabled={pending || index >= count - 1}
        onClick={() => onMove(1)}
        aria-label={`Descendre ${label}`}
        title="Descendre"
      >
        Descendre
      </Button>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-md)] bg-alert-soft px-3 py-2 text-sm font-medium text-alert"
    >
      {message}
    </p>
  );
}

/* Case à cocher uniforme (couleur de marque, zone cliquable large). */
export function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
  value,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
  value?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />
      <span>
        <span className="font-semibold">{label}</span>
        {description ? <span className="block text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

/* Zone vide : invitation à agir, pointillés discrets. */
export function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] border border-dashed border-line p-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

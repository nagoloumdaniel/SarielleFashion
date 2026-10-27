'use client';

import {
  Banknote,
  CalendarRange,
  Percent,
  Plus,
  Power,
  PowerOff,
  Tag,
  Ticket,
  Trash2,
} from 'lucide-react';
import {
  startTransition as startFormTransition,
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import {
  adminCreatePromotion,
  adminDeletePromotion,
  adminSetPromotionActive,
  adminUpdatePromotion,
  type PromotionActionState,
} from '@/modules/promotions/actions';
import { applyPromotion } from '@/modules/promotions/pricing';
import { formatEuro } from '@/modules/stats/format';

type Kind = 'PERCENT' | 'FIXED';
type Phase = 'active' | 'upcoming' | 'ended' | 'off';

export type PromotionRow = {
  id: string;
  name: string;
  /** Code promo saisi par la cliente ; null = promotion automatique. */
  code: string | null;
  kind: Kind;
  /** Pourcentage, ou montant en centimes. */
  value: number;
  /** Jours civils `YYYY-MM-DD`. */
  startsAt: string;
  endsAt: string;
  active: boolean;
  phase: Phase;
  serviceIds: string[];
  serviceNames: string[];
};

export type ServiceOption = { id: string; name: string; priceFromCents: number | null };

const PHASES: Record<Phase, { label: string; tone: 'success' | 'accent' | 'neutral' }> = {
  active: { label: 'En cours', tone: 'success' },
  upcoming: { label: 'À venir', tone: 'accent' },
  ended: { label: 'Terminée', tone: 'neutral' },
  off: { label: 'Désactivée', tone: 'neutral' },
};

const dayFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' });
const formatDay = (day: string) => dayFmt.format(new Date(`${day}T00:00:00.000Z`));

const formatValue = (kind: Kind, value: number) =>
  kind === 'PERCENT' ? `-${value} %` : `-${formatEuro(value)}`;

/* ---------- Formulaire création / édition (dans une Modal) ---------- */

function PromotionForm({
  promotion,
  services,
  onDone,
}: {
  promotion: PromotionRow | null;
  services: ServiceOption[];
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [state, formAction, pending] = useActionState<PromotionActionState, FormData>(
    promotion ? adminUpdatePromotion : adminCreatePromotion,
    {},
  );
  const [kind, setKind] = useState<Kind>(promotion?.kind ?? 'PERCENT');
  const [value, setValue] = useState(
    promotion ? String(promotion.kind === 'FIXED' ? promotion.value / 100 : promotion.value) : '',
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(promotion?.serviceIds ?? []));

  useEffect(() => {
    if (state.success) {
      notify(state.success, 'success');
      onDone();
    }
  }, [state, notify, onDone]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Aperçu : prix « à partir de » après réduction, calculé par le moteur de prix.
  const numeric = Number(value.replace(',', '.'));
  const valid = Number.isFinite(numeric) && numeric > 0 && (kind === 'FIXED' || numeric <= 100);
  const preview = valid
    ? services
        .filter((s) => selected.has(s.id) && s.priceFromCents != null)
        .slice(0, 3)
        .map((s) => ({
          id: s.id,
          name: s.name,
          from: s.priceFromCents as number,
          to: applyPromotion(s.priceFromCents as number, {
            id: '',
            name: '',
            kind,
            value: kind === 'PERCENT' ? Math.round(numeric) : Math.round(numeric * 100),
          }).finalPriceCents,
        }))
    : [];

  /* `onSubmit` plutôt que `<form action>` : React 19 réinitialise sinon les champs non contrôlés
     après l'action, ce qui efface nom / dates quand le serveur renvoie une erreur. */
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startFormTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {promotion ? <input type="hidden" name="id" value={promotion.id} /> : null}
      <Input
        label="Nom"
        name="name"
        icon={Tag}
        required
        maxLength={120}
        defaultValue={promotion?.name ?? ''}
        placeholder="Ex. Offre de rentrée"
        autoComplete="off"
      />
      <Input
        label="Code promo (facultatif)"
        name="code"
        icon={Ticket}
        maxLength={20}
        defaultValue={promotion?.code ?? ''}
        placeholder="Ex. RENTREE20"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        pattern="[A-Za-z0-9\-]{3,20}"
        title="3 à 20 caractères : lettres, chiffres ou tirets"
        hint="Sans code, la réduction s’applique automatiquement. Avec un code, seule la cliente qui le saisit en profite."
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Type"
          name="kind"
          icon={kind === 'PERCENT' ? Percent : Banknote}
          value={kind}
          onChange={(event) => setKind(event.target.value as Kind)}
          options={[
            { value: 'PERCENT', label: 'Pourcentage' },
            { value: 'FIXED', label: 'Montant fixe' },
          ]}
        />
        <Input
          label={kind === 'PERCENT' ? 'Réduction (%)' : 'Réduction (€)'}
          name="value"
          type="number"
          inputMode="numeric"
          icon={kind === 'PERCENT' ? Percent : Banknote}
          min={1}
          max={kind === 'PERCENT' ? 100 : undefined}
          step={1}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={kind === 'PERCENT' ? 'Ex. 20' : 'Ex. 5'}
        />
      </div>
      <Input
        label="Début"
        name="startsAt"
        type="date"
        required
        defaultValue={promotion?.startsAt ?? ''}
      />
      <Input
        label="Fin (incluse)"
        name="endsAt"
        type="date"
        required
        defaultValue={promotion?.endsAt ?? ''}
      />

      <fieldset>
        <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-fg">
          <span>
            Prestations concernées <span className="font-normal text-muted">({selected.size})</span>
          </span>
          <button
            type="button"
            onClick={() =>
              setSelected(
                selected.size === services.length ? new Set() : new Set(services.map((s) => s.id)),
              )
            }
            className="rounded-[var(--radius-sm)] px-1 text-sm font-semibold text-accent hover:underline"
          >
            {selected.size === services.length ? 'Aucune' : 'Toutes'}
          </button>
        </legend>
        <div className="mt-1.5 flex max-h-48 flex-col overflow-y-auto rounded-[var(--radius-md)] border border-line p-1">
          {services.length === 0 ? (
            <p className="p-2 text-sm text-muted">Aucune prestation au catalogue.</p>
          ) : (
            services.map((service) => (
              <label
                key={service.id}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 text-sm text-fg hover:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={service.id}
                  checked={selected.has(service.id)}
                  onChange={() => toggle(service.id)}
                  className="size-4 accent-accent"
                />
                <span className="min-w-0 flex-1 truncate">{service.name}</span>
                {service.priceFromCents != null ? (
                  <span className="shrink-0 text-xs text-muted">
                    {formatEuro(service.priceFromCents)}
                  </span>
                ) : null}
              </label>
            ))
          )}
        </div>
      </fieldset>

      {preview.length > 0 ? (
        <div className="rounded-[var(--radius-md)] bg-accent-soft p-3 text-sm text-fg">
          <p className="font-semibold">Aperçu des prix</p>
          <ul className="mt-1 space-y-0.5">
            {preview.map((row) => (
              <li key={row.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{row.name}</span>
                <span className="shrink-0">
                  <s className="text-muted">{formatEuro(row.from)}</s>{' '}
                  <strong>{formatEuro(row.to)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" loading={pending} icon={promotion ? undefined : Plus}>
          {promotion ? 'Enregistrer' : 'Créer la promotion'}
        </Button>
      </div>
    </form>
  );
}

/* ---------- Liste ---------- */

export function PromotionsClient({
  promotions,
  services,
}: {
  promotions: PromotionRow[];
  services: ServiceOption[];
}) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<PromotionRow | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Nouvelle clé à chaque ouverture : le formulaire repart d'un état propre.
  const [formKey, setFormKey] = useState(0);
  const close = useCallback(() => setEditing(null), []);

  function open(next: PromotionRow | 'new') {
    setFormKey((k) => k + 1);
    setEditing(next);
  }

  function run(
    id: string,
    action: (prev: PromotionActionState, formData: FormData) => Promise<PromotionActionState>,
    fields: Record<string, string>,
  ) {
    setBusyId(id);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', id);
      for (const [k, v] of Object.entries(fields)) formData.set(k, v);
      try {
        const result = await action({}, formData);
        if (result.error) notify(result.error, 'error');
        else if (result.success) notify(result.success, 'success');
      } catch {
        notify('Action impossible. Réessayez.', 'error');
      } finally {
        setBusyId(null);
      }
    });
  }

  async function remove(promotion: PromotionRow) {
    const ok = await confirm({
      title: 'Supprimer la promotion',
      message: `« ${promotion.name} » sera supprimée définitivement. Les réservations déjà faites gardent leur prix.`,
      confirmLabel: 'Supprimer',
    });
    if (ok) run(promotion.id, adminDeletePromotion, {});
  }

  return (
    <>
      <PageHeader
        icon={Tag}
        title="Promotions"
        actions={
          <Button icon={Plus} iconOnly="mobile" onClick={() => open('new')}>
            Nouvelle promotion
          </Button>
        }
      />

      {promotions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] bg-card px-4 py-10 text-center shadow-soft">
          <span
            aria-hidden="true"
            className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"
          >
            <Tag className="size-6" />
          </span>
          <p className="font-heading text-lg font-bold text-fg">Aucune promotion</p>
          <p className="max-w-sm text-sm text-muted">
            Créez une réduction en pourcentage ou en montant fixe.
          </p>
          <Button icon={Plus} onClick={() => open('new')}>
            Nouvelle promotion
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promotion) => {
            const phase = PHASES[promotion.phase];
            const busy = busyId === promotion.id;
            return (
              <li
                key={promotion.id}
                className="relative flex gap-2 rounded-[var(--radius-lg)] border border-transparent bg-card p-3 shadow-soft transition focus-within:border-cacao hover:border-cacao sm:p-4"
              >
                {/* Carte entière cliquable : le bouton principal s'étire sur toute la carte. */}
                <button
                  type="button"
                  onClick={() => open(promotion)}
                  aria-label={`Modifier la promotion ${promotion.name}`}
                  className="min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:rounded-[var(--radius-lg)] after:content-['']"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-xl font-bold text-accent">
                      {formatValue(promotion.kind, promotion.value)}
                    </span>
                    <Badge tone={phase.tone} size="sm">
                      {phase.label}
                    </Badge>
                    {promotion.code ? (
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-accent-soft px-2 py-0.5 text-xs font-semibold tracking-wide text-accent">
                        <Ticket aria-hidden="true" className="size-3.5" />
                        {promotion.code}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate font-semibold text-fg">
                    {promotion.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <CalendarRange aria-hidden="true" className="size-4 shrink-0" />
                    {formatDay(promotion.startsAt)} - {formatDay(promotion.endsAt)}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted">
                    {promotion.serviceNames.join(', ') || 'Aucune prestation'}
                  </span>
                </button>
                <div className="relative z-10 flex shrink-0 flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    iconOnly
                    icon={promotion.active ? PowerOff : Power}
                    loading={busy}
                    onClick={() =>
                      run(promotion.id, adminSetPromotionActive, {
                        active: String(!promotion.active),
                      })
                    }
                    title={promotion.active ? 'Désactiver' : 'Activer'}
                  >
                    {promotion.active ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    disabled={busy}
                    onClick={() => void remove(promotion)}
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === 'new' ? 'Nouvelle promotion' : 'Modifier la promotion'}
      >
        {editing !== null ? (
          <PromotionForm
            key={formKey}
            promotion={editing === 'new' ? null : editing}
            services={services}
            onDone={close}
          />
        ) : null}
      </Modal>
    </>
  );
}

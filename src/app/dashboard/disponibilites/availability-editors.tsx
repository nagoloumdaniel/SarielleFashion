'use client';

import { ArrowRight, CalendarPlus, Ban, Save, Trash2 } from 'lucide-react';
import { useCallback, useState, useTransition, type FormEvent } from 'react';
import {
  adminCreateBlockedPeriod,
  adminDeleteBlockedPeriod,
  adminDeleteSpecificRule,
  adminSaveSettings,
  adminSaveSpecificRule,
  adminSaveWeeklyRule,
  type AvailabilityActionState,
} from '@/modules/disponibilites/actions';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

/* ============================================================
 * Édition des disponibilités et paramètres de réservation.
 * Les conflits avec des rendez-vous existants sont détectés par le
 * serveur : l'interface demande alors une confirmation puis renvoie
 * le formulaire avec `confirmConflicts`.
 * ============================================================ */

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export interface WeeklyRuleView {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface SpecificRuleView {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
}

export interface BlockedPeriodView {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  createdByName: string | null;
}

export interface BookingSettingsView {
  holdSlotMinutes: number;
  minCancelNoticeMinutes: number;
  reminderLeadHours: number;
  bufferMinutes: number;
  slotIntervalMinutes: number;
  maxAdvanceDays: number;
  minLeadTimeMinutes: number;
  cancelReasonRequired: boolean;
  dataRetentionMonths: number;
  photoRetentionDays: number;
}

type ServerAction = (
  prev: AvailabilityActionState,
  formData: FormData,
) => Promise<AvailabilityActionState>;

function timeValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(
    2,
    '0',
  )}`;
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
  } catch {
    return 'Europe/Berlin';
  }
}

/* Lance une action serveur : fuseau de l'appareil, confirmation si des rendez-vous sont
   touchés, toast de résultat. `pending` bloque le double envoi. */
function useAvailabilityAction() {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (action: ServerAction, data: FormData, onSuccess?: () => void) => {
      data.set('timeZone', deviceTimeZone());
      startTransition(async () => {
        try {
          let state = await action({}, data);
          if (state.conflictCount) {
            const ok = await confirm({
              title: 'Des rendez-vous sont concernés',
              message:
                `${state.error ?? ''} Les rendez-vous ne sont pas annulés automatiquement. Continuer malgré tout ?`.trim(),
              confirmLabel: 'Continuer',
              tone: 'danger',
            });
            if (!ok) return;
            data.set('confirmConflicts', 'on');
            state = await action({}, data);
          }
          if (state.error) {
            notify(state.error, 'error');
            return;
          }
          notify(state.success ?? 'Enregistré.', 'success');
          onSuccess?.();
        } catch {
          notify('Connexion impossible. Réessayez.', 'error');
        }
      });
    },
    [confirm, notify],
  );

  return { run, pending };
}

const checkboxClass = 'size-4 accent-accent';

function WeekdayForm({ weekday, rule }: { weekday: number; rule: WeeklyRuleView | null }) {
  const { run, pending } = useAvailabilityAction();
  const [active, setActive] = useState(Boolean(rule));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set('weekday', String(weekday));
    // Jour fermé : les champs désactivés ne sont pas postés ; le serveur exige des heures valides.
    if (!active) {
      data.set('start', '09:00');
      data.set('end', '18:00');
    }
    run(adminSaveWeeklyRule, data);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[var(--radius-md)] border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-semibold text-fg">{WEEKDAYS[weekday]}</p>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className={checkboxClass}
          />
          Ouvert
        </label>
      </div>
      {/* Jour fermé : seuls les sélecteurs d'heure sont désactivés ; le bouton reste actif pour
          enregistrer la fermeture. Mobile : Début et Fin côte à côte, bouton pleine largeur dessous.
          Dès sm : une seule ligne, bouton carré h-10 aligné au bas des sélecteurs. */}
      <div
        role="group"
        aria-label={`Horaires de ${WEEKDAYS[weekday]}`}
        className="grid min-w-0 grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <div className={`min-w-0 transition-opacity ${active ? '' : 'opacity-50 grayscale'}`}>
          <Input
            label="Début"
            name="start"
            type="time"
            disabled={!active}
            defaultValue={timeValue(rule?.startMinute ?? 540)}
          />
        </div>
        <div className={`min-w-0 transition-opacity ${active ? '' : 'opacity-50 grayscale'}`}>
          <Input
            label="Fin"
            name="end"
            type="time"
            disabled={!active}
            defaultValue={timeValue(rule?.endMinute ?? 1080)}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          icon={Save}
          loading={pending}
          aria-label={`Enregistrer ${WEEKDAYS[weekday]?.toLowerCase()}`}
          title={`Enregistrer ${WEEKDAYS[weekday]?.toLowerCase()}`}
          className="col-span-2 w-full sm:col-span-1 sm:size-10 sm:w-10 sm:px-0"
        >
          <span className="sm:sr-only">Enregistrer</span>
        </Button>
      </div>
    </form>
  );
}

export function WeeklyScheduleEditor({ rules }: { rules: WeeklyRuleView[] }) {
  return (
    <div className="grid gap-2">
      {WEEKDAYS.map((label, weekday) => (
        <WeekdayForm
          key={label}
          weekday={weekday}
          rule={rules.find((rule) => rule.weekday === weekday) ?? null}
        />
      ))}
    </div>
  );
}

export function SpecificDatesEditor({ rules }: { rules: SpecificRuleView[] }) {
  const { run, pending } = useAvailabilityAction();
  const [active, setActive] = useState(true);
  const [formKey, setFormKey] = useState(0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(adminSaveSpecificRule, new FormData(event.currentTarget), () => setFormKey((k) => k + 1));
  }

  return (
    <div className="grid gap-4">
      <form key={formKey} onSubmit={onSubmit} className="grid gap-3">
        <Input label="Date" name="dateISO" type="date" required />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Début" name="start" type="time" defaultValue="09:00" />
          <Input label="Fin" name="end" type="time" defaultValue="18:00" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="active"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className={checkboxClass}
            />
            Ouvert ce jour-là
          </label>
          <Button type="submit" icon={CalendarPlus} loading={pending}>
            Ajouter
          </Button>
        </div>
      </form>

      {rules.length === 0 ? (
        <p className="text-sm text-muted">Aucune exception de date à venir.</p>
      ) : (
        <ul className="grid gap-2">
          {rules.map((rule) => (
            <SpecificRow key={rule.id} rule={rule} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SpecificRow({ rule }: { rule: SpecificRuleView }) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const label = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(
    new Date(`${rule.date}T12:00:00`),
  );

  async function remove() {
    const ok = await confirm({
      title: 'Supprimer cette exception ?',
      message: `Les horaires habituels s’appliqueront de nouveau le ${label}.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    const data = new FormData();
    data.set('id', rule.id);
    startTransition(async () => {
      try {
        const state = await adminDeleteSpecificRule({}, data);
        if (state.error) notify(state.error, 'error');
        else notify(state.success ?? 'Exception supprimée.', 'success');
      } catch {
        notify('Connexion impossible. Réessayez.', 'error');
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-card p-3">
      <p className="min-w-0 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="block text-muted">
          {rule.startMinute === rule.endMinute
            ? 'Fermé'
            : `${timeValue(rule.startMinute)} - ${timeValue(rule.endMinute)}`}
        </span>
      </p>
      <Button
        type="button"
        variant="danger"
        size="sm"
        icon={Trash2}
        iconOnly
        loading={pending}
        onClick={() => void remove()}
      >
        {`Supprimer l’exception du ${label}`}
      </Button>
    </li>
  );
}

export function BlockedPeriodsEditor({ periods }: { periods: BlockedPeriodView[] }) {
  const { run, pending } = useAvailabilityAction();
  const [formKey, setFormKey] = useState(0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(adminCreateBlockedPeriod, new FormData(event.currentTarget), () =>
      setFormKey((k) => k + 1),
    );
  }

  return (
    <div className="grid gap-4">
      <form key={formKey} onSubmit={onSubmit} className="grid gap-3">
        <Input label="Début" name="startsAtLocal" type="datetime-local" required />
        <Input label="Fin" name="endsAtLocal" type="datetime-local" required />
        <Textarea
          label="Motif (facultatif)"
          name="reason"
          placeholder="Ex. Congés, formation"
          rows={2}
          maxLength={200}
          hint="Ex. pause déjeuner, congé, rendez-vous personnel."
        />
        <div>
          <Button type="submit" icon={Ban} loading={pending}>
            Bloquer cette période
          </Button>
        </div>
      </form>

      {periods.length === 0 ? (
        <p className="text-sm text-muted">Aucune indisponibilité enregistrée.</p>
      ) : (
        <ul className="grid gap-2">
          {periods.map((period) => (
            <BlockedRow key={period.id} period={period} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BlockedRow({ period }: { period: BlockedPeriodView }) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  async function remove() {
    const ok = await confirm({
      title: 'Supprimer ce blocage ?',
      message: 'Les créneaux de cette période redeviennent réservables.',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    const data = new FormData();
    data.set('id', period.id);
    startTransition(async () => {
      try {
        const state = await adminDeleteBlockedPeriod({}, data);
        if (state.error) notify(state.error, 'error');
        else notify(state.success ?? 'Blocage supprimé.', 'success');
      } catch {
        notify('Connexion impossible. Réessayez.', 'error');
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-card p-3">
      <div className="min-w-0 text-sm">
        <p className="flex flex-wrap items-center gap-x-1.5 font-semibold">
          <LocalDateTime iso={period.startsAt} dateStyle="medium" />
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          <LocalDateTime iso={period.endsAt} dateStyle="medium" />
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-muted">
          <Badge tone="alert">Indisponible</Badge>
          <span className="min-w-0 truncate">
            {period.reason || 'Sans motif'}
            {period.createdByName ? ` · ${period.createdByName}` : ''}
          </span>
        </p>
      </div>
      <Button
        type="button"
        variant="danger"
        size="sm"
        icon={Trash2}
        iconOnly
        loading={pending}
        onClick={() => void remove()}
      >
        Supprimer ce blocage
      </Button>
    </li>
  );
}

export function BookingSettingsEditor({ settings }: { settings: BookingSettingsView }) {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const state = await adminSaveSettings({}, data);
        if (state.error) notify(state.error, 'error');
        else notify(state.success ?? 'Paramètres enregistrés.', 'success');
      } catch {
        notify('Connexion impossible. Réessayez.', 'error');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Maintien d’un créneau en attente (min)"
          name="holdSlotMinutes"
          placeholder="Ex. 30"
          type="number"
          min={0}
          max={1440}
          defaultValue={settings.holdSlotMinutes}
          hint="0 = pas de libération automatique."
        />
        <Input
          label="Délai minimum d’annulation (min)"
          name="minCancelNoticeMinutes"
          placeholder="Ex. 30"
          type="number"
          min={0}
          max={10080}
          defaultValue={settings.minCancelNoticeMinutes}
          hint="Annulation en ligne possible jusqu’à ce délai avant le rendez-vous (30 par défaut)."
        />
        <Input
          label="Rappel avant rendez-vous (h)"
          name="reminderLeadHours"
          placeholder="Ex. 24"
          type="number"
          min={0}
          max={720}
          defaultValue={settings.reminderLeadHours}
        />
        <Input
          label="Marge entre deux prestations (min)"
          name="bufferMinutes"
          placeholder="Ex. 15"
          type="number"
          min={0}
          max={240}
          defaultValue={settings.bufferMinutes}
        />
        <Input
          label="Intervalle des créneaux (min)"
          name="slotIntervalMinutes"
          placeholder="Ex. 30"
          type="number"
          min={5}
          max={120}
          defaultValue={settings.slotIntervalMinutes}
        />
        <Input
          label="Horizon de réservation (jours)"
          name="maxAdvanceDays"
          placeholder="Ex. 90"
          type="number"
          min={1}
          max={365}
          defaultValue={settings.maxAdvanceDays}
        />
        <Input
          label="Délai minimum avant réservation (min)"
          name="minLeadTimeMinutes"
          placeholder="Ex. 60"
          type="number"
          min={0}
          max={10080}
          defaultValue={settings.minLeadTimeMinutes}
        />
        <Input
          label="Conservation des données (mois)"
          name="dataRetentionMonths"
          placeholder="Ex. 36"
          type="number"
          min={1}
          max={120}
          defaultValue={settings.dataRetentionMonths}
          hint="Données clientes et historique."
        />
        <Input
          label="Conservation des photos (jours)"
          name="photoRetentionDays"
          placeholder="Ex. 30"
          type="number"
          min={7}
          max={3650}
          defaultValue={settings.photoRetentionDays}
          hint="Photos d’évaluation et de demande, purgées ensuite."
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="cancelReasonRequired"
          defaultChecked={settings.cancelReasonRequired}
          className={checkboxClass}
        />
        Motif obligatoire pour l’annulation par la cliente
      </label>
      <div>
        <Button type="submit" icon={Save} loading={pending}>
          Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
}

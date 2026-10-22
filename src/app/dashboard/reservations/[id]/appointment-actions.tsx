'use client';

import { Ban, CalendarClock, Check, CheckCheck, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';
import type { AppointmentStatus } from '@prisma/client';
import {
  adminCancelAppointment,
  adminLoadRescheduleSlots,
  adminRescheduleAppointment,
  adminTransitionAppointment,
  type AppointmentActionState,
  type RescheduleSlotsState,
} from '@/modules/reservations/actions';
import { isActiveAppointmentStatus } from '@/modules/reservations/status';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Textarea } from '@/components/ui/Textarea';

/* ============================================================
 * Actions de Patricia sur un rendez-vous : confirmer, terminer,
 * cliente absente, annuler / refuser, reprogrammer.
 * Les transitions et la disponibilité sont re-contrôlées côté serveur.
 * ============================================================ */

type StatusAction = 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW';
type Slot = NonNullable<RescheduleSlotsState['slots']>[number];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isoFromDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeLabel(startMinute: number): string {
  return `${pad(Math.floor(startMinute / 60))}:${pad(startMinute % 60)}`;
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Dakar';
  } catch {
    return 'Africa/Dakar';
  }
}

const STATUS_TEXT: Record<StatusAction, { title: string; message: string; confirmLabel: string }> =
  {
    CONFIRMED: {
      title: 'Confirmer le rendez-vous ?',
      message: 'La cliente reçoit un e-mail de confirmation.',
      confirmLabel: 'Confirmer',
    },
    COMPLETED: {
      title: 'Marquer comme terminé ?',
      message: 'Une demande d’avis sera envoyée à la cliente. Cette action est définitive.',
      confirmLabel: 'Marquer terminé',
    },
    NO_SHOW: {
      title: 'Cliente absente ?',
      message: 'Le rendez-vous sera clos comme « absente ». Cette action est définitive.',
      confirmLabel: 'Cliente absente',
    },
  };

export function AppointmentActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: AppointmentStatus;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!isActiveAppointmentStatus(status)) {
    return (
      <p className="rounded-[var(--radius-md)] bg-line px-3 py-2.5 text-sm text-muted">
        Ce rendez-vous est clos. Les actions de modification ne sont plus disponibles.
      </p>
    );
  }

  const canConfirm = status === 'PENDING' || status === 'RESCHEDULED';
  const canClose = status === 'CONFIRMED' || status === 'RESCHEDULED';

  /* Exécute une action serveur, notifie le résultat puis rafraîchit la fiche. */
  function run(
    key: string,
    action: () => Promise<AppointmentActionState>,
    onDone?: (state: AppointmentActionState) => void,
  ) {
    setBusy(key);
    startTransition(async () => {
      try {
        const state = await action();
        if (state.error) notify(state.error, 'error');
        else if (state.success) notify(state.success, 'success');
        onDone?.(state);
        if (state.success) router.refresh();
      } catch {
        notify('Connexion impossible. Réessayez.', 'error');
      } finally {
        setBusy(null);
      }
    });
  }

  async function changeStatus(next: StatusAction) {
    const text = STATUS_TEXT[next];
    if (!(await confirm({ ...text, tone: 'primary' }))) return;
    const data = new FormData();
    data.set('appointmentId', appointmentId);
    data.set('status', next);
    run(next, () => adminTransitionAppointment({}, data));
  }

  function submitCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set('appointmentId', appointmentId);
    setCancelError('');
    run(
      'cancel',
      () => adminCancelAppointment({}, data),
      (state) => {
        if (state.error) setCancelError(state.error);
        else setCancelOpen(false);
      },
    );
  }

  const cancelLabel = status === 'PENDING' ? 'Refuser' : 'Annuler';

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canConfirm ? (
          <Button
            type="button"
            size="sm"
            icon={Check}
            loading={busy === 'CONFIRMED'}
            disabled={pending}
            onClick={() => void changeStatus('CONFIRMED')}
          >
            Confirmer
          </Button>
        ) : null}
        {canClose ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={CheckCheck}
              loading={busy === 'COMPLETED'}
              disabled={pending}
              onClick={() => void changeStatus('COMPLETED')}
            >
              Terminé
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={UserX}
              iconOnly="mobile"
              loading={busy === 'NO_SHOW'}
              disabled={pending}
              onClick={() => void changeStatus('NO_SHOW')}
            >
              Cliente absente
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={CalendarClock}
          iconOnly="mobile"
          disabled={pending}
          onClick={() => setRescheduleOpen(true)}
        >
          Reprogrammer
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          icon={Ban}
          iconOnly="mobile"
          disabled={pending}
          onClick={() => {
            setCancelError('');
            setCancelOpen(true);
          }}
        >
          {cancelLabel}
        </Button>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={status === 'PENDING' ? 'Refuser la réservation' : 'Annuler le rendez-vous'}
        size="sm"
      >
        <form onSubmit={submitCancel} className="grid gap-3">
          <p className="text-sm text-muted">
            Le créneau est libéré et la cliente reçoit un e-mail.
          </p>
          <Textarea
            label="Motif communiqué à la cliente (facultatif)"
            name="reason"
            rows={3}
            maxLength={500}
            placeholder="Ex. imprévu, créneau indisponible…"
          />
          {cancelError ? (
            <p role="alert" className="text-sm font-medium text-alert">
              {cancelError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
              Retour
            </Button>
            <Button type="submit" variant="danger" icon={Ban} loading={busy === 'cancel'}>
              {status === 'PENDING' ? 'Refuser' : 'Annuler le rendez-vous'}
            </Button>
          </div>
        </form>
      </Modal>

      <RescheduleModal
        open={rescheduleOpen}
        appointmentId={appointmentId}
        busy={busy === 'reschedule'}
        onClose={() => setRescheduleOpen(false)}
        onSubmit={(slot, dateISO) => {
          const data = new FormData();
          data.set('appointmentId', appointmentId);
          data.set('dateISO', dateISO);
          data.set('startsAt', slot.startsAt);
          data.set('timeZone', deviceTimeZone());
          run(
            'reschedule',
            () => adminRescheduleAppointment({}, data),
            (state) => {
              if (state.success) setRescheduleOpen(false);
            },
          );
        }}
      />
    </div>
  );
}

function RescheduleModal({
  open,
  appointmentId,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  appointmentId: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (slot: Slot, dateISO: string) => void;
}) {
  const [dateISO, setDateISO] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Slot | null>(null);

  // À l'ouverture : demain par défaut (date de l'appareil).
  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDateISO(isoFromDate(tomorrow));
    setSelected(null);
  }, [open]);

  // Créneaux libres du jour choisi (l'ancien créneau du rendez-vous est exclu côté serveur).
  useEffect(() => {
    if (!open || !dateISO) return;
    let cancelled = false;
    setSlots(null);
    setError('');
    const data = new FormData();
    data.set('appointmentId', appointmentId);
    data.set('dateISO', dateISO);
    data.set('timeZone', deviceTimeZone());
    adminLoadRescheduleSlots({}, data)
      .then((state) => {
        if (cancelled) return;
        if (state.error) setError(state.error);
        setSlots(state.slots ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Connexion impossible. Réessayez.');
        setSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dateISO, appointmentId]);

  return (
    <Modal open={open} onClose={onClose} title="Reprogrammer le rendez-vous">
      <div className="grid gap-3">
        <p className="text-sm text-muted">
          L’ancien créneau n’est libéré qu’après validation du nouveau. La cliente est prévenue par
          e-mail.
        </p>
        <Input
          label="Nouvelle date"
          type="date"
          value={dateISO}
          min={isoFromDate(new Date())}
          onChange={(event) => {
            setDateISO(event.target.value);
            setSelected(null);
          }}
        />
        <div aria-live="polite" className="min-h-10">
          {slots === null ? (
            <p className="text-sm text-muted">Recherche des créneaux…</p>
          ) : error ? (
            <p role="alert" className="text-sm font-medium text-alert">
              {error}
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">Aucun créneau disponible ce jour.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <Button
                  key={slot.startsAt}
                  type="button"
                  size="sm"
                  variant={selected?.startsAt === slot.startsAt ? 'primary' : 'secondary'}
                  aria-pressed={selected?.startsAt === slot.startsAt}
                  onClick={() => setSelected(slot)}
                >
                  {timeLabel(slot.startMinute)}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Retour
          </Button>
          <Button
            type="button"
            icon={CalendarClock}
            disabled={!selected}
            loading={busy}
            onClick={() => selected && onSubmit(selected, dateISO)}
          >
            Valider
          </Button>
        </div>
      </div>
    </Modal>
  );
}

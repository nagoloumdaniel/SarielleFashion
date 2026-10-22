'use client';

import { Banknote, Clock, House, MessageSquareText, Save, UserRound } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { adminSaveSalonProfile, type SalonProfileState } from '@/modules/parametres/actions';
import { MAX_TRAVEL_FEE_FCFA } from '@/modules/parametres/home-service';
import {
  OPENING_MAX,
  OPENING_MIN,
  WEEKDAY_LABELS,
  readOpeningHours,
} from '@/modules/parametres/hours';
import { SettingsSection } from './settings-section';

type Settings = {
  name: string;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  emailSignature: string | null;
  cancellationPolicy: string | null;
  bookingPolicy: string | null;
  openingHours: unknown;
  homeServiceEnabled: boolean;
  /** Frais de déplacement en 1/100 FCFA (affichés en FCFA). */
  travelFeeCents: number;
};

/* Heures proposées : de 5 h à 22 h, par pas de 30 minutes. */
const TIME_OPTIONS = (() => {
  const out: { value: string; label: string }[] = [];
  const [minH] = OPENING_MIN.split(':').map(Number) as [number];
  const [maxH] = OPENING_MAX.split(':').map(Number) as [number];
  for (let m = minH * 60; m <= maxH * 60; m += 30) {
    const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    out.push({ value: t, label: t });
  }
  return out;
})();

export function SalonProfileForm({ settings }: { settings: Settings }) {
  const { notify } = useToast();
  const [state, formAction, pending] = useActionState<SalonProfileState, FormData>(
    adminSaveSalonProfile,
    {},
  );
  // Champs contrôlés : une erreur de validation ne réinitialise pas la saisie.
  const initialHours = readOpeningHours(settings.openingHours);
  const [values, setValues] = useState({
    name: settings.name,
    contactEmail: settings.contactEmail ?? '',
    phone: settings.phone ?? '',
    address: settings.address ?? '',
    emailSignature: settings.emailSignature ?? '',
    cancellationPolicy: settings.cancellationPolicy ?? '',
    bookingPolicy: settings.bookingPolicy ?? '',
  });
  const [homeEnabled, setHomeEnabled] = useState(settings.homeServiceEnabled);
  const [travelFee, setTravelFee] = useState(String(Math.round(settings.travelFeeCents / 100)));
  const [days, setDays] = useState<number[]>(initialHours.days);
  const [open, setOpen] = useState(initialHours.open);
  const [close, setClose] = useState(initialHours.close);

  useEffect(() => {
    if (state.success) notify(state.success, 'success');
  }, [state, notify]);

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
  const errors = state.fieldErrors ?? {};
  const hoursJson = JSON.stringify([...days].sort().map((weekday) => ({ weekday, open, close })));
  const hoursInvalid = days.length === 0 || open >= close;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="openingHours" value={hoursJson} />
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <SettingsSection icon={UserRound} title="Profil">
          <Input
            label="Nom professionnel"
            name="name"
            value={values.name}
            onChange={set('name')}
            required
            maxLength={120}
            error={errors.name}
          />
          <Input
            label="E-mail public"
            name="contactEmail"
            type="email"
            value={values.contactEmail}
            onChange={set('contactEmail')}
            maxLength={200}
            error={errors.contactEmail}
          />
          <Input
            label="Téléphone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={set('phone')}
            maxLength={30}
            error={errors.phone}
          />
          <Textarea
            label="Adresse ou quartier"
            name="address"
            rows={2}
            value={values.address}
            onChange={set('address')}
            maxLength={300}
            error={errors.address}
            hint="Patricia reçoit sur rendez-vous : indiquez la ville ou le quartier."
          />
        </SettingsSection>

        <SettingsSection icon={Clock} title="Horaires de travail">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-fg">Jours travaillés</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, weekday) => {
                const on = days.includes(weekday);
                return (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={on ? 'primary' : 'secondary'}
                    aria-pressed={on}
                    onClick={() =>
                      setDays((prev) =>
                        prev.includes(weekday)
                          ? prev.filter((d) => d !== weekday)
                          : [...prev, weekday],
                      )
                    }
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="De"
              icon={Clock}
              value={open}
              options={TIME_OPTIONS.filter((o) => o.value < OPENING_MAX)}
              onChange={(event) => setOpen(event.target.value)}
            />
            <Select
              label="À"
              icon={Clock}
              value={close}
              options={TIME_OPTIONS.filter((o) => o.value > OPENING_MIN)}
              onChange={(event) => setClose(event.target.value)}
            />
          </div>
          {hoursInvalid ? (
            <p role="alert" className="text-sm font-medium text-alert">
              Choisissez au moins un jour et une fin après le début.
            </p>
          ) : (
            <p className="text-sm text-muted">Horaires possibles : de 5 h à 22 h.</p>
          )}
          {errors.openingHours ? (
            <p role="alert" className="text-sm font-medium text-alert">
              {errors.openingHours}
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection icon={House} title="Coiffure à domicile" className="lg:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
            <input
              type="checkbox"
              name="homeServiceEnabled"
              checked={homeEnabled}
              onChange={(event) => setHomeEnabled(event.target.checked)}
              className="size-4 accent-accent"
            />
            Proposer la coiffure à domicile
          </label>
          <div className="max-w-xs">
            <Input
              label="Frais de déplacement (FCFA)"
              name="travelFeeFcfa"
              type="number"
              inputMode="numeric"
              icon={Banknote}
              min={0}
              max={MAX_TRAVEL_FEE_FCFA}
              step={1}
              value={travelFee}
              onChange={(event) => setTravelFee(event.target.value)}
              error={errors.travelFeeFcfa}
              hint="À la charge de la cliente, ajoutés au prix de la prestation. 0 = déplacement offert."
            />
          </div>
          <p className="text-sm text-muted">
            {homeEnabled
              ? 'Les clientes peuvent choisir l’option à la réservation et indiquent leur adresse.'
              : 'Désactivé : Patricia reçoit uniquement sur rendez-vous, sans option à domicile.'}
          </p>
        </SettingsSection>

        <SettingsSection
          icon={MessageSquareText}
          title="Messages affichés"
          className="lg:col-span-2"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <Textarea
              label="Règles d’annulation"
              name="cancellationPolicy"
              rows={3}
              value={values.cancellationPolicy}
              onChange={set('cancellationPolicy')}
              maxLength={3000}
              error={errors.cancellationPolicy}
              hint="Affichée sur la page d’annulation, /infos-pratiques et dans l’e-mail de confirmation. Vide : texte par défaut."
            />
            <Textarea
              label="Règles de réservation"
              name="bookingPolicy"
              rows={3}
              value={values.bookingPolicy}
              onChange={set('bookingPolicy')}
              maxLength={3000}
              error={errors.bookingPolicy}
              hint="Affichées sur /infos-pratiques et dans l’e-mail de confirmation. Vide : texte par défaut."
            />
          </div>
          <Textarea
            label="Signature des e-mails"
            name="emailSignature"
            rows={2}
            value={values.emailSignature}
            onChange={set('emailSignature')}
            maxLength={1000}
            error={errors.emailSignature}
            hint="Ajoutée en pied de tous les e-mails envoyés."
          />
        </SettingsSection>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.error && !errors.openingHours ? (
          <p role="alert" className="mr-auto text-sm font-medium text-alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" icon={Save} loading={pending} disabled={hoursInvalid}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

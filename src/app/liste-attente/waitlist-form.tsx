'use client';

import { Bell } from 'lucide-react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getDeviceTimezone, deviceTimeToUtc } from '@/lib/dates';
import { joinWaitlistAction, type WaitlistActionState } from '@/modules/liste-attente/actions';

export function WaitlistForm({ services }: { services: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<WaitlistActionState, FormData>(
    joinWaitlistAction,
    {},
  );

  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-[var(--radius-md)] border border-success bg-success-soft p-6 text-success"
      >
        {state.success}
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        const dateISO = String(formData.get('date') ?? '');
        const time = String(formData.get('time') ?? '');
        const [hours, minutes] = time.split(':').map(Number);
        if (dateISO && Number.isFinite(hours) && Number.isFinite(minutes)) {
          const startsAt = deviceTimeToUtc(dateISO, hours! * 60 + minutes!, getDeviceTimezone());
          formData.set('startsAtISO', startsAt.toISOString());
        }
        return formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <Select
        label="Prestation souhaitée"
        name="serviceId"
        required
        options={services.map((service) => ({ value: service.id, label: service.name }))}
      />
      <div className="flex flex-wrap gap-4">
        <Input label="Date souhaitée" name="date" type="date" required />
        <Input label="Heure souhaitée" name="time" type="time" required />
      </div>
      <Input label="Nom et prénom" name="name" placeholder="Votre nom et prénom" required />
      <Input label="E-mail" name="email" type="email" required />
      <Input label="Téléphone" name="phone" type="tel" required />
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      />
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" icon={Bell} loading={pending}>
        Rejoindre la liste d’attente
      </Button>
    </form>
  );
}

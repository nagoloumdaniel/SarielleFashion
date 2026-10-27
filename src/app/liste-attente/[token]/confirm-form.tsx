'use client';

import { CalendarCheck } from 'lucide-react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/i18n/client';
import { getDeviceTimezone, utcToDeviceParts } from '@/lib/dates';
import {
  confirmWaitlistBookingAction,
  type ConfirmWaitlistState,
} from '@/modules/liste-attente/confirm-actions';

export function ConfirmForm({
  token,
  serviceSlug,
  startsAtISO,
  defaultName,
  defaultEmail,
  defaultPhone,
}: {
  token: string;
  serviceSlug: string;
  startsAtISO: string;
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
}) {
  const { t, msg } = useI18n();
  const [state, formAction, pending] = useActionState<ConfirmWaitlistState, FormData>(
    confirmWaitlistBookingAction,
    {},
  );

  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-[var(--radius-md)] border border-success bg-success-soft p-6 text-success"
      >
        {msg(state.success)}{' '}
        {state.reference ? t('waitlist.confirm.reference', { reference: state.reference }) : ''}
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        const timeZone = getDeviceTimezone();
        const dateISO = utcToDeviceParts(new Date(startsAtISO), timeZone).dateISO;
        formData.set('serviceSlug', serviceSlug);
        formData.set('startsAtISO', startsAtISO);
        formData.set('dateISO', dateISO);
        formData.set('timeZone', timeZone);
        formData.set('waitlistToken', token);
        return formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <Input
        label={t('waitlist.confirm.name')}
        name="name"
        placeholder={t('common.ui.placeholders.name')}
        required
        defaultValue={defaultName}
      />
      <Input
        label={t('waitlist.confirm.email')}
        name="email"
        type="email"
        required
        defaultValue={defaultEmail}
      />
      <Input
        label={t('waitlist.confirm.phone')}
        name="phone"
        type="tel"
        required
        defaultValue={defaultPhone}
      />
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {msg(state.error)}
        </p>
      ) : null}
      <Button type="submit" icon={CalendarCheck} loading={pending}>
        {t('waitlist.confirm.submit')}
      </Button>
    </form>
  );
}

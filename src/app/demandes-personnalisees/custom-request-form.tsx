'use client';

import { CircleCheck, ImagePlus, Scissors, Send, TriangleAlert, UserRound } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/client';
import { submitCustomRequest, type CustomRequestSubmitState } from '@/modules/demandes/actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

function todayISO(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function CustomRequestForm() {
  const { t, msg, path } = useI18n();
  const [state, formAction, pending] = useActionState<CustomRequestSubmitState, FormData>(
    submitCustomRequest,
    {},
  );
  const [previews, setPreviews] = useState<string[]>([]);
  const successRef = useRef<HTMLDivElement>(null);

  // Après un envoi réussi, le focus passe au message de confirmation.
  useEffect(() => {
    if (state.success) successRef.current?.focus();
  }, [state.success]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  if (state.success) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-success/30 bg-success-soft p-6 outline-none sm:p-8"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-card text-success">
          <CircleCheck aria-hidden="true" className="size-6" />
        </span>
        <h2 className="font-heading text-2xl font-bold text-success">
          {t('requests.form.successTitle')}
        </h2>
        <p className="text-fg">{msg(state.success)}</p>
        <p className="text-sm text-ink-soft">{t('requests.form.ack')}</p>
        <Button
          type="button"
          variant="secondary"
          icon={Send}
          className="mt-2"
          onClick={() => window.location.assign(path('/demandes-personnalisees'))}
        >
          {t('requests.form.another')}
        </Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className="space-y-8 rounded-[var(--radius-lg)] bg-card p-5 shadow-soft sm:p-8"
    >
      <div className="hidden" aria-hidden="true">
        <label htmlFor="demande-website">{t('requests.form.honeypot')}</label>
        <input id="demande-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="space-y-5">
        <legend className="flex items-center gap-2 font-heading text-xl font-bold text-fg">
          <UserRound aria-hidden="true" className="size-5 text-cacao" />
          {t('requests.form.contactLegend')}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('requests.form.name')}
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
          <Input
            label={t('requests.form.email')}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
          />
          <Input
            label={t('requests.form.phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="flex items-center gap-2 font-heading text-xl font-bold text-fg">
          <Scissors aria-hidden="true" className="size-5 text-cacao" />
          {t('requests.form.hairLegend')}
        </legend>
        <Textarea
          label={t('requests.form.description')}
          name="description"
          rows={4}
          required
          minLength={20}
          maxLength={3000}
          hint={t('requests.form.descriptionHint')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('requests.form.length')}
            name="hairLength"
            required
            options={[
              { value: 'SHORT', label: t('requests.form.lengthOptions.SHORT') },
              { value: 'MEDIUM', label: t('requests.form.lengthOptions.MEDIUM') },
              { value: 'LONG', label: t('requests.form.lengthOptions.LONG') },
              { value: 'VERY_LONG', label: t('requests.form.lengthOptions.VERY_LONG') },
            ]}
          />
          <Input
            label={t('requests.form.hairType')}
            name="hairType"
            required
            minLength={2}
            maxLength={120}
            hint={t('requests.form.hairTypeHint')}
          />
          <Input
            label={t('requests.form.currentStyle')}
            name="currentStyle"
            maxLength={200}
            hint={t('requests.form.currentStyleHint')}
          />
          <Input
            label={t('requests.form.desiredDate')}
            name="desiredDate"
            type="date"
            min={todayISO()}
          />
        </div>
        <Textarea
          label={t('requests.form.comment')}
          name="comment"
          rows={2}
          maxLength={1000}
          hint={t('requests.form.commentHint')}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 font-heading text-xl font-bold text-fg">
          <ImagePlus aria-hidden="true" className="size-5 text-cacao" />
          {t('requests.form.photosLegend')}
        </legend>
        <p className="text-sm text-ink-soft">{t('requests.form.photosInfo')}</p>
        <input
          type="file"
          name="photos"
          aria-label={t('requests.form.photosAria')}
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-dashed border-line bg-page p-4 text-sm text-fg transition file:mr-3 file:cursor-pointer file:rounded-[var(--radius-md)] file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-accent-fg hover:border-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cacao"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []).slice(0, 3);
            setPreviews(files.map((file) => URL.createObjectURL(file)));
          }}
        />
        {previews.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {previews.map((url) => (
              <li key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={t('requests.form.previewAlt')}
                  className="size-24 rounded-[var(--radius-sm)] object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-page p-3">
        <input
          id="demande-consent"
          name="consent"
          type="checkbox"
          required
          className="mt-1 size-4"
        />
        <label htmlFor="demande-consent" className="text-sm text-ink-soft">
          {t('requests.form.consent')}
        </label>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {msg(state.error)}
        </p>
      ) : null}

      <Button type="submit" icon={Send} loading={pending} className="w-full sm:w-auto">
        {pending ? t('requests.form.sending') : t('requests.form.send')}
      </Button>
    </form>
  );
}

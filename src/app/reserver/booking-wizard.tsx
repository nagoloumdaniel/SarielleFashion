'use client';

import { formatNoticeDelayLocalized } from '@/modules/reservations/policy';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Check,
  ClipboardList,
  House,
  MapPin,
  Pencil,
  Scissors,
  ShieldCheck,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import type { BookableService } from '@/modules/reservations/queries';
import type { PublicQuestion } from '@/modules/compatibilite/questions';
import { INTL_LOCALE } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { formatDuration, formatEuro } from '@/i18n/format';
import { Link } from '@/i18n/link';
import { addTravelFee } from '@/modules/reservations/pricing';
import { HOME_ADDRESS_MAX, HOME_ADDRESS_MIN } from '@/modules/reservations/schemas';
import { isQuestionAnswered, isQuestionVisible } from '@/modules/compatibilite/questions';
import {
  previewCompatibility,
  type CompatibilityPreviewState,
} from '@/modules/compatibilite/actions';
import {
  applyPromoCode,
  loadAutomaticPromotion,
  loadBookingSlots,
  submitBooking,
  type BookingSlotsState,
  type BookingState,
  type PromoCodeState,
} from '@/modules/reservations/actions';
import { QuestionField } from '@/app/compatibilite/compatibility-wizard';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Title } from '@/components/ui/Title';

/* ============================================================
 * P6.3 / P6.4 : parcours de réservation public en 8 étapes.
 * Le créneau et la compatibilité sont re-vérifiés côté serveur
 * au moment de l'enregistrement définitif.
 * ============================================================ */

type Phase = 'questions' | 'blocked' | 'options' | 'slot' | 'contact' | 'summary' | 'done';

function timeLabel(startMinute: number): string {
  const hours = Math.floor(startMinute / 60);
  const minutes = startMinute % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function localDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

interface BookingSettings {
  minCancelNoticeMinutes: number;
  holdSlotMinutes: number;
  maxAdvanceDays: number;
  cancelReasonRequired: boolean;
  /** Coiffure à domicile proposée ; les frais réels sont recalculés par le serveur. */
  homeServiceEnabled: boolean;
  travelFeeCents: number;
}

export function BookingWizard({
  service,
  settings,
}: {
  service: BookableService;
  settings: BookingSettings;
}) {
  const { t, locale, messages, msg } = useI18n();
  const formatCents = (cents: number | null): string =>
    cents == null ? t('booking.priceToConfirm') : formatEuro(locale, cents);
  const formatMinutes = (minutes: number): string =>
    minutes <= 0 ? t('booking.durationToConfirm') : formatDuration(locale, minutes);
  const questions: PublicQuestion[] = service.publicQuestions;
  const [phase, setPhase] = useState<Phase>(questions.length > 0 ? 'questions' : 'options');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [homeService, setHomeService] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [dateISO, setDateISO] = useState('');
  const [timeZone, setTimeZone] = useState('Europe/Berlin');
  const [selectedSlot, setSelectedSlot] = useState<{
    startsAt: string;
    endsAt: string;
    startMinute: number;
  } | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [autoPromo, setAutoPromo] = useState<{
    promotionName: string;
    basePriceCents: number;
    discountCents: number;
    finalPriceCents: number;
  } | null>(null);
  const [promoApplied, setPromoApplied] = useState<PromoCodeState['applied'] | null>(null);
  const [clientError, setClientError] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const slotFormRef = useRef<HTMLFormElement>(null);

  const [previewState, previewAction, previewPending] = useActionState<
    CompatibilityPreviewState,
    FormData
  >(previewCompatibility, {});
  const [slotState, slotFormAction, slotPending] = useActionState<BookingSlotsState, FormData>(
    loadBookingSlots,
    {},
  );
  const [bookingState, bookingAction, bookingPending] = useActionState<BookingState, FormData>(
    submitBooking,
    {},
  );

  const [promoState, promoAction, promoPending] = useActionState<PromoCodeState, FormData>(
    applyPromoCode,
    {},
  );

  useEffect(() => {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    setDateISO(localDateISO(now));
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin');
    } catch {
      setTimeZone('Europe/Berlin');
    }
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!previewState.preview || phase !== 'questions') return;
    if (previewState.preview.nextStep === 'BOOK') {
      setVerificationMessage(previewState.preview.message);
      setPhase('options');
    } else {
      setPhase('blocked');
    }
  }, [previewState.preview, phase]);

  useEffect(() => {
    if (promoState.applied) setPromoApplied(promoState.applied);
  }, [promoState]);

  // Offre automatique : aperçu du prix réellement figé à l'enregistrement.
  const optionKey = optionIds.join(',');
  useEffect(() => {
    if (phase !== 'summary') return;
    let cancelled = false;
    loadAutomaticPromotion(service.slug, optionKey ? optionKey.split(',') : [])
      .then((preview) => {
        if (!cancelled) setAutoPromo(preview);
      })
      .catch(() => {
        if (!cancelled) setAutoPromo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, service.slug, optionKey]);

  useEffect(() => {
    if (bookingState.success) setPhase('done');
  }, [bookingState.success]);

  useEffect(() => {
    if (phase !== 'slot' || !dateISO || !timeZone) return;
    const timer = window.setTimeout(() => slotFormRef.current?.requestSubmit(), 100);
    return () => window.clearTimeout(timer);
  }, [phase, dateISO, timeZone, optionIds]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [dateISO, optionIds]);

  const visibleQuestions = questions.filter((question) =>
    isQuestionVisible(question.condition, answers),
  );
  const selectedOptions = service.options.filter((option) => optionIds.includes(option.id));
  const durationMinutes =
    (service.durationMinutes ?? 0) +
    selectedOptions.reduce((sum, option) => sum + option.durationMinutes, 0);
  const priceCents = service.priceOnRequest
    ? null
    : (service.priceFromCents ?? 0) +
      selectedOptions.reduce((sum, option) => sum + option.priceCents, 0);

  const travelFeeCents =
    settings.homeServiceEnabled && homeService ? settings.travelFeeCents : null;
  // Prix de la prestation affiché (promotion éventuelle comprise) : les frais s'ajoutent après.
  const servicePriceShown =
    promoApplied && promoApplied.discountCents > 0
      ? promoApplied.finalPriceCents
      : autoPromo
        ? autoPromo.finalPriceCents
        : priceCents;
  const totalCents = addTravelFee(servicePriceShown, travelFeeCents);
  const homeAddressValid = !homeService || homeAddress.trim().length >= HOME_ADDRESS_MIN;

  const stepNumber =
    phase === 'questions'
      ? 2
      : phase === 'blocked'
        ? 3
        : phase === 'options'
          ? 4
          : phase === 'slot'
            ? 5
            : phase === 'contact'
              ? 6
              : phase === 'summary'
                ? 7
                : 8;

  const toggleOption = (optionId: string) => {
    // Le prix remisé dépend des options : le code doit être revalidé.
    setPromoApplied(null);
    setOptionIds((previous) =>
      previous.includes(optionId)
        ? previous.filter((id) => id !== optionId)
        : [...previous, optionId],
    );
  };

  const submitQuestions = (event: React.FormEvent<HTMLFormElement>) => {
    const missing = visibleQuestions.filter(
      (question) =>
        question.required && question.type !== 'PHOTO' && !isQuestionAnswered(question, answers),
    );
    if (missing.length > 0) {
      event.preventDefault();
      setClientError(
        t('booking.questions.missing', {
          list: missing.map((question) => question.label).join(', '),
        }),
      );
    }
  };

  const formattedSlot = selectedSlot
    ? new Intl.DateTimeFormat(INTL_LOCALE[locale], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(selectedSlot.startsAt))
    : '';
  const maxDateISO = localDateISO(new Date(Date.now() + settings.maxAdvanceDays * 24 * 3_600_000));

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2 text-xs sm:text-sm" aria-label={t('booking.stepsAria')}>
        {messages.booking.steps.map((label, index) => {
          const number = index + 1;
          return (
            <li
              key={label}
              aria-current={stepNumber === number ? 'step' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1.5 ${
                stepNumber === number
                  ? 'bg-ink font-semibold text-panel-fg'
                  : stepNumber > number
                    ? 'bg-success-soft text-success'
                    : 'bg-line text-muted'
              }`}
            >
              <span aria-hidden="true" className="font-bold">
                {stepNumber > number ? <Check aria-hidden="true" className="size-4" /> : number}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      {phase === 'questions' ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {t('booking.questions.title')}
          </Title>
          <form
            action={previewAction}
            onSubmit={submitQuestions}
            className="mt-5 flex flex-col gap-5"
          >
            <input type="hidden" name="serviceSlug" value={service.slug} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            {visibleQuestions.map((question) => (
              <QuestionField
                key={question.key}
                question={question}
                value={answers[question.key]}
                onChange={(value) =>
                  setAnswers((previous) => ({ ...previous, [question.key]: value }))
                }
              />
            ))}
            {clientError ? (
              <p
                role="alert"
                className="rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
              >
                {clientError}
              </p>
            ) : null}
            {previewState.error ? (
              <p
                role="alert"
                className="rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
              >
                {previewState.error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" icon={ShieldCheck} loading={previewPending}>
                {t('booking.questions.submit')}
              </Button>
              <ButtonLink href={`/coiffures/${service.slug}`} variant="ghost" icon={ArrowLeft}>
                {t('booking.questions.backToService')}
              </ButtonLink>
            </div>
          </form>
        </Card>
      ) : null}

      {phase === 'blocked' && previewState.preview ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={previewState.preview.verdict === 'INCOMPATIBLE' ? 'alert' : 'accent'}>
              {previewState.preview.verdict === 'INCOMPATIBLE'
                ? t('booking.blocked.incompatible')
                : t('booking.blocked.toCheck')}
            </Badge>
            <Title
              as="h2"
              ref={headingRef}
              tabIndex={-1}

              className="outline-none"
            >
              {t('booking.blocked.title')}
            </Title>
          </div>
          <p className="mt-4 whitespace-pre-line text-lg text-fg">
            {msg(previewState.preview.message)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink
              href={`/compatibilite?service=${encodeURIComponent(service.slug)}`}
              icon={ClipboardList}
            >
              {t('booking.blocked.askAssessment')}
            </ButtonLink>
            <Button
              type="button"
              variant="ghost"
              icon={Pencil}
              onClick={() => {
                setPhase('questions');
                setClientError('');
              }}
            >
              {t('booking.blocked.editAnswers')}
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted">{t('booking.blocked.noSlot')}</p>
        </Card>
      ) : null}

      {phase === 'options' ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {t('booking.options.title')}
          </Title>
          {verificationMessage ? (
            <p className="mt-2 rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-sm text-success">
              {msg(verificationMessage)}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-3">
            {service.options.length === 0 ? (
              <p className="text-muted">{t('booking.options.none')}</p>
            ) : (
              service.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-md)] border p-4 transition ${
                    optionIds.includes(option.id)
                      ? 'border-cacao bg-accent-soft'
                      : 'border-line hover:border-cacao'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={optionIds.includes(option.id)}
                      onChange={() => toggleOption(option.id)}
                      className="size-4"
                    />
                    <span>
                      <span className="block font-semibold text-fg">{option.name}</span>
                      {option.durationMinutes > 0 ? (
                        <span className="text-sm text-muted">
                          +{formatMinutes(option.durationMinutes)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="whitespace-nowrap font-semibold text-cacao">
                    +{formatCents(option.priceCents)}
                  </span>
                </label>
              ))
            )}
          </div>
          {settings.homeServiceEnabled ? (
            <div className="mt-5 flex flex-col gap-3">
              <label
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-md)] border p-4 transition ${
                  homeService ? 'border-cacao bg-accent-soft' : 'border-line hover:border-cacao'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={homeService}
                    onChange={(event) => {
                      setHomeService(event.target.checked);
                      setClientError('');
                    }}
                    className="size-4"
                  />
                  <span>
                    <span className="flex items-center gap-2 font-semibold text-fg">
                      <House aria-hidden="true" className="size-4 text-accent" />
                      {t('booking.options.homeTitle')}
                    </span>
                    <span className="text-sm text-muted">
                      {t('booking.options.homeDescription')}
                    </span>
                  </span>
                </span>
                <span className="whitespace-nowrap font-semibold text-cacao">
                  {t('booking.options.travelFrom', {
                    amount: formatEuro(locale, settings.travelFeeCents),
                  })}
                </span>
              </label>
              {homeService ? (
                <Textarea
                  label={t('booking.options.addressLabel')}
                  icon={MapPin}
                  value={homeAddress}
                  onChange={(event) => setHomeAddress(event.target.value)}
                  rows={2}
                  maxLength={HOME_ADDRESS_MAX}
                  required
                  autoComplete="street-address"
                  hint={t('booking.options.addressHint')}
                />
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 rounded-[var(--radius-md)] bg-line px-4 py-3 text-sm text-fg">
            {t('booking.options.estimatedDuration')} :{' '}
            <strong>{formatMinutes(durationMinutes)}</strong> · {t('booking.options.price')} :{' '}
            <strong>{formatCents(priceCents)}</strong>
            {travelFeeCents != null ? (
              <>
                {' '}
                {t('booking.options.travelPlus')} <strong>{formatCents(travelFeeCents)}</strong> ·{' '}
                {t('booking.options.total')} :{' '}
                <strong>{formatCents(addTravelFee(priceCents, travelFeeCents))}</strong>
              </>
            ) : null}
          </div>
          {clientError && phase === 'options' ? (
            <p
              role="alert"
              className="mt-3 rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
            >
              {clientError}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              icon={CalendarClock}
              onClick={() => {
                if (!homeAddressValid) {
                  setClientError(t('booking.options.addressRequired'));
                  return;
                }
                setClientError('');
                setPhase('slot');
              }}
            >
              {t('booking.options.chooseSlot')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              icon={ArrowLeft}
              onClick={() => setPhase('questions')}
            >
              {t('booking.options.back')}
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'slot' ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {t('booking.slot.title')}
          </Title>
          <div className="mt-4 max-w-xs">
            <Input
              label={t('booking.slot.dateLabel')}
              type="date"
              value={dateISO}
              min={localDateISO(new Date())}
              max={maxDateISO}
              onChange={(event) => {
                setDateISO(event.target.value);
                setSelectedSlot(null);
              }}
            />
          </div>

          <form ref={slotFormRef} action={slotFormAction} className="hidden">
            <input type="hidden" name="serviceSlug" value={service.slug} />
            <input type="hidden" name="dateISO" value={dateISO} />
            <input type="hidden" name="timeZone" value={timeZone} />
            <input type="hidden" name="optionIds" value={JSON.stringify(optionIds)} />
          </form>

          <div className="mt-5" aria-live="polite">
            {slotPending ? (
              <p className="text-muted">{t('booking.slot.searching')}</p>
            ) : slotState.error ? (
              <p
                role="alert"
                className="rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm text-alert"
              >
                {msg(slotState.error)}
              </p>
            ) : !slotState.slots || slotState.slots.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-dashed border-line p-6 text-center text-muted">
                <p className="font-semibold text-fg">{t('booking.slot.noneTitle')}</p>
                <p className="mt-1 text-sm">{t('booking.slot.noneHint')}</p>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm text-muted">
                  {t('booking.slot.available', { count: slotState.slots.length })}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {slotState.slots.map((slot) => (
                    <Button
                      key={slot.startsAt}
                      type="button"
                      size="sm"
                      variant={selectedSlot?.startsAt === slot.startsAt ? 'primary' : 'secondary'}
                      aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                      onClick={() =>
                        setSelectedSlot({
                          startsAt: slot.startsAt,
                          endsAt: slot.endsAt,
                          startMinute: slot.startMinute,
                        })
                      }
                      className="w-full"
                    >
                      {timeLabel(slot.startMinute)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              icon={ArrowRight}
              disabled={!selectedSlot}
              onClick={() => setPhase('contact')}
            >
              {t('booking.slot.next')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              icon={ArrowLeft}
              onClick={() => setPhase('options')}
            >
              {t('booking.options.back')}
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'contact' ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {t('booking.contact.title')}
          </Title>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input
              label={t('booking.contact.name')}
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label={t('booking.contact.email')}
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label={t('booking.contact.phone')}
              type="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              required
              autoComplete="tel"
            />
          </div>
          <div className="mt-4">
            <Textarea
              label={t('booking.contact.comment')}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
            />
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              {t('booking.contact.consentBefore')}{' '}
              <Link
                href="/confidentialite"
                className="font-semibold text-cacao underline underline-offset-4"
              >
                {t('booking.contact.privacyLink')}
              </Link>
              .
            </span>
          </label>
          {clientError ? (
            <p
              role="alert"
              className="mt-3 rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
            >
              {clientError}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              icon={UserRound}
              onClick={() => {
                if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
                  setClientError(t('booking.contact.missingFields'));
                  return;
                }
                if (!consent) {
                  setClientError(t('booking.contact.consentRequired'));
                  return;
                }
                setClientError('');
                setPhase('summary');
              }}
            >
              {t('booking.contact.toSummary')}
            </Button>
            <Button type="button" variant="ghost" icon={ArrowLeft} onClick={() => setPhase('slot')}>
              {t('booking.options.back')}
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'summary' ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {t('booking.summary.title')}
          </Title>
          <dl className="mt-4 divide-y divide-line">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{t('booking.summary.service')}</dt>
              <dd className="text-right font-semibold text-fg">{service.name}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{t('booking.summary.dateTime')}</dt>
              <dd className="text-right font-semibold text-fg">{formattedSlot}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{t('booking.summary.duration')}</dt>
              <dd className="text-right font-semibold text-fg">{formatMinutes(durationMinutes)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{t('booking.summary.options')}</dt>
              <dd className="text-right font-semibold text-fg">
                {selectedOptions.length > 0
                  ? selectedOptions.map((option) => option.name).join(', ')
                  : t('booking.summary.noOptions')}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{t('booking.summary.price')}</dt>
              <dd className="text-right font-semibold text-fg">
                {promoApplied && promoApplied.discountCents > 0 ? (
                  <>
                    <s className="font-normal text-muted">
                      {formatCents(promoApplied.basePriceCents)}
                    </s>{' '}
                    {formatCents(promoApplied.finalPriceCents)}
                  </>
                ) : autoPromo ? (
                  <>
                    <s className="font-normal text-muted">
                      {formatCents(autoPromo.basePriceCents)}
                    </s>{' '}
                    {formatCents(autoPromo.finalPriceCents)}
                    <span className="block text-xs font-normal text-success">
                      {t('booking.summary.currentOffer', { name: autoPromo.promotionName })}
                    </span>
                  </>
                ) : (
                  formatCents(priceCents)
                )}
              </dd>
            </div>
            {travelFeeCents != null ? (
              <>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{t('booking.summary.place')}</dt>
                  <dd className="text-right font-semibold text-fg">
                    {t('booking.summary.atHome')}
                    <span className="block whitespace-pre-line font-normal text-muted">
                      {homeAddress.trim()}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{t('booking.summary.travelFee')}</dt>
                  <dd className="text-right font-semibold text-fg">
                    {formatCents(travelFeeCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{t('booking.summary.total')}</dt>
                  <dd className="text-right font-semibold text-fg">{formatCents(totalCents)}</dd>
                </div>
              </>
            ) : null}
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{t('booking.summary.contact')}</dt>
              <dd className="text-right font-semibold text-fg">
                {contactName}
                <span className="block font-normal text-muted">{contactEmail}</span>
                <span className="block font-normal text-muted">{contactPhone}</span>
              </dd>
            </div>
          </dl>

          {priceCents != null ? (
            <div className="mt-4">
              {promoApplied ? (
                <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-sm text-success">
                  <p>
                    <Ticket aria-hidden="true" className="mr-1.5 inline size-4 align-text-bottom" />
                    {promoApplied.codeApplied ? (
                      <>
                        {t('booking.summary.promoApplied', {
                          code: promoApplied.code,
                          name: promoApplied.promotionName,
                        })}
                        {promoApplied.discountCents > 0
                          ? ` (-${formatCents(promoApplied.discountCents)})`
                          : ''}
                      </>
                    ) : (
                      <>{t('booking.summary.promoBetter', { name: promoApplied.promotionName })}</>
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={X}
                    iconOnly
                    onClick={() => {
                      setPromoApplied(null);
                      setPromoInput('');
                    }}
                  >
                    {t('booking.summary.promoRemove')}
                  </Button>
                </div>
              ) : (
                <form action={promoAction} className="flex items-end gap-2">
                  <input type="hidden" name="serviceSlug" value={service.slug} />
                  <input type="hidden" name="optionIds" value={JSON.stringify(optionIds)} />
                  <div className="min-w-0 flex-1">
                    <Input
                      label={t('booking.summary.promoLabel')}
                      name="code"
                      icon={Ticket}
                      value={promoInput}
                      onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                      maxLength={40}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder={t('booking.summary.promoPlaceholder')}
                      error={promoState.error ? msg(promoState.error) : undefined}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    icon={Check}
                    loading={promoPending}
                    disabled={!promoInput.trim()}
                  >
                    {t('booking.summary.promoApply')}
                  </Button>
                </form>
              )}
            </div>
          ) : null}

          <div className="mt-4 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-sm text-fg">
            <p className="font-semibold">{t('booking.summary.paymentTitle')}</p>
            <p className="mt-1">{t('booking.summary.paymentText')}</p>
            <p className="mt-1">
              {t('booking.summary.cancelNotice', {
                delay: formatNoticeDelayLocalized(t, settings.minCancelNoticeMinutes),
              })}
            </p>
          </div>

          <form action={bookingAction} className="mt-5">
            <input type="hidden" name="serviceSlug" value={service.slug} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            <input type="hidden" name="optionIds" value={JSON.stringify(optionIds)} />
            <input type="hidden" name="dateISO" value={dateISO} />
            <input type="hidden" name="startsAt" value={selectedSlot?.startsAt ?? ''} />
            <input type="hidden" name="timeZone" value={timeZone} />
            <input type="hidden" name="name" value={contactName} />
            <input type="hidden" name="email" value={contactEmail} />
            <input type="hidden" name="phone" value={contactPhone} />
            <input type="hidden" name="comment" value={comment} />
            <input type="hidden" name="consent" value={consent ? 'on' : ''} />
            <input type="hidden" name="promoCode" value={promoApplied?.code ?? ''} />
            <input type="hidden" name="homeService" value={homeService ? 'on' : ''} />
            <input type="hidden" name="homeAddress" value={homeService ? homeAddress.trim() : ''} />
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="booking-website">{t('booking.summary.honeypotLabel')}</label>
              <input id="booking-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {bookingState.error ? (
              <p
                role="alert"
                className="mb-4 rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
              >
                {msg(bookingState.error)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" icon={CalendarCheck} loading={bookingPending}>
                {t('booking.summary.confirm')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => setPhase('contact')}
              >
                {t('booking.options.back')}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {phase === 'done' && bookingState.success ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {bookingState.success.status === 'CONFIRMED'
              ? t('booking.done.confirmedTitle')
              : t('booking.done.pendingTitle')}
          </Title>
          <p className="mt-3 text-lg text-fg">
            {bookingState.success.status === 'CONFIRMED'
              ? t('booking.done.confirmedText')
              : t('booking.done.pendingText')}
          </p>
          <dl className="mt-4 space-y-2 rounded-[var(--radius-md)] bg-line px-4 py-3 text-sm text-fg">
            <div className="flex justify-between gap-4">
              <dt>{t('booking.done.reference')}</dt>
              <dd className="font-semibold">{bookingState.success.reference}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t('booking.done.service')}</dt>
              <dd className="font-semibold">{bookingState.success.serviceName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t('booking.done.dateTime')}</dt>
              <dd className="font-semibold">
                {new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                  dateStyle: 'full',
                  timeStyle: 'short',
                }).format(new Date(bookingState.success.startsAt))}
              </dd>
            </div>
            {bookingState.success.homeService ? (
              <div className="flex justify-between gap-4">
                <dt>{t('booking.done.homeTravel')}</dt>
                <dd className="font-semibold">
                  {formatCents(bookingState.success.travelFeeCents ?? 0)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt>
                {bookingState.success.homeService
                  ? t('booking.done.total')
                  : t('booking.done.price')}
              </dt>
              <dd className="font-semibold">{formatCents(bookingState.success.priceCents)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">{t('booking.done.paymentShort')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={bookingState.success.cancelUrl} variant="secondary" icon={Pencil}>
              {t('booking.done.manage')}
            </ButtonLink>
            <ButtonLink href="/coiffures" icon={Scissors}>
              {t('booking.done.backToCatalogue')}
            </ButtonLink>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

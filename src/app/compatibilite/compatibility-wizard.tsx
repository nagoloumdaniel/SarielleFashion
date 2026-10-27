'use client';

import {
  ArrowLeft,
  Check,
  Mail,
  Pencil,
  Scissors,
  Send,
  CalendarCheck,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import { Link } from '@/i18n/link';
import { useI18n } from '@/i18n/client';
import { useActionState, useEffect, useRef, useState } from 'react';
import type { CompatibilityRuleData } from '@/modules/compatibilite/engine';
import {
  isQuestionAnswered,
  isQuestionVisible,
  type PublicQuestion,
} from '@/modules/compatibilite/questions';
import {
  previewCompatibility,
  submitAssessment,
  type CompatibilityPreviewState,
  type CompatibilitySubmitState,
} from '@/modules/compatibilite/actions';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Title } from '@/components/ui/Title';

/* ============================================================
 * P5.3 / P5.4 : parcours public conditionnel de compatibilité.
 * Le verdict affiché vient toujours du serveur ; le client ne fait
 * qu'afficher et collecter les réponses.
 * ============================================================ */

type Phase = 'questions' | 'result' | 'contact' | 'done';

function verdictTone(verdict: string): 'success' | 'alert' | 'accent' {
  if (verdict === 'COMPATIBLE') return 'success';
  if (verdict === 'INCOMPATIBLE') return 'alert';
  return 'accent';
}

type Verdict = 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNCERTAIN';

export function QuestionField({
  question,
  value,
  onChange,
}: {
  question: PublicQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { t, msg } = useI18n();
  const inputId = `question-${question.key}`;
  const label = msg(question.label);
  const helpText = question.help ? msg(question.help) : null;
  const describedBy = question.help ? `${inputId}-help` : undefined;

  const help = question.help ? (
    <p id={`${inputId}-help`} className="text-sm text-muted">
      {helpText}
    </p>
  ) : null;

  if (question.type === 'PHOTO') {
    return (
      <fieldset className="rounded-[var(--radius-md)] border border-line p-4">
        <legend className="px-2 text-sm font-semibold text-fg">{label}</legend>
        <p className="text-sm text-muted">{t('compat.photoLater')}</p>
      </fieldset>
    );
  }

  if (question.type === 'TEXT') {
    return (
      <Textarea
        label={label}
        name={inputId}
        id={inputId}
        required={question.required}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        rows={3}
      />
    );
  }

  if (question.type === 'MULTI_CHOICE' && question.options.length > 0) {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <fieldset className="rounded-[var(--radius-md)] border border-line p-4">
        <legend className="px-2 text-sm font-semibold text-fg">
          {label}
          {question.required ? <span className="text-alert"> *</span> : null}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`${inputId}-${option.value}`}
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);
                  onChange(next);
                }}
                className="size-4"
              />
              {msg(option.label)}
            </label>
          ))}
        </div>
        {help}
      </fieldset>
    );
  }

  if (question.options.length > 0) {
    return (
      <fieldset className="rounded-[var(--radius-md)] border border-line p-4">
        <legend className="px-2 text-sm font-semibold text-fg">
          {label}
          {question.required ? <span className="text-alert"> *</span> : null}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition ${
                value === option.value
                  ? 'border-cacao bg-accent-soft font-semibold text-fg'
                  : 'border-line hover:border-cacao'
              }`}
            >
              <input
                type="radio"
                name={inputId}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                required={question.required}
                aria-describedby={describedBy}
                className="size-4"
              />
              {msg(option.label)}
            </label>
          ))}
        </div>
        {help}
      </fieldset>
    );
  }

  return (
    <Input
      label={label}
      name={inputId}
      id={inputId}
      required={question.required}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      aria-describedby={describedBy}
    />
  );
}

export function CompatibilityWizard({
  serviceSlug,
  rule,
  questions,
}: {
  serviceSlug: string;
  rule: CompatibilityRuleData | null;
  questions: PublicQuestion[];
}) {
  const { t, msg } = useI18n();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [phase, setPhase] = useState<Phase>('questions');
  const [clientError, setClientError] = useState('');
  const [previewState, previewAction, previewPending] = useActionState<
    CompatibilityPreviewState,
    FormData
  >(previewCompatibility, {});
  const [submitState, submitAction, submitPending] = useActionState<
    CompatibilitySubmitState,
    FormData
  >(submitAssessment, {});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const visibleQuestions = questions.filter((question) =>
    isQuestionVisible(question.condition, answers),
  );

  useEffect(() => {
    if (previewState.preview && phase === 'questions') setPhase('result');
  }, [previewState.preview, phase]);

  useEffect(() => {
    if (submitState.success) setPhase('done');
  }, [submitState.success]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  const preview = previewState.preview;
  const success = submitState.success;
  const photoForbidden = rule?.photoPolicy === 'FORBIDDEN';
  const photoRequired = preview?.photoRequired ?? rule?.photoPolicy === 'REQUIRED';

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((previous) => ({ ...previous, [key]: value }));
    setClientError('');
  };

  const handleQuestionsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const missing = visibleQuestions.filter(
      (question) =>
        question.required && question.type !== 'PHOTO' && !isQuestionAnswered(question, answers),
    );
    if (missing.length > 0) {
      event.preventDefault();
      setClientError(
        t('compat.wizard.completeQuestions', {
          list: missing.map((question) => msg(question.label)).join(', '),
        }),
      );
    }
  };

  const step = phase === 'questions' ? 1 : phase === 'done' ? 3 : phase === 'contact' ? 3 : 2;

  return (
    <div className="space-y-5">
      <ol
        className="flex flex-wrap items-center gap-2 text-sm"
        aria-label={t('compat.wizard.stepsAria')}
      >
        {[
          { number: 1, label: t('compat.wizard.steps.hair') },
          { number: 2, label: t('compat.wizard.steps.result') },
          { number: 3, label: t('compat.wizard.steps.request') },
        ].map((item) => (
          <li
            key={item.number}
            aria-current={step === item.number ? 'step' : undefined}
            className={`inline-flex items-center gap-2 rounded-[var(--radius-full)] px-3 py-1.5 ${
              step === item.number
                ? 'bg-ink font-semibold text-panel-fg'
                : step > item.number
                  ? 'bg-success-soft text-success'
                  : 'bg-line text-muted'
            }`}
          >
            <span aria-hidden="true" className="font-bold">
              {step > item.number ? <Check aria-hidden="true" className="size-4" /> : item.number}
            </span>
            {item.label}
          </li>
        ))}
      </ol>

      {phase === 'questions' ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {t('compat.wizard.questionsTitle')}
          </Title>

          <form
            action={previewAction}
            onSubmit={handleQuestionsSubmit}
            className="mt-6 flex flex-col gap-5"
          >
            <input type="hidden" name="serviceSlug" value={serviceSlug} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />

            {visibleQuestions.length === 0 ? (
              <p className="rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-sm text-success">
                {t('compat.wizard.noRestriction')}
              </p>
            ) : (
              visibleQuestions.map((question) => (
                <QuestionField
                  key={question.key}
                  question={question}
                  value={answers[question.key]}
                  onChange={(value) => setAnswer(question.key, value)}
                />
              ))
            )}

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
                {msg(previewState.error)}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" icon={ShieldCheck} loading={previewPending}>
                {t('compat.wizard.verify')}
              </Button>
              <ButtonLink href={`/coiffures/${serviceSlug}`} variant="ghost" icon={ArrowLeft}>
                {t('compat.wizard.backToService')}
              </ButtonLink>
            </div>
          </form>
        </Card>
      ) : null}

      {phase === 'result' && preview ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={verdictTone(preview.verdict)}>
              {t(`compat.wizard.verdict.${preview.verdict as Verdict}`)}
            </Badge>
            <Title
              as="h2"
              ref={headingRef}
              tabIndex={-1}

              className="outline-none"
            >
              {t(`compat.wizard.resultTitle.${preview.verdict as Verdict}`)}
            </Title>
          </div>

          <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-fg">
            {msg(preview.message)}
          </p>
          {preview.conditionsNote ? (
            <p className="mt-3 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-sm text-fg">
              {msg(preview.conditionsNote)}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {preview.nextStep === 'BOOK' ? (
              <ButtonLink
                href={`/reserver?service=${encodeURIComponent(serviceSlug)}`}
                icon={CalendarCheck}
              >
                {t('compat.wizard.bookService')}
              </ButtonLink>
            ) : null}

            {preview.nextStep === 'SUBMIT_ASSESSMENT' ? (
              <Button
                type="button"
                icon={preview.canRequestPhotoEvaluation ? Camera : Send}
                onClick={() => setPhase('contact')}
              >
                {preview.canRequestPhotoEvaluation
                  ? t('compat.wizard.sendPhoto')
                  : t('compat.wizard.askEvaluation')}
              </Button>
            ) : null}

            {preview.nextStep === 'BLOCKED' ? (
              <>
                <ButtonLink href="/coiffures" icon={Scissors}>
                  {t('compat.wizard.otherStyles')}
                </ButtonLink>
                <ButtonLink href="/contact" variant="secondary" icon={Mail}>
                  {t('compat.wizard.contactSarielle')}
                </ButtonLink>
              </>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              icon={Pencil}
              onClick={() => {
                setPhase('questions');
                setClientError('');
              }}
            >
              {t('compat.wizard.editAnswers')}
            </Button>
          </div>

          {preview.verdict === 'INCOMPATIBLE' && preview.suggestions.length > 0 ? (
            <div className="mt-6 rounded-[var(--radius-md)] border border-line bg-page p-5">
              <h3 className="font-heading text-lg font-bold text-fg">
                {t('compat.wizard.suggestionsTitle')}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {preview.suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <ButtonLink
                      href={`/coiffures/${suggestion.slug}`}
                      variant="secondary"
                      size="sm"
                    >
                      {suggestion.name}
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.nextStep !== 'BOOK' ? (
            <p className="mt-4 text-sm text-muted">{t('compat.wizard.noBookingYet')}</p>
          ) : null}
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
            {t('compat.wizard.contactTitle')}
          </Title>

          <form action={submitAction} className="mt-6 flex flex-col gap-5">
            <input type="hidden" name="serviceSlug" value={serviceSlug} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="compat-website">{t('compat.wizard.honeypot')}</label>
              <input
                id="compat-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('compat.wizard.name')}
                name="name"
                placeholder={t('common.ui.placeholders.name')}
                required
                autoComplete="name"
              />
              <Input
                label={t('compat.wizard.email')}
                name="email"
                type="email"
                required
                autoComplete="email"
              />
              <Input
                label={t('compat.wizard.phone')}
                name="phone"
                type="tel"
                required
                autoComplete="tel"
              />
            </div>

            <Textarea label={t('compat.wizard.comment')} name="comment" rows={4} />

            {!photoForbidden ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="compat-photos" className="text-sm font-semibold text-fg">
                  {t('compat.wizard.photosLabel')}{' '}
                  {photoRequired
                    ? t('compat.wizard.photosRequired')
                    : t('compat.wizard.photosOptional')}
                </label>
                <input
                  id="compat-photos"
                  name="photos"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  required={photoRequired}
                  className="w-full rounded-[var(--radius-md)] border border-line bg-card px-4 py-2.5 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-fg"
                />
                <p className="text-sm text-muted">{t('compat.wizard.photosHint')}</p>
              </div>
            ) : (
              <p className="rounded-[var(--radius-md)] bg-line px-4 py-3 text-sm text-muted">
                {t('compat.wizard.noPhotoNeeded')}
              </p>
            )}

            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="consent" required className="mt-0.5 size-4" />
              <span>
                {t('compat.wizard.consentBefore')}{' '}
                <Link
                  href="/confidentialite"
                  className="font-semibold text-cacao underline underline-offset-4"
                >
                  {t('compat.wizard.privacy')}
                </Link>
                .
              </span>
            </label>

            {submitState.error ? (
              <p
                role="alert"
                className="rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
              >
                {msg(submitState.error)}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" icon={Send} loading={submitPending}>
                {t('compat.wizard.send')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => setPhase('result')}
              >
                {t('compat.wizard.back')}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {phase === 'done' && success ? (
        <Card>
          <Title
            as="h2"
            ref={headingRef}
            tabIndex={-1}

            className="outline-none"
          >
            {success.status === 'COMPATIBLE'
              ? t('compat.wizard.doneCompatible')
              : t('compat.wizard.doneReceived')}
          </Title>
          <p className="mt-3 whitespace-pre-line text-lg text-fg">{msg(success.message)}</p>

          {success.status === 'RECEIVED' ? (
            <div className="mt-4 space-y-2 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3 text-sm text-fg">
              <p>
                {t('compat.wizard.statusLabel')} <strong>{t('compat.wizard.statusValue')}</strong>.
              </p>
              {success.reference ? (
                <p>
                  {t('compat.wizard.referenceLabel')} <strong>{success.reference}</strong>
                </p>
              ) : null}
              <p>{t('compat.wizard.noSlot')}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {success.canBook ? (
              <ButtonLink
                href={`/reserver?service=${encodeURIComponent(serviceSlug)}`}
                icon={CalendarCheck}
              >
                {t('compat.wizard.bookService')}
              </ButtonLink>
            ) : null}
            <ButtonLink href="/coiffures" variant="secondary" icon={Scissors}>
              {t('compat.wizard.backToCatalogue')}
            </ButtonLink>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

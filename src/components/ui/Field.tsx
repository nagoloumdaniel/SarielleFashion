'use client';

import type { ReactNode } from 'react';
import { useT } from '@/i18n/client';

/* Habillage commun des champs : libellé, astérisque, aide, erreur. */
export function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-fg">
        {label}{' '}
        {required ? (
          <span aria-hidden="true" className="text-alert">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only">{t('common.ui.required')}</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const fieldBox = (error?: string) =>
  `h-10 w-full rounded-[var(--radius-md)] border bg-card px-3.5 text-sm text-fg transition ${
    error ? 'border-alert' : 'border-line focus:border-cacao'
  }`;

type Translate = ReturnType<typeof useT>;

/* Placeholder par défaut quand aucun n'est fourni : selon type/nom, sinon dérivé du libellé. */
export function autoPlaceholder(t: Translate, label: string, type?: string, name?: string): string {
  const n = name ?? '';
  if (type === 'email' || /mail/i.test(n)) return t('common.ui.placeholders.email');
  if (type === 'tel' || /phone|tel/i.test(n)) return t('common.ui.placeholders.phone');
  if (type === 'password') return t('common.ui.placeholders.password');
  if (type === 'search') return t('common.ui.placeholders.search');
  if (type === 'url') return t('common.ui.placeholders.url');
  if (type === 'number')
    return /price|prix|amount|value|montant/i.test(n)
      ? t('common.ui.placeholders.price')
      : t('common.ui.placeholders.number');
  if (/^(fullname|customerName|requesterName)$/i.test(n)) return t('common.ui.placeholders.name');
  if (/subject|objet/i.test(n)) return t('common.ui.placeholders.subject');
  const clean = label
    .replace(/\s*\((facultatif|obligatoire|optional|freiwillig|Pflichtfeld)\)\s*/gi, ' ')
    .replace(/\s*[*:]\s*$/, '')
    .trim();
  return clean
    ? t('common.ui.placeholders.enter', {
        label: `${clean.charAt(0).toLowerCase()}${clean.slice(1)}`,
      })
    : t('common.ui.placeholders.enterEmpty');
}

'use client';

import { MessageSquareText, type LucideIcon } from 'lucide-react';
import { useCallback, useId, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { useT } from '@/i18n/client';
import { autoPlaceholder } from './Field';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** Saisie compacte (messagerie) : libellé masqué visuellement (sr-only), 1 ligne qui grandit.
   *  `error` ne fait alors que styler le champ : le message est affiché par l'appelant
   *  (relié via `aria-describedby`). */
  compact?: boolean;
  /** Icône du champ (défaut : bulle de message). */
  icon?: LucideIcon;
  /** Hauteur max (px) de la variante compacte avant défilement interne. */
  maxHeight?: number;
};

export function Textarea({
  label,
  error,
  hint,
  id,
  required,
  compact = false,
  icon: Icon = MessageSquareText,
  maxHeight = 160,
  onChange,
  ...rest
}: TextareaProps) {
  const t = useT();
  const autoId = useId();
  const inputId = id ?? `textarea-${autoId}`;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const describedBy = [
    rest['aria-describedby'],
    !compact && error ? `${inputId}-error` : null,
    !compact && hint ? `${inputId}-hint` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const grow = useCallback(() => {
    const el = areaRef.current;
    if (!el || !compact) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [compact, maxHeight]);

  // Recalcule aussi quand la valeur est modifiée de l'extérieur (ex. vidée après envoi).
  useLayoutEffect(() => {
    grow();
  }, [grow, rest.value]);

  const showStar = required && !compact;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={compact ? 'sr-only' : 'text-sm font-semibold text-fg'}>
        {label}{' '}
        {showStar ? (
          <span aria-hidden="true" className="text-alert">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only">{t('common.ui.required')}</span> : null}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className={`pointer-events-none absolute left-3.5 size-4 text-cacao ${
            compact ? 'top-3' : 'top-3.5'
          }`}
        />
        <textarea
          {...rest}
          ref={areaRef}
          placeholder={rest.placeholder ?? autoPlaceholder(t, label, undefined, rest.name)}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          rows={rest.rows ?? (compact ? 1 : 4)}
          onChange={(event) => {
            onChange?.(event);
            grow();
          }}
          className={`w-full rounded-[var(--radius-md)] border bg-card pl-10 pr-3.5 text-sm text-fg placeholder:text-muted transition ${
            compact ? 'min-h-10 resize-none py-2.5' : 'py-2.5'
          } ${error ? 'border-alert' : 'border-line focus:border-cacao'}`}
          style={compact ? { maxHeight, ...rest.style } : rest.style}
        />
      </div>
      {!compact && hint && !error ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {!compact && error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

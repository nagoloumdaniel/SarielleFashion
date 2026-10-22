'use client';

import { Star } from 'lucide-react';
import { useId, useState } from 'react';
import { useI18n } from '@/i18n/client';

/* Note de 1 à 5 : vrais boutons radio (flèches du clavier, lecteurs d'écran), étoiles visuelles.
   Aperçu au survol, libellé de la note choisie. */
export function StarRatingInput({
  name = 'rating',
  label,
  error,
  required = true,
}: {
  name?: string;
  label?: string;
  error?: string;
  required?: boolean;
}) {
  const { t, messages } = useI18n();
  const LABELS = messages.common.ui.rating.labels;
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const groupId = useId();
  const shown = hover || value;

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold text-fg">
        {label ?? t('common.ui.rating.label')}{' '}
        {required ? (
          <span aria-hidden="true" className="text-alert">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only">{t('common.ui.required')}</span> : null}
      </legend>
      <div className="flex items-center gap-3">
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="relative flex size-10 cursor-pointer items-center justify-center rounded-[var(--radius-md)] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent hover:bg-accent-soft"
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => setValue(n)}
                required={required}
                aria-describedby={error ? `${groupId}-error` : undefined}
                className="peer sr-only"
              />
              <Star
                aria-hidden="true"
                className={`size-7 transition-colors motion-reduce:transition-none ${
                  n <= shown ? 'fill-current text-accent' : 'text-muted/40'
                }`}
              />
              <span className="sr-only">
                {t('common.ui.rating.of', { n, label: LABELS[n - 1] ?? '' })}
              </span>
            </label>
          ))}
        </div>
        <span aria-hidden="true" className="min-w-20 text-sm font-medium text-muted">
          {shown > 0 ? LABELS[shown - 1] : ''}
        </span>
      </div>
      {error ? (
        <p id={`${groupId}-error`} role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

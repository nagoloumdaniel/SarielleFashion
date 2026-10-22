'use client';

import { Star } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { formatAverage, formatReviewCount } from '@/modules/avis/engine';

/* Étoiles en lecture seule (pleines = accent). Une seule étiquette accessible pour l'ensemble. */
export function Stars({
  value,
  size = 'md',
  className = '',
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { t, locale } = useI18n();
  const dimension = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-3.5' : 'size-4';
  const rounded = Math.round(value);
  return (
    <span
      role="img"
      aria-label={t('common.ui.stars.label', { value: formatAverage(value, locale) })}
      className={`inline-flex gap-0.5 ${className}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${dimension} ${n <= rounded ? 'fill-current text-accent' : 'text-muted/40'}`}
        />
      ))}
    </span>
  );
}

/* « ★ 4,8 · 12 avis » : ligne compacte pour les cartes et les fiches. */
export function RatingLine({
  average,
  count,
  className = '',
}: {
  average: number;
  count: number;
  className?: string;
}) {
  const { t, locale } = useI18n();
  if (count <= 0) return null;
  return (
    <p className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <Star aria-hidden="true" className="size-4 fill-current" />
      <span className="font-bold">{formatAverage(average, locale)}</span>
      <span aria-hidden="true">·</span>
      <span>{formatReviewCount(count, locale)}</span>
      <span className="sr-only">{t('common.ui.stars.averageSr')}</span>
    </p>
  );
}

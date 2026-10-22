import { Star } from 'lucide-react';
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
  const dimension = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-3.5' : 'size-4';
  const rounded = Math.round(value);
  return (
    <span
      role="img"
      aria-label={`Note : ${formatAverage(value)} sur 5`}
      className={`inline-flex gap-0.5 ${className}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${dimension} ${n <= rounded ? 'fill-current text-accent' : 'text-line'}`}
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
  if (count <= 0) return null;
  return (
    <p className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <Star aria-hidden="true" className="size-4 fill-current" />
      <span className="font-bold">{formatAverage(average)}</span>
      <span aria-hidden="true">·</span>
      <span>{formatReviewCount(count)}</span>
      <span className="sr-only">, note moyenne sur 5</span>
    </p>
  );
}

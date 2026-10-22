import type { ReactNode } from 'react';

type BadgeTone = 'accent' | 'success' | 'alert' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-fg',
  success: 'bg-success-soft text-success',
  alert: 'bg-alert-soft text-alert',
  neutral: 'bg-line text-muted',
};

/* P2.3 + P2.9 : statut toujours en texte, jamais couleur seule. */
export function Badge({
  tone = 'neutral',
  children,
  className = '',
  size = 'md',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm'} font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

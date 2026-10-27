'use client';

import { RotateCcw } from 'lucide-react';
import { useT } from '@/i18n/client';
import { Button } from '@/components/ui/Button';

/* P2.7 : erreur claire, explique quoi faire, jamais d'excuse vague. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft px-6 py-8 text-center"
    >
      <h2 className="text-lg font-semibold text-alert">{t('common.ui.errorState.title')}</h2>
      <p className="mt-2 text-fg">{message}</p>
      {onRetry ? (
        <Button type="button" variant="danger" icon={RotateCcw} onClick={onRetry} className="mt-4">
          {t('common.ui.errorState.retry')}
        </Button>
      ) : null}
    </div>
  );
}

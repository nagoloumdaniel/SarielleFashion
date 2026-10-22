import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/* P2.7 : erreur claire, explique quoi faire, jamais d'excuse vague. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-lg)] border border-alert bg-alert-soft px-6 py-8 text-center"
    >
      <h2 className="text-lg font-semibold text-alert">Un problème est survenu</h2>
      <p className="mt-2 text-fg">{message}</p>
      {onRetry ? (
        <Button type="button" variant="danger" icon={RotateCcw} onClick={onRetry} className="mt-4">
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

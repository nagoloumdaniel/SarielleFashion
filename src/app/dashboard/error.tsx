'use client';

import { LayoutDashboard, RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/* Erreur dans une page du dashboard : affichée dans le contenu (sidebar et barre conservées). */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Annonce l'erreur aux lecteurs d'écran.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <Card className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-3 py-10 text-center">
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-full bg-alert-soft text-alert"
      >
        <TriangleAlert className="size-6" />
      </span>
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="font-heading text-xl font-bold text-fg outline-none"
      >
        Une erreur est survenue
      </h1>
      <p className="text-sm text-muted">Cette page n’a pas pu être affichée. Réessayez.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button size="md" icon={RotateCcw} onClick={reset}>
          Réessayer
        </Button>
        <ButtonLink href="/dashboard" size="md" variant="secondary" icon={LayoutDashboard}>
          Retour au tableau de bord
        </ButtonLink>
      </div>
      {error.digest ? (
        <p className="text-xs text-muted">
          Référence : <span className="select-all font-mono">{error.digest}</span>
        </p>
      ) : null}
    </Card>
  );
}

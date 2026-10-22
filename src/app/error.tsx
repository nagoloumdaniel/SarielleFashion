'use client';

import { useEffect, useRef } from 'react';
import { LayoutGrid, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Annonce l'erreur aux lecteurs d'écran et place le focus au début de la page.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <main
      data-fullscreen
      className="bg-gradient-soft fixed inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto px-6 pb-6 pt-24 text-center"
    >
      <div className="error-halo mb-6 flex size-20 items-center justify-center rounded-full text-accent">
        <TriangleAlert aria-hidden="true" className="size-9" strokeWidth={1.75} />
      </div>
      <Title as="h1" size="display" ref={titleRef} tabIndex={-1} className="outline-none">
        Une erreur est survenue
      </Title>
      <p className="mt-4 max-w-md text-lg text-muted">
        La page n’a pas pu être affichée. Réessayez, ou revenez au catalogue si le problème
        persiste.
      </p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Button size="md" icon={RotateCcw} onClick={reset} className="w-full sm:w-48">
          Réessayer
        </Button>
        <ButtonLink
          href="/coiffures"
          size="md"
          variant="secondary"
          icon={LayoutGrid}
          className="w-full sm:w-48"
        >
          Voir le catalogue
        </ButtonLink>
      </div>
      {error.digest ? (
        <p className="mt-8 text-xs text-muted">
          Référence : <span className="font-mono select-all">{error.digest}</span>
        </p>
      ) : null}
    </main>
  );
}

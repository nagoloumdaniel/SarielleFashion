import { Skeleton } from '@/components/shared/Skeleton';

/** Squelette du catalogue : mêmes proportions que la page chargée (cartes 4/5, grille 1/2/3). */
export default function CatalogueLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="page-main space-y-8 md:space-y-10">
      <p className="sr-only">Chargement du catalogue…</p>
      <Skeleton className="h-4 w-44" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-2/3 max-w-xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div
        aria-hidden="true"
        className="space-y-4 rounded-[var(--radius-xl)] border border-line bg-card p-4 md:p-5"
      >
        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full rounded-[var(--radius-xl)]" />
        ))}
      </div>
    </main>
  );
}

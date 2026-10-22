import { Skeleton } from '@/components/shared/Skeleton';

/* P2.7 : squelette léger du catalogue (en-tête, chiffres, cartes) pendant le chargement. */
export default function CatalogueLoading() {
  return (
    <div role="status" aria-label="Chargement du catalogue">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-1.5 h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="mb-3 h-10 w-64 max-w-full" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

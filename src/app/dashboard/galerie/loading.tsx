import { Skeleton } from '@/components/shared/Skeleton';

/* Squelette léger : en-tête + grille de vignettes. */
export default function GalerieLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10" />
          <Skeleton className="h-7 w-28" />
        </div>
        <Skeleton className="size-10" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/shared/Skeleton';

/* Squelette de la fiche prestation (en-tête, onglets, formulaire). */
export default function ServiceDetailLoading() {
  return (
    <div role="status" aria-label="Chargement de la prestation">
      <Skeleton className="mb-3 h-9 w-24" />
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="mt-1.5 h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

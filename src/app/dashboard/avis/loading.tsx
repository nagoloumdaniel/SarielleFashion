import { Skeleton } from '@/components/shared/Skeleton';

export default function AvisLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement des avis">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-1 h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="mb-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 shrink-0" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}

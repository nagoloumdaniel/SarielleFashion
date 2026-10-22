import { Skeleton } from '@/components/shared/Skeleton';

/* Squelette léger : en-tête, période, indicateurs, deux graphiques. */
export default function StatistiquesLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="mb-3 h-10 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}

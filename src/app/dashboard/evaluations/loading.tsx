import { Skeleton } from '@/components/shared/Skeleton';

/* Squelette de la file d'évaluations. */
export default function EvaluationsLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="mt-1.5 h-4 w-full max-w-md" />
        </div>
      </div>
      <div className="mb-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 shrink-0" />
        ))}
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[76px] w-full" />
        ))}
      </div>
    </div>
  );
}

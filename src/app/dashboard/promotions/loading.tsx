import { Skeleton } from '@/components/shared/Skeleton';

/* Squelette léger : en-tête + cartes de promotions. */
export default function PromotionsLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10" />
          <Skeleton className="h-7 w-36" />
        </div>
        <Skeleton className="size-10" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

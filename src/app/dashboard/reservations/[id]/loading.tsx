import { Skeleton } from '@/components/shared/Skeleton';

export default function ReservationDetailLoading() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-3 h-9 w-24" />
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-1.5 h-4 w-full max-w-sm" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid gap-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

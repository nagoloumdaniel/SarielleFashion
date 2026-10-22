import { Skeleton } from '@/components/shared/Skeleton';

export default function CalendrierLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-1.5 h-4 w-full max-w-sm" />
        </div>
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/shared/Skeleton';

export default function DisponibilitesLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1.5 h-4 w-full max-w-md" />
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <div className="grid gap-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    </div>
  );
}

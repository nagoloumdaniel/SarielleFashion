import { Skeleton } from '@/components/shared/Skeleton';

export default function ListeAttenteLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="mt-1.5 h-4 w-full max-w-md" />
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

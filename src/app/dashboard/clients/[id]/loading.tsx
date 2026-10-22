import { Skeleton } from '@/components/shared/Skeleton';

export default function CustomerDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la fiche cliente">
      <Skeleton className="mb-2 h-9 w-24" />
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="mt-1 h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-2 gap-3 self-start">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

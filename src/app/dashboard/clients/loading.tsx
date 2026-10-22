import { Skeleton } from '@/components/shared/Skeleton';

export default function ClientsLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement des clientes">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1 h-4 w-56 max-w-full" />
        </div>
      </div>
      <Skeleton className="mb-3 h-10 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[74px] w-full" />
        ))}
      </div>
    </div>
  );
}

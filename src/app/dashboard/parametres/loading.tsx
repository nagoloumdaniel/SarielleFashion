import { Skeleton } from '@/components/shared/Skeleton';

/* Squelette léger : en-tête, lien disponibilités, deux blocs de formulaire. */
export default function ParametresLoading() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <Skeleton className="h-7 w-36" />
      </div>
      <Skeleton className="mb-3 h-[72px] w-full" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

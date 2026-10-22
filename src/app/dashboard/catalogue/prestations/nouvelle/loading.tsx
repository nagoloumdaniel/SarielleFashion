import { Skeleton } from '@/components/shared/Skeleton';

/* Squelette du formulaire de création de prestation. */
export default function NewServiceLoading() {
  return (
    <div role="status" aria-label="Chargement du formulaire">
      <Skeleton className="mb-3 h-9 w-24" />
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

import { Skeleton } from '@/components/shared/Skeleton';

/* P2.7 / P5.3 : squelette du parcours public de compatibilité. */
export default function CompatibiliteLoading() {
  return (
    <main className="page-main space-y-6">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <div className="rounded-[var(--radius-lg)] bg-card p-6 shadow-soft">
        <Skeleton className="h-8 w-2/3" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    </main>
  );
}

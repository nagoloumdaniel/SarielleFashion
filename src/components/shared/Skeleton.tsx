/* P2.7 : chargement progressif, jamais de trou vide sans squelette. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton min-h-[1rem] ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-[var(--radius-lg)] bg-card p-6 shadow-soft">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-full" />
    </div>
  );
}

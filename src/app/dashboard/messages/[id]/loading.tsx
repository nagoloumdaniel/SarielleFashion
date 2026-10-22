import { Skeleton } from '@/components/shared/Skeleton';

export default function ConversationLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la conversation">
      <Skeleton className="mb-2 h-9 w-24" />
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="mt-1 h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-4/5" />
        <Skeleton className="ml-auto h-16 w-3/4" />
        <Skeleton className="h-12 w-2/3" />
      </div>
    </div>
  );
}

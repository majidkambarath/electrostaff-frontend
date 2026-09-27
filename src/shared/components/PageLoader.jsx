import { PageHeader } from '@/shared/components/PageHeader';
import { Skeleton } from '@/shared/ui/skeleton';

export function PageLoader({ title, description, tiles = 0 }) {
  return (
    <div className="space-y-4" aria-busy="true">
      {title ? <PageHeader title={title} description={description} /> : <Skeleton className="h-8 w-48" />}
      {tiles > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: tiles }).map((_, i) => (
            <Skeleton key={i} className="h-18.5 rounded-lg" />
          ))}
        </div>
      )}
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

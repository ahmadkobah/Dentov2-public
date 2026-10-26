import { Skeleton } from '@dento/ui';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

/**
 * Animated skeleton placeholder for data tables.
 * Per BUILD_RULES §15.1.
 */
export function TableSkeleton({ columns = 5, rows = 10 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-3 p-4">
      {/* Header row */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-8 flex-1 rounded" />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={`r-${ri}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, ci) => (
            <Skeleton key={`c-${ri}-${ci}`} className="h-10 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

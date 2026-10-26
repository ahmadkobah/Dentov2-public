/**
 * StorageUsageBar — Reusable storage usage progress bar with percentage label
 *
 * Shows a color-coded progress bar:
 *   - Green (default): < 80% usage
 *   - Yellow: 80–99% usage
 *   - Red: >= 100% (over limit)
 */

import { Progress, cn } from '@dento/ui';

interface StorageUsageBarProps {
  usedMB: number;
  limitMB: number;
  className?: string;
  showLabel?: boolean;
}

export function StorageUsageBar({
  usedMB,
  limitMB,
  className,
  showLabel = true,
}: StorageUsageBarProps) {
  const percentage = limitMB > 0 ? Math.min((usedMB / limitMB) * 100, 100) : 0;
  const isOverLimit = usedMB > limitMB;
  const isNearLimit = percentage >= 80 && !isOverLimit;

  const colorClass = isOverLimit
    ? '[&>div]:bg-red-500'
    : isNearLimit
      ? '[&>div]:bg-yellow-500'
      : '[&>div]:bg-green-500';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Progress value={percentage} className={cn('h-2 flex-1', colorClass)} />
      {showLabel && (
        <span
          className={cn(
            'text-xs font-medium tabular-nums whitespace-nowrap',
            isOverLimit && 'text-red-600 dark:text-red-400',
            isNearLimit && 'text-yellow-600 dark:text-yellow-400',
            !isOverLimit && !isNearLimit && 'text-muted-foreground',
          )}
        >
          {percentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

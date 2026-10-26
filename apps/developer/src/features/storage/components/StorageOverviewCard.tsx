/**
 * StorageOverviewCard — Platform-wide storage summary card
 *
 * Shows total usage, S3 bucket health, pricing info, and alerts.
 */

import { Card, CardContent, CardHeader, CardTitle, Badge, cn } from '@dento/ui';
import { HardDrive, Cloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { StorageStats } from '@dento/shared';
import { StorageUsageBar } from './StorageUsageBar.js';

interface StorageOverviewCardProps {
  stats: StorageStats;
}

function formatMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export function StorageOverviewCard({ stats }: StorageOverviewCardProps) {
  const { overview, buckets } = stats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Platform Storage Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Usage</span>
            <span className="font-medium">
              {formatMB(overview.totalStorageUsedMB)} / {formatMB(overview.totalStorageLimitMB)}
            </span>
          </div>
          <StorageUsageBar
            usedMB={overview.totalStorageUsedMB}
            limitMB={overview.totalStorageLimitMB}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Tenants</p>
            <p className="text-lg font-semibold">{overview.tenantCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Over Limit</p>
            <p
              className={cn(
                'text-lg font-semibold',
                overview.tenantsOverLimit > 0 && 'text-red-600 dark:text-red-400',
              )}
            >
              {overview.tenantsOverLimit}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Near Limit (&gt;80%)</p>
            <p
              className={cn(
                'text-lg font-semibold',
                overview.tenantsNearLimit > 0 && 'text-yellow-600 dark:text-yellow-400',
              )}
            >
              {overview.tenantsNearLimit}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Total Allocated</p>
            <p className="text-lg font-semibold">{formatMB(overview.totalStorageLimitMB)}</p>
          </div>
        </div>

        {/* S3 Bucket Status */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">S3 Bucket Status</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(buckets).map(([key, bucket]) => (
              <div
                key={key}
                className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
              >
                <Cloud className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">{bucket.bucketName}</span>
                {bucket.isAccessible ? (
                  <Badge
                    variant="outline"
                    className="border-green-500/50 text-green-600 dark:text-green-400"
                  >
                    <CheckCircle2 className="me-1 h-3 w-3" />
                    Accessible
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-red-500/50 text-red-600 dark:text-red-400"
                  >
                    <AlertTriangle className="me-1 h-3 w-3" />
                    Unreachable
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

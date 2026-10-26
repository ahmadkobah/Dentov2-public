/**
 * StoragePage — Platform Storage Dashboard
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 4.6
 * Read-only dashboard showing platform-wide storage usage,
 * S3 bucket health, and per-tenant storage breakdown.
 */

import { PageHeader, StatCard, Skeleton } from '@dento/ui';
import { HardDrive, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { useStorageStats } from '../hooks/useStorageStats.js';
import { StorageOverviewCard } from '../components/StorageOverviewCard.js';
import { StorageTierManager } from '../components/StorageTierManager.js';
import { TenantStorageTable } from '../components/TenantStorageTable.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { EmptyState } from '../../../components/EmptyState.js';

function formatMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export default function StoragePage() {
  const { data: stats, isLoading, isError, error } = useStorageStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage"
        description="Monitor platform-wide storage usage, S3 bucket health, and per-tenant breakdown."
      />

      {/* Error Banner */}
      {isError && <QueryErrorBanner message={error?.message} />}

      {/* Empty State */}
      {!isLoading && !isError && !stats && (
        <EmptyState
          icon={HardDrive}
          title="No storage data"
          description="Storage statistics will appear once tenants start using file uploads."
        />
      )}

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`stat-${i}`} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Usage"
            value={formatMB(stats.overview.totalStorageUsedMB)}
            change={`of ${formatMB(stats.overview.totalStorageLimitMB)} allocated`}
            changeType="neutral"
            icon={<HardDrive className="h-4 w-4" />}
          />
          <StatCard
            title="Avg Usage"
            value={`${stats.overview.averageUsagePercentage.toFixed(1)}%`}
            change={`across ${stats.overview.tenantCount} tenants`}
            changeType="neutral"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            title="Over Limit"
            value={String(stats.overview.tenantsOverLimit)}
            change={`${stats.overview.tenantsNearLimit} near limit (>80%)`}
            changeType={stats.overview.tenantsOverLimit > 0 ? 'negative' : 'neutral'}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            title="Active Tenants"
            value={String(stats.overview.tenantCount)}
            change={`${stats.overview.tenantsNearLimit} near limit (>80%)`}
            changeType={stats.overview.tenantsNearLimit > 0 ? 'negative' : 'neutral'}
            icon={<Users className="h-4 w-4" />}
          />
        </div>
      ) : null}

      {/* Overview Card */}
      {isLoading ? (
        <Skeleton className="h-[300px] rounded-xl" />
      ) : stats ? (
        <StorageOverviewCard stats={stats} />
      ) : null}

      {/* Storage Tier Manager */}
      <StorageTierManager />

      {/* Tenant Breakdown Table */}
      <TenantStorageTable />
    </div>
  );
}

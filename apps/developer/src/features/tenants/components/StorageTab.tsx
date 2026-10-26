/**
 * StorageTab — Tenant storage tier management
 *
 * Shows current storage usage, tier assignment, and allows changing the tier.
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dento/ui';
import { HardDrive, Save, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import { useUpdateTenant, tenantKeys } from '../hooks/useTenants.js';
import { useStorageTiers } from '../../storage/hooks/useStorageTiers.js';
import { useQueryClient } from '@tanstack/react-query';
import { storageKeys } from '../../storage/hooks/useStorageStats.js';

export function StorageTab({ tenant, tenantId }: { tenant: TenantDetail; tenantId: string }) {
  const { data: tiers, isLoading: tiersLoading } = useStorageTiers();
  const updateTenant = useUpdateTenant(tenantId);
  const qc = useQueryClient();
  const [selectedTierId, setSelectedTierId] = useState<string>(tenant.storageTierId ?? '');

  useEffect(() => {
    setSelectedTierId(tenant.storageTierId ?? '');
  }, [tenant.storageTierId]);

  const selectedTier = tiers?.find((t) => t._id === selectedTierId);
  const hasChanged = selectedTierId !== (tenant.storageTierId ?? '');
  const newLimitMB = selectedTier ? selectedTier.storageLimitGB * 1024 : 0;
  const wouldDowngrade = hasChanged && tenant.storageUsedMB > newLimitMB;

  const usagePercent =
    tenant.storageLimitMB > 0
      ? Math.min(100, Math.round((tenant.storageUsedMB / tenant.storageLimitMB) * 100))
      : 0;

  function handleSave() {
    if (!selectedTierId) return;
    updateTenant.mutate(
      { storageTierId: selectedTierId },
      {
        onSuccess: () => {
          toast.success('Storage tier updated');
          qc.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
          qc.invalidateQueries({ queryKey: storageKeys.all });
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to update storage tier');
        },
      },
    );
  }

  function formatGB(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  }

  return (
    <div className="space-y-6">
      {/* Usage Overview */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="h-5 w-5 text-brand-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Usage</h3>
          <Badge variant="secondary" className="ms-auto">
            {tenant.storageTierName}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Used</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatGB(tenant.storageUsedMB)} / {formatGB(tenant.storageLimitMB)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent > 90
                  ? 'bg-error-500'
                  : usagePercent > 70
                    ? 'bg-warning-500'
                    : 'bg-brand-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{usagePercent}% used</p>
        </div>
      </Card>

      {/* Tier Selection */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Change Storage Tier
        </h3>

        {tiersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : !tiers?.length ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No storage tiers available. Configure them in the Storage page.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Storage Tier</Label>
              <Select value={selectedTierId} onValueChange={setSelectedTierId}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select a tier..." />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier._id} value={tier._id}>
                      {tier.name} — {tier.storageLimitGB} GB
                      {tier.pricePerMonth === 0
                        ? ' (Free)'
                        : ` (${tier.pricePerMonth} ${tier.currency}/mo)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTier && hasChanged && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">New Limit</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedTier.storageLimitGB} GB
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Price</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedTier.pricePerMonth === 0
                        ? 'Free'
                        : `${selectedTier.pricePerMonth} ${selectedTier.currency}/mo`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {wouldDowngrade && (
              <div className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" />
                <p className="text-sm text-warning-800 dark:text-warning-300">
                  Tenant is using {formatGB(tenant.storageUsedMB)} but the new tier limit is{' '}
                  {formatGB(newLimitMB)}. Downgrade will be rejected by the server.
                </p>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={!hasChanged || updateTenant.isPending || wouldDowngrade}
            >
              {updateTenant.isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="me-2 h-4 w-4" />
                  Update Storage Tier
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Storage Details */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Current Tier</span>
            <p className="font-medium text-gray-900 dark:text-white">{tenant.storageTierName}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Storage Limit</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatGB(tenant.storageLimitMB)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Storage Used</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatGB(tenant.storageUsedMB)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Available</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatGB(Math.max(0, tenant.storageLimitMB - tenant.storageUsedMB))}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

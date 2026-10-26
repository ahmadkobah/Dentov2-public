/**
 * TenantStorageTable — Per-tenant storage breakdown table
 *
 * Sortable, searchable, paginated table showing each tenant's storage usage.
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Button,
  Skeleton,
  cn,
} from '@dento/ui';
import { Database, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useTenantStorageList, type StorageTenantFilters } from '../hooks/useStorageStats.js';
import { StorageUsageBar } from './StorageUsageBar.js';

function formatMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

type SortField = 'storageUsedMB' | 'usagePercentage' | 'name';

export function TenantStorageTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('storageUsedMB');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filters: StorageTenantFilters = {
    page,
    limit: 10,
    search: search || undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isError } = useTenantStorageList(filters);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        sortBy === field ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Tenant Storage Breakdown
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search tenants..."
                aria-label="Search tenant storage"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 w-[200px] ps-9"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-start font-medium">
                  <SortButton field="name" label="Tenant" />
                </th>
                <th className="pb-3 text-start font-medium">Status</th>
                <th className="pb-3 text-start font-medium">
                  <SortButton field="storageUsedMB" label="Used" />
                </th>
                <th className="pb-3 text-start font-medium">Limit</th>
                <th className="pb-3 text-start font-medium">Tier</th>
                <th className="w-[180px] pb-3 text-start font-medium">
                  <SortButton field="usagePercentage" label="Usage" />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b">
                    <td className="py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-3">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3">
                      <Skeleton className="h-2 w-full" />
                    </td>
                  </tr>
                ))}

              {isError && (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <p className="text-muted-foreground">Failed to load tenant storage data.</p>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && data?.tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {search ? 'No tenants match the current filters.' : 'No tenants found.'}
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading &&
                data?.tenants.map((tenant) => (
                  <tr
                    key={tenant.tenantId}
                    className="hover:bg-muted/50 border-b transition-colors"
                  >
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-muted-foreground text-xs">{tenant.slug}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={tenant.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="py-3 tabular-nums">{formatMB(tenant.storageUsedMB)}</td>
                    <td className="py-3 tabular-nums">{formatMB(tenant.storageLimitMB)}</td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-xs">
                        {tenant.tierName ?? '—'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <StorageUsageBar
                        usedMB={tenant.storageUsedMB}
                        limitMB={tenant.storageLimitMB}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {(data.meta.page - 1) * data.meta.limit + 1}–
              {Math.min(data.meta.page * data.meta.limit, data.meta.total)} of {data.meta.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="me-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {page} / {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="ms-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

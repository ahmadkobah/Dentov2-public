/**
 * useStorageStats — TanStack Query hooks for Platform Storage Dashboard
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 4.5
 * Calls platform-level `/api/platform/storage/*` endpoints.
 * Read-only — no mutations needed.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { StorageStats, TenantStorageListResponse } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Query Keys                                                         */
/* ------------------------------------------------------------------ */

export const storageKeys = {
  all: ['platform-storage'] as const,
  stats: () => [...storageKeys.all, 'stats'] as const,
  tenants: (filters?: StorageTenantFilters) =>
    [...storageKeys.all, 'tenants', filters ?? {}] as const,
};

/* ------------------------------------------------------------------ */
/*  Filter Types                                                       */
/* ------------------------------------------------------------------ */

export interface StorageTenantFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'storageUsedMB' | 'usagePercentage' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/* ------------------------------------------------------------------ */
/*  Response Types                                                     */
/* ------------------------------------------------------------------ */

interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** Fetch platform-wide storage overview + S3 bucket status. */
export function useStorageStats() {
  return useQuery({
    queryKey: storageKeys.stats(),
    queryFn: async (): Promise<StorageStats> => {
      const response = await apiClient.get<ApiSuccessResponse<StorageStats>>(
        '/api/platform/storage/stats',
      );
      return response.data;
    },
    staleTime: 30_000, // 30s — storage stats don't change rapidly
  });
}

/** Fetch per-tenant storage breakdown (paginated, filterable). */
export function useTenantStorageList(filters: StorageTenantFilters = {}) {
  return useQuery({
    queryKey: storageKeys.tenants(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);
      if (filters.search) params.search = filters.search;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      const response = await apiClient.get<
        ApiSuccessResponse<TenantStorageListResponse['tenants']> & {
          meta?: { total: number; page: number; limit: number; totalPages: number };
        }
      >('/api/platform/storage/tenants', { params });
      return { tenants: response.data, meta: response.meta };
    },
    staleTime: 30_000,
  });
}

/**
 * useStockCounts — React Query hooks for stock count CRUD.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';
import { stockKeys, movementKeys } from './useInventoryStock.js';
import { inventoryItemKeys } from './useInventoryItems.js';

// ── Types ────────────────────────────────────────────────────

export interface StockCountItem {
  _id?: string;
  itemId: string | { _id: string; name: { en: string }; sku: string };
  expectedQuantity: number;
  countedQuantity: number;
  variance?: number;
  notes?: string;
}

export interface StockCount {
  _id: string;
  countNumber: string;
  branchId: string | { _id: string; name: { en: string } };
  type: 'full' | 'partial' | 'cycle';
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'cancelled';
  items: StockCountItem[];
  totalItems: number;
  discrepancies: number;
  notes?: string;
  createdBy: string;
  startedAt?: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockCountFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  branchId?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface StockCountListResponse {
  success: true;
  data: { stockCounts: StockCount[]; pagination: PaginationMeta };
}

interface StockCountDetailResponse {
  success: true;
  data: { stockCount: StockCount };
}

// ── Query Keys ───────────────────────────────────────────────

export const stockCountKeys = {
  all: ['stock-counts'] as const,
  lists: () => [...stockCountKeys.all, 'list'] as const,
  list: (filters: StockCountFilters) => [...stockCountKeys.lists(), filters] as const,
  details: () => [...stockCountKeys.all, 'detail'] as const,
  detail: (id: string) => [...stockCountKeys.details(), id] as const,
};

// ── Queries ──────────────────────────────────────────────────

export function useStockCountList(filters: StockCountFilters = {}) {
  return useQuery({
    queryKey: stockCountKeys.list(filters),
    queryFn: () =>
      apiClient.get<StockCountListResponse>('/api/stock-counts', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({ items: res.data.stockCounts, pagination: res.data.pagination }),
  });
}

export function useStockCountDetail(id: string) {
  return useQuery({
    queryKey: stockCountKeys.detail(id),
    queryFn: () => apiClient.get<StockCountDetailResponse>(`/api/stock-counts/${id}`),
    select: (res) => res.data.stockCount,
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useCreateStockCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<ApiSuccessResponse<{ stockCount: StockCount }>>('/api/stock-counts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockCountKeys.lists() });
      qc.invalidateQueries({ queryKey: stockKeys.lists() });
      qc.invalidateQueries({ queryKey: movementKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

export function useUpdateStockCount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch<ApiSuccessResponse<{ stockCount: StockCount }>>(
        `/api/stock-counts/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockCountKeys.lists() });
      qc.invalidateQueries({ queryKey: stockCountKeys.detail(id) });
    },
  });
}

export function useApplyStockCount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemIds: string[]; notes?: string }) =>
      apiClient.post<ApiSuccessResponse<null>>(`/api/stock-counts/${id}/apply`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockCountKeys.lists() });
      qc.invalidateQueries({ queryKey: stockCountKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stockKeys.lists() });
      qc.invalidateQueries({ queryKey: movementKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

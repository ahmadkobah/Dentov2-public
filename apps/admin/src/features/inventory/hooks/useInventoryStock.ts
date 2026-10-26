/**
 * useInventoryStock — React Query hooks for stock operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';
import { inventoryItemKeys } from './useInventoryItems.js';

// ── Types ────────────────────────────────────────────────────

export interface StockRecord {
  _id: string;
  itemId: string | { _id: string; name: { en: string }; sku: string };
  branchId: string | { _id: string; name: { en: string } };
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  location?: string;
  lastCountedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  _id: string;
  itemId: string | { _id: string; name: { en: string }; sku: string };
  branchId: string | { _id: string; name: { en: string } };
  type:
    | 'inbound'
    | 'outbound'
    | 'adjustment'
    | 'transfer_in'
    | 'transfer_out'
    | 'consumption'
    | 'return'
    | 'disposal';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  batchNumber?: string;
  performedBy: string;
  createdAt: string;
}

export interface StockFilters {
  page?: number;
  limit?: number;
  itemId?: string;
  branchId?: string;
  belowReorder?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface MovementFilters {
  page?: number;
  limit?: number;
  itemId?: string;
  branchId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface StockListResponse {
  success: true;
  data: { stock: StockRecord[]; pagination: PaginationMeta };
}

interface MovementListResponse {
  success: true;
  data: { movements: StockMovement[]; pagination: PaginationMeta };
}

// ── Query Keys ───────────────────────────────────────────────

export const stockKeys = {
  all: ['inventory-stock'] as const,
  lists: () => [...stockKeys.all, 'list'] as const,
  list: (filters: StockFilters) => [...stockKeys.lists(), filters] as const,
  details: () => [...stockKeys.all, 'detail'] as const,
  detail: (id: string) => [...stockKeys.details(), id] as const,
};

export const movementKeys = {
  all: ['stock-movements'] as const,
  lists: () => [...movementKeys.all, 'list'] as const,
  list: (filters: MovementFilters) => [...movementKeys.lists(), filters] as const,
  details: () => [...movementKeys.all, 'detail'] as const,
  detail: (id: string) => [...movementKeys.details(), id] as const,
};

// ── Queries ──────────────────────────────────────────────────

export function useStockList(filters: StockFilters = {}) {
  return useQuery({
    queryKey: stockKeys.list(filters),
    queryFn: () =>
      apiClient.get<StockListResponse>('/api/inventory-stock', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({ stock: res.data.stock, pagination: res.data.pagination }),
  });
}

export function useStockMovements(filters: MovementFilters = {}) {
  return useQuery({
    queryKey: movementKeys.list(filters),
    queryFn: () =>
      apiClient.get<MovementListResponse>('/api/inventory-stock/movements', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({ movements: res.data.movements, pagination: res.data.pagination }),
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; branchId: string; adjustment: number; reason: string }) =>
      apiClient.post<ApiSuccessResponse<{ stock: StockRecord }>>(
        '/api/inventory-stock/adjust',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockKeys.lists() });
      qc.invalidateQueries({ queryKey: movementKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

export function useDisposeStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      itemId: string;
      branchId: string;
      quantity: number;
      reason: string;
      batchNumber?: string;
    }) => apiClient.post<ApiSuccessResponse<null>>('/api/inventory-stock/dispose', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockKeys.lists() });
      qc.invalidateQueries({ queryKey: movementKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

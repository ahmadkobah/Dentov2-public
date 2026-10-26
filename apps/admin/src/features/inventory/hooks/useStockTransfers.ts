/**
 * useStockTransfers — React Query hooks for stock transfer CRUD.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';
import { stockKeys, movementKeys } from './useInventoryStock.js';
import { inventoryItemKeys } from './useInventoryItems.js';

// ── Types ────────────────────────────────────────────────────

export interface TransferLineItem {
  _id?: string;
  itemId: string | { _id: string; name: { en: string }; sku: string };
  quantity: number;
  receivedQuantity?: number;
}

export interface StockTransfer {
  _id: string;
  transferNumber: string;
  fromBranchId: string | { _id: string; name: { en: string } };
  toBranchId: string | { _id: string; name: { en: string } };
  status: 'draft' | 'in_transit' | 'received' | 'cancelled';
  items: TransferLineItem[];
  notes?: string;
  createdBy: string;
  shippedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  fromBranchId?: string;
  toBranchId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface TransferListResponse {
  success: true;
  data: { transfers: StockTransfer[]; pagination: PaginationMeta };
}

interface TransferDetailResponse {
  success: true;
  data: { transfer: StockTransfer };
}

// ── Query Keys ───────────────────────────────────────────────

export const transferKeys = {
  all: ['stock-transfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  list: (filters: TransferFilters) => [...transferKeys.lists(), filters] as const,
  details: () => [...transferKeys.all, 'detail'] as const,
  detail: (id: string) => [...transferKeys.details(), id] as const,
};

// ── Queries ──────────────────────────────────────────────────

export function useStockTransferList(filters: TransferFilters = {}) {
  return useQuery({
    queryKey: transferKeys.list(filters),
    queryFn: () =>
      apiClient.get<TransferListResponse>('/api/stock-transfers', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({ items: res.data.transfers, pagination: res.data.pagination }),
  });
}

export function useStockTransferDetail(id: string) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: () => apiClient.get<TransferDetailResponse>(`/api/stock-transfers/${id}`),
    select: (res) => res.data.transfer,
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StockTransfer>) =>
      apiClient.post<ApiSuccessResponse<{ transfer: StockTransfer }>>('/api/stock-transfers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
}

export function useShipStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ transfer: StockTransfer }>>(
        `/api/stock-transfers/${id}/ship`,
      ),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
      qc.invalidateQueries({ queryKey: transferKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stockKeys.lists() });
      qc.invalidateQueries({ queryKey: movementKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

export function useReceiveStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: Array<{ itemId: string; receivedQuantity: number }>;
    }) =>
      apiClient.patch<ApiSuccessResponse<{ transfer: StockTransfer }>>(
        `/api/stock-transfers/${id}/receive`,
        { items },
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
      qc.invalidateQueries({ queryKey: transferKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stockKeys.lists() });
      qc.invalidateQueries({ queryKey: movementKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

export function useCancelStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ transfer: StockTransfer }>>(
        `/api/stock-transfers/${id}/cancel`,
      ),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: transferKeys.lists() });
      qc.invalidateQueries({ queryKey: transferKeys.detail(id) });
    },
  });
}

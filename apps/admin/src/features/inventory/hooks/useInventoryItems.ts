/**
 * useInventoryItems — React Query hooks for inventory items CRUD.
 *
 * Follows the query-key-factory pattern (§ invoiceKeys / patientKeys).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ────────────────────────────────────────────────────

export interface InventoryItem {
  _id: string;
  name: { en: string; ar?: string };
  sku: string;
  barcode?: string;
  categoryId?: string | { _id: string; name: { en: string } };
  description?: { en?: string; ar?: string };
  unitOfMeasure: string;
  unitCost: number;
  sellingPrice?: number;
  reorderLevel: number;
  reorderQuantity: number;
  minimumStock: number;
  maximumStock?: number;
  isActive: boolean;
  isConsumable: boolean;
  trackBatches: boolean;
  createdAt: string;
  updatedAt: string;
  // Virtual / aggregated
  currentStock?: number;
  stockValue?: number;
}

export interface InventoryItemFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: string;
  stockStatus?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface InventoryCategory {
  _id: string;
  name: { en: string; ar?: string };
  description?: { en?: string; ar?: string };
  parentId?: string | null;
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ItemListResponse {
  success: true;
  data: { items: InventoryItem[]; meta: PaginationMeta };
}

interface ItemDetailResponse {
  success: true;
  data: { item: InventoryItem };
}

interface CategoryListResponse {
  success: true;
  data: { items: InventoryCategory[]; meta: PaginationMeta };
}

// ── Query Keys ───────────────────────────────────────────────

export const inventoryItemKeys = {
  all: ['inventory-items'] as const,
  lists: () => [...inventoryItemKeys.all, 'list'] as const,
  list: (filters: InventoryItemFilters) => [...inventoryItemKeys.lists(), filters] as const,
  details: () => [...inventoryItemKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryItemKeys.details(), id] as const,
};

export const inventoryCategoryKeys = {
  all: ['inventory-categories'] as const,
  lists: () => [...inventoryCategoryKeys.all, 'list'] as const,
  list: () => [...inventoryCategoryKeys.lists(), {}] as const,
};

// ── Queries ──────────────────────────────────────────────────

export function useInventoryItemList(filters: InventoryItemFilters = {}) {
  return useQuery({
    queryKey: inventoryItemKeys.list(filters),
    queryFn: () =>
      apiClient.get<ItemListResponse>('/api/inventory-items', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({ items: res.data.items, pagination: res.data.meta }),
  });
}

export function useInventoryItemDetail(id: string) {
  return useQuery({
    queryKey: inventoryItemKeys.detail(id),
    queryFn: () => apiClient.get<ItemDetailResponse>(`/api/inventory-items/${id}`),
    select: (res) => res.data.item,
    enabled: !!id,
  });
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: inventoryCategoryKeys.list(),
    queryFn: () => apiClient.get<CategoryListResponse>('/api/inventory-categories'),
    select: (res) => res.data.items,
  });
}

// ── Item Mutations ───────────────────────────────────────────

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InventoryItem>) =>
      apiClient.post<ApiSuccessResponse<{ item: InventoryItem }>>('/api/inventory-items', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

export function useUpdateInventoryItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InventoryItem>) =>
      apiClient.put<ApiSuccessResponse<{ item: InventoryItem }>>(
        `/api/inventory-items/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryItemKeys.detail(id) });
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<null>>(`/api/inventory-items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

// ── Stock Adjustment ─────────────────────────────────────────

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; branchId: string; quantity: number; reason?: string }) =>
      apiClient.post<ApiSuccessResponse<unknown>>('/api/inventory-stock/adjust', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryItemKeys.lists() });
    },
  });
}

// ── Category Mutations ───────────────────────────────────────

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InventoryCategory>) =>
      apiClient.post<ApiSuccessResponse<{ category: InventoryCategory }>>(
        '/api/inventory-categories',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryCategoryKeys.lists() });
    },
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InventoryCategory>) =>
      apiClient.put<ApiSuccessResponse<{ category: InventoryCategory }>>(
        `/api/inventory-categories/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryCategoryKeys.lists() });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<null>>(`/api/inventory-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryCategoryKeys.lists() });
    },
  });
}

/**
 * useStorageTiers — TanStack Query hooks for Storage Tier CRUD
 *
 * Endpoints: /api/platform/storage-tiers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { IStorageTier, IRegionPrice } from '@dento/shared';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Query Keys                                                         */
/* ------------------------------------------------------------------ */

export const storageTierKeys = {
  all: ['storage-tiers'] as const,
  list: () => [...storageTierKeys.all, 'list'] as const,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
}

export interface CreateStorageTierInput {
  name: string;
  storageLimitGB: number;
  pricePerMonth: number;
  currency?: string;
  isCustom?: boolean;
  sortOrder?: number;
  regionPrices?: IRegionPrice[];
}

export type UpdateStorageTierInput = Partial<CreateStorageTierInput>;

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useStorageTiers() {
  return useQuery({
    queryKey: storageTierKeys.list(),
    queryFn: async (): Promise<IStorageTier[]> => {
      const response = await apiClient.get<ApiSuccessResponse<IStorageTier[]>>(
        '/api/platform/storage-tiers',
      );
      return response.data;
    },
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateStorageTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStorageTierInput) => {
      const response = await apiClient.post<ApiSuccessResponse<IStorageTier>>(
        '/api/platform/storage-tiers',
        input,
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storageTierKeys.all });
      toast.success('Storage tier created');
    },
    onError: () => {
      toast.error('Failed to create storage tier');
    },
  });
}

export function useUpdateStorageTier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateStorageTierInput) => {
      const response = await apiClient.patch<ApiSuccessResponse<IStorageTier>>(
        `/api/platform/storage-tiers/${id}`,
        input,
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storageTierKeys.all });
      toast.success('Storage tier updated');
    },
    onError: () => {
      toast.error('Failed to update storage tier');
    },
  });
}

export function useDeleteStorageTier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/platform/storage-tiers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storageTierKeys.all });
      toast.success('Storage tier deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate storage tier');
    },
  });
}

export function useUpdateRegionPrices(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (regionPrices: IRegionPrice[]) => {
      const response = await apiClient.put<ApiSuccessResponse<IStorageTier>>(
        `/api/platform/storage-tiers/${id}/region-prices`,
        { regionPrices },
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storageTierKeys.all });
      toast.success('Region prices updated');
    },
    onError: () => {
      toast.error('Failed to update region prices');
    },
  });
}

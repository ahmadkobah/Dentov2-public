import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ModulePricing {
  basePrice: number;
  isFree: boolean;
  billingCycle: string;
}

export interface ModuleItem {
  _id: string;
  slug: string;
  name: { en: string; ar?: string };
  description: { en: string; ar?: string };
  version: string;
  status: 'development' | 'beta' | 'active' | 'deprecated' | 'retired';
  type: 'core' | 'paid';
  icon: string;
  isActive: boolean;
  dependsOn: string[];
  conflictsWith: string[];
  changelog: Array<{ version: string; date: string; changes: string[] }>;
  tenantCount: number;
  pricing: ModulePricing;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleStats {
  totalModules: number;
  activeModules: number;
  betaModules: number;
  deprecatedModules: number;
  coreModules: number;
  paidModules: number;
  totalInstallations: number;
  statusBreakdown: Record<string, number>;
  topModules: Array<{
    slug: string;
    count: number;
    name: { en: string };
    icon: string;
  }>;
}

export interface ModuleFilters {
  search?: string;
  status?: string;
  type?: string;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface ModuleListResponse {
  success: boolean;
  data: ModuleItem[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface ModuleStatsResponse {
  success: boolean;
  data: ModuleStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const moduleKeys = {
  all: ['modules'] as const,
  lists: () => [...moduleKeys.all, 'list'] as const,
  list: (filters: ModuleFilters) => [...moduleKeys.lists(), filters] as const,
  stats: () => [...moduleKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useModules(filters: ModuleFilters) {
  return useQuery({
    queryKey: moduleKeys.list(filters),
    queryFn: () =>
      apiClient.get<ModuleListResponse>('/api/platform/modules', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data as ModuleItem[], meta: res.meta }),
  });
}

export function useModuleStats() {
  return useQuery({
    queryKey: moduleKeys.stats(),
    queryFn: () => apiClient.get<ModuleStatsResponse>('/api/platform/modules/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutation input types                                               */
/* ------------------------------------------------------------------ */

export interface CreateModuleInput {
  slug: string;
  name: { en: string; ar?: string };
  description?: { en: string; ar?: string };
  version?: string;
  type?: 'core' | 'paid';
  dependsOn?: string[];
  icon?: string;
}

export interface UpdateModuleInput {
  name?: { en: string; ar?: string };
  description?: { en: string; ar?: string };
  dependsOn?: string[];
  conflictsWith?: string[];
  icon?: string;
  isActive?: boolean;
}

export interface PushVersionInput {
  version: string;
  changelog: { changes: string[] };
}

export interface ChangeStatusInput {
  status: 'development' | 'beta' | 'active' | 'deprecated' | 'retired';
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModuleInput) => apiClient.post('/api/modules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moduleKeys.all });
      toast.success('Module created');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create module');
    },
  });
}

export function useUpdateModule(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateModuleInput) => apiClient.patch(`/api/modules/${slug}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moduleKeys.all });
      toast.success('Module updated');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update module');
    },
  });
}

export function usePushVersion(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PushVersionInput) => apiClient.post(`/api/modules/${slug}/version`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moduleKeys.all });
      toast.success('New version pushed');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to push version');
    },
  });
}

export function useChangeModuleStatus(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ChangeStatusInput) => apiClient.patch(`/api/modules/${slug}/status`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moduleKeys.all });
      toast.success('Module status changed');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to change status');
    },
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/api/platform/modules/${slug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moduleKeys.all });
      toast.success('Module deleted');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete module');
    },
  });
}

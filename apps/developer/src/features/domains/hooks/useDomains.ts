import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationMeta } from '@dento/shared';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DNSRecord {
  type: 'CNAME' | 'TXT';
  name: string;
  value: string;
  verified: boolean;
}

export type SSLStatus = 'pending' | 'active' | 'expired' | 'error';

export interface Domain {
  _id: string;
  tenantSlug: string;
  customDomain: string;
  dnsVerified: boolean;
  sslStatus: SSLStatus;
  sslExpiresAt?: string;
  requiredRecords: DNSRecord[];
  verifiedAt?: string;
  isActive: boolean;
  cloudflareRecordId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DomainFilters {
  tenantSlug?: string;
  sslStatus?: string;
  dnsVerified?: string;
  page?: number;
  limit?: number;
}

interface DomainListResponse {
  success: boolean;
  data: Domain[];
  meta: PaginationMeta;
}

interface DomainSingleResponse {
  success: boolean;
  data: Domain;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const domainKeys = {
  all: ['domains'] as const,
  lists: () => [...domainKeys.all, 'list'] as const,
  list: (filters: DomainFilters) => [...domainKeys.lists(), filters] as const,
  details: () => [...domainKeys.all, 'detail'] as const,
  detail: (id: string) => [...domainKeys.details(), id] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useDomains(filters: DomainFilters = {}) {
  return useQuery({
    queryKey: domainKeys.list(filters),
    queryFn: () =>
      apiClient.get<DomainListResponse>('/api/platform/domains', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useDomainDetail(id: string | null) {
  return useQuery({
    queryKey: domainKeys.detail(id!),
    queryFn: () => apiClient.get<DomainSingleResponse>(`/api/platform/domains/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tenantSlug: string; customDomain: string }) =>
      apiClient.post<DomainSingleResponse>('/api/platform/domains', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainKeys.lists() });
      toast.success('Domain created');
    },
    onError: () => {
      toast.error('Failed to create domain');
    },
  });
}

export function useVerifyDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<DomainSingleResponse>(`/api/platform/domains/${id}/verify`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: domainKeys.lists() });
      qc.invalidateQueries({ queryKey: domainKeys.detail(id) });
      toast.success('Domain verification initiated');
    },
    onError: () => {
      toast.error('Failed to verify domain');
    },
  });
}

export function useUpdateDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; customDomain?: string; isActive?: boolean }) =>
      apiClient.patch<DomainSingleResponse>(`/api/platform/domains/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: domainKeys.lists() });
      qc.invalidateQueries({ queryKey: domainKeys.detail(vars.id) });
      toast.success('Domain updated');
    },
    onError: () => {
      toast.error('Failed to update domain');
    },
  });
}

export function useDeleteDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/api/platform/domains/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainKeys.lists() });
      toast.success('Domain deleted');
    },
    onError: () => {
      toast.error('Failed to delete domain');
    },
  });
}

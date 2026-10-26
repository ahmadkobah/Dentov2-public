import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface Chair {
  _id?: string;
  number: number;
  name?: string;
  isActive: boolean;
  equipmentType?: 'standard' | 'surgical' | 'pediatric';
}

export interface WorkingHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface SlotConfig {
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  bufferBetween: number;
  bookingLeadTime: number;
  bookingWindowDays: number;
}

export interface OnlineBookingConfig {
  isEnabled: boolean;
  isAutoConfirm: boolean;
  autoConfirmLeadTimeHours: number;
  isPatientPhoneRequired: boolean;
  isPatientEmailRequired: boolean;
  isDoctorSelectionAllowed: boolean;
  enabledServices: string[];
  confirmationMessage?: { en: string; ar?: string };
}

export interface Branch {
  _id: string;
  name: { en: string; ar?: string };
  code: string;
  address: { en: string; ar?: string };
  city?: string;
  phone?: string;
  email?: string;
  chairs: Chair[];
  workingHours: WorkingHours[];
  ramadanHours: WorkingHours[];
  isRamadanMode: boolean;
  holidays: Array<{ date: string; name: { en: string; ar?: string } }>;
  slotConfig: SlotConfig;
  onlineBookingConfig: OnlineBookingConfig;
  coordinates?: { lat: number; lng: number };
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface BranchListResponse {
  success: true;
  data: {
    items: Branch[];
    pagination: PaginationMeta;
  };
}

interface BranchDetailResponse {
  success: true;
  data: { branch: Branch; warnings?: string[] };
}

interface ActiveBranchesResponse {
  success: true;
  data: {
    branches: Array<Pick<Branch, '_id' | 'name' | 'code' | 'isPrimary' | 'chairs'>>;
  };
}

// ── Query Keys ─────────────────────────────────────────────

export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (filters: BranchFilters) => [...branchKeys.lists(), filters] as const,
  details: () => [...branchKeys.all, 'detail'] as const,
  detail: (id: string) => [...branchKeys.details(), id] as const,
  active: () => [...branchKeys.all, 'active'] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useBranchList(filters: BranchFilters = {}) {
  return useQuery({
    queryKey: branchKeys.list(filters),
    queryFn: () =>
      apiClient.get<BranchListResponse>('/api/branches', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.items,
      meta: res.data.pagination,
    }),
  });
}

export function useBranchDetail(id: string) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => apiClient.get<BranchDetailResponse>(`/api/branches/${id}`),
    select: (res) => res.data.branch,
    enabled: !!id,
  });
}

export function useActiveBranches() {
  return useQuery({
    queryKey: branchKeys.active(),
    queryFn: () => apiClient.get<ActiveBranchesResponse>('/api/branches/active'),
    select: (res) => res.data.branches,
    staleTime: 60_000,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Branch>) =>
      apiClient.post<BranchDetailResponse>('/api/branches', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.lists() });
      qc.invalidateQueries({ queryKey: branchKeys.active() });
    },
  });
}

export function useUpdateBranch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Branch>) =>
      apiClient.put<BranchDetailResponse>(`/api/branches/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.lists() });
      qc.invalidateQueries({ queryKey: branchKeys.detail(id) });
      qc.invalidateQueries({ queryKey: branchKeys.active() });
    },
  });
}

export function useToggleBranchActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<BranchDetailResponse>(`/api/branches/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.lists() });
      qc.invalidateQueries({ queryKey: branchKeys.active() });
    },
  });
}

export function useToggleRamadanMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<BranchDetailResponse>(`/api/branches/${id}/ramadan`, {}),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: branchKeys.lists() });
      qc.invalidateQueries({ queryKey: branchKeys.detail(id) });
      qc.invalidateQueries({ queryKey: branchKeys.active() });
    },
  });
}

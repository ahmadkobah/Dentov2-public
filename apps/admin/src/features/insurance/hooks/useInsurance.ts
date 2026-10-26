import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface InsuranceCompany {
  _id: string;
  name: { en: string; ar: string };
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  coveragePercentage: number;
  maxCoverage?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceCompanyFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface InsuranceClaim {
  _id: string;
  claimNumber: string;
  patientId:
    | string
    | { _id: string; firstName: { en: string }; lastName: { en: string }; patientCode: string };
  invoiceId?: string | { _id: string; invoiceNumber: string };
  claimDate: string;
  serviceDate: string;
  totalAmount: number;
  claimedAmount: number;
  approvedAmount: number;
  patientResponsibility: number;
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'appealed';
  denialReason?: string;
  documents: { _id: string; name: string; url: string; type: string }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceClaimFilters {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// ── Response Types ──────────────────────────────────────────

interface CompanyListResponse {
  success: true;
  data: { companies: InsuranceCompany[]; meta: PaginationMeta };
}

interface CompanyDetailResponse {
  success: true;
  data: { company: InsuranceCompany };
}

interface ClaimListResponse {
  success: true;
  data: { claims: InsuranceClaim[]; meta: PaginationMeta };
}

interface ClaimDetailResponse {
  success: true;
  data: { claim: InsuranceClaim };
}

// ── Query Keys ──────────────────────────────────────────────

export const insuranceCompanyKeys = {
  all: ['insurance-companies'] as const,
  lists: () => [...insuranceCompanyKeys.all, 'list'] as const,
  list: (f: InsuranceCompanyFilters) => [...insuranceCompanyKeys.lists(), f] as const,
  details: () => [...insuranceCompanyKeys.all, 'detail'] as const,
  detail: (id: string) => [...insuranceCompanyKeys.details(), id] as const,
};

export const insuranceClaimKeys = {
  all: ['insurance-claims'] as const,
  lists: () => [...insuranceClaimKeys.all, 'list'] as const,
  list: (f: InsuranceClaimFilters) => [...insuranceClaimKeys.lists(), f] as const,
  details: () => [...insuranceClaimKeys.all, 'detail'] as const,
  detail: (id: string) => [...insuranceClaimKeys.details(), id] as const,
  aging: () => [...insuranceClaimKeys.all, 'aging'] as const,
};

// ── Insurance Company Hooks ─────────────────────────────────

export function useInsuranceCompanyList(filters: InsuranceCompanyFilters = {}) {
  return useQuery({
    queryKey: insuranceCompanyKeys.list(filters),
    queryFn: () =>
      apiClient.get<CompanyListResponse>('/api/insurance-companies', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.companies,
      meta: res.data.meta,
    }),
  });
}

export function useInsuranceCompanyDetail(id: string) {
  return useQuery({
    queryKey: insuranceCompanyKeys.detail(id),
    queryFn: () => apiClient.get<CompanyDetailResponse>(`/api/insurance-companies/${id}`),
    select: (res) => res.data.company,
    enabled: !!id,
  });
}

export function useCreateInsuranceCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InsuranceCompany>) =>
      apiClient.post<ApiSuccessResponse<{ company: InsuranceCompany }>>(
        '/api/insurance-companies',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insuranceCompanyKeys.lists() });
    },
  });
}

export function useUpdateInsuranceCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsuranceCompany> }) =>
      apiClient.put<ApiSuccessResponse<{ company: InsuranceCompany }>>(
        `/api/insurance-companies/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insuranceCompanyKeys.lists() });
    },
  });
}

export function useDeactivateInsuranceCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/insurance-companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insuranceCompanyKeys.lists() });
    },
  });
}

// ── Insurance Claim Hooks ───────────────────────────────────

export function useInsuranceClaimList(filters: InsuranceClaimFilters = {}) {
  return useQuery({
    queryKey: insuranceClaimKeys.list(filters),
    queryFn: () =>
      apiClient.get<ClaimListResponse>('/api/insurance-claims', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.claims,
      meta: res.data.meta,
    }),
  });
}

export function useInsuranceClaimDetail(id: string) {
  return useQuery({
    queryKey: insuranceClaimKeys.detail(id),
    queryFn: () => apiClient.get<ClaimDetailResponse>(`/api/insurance-claims/${id}`),
    select: (res) => res.data.claim,
    enabled: !!id,
  });
}

export function useCreateInsuranceClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InsuranceClaim>) =>
      apiClient.post<ApiSuccessResponse<{ claim: InsuranceClaim }>>('/api/insurance-claims', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insuranceClaimKeys.lists() });
    },
  });
}

export function useUpdateClaimStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      ...data
    }: {
      id: string;
      status: string;
      approvedAmount?: number;
      denialReason?: string;
    }) =>
      apiClient.patch<ApiSuccessResponse<{ claim: InsuranceClaim }>>(
        `/api/insurance-claims/${id}/status`,
        { status, ...data },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insuranceClaimKeys.lists() });
      qc.invalidateQueries({ queryKey: insuranceClaimKeys.details() });
    },
  });
}

export function useClaimAgingReport(filters: { startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: insuranceClaimKeys.aging(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<unknown>>('/api/insurance-claims/aging', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => res.data,
  });
}

export function useUploadClaimDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, file }: { claimId: string; file: File }) => {
      const formData = new FormData();
      formData.append('document', file);
      return apiClient.post<ApiSuccessResponse<{ claim: InsuranceClaim }>>(
        `/api/insurance-claims/${claimId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insuranceClaimKeys.lists() });
      qc.invalidateQueries({ queryKey: insuranceClaimKeys.details() });
    },
  });
}

export function useRemoveClaimDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, documentId }: { claimId: string; documentId: string }) =>
      apiClient.delete<ApiSuccessResponse<{ claim: InsuranceClaim }>>(
        `/api/insurance-claims/${claimId}/documents/${documentId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insuranceClaimKeys.lists() });
      qc.invalidateQueries({ queryKey: insuranceClaimKeys.details() });
    },
  });
}

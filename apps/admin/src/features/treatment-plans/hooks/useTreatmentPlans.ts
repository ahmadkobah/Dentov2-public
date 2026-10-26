/**
 * Treatment Plan React Query hooks — per BUILD_RULES §8.3.
 * CRUD queries + mutations for treatment plan feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { TreatmentPlanQuery } from '@dento/shared';

// ── Types ───────────────────────────────────────────────────

export interface RequiredImaging {
  type: 'xray' | 'cbct' | 'panoramic' | 'periapical' | 'bitewing';
  status: 'pending' | 'fulfilled' | 'waived';
  fulfilledByXrayId?: string | null;
  fulfilledByCbctId?: string | null;
  notes?: string | null;
}

export interface TreatmentPlanMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface TreatmentPlanItem {
  _id: string;
  serviceId?: string;
  toothNumber?: string;
  surface?: string;
  procedureName: string;
  description?: string;
  cost: number;
  sequenceOrder: number;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  appointmentId?: string;
  completedAt?: string | null;
  linkedXrays: string[];
  linkedCbcts: string[];
  requiredImaging: RequiredImaging[];
  materials: TreatmentPlanMaterial[];
  notes?: string;
  // Phase 7.1 — billed sync from invoice generation
  billedAmount?: number;
  billedInvoiceId?: string | null;
  // Phase 9.4 — per-item doctor assignment (overrides plan-level)
  assignedDoctorId?: string | null;
  // Phase 7.2 — link to the procedure note opened for this item
  procedureNoteId?: string | null;
}

export interface TreatmentPlan {
  _id: string;
  patientId: string;
  doctorId: string;
  title: string;
  description?: string;
  status: string;
  items: TreatmentPlanItem[];
  linkedXrays: string[];
  linkedCbcts: string[];
  totalCost: number;
  discountType?: 'percentage' | 'fixed';
  discountValue: number;
  finalCost: number;
  patientSignature?: string;
  signedAt?: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlanListResponse {
  success: true;
  data: {
    plans: TreatmentPlan[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

interface PlanDetailResponse {
  success: true;
  data: { plan: TreatmentPlan };
}

// ── Queries ─────────────────────────────────────────────────

export function useTreatmentPlanList(query: Partial<TreatmentPlanQuery>) {
  return useQuery({
    queryKey: ['treatment-plans', query],
    queryFn: () =>
      apiClient.get<PlanListResponse>('/api/treatment-plans', {
        params: query as Record<string, string | number>,
      }),
    select: (res) => res.data,
  });
}

export function useTreatmentPlanDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['treatment-plans', id],
    queryFn: () => apiClient.get<PlanDetailResponse>(`/api/treatment-plans/${id!}`),
    enabled: !!id,
    select: (res) => res.data.plan,
  });
}

// ── Mutations ───────────────────────────────────────────────

export function useCreateTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<PlanDetailResponse>('/api/treatment-plans', data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
  });
}

export function useUpdateTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<PlanDetailResponse>(`/api/treatment-plans/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
  });
}

export function useDeleteTreatmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<unknown>(`/api/treatment-plans/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
  });
}

export function useUpdateTreatmentPlanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      patientSignature,
    }: {
      id: string;
      status: string;
      patientSignature?: string;
    }) =>
      apiClient.patch<PlanDetailResponse>(`/api/treatment-plans/${id}/status`, {
        status,
        ...(patientSignature && { patientSignature }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
  });
}

export function useAddTreatmentPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, item }: { planId: string; item: Record<string, unknown> }) =>
      apiClient.post<PlanDetailResponse>(`/api/treatment-plans/${planId}/items`, item),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
  });
}

export function useRemoveTreatmentPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, itemId }: { planId: string; itemId: string }) =>
      apiClient.delete<unknown>(`/api/treatment-plans/${planId}/items/${itemId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
  });
}

export function useUpdateTreatmentPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      itemId,
      data,
    }: {
      planId: string;
      itemId: string;
      data: Partial<TreatmentPlanItem>;
    }) => apiClient.put<PlanDetailResponse>(`/api/treatment-plans/${planId}/items/${itemId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
  });
}

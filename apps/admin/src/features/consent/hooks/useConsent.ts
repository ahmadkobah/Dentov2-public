/**
 * useConsent — React Query hooks for Consent Templates + Consent Forms.
 *
 * Endpoints per consent-templates.route.ts:
 *   GET    /api/consent-templates       — List
 *   GET    /api/consent-templates/:id   — Get by ID
 *   POST   /api/consent-templates       — Create
 *   PUT    /api/consent-templates/:id   — Update
 *   DELETE /api/consent-templates/:id   — Soft-delete (deactivate)
 *
 * Endpoints per consent-forms.route.ts:
 *   GET    /api/consent-forms              — List
 *   GET    /api/consent-forms/:id          — Get by ID
 *   POST   /api/consent-forms              — Create (sign)
 *   GET    /api/consent-forms/patient/:pid — Get by patient
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface Bilingual {
  en: string;
  ar: string;
}

export interface ConsentTemplate {
  _id: string;
  name: Bilingual;
  procedureType: string;
  content: Bilingual;
  risks: Bilingual;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentForm {
  _id: string;
  templateId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  treatmentPlanId?: string;
  patientSignature: string;
  witnessSignature?: string;
  signedAt: string;
  pdfUrl?: string;
  createdAt: string;
  // Populated fields
  template?: {
    _id: string;
    name: Bilingual;
    procedureType: string;
    content?: Bilingual;
    risks?: Bilingual;
  };
  patient?: {
    _id: string;
    firstName: { en: string; ar?: string };
    lastName: { en: string; ar?: string };
    patientCode?: string;
    phone?: string;
  };
  doctor?: { _id: string; firstName: string; lastName: string };
}

export interface ConsentTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  procedureType?: string;
  isActive?: string; // 'true' | 'false'
  sortBy?: string;
  sortOrder?: string;
}

export interface ConsentFormFilters {
  page?: number;
  limit?: number;
  patientId?: string;
  doctorId?: string;
  treatmentPlanId?: string;
  templateId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateConsentTemplateInput {
  name: Bilingual;
  procedureType: string;
  content: Bilingual;
  risks?: Bilingual;
  isActive?: boolean;
}

export interface CreateConsentFormInput {
  templateId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  treatmentPlanId?: string;
  patientSignature: string;
  witnessSignature?: string;
  signedAt: string;
}

// ── Response Types ─────────────────────────────────────────

interface TemplateListResponse {
  success: true;
  data: { templates: ConsentTemplate[]; pagination: PaginationMeta };
}

interface TemplateResponse {
  success: true;
  data: { template: ConsentTemplate };
}

interface FormListResponse {
  success: true;
  data: { forms: ConsentForm[]; pagination: PaginationMeta };
}

interface FormResponse {
  success: true;
  data: { form: ConsentForm };
}

interface FormsByPatientResponse {
  success: true;
  data: { forms: ConsentForm[] };
}

// ── Query Keys ─────────────────────────────────────────────

export const consentKeys = {
  all: ['consent'] as const,
  // Templates
  templates: () => [...consentKeys.all, 'templates'] as const,
  templateList: (f: ConsentTemplateFilters) => [...consentKeys.templates(), f] as const,
  templateDetail: (id: string) => [...consentKeys.templates(), id] as const,
  // Forms
  forms: () => [...consentKeys.all, 'forms'] as const,
  formList: (f: ConsentFormFilters) => [...consentKeys.forms(), f] as const,
  formDetail: (id: string) => [...consentKeys.forms(), id] as const,
  formsByPatient: (pid: string) => [...consentKeys.forms(), 'patient', pid] as const,
};

// ── Template Queries ───────────────────────────────────────

export function useConsentTemplateList(filters: ConsentTemplateFilters = {}) {
  return useQuery({
    queryKey: consentKeys.templateList(filters),
    queryFn: () =>
      apiClient.get<TemplateListResponse>('/api/consent-templates', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.templates,
      meta: res.data.pagination,
    }),
  });
}

export function useConsentTemplateDetail(id: string) {
  return useQuery({
    queryKey: consentKeys.templateDetail(id),
    queryFn: () => apiClient.get<TemplateResponse>(`/api/consent-templates/${id}`),
    select: (res) => res.data.template,
    enabled: !!id,
  });
}

// ── Template Mutations ─────────────────────────────────────

export function useCreateConsentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConsentTemplateInput) =>
      apiClient.post<TemplateResponse>('/api/consent-templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentKeys.templates() });
      toast.success('Consent template created');
    },
    onError: () => {
      toast.error('Failed to create consent template');
    },
  });
}

export function useUpdateConsentTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateConsentTemplateInput>) =>
      apiClient.put<TemplateResponse>(`/api/consent-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentKeys.templates() });
      qc.invalidateQueries({ queryKey: consentKeys.templateDetail(id) });
      toast.success('Consent template updated');
    },
    onError: () => {
      toast.error('Failed to update consent template');
    },
  });
}

export function useDeleteConsentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ message: string }>>(`/api/consent-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentKeys.templates() });
      toast.success('Consent template deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate consent template');
    },
  });
}

// ── Form Queries ───────────────────────────────────────────

export function useConsentFormList(filters: ConsentFormFilters = {}) {
  return useQuery({
    queryKey: consentKeys.formList(filters),
    queryFn: () =>
      apiClient.get<FormListResponse>('/api/consent-forms', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.forms,
      meta: res.data.pagination,
    }),
  });
}

export function useConsentFormDetail(id: string) {
  return useQuery({
    queryKey: consentKeys.formDetail(id),
    queryFn: () => apiClient.get<FormResponse>(`/api/consent-forms/${id}`),
    select: (res) => res.data.form,
    enabled: !!id,
  });
}

export function useConsentFormsByPatient(patientId: string) {
  return useQuery({
    queryKey: consentKeys.formsByPatient(patientId),
    queryFn: () => apiClient.get<FormsByPatientResponse>(`/api/consent-forms/patient/${patientId}`),
    select: (res) => res.data.forms,
    enabled: !!patientId,
  });
}

// ── Form Mutations ─────────────────────────────────────────

export function useCreateConsentForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConsentFormInput) =>
      apiClient.post<FormResponse>('/api/consent-forms', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentKeys.forms() });
      toast.success('Consent form signed');
    },
    onError: () => {
      toast.error('Failed to create consent form');
    },
  });
}

export function useUpdateConsentPdfUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pdfUrl }: { id: string; pdfUrl: string }) =>
      apiClient.patch<FormResponse>(`/api/consent-forms/${id}/pdf-url`, { pdfUrl }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: consentKeys.forms() });
      qc.invalidateQueries({ queryKey: consentKeys.formDetail(vars.id) });
    },
  });
}

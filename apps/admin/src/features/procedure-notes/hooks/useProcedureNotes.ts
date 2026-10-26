/**
 * Procedure Note React Query hooks — per BUILD_RULES §8.3.
 * CRUD queries + mutations for procedure notes + templates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ProcedureNoteQuery, ProcedureNoteTemplateQuery } from '@dento/shared';

// ── Types ───────────────────────────────────────────────────

export interface ProcedureNote {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  treatmentPlanId?: string;
  treatmentPlanItemId?: string;
  templateId?: string;
  procedureName: string;
  teethInvolved?: string;
  procedurePerformed?: string;
  materialsUsed?: string;
  anesthesiaUsed?: string;
  complications?: string;
  postOpInstructions?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  linkedXrays: string[];
  linkedCbcts: string[];
  preOpXrays: string[];
  postOpXrays: string[];
  teethDetails?: Record<string, unknown> | null;
  attachments: Array<{ _id?: string; name: string; url: string; type?: string }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureNoteTemplate {
  _id: string;
  name: { en: string; ar: string };
  procedureType: string;
  templateContent?: string;
  fields?: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface NoteListResponse {
  success: true;
  data: {
    notes: ProcedureNote[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

interface NoteDetailResponse {
  success: true;
  data: { note: ProcedureNote };
}

interface TemplateListResponse {
  success: true;
  data: {
    templates: ProcedureNoteTemplate[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

interface TemplateDetailResponse {
  success: true;
  data: { template: ProcedureNoteTemplate };
}

// ── Note Queries ────────────────────────────────────────────

export function useProcedureNoteList(query: Partial<ProcedureNoteQuery>) {
  return useQuery({
    queryKey: ['procedure-notes', query],
    queryFn: () =>
      apiClient.get<NoteListResponse>('/api/procedure-notes', {
        params: query as Record<string, string | number>,
      }),
    select: (res) => res.data,
  });
}

export function useProcedureNoteDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['procedure-notes', id],
    queryFn: () => apiClient.get<NoteDetailResponse>(`/api/procedure-notes/${id!}`),
    enabled: !!id,
    select: (res) => res.data.note,
  });
}

// ── Note Mutations ──────────────────────────────────────────

export function useCreateProcedureNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<NoteDetailResponse>('/api/procedure-notes', data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procedure-notes'] });
    },
  });
}

export function useUpdateProcedureNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<NoteDetailResponse>(`/api/procedure-notes/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procedure-notes'] });
    },
  });
}

export function useDeleteProcedureNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<unknown>(`/api/procedure-notes/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procedure-notes'] });
    },
  });
}

// ── Template Queries ────────────────────────────────────────

export function useProcedureNoteTemplateList(query: Partial<ProcedureNoteTemplateQuery>) {
  return useQuery({
    queryKey: ['procedure-note-templates', query],
    queryFn: () =>
      apiClient.get<TemplateListResponse>('/api/procedure-notes/templates', {
        params: query as Record<string, string>,
      }),
    select: (res) => res.data,
  });
}

// ── Template Mutations ──────────────────────────────────────

export function useCreateProcedureNoteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<TemplateDetailResponse>('/api/procedure-notes/templates', data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procedure-note-templates'] });
    },
  });
}

export function useUpdateProcedureNoteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<TemplateDetailResponse>(`/api/procedure-notes/templates/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procedure-note-templates'] });
    },
  });
}

export function useDeleteProcedureNoteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<unknown>(`/api/procedure-notes/templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procedure-note-templates'] });
    },
  });
}

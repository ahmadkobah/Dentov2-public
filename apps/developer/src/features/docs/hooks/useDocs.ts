import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
// ── Types ───────────────────────────────────────────────────

export interface PlatformDoc {
  _id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  order: number;
  isPublished: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocFilters {
  category?: string;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateDocInput {
  title: string;
  slug: string;
  content: string;
  category: string;
  order?: number;
  isPublished?: boolean;
}

export interface UpdateDocInput {
  title?: string;
  slug?: string;
  content?: string;
  category?: string;
  order?: number;
  isPublished?: boolean;
}

// ── Response Types ──────────────────────────────────────────

interface DocListResponse {
  success: boolean;
  data: PlatformDoc[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface DocDetailResponse {
  success: boolean;
  data: PlatformDoc;
}

// ── Query Key Factory ───────────────────────────────────────

export const docsKeys = {
  all: ['platform-docs'] as const,
  list: (filters: DocFilters) => [...docsKeys.all, 'list', filters] as const,
  detail: (id: string) => [...docsKeys.all, 'detail', id] as const,
};

// ── Queries ─────────────────────────────────────────────────

export function usePlatformDocs(filters: DocFilters = {}) {
  return useQuery({
    queryKey: docsKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.isPublished !== undefined) params.set('isPublished', String(filters.isPublished));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return apiClient.get<DocListResponse>(`/api/platform/docs${qs ? `?${qs}` : ''}`);
    },
    select: (res) => ({ docs: res.data as PlatformDoc[], pagination: res.meta }),
  });
}

export function usePlatformDoc(id: string | null) {
  return useQuery({
    queryKey: docsKeys.detail(id!),
    queryFn: () => apiClient.get<DocDetailResponse>(`/api/platform/docs/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

// ── Mutations ───────────────────────────────────────────────

export function useCreateDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDocInput) =>
      apiClient.post<DocDetailResponse>('/api/platform/docs', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docsKeys.all });
      toast.success('Document created');
    },
    onError: () => {
      toast.error('Failed to create document');
    },
  });
}

export function useUpdateDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateDocInput & { id: string }) =>
      apiClient.patch<DocDetailResponse>(`/api/platform/docs/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docsKeys.all });
      toast.success('Document updated');
    },
    onError: () => {
      toast.error('Failed to update document');
    },
  });
}

export function useDeleteDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/docs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docsKeys.all });
      toast.success('Document deleted');
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';

// ── Types ───────────────────────────────────────────────────

export interface Doc {
  _id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface DocListResponse {
  success: boolean;
  data: Doc[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface DocDetailResponse {
  success: boolean;
  data: Doc;
}

// ── Query Keys ──────────────────────────────────────────────

export const docsKeys = {
  all: ['docs'] as const,
  list: (category?: string) => [...docsKeys.all, 'list', category] as const,
  detail: (slug: string) => [...docsKeys.all, 'detail', slug] as const,
};

// ── Queries ─────────────────────────────────────────────────

export function useDocs(category?: string) {
  return useQuery({
    queryKey: docsKeys.list(category),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      params.set('limit', '100');
      const qs = params.toString();
      return apiClient.get<DocListResponse>(`/api/docs${qs ? `?${qs}` : ''}`);
    },
    select: (res) => res.data as Doc[],
  });
}

export function useDoc(slug: string | null) {
  return useQuery({
    queryKey: docsKeys.detail(slug!),
    queryFn: () => apiClient.get<DocDetailResponse>(`/api/docs/${slug}`),
    select: (res) => res.data,
    enabled: !!slug,
  });
}

// ── Docs Config ─────────────────────────────────────────────

export interface DocsConfig {
  headerLogo: string;
  headerTitle: string;
  footerSupportEmail: string;
  footerSupportPhone: string;
  footerCopyrightText: string;
  footerPlatformVersion: string;
}

interface DocsConfigResponse {
  success: boolean;
  data: DocsConfig;
}

export function useDocsConfig() {
  return useQuery({
    queryKey: [...docsKeys.all, 'config'] as const,
    queryFn: () => apiClient.get<DocsConfigResponse>('/api/docs/config'),
    select: (res) => res.data,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

// ── Types ───────────────────────────────────────────────────

export interface Language {
  _id: string;
  code: string;
  name: { en: string; ar?: string };
  direction: 'ltr' | 'rtl';
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationPack {
  _id: string;
  locale: 'en' | 'ar';
  namespace: string;
  translations: Record<string, string>;
  version: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
}

interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// ── Query Keys ──────────────────────────────────────────────

export const languageKeys = {
  all: ['platform', 'languages'] as const,
  list: () => [...languageKeys.all, 'list'] as const,
};

export const translationKeys = {
  all: ['platform', 'translations'] as const,
  list: (filters?: { locale?: string; namespace?: string }) =>
    [...translationKeys.all, 'list', filters] as const,
  detail: (id: string) => [...translationKeys.all, 'detail', id] as const,
};

// ── Language Queries ────────────────────────────────────────

export function useLanguages() {
  return useQuery({
    queryKey: languageKeys.list(),
    queryFn: () => apiClient.get<ListResponse<Language>>('/api/platform/languages'),
    select: (res) => res.data,
  });
}

export function useCreateLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Language, '_id' | 'createdAt' | 'updatedAt'>) =>
      apiClient.post<SingleResponse<Language>>('/api/platform/languages', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: languageKeys.all });
      toast.success('Language created');
    },
    onError: () => toast.error('Failed to create language'),
  });
}

export function useUpdateLanguage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Language>) =>
      apiClient.patch<SingleResponse<Language>>(`/api/platform/languages/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: languageKeys.all });
      toast.success('Language updated');
    },
    onError: () => toast.error('Failed to update language'),
  });
}

// ── Translation Pack Queries ────────────────────────────────

export function useTranslationPacks(filters?: { locale?: string; namespace?: string }) {
  return useQuery({
    queryKey: translationKeys.list(filters),
    queryFn: () =>
      apiClient.get<ListResponse<TranslationPack>>('/api/platform/translations', {
        params: filters,
      }),
    select: (res) => res.data,
  });
}

export function useTranslationPack(id: string) {
  return useQuery({
    queryKey: translationKeys.detail(id),
    queryFn: () =>
      apiClient.get<SingleResponse<TranslationPack>>(`/api/platform/translations/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateTranslationPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      locale: string;
      namespace: string;
      translations: Record<string, string>;
    }) => apiClient.post<SingleResponse<TranslationPack>>('/api/platform/translations', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: translationKeys.all });
      toast.success('Translation pack created');
    },
    onError: () => toast.error('Failed to create translation pack'),
  });
}

export function useUpdateTranslationPack(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { translations?: Record<string, string>; isActive?: boolean }) =>
      apiClient.patch<SingleResponse<TranslationPack>>(`/api/platform/translations/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: translationKeys.all });
      toast.success('Translation pack updated');
    },
    onError: () => toast.error('Failed to update translation pack'),
  });
}

export function useDeleteTranslationPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/translations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: translationKeys.all });
      toast.success('Translation pack deleted');
    },
    onError: () => toast.error('Failed to delete translation pack'),
  });
}

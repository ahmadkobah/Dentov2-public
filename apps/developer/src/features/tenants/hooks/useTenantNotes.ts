import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

export interface TenantNote {
  _id: string;
  tenantSlug: string;
  authorName: string;
  source: 'platform' | 'tenant';
  content: string;
  createdAt: string;
}

interface NotesResponse {
  data: TenantNote[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const noteKeys = {
  all: (slug: string) => ['tenant-notes', slug] as const,
};

export function useTenantNotes(tenantSlug: string | undefined, page = 1) {
  return useQuery({
    queryKey: [...noteKeys.all(tenantSlug!), page],
    queryFn: () =>
      apiClient.get<NotesResponse>(`/api/platform/tenant-notes/${tenantSlug}`, {
        params: { page, limit: 20 },
      }),
    enabled: !!tenantSlug,
  });
}

export function useCreateTenantNote(tenantSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/api/platform/tenant-notes/${tenantSlug}`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all(tenantSlug!) });
      toast.success('Note added');
    },
    onError: () => {
      toast.error('Failed to add note');
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';

export interface PlatformNote {
  _id: string;
  authorName: string;
  source: 'platform' | 'tenant';
  content: string;
  createdAt: string;
}

interface NotesResponse {
  data: PlatformNote[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const noteKeys = {
  all: ['platform-notes'] as const,
  list: (page: number) => [...noteKeys.all, page] as const,
};

export function usePlatformNotes(page = 1) {
  return useQuery({
    queryKey: noteKeys.list(page),
    queryFn: () =>
      apiClient.get<NotesResponse>('/api/platform-notes', {
        params: { page, limit: 20 },
      }),
  });
}

export function useCreatePlatformNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => apiClient.post('/api/platform-notes', { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all });
      toast.success('Note sent to platform');
    },
    onError: () => {
      toast.error('Failed to send note');
    },
  });
}

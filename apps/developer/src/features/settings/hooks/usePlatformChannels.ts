import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PlatformChannelConfig {
  enabled: boolean;
  provider?: string;
  [key: string]: unknown;
}

export interface PlatformChannels {
  email: PlatformChannelConfig;
  sms: PlatformChannelConfig;
  whatsapp: PlatformChannelConfig;
  push: PlatformChannelConfig;
}

interface PlatformChannelsResponse {
  success: boolean;
  data: PlatformChannels;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const platformChannelKeys = {
  all: ['platform-channels'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function usePlatformChannels() {
  return useQuery({
    queryKey: platformChannelKeys.all,
    queryFn: () => apiClient.get<PlatformChannelsResponse>('/api/platform/settings/channels'),
    select: (res) => res.data,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useUpdatePlatformChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channel, config }: { channel: string; config: Record<string, unknown> }) =>
      apiClient.patch(`/api/platform/settings/channels/${channel}`, config),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: platformChannelKeys.all });
      toast.success(`${variables.channel} configuration saved`);
    },
    onError: () => {
      toast.error('Failed to save channel configuration');
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChannelConfig {
  useCustom: boolean;
  [key: string]: unknown;
}

export interface ProviderConfigs {
  email?: ChannelConfig;
  sms?: ChannelConfig;
  whatsapp?: ChannelConfig;
  push?: ChannelConfig;
}

interface ProviderConfigResponse {
  success: boolean;
  data: { providers: ProviderConfigs };
}

interface ChannelConfigResponse {
  success: boolean;
  data: { channel: string; config: ChannelConfig };
}

interface TestResponse {
  success: boolean;
  message: string;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const providerKeys = {
  all: (tenantSlug: string) => ['providers', tenantSlug] as const,
  channel: (tenantSlug: string, channel: string) =>
    [...providerKeys.all(tenantSlug), channel] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useTenantProviders(tenantSlug: string) {
  return useQuery({
    queryKey: providerKeys.all(tenantSlug),
    queryFn: () =>
      apiClient.get<ProviderConfigResponse>(`/api/tenant-settings/providers`, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      }),
    select: (res) => res.data.providers,
    enabled: !!tenantSlug,
  });
}

export function useTenantProviderChannel(tenantSlug: string, channel: string) {
  return useQuery({
    queryKey: providerKeys.channel(tenantSlug, channel),
    queryFn: () =>
      apiClient.get<ChannelConfigResponse>(`/api/tenant-settings/providers/${channel}`, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      }),
    select: (res) => res.data.config,
    enabled: !!tenantSlug && !!channel,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useUpdateTenantProvider(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channel, config }: { channel: string; config: Record<string, unknown> }) =>
      apiClient.patch(`/api/tenant-settings/providers/${channel}`, config, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: providerKeys.all(tenantSlug) });
      qc.invalidateQueries({
        queryKey: providerKeys.channel(tenantSlug, variables.channel),
      });
      toast.success(`${variables.channel} configuration saved`);
    },
    onError: () => {
      toast.error('Failed to save provider configuration');
    },
  });
}

export function useTestTenantProvider(tenantSlug: string) {
  return useMutation({
    mutationFn: ({ channel, testData }: { channel: string; testData?: Record<string, unknown> }) =>
      apiClient.post<TestResponse>(
        `/api/tenant-settings/providers/${channel}/test`,
        testData ?? {},
        {
          headers: { 'X-Tenant-Slug': tenantSlug },
        },
      ),
    onSuccess: (_data, variables) => {
      toast.success(`${variables.channel} test sent successfully`);
    },
    onError: () => {
      toast.error('Test failed — check credentials');
    },
  });
}

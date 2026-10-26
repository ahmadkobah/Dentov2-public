import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationMeta } from '@dento/shared';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';
export type BackupType = 'scheduled' | 'manual' | 'pre-migration' | 'pre-delete';

export interface Backup {
  _id: string;
  tenantSlug: string;
  status: BackupStatus;
  type: BackupType;
  fileSize: number;
  filePath?: string;
  checksum?: string;
  retentionDays: number;
  encrypted: boolean;
  error?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

export interface BackupFilters {
  tenantSlug?: string;
  status?: BackupStatus;
  type?: BackupType;
  page?: number;
  limit?: number;
}

export interface BackupStats {
  overview: {
    totalBackups: number;
    completedBackups: number;
    failedBackups: number;
    totalStorageBytes: number;
  };
  latestBackup: Backup | null;
  byTenant: Array<{
    _id: string;
    count: number;
    totalSize: number;
    latestBackup: string;
  }>;
}

export interface BackupConfig {
  _id: string;
  scheduleEnabled: boolean;
  scheduleCron: string;
  retentionDays: number;
  encryptionEnabled: boolean;
  storageProvider: 's3' | 'r2';
  bucket: string;
  region: string;
  maxBackupSizeGB: number;
  notifyOnFailure: boolean;
  notifyEmail: string | null;
  lastBackupAt?: string;
  lastRestoreTestAt?: string;
  updatedAt: string;
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';
export type BackupGroup =
  | 'clinical'
  | 'appointments'
  | 'imaging'
  | 'financial'
  | 'inventory'
  | 'lab'
  | 'medications'
  | 'hr'
  | 'communications'
  | 'automation'
  | 'settings';

export interface TenantBackupConfig {
  _id: string;
  tenantSlug: string;
  backupEnabled: boolean;
  frequency: BackupFrequency;
  hour: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  retentionDays: number;
  excludeGroups: BackupGroup[];
  autoBackupOnMigration: boolean;
  autoBackupOnDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const backupKeys = {
  all: ['backups'] as const,
  lists: () => [...backupKeys.all, 'list'] as const,
  list: (filters: BackupFilters) => [...backupKeys.lists(), filters] as const,
  details: () => [...backupKeys.all, 'detail'] as const,
  detail: (id: string) => [...backupKeys.details(), id] as const,
  stats: () => [...backupKeys.all, 'stats'] as const,
  config: () => [...backupKeys.all, 'config'] as const,
  tenantConfigs: () => [...backupKeys.all, 'tenant-configs'] as const,
  tenantConfig: (slug: string) => [...backupKeys.all, 'tenant-config', slug] as const,
};

/* ------------------------------------------------------------------ */
/*  API Response Envelopes                                             */
/* ------------------------------------------------------------------ */

interface BackupListResponse {
  success: boolean;
  data: Backup[];
  meta: PaginationMeta;
}

interface BackupDetailResponse {
  success: boolean;
  data: Backup;
}

interface BackupStatsResponse {
  success: boolean;
  data: BackupStats;
}

interface BackupConfigResponse {
  success: boolean;
  data: BackupConfig;
}

interface TenantBackupConfigListResponse {
  success: boolean;
  data: TenantBackupConfig[];
}

interface TenantBackupConfigResponse {
  success: boolean;
  data: TenantBackupConfig;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useBackups(filters: BackupFilters = {}) {
  return useQuery({
    queryKey: backupKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.tenantSlug) params.set('tenantSlug', filters.tenantSlug);
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return apiClient.get<BackupListResponse>(`/api/backups${qs ? `?${qs}` : ''}`);
    },
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useBackupDetail(id: string | null) {
  return useQuery({
    queryKey: backupKeys.detail(id ?? ''),
    queryFn: () => apiClient.get<BackupDetailResponse>(`/api/backups/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useBackupStats(tenantSlug?: string) {
  return useQuery({
    queryKey: backupKeys.stats(),
    queryFn: () => {
      const qs = tenantSlug ? `?tenantSlug=${tenantSlug}` : '';
      return apiClient.get<BackupStatsResponse>(`/api/backups/stats/summary${qs}`);
    },
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

export function useBackupConfig() {
  return useQuery({
    queryKey: backupKeys.config(),
    queryFn: () => apiClient.get<BackupConfigResponse>('/api/backups/config'),
    select: (res) => res.data,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useTriggerBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tenantSlug: string; type?: BackupType; retentionDays?: number }) =>
      apiClient.post<Backup>('/api/backups', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.lists() });
      qc.invalidateQueries({ queryKey: backupKeys.stats() });
      toast.success('Backup triggered');
    },
    onError: () => {
      toast.error('Failed to trigger backup');
    },
  });
}

export function useRestoreBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<{ message: string }>(`/api/backups/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.lists() });
      toast.success('Backup restore initiated');
    },
    onError: () => {
      toast.error('Failed to restore backup');
    },
  });
}

export function useUpdateRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, retentionDays }: { id: string; retentionDays: number }) =>
      apiClient.patch<Backup>(`/api/backups/${id}/retention`, { retentionDays }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.lists() });
      toast.success('Retention policy updated');
    },
    onError: () => {
      toast.error('Failed to update retention');
    },
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/backups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.lists() });
      qc.invalidateQueries({ queryKey: backupKeys.stats() });
      toast.success('Backup deleted');
    },
    onError: () => {
      toast.error('Failed to delete backup');
    },
  });
}

export function useUpdateBackupConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<Omit<BackupConfig, '_id' | 'updatedAt'>>) =>
      apiClient.put<BackupConfig>('/api/backups/config', config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.config() });
      toast.success('Backup config updated');
    },
    onError: () => {
      toast.error('Failed to update backup config');
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Per-Tenant Backup Config                                           */
/* ------------------------------------------------------------------ */

export function useTenantBackupConfigs() {
  return useQuery({
    queryKey: backupKeys.tenantConfigs(),
    queryFn: () => apiClient.get<TenantBackupConfigListResponse>('/api/backups/tenant-config'),
    select: (res) => res.data,
  });
}

export function useTenantBackupConfig(tenantSlug: string | null) {
  return useQuery({
    queryKey: backupKeys.tenantConfig(tenantSlug ?? ''),
    queryFn: () =>
      apiClient.get<TenantBackupConfigResponse>(`/api/backups/tenant-config/${tenantSlug}`),
    select: (res) => res.data,
    enabled: !!tenantSlug,
  });
}

export function useCreateTenantBackupConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      tenantSlug: string;
      backupEnabled?: boolean;
      frequency?: BackupFrequency;
      hour?: number;
      dayOfWeek?: number | null;
      dayOfMonth?: number | null;
      retentionDays?: number;
      excludeGroups?: BackupGroup[];
      autoBackupOnMigration?: boolean;
      autoBackupOnDelete?: boolean;
    }) => apiClient.post<TenantBackupConfig>('/api/backups/tenant-config', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.tenantConfigs() });
      toast.success('Tenant backup config created');
    },
    onError: () => {
      toast.error('Failed to create tenant backup config');
    },
  });
}

export function useUpdateTenantBackupConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantSlug,
      ...data
    }: {
      tenantSlug: string;
      backupEnabled?: boolean;
      frequency?: BackupFrequency;
      hour?: number;
      dayOfWeek?: number | null;
      dayOfMonth?: number | null;
      retentionDays?: number;
      excludeGroups?: BackupGroup[];
      autoBackupOnMigration?: boolean;
      autoBackupOnDelete?: boolean;
    }) => apiClient.patch<TenantBackupConfig>(`/api/backups/tenant-config/${tenantSlug}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: backupKeys.tenantConfigs() });
      qc.invalidateQueries({ queryKey: backupKeys.tenantConfig(vars.tenantSlug) });
      toast.success('Tenant backup config updated');
    },
    onError: () => {
      toast.error('Failed to update tenant backup config');
    },
  });
}

export function useDeleteTenantBackupConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantSlug: string) =>
      apiClient.delete(`/api/backups/tenant-config/${tenantSlug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.tenantConfigs() });
      toast.success('Tenant backup config deleted');
    },
    onError: () => {
      toast.error('Failed to delete tenant backup config');
    },
  });
}

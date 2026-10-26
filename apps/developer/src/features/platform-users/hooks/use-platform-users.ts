import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type { PlatformRole, PlatformPermissionOverride, PaginationMeta } from '@dento/shared';

// ── Types ──────────────────────────────────────────────────

export interface PlatformUserProfile {
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  phone?: string;
}

export interface PlatformUser {
  _id: string;
  email: string;
  profile: PlatformUserProfile;
  platformRole: PlatformRole;
  platformPermissionOverrides?: PlatformPermissionOverride[];
  status: 'invited' | 'pending_activation' | 'active' | 'suspended' | 'deactivated';
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  invitedBy?: string;
  invitedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PlatformUserFilters {
  page?: number;
  limit?: number;
  search?: string;
  platformRole?: PlatformRole;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvitePlatformUserData {
  email: string;
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  platformRole: 'platform_admin' | 'platform_viewer';
}

export interface CreatePlatformUserData {
  email: string;
  password: string;
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  phone?: string;
  platformRole: 'platform_owner' | 'platform_admin' | 'platform_viewer';
}

// ── Response Types ─────────────────────────────────────────

interface ListResponse {
  success: true;
  data: PlatformUser[];
  meta: PaginationMeta;
}

interface SingleResponse {
  success: true;
  data: PlatformUser;
  message?: string;
}

interface InviteResponse {
  success: true;
  data: {
    id: string;
    email: string;
    platformRole: PlatformRole;
    status: string;
    invitedAt: string;
    inviteExpiresAt: string;
    inviteToken: string;
  };
  message?: string;
}

interface MessageResponse {
  success: true;
  data: unknown;
  message?: string;
}

// ── Query Keys ─────────────────────────────────────────────

export const platformUserKeys = {
  all: ['platform-users'] as const,
  lists: () => [...platformUserKeys.all, 'list'] as const,
  list: (filters: PlatformUserFilters) => [...platformUserKeys.lists(), filters] as const,
  details: () => [...platformUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...platformUserKeys.details(), id] as const,
};

// ── Queries ────────────────────────────────────────────────

export function usePlatformUserList(filters: PlatformUserFilters = {}) {
  return useQuery({
    queryKey: platformUserKeys.list(filters),
    queryFn: () =>
      apiClient.get<ListResponse>('/api/platform/users', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function usePlatformUserDetail(id: string) {
  return useQuery({
    queryKey: platformUserKeys.detail(id),
    queryFn: () => apiClient.get<SingleResponse>(`/api/platform/users/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlatformUserData) =>
      apiClient.post<SingleResponse>('/api/platform/users/create', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
    },
  });
}

export function useInvitePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvitePlatformUserData) =>
      apiClient.post<InviteResponse>('/api/platform/users/invite', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      toast.success('Invitation sent');
    },
    onError: () => {
      toast.error('Failed to send invitation');
    },
  });
}

export function useUpdatePlatformUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      platformRole?: PlatformRole;
      status?: string;
      firstName?: { en: string; ar?: string };
      lastName?: { en: string; ar?: string };
      phone?: string;
    }) => apiClient.patch<SingleResponse>(`/api/platform/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      qc.invalidateQueries({ queryKey: platformUserKeys.detail(id) });
      toast.success('User updated');
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });
}

export function useUpdatePlatformPermissions(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { platformPermissionOverrides: PlatformPermissionOverride[] }) =>
      apiClient.patch<SingleResponse>(`/api/platform/users/${id}/permissions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      qc.invalidateQueries({ queryKey: platformUserKeys.detail(id) });
      toast.success('Permissions updated');
    },
    onError: () => {
      toast.error('Failed to update permissions');
    },
  });
}

export function useUpdatePlatformUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch<SingleResponse>(`/api/platform/users/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      toast.success('User status updated');
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });
}

export function useDeletePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<MessageResponse>(`/api/platform/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      toast.success('User deleted');
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });
}

export function useResendPlatformInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<MessageResponse>(`/api/platform/users/${id}/resend-invite`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      toast.success('Invite resent');
    },
    onError: () => {
      toast.error('Failed to resend invite');
    },
  });
}

export function useRevokePlatformInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<MessageResponse>(`/api/platform/users/${id}/revoke-invite`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformUserKeys.lists() });
      toast.success('Invite revoked');
    },
    onError: () => {
      toast.error('Failed to revoke invite');
    },
  });
}

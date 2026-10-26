import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type { PaginationMeta } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TenantUserProfile {
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface TenantUser {
  _id: string;
  email: string;
  profile: TenantUserProfile;
  role: string;
  status: 'invited' | 'pending_activation' | 'active' | 'suspended' | 'deactivated';
  lastLoginAt: string | null;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export interface TenantUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

interface TenantUsersResponse {
  success: boolean;
  data: TenantUser[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const tenantUserKeys = {
  all: (tenantId: string) => ['tenants', tenantId, 'users'] as const,
  list: (tenantId: string, filters: TenantUsersFilters) =>
    [...tenantUserKeys.all(tenantId), filters] as const,
};

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useTenantUsers(tenantId: string, filters: TenantUsersFilters = {}) {
  return useQuery({
    queryKey: tenantUserKeys.list(tenantId, filters),
    queryFn: () =>
      apiClient.get<TenantUsersResponse>(`/api/platform/tenants/${tenantId}/users`, {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ users: res.data, meta: res.meta }),
    enabled: !!tenantId,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useResetTenantUserPassword(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/platform/tenants/${tenantId}/users/${userId}/reset-password`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantUserKeys.all(tenantId) });
      toast.success('Password reset email sent');
    },
    onError: () => {
      toast.error('Failed to send password reset email');
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Edit tenant user                                                   */
/* ------------------------------------------------------------------ */

export interface EditTenantUserData {
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  phone?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  role?: string;
}

export function useEditTenantUser(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: EditTenantUserData }) =>
      apiClient.put(`/api/platform/tenants/${tenantId}/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantUserKeys.all(tenantId) });
      toast.success('User updated');
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Direct-create tenant user (skip invite)                            */
/* ------------------------------------------------------------------ */

export interface DirectCreateUserData {
  email: string;
  password: string;
  role: string;
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  phone?: string;
}

export function useResetTenantUser2FA(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/platform/tenants/${tenantId}/users/${userId}/reset-2fa`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantUserKeys.all(tenantId) });
      toast.success('2FA reset successfully');
    },
    onError: () => {
      toast.error('Failed to reset 2FA');
    },
  });
}

export function useDirectCreateTenantUser(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DirectCreateUserData) =>
      apiClient.post(`/api/platform/tenants/${tenantId}/users/create-direct`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantUserKeys.all(tenantId) });
      toast.success('User created');
    },
    onError: () => {
      toast.error('Failed to create user');
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface UserProfile {
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  displayName?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  avatarUrl?: string;
}

export interface StaffUser {
  _id: string;
  email: string;
  role: string;
  tenantSlug: string;
  profile: UserProfile;
  status: 'invited' | 'pending_activation' | 'active' | 'suspended' | 'deactivated' | 'locked';
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface InviteUserData {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UserSession {
  id: string;
  browser?: string;
  os?: string;
  ip?: string;
  createdAt?: string;
  lastActiveAt?: string;
}

// ── Response Types ─────────────────────────────────────────

interface UserListResponse {
  success: true;
  data: {
    items: StaffUser[];
    pagination: PaginationMeta;
  };
}

interface UserDetailResponse {
  success: true;
  data: { user: StaffUser };
}

interface UserStatsResponse {
  success: true;
  data: {
    stats: {
      byRole: Array<{ _id: string; count: number }>;
      byStatus: Array<{ _id: string; count: number }>;
    };
  };
}

interface SessionsResponse {
  success: true;
  data: { sessions: UserSession[] };
}

interface InviteUserResponse {
  success: true;
  data: { user: StaffUser; inviteLink: string };
}

// ── Query Keys ─────────────────────────────────────────────

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
  sessions: (id: string) => [...userKeys.all, 'sessions', id] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useUserList(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () =>
      apiClient.get<UserListResponse>('/api/users', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.items,
      meta: res.data.pagination,
    }),
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => apiClient.get<UserDetailResponse>(`/api/users/${id}`),
    select: (res) => res.data.user,
    enabled: !!id,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: () => apiClient.get<UserStatsResponse>('/api/users/stats'),
    select: (res) => res.data.stats,
    staleTime: 30_000,
  });
}

export function useUserSessions(userId: string) {
  return useQuery({
    queryKey: userKeys.sessions(userId),
    queryFn: () => apiClient.get<SessionsResponse>(`/api/users/${userId}/sessions`),
    select: (res) => res.data.sessions,
    enabled: !!userId,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteUserData) =>
      apiClient.post<InviteUserResponse>('/api/users/invite', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { role?: string; status?: string }) =>
      apiClient.put<UserDetailResponse>(`/api/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<UserDetailResponse>(`/api/users/${id}/suspend`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<UserDetailResponse>(`/api/users/${id}/deactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<UserDetailResponse>(`/api/users/${id}/reactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

/**
 * Clear an M-7 brute-force lockout. Only valid when `user.status === 'locked'`.
 */
export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<UserDetailResponse>(`/api/users/${id}/unlock`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

export function useRevokeUserSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: true; data: { revoked: number } }>(`/api/users/${id}/sessions`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: userKeys.sessions(id) });
    },
  });
}

// ── Edit Profile ───────────────────────────────────────────

export interface EditUserProfileData {
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  phone?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  role?: string;
  email?: string;
}

export function useEditUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditUserProfileData }) =>
      apiClient.put<UserDetailResponse>(`/api/users/${id}/profile`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.details() });
      qc.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}

// ── Admin Set Password ─────────────────────────────────────

export function useAdminSetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient.post(`/api/users/${id}/set-password`, { newPassword }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// ── Admin Force Reset Password (email) ─────────────────────

export function useForceResetPassword() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/users/${id}/force-reset-password`, {}),
  });
}

// ── Admin Disable 2FA ──────────────────────────────────────

export function useAdminDisable2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/users/${id}/disable-2fa`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.details() });
    },
  });
}

// ── Admin Verify Email ─────────────────────────────────────

export function useAdminVerifyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<UserDetailResponse>(`/api/users/${id}/verify-email`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.details() });
    },
  });
}

// ── Admin Verify Phone ─────────────────────────────────────

export function useAdminVerifyPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<UserDetailResponse>(`/api/users/${id}/verify-phone`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.details() });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import { toast } from '@dento/ui';

// ── Types ───────────────────────────────────────────────────

interface MultiLang {
  en: string;
  ar?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  tenantSlug: string;
  profile: {
    firstName: MultiLang;
    lastName: MultiLang;
    displayName?: string;
    phone?: string;
    gender?: string;
    bio?: MultiLang;
    languagePreference?: string;
  };
  status: string;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string;
  createdAt: string;
}

interface MeResponse {
  success: boolean;
  data: UserProfile;
}

export interface UpdateProfileInput {
  firstName?: string | MultiLang;
  lastName?: string | MultiLang;
  displayName?: string;
  phone?: string;
  gender?: string;
  bio?: string | MultiLang;
  languagePreference?: string;
}

// ── Queries ─────────────────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<MeResponse>('/api/auth/me'),
    select: (res) => res.data,
  });
}

// ── Mutations ───────────────────────────────────────────────

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileInput) => apiClient.patch('/api/auth/me', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profile updated');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordInput) => apiClient.post('/api/auth/change-password', body),
    onSuccess: () => {
      toast.success('Password changed successfully. Other sessions have been revoked.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to change password';
      toast.error(msg);
    },
  });
}

// ── 2FA Hooks ───────────────────────────────────────────────

export interface TwoFactorStatus {
  enabled: boolean;
  method?: string;
}

export function use2FAStatus() {
  return useQuery({
    queryKey: ['auth', '2fa', 'status'],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: TwoFactorStatus }>('/api/auth/2fa/status'),
    select: (res) => res.data,
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean; data: { qrCode: string; secret: string } }>(
        '/api/auth/2fa/setup',
      ),
    onError: () => {
      toast.error('Failed to start 2FA setup');
    },
  });
}

export function useVerify2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      apiClient.post<{ success: boolean; data: { recoveryCodes: string[] } }>(
        '/api/auth/2fa/verify',
        { code },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', '2fa', 'status'] });
      toast.success('2FA enabled successfully');
    },
    onError: () => {
      toast.error('Invalid verification code');
    },
  });
}

export function useDisable2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => apiClient.post('/api/auth/2fa/disable', { password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', '2fa', 'status'] });
      toast.success('2FA disabled');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to disable 2FA';
      toast.error(msg);
    },
  });
}

export function useRegenerateRecoveryCodes() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean; data: { recoveryCodes: string[] } }>(
        '/api/auth/2fa/regenerate-codes',
      ),
    onSuccess: () => {
      toast.success('Recovery codes regenerated');
    },
    onError: () => {
      toast.error('Failed to regenerate recovery codes');
    },
  });
}

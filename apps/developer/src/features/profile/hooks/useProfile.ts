import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
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
  tenantSlug?: string;
  platformRole?: string;
  platformPermissions?: string[];
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
    onError: () => {
      toast.error('Failed to change password');
    },
  });
}

/**
 * Role Permissions React Query hooks.
 *
 * - useMyPermissions(): fetch current user's effective permissions (all users)
 * - useAllRolePermissions(): fetch all customizable roles (admin only)
 * - useUpdateRolePermissions(): update a specific role's permissions (admin only)
 * - useResetRolePermissions(): reset a role to system defaults (admin only)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import { useAuthStore } from '@/stores/auth.store.js';
import type { ApiSuccessResponse } from '@/lib/types.js';

// ── Types ───────────────────────────────────────────────────

export type Permission = 'read' | 'create' | 'update' | 'delete';

export interface MyPermissionsResponse {
  success: true;
  data: {
    role: string;
    permissions: Record<string, Permission[]>;
  };
}

export interface AllRolePermissionsResponse {
  success: true;
  data: {
    permissions: Record<string, Record<string, Permission[]>>;
    modules: string[];
    roles: string[];
  };
}

export interface SingleRoleResponse {
  success: true;
  data: {
    role: string;
    effective: Record<string, Permission[]>;
    defaults: Record<string, Permission[]>;
    hasTenantContext?: boolean;
  };
}

export interface UpdateRolePermissionsInput {
  role: string;
  modules: { module: string; permissions: Permission[] }[];
}

// ── Query Keys ──────────────────────────────────────────────

export const rolePermissionKeys = {
  all: ['role-permissions'] as const,
  me: () => [...rolePermissionKeys.all, 'me'] as const,
  allRoles: () => [...rolePermissionKeys.all, 'all-roles'] as const,
  role: (role: string) => [...rolePermissionKeys.all, 'role', role] as const,
};

// ── Queries ─────────────────────────────────────────────────

/** Fetch the current user's effective permissions. Available to all authenticated users. */
export function useMyPermissions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: rolePermissionKeys.me(),
    queryFn: () => apiClient.get<MyPermissionsResponse>('/api/role-permissions/me'),
    select: (res) => res.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isAuthenticated,
  });
}

/** Fetch effective permissions for all customizable roles (admin only). */
export function useAllRolePermissions() {
  return useQuery({
    queryKey: rolePermissionKeys.allRoles(),
    queryFn: () => apiClient.get<AllRolePermissionsResponse>('/api/role-permissions'),
    select: (res) => res.data,
  });
}

/** Fetch effective + default permissions for a single role (admin only). */
export function useSingleRolePermissions(role: string) {
  return useQuery({
    queryKey: rolePermissionKeys.role(role),
    queryFn: () => apiClient.get<SingleRoleResponse>(`/api/role-permissions/${role}`),
    select: (res) => res.data,
    enabled: !!role,
  });
}

// ── Mutations ───────────────────────────────────────────────

/** Update permissions for a specific role (admin only). */
export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ role, modules }: UpdateRolePermissionsInput) =>
      apiClient.put<ApiSuccessResponse<{ role: string; effective: Record<string, string[]> }>>(
        `/api/role-permissions/${role}`,
        { modules },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: rolePermissionKeys.allRoles() });
      qc.invalidateQueries({ queryKey: rolePermissionKeys.role(variables.role) });
      qc.invalidateQueries({ queryKey: rolePermissionKeys.me() });
      toast.success('Permissions updated successfully');
    },
    onError: () => {
      toast.error('Failed to update permissions');
    },
  });
}

/** Reset a role to system defaults (admin only). */
export function useResetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: string) =>
      apiClient.delete<ApiSuccessResponse<{ role: string; effective: Record<string, string[]> }>>(
        `/api/role-permissions/${role}`,
      ),
    onSuccess: (_data, role) => {
      qc.invalidateQueries({ queryKey: rolePermissionKeys.allRoles() });
      qc.invalidateQueries({ queryKey: rolePermissionKeys.role(role) });
      qc.invalidateQueries({ queryKey: rolePermissionKeys.me() });
      toast.success('Permissions reset to defaults');
    },
    onError: () => {
      toast.error('Failed to reset permissions');
    },
  });
}

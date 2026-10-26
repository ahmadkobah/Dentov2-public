/**
 * use-platform-users hooks — Unit Tests
 *
 * Tests query key factories, list/detail queries,
 * invite/update/permissions/status/delete/resend/revoke mutations.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  platformUserKeys,
  usePlatformUserList,
  usePlatformUserDetail,
  useInvitePlatformUser,
  useUpdatePlatformUser,
  useUpdatePlatformPermissions,
  useUpdatePlatformUserStatus,
  useDeletePlatformUser,
  useResendPlatformInvite,
  useRevokePlatformInvite,
} from '../hooks/use-platform-users.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Query Key Factory ──────────────────────────────────────

describe('platformUserKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(platformUserKeys.all).toEqual(['platform-users']);
    expect(platformUserKeys.lists()).toEqual(['platform-users', 'list']);
    expect(platformUserKeys.list({ page: 1 })).toEqual(['platform-users', 'list', { page: 1 }]);
    expect(platformUserKeys.details()).toEqual(['platform-users', 'detail']);
    expect(platformUserKeys.detail('u1')).toEqual(['platform-users', 'detail', 'u1']);
  });
});

// ── usePlatformUserList ────────────────────────────────────

describe('usePlatformUserList', () => {
  const mockUsers = [
    {
      _id: 'u1',
      email: 'admin@test.com',
      profile: { firstName: { en: 'Admin' }, lastName: { en: 'User' } },
      platformRole: 'platform_admin',
      status: 'active',
    },
    {
      _id: 'u2',
      email: 'viewer@test.com',
      profile: { firstName: { en: 'Viewer' }, lastName: { en: 'User' } },
      platformRole: 'platform_viewer',
      status: 'invited',
    },
  ];
  const mockMeta = { page: 1, limit: 20, total: 2, totalPages: 1 };

  it('should fetch and select user list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockUsers,
      meta: mockMeta,
    });

    const { result } = renderHook(() => usePlatformUserList({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(mockUsers);
    expect(result.current.data?.meta).toEqual(mockMeta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/users', {
      params: { page: 1 },
    });
  });
});

// ── usePlatformUserDetail ──────────────────────────────────

describe('usePlatformUserDetail', () => {
  it('should fetch a single user', async () => {
    const user = {
      _id: 'u1',
      email: 'admin@test.com',
      platformRole: 'platform_admin',
      status: 'active',
    };
    mockGet.mockResolvedValue({ success: true, data: user });

    const { result } = renderHook(() => usePlatformUserDetail('u1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(user);
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => usePlatformUserDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useInvitePlatformUser ──────────────────────────────────

describe('useInvitePlatformUser', () => {
  it('should call POST /api/platform/users/invite', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'u-new', email: 'new@test.com', inviteToken: 'tok123' },
    });

    const { result } = renderHook(() => useInvitePlatformUser(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        email: 'new@test.com',
        firstName: { en: 'New' },
        lastName: { en: 'User' },
        platformRole: 'platform_admin',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/users/invite', {
      email: 'new@test.com',
      firstName: { en: 'New' },
      lastName: { en: 'User' },
      platformRole: 'platform_admin',
    });
  });
});

// ── useUpdatePlatformUser ──────────────────────────────────

describe('useUpdatePlatformUser', () => {
  it('should call PATCH /api/platform/users/:id with data', async () => {
    mockPatch.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useUpdatePlatformUser('u1'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ platformRole: 'platform_viewer' as const });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/users/u1', {
      platformRole: 'platform_viewer',
    });
  });
});

// ── useUpdatePlatformPermissions ───────────────────────────

describe('useUpdatePlatformPermissions', () => {
  it('should call PATCH /api/platform/users/:id/permissions', async () => {
    mockPatch.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useUpdatePlatformPermissions('u1'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        platformPermissionOverrides: [{ module: 'platform_tenants', actions: ['create'] }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/users/u1/permissions', {
      platformPermissionOverrides: [{ module: 'platform_tenants', actions: ['create'] }],
    });
  });
});

// ── useUpdatePlatformUserStatus ────────────────────────────

describe('useUpdatePlatformUserStatus', () => {
  it('should call PATCH /api/platform/users/:id with status', async () => {
    mockPatch.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useUpdatePlatformUserStatus(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'u1', status: 'suspended' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/users/u1', { status: 'suspended' });
  });
});

// ── useDeletePlatformUser ──────────────────────────────────

describe('useDeletePlatformUser', () => {
  it('should call DELETE /api/platform/users/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeletePlatformUser(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('u1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/users/u1');
  });
});

// ── useResendPlatformInvite ────────────────────────────────

describe('useResendPlatformInvite', () => {
  it('should call POST /api/platform/users/:id/resend-invite', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useResendPlatformInvite(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('u2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/users/u2/resend-invite');
  });
});

// ── useRevokePlatformInvite ────────────────────────────────

describe('useRevokePlatformInvite', () => {
  it('should call POST /api/platform/users/:id/revoke-invite', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokePlatformInvite(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('u2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/users/u2/revoke-invite');
  });
});

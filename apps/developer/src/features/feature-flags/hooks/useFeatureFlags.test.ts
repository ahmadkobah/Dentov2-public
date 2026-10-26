/**
 * useFeatureFlags hooks — Unit Tests
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.12
 * Tests query key factories, list query, detail query,
 * create/update/toggle/delete mutations, and loading/error states.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  featureFlagKeys,
  useFeatureFlags,
  useFeatureFlag,
  useCreateFeatureFlag,
  useUpdateFeatureFlag,
  useToggleFeatureFlag,
  useDeleteFeatureFlag,
} from '../hooks/useFeatureFlags.js';

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

// ── Fixtures ───────────────────────────────────────────────

const mockFlag = {
  _id: 'ff1',
  key: 'enable_new_dashboard',
  name: 'New Dashboard',
  description: 'Rollout new dashboard UI',
  tenantId: null,
  enabled: true,
  percentageRollout: null,
  userIds: null,
  conditions: null,
  value: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockFlag2 = {
  _id: 'ff2',
  key: 'beta_reports',
  name: 'Beta Reports',
  description: 'Enable beta reporting module',
  tenantId: 'tenant-a',
  enabled: false,
  percentageRollout: 50,
  userIds: ['user-1'],
  conditions: { plan: 'premium' },
  value: { maxItems: 10 },
  createdAt: '2025-01-02T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
};

const mockMeta = { page: 1, limit: 20, total: 2, totalPages: 1 };

// ── Query Key Factory ──────────────────────────────────────

describe('featureFlagKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(featureFlagKeys.all).toEqual(['feature-flags']);
    expect(featureFlagKeys.lists()).toEqual(['feature-flags', 'list']);
    expect(featureFlagKeys.list({ page: 1, search: 'beta' })).toEqual([
      'feature-flags',
      'list',
      { page: 1, search: 'beta' },
    ]);
    expect(featureFlagKeys.details()).toEqual(['feature-flags', 'detail']);
    expect(featureFlagKeys.detail('ff1')).toEqual(['feature-flags', 'detail', 'ff1']);
  });

  it('should share "all" root in every key', () => {
    expect(featureFlagKeys.lists()[0]).toBe(featureFlagKeys.all[0]);
    expect(featureFlagKeys.details()[0]).toBe(featureFlagKeys.all[0]);
  });
});

// ── useFeatureFlags (list) ─────────────────────────────────

describe('useFeatureFlags', () => {
  it('should fetch and select paginated feature flags', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockFlag, mockFlag2],
      meta: mockMeta,
    });

    const { result } = renderHook(() => useFeatureFlags({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([mockFlag, mockFlag2]);
    expect(result.current.data?.meta).toEqual(mockMeta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/feature-flags', {
      params: { page: 1, limit: 20 },
    });
  });

  it('should pass search and filter params', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockFlag2],
      meta: { ...mockMeta, total: 1 },
    });

    const { result } = renderHook(
      () => useFeatureFlags({ page: 1, search: 'beta', enabled: false, tenantId: 'tenant-a' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/platform/feature-flags', {
      params: { page: 1, limit: 20, search: 'beta', tenantId: 'tenant-a', enabled: 'false' },
    });
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useFeatureFlag (single) ────────────────────────────────

describe('useFeatureFlag', () => {
  it('should fetch and select a single flag by ID', async () => {
    mockGet.mockResolvedValue({ success: true, data: mockFlag });

    const { result } = renderHook(() => useFeatureFlag('ff1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFlag);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/feature-flags/ff1');
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useFeatureFlag(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useFeatureFlag('ff999'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });
});

// ── useCreateFeatureFlag ───────────────────────────────────

describe('useCreateFeatureFlag', () => {
  it('should POST to /api/platform/feature-flags', async () => {
    const created = { ...mockFlag, _id: 'ff-new' };
    mockPost.mockResolvedValue({ success: true, data: created });

    const { result } = renderHook(() => useCreateFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ key: 'enable_new_dashboard', name: 'New Dashboard' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/feature-flags', {
      key: 'enable_new_dashboard',
      name: 'New Dashboard',
    });
  });

  it('should handle creation error', async () => {
    mockPost.mockRejectedValue(new Error('Duplicate key'));

    const { result } = renderHook(() => useCreateFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ key: 'enable_new_dashboard', name: 'New Dashboard' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Duplicate key');
  });
});

// ── useUpdateFeatureFlag ───────────────────────────────────

describe('useUpdateFeatureFlag', () => {
  it('should PATCH to /api/platform/feature-flags/:id', async () => {
    const updated = { ...mockFlag, name: 'Updated Dashboard' };
    mockPatch.mockResolvedValue({ success: true, data: updated });

    const { result } = renderHook(() => useUpdateFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'ff1', name: 'Updated Dashboard' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/feature-flags/ff1', {
      name: 'Updated Dashboard',
    });
  });

  it('should handle update error', async () => {
    mockPatch.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useUpdateFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'ff999', name: 'Nope' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });

  it('should send percentage rollout and conditions', async () => {
    mockPatch.mockResolvedValue({ success: true, data: mockFlag2 });

    const { result } = renderHook(() => useUpdateFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        id: 'ff2',
        percentageRollout: 75,
        conditions: { plan: 'enterprise' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/feature-flags/ff2', {
      percentageRollout: 75,
      conditions: { plan: 'enterprise' },
    });
  });
});

// ── useToggleFeatureFlag ───────────────────────────────────

describe('useToggleFeatureFlag', () => {
  it('should PATCH to /api/platform/feature-flags/:id/toggle', async () => {
    const toggled = { ...mockFlag, enabled: false };
    mockPatch.mockResolvedValue({ success: true, data: toggled });

    const { result } = renderHook(() => useToggleFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'ff1', enabled: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/feature-flags/ff1/toggle', {
      enabled: false,
    });
  });

  it('should handle toggle error', async () => {
    mockPatch.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useToggleFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'ff1', enabled: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server error');
  });
});

// ── useDeleteFeatureFlag ───────────────────────────────────

describe('useDeleteFeatureFlag', () => {
  it('should DELETE /api/platform/feature-flags/:id', async () => {
    mockDelete.mockResolvedValue({ success: true, data: mockFlag });

    const { result } = renderHook(() => useDeleteFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('ff1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/feature-flags/ff1');
  });

  it('should handle delete error', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useDeleteFeatureFlag(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('ff999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });
});

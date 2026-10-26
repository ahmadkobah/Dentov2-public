/**
 * useStorageStats hooks — Unit Tests
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 4.9
 * Tests query key factories, 2 queries, and loading/error states.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { storageKeys, useStorageStats, useTenantStorageList } from '../hooks/useStorageStats.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Fixtures ───────────────────────────────────────────────

const mockStorageStats = {
  overview: {
    totalStorageUsedMB: 2048,
    totalStorageLimitMB: 10240,
    totalUsagePercentage: 20,
    tenantCount: 5,
    tenantsOverLimit: 0,
    tenantsNearLimit: 1,
    averageUsagePercentage: 20,
  },
  buckets: {
    uploads: {
      bucketName: 'dento-uploads',
      isAccessible: true,
      lastCheckedAt: '2026-03-03T12:00:00Z',
    },
    backups: {
      bucketName: 'dento-backups',
      isAccessible: true,
      lastCheckedAt: '2026-03-03T12:00:00Z',
    },
  },
};

const mockTenantList = {
  tenants: [
    {
      tenantId: 't1',
      name: 'Clinic A',
      slug: 'clinic-a',
      status: 'active',
      storageUsedMB: 512,
      storageLimitMB: 5120,
      usagePercentage: 10,
    },
    {
      tenantId: 't2',
      name: 'Clinic B',
      slug: 'clinic-b',
      status: 'active',
      storageUsedMB: 6000,
      storageLimitMB: 5120,
      usagePercentage: 117.19,
    },
  ],
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

// ── Query Key Factory ──────────────────────────────────────

describe('storageKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(storageKeys.all).toEqual(['platform-storage']);
    expect(storageKeys.stats()).toEqual(['platform-storage', 'stats']);
    expect(storageKeys.tenants()).toEqual(['platform-storage', 'tenants', {}]);
  });

  it('should include filters in tenant keys', () => {
    const filters = { page: 2, search: 'clinic' };
    expect(storageKeys.tenants(filters)).toEqual([
      'platform-storage',
      'tenants',
      { page: 2, search: 'clinic' },
    ]);
  });
});

// ── useStorageStats ────────────────────────────────────────

describe('useStorageStats', () => {
  it('should fetch and return storage stats', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockStorageStats,
    });

    const { result } = renderHook(() => useStorageStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStorageStats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/storage/stats');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStorageStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStorageStats(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('should include overview and buckets in response', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockStorageStats,
    });

    const { result } = renderHook(() => useStorageStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.overview).toBeDefined();
    expect(result.current.data?.buckets).toBeDefined();
    expect(result.current.data?.overview.tenantCount).toBe(5);
    expect(result.current.data?.buckets.uploads.isAccessible).toBe(true);
  });
});

// ── useTenantStorageList ───────────────────────────────────

describe('useTenantStorageList', () => {
  it('should fetch tenant storage list with default filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockTenantList.tenants,
      meta: mockTenantList.meta,
    });

    const { result } = renderHook(() => useTenantStorageList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTenantList);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/storage/tenants', { params: {} });
  });

  it('should pass filters as query params', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockTenantList,
    });

    const filters = {
      page: 2,
      limit: 5,
      search: 'clinic',
      sortBy: 'usagePercentage' as const,
      sortOrder: 'asc' as const,
    };

    const { result } = renderHook(() => useTenantStorageList(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/platform/storage/tenants', {
      params: {
        page: '2',
        limit: '5',
        search: 'clinic',
        sortBy: 'usagePercentage',
        sortOrder: 'asc',
      },
    });
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useTenantStorageList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTenantStorageList(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('should return tenant list with meta', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockTenantList.tenants,
      meta: mockTenantList.meta,
    });

    const { result } = renderHook(() => useTenantStorageList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.tenants).toHaveLength(2);
    expect(result.current.data?.meta?.total).toBe(2);
    expect(result.current.data?.meta?.totalPages).toBe(1);
    expect(result.current.data?.tenants).toHaveLength(2);
  });

  it('should not include undefined filters in params', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockTenantList,
    });

    const { result } = renderHook(() => useTenantStorageList({ search: 'test' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/platform/storage/tenants', {
      params: { search: 'test' },
    });
  });
});

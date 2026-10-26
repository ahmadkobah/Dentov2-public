/**
 * useTenants hooks — Unit Tests
 *
 * Tests query key factories, tenant list query, stats query,
 * create/delete mutations with toast notifications.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import {
  tenantKeys,
  useTenants,
  useTenantsStats,
  useCreateTenant,
  useDeleteTenant,
} from '../hooks/useTenants.js';

// ── Mock apiClient + toast ─────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@dento/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn() },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Fixtures ───────────────────────────────────────────────

const mockTenant = {
  _id: 't1',
  name: { en: 'Smile Clinic', ar: 'عيادة الابتسامة' },
  slug: 'smile-clinic',
  status: 'active',
  plan: 'professional',
  contact: { address: { country: 'SA' } },
  userCount: 5,
  maxUsers: 20,
  mrr: 199,
  createdAt: '2025-01-01T00:00:00.000Z',
  branding: { logoUrl: null },
};

const mappedTenant = {
  _id: 't1',
  name: { en: 'Smile Clinic', ar: 'عيادة الابتسامة' },
  slug: 'smile-clinic',
  status: 'active',
  plan: 'professional',
  country: 'SA',
  countryFlag: '🇸🇦',
  users: 5,
  maxUsers: 20,
  mrr: 199,
  createdAt: '2025-01-01T00:00:00.000Z',
  logoUrl: null,
};

const mockMeta = { page: 1, limit: 20, total: 1, totalPages: 1 };

const mockStats = {
  totalTenants: 50,
  activeTenants: 42,
  countries: 5,
  totalMrr: 8500,
};

// ── Query Key Factory ──────────────────────────────────────

describe('tenantKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(tenantKeys.all).toEqual(['tenants']);
    expect(tenantKeys.lists()).toEqual(['tenants', 'list']);
    expect(tenantKeys.list({ page: 1, search: 'smile' })).toEqual([
      'tenants',
      'list',
      { page: 1, search: 'smile' },
    ]);
    expect(tenantKeys.details()).toEqual(['tenants', 'detail']);
    expect(tenantKeys.detail('t1')).toEqual(['tenants', 'detail', 't1']);
    expect(tenantKeys.stats()).toEqual(['tenants', 'stats']);
  });

  it('should share "all" root in every key', () => {
    expect(tenantKeys.lists()[0]).toBe(tenantKeys.all[0]);
    expect(tenantKeys.details()[0]).toBe(tenantKeys.all[0]);
    expect(tenantKeys.stats()[0]).toBe(tenantKeys.all[0]);
  });
});

// ── useTenants (list) ──────────────────────────────────────

describe('useTenants', () => {
  it('should fetch and select paginated tenants', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockTenant],
      meta: mockMeta,
    });

    const { result } = renderHook(() => useTenants({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([mappedTenant]);
    expect(result.current.data?.meta).toEqual(mockMeta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/tenants', {
      params: { page: 1 },
    });
  });

  it('should pass search and status filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderHook(() => useTenants({ page: 1, search: 'smile', status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/tenants', {
        params: { page: 1, search: 'smile', status: 'active' },
      }),
    );
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTenants({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTenants({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useTenantsStats ────────────────────────────────────────

describe('useTenantsStats', () => {
  it('should fetch and select stats', async () => {
    mockGet.mockResolvedValue({ success: true, data: mockStats });

    const { result } = renderHook(() => useTenantsStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/tenants/stats');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useTenantsStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useCreateTenant ────────────────────────────────────────

describe('useCreateTenant', () => {
  it('should POST to /api/platform/tenants and show toast', async () => {
    mockPost.mockResolvedValue({ success: true, data: mockTenant });

    const { result } = renderHook(() => useCreateTenant(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        name: 'Smile Clinic',
        slug: 'smile-clinic',
        plan: 'professional',
        country: 'SA',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/tenants', {
      name: 'Smile Clinic',
      slug: 'smile-clinic',
      plan: 'professional',
      country: 'SA',
    });
    expect(toast.success).toHaveBeenCalledWith('Tenant created');
  });

  it('should show error toast on failure', async () => {
    mockPost.mockRejectedValue(new Error('Validation error'));

    const { result } = renderHook(() => useCreateTenant(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        name: 'Bad Tenant',
        slug: 'bad',
        plan: 'free',
        country: 'XX',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to create tenant');
  });
});

// ── useDeleteTenant ────────────────────────────────────────

describe('useDeleteTenant', () => {
  it('should DELETE /api/platform/tenants/:id and show toast', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteTenant(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('t1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/tenants/t1');
    expect(toast.success).toHaveBeenCalledWith('Tenant deleted');
  });

  it('should show error toast on failure', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useDeleteTenant(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('t999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to delete tenant');
  });
});

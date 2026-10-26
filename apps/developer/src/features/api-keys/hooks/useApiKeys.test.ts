/**
 * useApiKeys hooks — Unit Tests
 *
 * Tests query key factories, list query, stats query,
 * create/rotate/revoke mutations with toast notifications.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import {
  apiKeyKeys,
  useApiKeys,
  useApiKeyStats,
  useCreateApiKey,
  useRotateApiKey,
  useRevokeApiKey,
} from '../hooks/useApiKeys.js';

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

const mockApiKey = {
  id: 'key-1',
  name: 'Production Key',
  keyDisplay: 'dk_live_...abc',
  scope: 'live',
  status: 'active',
  permissions: ['read', 'write'],
  rateLimitMax: 1000,
  totalRequests: 5432,
  lastUsedAt: '2025-06-01T12:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
  expiresAt: null,
};

const mockMeta = { page: 1, limit: 20, total: 1, totalPages: 1 };

const mockStats = {
  totalKeys: 10,
  activeKeys: 8,
  totalRequests: '150,000',
  avgDailyRequests: '5,000',
};

// ── Query Key Factory ──────────────────────────────────────

describe('apiKeyKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(apiKeyKeys.all).toEqual(['api-keys']);
    expect(apiKeyKeys.lists()).toEqual(['api-keys', 'list']);
    expect(apiKeyKeys.list({ page: 1, scope: 'live' })).toEqual([
      'api-keys',
      'list',
      { page: 1, scope: 'live' },
    ]);
    expect(apiKeyKeys.details()).toEqual(['api-keys', 'detail']);
    expect(apiKeyKeys.detail('key-1')).toEqual(['api-keys', 'detail', 'key-1']);
    expect(apiKeyKeys.stats()).toEqual(['api-keys', 'stats']);
  });

  it('should share "all" root in every key', () => {
    expect(apiKeyKeys.lists()[0]).toBe(apiKeyKeys.all[0]);
    expect(apiKeyKeys.details()[0]).toBe(apiKeyKeys.all[0]);
    expect(apiKeyKeys.stats()[0]).toBe(apiKeyKeys.all[0]);
  });
});

// ── useApiKeys (list) ──────────────────────────────────────

describe('useApiKeys', () => {
  it('should fetch and select paginated API keys', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockApiKey],
      meta: mockMeta,
    });

    const { result } = renderHook(() => useApiKeys({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([mockApiKey]);
    expect(result.current.data?.meta).toEqual(mockMeta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/api-keys', {
      params: { page: 1 },
    });
  });

  it('should pass scope and status filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderHook(() => useApiKeys({ page: 1, scope: 'live', status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/api-keys', {
        params: { page: 1, scope: 'live', status: 'active' },
      }),
    );
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApiKeys({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useApiKeys({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useApiKeyStats ─────────────────────────────────────────

describe('useApiKeyStats', () => {
  it('should fetch and select stats', async () => {
    mockGet.mockResolvedValue({ success: true, data: mockStats });

    const { result } = renderHook(() => useApiKeyStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/api-keys/stats');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useApiKeyStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useCreateApiKey ────────────────────────────────────────

describe('useCreateApiKey', () => {
  it('should POST to /api/platform/api-keys and show toast', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'key-new', key: 'dk_live_xyz' } });

    const { result } = renderHook(() => useCreateApiKey(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        name: 'New Key',
        scope: 'live' as const,
        permissions: ['read' as const],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/api-keys', {
      name: 'New Key',
      scope: 'live',
      permissions: ['read'],
    });
    expect(toast.success).toHaveBeenCalledWith('API key generated');
  });

  it('should show error toast on failure', async () => {
    mockPost.mockRejectedValue(new Error('Limit reached'));

    const { result } = renderHook(() => useCreateApiKey(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        name: 'Fail Key',
        scope: 'test' as const,
        permissions: ['read' as const],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to generate API key');
  });
});

// ── useRotateApiKey ────────────────────────────────────────

describe('useRotateApiKey', () => {
  it('should POST to /api/platform/api-keys/:id/rotate and show toast', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'key-1', key: 'dk_live_new' } });

    const { result } = renderHook(() => useRotateApiKey(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('key-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/api-keys/key-1/rotate');
    expect(toast.success).toHaveBeenCalledWith('API key rotated');
  });

  it('should show error toast on failure', async () => {
    mockPost.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useRotateApiKey(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('key-999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to rotate API key');
  });
});

// ── useRevokeApiKey ────────────────────────────────────────

describe('useRevokeApiKey', () => {
  it('should DELETE /api/platform/api-keys/:id and show toast', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeApiKey(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('key-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/api-keys/key-1');
    expect(toast.success).toHaveBeenCalledWith('API key revoked');
  });

  it('should show error toast on failure', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useRevokeApiKey(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('key-999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to revoke API key');
  });
});

/**
 * useWebhooks hooks — Unit Tests
 *
 * Tests query key factories, list / deliveries / stats queries,
 * create / toggle / delete / test mutations with toast notifications.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import {
  webhookKeys,
  useWebhooks,
  useWebhookDeliveries,
  useWebhookStats,
  useCreateWebhook,
  useToggleWebhook,
  useDeleteWebhook,
  useTestWebhook,
} from '../hooks/useWebhooks.js';

// ── Mock apiClient + toast ─────────────────────────────────

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

const mockWebhook = {
  id: 'wh-1',
  url: 'https://example.com/webhook',
  description: 'Main webhook',
  status: 'active',
  events: ['tenant.created', 'tenant.updated'],
  secret: 'whsec_abc123',
  successRate: 98.5,
  totalDeliveries: 1200,
  lastDeliveryAt: '2025-06-01T12:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockDelivery = {
  id: 'del-1',
  webhookId: 'wh-1',
  event: 'tenant.created',
  httpStatus: 200,
  duration: 150,
  success: true,
  timestamp: '2025-06-01T12:00:00.000Z',
};

const mockMeta = { page: 1, limit: 20, total: 1, totalPages: 1 };

const mockStats = {
  totalEndpoints: 5,
  activeEndpoints: 4,
  totalDeliveries: '12,500',
  avgSuccessRate: '97.3%',
};

// ── Query Key Factory ──────────────────────────────────────

describe('webhookKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(webhookKeys.all).toEqual(['webhooks']);
    expect(webhookKeys.lists()).toEqual(['webhooks', 'list']);
    expect(webhookKeys.list({ page: 1, status: 'active' })).toEqual([
      'webhooks',
      'list',
      { page: 1, status: 'active' },
    ]);
    expect(webhookKeys.details()).toEqual(['webhooks', 'detail']);
    expect(webhookKeys.detail('wh-1')).toEqual(['webhooks', 'detail', 'wh-1']);
    expect(webhookKeys.deliveries()).toEqual(['webhooks', 'deliveries']);
    expect(webhookKeys.stats()).toEqual(['webhooks', 'stats']);
  });

  it('should share "all" root in every key', () => {
    expect(webhookKeys.lists()[0]).toBe(webhookKeys.all[0]);
    expect(webhookKeys.details()[0]).toBe(webhookKeys.all[0]);
    expect(webhookKeys.deliveries()[0]).toBe(webhookKeys.all[0]);
    expect(webhookKeys.stats()[0]).toBe(webhookKeys.all[0]);
  });
});

// ── useWebhooks (list) ────────────────────────────────────

describe('useWebhooks', () => {
  it('should fetch and select paginated webhooks', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockWebhook],
      meta: mockMeta,
    });

    const { result } = renderHook(() => useWebhooks({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([mockWebhook]);
    expect(result.current.data?.meta).toEqual(mockMeta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/webhooks', {
      params: { page: 1 },
    });
  });

  it('should pass status filter', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderHook(() => useWebhooks({ page: 1, status: 'failing' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/webhooks', {
        params: { page: 1, status: 'failing' },
      }),
    );
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWebhooks({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWebhooks({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useWebhookDeliveries ──────────────────────────────────

describe('useWebhookDeliveries', () => {
  it('should fetch deliveries without search', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockDelivery],
      meta: mockMeta,
    });

    const { result } = renderHook(() => useWebhookDeliveries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([mockDelivery]);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/webhooks/deliveries', {
      params: undefined,
    });
  });

  it('should pass search param when provided', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockDelivery],
      meta: mockMeta,
    });

    renderHook(() => useWebhookDeliveries('tenant.created'), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/webhooks/deliveries', {
        params: { search: 'tenant.created' },
      }),
    );
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useWebhookDeliveries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useWebhookStats ───────────────────────────────────────

describe('useWebhookStats', () => {
  it('should fetch and select webhook stats', async () => {
    mockGet.mockResolvedValue({ success: true, data: mockStats });

    const { result } = renderHook(() => useWebhookStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/webhooks/stats');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useWebhookStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useCreateWebhook ──────────────────────────────────────

describe('useCreateWebhook', () => {
  it('should POST to /api/platform/webhooks and show toast', async () => {
    mockPost.mockResolvedValue({ success: true, data: mockWebhook });

    const { result } = renderHook(() => useCreateWebhook(), {
      wrapper: createWrapper(),
    });

    const payload = {
      url: 'https://example.com/webhook',
      description: 'Main webhook',
      events: ['tenant.created'],
    };

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/webhooks', payload);
    expect(toast.success).toHaveBeenCalledWith('Webhook endpoint created');
  });

  it('should show error toast on failure', async () => {
    mockPost.mockRejectedValue(new Error('Invalid URL'));

    const { result } = renderHook(() => useCreateWebhook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        url: 'bad-url',
        description: 'Fail',
        events: [],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to create webhook');
  });
});

// ── useToggleWebhook ──────────────────────────────────────

describe('useToggleWebhook', () => {
  it('should PATCH webhook status and show toast', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useToggleWebhook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'wh-1', status: 'disabled' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/webhooks/wh-1', {
      status: 'disabled',
    });
    expect(toast.success).toHaveBeenCalledWith('Webhook status updated');
  });

  it('should show error toast on failure', async () => {
    mockPatch.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useToggleWebhook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'wh-999', status: 'active' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to update webhook');
  });
});

// ── useDeleteWebhook ──────────────────────────────────────

describe('useDeleteWebhook', () => {
  it('should DELETE webhook and show toast', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteWebhook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wh-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/webhooks/wh-1');
    expect(toast.success).toHaveBeenCalledWith('Webhook deleted');
  });

  it('should show error toast on failure', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useDeleteWebhook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wh-999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to delete webhook');
  });
});

// ── useTestWebhook ────────────────────────────────────────

describe('useTestWebhook', () => {
  it('should POST test delivery and show toast', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTestWebhook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wh-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/webhooks/wh-1/test');
    expect(toast.success).toHaveBeenCalledWith('Test delivery sent');
  });

  it('should show error toast on failure', async () => {
    mockPost.mockRejectedValue(new Error('Endpoint unreachable'));

    const { result } = renderHook(() => useTestWebhook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wh-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Test delivery failed');
  });
});

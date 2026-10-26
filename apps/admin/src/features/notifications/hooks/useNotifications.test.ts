/**
 * useNotifications hooks — Unit Tests
 *
 * Tests query key factories, notification list/unread-count queries,
 * markAsRead/markAllAsRead/dismiss mutations, and loading/error states.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  notificationKeys,
  useNotificationList,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDismissNotification,
} from './useNotifications.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@dento/ui', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuthStore } from '@/stores/auth.store.js';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true });
});

// ── Fixtures ───────────────────────────────────────────────

const mockNotification = {
  _id: 'n1',
  type: 'appointment',
  title: 'Appointment Reminder',
  message: 'You have an appointment at 10:00 AM',
  isRead: false,
  isDismissed: false,
  actionUrl: '/appointments/appt1',
  createdAt: '2026-03-03T08:00:00.000Z',
};

const mockNotification2 = {
  _id: 'n2',
  type: 'payment',
  title: 'Payment Received',
  message: 'Invoice #123 paid',
  isRead: true,
  isDismissed: false,
  createdAt: '2026-03-03T07:00:00.000Z',
};

// ── Query Key Factory ──────────────────────────────────────

describe('notificationKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(notificationKeys.all).toEqual(['notifications']);
    expect(notificationKeys.lists()).toEqual(['notifications', 'list']);
    expect(notificationKeys.list({ limit: 20 })).toEqual(['notifications', 'list', { limit: 20 }]);
    expect(notificationKeys.unreadCount()).toEqual(['notifications', 'unread-count']);
  });

  it('should share "all" root in every key', () => {
    expect(notificationKeys.lists()[0]).toBe(notificationKeys.all[0]);
    expect(notificationKeys.unreadCount()[0]).toBe(notificationKeys.all[0]);
  });
});

// ── useNotificationList ────────────────────────────────────

describe('useNotificationList', () => {
  it('should fetch notification list', async () => {
    mockGet.mockResolvedValue({
      data: [mockNotification, mockNotification2],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    const { result } = renderHook(() => useNotificationList({ limit: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.notifications).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith('/api/notifications', {
      params: { limit: '20' },
    });
  });

  it('should pass unreadOnly filter', async () => {
    mockGet.mockResolvedValue({ data: [mockNotification], meta: undefined });

    const { result } = renderHook(() => useNotificationList({ unreadOnly: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/notifications', {
      params: { unreadOnly: 'true' },
    });
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotificationList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNotificationList(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useUnreadCount ─────────────────────────────────────────

describe('useUnreadCount', () => {
  it('should fetch and select unread count', async () => {
    mockGet.mockResolvedValue({ data: { unreadCount: 5 } });

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(5);
    expect(mockGet).toHaveBeenCalledWith('/api/notifications/unread-count');
  });
});

// ── useMarkAsRead ──────────────────────────────────────────

describe('useMarkAsRead', () => {
  it('should PATCH to /api/notifications/:id/read', async () => {
    mockPatch.mockResolvedValue({ data: { marked: true } });

    const { result } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('n1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/notifications/n1/read');
  });

  it('should handle mark-as-read error', async () => {
    mockPatch.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('n999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });
});

// ── useMarkAllAsRead ───────────────────────────────────────

describe('useMarkAllAsRead', () => {
  it('should PATCH to /api/notifications/read-all', async () => {
    mockPatch.mockResolvedValue({ data: { markedCount: 5 } });

    const { result } = renderHook(() => useMarkAllAsRead(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/notifications/read-all');
  });

  it('should handle mark-all error', async () => {
    mockPatch.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useMarkAllAsRead(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useDismissNotification ─────────────────────────────────

describe('useDismissNotification', () => {
  it('should PATCH to /api/notifications/:id/dismiss', async () => {
    mockPatch.mockResolvedValue({ data: { dismissed: true } });

    const { result } = renderHook(() => useDismissNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('n1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/notifications/n1/dismiss');
  });

  it('should handle dismiss error', async () => {
    mockPatch.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useDismissNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('n999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });
});

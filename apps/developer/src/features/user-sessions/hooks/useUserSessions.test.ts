/**
 * useUserSessions hooks — Unit Tests
 *
 * Tests query key factories, session list, detail, stats, and revoke mutation.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import {
  sessionKeys,
  useUserSessions,
  useUserSessionDetail,
  useSessionStats,
  useRevokeSession,
} from '../hooks/useUserSessions.js';

// ── Mock apiClient + toast ─────────────────────────────────

const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
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

// ── Query Key Factory ──────────────────────────────────────

describe('sessionKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(sessionKeys.all).toEqual(['user-sessions']);
    expect(sessionKeys.lists()).toEqual(['user-sessions', 'list']);
    expect(sessionKeys.list({ page: 1 })).toEqual(['user-sessions', 'list', { page: 1 }]);
    expect(sessionKeys.details()).toEqual(['user-sessions', 'detail']);
    expect(sessionKeys.detail('s1')).toEqual(['user-sessions', 'detail', 's1']);
    expect(sessionKeys.stats()).toEqual(['user-sessions', 'stats']);
  });
});

// ── useUserSessions ────────────────────────────────────────

describe('useUserSessions', () => {
  it('should fetch and select session list', async () => {
    const sessions = [{ _id: 's1', userId: 'u1', status: 'active' }];
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: sessions, meta });

    const { result } = renderHook(() => useUserSessions({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(sessions);
    expect(result.current.data?.meta).toEqual(meta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/user-sessions', {
      params: { page: 1 },
    });
  });
});

// ── useUserSessionDetail ───────────────────────────────────

describe('useUserSessionDetail', () => {
  it('should fetch a single session', async () => {
    const session = { _id: 's1', userId: 'u1', device: 'Chrome/Windows' };
    mockGet.mockResolvedValue({ success: true, data: session });

    const { result } = renderHook(() => useUserSessionDetail('s1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(session);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useUserSessionDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useSessionStats ────────────────────────────────────────

describe('useSessionStats', () => {
  it('should fetch and select stats', async () => {
    const stats = { activeSessions: 42, totalToday: 100 };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useSessionStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/user-sessions/stats');
  });
});

// ── useRevokeSession ───────────────────────────────────────

describe('useRevokeSession', () => {
  it('should call DELETE /api/platform/user-sessions/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('s1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/user-sessions/s1');
    expect(toast.success).toHaveBeenCalledWith('Session revoked');
  });
});

/**
 * useAdminSessions hooks — Unit Tests
 *
 * Tests admin session list, revoke single, and revoke all mutations.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  useAdminSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from '../hooks/useAdminSessions.js';

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

// ── useAdminSessions ───────────────────────────────────────

describe('useAdminSessions', () => {
  it('should fetch and select session list', async () => {
    const sessions = [{ _id: 's1', userId: 'u1', device: 'Chrome/Windows', status: 'active' }];
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: { sessions }, meta });

    const { result } = renderHook(() => useAdminSessions({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(sessions);
    expect(result.current.data?.meta).toEqual(meta);
    expect(mockGet).toHaveBeenCalledWith('/api/auth/sessions', {
      params: { page: 1 },
    });
  });

  it('should work with default empty filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useAdminSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
  });
});

// ── useRevokeSession ───────────────────────────────────────

describe('useRevokeSession', () => {
  it('should call DELETE /api/auth/sessions/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('s1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/auth/sessions/s1');
  });
});

// ── useRevokeAllSessions ───────────────────────────────────

describe('useRevokeAllSessions', () => {
  it('should call DELETE /api/auth/sessions', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeAllSessions(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/auth/sessions');
  });
});

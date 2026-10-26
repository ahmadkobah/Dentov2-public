/**
 * useSystemLogs hooks — Unit Tests
 *
 * Tests query key factories, list fetching, and stats with level filters.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { systemLogKeys, useSystemLogs, useSystemLogStats } from '../hooks/useSystemLogs.js';

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

// ── Query Key Factory ──────────────────────────────────────

describe('systemLogKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(systemLogKeys.all).toEqual(['system-logs']);
    expect(systemLogKeys.lists()).toEqual(['system-logs', 'list']);
    expect(systemLogKeys.list({ page: 1 })).toEqual(['system-logs', 'list', { page: 1 }]);
    expect(systemLogKeys.stats(24)).toEqual(['system-logs', 'stats', 24]);
    expect(systemLogKeys.stats(1)).toEqual(['system-logs', 'stats', 1]);
  });
});

// ── useSystemLogs ──────────────────────────────────────────

describe('useSystemLogs', () => {
  it('should fetch and select system log list', async () => {
    const logs = [{ _id: '1', level: 'error', message: 'Something failed', service: 'api' }];
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: logs, meta });

    const { result } = renderHook(() => useSystemLogs({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(logs);
    expect(result.current.data?.meta).toEqual(meta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/system-logs', {
      params: { page: 1 },
    });
  });

  it('should pass level filter to API', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderHook(() => useSystemLogs({ page: 1, level: 'error' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/system-logs', {
        params: { page: 1, level: 'error' },
      }),
    );
  });
});

// ── useSystemLogStats ──────────────────────────────────────

describe('useSystemLogStats', () => {
  it('should fetch stats with default 24h window', async () => {
    const stats = { total: 500, byLevel: { error: 10, warn: 50, info: 440 } };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useSystemLogStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/system-logs/stats', {
      params: { hours: 24 },
    });
  });

  it('should accept custom hours parameter', async () => {
    mockGet.mockResolvedValue({ success: true, data: { total: 100 } });

    renderHook(() => useSystemLogStats(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/system-logs/stats', {
        params: { hours: 1 },
      }),
    );
  });
});

/**
 * useErrorLogs hooks — Unit Tests
 *
 * Tests query key factories, error log list, and error log detail.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { errorLogKeys, useErrorLogs, useErrorLogDetail } from '../hooks/useErrorLogs.js';

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

describe('errorLogKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(errorLogKeys.all).toEqual(['error-logs']);
    expect(errorLogKeys.lists()).toEqual(['error-logs', 'list']);
    expect(errorLogKeys.list({ page: 1 })).toEqual(['error-logs', 'list', { page: 1 }]);
    expect(errorLogKeys.details()).toEqual(['error-logs', 'detail']);
    expect(errorLogKeys.detail('e1')).toEqual(['error-logs', 'detail', 'e1']);
  });
});

// ── useErrorLogs ───────────────────────────────────────────

describe('useErrorLogs', () => {
  it('should fetch and select error log list', async () => {
    const errors = [
      {
        _id: 'e1',
        level: 'error',
        message: 'Something failed',
        fingerprint: 'fp1',
        occurrences: 3,
        resolved: false,
      },
    ];
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: errors, meta });

    const { result } = renderHook(() => useErrorLogs({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(errors);
    expect(result.current.data?.meta).toEqual(meta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/error-logs', {
      params: { page: 1 },
    });
  });

  it('should pass filters to API', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderHook(() => useErrorLogs({ page: 1, level: 'fatal', source: 'api' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/error-logs', {
        params: { page: 1, level: 'fatal', source: 'api' },
      }),
    );
  });
});

// ── useErrorLogDetail ──────────────────────────────────────

describe('useErrorLogDetail', () => {
  it('should fetch a single error log', async () => {
    const error = { _id: 'e1', level: 'error', message: 'Something failed', stack: 'Error: ...' };
    mockGet.mockResolvedValue({ success: true, data: error });

    const { result } = renderHook(() => useErrorLogDetail('e1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(error);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useErrorLogDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

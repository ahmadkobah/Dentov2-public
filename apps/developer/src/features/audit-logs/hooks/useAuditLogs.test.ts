/**
 * useAuditLogs hooks — Unit Tests
 *
 * Tests query key factories, list fetching, detail fetching, and stats.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  auditLogKeys,
  useAuditLogs,
  useAuditLogDetail,
  useAuditLogStats,
} from '../hooks/useAuditLogs.js';

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

describe('auditLogKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(auditLogKeys.all).toEqual(['audit-logs']);
    expect(auditLogKeys.lists()).toEqual(['audit-logs', 'list']);
    expect(auditLogKeys.list({ page: 1 })).toEqual(['audit-logs', 'list', { page: 1 }]);
    expect(auditLogKeys.details()).toEqual(['audit-logs', 'detail']);
    expect(auditLogKeys.detail('abc')).toEqual(['audit-logs', 'detail', 'abc']);
    expect(auditLogKeys.stats()).toEqual(['audit-logs', 'stats']);
  });
});

// ── useAuditLogs ───────────────────────────────────────────

describe('useAuditLogs', () => {
  it('should fetch and select audit log list', async () => {
    const logs = [{ _id: '1', action: 'create', resource: 'tenant' }];
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: logs, meta });

    const { result } = renderHook(() => useAuditLogs({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(logs);
    expect(result.current.data?.meta).toEqual(meta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/audit-logs', {
      params: { page: 1 },
    });
  });
});

// ── useAuditLogDetail ──────────────────────────────────────

describe('useAuditLogDetail', () => {
  it('should fetch a single audit log', async () => {
    const log = { _id: 'log-1', action: 'update', resource: 'user' };
    mockGet.mockResolvedValue({ success: true, data: log });

    const { result } = renderHook(() => useAuditLogDetail('log-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(log);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useAuditLogDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useAuditLogStats ───────────────────────────────────────

describe('useAuditLogStats', () => {
  it('should fetch and select stats', async () => {
    const stats = { totalLogs: 100, byAction: { create: 50, update: 30, delete: 20 } };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useAuditLogStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/audit-logs/stats');
  });
});

/**
 * useDeployments hooks — Unit Tests
 *
 * Tests query key factories, deployment list, detail, stats, and rollback mutation.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import {
  deploymentKeys,
  useDeployments,
  useDeploymentDetail,
  useDeploymentStats,
  useRollback,
} from '../hooks/useDeployments.js';

// ── Mock apiClient + toast ─────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
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

describe('deploymentKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(deploymentKeys.all).toEqual(['deployments']);
    expect(deploymentKeys.lists()).toEqual(['deployments', 'list']);
    expect(deploymentKeys.list({ page: 1 })).toEqual(['deployments', 'list', { page: 1 }]);
    expect(deploymentKeys.details()).toEqual(['deployments', 'detail']);
    expect(deploymentKeys.detail('d1')).toEqual(['deployments', 'detail', 'd1']);
    expect(deploymentKeys.stats()).toEqual(['deployments', 'stats']);
  });
});

// ── useDeployments ─────────────────────────────────────────

describe('useDeployments', () => {
  it('should fetch and select deployment list', async () => {
    const deployments = [{ _id: 'd1', app: 'api', version: '1.0.0', status: 'success' }];
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: deployments, meta });

    const { result } = renderHook(() => useDeployments({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(deployments);
    expect(result.current.data?.meta).toEqual(meta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/deployments', {
      params: { page: 1 },
    });
  });
});

// ── useDeploymentDetail ────────────────────────────────────

describe('useDeploymentDetail', () => {
  it('should fetch a single deployment', async () => {
    const deploy = { _id: 'd1', app: 'api', version: '1.0.0', gitCommit: 'abc123' };
    mockGet.mockResolvedValue({ success: true, data: deploy });

    const { result } = renderHook(() => useDeploymentDetail('d1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deploy);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useDeploymentDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useDeploymentStats ─────────────────────────────────────

describe('useDeploymentStats', () => {
  it('should fetch and select stats', async () => {
    const stats = { totalDeployments: 50, successRate: 96, avgDuration: 120 };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useDeploymentStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/deployments/stats');
  });
});

// ── useRollback ────────────────────────────────────────────

describe('useRollback', () => {
  it('should call POST /api/platform/deployments/:id/rollback', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRollback(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('d1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/deployments/d1/rollback', {});
    expect(toast.success).toHaveBeenCalledWith('Rollback initiated successfully');
  });
});

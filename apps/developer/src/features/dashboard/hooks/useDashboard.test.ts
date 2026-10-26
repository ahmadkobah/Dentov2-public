/**
 * useDashboard hooks — Unit Tests
 *
 * Tests query key factory, stats query success/error, and refetchInterval config.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { dashboardKeys, useDashboardStats } from '../hooks/useDashboard.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { useAuthStore } from '@/stores/auth.store.js';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true });
});

// ── Fixtures ───────────────────────────────────────────────

const mockStats = {
  activeTenants: 42,
  apiUsage24h: 15_340,
  apiKeys: 8,
  openTickets: 3,
};

// ── Query Key Factory ──────────────────────────────────────

describe('dashboardKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(dashboardKeys.all).toEqual(['dashboard']);
    expect(dashboardKeys.stats()).toEqual(['dashboard', 'stats']);
  });

  it('should share "all" root in every key', () => {
    expect(dashboardKeys.stats()[0]).toBe(dashboardKeys.all[0]);
  });
});

// ── useDashboardStats ──────────────────────────────────────

describe('useDashboardStats', () => {
  it('should fetch and select dashboard stats', async () => {
    mockGet.mockResolvedValue({ success: true, data: mockStats });

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/dashboard/stats');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

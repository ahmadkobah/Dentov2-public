/**
 * useMonitoringStats hook — Unit Tests
 *
 * Tests query key factory and monitoring stats query.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { monitoringStatsKeys, useMonitoringStats } from '../hooks/useMonitoringStats.js';

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

describe('monitoringStatsKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(monitoringStatsKeys.all).toEqual(['monitoring-stats']);
    expect(monitoringStatsKeys.stats(24)).toEqual(['monitoring-stats', 24]);
    expect(monitoringStatsKeys.stats(48)).toEqual(['monitoring-stats', 48]);
  });
});

// ── useMonitoringStats ─────────────────────────────────────

describe('useMonitoringStats', () => {
  it('should fetch and select monitoring stats', async () => {
    const stats = {
      totalErrors: 120,
      unresolvedCount: 15,
      byLevel: [{ _id: 'error', count: 100 }],
      bySource: [{ _id: 'api', count: 80, unique: 10 }],
      timeline: [{ _id: '2024-01-01T00:00:00Z', count: 5 }],
      window: '24h',
    };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useMonitoringStats(24), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/error-logs/stats', {
      params: { hours: 24 },
    });
  });

  it('should default to 24 hours', async () => {
    mockGet.mockResolvedValue({ success: true, data: {} });

    renderHook(() => useMonitoringStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/error-logs/stats', {
        params: { hours: 24 },
      }),
    );
  });
});

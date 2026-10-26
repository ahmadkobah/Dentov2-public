/**
 * useHealthStatus hook — Unit Tests
 *
 * Tests query key factory and health status polling hook.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { healthKeys, useHealthStatus } from '../hooks/useHealthStatus.js';

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

describe('healthKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(healthKeys.all).toEqual(['health-status']);
  });
});

// ── useHealthStatus ────────────────────────────────────────

describe('useHealthStatus', () => {
  it('should fetch and return health data', async () => {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      environment: 'production',
      version: '1.0.0',
      components: {
        mongo: { status: 'up', latencyMs: 5 },
        redis: { status: 'up', latencyMs: 2 },
        s3: { status: 'up', latencyMs: 50 },
      },
      memory: { rss: 100_000_000, heapUsed: 60_000_000, heapTotal: 80_000_000 },
    };

    mockGet.mockResolvedValue(healthData);

    const { result } = renderHook(() => useHealthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(healthData);
    expect(mockGet).toHaveBeenCalledWith('/health');
  });

  it('should surface errors from apiClient', async () => {
    mockGet.mockRejectedValue(new Error('Health check failed'));

    const { result } = renderHook(() => useHealthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.error?.message).toBe('Health check failed');
  });
});

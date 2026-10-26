/**
 * useResolveError hooks — Unit Tests
 *
 * Tests resolve and unresolve error mutations.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import { useResolveError, useUnresolveError } from '../hooks/useResolveError.js';

// ── Mock apiClient + toast ─────────────────────────────────

const mockPatch = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    patch: (...args: unknown[]) => mockPatch(...args),
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

// ── useResolveError ────────────────────────────────────────

describe('useResolveError', () => {
  it('should call PATCH /api/platform/error-logs/:id/resolve and toast on success', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useResolveError(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('e1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/error-logs/e1/resolve');
    expect(toast.success).toHaveBeenCalledWith('Error marked as resolved');
  });
});

// ── useUnresolveError ──────────────────────────────────────

describe('useUnresolveError', () => {
  it('should call PATCH /api/platform/error-logs/:id/unresolve and toast on success', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUnresolveError(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('e1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/error-logs/e1/unresolve');
    expect(toast.success).toHaveBeenCalledWith('Error marked as unresolved');
  });
});

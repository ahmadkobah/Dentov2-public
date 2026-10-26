/**
 * useCommissions hook — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  commissionKeys,
  payoutKeys,
  useCommissionList,
  useCommissionSummary,
  useCommissionDetail,
  useApproveCommission,
  useBulkApproveCommissions,
  usePayoutList,
  useCreatePayout,
  useProcessPayout,
} from '../hooks/useCommissions.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn(),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

// ── Query Keys ─────────────────────────────────────────────

describe('commissionKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(commissionKeys.all).toEqual(['commissions']);
    expect(commissionKeys.lists()).toEqual(['commissions', 'list']);
    expect(commissionKeys.detail('c1')).toEqual(['commissions', 'detail', 'c1']);
    expect(commissionKeys.summary()).toEqual(['commissions', 'summary']);
  });
});

describe('payoutKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(payoutKeys.all).toEqual(['payouts']);
    expect(payoutKeys.lists()).toEqual(['payouts', 'list']);
    expect(payoutKeys.detail('po1')).toEqual(['payouts', 'detail', 'po1']);
  });
});

// ── Queries ────────────────────────────────────────────────

describe('useCommissionList', () => {
  it('should fetch and select commission list', async () => {
    const commissions = [{ _id: 'c1', amount: 500, status: 'pending' }];
    const meta = { page: 1, totalPages: 1, total: 1 };
    mockGet.mockResolvedValue({ success: true, data: { commissions, meta } });

    const { result } = renderHook(() => useCommissionList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/commissions', expect.any(Object));
  });
});

describe('useCommissionSummary', () => {
  it('should fetch commission summary', async () => {
    const summary = { totalPending: 5000, totalApproved: 3000 };
    mockGet.mockResolvedValue({ success: true, data: summary });

    const { result } = renderHook(() => useCommissionSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
    expect(mockGet).toHaveBeenCalledWith('/api/commissions/summary');
  });
});

describe('useCommissionDetail', () => {
  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useCommissionDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('usePayoutList', () => {
  it('should fetch payout list', async () => {
    const payouts = [{ _id: 'po1', status: 'pending' }];
    const meta = { page: 1, totalPages: 1, total: 1 };
    mockGet.mockResolvedValue({ success: true, data: { payouts, meta } });

    const { result } = renderHook(() => usePayoutList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/commissions/payouts', expect.any(Object));
  });
});

// ── Mutations ──────────────────────────────────────────────

describe('useApproveCommission', () => {
  it('should call PATCH /api/commissions/:id/approve', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useApproveCommission(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('c1' as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/commissions/c1/approve', {});
  });
});

describe('useBulkApproveCommissions', () => {
  it('should call POST /api/commissions/bulk-approve', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useBulkApproveCommissions(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(['c1', 'c2'] as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/commissions/bulk-approve', { ids: ['c1', 'c2'] });
  });
});

describe('useCreatePayout', () => {
  it('should call POST /api/commissions/payouts', async () => {
    mockPost.mockResolvedValue({ success: true, data: { payout: { _id: 'po1' } } });

    const { result } = renderHook(() => useCreatePayout(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      doctorId: 'doc-1',
      commissionIds: ['c1'],
      paymentMethod: 'bank_transfer',
    } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/commissions/payouts',
      expect.objectContaining({ doctorId: 'doc-1' }),
    );
  });
});

describe('useProcessPayout', () => {
  it('should call PATCH /api/commissions/payouts/:id/process', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useProcessPayout(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('po1' as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/commissions/payouts/po1/process', {});
  });
});

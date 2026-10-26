/**
 * usePayments hook — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  paymentKeys,
  reconciliationKeys,
  usePaymentList,
  usePaymentDetail,
  useCreatePayment,
  useRefundPayment,
  useReconciliationList,
  useOpenReconciliation,
} from '../hooks/usePayments.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

// ── Query Key Factory ──────────────────────────────────────

describe('paymentKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(paymentKeys.all).toEqual(['payments']);
    expect(paymentKeys.lists()).toEqual(['payments', 'list']);
    expect(paymentKeys.list({ page: 2 })).toEqual(['payments', 'list', { page: 2 }]);
    expect(paymentKeys.detail('p1')).toEqual(['payments', 'detail', 'p1']);
  });
});

describe('reconciliationKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(reconciliationKeys.all).toEqual(['reconciliations']);
    expect(reconciliationKeys.lists()).toEqual(['reconciliations', 'list']);
  });
});

// ── Queries ────────────────────────────────────────────────

describe('usePaymentList', () => {
  it('should fetch and select payment list', async () => {
    const payments = [{ _id: '1', amount: 500 }];
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: { payments, pagination } });

    const { result } = renderHook(() => usePaymentList({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(payments);
    expect(mockGet).toHaveBeenCalledWith('/api/tenant-payments', expect.any(Object));
  });
});

describe('usePaymentDetail', () => {
  it('should fetch a single payment', async () => {
    const payment = { _id: 'p1', amount: 500 };
    mockGet.mockResolvedValue({ success: true, data: { payment } });

    const { result } = renderHook(() => usePaymentDetail('p1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payment);
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => usePaymentDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── Mutations ──────────────────────────────────────────────

describe('useCreatePayment', () => {
  it('should call POST /api/tenant-payments', async () => {
    mockPost.mockResolvedValue({ success: true, data: { payment: { _id: '1' } } });

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ invoiceId: 'inv-1', amount: 500, method: 'cash' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/tenant-payments',
      expect.objectContaining({ invoiceId: 'inv-1' }),
    );
  });
});

describe('useRefundPayment', () => {
  it('should call POST /api/tenant-payments/:id/refund', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRefundPayment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'p1', reason: 'test' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/tenant-payments/p1/refund', { reason: 'test' });
  });
});

describe('useReconciliationList', () => {
  it('should fetch reconciliations', async () => {
    const reconciliations = [{ _id: 'r1' }];
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: { reconciliations, pagination } });

    const { result } = renderHook(() => useReconciliationList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/tenant-payments/reconciliation', expect.any(Object));
  });
});

describe('useOpenReconciliation', () => {
  it('should call POST /api/tenant-payments/reconciliation', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useOpenReconciliation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ branchId: 'b1', reconciliationDate: '2025-06-01' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/tenant-payments/reconciliation',
      expect.objectContaining({ branchId: 'b1' }),
    );
  });
});

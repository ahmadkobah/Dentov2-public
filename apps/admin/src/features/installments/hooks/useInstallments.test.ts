/**
 * useInstallments hook — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  installmentKeys,
  useInstallmentList,
  useInstallmentDetail,
  useCreateInstallment,
  useRecordInstallmentPayment,
  useCancelInstallment,
  useWaiveInstallment,
  useOverdueInstallments,
} from '../hooks/useInstallments.js';

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

describe('installmentKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(installmentKeys.all).toEqual(['installments']);
    expect(installmentKeys.lists()).toEqual(['installments', 'list']);
    expect(installmentKeys.detail('i1')).toEqual(['installments', 'detail', 'i1']);
    expect(installmentKeys.overdue()).toEqual(['installments', 'overdue']);
  });
});

// ── Queries ────────────────────────────────────────────────

describe('useInstallmentList', () => {
  it('should fetch and select installment list', async () => {
    const plans = [{ _id: 'i1', status: 'active' }];
    const meta = { page: 1, totalPages: 1, total: 1 };
    mockGet.mockResolvedValue({ success: true, data: { plans, meta } });

    const { result } = renderHook(() => useInstallmentList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/installments', expect.any(Object));
  });
});

describe('useInstallmentDetail', () => {
  it('should fetch a single installment plan', async () => {
    const plan = { _id: 'i1', totalAmount: 5000, status: 'active' };
    mockGet.mockResolvedValue({ success: true, data: { plan } });

    const { result } = renderHook(() => useInstallmentDetail('i1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(plan);
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useInstallmentDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useOverdueInstallments', () => {
  it('should fetch overdue installments', async () => {
    const items = [{ _id: 'i1', status: 'active' }];
    mockGet.mockResolvedValue({ success: true, data: { items } });

    const { result } = renderHook(() => useOverdueInstallments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/installments/overdue');
  });
});

// ── Mutations ──────────────────────────────────────────────

describe('useCreateInstallment', () => {
  it('should call POST /api/installments', async () => {
    mockPost.mockResolvedValue({ success: true, data: { plan: { _id: 'i1' } } });

    const { result } = renderHook(() => useCreateInstallment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ patientId: 'p1', totalAmount: 5000 } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/installments',
      expect.objectContaining({ patientId: 'p1' }),
    );
  });
});

describe('useRecordInstallmentPayment', () => {
  it('should call POST /api/installments/:planId/payments/:paymentIndex', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRecordInstallmentPayment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ planId: 'i1', paymentIndex: 0, amount: 1000 } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/installments/i1/payments/1', { amountPaid: 1000 });
  });
});

describe('useCancelInstallment', () => {
  it('should call PATCH /api/installments/:id/cancel', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelInstallment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('i1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/installments/i1/cancel', {});
  });
});

describe('useWaiveInstallment', () => {
  it('should call PATCH /api/installments/:planId/payments/:paymentIndex/waive', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useWaiveInstallment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ planId: 'i1', paymentIndex: 2 } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/installments/i1/payments/3/waive', {});
  });
});

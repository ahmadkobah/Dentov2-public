/**
 * useInvoices hook — Unit Tests
 *
 * Tests query key factories, list fetching, detail fetching, and mutations.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  invoiceKeys,
  useInvoiceList,
  useInvoiceDetail,
  useInvoiceStats,
  useCreateInvoice,
  useIssueInvoice,
  useCancelInvoice,
} from '../hooks/useInvoices.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Query Key Factory ──────────────────────────────────────

describe('invoiceKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(invoiceKeys.all).toEqual(['invoices']);
    expect(invoiceKeys.lists()).toEqual(['invoices', 'list']);
    expect(invoiceKeys.list({ page: 1 })).toEqual(['invoices', 'list', { page: 1 }]);
    expect(invoiceKeys.details()).toEqual(['invoices', 'detail']);
    expect(invoiceKeys.detail('abc')).toEqual(['invoices', 'detail', 'abc']);
    expect(invoiceKeys.stats()).toEqual(['invoices', 'stats']);
  });
});

// ── useInvoiceList ─────────────────────────────────────────

describe('useInvoiceList', () => {
  it('should fetch and select invoice list', async () => {
    const invoices = [{ _id: '1', invoiceNumber: 'INV-001' }];
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: { invoices, pagination } });

    const { result } = renderHook(() => useInvoiceList({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(invoices);
    expect(result.current.data?.pagination).toEqual(pagination);
    expect(mockGet).toHaveBeenCalledWith('/api/invoices', { params: { page: 1 } });
  });
});

// ── useInvoiceDetail ───────────────────────────────────────

describe('useInvoiceDetail', () => {
  it('should fetch and select a single invoice', async () => {
    const invoice = { _id: 'inv-1', invoiceNumber: 'INV-001' };
    mockGet.mockResolvedValue({ success: true, data: { invoice } });

    const { result } = renderHook(() => useInvoiceDetail('inv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(invoice);
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useInvoiceDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useInvoiceStats ────────────────────────────────────────

describe('useInvoiceStats', () => {
  it('should fetch and select stats', async () => {
    const stats = { overall: { totalInvoices: 10 } };
    mockGet.mockResolvedValue({ success: true, data: { stats } });

    const { result } = renderHook(() => useInvoiceStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

// ── Mutations ──────────────────────────────────────────────

describe('useCreateInvoice', () => {
  it('should call POST /api/invoices', async () => {
    mockPost.mockResolvedValue({ success: true, data: { invoice: { _id: '1' } } });

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ invoiceNumber: 'INV-002' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/invoices', { invoiceNumber: 'INV-002' });
  });
});

describe('useIssueInvoice', () => {
  it('should call POST /api/invoices/:id/issue', async () => {
    mockPost.mockResolvedValue({ success: true, data: { invoice: { _id: '1' } } });

    const { result } = renderHook(() => useIssueInvoice(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('inv-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/invoices/inv-1/issue');
  });
});

describe('useCancelInvoice', () => {
  it('should call DELETE /api/invoices/:id', async () => {
    mockDelete.mockResolvedValue({ success: true, data: { invoice: { _id: '1' } } });

    const { result } = renderHook(() => useCancelInvoice(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('inv-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/invoices/inv-1');
  });
});

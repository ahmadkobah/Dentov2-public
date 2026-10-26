/**
 * useBilling hooks — Unit Tests
 *
 * Tests query key factories, stats, invoice list, invoice detail, and send reminder mutation.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import {
  billingKeys,
  useBillingStats,
  useInvoices,
  useInvoiceDetail,
  useSendReminder,
} from '../hooks/useBilling.js';

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

describe('billingKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(billingKeys.all).toEqual(['billing']);
    expect(billingKeys.stats()).toEqual(['billing', 'stats']);
    expect(billingKeys.invoices()).toEqual(['billing', 'invoices']);
    expect(billingKeys.invoiceList({ page: 1 })).toEqual(['billing', 'invoices', { page: 1 }]);
    expect(billingKeys.invoiceDetail('inv-1')).toEqual(['billing', 'invoices', 'detail', 'inv-1']);
  });
});

// ── useBillingStats ────────────────────────────────────────

describe('useBillingStats', () => {
  it('should fetch and select billing stats', async () => {
    const stats = { mrr: 5000, arr: 60000, outstanding: 1200, overdue: 300 };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useBillingStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/billing/stats');
  });
});

// ── useInvoices ────────────────────────────────────────────

describe('useInvoices', () => {
  it('should fetch and select invoice list', async () => {
    const invoices = [{ _id: 'inv-1', number: 'INV-001', status: 'issued', amount: 99 }];
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockGet.mockResolvedValue({ success: true, data: invoices, meta });

    const { result } = renderHook(() => useInvoices({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(invoices);
    expect(result.current.data?.meta).toEqual(meta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/billing/invoices', {
      params: { page: 1 },
    });
  });

  it('should pass status filter to API', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderHook(() => useInvoices({ page: 1, status: 'overdue' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/billing/invoices', {
        params: { page: 1, status: 'overdue' },
      }),
    );
  });
});

// ── useInvoiceDetail ───────────────────────────────────────

describe('useInvoiceDetail', () => {
  it('should fetch a single invoice', async () => {
    const invoice = { _id: 'inv-1', number: 'INV-001', lineItems: [] };
    mockGet.mockResolvedValue({ success: true, data: invoice });

    const { result } = renderHook(() => useInvoiceDetail('inv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(invoice);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useInvoiceDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useSendReminder ────────────────────────────────────────

describe('useSendReminder', () => {
  it('should call POST /api/platform/billing/invoices/:id/remind', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSendReminder(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('inv-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/billing/invoices/inv-1/remind', {});
    expect(toast.success).toHaveBeenCalledWith('Payment reminder sent');
  });
});

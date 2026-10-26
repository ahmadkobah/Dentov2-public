/**
 * PaymentsPage — Render Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils.js';
import PaymentsPage from '../pages/PaymentsPage.js';

// ── Mock hooks ─────────────────────────────────────────────

const mockList = vi.fn();

vi.mock('../hooks/usePayments.js', () => ({
  usePaymentList: () => mockList(),
  useRefundPayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  paymentKeys: { all: ['payments'], lists: () => ['payments', 'list'] },
}));

vi.mock('@/stores/theme.store.js', () => ({
  useThemeStore: () => ({ direction: 'ltr' }),
}));

// ── Tests ──────────────────────────────────────────────────

describe('PaymentsPage', () => {
  it('should render loading skeleton', () => {
    mockList.mockReturnValue({ isLoading: true, data: undefined, error: null });

    render(<PaymentsPage />);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('should render error state', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Network error'),
      isError: true,
    });

    render(<PaymentsPage />);
    expect(screen.getAllByText(/error|failed|retry/i).length).toBeGreaterThan(0);
  });

  it('should render empty state when no payments', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: { items: [], pagination: { page: 1, totalPages: 0, total: 0 } },
      error: null,
      isError: false,
    });

    render(<PaymentsPage />);
    expect(screen.getByText(/no payments|empty/i)).toBeInTheDocument();
  });

  it('should render payment data', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            _id: 'p1',
            invoiceId: { _id: 'inv-1', invoiceNumber: 'INV-001' },
            amount: 500,
            paymentMethod: 'cash',
            status: 'completed',
            createdAt: '2025-01-15T00:00:00Z',
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
      error: null,
      isError: false,
    });

    render(<PaymentsPage />);
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });
});

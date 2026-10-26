/**
 * InvoiceListPage — Render Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils.js';
import InvoiceListPage from '../pages/InvoiceListPage.js';

// ── Mock hooks ─────────────────────────────────────────────

const mockList = vi.fn();
const mockIssueMutate = vi.fn();
const mockCancelMutate = vi.fn();

vi.mock('../hooks/useInvoices.js', () => ({
  useInvoiceList: () => mockList(),
  useInvoiceStats: () => ({ data: undefined }),
  useIssueInvoice: () => ({ mutateAsync: mockIssueMutate, isPending: false }),
  useCancelInvoice: () => ({ mutateAsync: mockCancelMutate, isPending: false }),
  invoiceKeys: { all: ['invoices'], lists: () => ['invoices', 'list'] },
}));

vi.mock('@/features/doctors/hooks/useDoctors.js', () => ({
  useDoctorList: () => ({ data: { items: [] } }),
}));

vi.mock('@/stores/theme.store.js', () => ({
  useThemeStore: () => ({ direction: 'ltr' }),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InvoiceListPage', () => {
  it('should render loading skeleton', () => {
    mockList.mockReturnValue({ isLoading: true, data: undefined, error: null });

    render(<InvoiceListPage />);

    // The page should show skeleton indicators when loading
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('should render error state', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Network error'),
      isError: true,
    });

    render(<InvoiceListPage />);

    expect(screen.getAllByText(/error|failed|retry/i).length).toBeGreaterThan(0);
  });

  it('should render empty state when no invoices', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: { items: [], pagination: { page: 1, totalPages: 0, total: 0 } },
      error: null,
      isError: false,
    });

    render(<InvoiceListPage />);

    expect(screen.getByText(/no invoices|empty/i)).toBeInTheDocument();
  });

  it('should render invoice data in table', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            _id: '1',
            invoiceNumber: 'INV-001',
            patientId: {
              _id: 'p1',
              firstName: { en: 'Ahmad' },
              lastName: { en: 'H' },
              patientCode: 'PAT-001',
            },
            totalAmount: 1500,
            balanceDue: 500,
            status: 'issued',
            createdAt: '2025-01-15T00:00:00Z',
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
      error: null,
      isError: false,
    });

    render(<InvoiceListPage />);

    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });
});

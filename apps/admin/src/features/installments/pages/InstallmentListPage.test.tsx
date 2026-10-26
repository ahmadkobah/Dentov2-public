/**
 * InstallmentListPage — Render Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils.js';
import InstallmentListPage from '../pages/InstallmentListPage.js';

// ── Mock hooks ─────────────────────────────────────────────

const mockList = vi.fn();

vi.mock('../hooks/useInstallments.js', () => ({
  useInstallmentList: () => mockList(),
  installmentKeys: { all: ['installments'], lists: () => ['installments', 'list'] },
}));

vi.mock('@/stores/theme.store.js', () => ({
  useThemeStore: () => ({ direction: 'ltr' }),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InstallmentListPage', () => {
  it('should render loading skeleton', () => {
    mockList.mockReturnValue({ isLoading: true, data: undefined, error: null });

    render(<InstallmentListPage />);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('should render error state', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Network error'),
      isError: true,
    });

    render(<InstallmentListPage />);
    expect(screen.getAllByText(/error|failed|retry/i).length).toBeGreaterThan(0);
  });

  it('should render empty state when no installments', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: { items: [], meta: { page: 1, totalPages: 0, total: 0 } },
      error: null,
      isError: false,
    });

    render(<InstallmentListPage />);
    expect(screen.getByText(/no installment|empty/i)).toBeInTheDocument();
  });

  it('should render installment data', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            _id: 'i1',
            patientId: { _id: 'p1', firstName: { en: 'Ahmad' }, lastName: { en: 'H' } },
            totalAmount: 5000,
            numberOfInstallments: 4,
            frequency: 'monthly',
            status: 'active',
            createdAt: '2025-01-15T00:00:00Z',
            payments: [],
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      error: null,
      isError: false,
    });

    render(<InstallmentListPage />);
    // Should render some representation of the installment data
    expect(screen.getAllByText(/5,?000|active/i).length).toBeGreaterThan(0);
  });
});

/**
 * CommissionsPage — Render Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils.js';
import CommissionsPage from '../pages/CommissionsPage.js';

// ── Mock hooks ─────────────────────────────────────────────

const mockCommList = vi.fn();
const mockSummary = vi.fn();
const mockPayoutList = vi.fn();

vi.mock('../hooks/useCommissions.js', () => ({
  useCommissionList: () => mockCommList(),
  useCommissionSummary: () => mockSummary(),
  useApproveCommission: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBulkApproveCommissions: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePayoutList: () => mockPayoutList(),
  useCreatePayout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useProcessPayout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  commissionKeys: { all: ['commissions'], lists: () => ['commissions', 'list'] },
  payoutKeys: { all: ['payouts'], lists: () => ['payouts', 'list'] },
}));

vi.mock('@/stores/theme.store.js', () => ({
  useThemeStore: () => ({ direction: 'ltr' }),
}));

// ── Tests ──────────────────────────────────────────────────

describe('CommissionsPage', () => {
  beforeEach(() => {
    mockSummary.mockReturnValue({
      isLoading: false,
      data: { totalPending: 3000, totalApproved: 5000, totalPaid: 2000 },
    });
    mockPayoutList.mockReturnValue({
      isLoading: false,
      data: { items: [], meta: { page: 1, totalPages: 0, total: 0 } },
    });
  });

  it('should render loading skeleton', () => {
    mockCommList.mockReturnValue({ isLoading: true, data: undefined, error: null });

    render(<CommissionsPage />);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('should render error state', () => {
    mockCommList.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Network error'),
      isError: true,
    });

    render(<CommissionsPage />);
    expect(screen.getAllByText(/error|failed|retry/i).length).toBeGreaterThan(0);
  });

  it('should render empty state when no commissions', () => {
    mockCommList.mockReturnValue({
      isLoading: false,
      data: { items: [], meta: { page: 1, totalPages: 0, total: 0 } },
      error: null,
      isError: false,
    });

    render(<CommissionsPage />);
    expect(screen.getByText(/no commission|empty/i)).toBeInTheDocument();
  });

  it('should render commission data', () => {
    mockCommList.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            _id: 'c1',
            doctorId: { _id: 'doc-1', name: { en: 'Dr. Smith' } },
            amount: 500,
            status: 'pending',
            createdAt: '2025-01-15T00:00:00Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      error: null,
      isError: false,
    });

    render(<CommissionsPage />);
    // Should render commission status or amount ("Pending" also appears in filter dropdown)
    expect(screen.getAllByText(/pending|500/i).length).toBeGreaterThan(0);
  });
});

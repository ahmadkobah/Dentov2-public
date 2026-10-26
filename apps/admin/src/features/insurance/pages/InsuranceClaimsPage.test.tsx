/**
 * InsuranceClaimsPage — Render Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils.js';
import InsuranceClaimsPage from '../pages/InsuranceClaimsPage.js';

// ── Mock hooks ─────────────────────────────────────────────

const mockList = vi.fn();

vi.mock('../hooks/useInsurance.js', () => ({
  useInsuranceClaimList: () => mockList(),
  insuranceClaimKeys: { all: ['insurance-claims'], lists: () => ['insurance-claims', 'list'] },
}));

vi.mock('@/stores/theme.store.js', () => ({
  useThemeStore: () => ({ direction: 'ltr' }),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InsuranceClaimsPage', () => {
  it('should render loading skeleton', () => {
    mockList.mockReturnValue({ isLoading: true, data: undefined, error: null });

    render(<InsuranceClaimsPage />);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('should render error state', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Network error'),
      isError: true,
    });

    render(<InsuranceClaimsPage />);
    expect(screen.getAllByText(/error|failed|retry/i).length).toBeGreaterThan(0);
  });

  it('should render empty state when no claims', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: { items: [], meta: { page: 1, totalPages: 0, total: 0 } },
      error: null,
      isError: false,
    });

    render(<InsuranceClaimsPage />);
    expect(screen.getByText(/no claims|no insurance|empty/i)).toBeInTheDocument();
  });

  it('should render claim data', () => {
    mockList.mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            _id: 'cl1',
            claimNumber: 'CLM-001',
            patientId: { _id: 'p1', firstName: { en: 'Ahmad' }, lastName: { en: 'H' } },
            companyId: { _id: 'c1', name: { en: 'Alpha' } },
            totalAmount: 2000,
            status: 'submitted',
            createdAt: '2025-01-15T00:00:00Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      error: null,
      isError: false,
    });

    render(<InsuranceClaimsPage />);
    expect(screen.getByText('CLM-001')).toBeInTheDocument();
  });
});

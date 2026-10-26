/**
 * ReportsHubPage — Render Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils.js';
import ReportsHubPage from '../pages/ReportsHubPage.js';

// ── Mock hooks ─────────────────────────────────────────────

const mockStats = vi.fn();
const mockTrends = vi.fn();

vi.mock('../hooks/useReports.js', () => ({
  useDashboardStats: () => mockStats(),
  useDashboardTrends: () => mockTrends(),
  reportKeys: { all: ['reports'], dashboard: () => ['reports', 'dashboard'] },
}));

vi.mock('@/stores/theme.store.js', () => ({
  useThemeStore: () => ({ direction: 'ltr' }),
}));

// ── Tests ──────────────────────────────────────────────────

describe('ReportsHubPage', () => {
  it('should render loading state', () => {
    mockStats.mockReturnValue({ isLoading: true, data: undefined });
    mockTrends.mockReturnValue({ isLoading: true, data: undefined });

    render(<ReportsHubPage />);

    // Loading indicator should be present
    expect(
      document.querySelector('.animate-spin, [class*="loader"], [class*="skeleton"]'),
    ).toBeTruthy();
  });

  it('should render report category cards', () => {
    mockStats.mockReturnValue({
      isLoading: false,
      data: {
        todaysAppointments: { total: 10 },
        revenueThisMonth: { amount: 50000, trend: 5 },
        patientsThisMonth: { newPatients: 20, trend: 10 },
      },
    });
    mockTrends.mockReturnValue({
      isLoading: false,
      data: {
        revenueComparison: { currentMonth: 50000, previousMonth: 45000, percentChange: 11.1 },
        appointmentComparison: { currentMonth: 100, previousMonth: 90, percentChange: 11.1 },
        patientComparison: { currentMonth: 20, previousMonth: 15, percentChange: 33.3 },
        noShowComparison: { currentMonth: 5, previousMonth: 8, percentChange: -37.5 },
      },
    });

    render(<ReportsHubPage />);

    // Should render the 6 report category cards
    expect(screen.getAllByText(/financial/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/patient/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/appointment/i).length).toBeGreaterThan(0);
  });

  it('should render with fallback stats when data is unavailable', () => {
    mockStats.mockReturnValue({ isLoading: false, data: undefined, isError: true });
    mockTrends.mockReturnValue({ isLoading: false, data: undefined, isError: true });

    render(<ReportsHubPage />);

    // Should still render the page structure with fallback values
    expect(screen.getAllByText(/financial/i).length).toBeGreaterThan(0);
  });
});

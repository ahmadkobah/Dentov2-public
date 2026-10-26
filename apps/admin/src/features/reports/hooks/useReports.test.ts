/**
 * useReports hook — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  reportKeys,
  useDashboardStats,
  useDashboardTrends,
  useFinancialReport,
  useScheduleList,
  useCreateSchedule,
  useDeleteSchedule,
  useRunScheduleNow,
  useReportHistory,
  useSavedReports,
  useDeleteSavedReport,
  useExportReport,
} from '../hooks/useReports.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn(),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import { useAuthStore } from '@/stores/auth.store.js';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true });
});

// ── Query Keys ─────────────────────────────────────────────

describe('reportKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(reportKeys.all).toEqual(['reports']);
    expect(reportKeys.dashboard()).toEqual(['reports', 'dashboard']);
    expect(reportKeys.saved()).toEqual(['reports', 'saved']);
    expect(reportKeys.scheduled()).toEqual(['reports', 'scheduled']);
    expect(reportKeys.history()).toEqual(['reports', 'history']);
    expect(reportKeys.financial('revenue', {})).toEqual(['reports', 'financial', 'revenue', {}]);
  });
});

// ── Dashboard Queries ──────────────────────────────────────

describe('useDashboardStats', () => {
  it('should fetch dashboard stats', async () => {
    const stats = { todaysAppointments: { total: 10 } };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/dashboard/stats');
  });
});

describe('useDashboardTrends', () => {
  it('should fetch dashboard trends', async () => {
    const trends = { revenueComparison: { currentMonth: 5000 } };
    mockGet.mockResolvedValue({ success: true, data: trends });

    const { result } = renderHook(() => useDashboardTrends(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(trends);
    expect(mockGet).toHaveBeenCalledWith('/api/dashboard/trends');
  });
});

// ── Report Data Queries ────────────────────────────────────

describe('useFinancialReport', () => {
  it('should fetch a financial report by type', async () => {
    const reportData = { summary: {}, chart: [], table: { headers: [], rows: [] } };
    mockGet.mockResolvedValue({ success: true, data: reportData });

    const { result } = renderHook(() => useFinancialReport('revenue', { from: '2025-01-01' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/reports/financial/revenue', expect.any(Object));
  });

  it('should not fetch when type is empty', () => {
    const { result } = renderHook(() => useFinancialReport('', {}), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── Schedule Queries & Mutations ───────────────────────────

describe('useScheduleList', () => {
  it('should fetch scheduled reports', async () => {
    const schedules = [{ _id: 's1', name: 'Weekly Revenue' }];
    mockGet.mockResolvedValue({ success: true, data: { schedules, total: 1 } });

    const { result } = renderHook(() => useScheduleList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/reports/scheduled');
  });
});

describe('useCreateSchedule', () => {
  it('should call POST /api/reports/scheduled', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCreateSchedule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: 'Weekly', frequency: 'weekly' } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/reports/scheduled',
      expect.objectContaining({ name: 'Weekly' }),
    );
  });
});

describe('useDeleteSchedule', () => {
  it('should call DELETE /api/reports/scheduled/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteSchedule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('s1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/reports/scheduled/s1');
  });
});

describe('useRunScheduleNow', () => {
  it('should call POST /api/reports/scheduled/:id/run', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRunScheduleNow(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('s1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/reports/scheduled/s1/run');
  });
});

// ── History & Saved ────────────────────────────────────────

describe('useReportHistory', () => {
  it('should fetch report history', async () => {
    const history = [{ _id: 'h1', reportType: 'revenue' }];
    mockGet.mockResolvedValue({ success: true, data: { history, total: 1 } });

    const { result } = renderHook(() => useReportHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/reports/history');
  });
});

describe('useSavedReports', () => {
  it('should fetch saved reports', async () => {
    const reports = [{ _id: 'sr1', name: 'Revenue Q1' }];
    mockGet.mockResolvedValue({ success: true, data: { reports } });

    const { result } = renderHook(() => useSavedReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/reports/saved');
  });
});

describe('useDeleteSavedReport', () => {
  it('should call DELETE /api/reports/saved/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteSavedReport(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('sr1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/reports/saved/sr1');
  });
});

describe('useExportReport', () => {
  it('should call POST /api/reports/export', async () => {
    mockPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useExportReport(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      category: 'financial',
      reportType: 'revenue',
      format: 'pdf',
    } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/reports/export',
      expect.objectContaining({ category: 'financial', format: 'pdf' }),
    );
  });
});

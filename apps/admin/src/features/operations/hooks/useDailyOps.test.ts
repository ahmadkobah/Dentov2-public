/**
 * useDailyOps hooks — Unit Tests
 *
 * Tests query key factories, queue list/stats queries,
 * register/call/start/complete/no-show/cancel mutations,
 * and today-appointments query.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  dailyOpsKeys,
  useQueueList,
  useQueueStats,
  useQueueDetail,
  useRegisterWalkIn,
  useCallPatient,
  useStartTreatment,
  useCompleteTreatment,
  useMarkNoShow,
  useCancelQueueEntry,
  useTodayAppointments,
} from './useDailyOps.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@dento/ui', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

// ── Fixtures ───────────────────────────────────────────────

const mockEntry = {
  _id: 'wq1',
  branchId: 'branch-1',
  patientName: 'John Doe',
  phone: '01234567890',
  reason: 'Toothache',
  priority: 'normal',
  queueNumber: 1,
  status: 'waiting',
  createdAt: '2026-03-03T09:00:00.000Z',
  updatedAt: '2026-03-03T09:00:00.000Z',
};

const mockEntry2 = {
  _id: 'wq2',
  branchId: 'branch-1',
  patientName: 'Jane Smith',
  phone: '01234567891',
  priority: 'urgent',
  queueNumber: 2,
  status: 'called',
  doctorId: 'doc-1',
  doctorName: 'Dr. Ahmed',
  createdAt: '2026-03-03T09:05:00.000Z',
  updatedAt: '2026-03-03T09:10:00.000Z',
};

const mockPagination = { page: 1, limit: 100, total: 2, totalPages: 1 };

const mockStats = {
  waiting: 3,
  called: 1,
  inProgress: 2,
  completed: 5,
  noShow: 0,
  cancelled: 1,
  avgWaitMinutes: 12,
};

// ── Query Key Factory ──────────────────────────────────────

describe('dailyOpsKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(dailyOpsKeys.all).toEqual(['daily-ops']);
    expect(dailyOpsKeys.queue()).toEqual(['daily-ops', 'queue']);
    expect(dailyOpsKeys.queueList({ branchId: 'b1' })).toEqual([
      'daily-ops',
      'queue',
      'list',
      { branchId: 'b1' },
    ]);
    expect(dailyOpsKeys.queueStats('b1')).toEqual(['daily-ops', 'queue', 'stats', 'b1']);
    expect(dailyOpsKeys.queueDetail('wq1')).toEqual(['daily-ops', 'queue', 'detail', 'wq1']);
    expect(dailyOpsKeys.todayAppointments('b1')).toEqual(['daily-ops', 'appointments', 'b1']);
  });

  it('should share "all" root in every key', () => {
    expect(dailyOpsKeys.queue()[0]).toBe(dailyOpsKeys.all[0]);
    expect(dailyOpsKeys.todayAppointments('b1')[0]).toBe(dailyOpsKeys.all[0]);
  });
});

// ── useQueueList ───────────────────────────────────────────

describe('useQueueList', () => {
  it('should fetch walk-in queue list for a branch', async () => {
    mockGet.mockResolvedValue({
      data: { entries: [mockEntry, mockEntry2], pagination: mockPagination },
    });

    const { result } = renderHook(() => useQueueList({ branchId: 'branch-1', limit: 100 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entries).toHaveLength(2);
    expect(result.current.data?.entries[0]._id).toBe('wq1');
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/api/walk-in-queue'));
  });

  it('should not fetch when branchId is empty', () => {
    const { result } = renderHook(() => useQueueList({ branchId: '' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useQueueList({ branchId: 'branch-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});

// ── useQueueStats ──────────────────────────────────────────

describe('useQueueStats', () => {
  it('should fetch queue statistics', async () => {
    mockGet.mockResolvedValue({ data: { stats: mockStats } });

    const { result } = renderHook(() => useQueueStats('branch-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/api/walk-in-queue/stats'));
  });

  it('should not fetch when branchId is empty', () => {
    const { result } = renderHook(() => useQueueStats(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useQueueDetail ─────────────────────────────────────────

describe('useQueueDetail', () => {
  it('should fetch a single queue entry by ID', async () => {
    mockGet.mockResolvedValue({ data: { entry: mockEntry } });

    const { result } = renderHook(() => useQueueDetail('wq1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockEntry);
    expect(mockGet).toHaveBeenCalledWith('/api/walk-in-queue/wq1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useQueueDetail(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });
});

// ── useRegisterWalkIn ──────────────────────────────────────

describe('useRegisterWalkIn', () => {
  it('should POST to /api/walk-in-queue', async () => {
    mockPost.mockResolvedValue({ data: { entry: mockEntry } });

    const { result } = renderHook(() => useRegisterWalkIn(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        branchId: 'branch-1',
        patientName: 'John Doe',
        phone: '01234567890',
        reason: 'Toothache',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/walk-in-queue', {
      branchId: 'branch-1',
      patientName: 'John Doe',
      phone: '01234567890',
      reason: 'Toothache',
    });
  });

  it('should handle registration error', async () => {
    mockPost.mockRejectedValue(new Error('Validation failed'));

    const { result } = renderHook(() => useRegisterWalkIn(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ branchId: 'branch-1', patientName: 'John Doe' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Validation failed');
  });
});

// ── useCallPatient ─────────────────────────────────────────

describe('useCallPatient', () => {
  it('should PATCH to /api/walk-in-queue/:id/call', async () => {
    mockPatch.mockResolvedValue({ data: { entry: { ...mockEntry, status: 'called' } } });

    const { result } = renderHook(() => useCallPatient(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'wq1', doctorId: 'doc-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/walk-in-queue/wq1/call', { doctorId: 'doc-1' });
  });

  it('should handle call error', async () => {
    mockPatch.mockRejectedValue(new Error('Already called'));

    const { result } = renderHook(() => useCallPatient(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'wq1', doctorId: 'doc-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useStartTreatment ──────────────────────────────────────

describe('useStartTreatment', () => {
  it('should PATCH to /api/walk-in-queue/:id/start', async () => {
    mockPatch.mockResolvedValue({ data: { entry: { ...mockEntry, status: 'in_progress' } } });

    const { result } = renderHook(() => useStartTreatment(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'wq1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/walk-in-queue/wq1/start', {});
  });
});

// ── useCompleteTreatment ───────────────────────────────────

describe('useCompleteTreatment', () => {
  it('should PATCH to /api/walk-in-queue/:id/complete', async () => {
    mockPatch.mockResolvedValue({ data: { entry: { ...mockEntry, status: 'completed' } } });

    const { result } = renderHook(() => useCompleteTreatment(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wq1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/walk-in-queue/wq1/complete');
  });
});

// ── useMarkNoShow ──────────────────────────────────────────

describe('useMarkNoShow', () => {
  it('should PATCH to /api/walk-in-queue/:id/no-show', async () => {
    mockPatch.mockResolvedValue({ data: { entry: { ...mockEntry, status: 'no_show' } } });

    const { result } = renderHook(() => useMarkNoShow(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wq1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/walk-in-queue/wq1/no-show');
  });
});

// ── useCancelQueueEntry ────────────────────────────────────

describe('useCancelQueueEntry', () => {
  it('should PATCH to /api/walk-in-queue/:id/cancel', async () => {
    mockPatch.mockResolvedValue({ data: { entry: { ...mockEntry, status: 'cancelled' } } });

    const { result } = renderHook(() => useCancelQueueEntry(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wq1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/walk-in-queue/wq1/cancel');
  });

  it('should handle cancel error', async () => {
    mockPatch.mockRejectedValue(new Error('Already cancelled'));

    const { result } = renderHook(() => useCancelQueueEntry(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('wq1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useTodayAppointments ───────────────────────────────────

describe('useTodayAppointments', () => {
  it('should fetch today appointments for a branch', async () => {
    const mockAppt = {
      _id: 'appt1',
      patientId: 'p1',
      doctorId: 'doc-1',
      branchId: 'branch-1',
      date: '2026-03-03',
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      type: 'consultation',
      status: 'booked',
      source: 'online',
      isWalkIn: false,
    };

    mockGet.mockResolvedValue({
      data: {
        appointments: [mockAppt],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
    });

    const { result } = renderHook(() => useTodayAppointments('branch-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]._id).toBe('appt1');
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/api/appointments'));
  });

  it('should not fetch when branchId is empty', () => {
    const { result } = renderHook(() => useTodayAppointments(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });
});

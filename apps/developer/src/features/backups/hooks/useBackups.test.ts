/**
 * useBackups hooks — Unit Tests
 *
 * Tests query key factories, list/detail/stats/config queries,
 * trigger/restore/retention/delete/config mutations, and loading/error states.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  backupKeys,
  useBackups,
  useBackupDetail,
  useBackupStats,
  useBackupConfig,
  useTriggerBackup,
  useRestoreBackup,
  useUpdateRetention,
  useDeleteBackup,
  useUpdateBackupConfig,
} from '../hooks/useBackups.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockPut = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Query Key Factory ──────────────────────────────────────

describe('backupKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(backupKeys.all).toEqual(['backups']);
    expect(backupKeys.lists()).toEqual(['backups', 'list']);
    expect(backupKeys.list({ status: 'completed' })).toEqual([
      'backups',
      'list',
      { status: 'completed' },
    ]);
    expect(backupKeys.details()).toEqual(['backups', 'detail']);
    expect(backupKeys.detail('b1')).toEqual(['backups', 'detail', 'b1']);
    expect(backupKeys.stats()).toEqual(['backups', 'stats']);
    expect(backupKeys.config()).toEqual(['backups', 'config']);
  });
});

// ── useBackups ─────────────────────────────────────────────

describe('useBackups', () => {
  const mockBackups = [
    { _id: 'b1', tenantSlug: 'clinic-a', status: 'completed', type: 'scheduled' },
    { _id: 'b2', tenantSlug: 'clinic-b', status: 'pending', type: 'manual' },
  ];
  const mockMeta = { page: 1, limit: 20, total: 2, totalPages: 1 };

  it('should fetch and select backup list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockBackups,
      meta: mockMeta,
    });

    const { result } = renderHook(() => useBackups({ page: 1, limit: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(mockBackups);
    expect(result.current.data?.meta).toEqual(mockMeta);
  });

  it('should build query string from filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: [], meta: mockMeta });

    const { result } = renderHook(
      () => useBackups({ tenantSlug: 'clinic-a', status: 'completed', page: 2, limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('tenantSlug=clinic-a'));
  });
});

// ── useBackupDetail ────────────────────────────────────────

describe('useBackupDetail', () => {
  it('should fetch a single backup', async () => {
    const backup = { _id: 'b1', status: 'completed', type: 'scheduled' };
    mockGet.mockResolvedValue({ success: true, data: backup });

    const { result } = renderHook(() => useBackupDetail('b1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(backup);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useBackupDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useBackupStats ─────────────────────────────────────────

describe('useBackupStats', () => {
  it('should fetch backup stats', async () => {
    const stats = {
      overview: {
        totalBackups: 10,
        completedBackups: 8,
        failedBackups: 2,
        totalStorageBytes: 1024,
      },
      latestBackup: null,
      byTenant: [],
    };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useBackupStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

// ── useBackupConfig ────────────────────────────────────────

describe('useBackupConfig', () => {
  it('should fetch backup config', async () => {
    const config = {
      _id: 'cfg1',
      scheduleEnabled: true,
      scheduleCron: '0 2 * * *',
      retentionDays: 30,
    };
    mockGet.mockResolvedValue({ success: true, data: config });

    const { result } = renderHook(() => useBackupConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(config);
    expect(mockGet).toHaveBeenCalledWith('/api/backups/config');
  });
});

// ── useTriggerBackup ───────────────────────────────────────

describe('useTriggerBackup', () => {
  it('should call POST /api/backups with input', async () => {
    mockPost.mockResolvedValue({ success: true, data: { _id: 'b-new' } });

    const { result } = renderHook(() => useTriggerBackup(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ tenantSlug: 'clinic-a', type: 'manual' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/backups', {
      tenantSlug: 'clinic-a',
      type: 'manual',
    });
  });
});

// ── useRestoreBackup ───────────────────────────────────────

describe('useRestoreBackup', () => {
  it('should call POST /api/backups/:id/restore', async () => {
    mockPost.mockResolvedValue({ success: true, data: { message: 'Restore initiated' } });

    const { result } = renderHook(() => useRestoreBackup(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('b1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/backups/b1/restore');
  });
});

// ── useUpdateRetention ─────────────────────────────────────

describe('useUpdateRetention', () => {
  it('should call PATCH /api/backups/:id/retention', async () => {
    mockPatch.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useUpdateRetention(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'b1', retentionDays: 60 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/backups/b1/retention', { retentionDays: 60 });
  });
});

// ── useDeleteBackup ────────────────────────────────────────

describe('useDeleteBackup', () => {
  it('should call DELETE /api/backups/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteBackup(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('b1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/backups/b1');
  });
});

// ── useUpdateBackupConfig ──────────────────────────────────

describe('useUpdateBackupConfig', () => {
  it('should call PUT /api/backups/config', async () => {
    mockPut.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useUpdateBackupConfig(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ scheduleEnabled: false, retentionDays: 14 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith('/api/backups/config', {
      scheduleEnabled: false,
      retentionDays: 14,
    });
  });
});

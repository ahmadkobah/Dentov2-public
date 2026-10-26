/**
 * useModules hooks — Unit Tests
 *
 * Tests query key factories, module list with filters, stats query.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { moduleKeys, useModules, useModuleStats } from '../hooks/useModules.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Fixtures ───────────────────────────────────────────────

const mockModule = {
  _id: 'mod-1',
  slug: 'imaging',
  name: { en: 'Imaging', ar: 'التصوير' },
  description: { en: 'Dental imaging module' },
  version: '1.2.0',
  status: 'active',
  type: 'paid',
  icon: 'Camera',
  isActive: true,
  dependsOn: [],
  conflictsWith: [],
  changelog: [{ version: '1.2.0', date: '2025-06-01', changes: ['Bug fixes'] }],
  tenantCount: 25,
  pricing: { basePrice: 49, isFree: false, billingCycle: 'monthly' },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-06-01T00:00:00.000Z',
};

const mockStats = {
  totalModules: 12,
  activeModules: 8,
  betaModules: 2,
  deprecatedModules: 1,
  coreModules: 4,
  paidModules: 8,
  totalInstallations: 340,
  statusBreakdown: { active: 8, beta: 2, deprecated: 1, development: 1 },
  topModules: [{ slug: 'imaging', count: 25, name: { en: 'Imaging' }, icon: 'Camera' }],
};

// ── Query Key Factory ──────────────────────────────────────

describe('moduleKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(moduleKeys.all).toEqual(['modules']);
    expect(moduleKeys.lists()).toEqual(['modules', 'list']);
    expect(moduleKeys.list({ search: 'imaging', status: 'active' })).toEqual([
      'modules',
      'list',
      { search: 'imaging', status: 'active' },
    ]);
    expect(moduleKeys.stats()).toEqual(['modules', 'stats']);
  });

  it('should share "all" root in every key', () => {
    expect(moduleKeys.lists()[0]).toBe(moduleKeys.all[0]);
    expect(moduleKeys.stats()[0]).toBe(moduleKeys.all[0]);
  });
});

// ── useModules (list) ─────────────────────────────────────

describe('useModules', () => {
  it('should fetch and select modules from nested response', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [mockModule],
    });

    const { result } = renderHook(() => useModules({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([mockModule]);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/modules', {
      params: {},
    });
  });

  it('should pass search and filter params', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { modules: [mockModule] },
    });

    renderHook(() => useModules({ search: 'imaging', status: 'active', type: 'paid' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/platform/modules', {
        params: { search: 'imaging', status: 'active', type: 'paid' },
      }),
    );
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useModules({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useModules({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useModuleStats ────────────────────────────────────────

describe('useModuleStats', () => {
  it('should fetch and select module stats', async () => {
    mockGet.mockResolvedValue({ success: true, data: mockStats });

    const { result } = renderHook(() => useModuleStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/modules/stats');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useModuleStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

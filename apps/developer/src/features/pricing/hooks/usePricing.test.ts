/**
 * usePricing hooks — Unit Tests
 *
 * Tests query key factories, module pricing / coupons / discounts / stats queries,
 * and update module pricing / create coupon / delete coupon mutations with toast.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from '@dento/ui';
import { createWrapper } from '@/test/test-utils.js';
import {
  pricingKeys,
  useModulePricing,
  useCoupons,
  useGlobalDiscounts,
  usePricingStats,
  useUpdateModulePricing,
  useCreateCoupon,
  useDeleteCoupon,
} from '../hooks/usePricing.js';

// ── Mock apiClient + toast ─────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('@dento/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn() },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Fixtures ───────────────────────────────────────────────

const mockModule = {
  id: 'mod-1',
  slug: 'imaging',
  name: 'Imaging',
  description: 'Dental imaging module',
  monthlyPrice: 49,
  yearlyPrice: 470,
  usageLimitLabel: 'Scans/month',
  usageLimitValue: 500,
  isActive: true,
};

const mockCoupon = {
  id: 'cpn-1',
  code: 'SAVE20',
  discountType: 'percentage' as const,
  discountValue: 20,
  maxRedemptions: 100,
  timesRedeemed: 15,
  expiresAt: '2025-12-31T23:59:59.000Z',
  isActive: true,
};

const mockDiscount = {
  id: 'disc-1',
  name: 'Annual Discount',
  type: 'annual' as const,
  discountPercent: 15,
  condition: 'Annual billing cycle',
  isActive: true,
};

const mockStats = {
  avgRevenuePerTenant: '$185.50',
  activeModules: 8,
  activeCoupons: 3,
  monthlyProjectedRevenue: '$12,500',
};

// ── Query Key Factory ──────────────────────────────────────

describe('pricingKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(pricingKeys.all).toEqual(['pricing']);
    expect(pricingKeys.modules()).toEqual(['pricing', 'modules']);
    expect(pricingKeys.coupons()).toEqual(['pricing', 'coupons']);
    expect(pricingKeys.discounts()).toEqual(['pricing', 'discounts']);
    expect(pricingKeys.stats()).toEqual(['pricing', 'stats']);
  });

  it('should share "all" root in every key', () => {
    expect(pricingKeys.modules()[0]).toBe(pricingKeys.all[0]);
    expect(pricingKeys.coupons()[0]).toBe(pricingKeys.all[0]);
    expect(pricingKeys.discounts()[0]).toBe(pricingKeys.all[0]);
    expect(pricingKeys.stats()[0]).toBe(pricingKeys.all[0]);
  });
});

// ── useModulePricing ───────────────────────────────────────

describe('useModulePricing', () => {
  it('should fetch and select module pricing list', async () => {
    mockGet.mockResolvedValue({ success: true, data: [mockModule] });

    const { result } = renderHook(() => useModulePricing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockModule]);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/pricing/modules');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useModulePricing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useCoupons ─────────────────────────────────────────────

describe('useCoupons', () => {
  it('should fetch and select coupons list', async () => {
    mockGet.mockResolvedValue({ success: true, data: [mockCoupon] });

    const { result } = renderHook(() => useCoupons(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockCoupon]);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/pricing/coupons');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCoupons(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useGlobalDiscounts ─────────────────────────────────────

describe('useGlobalDiscounts', () => {
  it('should fetch and select global discounts list', async () => {
    mockGet.mockResolvedValue({ success: true, data: [mockDiscount] });

    const { result } = renderHook(() => useGlobalDiscounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockDiscount]);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/pricing/discounts');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGlobalDiscounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── usePricingStats ────────────────────────────────────────

describe('usePricingStats', () => {
  it('should fetch and select pricing stats', async () => {
    mockGet.mockResolvedValue({ success: true, data: mockStats });

    const { result } = renderHook(() => usePricingStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/pricing/stats');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => usePricingStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useUpdateModulePricing ─────────────────────────────────

describe('useUpdateModulePricing', () => {
  it('should PATCH module pricing and show toast', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateModulePricing(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        slug: 'mod-1',
        basePrice: 59,
        yearlyDiscount: 10,
        isActive: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/pricing/module/mod-1', {
      basePrice: 59,
      yearlyDiscount: 10,
      isActive: true,
    });
    expect(toast.success).toHaveBeenCalledWith('Module pricing updated');
  });

  it('should show error toast on failure', async () => {
    mockPatch.mockRejectedValue(new Error('Validation error'));

    const { result } = renderHook(() => useUpdateModulePricing(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        slug: 'mod-1',
        basePrice: -1,
        yearlyDiscount: 0,
        isActive: false,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to update module pricing');
  });
});

// ── useCreateCoupon ────────────────────────────────────────

describe('useCreateCoupon', () => {
  it('should POST to coupons endpoint and show toast', async () => {
    mockPost.mockResolvedValue({ success: true, data: mockCoupon });

    const { result } = renderHook(() => useCreateCoupon(), {
      wrapper: createWrapper(),
    });

    const payload = {
      code: 'SAVE20',
      discountPercent: 20,
      maxUses: 100,
      appliesTo: 'all' as const,
      expiresAt: '2025-12-31T23:59:59.000Z',
    };

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/pricing/coupons', payload);
    expect(toast.success).toHaveBeenCalledWith('Coupon created');
  });

  it('should show error toast on failure', async () => {
    mockPost.mockRejectedValue(new Error('Duplicate code'));

    const { result } = renderHook(() => useCreateCoupon(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        code: 'DUP',
        discountPercent: 10,
        maxUses: 50,
        appliesTo: 'all' as const,
        expiresAt: '2026-12-31T23:59:59.000Z',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to create coupon');
  });
});

// ── useDeleteCoupon ────────────────────────────────────────

describe('useDeleteCoupon', () => {
  it('should DELETE coupon and show toast', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteCoupon(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('cpn-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/pricing/coupons/cpn-1');
    expect(toast.success).toHaveBeenCalledWith('Coupon deleted');
  });

  it('should show error toast on failure', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useDeleteCoupon(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('cpn-999');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to delete coupon');
  });
});

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: {
    code: string;
    discountType: 'percent' | 'fixed_amount';
    discountPercent: number;
    discountAmount: number;
    duration: 'once' | 'repeating' | 'forever';
    durationMonths: number;
    expiresAt: string;
  };
}

interface CouponRedemption {
  couponCode: string;
  redeemedAt: string;
  discountType: 'percent' | 'fixed_amount';
  discountPercent: number;
  discountAmount: number;
  duration: 'once' | 'repeating' | 'forever';
  durationMonths: number;
  remainingMonths: number;
}

/* ------------------------------------------------------------------ */
/*  Query Keys                                                         */
/* ------------------------------------------------------------------ */

export const couponKeys = {
  all: ['subscription-coupons'] as const,
  redeemed: () => [...couponKeys.all, 'redeemed'] as const,
};

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useRedeemedCoupons() {
  return useQuery({
    queryKey: couponKeys.redeemed(),
    queryFn: () =>
      apiClient.get<{ success: boolean; data: CouponRedemption[] }>('/api/subscription/coupons'),
    select: (res) => res.data,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (code: string) =>
      apiClient.post<{ success: boolean; data: CouponValidation }>(
        '/api/subscription/coupons/validate',
        { code },
      ),
  });
}

export function useRedeemCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      apiClient.post<{ success: boolean; data: { message: string } }>(
        '/api/subscription/coupons/redeem',
        { code },
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: couponKeys.redeemed() });
      qc.invalidateQueries({ queryKey: ['subscription'] });
      toast.success(res.data?.message ?? 'Coupon redeemed');
    },
    onError: () => {
      toast.error('Failed to redeem coupon');
    },
  });
}

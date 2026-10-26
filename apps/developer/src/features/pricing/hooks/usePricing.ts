import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Local types (TODO: migrate to @dento/shared)                       */
/* ------------------------------------------------------------------ */

export interface RegionPrice {
  countryCode: string;
  price: number;
  currency: string;
}

export interface LanguagePrice {
  languageCode: string;
  price: number;
  isActive: boolean;
  regionPrices: RegionPrice[];
}

export interface ModulePricingItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  usageLimitLabel: string;
  usageLimitValue: number;
  isActive: boolean;
  regionPrices: RegionPrice[];
  languagePrices?: LanguagePrice[];
}

export interface RegionalAmount {
  countryCode: string;
  currency: string;
  amount: number;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percent' | 'fixed_amount';
  discountPercent: number;
  discountAmount: number;
  maxUses: number;
  usedCount: number;
  appliesTo: string;
  expiresAt: string;
  isActive: boolean;
  allowedCountries: string[];
  allowedCurrencies: string[];
  regionalAmounts: RegionalAmount[];
}

export interface GlobalDiscount {
  _id: string;
  name: string;
  discountType: 'percent' | 'fixed_amount';
  discountPercent: number;
  discountAmount: number;
  appliesTo: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  allowedCountries: string[];
  allowedCurrencies: string[];
  regionalAmounts: RegionalAmount[];
}

export interface PricingStats {
  avgRevenuePerTenant: string;
  activeModules: number;
  activeCoupons: number;
  monthlyProjectedRevenue: string;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface ModuleListResponse {
  success: boolean;
  data: ModulePricingItem[];
}

interface CouponListResponse {
  success: boolean;
  data: Coupon[];
}

interface DiscountListResponse {
  success: boolean;
  data: GlobalDiscount[];
}

interface PricingStatsResponse {
  success: boolean;
  data: PricingStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const pricingKeys = {
  all: ['pricing'] as const,
  modules: () => [...pricingKeys.all, 'modules'] as const,
  coupons: () => [...pricingKeys.all, 'coupons'] as const,
  discounts: () => [...pricingKeys.all, 'discounts'] as const,
  stats: () => [...pricingKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useModulePricing() {
  return useQuery({
    queryKey: pricingKeys.modules(),
    queryFn: () => apiClient.get<ModuleListResponse>('/api/platform/pricing/modules'),
    select: (res) => res.data,
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: pricingKeys.coupons(),
    queryFn: () => apiClient.get<CouponListResponse>('/api/platform/pricing/coupons'),
    select: (res) => res.data,
  });
}

export function useGlobalDiscounts() {
  return useQuery({
    queryKey: pricingKeys.discounts(),
    queryFn: () => apiClient.get<DiscountListResponse>('/api/platform/pricing/discounts'),
    select: (res) => res.data,
  });
}

export function usePricingStats() {
  return useQuery({
    queryKey: pricingKeys.stats(),
    queryFn: () => apiClient.get<PricingStatsResponse>('/api/platform/pricing/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutation input types                                               */
/* ------------------------------------------------------------------ */

export interface UpdateModulePricingInput {
  slug: string;
  basePrice?: number;
  yearlyDiscount?: number;
  isActive?: boolean;
  isFree?: boolean;
  trialDays?: number;
  regionPrices?: RegionPrice[];
  languagePrices?: LanguagePrice[];
}

export interface CreateCouponInput {
  code: string;
  discountType?: 'percent' | 'fixed_amount';
  discountPercent?: number;
  discountAmount?: number;
  maxUses: number;
  appliesTo: 'all' | string[];
  expiresAt: string; // ISO datetime
  allowedCountries?: string[];
  allowedCurrencies?: string[];
  regionalAmounts?: RegionalAmount[];
}

export interface UpdateCouponInput {
  id: string;
  discountType?: 'percent' | 'fixed_amount';
  discountPercent?: number;
  discountAmount?: number;
  maxUses?: number;
  appliesTo?: 'all' | string[];
  expiresAt?: string;
  isActive?: boolean;
  allowedCountries?: string[];
  allowedCurrencies?: string[];
  regionalAmounts?: RegionalAmount[];
}

export interface CreateDiscountInput {
  name: string;
  discountType?: 'percent' | 'fixed_amount';
  discountPercent?: number;
  discountAmount?: number;
  appliesTo: 'all' | string[];
  startsAt: string; // ISO datetime
  expiresAt: string; // ISO datetime
  allowedCountries?: string[];
  allowedCurrencies?: string[];
  regionalAmounts?: RegionalAmount[];
}

export interface UpdateDiscountInput {
  id: string;
  name?: string;
  discountType?: 'percent' | 'fixed_amount';
  discountPercent?: number;
  discountAmount?: number;
  appliesTo?: 'all' | string[];
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  allowedCountries?: string[];
  allowedCurrencies?: string[];
  regionalAmounts?: RegionalAmount[];
}

export interface CalculatePriceInput {
  tenantId: string;
  moduleSlug: string;
  couponCode?: string;
}

export interface PriceCalculation {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  discountSource: string;
  discountPercent: number;
  isFree: boolean;
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useUpdateModulePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...data }: UpdateModulePricingInput) =>
      apiClient.patch(`/api/platform/pricing/module/${slug}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      toast.success('Module pricing updated');
    },
    onError: () => {
      toast.error('Failed to update module pricing');
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCouponInput) => apiClient.post('/api/platform/pricing/coupons', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      toast.success('Coupon created');
    },
    onError: () => {
      toast.error('Failed to create coupon');
    },
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCouponInput) =>
      apiClient.patch(`/api/platform/pricing/coupons/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      toast.success('Coupon updated');
    },
    onError: () => {
      toast.error('Failed to update coupon');
    },
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/pricing/coupons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      toast.success('Coupon deleted');
    },
    onError: () => {
      toast.error('Failed to delete coupon');
    },
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDiscountInput) =>
      apiClient.post('/api/platform/pricing/discounts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      toast.success('Discount created');
    },
    onError: () => {
      toast.error('Failed to create discount');
    },
  });
}

export function useUpdateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDiscountInput) =>
      apiClient.patch(`/api/platform/pricing/discounts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      toast.success('Discount updated');
    },
    onError: () => {
      toast.error('Failed to update discount');
    },
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/pricing/discounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pricingKeys.all });
      toast.success('Discount deleted');
    },
    onError: () => {
      toast.error('Failed to delete discount');
    },
  });
}

export function useCalculatePrice() {
  return useMutation({
    mutationFn: (data: CalculatePriceInput) =>
      apiClient.post<{ success: boolean; data: { calculation: PriceCalculation } }>(
        '/api/platform/pricing/calculate',
        data,
      ),
  });
}

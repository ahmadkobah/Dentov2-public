/**
 * Pricing System Types — §28 Pricing System (Module-Only, dynamisch konfigurierbar)
 *
 * No plan system — only modules. Every tenant gets FREE:
 * - Platform access (Login, Dashboard, Settings)
 * - 10 Users (then $5/User/Mo)
 * - 1 Branch
 * - 1 GB Storage
 *
 * All prices are configurable in Dev Portal — no code deployment needed.
 *
 * Price Calculation Order:
 * 1. priceOverride in tenant_modules → use this price
 * 2. Active coupon for this tenant → apply coupon discount
 * 3. discountPercent in tenant_modules → apply tenant discount
 * 4. Active global discount → apply global discount
 * 5. Else: basePrice from pricing_config → standard price
 */

// ── Module Pricing Types ────────────────────────────────────

export type BillingCycle = 'monthly' | 'yearly';

export interface IRegionPrice {
  countryCode: string; // ISO 3166-1 alpha-2 (e.g. "EG", "SY", "DE")
  price: number; // Override price for this country
  currency: string; // Currency for this country (e.g. "EGP", "SYP", "EUR")
}

export interface ILanguagePrice {
  languageCode: string; // e.g. "ar", "fr", "de"
  price: number; // Base monthly price for this language (USD)
  isActive: boolean; // Whether this language price is active
  regionPrices: IRegionPrice[]; // Per-country price overrides (same shape as module regionPrices)
}

export interface IModulePricing {
  slug: string;
  basePrice: number; // Standard (global default) price
  currency: string; // Default: "USD"
  billingCycle: BillingCycle;
  yearlyDiscount: number; // % discount for yearly (e.g. 20)
  isActive: boolean; // Module available?
  isFree: boolean; // Free module?
  trialDays: number; // Free trial days (0 = no trial)
  regionPrices: IRegionPrice[]; // Per-country price overrides
  languagePrices?: ILanguagePrice[]; // Per-language prices (language_pack only)
}

// ── Usage Limits Types ──────────────────────────────────────

export interface IUsageLimits {
  freeUsers: number; // Default: 10
  extraUserPrice: number; // $/User/Mo after free tier
  freeStorageGB: number; // Default: 1
  extraStoragePrice: number; // $/GB/Mo after free tier
  freeBranches: number; // Default: 1
}

// ── Global Discount Types ───────────────────────────────────

export interface IGlobalDiscount {
  _id?: string;
  name: string;
  discountPercent: number; // 1-100
  appliesTo: 'all' | string[]; // "all" or array of module slugs
  startsAt: string; // ISO date
  expiresAt: string; // ISO date
  isActive: boolean;
}

// ── Coupon Types ────────────────────────────────────────────

export interface ICoupon {
  _id?: string;
  code: string; // Uppercase, unique
  discountPercent: number; // 1-100
  maxUses: number; // 0 = unlimited
  usedCount: number;
  appliesTo: 'all' | string[]; // "all" or array of module slugs
  expiresAt: string; // ISO date
  isActive: boolean;
}

// ── Pricing Config (Full Document) ──────────────────────────

export interface IPricingConfig {
  _id: string;
  modules: IModulePricing[];
  usageLimits: IUsageLimits;
  globalDiscounts: IGlobalDiscount[];
  coupons: ICoupon[];
  updatedAt: string;
  updatedBy: string;
}

// ── Default Module Prices (§28 table) ───────────────────────

/**
 * Core modules that are always enabled regardless of the tenant's
 * subscription or enabledModules array. These are free and cannot
 * be disabled.
 */
export const CORE_MODULES = new Set([
  'dashboard',
  'patients',
  'appointments',
  'doctors',
  'users',
  'settings',
  'notifications',
  'prescriptions',
  'subscription',
]);

export const DEFAULT_MODULE_PRICES: IModulePricing[] = [
  // ── Core modules (free) ──────────────────────────────────
  {
    slug: 'dashboard',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'patients',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'appointments',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'doctors',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'users',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'settings',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'notifications',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'prescriptions',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  {
    slug: 'subscription',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: true,
    trialDays: 0,
    regionPrices: [],
  },
  // ── Paid modules ─────────────────────────────────────────
  {
    slug: 'dental_charts',
    basePrice: 49,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'treatment_plans',
    basePrice: 39,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'procedure_notes',
    basePrice: 19,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'invoices',
    basePrice: 39,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'payments',
    basePrice: 29,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'xrays',
    basePrice: 49,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'cbct',
    basePrice: 59,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'lab_orders',
    basePrice: 29,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'insurance',
    basePrice: 39,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'inventory',
    basePrice: 29,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'services_catalog',
    basePrice: 19,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'branches',
    basePrice: 79,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'schedules',
    basePrice: 19,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'leave',
    basePrice: 9,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'attendance',
    basePrice: 9,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'commissions',
    basePrice: 19,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'installments',
    basePrice: 19,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'consent',
    basePrice: 9,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'reports',
    basePrice: 199,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'webhooks',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'audit_logs',
    basePrice: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 0,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
  },
  {
    slug: 'language_pack',
    basePrice: 19,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyDiscount: 20,
    isActive: true,
    isFree: false,
    trialDays: 14,
    regionPrices: [],
    languagePrices: [{ languageCode: 'ar', price: 19, isActive: true, regionPrices: [] }],
  },
];

export const DEFAULT_USAGE_LIMITS: IUsageLimits = {
  freeUsers: 10,
  extraUserPrice: 5.0,
  freeStorageGB: 1,
  extraStoragePrice: 2.0,
  freeBranches: 1,
};

// ── Price Calculation Helper ────────────────────────────────

export interface PriceCalculationResult {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  discountSource: 'price_override' | 'coupon' | 'tenant_discount' | 'global_discount' | 'none';
  discountPercent: number;
}

// ── API Request Types ───────────────────────────────────────

export interface UpdateModulePricingInput {
  slug: string;
  basePrice?: number;
  billingCycle?: BillingCycle;
  yearlyDiscount?: number;
  isActive?: boolean;
  isFree?: boolean;
  trialDays?: number;
  languagePrices?: ILanguagePrice[];
}

export interface CreateCouponInput {
  code: string;
  discountPercent: number;
  maxUses?: number;
  appliesTo: 'all' | string[];
  expiresAt: string;
}

export interface CreateGlobalDiscountInput {
  name: string;
  discountPercent: number;
  appliesTo: 'all' | string[];
  startsAt: string;
  expiresAt: string;
}

export interface UpdateUsageLimitsInput {
  freeUsers?: number;
  extraUserPrice?: number;
  freeStorageGB?: number;
  extraStoragePrice?: number;
  freeBranches?: number;
}

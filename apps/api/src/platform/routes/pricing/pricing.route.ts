/**
 * Pricing Routes — Platform API (Dev Portal)
 * Based on DENTO_V2_MASTER_PLAN.md §28 — Pricing System
 *
 * Endpoints:
 *   Config:
 *   - GET    /api/pricing                     — Get full pricing config
 *   - PATCH  /api/pricing/module/:slug        — Update module pricing
 *   - PATCH  /api/pricing/usage-limits        — Update usage limits
 *
 *   Coupons:
 *   - GET    /api/pricing/coupons             — List coupons
 *   - POST   /api/pricing/coupons             — Create coupon
 *   - PATCH  /api/pricing/coupons/:id         — Update coupon
 *   - DELETE /api/pricing/coupons/:id         — Delete coupon
 *   - POST   /api/pricing/coupons/validate    — Validate coupon code
 *
 *   Discounts:
 *   - GET    /api/pricing/discounts           — List global discounts
 *   - POST   /api/pricing/discounts           — Create global discount
 *   - PATCH  /api/pricing/discounts/:id       — Update global discount
 *   - DELETE /api/pricing/discounts/:id       — Delete global discount
 *
 *   Calculation:
 *   - POST   /api/pricing/calculate           — Calculate price for tenant+module
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { PricingConfig } from '../../models/pricing.model.js';
import { TenantModule } from '../../models/tenant-module.model.js';
import { Tenant } from '../../models/tenant.model.js';
import { DEFAULT_MODULE_PRICES, DEFAULT_USAGE_LIMITS } from '@dento/shared';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';

// ── Auth Interface ──────────────────────────────────────────

// ── Validation Schemas ──────────────────────────────────────

const regionPriceSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  price: z.number().min(0),
  currency: z.string().length(3),
});

const languagePriceSchema = z.object({
  languageCode: z.string().min(2).max(5),
  price: z.number().min(0),
  isActive: z.boolean(),
  regionPrices: z.array(regionPriceSchema).default([]),
});

const updateModulePricingSchema = z
  .object({
    basePrice: z.number().min(0).optional(),
    billingCycle: z.enum(['monthly', 'yearly']).optional(),
    yearlyDiscount: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    isFree: z.boolean().optional(),
    trialDays: z.number().min(0).max(365).optional(),
    regionPrices: z.array(regionPriceSchema).optional(),
    languagePrices: z.array(languagePriceSchema).optional(),
  })
  .strict();

const updateUsageLimitsSchema = z
  .object({
    freeUsers: z.number().min(0).optional(),
    extraUserPrice: z.number().min(0).optional(),
    freeStorageGB: z.number().min(0).optional(),
    extraStoragePrice: z.number().min(0).optional(),
    freeBranches: z.number().min(0).optional(),
  })
  .strict();

const regionalAmountSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  currency: z.string().length(3).toUpperCase(),
  amount: z.number().min(0),
});

const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[A-Z0-9_-]+$/i, 'Alphanumeric, hyphens, underscores only'),
    discountType: z.enum(['percent', 'fixed_amount']).default('percent'),
    discountPercent: z.number().min(0).max(100).default(0),
    discountAmount: z.number().min(0).default(0),
    regionalAmounts: z.array(regionalAmountSchema).default([]),
    maxUses: z.number().min(0).default(0),
    appliesTo: z.union([z.literal('all'), z.array(z.string().min(1))]),
    allowedCountries: z.array(z.string().length(2).toUpperCase()).default([]),
    allowedCurrencies: z.array(z.string().length(3).toUpperCase()).default([]),
    duration: z.enum(['once', 'repeating', 'forever']).default('once'),
    durationMonths: z.number().min(0).default(0),
    expiresAt: z.string().datetime(),
  })
  .strict();

const updateCouponSchema = z
  .object({
    discountType: z.enum(['percent', 'fixed_amount']).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    discountAmount: z.number().min(0).optional(),
    regionalAmounts: z.array(regionalAmountSchema).optional(),
    maxUses: z.number().min(0).optional(),
    appliesTo: z.union([z.literal('all'), z.array(z.string().min(1))]).optional(),
    allowedCountries: z.array(z.string().length(2).toUpperCase()).optional(),
    allowedCurrencies: z.array(z.string().length(3).toUpperCase()).optional(),
    duration: z.enum(['once', 'repeating', 'forever']).optional(),
    durationMonths: z.number().min(0).optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const createDiscountSchema = z
  .object({
    name: z.string().min(1).max(200),
    discountType: z.enum(['percent', 'fixed_amount']).default('percent'),
    discountPercent: z.number().min(0).max(100).default(0),
    discountAmount: z.number().min(0).default(0),
    regionalAmounts: z.array(regionalAmountSchema).default([]),
    allowedCountries: z.array(z.string().length(2).toUpperCase()).default([]),
    allowedCurrencies: z.array(z.string().length(3).toUpperCase()).default([]),
    appliesTo: z.union([z.literal('all'), z.array(z.string().min(1))]),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();

const updateDiscountSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    discountType: z.enum(['percent', 'fixed_amount']).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    discountAmount: z.number().min(0).optional(),
    regionalAmounts: z.array(regionalAmountSchema).optional(),
    allowedCountries: z.array(z.string().length(2).toUpperCase()).optional(),
    allowedCurrencies: z.array(z.string().length(3).toUpperCase()).optional(),
    appliesTo: z.union([z.literal('all'), z.array(z.string().min(1))]).optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const calculateSchema = z
  .object({
    tenantId: z.string().min(1),
    moduleSlug: z.string().min(1),
    couponCode: z.string().optional(),
  })
  .strict();

// ── Helper: Get or create default pricing config ────────────

async function getOrCreatePricingConfig() {
  let config = await PricingConfig.findOne();
  if (!config) {
    config = await PricingConfig.create({
      modules: DEFAULT_MODULE_PRICES,
      usageLimits: DEFAULT_USAGE_LIMITS,
      globalDiscounts: [],
      coupons: [],
    });
  } else {
    // Sync: add any new modules from DEFAULT_MODULE_PRICES that are missing in the stored config
    const existingSlugs = new Set(config.modules.map((m) => m.slug));
    const missing = DEFAULT_MODULE_PRICES.filter((dp) => !existingSlugs.has(dp.slug));
    if (missing.length > 0) {
      for (const m of missing) {
        config.modules.push(m as (typeof config.modules)[number]);
      }
      await config.save();
    }

    // Deduplicate modules by slug (keep first occurrence)
    const seen = new Set<string>();
    const deduped = config.modules.filter((m) => {
      if (seen.has(m.slug)) return false;
      seen.add(m.slug);
      return true;
    });
    if (deduped.length < config.modules.length) {
      config.modules = deduped as typeof config.modules;
      await config.save();
    }
  }
  return config;
}

// ── Pricing Routes ──────────────────────────────────────────

// ── Module Metadata (slug → display info) ───────────────────

const MODULE_META: Record<
  string,
  { name: string; description: string; usageLimitLabel: string; usageLimitValue: number }
> = {
  // ── Core (free) ──────────────────────────────────────────
  dashboard: {
    name: 'Dashboard',
    description: 'Main overview with analytics widgets and quick actions.',
    usageLimitLabel: 'widgets',
    usageLimitValue: 50,
  },
  patients: {
    name: 'Patient Records',
    description: 'Core patient management with medical history, notes, and documents.',
    usageLimitLabel: 'patients',
    usageLimitValue: 50_000,
  },
  appointments: {
    name: 'Appointments',
    description: 'Scheduling, calendar management, and automated reminders.',
    usageLimitLabel: 'appointments/mo',
    usageLimitValue: 10_000,
  },
  doctors: {
    name: 'Doctors',
    description: 'Doctor profiles, specialties, and availability management.',
    usageLimitLabel: 'doctors',
    usageLimitValue: 500,
  },
  users: {
    name: 'User Management',
    description: 'Staff accounts, roles, and permission management.',
    usageLimitLabel: 'users',
    usageLimitValue: 500,
  },
  settings: {
    name: 'Settings',
    description: 'Clinic configuration, branding, and system preferences.',
    usageLimitLabel: 'settings',
    usageLimitValue: 1,
  },
  notifications: {
    name: 'Notifications',
    description: 'Email, SMS, and push notification management.',
    usageLimitLabel: 'notifications/mo',
    usageLimitValue: 50_000,
  },
  prescriptions: {
    name: 'Prescriptions',
    description: 'Electronic prescriptions with drug database and templates.',
    usageLimitLabel: 'prescriptions/mo',
    usageLimitValue: 10_000,
  },
  subscription: {
    name: 'Subscription',
    description: 'Tenant subscription and billing management.',
    usageLimitLabel: 'subscriptions',
    usageLimitValue: 1,
  },
  // ── Paid ─────────────────────────────────────────────────
  dental_charts: {
    name: 'Dental Charting',
    description: 'Interactive dental charts with treatment tracking and history.',
    usageLimitLabel: 'charts',
    usageLimitValue: 50_000,
  },
  treatment_plans: {
    name: 'Treatment Plans',
    description: 'Multi-phase treatment planning with cost estimates and approvals.',
    usageLimitLabel: 'plans/mo',
    usageLimitValue: 5_000,
  },
  procedure_notes: {
    name: 'Procedure Notes',
    description: 'Clinical procedure documentation with templates and attachments.',
    usageLimitLabel: 'notes/mo',
    usageLimitValue: 10_000,
  },
  invoices: {
    name: 'Billing & Invoicing',
    description: 'Invoice generation, payment tracking, and financial reports.',
    usageLimitLabel: 'invoices/mo',
    usageLimitValue: 5_000,
  },
  payments: {
    name: 'Payments',
    description: 'Payment processing, receipts, and transaction history.',
    usageLimitLabel: 'payments/mo',
    usageLimitValue: 10_000,
  },
  xrays: {
    name: 'X-Rays',
    description: 'Digital X-ray imaging storage and DICOM viewer.',
    usageLimitLabel: 'images',
    usageLimitValue: 100_000,
  },
  cbct: {
    name: 'CBCT Imaging',
    description: '3D cone beam computed tomography integration and viewer.',
    usageLimitLabel: 'scans',
    usageLimitValue: 50_000,
  },
  lab_orders: {
    name: 'Lab Management',
    description: 'Lab order tracking, external lab integration, and case management.',
    usageLimitLabel: 'orders/mo',
    usageLimitValue: 1_000,
  },
  insurance: {
    name: 'Insurance Claims',
    description: 'Claim submission, tracking, and ERA/EOB management.',
    usageLimitLabel: 'claims/mo',
    usageLimitValue: 2_000,
  },
  inventory: {
    name: 'Inventory Management',
    description: 'Stock tracking, purchase orders, and low-stock alerts.',
    usageLimitLabel: 'items',
    usageLimitValue: 10_000,
  },
  services_catalog: {
    name: 'Services Catalog',
    description: 'Dental service definitions with pricing and procedure codes.',
    usageLimitLabel: 'services',
    usageLimitValue: 5_000,
  },
  branches: {
    name: 'Multi-Branch',
    description: 'Multi-location management with cross-branch reporting.',
    usageLimitLabel: 'branches',
    usageLimitValue: 50,
  },
  schedules: {
    name: 'Schedules',
    description: 'Staff shift scheduling, availability, and rotation management.',
    usageLimitLabel: 'schedules/mo',
    usageLimitValue: 5_000,
  },
  leave: {
    name: 'Leave Management',
    description: 'Staff leave requests, approvals, and balance tracking.',
    usageLimitLabel: 'requests/mo',
    usageLimitValue: 1_000,
  },
  attendance: {
    name: 'Attendance',
    description: 'Staff check-in/out tracking and attendance reports.',
    usageLimitLabel: 'records/mo',
    usageLimitValue: 10_000,
  },
  commissions: {
    name: 'Commissions',
    description: 'Doctor/staff commission rules, calculations, and payouts.',
    usageLimitLabel: 'entries/mo',
    usageLimitValue: 5_000,
  },
  installments: {
    name: 'Installments',
    description: 'Patient payment plans with installment scheduling and tracking.',
    usageLimitLabel: 'plans/mo',
    usageLimitValue: 2_000,
  },
  consent: {
    name: 'Consent Forms',
    description: 'Digital consent form templates with e-signatures.',
    usageLimitLabel: 'forms/mo',
    usageLimitValue: 10_000,
  },
  reports: {
    name: 'Advanced Analytics',
    description: 'AI-powered insights, predictive analytics, and benchmarking.',
    usageLimitLabel: 'queries/mo',
    usageLimitValue: 10_000,
  },
  webhooks: {
    name: 'Webhooks',
    description: 'Outgoing webhook integrations for third-party services.',
    usageLimitLabel: 'webhooks',
    usageLimitValue: 100,
  },
  audit_logs: {
    name: 'Audit Logs',
    description: 'Detailed audit trail and compliance logging.',
    usageLimitLabel: 'logs/mo',
    usageLimitValue: 100_000,
  },
};

// ── Route Helpers ───────────────────────────────────────────

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

export async function pricingRoutes(fastify: FastifyInstance) {
  // ─── GET FULL PRICING CONFIG ──────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'read')] },
    async (_request, reply) => {
      try {
        const config = await getOrCreatePricingConfig();
        return apiResponse(reply, 200, { pricing: config.toObject() });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch pricing config');
      }
    },
  );

  // ─── GET MODULE PRICING LIST ──────────────────────────────
  fastify.get(
    '/modules',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'read')] },
    async (_request, reply) => {
      try {
        const config = await getOrCreatePricingConfig();
        const modules = config.modules.map((m) => {
          const meta = MODULE_META[m.slug] ?? {
            name: m.slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: '',
            usageLimitLabel: 'records',
            usageLimitValue: 10_000,
          };
          const monthlyPrice = m.isFree ? 0 : m.basePrice;
          const yearlyPrice = m.isFree
            ? 0
            : Math.round(m.basePrice * 12 * (1 - m.yearlyDiscount / 100) * 100) / 100;
          return {
            id: m.slug,
            slug: m.slug,
            name: meta.name,
            description: meta.description,
            monthlyPrice,
            yearlyPrice,
            usageLimitLabel: meta.usageLimitLabel,
            usageLimitValue: meta.usageLimitValue,
            isActive: m.isActive,
            regionPrices: m.regionPrices ?? [],
            languagePrices: m.languagePrices ?? [],
          };
        });
        return apiResponse(reply, 200, modules);
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch module pricing');
      }
    },
  );

  // ─── GET PRICING STATS ───────────────────────────────────
  fastify.get(
    '/stats',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'read')] },
    async (_request, reply) => {
      try {
        const config = await getOrCreatePricingConfig();
        const now = new Date();

        const activeModules = config.modules.filter((m) => m.isActive).length;
        const activeCoupons = config.coupons.filter(
          (c) => c.isActive && new Date(c.expiresAt) > now,
        ).length;

        // Count active tenants
        const tenantCount = await Tenant.countDocuments({ status: 'active' });

        // Sum base prices of active non-free modules as projected MRR per tenant
        const baseMrr = config.modules
          .filter((m) => m.isActive && !m.isFree)
          .reduce((sum, m) => sum + m.basePrice, 0);

        const monthlyProjectedRevenue = tenantCount * baseMrr;
        const avgRevenuePerTenant = tenantCount > 0 ? baseMrr : 0;

        return apiResponse(reply, 200, {
          avgRevenuePerTenant: `$${avgRevenuePerTenant.toFixed(2)}`,
          activeModules,
          activeCoupons,
          monthlyProjectedRevenue: `$${monthlyProjectedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch pricing stats');
      }
    },
  );

  // ─── UPDATE MODULE PRICING ────────────────────────────────
  fastify.patch(
    '/module/:slug',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'update')] },
    async (request, reply) => {
      try {
        const user = getUser(request);

        const { slug } = request.params as { slug: string };
        const data = updateModulePricingSchema.parse(request.body);

        const config = await getOrCreatePricingConfig();
        const moduleIdx = config.modules.findIndex((m) => m.slug === slug);

        if (moduleIdx === -1) {
          return apiError(reply, 400, `Module "${slug}" not in pricing config`);
        }

        // Update module fields
        const mod = config.modules[moduleIdx];
        if (data.basePrice !== undefined) mod.basePrice = data.basePrice;
        if (data.billingCycle !== undefined) mod.billingCycle = data.billingCycle;
        if (data.yearlyDiscount !== undefined) mod.yearlyDiscount = data.yearlyDiscount;
        if (data.isActive !== undefined) mod.isActive = data.isActive;
        if (data.isFree !== undefined) mod.isFree = data.isFree;
        if (data.trialDays !== undefined) mod.trialDays = data.trialDays;
        if (data.regionPrices !== undefined) mod.regionPrices = data.regionPrices;
        if (data.languagePrices !== undefined) mod.languagePrices = data.languagePrices;

        config.updatedBy = user.id as unknown as typeof config.updatedBy;
        await config.save();

        return apiResponse(reply, 200, {
          module: config.modules[moduleIdx],
          message: `Pricing updated for "${slug}" — effective on next billing cycle`,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update pricing');
      }
    },
  );

  // ─── UPDATE USAGE LIMITS ──────────────────────────────────
  fastify.patch(
    '/usage-limits',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'update')] },
    async (request, reply) => {
      try {
        const user = getUser(request);

        const data = updateUsageLimitsSchema.parse(request.body);
        const config = await getOrCreatePricingConfig();

        if (data.freeUsers !== undefined) config.usageLimits.freeUsers = data.freeUsers;
        if (data.extraUserPrice !== undefined)
          config.usageLimits.extraUserPrice = data.extraUserPrice;
        if (data.freeStorageGB !== undefined) config.usageLimits.freeStorageGB = data.freeStorageGB;
        if (data.extraStoragePrice !== undefined)
          config.usageLimits.extraStoragePrice = data.extraStoragePrice;
        if (data.freeBranches !== undefined) config.usageLimits.freeBranches = data.freeBranches;

        config.updatedBy = user.id as unknown as typeof config.updatedBy;
        await config.save();

        return apiResponse(reply, 200, { usageLimits: config.usageLimits });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update usage limits');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // COUPON ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // ─── LIST COUPONS ─────────────────────────────────────────
  fastify.get(
    '/coupons',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'read')] },
    async (_request, reply) => {
      try {
        const config = await getOrCreatePricingConfig();
        return apiResponse(reply, 200, config.coupons);
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list coupons');
      }
    },
  );

  // ─── CREATE COUPON ────────────────────────────────────────
  fastify.post(
    '/coupons',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'create')] },
    async (request, reply) => {
      try {
        const user = getUser(request);

        const data = createCouponSchema.parse(request.body);
        const config = await getOrCreatePricingConfig();

        // Check code uniqueness
        const exists = config.coupons.some((c) => c.code === data.code.toUpperCase());
        if (exists) {
          return apiError(reply, 409, `Coupon "${data.code}" already exists`);
        }

        const coupon = {
          code: data.code.toUpperCase(),
          discountType: data.discountType ?? 'percent',
          discountPercent: data.discountPercent ?? 0,
          discountAmount: data.discountAmount ?? 0,
          regionalAmounts: data.regionalAmounts ?? [],
          maxUses: data.maxUses,
          usedCount: 0,
          appliesTo:
            typeof data.appliesTo === 'string' ? data.appliesTo : JSON.stringify(data.appliesTo),
          allowedCountries: data.allowedCountries ?? [],
          allowedCurrencies: data.allowedCurrencies ?? [],
          duration: data.duration ?? 'once',
          durationMonths: data.durationMonths ?? 0,
          expiresAt: new Date(data.expiresAt),
          isActive: true,
        };

        config.coupons.push(coupon as (typeof config.coupons)[number]);
        config.updatedBy = user.id as unknown as typeof config.updatedBy;
        await config.save();

        return apiResponse(reply, 201, { coupon });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to create coupon');
      }
    },
  );

  // ─── UPDATE COUPON ────────────────────────────────────────
  fastify.patch(
    '/coupons/:id',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'update')] },
    async (request, reply) => {
      try {
        const user = getUser(request);

        const { id } = request.params as { id: string };
        const data = updateCouponSchema.parse(request.body);
        const config = await getOrCreatePricingConfig();

        const coupon = config.coupons.id(id);
        if (!coupon) {
          return apiError(reply, 404, 'Coupon not found');
        }

        if (data.discountType !== undefined) coupon.discountType = data.discountType;
        if (data.discountPercent !== undefined) coupon.discountPercent = data.discountPercent;
        if (data.discountAmount !== undefined) coupon.discountAmount = data.discountAmount;
        if (data.regionalAmounts !== undefined) coupon.regionalAmounts = data.regionalAmounts;
        if (data.maxUses !== undefined) coupon.maxUses = data.maxUses;
        if (data.expiresAt !== undefined) coupon.expiresAt = new Date(data.expiresAt);
        if (data.isActive !== undefined) coupon.isActive = data.isActive;
        if (data.appliesTo !== undefined) {
          coupon.appliesTo =
            typeof data.appliesTo === 'string' ? data.appliesTo : JSON.stringify(data.appliesTo);
        }
        if (data.allowedCountries !== undefined) coupon.allowedCountries = data.allowedCountries;
        if (data.allowedCurrencies !== undefined) coupon.allowedCurrencies = data.allowedCurrencies;
        if (data.duration !== undefined) coupon.duration = data.duration;
        if (data.durationMonths !== undefined) coupon.durationMonths = data.durationMonths;

        config.updatedBy = user.id as unknown as typeof config.updatedBy;
        await config.save();

        return apiResponse(reply, 200, { coupon });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update coupon');
      }
    },
  );

  // ─── DELETE COUPON ────────────────────────────────────────
  fastify.delete(
    '/coupons/:id',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const config = await getOrCreatePricingConfig();

        const coupon = config.coupons.id(id);
        if (!coupon) {
          return apiError(reply, 404, 'Coupon not found');
        }

        coupon.deleteOne();
        await config.save();

        return apiResponse(reply, 200, { message: 'Coupon deleted' });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to delete coupon');
      }
    },
  );

  // ─── VALIDATE COUPON CODE ─────────────────────────────────
  fastify.post(
    '/coupons/validate',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'create')] },
    async (request, reply) => {
      try {
        const body = request.body as {
          code: string;
          moduleSlug?: string;
          tenantId?: string;
        };
        if (!body.code) {
          return apiError(reply, 400, 'Coupon code is required');
        }

        const config = await getOrCreatePricingConfig();
        const coupon = config.coupons.find((c) => c.code === body.code.toUpperCase() && c.isActive);

        if (!coupon) {
          return apiResponse(reply, 200, { valid: false, reason: 'Coupon not found or inactive' });
        }

        if (new Date(coupon.expiresAt) < new Date()) {
          return apiResponse(reply, 200, { valid: false, reason: 'Coupon expired' });
        }

        if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
          return apiResponse(reply, 200, { valid: false, reason: 'Coupon usage limit reached' });
        }

        // Check module applicability
        if (body.moduleSlug && coupon.appliesTo !== 'all') {
          try {
            const moduleList = JSON.parse(coupon.appliesTo) as string[];
            if (!moduleList.includes(body.moduleSlug)) {
              return apiResponse(reply, 200, {
                valid: false,
                reason: 'Coupon not applicable to this module',
              });
            }
          } catch {
            // If parse fails, assume 'all'
          }
        }

        // Check country/currency restrictions against tenant
        if (body.tenantId) {
          const tenant = await Tenant.findById(body.tenantId).lean();
          if (tenant) {
            if (
              coupon.allowedCountries.length > 0 &&
              !coupon.allowedCountries.includes(tenant.contact?.address?.country?.toUpperCase())
            ) {
              return apiResponse(reply, 200, {
                valid: false,
                reason: 'Coupon not available in this country',
              });
            }
            if (
              coupon.allowedCurrencies.length > 0 &&
              !coupon.allowedCurrencies.includes(tenant.settings?.currency?.toUpperCase())
            ) {
              return apiResponse(reply, 200, {
                valid: false,
                reason: 'Coupon not available for this currency',
              });
            }

            // Check if tenant already redeemed this coupon
            const alreadyRedeemed = tenant.redeemedCoupons?.some(
              (r) => r.couponCode === coupon.code,
            );
            if (alreadyRedeemed) {
              return apiResponse(reply, 200, {
                valid: false,
                reason: 'Coupon already redeemed by this tenant',
              });
            }
          }
        }

        return apiResponse(reply, 200, {
          valid: true,
          coupon: {
            code: coupon.code,
            discountType: coupon.discountType ?? 'percent',
            discountPercent: coupon.discountPercent,
            discountAmount: coupon.discountAmount ?? 0,
            duration: coupon.duration,
            durationMonths: coupon.durationMonths,
            expiresAt: coupon.expiresAt,
          },
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to validate coupon');
      }
    },
  );

  // ─── REDEEM COUPON FOR TENANT ─────────────────────────────
  fastify.post(
    '/coupons/redeem',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'create')] },
    async (request, reply) => {
      try {
        const body = z
          .object({
            code: z.string().min(1),
            tenantId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid tenant ID'),
          })
          .parse(request.body);

        const config = await getOrCreatePricingConfig();
        const coupon = config.coupons.find((c) => c.code === body.code.toUpperCase() && c.isActive);

        if (!coupon) {
          return apiError(reply, 404, 'Coupon not found or inactive');
        }

        if (new Date(coupon.expiresAt) < new Date()) {
          return apiError(reply, 400, 'Coupon expired');
        }

        if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
          return apiError(reply, 400, 'Coupon usage limit reached');
        }

        const tenant = await Tenant.findById(body.tenantId);
        if (!tenant) {
          return apiError(reply, 404, 'Tenant not found');
        }

        // Country check
        if (
          coupon.allowedCountries.length > 0 &&
          !coupon.allowedCountries.includes(tenant.contact?.address?.country?.toUpperCase())
        ) {
          return apiError(reply, 400, 'Coupon not available in this country');
        }

        // Currency check
        if (
          coupon.allowedCurrencies.length > 0 &&
          !coupon.allowedCurrencies.includes(tenant.settings?.currency?.toUpperCase())
        ) {
          return apiError(reply, 400, 'Coupon not available for this currency');
        }

        // Check if already redeemed
        const alreadyRedeemed = tenant.redeemedCoupons?.some((r) => r.couponCode === coupon.code);
        if (alreadyRedeemed) {
          return apiError(reply, 409, 'Coupon already redeemed by this tenant');
        }

        // Atomic redemption (L-3): use a conditional `$push` that only succeeds
        // if the coupon is NOT already in the tenant's `redeemedCoupons` array.
        // This converts the read-modify-write window above into a TOCTOU-safe
        // single operation; concurrent redemptions of the same coupon by two
        // requests will result in exactly one success and one 409.
        const redemptionRecord = {
          couponCode: coupon.code,
          redeemedAt: new Date(),
          discountType: coupon.discountType ?? 'percent',
          discountPercent: coupon.discountPercent,
          discountAmount: coupon.discountAmount ?? 0,
          duration: coupon.duration,
          durationMonths: coupon.durationMonths,
          remainingMonths: coupon.duration === 'repeating' ? coupon.durationMonths : 0,
        };
        const pushResult = await Tenant.updateOne(
          {
            _id: tenant._id,
            'redeemedCoupons.couponCode': { $ne: coupon.code },
          },
          { $push: { redeemedCoupons: redemptionRecord } },
        );
        if (pushResult.modifiedCount === 0) {
          return apiError(reply, 409, 'Coupon already redeemed by this tenant');
        }

        // Increment usedCount on coupon
        coupon.usedCount += 1;
        await config.save();

        return apiResponse(reply, 200, {
          message: `Coupon ${coupon.code} redeemed for ${tenant.name.en}`,
          redemption: {
            couponCode: coupon.code,
            discountType: coupon.discountType ?? 'percent',
            discountPercent: coupon.discountPercent,
            discountAmount: coupon.discountAmount ?? 0,
            duration: coupon.duration,
            durationMonths: coupon.durationMonths,
          },
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to redeem coupon');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // GLOBAL DISCOUNT ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // ─── LIST GLOBAL DISCOUNTS ────────────────────────────────
  fastify.get(
    '/discounts',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'read')] },
    async (_request, reply) => {
      try {
        const config = await getOrCreatePricingConfig();
        return apiResponse(reply, 200, config.globalDiscounts);
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list discounts');
      }
    },
  );

  // ─── CREATE GLOBAL DISCOUNT ───────────────────────────────
  fastify.post(
    '/discounts',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'create')] },
    async (request, reply) => {
      try {
        const user = getUser(request);

        const data = createDiscountSchema.parse(request.body);

        const config = await getOrCreatePricingConfig();
        const discount = {
          name: data.name,
          discountType: data.discountType ?? 'percent',
          discountPercent: data.discountPercent ?? 0,
          discountAmount: data.discountAmount ?? 0,
          regionalAmounts: data.regionalAmounts ?? [],
          allowedCountries: data.allowedCountries ?? [],
          allowedCurrencies: data.allowedCurrencies ?? [],
          appliesTo:
            typeof data.appliesTo === 'string' ? data.appliesTo : JSON.stringify(data.appliesTo),
          startsAt: new Date(data.startsAt),
          expiresAt: new Date(data.expiresAt),
          isActive: true,
        };

        config.globalDiscounts.push(discount as (typeof config.globalDiscounts)[number]);
        config.updatedBy = user.id as unknown as typeof config.updatedBy;
        await config.save();

        return apiResponse(reply, 201, { discount });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to create discount');
      }
    },
  );

  // ─── UPDATE GLOBAL DISCOUNT ───────────────────────────────
  fastify.patch(
    '/discounts/:id',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'update')] },
    async (request, reply) => {
      try {
        const user = getUser(request);

        const { id } = request.params as { id: string };
        const data = updateDiscountSchema.parse(request.body);
        const config = await getOrCreatePricingConfig();

        const discount = config.globalDiscounts.id(id);
        if (!discount) {
          return apiError(reply, 404, 'Discount not found');
        }

        if (data.name !== undefined) discount.name = data.name;
        if (data.discountType !== undefined) discount.discountType = data.discountType;
        if (data.discountPercent !== undefined) discount.discountPercent = data.discountPercent;
        if (data.discountAmount !== undefined) discount.discountAmount = data.discountAmount;
        if (data.regionalAmounts !== undefined) discount.regionalAmounts = data.regionalAmounts;
        if (data.allowedCountries !== undefined) discount.allowedCountries = data.allowedCountries;
        if (data.allowedCurrencies !== undefined)
          discount.allowedCurrencies = data.allowedCurrencies;
        if (data.startsAt !== undefined) discount.startsAt = new Date(data.startsAt);
        if (data.expiresAt !== undefined) discount.expiresAt = new Date(data.expiresAt);
        if (data.isActive !== undefined) discount.isActive = data.isActive;
        if (data.appliesTo !== undefined) {
          discount.appliesTo =
            typeof data.appliesTo === 'string' ? data.appliesTo : JSON.stringify(data.appliesTo);
        }

        config.updatedBy = user.id as unknown as typeof config.updatedBy;
        await config.save();

        return apiResponse(reply, 200, { discount });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to update discount');
      }
    },
  );

  // ─── DELETE GLOBAL DISCOUNT ───────────────────────────────
  fastify.delete(
    '/discounts/:id',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const config = await getOrCreatePricingConfig();

        const discount = config.globalDiscounts.id(id);
        if (!discount) {
          return apiError(reply, 404, 'Discount not found');
        }

        discount.deleteOne();
        await config.save();

        return apiResponse(reply, 200, { message: 'Discount deleted' });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to delete discount');
      }
    },
  );

  // ═══════════════════════════════════════════════════════════
  // PRICE CALCULATION (§28 Reihenfolge)
  // ═══════════════════════════════════════════════════════════

  // ─── CALCULATE PRICE ──────────────────────────────────────
  fastify.post(
    '/calculate',
    { preHandler: [authGuard, platformGuard('platform_pricing', 'create')] },
    async (request, reply) => {
      try {
        const data = calculateSchema.parse(request.body);
        const config = await getOrCreatePricingConfig();

        // Find module pricing
        const modulePricing = config.modules.find((m) => m.slug === data.moduleSlug);
        if (!modulePricing) {
          return apiError(reply, 400, `Module "${data.moduleSlug}" not in pricing`);
        }

        // Free modules
        if (modulePricing.isFree) {
          return apiResponse(reply, 200, {
            calculation: {
              originalPrice: 0,
              finalPrice: 0,
              discount: 0,
              discountSource: 'none',
              discountPercent: 0,
              isFree: true,
            },
          });
        }

        // ── Resolve region-aware base price ────────────────
        let originalPrice = modulePricing.basePrice;
        let currency = 'USD';

        // Look up tenant's country to check for region price override
        const tenant = await Tenant.findById(data.tenantId)
          .select('contact.address.country settings.currency settings.supportedLanguages')
          .lean();
        if (tenant && modulePricing.regionPrices?.length) {
          const tenantCountry = (tenant.contact?.address?.country ?? '').toUpperCase().trim();
          const regionMatch = modulePricing.regionPrices.find(
            (r) => r.countryCode.toUpperCase() === tenantCountry,
          );
          if (regionMatch) {
            originalPrice = regionMatch.price;
            currency = regionMatch.currency;
          }
        }

        // ── For language_pack: sum per-language costs ──────
        // Each enabled secondary language has its own price, with optional region override
        const languagePriceBreakdown: Array<{ languageCode: string; price: number }> = [];
        if (data.moduleSlug === 'language_pack' && modulePricing.languagePrices?.length && tenant) {
          const supportedLangs = tenant.settings?.supportedLanguages ?? [];
          const secondaryLangs = supportedLangs.filter((l) => l !== 'en');
          const countryCode = (tenant.contact?.address?.country ?? '').toUpperCase().trim();

          let langTotal = 0;
          for (const langCode of secondaryLangs) {
            const lp = modulePricing.languagePrices.find(
              (p) => p.languageCode === langCode && p.isActive,
            );
            if (lp) {
              let langPrice = lp.price;
              // Check for region override on this language
              if (countryCode && lp.regionPrices?.length) {
                const langRegion = lp.regionPrices.find(
                  (r) => r.countryCode.toUpperCase() === countryCode,
                );
                if (langRegion) {
                  langPrice = langRegion.price;
                  currency = langRegion.currency;
                }
              }
              langTotal += langPrice;
              languagePriceBreakdown.push({ languageCode: langCode, price: langPrice });
            }
          }
          // For language_pack, the total price is the sum of per-language prices
          if (langTotal > 0) originalPrice = langTotal;
        }

        // §28 Price Calculation Order:
        // 1. priceOverride in tenant_modules?
        const tenantModule = await TenantModule.findOne({
          tenantId: data.tenantId,
          moduleSlug: data.moduleSlug,
        }).lean();

        if (tenantModule?.priceOverride !== null && tenantModule?.priceOverride !== undefined) {
          return apiResponse(reply, 200, {
            calculation: {
              originalPrice,
              finalPrice: tenantModule.priceOverride,
              discount: originalPrice - tenantModule.priceOverride,
              discountSource: 'price_override',
              discountPercent: Math.round(
                ((originalPrice - tenantModule.priceOverride) / originalPrice) * 100,
              ),
              isFree: false,
              currency,
            },
          });
        }

        // 2. Active coupon?
        if (data.couponCode) {
          const coupon = config.coupons.find(
            (c) => c.code === data.couponCode!.toUpperCase() && c.isActive,
          );
          if (coupon && new Date(coupon.expiresAt) > new Date()) {
            const applicable =
              coupon.appliesTo === 'all' ||
              (() => {
                try {
                  return (JSON.parse(coupon.appliesTo) as string[]).includes(data.moduleSlug);
                } catch {
                  return true;
                }
              })();

            if (applicable && (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses)) {
              const couponType = coupon.discountType ?? 'percent';
              let resolvedAmount = coupon.discountAmount ?? 0;
              // For fixed_amount, resolve regional amount by tenant country
              if (couponType === 'fixed_amount' && coupon.regionalAmounts?.length && tenant) {
                const tenantCountry = (tenant.contact?.address?.country ?? '').toUpperCase().trim();
                const regional = coupon.regionalAmounts.find(
                  (r) => r.countryCode.toUpperCase() === tenantCountry,
                );
                if (regional) {
                  resolvedAmount = regional.amount;
                  currency = regional.currency;
                }
              }
              const finalPrice =
                couponType === 'fixed_amount'
                  ? Math.max(0, originalPrice - resolvedAmount)
                  : originalPrice * (1 - coupon.discountPercent / 100);
              const discountAmt = Math.round((originalPrice - finalPrice) * 100) / 100;
              return apiResponse(reply, 200, {
                calculation: {
                  originalPrice,
                  finalPrice: Math.round(finalPrice * 100) / 100,
                  discount: discountAmt,
                  discountSource: 'coupon',
                  discountType: couponType,
                  discountPercent: coupon.discountPercent,
                  discountAmount: resolvedAmount,
                  isFree: false,
                  currency,
                  couponCode: coupon.code,
                },
              });
            }
          }
        }

        // 3. discountPercent in tenant_modules?
        if (tenantModule && tenantModule.discountPercent > 0) {
          const isNotExpired =
            !tenantModule.discountExpiresAt ||
            new Date(tenantModule.discountExpiresAt) > new Date();
          if (isNotExpired) {
            const finalPrice = originalPrice * (1 - tenantModule.discountPercent / 100);
            return apiResponse(reply, 200, {
              calculation: {
                originalPrice,
                finalPrice: Math.round(finalPrice * 100) / 100,
                discount: Math.round((originalPrice - finalPrice) * 100) / 100,
                discountSource: 'tenant_discount',
                discountPercent: tenantModule.discountPercent,
                isFree: false,
                currency,
              },
            });
          }
        }

        // 4. Active global discount?
        const now = new Date();
        const tenantCountryUpper = (tenant?.contact?.address?.country ?? '').toUpperCase().trim();
        const tenantCurrencyUpper = (
          ((tenant?.settings as Record<string, unknown> | undefined)?.currency as string) ?? ''
        )
          .toUpperCase()
          .trim();
        const activeDiscount = config.globalDiscounts.find((d) => {
          if (!d.isActive) return false;
          if (new Date(d.startsAt) > now || new Date(d.expiresAt) < now) return false;
          // Country restriction
          if (d.allowedCountries?.length > 0 && !d.allowedCountries.includes(tenantCountryUpper)) {
            return false;
          }
          if (
            d.allowedCurrencies?.length > 0 &&
            !d.allowedCurrencies.includes(tenantCurrencyUpper)
          ) {
            return false;
          }
          if (d.appliesTo === 'all') return true;
          try {
            return (JSON.parse(d.appliesTo) as string[]).includes(data.moduleSlug);
          } catch {
            return true;
          }
        });

        if (activeDiscount) {
          const discType = activeDiscount.discountType ?? 'percent';
          let resolvedGlobalAmt = activeDiscount.discountAmount ?? 0;
          if (discType === 'fixed_amount' && activeDiscount.regionalAmounts?.length && tenant) {
            const regional = activeDiscount.regionalAmounts.find(
              (r) => r.countryCode.toUpperCase() === tenantCountryUpper,
            );
            if (regional) {
              resolvedGlobalAmt = regional.amount;
              currency = regional.currency;
            }
          }
          const finalPrice =
            discType === 'fixed_amount'
              ? Math.max(0, originalPrice - resolvedGlobalAmt)
              : originalPrice * (1 - activeDiscount.discountPercent / 100);
          const discountAmt = Math.round((originalPrice - finalPrice) * 100) / 100;
          return apiResponse(reply, 200, {
            calculation: {
              originalPrice,
              finalPrice: Math.round(finalPrice * 100) / 100,
              discount: discountAmt,
              discountSource: 'global_discount',
              discountType: discType,
              discountPercent: activeDiscount.discountPercent,
              discountAmount: resolvedGlobalAmt,
              isFree: false,
              currency,
              globalDiscountName: activeDiscount.name,
            },
          });
        }

        // 5. Standard price
        return apiResponse(reply, 200, {
          calculation: {
            originalPrice,
            finalPrice: originalPrice,
            discount: 0,
            discountSource: 'none',
            discountPercent: 0,
            isFree: false,
            currency,
            ...(languagePriceBreakdown.length > 0 && { languagePriceBreakdown }),
          },
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Validation failed', details);
        }
        return apiError(reply, 500, 'Failed to calculate price');
      }
    },
  );
}

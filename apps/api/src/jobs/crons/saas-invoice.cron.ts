/**
 * SaaS Invoice Auto-Generation Cron
 *
 * Per MASTER_PLAN §29 — SaaS Billing Phase 6
 *
 * Runs daily at 1 AM UTC. For each active tenant whose billingDay
 * matches today's date, generates a monthly invoice covering all
 * enabled modules at their resolved price (§28 cascade).
 *
 * Price resolution per module (first match wins):
 *   0. Free module → skip (no line item)
 *   1. TenantModule.priceOverride → hard override (skips all discounts)
 *   2. Redeemed coupon (tenant.redeemedCoupons) → % discount off base/region price
 *   3. TenantModule.discountPercent → per-tenant % discount
 *   4. Active global discount → platform-wide % discount
 *   5. Standard basePrice (region-aware)
 *
 * After invoice creation:
 *   - Coupons with duration='once' are removed from redeemedCoupons
 *   - Coupons with duration='repeating' have remainingMonths decremented
 *   - Invoice is immediately issued with dueDate = issuedAt + gracePeriodDays
 */

import type { Job } from 'bullmq';
import mongoose from 'mongoose';
import { QUEUE_NAMES, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { Tenant, type ITenant } from '../../platform/models/tenant.model.js';
import {
  PricingConfig,
  type IPricingConfig,
  type IModulePricingDoc,
  type IGlobalDiscountDoc,
} from '../../platform/models/pricing.model.js';
import { TenantModule } from '../../platform/models/tenant-module.model.js';
import {
  SaaSInvoice,
  getNextInvoiceNumber,
  type ISaaSInvoiceItem,
} from '../../platform/models/saas-invoice.model.js';

// ── Cron Registration ─────────────────────────────────────

export async function startSaaSInvoiceCron() {
  await addCronJob(
    QUEUE_NAMES.SAAS_INVOICE_GENERATE,
    'generate-saas-invoices',
    '0 1 * * *', // Daily 1 AM UTC
  );
  logger.info('SaaS invoice generation cron registered (daily 1 AM)');
}

// ── Worker ────────────────────────────────────────────────

export function startSaaSInvoiceWorker() {
  const worker = createWorker(
    QUEUE_NAMES.SAAS_INVOICE_GENERATE,
    async (job: Job) => {
      logger.info({ jobId: job.id }, 'Running SaaS invoice auto-generation');
      await generateMonthlyInvoices();
    },
    { concurrency: 1 },
  );

  logger.info('SaaS invoice generation worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function generateMonthlyInvoices() {
  const today = new Date();
  const dayOfMonth = today.getUTCDate();

  // Find active tenants whose billingDay is today
  const tenants = await Tenant.find({
    status: 'active',
    billingDay: dayOfMonth,
  })
    .select(
      '_id slug name enabledModules billingDay gracePeriodDays redeemedCoupons settings.currency contact.address.country',
    )
    .lean();

  if (tenants.length === 0) {
    logger.info({ dayOfMonth }, 'No tenants have billing day today');
    return;
  }

  // Load pricing config once
  const config = await PricingConfig.findOne().lean<IPricingConfig>();
  if (!config) {
    logger.warn('No pricing config found — skipping invoice generation');
    return;
  }

  // Compute billing period: 1st of current month → last day of current month
  const periodStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const periodEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  let generated = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    try {
      // Skip if an invoice already exists for this period (idempotency)
      const existing = await SaaSInvoice.findOne({
        tenantId: tenant._id,
        source: 'auto',
        periodStart: { $gte: periodStart },
        periodEnd: { $lte: new Date(periodEnd.getTime() + 1000) },
        status: { $nin: ['cancelled'] },
      }).lean();

      if (existing) {
        skipped++;
        continue;
      }

      const result = await generateTenantInvoice(tenant, config, periodStart, periodEnd);
      if (result === 'no-items') {
        skipped++;
        continue;
      }

      generated++;
    } catch (err) {
      logger.error(
        { tenantId: tenant._id, slug: tenant.slug, err },
        'Failed to generate invoice for tenant',
      );
    }
  }

  logger.info(
    { dayOfMonth, total: tenants.length, generated, skipped },
    'SaaS invoice generation complete',
  );
}

// ── Per-Tenant Invoice Generation ─────────────────────────

type LeanTenant = ITenant & Required<{ _id: mongoose.Types.ObjectId }> & { __v: number };

async function generateTenantInvoice(
  tenant: LeanTenant,
  config: IPricingConfig,
  periodStart: Date,
  periodEnd: Date,
): Promise<'created' | 'no-items'> {
  const tenantId = tenant._id.toString();
  const enabledModules = tenant.enabledModules ?? [];
  const currency = tenant.settings?.currency ?? 'USD';
  const tenantCountry = (tenant.contact?.address?.country ?? '').toUpperCase().trim();
  const gracePeriodDays = tenant.gracePeriodDays ?? 7;
  const redeemedCoupons = tenant.redeemedCoupons ?? [];

  if (enabledModules.length === 0) return 'no-items';

  // Load all TenantModule records for this tenant (for price overrides / discounts)
  const tenantModules = await TenantModule.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    moduleSlug: { $in: enabledModules },
  }).lean();

  const tmMap = new Map(tenantModules.map((tm) => [tm.moduleSlug, tm]));

  // Build active global discounts list
  const now = new Date();
  const activeGlobalDiscounts = (config.globalDiscounts ?? []).filter((d: IGlobalDiscountDoc) => {
    if (!d.isActive) return false;
    if (new Date(d.startsAt) > now || new Date(d.expiresAt) < now) return false;
    return true;
  });

  // Collect active coupons for this tenant (from redeemedCoupons)
  // Cross-reference config to ensure coupon is still active and not expired
  const activeCoupons = redeemedCoupons.filter((c) => {
    // Verify coupon still exists and is active in config
    const configCoupon = config.coupons.find((cc) => cc.code === c.couponCode);
    if (!configCoupon || !configCoupon.isActive || new Date(configCoupon.expiresAt) < now) {
      return false;
    }
    if (c.duration === 'once') return true; // One-time, applied this cycle then removed
    if (c.duration === 'forever') return true;
    if (c.duration === 'repeating' && c.remainingMonths > 0) return true;
    return false;
  });

  // Build line items
  const items: ISaaSInvoiceItem[] = [];
  const appliedCoupons: string[] = [];

  for (const slug of enabledModules) {
    const modulePricing = config.modules.find((m: IModulePricingDoc) => m.slug === slug);

    // If module not in pricing config or is free, skip
    if (!modulePricing || modulePricing.isFree) continue;

    // Resolve base price (region override)
    let unitPrice = modulePricing.basePrice;
    if (tenantCountry && modulePricing.regionPrices?.length) {
      const regionMatch = modulePricing.regionPrices.find(
        (r) => r.countryCode.toUpperCase() === tenantCountry,
      );
      if (regionMatch) {
        unitPrice = regionMatch.price;
      }
    }

    const tm = tmMap.get(slug);

    // Priority 1: TenantModule.priceOverride
    if (tm?.priceOverride !== null && tm?.priceOverride !== undefined) {
      unitPrice = tm.priceOverride;
      items.push({
        type: 'module',
        description: `${slug} (price override)`,
        moduleSlug: slug,
        quantity: 1,
        unitPrice,
        total: unitPrice,
      });
      continue;
    }

    // Add module line item at resolved price
    items.push({
      type: 'module',
      description: slug,
      moduleSlug: slug,
      quantity: 1,
      unitPrice,
      total: unitPrice,
    });

    // Priority 2: Redeemed coupon discount
    const coupon = activeCoupons.find((c) => {
      // Check if coupon applies to this module
      const configCoupon = config.coupons.find((cc) => cc.code === c.couponCode);
      if (!configCoupon) return false; // Unknown coupon — skip
      if (configCoupon.appliesTo === 'all') return true;
      try {
        return (JSON.parse(configCoupon.appliesTo) as string[]).includes(slug);
      } catch {
        return false;
      }
    });

    if (coupon) {
      const cType = coupon.discountType ?? 'percent';
      // Resolve regional amount from config coupon
      const configCoupon = config.coupons.find((cc) => cc.code === coupon.couponCode);
      let resolvedAmount = coupon.discountAmount ?? 0;
      if (cType === 'fixed_amount' && configCoupon?.regionalAmounts?.length && tenantCountry) {
        const regional = configCoupon.regionalAmounts.find(
          (r) => r.countryCode.toUpperCase() === tenantCountry,
        );
        if (regional) resolvedAmount = regional.amount;
      }
      const discountAmount =
        cType === 'fixed_amount'
          ? Math.min(resolvedAmount, unitPrice)
          : Math.round(unitPrice * (coupon.discountPercent / 100) * 100) / 100;
      const discountLabel =
        cType === 'fixed_amount'
          ? `Coupon ${coupon.couponCode} (-${resolvedAmount})`
          : `Coupon ${coupon.couponCode} (-${coupon.discountPercent}%)`;
      if (discountAmount > 0) {
        items.push({
          type: 'discount',
          description: discountLabel,
          moduleSlug: slug,
          quantity: 1,
          unitPrice: -discountAmount,
          total: -discountAmount,
          couponCode: coupon.couponCode,
        });
        if (!appliedCoupons.includes(coupon.couponCode)) {
          appliedCoupons.push(coupon.couponCode);
        }
      }
      continue; // Coupon applied — skip lower priority discounts
    }

    // Priority 3: TenantModule.discountPercent
    if (tm && tm.discountPercent > 0) {
      const isNotExpired = !tm.discountExpiresAt || new Date(tm.discountExpiresAt) > now;
      if (isNotExpired) {
        const discountAmount = Math.round(unitPrice * (tm.discountPercent / 100) * 100) / 100;
        if (discountAmount > 0) {
          items.push({
            type: 'discount',
            description: `Tenant discount (-${tm.discountPercent}%)`,
            moduleSlug: slug,
            quantity: 1,
            unitPrice: -discountAmount,
            total: -discountAmount,
          });
        }
        continue;
      }
    }

    // Priority 4: Global discount
    const globalDiscount = activeGlobalDiscounts.find((d: IGlobalDiscountDoc) => {
      // Country restriction
      if (d.allowedCountries?.length > 0 && !d.allowedCountries.includes(tenantCountry)) {
        return false;
      }
      if (
        d.allowedCurrencies?.length > 0 &&
        !d.allowedCurrencies.includes(currency.toUpperCase())
      ) {
        return false;
      }
      if (d.appliesTo === 'all') return true;
      try {
        return (JSON.parse(d.appliesTo) as string[]).includes(slug);
      } catch {
        return false;
      }
    });

    if (globalDiscount) {
      const gType = globalDiscount.discountType ?? 'percent';
      let resolvedGlobalAmt = globalDiscount.discountAmount ?? 0;
      if (gType === 'fixed_amount' && globalDiscount.regionalAmounts?.length && tenantCountry) {
        const regional = globalDiscount.regionalAmounts.find(
          (r) => r.countryCode.toUpperCase() === tenantCountry,
        );
        if (regional) resolvedGlobalAmt = regional.amount;
      }
      const discountAmount =
        gType === 'fixed_amount'
          ? Math.min(resolvedGlobalAmt, unitPrice)
          : Math.round(unitPrice * (globalDiscount.discountPercent / 100) * 100) / 100;
      const discountLabel =
        gType === 'fixed_amount'
          ? `${globalDiscount.name} (-${resolvedGlobalAmt})`
          : `${globalDiscount.name} (-${globalDiscount.discountPercent}%)`;
      if (discountAmount > 0) {
        items.push({
          type: 'discount',
          description: discountLabel,
          moduleSlug: slug,
          quantity: 1,
          unitPrice: -discountAmount,
          total: -discountAmount,
        });
      }
    }
  }

  // If all modules were free, no invoice needed
  if (items.length === 0) return 'no-items';

  // Create the invoice
  const invoiceNumber = await getNextInvoiceNumber();
  const dueDate = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  const invoice = new SaaSInvoice({
    invoiceNumber,
    tenantId: new mongoose.Types.ObjectId(tenantId),
    periodStart,
    periodEnd,
    items,
    currency,
    dueDate,
    taxRate: 0,
    notes: 'Auto-generated monthly invoice',
    source: 'auto',
    status: 'issued',
    issuedAt: now,
    createdBy: null,
  });

  await invoice.save(); // pre-save computes totals

  logger.info({
    msg: 'SaaS invoice auto-generated',
    invoiceNumber,
    tenantId,
    total: invoice.total,
    currency,
    itemCount: items.length,
  });

  // Update coupon tracking: decrement repeating, remove once
  if (appliedCoupons.length > 0) {
    await updateCouponTracking(tenantId, appliedCoupons);
  }

  return 'created';
}

// ── Coupon Tracking Updates ───────────────────────────────

/**
 * Atomically advance coupon tracking after an invoice has been generated.
 *
 * Race-safety (L-3): each coupon is updated with a single atomic operation:
 *   1. `findOneAndUpdate` with `arrayFilters` to decrement `remainingMonths`
 *      on the matching repeating-coupon array element only.
 *   2. `updateOne` with `$pull` to remove a `once`-duration coupon.
 * Both ops are individually atomic on a single document. They target disjoint
 * coupon types (`repeating` vs `once`), so sequencing them in the same loop
 * iteration cannot produce an inconsistent tenant document.
 */
async function updateCouponTracking(tenantId: string, appliedCouponCodes: string[]) {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  for (const code of appliedCouponCodes) {
    // 1. Decrement remainingMonths for the matching repeating coupon.
    //    `arrayFilters` ensures the $inc applies ONLY to the array element
    //    matching all three predicates — without arrayFilters the positional
    //    `$.` operator would only match on the first predicate (couponCode).
    await Tenant.updateOne(
      { _id: tenantObjectId },
      { $inc: { 'redeemedCoupons.$[c].remainingMonths': -1 } },
      {
        arrayFilters: [
          {
            'c.couponCode': code,
            'c.duration': 'repeating',
            'c.remainingMonths': { $gt: 0 },
          },
        ],
      },
    );

    // 2. Remove `once`-duration coupons of this code after the invoice that consumed them.
    await Tenant.updateOne(
      { _id: tenantObjectId },
      {
        $pull: {
          redeemedCoupons: { couponCode: code, duration: 'once' },
        },
      },
    );
  }
}

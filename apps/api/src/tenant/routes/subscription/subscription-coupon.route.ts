import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { PricingConfig } from '../../../platform/models/pricing.model.js';
import { Tenant } from '../../../platform/models/tenant.model.js';

/**
 * Subscription Coupon Routes — Tenant API (Admin Portal)
 *
 * Tenant-scoped endpoints for coupon validation and redemption.
 * These use authGuard + tenantDbMiddleware (no platformGuard).
 *
 *   - POST /api/subscription/coupons/validate  — Validate a coupon code
 *   - POST /api/subscription/coupons/redeem    — Redeem a coupon
 *   - GET  /api/subscription/coupons           — List redeemed coupons for this tenant
 */

function getTenantId(request: unknown): string | undefined {
  const tenant = (request as unknown as Record<string, unknown>).tenant as
    | { id?: string; _id?: string }
    | undefined;
  return tenant?.id ?? tenant?._id;
}

async function getOrCreatePricingConfig() {
  let config = await PricingConfig.findOne();
  if (!config) {
    config = await PricingConfig.create({});
  }
  return config;
}

export async function subscriptionCouponRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];
  const adminOnly = [authGuard, tenantDbMiddleware, roleGuard('settings', 'manage')];

  // ─── VALIDATE COUPON ──────────────────────────────────────
  fastify.post(
    '/coupons/validate',
    { preHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = z
          .object({ code: z.string().min(1), moduleSlug: z.string().optional() })
          .parse(request.body);

        const tenantId = getTenantId(request);
        if (!tenantId) return apiError(reply, 401, 'Tenant context required');

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

        // Module applicability
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
            // parse fails → assume 'all'
          }
        }

        // Country / currency check
        const tenant = await Tenant.findById(tenantId).lean();
        if (tenant) {
          if (
            coupon.allowedCountries.length > 0 &&
            !coupon.allowedCountries.includes(tenant.contact?.address?.country?.toUpperCase() ?? '')
          ) {
            return apiResponse(reply, 200, {
              valid: false,
              reason: 'Coupon not available in your country',
            });
          }
          if (
            coupon.allowedCurrencies.length > 0 &&
            !coupon.allowedCurrencies.includes(tenant.settings?.currency?.toUpperCase() ?? '')
          ) {
            return apiResponse(reply, 200, {
              valid: false,
              reason: 'Coupon not available for your currency',
            });
          }

          const alreadyRedeemed = tenant.redeemedCoupons?.some((r) => r.couponCode === coupon.code);
          if (alreadyRedeemed) {
            return apiResponse(reply, 200, {
              valid: false,
              reason: 'Coupon already redeemed',
            });
          }
        }

        // Resolve regional amount for fixed_amount coupons
        const cType = coupon.discountType ?? 'percent';
        let resolvedAmount = coupon.discountAmount ?? 0;
        let resolvedCurrency: string | undefined;
        if (cType === 'fixed_amount' && coupon.regionalAmounts?.length && tenant) {
          const tCountry = tenant.contact?.address?.country?.toUpperCase() ?? '';
          const regional = coupon.regionalAmounts.find(
            (r) => r.countryCode.toUpperCase() === tCountry,
          );
          if (regional) {
            resolvedAmount = regional.amount;
            resolvedCurrency = regional.currency;
          }
        }

        return apiResponse(reply, 200, {
          valid: true,
          coupon: {
            code: coupon.code,
            discountType: cType,
            discountPercent: coupon.discountPercent,
            discountAmount: resolvedAmount,
            resolvedCurrency,
            duration: coupon.duration,
            durationMonths: coupon.durationMonths,
            expiresAt: coupon.expiresAt,
          },
        });
      } catch (err) {
        if (err instanceof z.ZodError) return apiError(reply, 400, 'Invalid input');
        return apiError(reply, 500, 'Failed to validate coupon');
      }
    },
  );

  // ─── REDEEM COUPON ────────────────────────────────────────
  fastify.post(
    '/coupons/redeem',
    { preHandler: adminOnly },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = z.object({ code: z.string().min(1) }).parse(request.body);

        const tenantId = getTenantId(request);
        if (!tenantId) return apiError(reply, 401, 'Tenant context required');

        const config = await getOrCreatePricingConfig();
        const coupon = config.coupons.find((c) => c.code === body.code.toUpperCase() && c.isActive);

        if (!coupon) return apiError(reply, 404, 'Coupon not found or inactive');

        if (new Date(coupon.expiresAt) < new Date()) {
          return apiError(reply, 400, 'Coupon expired');
        }
        if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
          return apiError(reply, 400, 'Coupon usage limit reached');
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return apiError(reply, 404, 'Tenant not found');

        // Country check
        if (
          coupon.allowedCountries.length > 0 &&
          !coupon.allowedCountries.includes(tenant.contact?.address?.country?.toUpperCase() ?? '')
        ) {
          return apiError(reply, 400, 'Coupon not available in your country');
        }

        // Currency check
        if (
          coupon.allowedCurrencies.length > 0 &&
          !coupon.allowedCurrencies.includes(tenant.settings?.currency?.toUpperCase() ?? '')
        ) {
          return apiError(reply, 400, 'Coupon not available for your currency');
        }

        // Already redeemed?
        const alreadyRedeemed = tenant.redeemedCoupons?.some((r) => r.couponCode === coupon.code);
        if (alreadyRedeemed) {
          return apiError(reply, 409, 'Coupon already redeemed');
        }

        // Resolve regional amount for fixed_amount coupons
        const redeemType = coupon.discountType ?? 'percent';
        let redeemAmount = coupon.discountAmount ?? 0;
        if (redeemType === 'fixed_amount' && coupon.regionalAmounts?.length) {
          const tCountry = tenant.contact?.address?.country?.toUpperCase() ?? '';
          const regional = coupon.regionalAmounts.find(
            (r) => r.countryCode.toUpperCase() === tCountry,
          );
          if (regional) redeemAmount = regional.amount;
        }

        // Atomic redemption (L-3): conditional `$push` that only succeeds if the
        // coupon is NOT already in the tenant's `redeemedCoupons` array. Closes
        // the TOCTOU race between the read above and the write below — concurrent
        // self-redemption attempts of the same coupon now produce one success
        // and 409s for the rest, instead of multiple duplicate records.
        const redemptionRecord = {
          couponCode: coupon.code,
          redeemedAt: new Date(),
          discountType: redeemType,
          discountPercent: coupon.discountPercent,
          discountAmount: redeemAmount,
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
          return apiError(reply, 409, 'Coupon already redeemed');
        }

        // Increment global usedCount
        coupon.usedCount += 1;
        await config.save();

        return apiResponse(reply, 200, {
          message: `Coupon ${coupon.code} redeemed successfully!`,
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
        if (err instanceof z.ZodError) return apiError(reply, 400, 'Invalid input');
        return apiError(reply, 500, 'Failed to redeem coupon');
      }
    },
  );

  // ─── LIST REDEEMED COUPONS ────────────────────────────────
  fastify.get('/coupons', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = getTenantId(request);
      if (!tenantId) return apiError(reply, 401, 'Tenant context required');

      const tenant = await Tenant.findById(tenantId).select('redeemedCoupons').lean();

      return apiResponse(reply, 200, tenant?.redeemedCoupons ?? []);
    } catch {
      return apiError(reply, 500, 'Failed to list coupons');
    }
  });
}

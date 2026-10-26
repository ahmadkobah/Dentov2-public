import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Domain } from '../../models/domain.model.js';
import { Tenant } from '../../models/tenant.model.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { promises as dns } from 'node:dns';
import { getSSLStatus } from '../../../services/cloudflare.service.js';

/**
 * Domain Routes â€” Phase 6 (Task 8.1-8.5 â€” Gap G6)
 *
 * Per V2_DATABASE Â§4.14
 * RBAC Module: platform_tenants (per Phase 6 Â§5.7)
 *
 * Endpoints:
 *   - GET    /api/platform/domains           â€” List all domains
 *   - GET    /api/platform/domains/:id        â€” Get domain detail
 *   - POST   /api/platform/domains            â€” Add custom domain
 *   - POST   /api/platform/domains/:id/verify â€” Verify DNS records
 *   - PATCH  /api/platform/domains/:id        â€” Update domain
 *   - DELETE /api/platform/domains/:id        â€” Remove domain
 */

// â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createDomainSchema = z
  .object({
    tenantSlug: z.string().min(1),
    customDomain: z
      .string()
      .min(4)
      .max(253)
      .regex(
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/,
        'Invalid domain format',
      ),
  })
  .strict();

const updateDomainSchema = z
  .object({
    customDomain: z
      .string()
      .min(4)
      .max(253)
      .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const querySchema = z
  .object({
    tenantSlug: z.string().optional(),
    sslStatus: z.enum(['pending', 'active', 'expired', 'error']).optional(),
    dnsVerified: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateRequiredRecords(tenantSlug: string, customDomain: string) {
  return [
    {
      type: 'CNAME' as const,
      name: customDomain,
      value: `${tenantSlug}.dento.app`,
      verified: false,
    },
    {
      type: 'TXT' as const,
      name: `_dento-verify.${customDomain}`,
      value: `dento-verify=${tenantSlug}`,
      verified: false,
    },
  ];
}

// â”€â”€ Route Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function domainRoutes(fastify: FastifyInstance) {
  // â”€â”€ GET /api/platform/domains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_tenants', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filter = querySchema.parse(request.query);
      const query: Record<string, unknown> = {};

      if (filter.tenantSlug) query.tenantSlug = filter.tenantSlug;
      if (filter.sslStatus) query.sslStatus = filter.sslStatus;
      if (filter.dnsVerified !== undefined) query.dnsVerified = filter.dnsVerified;

      const page = filter.page;
      const limit = filter.limit;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Domain.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Domain.countDocuments(query),
      ]);

      return apiResponse(reply, 200, data, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    },
  );

  // â”€â”€ GET /api/platform/domains/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_tenants', 'read')],
    },
    async (request, reply) => {
      const domain = await Domain.findById(request.params.id).lean();
      if (!domain) return apiError(reply, 404, 'Domain not found');
      return apiResponse(reply, 200, domain);
    },
  );

  // â”€â”€ POST /api/platform/domains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_tenants', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = createDomainSchema.parse(request.body);

      // Verify tenant exists
      const tenant = await Tenant.findOne({ slug: data.tenantSlug }).lean();
      if (!tenant) return apiError(reply, 404, 'Tenant not found');

      // Check domain uniqueness
      const existing = await Domain.findOne({ customDomain: data.customDomain }).lean();
      if (existing) return apiError(reply, 409, 'Domain already registered');

      const domain = await Domain.create({
        tenantSlug: data.tenantSlug,
        customDomain: data.customDomain,
        requiredRecords: generateRequiredRecords(data.tenantSlug, data.customDomain),
        createdBy: request.user!.userId,
      });

      return apiResponse(
        reply,
        201,
        domain,
        'Domain added â€” complete DNS verification to activate',
      );
    },
  );

  // â”€â”€ POST /api/platform/domains/:id/verify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post<{ Params: { id: string } }>(
    '/:id/verify',
    {
      preHandler: [authGuard, platformGuard('platform_tenants', 'update')],
    },
    async (request, reply) => {
      const domain = await Domain.findById(request.params.id);
      if (!domain) return apiError(reply, 404, 'Domain not found');

      // DNS verification is mocked here â€” in production this would use
      // Node's dns.resolve() or Cloudflare API to check records
      // For now, mark records as verified and set domain as verified
      // #96: actually resolve each required record instead of blindly marking it
      // verified. CNAME -> resolveCname, TXT -> resolveTxt. Any resolution failure
      // (NXDOMAIN / no matching answer) leaves that record unverified.
      const updatedRecords = await Promise.all(
        domain.requiredRecords.map(async (r) => {
          const rec =
            (r as unknown as { toObject?: () => Record<string, unknown> }).toObject?.() ?? r;
          const record = rec as { type: string; name: string; value: string };
          let verified = false;
          try {
            if (record.type === 'CNAME') {
              const answers = await dns.resolveCname(record.name);
              verified = answers.some(
                (a) => a.replace(/\.$/, '') === record.value.replace(/\.$/, ''),
              );
            } else if (record.type === 'TXT') {
              const answers = await dns.resolveTxt(record.name);
              verified = answers.some((chunks) => chunks.join('') === record.value);
            }
          } catch {
            verified = false;
          }
          return { ...rec, verified };
        }),
      );

      const allVerified = updatedRecords.every((r) => (r as { verified: boolean }).verified);

      domain.set('requiredRecords', updatedRecords);
      domain.dnsVerified = allVerified;
      if (allVerified) {
        domain.verifiedAt = new Date();
        domain.isActive = true;
        // Only mark SSL active if the cert is really issued (getSSLStatus returns
        // null when Cloudflare isn't configured -> stay pending, never fake 'active').
        const ssl = await getSSLStatus(domain.customDomain);
        domain.sslStatus = ssl?.status === 'active' ? 'active' : 'pending';
      } else {
        domain.isActive = false;
      }
      await domain.save();

      return apiResponse(
        reply,
        200,
        domain,
        allVerified ? 'DNS verified â€” domain active' : 'Partial verification',
      );
    },
  );

  // â”€â”€ PATCH /api/platform/domains/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_tenants', 'update')],
    },
    async (request, reply) => {
      const data = updateDomainSchema.parse(request.body);

      const domain = await Domain.findByIdAndUpdate(
        request.params.id,
        { $set: { ...data, updatedBy: request.user!.userId } },
        { new: true },
      ).lean();

      if (!domain) return apiError(reply, 404, 'Domain not found');
      return apiResponse(reply, 200, domain, 'Domain updated');
    },
  );

  // â”€â”€ DELETE /api/platform/domains/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_tenants', 'delete')],
    },
    async (request, reply) => {
      const domain = await Domain.findByIdAndDelete(request.params.id).lean();
      if (!domain) return apiError(reply, 404, 'Domain not found');
      return apiResponse(reply, 200, domain, 'Domain removed');
    },
  );
}

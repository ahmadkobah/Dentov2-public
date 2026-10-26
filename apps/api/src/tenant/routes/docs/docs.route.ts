/**
 * Tenant Documentation Routes — Read-only access to published platform docs
 *
 * Endpoints:
 *   - GET /api/docs           — List published docs
 *   - GET /api/docs/:slug     — Get single published doc by slug
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../middleware/index.js';
import { PlatformDoc } from '../../../platform/models/platform-doc.model.js';
import { getPlatformBranding } from '../../../platform/models/branding.model.js';
import { getPresignedDownloadUrl } from '../../../config/s3.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

// ── Validation Schemas ──────────────────────────────────────

const listQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Route Plugin ────────────────────────────────────────────

export async function tenantDocRoutes(fastify: FastifyInstance) {
  // ── GET DOCS CONFIG ───────────────────────────────────
  fastify.get('/config', { preHandler: [authGuard] }, async (_request, reply) => {
    try {
      const branding = await getPlatformBranding();
      const cfg = branding.docsConfig ?? {};
      let headerLogo = cfg.headerLogo || branding.logoUrl || '';

      // Resolve S3 key to presigned URL
      const s3Ready = !!(
        env.S3_ENDPOINT &&
        env.S3_ACCESS_KEY &&
        env.S3_SECRET_KEY &&
        env.S3_BUCKET
      );
      if (
        s3Ready &&
        headerLogo &&
        !headerLogo.startsWith('http://') &&
        !headerLogo.startsWith('https://')
      ) {
        headerLogo = await getPresignedDownloadUrl(headerLogo, 86_400);
      }

      return apiResponse(reply, 200, {
        headerLogo,
        headerTitle: cfg.headerTitle || `${branding.platformName || 'Dento'} Docs`,
        footerSupportEmail: cfg.footerSupportEmail || '',
        footerSupportPhone: cfg.footerSupportPhone || '',
        footerCopyrightText: cfg.footerCopyrightText || '',
        footerPlatformVersion: cfg.footerPlatformVersion || '',
      });
    } catch (err) {
      logger.error(err, 'Failed to fetch docs config');
      return apiError(reply, 500, 'Failed to fetch docs config');
    }
  });

  // ── LIST PUBLISHED DOCS ───────────────────────────────
  fastify.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      const filter: Record<string, unknown> = { isPublished: true };
      if (query.category) filter.category = query.category;

      const [docs, total] = await Promise.all([
        PlatformDoc.find(filter)
          .select('title slug category order createdAt updatedAt')
          .sort({ category: 1, order: 1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean(),
        PlatformDoc.countDocuments(filter),
      ]);

      return apiResponse(reply, 200, docs, undefined, {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      });
    } catch (err) {
      logger.error(err, 'Failed to list docs');
      return apiError(reply, 500, 'Failed to list docs');
    }
  });

  // ── GET SINGLE PUBLISHED DOC ──────────────────────────
  fastify.get<{ Params: { slug: string } }>(
    '/:slug',
    { preHandler: [authGuard] },
    async (request, reply) => {
      try {
        const doc = await PlatformDoc.findOne({
          slug: request.params.slug,
          isPublished: true,
        }).lean();

        if (!doc) return apiError(reply, 404, 'Document not found');
        return apiResponse(reply, 200, doc);
      } catch (err) {
        logger.error(err, 'Failed to get doc');
        return apiError(reply, 500, 'Failed to get doc');
      }
    },
  );
}

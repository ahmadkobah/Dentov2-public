/**
 * Branding & Settings Routes
 * Based on DENTO_V2_MASTER_PLAN.md §14 — Logo & Branding Propagation
 *
 * Endpoints:
 * - GET    /api/branding          — Get current branding config
 * - PATCH  /api/branding          — Update branding config (tenant_admin)
 * - DELETE /api/branding          — Reset branding to defaults (tenant_admin)
 * - GET    /api/settings/general  — Get general clinic settings
 * - PATCH /api/settings/general — Update general clinic settings
 *
 * Branding is FREE in v2 (was paid `white-label` in v1).
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { createBrandingModel, DEFAULT_BRANDING_VALUES } from '../../models/branding.model.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { uploadToS3, getPresignedDownloadUrl } from '../../../config/s3.js';
import { env } from '../../../config/env.js';
import { Tenant } from '../../../platform/models/tenant.model.js';

// ── Route Helpers ───────────────────────────────────────────

/** Check if a value looks like an S3 key (not a full URL). */
function isS3Key(value: string): boolean {
  return !!value && !value.startsWith('http://') && !value.startsWith('https://');
}

/** Resolve S3 keys in branding object to presigned download URLs. */
async function resolveBrandingUrls(
  branding: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const s3Ready = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET);
  if (!s3Ready) return branding;

  const obj = { ...branding };
  for (const field of ['logoUrl', 'logoDarkUrl', 'faviconUrl'] as const) {
    const val = obj[field];
    if (typeof val === 'string' && isS3Key(val)) {
      obj[field] = await getPresignedDownloadUrl(val, 86_400);
    }
  }
  return obj;
}

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Validation Schemas ──────────────────────────────────────

const bilingualSchema = z
  .object({
    en: z.string().max(200),
    ar: z.string().max(200).optional(),
  })
  .strict();

const brandingUpdateSchema = z
  .object({
    logoUrl: z.string().max(2048).nullable().optional(),
    logoDarkUrl: z.string().max(2048).nullable().optional(),
    faviconUrl: z.string().max(2048).nullable().optional(),
    logoSize: z.enum(['small', 'medium', 'large']).optional(),
    logoAlignment: z.enum(['left', 'center', 'right']).optional(),
    logoLayout: z.enum(['logo-left', 'logo-top', 'logo-only']).optional(),
    clinicName: bilingualSchema.optional(),
    address: z
      .object({
        main: bilingualSchema.optional(),
        branchId: z.string().optional(),
      })
      .strict()
      .optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().max(200).optional().or(z.literal('')),
    website: z.string().max(200).optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
      .optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
      .optional(),
    customCss: z.string().max(5000).nullable().optional(),
  })
  .strict();

// ── Branding Routes ─────────────────────────────────────────

export async function brandingRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/branding — Get current branding configuration
   * Returns full branding config or defaults if none set.
   */
  fastify.get(
    '/branding',
    { preHandler: [authGuard, tenantDbMiddleware, roleGuard('settings', 'read')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const BrandingModel = createBrandingModel(tenantDb);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let branding: any = await BrandingModel.findOne({ type: 'branding' }).lean();

        if (!branding) {
          // Return defaults if no branding configured yet
          branding = {
            ...DEFAULT_BRANDING_VALUES,
            updatedAt: new Date(),
            updatedBy: null,
          };
        }

        return apiResponse(reply, 200, {
          branding: await resolveBrandingUrls(branding),
          propagationTargets: [
            { key: 'sidebar', label: 'Sidebar Logo', active: !!branding?.logoUrl },
            { key: 'login_page', label: 'Login Page', active: !!branding?.logoUrl },
            {
              key: 'invoice_pdf',
              label: 'Invoice PDFs',
              active: !!(branding?.logoUrl && branding?.clinicName?.en),
            },
            {
              key: 'prescription_pdf',
              label: 'Prescription PDFs',
              active: !!(branding?.logoUrl && branding?.clinicName?.en),
            },
            {
              key: 'treatment_plan_pdf',
              label: 'Treatment Plan PDFs',
              active: !!(branding?.logoUrl && branding?.clinicName?.en),
            },
            { key: 'consent_form', label: 'Consent Forms', active: !!branding?.clinicName?.en },
            { key: 'email_template', label: 'Email Templates', active: !!branding?.logoUrl },
            { key: 'browser_tab', label: 'Browser Tab', active: !!branding?.faviconUrl },
            {
              key: 'notification_email',
              label: 'Notification Emails',
              active: !!branding?.logoUrl,
            },
          ],
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch branding config');
      }
    },
  );

  /**
   * PATCH /api/branding — Update branding configuration
   * Only tenant_admin can modify branding.
   * Uses upsert — creates branding doc if it doesn't exist.
   */
  fastify.patch(
    '/branding',
    { preHandler: [authGuard, tenantDbMiddleware, roleGuard('settings', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);

        const body = brandingUpdateSchema.parse(request.body);
        const BrandingModel = createBrandingModel(tenantDb);

        const branding = await BrandingModel.findOneAndUpdate(
          { type: 'branding' },
          {
            $set: {
              ...body,
              updatedBy: userId,
            },
            $setOnInsert: {
              type: 'branding',
            },
          },
          { upsert: true, new: true, lean: true },
        );

        // Sync logo fields to platform tenant record for list/detail views
        const tenantSlug = (request as unknown as Record<string, unknown>).tenantSlug as
          | string
          | undefined;
        if (tenantSlug) {
          const platformUpdate: Record<string, unknown> = {};
          if (body.logoUrl !== undefined) platformUpdate['branding.logoUrl'] = body.logoUrl;
          if (body.logoDarkUrl !== undefined)
            platformUpdate['branding.logoDarkUrl'] = body.logoDarkUrl;
          if (body.faviconUrl !== undefined)
            platformUpdate['branding.faviconUrl'] = body.faviconUrl;
          if (body.primaryColor !== undefined)
            platformUpdate['branding.primaryColor'] = body.primaryColor;
          if (body.accentColor !== undefined)
            platformUpdate['branding.accentColor'] = body.accentColor;
          if (Object.keys(platformUpdate).length > 0) {
            const result = await Tenant.updateOne({ slug: tenantSlug }, { $set: platformUpdate });
            request.log.info(
              {
                tenantSlug,
                fields: Object.keys(platformUpdate),
                matched: result.matchedCount,
                modified: result.modifiedCount,
              },
              'Branding sync → platform Tenant',
            );
            if (result.matchedCount === 0) {
              request.log.warn(
                { tenantSlug },
                'Platform Tenant not found during branding sync — slug mismatch?',
              );
            }
          }
        } else {
          request.log.warn('Branding sync skipped: tenantSlug missing from request context');
        }

        return apiResponse(reply, 200, { branding, message: 'Branding updated successfully' });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Invalid branding data', details);
        }
        return apiError(reply, 500, 'Failed to update branding');
      }
    },
  );

  /**
   * DELETE /api/branding — Reset branding to defaults
   * Only tenant_admin can reset.
   */
  fastify.delete(
    '/branding',
    { preHandler: [authGuard, tenantDbMiddleware, roleGuard('settings', 'delete')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);

        const BrandingModel = createBrandingModel(tenantDb);

        const branding = await BrandingModel.findOneAndUpdate(
          { type: 'branding' },
          {
            $set: {
              ...DEFAULT_BRANDING_VALUES,
              updatedBy: userId,
            },
          },
          { upsert: true, new: true, lean: true },
        );

        return apiResponse(reply, 200, { branding, message: 'Branding reset to defaults' });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to reset branding');
      }
    },
  );

  /**
   * POST /api/branding/upload — Upload branding asset (logo/favicon)
   * Only tenant_admin or platform_admin can upload.
   */
  fastify.post(
    '/branding/upload',
    { preHandler: [authGuard, tenantDbMiddleware, roleGuard('settings', 'update')] },
    async (request, reply) => {
      try {
        if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_BUCKET) {
          return apiError(reply, 503, 'File storage (S3/R2) is not configured.');
        }

        const data = await request.file();
        if (!data) {
          return apiError(reply, 400, 'No file provided. Use multipart/form-data.');
        }

        const buffer = await data.toBuffer();
        const ALLOWED_MIMES = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/svg+xml',
          'image/x-icon',
          'image/vnd.microsoft.icon',
        ];
        const MAX_SIZE = 5 * 1024 * 1024;

        if (!ALLOWED_MIMES.includes(data.mimetype)) {
          return apiError(
            reply,
            400,
            `Invalid file type: ${data.mimetype}. Allowed: JPEG, PNG, WebP, SVG, ICO`,
          );
        }
        if (buffer.length > MAX_SIZE) {
          return apiError(reply, 400, 'File too large. Max 5 MB.');
        }

        const tenantSlug =
          ((request as unknown as Record<string, unknown>).tenantSlug as string) || 'unknown';
        const ext = data.filename.includes('.')
          ? data.filename.slice(data.filename.lastIndexOf('.'))
          : '.png';
        const key = `tenants/${tenantSlug}/branding/${randomUUID()}${ext}`;

        await uploadToS3(key, buffer, data.mimetype);
        const url = await getPresignedDownloadUrl(key, 86400);

        return apiResponse(
          reply,
          201,
          {
            key,
            url,
            fileName: data.filename,
            mimeType: data.mimetype,
            fileSize: buffer.length,
          },
          'Branding asset uploaded',
        );
      } catch (err) {
        request.log.error(err, 'Tenant branding upload failed');
        const message = err instanceof Error ? err.message : 'Upload failed';
        return apiError(reply, 500, message);
      }
    },
  );
}

// ── General Settings Routes ─────────────────────────────────
// DEPRECATED: Replaced by /api/tenant-settings (Week 13)
// Kept for backward compatibility — proxies to the real settings service.

export async function settingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/settings/general — Legacy endpoint
   * Proxies to /api/tenant-settings/clinic for backward compatibility.
   */
  fastify.get(
    '/general',
    { preHandler: [authGuard, tenantDbMiddleware] },
    async (request, reply) => {
      try {
        const tenantDb = (request as any).tenantDb;
        if (!tenantDb) {
          // Fallback: return minimal defaults if no tenant context
          return apiResponse(reply, 200, {
            settings: {
              clinicName: '',
              locale: { language: 'en', currency: 'EGP', timezone: 'Africa/Cairo' },
            },
          });
        }

        const { SettingsService } = await import('../../services/settings.service.js');
        const service = new SettingsService(tenantDb);
        const clinicSettings = await service.getByKey('clinic');
        return apiResponse(reply, 200, { settings: clinicSettings });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch settings');
      }
    },
  );

  /**
   * PATCH /api/settings/general — Legacy endpoint
   */
  fastify.patch(
    '/general',
    { preHandler: [authGuard, tenantDbMiddleware, roleGuard('settings', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = (request as any).tenantDb;
        if (!tenantDb) {
          return apiError(reply, 400, 'Tenant context required');
        }

        const body = request.body as Record<string, unknown>;
        const userId = ((request as any).user as Record<string, string>).userId;

        const { SettingsService } = await import('../../services/settings.service.js');
        const service = new SettingsService(tenantDb);
        const updated = await service.update('clinic', body, userId);

        return apiResponse(reply, 200, {
          settings: updated,
          message: 'Settings updated successfully',
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const details: Record<string, string[]> = {};
          for (const issue of err.issues) {
            const path = issue.path.join('.');
            if (!details[path]) details[path] = [];
            details[path].push(issue.message);
          }
          return apiError(reply, 400, 'Invalid settings data', details);
        }
        return apiError(reply, 500, 'Failed to update settings');
      }
    },
  );
}

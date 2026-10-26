/**
 * Onboarding Route — Public Tenant Registration
 *
 * Per MASTER_PLAN §25 — Tenant Onboarding Wizard
 *
 * POST /api/onboarding — 4-step wizard payload:
 *   1. Clinic Info → Tenant record in platform DB
 *   2. Branch Setup → First branch in tenant DB
 *   3. Admin User → User record in platform DB (role: tenant_admin)
 *   4. Settings → Seed tenant settings + defaults
 *
 * No auth required — this is a public registration endpoint.
 * Rate-limited in production by the global rate limiter.
 *
 * Delegates to provisionTenant() — single source of truth for provisioning.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import {
  provisionTenant,
  ProvisionError,
} from '../../../platform/services/tenant-provisioning.service.js';

// ── Validation Schema ───────────────────────────────────────

const addressSchema = z.object({
  street: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(2).max(3),
  postalCode: z.string().max(20).optional(),
});

const onboardingSchema = z.object({
  clinic: z.object({
    name: z.string().min(2).max(200),
    phone: z.string().min(5).max(30),
    email: z.string().email(),
    website: z.string().url().optional(),
    address: addressSchema,
  }),
  branch: z.object({
    name: z.string().min(2).max(200),
    phone: z.string().min(5).max(30),
    email: z.string().email().optional(),
    isMainBranch: z.boolean().default(true),
    workingHours: z
      .array(
        z.object({
          day: z.number().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
          isOpen: z.boolean(),
        }),
      )
      .optional(),
    address: addressSchema,
  }),
  admin: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(5).max(30),
    password: z.string().min(8).max(128),
  }),
  settings: z
    .object({
      locale: z.string().min(2).max(5).default('en'),
      country: z.string().min(2).max(3).default('EG'),
      currency: z.string().min(3).max(3).default('EGP'),
      timezone: z.string().default('Africa/Cairo'),
      dateFormat: z.string().default('DD/MM/YYYY'),
      appointmentDuration: z.number().min(5).max(240).default(30),
    })
    .optional(),
});

type OnboardingInput = z.infer<typeof onboardingSchema>;

// ── Route Registration ──────────────────────────────────────

export async function onboardingRoutes(fastify: FastifyInstance) {
  /**
   * POST / — Complete tenant onboarding
   *
   * Creates: Tenant + User + Branch + Seeds + Settings
   * Returns: { tenant: { slug, name }, user: { email } }
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    let parsed: OnboardingInput;

    try {
      parsed = onboardingSchema.parse(request.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return apiError(reply, 400, 'Validation failed', err.issues);
      }
      return apiError(reply, 400, 'Invalid request body');
    }

    const { clinic, branch, admin, settings } = parsed;

    try {
      // Map onboarding locale → provisionTenant settings format
      const locale = settings?.locale ?? 'en';

      const result = await provisionTenant({
        clinic: {
          name: clinic.name,
          phone: clinic.phone,
          email: clinic.email,
          website: clinic.website,
          address: clinic.address,
        },
        branch: {
          name: branch.name,
          phone: branch.phone,
          email: branch.email,
          isMainBranch: branch.isMainBranch,
          workingHours: branch.workingHours,
          address: branch.address,
        },
        admin: {
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          phone: admin.phone,
          password: admin.password,
        },
        settings: {
          defaultLanguage: locale,
          supportedLanguages: locale === 'en' ? ['en'] : ['en', locale],
          country: settings?.country ?? clinic.address.country,
          currency: settings?.currency,
          timezone: settings?.timezone,
          dateFormat: settings?.dateFormat,
          appointmentDuration: settings?.appointmentDuration,
        },
      });

      return apiResponse(
        reply,
        201,
        {
          tenant: {
            slug: result.tenant.slug,
            name: result.tenant.name,
            status: result.tenant.status,
          },
          user: {
            email: result.user.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
          },
        },
        'Clinic created successfully',
      );
    } catch (error) {
      if (error instanceof ProvisionError) {
        return apiError(reply, error.statusCode, error.message);
      }

      if (error instanceof Error && error.message.includes('duplicate key')) {
        return apiError(reply, 409, 'This clinic name is already taken');
      }

      throw error;
    }
  });
}

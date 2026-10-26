/**
 * Feature Flag Schemas — Phase 7
 *
 * Per BUILD_RULES §5 — all Zod schemas use `.strict()`.
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.2
 */

import { z } from 'zod';

// ── Create Schema ───────────────────────────────────────────

export const createFeatureFlagSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(100)
      .regex(
        /^[a-z][a-z0-9_]*$/,
        'Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores',
      ),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().default(''),
    tenantId: z.string().min(1).nullable().optional().default(null),
    enabled: z.boolean().optional().default(false),
    percentageRollout: z.number().int().min(0).max(100).nullable().optional().default(null),
    userIds: z.array(z.string().min(1)).nullable().optional().default(null),
    conditions: z.record(z.string(), z.unknown()).nullable().optional().default(null),
    value: z.unknown().nullable().optional().default(null),
  })
  .strict();

// ── Update Schema ───────────────────────────────────────────

export const updateFeatureFlagSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    tenantId: z.string().min(1).nullable().optional(),
    enabled: z.boolean().optional(),
    percentageRollout: z.number().int().min(0).max(100).nullable().optional(),
    userIds: z.array(z.string().min(1)).nullable().optional(),
    conditions: z.record(z.string(), z.unknown()).nullable().optional(),
    value: z.unknown().nullable().optional(),
  })
  .strict();

// ── Toggle Schema ───────────────────────────────────────────

export const toggleFeatureFlagSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

// ── Query Schema (for list endpoint) ────────────────────────

export const featureFlagQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(200).optional(),
    tenantId: z.string().min(1).optional(),
    enabled: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  })
  .strict();

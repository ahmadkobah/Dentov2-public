import { z } from 'zod';

/**
 * Platform User Schemas — Zod Validation
 *
 * Used by Platform User Management API endpoints.
 * See: PLATFORM_RBAC.md §7
 */

// ── Enums ───────────────────────────────────────────────────

export const platformRoleEnum = z.enum(['platform_owner', 'platform_admin', 'platform_viewer']);

export const platformModuleEnum = z.enum([
  'platform_tenants',
  'platform_users',
  'platform_billing',
  'platform_modules',
  'platform_pricing',
  'platform_api_keys',
  'platform_webhooks',
  'platform_backups',
  'platform_support',
  'platform_settings',
  'platform_audit',
]);

export const platformActionEnum = z.enum(['read', 'create', 'update', 'delete', 'manage']);

// ── Invite Platform User ────────────────────────────────────

export const invitePlatformUserSchema = z
  .object({
    email: z.string().email().max(255),
    firstName: z.object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    }),
    lastName: z.object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    }),
    platformRole: z.enum(['platform_admin', 'platform_viewer']),
    // Note: platform_owner can only be assigned by existing owner via update
  })
  .strict();

// ── Create Platform User (Direct) ───────────────────────────

export const createPlatformUserSchema = z
  .object({
    email: z.string().email().max(255),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one digit')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    firstName: z.object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    }),
    lastName: z.object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    }),
    phone: z.string().max(30).optional(),
    platformRole: z.enum(['platform_owner', 'platform_admin', 'platform_viewer']),
  })
  .strict();

// ── Update Platform User (Role / Status / Profile) ──────────

export const updatePlatformUserSchema = z
  .object({
    platformRole: platformRoleEnum.optional(),
    status: z.enum(['active', 'suspended', 'deactivated']).optional(),
    firstName: z
      .object({ en: z.string().min(1).max(100), ar: z.string().max(100).optional() })
      .optional(),
    lastName: z
      .object({ en: z.string().min(1).max(100), ar: z.string().max(100).optional() })
      .optional(),
    phone: z.string().max(30).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.platformRole ||
      data.status ||
      data.firstName ||
      data.lastName ||
      data.phone !== undefined,
    {
      message: 'At least one field must be provided',
    },
  );

// ── Update Platform Permission Overrides ────────────────────

export const updatePlatformPermissionsSchema = z
  .object({
    platformPermissionOverrides: z
      .array(
        z.object({
          module: platformModuleEnum,
          actions: z.array(platformActionEnum),
        }),
      )
      .max(10),
  })
  .strict();

// ── Platform User List Query ────────────────────────────────

export const platformUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  platformRole: platformRoleEnum.optional(),
  status: z
    .enum(['invited', 'pending_activation', 'active', 'suspended', 'deactivated'])
    .optional(),
  sortBy: z.enum(['createdAt', 'email', 'platformRole', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Accept Invite ───────────────────────────────────────────

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one digit')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  })
  .strict();

// ── Verify Invite Token ─────────────────────────────────────

export const verifyInviteTokenSchema = z.object({
  token: z.string().min(1),
});

// ── Resend Invite ───────────────────────────────────────────

export const resendInviteSchema = z.object({
  id: z.string().min(1),
});

// ── Type Exports ────────────────────────────────────────────

export type InvitePlatformUserInput = z.infer<typeof invitePlatformUserSchema>;
export type CreatePlatformUserInput = z.infer<typeof createPlatformUserSchema>;
export type UpdatePlatformUserInput = z.infer<typeof updatePlatformUserSchema>;
export type UpdatePlatformPermissionsInput = z.infer<typeof updatePlatformPermissionsSchema>;
export type PlatformUserListQuery = z.infer<typeof platformUserListQuerySchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type VerifyInviteTokenInput = z.infer<typeof verifyInviteTokenSchema>;

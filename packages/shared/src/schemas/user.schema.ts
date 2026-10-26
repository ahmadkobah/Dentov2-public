import { z } from 'zod';

/**
 * User Management Schemas — Per MASTER_PLAN §12 + §27
 *
 * Invite-based creation: Admin enters email + role → system sends invite
 * 8 roles: platform_admin, tenant_admin, dentist, receptionist, assistant, accountant, lab_tech, hygienist
 */

// ── Roles ───────────────────────────────────────────────────

export const userRoleEnum = z.enum([
  'tenant_admin',
  'dentist',
  'receptionist',
  'assistant',
  'accountant',
  'lab_tech',
  'hygienist',
]);

export const userStatusEnum = z.enum([
  'invited',
  'pending_activation',
  'active',
  'suspended',
  'deactivated',
]);

// ── Invite User ─────────────────────────────────────────────

export const inviteUserSchema = z
  .object({
    email: z.string().email(),
    role: userRoleEnum,
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().max(20).optional(),
  })
  .strict();

// ── Update User (Admin) ────────────────────────────────────

export const updateUserSchema = z
  .object({
    role: userRoleEnum.optional(),
    status: z.enum(['active', 'suspended', 'deactivated']).optional(),
  })
  .strict();

// ── Edit User Profile (Admin) ──────────────────────────────

export const editUserProfileSchema = z
  .object({
    firstName: z.object({ en: z.string().min(1).max(100), ar: z.string().max(100).optional() }),
    lastName: z.object({ en: z.string().min(1).max(100), ar: z.string().max(100).optional() }),
    phone: z.string().max(20).optional().nullable(),
    gender: z.enum(['male', 'female', 'other']).optional().nullable(),
    role: userRoleEnum.optional(),
    email: z.string().email().optional(),
  })
  .strict();

// ── Admin Set Password ─────────────────────────────────────

export const adminSetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
  })
  .strict();

// ── User List Query ─────────────────────────────────────────

export const userListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role: userRoleEnum.optional(),
    status: userStatusEnum.optional(),
    sortBy: z.enum(['createdAt', 'lastLoginAt', 'profile.firstName.en']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Direct Create User (Developer Portal — skip invite) ─────

export const directCreateUserSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    role: userRoleEnum,
    firstName: z.object({ en: z.string().min(1).max(100), ar: z.string().max(100).optional() }),
    lastName: z.object({ en: z.string().min(1).max(100), ar: z.string().max(100).optional() }),
    phone: z.string().max(20).optional(),
  })
  .strict();

// ── Type Exports ────────────────────────────────────────────

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type EditUserProfileInput = z.infer<typeof editUserProfileSchema>;
export type AdminSetPasswordInput = z.infer<typeof adminSetPasswordSchema>;
export type DirectCreateUserInput = z.infer<typeof directCreateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

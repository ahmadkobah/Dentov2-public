import { z } from 'zod';

// ── Auth Schemas ────────────────────────────────────────────

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    tenantSlug: z.string().min(2).max(63).optional(),
    forceLogin: z.boolean().optional(),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    tenantSlug: z.string().min(2).max(63).optional(),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8).max(128),
  })
  .strict();

export const totpVerifySchema = z
  .object({
    code: z.string().length(6),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * TOTP / 2FA Schemas — Zod Validation
 *
 * Per V2_DECISION_LOG.md §9 — 2FA Phase Reassignment
 * Per BUILD_RULES §17.8 — totpVerifySchema
 *
 * Flow:
 *   1. POST /auth/2fa/setup   → Generate TOTP secret + QR code
 *   2. POST /auth/2fa/verify  → Verify 6-digit code, enable 2FA
 *   3. POST /auth/2fa/disable → Disable 2FA (password required)
 *   4. POST /auth/2fa/recovery → Use recovery code to login
 */

import { z } from 'zod';

// ── TOTP Setup (step 1 — request QR code) ───────────────────

export const totpSetupSchema = z.object({
  // No input needed — server generates secret
});

// ── TOTP Verify (step 2 — confirm setup with 6-digit code) ─

export const totpSetupVerifySchema = z.object({
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code'),
});

// ── TOTP Login Verify (during login flow) ───────────────────

export const totpLoginVerifySchema = z.object({
  tempToken: z.string().min(1),
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code'),
});

// ── TOTP Disable (requires password confirmation) ───────────

export const totpDisableSchema = z.object({
  password: z.string().min(1),
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code')
    .optional(),
});

// ── Recovery Code Login ─────────────────────────────────────

export const totpRecoverySchema = z.object({
  tempToken: z.string().min(1),
  recoveryCode: z
    .string()
    .min(8)
    .max(20)
    .regex(/^[a-zA-Z0-9-]+$/, 'Invalid recovery code format'),
});

// ── Inferred Types ──────────────────────────────────────────

export type TotpSetupInput = z.infer<typeof totpSetupSchema>;
export type TotpSetupVerifyInput = z.infer<typeof totpSetupVerifySchema>;
export type TotpLoginVerifyInput = z.infer<typeof totpLoginVerifySchema>;
export type TotpDisableInput = z.infer<typeof totpDisableSchema>;
export type TotpRecoveryInput = z.infer<typeof totpRecoverySchema>;

/**
 * TOTP Service — Two-Factor Authentication
 *
 * Per V2_DECISION_LOG.md §9 — 2FA with otplib + qrcode
 * Per SECURITY_AND_ENCRYPTION.md §10.1 — MFA
 * Per DENTO_V2_MASTER_PLAN.md §27 — Sicherheit & Compliance
 *
 * Features:
 * - TOTP secret generation (RFC 6238)
 * - QR code as data URI for authenticator apps
 * - 6-digit code verification with 1-window tolerance
 * - Recovery codes (10 codes, Argon2id hashed)
 * - Enable/disable per user
 */

import crypto from 'node:crypto';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import QRCode from 'qrcode';
import argon2 from 'argon2';
import { env } from '../../config/env.js';
import { User } from '../../platform/models/index.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';

// ── Configuration ─────────────────────────────────────────

const TOTP_ISSUER = env.TOTP_ISSUER || 'Dento';
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 10; // e.g., "a3Xk9-mQ2pL"
// otplib default TOTP period. Used to derive the accepted time-step for
// anti-replay (#68). Keep in sync with the TOTP instance options below.
const TOTP_PERIOD_SECONDS = 30;

// otplib v13 — class-based API with explicit plugins
const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// ── Helpers ───────────────────────────────────────────────

function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate human-readable codes: xxxxx-xxxxx
    const raw = crypto.randomBytes(8).toString('base64url').slice(0, RECOVERY_CODE_LENGTH);
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    codes.push(formatted);
  }
  return codes;
}

async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => argon2.hash(code, ARGON2_OPTIONS)));
}

// ── Service ───────────────────────────────────────────────

export class TotpService {
  /**
   * Setup: Generate secret + QR code (not yet enabled)
   * Stores pending secret on user document.
   */
  async setup(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

    if (user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is already enabled', 'TOTP_ALREADY_ENABLED');
    }

    // Generate secret
    const secret = totp.generateSecret();

    // Generate QR code
    const otpauthUrl = totp.toURI({ label: user.email, issuer: TOTP_ISSUER, secret });
    const qrCodeDataUri = await QRCode.toDataURL(otpauthUrl);

    // Store pending secret (not yet verified)
    await User.findByIdAndUpdate(userId, {
      $set: { twoFactorPendingSecret: secret },
    });

    return {
      secret, // Show to user for manual entry
      qrCode: qrCodeDataUri, // Data URI image for scanning
      otpauthUrl, // For advanced users
    };
  }

  /**
   * Verify: User confirms setup by providing a valid TOTP code.
   * On success, 2FA is fully enabled and recovery codes are generated.
   */
  async verify(userId: string, token: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

    if (user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is already enabled', 'TOTP_ALREADY_ENABLED');
    }

    const pendingSecret = user.twoFactorPendingSecret;
    if (!pendingSecret) {
      throw new ApiError(400, 'No pending 2FA setup found. Call setup first.', 'TOTP_NO_PENDING');
    }

    // Verify the token against pending secret
    const result = await totp.verify(token, { secret: pendingSecret });
    if (!result.valid) {
      throw new ApiError(400, 'Invalid verification code', 'TOTP_INVALID_CODE');
    }

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes();
    const hashedCodes = await hashRecoveryCodes(recoveryCodes);

    // Enable 2FA
    await User.findByIdAndUpdate(userId, {
      $set: {
        twoFactorEnabled: true,
        twoFactorSecret: pendingSecret,
        twoFactorRecoveryCodes: hashedCodes,
      },
      $unset: { twoFactorPendingSecret: 1 },
    });

    logger.info({ userId }, '2FA enabled via TOTP');

    return {
      recoveryCodes, // Show once to user — they must save these
    };
  }

  /**
   * Validate: Check a TOTP code during login (after password verified).
   *
   * Anti-replay (#68): a valid code is bound to a discrete time-step. We compute
   * the step the code matched (current step + otplib's drift `delta`) and accept
   * it only if that step is strictly newer than the last accepted step, then
   * atomically persist it. The conditional update also closes the concurrent
   * double-submit race — only one request can claim a given step.
   */
  async validateLogin(userId: string, token: string): Promise<boolean> {
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new ApiError(400, '2FA is not enabled', 'TOTP_NOT_ENABLED');
    }

    const result = await totp.verify(token, { secret: user.twoFactorSecret });
    if (!result.valid) return false;

    // Step the code matched. otplib default period is 30s, t0 is 0.
    const currentStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
    const usedStep = currentStep + result.delta;

    // Atomically claim the step: only succeeds when it is strictly newer than the
    // stored value (or none was stored yet). A replay of the same code resolves to
    // the same `usedStep`, fails the `$lt` guard, and is rejected.
    const claim = await User.updateOne(
      {
        _id: userId,
        $or: [
          { lastTotpStep: null },
          { lastTotpStep: { $exists: false } },
          { lastTotpStep: { $lt: usedStep } },
        ],
      },
      { $set: { lastTotpStep: usedStep } },
    );

    if (claim.matchedCount === 0) {
      logger.warn({ userId, usedStep }, 'TOTP code replay rejected');
      return false;
    }

    return true;
  }

  /**
   * Validate a recovery code during login (alternative to TOTP).
   * Each recovery code can only be used once.
   */
  async validateRecoveryCode(userId: string, code: string): Promise<boolean> {
    const user = await User.findById(userId).select('+twoFactorRecoveryCodes');
    if (!user || !user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is not enabled', 'TOTP_NOT_ENABLED');
    }

    const codes = user.twoFactorRecoveryCodes || [];
    if (codes.length === 0) {
      throw new ApiError(400, 'No recovery codes remaining', 'TOTP_NO_RECOVERY_CODES');
    }

    // Check each hashed code
    for (let i = 0; i < codes.length; i++) {
      const isMatch = await argon2.verify(codes[i], code);
      if (isMatch) {
        // Remove used code from array
        codes.splice(i, 1);
        await User.findByIdAndUpdate(userId, {
          $set: { twoFactorRecoveryCodes: codes },
        });
        logger.info({ userId, remainingCodes: codes.length }, 'Recovery code used');
        return true;
      }
    }

    return false;
  }

  /**
   * Disable: Turn off 2FA (requires password verification upstream).
   */
  async disable(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

    if (!user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is not enabled', 'TOTP_NOT_ENABLED');
    }

    await User.findByIdAndUpdate(userId, {
      $set: { twoFactorEnabled: false },
      $unset: {
        twoFactorSecret: 1,
        twoFactorPendingSecret: 1,
        twoFactorRecoveryCodes: 1,
      },
    });

    logger.info({ userId }, '2FA disabled');
  }

  /**
   * Regenerate recovery codes (for a user who has 2FA enabled).
   */
  async regenerateRecoveryCodes(userId: string) {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorEnabled) {
      throw new ApiError(400, '2FA is not enabled', 'TOTP_NOT_ENABLED');
    }

    const recoveryCodes = generateRecoveryCodes();
    const hashedCodes = await hashRecoveryCodes(recoveryCodes);

    await User.findByIdAndUpdate(userId, {
      $set: { twoFactorRecoveryCodes: hashedCodes },
    });

    return { recoveryCodes };
  }

  /**
   * Get 2FA status for a user
   */
  async getStatus(userId: string) {
    const user = await User.findById(userId).select('twoFactorEnabled twoFactorRecoveryCodes');
    if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

    return {
      enabled: !!user.twoFactorEnabled,
      recoveryCodesRemaining: user.twoFactorRecoveryCodes?.length ?? 0,
    };
  }
}

/**
 * Two-Factor Authentication Routes (TOTP)
 *
 * Per V2_DECISION_LOG.md Â§9 â€” 2FA: otplib + qrcode
 * Per SECURITY_AND_ENCRYPTION.md Â§10.1 â€” MFA
 * Per DENTO_V2_MASTER_PLAN.md Â§27 â€” Sicherheit & Compliance
 *
 * Endpoints:
 * - POST /auth/2fa/setup â€” Generate TOTP secret + QR code
 * - POST /auth/2fa/verify â€” Confirm setup with valid code
 * - POST /auth/2fa/validate â€” Validate during login (after password check)
 * - POST /auth/2fa/recovery â€” Use a recovery code during login
 * - POST /auth/2fa/disable â€” Disable 2FA (requires password)
 * - GET /auth/2fa/status â€” Get 2FA status
 * - POST /auth/2fa/regenerate-codes â€” Regenerate recovery codes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwtLib from 'jsonwebtoken';
import argon2 from 'argon2';
import {
  totpSetupVerifySchema,
  totpLoginVerifySchema,
  totpDisableSchema,
  totpRecoverySchema,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, optionalAuthGuard } from '../../middleware/index.js';
import { TotpService } from '../../services/totp.service.js';
import { User } from '../../../platform/models/index.js';
import { createSessionAndTokens, setRefreshCookie } from './auth.route.js';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * F-4 rate-limit key extractor. Decodes the (unverified) 2FA challenge token
 * just enough to extract `userId` so attempts are bucketed per-account+IP.
 * Falls back to IP when the token is missing/malformed â€” the verifier inside
 * the handler will still reject those requests.
 */
function totpRateLimitKey(req: FastifyRequest, suffix: string): string {
  const body = (req.body ?? {}) as { tempToken?: string };
  let userId = 'unknown';
  if (body.tempToken) {
    try {
      const decoded = jwtLib.decode(body.tempToken) as { userId?: string } | null;
      if (decoded?.userId) userId = decoded.userId;
    } catch {
      /* fall through to IP-only bucket */
    }
  }
  return `ratelimit:2fa-${suffix}:${userId}:${req.ip}`;
}

function getUserPayload(request: unknown): Record<string, unknown> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, unknown>;
}

/**
 * Extract user from either authGuard payload or a restricted 2FA-setup tempToken.
 * Returns userId or null if invalid.
 */
async function getUserIdFromAuthOrSetupToken(
  request: FastifyRequest,
): Promise<{ userId: string; fromSetupToken: boolean } | null> {
  // First try normal auth payload
  const payload = getUserPayload(request);
  if (payload.userId) {
    return { userId: payload.userId as string, fromSetupToken: false };
  }

  // Fallback: check for setupToken in body
  const body = (request.body ?? {}) as Record<string, unknown>;
  const setupToken = body.setupToken as string | undefined;
  if (!setupToken) return null;

  try {
    const jwt = await import('../../../utils/jwt.js');
    const decoded = jwt.verifyAccessToken(setupToken) as unknown as Record<string, unknown>;
    if (decoded.scope !== '2fa-setup') return null;
    return { userId: decoded.userId as string, fromSetupToken: true };
  } catch {
    return null;
  }
}

// â”€â”€ Route Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function twoFactorRoutes(fastify: FastifyInstance) {
  const totpService = new TotpService();

  // â”€â”€â”€ POST /auth/2fa/setup â€” Generate TOTP secret + QR â”€â”€â”€â”€
  // Accepts either authGuard token OR restricted setupToken from login flow
  fastify.post(
    '/auth/2fa/setup',
    { preHandler: [optionalAuthGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Try authGuard first, then setupToken
        let userId: string | undefined;
        const authPayload = getUserPayload(request);
        if (authPayload.userId) {
          userId = authPayload.userId as string;
        } else {
          const setupAuth = await getUserIdFromAuthOrSetupToken(request);
          if (!setupAuth) return apiError(reply, 401, 'Authentication required');
          userId = setupAuth.userId;
        }

        const result = await totpService.setup(userId);

        return apiResponse(
          reply,
          200,
          {
            secret: result.secret,
            qrCode: result.qrCode,
            otpauthUrl: result.otpauthUrl,
          },
          'Scan the QR code with your authenticator app, then verify with a code',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to setup 2FA');
      }
    },
  );

  // â”€â”€â”€ POST /auth/2fa/verify â€” Confirm setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Accepts either authGuard token OR restricted setupToken from login flow
  fastify.post(
    '/auth/2fa/verify',
    { preHandler: [optionalAuthGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        let userId: string | undefined;
        let fromSetupToken = false;
        const authPayload = getUserPayload(request);
        if (authPayload.userId) {
          userId = authPayload.userId as string;
        } else {
          const setupAuth = await getUserIdFromAuthOrSetupToken(request);
          if (!setupAuth) return apiError(reply, 401, 'Authentication required');
          userId = setupAuth.userId;
          fromSetupToken = setupAuth.fromSetupToken;
        }

        const { token } = totpSetupVerifySchema.parse(request.body);
        const result = await totpService.verify(userId, token);

        // If coming from setup flow (login-time enforcement), issue real tokens
        if (fromSetupToken) {
          const user = await User.findById(userId);
          if (!user) return apiError(reply, 404, 'User not found');

          // Create a real session (eviction + refresh support) like password login.
          const tokens = await createSessionAndTokens(
            user,
            ((user as any).tenantSlug as string) || '',
            request,
          );
          setRefreshCookie(
            reply,
            tokens.refreshToken,
            tokens.refreshTokenExpiresAt,
            !!(user as any).platformRole,
          );
          const accessToken = tokens.accessToken;

          return apiResponse(
            reply,
            200,
            {
              recoveryCodes: result.recoveryCodes,
              accessToken,
              user: {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                tenantSlug: (user as any).tenantSlug || '',
                profile: (user as any).profile,
                isProfileComplete: (user as any).isProfileComplete,
              },
            },
            '2FA enabled successfully. You are now logged in.',
          );
        }

        return apiResponse(
          reply,
          200,
          {
            recoveryCodes: result.recoveryCodes,
          },
          '2FA enabled successfully. Save your recovery codes in a safe place.',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to verify 2FA setup');
      }
    },
  );

  // â”€â”€â”€ POST /auth/2fa/validate â€” Validate during login â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/2fa/validate',
    {
      // F-4: cap TOTP guessing. 6-digit code = 10^6 search space; 5/min/(user+ip)
      // gives an effective 2 minutes of brute-force per code rotation.
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          keyGenerator: (req) => totpRateLimitKey(req as FastifyRequest, 'validate'),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tempToken, token } = totpLoginVerifySchema.parse(request.body);

        // F-2: verify the dedicated 2fa challenge token (typ='2fa_pending').
        // verifyAccessToken would also reject this typ, so we MUST use the
        // dedicated verifier here.
        const jwt = await import('../../../utils/jwt.js');
        let payload: { userId: string };
        try {
          payload = jwt.verify2faChallengeToken(tempToken);
        } catch {
          return apiError(reply, 401, 'Invalid or expired temporary token');
        }

        const userId = payload.userId;
        const isValid = await totpService.validateLogin(userId, token);

        if (!isValid) {
          return apiError(reply, 401, 'Invalid 2FA code');
        }

        // F-1: re-check account status & email verification AFTER 2FA validates.
        // The challenge token survives status changes; without this check an admin
        // could suspend / lock an account between the password and 2FA steps yet
        // still have full session tokens minted below.
        const user = await User.findById(userId).select('+twoFactorEnabled');
        if (!user) return apiError(reply, 404, 'User not found');
        if (!(user as any).twoFactorEnabled) {
          // Defence-in-depth: never accept a 2FA code for a user who hasn't enrolled.
          return apiError(reply, 400, '2FA is not enabled for this account');
        }
        if (user.status !== 'active') {
          return apiError(
            reply,
            403,
            'Your account is not active. Please contact your administrator.',
          );
        }
        if (!user.isEmailVerified) {
          return apiError(reply, 403, 'Please verify your email before signing in.');
        }

        // Route 2FA logins through the same session-creating path as password login, so
        // a UserSession row exists: enables device-limit eviction and lets /auth/refresh
        // find the session by jti. (Previously 2FA minted tokens inline with no session,
        // so the very first refresh failed reuse-detection and revoked all sessions.)
        const tokens = await createSessionAndTokens(
          user,
          ((user as any).tenantSlug as string) || '',
          request,
        );
        setRefreshCookie(
          reply,
          tokens.refreshToken,
          tokens.refreshTokenExpiresAt,
          !!(user as any).platformRole,
        );
        const accessToken = tokens.accessToken;

        return apiResponse(
          reply,
          200,
          {
            accessToken,
            user: {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
              tenantSlug: (user as any).tenantSlug || '',
              profile: (user as any).profile,
              isProfileComplete: (user as any).isProfileComplete,
            },
          },
          'Login successful',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to validate 2FA');
      }
    },
  );

  // â”€â”€â”€ POST /auth/2fa/recovery â€” Use recovery code â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/2fa/recovery',
    {
      // F-4: also throttle the recovery-code path. Codes are higher-entropy
      // but a slow trickle of guesses against a leaked tempToken still warrants
      // a tight cap.
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          keyGenerator: (req) => totpRateLimitKey(req as FastifyRequest, 'recovery'),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tempToken, recoveryCode } = totpRecoverySchema.parse(request.body);

        const jwt = await import('../../../utils/jwt.js');
        let payload: { userId: string };
        try {
          payload = jwt.verify2faChallengeToken(tempToken);
        } catch {
          return apiError(reply, 401, 'Invalid or expired temporary token');
        }

        const userId = payload.userId;
        const isValid = await totpService.validateRecoveryCode(userId, recoveryCode);

        if (!isValid) {
          return apiError(reply, 401, 'Invalid recovery code');
        }

        // F-1: same account-status re-check as /auth/2fa/validate.
        const user = await User.findById(userId).select('+twoFactorEnabled');
        if (!user) return apiError(reply, 404, 'User not found');
        if (!(user as any).twoFactorEnabled) {
          return apiError(reply, 400, '2FA is not enabled for this account');
        }
        if (user.status !== 'active') {
          return apiError(
            reply,
            403,
            'Your account is not active. Please contact your administrator.',
          );
        }
        if (!user.isEmailVerified) {
          return apiError(reply, 403, 'Please verify your email before signing in.');
        }

        // Recovery-code login also gets a real session (eviction + refresh) like login.
        const tokens = await createSessionAndTokens(
          user,
          ((user as any).tenantSlug as string) || '',
          request,
        );
        setRefreshCookie(
          reply,
          tokens.refreshToken,
          tokens.refreshTokenExpiresAt,
          !!(user as any).platformRole,
        );
        const accessToken = tokens.accessToken;

        return apiResponse(
          reply,
          200,
          {
            accessToken,
            user: {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
              tenantSlug: (user as any).tenantSlug || '',
              profile: (user as any).profile,
              isProfileComplete: (user as any).isProfileComplete,
            },
          },
          'Login successful via recovery code',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to validate recovery code');
      }
    },
  );

  // â”€â”€â”€ POST /auth/2fa/disable â€” Disable 2FA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/2fa/disable',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUserPayload(request).userId as string;
        const userTenantSlug = getUserPayload(request).tenantSlug as string;
        const { password } = totpDisableSchema.parse(request.body);

        // Verify password before disabling
        const user = await User.findById(userId).select('+password');
        if (!user) return apiError(reply, 404, 'User not found');

        const passwordValid = await argon2.verify(user.password, password);
        if (!passwordValid) {
          return apiError(reply, 401, 'Invalid password');
        }

        // Check if 2FA is required by policy before allowing disable
        const resolvedSlug = (user as any).tenantSlug || userTenantSlug;
        if (resolvedSlug) {
          try {
            // Check platform-level enforcement
            const { Tenant } = await import('../../../platform/models/tenant.model.js');
            const tenantDoc = await Tenant.findOne({ slug: resolvedSlug })
              .select('settings.platformEnforce2FA')
              .lean();
            if (tenantDoc?.settings?.platformEnforce2FA) {
              return apiError(reply, 403, 'Your organization requires 2FA. You cannot disable it.');
            }

            // Check tenant-level enforcement
            const { getTenantDb } = await import('../../../config/database.js');
            const tenantDb = await getTenantDb(resolvedSlug);
            const { SettingsService } = await import('../../services/settings.service.js');
            const settingsService = new SettingsService(tenantDb);
            const securitySettings = await settingsService.getByKey('security');
            const require2FA = (securitySettings as any)?.require2FA;
            const requiredRoles: string[] = (securitySettings as any)?.require2FAForRoles || [];

            if (require2FA && requiredRoles.length > 0 && requiredRoles.includes(user.role)) {
              return apiError(
                reply,
                403,
                'Your organization requires 2FA for your role. You cannot disable it.',
              );
            }
          } catch {
            // Settings not available â€” allow disable
          }
        }

        await totpService.disable(userId);
        return apiResponse(reply, 200, null, '2FA disabled successfully');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to disable 2FA');
      }
    },
  );

  // â”€â”€â”€ GET /auth/2fa/status â€” Get 2FA status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/auth/2fa/status',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUserPayload(request).userId as string;
        const status = await totpService.getStatus(userId);
        return apiResponse(reply, 200, status);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to get 2FA status');
      }
    },
  );

  // â”€â”€â”€ POST /auth/2fa/regenerate-codes â€” New recovery codes â”€
  fastify.post(
    '/auth/2fa/regenerate-codes',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUserPayload(request).userId as string;
        const result = await totpService.regenerateRecoveryCodes(userId);

        return apiResponse(
          reply,
          200,
          {
            recoveryCodes: result.recoveryCodes,
          },
          'Recovery codes regenerated. Previous codes are now invalid.',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to regenerate recovery codes');
      }
    },
  );
}

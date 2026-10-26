import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type mongoose from 'mongoose';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type PlatformPermissionOverride,
} from '@dento/shared';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  JwtError,
  type TokenPair,
} from '../../../utils/jwt.js';
import { env } from '../../../config/env.js';
import { User, type IUser } from '../../../platform/models/index.js';
import { UserSession, type IUserSession } from '../../../platform/models/user-session.model.js';
import { Tenant, type ISessionLimits } from '../../../platform/models/tenant.model.js';
import {
  authGuard,
  checkLoginAllowed,
  recordFailedAttempt,
  clearFailedAttempts,
  loginRateLimiter,
} from '../../middleware/index.js';
import { logger } from '../../../utils/logger.js';
import { resolvePlatformPermissions } from '../../../platform/middleware/index.js';
import { acceptInviteSchema, verifyInviteTokenSchema } from '@dento/shared';
import { sendEmail } from '../../../services/providers/email.provider.js';
import { passwordResetEmailHtml } from '../../../utils/email-templates.js';

// â”€â”€ Argon2id Config (Â§17.3 â€” Decision Log overrides bcrypt) â”€

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

const PASSWORD_HISTORY_LIMIT = 5;
const DEFAULT_SESSION_LIMITS: ISessionLimits = { maxDesktop: 1, maxMobile: 1, maxTablet: 1 };
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// â”€â”€ Cookie Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REFRESH_COOKIE_NAME = 'dento_refresh';
const PLATFORM_REFRESH_COOKIE_NAME = 'dento_platform_refresh';

export function setRefreshCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
  isPlatform = false,
): void {
  const cookieName = isPlatform ? PLATFORM_REFRESH_COOKIE_NAME : REFRESH_COOKIE_NAME;
  reply.setCookie(cookieName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    expires: expiresAt,
    signed: true,
  });
}

function clearRefreshCookie(reply: FastifyReply, isPlatform = false): void {
  const cookieName = isPlatform ? PLATFORM_REFRESH_COOKIE_NAME : REFRESH_COOKIE_NAME;
  reply.clearCookie(cookieName, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

// â”€â”€ Route Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getUserPayload(request: unknown): Record<string, unknown> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, unknown>;
}

function getClientIp(request: FastifyRequest): string {
  return request.ip || (request.headers['x-forwarded-for'] as string) || 'unknown';
}

// Device type matches the UserSession schema enum (['desktop','mobile','tablet','unknown']).
type DeviceType = IUserSession['deviceType'];
const DEVICE_TYPES: readonly DeviceType[] = ['desktop', 'mobile', 'tablet', 'unknown'];

/** Narrow an arbitrary device-type string to the schema enum, defaulting to 'unknown'. */
function normalizeDeviceType(value: string): DeviceType {
  return (DEVICE_TYPES as readonly string[]).includes(value) ? (value as DeviceType) : 'unknown';
}

function parseUserAgent(ua: string): { deviceType: DeviceType; browser: string; os: string } {
  let deviceType: DeviceType = 'unknown';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Device type
  if (/mobile|android|iphone|ipad/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
  } else if (/windows|macintosh|linux/i.test(ua)) {
    deviceType = 'desktop';
  }

  // Browser
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  // OS
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  return { deviceType, browser, os };
}

function parseExpiryMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid expiry unit: ${match[2]}`);
  }
}

/**
 * Check if the user already has an active session for the detected device type.
 * Returns conflict info if a session exists, null otherwise.
 */
async function checkSessionConflict(
  userId: mongoose.Types.ObjectId,
  deviceType: DeviceType,
  sessionLimits: ISessionLimits,
): Promise<{ deviceType: string; browser: string; os: string; lastActivityAt: Date } | null> {
  const limitKey =
    `max${deviceType.charAt(0).toUpperCase()}${deviceType.slice(1)}` as keyof ISessionLimits;
  const limit = sessionLimits[limitKey] ?? 1;

  const activeSessions = await UserSession.find({
    userId,
    deviceType,
    isActive: true,
  })
    .sort({ lastActivityAt: -1 })
    .limit(limit)
    .lean();

  if (activeSessions.length >= limit) {
    const oldest = activeSessions[activeSessions.length - 1];
    return {
      deviceType: oldest.deviceType,
      browser: oldest.browser || 'Unknown',
      os: oldest.os || 'Unknown',
      lastActivityAt: oldest.lastActivityAt,
    };
  }

  return null;
}

/**
 * Evict excess sessions for a specific device type to make room for a new one.
 */
async function evictSessionsForDeviceType(
  userId: mongoose.Types.ObjectId,
  deviceType: DeviceType,
  limit: number,
): Promise<number> {
  const activeSessions = await UserSession.find({
    userId,
    deviceType,
    isActive: true,
  })
    .sort({ lastActivityAt: 1 }) // oldest first
    .select('_id')
    .lean();

  const toEvict = activeSessions.length - limit + 1; // +1 to make room
  if (toEvict <= 0) return 0;

  const idsToEvict = activeSessions.slice(0, toEvict).map((s) => s._id);
  const result = await UserSession.updateMany({ _id: { $in: idsToEvict } }, { isActive: false });

  return result.modifiedCount;
}

/**
 * Generate a token pair AND create a session record.
 * Returns the token pair with session info.
 */
export async function createSessionAndTokens(
  user: IUser,
  tenantSlug: string,
  request: FastifyRequest,
  sessionLimits: ISessionLimits = DEFAULT_SESSION_LIMITS,
): Promise<TokenPair & { sessionId: string }> {
  const sessionId = nanoid(16);
  const now = Date.now();

  const accessExpiryMs = parseExpiryMs(env.JWT_ACCESS_EXPIRY);
  const refreshExpiryMs = parseExpiryMs(env.JWT_REFRESH_EXPIRY);

  // Build access token payload â€” include platform RBAC if user has platformRole
  const accessPayload: Parameters<typeof generateAccessToken>[0] = {
    userId: user._id.toString(),
    email: user.email,
    tenantSlug,
    role: user.role,
    sessionId,
  };

  if (user.platformRole) {
    accessPayload.platformRole = user.platformRole;
    accessPayload.platformPermissions = resolvePlatformPermissions(
      user.platformRole,
      (user.platformPermissionOverrides ?? []) as PlatformPermissionOverride[],
    );
  }

  const accessToken = generateAccessToken(accessPayload);

  const { token: refreshToken, jti } = generateRefreshToken({
    userId: user._id.toString(),
    sessionId,
    tokenVersion: user.tokenVersion,
  });

  const accessTokenExpiresAt = new Date(now + accessExpiryMs);
  const refreshTokenExpiresAt = new Date(now + refreshExpiryMs);

  // Parse user agent (allow explicit X-Device-Type header for mobile apps)
  const userAgentStr = request.headers['user-agent'] || '';
  const parsed = parseUserAgent(userAgentStr);
  const deviceType = normalizeDeviceType(
    (request.headers['x-device-type'] as string) || parsed.deviceType,
  );
  const { browser, os } = parsed;

  // Â§17.7 â€” Per-device-type session limit enforcement
  const limitKey =
    `max${deviceType.charAt(0).toUpperCase()}${deviceType.slice(1)}` as keyof ISessionLimits;
  const limit = sessionLimits[limitKey] ?? 1;

  await evictSessionsForDeviceType(user._id, deviceType, limit);

  // Create session record
  await UserSession.create({
    userId: user._id,
    sessionId,
    refreshTokenJti: jti,
    userAgent: userAgentStr.substring(0, 500),
    ipAddress: getClientIp(request),
    deviceType,
    browser,
    os,
    isActive: true,
    lastActivityAt: new Date(),
    expiresAt: refreshTokenExpiresAt,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    sessionId,
  };
}

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function authRoutes(fastify: FastifyInstance) {
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/login
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/login',
    { preHandler: [loginRateLimiter] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = loginSchema.parse(request.body);
        const { email, password, tenantSlug } = body;

        // Brute-force check (per email+IP)
        await checkLoginAllowed(request, email);

        // Find user (include password + 2FA flag for verification)
        const user = await User.findOne({ email: email.toLowerCase() })
          .select('+password +twoFactorEnabled')
          .lean(false);

        if (!user) {
          await recordFailedAttempt(request, email);
          return apiError(reply, 401, 'Invalid email or password');
        }

        // Verify tenant match if tenantSlug provided
        if (tenantSlug && user.tenantSlug !== tenantSlug) {
          await recordFailedAttempt(request, email);
          return apiError(reply, 401, 'Invalid email or password');
        }

        // Check account status
        if (user.status === 'suspended') {
          return apiError(
            reply,
            403,
            'Your account has been suspended. Contact your administrator.',
          );
        }
        if (user.status === 'deactivated') {
          return apiError(reply, 403, 'Your account has been deactivated.');
        }
        if (user.status === 'locked') {
          // M-7: distinct message so the user knows to contact admin / reset
          // password rather than just waiting for a cooldown to expire.
          return apiError(
            reply,
            403,
            'Your account has been locked after too many failed login attempts. Please reset your password or contact your administrator.',
          );
        }
        if (user.status !== 'active') {
          return apiError(
            reply,
            403,
            'Your account is not yet active. Please check your email for the activation link.',
          );
        }

        // Defense-in-depth (H-3): even when status === 'active', explicitly require
        // a verified email. Catches the case where a row was created or migrated with
        // status flipped manually but `isEmailVerified` still false (e.g. SSO migration,
        // direct DB edit, future auth-provider import).
        if (!user.isEmailVerified) {
          return apiError(
            reply,
            403,
            'Please verify your email before signing in. Check your inbox or request a new activation link.',
          );
        }

        // Verify password â€” with bcryptâ†’Argon2id compat shim (V2_DECISION_LOG Â§7.4)
        // v1 (Supabase) used bcrypt ($2b$ prefix). On first v2 login we verify
        // with bcrypt, re-hash to Argon2id, and save â€” transparent to the user.
        let isValid = false;
        const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');

        if (isBcryptHash) {
          const bcrypt = await import('bcryptjs');
          isValid = await bcrypt.compare(password, user.password);

          if (isValid) {
            // Re-hash with Argon2id and persist
            const argon2Hash = await argon2.hash(password, ARGON2_OPTIONS);
            await User.updateOne({ _id: user._id }, { password: argon2Hash });
            logger.info({ msg: 'Migrated bcrypt hash â†’ Argon2id', userId: user._id });
          }
        } else {
          isValid = await argon2.verify(user.password, password);
        }

        if (!isValid) {
          await recordFailedAttempt(request, email);
          return apiError(reply, 401, 'Invalid email or password');
        }

        // Success â€” clear failed attempts
        await clearFailedAttempts(request, email);

        // â”€â”€ 2FA Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // If user has 2FA enabled, issue a short-lived temp token
        // instead of full tokens. Client must call /auth/2fa/validate.
        if ((user as any).twoFactorEnabled) {
          const jwt = await import('../../../utils/jwt.js');
          // F-2: dedicated 2fa challenge token (typ='2fa_pending'), 5-min TTL,
          // rejected by authGuard so it can't be replayed against protected routes.
          const tempToken = jwt.generate2faChallengeToken({
            userId: (user._id as any).toString(),
            email: user.email,
            tenantSlug: user.tenantSlug || tenantSlug || '',
            role: user.role,
          });

          logger.info({ msg: '2FA required', userId: user._id, email });

          return apiResponse(
            reply,
            200,
            {
              requires2FA: true,
              tempToken,
            },
            '2FA verification required',
          );
        }

        // â”€â”€ Per-device session limit check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const resolvedSlug = user.tenantSlug || tenantSlug || '';

        // Load tenant session limits + platform 2FA enforcement
        let sessionLimits: ISessionLimits = { ...DEFAULT_SESSION_LIMITS };
        let platformEnforce2FA = false;
        if (resolvedSlug) {
          try {
            const tenantDoc = await Tenant.findOne({ slug: resolvedSlug })
              .select('settings.sessionLimits settings.platformEnforce2FA')
              .lean();
            if (tenantDoc?.settings?.sessionLimits) {
              sessionLimits = {
                ...DEFAULT_SESSION_LIMITS,
                ...tenantDoc.settings.sessionLimits,
              };
            }
            if (tenantDoc?.settings?.platformEnforce2FA) {
              platformEnforce2FA = true;
            }
          } catch {
            // Use defaults if tenant lookup fails
          }
        }

        // Detect user-agent device type
        const userAgentStr = request.headers['user-agent'] || '';
        const parsedUA = parseUserAgent(userAgentStr);
        const detectedDeviceType = normalizeDeviceType(
          (request.headers['x-device-type'] as string) || parsedUA.deviceType,
        );

        // If forceLogin is NOT set, check for existing session conflict
        if (!body.forceLogin) {
          const conflict = await checkSessionConflict(user._id, detectedDeviceType, sessionLimits);

          if (conflict) {
            return apiResponse(
              reply,
              200,
              {
                sessionConflict: true,
                existingSession: {
                  deviceType: conflict.deviceType,
                  browser: conflict.browser,
                  os: conflict.os,
                  lastActivityAt: conflict.lastActivityAt.toISOString(),
                },
              },
              'You are already logged in on another device. Confirm to continue and end the other session.',
            );
          }
        }

        // â”€â”€ Role-based 2FA enforcement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Per V2_DECISION_LOG Â§9: Tenant admin can require 2FA per role.
        // Platform can also force 2FA for all users via platformEnforce2FA.
        // If user hasn't set up 2FA yet, issue a restricted setup token
        // instead of blocking â€” allows user to complete setup before login.
        if (resolvedSlug) {
          try {
            let mustSetup2FA = false;

            // Check platform-level enforcement first (overrides tenant settings)
            if (platformEnforce2FA && !(user as any).twoFactorEnabled) {
              mustSetup2FA = true;
            }

            // Check tenant-level enforcement
            if (!mustSetup2FA) {
              const { getTenantDb } = await import('../../../config/database.js');
              const tenantDb = await getTenantDb(resolvedSlug);
              const { SettingsService } = await import('../../services/settings.service.js');
              const settingsService = new SettingsService(tenantDb);
              const securitySettings = await settingsService.getByKey('security');
              const require2FA = (securitySettings as any)?.require2FA;
              const requiredRoles: string[] = (securitySettings as any)?.require2FAForRoles || [];

              if (
                require2FA &&
                requiredRoles.length > 0 &&
                requiredRoles.includes(user.role) &&
                !(user as any).twoFactorEnabled
              ) {
                mustSetup2FA = true;
              }
            }

            if (mustSetup2FA) {
              // Issue a restricted temp token scoped to 2FA setup only
              const jwt = await import('../../../utils/jwt.js');
              const setupToken = jwt.generateAccessToken({
                userId: (user._id as any).toString(),
                email: user.email,
                tenantSlug: resolvedSlug,
                role: user.role,
                sessionId: `2fa_setup_${nanoid(16)}`,
                scope: '2fa-setup',
              });

              logger.info({ msg: '2FA setup required by policy', userId: user._id, email });

              return apiResponse(
                reply,
                200,
                {
                  requires2FASetup: true,
                  tempToken: setupToken,
                },
                'Your organization requires two-factor authentication. Please set up 2FA to continue.',
              );
            }
          } catch {
            // Settings not available â€” skip enforcement
          }
        }

        // Generate tokens + session (evicts excess sessions for device type)
        const tokens = await createSessionAndTokens(user, resolvedSlug, request, sessionLimits);

        // Update last login
        await User.updateOne(
          { _id: user._id },
          {
            lastLoginAt: new Date(),
            lastLoginIp: getClientIp(request),
          },
        );

        // Set refresh token as HttpOnly cookie
        setRefreshCookie(
          reply,
          tokens.refreshToken,
          tokens.refreshTokenExpiresAt,
          !!user.platformRole,
        );

        logger.info({ msg: 'User logged in', userId: user._id, email });

        return apiResponse(
          reply,
          200,
          {
            accessToken: tokens.accessToken,
            expiresAt: tokens.accessTokenExpiresAt.toISOString(),
            user: {
              id: user._id,
              email: user.email,
              role: user.role,
              tenantSlug: resolvedSlug,
              profile: user.profile,
              isProfileComplete: user.isProfileComplete,
              ...(user.platformRole && {
                platformRole: user.platformRole,
                platformPermissions: resolvePlatformPermissions(
                  user.platformRole,
                  (user.platformPermissionOverrides ?? []) as PlatformPermissionOverride[],
                ),
              }),
            },
          },
          'Login successful',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error({ msg: 'Login error', error });
        return apiError(reply, 500, 'Failed to process login');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/register
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      const { email, password, firstName, lastName, tenantSlug } = body;

      // Check if user already exists (generic response to prevent enumeration)
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return apiResponse(reply, 200, null, 'Registration received. Please check your email.');
      }

      // Hash password with Argon2id
      const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

      // Generate activation token
      const activationToken = crypto.randomBytes(32).toString('hex');
      const activationTokenHash = crypto.createHash('sha256').update(activationToken).digest('hex');

      // Create user
      const user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'receptionist', // Default role â€” admin upgrades later
        tenantSlug: tenantSlug || null,
        profile: {
          firstName: { en: firstName },
          lastName: { en: lastName },
        },
        status: 'pending_activation',
        isEmailVerified: false,
        tokenVersion: 0,
        passwordHistory: [hashedPassword],
        activationToken: activationTokenHash,
        activationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      });

      logger.info({ msg: 'User registered (pending activation)', userId: user._id, email });

      // Send activation email (async â€” don't block response)
      const adminPortalUrl = env.ADMIN_PORTAL_URL || 'http://localhost:5173';
      const activationLink = `${adminPortalUrl}/activate?token=${activationToken}`;
      sendEmail({
        to: user.email,
        subject: 'Activate Your Dento Account',
        html: `
          <h2>Welcome to Dento!</h2>
          <p>Hi ${firstName},</p>
          <p>Please activate your account by clicking the link below:</p>
          <p><a href="${activationLink}" style="display:inline-block;padding:12px 24px;background:#16a085;color:#fff;border-radius:6px;text-decoration:none;">Activate Account</a></p>
          <p>This link expires in 24 hours.</p>
          <p>If you did not register, you can safely ignore this email.</p>
        `,
      }).catch((err: unknown) => {
        logger.error({ msg: 'Failed to send activation email', error: err, userId: user._id });
      });

      return apiResponse(
        reply,
        201,
        null,
        'Registration received. Please check your email to activate your account.',
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error({ msg: 'Registration error', error });
      return apiError(reply, 500, 'Failed to process registration');
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/verify-email â€” Activate account via token
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/auth/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = (request.body as { token?: string }) || {};
      if (!token || typeof token !== 'string') {
        return apiError(reply, 400, 'Activation token is required');
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        activationToken: tokenHash,
        activationTokenExpiresAt: { $gt: new Date() },
        status: 'pending_activation',
      });

      if (!user) {
        return apiError(reply, 400, 'Invalid or expired activation token');
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            status: 'active',
            isEmailVerified: true,
          },
          $unset: {
            activationToken: 1,
            activationTokenExpiresAt: 1,
          },
        },
      );

      logger.info({
        msg: 'Email verified, account activated',
        userId: user._id,
        email: user.email,
      });

      return apiResponse(reply, 200, null, 'Account activated successfully. You can now log in.');
    } catch (error) {
      logger.error({ msg: 'Email verification error', error });
      return apiError(reply, 500, 'Failed to verify email');
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/resend-activation â€” Re-issue activation email (H-3 step 2)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // Always returns a generic 200 to prevent email-enumeration. Rate-limited at
  // 3 requests / hour / email so an attacker can't spam a victim's inbox.
  fastify.post(
    '/auth/resend-activation',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
          keyGenerator: (req) => {
            const body = (req.body ?? {}) as { email?: string };
            const email = (body.email ?? '').toLowerCase().trim();
            // Combine email + IP so an attacker can't burn a victim's quota
            // from a single host while a legitimate user retries from another.
            return `ratelimit:resend-activation:${email || 'unknown'}:${req.ip}`;
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const GENERIC =
        'If that email is registered and pending activation, a new link is on its way.';
      try {
        const body = (request.body ?? {}) as { email?: string };
        const email = (body.email ?? '').toLowerCase().trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return apiResponse(reply, 200, null, GENERIC);
        }

        const user = await User.findOne({ email });
        // Generic response for: not-found / already-active / suspended.
        // Only re-issue when the account is genuinely pending_activation.
        if (!user || user.status !== 'pending_activation') {
          return apiResponse(reply, 200, null, GENERIC);
        }

        // Issue a new token (rotates any previous one â€” old links stop working).
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenHash = crypto
          .createHash('sha256')
          .update(activationToken)
          .digest('hex');

        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              activationToken: activationTokenHash,
              activationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        );

        const adminPortalUrl = env.ADMIN_PORTAL_URL || 'http://localhost:5173';
        const activationLink = `${adminPortalUrl}/activate?token=${activationToken}`;
        const firstName = (user.profile?.firstName as { en?: string } | undefined)?.en ?? 'there';

        sendEmail({
          to: user.email,
          subject: 'Activate Your Dento Account',
          html: `
            <h2>Activation link (resent)</h2>
            <p>Hi ${firstName},</p>
            <p>You asked us to send your activation link again. Click below to activate your account:</p>
            <p><a href="${activationLink}" style="display:inline-block;padding:12px 24px;background:#16a085;color:#fff;border-radius:6px;text-decoration:none;">Activate Account</a></p>
            <p>This link expires in 24 hours. Any previous activation links are no longer valid.</p>
            <p>If you didn't request this, you can safely ignore the message.</p>
          `,
        }).catch((err: unknown) => {
          logger.error({ msg: 'Failed to send re-activation email', error: err, userId: user._id });
        });

        logger.info({ msg: 'Activation email re-issued', userId: user._id });
        return apiResponse(reply, 200, null, GENERIC);
      } catch (error) {
        logger.error({ msg: 'Resend-activation error', error });
        // Still return generic success so timing/error responses don't leak.
        return apiResponse(reply, 200, null, GENERIC);
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/refresh â€” Rotate token pair
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/refresh',
    {
      // F-7: per-IP cap to slow stolen-token replay and signature-oracle
      // probing. JWT signature still does the heavy lifting; this is defence
      // in depth.
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
          keyGenerator: (req) => `ratelimit:refresh:${req.ip}`,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // The dev portal sends X-Platform-Auth: true to signal platform cookie usage.
      // This prevents the server from accidentally picking up tenant cookies when
      // both portals share cookies on the same localhost domain.
      const isPlatformRequest = request.headers['x-platform-auth'] === 'true';
      const isPlatformRefresh = isPlatformRequest;
      try {
        // Get refresh token from cookie (primary) or body (fallback)
        const cookies = request.cookies || {};
        let refreshTokenStr: string | undefined;

        if (isPlatformRequest) {
          // Platform portal: only check the platform cookie
          const platformSignedCookie = cookies[PLATFORM_REFRESH_COOKIE_NAME];
          if (platformSignedCookie) {
            const unsigned = request.unsignCookie(platformSignedCookie);
            if (unsigned.valid && unsigned.value) {
              refreshTokenStr = unsigned.value;
            }
          }
        } else {
          // Tenant portal: only check the tenant cookie
          const tenantSignedCookie = cookies[REFRESH_COOKIE_NAME];
          if (tenantSignedCookie) {
            const unsigned = request.unsignCookie(tenantSignedCookie);
            if (unsigned.valid && unsigned.value) {
              refreshTokenStr = unsigned.value;
            }
          }
        }

        // Fallback: check body
        if (!refreshTokenStr) {
          const parsed = refreshTokenSchema.safeParse(request.body);
          refreshTokenStr = parsed.success ? parsed.data.refreshToken : undefined;
        }

        if (!refreshTokenStr) {
          clearRefreshCookie(reply, isPlatformRefresh);
          return apiError(reply, 401, 'Refresh token is required');
        }

        // Verify the refresh token
        let payload;
        try {
          payload = verifyRefreshToken(refreshTokenStr);
        } catch (error) {
          clearRefreshCookie(reply, isPlatformRefresh);
          if (error instanceof JwtError) {
            if (error.code === 'TOKEN_EXPIRED') {
              return apiError(reply, 401, 'Refresh token has expired. Please log in again.');
            }
            return apiError(reply, 401, 'Invalid refresh token');
          }
          throw error;
        }

        // Find the session by jti
        const session = await UserSession.findOne({
          refreshTokenJti: payload.jti,
          isActive: true,
        });

        if (!session) {
          // Possible token reuse â€” revoke ALL sessions for this user
          const revokedCount = await UserSession.updateMany(
            { userId: payload.userId, isActive: true },
            { isActive: false },
          );

          // Increment tokenVersion to invalidate all existing tokens
          await User.updateOne({ _id: payload.userId }, { $inc: { tokenVersion: 1 } });

          clearRefreshCookie(reply, isPlatformRefresh);
          logger.warn({
            msg: 'Refresh token reuse detected â€” all sessions revoked',
            userId: payload.userId,
            revokedSessions: revokedCount.modifiedCount,
          });

          return apiError(reply, 401, 'Session has been revoked. Please log in again.');
        }

        // Verify the user still exists and is active
        const user = await User.findById(payload.userId);
        if (!user || user.status !== 'active') {
          await UserSession.updateOne({ _id: session._id }, { isActive: false });
          clearRefreshCookie(reply, isPlatformRefresh);
          return apiError(reply, 401, 'Account is no longer active');
        }

        // Check tokenVersion hasn't changed (password change / logout-all)
        if (user.tokenVersion !== payload.tokenVersion) {
          await UserSession.updateOne({ _id: session._id }, { isActive: false });
          clearRefreshCookie(reply, isPlatformRefresh);
          return apiError(reply, 401, 'Session invalidated. Please log in again.');
        }

        // Invalidate old session
        await UserSession.updateOne({ _id: session._id }, { isActive: false });

        // Create new session + tokens
        const resolvedSlug = user.tenantSlug || '';
        const tokens = await createSessionAndTokens(user, resolvedSlug, request);

        // Determine if this user is a platform user (for cookie isolation)
        const isUserPlatform = !!user.platformRole;

        // Set new refresh cookie (match the cookie type that was used)
        setRefreshCookie(reply, tokens.refreshToken, tokens.refreshTokenExpiresAt, isUserPlatform);

        return apiResponse(
          reply,
          200,
          {
            accessToken: tokens.accessToken,
            expiresAt: tokens.accessTokenExpiresAt.toISOString(),
          },
          'Token refreshed',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error({ msg: 'Token refresh error', error });
        clearRefreshCookie(reply, isPlatformRefresh);
        return apiError(reply, 500, 'Failed to refresh token');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/logout â€” Revoke current session
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/logout',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUserPayload(request);
        const sessionId = user.sessionId as string;
        const isPlatform = !!(user as Record<string, unknown>).platformRole;

        if (sessionId) {
          await UserSession.updateOne({ sessionId, isActive: true }, { isActive: false });
        }

        clearRefreshCookie(reply, isPlatform);

        logger.info({ msg: 'User logged out', userId: user.userId, sessionId });

        return apiResponse(reply, 200, null, 'Logged out successfully');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        // Even if something fails, clear both cookies
        clearRefreshCookie(reply);
        clearRefreshCookie(reply, true);
        return apiResponse(reply, 200, null, 'Logged out');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/logout-all â€” Revoke ALL sessions for user
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/logout-all',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUserPayload(request);
        const userId = user.userId as string;
        const isPlatform = !!(user as Record<string, unknown>).platformRole;

        // Revoke all active sessions
        const result = await UserSession.updateMany(
          { userId, isActive: true },
          { isActive: false },
        );

        // Increment tokenVersion to invalidate all existing access tokens
        await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });

        clearRefreshCookie(reply, isPlatform);

        logger.info({
          msg: 'All sessions revoked',
          userId,
          revokedCount: result.modifiedCount,
        });

        return apiResponse(
          reply,
          200,
          {
            revokedSessions: result.modifiedCount,
          },
          'All sessions have been revoked',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        clearRefreshCookie(reply);
        clearRefreshCookie(reply, true);
        return apiError(reply, 500, 'Failed to revoke sessions');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/forgot-password â€” Send reset token
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/forgot-password',
    {
      // F-5: cap inbox-spam / account-enumeration. 3 requests per 15 min per
      // (email + IP) matches the resend-activation envelope.
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
          keyGenerator: (req) => {
            const body = (req.body ?? {}) as { email?: string };
            const email = (body.email ?? '').toLowerCase().trim();
            return `ratelimit:forgot-password:${email || 'unknown'}:${req.ip}`;
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = forgotPasswordSchema.parse(request.body);
        const { email } = body;

        // Always return success to prevent email enumeration
        const successMsg =
          'If an account with that email exists, a password reset link has been sent.';

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          return apiResponse(reply, 200, null, successMsg);
        }

        if (user.status !== 'active' && user.status !== 'locked') {
          // M-7: allow `locked` users to receive a reset email \u2014 the reset
          // flow is the documented self-service unlock path.
          return apiResponse(reply, 200, null, successMsg);
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Store hashed token
        await User.updateOne(
          { _id: user._id },
          {
            resetToken: resetTokenHash,
            resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        );

        logger.info({
          msg: 'Password reset requested',
          userId: user._id,
          email,
          // In development, log the token for testing
          ...(env.NODE_ENV !== 'production' && { resetToken }),
        });

        // Send password reset email (async â€” don't block response)
        const adminPortalUrl = env.ADMIN_PORTAL_URL || 'http://localhost:5173';
        const resetLink = `${adminPortalUrl}/reset-password?token=${resetToken}`;
        const displayName = user.profile?.firstName?.en || 'there';

        sendEmail({
          to: user.email,
          subject: 'Reset Your Dento Password',
          html: passwordResetEmailHtml({
            resetLink,
            userName: displayName,
            expiresInMinutes: 60,
          }),
        }).catch((err) => {
          logger.error({ err, userId: user._id, email }, 'Failed to send password reset email');
        });

        return apiResponse(reply, 200, null, successMsg);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error({ msg: 'Forgot password error', error });
        return apiError(reply, 500, 'Failed to process password reset request');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/reset-password â€” Use reset token to set new password
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/reset-password',
    {
      // F-5: cap brute-forcing of the reset token. Token is 32 random bytes
      // (256-bit) so guessing is infeasible â€” this defeats online side-channel
      // probing and slow leakage attacks.
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
          keyGenerator: (req) => `ratelimit:reset-password:${req.ip}`,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = resetPasswordSchema.parse(request.body);
        const { token, password } = body;

        // Hash the provided token to match stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find user by valid reset token
        const user = await User.findOne({
          resetToken: tokenHash,
          resetTokenExpiresAt: { $gt: new Date() },
        }).select('+password +passwordHistory');

        if (!user) {
          return apiError(reply, 400, 'Invalid or expired password reset token');
        }

        // Check password not in history
        if (user.passwordHistory && user.passwordHistory.length > 0) {
          for (const oldHash of user.passwordHistory) {
            const isReused = await argon2.verify(oldHash, password);
            if (isReused) {
              return apiError(
                reply,
                400,
                'New password must be different from your previous passwords',
              );
            }
          }
        }

        // Hash new password
        const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

        // Update user: new password, clear reset token, increment tokenVersion
        const passwordHistory = [
          hashedPassword,
          ...(user.passwordHistory || []).slice(0, PASSWORD_HISTORY_LIMIT - 1),
        ];

        await User.updateOne(
          { _id: user._id },
          {
            password: hashedPassword,
            passwordHistory,
            resetToken: null,
            resetTokenExpiresAt: null,
            lastPasswordChangedAt: new Date(),
            // M-7: a successful reset clears any permanent lockout. The user
            // proved control of the registered email, so we trust them again.
            ...(user.status === 'locked' ? { status: 'active' } : {}),
            failedLoginCount: 0,
            lockedAt: null,
            lockedReason: null,
            $inc: { tokenVersion: 1 },
          },
        );

        // Revoke all sessions (force re-login)
        await UserSession.updateMany({ userId: user._id, isActive: true }, { isActive: false });

        logger.info({ msg: 'Password reset completed', userId: user._id });

        return apiResponse(
          reply,
          200,
          null,
          'Password has been reset. Please log in with your new password.',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error({ msg: 'Reset password error', error });
        return apiError(reply, 500, 'Failed to reset password');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/change-password â€” Authenticated password change
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post(
    '/auth/change-password',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = changePasswordSchema.parse(request.body);
        const { currentPassword, newPassword } = body;
        const userPayload = getUserPayload(request);
        const userId = userPayload.userId as string;

        // Get user with password and history
        const user = await User.findById(userId).select('+password +passwordHistory');
        if (!user) {
          return apiError(reply, 404, 'User not found');
        }

        // Verify current password
        const isValid = await argon2.verify(user.password, currentPassword);
        if (!isValid) {
          return apiError(reply, 401, 'Current password is incorrect');
        }

        // Check new password isn't same as current
        const isSame = await argon2.verify(user.password, newPassword);
        if (isSame) {
          return apiError(reply, 400, 'New password must be different from your current password');
        }

        // Check against password history
        if (user.passwordHistory && user.passwordHistory.length > 0) {
          for (const oldHash of user.passwordHistory) {
            const isReused = await argon2.verify(oldHash, newPassword);
            if (isReused) {
              return apiError(
                reply,
                400,
                'New password must be different from your previous passwords',
              );
            }
          }
        }

        // Hash new password
        const hashedPassword = await argon2.hash(newPassword, ARGON2_OPTIONS);

        // Update user
        const passwordHistory = [
          hashedPassword,
          ...(user.passwordHistory || []).slice(0, PASSWORD_HISTORY_LIMIT - 1),
        ];

        await User.updateOne(
          { _id: user._id },
          {
            password: hashedPassword,
            passwordHistory,
            lastPasswordChangedAt: new Date(),
            $inc: { tokenVersion: 1 },
          },
        );

        // Revoke all OTHER sessions (keep current)
        const sessionId = userPayload.sessionId as string;
        await UserSession.updateMany(
          { userId: user._id, isActive: true, sessionId: { $ne: sessionId } },
          { isActive: false },
        );

        logger.info({ msg: 'Password changed', userId: user._id });

        return apiResponse(
          reply,
          200,
          null,
          'Password changed successfully. Other sessions have been revoked.',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error({ msg: 'Change password error', error });
        return apiError(reply, 500, 'Failed to change password');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GET /auth/me â€” Get current user profile
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/auth/me',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userPayload = getUserPayload(request);
        const userId = userPayload.userId as string;

        const user = await User.findById(userId);
        if (!user) {
          return apiError(reply, 404, 'User not found');
        }

        return apiResponse(reply, 200, {
          id: user._id,
          email: user.email,
          role: user.role,
          tenantSlug: user.tenantSlug,
          profile: user.profile,
          status: user.status,
          isProfileComplete: user.isProfileComplete,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          ...(user.platformRole && {
            platformRole: user.platformRole,
            platformPermissions: resolvePlatformPermissions(
              user.platformRole,
              (user.platformPermissionOverrides ?? []) as PlatformPermissionOverride[],
            ),
          }),
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch profile');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PATCH /auth/me â€” Update profile
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch(
    '/auth/me',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userPayload = getUserPayload(request);
        const userId = userPayload.userId as string;
        const body = request.body as Record<string, unknown>;

        // Only allow profile fields to be updated
        const allowedFields = [
          'firstName',
          'lastName',
          'displayName',
          'phone',
          'gender',
          'bio',
          'languagePreference',
        ];

        const updateData: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            if (field === 'firstName' || field === 'lastName') {
              // Handle multilingual fields
              if (typeof body[field] === 'string') {
                updateData[`profile.${field}.en`] = body[field];
              } else if (typeof body[field] === 'object') {
                const val = body[field] as Record<string, string>;
                if (val.en) updateData[`profile.${field}.en`] = val.en;
                if (val.ar) updateData[`profile.${field}.ar`] = val.ar;
              }
            } else if (field === 'bio') {
              if (typeof body[field] === 'string') {
                updateData['profile.bio.en'] = body[field];
              } else if (typeof body[field] === 'object') {
                const val = body[field] as Record<string, string>;
                if (val.en) updateData['profile.bio.en'] = val.en;
                if (val.ar) updateData['profile.bio.ar'] = val.ar;
              }
            } else {
              updateData[`profile.${field}`] = body[field];
            }
          }
        }

        if (Object.keys(updateData).length === 0) {
          return apiError(reply, 400, 'No valid fields to update');
        }

        const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });

        if (!user) {
          return apiError(reply, 404, 'User not found');
        }

        return apiResponse(
          reply,
          200,
          {
            id: user._id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            isProfileComplete: user.isProfileComplete,
          },
          'Profile updated',
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to update profile');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GET /auth/sessions â€” List current user's active sessions
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get(
    '/auth/sessions',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userPayload = getUserPayload(request);
        const userId = userPayload.userId as string;
        const currentSessionId = userPayload.sessionId as string;

        const sessions = await UserSession.find({
          userId,
          isActive: true,
        })
          .select('sessionId deviceType browser os ipAddress lastActivityAt createdAt')
          .sort({ lastActivityAt: -1 })
          .lean();

        const mapped = sessions.map((s) => ({
          sessionId: s.sessionId,
          deviceType: s.deviceType,
          browser: s.browser,
          os: s.os,
          ipAddress: s.ipAddress,
          lastActivityAt: s.lastActivityAt,
          createdAt: s.createdAt,
          isCurrent: s.sessionId === currentSessionId,
        }));

        return apiResponse(reply, 200, { sessions: mapped });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to fetch sessions');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // DELETE /auth/sessions/:sessionId â€” Revoke a specific session
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.delete(
    '/auth/sessions/:sessionId',
    { preHandler: [authGuard] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userPayload = getUserPayload(request);
        const userId = userPayload.userId as string;
        const { sessionId } = request.params as { sessionId: string };

        const result = await UserSession.updateOne(
          { userId, sessionId, isActive: true },
          { isActive: false },
        );

        if (result.modifiedCount === 0) {
          return apiError(reply, 404, 'Session not found or already revoked');
        }

        logger.info({ msg: 'Session revoked', userId, revokedSessionId: sessionId });

        return apiResponse(reply, 200, null, 'Session revoked');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        return apiError(reply, 500, 'Failed to revoke session');
      }
    },
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/verify-invite â€” Verify invite token (public)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/auth/verify-invite', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = verifyInviteTokenSchema.parse(request.body);
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({ inviteToken: hashedToken })
        .select('+inviteToken')
        .select('email profile platformRole status inviteTokenExpiresAt');

      if (!user) {
        return apiError(reply, 404, 'Invalid invite token');
      }

      if (user.status !== 'invited') {
        return apiError(reply, 409, 'Invitation has already been used');
      }

      if (user.inviteTokenExpiresAt && user.inviteTokenExpiresAt < new Date()) {
        return apiError(reply, 410, 'Invite token has expired');
      }

      return apiResponse(reply, 200, {
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        platformRole: user.platformRole,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to verify invite');
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // POST /auth/accept-invite â€” Accept invite + set password (public)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/auth/accept-invite', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, password } = acceptInviteSchema.parse(request.body);
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({ inviteToken: hashedToken }).select(
        '+inviteToken +password',
      );

      if (!user) {
        return apiError(reply, 404, 'Invalid invite token');
      }

      if (user.status !== 'invited') {
        return apiError(reply, 409, 'Invitation has already been accepted');
      }

      if (user.inviteTokenExpiresAt && user.inviteTokenExpiresAt < new Date()) {
        return apiError(reply, 410, 'Invite token has expired');
      }

      // Hash password with Argon2id
      const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

      // Activate user
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        passwordHistory: [hashedPassword],
        status: 'active',
        isEmailVerified: true,
        isProfileComplete: true,
        activatedAt: new Date(),
        inviteToken: null,
        inviteTokenExpiresAt: null,
        tokenVersion: 0,
      });

      // Reload user for token generation
      const activatedUser = (await User.findById(user._id)) as IUser;

      // Auto-login: create session and tokens
      const tokens = await createSessionAndTokens(
        activatedUser,
        activatedUser.tenantSlug || '',
        request,
      );

      setRefreshCookie(
        reply,
        tokens.refreshToken,
        tokens.refreshTokenExpiresAt,
        !!activatedUser.platformRole,
      );

      logger.info({
        msg: 'Platform invite accepted',
        userId: user._id.toString(),
        email: user.email,
      });

      return apiResponse(
        reply,
        200,
        {
          accessToken: tokens.accessToken,
          expiresAt: tokens.accessTokenExpiresAt,
          user: {
            id: activatedUser._id,
            email: activatedUser.email,
            firstName: activatedUser.profile.firstName,
            lastName: activatedUser.profile.lastName,
            role: activatedUser.role,
            tenantSlug: activatedUser.tenantSlug,
            platformRole: activatedUser.platformRole,
            platformPermissions: resolvePlatformPermissions(
              activatedUser.platformRole!,
              (activatedUser.platformPermissionOverrides ?? []) as PlatformPermissionOverride[],
            ),
          },
        },
        'Invitation accepted â€” you are now logged in',
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return apiError(reply, 500, 'Failed to accept invite');
    }
  });
}

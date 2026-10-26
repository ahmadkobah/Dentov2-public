import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

/**
 * JWT Dual-Token System
 *
 * Access Token:
 * - TTL: 15 minutes
 * - Stored: JavaScript memory (not localStorage!)
 * - Sent via: Authorization: Bearer <token>
 *
 * Refresh Token:
 * - TTL: 7 days
 * - Stored: HttpOnly + Secure + SameSite=Strict cookie
 * - Auto-rotated on each refresh
 */

// ── Types ───────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  email: string;
  tenantSlug: string;
  role: string;
  sessionId: string;
  // Platform-Level RBAC (PLATFORM_RBAC.md §9)
  platformRole?: string;
  platformPermissions?: string[];
  // Impersonation tokens (MASTER_PLAN §9)
  jti?: string;
  type?: string;
  impersonatedBy?: string;
  // Restricted scope tokens (e.g. 2FA setup)
  scope?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

// ── Token Generation ────────────────────────────────────────

/**
 * Parse expiry string (e.g., "15m", "7d") to milliseconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid expiry unit: ${unit}`);
  }
}

/**
 * Generate an Access Token
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

/**
 * Two-Factor Pending Token (F-2)
 *
 * Issued by /auth/login when the user has 2FA enabled. Carries a distinct
 * `typ: '2fa_pending'` marker so it cannot be replayed against `authGuard`
 * routes (token-type confusion defence). Short TTL (5 min) limits the brute-
 * force window and forces users back through password verification.
 *
 * Signed with the same access secret to avoid additional key plumbing, but the
 * verifier rejects any token whose `typ` is not exactly `'2fa_pending'`, and
 * `authGuard`/`verifyAccessToken` reject any token whose `typ` IS `'2fa_pending'`.
 */
export interface TwoFactorChallengePayload {
  userId: string;
  email: string;
  tenantSlug: string;
  role: string;
  typ: '2fa_pending';
}

export const TWO_FA_CHALLENGE_TTL = '5m';

export function generate2faChallengeToken(payload: Omit<TwoFactorChallengePayload, 'typ'>): string {
  return jwt.sign(
    { ...payload, typ: '2fa_pending' satisfies TwoFactorChallengePayload['typ'] },
    env.JWT_ACCESS_SECRET,
    { expiresIn: TWO_FA_CHALLENGE_TTL, algorithm: 'HS256' },
  );
}

export function verify2faChallengeToken(token: string): TwoFactorChallengePayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as JwtPayload & Partial<TwoFactorChallengePayload>;
    if (decoded.typ !== '2fa_pending') {
      throw new JwtError('INVALID_TOKEN', 'Not a 2FA challenge token');
    }
    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new JwtError('INVALID_TOKEN', 'Malformed 2FA challenge token');
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
      tenantSlug: decoded.tenantSlug ?? '',
      role: decoded.role,
      typ: '2fa_pending',
    };
  } catch (error) {
    if (error instanceof JwtError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new JwtError('TOKEN_EXPIRED', '2FA challenge token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JwtError('INVALID_TOKEN', 'Invalid 2FA challenge token');
    }
    throw error;
  }
}

/**
 * Generate a Refresh Token (includes jti for revocation)
 */
export function generateRefreshToken(payload: RefreshTokenPayload): { token: string; jti: string } {
  const jti = nanoid(32); // Unique token ID for revocation
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    jwtid: jti,
  };
  return {
    token: jwt.sign(payload, env.JWT_REFRESH_SECRET, options),
    jti,
  };
}

/**
 * Generate a complete token pair
 */
export function generateTokenPair(
  user: { id: string; email: string; role: string },
  tenantSlug: string,
  tokenVersion: number,
): TokenPair {
  const sessionId = nanoid(16);
  const now = Date.now();

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    tenantSlug,
    role: user.role,
    sessionId,
  });

  const { token: refreshToken } = generateRefreshToken({
    userId: user.id,
    sessionId,
    tokenVersion,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(now + parseExpiry(env.JWT_ACCESS_EXPIRY)),
    refreshTokenExpiresAt: new Date(now + parseExpiry(env.JWT_REFRESH_EXPIRY)),
  };
}

// ── Token Verification ──────────────────────────────────────

/**
 * Verify an Access Token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as JwtPayload & AccessTokenPayload;
    // F-2: a 2FA challenge token must NEVER be accepted as a full access
    // token \u2014 doing so would let a holder of the temp token (issued before
    // the 2FA step) call any authGuard-protected route.
    if ((payload as { typ?: string }).typ === '2fa_pending') {
      throw new JwtError('INVALID_TOKEN', 'Two-factor challenge token cannot be used for access');
    }
    return {
      userId: payload.userId,
      email: payload.email,
      tenantSlug: payload.tenantSlug,
      role: payload.role,
      sessionId: payload.sessionId,
      platformRole: payload.platformRole,
      platformPermissions: payload.platformPermissions,
      // Preserve impersonation fields when present
      ...(payload.jti && { jti: payload.jti as string }),
      ...(payload.type && { type: payload.type as string }),
      ...(payload.impersonatedBy && { impersonatedBy: payload.impersonatedBy as string }),
      // Restricted-scope marker (e.g. '2fa-setup'). Surfaced so authGuard can
      // reject setup-scoped tokens on normal protected routes (#67).
      ...(payload.scope && { scope: payload.scope as string }),
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new JwtError('TOKEN_EXPIRED', 'Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JwtError('INVALID_TOKEN', 'Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify a Refresh Token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload & { jti: string } {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as JwtPayload & RefreshTokenPayload;
    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      tokenVersion: payload.tokenVersion,
      jti: payload.jti as string,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new JwtError('TOKEN_EXPIRED', 'Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JwtError('INVALID_TOKEN', 'Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

// ── Error Class ─────────────────────────────────────────────

export class JwtError extends Error {
  constructor(
    public code: 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'TOKEN_REVOKED',
    message: string,
  ) {
    super(message);
    this.name = 'JwtError';
  }
}

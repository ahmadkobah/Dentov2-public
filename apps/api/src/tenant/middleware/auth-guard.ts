import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, JwtError, type AccessTokenPayload } from '../../utils/jwt.js';
import { ApiError } from '../../utils/api-response.js';
import { User } from '../../platform/models/index.js';
import { UserSession } from '../../platform/models/user-session.model.js';
import { getRedis } from '../../config/redis.js';

/**
 * Auth Guard Middleware
 *
 * Verifies JWT access token and attaches user to request.
 * Must be applied BEFORE roleGuard and tenantDb middlewares.
 */

// ── Extend Fastify Types ────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    user?: AccessTokenPayload & { tokenVersion?: number };
    tenantSlug?: string;
  }
}

// ── Middleware ──────────────────────────────────────────────

export async function authGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Authorization header with Bearer token is required');
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    const payload = verifyAccessToken(token);

    // #67: a 2FA-setup-scoped token is a restricted credential issued by the
    // forced-2FA-setup login path. It may ONLY be used to complete 2FA
    // enrollment — the /auth/2fa/setup + /auth/2fa/verify routes accept it from
    // the request body and verify the scope themselves (they do NOT use
    // authGuard). It must never be accepted as a normal access token on
    // protected routes, so reject it here.
    if (payload.scope === '2fa-setup') {
      throw new ApiError(
        403,
        'SETUP_TOKEN_NOT_ALLOWED',
        'Complete two-factor authentication setup before accessing this resource',
      );
    }

    // Check Redis blocklist for revoked impersonation tokens
    if (payload.jti && payload.type === 'impersonation') {
      const redis = getRedis();
      const isBlocked = await redis.get(`jwt_blocklist:${payload.jti}`);
      if (isBlocked) {
        throw new ApiError(401, 'TOKEN_REVOKED', 'Impersonation token has been revoked');
      }
    }

    // Verify user still exists and is active
    const user = await User.findById(payload.userId).select('status tokenVersion');

    if (!user) {
      throw new ApiError(401, 'USER_NOT_FOUND', 'User account no longer exists');
    }

    if (user.status === 'suspended') {
      throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
    }

    if (user.status === 'deactivated') {
      throw new ApiError(403, 'ACCOUNT_DEACTIVATED', 'Your account has been deactivated');
    }

    if (user.status !== 'active') {
      throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Your account is not active');
    }

    // Real-time session enforcement: an evicted/revoked session must stop working
    // immediately, not only at the next /auth/refresh (15-min access-token window).
    // Impersonation tokens — and any token with no matching session row — are allowed
    // through; only an explicitly inactive session is rejected.
    if (payload.sessionId) {
      const session = await UserSession.findOne({ sessionId: payload.sessionId })
        .select('isActive')
        .lean();
      if (session && !session.isActive) {
        throw new ApiError(
          401,
          'SESSION_REVOKED',
          'This session has been signed out. Please log in again.',
        );
      }
    }

    // Attach user payload to request
    request.user = {
      ...payload,
      tokenVersion: user.tokenVersion,
    };
    request.tenantSlug = payload.tenantSlug;
  } catch (error) {
    if (error instanceof JwtError) {
      if (error.code === 'TOKEN_EXPIRED') {
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Access token has expired. Please refresh.');
      }
      throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or malformed access token');
    }
    throw error;
  }
}

/**
 * Optional Auth Guard — Does not fail if no token provided
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuthGuard(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return; // No token, continue without user
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);

    // #67: never treat a 2FA-setup-scoped token as an authenticated identity.
    // The 2FA-setup routes consume it from the request body, not the Bearer
    // header, so skipping it here is safe and closes the restricted-token hole.
    if (payload.scope === '2fa-setup') return;

    const user = await User.findById(payload.userId).select('status tokenVersion');

    if (user && user.status === 'active') {
      // Mirror authGuard: don't attach a revoked session's user (treat as anonymous).
      if (payload.sessionId) {
        const session = await UserSession.findOne({ sessionId: payload.sessionId })
          .select('isActive')
          .lean();
        if (session && !session.isActive) return;
      }
      request.user = {
        ...payload,
        tokenVersion: user.tokenVersion,
      };
      request.tenantSlug = payload.tenantSlug;
    }
  } catch {
    // Invalid token, continue without user
  }
}

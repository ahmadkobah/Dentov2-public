/**
 * Rate Limit Types — Redis-based per API Key Rate Limiting
 *
 * Per MASTER_PLAN §23 (API Security) + §31 (Online-Booking API):
 *   - Redis-based rate limiting per API Key
 *   - 30 Requests/Min per API Key (public booking endpoints)
 *   - Configurable limits per endpoint category
 *   - Rate limit response headers (X-RateLimit-*)
 */

// ── Rate Limit Tiers ────────────────────────────────────────

export type RateLimitTier = 'global' | 'auth' | 'upload' | 'api_key' | 'public' | 'webhook';

export interface IRateLimitConfig {
  tier: RateLimitTier;
  max: number; // Max requests in window
  timeWindow: string; // e.g. '1 minute', '1 hour'
  description: string;
}

// ── Default Rate Limits ─────────────────────────────────────

export const RATE_LIMIT_DEFAULTS: Record<RateLimitTier, IRateLimitConfig> = {
  global: {
    tier: 'global',
    max: 100,
    timeWindow: '1 minute',
    description: 'Global rate limit for all authenticated requests',
  },
  auth: {
    tier: 'auth',
    max: 5,
    timeWindow: '1 minute',
    description: 'Login/register rate limit (brute force protection)',
  },
  upload: {
    tier: 'upload',
    max: 10,
    timeWindow: '1 minute',
    description: 'File upload rate limit',
  },
  api_key: {
    tier: 'api_key',
    max: 30,
    timeWindow: '1 minute',
    description: 'Per-API-Key rate limit for public endpoints (§23)',
  },
  public: {
    tier: 'public',
    max: 60,
    timeWindow: '1 minute',
    description: 'Public endpoint rate limit (unauthenticated)',
  },
  webhook: {
    tier: 'webhook',
    max: 200,
    timeWindow: '1 minute',
    description: 'Inbound webhook rate limit',
  },
};

// ── Rate Limit Response Headers ─────────────────────────────

export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const;

// ── API Key Rate Limit Info ─────────────────────────────────

export interface IRateLimitStatus {
  key: string; // API key identifier (hashed)
  tier: RateLimitTier;
  max: number;
  remaining: number;
  resetAt: string; // ISO timestamp
  isBlocked: boolean;
}

// ── API Types ───────────────────────────────────────────────

export interface UpdateRateLimitInput {
  tier: RateLimitTier;
  max: number;
  timeWindow: string;
}

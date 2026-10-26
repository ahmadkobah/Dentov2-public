import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedis } from '../../config/redis.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import { LoginAttempt, type LoginFailReason } from '../../platform/models/login-attempt.model.js';
import { User } from '../../platform/models/user.model.js';

/**
 * Brute Force Protection Middleware
 *
 * Progressive cooldown strategy (per V2_MASTER_PLAN.md):
 * - 3 failed attempts → 5 min cooldown
 * - 5 failed attempts → 15 min cooldown
 * - 10 failed attempts → 1 hour cooldown
 * - 20 failed attempts → IP blocked (requires manual unblock)
 *
 * Uses Redis for tracking across multiple API instances.
 */

// ── Configuration ───────────────────────────────────────────

/**
 * Progressive Cooldown Configuration (per SECURITY_AND_ENCRYPTION.md §3.4)
 * - 1-2 attempts: Free (no cooldown)
 * - 3-6 attempts: 5 min cooldown
 * - 7-9 attempts: 15 min cooldown
 * - 10-12 attempts: 30 min cooldown
 * - 13-15 attempts: 1 hour cooldown
 * - 16+ attempts: IP blocked (manual unblock required)
 */
const COOLDOWN_CONFIG: Record<number, number> = {
  // Attempts → Cooldown in seconds
  3: 5 * 60, // 5 minutes
  7: 15 * 60, // 15 minutes
  10: 30 * 60, // 30 minutes
  13: 60 * 60, // 1 hour
  16: -1, // Blocked (special flag)
  20: 24 * 60 * 60, // 24 hours block
};

const MAX_ATTEMPTS_BEFORE_BLOCK = 20;
const ATTEMPT_WINDOW_SECONDS = 60 * 60; // 1 hour window for counting attempts
// M-7: All-time failure threshold for permanent account lockout. The Redis
// counters above reset every hour, so a slow attacker (1 try / 4 min) can
// dodge them indefinitely. This counter never resets except on successful
// login or admin unlock, blocking that vector entirely.
const PERMANENT_LOCK_THRESHOLD = 50;
const KEY_PREFIX = 'auth:attempts:';
const BLOCKED_KEY_PREFIX = 'auth:blocked:';

// ── Types ───────────────────────────────────────────────────

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// ── Helper Functions ────────────────────────────────────────

function getIdentifier(request: FastifyRequest, email?: string): string {
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  // Combine IP + email for more accurate rate limiting
  return email ? `${ip}:${email.toLowerCase()}` : `${ip}`;
}

function getCooldownDuration(attempts: number): number {
  let cooldown = 0;
  for (const [threshold, duration] of Object.entries(COOLDOWN_CONFIG)) {
    if (attempts >= parseInt(threshold)) {
      cooldown = duration;
    }
  }
  return cooldown;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

// ── Core Functions ──────────────────────────────────────────

/**
 * Check if login is allowed (not rate limited)
 */
export async function checkLoginAllowed(request: FastifyRequest, email: string): Promise<void> {
  const redis = getRedis();
  const identifier = getIdentifier(request, email);
  const key = `${KEY_PREFIX}${identifier}`;
  const blockedKey = `${BLOCKED_KEY_PREFIX}${identifier}`;

  // Check if IP/email is blocked
  const isBlocked = await redis.get(blockedKey);
  if (isBlocked) {
    const blockExpiry = parseInt(isBlocked);
    const remainingSeconds = Math.ceil((blockExpiry - Date.now()) / 1000);

    if (remainingSeconds > 0) {
      throw new ApiError(
        429,
        'TOO_MANY_ATTEMPTS',
        `Too many failed login attempts. Please try again in ${formatDuration(remainingSeconds)}.`,
      );
    }
  }

  // Check attempt count and cooldown
  const recordStr = await redis.get(key);
  if (recordStr) {
    const record: AttemptRecord = JSON.parse(recordStr);
    const cooldownDuration = getCooldownDuration(record.count);

    if (cooldownDuration > 0) {
      const cooldownEndsAt = record.lastAttempt + cooldownDuration * 1000;
      const now = Date.now();

      if (now < cooldownEndsAt) {
        const remainingSeconds = Math.ceil((cooldownEndsAt - now) / 1000);
        throw new ApiError(
          429,
          'TOO_MANY_ATTEMPTS',
          `Too many failed login attempts. Please try again in ${formatDuration(remainingSeconds)}.`,
        );
      }
    }
  }
}

/**
 * Record a failed login attempt
 * Dual-write: Redis (speed) + MongoDB LoginAttempt collection (audit trail, per Gap G4)
 */
export async function recordFailedAttempt(
  request: FastifyRequest,
  email: string,
  failReason: LoginFailReason = 'invalid_credentials',
  tenantSlug?: string,
): Promise<void> {
  const redis = getRedis();
  const identifier = getIdentifier(request, email);
  const key = `${KEY_PREFIX}${identifier}`;
  const blockedKey = `${BLOCKED_KEY_PREFIX}${identifier}`;

  const now = Date.now();
  let record: AttemptRecord;

  const existingRecord = await redis.get(key);
  if (existingRecord) {
    record = JSON.parse(existingRecord);
    record.count += 1;
    record.lastAttempt = now;
  } else {
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
  }

  // Store updated record in Redis
  await redis.setex(key, ATTEMPT_WINDOW_SECONDS, JSON.stringify(record));

  // Dual-write to MongoDB (fire-and-forget, don't block the request)
  LoginAttempt.create({
    email: email.toLowerCase(),
    ipAddress: request.ip || 'unknown',
    userAgent: request.headers['user-agent'] || 'unknown',
    success: false,
    failReason,
    tenantSlug: tenantSlug || undefined,
  }).catch((err) => {
    logger.warn({ err, email }, 'Failed to persist login attempt to MongoDB');
  });

  // If max attempts reached, block the identifier
  if (record.count >= MAX_ATTEMPTS_BEFORE_BLOCK) {
    const blockDuration = COOLDOWN_CONFIG[20]; // 24 hours
    const blockUntil = now + blockDuration * 1000;
    await redis.setex(blockedKey, blockDuration, blockUntil.toString());

    logger.warn({
      msg: 'Login blocked due to excessive failed attempts',
      identifier,
      attempts: record.count,
      blockedUntil: new Date(blockUntil).toISOString(),
    });
  }

  // M-7: Atomically increment the all-time failure count on the User document
  // and lock the account if it crosses the permanent threshold. We use a
  // single updateOne so two concurrent failures cannot race past the limit.
  // Fire-and-forget — must never block or fail the auth response path.
  User.findOneAndUpdate(
    { email: email.toLowerCase(), status: { $ne: 'locked' } },
    [
      {
        $set: {
          failedLoginCount: { $add: [{ $ifNull: ['$failedLoginCount', 0] }, 1] },
        },
      },
      {
        $set: {
          status: {
            $cond: [{ $gte: ['$failedLoginCount', PERMANENT_LOCK_THRESHOLD] }, 'locked', '$status'],
          },
          lockedAt: {
            $cond: [
              { $gte: ['$failedLoginCount', PERMANENT_LOCK_THRESHOLD] },
              new Date(),
              '$lockedAt',
            ],
          },
          lockedReason: {
            $cond: [
              { $gte: ['$failedLoginCount', PERMANENT_LOCK_THRESHOLD] },
              `Auto-locked after ${PERMANENT_LOCK_THRESHOLD} failed login attempts`,
              '$lockedReason',
            ],
          },
        },
      },
    ],
    // Mongoose 9 requires `updatePipeline: true` to accept the aggregation-pipeline
    // array update; without it findOneAndUpdate throws *synchronously*, which would
    // escape this fire-and-forget chain and bubble into the auth handler as a 500.
    { new: true, projection: { failedLoginCount: 1, status: 1 }, updatePipeline: true },
  )
    .lean()
    .then((updated) => {
      if (updated?.status === 'locked') {
        logger.warn(
          { email, failedLoginCount: updated.failedLoginCount },
          'Account permanently locked after exceeding failure threshold',
        );
      }
    })
    .catch((err) => {
      logger.warn({ err, email }, 'Failed to update User.failedLoginCount for permanent lockout');
    });
}

/**
 * Clear failed attempts after successful login + persist success to MongoDB
 */
export async function clearFailedAttempts(
  request: FastifyRequest,
  email: string,
  userId?: string,
  tenantSlug?: string,
): Promise<void> {
  const redis = getRedis();
  const identifier = getIdentifier(request, email);
  const key = `${KEY_PREFIX}${identifier}`;

  await redis.del(key);

  // M-7: Reset all-time failure count on successful login. Fire-and-forget.
  User.updateOne({ email: email.toLowerCase() }, { $set: { failedLoginCount: 0 } }).catch((err) => {
    logger.warn({ err, email }, 'Failed to reset User.failedLoginCount on success');
  });

  // Persist successful login to MongoDB (fire-and-forget)
  LoginAttempt.create({
    email: email.toLowerCase(),
    ipAddress: request.ip || 'unknown',
    userAgent: request.headers['user-agent'] || 'unknown',
    success: true,
    userId: userId || undefined,
    tenantSlug: tenantSlug || undefined,
  }).catch((err) => {
    logger.warn({ err, email }, 'Failed to persist successful login attempt to MongoDB');
  });
}

/**
 * Get current attempt status (for admin/debugging)
 */
export async function getAttemptStatus(
  request: FastifyRequest,
  email: string,
): Promise<AttemptRecord | null> {
  const redis = getRedis();
  const identifier = getIdentifier(request, email);
  const key = `${KEY_PREFIX}${identifier}`;

  const recordStr = await redis.get(key);
  return recordStr ? JSON.parse(recordStr) : null;
}

/**
 * Manually unblock an IP/email (admin function)
 */
export async function unblockIdentifier(ip: string, email?: string): Promise<boolean> {
  const redis = getRedis();
  const identifier = email ? `${ip}:${email.toLowerCase()}` : ip;

  const keysDeleted = await redis.del(
    `${KEY_PREFIX}${identifier}`,
    `${BLOCKED_KEY_PREFIX}${identifier}`,
  );

  logger.info({
    msg: 'Login block manually cleared',
    identifier,
  });

  return keysDeleted > 0;
}

// ── Middleware ──────────────────────────────────────────────

/**
 * Rate limit middleware for login endpoints
 *
 * Usage:
 *   fastify.post('/api/auth/login', { preHandler: [loginRateLimiter] }, loginHandler)
 *
 * Note: The email should be in request body. After parsing body, call checkLoginAllowed().
 */
export async function loginRateLimiter(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // For IP-only rate limiting (before we know the email)
  const ip = request.ip || 'unknown';
  const ipKey = `${KEY_PREFIX}ip:${ip}`;
  const redis = getRedis();

  const ipAttempts = await redis.get(ipKey);
  if (ipAttempts) {
    const count = parseInt(ipAttempts);
    if (count >= 50) {
      // 50 attempts from same IP = suspicious
      throw new ApiError(
        429,
        'IP_RATE_LIMITED',
        'Too many requests from this IP address. Please try again later.',
      );
    }
  }

  // Increment IP counter (expires in 1 hour)
  await redis.incr(ipKey);
  await redis.expire(ipKey, 3600);
}

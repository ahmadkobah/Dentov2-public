/** Service availability check — maintenance mode via Redis flag. */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedis } from '../../config/redis.js';

const SD_KEY = 'sys:__sd';
const SD_BYPASS = '/api/_internal/hc';

// ── In-process cache ────────────────────────────────────────
// Maintenance flag is read on every request. Cache for 30s to
// avoid hammering Redis (was ~1 GET per HTTP request).
const CACHE_TTL_MS = 30_000;
let cached: { value: string | null; expiresAt: number } | null = null;

function invalidateCache() {
  cached = null;
}

async function getDiagFlag(): Promise<string | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  try {
    const redis = getRedis();
    const val = await redis.get(SD_KEY);
    cached = { value: val, expiresAt: now + CACHE_TTL_MS };
    return val;
  } catch {
    // fail open: cache null briefly to avoid retry storms
    cached = { value: null, expiresAt: now + 5_000 };
    return null;
  }
}

export async function sysDiagHook(request: FastifyRequest, reply: FastifyReply) {
  if (request.url.startsWith(SD_BYPASS)) return;
  if (
    request.url === '/health' ||
    request.url === '/api/health' ||
    request.url === '/health/live' ||
    request.url === '/api/health/live'
  ) {
    return;
  }

  const val = await getDiagFlag();
  if (val) {
    return reply.code(503).send({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'System is currently undergoing maintenance. Please try again later.',
    });
  }
}

export async function isDiagActive(): Promise<boolean> {
  return (await getDiagFlag()) !== null;
}

export async function setDiagMode(active: boolean, note?: string): Promise<void> {
  const redis = getRedis();
  if (active) {
    await redis.set(
      SD_KEY,
      JSON.stringify({ ts: new Date().toISOString(), note: note || 'maintenance' }),
    );
  } else {
    await redis.del(SD_KEY);
  }
  invalidateCache();
}

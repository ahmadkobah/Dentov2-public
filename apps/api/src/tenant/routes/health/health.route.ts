import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { apiResponse } from '../../../utils/api-response.js';
import { getRedis } from '../../../config/redis.js';
import { getS3Client } from '../../../config/s3.js';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { env } from '../../../config/env.js';

/**
 * Health Check Routes — Phase 6 Enhanced (Task 2.1)
 *
 * Returns component-level health status:
 * - MongoDB: ping + connection state
 * - Redis: ping + latency
 * - S3/R2: HeadBucket check
 * - API: uptime + memory usage
 */

interface ComponentStatus {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  details?: string;
}

async function checkMongo(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: 'down', details: 'Not connected' };
    }
    await mongoose.connection.db!.admin().ping();
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'down', latencyMs: Date.now() - start, details: String(err) };
  }
}

async function checkRedis(): Promise<ComponentStatus> {
  // Cache the ping result for 10s. Uptime monitors and probes can hit
  // /health frequently; we don't need a fresh ping every time.
  const now = Date.now();
  if (redisPingCache && redisPingCache.expiresAt > now) {
    return redisPingCache.value;
  }
  const start = now;
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    const value: ComponentStatus =
      pong === 'PONG'
        ? { status: 'up', latencyMs: Date.now() - start }
        : { status: 'degraded', latencyMs: Date.now() - start, details: `Unexpected: ${pong}` };
    redisPingCache = { value, expiresAt: now + 10_000 };
    return value;
  } catch (err) {
    const value: ComponentStatus = {
      status: 'down',
      latencyMs: Date.now() - start,
      details: String(err),
    };
    // Cache failures briefly too so we don't retry-storm Redis.
    redisPingCache = { value, expiresAt: now + 5_000 };
    return value;
  }
}

let redisPingCache: { value: ComponentStatus; expiresAt: number } | null = null;

async function checkS3(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
      return { status: 'down', details: 'S3 not configured' };
    }
    const s3 = getS3Client();
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err: unknown) {
    // 403 means bucket exists but we may not have HeadBucket permission — still "up"
    const isAWSError = err !== null && typeof err === 'object';
    if (
      isAWSError &&
      (('name' in err && err.name === 'Forbidden') ||
        ('$metadata' in err &&
          (err as { $metadata: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 403))
    ) {
      return {
        status: 'up',
        latencyMs: Date.now() - start,
        details: 'Bucket accessible (no HeadBucket perm)',
      };
    }
    return { status: 'down', latencyMs: Date.now() - start, details: String(err) };
  }
}

export async function healthRoutes(fastify: FastifyInstance) {
  // ── Basic liveness probe (fast — for k8s/Railway) ───────
  fastify.get('/health/live', async (_request, reply) => {
    return apiResponse(reply, 200, { status: 'ok' });
  });

  // ── Full readiness probe (component checks) ─────────────
  fastify.get('/health', async (_request, reply) => {
    const [mongo, redis, s3] = await Promise.all([checkMongo(), checkRedis(), checkS3()]);

    const components = { mongo, redis, s3 };

    // Overall status: down if any component is down, degraded if any degraded
    const allStatuses = Object.values(components).map((c) => c.status);
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
    if (allStatuses.includes('down')) overallStatus = 'down';
    else if (allStatuses.includes('degraded')) overallStatus = 'degraded';

    const mem = process.memoryUsage();
    const safeResponseMode = env.NODE_ENV === 'production' || env.SCAN_SAFE_RESPONSES === 'true';
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      ...(safeResponseMode
        ? {}
        : {
            components,
            uptime: process.uptime(),
            environment: env.NODE_ENV,
            version: '2.0.0',
            memory: {
              rss: Math.round(mem.rss / 1024 / 1024),
              heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
              heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            },
          }),
    };

    const statusCode = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    return apiResponse(reply, statusCode, health);
  });
}

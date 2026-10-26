/**
 * Contract Tests — Phase 3B: 1. Health (/health)
 *
 * Tests: #196–#197 from Phase 3B tracker
 */

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { expectSuccess } from '../helpers/assertions.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  if (app) await teardownTestApp(app);
  await destroyTestInfra();
});

// ── 1. GET /health/live ─────────────────────────────────────

describe('GET /health/live', () => {
  it('#196 Happy: liveness → 200, { status: "ok" }', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    const body = expectSuccess(res, 200);
    expect(body.data).toHaveProperty('status', 'ok');
  });
});

// ── 2. GET /health ──────────────────────────────────────────

describe('GET /health', () => {
  it('#197 Happy: readiness → 200/503 with components', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    // Readiness returns 503 when Redis is not connected (expected in test env)
    expect([200, 503]).toContain(res.statusCode);
    const body = res.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
  });
});

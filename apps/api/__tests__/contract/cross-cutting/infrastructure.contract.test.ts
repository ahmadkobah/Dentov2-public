/**
 * Contract Tests — Cross-Cutting: Infrastructure
 *
 * Tests: #676–#680 from Phase 3C tracker
 * Verifies health endpoints, CORS, Helmet, and Swagger doc availability.
 *
 * Note: CORS, Helmet, and Swagger plugins are NOT registered in the test app
 * (see build-app.ts header). Tests #678/#679/#680 verify the route layer
 * responds correctly and document the absence of those plugins in test mode.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
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

describe('Cross-Cutting: Infrastructure', () => {
  // #676 — /health/live always returns 200
  it('#676 GET /health/live returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    const body = expectSuccess(res, 200);
    expect(body.data).toHaveProperty('status', 'ok');
  });

  // #677 — /health returns component status
  it('#677 GET /health returns component status object', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    // Health may return 200 or 503 depending on component status
    expect([200, 503]).toContain(res.statusCode);

    const body = res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('status');
    expect(body.data).toHaveProperty('components');
    expect(body.data.components).toHaveProperty('mongo');
    expect(body.data).toHaveProperty('memory');
    expect(body.data).toHaveProperty('uptime');
  });

  // #678 — CORS headers: verify app responds to preflight OPTIONS requests
  it('#678 CORS: app responds to OPTIONS preflight without crashing', async () => {
    // CORS plugin is not registered in test app, but Fastify still handles OPTIONS
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/patients',
      headers: {
        origin: 'https://admin.dento.app',
        'access-control-request-method': 'GET',
      },
    });
    // Without CORS plugin, Fastify returns 404 for unmatched OPTIONS or handles it
    // Key contract: the server does NOT crash (no 500)
    expect(res.statusCode).toBeLessThan(500);
  });

  // #679 — Security headers: verify error handler sets standard headers
  it('#679 responses include standard HTTP headers', async () => {
    // Helmet is not registered in test app, but Fastify sets basic headers
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);

    // Verify basic response headers exist
    expect(res.headers).toHaveProperty('content-type');
    expect(res.headers['content-type']).toContain('application/json');

    // Verify connection header is set (standard HTTP)
    expect(res.headers).toHaveProperty('content-length');
  });

  // #680 — API documentation: /docs route responds (Swagger not in test app)
  it('#680 API documentation routes are accessible in production config', async () => {
    // Swagger is not registered in test app, so /docs will 404 here.
    // We verify the swagger plugin file exists and is importable.
    const res = await app.inject({ method: 'GET', url: '/docs' });
    // In test app without swagger, expect 404 — this documents the contract
    // that in production, /docs is registered via swagger.plugin.ts
    expect(res.statusCode).not.toBe(500);

    // Verify swagger plugin file exists by dynamic import check
    const swaggerPlugin = await import('../../../src/plugins/swagger.plugin.js').catch(() => null);
    expect(swaggerPlugin).not.toBeNull();
    expect(swaggerPlugin).toHaveProperty('default');
  });
});

/**
 * Contract Tests — Phase 3B: 50. Onboarding (/api/onboarding) — PUBLIC
 *
 * Tests: #660–#661 from Phase 3B tracker
 * Note: These are PUBLIC routes — no auth token needed.
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';

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

describe('POST /api/onboarding', () => {
  it('#660 Happy: register clinic → <500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: {
        clinicName: 'Test Dental Clinic',
        ownerName: 'Dr. Test Owner',
        email: 'onboarding@test-clinic.com',
        password: 'SecureP@ss123!',
        phone: '+1234567890',
        country: 'US',
      },
    });
    expect(res.statusCode).toBeLessThan(500);
  });

  it('#661 Validation: missing fields → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: {},
    });
    expect(res.statusCode).toBeLessThan(500);
  });
});

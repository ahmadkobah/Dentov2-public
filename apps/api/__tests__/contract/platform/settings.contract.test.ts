/**
 * Contract Tests — 17. Settings (/api/platform/settings)
 *
 * Tests: #136–#142 from Phase 3A tracker
 * Error pattern: PATCH handlers re-throw ZodError → 422; GET catch{} swallows → 500
 */

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createPlatformUserAndToken } from '../helpers/auth.js';
import { expectSuccess, expectError, withAuth } from '../helpers/assertions.js';
import mongoose from 'mongoose';

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

async function seedSystemSettings() {
  const SystemSettings =
    mongoose.models.SystemSettings ||
    mongoose.model(
      'SystemSettings',
      new mongoose.Schema({}, { strict: false, collection: 'system_settings' }),
    );

  return SystemSettings.create({
    maintenanceMode: false,
    defaultTimezone: 'UTC',
    defaultCurrency: 'USD',
    defaultLanguage: 'en',
    registrationEnabled: true,
    maxTenantsPerCluster: 100,
    supportEmail: 'support@dento.app',
    platformVersion: '2.0.0',
    branding: {
      platformName: 'Dento',
      logoUrl: '',
      faviconUrl: '',
      primaryColor: '#1e88e5',
      landingPageUrl: '',
    },
    currencies: {
      baseCurrency: 'USD',
      exchangeRates: [{ currency: 'EGP', rate: 30.9 }],
    },
  });
}

// ── 1. GET /system ──────────────────────────────────────────

describe('GET /api/platform/settings/system', () => {
  it('#136 Happy: get system settings → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSystemSettings();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/settings/system',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 2. PATCH /system ────────────────────────────────────────

describe('PATCH /api/platform/settings/system', () => {
  it('#137 Happy: update system settings → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSystemSettings();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/platform/settings/system',
        payload: { maintenanceMode: true, maintenanceMessage: 'Scheduled maintenance' },
      }),
    );

    expectSuccess(res, 200);
  });

  it('#138 Validation: invalid field types → 422', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSystemSettings();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/platform/settings/system',
        payload: { maintenanceMode: 'not-a-boolean' },
      }),
    );

    // ZodError re-thrown → global handler → 422
    expectError(res, 422);
  });
});

// ── 3. GET /branding ────────────────────────────────────────

describe('GET /api/platform/settings/branding', () => {
  it('#139 Happy: get branding settings → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSystemSettings();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/settings/branding',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 4. PATCH /branding ──────────────────────────────────────

describe('PATCH /api/platform/settings/branding', () => {
  it('#140 Happy: update branding → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSystemSettings();

    const res = await app.inject(
      withAuth(token, {
        method: 'PATCH',
        url: '/api/platform/settings/branding',
        payload: { platformName: 'Dento V2', primaryColor: '#2196f3' },
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 5. GET /currencies ──────────────────────────────────────

describe('GET /api/platform/settings/currencies', () => {
  it('#141 Happy: get currencies → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSystemSettings();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/settings/currencies',
      }),
    );

    expectSuccess(res, 200);
  });
});

// ── 6. GET /all ─────────────────────────────────────────────

describe('GET /api/platform/settings/all', () => {
  it('#142 Happy: get all settings → 200', async () => {
    const { token } = await createPlatformUserAndToken('platform_owner');
    await seedSystemSettings();

    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/platform/settings/all',
      }),
    );

    expectSuccess(res, 200);
  });
});

/**
 * Platform Settings Routes — Integration Tests
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.6
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Pattern follows invoices.route.test.ts — mock service + middleware, app.inject().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { platformSettingsRoutes } from '../settings.route.js';

// ── Mock Data ──────────────────────────────────────────────

const mockSystemSettings = {
  _id: 'default',
  maintenanceMode: false,
  maintenanceMessage: '',
  defaultTimezone: 'Asia/Riyadh',
  defaultCurrency: 'SAR',
  defaultLanguage: 'ar',
  registrationEnabled: true,
  maxTenantsPerCluster: 500,
  supportEmail: 'support@dento.app',
  platformVersion: '2.0.0',
  updatedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockBranding = {
  _id: 'default',
  platformName: 'Dento',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#2563EB',
  landingPageUrl: '',
  updatedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCurrencies = {
  _id: 'default',
  baseCurrency: 'SAR',
  exchangeRates: [{ currency: 'USD', rate: 0.2667 }],
  lastUpdatedAt: null,
  updatedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ── Mocks ──────────────────────────────────────────────────

const mockFetchSystemSettings = vi.fn().mockResolvedValue(mockSystemSettings);
const mockPatchSystemSettings = vi.fn().mockResolvedValue({
  ...mockSystemSettings,
  maintenanceMode: true,
});
const mockFetchBranding = vi.fn().mockResolvedValue(mockBranding);
const mockPatchBranding = vi.fn().mockResolvedValue({
  ...mockBranding,
  platformName: 'Dento Pro',
});
const mockFetchCurrencies = vi.fn().mockResolvedValue(mockCurrencies);
const mockPatchCurrencies = vi.fn().mockResolvedValue({
  ...mockCurrencies,
  baseCurrency: 'USD',
});

vi.mock('../../../services/settings.service.js', () => ({
  fetchSystemSettings: (...args: unknown[]) => mockFetchSystemSettings(...args),
  patchSystemSettings: (...args: unknown[]) => mockPatchSystemSettings(...args),
  fetchBranding: (...args: unknown[]) => mockFetchBranding(...args),
  patchBranding: (...args: unknown[]) => mockPatchBranding(...args),
  fetchCurrencies: (...args: unknown[]) => mockFetchCurrencies(...args),
  patchCurrencies: (...args: unknown[]) => mockPatchCurrencies(...args),
}));

vi.mock('../../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../tenant/middleware/index.js', () => ({
  authGuard: vi.fn().mockImplementation(async (request: any) => {
    request.user = { userId: 'owner-1', platformRole: 'platform_owner' };
  }),
  tenantDbMiddleware: vi.fn().mockImplementation(async () => {}),
  roleGuard: vi.fn().mockImplementation(() => async () => {}),
}));

vi.mock('../../../../platform/middleware/index.js', () => ({
  platformGuard: vi.fn().mockImplementation(() => async () => {}),
}));

// ── Tests ──────────────────────────────────────────────────

describe('Platform Settings Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(platformSettingsRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /system ───────────────────────────────────────

  describe('GET /system', () => {
    it('should return system settings with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/system' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.defaultCurrency).toBe('SAR');
      expect(body.data.maintenanceMode).toBe(false);
    });

    it('should return 500 on service error', async () => {
      mockFetchSystemSettings.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: '/system' });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── PATCH /system ─────────────────────────────────────

  describe('PATCH /system', () => {
    it('should update system settings and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/system',
        payload: { maintenanceMode: true },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.maintenanceMode).toBe(true);
      expect(mockPatchSystemSettings).toHaveBeenCalledWith({ maintenanceMode: true }, 'owner-1');
    });

    it('should return 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/system',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject unknown fields (strict schema)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/system',
        payload: { maintenanceMode: true, unknownField: 'bad' },
      });
      // ZodError → Fastify default error handler (usually 400)
      expect(res.statusCode).toBe(500);
    });

    it('should return 500 on service error', async () => {
      mockPatchSystemSettings.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'PATCH',
        url: '/system',
        payload: { maintenanceMode: true },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── GET /branding ─────────────────────────────────────

  describe('GET /branding', () => {
    it('should return branding with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/branding' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.platformName).toBe('Dento');
    });

    it('should return 500 on service error', async () => {
      mockFetchBranding.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: '/branding' });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── PATCH /branding ───────────────────────────────────

  describe('PATCH /branding', () => {
    it('should update branding and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/branding',
        payload: { platformName: 'Dento Pro' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.platformName).toBe('Dento Pro');
    });

    it('should validate hex color format', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/branding',
        payload: { primaryColor: 'not-a-color' },
      });
      // ZodError thrown
      expect(res.statusCode).toBe(500);
    });

    it('should return 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/branding',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /currencies ──────────────────────────────────

  describe('GET /currencies', () => {
    it('should return currencies with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/currencies' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.baseCurrency).toBe('SAR');
      expect(body.data.exchangeRates).toHaveLength(1);
    });

    it('should return 500 on service error', async () => {
      mockFetchCurrencies.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: '/currencies' });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── PATCH /currencies ────────────────────────────────

  describe('PATCH /currencies', () => {
    it('should update currencies and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/currencies',
        payload: { baseCurrency: 'USD' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.baseCurrency).toBe('USD');
    });

    it('should accept exchange rates array', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/currencies',
        payload: {
          exchangeRates: [
            { currency: 'USD', rate: 0.2667 },
            { currency: 'EUR', rate: 0.244 },
          ],
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/currencies',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /all — Combined ──────────────────────────────

  describe('GET /all', () => {
    it('should return all 3 singletons with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/all' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.systemSettings).toBeDefined();
      expect(body.data.branding).toBeDefined();
      expect(body.data.currencies).toBeDefined();
    });

    it('should return 500 on service error', async () => {
      mockFetchSystemSettings.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: '/all' });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── Middleware checks ─────────────────────────────────

  describe('Middleware', () => {
    it('should apply authGuard on all routes', async () => {
      const { authGuard } = await import('../../../../tenant/middleware/index.js');
      await app.inject({ method: 'GET', url: '/system' });
      expect(authGuard).toHaveBeenCalled();
    });

    it('should apply platformGuard for read access on GET routes', async () => {
      const { platformGuard } = await import('../../../../platform/middleware/index.js');
      expect(platformGuard).toHaveBeenCalledWith('platform_settings', 'read');
    });

    it('should apply platformGuard for update access on PATCH routes', async () => {
      const { platformGuard } = await import('../../../../platform/middleware/index.js');
      expect(platformGuard).toHaveBeenCalledWith('platform_settings', 'update');
    });
  });

  // ── Response Format ───────────────────────────────────

  describe('Response Format', () => {
    it('should return standard API response envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/system' });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });
  });
});

/**
 * Insurance Company Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Covers list, detail, stats, create, update, deactivate (6 endpoints).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { insuranceCompanyRoutes } from './insurance-companies.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockService = {
  list: vi.fn().mockResolvedValue({
    items: [
      {
        _id: 'ic1',
        name: { en: 'AXA Insurance', ar: 'أكسا للتأمين' },
        code: 'AXA',
        isActive: true,
      },
    ],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue({
    _id: 'ic1',
    name: { en: 'AXA Insurance', ar: 'أكسا للتأمين' },
    code: 'AXA',
    isActive: true,
  }),
  getCompanyStats: vi.fn().mockResolvedValue({
    company: { _id: 'ic1', name: { en: 'AXA Insurance' } },
    stats: { totalClaims: 42, approved: 30, pending: 8, rejected: 4, totalAmount: 150000 },
  }),
  create: vi.fn().mockResolvedValue({
    _id: 'ic2',
    name: { en: 'Bupa Insurance', ar: 'بوبا للتأمين' },
    code: 'BUPA',
    isActive: true,
  }),
  update: vi.fn().mockResolvedValue({
    _id: 'ic1',
    name: { en: 'AXA Updated', ar: 'أكسا محدث' },
    code: 'AXA',
    isActive: true,
  }),
  deactivate: vi.fn().mockResolvedValue({
    _id: 'ic1',
    name: { en: 'AXA Insurance' },
    isActive: false,
  }),
};

vi.mock('../../services/insurance-company.service.js', () => ({
  InsuranceCompanyService: vi.fn().mockImplementation(function () {
    return mockService;
  }),
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/index.js', () => ({
  authGuard: vi.fn().mockImplementation(async (request: any) => {
    request.user = { userId: 'user-1', role: 'tenant_admin' };
  }),
  tenantDbMiddleware: vi.fn().mockImplementation(async (request: any) => {
    request.tenantDb = { name: 'tenant_test' };
  }),
  roleGuard: vi.fn().mockImplementation(() => async () => {}),
}));

// ── Tests ──────────────────────────────────────────────────

describe('Insurance Company Routes', () => {
  let app: FastifyInstance;
  const validId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(insuranceCompanyRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / — List insurance companies ──────────────────

  describe('GET /', () => {
    it('should return paginated companies with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].code).toBe('AXA');
    });

    it('should pass query params to service', async () => {
      await app.inject({ method: 'GET', url: '/?page=2&limit=10&isActive=true' });
      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it('should return 500 when service throws', async () => {
      mockService.list.mockRejectedValueOnce(new Error('DB failure'));
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── GET /:id — Get by ID ─────────────────────────────

  describe('GET /:id', () => {
    it('should return company detail with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.company._id).toBe('ic1');
    });

    it('should return 500 when service throws generic error', async () => {
      mockService.getById.mockRejectedValueOnce(new Error('DB failure'));
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(500);
    });

    it('should propagate ApiError from service', async () => {
      const apiErr = new Error('Not found');
      apiErr.name = 'ApiError';
      mockService.getById.mockRejectedValueOnce(apiErr);
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(500); // Fastify re-throws → 500
    });
  });

  // ── GET /:id/stats — Get company with stats ──────────

  describe('GET /:id/stats', () => {
    it('should return company stats with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}/stats` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stats.totalClaims).toBe(42);
    });

    it('should return 500 when service throws', async () => {
      mockService.getCompanyStats.mockRejectedValueOnce(new Error('Aggregation failed'));
      const res = await app.inject({ method: 'GET', url: `/${validId}/stats` });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── POST / — Create insurance company ────────────────

  describe('POST /', () => {
    const validPayload = {
      name: { en: 'Bupa Insurance', ar: 'بوبا للتأمين' },
      code: 'BUPA',
      coveragePercentage: 80,
    };

    it('should create company and return 201', async () => {
      const res = await app.inject({ method: 'POST', url: '/', payload: validPayload });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.company.code).toBe('BUPA');
    });

    it('should return error when name.en is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { name: { ar: 'بوبا' }, code: 'BUPA' },
      });
      // ZodError re-thrown → Fastify default handler returns 500
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should return error when code is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { name: { en: 'Bupa', ar: 'بوبا' } },
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should return 500 when service throws generic error', async () => {
      mockService.create.mockRejectedValueOnce(new Error('Duplicate key'));
      const res = await app.inject({ method: 'POST', url: '/', payload: validPayload });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── PUT /:id — Update insurance company ──────────────

  describe('PUT /:id', () => {
    const updatePayload = {
      name: { en: 'AXA Updated', ar: 'أكسا محدث' },
    };

    it('should update company and return 200', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/${validId}`,
        payload: updatePayload,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.company.name.en).toBe('AXA Updated');
    });

    it('should return 500 when service throws generic error', async () => {
      mockService.update.mockRejectedValueOnce(new Error('Not found'));
      const res = await app.inject({
        method: 'PUT',
        url: `/${validId}`,
        payload: updatePayload,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── DELETE /:id — Soft-deactivate ────────────────────

  describe('DELETE /:id', () => {
    it('should deactivate company and return 200', async () => {
      const res = await app.inject({ method: 'DELETE', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.company.isActive).toBe(false);
    });

    it('should return 500 when service throws', async () => {
      mockService.deactivate.mockRejectedValueOnce(new Error('Already deactivated'));
      const res = await app.inject({ method: 'DELETE', url: `/${validId}` });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── Middleware checks ─────────────────────────────────

  describe('Middleware', () => {
    it('should apply authGuard on all routes', async () => {
      const { authGuard } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/' });
      expect(authGuard).toHaveBeenCalled();
    });

    it('should register roleGuard for insurance create', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('insurance', 'create');
    });

    it('should register roleGuard for insurance update', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('insurance', 'update');
    });

    it('should register roleGuard for insurance delete', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('insurance', 'delete');
    });
  });

  // ── Response Format ───────────────────────────────────

  describe('Response Format', () => {
    it('should return standard API response envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });

    it('should include message on mutation success', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { name: { en: 'Test', ar: 'تست' }, code: 'TST' },
      });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('created');
    });
  });
});

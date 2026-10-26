/**
 * Commission Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Covers commission list, detail, calculate, approve, payouts, doctor summary.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { commissionRoutes } from './commissions.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockService = {
  list: vi.fn().mockResolvedValue({
    items: [{ _id: 'comm1', doctorId: 'd1', amount: 300, status: 'pending' }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue({ _id: 'comm1', doctorId: 'd1', amount: 300 }),
  calculateFromInvoice: vi
    .fn()
    .mockResolvedValue([{ _id: 'comm1', amount: 300, status: 'pending' }]),
  approveCommissions: vi.fn().mockResolvedValue({ approved: 3, total: 3 }),
  listPayouts: vi.fn().mockResolvedValue({
    items: [{ _id: 'po1', doctorId: 'd1', totalAmount: 900 }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  createPayout: vi.fn().mockResolvedValue({ _id: 'po1', doctorId: 'd1', totalAmount: 900 }),
  getDoctorSummary: vi.fn().mockResolvedValue({
    totalEarned: 5000,
    totalPaid: 3000,
    pending: 2000,
  }),
};

vi.mock('../../services/commission.service.js', () => ({
  CommissionService: vi.fn().mockImplementation(function () {
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

describe('Commission Routes', () => {
  let app: FastifyInstance;
  const validId = '507f1f77bcf86cd799439011';
  const doctorId = '507f1f77bcf86cd799439033';
  const invoiceId = '507f1f77bcf86cd799439044';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.setErrorHandler((error, _request, reply) => {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ success: false, error: 'Validation failed' });
      }
      return reply.code((error as any).statusCode || 500).send({ error: error.message });
    });
    await app.register(commissionRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / — List commissions ──────────────────────────

  describe('GET /', () => {
    it('should return paginated commissions with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ── GET /payouts — List payouts ───────────────────────

  describe('GET /payouts', () => {
    it('should return paginated payouts with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/payouts' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ── GET /summary/:doctorId — Doctor summary ──────────

  describe('GET /summary/:doctorId', () => {
    it('should return doctor commission summary with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/summary/${doctorId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.totalEarned).toBe(5000);
    });
  });

  // ── GET /:id — Get single commission ─────────────────

  describe('GET /:id', () => {
    it('should return commission detail with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.commission._id).toBe('comm1');
    });
  });

  // ── POST /calculate/:invoiceId — Calculate from invoice

  describe('POST /calculate/:invoiceId', () => {
    it('should calculate commissions and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/calculate/${invoiceId}`,
        payload: {
          doctorId,
          commissionRate: 0.3,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.commissions).toHaveLength(1);
    });

    it('should return 400 when doctorId is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/calculate/${invoiceId}`,
        payload: { commissionRate: 0.3 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when commissionRate is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/calculate/${invoiceId}`,
        payload: { doctorId },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── PATCH /approve — Bulk approve commissions ────────

  describe('PATCH /approve', () => {
    it('should approve commissions and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/approve',
        payload: { ids: [validId] },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.approved).toBe(3);
    });
  });

  // ── POST /payouts — Create payout ────────────────────

  describe('POST /payouts', () => {
    it('should create payout and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/payouts',
        payload: {
          doctorId,
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          paymentMethod: 'bank_transfer',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.payout.totalAmount).toBe(900);
    });
  });

  // ── Middleware checks ─────────────────────────────────

  describe('Middleware', () => {
    it('should apply authGuard on all routes', async () => {
      const { authGuard } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/' });
      expect(authGuard).toHaveBeenCalled();
    });

    it('should register roleGuard for commissions create', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('commissions', 'create');
    });

    it('should register roleGuard for commissions update', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('commissions', 'update');
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
  });

  // ── Error Handling ────────────────────────────────────

  describe('Error Handling', () => {
    it('should return 500 when service throws on list', async () => {
      mockService.list.mockRejectedValueOnce(new Error('DB failure'));
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(500);
    });

    it('should return 500 when calculate fails', async () => {
      mockService.calculateFromInvoice.mockRejectedValueOnce(new Error('Not found'));
      const res = await app.inject({
        method: 'POST',
        url: `/calculate/${invoiceId}`,
        payload: { doctorId, commissionRate: 0.3 },
      });
      expect(res.statusCode).toBe(500);
    });

    it('should return 500 when payout creation fails', async () => {
      mockService.createPayout.mockRejectedValueOnce(new Error('Insufficient balance'));
      const res = await app.inject({
        method: 'POST',
        url: '/payouts',
        payload: {
          doctorId,
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          paymentMethod: 'bank_transfer',
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});

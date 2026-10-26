/**
 * Installment Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Covers plan CRUD, payment recording, waive, cancel, overdue tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { installmentRoutes } from './installments.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockService = {
  list: vi.fn().mockResolvedValue({
    items: [{ _id: 'plan1', status: 'active', totalAmount: 3000, installments: [] }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  listOverdue: vi.fn().mockResolvedValue({
    items: [{ _id: 'plan1', overdueAmount: 500 }],
    total: 1,
  }),
  getById: vi.fn().mockResolvedValue({ _id: 'plan1', status: 'active', totalAmount: 3000 }),
  create: vi.fn().mockResolvedValue({ _id: 'plan1', status: 'active' }),
  update: vi.fn().mockResolvedValue({ _id: 'plan1', notes: 'Updated' }),
  recordPayment: vi.fn().mockResolvedValue({ _id: 'plan1', paidAmount: 1000 }),
  waiveInstallment: vi.fn().mockResolvedValue({ _id: 'plan1' }),
  cancelPlan: vi.fn().mockResolvedValue({ _id: 'plan1', status: 'cancelled' }),
};

vi.mock('../../services/installment.service.js', () => ({
  InstallmentService: vi.fn().mockImplementation(function () {
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

describe('Installment Routes', () => {
  let app: FastifyInstance;
  const validId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(installmentRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / — List plans ────────────────────────────────

  describe('GET /', () => {
    it('should return paginated installment plans with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ── GET /overdue — List overdue ───────────────────────

  describe('GET /overdue', () => {
    it('should return overdue installments with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/overdue' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── GET /:id — Get plan by ID ────────────────────────

  describe('GET /:id', () => {
    it('should return plan detail with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.plan._id).toBe('plan1');
    });
  });

  // ── POST / — Create plan ─────────────────────────────

  describe('POST /', () => {
    it('should create installment plan and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          invoiceId: validId,
          patientId: validId,
          totalAmount: 3000,
          numberOfInstallments: 3,
          frequency: 'monthly',
          startDate: '2026-01-01T00:00:00.000Z',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── PUT /:id — Update plan ───────────────────────────

  describe('PUT /:id', () => {
    it('should update plan and return 200', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/${validId}`,
        payload: { notes: 'Patient requested extension' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST /:id/payments/:number — Record payment ──────

  describe('POST /:id/payments/:number', () => {
    it('should record installment payment and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/${validId}/payments/1`,
        payload: { amountPaid: 1000 },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.plan.paidAmount).toBe(1000);
    });
  });

  // ── PATCH /:id/payments/:number/waive — Waive ────────

  describe('PATCH /:id/payments/:number/waive', () => {
    it('should waive installment and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}/payments/2/waive`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── PATCH /:id/cancel — Cancel plan ──────────────────

  describe('PATCH /:id/cancel', () => {
    it('should cancel plan and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}/cancel`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.plan.status).toBe('cancelled');
    });
  });

  // ── Middleware checks ─────────────────────────────────

  describe('Middleware', () => {
    it('should apply authGuard on all routes', async () => {
      const { authGuard } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/' });
      expect(authGuard).toHaveBeenCalled();
    });

    it('should register roleGuard for installments create', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('installments', 'create');
    });

    it('should register roleGuard for installments update', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('installments', 'update');
    });

    it('should register roleGuard for installments delete', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('installments', 'delete');
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

    it('should return 500 when service throws on overdue', async () => {
      mockService.listOverdue.mockRejectedValueOnce(new Error('DB failure'));
      const res = await app.inject({ method: 'GET', url: '/overdue' });
      expect(res.statusCode).toBe(500);
    });

    it('should return 500 when cancel fails', async () => {
      mockService.cancelPlan.mockRejectedValueOnce(new Error('Cannot cancel'));
      const res = await app.inject({ method: 'PATCH', url: `/${validId}/cancel` });
      expect(res.statusCode).toBe(500);
    });
  });
});

/**
 * Payment Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Covers tenant payments + reconciliation endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { tenantPaymentRoutes } from './payments.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockService = {
  list: vi.fn().mockResolvedValue({
    items: [{ _id: 'pay1', amount: 200, method: 'cash' }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue({ _id: 'pay1', amount: 200, method: 'cash' }),
  create: vi.fn().mockResolvedValue({ _id: 'pay1', amount: 200, method: 'cash' }),
  refund: vi.fn().mockResolvedValue({ _id: 'pay1', refundedAmount: 200, status: 'refunded' }),
  listReconciliations: vi.fn().mockResolvedValue({
    items: [{ _id: 'rec1', status: 'open' }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  openReconciliation: vi.fn().mockResolvedValue({ _id: 'rec1', status: 'open' }),
  updateReconciliation: vi.fn().mockResolvedValue({ _id: 'rec1', status: 'closed' }),
};

vi.mock('../../services/payment.service.js', () => ({
  PaymentService: vi.fn().mockImplementation(function () {
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

describe('Payment Routes', () => {
  let app: FastifyInstance;
  const validId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(tenantPaymentRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / — List payments ─────────────────────────────

  describe('GET /', () => {
    it('should return paginated payments with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ── GET /:id — Get single payment ────────────────────

  describe('GET /:id', () => {
    it('should return payment detail with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.payment._id).toBe('pay1');
    });
  });

  // ── POST / — Record payment ──────────────────────────

  describe('POST /', () => {
    it('should record payment and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          invoiceId: validId,
          patientId: validId,
          amount: 200,
          paymentMethod: 'cash',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── POST /:id/refund — Refund payment ────────────────

  describe('POST /:id/refund', () => {
    it('should refund payment and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/${validId}/refund`,
        payload: { reason: 'Patient request' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.payment.status).toBe('refunded');
    });
  });

  // ── GET /reconciliation — List reconciliations ────────

  describe('GET /reconciliation', () => {
    it('should return paginated reconciliations with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/reconciliation' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ── POST /reconciliation — Open reconciliation ───────

  describe('POST /reconciliation', () => {
    it('should open reconciliation and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/reconciliation',
        payload: { branchId: validId, reconciliationDate: '2024-01-15' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.reconciliation.status).toBe('open');
    });
  });

  // ── PUT /reconciliation/:id — Close reconciliation ───

  describe('PUT /reconciliation/:id', () => {
    it('should update reconciliation and return 200', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/reconciliation/${validId}`,
        payload: { status: 'closed', notes: 'All verified' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.reconciliation.status).toBe('closed');
    });
  });

  // ── Middleware checks ─────────────────────────────────

  describe('Middleware', () => {
    it('should apply authGuard on all routes', async () => {
      const { authGuard } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/' });
      expect(authGuard).toHaveBeenCalled();
    });

    it('should register roleGuard for payment create', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('payments', 'create');
    });

    it('should register roleGuard for payment update', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('payments', 'update');
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

    it('should return 500 when service throws on getById', async () => {
      mockService.getById.mockRejectedValueOnce(new Error('DB failure'));
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(500);
    });

    it('should return 500 when reconciliation open fails', async () => {
      mockService.openReconciliation.mockRejectedValueOnce(new Error('conflict'));
      const res = await app.inject({
        method: 'POST',
        url: '/reconciliation',
        payload: { branchId: validId, reconciliationDate: '2024-01-15' },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});

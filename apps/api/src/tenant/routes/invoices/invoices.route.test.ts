/**
 * Invoice Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { invoiceRoutes } from './invoices.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockService = {
  list: vi.fn().mockResolvedValue({
    items: [{ _id: 'inv1', status: 'draft', total: 500 }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue({ _id: 'inv1', status: 'draft', total: 500 }),
  create: vi.fn().mockResolvedValue({ _id: 'inv1', status: 'draft', total: 500 }),
  update: vi.fn().mockResolvedValue({ _id: 'inv1', status: 'draft' }),
  cancel: vi.fn().mockResolvedValue({ _id: 'inv1', status: 'cancelled' }),
  issue: vi.fn().mockResolvedValue({ _id: 'inv1', status: 'issued' }),
  generateFromTreatmentPlan: vi.fn().mockResolvedValue({ _id: 'inv2', status: 'draft' }),
  getStats: vi.fn().mockResolvedValue({ totalInvoices: 10, totalAmount: 5000 }),
  void: vi.fn().mockResolvedValue({ _id: 'inv1', status: 'voided' }),
  getPdfData: vi.fn().mockResolvedValue({ invoiceNumber: 'INV-001', items: [] }),
  send: vi.fn().mockResolvedValue({ _id: 'inv1', sentAt: new Date().toISOString() }),
};

vi.mock('../../services/invoice.service.js', () => ({
  InvoiceService: vi.fn().mockImplementation(function () {
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

describe('Invoice Routes', () => {
  let app: FastifyInstance;
  const validId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(invoiceRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / — List invoices ──────────────────────────────

  describe('GET /', () => {
    it('should return paginated invoices with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ── GET /:id — Get single invoice ─────────────────────

  describe('GET /:id', () => {
    it('should return invoice detail with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.invoice._id).toBe('inv1');
    });
  });

  // ── POST / — Create invoice ───────────────────────────

  describe('POST /', () => {
    it('should create invoice and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          patientId: validId,
          branchId: validId,
          items: [{ description: 'Cleaning', quantity: 1, unitPrice: 100, total: 100 }],
          subtotal: 100,
          totalAmount: 100,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── PUT /:id — Update invoice ─────────────────────────

  describe('PUT /:id', () => {
    it('should update invoice and return 200', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/${validId}`,
        payload: { notes: 'Updated notes' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── DELETE /:id — Cancel invoice ──────────────────────

  describe('DELETE /:id', () => {
    it('should cancel invoice and return 200', async () => {
      const res = await app.inject({ method: 'DELETE', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── POST /:id/issue — Issue invoice ───────────────────

  describe('POST /:id/issue', () => {
    it('should issue invoice and return 200', async () => {
      const res = await app.inject({ method: 'POST', url: `/${validId}/issue` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.invoice.status).toBe('issued');
    });
  });

  // ── POST /generate-from-treatment-plan ────────────────

  describe('POST /generate-from-treatment-plan', () => {
    it('should generate invoice from treatment plan and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/generate-from-treatment-plan',
        payload: { treatmentPlanId: validId, branchId: validId },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  // ── GET /stats — Invoice statistics ───────────────────

  describe('GET /stats', () => {
    it('should return invoice stats with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/stats' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.stats).toBeDefined();
    });
  });

  // ── POST /:id/void — Void invoice ────────────────────

  describe('POST /:id/void', () => {
    it('should void invoice and return 200', async () => {
      const res = await app.inject({ method: 'POST', url: `/${validId}/void` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.invoice.status).toBe('voided');
    });
  });

  // ── GET /:id/pdf — Invoice PDF data ──────────────────

  describe('GET /:id/pdf', () => {
    it('should return PDF data with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}/pdf` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── POST /:id/send — Send invoice ────────────────────

  describe('POST /:id/send', () => {
    it('should send invoice and return 200', async () => {
      const res = await app.inject({ method: 'POST', url: `/${validId}/send` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── Middleware checks ─────────────────────────────────

  describe('Middleware', () => {
    it('should apply authGuard on all routes', async () => {
      const { authGuard } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/' });
      expect(authGuard).toHaveBeenCalled();
    });

    it('should register roleGuard for invoice create', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('invoices', 'create');
    });

    it('should register roleGuard for invoice update', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('invoices', 'update');
    });

    it('should register roleGuard for invoice delete', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('invoices', 'delete');
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

  // ── Service Error Handling ────────────────────────────

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
  });
});

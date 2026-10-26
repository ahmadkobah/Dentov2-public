/**
 * Insurance Claim Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Covers claims CRUD, status flow, document upload/removal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { insuranceClaimRoutes } from './insurance-claims.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockService = {
  list: vi.fn().mockResolvedValue({
    items: [{ _id: 'claim1', status: 'submitted', claimAmount: 1500 }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  getAgingReport: vi.fn().mockResolvedValue({
    buckets: [
      { range: '0-30', count: 5, total: 10000 },
      { range: '31-60', count: 2, total: 4000 },
    ],
  }),
  getById: vi.fn().mockResolvedValue({ _id: 'claim1', status: 'submitted', claimAmount: 1500 }),
  create: vi.fn().mockResolvedValue({ _id: 'claim1', status: 'submitted' }),
  updateStatus: vi.fn().mockResolvedValue({ _id: 'claim1', status: 'approved' }),
  attachDocument: vi.fn().mockResolvedValue({
    _id: 'claim1',
    documents: [{ name: 'xray.pdf', url: 'https://cdn.example.com/xray.pdf', type: 'xray' }],
  }),
  removeDocument: vi.fn().mockResolvedValue({ _id: 'claim1', documents: [] }),
};

vi.mock('../../services/insurance-claim.service.js', () => ({
  InsuranceClaimService: vi.fn().mockImplementation(function () {
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

describe('Insurance Claim Routes', () => {
  let app: FastifyInstance;
  const validId = '507f1f77bcf86cd799439011';
  const validDocId = '507f1f77bcf86cd799439022';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(insuranceClaimRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / — List claims ───────────────────────────────

  describe('GET /', () => {
    it('should return paginated claims with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(1);
    });
  });

  // ── GET /aging — Aging report ─────────────────────────

  describe('GET /aging', () => {
    it('should return aging report with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/aging' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.buckets).toHaveLength(2);
    });
  });

  // ── GET /:id — Get single claim ──────────────────────

  describe('GET /:id', () => {
    it('should return claim detail with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.claim._id).toBe('claim1');
    });
  });

  // ── POST / — Create claim ────────────────────────────

  describe('POST /', () => {
    it('should create claim and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          invoiceId: validId,
          patientId: validId,
          patientInsuranceIndex: 0,
          claimDate: '2026-01-15T00:00:00.000Z',
          serviceDate: '2026-01-10T00:00:00.000Z',
          totalAmount: 2000,
          claimedAmount: 1500,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── PATCH /:id/status — Update claim status ──────────

  describe('PATCH /:id/status', () => {
    it('should update status and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}/status`,
        payload: { status: 'approved', approvedAmount: 1200 },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.claim.status).toBe('approved');
    });
  });

  // ── POST /:id/documents — Attach document ────────────

  describe('POST /:id/documents', () => {
    it('should attach document and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/${validId}/documents`,
        payload: {
          name: 'xray.pdf',
          url: 'https://cdn.example.com/xray.pdf',
          type: 'xray',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.claim.documents).toHaveLength(1);
    });

    it('should reject invalid document type with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/${validId}/documents`,
        payload: {
          name: 'file.pdf',
          url: 'https://cdn.example.com/file.pdf',
          type: 'invalid_type',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject missing name with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/${validId}/documents`,
        payload: {
          url: 'https://cdn.example.com/file.pdf',
          type: 'xray',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid URL with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/${validId}/documents`,
        payload: {
          name: 'file.pdf',
          url: 'not-a-url',
          type: 'xray',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── DELETE /:id/documents/:docId — Remove document ───

  describe('DELETE /:id/documents/:docId', () => {
    it('should remove document and return 200', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/${validId}/documents/${validDocId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.claim.documents).toHaveLength(0);
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

    it('should return 500 when aging report fails', async () => {
      mockService.getAgingReport.mockRejectedValueOnce(new Error('Aggregation failed'));
      const res = await app.inject({ method: 'GET', url: '/aging' });
      expect(res.statusCode).toBe(500);
    });
  });
});

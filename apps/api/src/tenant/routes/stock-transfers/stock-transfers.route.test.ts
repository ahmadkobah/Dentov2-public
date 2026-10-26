/**
 * Stock Transfer Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Uses Fastify's light-my-request (inject) for HTTP-level testing without a real server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { stockTransferRoutes } from './stock-transfers.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockList = vi.fn().mockResolvedValue({
  items: [{ _id: 'tr1', transferNumber: 'TF-001', status: 'pending' }],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
});

const mockGetById = vi.fn().mockResolvedValue({
  _id: 'tr1',
  transferNumber: 'TF-001',
  status: 'pending',
});

const mockCreate = vi.fn().mockResolvedValue({
  _id: 'tr1',
  transferNumber: 'TF-001',
  status: 'pending',
});

const mockUpdateStatus = vi.fn().mockResolvedValue({
  _id: 'tr1',
  transferNumber: 'TF-001',
  status: 'received',
});

vi.mock('../../services/stock-transfer.service.js', () => ({
  StockTransferService: vi.fn().mockImplementation(function () {
    return {
      list: mockList,
      getById: mockGetById,
      create: mockCreate,
      updateStatus: mockUpdateStatus,
    };
  }),
}));

vi.mock('../../services/webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock middleware to pass through
vi.mock('../../middleware/index.js', () => ({
  authGuard: vi.fn().mockImplementation(async (request: Record<string, unknown>) => {
    request.user = { userId: 'user-1', role: 'tenant_admin' };
  }),
  tenantDbMiddleware: vi.fn().mockImplementation(async (request: Record<string, unknown>) => {
    request.tenantDb = { name: 'tenant_test' };
  }),
  roleGuard: vi.fn().mockImplementation(() => async () => {}),
}));

// ── Test Setup ─────────────────────────────────────────────

describe('Stock Transfer Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(stockTransferRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / ─────────────────────────────────────────────────

  describe('GET /', () => {
    it('should return paginated transfers with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should accept query parameters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/?page=1&limit=10',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── GET /:id ──────────────────────────────────────────────

  describe('GET /:id', () => {
    it('should return transfer detail with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.transfer).toBeDefined();
    });
  });

  // ── POST / ────────────────────────────────────────────────

  describe('POST /', () => {
    it('should create transfer with valid data and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          fromBranchId: 'branch1',
          toBranchId: 'branch2',
          items: [{ itemId: 'item1', quantity: 10 }],
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });

    it('should dispatch webhook after creation', async () => {
      const { dispatchWebhook } = await import('../../services/webhook-dispatcher.js');
      await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          fromBranchId: 'branch1',
          toBranchId: 'branch2',
          items: [{ itemId: 'item1', quantity: 10 }],
        },
      });
      expect(dispatchWebhook).toHaveBeenCalled();
    });
  });

  // ── PATCH /:id/status ─────────────────────────────────────

  describe('PATCH /:id/status', () => {
    it('should update transfer status and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/status',
        payload: { action: 'approve' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.transfer).toBeDefined();
    });

    it('should dispatch webhook when action is receive', async () => {
      const { dispatchWebhook } = await import('../../services/webhook-dispatcher.js');
      await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/status',
        payload: { action: 'receive' },
      });
      expect(dispatchWebhook).toHaveBeenCalled();
    });

    it('should not dispatch webhook for non-receive actions', async () => {
      const { dispatchWebhook } = await import('../../services/webhook-dispatcher.js');
      await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/status',
        payload: { action: 'approve' },
      });
      expect(dispatchWebhook).not.toHaveBeenCalled();
    });
  });

  // ── Middleware Verification ────────────────────────────────

  describe('Middleware', () => {
    it('should apply auth and tenant middleware to routes', async () => {
      const { authGuard, tenantDbMiddleware } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/' });
      expect(authGuard).toHaveBeenCalled();
      expect(tenantDbMiddleware).toHaveBeenCalled();
    });

    it('should apply roleGuard with inventory read to GET routes', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'read');
    });

    it('should apply roleGuard with inventory create to POST', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'create');
    });
  });

  // ── Response Format ───────────────────────────────────────

  describe('Response Format', () => {
    it('should return standard API response envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });
  });
});

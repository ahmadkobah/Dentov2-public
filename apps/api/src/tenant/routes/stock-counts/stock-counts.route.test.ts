/**
 * Stock Count Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Uses Fastify's light-my-request (inject) for HTTP-level testing without a real server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { stockCountRoutes } from './stock-counts.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockList = vi.fn().mockResolvedValue({
  items: [{ _id: 'sc1', countNumber: 'SC-001', status: 'in_progress' }],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
});

const mockGetById = vi.fn().mockResolvedValue({
  _id: 'sc1',
  countNumber: 'SC-001',
  status: 'in_progress',
});

const mockCreate = vi.fn().mockResolvedValue({
  _id: 'sc1',
  countNumber: 'SC-001',
  status: 'in_progress',
});

const mockUpdateItems = vi.fn().mockResolvedValue({
  _id: 'sc1',
  countNumber: 'SC-001',
  items: [{ itemId: 'item1', countedQuantity: 25 }],
});

const mockComplete = vi.fn().mockResolvedValue({
  _id: 'sc1',
  countNumber: 'SC-001',
  status: 'completed',
});

const mockApprove = vi.fn().mockResolvedValue({
  _id: 'sc1',
  countNumber: 'SC-001',
  status: 'approved',
});

const mockCancel = vi.fn().mockResolvedValue({
  _id: 'sc1',
  countNumber: 'SC-001',
  status: 'cancelled',
});

vi.mock('../../services/stock-count.service.js', () => ({
  StockCountService: vi.fn().mockImplementation(function () {
    return {
      list: mockList,
      getById: mockGetById,
      create: mockCreate,
      updateItems: mockUpdateItems,
      complete: mockComplete,
      approve: mockApprove,
      cancel: mockCancel,
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

describe('Stock Count Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(stockCountRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / ─────────────────────────────────────────────────

  describe('GET /', () => {
    it('should return paginated stock counts with 200', async () => {
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
    it('should return stock count detail with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stockCount).toBeDefined();
    });
  });

  // ── POST / ────────────────────────────────────────────────

  describe('POST /', () => {
    it('should create stock count with valid data and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          branchId: 'branch1',
          countType: 'full',
          items: [{ itemId: 'item1', countedQuantity: 25 }],
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });

    it('should call service.create with parsed data and userId', async () => {
      await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          branchId: 'branch1',
          items: [{ itemId: 'item1', countedQuantity: 10 }],
        },
      });
      expect(mockCreate).toHaveBeenCalled();
      const [, userId] = mockCreate.mock.calls[0];
      expect(userId).toBe('user-1');
    });
  });

  // ── PUT /:id/items ────────────────────────────────────────

  describe('PUT /:id/items', () => {
    it('should update counted items and return 200', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/507f1f77bcf86cd799439011/items',
        payload: {
          items: [{ itemId: 'item1', countedQuantity: 30 }],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stockCount).toBeDefined();
    });
  });

  // ── PATCH /:id/complete ───────────────────────────────────

  describe('PATCH /:id/complete', () => {
    it('should mark count as complete and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/complete',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stockCount).toBeDefined();
    });

    it('should dispatch webhook on completion', async () => {
      const { dispatchWebhook } = await import('../../services/webhook-dispatcher.js');
      await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/complete',
      });
      expect(dispatchWebhook).toHaveBeenCalled();
    });
  });

  // ── PATCH /:id/approve ────────────────────────────────────

  describe('PATCH /:id/approve', () => {
    it('should approve count and apply adjustments and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/approve',
        payload: {
          itemIds: ['item1', 'item2'],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stockCount).toBeDefined();
    });

    it('should dispatch webhook on approval', async () => {
      const { dispatchWebhook } = await import('../../services/webhook-dispatcher.js');
      await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/approve',
        payload: {
          itemIds: ['item1'],
        },
      });
      expect(dispatchWebhook).toHaveBeenCalled();
    });
  });

  // ── PATCH /:id/cancel ─────────────────────────────────────

  describe('PATCH /:id/cancel', () => {
    it('should cancel count session and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/cancel',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stockCount).toBeDefined();
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

    it('should apply roleGuard with inventory delete for approve (high privilege)', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'delete');
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

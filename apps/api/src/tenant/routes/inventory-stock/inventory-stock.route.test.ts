/**
 * Inventory Stock Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Uses Fastify's light-my-request (inject) for HTTP-level testing without a real server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { inventoryStockRoutes } from './inventory-stock.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockGetStockByBranch = vi.fn().mockResolvedValue({
  items: [{ _id: 's1', itemId: 'item1', branchId: 'branch1', totalQuantity: 50 }],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
});

const mockGetStockForItem = vi.fn().mockResolvedValue({
  _id: 's1',
  itemId: 'item1',
  totalQuantity: 100,
});

const mockGetStockSummary = vi.fn().mockResolvedValue({
  totalItems: 100,
  totalValue: 50000,
  lowStockCount: 5,
});

const mockGetExpiryDashboard = vi.fn().mockResolvedValue({
  expired: 3,
  expiringSoon: 12,
  batches: [],
});

const mockGetExpiringBatches = vi.fn().mockResolvedValue({
  items: [{ _id: 'b1', batchNumber: 'B-001', expiryDate: '2025-03-01' }],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
});

const mockDisposeBatch = vi.fn().mockResolvedValue({
  _id: 's1',
  batchNumber: 'B-001',
  status: 'disposed',
});

const mockBulkDispose = vi.fn().mockResolvedValue({
  disposed: 3,
  message: 'Batches disposed',
});

const mockReserveStock = vi.fn().mockResolvedValue({
  _id: 's1',
  reservedQuantity: 10,
});

const mockUnreserveStock = vi.fn().mockResolvedValue({
  _id: 's1',
  reservedQuantity: 0,
});

const mockRecalculateStockValue = vi.fn().mockResolvedValue({
  _id: 's1',
  totalValue: 5000,
});

const mockGetStockReport = vi.fn().mockResolvedValue({
  summary: { totalItems: 50, totalValue: 25000 },
  items: [],
});

vi.mock('../../services/inventory-stock.service.js', () => ({
  InventoryStockService: vi.fn().mockImplementation(function () {
    return {
      getStockByBranch: mockGetStockByBranch,
      getStockForItem: mockGetStockForItem,
      getStockSummary: mockGetStockSummary,
      getExpiryDashboard: mockGetExpiryDashboard,
      getExpiringBatches: mockGetExpiringBatches,
      disposeBatch: mockDisposeBatch,
      bulkDispose: mockBulkDispose,
      reserveStock: mockReserveStock,
      unreserveStock: mockUnreserveStock,
      recalculateStockValue: mockRecalculateStockValue,
      getStockReport: mockGetStockReport,
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

describe('Inventory Stock Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(inventoryStockRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /branch/:branchId ─────────────────────────────────

  describe('GET /branch/:branchId', () => {
    it('should return branch stock with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/branch/branch1' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should accept pagination query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/branch/branch1?page=2&limit=10',
      });
      expect(res.statusCode).toBe(200);
      expect(mockGetStockByBranch).toHaveBeenCalledWith('branch1', { page: 2, limit: 10 });
    });
  });

  // ── GET /item/:itemId ─────────────────────────────────────

  describe('GET /item/:itemId', () => {
    it('should return stock for item with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/item/item1' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stock).toBeDefined();
    });
  });

  // ── GET /branch/:branchId/summary ─────────────────────────

  describe('GET /branch/:branchId/summary', () => {
    it('should return branch KPI summary with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/branch/branch1/summary' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.summary).toBeDefined();
    });
  });

  // ── GET /branch/:branchId/expiry-dashboard ────────────────

  describe('GET /branch/:branchId/expiry-dashboard', () => {
    it('should return expiry dashboard with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/branch/branch1/expiry-dashboard',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.dashboard).toBeDefined();
    });
  });

  // ── GET /expiring ─────────────────────────────────────────

  describe('GET /expiring', () => {
    it('should return expiring batches with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/expiring' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });

    it('should accept daysAhead query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/expiring?daysAhead=30',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST /:stockId/dispose/:batchNumber ───────────────────

  describe('POST /:stockId/dispose/:batchNumber', () => {
    it('should dispose batch and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/stock1/dispose/B-001',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(mockDisposeBatch).toHaveBeenCalledWith('stock1', 'B-001', 'user-1');
    });

    it('should dispatch webhook after dispose', async () => {
      const { dispatchWebhook } = await import('../../services/webhook-dispatcher.js');
      await app.inject({ method: 'POST', url: '/stock1/dispose/B-001' });
      expect(dispatchWebhook).toHaveBeenCalled();
    });
  });

  // ── POST /bulk-dispose ────────────────────────────────────

  describe('POST /bulk-dispose', () => {
    it('should bulk dispose batches and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/bulk-dispose',
        payload: {
          items: [{ stockId: 'stock1', batchNumber: 'B-001' }],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── POST /reserve ─────────────────────────────────────────

  describe('POST /reserve', () => {
    it('should reserve stock and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/reserve',
        payload: { itemId: 'item1', branchId: 'branch1', quantity: 5 },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── POST /unreserve ───────────────────────────────────────

  describe('POST /unreserve', () => {
    it('should unreserve stock and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/unreserve',
        payload: { itemId: 'item1', branchId: 'branch1', quantity: 5 },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── POST /:stockId/recalculate ────────────────────────────

  describe('POST /:stockId/recalculate', () => {
    it('should recalculate stock value and return 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/stock1/recalculate',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(mockRecalculateStockValue).toHaveBeenCalledWith('stock1');
    });
  });

  // ── GET /branch/:branchId/report ──────────────────────────

  describe('GET /branch/:branchId/report', () => {
    it('should return stock report with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/branch/branch1/report?from=2024-01-01&to=2024-12-31',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.report).toBeDefined();
    });
  });

  // ── Middleware Verification ────────────────────────────────

  describe('Middleware', () => {
    it('should apply auth and tenant middleware to routes', async () => {
      const { authGuard, tenantDbMiddleware } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/branch/branch1' });
      expect(authGuard).toHaveBeenCalled();
      expect(tenantDbMiddleware).toHaveBeenCalled();
    });

    it('should apply roleGuard with inventory read to GET routes', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'read');
    });

    it('should apply roleGuard with inventory update to POST routes', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'update');
    });
  });

  // ── Response Format ───────────────────────────────────────

  describe('Response Format', () => {
    it('should return standard API response envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/branch/branch1' });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });
  });
});

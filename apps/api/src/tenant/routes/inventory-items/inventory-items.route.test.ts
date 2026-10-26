/**
 * Inventory Item Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Uses Fastify's light-my-request (inject) for HTTP-level testing without a real server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { inventoryItemRoutes } from './inventory-items.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockList = vi.fn().mockResolvedValue({
  items: [{ _id: 'item1', sku: 'SKU-001', nameEn: 'Test' }],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
});

const mockGetById = vi.fn().mockResolvedValue({
  _id: 'item1',
  sku: 'SKU-001',
  nameEn: 'Test',
});

const mockCreate = vi.fn().mockResolvedValue({
  _id: 'item1',
  sku: 'SKU-001',
  nameEn: 'Test',
});

vi.mock('../../services/inventory-item.service.js', () => ({
  InventoryItemService: vi.fn().mockImplementation(function () {
    return {
      list: mockList,
      getById: mockGetById,
      create: mockCreate,
      update: vi.fn().mockResolvedValue({ _id: 'item1' }),
      softDelete: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue({ _id: 'item1' }),
      getStockLevels: vi.fn().mockResolvedValue([]),
      adjustStock: vi.fn().mockResolvedValue(undefined),
      findByBarcode: vi.fn().mockResolvedValue({ _id: 'item1' }),
      getMovementHistory: vi.fn().mockResolvedValue({ movements: [], meta: {} }),
      getLowStockItems: vi.fn().mockResolvedValue({ items: [], meta: {} }),
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
  authGuard: vi.fn().mockImplementation(async (request: any) => {
    request.user = { userId: 'user-1', role: 'tenant_admin' };
  }),
  tenantDbMiddleware: vi.fn().mockImplementation(async (request: any) => {
    request.tenantDb = { name: 'tenant_test' };
  }),
  roleGuard: vi.fn().mockImplementation(() => async () => {}),
}));

// ── Test Setup ─────────────────────────────────────────────

describe('Inventory Item Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(inventoryItemRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / ─────────────────────────────────────────────────

  describe('GET /', () => {
    it('should return paginated items with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should accept query parameters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/?page=1&limit=10&search=test',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── GET /low-stock ────────────────────────────────────────

  describe('GET /low-stock', () => {
    it('should return low-stock items with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/low-stock' });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── GET /:id ──────────────────────────────────────────────

  describe('GET /:id', () => {
    it('should return item detail with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST / ────────────────────────────────────────────────

  describe('POST /', () => {
    it('should create item with valid data and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          nameEn: 'Test Item',
          nameAr: '',
          sku: 'SKU-NEW-001',
          categoryId: '507f1f77bcf86cd799439011',
          unit: 'piece',
          unitCost: 10,
          sellingPrice: 20,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── GET /:id/stock ────────────────────────────────────────

  describe('GET /:id/stock', () => {
    it('should return stock levels with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/507f1f77bcf86cd799439011/stock',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST /barcode/search ──────────────────────────────────

  describe('POST /barcode/search', () => {
    it('should find item by barcode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/barcode/search',
        payload: { code: 'BC-001' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── GET /:id/movements ────────────────────────────────────

  describe('GET /:id/movements', () => {
    it('should return movement history with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/507f1f77bcf86cd799439011/movements',
      });
      expect(res.statusCode).toBe(200);
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

    it('should apply roleGuard to GET routes', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      // roleGuard was called during route registration with ('inventory', 'read')
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'read');
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

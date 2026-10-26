/**
 * Inventory Category Routes — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Uses Fastify's light-my-request (inject) for HTTP-level testing without a real server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { inventoryCategoryRoutes } from './inventory-categories.route.js';

// ── Mocks ──────────────────────────────────────────────────

const mockList = vi.fn().mockResolvedValue({
  items: [{ _id: 'cat1', nameEn: 'Consumables', isActive: true }],
  meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
});

const mockGetById = vi.fn().mockResolvedValue({
  _id: 'cat1',
  nameEn: 'Consumables',
  isActive: true,
});

const mockCreate = vi.fn().mockResolvedValue({
  _id: 'cat1',
  nameEn: 'Consumables',
});

const mockUpdate = vi.fn().mockResolvedValue({
  _id: 'cat1',
  nameEn: 'Updated Category',
});

const mockSoftDelete = vi.fn().mockResolvedValue({
  _id: 'cat1',
  isActive: false,
});

const mockRestore = vi.fn().mockResolvedValue({
  _id: 'cat1',
  isActive: true,
});

vi.mock('../../services/inventory-category.service.js', () => ({
  InventoryCategoryService: vi.fn().mockImplementation(function () {
    return {
      list: mockList,
      getById: mockGetById,
      create: mockCreate,
      update: mockUpdate,
      softDelete: mockSoftDelete,
      restore: mockRestore,
    };
  }),
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

describe('Inventory Category Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(inventoryCategoryRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / ─────────────────────────────────────────────────

  describe('GET /', () => {
    it('should return paginated categories with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should accept query parameters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/?page=1&limit=10&search=dental',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── GET /:id ──────────────────────────────────────────────

  describe('GET /:id', () => {
    it('should return category detail with 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.category).toBeDefined();
    });
  });

  // ── POST / ────────────────────────────────────────────────

  describe('POST /', () => {
    it('should create category with valid data and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: {
          nameEn: 'New Category',
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
          nameEn: 'Test Category',
          description: 'A test',
        },
      });
      expect(mockCreate).toHaveBeenCalled();
      const [data, userId] = mockCreate.mock.calls[0];
      expect(data.nameEn).toBe('Test Category');
      expect(userId).toBe('user-1');
    });
  });

  // ── PUT /:id ──────────────────────────────────────────────

  describe('PUT /:id', () => {
    it('should update category and return 200', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/507f1f77bcf86cd799439011',
        payload: {
          nameEn: 'Updated Category',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── DELETE /:id ───────────────────────────────────────────

  describe('DELETE /:id', () => {
    it('should soft delete category and return 200', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ── PATCH /:id/restore ───────────────────────────────────

  describe('PATCH /:id/restore', () => {
    it('should restore category and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/507f1f77bcf86cd799439011/restore',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.category).toBeDefined();
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

    it('should apply roleGuard for read operations', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'read');
    });

    it('should apply roleGuard for create operations', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('inventory', 'create');
    });

    it('should apply roleGuard for delete operations', async () => {
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

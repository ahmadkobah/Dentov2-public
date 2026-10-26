/**
 * Feature Flags Routes — Integration Tests
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.7
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Pattern follows settings.route.test.ts — mock service + middleware, app.inject().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { featureFlagRoutes } from '../feature-flags.route.js';

// ── Mock Data ──────────────────────────────────────────────

const mockFlag = {
  _id: '507f1f77bcf86cd799439011',
  key: 'chat_enabled',
  name: 'Chat Feature',
  description: 'Enables the chat module',
  tenantId: null,
  enabled: true,
  percentageRollout: null,
  userIds: null,
  conditions: null,
  value: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockListResult = {
  items: [mockFlag],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

// ── Mocks ──────────────────────────────────────────────────

const mockListFeatureFlags = vi.fn().mockResolvedValue(mockListResult);
const mockGetFeatureFlagById = vi.fn().mockResolvedValue(mockFlag);
const mockCreateFeatureFlag = vi.fn().mockResolvedValue(mockFlag);
const mockUpdateFeatureFlag = vi.fn().mockResolvedValue({ ...mockFlag, name: 'Chat V2' });
const mockToggleFeatureFlag = vi.fn().mockResolvedValue({ ...mockFlag, enabled: false });
const mockDeleteFeatureFlag = vi.fn().mockResolvedValue(mockFlag);

vi.mock('../../../services/feature-flags.service.js', () => ({
  listFeatureFlags: (...args: unknown[]) => mockListFeatureFlags(...args),
  getFeatureFlagById: (...args: unknown[]) => mockGetFeatureFlagById(...args),
  createFeatureFlag: (...args: unknown[]) => mockCreateFeatureFlag(...args),
  updateFeatureFlag: (...args: unknown[]) => mockUpdateFeatureFlag(...args),
  toggleFeatureFlag: (...args: unknown[]) => mockToggleFeatureFlag(...args),
  deleteFeatureFlag: (...args: unknown[]) => mockDeleteFeatureFlag(...args),
}));

vi.mock('../../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../tenant/middleware/index.js', () => ({
  authGuard: vi.fn().mockImplementation(async (request: any) => {
    request.user = { userId: 'owner-1', platformRole: 'platform_owner' };
  }),
  tenantDbMiddleware: vi.fn().mockImplementation(async () => {}),
  roleGuard: vi.fn().mockImplementation(() => async () => {}),
}));

vi.mock('../../../../platform/middleware/index.js', () => ({
  platformGuard: vi.fn().mockImplementation(() => async () => {}),
}));

// ── Tests ──────────────────────────────────────────────────

describe('Feature Flags Routes', () => {
  let app: FastifyInstance;
  const validId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(featureFlagRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET / — List ──────────────────────────────────────

  describe('GET /', () => {
    it('should return paginated flags with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.meta).toBeDefined();
      expect(body.meta.total).toBe(1);
    });

    it('should pass query params to service', async () => {
      await app.inject({ method: 'GET', url: '/?page=2&limit=10&search=chat&enabled=true' });
      expect(mockListFeatureFlags).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
          search: 'chat',
          enabled: true,
        }),
      );
    });

    it('should return 500 on service error', async () => {
      mockListFeatureFlags.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── GET /:id — Get by ID ─────────────────────────────

  describe('GET /:id', () => {
    it('should return flag with 200', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.key).toBe('chat_enabled');
    });

    it('should return 404 when flag not found', async () => {
      mockGetFeatureFlagById.mockResolvedValueOnce(null);
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on service error', async () => {
      mockGetFeatureFlagById.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── POST / — Create ──────────────────────────────────

  describe('POST /', () => {
    it('should create flag and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { key: 'chat_enabled', name: 'Chat Feature' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.key).toBe('chat_enabled');
    });

    it('should validate key format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { key: 'Invalid-Key!', name: 'Bad' },
      });
      // ZodError → Fastify default error handler
      expect(res.statusCode).toBe(500);
    });

    it('should reject unknown fields (strict)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { key: 'test_flag', name: 'Test', unknownField: true },
      });
      expect(res.statusCode).toBe(500);
    });

    it('should return 409 on duplicate key', async () => {
      const dupError = new Error('Duplicate key') as Error & { code: number };
      dupError.code = 11000;
      mockCreateFeatureFlag.mockRejectedValueOnce(dupError);
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { key: 'chat_enabled', name: 'Chat' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('should return 500 on service error', async () => {
      mockCreateFeatureFlag.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'POST',
        url: '/',
        payload: { key: 'chat_enabled', name: 'Chat' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── PATCH /:id — Update ──────────────────────────────

  describe('PATCH /:id', () => {
    it('should update flag and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}`,
        payload: { name: 'Chat V2' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Chat V2');
    });

    it('should return 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when flag not found', async () => {
      mockUpdateFeatureFlag.mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}`,
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on service error', async () => {
      mockUpdateFeatureFlag.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}`,
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── PATCH /:id/toggle — Toggle ───────────────────────

  describe('PATCH /:id/toggle', () => {
    it('should toggle flag and return 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}/toggle`,
        payload: { enabled: false },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.enabled).toBe(false);
    });

    it('should return 404 when flag not found', async () => {
      mockToggleFeatureFlag.mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}/toggle`,
        payload: { enabled: true },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should validate toggle body', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/${validId}/toggle`,
        payload: { enabled: 'not-a-boolean' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── DELETE /:id — Delete ─────────────────────────────

  describe('DELETE /:id', () => {
    it('should delete flag and return 200', async () => {
      const res = await app.inject({ method: 'DELETE', url: `/${validId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 when flag not found', async () => {
      mockDeleteFeatureFlag.mockResolvedValueOnce(null);
      const res = await app.inject({ method: 'DELETE', url: `/${validId}` });
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on service error', async () => {
      mockDeleteFeatureFlag.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'DELETE', url: `/${validId}` });
      expect(res.statusCode).toBe(500);
    });
  });

  // ── Middleware ────────────────────────────────────────

  describe('Middleware', () => {
    it('should apply authGuard on all routes', async () => {
      const { authGuard: guard } = await import('../../../../tenant/middleware/index.js');
      await app.inject({ method: 'GET', url: '/' });
      expect(guard).toHaveBeenCalled();
    });

    it('should apply platformGuard for read on GET', async () => {
      const { platformGuard: guard } = await import('../../../../platform/middleware/index.js');
      expect(guard).toHaveBeenCalledWith('platform_settings', 'read');
    });

    it('should apply platformGuard for create on POST', async () => {
      const { platformGuard: guard } = await import('../../../../platform/middleware/index.js');
      expect(guard).toHaveBeenCalledWith('platform_settings', 'create');
    });

    it('should apply platformGuard for update on PATCH', async () => {
      const { platformGuard: guard } = await import('../../../../platform/middleware/index.js');
      expect(guard).toHaveBeenCalledWith('platform_settings', 'update');
    });

    it('should apply platformGuard for delete on DELETE', async () => {
      const { platformGuard: guard } = await import('../../../../platform/middleware/index.js');
      expect(guard).toHaveBeenCalledWith('platform_settings', 'delete');
    });
  });

  // ── Response Format ──────────────────────────────────

  describe('Response Format', () => {
    it('should return standard API envelope on list', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should return standard API envelope on get', async () => {
      const res = await app.inject({ method: 'GET', url: `/${validId}` });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });
  });
});

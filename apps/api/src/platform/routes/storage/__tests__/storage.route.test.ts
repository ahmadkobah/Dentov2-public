/**
 * Storage Route Tests — Phase 7, Feature 4
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 4.10
 * Tests GET /stats and GET /tenants endpoints.
 * Mocks services and middleware directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { storageRoutes } from '../storage.route.js';

// ── Fixtures ───────────────────────────────────────────────

const mockStorageStats = {
  overview: {
    totalStorageUsedMB: 2048,
    totalStorageLimitMB: 10240,
    totalUsagePercentage: 20,
    tenantCount: 5,
    tenantsOverLimit: 0,
    tenantsNearLimit: 1,
    averageUsagePercentage: 20,
  },
  buckets: {
    uploads: { bucketName: 'dento-uploads', isAccessible: true, lastCheckedAt: '2026-03-03' },
    backups: { bucketName: 'dento-backups', isAccessible: true, lastCheckedAt: '2026-03-03' },
  },
};

const mockTenantStorageList = {
  tenants: [
    {
      tenantId: 't1',
      name: 'Clinic A',
      slug: 'clinic-a',
      status: 'active',
      storageUsedMB: 512,
      storageLimitMB: 5120,
      usagePercentage: 10,
    },
    {
      tenantId: 't2',
      name: 'Clinic B',
      slug: 'clinic-b',
      status: 'active',
      storageUsedMB: 6000,
      storageLimitMB: 5120,
      usagePercentage: 117.19,
    },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

// ── Service Mocks ──────────────────────────────────────────

const mockGetStorageStats = vi.fn().mockResolvedValue(mockStorageStats);
const mockGetTenantStorageList = vi.fn().mockResolvedValue(mockTenantStorageList);

vi.mock('../../../services/storage.service.js', () => ({
  getStorageStats: (...args: unknown[]) => mockGetStorageStats(...args),
  getTenantStorageList: (...args: unknown[]) => mockGetTenantStorageList(...args),
}));

// ── Infrastructure Mocks ───────────────────────────────────

vi.mock('../../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../utils/api-response.js', async () => {
  return {
    apiResponse: vi
      .fn()
      .mockImplementation(
        (reply: any, statusCode: number, data: unknown, _message?: string, meta?: unknown) => {
          const body: Record<string, unknown> = { success: true, data };
          if (meta) body.meta = meta;
          return reply.code(statusCode).send(body);
        },
      ),
    apiError: vi.fn().mockImplementation((reply: any, statusCode: number, message: string) => {
      return reply.code(statusCode).send({ success: false, error: { message } });
    }),
  };
});

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

// ── App Lifecycle ──────────────────────────────────────────

let app: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  mockGetStorageStats.mockResolvedValue(mockStorageStats);
  mockGetTenantStorageList.mockResolvedValue(mockTenantStorageList);

  app = Fastify();
  await app.register(storageRoutes);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

// ── GET /stats ─────────────────────────────────────────────

describe('GET /stats', () => {
  it('should return storage stats with 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/stats' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.overview).toBeDefined();
    expect(body.data.buckets).toBeDefined();
    expect(mockGetStorageStats).toHaveBeenCalledOnce();
  });

  it('should return overview with correct tenant count', async () => {
    const res = await app.inject({ method: 'GET', url: '/stats' });
    const body = JSON.parse(res.body);

    expect(body.data.overview.tenantCount).toBe(5);
    expect(body.data.overview.totalStorageUsedMB).toBe(2048);
    expect(body.data.overview.totalStorageLimitMB).toBe(10240);
  });

  it('should return bucket status info', async () => {
    const res = await app.inject({ method: 'GET', url: '/stats' });
    const body = JSON.parse(res.body);

    expect(body.data.buckets.uploads.isAccessible).toBe(true);
    expect(body.data.buckets.backups.isAccessible).toBe(true);
    expect(body.data.buckets.uploads.bucketName).toBe('dento-uploads');
  });

  it('should handle service error with 500', async () => {
    mockGetStorageStats.mockRejectedValueOnce(new Error('DB connection failed'));

    const res = await app.inject({ method: 'GET', url: '/stats' });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('DB connection failed');
  });

  it('should use authGuard and platformGuard middleware', async () => {
    const { authGuard } = await import('../../../../tenant/middleware/index.js');
    const { platformGuard } = await import('../../../../platform/middleware/index.js');

    await app.inject({ method: 'GET', url: '/stats' });

    expect(authGuard).toHaveBeenCalled();
    expect(platformGuard).toHaveBeenCalledWith('platform_settings', 'read');
  });
});

// ── GET /tenants ───────────────────────────────────────────

describe('GET /tenants', () => {
  it('should return tenant storage list with 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toBeDefined();
    expect(mockGetTenantStorageList).toHaveBeenCalledOnce();
  });

  it('should pass default query params to service', async () => {
    await app.inject({ method: 'GET', url: '/tenants' });

    expect(mockGetTenantStorageList).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: 'storageUsedMB',
        sortOrder: 'desc',
      }),
    );
  });

  it('should pass custom query params to service', async () => {
    await app.inject({
      method: 'GET',
      url: '/tenants?page=2&limit=5&search=clinic&sortBy=usagePercentage&sortOrder=asc',
    });

    expect(mockGetTenantStorageList).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        search: 'clinic',
        sortBy: 'usagePercentage',
        sortOrder: 'asc',
      }),
    );
  });

  it('should return tenant details in response', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants' });
    const body = JSON.parse(res.body);

    const tenant = body.data[0];
    expect(tenant.tenantId).toBe('t1');
    expect(tenant.name).toBe('Clinic A');
    expect(tenant.slug).toBe('clinic-a');
    expect(tenant.storageUsedMB).toBe(512);
    expect(tenant.usagePercentage).toBe(10);
  });

  it('should return pagination meta', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants' });
    const body = JSON.parse(res.body);

    expect(body.meta.total).toBe(2);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.totalPages).toBe(1);
  });

  it('should handle service error with 500', async () => {
    mockGetTenantStorageList.mockRejectedValueOnce(new Error('Aggregation failed'));

    const res = await app.inject({ method: 'GET', url: '/tenants' });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Aggregation failed');
  });

  it('should return 400 for invalid query params', async () => {
    await app.inject({ method: 'GET', url: '/tenants?limit=999' });

    // limit max is 100, should trigger ZodError → 400
    const res = await app.inject({ method: 'GET', url: '/tenants?limit=999' });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('should use authGuard and platformGuard middleware', async () => {
    const { authGuard } = await import('../../../../tenant/middleware/index.js');
    const { platformGuard } = await import('../../../../platform/middleware/index.js');

    await app.inject({ method: 'GET', url: '/tenants' });

    expect(authGuard).toHaveBeenCalled();
    expect(platformGuard).toHaveBeenCalledWith('platform_settings', 'read');
  });
});

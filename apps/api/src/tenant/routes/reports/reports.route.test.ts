/**
 * Reports & Analytics Route — Integration Tests
 *
 * Tests route-level behavior: middleware invocation, validation, response format.
 * Uses Fastify's light-my-request (inject) for HTTP-level testing without a real server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { reportRoutes } from './reports.route.js';

// ── Hoisted mocks ──────────────────────────────────────────

const {
  mockGetReport,
  mockHistoryCreate,
  mockSavedFind,
  mockSavedCreate,
  mockSavedFindOneAndDelete,
  mockScheduleFind,
  mockScheduleCreate,
  mockScheduleFindOneAndUpdate,
  mockScheduleFindOneAndDelete,
  mockScheduleFindOne,
  mockHistoryFind,
  mockHistoryCountDocs,
} = vi.hoisted(() => ({
  mockGetReport: vi.fn().mockResolvedValue({
    summary: { totalRevenue: 50000 },
    chart: [{ period: '2025-01', revenue: 50000 }],
    table: [{ _id: { year: 2025, month: 1 }, revenue: 50000 }],
  }),
  mockHistoryCreate: vi.fn().mockResolvedValue({ _id: 'history-1' }),
  mockSavedFind: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  }),
  mockSavedCreate: vi.fn().mockResolvedValue({ _id: 'saved-1', name: 'My Report' }),
  mockSavedFindOneAndDelete: vi.fn().mockResolvedValue({ _id: 'saved-1' }),
  mockScheduleFind: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  }),
  mockScheduleCreate: vi.fn().mockResolvedValue({
    _id: 'sched-1',
    reportType: 'revenue_summary',
    frequency: 'daily',
    nextRunAt: new Date(),
  }),
  mockScheduleFindOneAndUpdate: vi.fn().mockResolvedValue({ _id: 'sched-1' }),
  mockScheduleFindOneAndDelete: vi.fn().mockResolvedValue({ _id: 'sched-1' }),
  mockScheduleFindOne: vi.fn().mockResolvedValue({
    _id: 'sched-1',
    reportType: 'revenue_summary',
    category: 'financial',
    reportParams: {},
    format: 'csv',
  }),
  mockHistoryFind: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
  mockHistoryCountDocs: vi.fn().mockResolvedValue(0),
}));

// ── Service Mocks ──────────────────────────────────────────

vi.mock('../../services/report-pipeline.service.js', () => ({
  ReportPipelineService: vi.fn().mockImplementation(function () {
    return {
      getReport: mockGetReport,
      revenueByPeriod: vi.fn().mockResolvedValue({ summary: {}, chart: [], table: [] }),
    };
  }),
}));

vi.mock('../../services/inventory-report-pipeline.service.js', () => ({
  InventoryReportPipelineService: vi.fn().mockImplementation(function () {
    return {
      getReport: mockGetReport,
    };
  }),
}));

vi.mock('../../models/report.model.js', () => ({
  createSavedReportModel: vi.fn(() => ({
    find: mockSavedFind,
    create: mockSavedCreate,
    findOneAndDelete: mockSavedFindOneAndDelete,
  })),
  createReportScheduleModel: vi.fn(() => ({
    find: mockScheduleFind,
    create: mockScheduleCreate,
    findOneAndUpdate: mockScheduleFindOneAndUpdate,
    findOneAndDelete: mockScheduleFindOneAndDelete,
    findOne: mockScheduleFindOne,
  })),
  createReportHistoryModel: vi.fn(() => ({
    create: mockHistoryCreate,
    find: mockHistoryFind,
    countDocuments: mockHistoryCountDocs,
  })),
  REPORT_CATALOG: {
    financial: [
      {
        type: 'revenue_summary',
        name: { en: 'Revenue Summary', ar: '' },
        isFree: true,
        description: { en: '', ar: '' },
      },
      {
        type: 'outstanding_aging',
        name: { en: 'Outstanding Aging', ar: '' },
        isFree: false,
        description: { en: '', ar: '' },
      },
    ],
    patient: [
      {
        type: 'patient_overview',
        name: { en: 'Patient Overview', ar: '' },
        isFree: true,
        description: { en: '', ar: '' },
      },
    ],
    appointment: [
      {
        type: 'summary',
        name: { en: 'Summary', ar: '' },
        isFree: true,
        description: { en: '', ar: '' },
      },
    ],
    clinical: [
      {
        type: 'procedures_performed',
        name: { en: 'Procedures', ar: '' },
        isFree: true,
        description: { en: '', ar: '' },
      },
    ],
    operational: [
      {
        type: 'wait_time_analysis',
        name: { en: 'Wait Time', ar: '' },
        isFree: true,
        description: { en: '', ar: '' },
      },
    ],
    inventory: [
      {
        type: 'material_usage',
        name: { en: 'Material Usage', ar: '' },
        isFree: true,
        description: { en: '', ar: '' },
      },
    ],
  },
}));

vi.mock('../../../services/report-export.service.js', () => ({
  queueReportExport: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock middleware to pass through
vi.mock('../../middleware/index.js', () => ({
  authGuard: vi.fn().mockImplementation(async (request: Record<string, unknown>) => {
    request.user = { userId: 'user-1', role: 'tenant_admin' };
    request.tenant = { id: 'tenant-1' };
    request.tenantSlug = 'demo-clinic';
  }),
  tenantDbMiddleware: vi.fn().mockImplementation(async (request: Record<string, unknown>) => {
    request.tenantDb = { name: 'tenant_demo-clinic' };
  }),
  roleGuard: vi.fn().mockImplementation(() => async () => {}),
}));

// ── Tests ──────────────────────────────────────────────────

describe('Report Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(reportRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /catalog ──────────────────────────────────────────

  describe('GET /catalog', () => {
    it('should return report catalog with 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/catalog' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.categories).toBeDefined();
      expect(body.data.categories.length).toBe(6);
    });

    it('should include totalReports count', async () => {
      const res = await app.inject({ method: 'GET', url: '/catalog' });
      const body = JSON.parse(res.body);
      expect(body.data.totalReports).toBeGreaterThan(0);
    });
  });

  // ── GET /financial/:type ──────────────────────────────────

  describe('GET /financial/:type', () => {
    it('should return report data for free report', async () => {
      const res = await app.inject({ method: 'GET', url: '/financial/revenue_summary' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.locked).toBe(false);
      expect(body.data.reportType).toBe('revenue_summary');
    });

    it('should return locked response for paid report', async () => {
      const res = await app.inject({ method: 'GET', url: '/financial/outstanding_aging' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.locked).toBe(true);
      expect(body.data.module).toBe('advanced-analytics');
    });

    it('should return 404 for unknown report type', async () => {
      const res = await app.inject({ method: 'GET', url: '/financial/nonexistent' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /patients/:type ───────────────────────────────────

  describe('GET /patients/:type', () => {
    it('should return patient report data', async () => {
      const res = await app.inject({ method: 'GET', url: '/patients/patient_overview' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.category).toBe('patient');
    });

    it('should return 404 for unknown patient report', async () => {
      const res = await app.inject({ method: 'GET', url: '/patients/nonexistent' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /appointments/:type ───────────────────────────────

  describe('GET /appointments/:type', () => {
    it('should return appointment report data', async () => {
      const res = await app.inject({ method: 'GET', url: '/appointments/summary' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.category).toBe('appointment');
    });
  });

  // ── GET /clinical/:type ───────────────────────────────────

  describe('GET /clinical/:type', () => {
    it('should return clinical report data', async () => {
      const res = await app.inject({ method: 'GET', url: '/clinical/procedures_performed' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.category).toBe('clinical');
    });
  });

  // ── GET /operational/:type ────────────────────────────────

  describe('GET /operational/:type', () => {
    it('should return operational report data', async () => {
      const res = await app.inject({ method: 'GET', url: '/operational/wait_time_analysis' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.category).toBe('operational');
    });
  });

  // ── GET /inventory/:type ──────────────────────────────────

  describe('GET /inventory/:type', () => {
    it('should return inventory report data', async () => {
      const res = await app.inject({ method: 'GET', url: '/inventory/material_usage' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.category).toBe('inventory');
    });

    it('should return 404 for unknown inventory report', async () => {
      const res = await app.inject({ method: 'GET', url: '/inventory/nonexistent' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /export ──────────────────────────────────────────

  describe('POST /export', () => {
    it('should queue export and return 202', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          reportType: 'revenue_summary',
          format: 'csv',
        },
      });
      expect(res.statusCode).toBe(202);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe('pending');
      expect(body.data.historyId).toBeDefined();
    });
  });

  // ── GET /saved ────────────────────────────────────────────

  describe('GET /saved', () => {
    it('should return saved reports list', async () => {
      const res = await app.inject({ method: 'GET', url: '/saved' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.reports).toBeDefined();
    });
  });

  // ── POST /saved ───────────────────────────────────────────

  describe('POST /saved', () => {
    it('should create a saved report', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/saved',
        payload: {
          name: 'Monthly Revenue',
          reportType: 'revenue_summary',
          category: 'financial',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.report).toBeDefined();
    });
  });

  // ── DELETE /saved/:id ─────────────────────────────────────

  describe('DELETE /saved/:id', () => {
    it('should delete a saved report', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/saved/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for not found', async () => {
      mockSavedFindOneAndDelete.mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'DELETE',
        url: '/saved/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /scheduled ────────────────────────────────────────

  describe('GET /scheduled', () => {
    it('should return schedules list', async () => {
      const res = await app.inject({ method: 'GET', url: '/scheduled' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.schedules).toBeDefined();
    });
  });

  // ── POST /scheduled ───────────────────────────────────────

  describe('POST /scheduled', () => {
    it('should create a schedule', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/scheduled',
        payload: {
          name: 'Weekly Revenue',
          reportType: 'revenue_summary',
          category: 'financial',
          frequency: 'weekly',
          time: '08:00',
          timezone: 'UTC',
          deliveryMethod: 'in_app',
          recipients: ['user-1'],
          format: 'csv',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.schedule).toBeDefined();
    });
  });

  // ── DELETE /scheduled/:id ─────────────────────────────────

  describe('DELETE /scheduled/:id', () => {
    it('should delete a schedule', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/scheduled/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for not found', async () => {
      mockScheduleFindOneAndDelete.mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'DELETE',
        url: '/scheduled/507f1f77bcf86cd799439011',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /scheduled/:id/run ───────────────────────────────

  describe('POST /scheduled/:id/run', () => {
    it('should trigger manual run and return 202', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/scheduled/507f1f77bcf86cd799439011/run',
      });
      expect(res.statusCode).toBe(202);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe('pending');
    });

    it('should return 404 for not found schedule', async () => {
      mockScheduleFindOne.mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'POST',
        url: '/scheduled/507f1f77bcf86cd799439011/run',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /history ──────────────────────────────────────────

  describe('GET /history', () => {
    it('should return paginated history', async () => {
      const res = await app.inject({ method: 'GET', url: '/history' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.history).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBeDefined();
      expect(body.meta.limit).toBeDefined();
      expect(body.meta.total).toBeDefined();
    });

    it('should accept page and limit query params', async () => {
      const res = await app.inject({ method: 'GET', url: '/history?page=2&limit=10' });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Middleware ─────────────────────────────────────────────

  describe('Middleware', () => {
    it('should apply auth middleware', async () => {
      const { authGuard } = await import('../../middleware/index.js');
      await app.inject({ method: 'GET', url: '/catalog' });
      expect(authGuard).toHaveBeenCalled();
    });

    it('should apply roleGuard to category endpoints', async () => {
      const { roleGuard } = await import('../../middleware/index.js');
      expect(roleGuard).toHaveBeenCalledWith('reports', 'read');
    });
  });

  // ── Response Format ───────────────────────────────────────

  describe('Response Format', () => {
    it('should return standard API response envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/catalog' });
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });
  });
});

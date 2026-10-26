/**
 * Report Scheduler Service — Unit Tests
 *
 * Tests: startReportScheduler (repeatable job registration),
 * startReportSchedulerWorker (worker creation), worker processor behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (available inside vi.mock factories) ──────

const {
  mockQueueAdd,
  mockWorkerProcessor,
  mockScheduleFind,
  mockScheduleUpdateOne,
  mockHistoryCreate,
  mockQueueExport,
} = vi.hoisted(() => {
  let _processor: ((job: Record<string, unknown>) => Promise<void>) | null = null;
  return {
    mockQueueAdd: vi.fn().mockResolvedValue(undefined),
    mockWorkerProcessor: {
      capture: (fn: (job: Record<string, unknown>) => Promise<void>) => {
        _processor = fn;
      },
      run: (job: Record<string, unknown>) => _processor!(job),
      get: () => _processor,
    },
    mockScheduleFind: vi.fn(),
    mockScheduleUpdateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    mockHistoryCreate: vi.fn().mockResolvedValue({ _id: 'hist-1' }),
    mockQueueExport: vi.fn().mockResolvedValue(undefined),
  };
});

// ── BullMQ Mocks ────────────────────────────────────────────

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(function () {
    return {
      add: mockQueueAdd,
    };
  }),
  Worker: vi.fn().mockImplementation(function (_name: string, processor: unknown) {
    mockWorkerProcessor.capture(processor as (job: Record<string, unknown>) => Promise<void>);
    return { on: vi.fn() };
  }),
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      status: 'ready',
      disconnect: vi.fn(),
      quit: vi.fn(),
    };
  }),
}));

// ── Report Model Mocks ──────────────────────────────────────

vi.mock('../tenant/models/report.model.js', () => ({
  createReportScheduleModel: vi.fn(() => ({
    find: mockScheduleFind,
    updateOne: mockScheduleUpdateOne,
  })),
  createReportHistoryModel: vi.fn(() => ({
    create: mockHistoryCreate,
  })),
}));

vi.mock('./report-export.service.js', () => ({
  queueReportExport: mockQueueExport,
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../config/env.js', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' },
}));

vi.mock('mongoose', () => ({
  default: {
    connections: [] as unknown[],
  },
}));

// ── Import SUT ──────────────────────────────────────────────

import { startReportScheduler, startReportSchedulerWorker } from './report-scheduler.service.js';
import mongoose from 'mongoose';

// Helper to set mocked mongoose.connections without `any`
const setMockConnections = (conns: unknown[]) => {
  Object.defineProperty(mongoose, 'connections', {
    value: conns,
    writable: true,
    configurable: true,
  });
};

// ── Tests ───────────────────────────────────────────────────

describe('Report Scheduler Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default returns after clearAllMocks
    mockQueueAdd.mockResolvedValue(undefined);
    mockScheduleFind.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    mockScheduleUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockHistoryCreate.mockResolvedValue({ _id: 'hist-1' });
    mockQueueExport.mockResolvedValue(undefined);
    setMockConnections([]);
  });

  // ── startReportScheduler ────────────────────────────────

  describe('startReportScheduler', () => {
    it('should add a repeatable job every 5 minutes', async () => {
      await startReportScheduler();

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'check-due-reports',
        { type: 'check-due-reports' },
        expect.objectContaining({
          repeat: { pattern: '*/5 * * * *' },
        }),
      );
    });

    it('should capture a worker processor', async () => {
      await startReportScheduler();
      expect(mockWorkerProcessor.get()).toBeTypeOf('function');
    });
  });

  // ── startReportSchedulerWorker ──────────────────────────

  describe('startReportSchedulerWorker', () => {
    it('should register a worker processor', () => {
      startReportSchedulerWorker();
      expect(mockWorkerProcessor.get()).toBeTypeOf('function');
    });

    it('should skip processing when no tenant connections exist', async () => {
      startReportSchedulerWorker();
      await mockWorkerProcessor.run({ data: { type: 'check-due-reports' } });
      expect(mockQueueExport).not.toHaveBeenCalled();
    });

    it('should process due schedules for an active tenant', async () => {
      setMockConnections([{ readyState: 1, name: 'tenant_clinic-a' }]);

      const dueSchedule = {
        _id: 'sched-1',
        tenantId: 'tid-1',
        reportType: 'revenue_summary',
        category: 'financial',
        reportParams: { from: '2025-01-01' },
        format: 'csv',
        frequency: 'daily',
        time: '08:00',
        timezone: 'UTC',
        createdBy: 'user-1',
      };

      mockScheduleFind.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([dueSchedule]),
      });

      startReportSchedulerWorker();
      await mockWorkerProcessor.run({ data: { type: 'check-due-reports' } });

      expect(mockHistoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tid-1',
          reportType: 'revenue_summary',
          status: 'pending',
        }),
      );

      expect(mockQueueExport).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantSlug: 'clinic-a',
          reportType: 'revenue_summary',
          format: 'csv',
        }),
      );

      expect(mockScheduleUpdateOne).toHaveBeenCalledWith(
        { _id: 'sched-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            lastRunAt: expect.any(Date),
            nextRunAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should not queue exports for empty schedules', async () => {
      setMockConnections([
        { readyState: 1, name: 'tenant_clinic-a' },
        { readyState: 1, name: 'tenant_clinic-b' },
      ]);

      mockScheduleFind
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) });

      startReportSchedulerWorker();
      await mockWorkerProcessor.run({ data: { type: 'check-due-reports' } });

      expect(mockQueueExport).not.toHaveBeenCalled();
    });

    it('should skip non-active or non-tenant connections', async () => {
      setMockConnections([
        { readyState: 0, name: 'tenant_disconnected' },
        { readyState: 1, name: 'not_a_tenant_db' },
      ]);

      startReportSchedulerWorker();
      await mockWorkerProcessor.run({ data: { type: 'check-due-reports' } });

      expect(mockScheduleFind).not.toHaveBeenCalled();
    });

    it('should handle errors in one tenant without crashing', async () => {
      setMockConnections([
        { readyState: 1, name: 'tenant_broken' },
        { readyState: 1, name: 'tenant_healthy' },
      ]);

      mockScheduleFind
        .mockImplementationOnce(() => {
          throw new Error('DB error');
        })
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) });

      startReportSchedulerWorker();
      await expect(
        mockWorkerProcessor.run({ data: { type: 'check-due-reports' } }),
      ).resolves.not.toThrow();
    });

    it('daily schedule produces a future nextRunAt', async () => {
      setMockConnections([{ readyState: 1, name: 'tenant_d' }]);

      mockScheduleFind.mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([
          {
            _id: 's1',
            tenantId: 't1',
            reportType: 'revenue_summary',
            category: 'financial',
            reportParams: {},
            format: 'csv',
            frequency: 'daily',
            time: '06:00',
            timezone: 'UTC',
            createdBy: 'u1',
          },
        ]),
      });

      startReportSchedulerWorker();
      await mockWorkerProcessor.run({ data: { type: 'check-due-reports' } });

      expect(mockScheduleUpdateOne).toHaveBeenCalled();
      const call = mockScheduleUpdateOne.mock.calls[0];
      expect(call[1].$set.nextRunAt).toBeInstanceOf(Date);
      expect(call[1].$set.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});

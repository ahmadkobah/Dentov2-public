/**
 * CbctService — Unit Tests
 *
 * Tests CRUD operations, status transitions, scan/report updates,
 * timeline, unlinked query, and cross-linking/unlinking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CbctService } from './cbct.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockOrder = {
  _id: 'cbct-1',
  patientId: 'patient-1',
  requestingDoctorId: 'doctor-1',
  orderNumber: 'CBCT-2025-001',
  indication: 'Implant planning',
  priority: 'routine',
  status: 'requested',
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
  toObject: () => ({ ...mockOrder }),
  save: vi.fn().mockResolvedValue(undefined),
};

function chainable<T>(value: T) {
  const chain: Record<string, unknown> = {
    lean: vi.fn().mockResolvedValue(value),
    select: vi.fn(),
    populate: vi.fn(),
    sort: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  };
  for (const k of ['select', 'populate', 'sort', 'skip', 'limit']) {
    (chain[k] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  }
  return chain;
}

function createMockCbctModel() {
  return {
    find: vi.fn().mockImplementation(() => chainable([mockOrder])),
    findById: vi.fn().mockImplementation(() => chainable(mockOrder)),
    findByIdAndUpdate: vi.fn().mockImplementation(() => chainable(mockOrder)),
    findByIdAndDelete: vi.fn().mockResolvedValue(mockOrder),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ ...mockOrder, toObject: () => mockOrder }),
  };
}

function createMockTreatmentPlanModel() {
  return {
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
  };
}

function createMockProcedureNoteModel() {
  return {
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  };
}

// ── Mocks ──────────────────────────────────────────────────

let mockCbctModel: ReturnType<typeof createMockCbctModel>;
let mockTreatmentPlanModel: ReturnType<typeof createMockTreatmentPlanModel>;
let mockProcedureNoteModel: ReturnType<typeof createMockProcedureNoteModel>;

vi.mock('../models/cbct-order.model.js', () => ({
  getCbctOrderModel: () => mockCbctModel,
}));

vi.mock('../models/treatment-plan.model.js', () => ({
  getTreatmentPlanModel: () => mockTreatmentPlanModel,
}));

vi.mock('../models/procedure-note.model.js', () => ({
  getProcedureNoteModel: () => mockProcedureNoteModel,
}));

// Stub model getters used only for populate registration
vi.mock('../models/patient.model.js', () => ({
  getPatientModel: () => ({
    // Patient-name search pre-resolves matching IDs via find().select().lean()
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    }),
  }),
}));
vi.mock('../models/doctor.model.js', () => ({ getDoctorModel: () => ({}) }));
vi.mock('../models/branch.model.js', () => ({ getBranchModel: () => ({}) }));

// ── Tests ──────────────────────────────────────────────────

describe('CbctService', () => {
  let service: CbctService;
  const fakeConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCbctModel = createMockCbctModel();
    mockTreatmentPlanModel = createMockTreatmentPlanModel();
    mockProcedureNoteModel = createMockProcedureNoteModel();
    service = new CbctService(fakeConnection);
  });

  // ── list ───────────────────────────────────────────────

  describe('list', () => {
    it('should return paginated orders', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.orders).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      await service.list({
        page: 1,
        limit: 20,
        search: 'implant',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const filterArg = mockCbctModel.find.mock.calls[0]?.[0];
      expect(filterArg.$or).toBeDefined();
    });

    it('should filter by status', async () => {
      await service.list({
        page: 1,
        limit: 20,
        status: 'completed',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const filterArg = mockCbctModel.find.mock.calls[0]?.[0];
      expect(filterArg.status).toBe('completed');
    });
  });

  // ── getById ────────────────────────────────────────────

  describe('getById', () => {
    it('should return order by id', async () => {
      const result = await service.getById('cbct-1');
      expect(result._id).toBe('cbct-1');
    });

    it('should throw NotFound for nonexistent order', async () => {
      mockCbctModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('should create a new order', async () => {
      const data = {
        patientId: 'patient-1',
        requestingDoctorId: 'doctor-1',
        indication: 'Implant planning',
        priority: 'routine' as const,
      };

      const result = await service.create(data);
      expect(result).toBeDefined();
      expect(mockCbctModel.create).toHaveBeenCalledWith(data);
    });
  });

  // ── updateStatus ───────────────────────────────────────

  describe('updateStatus', () => {
    it('should transition from requested to scheduled', async () => {
      const saveable = {
        ...mockOrder,
        status: 'requested',
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockCbctModel.findById = vi.fn().mockResolvedValue(saveable);

      const result = await service.updateStatus('cbct-1', 'scheduled');
      expect(saveable.save).toHaveBeenCalled();
    });

    it('should reject invalid transition', async () => {
      const saveable = { ...mockOrder, status: 'cancelled', save: vi.fn() };
      mockCbctModel.findById = vi.fn().mockResolvedValue(saveable);

      await expect(service.updateStatus('cbct-1', 'completed')).rejects.toThrow(
        /Cannot transition/,
      );
    });

    it('should set completedAt when completing', async () => {
      const saveable = {
        ...mockOrder,
        status: 'scheduled',
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockCbctModel.findById = vi.fn().mockResolvedValue(saveable);

      await service.updateStatus('cbct-1', 'completed');
      expect(saveable.completedAt).toBeDefined();
    });
  });

  // ── updateScan / updateReport ──────────────────────────

  describe('updateScan', () => {
    it('should update scan data', async () => {
      const scanData = { scannerModel: 'Planmeca ProMax', voxelSize: '0.15mm' };
      await service.updateScan('cbct-1', scanData);

      expect(mockCbctModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'cbct-1',
        { $set: { scan: scanData } },
        { new: true, runValidators: true },
      );
    });
  });

  describe('updateReport', () => {
    it('should update report data', async () => {
      const reportData = { findings: 'Normal', impression: 'No anomalies' };
      await service.updateReport('cbct-1', reportData);

      expect(mockCbctModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'cbct-1',
        { $set: { report: reportData } },
        { new: true, runValidators: true },
      );
    });
  });

  // ── delete ─────────────────────────────────────────────

  describe('delete', () => {
    it('should delete order in "requested" status', async () => {
      mockCbctModel.findById = vi.fn().mockResolvedValue({ ...mockOrder, status: 'requested' });

      const result = await service.delete('cbct-1');
      expect(result.message).toBe('CBCT Order deleted');
    });

    it('should reject deletion of non-requested orders', async () => {
      mockCbctModel.findById = vi.fn().mockResolvedValue({ ...mockOrder, status: 'completed' });

      await expect(service.delete('cbct-1')).rejects.toThrow(/Only orders in "requested" status/);
    });
  });

  // ── getPatientTimeline ─────────────────────────────────

  describe('getPatientTimeline', () => {
    it('should return sorted patient orders', async () => {
      const result = await service.getPatientTimeline('patient-1');
      expect(result).toHaveLength(1);
      expect(mockCbctModel.find).toHaveBeenCalledWith({ patientId: 'patient-1' });
    });
  });

  // ── getUnlinked ────────────────────────────────────────

  describe('getUnlinked', () => {
    it('should return unlinked orders', async () => {
      const result = await service.getUnlinked('patient-1');
      expect(result).toHaveLength(1);
      expect(mockCbctModel.find).toHaveBeenCalledWith({
        patientId: 'patient-1',
        treatmentPlanId: { $exists: false },
        procedureNoteId: { $exists: false },
      });
    });
  });

  // ── linkToTarget ───────────────────────────────────────

  describe('linkToTarget', () => {
    it('should link to treatment plan', async () => {
      const saveable = { ...mockOrder, save: vi.fn().mockResolvedValue(undefined) };
      mockCbctModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockOrder) });

      await service.linkToTarget('cbct-1', 'treatmentPlan', 'tp-1');
      expect(saveable.save).toHaveBeenCalled();
      expect(mockTreatmentPlanModel.findByIdAndUpdate).toHaveBeenCalledWith('tp-1', {
        $addToSet: { linkedCbcts: 'cbct-1' },
      });
    });

    it('should link to procedure note', async () => {
      const saveable = { ...mockOrder, save: vi.fn().mockResolvedValue(undefined) };
      mockCbctModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockOrder) });

      await service.linkToTarget('cbct-1', 'procedureNote', 'pn-1');
      expect(mockProcedureNoteModel.findByIdAndUpdate).toHaveBeenCalledWith('pn-1', {
        $addToSet: { linkedCbcts: 'cbct-1' },
      });
    });

    it('should throw NotFound if order does not exist', async () => {
      mockCbctModel.findById = vi.fn().mockResolvedValue(null);

      await expect(service.linkToTarget('bad', 'treatmentPlan', 'tp-1')).rejects.toThrow(ApiError);
    });
  });

  // ── unlinkFromTarget ───────────────────────────────────

  describe('unlinkFromTarget', () => {
    it('should unlink from treatment plan', async () => {
      const saveable = {
        ...mockOrder,
        treatmentPlanItemId: undefined,
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockCbctModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockOrder) });

      await service.unlinkFromTarget('cbct-1', 'treatmentPlan', 'tp-1');
      expect(mockTreatmentPlanModel.findByIdAndUpdate).toHaveBeenCalledWith('tp-1', {
        $pull: { linkedCbcts: 'cbct-1' },
      });
    });

    it('should unlink from procedure note', async () => {
      const saveable = { ...mockOrder, save: vi.fn().mockResolvedValue(undefined) };
      mockCbctModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockOrder) });

      await service.unlinkFromTarget('cbct-1', 'procedureNote', 'pn-1');
      expect(mockProcedureNoteModel.findByIdAndUpdate).toHaveBeenCalledWith('pn-1', {
        $pull: { linkedCbcts: 'cbct-1' },
      });
    });
  });
});

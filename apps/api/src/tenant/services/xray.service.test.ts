/**
 * XrayService — Unit Tests
 *
 * Tests CRUD operations, timeline/tooth queries, unlinked query,
 * and cross-linking/unlinking to treatment plans & procedure notes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XrayService } from './xray.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Factories ─────────────────────────────────────────

const mockXray = {
  _id: 'xray-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  xrayType: 'periapical',
  toothNumbers: ['14'],
  title: 'Upper right molar',
  imageUrl: 'https://s3.example.com/xray-1.jpg',
  capturedAt: new Date('2025-01-15'),
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
  toObject: () => ({ ...mockXray }),
  save: vi.fn().mockResolvedValue(undefined),
};

function createMockXrayModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockXray]),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockXray),
    }),
    findByIdAndUpdate: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockXray),
    }),
    findByIdAndDelete: vi.fn().mockResolvedValue(mockXray),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ ...mockXray, toObject: () => mockXray }),
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

let mockXrayModel: ReturnType<typeof createMockXrayModel>;
let mockTreatmentPlanModel: ReturnType<typeof createMockTreatmentPlanModel>;
let mockProcedureNoteModel: ReturnType<typeof createMockProcedureNoteModel>;

vi.mock('../models/xray.model.js', () => ({
  getXrayModel: () => mockXrayModel,
}));

vi.mock('../models/treatment-plan.model.js', () => ({
  getTreatmentPlanModel: () => mockTreatmentPlanModel,
}));

vi.mock('../models/procedure-note.model.js', () => ({
  getProcedureNoteModel: () => mockProcedureNoteModel,
}));

vi.mock('../models/patient.model.js', () => ({
  getPatientModel: () => ({
    // Patient-name search pre-resolves matching IDs via find().select().lean()
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    }),
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      lean: vi.fn().mockResolvedValue(null),
    }),
  }),
}));

// ── Test Suite ─────────────────────────────────────────────

describe('XrayService', () => {
  let service: XrayService;
  const fakeConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    mockXrayModel = createMockXrayModel();
    mockTreatmentPlanModel = createMockTreatmentPlanModel();
    mockProcedureNoteModel = createMockProcedureNoteModel();
    service = new XrayService(fakeConnection);
  });

  // ── list ───────────────────────────────────────────────

  describe('list', () => {
    it('should return paginated xrays', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.xrays).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockXrayModel.find).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      await service.list({
        page: 1,
        limit: 20,
        search: 'molar',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const filterArg = mockXrayModel.find.mock.calls[0]?.[0];
      expect(filterArg.$or).toBeDefined();
      expect(filterArg.$or).toHaveLength(3);
    });

    it('should filter by patientId', async () => {
      await service.list({
        page: 1,
        limit: 20,
        patientId: 'patient-1',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const filterArg = mockXrayModel.find.mock.calls[0]?.[0];
      expect(filterArg.patientId).toBe('patient-1');
    });
  });

  // ── getById ────────────────────────────────────────────

  describe('getById', () => {
    it('should return xray by id', async () => {
      const result = await service.getById('xray-1');
      expect(result).toBeDefined();
      expect(result._id).toBe('xray-1');
    });

    it('should throw NotFound when xray does not exist', async () => {
      mockXrayModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('should create a new xray', async () => {
      const data = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        xrayType: 'periapical' as const,
        toothNumbers: ['14'],
        title: 'Test xray',
        imageUrl: 'https://s3.example.com/test.jpg',
      };

      const result = await service.create(data);
      expect(result).toBeDefined();
      expect(mockXrayModel.create).toHaveBeenCalledWith(data);
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('should update and return xray', async () => {
      const result = await service.update('xray-1', { title: 'Updated title' });
      expect(result).toBeDefined();
      expect(mockXrayModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'xray-1',
        { $set: { title: 'Updated title' } },
        { new: true, runValidators: true },
      );
    });

    it('should throw NotFound for nonexistent xray', async () => {
      mockXrayModel.findByIdAndUpdate = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.update('nonexistent', { title: 'test' })).rejects.toThrow(ApiError);
    });
  });

  // ── delete ─────────────────────────────────────────────

  describe('delete', () => {
    it('should delete xray', async () => {
      mockXrayModel.findById = vi.fn().mockResolvedValue(mockXray);

      const result = await service.delete('xray-1');
      expect(result.message).toBe('X-Ray deleted');
      expect(mockXrayModel.findByIdAndDelete).toHaveBeenCalledWith('xray-1');
    });

    it('should throw NotFound for nonexistent xray', async () => {
      mockXrayModel.findById = vi.fn().mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── getPatientTimeline ─────────────────────────────────

  describe('getPatientTimeline', () => {
    it('should return sorted patient xrays', async () => {
      mockXrayModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockXray]),
        }),
      });

      const result = await service.getPatientTimeline('patient-1');
      expect(result).toHaveLength(1);
      expect(mockXrayModel.find).toHaveBeenCalledWith({ patientId: 'patient-1' });
    });
  });

  // ── getByToothNumber ───────────────────────────────────

  describe('getByToothNumber', () => {
    it('should return xrays for tooth number', async () => {
      mockXrayModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockXray]),
        }),
      });

      const result = await service.getByToothNumber('patient-1', '14');
      expect(result).toHaveLength(1);
      expect(mockXrayModel.find).toHaveBeenCalledWith({
        patientId: 'patient-1',
        toothNumbers: '14',
      });
    });
  });

  // ── getUnlinked ────────────────────────────────────────

  describe('getUnlinked', () => {
    it('should return unlinked xrays', async () => {
      mockXrayModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockXray]),
        }),
      });

      const result = await service.getUnlinked('patient-1');
      expect(result).toHaveLength(1);
      expect(mockXrayModel.find).toHaveBeenCalledWith({
        patientId: 'patient-1',
        treatmentPlanId: { $exists: false },
        procedureNoteId: { $exists: false },
      });
    });
  });

  // ── linkToTarget ───────────────────────────────────────

  describe('linkToTarget', () => {
    it('should link xray to treatment plan', async () => {
      const saveable = { ...mockXray, save: vi.fn().mockResolvedValue(undefined) };
      mockXrayModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockXray) });

      const result = await service.linkToTarget('xray-1', 'treatmentPlan', 'tp-1');
      expect(saveable.save).toHaveBeenCalled();
      expect(mockTreatmentPlanModel.findByIdAndUpdate).toHaveBeenCalledWith('tp-1', {
        $addToSet: { linkedXrays: 'xray-1' },
      });
    });

    it('should link xray to procedure note with purpose', async () => {
      const saveable = { ...mockXray, save: vi.fn().mockResolvedValue(undefined) };
      mockXrayModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockXray) });

      await service.linkToTarget('xray-1', 'procedureNote', 'pn-1', { purpose: 'preOp' });
      expect(mockProcedureNoteModel.findByIdAndUpdate).toHaveBeenCalledWith('pn-1', {
        $addToSet: { preOpXrays: 'xray-1' },
      });
    });

    it('should throw NotFound if xray does not exist', async () => {
      mockXrayModel.findById = vi.fn().mockResolvedValue(null);

      await expect(service.linkToTarget('bad', 'treatmentPlan', 'tp-1')).rejects.toThrow(ApiError);
    });
  });

  // ── unlinkFromTarget ───────────────────────────────────

  describe('unlinkFromTarget', () => {
    it('should unlink xray from treatment plan', async () => {
      const saveable = {
        ...mockXray,
        treatmentPlanItemId: undefined,
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockXrayModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockXray) });

      await service.unlinkFromTarget('xray-1', 'treatmentPlan', 'tp-1');
      expect(saveable.save).toHaveBeenCalled();
      expect(mockTreatmentPlanModel.findByIdAndUpdate).toHaveBeenCalledWith('tp-1', {
        $pull: { linkedXrays: 'xray-1' },
      });
    });

    it('should unlink xray from procedure note (pulls from all arrays)', async () => {
      const saveable = { ...mockXray, save: vi.fn().mockResolvedValue(undefined) };
      mockXrayModel.findById = vi
        .fn()
        .mockResolvedValueOnce(saveable)
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(mockXray) });

      await service.unlinkFromTarget('xray-1', 'procedureNote', 'pn-1');
      expect(mockProcedureNoteModel.findByIdAndUpdate).toHaveBeenCalledWith('pn-1', {
        $pull: {
          linkedXrays: 'xray-1',
          preOpXrays: 'xray-1',
          postOpXrays: 'xray-1',
        },
      });
    });
  });
});

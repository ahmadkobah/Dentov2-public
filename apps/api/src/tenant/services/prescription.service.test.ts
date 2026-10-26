/**
 * PrescriptionService — Unit Tests
 *
 * Tests CRUD, status transitions, and deletion restrictions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrescriptionService } from './prescription.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockPrescription = {
  _id: 'rx-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  prescriptionNumber: 'RX-2025-001',
  diagnosis: 'Post-extraction pain',
  status: 'draft',
  items: [
    {
      medicationName: 'Amoxicillin',
      dosage: '500mg',
      frequency: '3 times daily',
      duration: '7 days',
      quantity: 21,
    },
  ],
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
  toObject: () => ({ ...mockPrescription }),
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

function createMockPrescriptionModel() {
  return {
    find: vi.fn().mockImplementation(() => chainable([mockPrescription])),
    findById: vi.fn().mockImplementation(() => chainable(mockPrescription)),
    findByIdAndUpdate: vi.fn().mockImplementation(() => chainable(mockPrescription)),
    findByIdAndDelete: vi.fn().mockResolvedValue(mockPrescription),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({
      ...mockPrescription,
      toObject: () => mockPrescription,
    }),
  };
}

// ── Mocks ──────────────────────────────────────────────────

let mockModel: ReturnType<typeof createMockPrescriptionModel>;

vi.mock('../models/prescription.model.js', () => ({
  getPrescriptionModel: () => mockModel,
}));

// Stub model getters used for populate registration / safety checks
const mockPatientModel = {
  // Patient-name search pre-resolves matching patient IDs via find().select().lean()
  find: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  }),
  findById: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    lean: vi.fn().mockResolvedValue(null),
  }),
};
const mockMedicationModel = {
  find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
};
vi.mock('../models/patient.model.js', () => ({ getPatientModel: () => mockPatientModel }));
vi.mock('../models/medication.model.js', () => ({ getMedicationModel: () => mockMedicationModel }));

// Stub side-effect services
vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('./audit-log.service.js', () => ({
  AuditLogService: vi.fn().mockImplementation(function () {
    return { log: vi.fn().mockResolvedValue(undefined) };
  }),
}));
vi.mock('../../services/notification.service.js', () => ({
  NotificationService: vi.fn().mockImplementation(function () {
    return {
      send: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

// ── Tests ──────────────────────────────────────────────────

describe('PrescriptionService', () => {
  let service: PrescriptionService;
  const fakeConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModel = createMockPrescriptionModel();
    service = new PrescriptionService(fakeConnection);
  });

  // ── list ───────────────────────────────────────────────

  describe('list', () => {
    it('should return paginated prescriptions', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.prescriptions).toHaveLength(1);
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
        search: 'extraction',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const filterArg = mockModel.find.mock.calls[0]?.[0];
      expect(filterArg.$or).toBeDefined();
    });

    it('should filter by patientId', async () => {
      await service.list({
        page: 1,
        limit: 20,
        patientId: 'patient-1',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const filterArg = mockModel.find.mock.calls[0]?.[0];
      expect(filterArg.patientId).toBe('patient-1');
    });

    it('should filter by status', async () => {
      await service.list({
        page: 1,
        limit: 20,
        status: 'active',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const filterArg = mockModel.find.mock.calls[0]?.[0];
      expect(filterArg.status).toBe('active');
    });
  });

  // ── getById ────────────────────────────────────────────

  describe('getById', () => {
    it('should return prescription by id', async () => {
      const result = await service.getById('rx-1');
      expect(result.prescriptionNumber).toBe('RX-2025-001');
    });

    it('should throw NotFound for nonexistent prescription', async () => {
      mockModel.findById = vi.fn().mockImplementation(() => chainable(null));

      await expect(service.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('should create a new prescription', async () => {
      const data = {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        diagnosis: 'Tooth infection',
        items: [
          {
            medicationName: 'Amoxicillin',
            dosage: '500mg',
            frequency: '3 times daily',
            duration: '7 days',
            quantity: 21,
          },
        ],
      };

      const result = await service.create(data);
      expect(result).toBeDefined();
      expect(mockModel.create).toHaveBeenCalledWith(data);
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('should update prescription', async () => {
      await service.update('rx-1', { diagnosis: 'Updated diagnosis' });
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'rx-1',
        { $set: { diagnosis: 'Updated diagnosis' } },
        { new: true, runValidators: true },
      );
    });

    it('should throw NotFound for nonexistent prescription', async () => {
      mockModel.findByIdAndUpdate = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.update('nonexistent', { diagnosis: 'test' })).rejects.toThrow(ApiError);
    });
  });

  // ── updateStatus ───────────────────────────────────────

  describe('updateStatus', () => {
    it('should transition from draft to active', async () => {
      const saveable = {
        ...mockPrescription,
        status: 'draft',
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockModel.findById = vi.fn().mockResolvedValue(saveable);

      const result = await service.updateStatus('rx-1', 'active');
      expect(saveable.save).toHaveBeenCalled();
    });

    it('should transition from active to dispensed', async () => {
      const saveable = {
        ...mockPrescription,
        status: 'active',
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockModel.findById = vi.fn().mockResolvedValue(saveable);

      await service.updateStatus('rx-1', 'dispensed');
      expect(saveable.save).toHaveBeenCalled();
    });

    it('should reject invalid status transition', async () => {
      const saveable = { ...mockPrescription, status: 'dispensed', save: vi.fn() };
      mockModel.findById = vi.fn().mockResolvedValue(saveable);

      await expect(service.updateStatus('rx-1', 'draft')).rejects.toThrow(/Cannot transition/);
    });

    it('should reject transition from cancelled', async () => {
      const saveable = { ...mockPrescription, status: 'cancelled', save: vi.fn() };
      mockModel.findById = vi.fn().mockResolvedValue(saveable);

      await expect(service.updateStatus('rx-1', 'active')).rejects.toThrow(/Cannot transition/);
    });

    it('should throw NotFound for nonexistent prescription', async () => {
      mockModel.findById = vi.fn().mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', 'active')).rejects.toThrow(ApiError);
    });
  });

  // ── delete ─────────────────────────────────────────────

  describe('delete', () => {
    it('should delete draft prescription', async () => {
      mockModel.findById = vi.fn().mockResolvedValue({ ...mockPrescription, status: 'draft' });

      const result = await service.delete('rx-1');
      expect(result.message).toBe('Prescription deleted');
      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('rx-1');
    });

    it('should reject deletion of active prescriptions', async () => {
      mockModel.findById = vi.fn().mockResolvedValue({ ...mockPrescription, status: 'active' });

      await expect(service.delete('rx-1')).rejects.toThrow(/Only draft prescriptions/);
    });

    it('should throw NotFound for nonexistent prescription', async () => {
      mockModel.findById = vi.fn().mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(ApiError);
    });
  });
});

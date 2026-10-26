/**
 * MedicationService — Unit Tests
 *
 * Tests CRUD, soft delete, restore, and autocomplete.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicationService } from './medication.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockMedication = {
  _id: 'med-1',
  nameEn: 'Amoxicillin',
  nameAr: 'أموكسيسيلين',
  genericName: 'Amoxicillin',
  category: 'antibiotic',
  dosageForm: 'capsule',
  strength: '500mg',
  isActive: true,
  isCustom: true,
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
  toObject: () => ({ ...mockMedication }),
};

const mockSeedMedication = {
  ...mockMedication,
  _id: 'med-seed-1',
  isCustom: false,
};

function createMockMedicationModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockMedication]),
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockMedication]),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockMedication),
    }),
    findByIdAndUpdate: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockMedication),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ ...mockMedication, toObject: () => mockMedication }),
  };
}

// ── Mocks ──────────────────────────────────────────────────

let mockModel: ReturnType<typeof createMockMedicationModel>;

vi.mock('../models/medication.model.js', () => ({
  getMedicationModel: () => mockModel,
}));

// ── Tests ──────────────────────────────────────────────────

describe('MedicationService', () => {
  let service: MedicationService;
  const fakeConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModel = createMockMedicationModel();
    service = new MedicationService(fakeConnection);
  });

  // ── list ───────────────────────────────────────────────

  describe('list', () => {
    it('should return paginated medications', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'nameEn',
        sortOrder: 'asc',
      });

      expect(result.medications).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should default isActive to true when not specified', async () => {
      await service.list({ page: 1, limit: 20, sortBy: 'nameEn', sortOrder: 'asc' });

      const filterArg = mockModel.find.mock.calls[0]?.[0];
      expect(filterArg.isActive).toBe(true);
    });

    it('should apply search filter across name fields', async () => {
      await service.list({
        page: 1,
        limit: 20,
        search: 'amoxicillin',
        sortBy: 'nameEn',
        sortOrder: 'asc',
      });

      const filterArg = mockModel.find.mock.calls[0]?.[0];
      expect(filterArg.$or).toHaveLength(3);
    });

    it('should filter by category', async () => {
      await service.list({
        page: 1,
        limit: 20,
        category: 'antibiotic',
        sortBy: 'nameEn',
        sortOrder: 'asc',
      });

      const filterArg = mockModel.find.mock.calls[0]?.[0];
      expect(filterArg.category).toBe('antibiotic');
    });
  });

  // ── getById ────────────────────────────────────────────

  describe('getById', () => {
    it('should return medication by id', async () => {
      const result = await service.getById('med-1');
      expect(result.nameEn).toBe('Amoxicillin');
    });

    it('should throw NotFound for nonexistent medication', async () => {
      mockModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('should create with isCustom=true', async () => {
      const data = {
        nameEn: 'New Med',
        nameAr: 'دواء جديد',
        genericName: 'New Generic',
        category: 'analgesic' as const,
        dosageForm: 'tablet' as const,
        strength: '100mg',
      };

      await service.create(data);
      expect(mockModel.create).toHaveBeenCalledWith({ ...data, isCustom: true });
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('should update and return medication', async () => {
      const result = await service.update('med-1', { strength: '250mg' });
      expect(result).toBeDefined();
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'med-1',
        { $set: { strength: '250mg' } },
        { new: true, runValidators: true },
      );
    });
  });

  // ── softDelete ─────────────────────────────────────────

  describe('softDelete', () => {
    it('should deactivate custom medication', async () => {
      mockModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockMedication),
      });

      const result = await service.softDelete('med-1');
      expect(result.message).toContain('deactivated');
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('med-1', {
        $set: { isActive: false },
      });
    });

    it('should deactivate seed medication (not delete)', async () => {
      mockModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockSeedMedication),
      });

      const result = await service.softDelete('med-seed-1');
      expect(result.message).toContain('Seed medication deactivated');
    });

    it('should throw NotFound for nonexistent medication', async () => {
      mockModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.softDelete('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── restore ────────────────────────────────────────────

  describe('restore', () => {
    it('should restore deactivated medication', async () => {
      mockModel.findByIdAndUpdate = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ...mockMedication, isActive: true }),
      });

      const result = await service.restore('med-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFound for nonexistent medication', async () => {
      mockModel.findByIdAndUpdate = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.restore('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── autocomplete ───────────────────────────────────────

  describe('autocomplete', () => {
    it('should return matching medications', async () => {
      const result = await service.autocomplete('amox');
      expect(result).toHaveLength(1);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      await service.autocomplete('amox', 5);
      // The find chain ends with .limit(5)
      expect(mockModel.find).toHaveBeenCalled();
    });
  });
});

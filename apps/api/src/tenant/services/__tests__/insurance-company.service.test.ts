/**
 * InsuranceCompanyService — Unit Tests
 *
 * Tests CRUD operations, code uniqueness, soft deactivation,
 * and company statistics aggregation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsuranceCompanyService } from '../insurance-company.service.js';
import { ApiError } from '../../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockCompany = {
  _id: 'company-1',
  name: { en: 'Al-Amal Insurance', ar: 'تأمين الأمل' },
  code: 'AMAL-001',
  contactPerson: 'Ahmed Ali',
  phone: '+20-123-456-7890',
  email: 'contact@alamal.com',
  coveragePercentage: 80,
  maxCoverage: 50000,
  isActive: true,
  createdAt: new Date('2026-01-10'),
  updatedAt: new Date('2026-01-10'),
};

function createSaveableCompany(overrides: Record<string, unknown> = {}) {
  return {
    ...mockCompany,
    ...overrides,
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn().mockReturnValue({ ...mockCompany, ...overrides }),
  };
}

function createMockInsuranceCompanyModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockCompany]),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockCompany),
    }),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue(createSaveableCompany()),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/insurance-company.model.js', () => ({
  getInsuranceCompanyModel: vi.fn(() => createMockInsuranceCompanyModel()),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InsuranceCompanyService', () => {
  let service: InsuranceCompanyService;
  const mockConnection = { models: {} } as unknown as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InsuranceCompanyService(mockConnection);
  });

  // ── list ───────────────────────────────────────────────

  describe('list', () => {
    it('should return paginated companies', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
      expect(result.companies).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        search: 'Amal',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
      expect(result.companies).toBeDefined();
    });

    it('should filter by isActive', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        isActive: true,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
    });
  });

  // ── getById ────────────────────────────────────────────

  describe('getById', () => {
    it('should return company by ID', async () => {
      const result = await service.getById('company-1');
      expect(result).toBeDefined();
      expect(result.code).toBe('AMAL-001');
    });

    it('should throw NotFound for missing company', async () => {
      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const svc = new InsuranceCompanyService(mockConnection);
      await expect(svc.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('should create a new insurance company', async () => {
      const result = await service.create({
        name: { en: 'Al-Amal Insurance', ar: 'تأمين الأمل' },
        code: 'AMAL-001',
        coveragePercentage: 80,
        maxCoverage: 50000,
      });

      expect(result).toBeDefined();
      expect(result.code).toBe('AMAL-001');
    });

    it('should reject duplicate code', async () => {
      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockCompany),
        }),
      });

      const svc = new InsuranceCompanyService(mockConnection);
      await expect(
        svc.create({
          name: { en: 'Duplicate', ar: 'مكرر' },
          code: 'AMAL-001',
          coveragePercentage: 50,
        }),
      ).rejects.toThrow("Insurance company with code 'AMAL-001' already exists");
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('should update company fields', async () => {
      const saveable = createSaveableCompany();
      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceCompanyService(mockConnection);
      const result = await svc.update('company-1', {
        coveragePercentage: 90,
        maxCoverage: 60000,
      });

      expect(saveable.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject duplicate code on update', async () => {
      const saveable = createSaveableCompany({ code: 'AMAL-001' });
      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findById: vi.fn().mockResolvedValue(saveable),
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: 'other-company', code: 'TAKEN-001' }),
        }),
      });

      const svc = new InsuranceCompanyService(mockConnection);
      await expect(svc.update('company-1', { code: 'TAKEN-001' })).rejects.toThrow(
        "Insurance company with code 'TAKEN-001' already exists",
      );
    });

    it('should throw NotFound for missing company', async () => {
      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findById: vi.fn().mockResolvedValue(null),
      });

      const svc = new InsuranceCompanyService(mockConnection);
      await expect(svc.update('nonexistent', { coveragePercentage: 50 })).rejects.toThrow(ApiError);
    });
  });

  // ── deactivate ─────────────────────────────────────────

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const saveable = createSaveableCompany({ isActive: true });
      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceCompanyService(mockConnection);
      const result = await svc.deactivate('company-1');

      expect(saveable.isActive).toBe(false);
      expect(saveable.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFound for missing company', async () => {
      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findById: vi.fn().mockResolvedValue(null),
      });

      const svc = new InsuranceCompanyService(mockConnection);
      await expect(svc.deactivate('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  // ── getCompanyStats ────────────────────────────────────

  describe('getCompanyStats', () => {
    it('should return company with empty claimStats when model unavailable', async () => {
      const result = await service.getCompanyStats('company-1');

      expect(result).toBeDefined();
      expect(result.company).toBeDefined();
      expect(result.claimStats).toEqual([]);
    });

    it('should return aggregated claim statistics', async () => {
      const mockStats = [
        { _id: 'approved', count: 5, totalAmount: 10000, approvedAmount: 8000 },
        { _id: 'pending', count: 3, totalAmount: 6000, approvedAmount: 0 },
      ];

      const connWithClaim = {
        models: {
          InsuranceClaim: {
            aggregate: vi.fn().mockResolvedValue(mockStats),
          },
        },
      } as unknown as Connection;

      const { getInsuranceCompanyModel } = await import('../../models/insurance-company.model.js');
      (getInsuranceCompanyModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInsuranceCompanyModel(),
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockCompany),
        }),
      });

      const svc = new InsuranceCompanyService(connWithClaim);
      const result = await svc.getCompanyStats('company-1');

      expect(result.company).toBeDefined();
      expect(result.claimStats).toHaveLength(2);
      expect(result.claimStats[0].count).toBe(5);
    });
  });
});

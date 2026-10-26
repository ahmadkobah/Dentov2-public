/**
 * CommissionService — Unit Tests
 *
 * Tests commission list, calculateFromInvoice, bulk-approve,
 * and payout creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommissionService } from './commission.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('./webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock Data ──────────────────────────────────────────────

const mockCommission = {
  _id: 'comm-1',
  doctorId: 'dr-1',
  invoiceId: 'inv-1',
  procedureName: 'Root Canal',
  procedureAmount: 2000,
  commissionRate: 0.15,
  commissionAmount: 300,
  status: 'pending',
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
};

const mockInvoice = {
  _id: 'inv-1',
  items: [
    { description: 'Root Canal', quantity: 1, unitPrice: 2000, total: 2000 },
    { description: 'X-Ray', quantity: 1, unitPrice: 200, total: 200 },
  ],
  appointmentId: 'apt-1',
  totalAmount: 2200,
};

const mockPayout = {
  _id: 'payout-1',
  payoutNumber: 'PAY-001',
  doctorId: 'dr-1',
  commissionIds: ['comm-1', 'comm-2'],
  totalAmount: 600,
  paymentMethod: 'bank_transfer',
  status: 'draft',
  save: vi.fn().mockResolvedValue(undefined),
};

// ── Model factories ────────────────────────────────────────

function createMockCommissionModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockCommission]),
          }),
        }),
      }),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockCommission),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    insertMany: vi.fn().mockResolvedValue([
      { ...mockCommission, _id: 'comm-new-1' },
      {
        ...mockCommission,
        _id: 'comm-new-2',
        procedureName: 'X-Ray',
        procedureAmount: 200,
        commissionAmount: 30,
      },
    ]),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    aggregate: vi.fn().mockResolvedValue([
      {
        byStatus: [{ _id: 'pending', count: 1, totalAmount: 300 }],
        topProcedures: [{ _id: 'Root Canal', count: 1, totalAmount: 300 }],
        overall: [{ totalCommissions: 1, totalAmount: 300, avgRate: 0.15 }],
      },
    ]),
  };
}

function createMockPayoutModel() {
  return {
    create: vi.fn().mockResolvedValue(mockPayout),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockPayout]),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockPayout),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  };
}

function createMockInvoiceModel() {
  return {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockInvoice),
    }),
  };
}

// ── Mock Connection ────────────────────────────────────────

function createMockConnection(): Connection {
  const commissionModel = createMockCommissionModel();
  const payoutModel = createMockPayoutModel();
  const invoiceModel = createMockInvoiceModel();

  return {
    model: vi.fn((name: string) => {
      switch (name) {
        case 'DoctorCommission':
          return commissionModel;
        case 'CommissionPayout':
          return payoutModel;
        case 'Invoice':
          return invoiceModel;
        default:
          return {};
      }
    }),
    models: {
      DoctorCommission: commissionModel,
      CommissionPayout: payoutModel,
      Invoice: invoiceModel,
    },
  } as unknown as Connection;
}

// ── Tests ──────────────────────────────────────────────────

describe('CommissionService', () => {
  let service: CommissionService;
  let db: Connection;

  beforeEach(() => {
    db = createMockConnection();
    service = new CommissionService(db);
  });

  describe('list', () => {
    it('should return paginated commissions', async () => {
      const result = await service.list({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('should return a commission by ID', async () => {
      const result = await service.getById('comm-1');
      expect(result._id).toBe('comm-1');
    });
  });

  describe('calculateFromInvoice', () => {
    it('should create commissions from invoice items', async () => {
      // Pre-configure find to return empty (no existing commissions)
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        lean: vi.fn().mockResolvedValue([]),
      });

      const result = await service.calculateFromInvoice('inv-1', 'dr-1', 0.15);
      expect(result).toHaveLength(2);
    });

    it('should reject invalid commission rate', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      await expect(service.calculateFromInvoice('inv-1', 'dr-1', 1.5)).rejects.toThrow();
    });
  });

  describe('approveCommissions', () => {
    it('should bulk approve pending commissions', async () => {
      // Override find to return pending commissions
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockResolvedValue([{ _id: 'comm-1', status: 'pending' }]);

      const result = await service.approveCommissions({ ids: ['comm-1'] }, 'user-1');
      expect(result.approvedCount).toBe(1);
    });

    it('should reject approval of non-pending commissions', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockResolvedValue([{ _id: 'comm-1', status: 'paid' }]);

      await expect(service.approveCommissions({ ids: ['comm-1'] }, 'user-1')).rejects.toThrow();
    });
  });

  // ── getById — edge cases ──────────────────────────────

  describe('getById — not found', () => {
    it('should throw ApiError when commission not found', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.getById('nonexistent')).rejects.toThrow('Commission not found');
    });
  });

  // ── calculateFromInvoice — idempotency ────────────────

  describe('calculateFromInvoice — idempotent', () => {
    it('should return existing commissions without creating new ones', async () => {
      // find returns existing commissions
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockCommission]),
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([mockCommission]),
            }),
          }),
        }),
      });

      const result = await service.calculateFromInvoice('inv-1', 'dr-1', 0.15);
      expect(result).toHaveLength(1);
      expect(commModel.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('calculateFromInvoice — invoice not found', () => {
    it('should throw when invoice does not exist', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const invoiceModel = db.models.Invoice as unknown as ReturnType<
        typeof createMockInvoiceModel
      >;
      invoiceModel.findById = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(service.calculateFromInvoice('inv-999', 'dr-1', 0.15)).rejects.toThrow(
        'Invoice not found',
      );
    });
  });

  describe('calculateFromInvoice — zero rate', () => {
    it('should create commissions with zero amounts at rate 0', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });
      commModel.insertMany = vi
        .fn()
        .mockResolvedValue([{ ...mockCommission, commissionRate: 0, commissionAmount: 0 }]);

      const result = await service.calculateFromInvoice('inv-1', 'dr-1', 0);
      expect(result).toHaveLength(1);
    });
  });

  // ── createPayout ──────────────────────────────────────

  describe('createPayout', () => {
    it('should create payout and transition commissions to paid', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockResolvedValue([
        { _id: 'comm-1', commissionAmount: 300 },
        { _id: 'comm-2', commissionAmount: 300 },
      ]);

      const result = await service.createPayout(
        {
          doctorId: 'dr-1',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          paymentMethod: 'bank_transfer',
        },
        'user-1',
      );

      expect(result._id).toBe('payout-1');
      expect(commModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $in: ['comm-1', 'comm-2'] } }),
        expect.objectContaining({ $set: expect.objectContaining({ status: 'paid' }) }),
      );
    });

    it('should throw when no approved commissions found', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockResolvedValue([]);

      await expect(
        service.createPayout(
          {
            doctorId: 'dr-1',
            periodStart: '2026-01-01',
            periodEnd: '2026-01-31',
            paymentMethod: 'bank_transfer',
          },
          'user-1',
        ),
      ).rejects.toThrow('No approved commissions found');
    });

    it('should calculate total amount correctly (rounded)', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      commModel.find = vi.fn().mockResolvedValue([
        { _id: 'c1', commissionAmount: 100.333 },
        { _id: 'c2', commissionAmount: 200.667 },
      ]);

      const payoutModel = db.models.CommissionPayout as unknown as ReturnType<
        typeof createMockPayoutModel
      >;
      payoutModel.create = vi.fn().mockResolvedValue({ ...mockPayout, totalAmount: 301 });

      await service.createPayout(
        {
          doctorId: 'dr-1',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          paymentMethod: 'cash',
        },
        'user-1',
      );

      expect(payoutModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 301 }),
      );
    });
  });

  // ── listPayouts ───────────────────────────────────────

  describe('listPayouts', () => {
    it('should return paginated payouts', async () => {
      const result = await service.listPayouts({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply doctorId filter when provided', async () => {
      const payoutModel = db.models.CommissionPayout as unknown as ReturnType<
        typeof createMockPayoutModel
      >;
      await service.listPayouts({ page: 1, limit: 20, doctorId: 'dr-1' });
      expect(payoutModel.find).toHaveBeenCalledWith(expect.objectContaining({ doctorId: 'dr-1' }));
    });
  });

  // ── getDoctorSummary ──────────────────────────────────

  describe('getDoctorSummary', () => {
    it('should return aggregated summary for doctor', async () => {
      const result = await service.getDoctorSummary('dr-1', {});
      expect(result.doctorId).toBe('dr-1');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('topProcedures');
      expect(result).toHaveProperty('overall');
    });
  });

  // ── getCommissionReport ───────────────────────────────

  describe('getCommissionReport', () => {
    it('should return admin-level commission report', async () => {
      const result = await service.getCommissionReport({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should pass date filters to aggregate pipeline', async () => {
      const commModel = db.models.DoctorCommission as unknown as ReturnType<
        typeof createMockCommissionModel
      >;
      await service.getCommissionReport({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        doctorId: 'dr-1',
      });
      expect(commModel.aggregate).toHaveBeenCalled();
    });
  });
});

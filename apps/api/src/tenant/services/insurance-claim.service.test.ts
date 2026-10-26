/**
 * InsuranceClaimService — Unit Tests
 *
 * Tests list, getById, create, updateStatus (transitions),
 * attachDocument, removeDocument, and getAgingReport.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsuranceClaimService } from './insurance-claim.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockClaim = {
  _id: 'claim-1',
  claimNumber: 'CLM-2026-00001',
  patientId: 'pat-1',
  invoiceId: 'inv-1',
  insuranceCompanyId: 'ins-1',
  claimedAmount: 1500,
  totalAmount: 2000,
  approvedAmount: 0,
  patientResponsibility: 0,
  status: 'submitted',
  claimDate: new Date('2026-01-15'),
  serviceDate: new Date('2026-01-10'),
  documents: [],
  createdBy: 'user-1',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn().mockReturnThis(),
};

const mockInvoice = {
  _id: 'inv-1',
  invoiceNumber: 'INV-0001',
  totalAmount: 2000,
};

// ── Model factories ────────────────────────────────────────

function createMockClaimModel() {
  return {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([mockClaim]),
              }),
            }),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockClaim),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({
      ...mockClaim,
      toObject: () => mockClaim,
    }),
    aggregate: vi.fn().mockResolvedValue([
      { _id: 0, count: 3, totalAmount: 4500, claims: [] },
      { _id: 30, count: 2, totalAmount: 3000, claims: [] },
      { _id: 60, count: 1, totalAmount: 800, claims: [] },
    ]),
  };
}

function createMockInvoiceModel() {
  return {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockInvoice),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue(mockInvoice),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('./webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../models/insurance-claim.model.js', () => ({
  getInsuranceClaimModel: vi.fn(() => createMockClaimModel()),
}));

vi.mock('../models/invoice.model.js', () => ({
  getInvoiceModel: vi.fn(() => createMockInvoiceModel()),
}));

vi.mock('@dento/shared', async () => {
  const actual = await vi.importActual('@dento/shared');
  return {
    ...actual,
    VALID_INSURANCE_CLAIM_STATUS_TRANSITIONS: {
      submitted: ['under_review', 'approved', 'partially_approved', 'denied'],
      under_review: ['approved', 'partially_approved', 'denied'],
      approved: [],
      partially_approved: ['appealed'],
      denied: ['appealed'],
      appealed: ['under_review', 'approved', 'partially_approved', 'denied'],
    },
  };
});

// ── Tests ──────────────────────────────────────────────────

describe('InsuranceClaimService', () => {
  let service: InsuranceClaimService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InsuranceClaimService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated claims', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.claims).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply status filter', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        status: 'submitted',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(result).toBeDefined();
    });

    it('should apply date range filter', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(result).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return a claim by ID', async () => {
      const result = await service.getById('claim-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFound for missing claim', async () => {
      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const svc = new InsuranceClaimService(mockConnection);
      await expect(svc.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should create a claim with submitted status', async () => {
      const result = await service.create(
        {
          patientId: 'pat-1',
          invoiceId: 'inv-1',
          insuranceCompanyId: 'ins-1',
          claimedAmount: 1500,
          totalAmount: 2000,
          claimDate: '2026-01-15',
          serviceDate: '2026-01-10',
          diagnosisCode: 'D001',
          treatmentDescription: 'Root canal treatment',
        },
        'user-1',
      );
      expect(result).toBeDefined();
    });

    it('should reject if claimed amount exceeds total', async () => {
      await expect(
        service.create(
          {
            patientId: 'pat-1',
            invoiceId: 'inv-1',
            insuranceCompanyId: 'ins-1',
            claimedAmount: 3000,
            totalAmount: 2000,
            claimDate: '2026-01-15',
            serviceDate: '2026-01-10',
            diagnosisCode: 'D001',
            treatmentDescription: 'Root canal treatment',
          },
          'user-1',
        ),
      ).rejects.toThrow('Claimed amount cannot exceed total amount');
    });

    it('should reject if invoice does not exist', async () => {
      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
        findByIdAndUpdate: vi.fn(),
      });

      const svc = new InsuranceClaimService(mockConnection);
      await expect(
        svc.create(
          {
            patientId: 'pat-1',
            invoiceId: 'bad-id',
            insuranceCompanyId: 'ins-1',
            claimedAmount: 1500,
            totalAmount: 2000,
            claimDate: '2026-01-15',
            serviceDate: '2026-01-10',
            diagnosisCode: 'D001',
            treatmentDescription: 'Root canal',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('updateStatus', () => {
    it('should approve a submitted claim with approvedAmount', async () => {
      const saveable = {
        ...mockClaim,
        status: 'submitted',
        totalAmount: 2000,
        save: vi.fn().mockResolvedValue(undefined),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      const result = await svc.updateStatus(
        'claim-1',
        { status: 'approved', approvedAmount: 1500 },
        'user-1',
      );

      expect(result.status).toBe('approved');
      expect(result.approvedAmount).toBe(1500);
      expect(result.patientResponsibility).toBe(500);
    });

    it('should deny a claim requiring denialReason', async () => {
      const saveable = {
        ...mockClaim,
        status: 'submitted',
        totalAmount: 2000,
        save: vi.fn().mockResolvedValue(undefined),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      const result = await svc.updateStatus(
        'claim-1',
        { status: 'denied', denialReason: 'Pre-existing condition' },
        'user-1',
      );

      expect(result.status).toBe('denied');
      expect(result.denialReason).toBe('Pre-existing condition');
      expect(result.approvedAmount).toBe(0);
      expect(result.patientResponsibility).toBe(2000);
    });

    it('should reject denial without reason', async () => {
      const saveable = {
        ...mockClaim,
        status: 'submitted',
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      await expect(svc.updateStatus('claim-1', { status: 'denied' }, 'user-1')).rejects.toThrow(
        'Denial reason is required',
      );
    });

    it('should reject approval without approvedAmount', async () => {
      const saveable = {
        ...mockClaim,
        status: 'submitted',
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      await expect(svc.updateStatus('claim-1', { status: 'approved' }, 'user-1')).rejects.toThrow(
        'Approved amount is required',
      );
    });

    it('should reject invalid status transition', async () => {
      const approvedClaim = {
        ...mockClaim,
        status: 'approved',
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(approvedClaim),
      });

      const svc = new InsuranceClaimService(mockConnection);
      await expect(svc.updateStatus('claim-1', { status: 'submitted' }, 'user-1')).rejects.toThrow(
        'Cannot transition',
      );
    });
  });

  describe('attachDocument', () => {
    it('should attach a PDF document', async () => {
      const saveable = {
        ...mockClaim,
        documents: [] as unknown[],
        save: vi.fn().mockResolvedValue(undefined),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      const result = await svc.attachDocument('claim-1', {
        name: 'referral.pdf',
        url: '/uploads/referral.pdf',
        type: 'application/pdf',
      });

      expect(result.documents).toHaveLength(1);
    });

    it('should reject non-PDF documents', async () => {
      const saveable = {
        ...mockClaim,
        documents: [],
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      await expect(
        svc.attachDocument('claim-1', {
          name: 'image.png',
          url: '/uploads/image.png',
          type: 'image/png',
        }),
      ).rejects.toThrow('Only PDF documents are allowed');
    });
  });

  describe('removeDocument', () => {
    it('should remove a document by ID', async () => {
      const saveable = {
        ...mockClaim,
        documents: [
          { _id: 'doc-1', name: 'test.pdf', url: '/uploads/test.pdf', type: 'application/pdf' },
        ],
        save: vi.fn().mockResolvedValue(undefined),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      const result = await svc.removeDocument('claim-1', 'doc-1');
      expect(result.documents).toHaveLength(0);
    });

    it('should throw NotFound for missing document', async () => {
      const saveable = {
        ...mockClaim,
        documents: [],
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInsuranceClaimModel } = await import('../models/insurance-claim.model.js');
      (getInsuranceClaimModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockClaimModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InsuranceClaimService(mockConnection);
      await expect(svc.removeDocument('claim-1', 'nonexistent')).rejects.toThrow();
    });
  });

  describe('getAgingReport', () => {
    it('should return aging buckets from aggregation', async () => {
      const result = await service.getAgingReport({});
      expect(result.aging).toBeDefined();
      expect(result.asOfDate).toBeDefined();
      expect(result.aging.length).toBeGreaterThan(0);
    });

    it('should use provided asOfDate', async () => {
      const result = await service.getAgingReport({ asOfDate: '2026-06-01' });
      expect(result.asOfDate).toBe('2026-06-01T00:00:00.000Z');
    });
  });
});

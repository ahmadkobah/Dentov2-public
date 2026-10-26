/**
 * InvoiceService — Unit Tests
 *
 * Tests CRUD operations, status transitions, payment reconciliation,
 * and generate from treatment plan.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceService } from './invoice.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockInvoice = {
  _id: 'inv-1',
  invoiceNumber: 'INV-2026-00001',
  patientId: 'patient-1',
  branchId: 'branch-1',
  items: [
    {
      description: 'Root Canal Treatment',
      quantity: 1,
      unitPrice: 500,
      discount: 0,
      total: 500,
    },
  ],
  subtotal: 500,
  discountAmount: 0,
  discountPercentage: 0,
  taxAmount: 0,
  taxPercentage: 0,
  totalAmount: 500,
  amountPaid: 0,
  balanceDue: 500,
  status: 'draft',
  createdBy: 'user-1',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  save: vi.fn().mockResolvedValue(undefined),
};

function createMockInvoiceModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([mockInvoice]),
            }),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockInvoice),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ ...mockInvoice }),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../models/invoice.model.js', () => ({
  getInvoiceModel: vi.fn(() => createMockInvoiceModel()),
}));

vi.mock('../models/settings.model.js', () => ({
  getSettingsModel: vi.fn(() => ({})),
}));

vi.mock('../models/treatment-plan.model.js', () => ({
  getTreatmentPlanModel: vi.fn(() => ({
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'plan-1',
        patientId: 'patient-1',
        items: [
          {
            _id: 'item-1',
            description: 'Root Canal',
            quantity: 1,
            unitPrice: 500,
            cost: 500,
            discount: 0,
          },
        ],
      }),
    }),
  })),
}));

vi.mock('./webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InvoiceService', () => {
  let service: InvoiceService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InvoiceService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated invoices', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
      expect(result.invoices).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        status: 'draft',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return invoice by ID', async () => {
      const result = await service.getById('inv-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFound for missing invoice', async () => {
      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const svc = new InvoiceService(mockConnection);
      await expect(svc.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should create an invoice with recalculated totals', async () => {
      const result = await service.create(
        {
          patientId: 'patient-1',
          branchId: 'branch-1',
          items: [
            {
              description: 'Root Canal',
              quantity: 1,
              unitPrice: 500,
              discount: 0,
              total: 500,
            },
          ],
          subtotal: 500,
          totalAmount: 500,
          status: 'draft',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.invoiceNumber).toBe('INV-2026-00001');
    });
  });

  // ── #86: tax/discount of 0 must be honored (not treated as unset) ──────
  describe('tax/discount explicit zero (#86)', () => {
    /** Invoice model whose `create` echoes the persisted document back. */
    function echoingInvoiceModel() {
      return {
        ...createMockInvoiceModel(),
        create: vi.fn((doc: Record<string, unknown>) =>
          Promise.resolve({ _id: 'inv-1', invoiceNumber: 'INV-2026-00001', ...doc }),
        ),
      };
    }

    /** Settings model returning a clinic default of 15% tax. */
    function clinicWithTax() {
      return {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ value: { taxEnabled: true, taxPercentage: 15 } }),
        }),
      };
    }

    const baseInput = {
      patientId: 'patient-1',
      branchId: 'branch-1',
      items: [{ description: 'Cleaning', quantity: 1, unitPrice: 500, discount: 0, total: 500 }],
      subtotal: 500,
      totalAmount: 500,
      status: 'draft' as const,
    };

    it('create: honors an explicit taxPercentage of 0 (does not consult clinic default)', async () => {
      const { getInvoiceModel } = await import('../models/invoice.model.js');
      const { getSettingsModel } = await import('../models/settings.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce(echoingInvoiceModel());

      const svc = new InvoiceService(mockConnection);
      const result = (await svc.create(
        { ...baseInput, taxPercentage: 0 },
        'user-1',
      )) as unknown as {
        taxPercentage: number;
        taxAmount: number;
        totalAmount: number;
      };

      // Explicit 0 must skip the clinic-default lookup entirely and stay tax-exempt.
      expect(getSettingsModel).not.toHaveBeenCalled();
      expect(result.taxPercentage).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });

    it('create: falls back to the clinic default tax when taxPercentage is omitted', async () => {
      const { getInvoiceModel } = await import('../models/invoice.model.js');
      const { getSettingsModel } = await import('../models/settings.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce(echoingInvoiceModel());
      (getSettingsModel as ReturnType<typeof vi.fn>).mockReturnValueOnce(clinicWithTax());

      const svc = new InvoiceService(mockConnection);
      const result = (await svc.create(baseInput, 'user-1')) as unknown as {
        taxPercentage: number;
        taxAmount: number;
        totalAmount: number;
      };

      expect(result.taxPercentage).toBe(15);
      expect(result.taxAmount).toBe(75);
      expect(result.totalAmount).toBe(575);
    });

    it('update: setting taxPercentage to 0 zeroes the previously-stored tax amount', async () => {
      const draft = {
        ...mockInvoice,
        status: 'draft' as const,
        discountPercentage: 0,
        discountAmount: 0,
        taxPercentage: 10,
        taxAmount: 50,
        amountPaid: 0,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(draft),
      });

      const svc = new InvoiceService(mockConnection);
      const result = (await svc.update(
        'inv-1',
        {
          items: [
            { description: 'Cleaning', quantity: 1, unitPrice: 500, discount: 0, total: 500 },
          ],
          taxPercentage: 0,
        },
        'user-1',
      )) as unknown as { taxPercentage: number; taxAmount: number; totalAmount: number };

      expect(result.taxPercentage).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });

    it('update: setting discountPercentage to 0 zeroes the previously-stored discount', async () => {
      const draft = {
        ...mockInvoice,
        status: 'draft' as const,
        discountPercentage: 10,
        discountAmount: 50,
        taxPercentage: 0,
        taxAmount: 0,
        amountPaid: 0,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(draft),
      });

      const svc = new InvoiceService(mockConnection);
      const result = (await svc.update(
        'inv-1',
        {
          items: [
            { description: 'Cleaning', quantity: 1, unitPrice: 500, discount: 0, total: 500 },
          ],
          discountPercentage: 0,
        },
        'user-1',
      )) as unknown as { discountPercentage: number; discountAmount: number; totalAmount: number };

      expect(result.discountPercentage).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });

    it('update: an explicit taxPercentage recomputes the tax amount from the new subtotal', async () => {
      const draft = {
        ...mockInvoice,
        status: 'draft' as const,
        discountPercentage: 0,
        discountAmount: 0,
        taxPercentage: 0,
        taxAmount: 0,
        amountPaid: 0,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(draft),
      });

      const svc = new InvoiceService(mockConnection);
      const result = (await svc.update(
        'inv-1',
        {
          items: [
            { description: 'Cleaning', quantity: 1, unitPrice: 500, discount: 0, total: 500 },
          ],
          taxPercentage: 20,
        },
        'user-1',
      )) as unknown as { taxPercentage: number; taxAmount: number; totalAmount: number };

      expect(result.taxPercentage).toBe(20);
      expect(result.taxAmount).toBe(100);
      expect(result.totalAmount).toBe(600);
    });
  });

  describe('generateFromTreatmentPlan', () => {
    it('should generate invoice from treatment plan items', async () => {
      const result = await service.generateFromTreatmentPlan(
        {
          treatmentPlanId: 'plan-1',
          branchId: 'branch-1',
        },
        'user-1',
      );

      expect(result).toBeDefined();
    });
  });

  describe('recordPayment', () => {
    it('should update amountPaid and balanceDue', async () => {
      // Create a direct mock for findById returning a saveable object
      const saveable = {
        ...mockInvoice,
        totalAmount: 500,
        amountPaid: 0,
        balanceDue: 500,
        status: 'issued',
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InvoiceService(mockConnection);
      const result = await svc.recordPayment('inv-1', 200);

      expect(result.amountPaid).toBe(200);
      expect(result.balanceDue).toBe(300);
      expect(result.status).toBe('partially_paid');
    });

    it('should set status to paid when fully paid', async () => {
      const saveable = {
        ...mockInvoice,
        totalAmount: 500,
        amountPaid: 0,
        balanceDue: 500,
        status: 'issued',
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InvoiceService(mockConnection);
      const result = await svc.recordPayment('inv-1', 500);

      expect(result.status).toBe('paid');
      expect(result.balanceDue).toBe(0);
      expect(result.paidAt).toBeDefined();
    });
  });

  describe('status transitions', () => {
    it('should not allow editing non-draft invoices', async () => {
      const issuedInvoice = { ...mockInvoice, status: 'issued' };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(issuedInvoice),
      });

      const svc = new InvoiceService(mockConnection);
      await expect(svc.update('inv-1', { notes: 'test' }, 'user-1')).rejects.toThrow(
        'Only draft invoices can be edited',
      );
    });

    it('should allow issuing a draft invoice', async () => {
      const draft = {
        ...mockInvoice,
        status: 'draft' as const,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(draft),
      });

      const svc = new InvoiceService(mockConnection);
      const result = await svc.issue('inv-1', 'user-1');

      expect(result.status).toBe('issued');
      expect(result.issueDate).toBeDefined();
    });

    it('should not allow issuing a paid invoice', async () => {
      const paid = {
        ...mockInvoice,
        status: 'paid' as const,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInvoiceModel(),
        findById: vi.fn().mockResolvedValue(paid),
      });

      const svc = new InvoiceService(mockConnection);
      await expect(svc.issue('inv-1', 'user-1')).rejects.toThrow();
    });
  });
});

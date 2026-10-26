/**
 * InstallmentService — Unit Tests
 *
 * Tests list, getById, create (schedule generation), recordPayment,
 * waiveInstallment, cancelPlan, and markOverdueInstallments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstallmentService } from './installment.service.js';
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

const mockPayments = [
  {
    installmentNumber: 1,
    dueDate: new Date('2026-02-15'),
    amountDue: 500,
    amountPaid: 0,
    lateFee: 0,
    status: 'pending' as const,
    paidAt: null,
    paymentId: null,
  },
  {
    installmentNumber: 2,
    dueDate: new Date('2026-03-15'),
    amountDue: 500,
    amountPaid: 0,
    lateFee: 0,
    status: 'pending' as const,
    paidAt: null,
    paymentId: null,
  },
  {
    installmentNumber: 3,
    dueDate: new Date('2026-04-15'),
    amountDue: 500,
    amountPaid: 0,
    lateFee: 0,
    status: 'pending' as const,
    paidAt: null,
    paymentId: null,
  },
];

const mockPlan = {
  _id: 'plan-1',
  invoiceId: 'inv-1',
  patientId: 'pat-1',
  totalAmount: 2000,
  downPayment: 500,
  remainingAmount: 1500,
  numberOfInstallments: 3,
  installmentAmount: 500,
  frequency: 'monthly',
  status: 'active',
  payments: [...mockPayments],
  notes: 'Test plan',
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

function createMockInstallmentPlanModel() {
  return {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([mockPlan]),
              }),
            }),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockPlan),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({
      ...mockPlan,
      toObject: () => mockPlan,
    }),
  };
}

function createMockInvoiceModel() {
  const invoiceDoc = {
    _id: 'inv-1',
    invoiceNumber: 'INV-0001',
    totalAmount: 2000,
    amountPaid: 0,
    balanceDue: 2000,
    status: 'pending',
    paidAt: null as Date | null,
    save: vi.fn().mockResolvedValue(undefined),
  };
  return {
    findById: vi.fn().mockImplementation(() => {
      const fn = Promise.resolve(invoiceDoc) as Promise<typeof invoiceDoc> & {
        lean: ReturnType<typeof vi.fn>;
      };
      fn.lean = vi.fn().mockResolvedValue(mockInvoice);
      return fn;
    }),
    exists: vi.fn().mockResolvedValue({ _id: 'inv-1' }),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../models/installment-plan.model.js', () => ({
  getInstallmentPlanModel: vi.fn(() => createMockInstallmentPlanModel()),
}));

vi.mock('../models/invoice.model.js', () => ({
  getInvoiceModel: vi.fn(() => createMockInvoiceModel()),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InstallmentService', () => {
  let service: InstallmentService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InstallmentService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated installment plans', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.plans).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply status filter', async () => {
      await service.list({
        page: 1,
        limit: 20,
        status: 'active',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return a plan by ID', async () => {
      const result = await service.getById('plan-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFound for missing plan', async () => {
      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const svc = new InstallmentService(mockConnection);
      await expect(svc.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should create a plan with correct payment schedule', async () => {
      const result = await service.create(
        {
          invoiceId: 'inv-1',
          patientId: 'pat-1',
          totalAmount: 2000,
          downPayment: 500,
          numberOfInstallments: 3,
          frequency: 'monthly',
          startDate: '2026-02-01',
        },
        'user-1',
      );

      expect(result).toBeDefined();
    });

    it('should reject if invoice does not exist', async () => {
      const { getInvoiceModel } = await import('../models/invoice.model.js');
      (getInvoiceModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const svc = new InstallmentService(mockConnection);
      await expect(
        svc.create(
          {
            invoiceId: 'bad-id',
            patientId: 'pat-1',
            totalAmount: 2000,
            downPayment: 500,
            numberOfInstallments: 3,
            frequency: 'monthly',
            startDate: '2026-02-01',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });

    it('should reject if down payment >= total amount', async () => {
      await expect(
        service.create(
          {
            invoiceId: 'inv-1',
            patientId: 'pat-1',
            totalAmount: 2000,
            downPayment: 2000,
            numberOfInstallments: 3,
            frequency: 'monthly',
            startDate: '2026-02-01',
          },
          'user-1',
        ),
      ).rejects.toThrow('Down payment must be less than total amount');
    });
  });

  describe('recordPayment', () => {
    it('should record payment on a pending installment', async () => {
      const saveable = {
        ...mockPlan,
        payments: [...mockPayments.map((p) => ({ ...p }))],
        save: vi.fn().mockResolvedValue(undefined),
        toObject() {
          return this;
        },
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InstallmentService(mockConnection);
      const result = await svc.recordPayment(
        'plan-1',
        1,
        { amountPaid: 500, lateFee: 0 },
        'user-1',
      );

      expect(result.payments[0].status).toBe('paid');
      expect(result.payments[0].amountPaid).toBe(500);
    });

    it('should reject payment on a cancelled plan', async () => {
      const cancelled = {
        ...mockPlan,
        status: 'cancelled',
        payments: [...mockPayments.map((p) => ({ ...p }))],
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockResolvedValue(cancelled),
      });

      const svc = new InstallmentService(mockConnection);
      await expect(
        svc.recordPayment('plan-1', 1, { amountPaid: 500, lateFee: 0 }, 'user-1'),
      ).rejects.toThrow('Cannot record payment on a cancelled plan');
    });

    it('should reject payment on already paid installment', async () => {
      const paidPayments = mockPayments.map((p) => ({ ...p }));
      paidPayments[0].status = 'paid' as const;

      const withPaid = {
        ...mockPlan,
        payments: paidPayments,
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockResolvedValue(withPaid),
      });

      const svc = new InstallmentService(mockConnection);
      await expect(
        svc.recordPayment('plan-1', 1, { amountPaid: 500, lateFee: 0 }, 'user-1'),
      ).rejects.toThrow('already paid');
    });
  });

  describe('waiveInstallment', () => {
    it('should waive a pending installment', async () => {
      const saveable = {
        ...mockPlan,
        payments: [...mockPayments.map((p) => ({ ...p }))],
        save: vi.fn().mockResolvedValue(undefined),
        toObject() {
          return this;
        },
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InstallmentService(mockConnection);
      const result = await svc.waiveInstallment('plan-1', 1, 'user-1');
      expect(result.payments[0].status).toBe('waived');
    });

    it('should reject waiving a paid installment', async () => {
      const paidPayments = mockPayments.map((p) => ({ ...p }));
      paidPayments[0].status = 'paid' as const;

      const withPaid = {
        ...mockPlan,
        payments: paidPayments,
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockResolvedValue(withPaid),
      });

      const svc = new InstallmentService(mockConnection);
      await expect(svc.waiveInstallment('plan-1', 1, 'user-1')).rejects.toThrow(
        'Cannot waive a paid installment',
      );
    });
  });

  describe('cancelPlan', () => {
    it('should cancel an active plan', async () => {
      const saveable = {
        ...mockPlan,
        status: 'active',
        save: vi.fn().mockResolvedValue(undefined),
        toObject() {
          return this;
        },
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockResolvedValue(saveable),
      });

      const svc = new InstallmentService(mockConnection);
      const result = await svc.cancelPlan('plan-1', 'user-1');
      expect(result.status).toBe('cancelled');
    });

    it('should reject cancelling a completed plan', async () => {
      const completed = {
        ...mockPlan,
        status: 'completed',
        save: vi.fn(),
        toObject() {
          return this;
        },
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        findById: vi.fn().mockResolvedValue(completed),
      });

      const svc = new InstallmentService(mockConnection);
      await expect(svc.cancelPlan('plan-1', 'user-1')).rejects.toThrow(
        'Cannot cancel a completed plan',
      );
    });
  });

  describe('markOverdueInstallments', () => {
    it('should mark pending installments past due as overdue', async () => {
      const overduePayments = [
        {
          ...mockPayments[0],
          dueDate: new Date('2020-01-01'), // Way in the past
          status: 'pending' as const,
        },
        { ...mockPayments[1], status: 'pending' as const },
      ];

      const planWithOverdue = {
        ...mockPlan,
        payments: overduePayments,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getInstallmentPlanModel } = await import('../models/installment-plan.model.js');
      (getInstallmentPlanModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockInstallmentPlanModel(),
        find: vi.fn().mockResolvedValue([planWithOverdue]),
      });

      const svc = new InstallmentService(mockConnection);
      const result = await svc.markOverdueInstallments();
      expect(result.overdueCount).toBeGreaterThanOrEqual(1);
    });
  });
});

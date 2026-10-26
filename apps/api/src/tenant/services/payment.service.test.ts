/**
 * PaymentService — Unit Tests
 *
 * Tests payment recording, refunds, reconciliation, and
 * auto-reconciliation with invoice updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './payment.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockPayment = {
  _id: 'pay-1',
  invoiceId: 'inv-1',
  patientId: 'patient-1',
  amount: 200,
  paymentMethod: 'cash',
  status: 'completed',
  receivedBy: 'user-1',
  receivedAt: new Date('2026-01-15'),
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  save: vi.fn().mockResolvedValue(undefined),
};

const mockReconciliation = {
  _id: 'recon-1',
  branchId: 'branch-1',
  reconciliationDate: new Date('2026-01-15'),
  openingBalance: 0,
  closingBalance: 500,
  cashReceived: 300,
  cardReceived: 200,
  onlineReceived: 0,
  insuranceReceived: 0,
  totalReceived: 500,
  expenses: 0,
  discrepancy: 0,
  status: 'open',
  createdBy: 'user-1',
  save: vi.fn().mockResolvedValue(undefined),
};

function createMockPaymentModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([mockPayment]),
              }),
            }),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockPayment),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ ...mockPayment }),
    aggregate: vi.fn().mockResolvedValue([
      { _id: 'cash', total: 300 },
      { _id: 'card', total: 200 },
    ]),
  };
}

function createMockReconciliationModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([mockReconciliation]),
            }),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockResolvedValue(mockReconciliation),
    findOne: vi.fn().mockResolvedValue(null),
    countDocuments: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ ...mockReconciliation }),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../models/payment.model.js', () => ({
  getTenantPaymentModel: vi.fn(() => createMockPaymentModel()),
}));

vi.mock('../models/reconciliation.model.js', () => ({
  getReconciliationModel: vi.fn(() => createMockReconciliationModel()),
}));

vi.mock('../models/invoice.model.js', () => ({
  getInvoiceModel: vi.fn(() => ({
    findById: vi.fn().mockResolvedValue({
      _id: 'inv-1',
      totalAmount: 500,
      amountPaid: 0,
      balanceDue: 500,
      status: 'issued',
      save: vi.fn().mockResolvedValue(undefined),
    }),
  })),
}));

vi.mock('../models/treatment-plan.model.js', () => ({
  getTreatmentPlanModel: vi.fn(() => ({})),
}));

vi.mock('../models/settings.model.js', () => ({
  getSettingsModel: vi.fn(() => ({})),
}));

vi.mock('./webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ──────────────────────────────────────────────────

describe('PaymentService', () => {
  let service: PaymentService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated payments', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
      expect(result.payments).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
    });

    it('should filter by payment method', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        paymentMethod: 'cash',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return payment by ID', async () => {
      const result = await service.getById('pay-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFound for missing payment', async () => {
      const { getTenantPaymentModel } = await import('../models/payment.model.js');
      (getTenantPaymentModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockPaymentModel(),
        findById: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const svc = new PaymentService(mockConnection);
      await expect(svc.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should record a payment and update invoice', async () => {
      const result = await service.create(
        {
          invoiceId: 'inv-1',
          patientId: 'patient-1',
          amount: 200,
          paymentMethod: 'cash',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.amount).toBe(200);
      expect(result.paymentMethod).toBe('cash');
    });
  });

  describe('refund', () => {
    it('should refund a completed payment', async () => {
      const completedPayment = {
        ...mockPayment,
        status: 'completed',
        invoiceId: { toString: () => 'inv-1' },
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getTenantPaymentModel } = await import('../models/payment.model.js');
      (getTenantPaymentModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockPaymentModel(),
        findById: vi.fn().mockResolvedValue(completedPayment),
      });

      const svc = new PaymentService(mockConnection);
      const result = await svc.refund('pay-1', { reason: 'Duplicate charge' }, 'user-1');

      expect(result.status).toBe('refunded');
      expect(result.refundReason).toBe('Duplicate charge');
    });

    it('should not refund an already refunded payment', async () => {
      const refunded = {
        ...mockPayment,
        status: 'refunded',
        save: vi.fn().mockResolvedValue(undefined),
      };

      const { getTenantPaymentModel } = await import('../models/payment.model.js');
      (getTenantPaymentModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockPaymentModel(),
        findById: vi.fn().mockResolvedValue(refunded),
      });

      const svc = new PaymentService(mockConnection);
      await expect(svc.refund('pay-1', { reason: 'Test' }, 'user-1')).rejects.toThrow(
        'Payment is already refunded',
      );
    });
  });

  describe('reconciliation', () => {
    it('should list reconciliations', async () => {
      const result = await service.listReconciliations({
        page: 1,
        limit: 20,
        sortBy: 'reconciliationDate',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
      expect(result.reconciliations).toBeDefined();
    });

    it('should open a reconciliation with payment aggregates', async () => {
      const result = await service.openReconciliation(
        {
          branchId: 'branch-1',
          reconciliationDate: '2026-01-15',
          openingBalance: 0,
        },
        'user-1',
      );

      expect(result).toBeDefined();
    });

    it('should not open duplicate reconciliation', async () => {
      const { getReconciliationModel } = await import('../models/reconciliation.model.js');
      (getReconciliationModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockReconciliationModel(),
        findOne: vi.fn().mockResolvedValue(mockReconciliation),
      });

      const svc = new PaymentService(mockConnection);
      await expect(
        svc.openReconciliation(
          {
            branchId: 'branch-1',
            reconciliationDate: '2026-01-15',
            openingBalance: 0,
          },
          'user-1',
        ),
      ).rejects.toThrow('Reconciliation already exists');
    });

    it('should close an open reconciliation', async () => {
      const result = await service.updateReconciliation(
        'recon-1',
        {
          status: 'closed',
          closingBalance: 500,
        },
        'user-1',
      );

      expect(result).toBeDefined();
    });
  });
});

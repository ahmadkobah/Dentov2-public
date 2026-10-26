import type { Connection, QueryFilter } from 'mongoose';
import type { ITenantPayment } from '../models/payment.model.js';
import { getTenantPaymentModel } from '../models/payment.model.js';
import { getReconciliationModel } from '../models/reconciliation.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { InvoiceService } from './invoice.service.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateTenantPaymentInput as CreatePaymentInput,
  PaymentQuery,
  RefundPaymentInput,
  CreateReconciliationInput,
  UpdateReconciliationInput,
  ReconciliationQuery,
} from '@dento/shared';
import { dispatchWebhook } from './webhook-dispatcher.js';
import { logger } from '../../utils/logger.js';
import { NotificationService } from '../../services/notification.service.js';

/**
 * Payment Service — Business logic for tenant-level payments
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Payments)
 * Per V2_DATABASE.md §5.8 — payments collection
 * Per V2_DATABASE.md §5.9 — reconciliation collection
 *
 * Handles:
 * - Record payment against invoice
 * - Auto-reconciliation (update invoice amountPaid/balanceDue/status)
 * - Refunds
 * - Daily reconciliation per branch
 * - Webhook dispatch for payment events
 */

export class PaymentService {
  private Payment;
  private Reconciliation;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';

    // Register referenced models on this tenant connection before populate() calls.
    // Without this, list/get can throw MissingSchemaError at runtime.
    // Guard for lightweight mocked tenantDb objects used in unit tests.
    if ((tenantDb as Partial<Connection>).models) {
      getInvoiceModel(tenantDb);
      getPatientModel(tenantDb);
    }

    this.Payment = getTenantPaymentModel(tenantDb);
    this.Reconciliation = getReconciliationModel(tenantDb);
  }

  // ── List Payments (paginated, filterable) ─────────────────

  async list(query: PaymentQuery) {
    const {
      page,
      limit,
      invoiceId,
      patientId,
      search,
      paymentMethod,
      status,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ITenantPayment> = {};

    if (invoiceId) filter.invoiceId = invoiceId;
    if (patientId) filter.patientId = patientId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { paymentReference: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [payments, total] = await Promise.all([
      this.Payment.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate('invoiceId', 'invoiceNumber totalAmount status')
        .populate('patientId', 'firstName lastName patientCode')
        .lean(),
      this.Payment.countDocuments(filter),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Payment by ID ─────────────────────────────────────

  async getById(id: string) {
    const payment = await this.Payment.findById(id)
      .populate('invoiceId', 'invoiceNumber totalAmount amountPaid balanceDue status')
      .populate('patientId', 'firstName lastName patientCode phone email')
      .lean();

    if (!payment) {
      throw ApiError.notFound('Payment');
    }

    return payment;
  }

  // ── Record Payment ────────────────────────────────────────

  async create(data: CreatePaymentInput, userId: string) {
    // Guard against over-payment BEFORE creating the Payment doc: the invoice model
    // clamps balanceDue at min:0 and its pre('save') recomputes it, so an over-balance
    // amount would otherwise throw a Mongoose ValidationError (500) from recordPayment
    // AFTER the Payment was already created — leaving an orphaned payment. Return 400.
    const Invoice = getInvoiceModel(this.tenantDb);
    const invoiceDoc = await Invoice.findById(data.invoiceId);
    if (!invoiceDoc) throw ApiError.notFound('Invoice');
    if (data.amount > invoiceDoc.balanceDue) {
      throw ApiError.badRequest(
        `Payment amount (${data.amount}) exceeds the invoice balance due (${invoiceDoc.balanceDue})`,
      );
    }

    // Create payment record
    const payment = await this.Payment.create({
      invoiceId: data.invoiceId,
      patientId: data.patientId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
      notes: data.notes,
      status: 'completed',
      receivedBy: userId,
      receivedAt: new Date(),
      createdBy: userId,
    });

    // Auto-reconciliation: Update invoice amounts
    const invoiceService = new InvoiceService(this.tenantDb);
    await invoiceService.recordPayment(data.invoiceId, data.amount);

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'payment.received',
        data: {
          paymentId: payment._id,
          invoiceId: payment.invoiceId,
          patientId: payment.patientId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch payment.received webhook');
    }

    // Send notification (fire-and-forget) — Phase 2.3 add patient recipient
    this.sendNotification('payment.received', {
      recipients: [{ userId }, { patientId: data.patientId }],
      variables: {
        amount: String(data.amount),
        paymentMethod: data.paymentMethod,
        invoiceId: data.invoiceId,
      },
      relatedEntity: { type: 'invoice' as const, id: data.invoiceId },
    });

    return payment;
  }

  // ── Refund Payment ────────────────────────────────────────

  async refund(id: string, data: RefundPaymentInput, userId: string) {
    const payment = await this.Payment.findById(id);
    if (!payment) throw ApiError.notFound('Payment');
    if (payment.status === 'refunded') {
      throw ApiError.badRequest('Payment is already refunded');
    }
    if (payment.status !== 'completed') {
      throw ApiError.badRequest('Only completed payments can be refunded');
    }

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.refundReason = data.reason;
    payment.refundedBy = userId as unknown as ITenantPayment['refundedBy'];
    await payment.save();

    // Reverse payment on invoice
    const invoiceService = new InvoiceService(this.tenantDb);
    await invoiceService.reversePayment(payment.invoiceId.toString(), payment.amount);

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'payment.refunded',
        data: {
          paymentId: payment._id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          reason: data.reason,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch payment.refunded webhook');
    }

    // Send notification (fire-and-forget) — Phase 2.3 add patient recipient
    this.sendNotification('payment.refunded', {
      recipients: [{ userId }, { patientId: payment.patientId.toString() }],
      variables: {
        amount: String(payment.amount),
        reason: data.reason || '',
        invoiceId: payment.invoiceId.toString(),
      },
      relatedEntity: { type: 'invoice' as const, id: payment.invoiceId.toString() },
    });

    return payment;
  }

  // ── Record Online Payment (from webhook) ──────────────────

  async recordOnlinePayment(
    invoiceId: string,
    patientId: string,
    amount: number,
    method: string,
    providerPaymentId: string,
    providerTransactionId: string,
    last4?: string,
    cardBrand?: string,
  ) {
    const payment = await this.Payment.create({
      invoiceId,
      patientId,
      amount,
      paymentMethod: method as ITenantPayment['paymentMethod'],
      status: 'completed',
      providerPaymentId,
      providerTransactionId,
      last4,
      cardBrand,
      receivedBy: patientId, // Online payments are self-service
      receivedAt: new Date(),
    });

    // Update invoice
    const invoiceService = new InvoiceService(this.tenantDb);
    await invoiceService.recordPayment(invoiceId, amount);

    return payment;
  }

  // ══════════════════════════════════════════════════════════
  // ── Reconciliation ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  // ── List Reconciliations ──────────────────────────────────

  async listReconciliations(query: ReconciliationQuery) {
    const { page, limit, branchId, status, dateFrom, dateTo, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<unknown> = {};

    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.reconciliationDate = {};
      if (dateFrom) filter.reconciliationDate.$gte = new Date(dateFrom);
      if (dateTo) filter.reconciliationDate.$lte = new Date(dateTo);
    }

    const [reconciliations, total] = await Promise.all([
      this.Reconciliation.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate('branchId', 'name')
        .lean(),
      this.Reconciliation.countDocuments(filter),
    ]);

    return {
      reconciliations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Open Reconciliation ───────────────────────────────────

  async openReconciliation(data: CreateReconciliationInput, userId: string) {
    // Check if reconciliation already exists for this branch+date
    const existing = await this.Reconciliation.findOne({
      branchId: data.branchId,
      reconciliationDate: new Date(data.reconciliationDate),
    });

    if (existing) {
      throw ApiError.conflict('Reconciliation already exists for this branch and date');
    }

    // Aggregate payments for the branch on this date
    // Payments link to invoices via invoiceId; invoices carry branchId
    const startOfDay = new Date(data.reconciliationDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(data.reconciliationDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Convert branchId to ObjectId for aggregation $lookup match
    const { Types } = await import('mongoose');
    let branchMatch: unknown;
    try {
      branchMatch = new Types.ObjectId(data.branchId);
    } catch {
      branchMatch = data.branchId; // fallback for non-ObjectId strings
    }

    const aggregation = await this.Payment.aggregate([
      {
        $match: {
          status: 'completed',
          receivedAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      // Join to invoices to filter by branchId
      {
        $lookup: {
          from: 'invoices',
          localField: 'invoiceId',
          foreignField: '_id',
          as: '_invoice',
        },
      },
      { $unwind: '$_invoice' },
      {
        $match: {
          '_invoice.branchId': branchMatch,
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totals: Record<string, number> = {};
    for (const row of aggregation) {
      totals[row._id] = row.total;
    }

    const cashReceived = totals.cash || 0;
    const cardReceived = (totals.card || 0) + (totals.meeza || 0);
    const onlineReceived = (totals.online || 0) + (totals.fawry || 0);
    const insuranceReceived = totals.insurance || 0;
    const totalReceived =
      cashReceived +
      cardReceived +
      onlineReceived +
      insuranceReceived +
      (totals.bank_transfer || 0) +
      (totals.cheque || 0);

    const reconciliation = await this.Reconciliation.create({
      branchId: data.branchId,
      reconciliationDate: new Date(data.reconciliationDate),
      openingBalance: data.openingBalance || 0,
      cashReceived,
      cardReceived,
      onlineReceived,
      insuranceReceived,
      totalReceived,
      closingBalance: (data.openingBalance || 0) + totalReceived,
      status: 'open',
      createdBy: userId,
    });

    return reconciliation;
  }

  // ── Close/Review Reconciliation ───────────────────────────

  async updateReconciliation(id: string, data: UpdateReconciliationInput, userId: string) {
    const reconciliation = await this.Reconciliation.findById(id);
    if (!reconciliation) throw ApiError.notFound('Reconciliation');

    if (data.closingBalance !== undefined) {
      reconciliation.closingBalance = data.closingBalance;
      reconciliation.discrepancy =
        data.closingBalance -
        (reconciliation.openingBalance +
          reconciliation.totalReceived -
          (data.expenses ?? reconciliation.expenses));
    }

    if (data.expenses !== undefined) reconciliation.expenses = data.expenses;
    if (data.notes !== undefined) reconciliation.notes = data.notes;

    if (data.status === 'closed' && reconciliation.status === 'open') {
      reconciliation.status = 'closed';
      reconciliation.closedBy = userId as unknown as typeof reconciliation.closedBy;
      reconciliation.closedAt = new Date();
    } else if (data.status === 'reviewed' && reconciliation.status === 'closed') {
      reconciliation.status = 'reviewed';
      reconciliation.reviewedBy = userId as unknown as typeof reconciliation.reviewedBy;
      reconciliation.reviewedAt = new Date();
    } else if (data.status && data.status !== reconciliation.status) {
      throw ApiError.badRequest(
        `Cannot transition reconciliation from "${reconciliation.status}" to "${data.status}". ` +
          'Flow: open → closed → reviewed',
      );
    }

    await reconciliation.save();
    return reconciliation;
  }

  /** Fire-and-forget notification via NotificationService */
  private sendNotification(
    templateKey: string,
    opts: {
      recipients: { userId?: string; patientId?: string; email?: string; phone?: string }[];
      variables: Record<string, string>;
      relatedEntity?: {
        type: 'appointment' | 'patient' | 'invoice' | 'walk_in' | 'treatment_plan' | 'stock_item';
        id: string;
      };
    },
  ): void {
    const svc = new NotificationService(this.tenantDb, this.tenantSlug);
    svc
      .send({
        templateKey,
        tenantId: this.tenantSlug,
        recipients: opts.recipients,
        variables: opts.variables,
        relatedEntity: opts.relatedEntity,
      })
      .catch((err) => {
        logger.warn(
          { templateKey, error: err instanceof Error ? err.message : 'unknown' },
          'Notification dispatch failed (non-fatal)',
        );
      });
  }
}

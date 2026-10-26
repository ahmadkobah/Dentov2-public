import type { Connection, QueryFilter, Types } from 'mongoose';
import type { IInstallmentPlan } from '../models/installment-plan.model.js';
import { getInstallmentPlanModel } from '../models/installment-plan.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateInstallmentPlanInput,
  UpdateInstallmentPlanInput,
  RecordInstallmentPaymentInput,
  InstallmentQuery,
} from '@dento/shared';
import { logger } from '../../utils/logger.js';
import { dispatchWebhook } from './webhook-dispatcher.js';

/**
 * Installment Plan Service — Business logic for installment plan CRUD
 *
 * Per V2_DATABASE.md §7.4 — installment_plans
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Installments)
 *
 * Handles:
 * - Create plans with auto-calculated payments schedule
 * - Record individual installment payments
 * - Waive installments
 * - Cancel plans
 * - Mark overdue installments (BullMQ cron candidate)
 * - Late fee application
 */

export class InstallmentService {
  private InstallmentPlan;
  private Invoice;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.InstallmentPlan = getInstallmentPlanModel(tenantDb);
    this.Invoice = getInvoiceModel(tenantDb);
  }

  // ── List Plans (paginated, filterable) ────────────────────

  async list(query: InstallmentQuery) {
    const { page, limit, search, status, patientId, startDate, endDate, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IInstallmentPlan> = {};

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      // patientId / invoiceId are referenced ObjectIds — a regex over the plan
      // collection can never match a patient's name or an invoice number, so
      // pre-resolve both and OR the matching ids in alongside notes.
      const invoiceDocs = (await this.Invoice.find({ invoiceNumber: regexContains(search) })
        .select('_id')
        .lean()) as Array<{ _id: Types.ObjectId }>;
      const invoiceIds = invoiceDocs.map((i) => i._id);
      filter.$or = [
        { notes: regexContains(search) },
        ...(invoiceIds.length ? [{ invoiceId: { $in: invoiceIds } }] : []),
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [plans, total] = await Promise.all([
      this.InstallmentPlan.find(filter)
        .populate('patientId', 'firstName lastName patientCode')
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.InstallmentPlan.countDocuments(filter),
    ]);

    return {
      plans,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get by ID ─────────────────────────────────────────────

  async getById(id: string) {
    const plan = await this.InstallmentPlan.findById(id)
      .populate('patientId', 'firstName lastName patientCode')
      .populate('invoiceId', 'invoiceNumber totalAmount amountPaid balanceDue')
      .lean();

    if (!plan) {
      throw ApiError.notFound('Installment plan');
    }
    return plan;
  }

  // ── Update Plan (notes / frequency only — active plans) ───

  async update(id: string, data: UpdateInstallmentPlanInput, _userId: string) {
    const plan = await this.InstallmentPlan.findById(id);
    if (!plan) throw ApiError.notFound('Installment plan');

    if (plan.status !== 'active') {
      throw ApiError.badRequest(`Cannot update a ${plan.status} plan`);
    }

    if (data.notes !== undefined) plan.notes = data.notes;
    if (data.frequency !== undefined) plan.frequency = data.frequency;

    await plan.save();
    logger.info({ planId: id }, 'Installment plan updated');
    return plan.toObject();
  }

  // ── Create Plan ───────────────────────────────────────────

  async create(data: CreateInstallmentPlanInput, userId: string) {
    // Verify invoice exists
    const invoiceExists = await this.Invoice.exists({ _id: data.invoiceId });
    if (!invoiceExists) {
      throw ApiError.notFound('Invoice');
    }

    // Validate down payment
    if (data.downPayment >= data.totalAmount) {
      throw ApiError.badRequest('Down payment must be less than total amount');
    }

    // Calculate installment amounts and due dates
    const remainingAfterDown = data.totalAmount - data.downPayment;
    const installmentAmount =
      Math.round((remainingAfterDown / data.numberOfInstallments) * 100) / 100;

    // Generate payment schedule
    const payments = [];
    const startDate = new Date(data.startDate);

    for (let i = 1; i <= data.numberOfInstallments; i++) {
      const dueDate = new Date(startDate);

      switch (data.frequency) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + 7 * i);
          break;
        case 'biweekly':
          dueDate.setDate(dueDate.getDate() + 14 * i);
          break;
        case 'monthly':
          dueDate.setMonth(dueDate.getMonth() + i);
          break;
      }

      // Last installment gets the remainder to handle rounding
      const amountDue =
        i === data.numberOfInstallments
          ? Math.round(
              (remainingAfterDown - installmentAmount * (data.numberOfInstallments - 1)) * 100,
            ) / 100
          : installmentAmount;

      payments.push({
        installmentNumber: i,
        dueDate,
        amountDue,
        amountPaid: 0,
        lateFee: 0,
        status: 'pending' as const,
      });
    }

    const plan = await this.InstallmentPlan.create({
      invoiceId: data.invoiceId,
      patientId: data.patientId,
      totalAmount: data.totalAmount,
      downPayment: data.downPayment,
      remainingAmount: remainingAfterDown,
      numberOfInstallments: data.numberOfInstallments,
      installmentAmount,
      frequency: data.frequency,
      status: 'active',
      payments,
      notes: data.notes,
      createdBy: userId,
    });

    // Update invoice status to 'installment' and record down payment if any
    const invoice = await this.Invoice.findById(data.invoiceId);
    if (invoice) {
      invoice.status = 'installment';
      if (data.downPayment > 0) {
        invoice.amountPaid += data.downPayment;
      }
      await invoice.save(); // pre-save recalculates balanceDue
    }

    logger.info(
      { planId: plan._id, invoiceId: data.invoiceId, installments: data.numberOfInstallments },
      'Installment plan created',
    );

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'installment.plan_created',
        data: {
          planId: plan._id,
          invoiceId: data.invoiceId,
          patientId: data.patientId,
          numberOfInstallments: data.numberOfInstallments,
          totalAmount: data.totalAmount,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch installment.plan_created webhook');
    }

    return plan.toObject();
  }

  // ── Record Payment ────────────────────────────────────────

  async recordPayment(
    planId: string,
    installmentNumber: number,
    data: RecordInstallmentPaymentInput,
    _userId: string,
  ) {
    const plan = await this.InstallmentPlan.findById(planId);
    if (!plan) {
      throw ApiError.notFound('Installment plan');
    }

    if (plan.status !== 'active') {
      throw ApiError.badRequest(`Cannot record payment on a ${plan.status} plan`);
    }

    const payment = plan.payments.find((p) => p.installmentNumber === installmentNumber);
    if (!payment) {
      throw ApiError.notFound('Installment payment');
    }

    if (payment.status === 'paid') {
      throw ApiError.badRequest('This installment is already paid');
    }

    if (payment.status === 'waived') {
      throw ApiError.badRequest('This installment has been waived');
    }

    // Guard against over-payment BEFORE any mutation: an amount exceeding the parent
    // invoice's remaining balance would push balanceDue negative and trip the min:0
    // validator (500) AFTER plan.save(), leaving the plan paid but the invoice unsynced.
    const parentInvoice = await this.Invoice.findById(plan.invoiceId);
    if (parentInvoice && data.amountPaid > parentInvoice.balanceDue) {
      throw ApiError.badRequest(
        `Payment amount (${data.amountPaid}) exceeds the invoice balance due (${parentInvoice.balanceDue})`,
      );
    }

    payment.amountPaid = data.amountPaid;
    payment.lateFee = data.lateFee;
    payment.status = 'paid';
    payment.paidAt = new Date();

    if (data.paymentId) {
      payment.paymentId = data.paymentId as unknown as typeof payment.paymentId;
    }

    await plan.save(); // pre('save') recalculates remainingAmount and checks completion

    // Sync payment to parent invoice
    const invoice = await this.Invoice.findById(plan.invoiceId);
    if (invoice) {
      invoice.amountPaid += data.amountPaid;
      invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;
      if (invoice.balanceDue <= 0) {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        invoice.balanceDue = 0;
      } else if (invoice.amountPaid > 0) {
        invoice.status = 'partially_paid';
      }
      await invoice.save();
    }

    logger.info(
      { planId, installmentNumber, amount: data.amountPaid },
      'Installment payment recorded',
    );

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'installment.payment_recorded',
        data: {
          planId,
          installmentNumber,
          amountPaid: data.amountPaid,
          lateFee: data.lateFee,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch installment.payment_recorded webhook');
    }

    return plan.toObject();
  }

  // ── Waive Installment ─────────────────────────────────────

  async waiveInstallment(planId: string, installmentNumber: number, _userId: string) {
    const plan = await this.InstallmentPlan.findById(planId);
    if (!plan) {
      throw ApiError.notFound('Installment plan');
    }

    if (plan.status !== 'active') {
      throw ApiError.badRequest(`Cannot waive installment on a ${plan.status} plan`);
    }

    const payment = plan.payments.find((p) => p.installmentNumber === installmentNumber);
    if (!payment) {
      throw ApiError.notFound('Installment payment');
    }

    if (payment.status === 'paid') {
      throw ApiError.badRequest('Cannot waive a paid installment');
    }

    payment.status = 'waived';
    await plan.save();
    logger.info({ planId, installmentNumber }, 'Installment waived');
    return plan.toObject();
  }

  // ── Cancel Plan ───────────────────────────────────────────

  async cancelPlan(planId: string, _userId: string) {
    const plan = await this.InstallmentPlan.findById(planId);
    if (!plan) {
      throw ApiError.notFound('Installment plan');
    }

    if (plan.status !== 'active') {
      throw ApiError.badRequest(`Cannot cancel a ${plan.status} plan`);
    }

    plan.status = 'cancelled';
    await plan.save();
    logger.info({ planId }, 'Installment plan cancelled');

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'installment.plan_cancelled',
        data: {
          planId,
          invoiceId: plan.invoiceId,
          patientId: plan.patientId,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch installment.plan_cancelled webhook');
    }

    return plan.toObject();
  }

  // ── Mark Overdue (BullMQ cron candidate) ──────────────────

  async markOverdueInstallments() {
    const now = new Date();
    const activePlans = await this.InstallmentPlan.find({
      status: 'active',
      'payments.status': 'pending',
      'payments.dueDate': { $lt: now },
    });

    let overdueCount = 0;

    for (const plan of activePlans) {
      let modified = false;
      for (const payment of plan.payments) {
        if (payment.status === 'pending' && payment.dueDate < now) {
          payment.status = 'overdue';
          modified = true;
          overdueCount++;
        }
      }
      if (modified) {
        await plan.save();
      }
    }

    if (overdueCount > 0) {
      logger.info({ overdueCount }, 'Installments marked as overdue');

      // Dispatch webhook
      try {
        const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
        await dispatchWebhook(this.tenantDb, {
          tenantId: tenantSlug,
          tenantSlug,
          event: 'installment.overdue',
          data: { overdueCount },
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to dispatch installment.overdue webhook');
      }
    }
    return { overdueCount };
  }

  // ── List Overdue ──────────────────────────────────────────

  async listOverdue() {
    const plans = await this.InstallmentPlan.find({
      status: 'active',
      'payments.status': 'overdue',
    })
      .populate('patientId', 'firstName lastName patientCode phone')
      .populate('invoiceId', 'invoiceNumber')
      .lean();

    // Extract overdue payments
    const overdueItems = plans.flatMap((plan) =>
      plan.payments
        .filter((p) => p.status === 'overdue')
        .map((p) => ({
          planId: plan._id,
          invoiceId: plan.invoiceId,
          patient: plan.patientId,
          installmentNumber: p.installmentNumber,
          dueDate: p.dueDate,
          amountDue: p.amountDue,
          lateFee: p.lateFee,
        })),
    );

    return { overdueItems, total: overdueItems.length };
  }
}

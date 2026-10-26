import mongoose, { type Connection, type QueryFilter } from 'mongoose';
import type { IDoctorCommission } from '../models/doctor-commission.model.js';
import { getDoctorCommissionModel } from '../models/doctor-commission.model.js';
import type { ICommissionPayout } from '../models/commission-payout.model.js';
import { getCommissionPayoutModel } from '../models/commission-payout.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { ApiError } from '../../utils/api-response.js';
import { VALID_COMMISSION_STATUS_TRANSITIONS } from '@dento/shared';
import type {
  CommissionQuery,
  ApproveCommissionsInput,
  CreatePayoutInput,
  CommissionSummaryQuery,
  PayoutQuery,
} from '@dento/shared';
import { logger } from '../../utils/logger.js';
import { dispatchWebhook } from './webhook-dispatcher.js';

/**
 * Commission Service — Business logic for doctor commissions + payouts
 *
 * Per V2_DATABASE.md §7.3 — doctor_commissions + commission_payouts
 * Per DENTO_V2_MASTER_PLAN.md §10 (#10 Commissions)
 *
 * Handles:
 * - CRUD with pagination / filtering
 * - Auto-calculate commissions from invoice items
 * - Bulk approve commissions
 * - Create payouts (groups approved → paid)
 * - Doctor commission summary aggregation
 */

/**
 * Aggregation `$match` does not auto-cast string ids to ObjectId (unlike
 * `find`), so doctor/id filters silently match nothing. Cast when valid.
 */
function toMatchId(id: string): mongoose.Types.ObjectId | string {
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
}

export class CommissionService {
  private DoctorCommission;
  private CommissionPayout;
  private Invoice;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.DoctorCommission = getDoctorCommissionModel(tenantDb);
    this.CommissionPayout = getCommissionPayoutModel(tenantDb);
    this.Invoice = getInvoiceModel(tenantDb);
  }

  // ── List Commissions (paginated, filterable) ──────────────

  async list(query: CommissionQuery) {
    const { page, limit, doctorId, status, invoiceId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IDoctorCommission> = {};
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    if (invoiceId) filter.invoiceId = invoiceId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [commissions, total] = await Promise.all([
      this.DoctorCommission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.DoctorCommission.countDocuments(filter),
    ]);

    return {
      items: commissions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Commission by ID ──────────────────────────────────

  async getById(id: string) {
    const commission = await this.DoctorCommission.findById(id).lean();
    if (!commission) {
      throw ApiError.notFound('Commission not found');
    }
    return commission;
  }

  // ── Calculate Commissions from Invoice ────────────────────
  /**
   * Auto-create pending commissions for each procedure item in an invoice.
   * Commission rate is passed per invocation (from doctor profile or settings).
   * If commissions already exist for this invoice, they are returned instead.
   */

  async calculateFromInvoice(
    invoiceId: string,
    doctorId: string,
    commissionRate: number,
    appointmentId?: string,
  ) {
    // Check for existing commissions on this invoice
    const existing = await this.DoctorCommission.find({ invoiceId }).lean();
    if (existing.length > 0) {
      logger.warn({ invoiceId }, 'Commissions already calculated for this invoice');
      return existing;
    }

    const invoice = await this.Invoice.findById(invoiceId).lean();
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }

    // Validate commission rate: 0.0 – 1.0
    if (commissionRate < 0 || commissionRate > 1) {
      throw ApiError.badRequest('Commission rate must be between 0 and 1');
    }

    // Create commission record for each invoice item (procedure)
    const commissionDocs = invoice.items.map((item) => ({
      doctorId,
      appointmentId: appointmentId || invoice.appointmentId || null,
      invoiceId,
      procedureName: item.description,
      procedureAmount: item.total,
      commissionRate,
      commissionAmount: Math.round(item.total * commissionRate * 100) / 100,
      status: 'pending' as const,
    }));

    const created = await this.DoctorCommission.insertMany(commissionDocs);
    logger.info(
      { invoiceId, doctorId, count: created.length },
      'Commissions calculated from invoice',
    );

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'commission.calculated',
        data: {
          invoiceId,
          doctorId,
          count: created.length,
          totalAmount: commissionDocs.reduce((s, c) => s + c.commissionAmount, 0),
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch commission.calculated webhook');
    }

    return created;
  }

  // ── Auto-Approve Commissions for a Paid Invoice (Phase 7.5) ─

  /**
   * Called by InvoiceService.recordPayment when an invoice transitions to "paid".
   * Transitions all pending commissions linked to this invoice → "approved".
   * Uses VALID_COMMISSION_STATUS_TRANSITIONS to guard the transition.
   * Safe to call on invoices with no commissions (no-op).
   */
  async autoApproveForInvoice(invoiceId: string) {
    const pending = await this.DoctorCommission.find({
      invoiceId,
      status: 'pending',
    });

    if (pending.length === 0) {
      return { approvedCount: 0 };
    }

    const eligibleIds = pending
      .filter((c) => (VALID_COMMISSION_STATUS_TRANSITIONS[c.status] || []).includes('approved'))
      .map((c) => c._id);

    if (eligibleIds.length === 0) {
      return { approvedCount: 0 };
    }

    const result = await this.DoctorCommission.updateMany(
      { _id: { $in: eligibleIds } },
      { $set: { status: 'approved' } },
    );

    logger.info(
      { invoiceId, count: result.modifiedCount },
      'Commissions auto-approved on invoice payment',
    );

    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'commission.approved',
        data: {
          ids: eligibleIds.map((id) => id.toString()),
          approvedCount: result.modifiedCount,
          source: 'invoice.paid',
          invoiceId,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch commission.approved webhook (auto)');
    }

    return { approvedCount: result.modifiedCount };
  }

  // ── Bulk Approve Commissions ──────────────────────────────

  async approveCommissions(data: ApproveCommissionsInput, _userId: string) {
    const { ids } = data;

    // Find all specified commissions
    const commissions = await this.DoctorCommission.find({
      _id: { $in: ids },
    });

    // Validate all are in pending status
    const invalidIds: string[] = [];
    for (const c of commissions) {
      const transitions = VALID_COMMISSION_STATUS_TRANSITIONS[c.status] || [];
      if (!transitions.includes('approved')) {
        invalidIds.push(c._id.toString());
      }
    }

    if (invalidIds.length > 0) {
      throw ApiError.badRequest(
        `Cannot approve commissions with IDs: ${invalidIds.join(', ')} (invalid status)`,
      );
    }

    const result = await this.DoctorCommission.updateMany(
      { _id: { $in: ids }, status: 'pending' },
      { $set: { status: 'approved' } },
    );

    logger.info({ count: result.modifiedCount }, 'Commissions bulk approved');

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'commission.approved',
        data: {
          ids,
          approvedCount: result.modifiedCount,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch commission.approved webhook');
    }

    return { approvedCount: result.modifiedCount };
  }

  // ── Create Payout ─────────────────────────────────────────
  /**
   * Groups all approved commissions for a doctor within a date range,
   * creates a payout record, and transitions commissions to "paid".
   */

  async createPayout(data: CreatePayoutInput, userId: string) {
    const { doctorId, periodStart, periodEnd, paymentMethod, reference } = data;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Find approved commissions in the date range for this doctor
    const approvedCommissions = await this.DoctorCommission.find({
      doctorId,
      status: 'approved',
      createdAt: { $gte: start, $lte: end },
    });

    if (approvedCommissions.length === 0) {
      throw ApiError.badRequest(
        'No approved commissions found for this doctor in the given period',
      );
    }

    // Calculate total
    const totalAmount = approvedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const roundedTotal = Math.round(totalAmount * 100) / 100;

    // Create payout
    const payout = await this.CommissionPayout.create({
      doctorId,
      payoutDate: new Date(),
      periodStart: start,
      periodEnd: end,
      totalAmount: roundedTotal,
      paymentMethod,
      reference: reference || undefined,
      commissionCount: approvedCommissions.length,
      createdBy: userId,
    });

    // Transition all included commissions to "paid"
    const commissionIds = approvedCommissions.map((c) => c._id);
    await this.DoctorCommission.updateMany(
      { _id: { $in: commissionIds } },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          payoutId: payout._id,
        },
      },
    );

    logger.info(
      {
        payoutId: payout._id,
        doctorId,
        count: approvedCommissions.length,
        totalAmount: roundedTotal,
      },
      'Commission payout created',
    );

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'commission.payout_created',
        data: {
          payoutId: payout._id,
          doctorId,
          totalAmount: roundedTotal,
          commissionCount: approvedCommissions.length,
          paymentMethod,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch commission.payout_created webhook');
    }

    return payout;
  }

  // ── List Payouts ──────────────────────────────────────────

  async listPayouts(query: PayoutQuery) {
    const { page, limit, doctorId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ICommissionPayout> = {};
    if (doctorId) filter.doctorId = doctorId;
    if (startDate || endDate) {
      filter.payoutDate = {};
      if (startDate) filter.payoutDate.$gte = new Date(startDate);
      if (endDate) filter.payoutDate.$lte = new Date(endDate);
    }

    const [payouts, total] = await Promise.all([
      this.CommissionPayout.find(filter).sort({ payoutDate: -1 }).skip(skip).limit(limit).lean(),
      this.CommissionPayout.countDocuments(filter),
    ]);

    return {
      items: payouts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Doctor Commission Summary ─────────────────────────────

  async getDoctorSummary(doctorId: string, query: CommissionSummaryQuery) {
    // Aggregation does not auto-cast the string doctorId to ObjectId.
    const doctorMatch = toMatchId(doctorId);
    const dateFilter: Record<string, unknown> = {};
    if (query.startDate || query.endDate) {
      dateFilter.createdAt = {};
      if (query.startDate)
        (dateFilter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
      if (query.endDate)
        (dateFilter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
    }

    const [_unusedSummary] = await this.DoctorCommission.aggregate([
      {
        $match: {
          doctorId: { $in: [doctorMatch] },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$commissionAmount' },
        },
      },
    ]);

    // Aggregate into a structured response
    const result = await this.DoctorCommission.aggregate([
      {
        $match: {
          doctorId: { $in: [doctorMatch] },
          ...dateFilter,
        },
      },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$commissionAmount' },
              },
            },
          ],
          topProcedures: [
            {
              $group: {
                _id: '$procedureName',
                count: { $sum: 1 },
                totalAmount: { $sum: '$commissionAmount' },
              },
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 10 },
          ],
          overall: [
            {
              $group: {
                _id: null,
                totalCommissions: { $sum: 1 },
                totalAmount: { $sum: '$commissionAmount' },
                avgRate: { $avg: '$commissionRate' },
              },
            },
          ],
        },
      },
    ]);

    const facets = result[0] || { byStatus: [], topProcedures: [], overall: [] };
    return {
      doctorId,
      byStatus: facets.byStatus,
      topProcedures: facets.topProcedures,
      overall: facets.overall[0] || { totalCommissions: 0, totalAmount: 0, avgRate: 0 },
    };
  }

  // ── Commission Report (admin-level aggregation) ───────────

  async getCommissionReport(filters: { startDate?: string; endDate?: string; doctorId?: string }) {
    const match: Record<string, unknown> = {};
    if (filters.doctorId) match.doctorId = toMatchId(filters.doctorId);
    if (filters.startDate || filters.endDate) {
      match.createdAt = {};
      if (filters.startDate)
        (match.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      if (filters.endDate)
        (match.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
    }

    const report = await this.DoctorCommission.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$doctorId',
          totalProcedures: { $sum: 1 },
          totalProcedureAmount: { $sum: '$procedureAmount' },
          totalCommissionAmount: { $sum: '$commissionAmount' },
          avgCommissionRate: { $avg: '$commissionRate' },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0] },
          },
          paid: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0] },
          },
        },
      },
      { $sort: { totalCommissionAmount: -1 } },
    ]);

    return report;
  }
}

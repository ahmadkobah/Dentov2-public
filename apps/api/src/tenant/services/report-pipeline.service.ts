import mongoose, { type Connection, type PipelineStage } from 'mongoose';
import { getInvoiceModel } from '../models/invoice.model.js';
import { getTenantPaymentModel } from '../models/payment.model.js';
import { getDoctorCommissionModel } from '../models/doctor-commission.model.js';
import { getReconciliationModel } from '../models/reconciliation.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { getAppointmentModel } from '../models/appointment.model.js';
import { getDoctorScheduleModel } from '../models/doctor-schedule.model.js';
import { getProcedureNoteModel } from '../models/procedure-note.model.js';
import { getTreatmentPlanModel } from '../models/treatment-plan.model.js';
import { getLabOrderModel } from '../models/lab-order.model.js';
import { getPrescriptionModel } from '../models/prescription.model.js';
import { getRedis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

/**
 * Report Pipeline Service — Real MongoDB aggregation pipelines
 *
 * Per PHASE_4_IMPLEMENTATION_PLAN.md — Day 8
 * Per DENTO_V2_MASTER_PLAN.md §21 — Reports & Analytics
 *
 * Provides F1–F7 financial reports + O1–O2 operational reports.
 * All pipelines use Redis caching (5 min TTL).
 *
 * Each method returns: { summary, chart, table }
 */

// ── Helpers ─────────────────────────────────────────────────

/**
 * Aggregation `$match` does not auto-cast string ids to ObjectId (unlike
 * `find`), so branch/id filters silently match nothing. Cast when valid.
 */
function toMatchId(id: string): mongoose.Types.ObjectId | string {
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
}

// ── Redis Cache Helper ──────────────────────────────────────

const CACHE_TTL = 300; // 5 minutes

async function getOrSet<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const redis = getRedis();
    const cached = await redis.get(key);
    if (cached) {
      logger.debug({ key }, 'Report cache hit');
      return JSON.parse(cached) as T;
    }
    const result = await fn();
    await redis.setex(key, ttl, JSON.stringify(result));
    return result;
  } catch {
    // If Redis is unavailable, fall through to direct execution
    logger.warn({ key }, 'Redis unavailable for report cache, executing directly');
    return fn();
  }
}

// ── Report Filters ──────────────────────────────────────────

interface ReportFilters {
  from?: string;
  to?: string;
  branchId?: string;
  doctorId?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

function buildDateMatch(filters: ReportFilters): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.from || filters.to) {
    match.createdAt = {};
    if (filters.from) (match.createdAt as Record<string, unknown>).$gte = new Date(filters.from);
    if (filters.to) (match.createdAt as Record<string, unknown>).$lte = new Date(filters.to);
  }
  if (filters.branchId) match.branchId = toMatchId(filters.branchId);
  return match;
}

function buildPeriodGroupId(period?: string): Record<string, unknown> {
  switch (period) {
    case 'daily':
      return {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    case 'weekly':
      return {
        year: { $year: '$createdAt' },
        week: { $isoWeek: '$createdAt' },
      };
    case 'quarterly':
      return {
        year: { $year: '$createdAt' },
        quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } },
      };
    case 'yearly':
      return { year: { $year: '$createdAt' } };
    case 'monthly':
    default:
      return {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
  }
}

function cacheKey(tenantId: string, reportType: string, filters: ReportFilters): string {
  return `report:${tenantId}:${reportType}:${JSON.stringify(filters)}`;
}

// ── Service Class ───────────────────────────────────────────

export class ReportPipelineService {
  private Invoice;
  private Payment;
  private DoctorCommission;
  private Reconciliation;
  private Patient;
  private Appointment;
  private DoctorSchedule;
  private ProcedureNote;
  private TreatmentPlan;
  private LabOrder;
  private Prescription;
  private tenantId: string;

  constructor(tenantDb: Connection, tenantId: string) {
    this.Invoice = getInvoiceModel(tenantDb);
    this.Payment = getTenantPaymentModel(tenantDb);
    this.DoctorCommission = getDoctorCommissionModel(tenantDb);
    this.Reconciliation = getReconciliationModel(tenantDb);
    this.Patient = getPatientModel(tenantDb);
    this.Appointment = getAppointmentModel(tenantDb);
    this.DoctorSchedule = getDoctorScheduleModel(tenantDb);
    this.ProcedureNote = getProcedureNoteModel(tenantDb);
    this.TreatmentPlan = getTreatmentPlanModel(tenantDb);
    this.LabOrder = getLabOrderModel(tenantDb);
    this.Prescription = getPrescriptionModel(tenantDb);
    this.tenantId = tenantId;
  }

  // ── F1: Revenue Summary ───────────────────────────────────

  async revenueByPeriod(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'revenue_summary', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = {
        ...buildDateMatch(filters),
        status: { $in: ['paid', 'partially_paid'] },
      };

      const periodGroupId = buildPeriodGroupId(filters.period);

      const [chartData, summaryData] = await Promise.all([
        this.Invoice.aggregate([
          { $match: match },
          {
            $group: {
              _id: periodGroupId,
              revenue: { $sum: '$totalAmount' },
              invoiceCount: { $sum: 1 },
              avgInvoice: { $avg: '$totalAmount' },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
        ]),
        this.Invoice.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' },
              invoiceCount: { $sum: 1 },
              avgInvoice: { $avg: '$totalAmount' },
              maxInvoice: { $max: '$totalAmount' },
              minInvoice: { $min: '$totalAmount' },
            },
          },
        ]),
      ]);

      const summary = summaryData[0] || {
        totalRevenue: 0,
        invoiceCount: 0,
        avgInvoice: 0,
        maxInvoice: 0,
        minInvoice: 0,
      };

      return {
        summary: {
          totalRevenue: summary.totalRevenue,
          invoiceCount: summary.invoiceCount,
          avgInvoice: Math.round((summary.avgInvoice || 0) * 100) / 100,
          maxInvoice: summary.maxInvoice || 0,
        },
        chart: chartData.map((d: Record<string, unknown>) => ({
          period: d._id,
          revenue: d.revenue,
          invoices: d.invoiceCount,
        })),
        table: chartData,
      };
    });
  }

  // ── F2: Revenue by Doctor ─────────────────────────────────

  async revenueByDoctor(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'revenue_by_doctor', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = {
        ...buildDateMatch(filters),
        status: { $in: ['paid', 'partially_paid'] },
      };

      const result = await this.Invoice.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'appointments',
            localField: 'appointmentId',
            foreignField: '_id',
            as: 'appointment',
          },
        },
        { $unwind: { path: '$appointment', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$appointment.doctorId',
            totalRevenue: { $sum: '$totalAmount' },
            invoiceCount: { $sum: 1 },
            avgInvoice: { $avg: '$totalAmount' },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]);

      const grandTotal = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalRevenue || 0),
        0,
      );

      return {
        summary: {
          totalRevenue: grandTotal,
          doctorCount: result.length,
          topDoctor: result[0] || null,
        },
        chart: result.map((r: Record<string, unknown>) => ({
          doctorId: r._id,
          revenue: r.totalRevenue,
          share:
            grandTotal > 0 ? Math.round(((r.totalRevenue as number) / grandTotal) * 1000) / 10 : 0,
        })),
        table: result,
      };
    });
  }

  // ── F3: Revenue by Service ────────────────────────────────

  async revenueByService(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'revenue_by_service', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = {
        ...buildDateMatch(filters),
        status: { $in: ['paid', 'partially_paid'] },
      };

      const result = await this.Invoice.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: { serviceId: '$items.serviceId', description: '$items.description' },
            totalRevenue: { $sum: '$items.total' },
            quantity: { $sum: '$items.quantity' },
            avgPrice: { $avg: '$items.unitPrice' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 50 },
      ]);

      const grandTotal = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalRevenue || 0),
        0,
      );

      return {
        summary: {
          totalRevenue: grandTotal,
          serviceCount: result.length,
          topService: result[0] || null,
        },
        chart: result.slice(0, 10).map((r: Record<string, unknown>) => ({
          service: (r._id as Record<string, string>).description,
          revenue: r.totalRevenue,
          quantity: r.quantity,
        })),
        table: result,
      };
    });
  }

  // ── F4: Revenue by Branch ─────────────────────────────────

  async revenueByBranch(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'revenue_by_branch', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = {
        ...buildDateMatch(filters),
        status: { $in: ['paid', 'partially_paid'] },
      };

      const result = await this.Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$branchId',
            totalRevenue: { $sum: '$totalAmount' },
            invoiceCount: { $sum: 1 },
            avgInvoice: { $avg: '$totalAmount' },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]);

      const grandTotal = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalRevenue || 0),
        0,
      );

      return {
        summary: {
          totalRevenue: grandTotal,
          branchCount: result.length,
        },
        chart: result.map((r: Record<string, unknown>) => ({
          branchId: r._id,
          revenue: r.totalRevenue,
          share:
            grandTotal > 0 ? Math.round(((r.totalRevenue as number) / grandTotal) * 1000) / 10 : 0,
        })),
        table: result,
      };
    });
  }

  // ── F5: Payment Collection ────────────────────────────────

  async paymentCollection(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'payment_collection', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      // Payment stores the date as `receivedAt` (not `paymentDate`), and a
      // payment has no branchId of its own — the branch lives on the linked
      // invoice. So filter dates on receivedAt and, when a branch is requested,
      // $lookup the invoice and match its branchId.
      const match: Record<string, unknown> = {};
      if (filters.from || filters.to) {
        match.receivedAt = {};
        if (filters.from)
          (match.receivedAt as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.receivedAt as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const branchStages: PipelineStage[] =
        filters.branchId && mongoose.isValidObjectId(filters.branchId)
          ? [
              {
                $lookup: {
                  from: 'invoices',
                  localField: 'invoiceId',
                  foreignField: '_id',
                  as: 'invoice',
                },
              },
              { $unwind: '$invoice' },
              { $match: { 'invoice.branchId': new mongoose.Types.ObjectId(filters.branchId) } },
            ]
          : [];

      const result = await this.Payment.aggregate([
        { $match: match },
        ...branchStages,
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      const grandTotal = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalAmount || 0),
        0,
      );

      return {
        summary: {
          totalCollected: grandTotal,
          transactionCount: result.reduce(
            (sum: number, r: Record<string, number>) => sum + (r.count || 0),
            0,
          ),
          methodCount: result.length,
        },
        chart: result.map((r: Record<string, unknown>) => ({
          method: r._id,
          amount: r.totalAmount,
          count: r.count,
          share:
            grandTotal > 0 ? Math.round(((r.totalAmount as number) / grandTotal) * 1000) / 10 : 0,
        })),
        table: result,
      };
    });
  }

  // ── F6: Outstanding / Aging ───────────────────────────────

  async outstandingAging(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'outstanding_aging', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {
        status: { $in: ['issued', 'partially_paid', 'overdue'] },
      };
      if (filters.branchId) match.branchId = filters.branchId;

      const result = await this.Invoice.aggregate([
        { $match: match },
        {
          $addFields: {
            ageDays: {
              $divide: [{ $subtract: [new Date(), '$issueDate'] }, 1000 * 60 * 60 * 24],
            },
          },
        },
        {
          $bucket: {
            groupBy: '$ageDays',
            boundaries: [0, 31, 61, 91, Infinity],
            default: 'unknown',
            output: {
              count: { $sum: 1 },
              totalBalance: { $sum: '$balanceDue' },
              invoices: {
                $push: {
                  invoiceNumber: '$invoiceNumber',
                  patientId: '$patientId',
                  balanceDue: '$balanceDue',
                  issueDate: '$issueDate',
                  ageDays: '$ageDays',
                },
              },
            },
          },
        },
      ]);

      const bucketLabels: Record<string, string> = {
        '0': '0-30 days',
        '31': '31-60 days',
        '61': '61-90 days',
        '91': '90+ days',
      };

      const totalOutstanding = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalBalance || 0),
        0,
      );

      return {
        summary: {
          totalOutstanding,
          invoiceCount: result.reduce(
            (sum: number, r: Record<string, number>) => sum + (r.count || 0),
            0,
          ),
        },
        chart: result.map((r: Record<string, unknown>) => ({
          bucket: bucketLabels[String(r._id)] || String(r._id),
          count: r.count,
          amount: r.totalBalance,
        })),
        table: result.map((r: Record<string, unknown>) => ({
          bucket: bucketLabels[String(r._id)] || String(r._id),
          count: r.count,
          totalBalance: r.totalBalance,
          invoices: (r.invoices as unknown[])?.slice(0, 20), // Limit table detail
        })),
      };
    });
  }

  // ── F7: Tax Report ────────────────────────────────────────

  async taxReport(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'tax_report', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = {
        ...buildDateMatch(filters),
        status: { $ne: 'cancelled' },
      };

      const periodGroupId = buildPeriodGroupId(filters.period);

      const result = await this.Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: periodGroupId,
            totalTax: { $sum: '$taxAmount' },
            subtotal: { $sum: '$subtotal' },
            invoiceCount: { $sum: 1 },
            taxableRevenue: {
              $sum: { $cond: [{ $gt: ['$taxAmount', 0] }, '$subtotal', 0] },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      const totals = result.reduce(
        (acc: Record<string, number>, r: Record<string, unknown>) => ({
          totalTax: acc.totalTax + ((r.totalTax as number) || 0),
          totalSubtotal: acc.totalSubtotal + ((r.subtotal as number) || 0),
          invoiceCount: acc.invoiceCount + ((r.invoiceCount as number) || 0),
        }),
        { totalTax: 0, totalSubtotal: 0, invoiceCount: 0 },
      );

      return {
        summary: {
          totalTax: totals.totalTax,
          totalRevenue: totals.totalSubtotal,
          effectiveRate:
            totals.totalSubtotal > 0
              ? Math.round((totals.totalTax / totals.totalSubtotal) * 10000) / 100
              : 0,
          invoiceCount: totals.invoiceCount,
        },
        chart: result.map((r: Record<string, unknown>) => ({
          period: r._id,
          tax: r.totalTax,
          revenue: r.subtotal,
        })),
        table: result,
      };
    });
  }

  // ── O1: Commission Summary ────────────────────────────────

  async commissionSummary(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'commission_summary', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.doctorId) match.doctorId = filters.doctorId;
      if (filters.from || filters.to) {
        match.createdAt = {};
        if (filters.from)
          (match.createdAt as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.createdAt as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const result = await this.DoctorCommission.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$doctorId',
            totalCommissions: { $sum: 1 },
            totalAmount: { $sum: '$commissionAmount' },
            totalProcedureAmount: { $sum: '$procedureAmount' },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] },
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0] },
            },
            paid: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0] },
            },
            avgRate: { $avg: '$commissionRate' },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      const grandTotal = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalAmount || 0),
        0,
      );

      return {
        summary: {
          totalCommissionAmount: grandTotal,
          doctorCount: result.length,
          totalPending: result.reduce(
            (sum: number, r: Record<string, number>) => sum + (r.pending || 0),
            0,
          ),
          totalPaid: result.reduce(
            (sum: number, r: Record<string, number>) => sum + (r.paid || 0),
            0,
          ),
        },
        chart: result.slice(0, 10).map((r: Record<string, unknown>) => ({
          doctorId: r._id,
          total: r.totalAmount,
          pending: r.pending,
          approved: r.approved,
          paid: r.paid,
        })),
        table: result,
      };
    });
  }

  // ── O2: Daily Reconciliation ──────────────────────────────

  async dailyReconciliation(filters: ReportFilters & { date?: string }) {
    const key = cacheKey(this.tenantId, 'daily_reconciliation', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      // The reconciliation model stores `reconciliationDate`, `totalReceived`
      // (expected), `closingBalance` (actual counted) and `discrepancy` — there
      // is no `date`/`expectedAmount`/`actualAmount`/`transactionCount` field,
      // so the previous grouping summed nothing. `transactionCount` has no model
      // equivalent, so we count reconciliation records instead.
      const match: Record<string, unknown> = {};
      if (filters.date) {
        const day = new Date(filters.date);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        match.reconciliationDate = { $gte: day, $lt: nextDay };
      } else if (filters.from || filters.to) {
        match.reconciliationDate = {};
        if (filters.from)
          (match.reconciliationDate as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to)
          (match.reconciliationDate as Record<string, unknown>).$lte = new Date(filters.to);
      }
      if (filters.branchId) match.branchId = toMatchId(filters.branchId);

      const result = await this.Reconciliation.aggregate([
        { $match: match },
        {
          $group: {
            _id: { date: '$reconciliationDate', branchId: '$branchId' },
            expectedAmount: { $sum: '$totalReceived' },
            actualAmount: { $sum: '$closingBalance' },
            difference: { $sum: '$discrepancy' },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': -1 } },
      ]);

      const totalExpected = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.expectedAmount || 0),
        0,
      );
      const totalActual = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.actualAmount || 0),
        0,
      );

      return {
        summary: {
          totalExpected,
          totalActual,
          difference: totalActual - totalExpected,
          matchRate:
            totalExpected > 0 ? Math.round((totalActual / totalExpected) * 10000) / 100 : 100,
        },
        chart: result.map((r: Record<string, unknown>) => ({
          date: (r._id as Record<string, unknown>).date,
          branchId: (r._id as Record<string, unknown>).branchId,
          expected: r.expectedAmount,
          actual: r.actualAmount,
          difference: r.difference,
        })),
        table: result,
      };
    });
  }

  // ── Dispatcher — route by report type ─────────────────────

  async getReport(reportType: string, filters: ReportFilters) {
    switch (reportType) {
      case 'revenue_summary':
        return this.revenueByPeriod(filters);
      case 'revenue_by_doctor':
        return this.revenueByDoctor(filters);
      case 'revenue_by_service':
        return this.revenueByService(filters);
      case 'revenue_by_branch':
        return this.revenueByBranch(filters);
      case 'payment_collection':
        return this.paymentCollection(filters);
      case 'outstanding_aging':
        return this.outstandingAging(filters);
      case 'tax_report':
        return this.taxReport(filters);
      case 'commission_summary':
      case 'commission_report': // financial-category alias for the same pipeline
        return this.commissionSummary(filters);
      case 'daily_reconciliation':
        return this.dailyReconciliation(filters);
      // ── Patient Pipelines (P1–P5) ──
      case 'patient_overview':
        return this.patientOverview(filters);
      case 'new_vs_returning':
        return this.newVsReturning(filters);
      case 'patient_demographics':
        return this.patientDemographics(filters);
      case 'no_show_report':
        return this.noShowReport(filters);
      case 'patient_source_referral':
        return this.patientSourceReferral(filters);
      // ── Appointment Pipelines (A1–A6) ──
      case 'appointment_summary':
        return this.appointmentSummary(filters);
      case 'doctor_utilization':
        return this.doctorUtilization(filters);
      case 'chair_utilization':
        return this.chairUtilization(filters);
      case 'cancellation_analysis':
        return this.cancellationAnalysis(filters);
      case 'peak_hours_heatmap':
        return this.peakHoursHeatmap(filters);
      case 'avg_duration_analysis':
        return this.avgDurationAnalysis(filters);
      // ── Clinical Pipelines (C1–C4) ──
      case 'procedures_performed':
        return this.proceduresPerformed(filters);
      case 'treatment_plan_acceptance':
        return this.treatmentPlanAcceptance(filters);
      case 'lab_order_turnaround':
        return this.labOrderTurnaround(filters);
      case 'prescription_volume':
        return this.prescriptionVolume(filters);
      // ── Operational Pipelines (O3–O4) ──
      case 'wait_time_analysis':
        return this.waitTimeAnalysis(filters);
      case 'staff_productivity':
        return this.staffProductivity(filters);
      default:
        return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  // PATIENT PIPELINES (P1–P5)
  // ══════════════════════════════════════════════════════════

  // ── P1: Patient Overview ──────────────────────────────────

  async patientOverview(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'patient_overview', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.createdAt = {};
        if (filters.from)
          (match.createdAt as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.createdAt as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [statusData, monthlyTrend] = await Promise.all([
        this.Patient.aggregate([
          { $match: match },
          {
            $facet: {
              total: [{ $count: 'count' }],
              active: [{ $match: { isActive: true } }, { $count: 'count' }],
              inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
              newThisMonth: [{ $match: { createdAt: { $gte: monthStart } } }, { $count: 'count' }],
            },
          },
        ]),
        this.Patient.aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
          { $limit: 12 },
        ]),
      ]);

      const facet = statusData[0] || {};
      const total = (facet.total as Array<{ count: number }>)?.[0]?.count || 0;
      const active = (facet.active as Array<{ count: number }>)?.[0]?.count || 0;
      const inactive = (facet.inactive as Array<{ count: number }>)?.[0]?.count || 0;
      const newThisMonth = (facet.newThisMonth as Array<{ count: number }>)?.[0]?.count || 0;

      return {
        summary: { totalPatients: total, active, inactive, newThisMonth },
        chart: monthlyTrend.map((d: Record<string, unknown>) => ({
          period: d._id,
          newPatients: d.count,
        })),
        table: [
          { label: 'Active', count: active },
          { label: 'Inactive', count: inactive },
          { label: 'New this month', count: newThisMonth },
        ],
      };
    });
  }

  // ── P2: New vs Returning ──────────────────────────────────

  async newVsReturning(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'new_vs_returning', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const dateMatch: Record<string, unknown> = {};
      if (filters.from || filters.to) {
        dateMatch.date = {};
        if (filters.from) (dateMatch.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (dateMatch.date as Record<string, unknown>).$lte = new Date(filters.to);
      }
      if (filters.branchId) dateMatch.branchId = filters.branchId;

      const periodGroupId = buildPeriodGroupId(filters.period);

      const result = await this.Appointment.aggregate([
        { $match: { ...dateMatch, status: { $nin: ['cancelled'] } } },
        {
          $lookup: {
            from: 'appointments',
            let: { pid: '$patientId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$patientId', '$$pid'] } } },
              { $sort: { date: 1 } },
              { $limit: 1 },
              { $project: { date: 1 } },
            ],
            as: 'firstVisit',
          },
        },
        { $unwind: { path: '$firstVisit', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            isNew: { $eq: ['$_id', '$firstVisit._id'] },
          },
        },
        {
          $group: {
            _id: periodGroupId,
            newPatients: { $sum: { $cond: ['$isNew', 1, 0] } },
            returningPatients: { $sum: { $cond: ['$isNew', 0, 1] } },
            total: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      const totals = result.reduce(
        (acc: Record<string, number>, r: Record<string, number>) => ({
          newPatients: acc.newPatients + (r.newPatients || 0),
          returningPatients: acc.returningPatients + (r.returningPatients || 0),
          total: acc.total + (r.total || 0),
        }),
        { newPatients: 0, returningPatients: 0, total: 0 },
      );

      return {
        summary: {
          ...totals,
          newRate:
            totals.total > 0 ? Math.round((totals.newPatients / totals.total) * 1000) / 10 : 0,
        },
        chart: result.map((d: Record<string, unknown>) => ({
          period: d._id,
          new: d.newPatients,
          returning: d.returningPatients,
        })),
        table: result,
      };
    });
  }

  // ── P3: Patient Demographics ──────────────────────────────

  async patientDemographics(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'demographics', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;

      const [genderData, ageBuckets, nationalityData] = await Promise.all([
        this.Patient.aggregate([
          { $match: match },
          { $group: { _id: '$gender', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.Patient.aggregate([
          { $match: { ...match, dateOfBirth: { $exists: true, $ne: null } } },
          {
            $addFields: {
              age: {
                $divide: [
                  { $subtract: [new Date(), '$dateOfBirth'] },
                  1000 * 60 * 60 * 24 * 365.25,
                ],
              },
            },
          },
          {
            $bucket: {
              groupBy: '$age',
              boundaries: [0, 13, 18, 30, 45, 60, 100],
              default: 'unknown',
              output: { count: { $sum: 1 } },
            },
          },
        ]),
        this.Patient.aggregate([
          { $match: match },
          { $group: { _id: '$nationality', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
      ]);

      const totalPatients = genderData.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );

      const ageBucketLabels: Record<string, string> = {
        '0': '0-12 Children',
        '13': '13-17 Teens',
        '18': '18-29 Young Adults',
        '30': '30-44 Adults',
        '45': '45-59 Middle Age',
        '60': '60+ Seniors',
      };

      return {
        summary: {
          totalPatients,
          genderBreakdown: genderData.map((d: Record<string, unknown>) => ({
            gender: d._id || 'unspecified',
            count: d.count,
            percentage:
              totalPatients > 0 ? Math.round(((d.count as number) / totalPatients) * 1000) / 10 : 0,
          })),
        },
        chart: ageBuckets.map((d: Record<string, unknown>) => ({
          bucket: ageBucketLabels[String(d._id)] || String(d._id),
          count: d.count,
        })),
        table: [
          ...genderData.map((d: Record<string, unknown>) => ({
            type: 'gender',
            label: d._id,
            count: d.count,
          })),
          ...nationalityData.map((d: Record<string, unknown>) => ({
            type: 'nationality',
            label: d._id,
            count: d.count,
          })),
        ],
      };
    });
  }

  // ── P4: No-Show Report ────────────────────────────────────

  async noShowReport(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'no_show', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = { status: 'no_show' };
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const [byDoctor, byDayOfWeek, _byHour, totalAppointments] = await Promise.all([
        this.Appointment.aggregate([
          { $match: match },
          { $group: { _id: '$doctorId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.Appointment.aggregate([
          { $match: match },
          { $group: { _id: { $dayOfWeek: '$date' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        this.Appointment.aggregate([
          { $match: match },
          { $group: { _id: { $hour: '$date' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        this.Appointment.countDocuments({
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
          ...(filters.from || filters.to
            ? {
                date: {
                  ...(filters.from ? { $gte: new Date(filters.from) } : {}),
                  ...(filters.to ? { $lte: new Date(filters.to) } : {}),
                },
              }
            : {}),
        }),
      ]);

      const noShowTotal = byDoctor.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );

      const dayLabels = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      return {
        summary: {
          totalNoShows: noShowTotal,
          totalAppointments,
          noShowRate:
            totalAppointments > 0 ? Math.round((noShowTotal / totalAppointments) * 1000) / 10 : 0,
        },
        chart: byDayOfWeek.map((d: Record<string, unknown>) => ({
          day: dayLabels[d._id as number] || String(d._id),
          noShows: d.count,
        })),
        table: byDoctor.map((d: Record<string, unknown>) => ({
          doctorId: d._id,
          noShows: d.count,
          rate:
            totalAppointments > 0
              ? Math.round(((d.count as number) / totalAppointments) * 1000) / 10
              : 0,
        })),
      };
    });
  }

  // ── P5: Patient Source / Referral ─────────────────────────

  async patientSourceReferral(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'source_referral', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.createdAt = {};
        if (filters.from)
          (match.createdAt as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.createdAt as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const result = await this.Patient.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$referralSource',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const total = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );

      return {
        summary: { totalPatients: total, sourceCount: result.length },
        chart: result.map((d: Record<string, unknown>) => ({
          source: d._id || 'Unknown',
          count: d.count,
          percentage: total > 0 ? Math.round(((d.count as number) / total) * 1000) / 10 : 0,
        })),
        table: result.map((d: Record<string, unknown>) => ({
          source: d._id || 'Unknown',
          count: d.count,
          percentage: total > 0 ? Math.round(((d.count as number) / total) * 1000) / 10 : 0,
        })),
      };
    });
  }

  // ══════════════════════════════════════════════════════════
  // APPOINTMENT PIPELINES (A1–A6)
  // ══════════════════════════════════════════════════════════

  // ── A1: Appointment Summary ───────────────────────────────

  async appointmentSummary(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'appointment_summary', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const result = await this.Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const total = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );

      return {
        summary: {
          total,
          byStatus: Object.fromEntries(
            result.map((r: Record<string, unknown>) => [r._id, r.count]),
          ),
        },
        chart: result.map((d: Record<string, unknown>) => ({
          status: d._id,
          count: d.count,
          percent: total > 0 ? Math.round(((d.count as number) / total) * 1000) / 10 : 0,
        })),
        table: result,
      };
    });
  }

  // ── A2: Doctor Utilization ────────────────────────────────

  async doctorUtilization(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'doctor_utilization', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const [bookedSlots, scheduleSlots] = await Promise.all([
        this.Appointment.aggregate([
          { $match: { ...match, status: { $nin: ['cancelled'] } } },
          {
            $group: {
              _id: '$doctorId',
              booked: { $sum: 1 },
            },
          },
        ]),
        this.DoctorSchedule.aggregate([
          {
            $project: {
              doctorId: 1,
              slotsPerDay: {
                $size: { $ifNull: ['$timeSlots', []] },
              },
              daysPerWeek: {
                $size: { $ifNull: ['$workingDays', []] },
              },
            },
          },
          {
            $group: {
              _id: '$doctorId',
              totalSlots: { $sum: { $multiply: ['$slotsPerDay', '$daysPerWeek', 4] } },
            },
          },
        ]),
      ]);

      const scheduleMap = new Map(
        scheduleSlots.map((s: Record<string, unknown>) => [String(s._id), s.totalSlots as number]),
      );

      const utilization = bookedSlots.map((d: Record<string, unknown>) => {
        const available = scheduleMap.get(String(d._id)) || 0;
        const booked = d.booked as number;
        return {
          doctorId: d._id,
          booked,
          available,
          utilization: available > 0 ? Math.round((booked / available) * 1000) / 10 : 0,
        };
      });

      utilization.sort((a, b) => b.utilization - a.utilization);

      return {
        summary: {
          doctorCount: utilization.length,
          avgUtilization:
            utilization.length > 0
              ? Math.round(
                  (utilization.reduce((s, d) => s + d.utilization, 0) / utilization.length) * 10,
                ) / 10
              : 0,
        },
        chart: utilization.map((d) => ({
          doctorId: d.doctorId,
          utilization: d.utilization,
          booked: d.booked,
        })),
        table: utilization,
      };
    });
  }

  // ── A3: Chair Utilization ─────────────────────────────────

  async chairUtilization(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'chair_utilization', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const result = await this.Appointment.aggregate([
        { $match: { ...match, status: { $nin: ['cancelled', 'no_show'] } } },
        {
          $group: {
            _id: { $ifNull: ['$chairId', '$roomId'] },
            totalAppointments: { $sum: 1 },
            totalMinutes: { $sum: { $ifNull: ['$duration', 30] } },
          },
        },
        { $sort: { totalAppointments: -1 } },
      ]);

      const totalAppts = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalAppointments || 0),
        0,
      );

      return {
        summary: {
          chairCount: result.length,
          totalAppointments: totalAppts,
        },
        chart: result.map((d: Record<string, unknown>) => ({
          chairId: d._id || 'Unassigned',
          appointments: d.totalAppointments,
          totalMinutes: d.totalMinutes,
          occupancy:
            totalAppts > 0
              ? Math.round(((d.totalAppointments as number) / totalAppts) * 1000) / 10
              : 0,
        })),
        table: result,
      };
    });
  }

  // ── A4: Cancellation Analysis ─────────────────────────────

  async cancellationAnalysis(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'cancellation_analysis', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = { status: 'cancelled' };
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const [byReason, trend, totalAppointments] = await Promise.all([
        this.Appointment.aggregate([
          { $match: match },
          {
            $group: {
              _id: { $ifNull: ['$cancellationReason', 'Unknown'] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),
        this.Appointment.aggregate([
          { $match: match },
          {
            $group: {
              _id: { year: { $year: '$date' }, week: { $isoWeek: '$date' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
        ]),
        this.Appointment.countDocuments({
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
          ...(filters.from || filters.to
            ? {
                date: {
                  ...(filters.from ? { $gte: new Date(filters.from) } : {}),
                  ...(filters.to ? { $lte: new Date(filters.to) } : {}),
                },
              }
            : {}),
        }),
      ]);

      const cancelledTotal = byReason.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );

      return {
        summary: {
          totalCancelled: cancelledTotal,
          totalAppointments,
          cancellationRate:
            totalAppointments > 0
              ? Math.round((cancelledTotal / totalAppointments) * 1000) / 10
              : 0,
          reasonCount: byReason.length,
        },
        chart: trend.map((d: Record<string, unknown>) => ({
          period: d._id,
          cancellations: d.count,
        })),
        table: byReason.map((d: Record<string, unknown>) => ({
          reason: d._id,
          count: d.count,
          percentage:
            cancelledTotal > 0 ? Math.round(((d.count as number) / cancelledTotal) * 1000) / 10 : 0,
        })),
      };
    });
  }

  // ── A5: Peak Hours Heatmap ────────────────────────────────

  async peakHoursHeatmap(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'peak_hours', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const result = await this.Appointment.aggregate([
        { $match: { ...match, status: { $nin: ['cancelled'] } } },
        {
          $group: {
            _id: {
              dayOfWeek: { $dayOfWeek: '$date' },
              hour: { $hour: '$date' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Build 7×24 heatmap matrix
      const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      for (const row of result) {
        const d = row as Record<string, unknown>;
        const id = d._id as Record<string, number>;
        const dayIdx = (id.dayOfWeek || 1) - 1; // MongoDB: 1=Sun ... 7=Sat
        const hour = id.hour || 0;
        if (dayIdx >= 0 && dayIdx < 7 && hour >= 0 && hour < 24) {
          matrix[dayIdx][hour] = d.count as number;
        }
      }

      const peakSlot = result[0]
        ? {
            dayOfWeek: ((result[0] as Record<string, unknown>)._id as Record<string, number>)
              .dayOfWeek,
            hour: ((result[0] as Record<string, unknown>)._id as Record<string, number>).hour,
            count: (result[0] as Record<string, number>).count,
          }
        : null;

      return {
        summary: {
          totalSlots: result.reduce(
            (sum: number, r: Record<string, number>) => sum + (r.count || 0),
            0,
          ),
          peakSlot,
        },
        chart: matrix,
        table: result.map((d: Record<string, unknown>) => ({
          dayOfWeek: (d._id as Record<string, number>).dayOfWeek,
          hour: (d._id as Record<string, number>).hour,
          count: d.count,
        })),
      };
    });
  }

  // ── A6: Average Duration Analysis ─────────────────────────

  async avgDurationAnalysis(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'avg_duration', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {
        status: { $in: ['completed'] },
        duration: { $exists: true, $gt: 0 },
      };
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.doctorId) match.doctorId = filters.doctorId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const [byServiceType, byDoctor] = await Promise.all([
        this.Appointment.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$serviceType',
              avgDuration: { $avg: '$duration' },
              minDuration: { $min: '$duration' },
              maxDuration: { $max: '$duration' },
              count: { $sum: 1 },
            },
          },
          { $sort: { avgDuration: -1 } },
        ]),
        this.Appointment.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$doctorId',
              avgDuration: { $avg: '$duration' },
              count: { $sum: 1 },
            },
          },
          { $sort: { avgDuration: -1 } },
        ]),
      ]);

      const allDurations = [...byServiceType, ...byDoctor];
      const totalCount = allDurations.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );
      const avgOverall =
        totalCount > 0
          ? byServiceType.reduce(
              (sum: number, r: Record<string, number>) =>
                sum + (r.avgDuration || 0) * (r.count || 0),
              0,
            ) / totalCount
          : 0;

      return {
        summary: {
          avgDuration: Math.round(avgOverall * 10) / 10,
          totalAppointments: byServiceType.reduce(
            (sum: number, r: Record<string, number>) => sum + (r.count || 0),
            0,
          ),
        },
        chart: byServiceType.map((d: Record<string, unknown>) => ({
          serviceType: d._id || 'General',
          avgDuration: Math.round((d.avgDuration as number) * 10) / 10,
          count: d.count,
        })),
        table: byDoctor.map((d: Record<string, unknown>) => ({
          doctorId: d._id,
          avgDuration: Math.round((d.avgDuration as number) * 10) / 10,
          count: d.count,
        })),
      };
    });
  }

  // ══════════════════════════════════════════════════════════
  // CLINICAL PIPELINES (C1–C4)
  // ══════════════════════════════════════════════════════════

  // ── C1: Procedures Performed ──────────────────────────────

  async proceduresPerformed(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'procedures_performed', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = buildDateMatch(filters);

      const [byType, byDoctor] = await Promise.all([
        this.ProcedureNote.aggregate([
          { $match: match },
          { $unwind: { path: '$procedures', preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: '$procedures.procedureCode',
              name: { $first: '$procedures.procedureName' },
              count: { $sum: 1 },
              totalFee: { $sum: { $ifNull: ['$procedures.fee', 0] } },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 50 },
        ]),
        this.ProcedureNote.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$doctorId',
              noteCount: { $sum: 1 },
              procedureCount: { $sum: { $size: { $ifNull: ['$procedures', []] } } },
            },
          },
          { $sort: { procedureCount: -1 } },
        ]),
      ]);

      const totalProcedures = byType.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );
      const totalRevenue = byType.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.totalFee || 0),
        0,
      );

      return {
        summary: { totalProcedures, totalRevenue, procedureTypeCount: byType.length },
        chart: byType.slice(0, 15).map((d: Record<string, unknown>) => ({
          code: d._id,
          name: d.name,
          count: d.count,
          revenue: d.totalFee,
        })),
        table: byDoctor.map((d: Record<string, unknown>) => ({
          doctorId: d._id,
          noteCount: d.noteCount,
          procedureCount: d.procedureCount,
        })),
      };
    });
  }

  // ── C2: Treatment Plan Acceptance ─────────────────────────

  async treatmentPlanAcceptance(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'treatment_plan_acceptance', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = buildDateMatch(filters);

      const result = await this.TreatmentPlan.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalEstimate: { $sum: { $ifNull: ['$estimatedCost', 0] } },
          },
        },
      ]);

      const total = result.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );
      const accepted =
        (
          result.find((r: Record<string, unknown>) => r._id === 'accepted') as Record<
            string,
            number
          >
        )?.count || 0;
      const completed =
        (
          result.find((r: Record<string, unknown>) => r._id === 'completed') as Record<
            string,
            number
          >
        )?.count || 0;

      return {
        summary: {
          totalPlans: total,
          accepted,
          completed,
          acceptanceRate: total > 0 ? Math.round(((accepted + completed) / total) * 1000) / 10 : 0,
        },
        chart: result.map((d: Record<string, unknown>) => ({
          status: d._id,
          count: d.count,
          estimate: d.totalEstimate,
        })),
        table: result,
      };
    });
  }

  // ── C3: Lab Order Turnaround ──────────────────────────────

  async labOrderTurnaround(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'lab_order_turnaround', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {
        status: 'completed',
        completedAt: { $exists: true },
      };
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.createdAt = {};
        if (filters.from)
          (match.createdAt as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.createdAt as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const result = await this.LabOrder.aggregate([
        { $match: match },
        {
          $addFields: {
            turnaroundHours: {
              $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 1000 * 60 * 60],
            },
          },
        },
        {
          $group: {
            _id: '$labId',
            avgTurnaround: { $avg: '$turnaroundHours' },
            minTurnaround: { $min: '$turnaroundHours' },
            maxTurnaround: { $max: '$turnaroundHours' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { avgTurnaround: 1 } },
      ]);

      const overallAvg =
        result.length > 0
          ? result.reduce(
              (sum: number, r: Record<string, number>) =>
                sum + (r.avgTurnaround || 0) * (r.orderCount || 0),
              0,
            ) /
            result.reduce((sum: number, r: Record<string, number>) => sum + (r.orderCount || 0), 0)
          : 0;

      return {
        summary: {
          avgTurnaroundHours: Math.round(overallAvg * 10) / 10,
          labCount: result.length,
          totalOrders: result.reduce(
            (sum: number, r: Record<string, number>) => sum + (r.orderCount || 0),
            0,
          ),
        },
        chart: result.map((d: Record<string, unknown>) => ({
          labId: d._id,
          avgHours: Math.round((d.avgTurnaround as number) * 10) / 10,
          orders: d.orderCount,
        })),
        table: result.map((d: Record<string, unknown>) => ({
          labId: d._id,
          avgTurnaround: Math.round((d.avgTurnaround as number) * 10) / 10,
          minTurnaround: Math.round((d.minTurnaround as number) * 10) / 10,
          maxTurnaround: Math.round((d.maxTurnaround as number) * 10) / 10,
          orderCount: d.orderCount,
        })),
      };
    });
  }

  // ── C4: Prescription Volume ───────────────────────────────

  async prescriptionVolume(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'prescription_volume', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match = buildDateMatch(filters);
      const periodGroupId = buildPeriodGroupId(filters.period);

      const [byMedication, byDoctor, trend] = await Promise.all([
        this.Prescription.aggregate([
          { $match: match },
          { $unwind: { path: '$medications', preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: '$medications.medicationId',
              name: { $first: '$medications.medicationName' },
              count: { $sum: 1 },
              totalQuantity: { $sum: { $ifNull: ['$medications.quantity', 1] } },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 30 },
        ]),
        this.Prescription.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$doctorId',
              prescriptionCount: { $sum: 1 },
              medicationCount: { $sum: { $size: { $ifNull: ['$medications', []] } } },
            },
          },
          { $sort: { prescriptionCount: -1 } },
        ]),
        this.Prescription.aggregate([
          { $match: match },
          {
            $group: {
              _id: periodGroupId,
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
      ]);

      const totalPrescriptions = byDoctor.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.prescriptionCount || 0),
        0,
      );

      return {
        summary: {
          totalPrescriptions,
          uniqueMedications: byMedication.length,
          doctorCount: byDoctor.length,
        },
        chart: trend.map((d: Record<string, unknown>) => ({
          period: d._id,
          prescriptions: d.count,
        })),
        table: byMedication.map((d: Record<string, unknown>) => ({
          medicationId: d._id,
          name: d.name,
          prescriptionCount: d.count,
          totalQuantity: d.totalQuantity,
        })),
      };
    });
  }

  // ══════════════════════════════════════════════════════════
  // OPERATIONAL PIPELINES (O3–O4)
  // ══════════════════════════════════════════════════════════

  // ── O3: Wait Time Analysis ────────────────────────────────

  async waitTimeAnalysis(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'wait_time_analysis', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {
        status: { $in: ['completed', 'in_progress'] },
        actualStartTime: { $exists: true },
        scheduledTime: { $exists: true },
      };
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const [byBranch, byDoctor] = await Promise.all([
        this.Appointment.aggregate([
          { $match: match },
          {
            $addFields: {
              waitMinutes: {
                $divide: [{ $subtract: ['$actualStartTime', '$scheduledTime'] }, 1000 * 60],
              },
            },
          },
          { $match: { waitMinutes: { $gte: 0 } } },
          {
            $group: {
              _id: '$branchId',
              avgWait: { $avg: '$waitMinutes' },
              maxWait: { $max: '$waitMinutes' },
              count: { $sum: 1 },
            },
          },
          { $sort: { avgWait: -1 } },
        ]),
        this.Appointment.aggregate([
          { $match: match },
          {
            $addFields: {
              waitMinutes: {
                $divide: [{ $subtract: ['$actualStartTime', '$scheduledTime'] }, 1000 * 60],
              },
            },
          },
          { $match: { waitMinutes: { $gte: 0 } } },
          {
            $group: {
              _id: '$doctorId',
              avgWait: { $avg: '$waitMinutes' },
              maxWait: { $max: '$waitMinutes' },
              count: { $sum: 1 },
            },
          },
          { $sort: { avgWait: -1 } },
        ]),
      ]);

      const allWaits = [...byBranch];
      const totalCount = allWaits.reduce(
        (sum: number, r: Record<string, number>) => sum + (r.count || 0),
        0,
      );
      const avgOverall =
        totalCount > 0
          ? allWaits.reduce(
              (sum: number, r: Record<string, number>) => sum + (r.avgWait || 0) * (r.count || 0),
              0,
            ) / totalCount
          : 0;

      return {
        summary: {
          avgWaitMinutes: Math.round(avgOverall * 10) / 10,
          totalAppointments: totalCount,
        },
        chart: byBranch.map((d: Record<string, unknown>) => ({
          branchId: d._id,
          avgWait: Math.round((d.avgWait as number) * 10) / 10,
          maxWait: Math.round((d.maxWait as number) * 10) / 10,
          count: d.count,
        })),
        table: byDoctor.map((d: Record<string, unknown>) => ({
          doctorId: d._id,
          avgWait: Math.round((d.avgWait as number) * 10) / 10,
          maxWait: Math.round((d.maxWait as number) * 10) / 10,
          count: d.count,
        })),
      };
    });
  }

  // ── O4: Staff Productivity ────────────────────────────────

  async staffProductivity(filters: ReportFilters) {
    const key = cacheKey(this.tenantId, 'staff_productivity', filters);
    return getOrSet(key, CACHE_TTL, async () => {
      const match: Record<string, unknown> = {};
      if (filters.branchId) match.branchId = filters.branchId;
      if (filters.from || filters.to) {
        match.date = {};
        if (filters.from) (match.date as Record<string, unknown>).$gte = new Date(filters.from);
        if (filters.to) (match.date as Record<string, unknown>).$lte = new Date(filters.to);
      }

      const [appointmentData, revenueData] = await Promise.all([
        this.Appointment.aggregate([
          { $match: { ...match, status: { $in: ['completed'] } } },
          {
            $group: {
              _id: '$doctorId',
              appointments: { $sum: 1 },
              workDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
            },
          },
          {
            $addFields: {
              uniqueWorkDays: { $size: '$workDays' },
              apptPerDay: {
                $cond: [
                  { $gt: [{ $size: '$workDays' }, 0] },
                  { $divide: ['$appointments', { $size: '$workDays' }] },
                  0,
                ],
              },
            },
          },
          { $sort: { appointments: -1 } },
        ]),
        this.Invoice.aggregate([
          {
            $match: {
              ...buildDateMatch(filters),
              status: { $in: ['paid', 'partially_paid'] },
            },
          },
          {
            $lookup: {
              from: 'appointments',
              localField: 'appointmentId',
              foreignField: '_id',
              as: 'appointment',
            },
          },
          { $unwind: { path: '$appointment', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: '$appointment.doctorId',
              totalRevenue: { $sum: '$totalAmount' },
              invoiceCount: { $sum: 1 },
            },
          },
        ]),
      ]);

      const revenueMap = new Map(
        revenueData.map((r: Record<string, unknown>) => [String(r._id), r]),
      );

      const productivity = appointmentData.map((d: Record<string, unknown>) => {
        const rev = (revenueMap.get(String(d._id)) as Record<string, number>) || {};
        return {
          doctorId: d._id,
          appointments: d.appointments,
          workDays: d.uniqueWorkDays,
          apptPerDay: Math.round((d.apptPerDay as number) * 10) / 10,
          revenue: rev.totalRevenue || 0,
          revenuePerAppointment:
            (d.appointments as number) > 0
              ? Math.round(((rev.totalRevenue || 0) / (d.appointments as number)) * 100) / 100
              : 0,
        };
      });

      const totalAppts = productivity.reduce((s, d) => s + (d.appointments as number), 0);
      const totalRev = productivity.reduce((s, d) => s + d.revenue, 0);

      return {
        summary: {
          doctorCount: productivity.length,
          totalAppointments: totalAppts,
          totalRevenue: totalRev,
          avgApptPerDoctor:
            productivity.length > 0 ? Math.round((totalAppts / productivity.length) * 10) / 10 : 0,
        },
        chart: productivity.map((d) => ({
          doctorId: d.doctorId,
          appointments: d.appointments,
          revenue: d.revenue,
        })),
        table: productivity,
      };
    });
  }
}

import { SaaSPayment } from '../models/payment.model.js';
import { Tenant } from '../models/tenant.model.js';
import { DunningLog } from '../models/dunning-log.model.js';
import { getEmailQueue } from '../../services/notification.service.js';
import { dunningEmailHtml } from '../../utils/email-templates.js';
import { logger } from '../../utils/logger.js';
import { regexContains } from '../../tenant/services/search.helpers.js';

/**
 * Billing Service — Phase 6 (Gap A4)
 *
 * Per MASTER_PLAN §29 — Billing Dashboard
 * Provides MRR/ARR calculations, invoice queries, and dunning.
 *
 * Pattern: standalone exported async functions (per error-log.service.ts)
 */

// ── Types ───────────────────────────────────────────────────

export interface BillingInvoiceFilter {
  tenantId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Service Functions ──────────────────────────────────────

/**
 * Get billing stats — MRR, ARR, revenue breakdown, subscriptions
 */
export async function getBillingStats() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [revenueStats, paymentMethodBreakdown, revenueTimeline, activeSubscriptions, overdueCount] =
    await Promise.all([
      // Revenue aggregation
      SaaSPayment.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] },
            },
            outstandingAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] },
            },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $eq: ['$status', 'completed'] }, { $gte: ['$paidAt', monthAgo] }],
                  },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Payment method breakdown
      SaaSPayment.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Revenue timeline (last 12 months)
      SaaSPayment.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),

      // Active subscriptions (tenants with active status)
      Tenant.countDocuments({ status: 'active' }),

      // Overdue (pending payments older than 30 days)
      SaaSPayment.countDocuments({
        status: 'pending',
        createdAt: { $lte: monthAgo },
      }),
    ]);

  const stats = revenueStats[0] ?? { totalRevenue: 0, outstandingAmount: 0, monthlyRevenue: 0 };
  const mrr = stats.monthlyRevenue;
  const arr = mrr * 12;

  return {
    mrr,
    arr,
    totalRevenue: stats.totalRevenue,
    outstandingAmount: stats.outstandingAmount,
    overdueInvoices: overdueCount,
    activeSubscriptions,
    churnRate: 0, // Calculated separately with tenant history
    revenueByPlan: [], // Requires plan data mapping
    revenueTimeline: revenueTimeline.map((r: { _id: string; revenue: number }) => ({
      month: r._id,
      revenue: r.revenue,
    })),
    paymentMethodBreakdown: paymentMethodBreakdown.map(
      (p: { _id: string; count: number; total: number }) => ({
        method: p._id,
        count: p.count,
        total: p.total,
      }),
    ),
  };
}

/**
 * List invoices (SaaS payments) with filters + pagination
 */
export async function listInvoices(filter: BillingInvoiceFilter) {
  const query: Record<string, unknown> = {};

  if (filter.tenantId) query.tenantId = filter.tenantId;
  if (filter.status) query.status = filter.status;

  if (filter.startDate || filter.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.$gte = filter.startDate;
    if (filter.endDate) dateFilter.$lte = filter.endDate;
    query.createdAt = dateFilter;
  }

  if (filter.search) {
    const rx = regexContains(filter.search);
    query.$or = [{ invoiceId: rx }, { providerPaymentId: rx }];
  }

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    SaaSPayment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('tenantId', 'name slug status')
      .lean(),
    SaaSPayment.countDocuments(query),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single invoice by ID
 */
export async function getInvoiceById(id: string) {
  return SaaSPayment.findById(id).populate('tenantId', 'name slug status contact').lean();
}

/**
 * Send dunning reminder — emails the tenant contact about an overdue payment
 */
export async function sendDunningReminder(invoiceId: string) {
  const payment = await SaaSPayment.findById(invoiceId)
    .populate('tenantId', 'name slug contact')
    .lean();

  if (!payment) return null;
  if (payment.status !== 'pending' && (payment.status as string) !== 'overdue') return null;

  const tenant = payment.tenantId as unknown as {
    _id: any;
    name: { en: string; ar?: string } | string;
    slug: string;
    contact?: { email?: string };
  } | null;

  if (!tenant?.contact?.email) {
    logger.warn({ invoiceId }, 'No tenant contact email for dunning reminder');
    return { sent: false, invoiceId: payment.invoiceId, channel: 'email' as const };
  }

  const tenantName = typeof tenant.name === 'object' ? tenant.name.en : String(tenant.name);
  const invoiceNumber = payment.invoiceId ?? invoiceId;
  const amount = `${payment.currency ?? 'USD'} ${payment.amount}`;
  const dueDate = payment.createdAt
    ? new Date(payment.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';
  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  );

  const html = dunningEmailHtml({
    tenantName,
    invoiceNumber,
    amount,
    dueDate,
    escalationLevel: 'reminder',
    daysOverdue,
  });

  await getEmailQueue().add('send-email', {
    to: tenant.contact.email,
    subject: `Payment Reminder — Invoice ${invoiceNumber}`,
    html,
    templateKey: 'dunning_reminder',
    tenantId: tenant.slug,
    logId: '',
  });

  // Log the manual dunning action
  await DunningLog.create({
    tenantId: tenant._id,
    invoiceId: payment._id,
    attempt: 1,
    channel: 'email',
    sentAt: new Date(),
    status: 'sent',
    escalationLevel: 'reminder',
  });

  logger.info(
    { invoiceId: payment.invoiceId, tenantSlug: tenant.slug },
    'Manual dunning reminder sent',
  );

  return {
    sent: true,
    invoiceId: payment.invoiceId,
    channel: 'email' as const,
  };
}

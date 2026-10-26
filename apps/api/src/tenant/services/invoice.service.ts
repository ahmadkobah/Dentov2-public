import mongoose, { type Connection, type QueryFilter } from 'mongoose';
import type { IInvoice } from '../models/invoice.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { getTreatmentPlanModel, type ITreatmentPlanItem } from '../models/treatment-plan.model.js';
import { getSettingsModel, type ISettings } from '../models/settings.model.js';
import { regexContains, patientNameOrClause } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceQuery,
  GenerateInvoiceFromPlanInput,
} from '@dento/shared';
import { VALID_INVOICE_STATUS_TRANSITIONS } from '@dento/shared';
import type { InvoiceStatus } from '../models/invoice.model.js';
import { dispatchWebhook } from './webhook-dispatcher.js';
import { logger } from '../../utils/logger.js';
import { sendEmail } from '../../services/providers/email.provider.js';
import { invoiceEmailHtml } from '../../utils/email-templates.js';
import { NotificationService } from '../../services/notification.service.js';

/**
 * Lean settings document augmented with the optional clinic-branding fields the
 * invoice PDF/email branding logic reads. These are not part of the typed
 * ISettings schema (they live on the settings `value` payload), so they are
 * declared optional here for type-safe, defensive access.
 */
type SettingsWithBranding = ISettings & {
  clinicName?: unknown;
  logo?: unknown;
  taxId?: unknown;
  address?: unknown;
};

/**
 * Invoice Service — Business logic for invoice CRUD
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 (#8 Invoices)
 * Per V2_DATABASE.md §5.7 — invoices collection
 *
 * Handles:
 * - CRUD with pagination/filtering
 * - Auto-generate invoice number: {prefix}-{year}-{seq}
 * - Generate invoice from treatment plan
 * - Status transitions (draft → issued → paid, etc.)
 * - Webhook dispatch for invoice events
 */

/**
 * Aggregation `$match` does not auto-cast string ids to ObjectId (unlike
 * `find`), so branch/id filters silently match nothing. Cast when valid.
 */
function toMatchId(id: string): mongoose.Types.ObjectId | string {
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;
}

export class InvoiceService {
  private Invoice;
  private tenantDb: Connection;
  private tenantSlug: string;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.tenantSlug = tenantDb.name?.replace('tenant_', '') || '';
    this.Invoice = getInvoiceModel(tenantDb);
  }

  // ── List Invoices (paginated, filterable) ─────────────────

  async list(query: InvoiceQuery) {
    const {
      page,
      limit,
      search,
      status,
      patientId,
      branchId,
      doctorId,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IInvoice> = {};

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (branchId) filter.branchId = branchId;
    if (doctorId) filter.doctorId = doctorId;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: regexContains(search) },
        ...(await patientNameOrClause(this.tenantDb, search)),
      ];
    }

    const [invoices, total] = await Promise.all([
      this.Invoice.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate('patientId', 'firstName lastName patientCode')
        .lean(),
      this.Invoice.countDocuments(filter),
    ]);

    return {
      invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Invoice by ID ─────────────────────────────────────

  async getById(id: string) {
    const invoice = await this.Invoice.findById(id)
      .populate('patientId', 'firstName lastName patientCode phone email')
      .populate('branchId', 'name')
      .lean();

    if (!invoice) {
      throw ApiError.notFound('Invoice');
    }

    return invoice;
  }

  // ── Create Invoice ────────────────────────────────────────

  async create(data: CreateInvoiceInput, userId: string) {
    // Resolve effective tax rate: use provided value, or fall back to clinic settings.
    // An explicitly provided 0 (tax-exempt) must be honored — only fall back to the
    // clinic default when the client omitted taxPercentage entirely.
    let effectiveTaxPercentage = data.taxPercentage ?? 0;
    if (data.taxPercentage === undefined) {
      try {
        const Settings = getSettingsModel(this.tenantDb);
        const clinicDoc = await Settings.findOne({ key: 'clinic' }).lean();
        const clinicVal = clinicDoc?.value as Record<string, unknown> | undefined;
        if (clinicVal?.taxEnabled && typeof clinicVal.taxPercentage === 'number') {
          effectiveTaxPercentage = clinicVal.taxPercentage;
        }
      } catch {
        // If settings fetch fails, continue with 0
      }
    }

    // Recalculate totals to prevent client-side manipulation
    const items = data.items.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice - item.discount,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    // An explicitly provided 0% discount must be honored (not treated as unset
    // and fall through to a fixed discountAmount).
    const discountAmount =
      data.discountPercentage !== undefined
        ? subtotal * (data.discountPercentage / 100)
        : data.discountAmount || 0;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = effectiveTaxPercentage ? afterDiscount * (effectiveTaxPercentage / 100) : 0;
    const totalAmount = afterDiscount + taxAmount;

    const invoice = await this.Invoice.create({
      ...data,
      items,
      subtotal,
      discountAmount,
      taxPercentage: effectiveTaxPercentage,
      taxAmount,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      patientResponsibility: data.patientResponsibility ?? totalAmount - (data.insuredAmount || 0),
      createdBy: userId,
    });

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'invoice.created',
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          patientId: invoice.patientId,
          totalAmount: invoice.totalAmount,
          status: invoice.status,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch invoice.created webhook');
    }

    // Phase 2.4 — Notify patient that invoice has been issued
    try {
      const notif = new NotificationService(this.tenantDb, this.tenantSlug);
      notif
        .send({
          templateKey: 'invoice.created',
          tenantId: this.tenantSlug,
          recipients: [{ patientId: invoice.patientId.toString() }],
          variables: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: String(invoice.totalAmount),
            balanceDue: String(invoice.balanceDue),
          },
          relatedEntity: { type: 'invoice' as const, id: invoice._id.toString() },
        })
        .catch((err) => logger.warn({ err }, 'invoice.created notification failed'));
    } catch (err) {
      logger.warn({ err }, 'invoice.created notification setup failed');
    }

    return invoice;
  }

  // ── Update Invoice (only if draft) ────────────────────────

  async update(id: string, data: UpdateInvoiceInput, userId: string) {
    const invoice = await this.Invoice.findById(id);
    if (!invoice) throw ApiError.notFound('Invoice');
    if (invoice.status !== 'draft') {
      throw ApiError.badRequest('Only draft invoices can be edited');
    }

    // Recalculate if items provided
    if (data.items) {
      const items = data.items.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice - item.discount,
      }));
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);

      // Discount precedence: an explicitly provided percentage (including 0)
      // wins and recomputes the amount from the subtotal; then an explicit
      // amount; otherwise recompute from the stored percentage (or keep the
      // stored amount when no percentage is set). Branching on `!== undefined`
      // ensures a client setting the discount to 0 zeroes the amount rather
      // than keeping the previously-stored value.
      let discountPercentage: number;
      let discountAmount: number;
      if (data.discountPercentage !== undefined) {
        discountPercentage = data.discountPercentage;
        discountAmount = subtotal * (discountPercentage / 100);
      } else if (data.discountAmount !== undefined) {
        discountPercentage = invoice.discountPercentage;
        discountAmount = data.discountAmount;
      } else {
        discountPercentage = invoice.discountPercentage;
        discountAmount = discountPercentage
          ? subtotal * (discountPercentage / 100)
          : invoice.discountAmount;
      }

      const afterDiscount = subtotal - discountAmount;

      // Tax precedence mirrors discount: an explicit 0 zeroes the tax amount.
      let taxPercentage: number;
      let taxAmount: number;
      if (data.taxPercentage !== undefined) {
        taxPercentage = data.taxPercentage;
        taxAmount = afterDiscount * (taxPercentage / 100);
      } else if (data.taxAmount !== undefined) {
        taxPercentage = invoice.taxPercentage;
        taxAmount = data.taxAmount;
      } else {
        taxPercentage = invoice.taxPercentage;
        taxAmount = taxPercentage ? afterDiscount * (taxPercentage / 100) : invoice.taxAmount;
      }

      const totalAmount = afterDiscount + taxAmount;

      Object.assign(invoice, {
        items,
        subtotal,
        discountAmount,
        discountPercentage,
        taxAmount,
        taxPercentage,
        totalAmount,
        balanceDue: totalAmount - invoice.amountPaid,
      });
    }

    // Apply other fields
    if (data.notes !== undefined) invoice.notes = data.notes;
    if (data.terms !== undefined) invoice.terms = data.terms;
    if (data.dueDate !== undefined)
      invoice.dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
    if (data.currency !== undefined) invoice.currency = data.currency;
    if (data.insuranceClaimId !== undefined)
      (invoice as unknown as Record<string, unknown>).insuranceClaimId = data.insuranceClaimId;
    if (data.insuredAmount !== undefined) invoice.insuredAmount = data.insuredAmount;

    invoice.updatedBy = userId as unknown as IInvoice['updatedBy'];
    await invoice.save();

    return invoice;
  }

  // ── Issue Invoice (draft → issued) ────────────────────────

  async issue(id: string, userId: string) {
    const invoice = await this.Invoice.findById(id);
    if (!invoice) throw ApiError.notFound('Invoice');

    this.validateStatusTransition(invoice.status, 'issued');

    invoice.status = 'issued';
    invoice.issueDate = new Date();
    invoice.updatedBy = userId as unknown as IInvoice['updatedBy'];
    await invoice.save();

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'invoice.issued',
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: 'issued',
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch invoice.issued webhook');
    }

    return invoice;
  }

  // ── Cancel Invoice ────────────────────────────────────────

  async cancel(id: string, userId: string) {
    const invoice = await this.Invoice.findById(id);
    if (!invoice) throw ApiError.notFound('Invoice');

    this.validateStatusTransition(invoice.status, 'cancelled');

    invoice.status = 'cancelled';
    invoice.updatedBy = userId as unknown as IInvoice['updatedBy'];
    await invoice.save();

    return invoice;
  }

  // ── Generate Invoice from Treatment Plan ──────────────────

  async generateFromTreatmentPlan(data: GenerateInvoiceFromPlanInput, userId: string) {
    const TreatmentPlan = getTreatmentPlanModel(this.tenantDb);
    const plan = await TreatmentPlan.findById(data.treatmentPlanId).lean();
    if (!plan) throw ApiError.notFound('Treatment Plan');

    // Convert plan items to invoice items. Treatment-plan items are typed as
    // ITreatmentPlanItem; `quantity`/`unitPrice`/`discount` are not part of that
    // schema, so they are read through an optional-field view and fall back to
    // the item cost / defaults — preserving the original defensive behavior.
    const items = (plan.items || []).map((item: ITreatmentPlanItem) => {
      const billing = item as ITreatmentPlanItem & {
        quantity?: number;
        unitPrice?: number;
        discount?: number;
      };
      return {
        description: item.description || item.procedureName || 'Treatment',
        treatmentId: item._id?.toString(),
        serviceId: item.serviceId?.toString(),
        toothNumber: item.toothNumber,
        quantity: billing.quantity || 1,
        unitPrice: billing.unitPrice || item.cost || 0,
        discount: billing.discount || 0,
        total:
          (billing.quantity || 1) * (billing.unitPrice || item.cost || 0) - (billing.discount || 0),
      };
    });

    if (items.length === 0) {
      throw ApiError.badRequest('Treatment plan has no items to invoice');
    }

    const subtotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);

    const invoice = await this.Invoice.create({
      patientId: plan.patientId,
      branchId: data.branchId,
      treatmentPlanId: data.treatmentPlanId,
      doctorId: plan.doctorId,
      items,
      subtotal,
      discountAmount: 0,
      discountPercentage: 0,
      taxAmount: 0,
      taxPercentage: 0,
      totalAmount: subtotal,
      amountPaid: 0,
      balanceDue: subtotal,
      currency: data.currency,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
      status: 'draft',
      insuredAmount: 0,
      patientResponsibility: subtotal,
      createdBy: userId,
    });

    // Phase 7.1 — sync billed amount/invoice back to plan items
    try {
      const itemUpdates: Record<string, { billedAmount: number; billedInvoiceId: unknown }> = {};
      for (const item of items) {
        if (item.treatmentId) {
          itemUpdates[item.treatmentId] = {
            billedAmount: item.total,
            billedInvoiceId: invoice._id,
          };
        }
      }
      if (Object.keys(itemUpdates).length > 0) {
        const planDoc = await TreatmentPlan.findById(data.treatmentPlanId);
        if (planDoc) {
          for (const planItem of planDoc.items) {
            const upd = itemUpdates[(planItem._id as { toString(): string }).toString()];
            if (upd) {
              planItem.billedAmount = upd.billedAmount;
              planItem.billedInvoiceId = invoice._id as never;
            }
          }
          await planDoc.save();
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to sync billed amounts back to treatment plan');
    }

    return invoice;
  }

  // ── Record Payment (update amounts — called from PaymentService) ───

  async recordPayment(invoiceId: string, amount: number) {
    const invoice = await this.Invoice.findById(invoiceId);
    if (!invoice) throw ApiError.notFound('Invoice');

    // Defense-in-depth: reject over-payment (also pre-checked in PaymentService.create)
    // so the balanceDue { min: 0 } model validator can never throw a 500 here.
    if (amount > invoice.balanceDue) {
      throw ApiError.badRequest(
        `Payment amount (${amount}) exceeds the invoice balance due (${invoice.balanceDue})`,
      );
    }

    invoice.amountPaid += amount;
    invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

    if (invoice.balanceDue <= 0) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      invoice.balanceDue = 0;
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partially_paid';
    }

    await invoice.save();

    // Dispatch webhook if fully paid
    if (invoice.status === 'paid') {
      try {
        const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
        await dispatchWebhook(this.tenantDb, {
          tenantId: tenantSlug,
          tenantSlug,
          event: 'invoice.paid',
          data: {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            paidAt: invoice.paidAt,
          },
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to dispatch invoice.paid webhook');
      }

      // Phase 7.5 — auto-approve pending commissions for this invoice
      try {
        const { CommissionService } = await import('./commission.service.js');
        const commissionService = new CommissionService(this.tenantDb);
        await commissionService.autoApproveForInvoice(invoice._id.toString());
      } catch (err) {
        logger.warn({ err }, 'Failed to auto-approve commissions for paid invoice');
      }
    }

    return invoice;
  }

  // ── Reverse Payment (for refunds) ─────────────────────────

  async reversePayment(invoiceId: string, amount: number) {
    const invoice = await this.Invoice.findById(invoiceId);
    if (!invoice) throw ApiError.notFound('Invoice');

    invoice.amountPaid = Math.max(0, invoice.amountPaid - amount);
    invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

    if (invoice.amountPaid === 0 && invoice.status === 'paid') {
      invoice.status = 'refunded';
    } else if (invoice.amountPaid > 0 && invoice.amountPaid < invoice.totalAmount) {
      invoice.status = 'partially_paid';
    }

    invoice.paidAt = undefined;
    await invoice.save();

    return invoice;
  }

  // ── Refund Invoice (Phase 7.3) ────────────────────────────
  /**
   * Refunds completed payments for this invoice until the requested amount is met.
   * Refunds full payments greedily, newest-first. The total refunded amount must
   * equal the requested amount exactly — otherwise the operation fails.
   * Each refunded payment goes through PaymentService.refund (which reverses the
   * invoice balance, dispatches webhook, and notifies the patient).
   */
  async refundInvoice(invoiceId: string, amount: number, reason: string, userId: string) {
    if (!(amount > 0)) throw ApiError.badRequest('Refund amount must be greater than zero');

    const invoice = await this.Invoice.findById(invoiceId);
    if (!invoice) throw ApiError.notFound('Invoice');
    if (invoice.amountPaid <= 0) {
      throw ApiError.badRequest('Invoice has no payments to refund');
    }
    if (amount > invoice.amountPaid) {
      throw ApiError.badRequest(`Refund amount exceeds amount paid (${invoice.amountPaid})`);
    }

    // Dynamic import to avoid circular dependency (Payment ↔ Invoice).
    const { PaymentService } = await import('./payment.service.js');
    const { getTenantPaymentModel } = await import('../models/payment.model.js');
    const Payment = getTenantPaymentModel(this.tenantDb);

    const eligible = await Payment.find({
      invoiceId: invoice._id,
      status: 'completed',
    })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    // Pick payments in order until the sum matches `amount` exactly.
    const selected: { id: string; amount: number }[] = [];
    let running = 0;
    for (const p of eligible) {
      if (running >= amount) break;
      const remaining = amount - running;
      if ((p.amount as number) <= remaining + 1e-6) {
        selected.push({
          id: (p._id as { toString(): string }).toString(),
          amount: p.amount as number,
        });
        running += p.amount as number;
      }
    }

    if (Math.abs(running - amount) > 1e-6) {
      throw ApiError.badRequest(
        'Cannot refund exact amount from completed payments. Refund individual payments instead.',
      );
    }

    const paymentService = new PaymentService(this.tenantDb);
    const refunded: unknown[] = [];
    for (const sel of selected) {
      const r = await paymentService.refund(sel.id, { reason }, userId);
      refunded.push(r);
    }

    // Re-fetch the invoice state after refunds.
    const updated = await this.Invoice.findById(invoiceId);
    return { invoice: updated, refundedPayments: refunded, refundedAmount: running };
  }

  // ── Mark Overdue Invoices (cron-callable) ─────────────────

  async markOverdueInvoices(): Promise<{ overdueCount: number }> {
    const now = new Date();
    const result = await this.Invoice.updateMany(
      {
        status: 'issued',
        dueDate: { $lt: now },
      },
      { $set: { status: 'overdue' } },
    );

    const count = result.modifiedCount ?? 0;
    if (count > 0) {
      logger.info({ count }, 'Marked invoices as overdue');
      // Dispatch webhooks for overdue invoices
      const overdueInvoices = await this.Invoice.find({ status: 'overdue', dueDate: { $lt: now } })
        .select('_id invoiceNumber')
        .lean();
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      for (const inv of overdueInvoices) {
        try {
          await dispatchWebhook(this.tenantDb, {
            tenantId: tenantSlug,
            tenantSlug,
            event: 'invoice.overdue',
            data: {
              invoiceId: inv._id,
              invoiceNumber: inv.invoiceNumber,
              status: 'overdue',
            },
          });
        } catch {
          // Non-critical, continue
        }
      }
    }

    return { overdueCount: count };
  }

  // ── Void Invoice ────────────────────────────────────────────

  async void(id: string, userId: string) {
    const invoice = await this.Invoice.findById(id);
    if (!invoice) throw ApiError.notFound('Invoice');

    this.validateStatusTransition(invoice.status, 'cancelled');

    invoice.status = 'cancelled';
    invoice.updatedBy = userId as unknown as IInvoice['updatedBy'];
    invoice.notes = (invoice.notes || '') + '\n[VOIDED]';
    await invoice.save();

    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'invoice.voided',
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: 'cancelled',
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch invoice.voided webhook');
    }

    return invoice;
  }

  // ── Get Invoice Stats ─────────────────────────────────────

  async getStats(branchId?: string) {
    const match: Record<string, unknown> = {};
    if (branchId) match.branchId = toMatchId(branchId);

    const [stats] = await this.Invoice.aggregate([
      { $match: match },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                amountPaid: { $sum: '$amountPaid' },
                balanceDue: { $sum: '$balanceDue' },
              },
            },
          ],
          overall: [
            {
              $group: {
                _id: null,
                totalInvoices: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                totalCollected: { $sum: '$amountPaid' },
                totalOutstanding: { $sum: '$balanceDue' },
              },
            },
          ],
          recentMonth: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: '$totalAmount' },
              },
            },
          ],
        },
      },
    ]);

    return {
      byStatus: stats?.byStatus || [],
      overall: stats?.overall?.[0] || {
        totalInvoices: 0,
        totalRevenue: 0,
        totalCollected: 0,
        totalOutstanding: 0,
      },
      recentMonth: stats?.recentMonth?.[0] || { count: 0, amount: 0 },
    };
  }

  // ── Get Invoice PDF Data ──────────────────────────────────
  /**
   * Returns structured data for PDF generation (client-side @react-pdf/renderer).
   * Includes populated patient, branch, and settings for header/footer.
   */

  async getPdfData(id: string) {
    const invoice = await this.Invoice.findById(id)
      .populate('patientId', 'firstName lastName patientCode phone email address')
      .populate('branchId', 'name address phone email logo')
      .lean();

    if (!invoice) throw ApiError.notFound('Invoice');

    // Attempt to load clinic settings for PDF branding. Branding fields live on
    // the settings `value` payload rather than the typed ISettings document, so
    // the lean result is typed with optional branding fields.
    let settings: SettingsWithBranding | null = null;
    try {
      const Settings = getSettingsModel(this.tenantDb);
      settings = await Settings.findOne().lean<SettingsWithBranding>();
    } catch {
      // Settings model not available yet
    }

    return {
      invoice,
      settings: settings
        ? {
            clinicName: settings.clinicName,
            logo: settings.logo,
            taxId: settings.taxId,
            address: settings.address,
          }
        : null,
    };
  }

  // ── Send Invoice (email + mark as sent) ────────────────────

  async send(id: string, userId: string) {
    const invoice = await this.Invoice.findById(id)
      .populate('patientId', 'firstName lastName patientCode email')
      .populate('branchId', 'name');
    if (!invoice) throw ApiError.notFound('Invoice');

    if (invoice.status === 'draft') {
      // Auto-issue before sending
      this.validateStatusTransition(invoice.status, 'issued');
      invoice.status = 'issued';
      invoice.issueDate = new Date();
    }

    // Resolve patient email for sending
    const patient = typeof invoice.patientId === 'object' ? invoice.patientId : null;
    const patientEmail = (patient as unknown as Record<string, unknown>)?.email as
      string | undefined;
    const patientFirstName =
      ((patient as unknown as Record<string, unknown>)?.firstName as Record<string, string>)?.en ??
      '';
    const patientLastName =
      ((patient as unknown as Record<string, unknown>)?.lastName as Record<string, string>)?.en ??
      '';
    const patientFullName = `${patientFirstName} ${patientLastName}`.trim() || 'Patient';

    // Load clinic settings for branding
    let clinicName = 'Dento Clinic';
    try {
      const Settings = getSettingsModel(this.tenantDb);
      const settings = await Settings.findOne().lean<SettingsWithBranding>();
      if (settings && settings.clinicName) {
        const cn = settings.clinicName;
        clinicName =
          (typeof cn === 'object' && cn !== null
            ? (cn as Record<string, string>).en
            : String(cn)) || clinicName;
      }
    } catch {
      // Settings not available, use default
    }

    // Send actual email if patient has an email address
    if (patientEmail) {
      try {
        const cur = invoice.currency || 'SAR';
        const html = invoiceEmailHtml({
          invoiceNumber: invoice.invoiceNumber,
          patientName: patientFullName,
          totalAmount: invoice.totalAmount.toFixed(2),
          currency: cur,
          dueDate: invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : undefined,
          clinicName,
          items: ((invoice.items || []) as unknown as Record<string, unknown>[]).map(
            (item: Record<string, unknown>) => ({
              description: (item.description as string) || '',
              quantity: (item.quantity as number) || 1,
              total: `${cur} ${((item.total as number) || 0).toFixed(2)}`,
            }),
          ),
        });

        const result = await sendEmail({
          to: patientEmail,
          subject: `Invoice ${invoice.invoiceNumber} from ${clinicName}`,
          html,
        });

        if (result.success) {
          logger.info(
            { invoiceId: id, to: patientEmail, provider: result.provider },
            'Invoice email sent',
          );
        } else {
          logger.warn(
            { invoiceId: id, to: patientEmail, error: result.error },
            'Invoice email send failed',
          );
        }
      } catch (err) {
        logger.warn({ err, invoiceId: id }, 'Failed to send invoice email');
      }
    } else {
      logger.warn({ invoiceId: id }, 'No patient email, skipping email send');
    }

    // Mark as sent (metadata)
    (invoice as unknown as Record<string, unknown>).sentAt = new Date();
    (invoice as unknown as Record<string, unknown>).sentBy = userId;
    invoice.updatedBy = userId as unknown as IInvoice['updatedBy'];
    await invoice.save();

    // Dispatch webhook
    try {
      const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
      await dispatchWebhook(this.tenantDb, {
        tenantId: tenantSlug,
        tenantSlug,
        event: 'invoice.sent',
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          patientId: invoice.patientId,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to dispatch invoice.sent webhook');
    }

    logger.info({ invoiceId: id }, 'Invoice sent');
    return invoice;
  }

  // ── Status Transition Validation ──────────────────────────

  private validateStatusTransition(
    currentStatus: InvoiceStatus,
    targetStatus: InvoiceStatus,
  ): void {
    const allowed = VALID_INVOICE_STATUS_TRANSITIONS[currentStatus];
    if (!allowed?.includes(targetStatus)) {
      throw ApiError.badRequest(
        `Cannot transition invoice from "${currentStatus}" to "${targetStatus}". ` +
          `Allowed: ${allowed?.join(', ') || 'none'}`,
      );
    }
  }
}

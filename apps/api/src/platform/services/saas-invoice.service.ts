import mongoose from 'mongoose';
import {
  SaaSInvoice,
  getNextInvoiceNumber,
  type ISaaSInvoiceItem,
  type SaaSInvoiceStatus,
} from '../models/saas-invoice.model.js';
import { Tenant } from '../models/tenant.model.js';
import { logger } from '../../utils/logger.js';
import { regexContains } from '../../tenant/services/search.helpers.js';

/**
 * SaaS Invoice Service — CRUD + lifecycle transitions
 *
 * Handles: create (draft), update, issue, cancel, list, detail.
 * Totals are computed by the model pre-save hook.
 */

// ── Types ───────────────────────────────────────────────────

/**
 * Required access scope for every per-invoice service call.
 *
 * - `platform`: caller is a platform user (RBAC already enforced by `platformGuard`).
 *   Allowed to act on any tenant's invoice.
 * - `tenant`: caller is a tenant user. Service-layer filter MUST scope by `tenantId`
 *   so a tenant cannot read or modify another tenant's invoice (IDOR fix — H-1/H-2).
 *
 * Making this a required parameter at the data-access layer ensures the TypeScript
 * compiler flags every call site if a future refactor forgets the check.
 */
export type InvoiceAccessScope =
  { kind: 'platform'; actorId?: string } | { kind: 'tenant'; tenantId: string };

function buildScopedFilter(invoiceId: string, scope: InvoiceAccessScope): Record<string, unknown> {
  const filter: Record<string, unknown> = { _id: new mongoose.Types.ObjectId(invoiceId) };
  if (scope.kind === 'tenant') {
    filter.tenantId = new mongoose.Types.ObjectId(scope.tenantId);
  }
  return filter;
}

export interface CreateInvoiceInput {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  items: ISaaSInvoiceItem[];
  currency: string;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
  source?: 'manual' | 'auto';
}

export interface UpdateInvoiceInput {
  items?: ISaaSInvoiceItem[];
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
  currency?: string;
}

export interface InvoiceFilter {
  tenantId?: string;
  status?: SaaSInvoiceStatus;
  source?: 'manual' | 'auto';
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Create Invoice (draft) ──────────────────────────────────

export async function createInvoice(input: CreateInvoiceInput, userId?: string) {
  // Validate tenant exists
  const tenant = await Tenant.findById(input.tenantId).select('name slug').lean();
  if (!tenant) throw new Error('Tenant not found');

  const invoiceNumber = await getNextInvoiceNumber();

  // Compute per-item totals (Mongoose sub-schema requires `total`)
  const itemsWithTotals = input.items.map((i) => ({
    ...i,
    total: i.total ?? Math.round(i.quantity * i.unitPrice * 100) / 100,
  }));

  const invoice = new SaaSInvoice({
    invoiceNumber,
    tenantId: new mongoose.Types.ObjectId(input.tenantId),
    periodStart: new Date(input.periodStart),
    periodEnd: new Date(input.periodEnd),
    items: itemsWithTotals,
    currency: input.currency,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    taxRate: input.taxRate ?? 0,
    notes: input.notes ?? '',
    source: input.source ?? 'manual',
    status: 'draft',
    createdBy: userId ? new mongoose.Types.ObjectId(userId) : null,
    updatedBy: userId ? new mongoose.Types.ObjectId(userId) : null,
  });

  await invoice.save(); // pre-save hook computes totals

  logger.info({
    msg: 'SaaS invoice created',
    invoiceNumber,
    tenantId: input.tenantId,
    total: invoice.total,
    currency: invoice.currency,
  });

  return invoice.toObject();
}

// ── Update Invoice ──────────────────────────────────────────

export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput,
  scope: InvoiceAccessScope,
  userId?: string,
) {
  const invoice = await SaaSInvoice.findOne(buildScopedFilter(invoiceId, scope));
  if (!invoice) throw new Error('Invoice not found');

  // Editing rules by status
  if (['paid', 'cancelled', 'refunded'].includes(invoice.status)) {
    throw new Error(`Cannot edit invoice in "${invoice.status}" status`);
  }

  if (invoice.status === 'draft') {
    // Full edit allowed
    if (input.items) {
      const withTotals = input.items.map((i) => ({
        ...i,
        total: i.total ?? Math.round(i.quantity * i.unitPrice * 100) / 100,
      }));
      invoice.items = withTotals as mongoose.Types.DocumentArray<ISaaSInvoiceItem>;
    }
    if (input.periodStart) invoice.periodStart = new Date(input.periodStart);
    if (input.periodEnd) invoice.periodEnd = new Date(input.periodEnd);
    if (input.currency) invoice.currency = input.currency;
    if (input.taxRate !== undefined) invoice.taxRate = input.taxRate;
  }

  // These fields editable in draft, issued, overdue, partially_paid
  if (input.dueDate) invoice.dueDate = new Date(input.dueDate);
  if (input.notes !== undefined) invoice.notes = input.notes;

  invoice.updatedBy = userId ? new mongoose.Types.ObjectId(userId) : null;
  await invoice.save();

  return invoice.toObject();
}

// ── Issue Invoice (draft → issued) ──────────────────────────

export async function issueInvoice(invoiceId: string, scope: InvoiceAccessScope, userId?: string) {
  const invoice = await SaaSInvoice.findOne(buildScopedFilter(invoiceId, scope));
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status !== 'draft') {
    throw new Error(`Can only issue draft invoices (current: "${invoice.status}")`);
  }

  if (!invoice.dueDate) {
    // Default: 15 days from now
    invoice.dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  }

  invoice.status = 'issued';
  invoice.issuedAt = new Date();
  invoice.updatedBy = userId ? new mongoose.Types.ObjectId(userId) : null;

  await invoice.save();

  logger.info({
    msg: 'SaaS invoice issued',
    invoiceNumber: invoice.invoiceNumber,
    tenantId: invoice.tenantId,
    total: invoice.total,
    dueDate: invoice.dueDate,
  });

  return invoice.toObject();
}

// ── Cancel Invoice ──────────────────────────────────────────

export async function cancelInvoice(
  invoiceId: string,
  reason: string,
  scope: InvoiceAccessScope,
  userId?: string,
) {
  const invoice = await SaaSInvoice.findOne(buildScopedFilter(invoiceId, scope));
  if (!invoice) throw new Error('Invoice not found');

  if (['paid', 'cancelled', 'refunded'].includes(invoice.status)) {
    throw new Error(`Cannot cancel invoice in "${invoice.status}" status`);
  }

  invoice.status = 'cancelled';
  invoice.cancelledAt = new Date();
  invoice.cancelReason = reason;
  invoice.updatedBy = userId ? new mongoose.Types.ObjectId(userId) : null;

  await invoice.save();

  logger.info({
    msg: 'SaaS invoice cancelled',
    invoiceNumber: invoice.invoiceNumber,
    reason,
  });

  return invoice.toObject();
}

// ── Delete Draft Invoice ────────────────────────────────────

export async function deleteDraftInvoice(invoiceId: string, scope: InvoiceAccessScope) {
  const invoice = await SaaSInvoice.findOne(buildScopedFilter(invoiceId, scope));
  if (!invoice) throw new Error('Invoice not found');

  if (invoice.status !== 'draft') {
    throw new Error('Only draft invoices can be deleted');
  }

  await invoice.deleteOne();

  logger.info({
    msg: 'SaaS draft invoice deleted',
    invoiceNumber: invoice.invoiceNumber,
  });

  return { deleted: true, invoiceNumber: invoice.invoiceNumber };
}

// ── List Invoices ───────────────────────────────────────────

export async function listSaaSInvoices(
  filter: InvoiceFilter,
  scope: InvoiceAccessScope,
): Promise<unknown> {
  const query: Record<string, unknown> = {};

  // Enforce tenant scoping at the data layer (IDOR fix — H-1/H-2).
  // Tenant callers can never list another tenant's invoices, even if `filter.tenantId`
  // is spoofed in the request — the scope wins.
  if (scope.kind === 'tenant') {
    query.tenantId = new mongoose.Types.ObjectId(scope.tenantId);
  } else if (filter.tenantId) {
    query.tenantId = new mongoose.Types.ObjectId(filter.tenantId);
  }

  if (filter.status) query.status = filter.status;
  if (filter.source) query.source = filter.source;

  if (filter.startDate || filter.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.$gte = filter.startDate;
    if (filter.endDate) dateFilter.$lte = filter.endDate;
    query.createdAt = dateFilter;
  }

  if (filter.search) {
    query.$or = [{ invoiceNumber: regexContains(filter.search) }];
  }

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    SaaSInvoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('tenantId', 'name slug status contact.address.country settings.currency')
      .lean(),
    SaaSInvoice.countDocuments(query),
  ]);

  // Flatten tenant info onto each invoice for the frontend
  const invoices = data.map((inv) => {
    const tenant = inv.tenantId as unknown as {
      _id: mongoose.Types.ObjectId;
      name?: { en?: string };
      slug?: string;
    } | null;
    return {
      ...inv,
      tenantId: tenant?._id?.toString() ?? String(inv.tenantId),
      tenantName: tenant?.name?.en ?? 'Unknown',
      tenantSlug: tenant?.slug ?? '',
    };
  });

  return {
    data: invoices,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Get Invoice Detail ──────────────────────────────────────

export async function getSaaSInvoiceById(
  invoiceId: string,
  scope: InvoiceAccessScope,
): Promise<unknown> {
  const inv = await SaaSInvoice.findOne(buildScopedFilter(invoiceId, scope))
    .populate('tenantId', 'name slug status contact settings.currency')
    .lean();

  if (!inv) return null;

  const tenant = inv.tenantId as unknown as {
    _id: mongoose.Types.ObjectId;
    name?: { en?: string; ar?: string };
    slug?: string;
    contact?: {
      email?: string;
      phone?: string;
      website?: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
      };
    };
  } | null;

  // Flatten address into a single line for the PDF / UI
  const addr = tenant?.contact?.address;
  const addressLine = addr
    ? [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(', ')
    : undefined;

  return {
    ...inv,
    tenantId: tenant?._id?.toString() ?? String(inv.tenantId),
    tenantName: tenant?.name?.en ?? 'Unknown',
    tenantSlug: tenant?.slug ?? '',
    tenantContact: {
      email: tenant?.contact?.email,
      phone: tenant?.contact?.phone,
      website: tenant?.contact?.website,
      address: addressLine,
    },
  };
}

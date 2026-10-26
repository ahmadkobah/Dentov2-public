import mongoose, { Schema, type Document } from 'mongoose';

/**
 * SaaS Invoice Model — Platform Database (dento_platform)
 *
 * Per MASTER_PLAN §29 — SaaS Billing
 *
 * Represents a billing document sent to tenants.
 * Each invoice has typed line items: module, extra_storage, extra_users,
 * extra_branches, custom, discount.
 *
 * Lifecycle: draft → issued → paid (or overdue → paid/cancelled)
 * Draft invoices are fully editable. Issued invoices can only extend dueDate.
 * Paid/cancelled/refunded invoices are immutable.
 *
 * Linked to SaaSPayment records via invoiceNumber (1:N — one invoice, many payments).
 */

// ── Types ───────────────────────────────────────────────────

export type SaaSInvoiceStatus =
  | 'draft'
  | 'issued'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export type InvoiceItemType =
  | 'module'
  | 'extra_storage'
  | 'extra_users'
  | 'extra_branches'
  | 'custom'
  | 'discount';

export interface ISaaSInvoiceItem {
  type: InvoiceItemType;
  description: string;
  moduleSlug?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  couponCode?: string | null;
}

export interface ISaaSInvoice extends Document {
  invoiceNumber: string;
  tenantId: mongoose.Types.ObjectId;

  // Billing period
  periodStart: Date;
  periodEnd: Date;

  // Line items
  items: ISaaSInvoiceItem[];

  // Totals
  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;

  // Currency
  currency: string;

  // Status & dates
  status: SaaSInvoiceStatus;
  issuedAt: Date | null;
  dueDate: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;

  // Source
  source: 'manual' | 'auto';
  notes: string;

  // Standard fields
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-Schemas ─────────────────────────────────────────────

const invoiceItemSchema = new Schema<ISaaSInvoiceItem>(
  {
    type: {
      type: String,
      required: true,
      enum: ['module', 'extra_storage', 'extra_users', 'extra_branches', 'custom', 'discount'],
    },
    description: { type: String, required: true },
    moduleSlug: { type: String, default: null },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
    couponCode: { type: String, default: null },
  },
  { _id: false },
);

// ── Invoice Number Counter ──────────────────────────────────

interface IInvoiceCounter extends Document<string> {
  _id: string;
  seq: number;
}

const invoiceCounterSchema = new Schema<IInvoiceCounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const InvoiceCounter = mongoose.model<IInvoiceCounter>(
  'SaaSInvoiceCounter',
  invoiceCounterSchema,
  'saas_invoice_counters',
);

async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await InvoiceCounter.findByIdAndUpdate(
    `INV-${year}`,
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return `INV-${year}-${String(counter.seq).padStart(5, '0')}`;
}

// ── Main Schema ─────────────────────────────────────────────

const saasInvoiceSchema = new Schema<ISaaSInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // Billing period
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Line items
    items: {
      type: [invoiceItemSchema],
      default: [],
      validate: {
        validator: (v: ISaaSInvoiceItem[]) => v.length > 0,
        message: 'Invoice must have at least one line item',
      },
    },

    // Totals
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0, default: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },

    // Currency
    currency: { type: String, required: true, default: 'USD' },

    // Status
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'],
      default: 'draft',
      index: true,
    },
    issuedAt: { type: Date, default: null },
    dueDate: { type: Date, default: null, index: true },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },

    // Source
    source: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    notes: { type: String, default: '' },

    // Standard
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'saas_invoices',
  },
);

// ── Pre-save: compute totals ────────────────────────────────

saasInvoiceSchema.pre('save', function () {
  // Compute subtotal from line items (excluding discount items)
  const positiveItems = this.items.filter((i) => i.type !== 'discount');
  const discountItems = this.items.filter((i) => i.type === 'discount');

  this.subtotal = positiveItems.reduce((sum, i) => sum + i.total, 0);
  this.discountTotal = Math.abs(discountItems.reduce((sum, i) => sum + i.total, 0));

  const afterDiscount = Math.max(0, this.subtotal - this.discountTotal);
  this.taxAmount =
    this.taxRate > 0 ? Math.round(afterDiscount * (this.taxRate / 100) * 100) / 100 : 0;
  this.total = Math.round((afterDiscount + this.taxAmount) * 100) / 100;
  this.balanceDue = Math.round((this.total - this.amountPaid) * 100) / 100;

  if (this.balanceDue < 0) this.balanceDue = 0;
});

// ── Indexes ─────────────────────────────────────────────────

saasInvoiceSchema.index({ tenantId: 1, status: 1 });
saasInvoiceSchema.index({ status: 1, dueDate: 1 });
saasInvoiceSchema.index({ createdAt: -1 });

// ── Model Export ────────────────────────────────────────────

export const SaaSInvoice = mongoose.model<ISaaSInvoice>('SaaSInvoice', saasInvoiceSchema);
export { getNextInvoiceNumber };

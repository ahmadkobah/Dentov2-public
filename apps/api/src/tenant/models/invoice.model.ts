import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Invoice Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.7 — invoices collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#8 Invoices)
 * Per V2_DECISION_LOG.md §11.1 — Webhook events
 *
 * Embeds: items[] (line items for services/treatments)
 * Per-invoice currency override per §25
 * Auto-generated invoiceNumber: {prefix}-{year}-{seq}
 *
 * v1 equivalent: invoices + invoice_items (2 tables → 1 collection)
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IInvoiceItem {
  description: string;
  treatmentId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  toothNumber?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

// ── Main Interface ──────────────────────────────────────────

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'installment'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export interface IInvoice extends Document {
  invoiceNumber: string; // Auto: INV-2026-00001
  patientId: Types.ObjectId;
  branchId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  treatmentPlanId?: Types.ObjectId;
  doctorId?: Types.ObjectId; // Treating doctor — inherited from plan/appointment or set manually; powers the doctor filter

  // Items
  items: IInvoiceItem[];

  // Financials
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  taxAmount: number;
  taxPercentage: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;

  // Per-invoice currency override (§25)
  currency?: string;
  exchangeRate?: number;
  originalAmountInClinicCurrency?: number;

  // Status
  status: InvoiceStatus;

  // Dates
  issueDate?: Date;
  dueDate?: Date;
  paidAt?: Date;

  // Notes
  notes?: string;
  terms?: string;

  // Insurance
  insuranceClaimId?: Types.ObjectId;
  insuredAmount: number;
  patientResponsibility: number;

  // Audit
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Embedded Schemas ────────────────────────────────────────

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true },
    treatmentId: { type: Schema.Types.ObjectId },
    serviceId: { type: Schema.Types.ObjectId },
    toothNumber: String,
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

// ── Invoice Schema ──────────────────────────────────────────

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    treatmentPlanId: { type: Schema.Types.ObjectId, ref: 'TreatmentPlan' },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },

    // Items (embedded)
    items: { type: [invoiceItemSchema], required: true },

    // Financials
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0, max: 100 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },

    // Per-invoice currency override (§25)
    currency: String,
    exchangeRate: { type: Number, min: 0 },
    originalAmountInClinicCurrency: { type: Number, min: 0 },

    // Status
    status: {
      type: String,
      enum: [
        'draft',
        'issued',
        'installment',
        'paid',
        'partially_paid',
        'overdue',
        'cancelled',
        'refunded',
      ],
      default: 'draft',
    },

    // Dates
    issueDate: Date,
    dueDate: Date,
    paidAt: Date,

    // Notes
    notes: String,
    terms: String,

    // Insurance
    insuranceClaimId: { type: Schema.Types.ObjectId, ref: 'InsuranceClaim' },
    insuredAmount: { type: Number, default: 0, min: 0 },
    patientResponsibility: { type: Number, default: 0, min: 0 },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes (per V2_DATABASE.md) ────────────────────────────

invoiceSchema.index({ patientId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ branchId: 1, issueDate: 1 });
invoiceSchema.index({ invoiceNumber: 'text' }, { name: 'invoice_search_text' });
invoiceSchema.index({ doctorId: 1, createdAt: -1 });

// ── Auto-generate invoiceNumber ─────────────────────────────

invoiceSchema.pre('validate', async function () {
  if (this.isNew && !this.invoiceNumber) {
    const model = this.constructor as ReturnType<typeof getInvoiceModel>;
    const year = new Date().getFullYear();
    const prefix = 'INV'; // Can be overridden from settings

    const lastInvoice = await model
      .findOne({ invoiceNumber: { $regex: `^${prefix}-${year}-` } }, { invoiceNumber: 1 })
      .sort({ invoiceNumber: -1 })
      .lean();

    let nextNumber = 1;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(5, '0')}`;
  }
});

// ── Compute balanceDue before save ──────────────────────────

invoiceSchema.pre('save', function () {
  this.balanceDue = this.totalAmount - this.amountPaid;
});

// ── Model Factory ───────────────────────────────────────────

/**
 * Get Invoice model for a specific tenant database connection.
 * Usage: const Invoice = getInvoiceModel(tenantDb);
 */
export function getInvoiceModel(connection: Connection): Model<IInvoice> {
  return (connection.models.Invoice ||
    connection.model('Invoice', invoiceSchema)) as Model<IInvoice>;
}

export type InvoiceModel = ReturnType<typeof getInvoiceModel>;

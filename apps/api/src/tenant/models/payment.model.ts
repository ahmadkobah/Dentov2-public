import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Payment Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.8 — payments collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Payments)
 *
 * Tenant-level payments against patient invoices.
 * NOT the same as platform SaaS payments (apps/api/src/platform/models/payment.model.ts).
 *
 * Payment methods: cash | card | bank_transfer | cheque | insurance | online | fawry | meeza
 * PCI DSS: No card data stored — only last4 + cardBrand via provider.
 */

// ── Main Interface ──────────────────────────────────────────

export type TenantPaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | 'insurance'
  | 'online'
  | 'fawry'
  | 'meeza';

export type TenantPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface ITenantPayment extends Document {
  invoiceId: Types.ObjectId;
  patientId: Types.ObjectId;
  amount: number;
  paymentMethod: TenantPaymentMethod;
  paymentReference?: string;
  status: TenantPaymentStatus;

  // Online payment provider details (no card data — PCI DSS)
  providerPaymentId?: string;
  providerTransactionId?: string;
  last4?: string;
  cardBrand?: string;

  notes?: string;
  receivedBy: Types.ObjectId;
  receivedAt: Date;

  // Audit (per BUILD_RULES §6.4)
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  // Refund
  refundedAt?: Date;
  refundReason?: string;
  refundedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Payment Schema ──────────────────────────────────────────

const tenantPaymentSchema = new Schema<ITenantPayment>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'cheque', 'insurance', 'online', 'fawry', 'meeza'],
      required: true,
    },
    paymentReference: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },

    // Online payment provider details (PCI DSS: no card data)
    providerPaymentId: String,
    providerTransactionId: String,
    last4: String,
    cardBrand: String,

    notes: String,
    receivedBy: { type: Schema.Types.ObjectId, required: true },
    receivedAt: { type: Date, default: Date.now },

    // Audit (per BUILD_RULES §6.4)
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },

    // Refund
    refundedAt: Date,
    refundReason: String,
    refundedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes (per V2_DATABASE.md) ────────────────────────────

tenantPaymentSchema.index({ invoiceId: 1 });
tenantPaymentSchema.index({ patientId: 1, createdAt: -1 });
tenantPaymentSchema.index({ receivedAt: -1 });

// ── Model Factory ───────────────────────────────────────────

/**
 * Get TenantPayment model for a specific tenant database connection.
 * Usage: const Payment = getTenantPaymentModel(tenantDb);
 *
 * Named "TenantPayment" to avoid collision with platform "Payment" model.
 */
export function getTenantPaymentModel(connection: Connection): Model<ITenantPayment> {
  return (connection.models.TenantPayment ||
    connection.model('TenantPayment', tenantPaymentSchema, 'payments')) as Model<ITenantPayment>;
}

export type TenantPaymentModel = ReturnType<typeof getTenantPaymentModel>;

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Installment Plan Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §7.4 — installment_plans collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#9 Installments)
 *
 * Embedded payments[] array (v1: installment_payments → v2: embedded, max ~24)
 * 3 frequencies: weekly | biweekly | monthly
 * Auto-calculates installment amounts and due dates on create
 */

// ── Embedded Types ──────────────────────────────────────────

export interface IInstallmentPayment {
  installmentNumber: number;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  lateFee: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paidAt?: Date;
  paymentId?: Types.ObjectId;
}

// ── Main Interface ──────────────────────────────────────────

export type InstallmentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';

export interface IInstallmentPlan extends Document {
  invoiceId: Types.ObjectId;
  patientId: Types.ObjectId;

  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';

  status: InstallmentPlanStatus;

  payments: IInstallmentPayment[];

  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Embedded Schemas ────────────────────────────────────────

const installmentPaymentSchema = new Schema<IInstallmentPayment>(
  {
    installmentNumber: { type: Number, required: true, min: 1 },
    dueDate: { type: Date, required: true },
    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'waived'],
      default: 'pending',
    },
    paidAt: Date,
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { _id: true },
);

// ── Installment Plan Schema ─────────────────────────────────

const installmentPlanSchema = new Schema<IInstallmentPlan>(
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

    totalAmount: { type: Number, required: true, min: 0 },
    downPayment: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    numberOfInstallments: { type: Number, required: true, min: 1, max: 24 },
    installmentAmount: { type: Number, required: true, min: 0 },
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'completed', 'defaulted', 'cancelled'],
      default: 'active',
    },

    payments: { type: [installmentPaymentSchema], default: [] },

    notes: String,
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes (per V2_DATABASE.md §7.4) ──────────────────────

installmentPlanSchema.index({ patientId: 1, status: 1 });
installmentPlanSchema.index({ invoiceId: 1 });
installmentPlanSchema.index({ 'payments.dueDate': 1, 'payments.status': 1 });

// ── Compute remainingAmount before save ─────────────────────

installmentPlanSchema.pre('save', function () {
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  this.remainingAmount = this.totalAmount - this.downPayment - totalPaid;

  // Auto-complete if all payments are paid
  const allPaid = this.payments.every((p) => p.status === 'paid' || p.status === 'waived');
  if (allPaid && this.payments.length > 0 && this.status === 'active') {
    this.status = 'completed';
  }
});

// ── Model Factory ───────────────────────────────────────────

/**
 * Get InstallmentPlan model for a specific tenant database connection.
 * Usage: const InstallmentPlan = getInstallmentPlanModel(tenantDb);
 */
export function getInstallmentPlanModel(connection: Connection): Model<IInstallmentPlan> {
  return (connection.models.InstallmentPlan ||
    connection.model(
      'InstallmentPlan',
      installmentPlanSchema,
      'installment_plans',
    )) as Model<IInstallmentPlan>;
}

export type InstallmentPlanModel = ReturnType<typeof getInstallmentPlanModel>;

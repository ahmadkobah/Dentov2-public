import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Commission Payout Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §7.3 — commission_payouts collection
 *
 * Groups approved commissions into a single payout record per doctor.
 * When a payout is created, all included commissions transition to "paid".
 */

// ── Interface ───────────────────────────────────────────────

export interface ICommissionPayout extends Document {
  doctorId: Types.ObjectId;
  payoutDate: Date;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  paymentMethod: string;
  reference?: string;
  commissionCount: number;
  createdBy: Types.ObjectId;

  createdAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const commissionPayoutSchema = new Schema<ICommissionPayout>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    payoutDate: {
      type: Date,
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'bank_transfer', 'cheque', 'other'],
    },
    reference: { type: String, default: null },
    commissionCount: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes (per V2_DATABASE.md §7.3) ──────────────────────

commissionPayoutSchema.index({ doctorId: 1, payoutDate: -1 });

// ── Model Factory ───────────────────────────────────────────

export function getCommissionPayoutModel(connection: Connection): Model<ICommissionPayout> {
  return (connection.models.CommissionPayout ||
    connection.model(
      'CommissionPayout',
      commissionPayoutSchema,
      'commission_payouts',
    )) as Model<ICommissionPayout>;
}

export type CommissionPayoutModel = ReturnType<typeof getCommissionPayoutModel>;

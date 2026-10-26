import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Doctor Commission Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §7.3 — doctor_commissions collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#10 Commissions)
 *
 * Tracks per-procedure commission for each doctor, linked to invoices.
 * Status flow: pending → approved → paid (or cancelled at pending/approved).
 */

// ── Interface ───────────────────────────────────────────────

export interface IDoctorCommission extends Document {
  doctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;

  procedureName: string;
  procedureAmount: number;
  commissionRate: number; // 0.0 – 1.0
  commissionAmount: number;

  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paidAt?: Date;
  payoutId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const doctorCommissionSchema = new Schema<IDoctorCommission>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    appointmentId: { type: Schema.Types.ObjectId, default: null },
    invoiceId: { type: Schema.Types.ObjectId, default: null },

    procedureName: { type: String, required: true },
    procedureAmount: { type: Number, required: true, min: 0 },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    commissionAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
    },
    paidAt: { type: Date, default: null },
    payoutId: { type: Schema.Types.ObjectId, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// ── Indexes (per V2_DATABASE.md §7.3) ──────────────────────

doctorCommissionSchema.index({ doctorId: 1, status: 1 });
doctorCommissionSchema.index({ payoutId: 1 });
doctorCommissionSchema.index({ invoiceId: 1 });
doctorCommissionSchema.index({ createdAt: -1 });

// ── Model Factory ───────────────────────────────────────────

export function getDoctorCommissionModel(connection: Connection): Model<IDoctorCommission> {
  return (connection.models.DoctorCommission ||
    connection.model(
      'DoctorCommission',
      doctorCommissionSchema,
      'doctor_commissions',
    )) as Model<IDoctorCommission>;
}

export type DoctorCommissionModel = ReturnType<typeof getDoctorCommissionModel>;

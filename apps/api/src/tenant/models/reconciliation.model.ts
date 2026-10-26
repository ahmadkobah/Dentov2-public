import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Reconciliation Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §5.9 — reconciliation collection
 * Per V2_DECISION_LOG.md §11.3 — Added createdBy, closedAt, reviewedAt
 *
 * Daily branch-level reconciliation of payments.
 * Aggregates: cash, card, online, insurance totals.
 * Status flow: open → closed → reviewed
 */

// ── Main Interface ──────────────────────────────────────────

export type ReconciliationStatus = 'open' | 'closed' | 'reviewed';

export interface IReconciliation extends Document {
  branchId: Types.ObjectId;
  reconciliationDate: Date;

  // Balances
  openingBalance: number;
  closingBalance: number;

  // Payment aggregates
  cashReceived: number;
  cardReceived: number;
  onlineReceived: number;
  insuranceReceived: number;
  totalReceived: number;

  // Discrepancy
  expenses: number;
  discrepancy: number;

  // Status
  status: ReconciliationStatus;

  // Audit (per V2_DECISION_LOG §11.3)
  createdBy: Types.ObjectId;
  closedBy?: Types.ObjectId;
  closedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Reconciliation Schema ───────────────────────────────────

const reconciliationSchema = new Schema<IReconciliation>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    reconciliationDate: { type: Date, required: true },

    // Balances
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },

    // Payment aggregates
    cashReceived: { type: Number, default: 0 },
    cardReceived: { type: Number, default: 0 },
    onlineReceived: { type: Number, default: 0 },
    insuranceReceived: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },

    // Discrepancy
    expenses: { type: Number, default: 0 },
    discrepancy: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ['open', 'closed', 'reviewed'],
      default: 'open',
    },

    // Audit (per V2_DECISION_LOG §11.3)
    createdBy: { type: Schema.Types.ObjectId, required: true },
    closedBy: { type: Schema.Types.ObjectId },
    closedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId },
    reviewedAt: Date,

    notes: String,
  },
  {
    timestamps: true,
  },
);

// ── Indexes (per V2_DATABASE.md) ────────────────────────────

reconciliationSchema.index({ branchId: 1, reconciliationDate: -1 }, { unique: true });

// ── Model Factory ───────────────────────────────────────────

/**
 * Get Reconciliation model for a specific tenant database connection.
 * Usage: const Reconciliation = getReconciliationModel(tenantDb);
 */
export function getReconciliationModel(connection: Connection): Model<IReconciliation> {
  return (connection.models.Reconciliation ||
    connection.model(
      'Reconciliation',
      reconciliationSchema,
      'reconciliations',
    )) as Model<IReconciliation>;
}

export type ReconciliationModel = ReturnType<typeof getReconciliationModel>;

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Stock Count — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §8 (Collection #60)
 * Per DENTO_V2_MASTER_PLAN.md §16
 *
 * Physical inventory counts for reconciliation.
 * Auto-numbers SC-{year}-{00001}.
 * Pre-save computes per-item discrepancy and auto-summarizes.
 * Types: full (all items), partial (category), spot_check (random).
 */

// ── Types ───────────────────────────────────────────────────
export type StockCountStatus = 'in_progress' | 'completed' | 'approved' | 'cancelled';
export type StockCountType = 'full' | 'partial' | 'spot_check';

export interface IStockCountItem {
  itemId: Types.ObjectId;
  systemQuantity: number;
  countedQuantity: number;
  discrepancy: number;
  notes: string;
  adjustmentApplied: boolean;
}

export interface IStockCountSummary {
  totalItems: number;
  matchCount: number;
  surplusCount: number;
  deficitCount: number;
  totalDiscrepancyValue: number;
}

export interface IStockCount extends Document {
  countNumber: string;
  branchId: Types.ObjectId;
  status: StockCountStatus;
  countType: StockCountType;
  items: IStockCountItem[];
  startedAt: Date;
  completedAt: Date | null;
  countedBy: Types.ObjectId;
  approvedBy: Types.ObjectId | null;
  summary: IStockCountSummary;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ─────────────────────────────────────────────
const stockCountItemSchema = new Schema<IStockCountItem>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    systemQuantity: { type: Number, default: 0, min: 0 },
    countedQuantity: { type: Number, default: 0, min: 0 },
    discrepancy: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    adjustmentApplied: { type: Boolean, default: false },
  },
  { _id: true },
);

const stockCountSummarySchema = new Schema<IStockCountSummary>(
  {
    totalItems: { type: Number, default: 0, min: 0 },
    matchCount: { type: Number, default: 0, min: 0 },
    surplusCount: { type: Number, default: 0, min: 0 },
    deficitCount: { type: Number, default: 0, min: 0 },
    totalDiscrepancyValue: { type: Number, default: 0 },
  },
  { _id: false },
);

// ── Schema ──────────────────────────────────────────────────
const stockCountSchema = new Schema<IStockCount>(
  {
    countNumber: { type: String, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'approved', 'cancelled'],
      default: 'in_progress',
    },
    countType: {
      type: String,
      enum: ['full', 'partial', 'spot_check'],
      default: 'full',
    },
    items: { type: [stockCountItemSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    countedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    summary: { type: stockCountSummarySchema, default: () => ({}) },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────
stockCountSchema.index({ countNumber: 1 }, { unique: true });
stockCountSchema.index({ branchId: 1, status: 1 });
stockCountSchema.index({ branchId: 1, createdAt: -1 });

// ── Pre-validate: auto-number SC-{year}-{00001} ────────────
stockCountSchema.pre('validate', async function () {
  if (this.isNew && !this.countNumber) {
    const model = this.constructor as ReturnType<typeof getStockCountModel>;
    const year = new Date().getFullYear();
    const prefix = 'SC';
    const lastCount = await model
      .findOne({ countNumber: { $regex: `^${prefix}-${year}-` } }, { countNumber: 1 })
      .sort({ countNumber: -1 })
      .lean();

    let nextNumber = 1;
    if (lastCount?.countNumber) {
      const match = lastCount.countNumber.match(/-(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    this.countNumber = `${prefix}-${year}-${String(nextNumber).padStart(5, '0')}`;
  }
});

// ── Pre-save: compute discrepancy & summary ─────────────────
stockCountSchema.pre('save', function () {
  let matchCount = 0;
  let surplusCount = 0;
  let deficitCount = 0;

  for (const item of this.items) {
    item.discrepancy = item.countedQuantity - item.systemQuantity;
    if (item.discrepancy === 0) matchCount++;
    else if (item.discrepancy > 0) surplusCount++;
    else deficitCount++;
  }

  this.summary = {
    totalItems: this.items.length,
    matchCount,
    surplusCount,
    deficitCount,
    totalDiscrepancyValue: this.summary?.totalDiscrepancyValue ?? 0,
  };
});

// ── Model Factory ───────────────────────────────────────────
export function getStockCountModel(connection: Connection): Model<IStockCount> {
  return (connection.models.StockCount ||
    connection.model('StockCount', stockCountSchema)) as Model<IStockCount>;
}
export type StockCountModel = ReturnType<typeof getStockCountModel>;

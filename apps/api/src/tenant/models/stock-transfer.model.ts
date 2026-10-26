import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Stock Transfer — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §8 (Collection #59)
 * Per DENTO_V2_MASTER_PLAN.md §16
 *
 * Inter-branch inventory transfers with approval workflow.
 * Auto-numbers TRF-{year}-{00001}.
 * Lifecycle: draft → in_transit → received (or cancelled).
 */

// ── Types ───────────────────────────────────────────────────
export type TransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled';

export interface ITransferItem {
  itemId: Types.ObjectId;
  quantity: number;
  batchNumber: string;
  notes: string;
}

export interface IStockTransfer extends Document {
  transferNumber: string;
  fromBranchId: Types.ObjectId;
  toBranchId: Types.ObjectId;
  status: TransferStatus;
  items: ITransferItem[];
  requestedBy: Types.ObjectId;
  approvedBy: Types.ObjectId | null;
  receivedBy: Types.ObjectId | null;
  requestedAt: Date;
  approvedAt: Date | null;
  shippedAt: Date | null;
  receivedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schema ──────────────────────────────────────────────
const transferItemSchema = new Schema<ITransferItem>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    batchNumber: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { _id: true },
);

// ── Schema ──────────────────────────────────────────────────
const stockTransferSchema = new Schema<IStockTransfer>(
  {
    transferNumber: { type: String, required: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    status: {
      type: String,
      enum: ['draft', 'in_transit', 'received', 'cancelled'],
      default: 'draft',
    },
    items: { type: [transferItemSchema], default: [] },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────
stockTransferSchema.index({ transferNumber: 1 }, { unique: true });
stockTransferSchema.index({ fromBranchId: 1, status: 1 });
stockTransferSchema.index({ toBranchId: 1, status: 1 });

// ── Pre-validate: auto-number TRF-{year}-{00001} ───────────
stockTransferSchema.pre('validate', async function () {
  if (this.isNew && !this.transferNumber) {
    const model = this.constructor as ReturnType<typeof getStockTransferModel>;
    const year = new Date().getFullYear();
    const prefix = 'TRF';
    const lastTransfer = await model
      .findOne({ transferNumber: { $regex: `^${prefix}-${year}-` } }, { transferNumber: 1 })
      .sort({ transferNumber: -1 })
      .lean();

    let nextNumber = 1;
    if (lastTransfer?.transferNumber) {
      const match = lastTransfer.transferNumber.match(/-(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    this.transferNumber = `${prefix}-${year}-${String(nextNumber).padStart(5, '0')}`;
  }
});

// ── Model Factory ───────────────────────────────────────────
export function getStockTransferModel(connection: Connection): Model<IStockTransfer> {
  return (connection.models.StockTransfer ||
    connection.model('StockTransfer', stockTransferSchema)) as Model<IStockTransfer>;
}
export type StockTransferModel = ReturnType<typeof getStockTransferModel>;

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Inventory Stock — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §8 (Collection #55)
 * Per DENTO_V2_MASTER_PLAN.md §16
 *
 * Per-branch per-item stock levels with embedded batches.
 * Supports FIFO / Weighted Average / Last Purchase valuation.
 * availableQuantity auto-computed on save.
 */

// ── Types ───────────────────────────────────────────────────
export type BatchStatus = 'active' | 'expired' | 'recalled' | 'quarantine';
export type ValuationMethod = 'fifo' | 'weighted_average' | 'last_purchase';
export type CountResult = 'match' | 'surplus' | 'deficit';

export interface IStockBatch {
  batchNumber: string;
  lotNumber: string;
  expiryDate: Date | null;
  quantity: number;
  receivedDate: Date;
  purchaseOrderId: Types.ObjectId | null;
  supplierId: Types.ObjectId | null;
  unitCost: number;
  status: BatchStatus;
}

export interface IInventoryStock extends Document {
  itemId: Types.ObjectId;
  branchId: Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  batches: IStockBatch[];
  stockValue: number;
  valuationMethod: ValuationMethod;
  weightedAvgCost: number;
  lastRestockedAt: Date | null;
  lastCountedAt: Date | null;
  lastCountedBy: Types.ObjectId | null;
  lastCountResult: CountResult | null;
  countDiscrepancy: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schema ──────────────────────────────────────────────
const stockBatchSchema = new Schema<IStockBatch>(
  {
    batchNumber: { type: String, default: '' },
    lotNumber: { type: String, default: '' },
    expiryDate: { type: Date, default: null },
    quantity: { type: Number, default: 0, min: 0 },
    receivedDate: { type: Date, default: Date.now },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    unitCost: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'expired', 'recalled', 'quarantine'],
      default: 'active',
    },
  },
  { _id: true },
);

// ── Schema ──────────────────────────────────────────────────
const inventoryStockSchema = new Schema<IInventoryStock>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    quantity: { type: Number, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    availableQuantity: { type: Number, default: 0, min: 0 },
    batches: { type: [stockBatchSchema], default: [] },
    stockValue: { type: Number, default: 0, min: 0 },
    valuationMethod: {
      type: String,
      enum: ['fifo', 'weighted_average', 'last_purchase'],
      default: 'weighted_average',
    },
    weightedAvgCost: { type: Number, default: 0, min: 0 },
    lastRestockedAt: { type: Date, default: null },
    lastCountedAt: { type: Date, default: null },
    lastCountedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastCountResult: {
      type: String,
      enum: ['match', 'surplus', 'deficit', null],
      default: null,
    },
    countDiscrepancy: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ── Indexes ─────────────────────────────────────────────────
inventoryStockSchema.index({ itemId: 1, branchId: 1 }, { unique: true });
inventoryStockSchema.index({ 'batches.expiryDate': 1 });
inventoryStockSchema.index({ availableQuantity: 1 });

// ── Pre-save: compute availableQuantity ─────────────────────
inventoryStockSchema.pre('save', function () {
  this.availableQuantity = Math.max(0, this.quantity - this.reservedQuantity);
});

// ── Model Factory ───────────────────────────────────────────
export function getInventoryStockModel(connection: Connection): Model<IInventoryStock> {
  return (connection.models.InventoryStock ||
    connection.model('InventoryStock', inventoryStockSchema)) as Model<IInventoryStock>;
}
export type InventoryStockModel = ReturnType<typeof getInventoryStockModel>;

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Inventory Item Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §8 (Collection #54)
 * Per DENTO_V2_MASTER_PLAN.md §16
 *
 * Master catalog of all inventory items (consumables + non-consumables).
 * Stocks are tracked per-branch in inventory_stock.
 * Auto-generated SKU: ITM-{year}-{seq}
 */

// ── Types ───────────────────────────────────────────────────

export type InventoryUnit =
  | 'piece'
  | 'box'
  | 'pack'
  | 'bottle'
  | 'tube'
  | 'ml'
  | 'liter'
  | 'gram'
  | 'kg'
  | 'unit'
  | 'syringe'
  | 'capsule';

export type BarcodeType = 'ean13' | 'code128' | 'qr' | 'datamatrix';

export interface IInventoryItem extends Document {
  sku: string;
  nameEn: string;
  nameAr: string;
  categoryId: Types.ObjectId;
  description: string;
  unit: InventoryUnit;
  unitsPerPackage: number;
  unitCost: number;
  sellingPrice: number;
  marginPercent: number;
  reorderLevel: number;
  reorderQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  isConsumable: boolean;
  requiresPrescription: boolean;
  imageUrl: string;
  barcode: string;
  barcodeType: BarcodeType | null;
  manufacturer: string;
  manufacturerRef: string;

  // Statistics (denormalized, periodically updated)
  totalConsumed: number;
  avgMonthlyUsage: number;
  lastPurchaseDate: Date | null;
  lastPurchasePrice: number;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    sku: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, default: '', trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'InventoryCategory', required: true },
    description: { type: String, default: '' },
    unit: {
      type: String,
      enum: [
        'piece',
        'box',
        'pack',
        'bottle',
        'tube',
        'ml',
        'liter',
        'gram',
        'kg',
        'unit',
        'syringe',
        'capsule',
      ],
      default: 'piece',
    },
    unitsPerPackage: { type: Number, default: 1, min: 1 },
    unitCost: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    marginPercent: { type: Number, default: 0, min: 0, max: 100 },
    reorderLevel: { type: Number, default: 10, min: 0 },
    reorderQuantity: { type: Number, default: 50, min: 1 },
    minStockLevel: { type: Number, default: 0, min: 0 },
    maxStockLevel: { type: Number, default: 0, min: 0 },
    isConsumable: { type: Boolean, default: true },
    requiresPrescription: { type: Boolean, default: false },
    imageUrl: { type: String, default: '' },
    barcode: { type: String, default: '' },
    barcodeType: {
      type: String,
      enum: ['ean13', 'code128', 'qr', 'datamatrix', null],
      default: null,
    },
    manufacturer: { type: String, default: '' },
    manufacturerRef: { type: String, default: '' },

    // Statistics
    totalConsumed: { type: Number, default: 0, min: 0 },
    avgMonthlyUsage: { type: Number, default: 0, min: 0 },
    lastPurchaseDate: { type: Date, default: null },
    lastPurchasePrice: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.name = { en: ret.nameEn || '', ar: ret.nameAr || '' };
        delete ret.nameEn;
        delete ret.nameAr;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.name = { en: ret.nameEn || '', ar: ret.nameAr || '' };
        delete ret.nameEn;
        delete ret.nameAr;
        return ret;
      },
    },
  },
);

// ── Indexes ─────────────────────────────────────────────────

inventoryItemSchema.index({ sku: 1 }, { unique: true });
inventoryItemSchema.index({ categoryId: 1 });
inventoryItemSchema.index(
  { barcode: 1 },
  { unique: true, sparse: true, partialFilterExpression: { barcode: { $ne: '' } } },
);
inventoryItemSchema.index({ isActive: 1, nameEn: 1 });
inventoryItemSchema.index(
  { nameEn: 'text', nameAr: 'text', sku: 'text' },
  { name: 'inventory_item_search' },
);

// ── Auto-generate SKU ───────────────────────────────────────

inventoryItemSchema.pre('validate', async function () {
  if (this.isNew && !this.sku) {
    const model = this.constructor as ReturnType<typeof getInventoryItemModel>;
    const year = new Date().getFullYear();
    const prefix = 'ITM';

    const lastItem = await model
      .findOne({ sku: { $regex: `^${prefix}-${year}-` } }, { sku: 1 })
      .sort({ sku: -1 })
      .lean();

    let nextNumber = 1;
    if (lastItem?.sku) {
      const match = lastItem.sku.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.sku = `${prefix}-${year}-${String(nextNumber).padStart(5, '0')}`;
  }
});

// ── Model Factory ───────────────────────────────────────────

export function getInventoryItemModel(connection: Connection): Model<IInventoryItem> {
  return (connection.models.InventoryItem ||
    connection.model('InventoryItem', inventoryItemSchema)) as Model<IInventoryItem>;
}

export type InventoryItemModel = ReturnType<typeof getInventoryItemModel>;

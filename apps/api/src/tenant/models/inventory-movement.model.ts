import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';
import { fieldEncryptionPlugin } from '../../utils/mongoose-field-encryption.plugin.js';

/**
 * Inventory Movement — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §8 (Collection #56)
 * Per DENTO_V2_MASTER_PLAN.md §16
 *
 * Immutable audit trail of all stock movements.
 * 13 movement types cover every stock change scenario.
 * Only createdAt — movements are never updated.
 */

// ── Types ───────────────────────────────────────────────────
export type MovementType =
  | 'purchase'
  | 'sale'
  | 'adjustment_add'
  | 'adjustment_remove'
  | 'transfer_in'
  | 'transfer_out'
  | 'expired'
  | 'damaged'
  | 'return_supplier'
  | 'return_patient'
  | 'consumed'
  | 'reserved'
  | 'unreserved';

export type MovementReferenceType =
  | 'invoice'
  | 'purchase_order'
  | 'transfer'
  | 'procedure_note'
  | 'treatment_plan'
  | 'appointment'
  | 'manual'
  | 'stock_count'
  | 'expiry_check';

export interface IInventoryMovement extends Document {
  itemId: Types.ObjectId;
  branchId: Types.ObjectId;
  movementType: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost: number;
  totalCost: number;
  referenceType: MovementReferenceType | null;
  referenceId: Types.ObjectId | null;
  batchNumber: string;
  lotNumber: string;
  expiryDate: Date | null;
  transferId: Types.ObjectId | null;
  fromBranchId: Types.ObjectId | null;
  toBranchId: Types.ObjectId | null;
  notes: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

// ── Schema ──────────────────────────────────────────────────
const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    movementType: {
      type: String,
      enum: [
        'purchase',
        'sale',
        'adjustment_add',
        'adjustment_remove',
        'transfer_in',
        'transfer_out',
        'expired',
        'damaged',
        'return_supplier',
        'return_patient',
        'consumed',
        'reserved',
        'unreserved',
      ],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    previousQuantity: { type: Number, required: true, min: 0 },
    newQuantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    referenceType: {
      type: String,
      enum: [
        'invoice',
        'purchase_order',
        'transfer',
        'procedure_note',
        'treatment_plan',
        'appointment',
        'manual',
        'stock_count',
        'expiry_check',
        null,
      ],
      default: null,
    },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    batchNumber: { type: String, default: '' },
    lotNumber: { type: String, default: '' },
    expiryDate: { type: Date, default: null },
    transferId: { type: Schema.Types.ObjectId, default: null },
    fromBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    toBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// ── Indexes ─────────────────────────────────────────────────
inventoryMovementSchema.index({ itemId: 1, createdAt: -1 });
inventoryMovementSchema.index({ branchId: 1, createdAt: -1 });
inventoryMovementSchema.index({ branchId: 1, movementType: 1 });
inventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });
inventoryMovementSchema.index({ transferId: 1 });
inventoryMovementSchema.index({ createdAt: -1 });

// ── Field-Level Encryption (HIPAA/GDPR — C-1 Tier-2) ──────────────
inventoryMovementSchema.plugin(fieldEncryptionPlugin, { fields: ['notes'] });

// ── Pre-validate: compute totalCost ─────────────────────────
inventoryMovementSchema.pre('validate', function () {
  if (this.isNew && this.unitCost > 0) {
    this.totalCost = this.quantity * this.unitCost;
  }
});

// ── Model Factory ───────────────────────────────────────────
export function getInventoryMovementModel(connection: Connection): Model<IInventoryMovement> {
  return (connection.models.InventoryMovement ||
    connection.model('InventoryMovement', inventoryMovementSchema)) as Model<IInventoryMovement>;
}
export type InventoryMovementModel = ReturnType<typeof getInventoryMovementModel>;

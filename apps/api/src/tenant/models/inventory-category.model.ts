import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

/**
 * Inventory Category Model — Tenant Database (tenant_{slug})
 *
 * Per V2_DATABASE.md §8 (Collection #53)
 * Per DENTO_V2_MASTER_PLAN.md §16
 *
 * Hierarchical categories for inventory items.
 * Seed: 10 default dental categories created during tenant onboarding.
 */

// ── Types ───────────────────────────────────────────────────

export interface IInventoryCategory extends Document {
  nameEn: string;
  nameAr: string;
  slug: string;
  parentId: Types.ObjectId | null;
  description: string;
  icon: string;
  sortOrder: number;

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────

const inventoryCategorySchema = new Schema<IInventoryCategory>(
  {
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, default: '', trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'InventoryCategory', default: null },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    sortOrder: { type: Number, default: 0, min: 0 },

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

inventoryCategorySchema.index({ slug: 1 }, { unique: true });
inventoryCategorySchema.index({ parentId: 1 });
inventoryCategorySchema.index({ isActive: 1, sortOrder: 1 });

// ── Auto-generate slug from nameEn ─────────────────────────

inventoryCategorySchema.pre('validate', function () {
  if (this.isNew && !this.slug && this.nameEn) {
    this.slug = this.nameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
});

// ── Seed Data ───────────────────────────────────────────────

export const INVENTORY_CATEGORY_SEEDS = [
  { nameEn: 'Consumables', nameAr: 'مستهلكات', slug: 'consumables', icon: 'Package', sortOrder: 1 },
  {
    nameEn: 'Dental Materials',
    nameAr: 'مواد طب الأسنان',
    slug: 'dental-materials',
    icon: 'Layers',
    sortOrder: 2,
  },
  { nameEn: 'Anesthetics', nameAr: 'مخدرات', slug: 'anesthetics', icon: 'Syringe', sortOrder: 3 },
  {
    nameEn: 'Surgical Instruments',
    nameAr: 'أدوات جراحية',
    slug: 'surgical-instruments',
    icon: 'Scissors',
    sortOrder: 4,
  },
  { nameEn: 'Endodontic', nameAr: 'علاج جذور', slug: 'endodontic', icon: 'Drill', sortOrder: 5 },
  {
    nameEn: 'Restorative',
    nameAr: 'ترميمي',
    slug: 'restorative',
    icon: 'PaintBucket',
    sortOrder: 6,
  },
  {
    nameEn: 'Prosthodontic',
    nameAr: 'تعويضات',
    slug: 'prosthodontic',
    icon: 'Crown',
    sortOrder: 7,
  },
  {
    nameEn: 'Orthodontic',
    nameAr: 'تقويم',
    slug: 'orthodontic',
    icon: 'AlignCenter',
    sortOrder: 8,
  },
  { nameEn: 'Preventive', nameAr: 'وقائي', slug: 'preventive', icon: 'Shield', sortOrder: 9 },
  {
    nameEn: 'Infection Control',
    nameAr: 'مكافحة العدوى',
    slug: 'infection-control',
    icon: 'ShieldCheck',
    sortOrder: 10,
  },
];

// ── Model Factory ───────────────────────────────────────────

export function getInventoryCategoryModel(connection: Connection): Model<IInventoryCategory> {
  return (connection.models.InventoryCategory ||
    connection.model('InventoryCategory', inventoryCategorySchema)) as Model<IInventoryCategory>;
}

export type InventoryCategoryModel = ReturnType<typeof getInventoryCategoryModel>;

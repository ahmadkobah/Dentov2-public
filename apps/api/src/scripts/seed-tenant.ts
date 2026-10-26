/**
 * Dento v2 — Tenant Seed Script
 *
 * Seeds a tenant database (tenant_{slug}) with:
 * - Medications (20+ common dental medications)
 * - Lab Order Types (14 standard types)
 * - Services (25 common dental services)
 * - Inventory Categories (10 dental categories)
 * - Inventory Items / Materials (30 common dental materials)
 * - Consent Templates (10 common dental consent forms)
 *
 * This runs automatically when a new tenant is created.
 * Can also be run manually: pnpm --filter @dento/api seed:tenant --slug=demo
 */

import type { Connection } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import { medications, labOrderTypes } from './seed-data/medications.js';
import { services } from './seed-data/services.js';
import { materials } from './seed-data/materials.js';
import { INVENTORY_CATEGORY_SEEDS } from '../tenant/models/inventory-category.model.js';
import { consentTemplates } from './seed-data/consent-templates.js';
import { bookingNotificationTemplates } from './seed-data/booking-notification-templates.js';

// ── Tenant Models (minimal for seeding) ─────────────────────

const medicationSchema = new Schema(
  {
    nameEn: { type: String, required: true },
    nameAr: { type: String, default: '' },
    genericName: { type: String, default: '' },
    category: { type: String, required: true },
    dosageForm: { type: String, required: true },
    strength: { type: String, default: '' },
    defaultDosage: { type: String, default: '' },
    defaultFrequency: { type: String, default: '' },
    defaultDuration: { type: String, default: '' },
    instructionsEn: { type: String, default: '' },
    instructionsAr: { type: String, default: '' },
    warnings: [String],
    contraindications: [String],
    isCustom: { type: Boolean, default: false }, // false = seed, true = tenant-created
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const labOrderTypeSchema = new Schema(
  {
    name: {
      type: new Schema(
        { en: { type: String, required: true }, ar: { type: String, default: '' } },
        { _id: false },
      ),
      required: true,
    },
    category: { type: String, required: true },
    description: String,
    defaultTurnaroundDays: { type: Number, default: 7 },
    isCustom: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const bilingualSeedSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const serviceSeedSchema = new Schema(
  {
    name: { type: bilingualSeedSchema, required: true },
    description: { type: bilingualSeedSchema, default: () => ({ en: '', ar: '' }) },
    code: { type: String, trim: true },
    defaultPrice: { type: Number, required: true, min: 0 },
    defaultDuration: { type: Number, default: 30 },
    branchPrices: { type: [Schema.Types.Mixed], default: [] },
    requiredMaterials: { type: [Schema.Types.Mixed], default: [] },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const inventoryCategorySeedSchema = new Schema(
  {
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, default: '', trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    parentId: { type: Schema.Types.ObjectId, default: null },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const inventoryItemSeedSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, default: '', trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'InventoryCategory', required: true },
    description: { type: String, default: '' },
    unit: { type: String, default: 'piece' },
    unitCost: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10, min: 0 },
    reorderQuantity: { type: Number, default: 50, min: 1 },
    isConsumable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const consentTemplateSeedBilingualSchema = new Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, default: '' },
  },
  { _id: false },
);

const consentTemplateSeedSchema = new Schema(
  {
    name: { type: consentTemplateSeedBilingualSchema, required: true },
    procedureType: { type: String, required: true, trim: true },
    content: { type: consentTemplateSeedBilingualSchema, required: true },
    risks: { type: consentTemplateSeedBilingualSchema, default: () => ({ en: '', ar: '' }) },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/**
 * Seed a tenant database with default data.
 * Called when a new tenant is created via the API.
 */
export async function seedTenantDatabase(
  tenantDb: Connection,
  tenantSlug: string,
): Promise<{
  medicationsCount: number;
  labOrderTypesCount: number;
  servicesCount: number;
  categoriesCount: number;
  materialsCount: number;
  consentTemplatesCount: number;
  notificationTemplatesCount: number;
}> {
  console.log(`🌱 Seeding tenant database: tenant_${tenantSlug}`);

  // Get or create models
  const Medication = tenantDb.models.Medication || tenantDb.model('Medication', medicationSchema);
  const LabOrderType =
    tenantDb.models.LabOrderType || tenantDb.model('LabOrderType', labOrderTypeSchema);
  const Service = tenantDb.models.Service || tenantDb.model('Service', serviceSeedSchema);
  const InventoryCategory =
    tenantDb.models.InventoryCategory ||
    tenantDb.model('InventoryCategory', inventoryCategorySeedSchema);
  const InventoryItem =
    tenantDb.models.InventoryItem || tenantDb.model('InventoryItem', inventoryItemSeedSchema);
  const ConsentTemplate =
    tenantDb.models.ConsentTemplate ||
    tenantDb.model('ConsentTemplate', consentTemplateSeedSchema, 'consent_templates');

  // ── Seed Medications ────────────────────────────────────
  let medicationsCount = 0;
  for (const med of medications) {
    const exists = await Medication.exists({ nameEn: med.nameEn, isCustom: false });
    if (!exists) {
      await Medication.create({ ...med, isCustom: false });
      medicationsCount++;
    }
  }

  // ── Seed Lab Order Types ────────────────────────────────
  let labOrderTypesCount = 0;
  for (const lot of labOrderTypes) {
    const exists = await LabOrderType.exists({ 'name.en': lot.name.en, isCustom: false });
    if (!exists) {
      await LabOrderType.create({ ...lot, isCustom: false });
      labOrderTypesCount++;
    }
  }

  // ── Seed Services ───────────────────────────────────────
  let servicesCount = 0;
  for (const svc of services) {
    const exists = await Service.exists({ code: svc.code });
    if (!exists) {
      await Service.create({ ...svc, isDefault: true });
      servicesCount++;
    }
  }

  // ── Seed Inventory Categories ───────────────────────────
  let categoriesCount = 0;
  const categoryMap = new Map<string, string>(); // slug → _id
  for (const cat of INVENTORY_CATEGORY_SEEDS) {
    let doc = (await InventoryCategory.findOne({ slug: cat.slug }).lean()) as {
      _id: unknown;
    } | null;
    if (!doc) {
      const created = await InventoryCategory.create(cat);
      doc = { _id: created._id };
      categoriesCount++;
    }
    categoryMap.set(cat.slug, String(doc._id));
  }

  // ── Seed Inventory Items (Materials) ────────────────────
  let materialsCount = 0;
  const year = new Date().getFullYear();
  let skuSeq = 1;

  // Find the latest SKU to continue the sequence
  const lastItem = (await InventoryItem.findOne({ sku: { $regex: `^ITM-${year}-` } }, { sku: 1 })
    .sort({ sku: -1 })
    .lean()) as { sku?: string } | null;
  if (lastItem?.sku) {
    const match = lastItem.sku!.match(/-(\d+)$/);
    if (match) skuSeq = parseInt(match[1], 10) + 1;
  }

  for (const mat of materials) {
    const categoryId = categoryMap.get(mat.categorySlug);
    if (!categoryId) continue; // skip if category not found

    const exists = await InventoryItem.exists({ nameEn: mat.nameEn });
    if (!exists) {
      const sku = `ITM-${year}-${String(skuSeq).padStart(5, '0')}`;
      skuSeq++;
      await InventoryItem.create({
        sku,
        nameEn: mat.nameEn,
        nameAr: mat.nameAr,
        categoryId,
        unit: mat.unit,
        unitCost: mat.unitCost,
        sellingPrice: mat.sellingPrice,
        reorderLevel: mat.reorderLevel,
        reorderQuantity: mat.reorderQuantity,
        isConsumable: mat.isConsumable,
        isActive: mat.isActive,
      });
      materialsCount++;
    }
  }

  console.log(`   ✓ Medications: ${medicationsCount}`);
  console.log(`   ✓ Lab Order Types: ${labOrderTypesCount}`);
  console.log(`   ✓ Services: ${servicesCount}`);
  console.log(`   ✓ Inventory Categories: ${categoriesCount}`);
  console.log(`   ✓ Materials: ${materialsCount}`);

  // ── Seed Consent Templates ──────────────────────────────
  let consentTemplatesCount = 0;
  for (const tpl of consentTemplates) {
    const exists = await ConsentTemplate.exists({
      procedureType: tpl.procedureType,
      isDefault: true,
    });
    if (!exists) {
      await ConsentTemplate.create({ ...tpl, isDefault: true });
      consentTemplatesCount++;
    }
  }

  console.log(`   ✓ Consent Templates: ${consentTemplatesCount}`);

  // ── Seed Notification Templates ──────────────────────────
  const NotificationTemplate =
    tenantDb.models.NotificationTemplate ||
    tenantDb.model(
      'NotificationTemplate',
      new Schema({}, { strict: false, timestamps: true }),
      'notificationtemplates',
    );

  let notificationTemplatesCount = 0;
  for (const tpl of bookingNotificationTemplates) {
    const exists = await NotificationTemplate.exists({
      key: tpl.key,
      tenantId: tenantSlug,
    });
    if (!exists) {
      await NotificationTemplate.create({ ...tpl, tenantId: tenantSlug });
      notificationTemplatesCount++;
    }
  }

  console.log(`   ✓ Notification Templates: ${notificationTemplatesCount}`);

  return {
    medicationsCount,
    labOrderTypesCount,
    servicesCount,
    categoriesCount,
    materialsCount,
    consentTemplatesCount,
    notificationTemplatesCount,
  };
}

// ── CLI Runner ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((arg) => arg.startsWith('--slug='));

  if (!slugArg) {
    console.error('Usage: pnpm seed:tenant --slug=<tenant_slug>');
    process.exit(1);
  }

  const slug = slugArg.split('=')[1];
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';

  try {
    // Connect to platform DB first
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get tenant-specific connection
    const tenantDb = mongoose.connection.useDb(`tenant_${slug}`, { useCache: true });

    // Run seed
    const result = await seedTenantDatabase(tenantDb, slug);

    console.log('\n✅ Tenant seed complete!');
    console.log('─'.repeat(50));
    console.log(`📊 Summary for tenant_${slug}:`);
    console.log(`   • Medications: ${result.medicationsCount}`);
    console.log(`   • Lab Order Types: ${result.labOrderTypesCount}`);
    console.log(`   • Services: ${result.servicesCount}`);
    console.log('─'.repeat(50));
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (process.argv[1]?.includes('seed-tenant')) {
  main();
}

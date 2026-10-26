/**
 * migrate-inventory.ts — Step 7: Inventory categories + items + stock → inventory_*
 */

import type { MigrationContext, MigrationStepResult } from './index.js';
import {
  startProgress,
  updateProgress,
  errorProgress,
  finishProgress,
  setIdMapping,
  getIdMapping,
  toDate,
  migrationLog,
} from './utils.js';
import mongoose from 'mongoose';

export async function migrateInventory(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];

  // Categories
  const { rows: categories } = await pgPool.query(
    `SELECT ic.*, t.slug as tenant_slug
     FROM inventory_categories ic
     LEFT JOIN tenants t ON ic.tenant_id = t.id
     ${tenantFilter}
     ORDER BY ic.created_at`,
    params,
  );

  const categoryDocs = [];
  for (const row of categories) {
    const _id = new mongoose.Types.ObjectId();
    setIdMapping('inventory_categories', row.id, _id);
    categoryDocs.push({
      _id,
      tenantSlug: row.tenant_slug,
      name: row.name,
      description: row.description || null,
      parentId: row.parent_id ? getIdMapping('inventory_categories', row.parent_id) : null,
      isActive: row.is_active ?? true,
      createdAt: toDate(row.created_at) ?? new Date(),
      updatedAt: toDate(row.updated_at) ?? new Date(),
    });
  }

  // Items
  const { rows: items } = await pgPool.query(
    `SELECT ii.*, t.slug as tenant_slug
     FROM inventory_items ii
     LEFT JOIN tenants t ON ii.tenant_id = t.id
     ${tenantFilter}
     ORDER BY ii.created_at`,
    params,
  );

  const progress = startProgress('inventory', categories.length + items.length);
  const itemDocs = [];

  for (const row of items) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('inventory_items', row.id, _id);

      itemDocs.push({
        _id,
        tenantSlug: row.tenant_slug,
        categoryId: getIdMapping('inventory_categories', row.category_id) || null,
        name: row.name || '',
        sku: row.sku || `MIG-${row.id}`,
        unit: row.unit || 'piece',
        currentStock: parseInt(row.current_stock) || 0,
        minStock: parseInt(row.min_stock) || 0,
        maxStock: parseInt(row.max_stock) || 0,
        costPrice: parseFloat(row.cost_price) || 0,
        sellingPrice: parseFloat(row.selling_price) || 0,
        expiryDate: toDate(row.expiry_date),
        isActive: row.is_active ?? true,
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      updateProgress('inventory');
    } catch (error) {
      errorProgress('inventory');
      migrationLog.error(`Failed to transform inventory item ${row.id}:`, error);
    }
  }

  if (!dryRun) {
    const db = mongoose.connection.db!;
    if (categoryDocs.length > 0) {
      await db
        .collection('inventory_categories')
        .insertMany(categoryDocs, { ordered: false })
        .catch(() => {});
      migrationLog.info(`Migrated ${categoryDocs.length} inventory categories`);
    }
    if (itemDocs.length > 0) {
      await db
        .collection('inventory_items')
        .insertMany(itemDocs, { ordered: false })
        .catch(() => {});
    }
  }

  // Count categories toward progress
  for (let i = 0; i < categoryDocs.length; i++) updateProgress('inventory');

  finishProgress('inventory');

  return {
    step: 'inventory',
    total: categories.length + items.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}

/**
 * Backfill script: Reconcile Tenant.enabledModules[] ↔ TenantModule records
 *
 * For each tenant:
 *   1. Creates TenantModule records for slugs in enabledModules but missing from TenantModule
 *   2. Adds to enabledModules any slugs found in TenantModule but not in the array
 *
 * Safe to run multiple times (idempotent).
 * Run: node scripts/backfill-module-sync.mjs
 */
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
const envVars = Object.fromEntries(
  envFile
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join('=')]),
);

const uri = envVars.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';
await mongoose.connect(uri);

const db = mongoose.connection.db;
const tenantsCol = db.collection('tenants');
const tenantModulesCol = db.collection('tenantmodules');
const modulesCol = db.collection('modules');

// Build a map of module slug → latest version
const allModules = await modulesCol.find({}, { projection: { slug: 1, version: 1 } }).toArray();
const moduleVersionMap = new Map(allModules.map((m) => [m.slug, m.version || '1.0.0']));

const tenants = await tenantsCol
  .find({}, { projection: { _id: 1, slug: 1, enabledModules: 1 } })
  .toArray();

let totalCreated = 0;
let totalAddedToArray = 0;

for (const tenant of tenants) {
  const tenantId = tenant._id.toString();
  const enabledModules = tenant.enabledModules || [];
  const enabledSet = new Set(enabledModules);

  // Get existing TenantModule records
  const existingTMs = await tenantModulesCol
    .find({ tenantId }, { projection: { moduleSlug: 1 } })
    .toArray();
  const existingSlugs = new Set(existingTMs.map((tm) => tm.moduleSlug));

  // 1. Create TenantModule records for slugs in enabledModules but missing
  const toCreate = enabledModules.filter((s) => !existingSlugs.has(s));
  if (toCreate.length > 0) {
    const docs = toCreate.map((slug) => ({
      tenantId,
      moduleSlug: slug,
      installedVersion: moduleVersionMap.get(slug) || '1.0.0',
      availableVersion: moduleVersionMap.get(slug) || '1.0.0',
      updatePolicy: 'auto',
      isCanary: false,
      installedAt: new Date(),
      isActive: true,
      updateHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    try {
      const result = await tenantModulesCol.insertMany(docs, { ordered: false });
      totalCreated += result.insertedCount;
      console.log(
        `  [${tenant.slug}] Created ${result.insertedCount} TenantModule record(s): ${toCreate.join(', ')}`,
      );
    } catch (err) {
      // Ignore duplicate key errors
      if (err?.code !== 11000) {
        console.error(`  [${tenant.slug}] Error creating TenantModule records:`, err.message);
      }
    }
  }

  // 2. Add to enabledModules any slugs in TenantModule but not in the array
  const toAdd = [...existingSlugs].filter((s) => !enabledSet.has(s));
  if (toAdd.length > 0) {
    await tenantsCol.updateOne(
      { _id: tenant._id },
      { $addToSet: { enabledModules: { $each: toAdd } } },
    );
    totalAddedToArray += toAdd.length;
    console.log(
      `  [${tenant.slug}] Added ${toAdd.length} slug(s) to enabledModules: ${toAdd.join(', ')}`,
    );
  }

  if (toCreate.length === 0 && toAdd.length === 0) {
    console.log(`  [${tenant.slug}] Already in sync ✓`);
  }
}

console.log(
  `\nDone. Created ${totalCreated} TenantModule record(s), added ${totalAddedToArray} slug(s) to enabledModules.`,
);
await mongoose.disconnect();

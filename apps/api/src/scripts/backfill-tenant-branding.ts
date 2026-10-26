/**
 * Diagnostic + back-fill: tenant-DB branding → platform Tenant.branding
 *
 * For every tenant in the platform DB:
 *   1. Connect to tenant_{slug} DB and read the branding settings doc
 *   2. Compare logoUrl/logoDarkUrl/faviconUrl/primaryColor/accentColor against
 *      what's stored on the platform Tenant.branding
 *   3. If the tenant DB has a value the platform doc is missing/stale → update
 *      the platform doc so list/detail pages start showing it.
 *
 * Read-only by default. Pass --apply to actually write changes.
 *
 * Usage:
 *   pnpm --filter @dento/api exec tsx src/scripts/backfill-tenant-branding.ts          # dry-run
 *   pnpm --filter @dento/api exec tsx src/scripts/backfill-tenant-branding.ts --apply  # write
 */

import mongoose from 'mongoose';
import { Tenant } from '../platform/models/tenant.model.js';
import { createBrandingModel } from '../tenant/models/branding.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';
const APPLY = process.argv.includes('--apply');

const FIELDS = ['logoUrl', 'logoDarkUrl', 'faviconUrl', 'primaryColor', 'accentColor'] as const;
type Field = (typeof FIELDS)[number];

async function main(): Promise<void> {
  console.log(`\n→ Connecting to ${MONGODB_URI.replace(/:\/\/[^@]+@/, '://***@')}`);
  await mongoose.connect(MONGODB_URI);

  const tenants = await Tenant.find({}).lean();
  console.log(`→ Found ${tenants.length} tenant(s) on the platform\n`);
  console.log(
    APPLY
      ? '⚠️  --apply set — changes WILL be written\n'
      : '🔎 Dry-run mode (use --apply to write)\n',
  );

  let totalChanged = 0;

  for (const tenant of tenants) {
    const slug = tenant.slug;
    const platformBranding: Partial<Record<Field, unknown>> = tenant.branding ?? {};

    let tenantBranding: Partial<Record<Field, unknown>> = {};
    try {
      const tenantDb = mongoose.connection.useDb(`tenant_${slug}`, { useCache: true });
      const BrandingModel = createBrandingModel(tenantDb);
      const doc = await BrandingModel.findOne({ type: 'branding' }).lean();
      tenantBranding = doc ?? {};
    } catch (err) {
      console.log(`  [${slug}] ❌ failed to read tenant DB: ${(err as Error).message}`);
      continue;
    }

    const updates: Record<string, unknown> = {};
    const diffs: string[] = [];
    for (const f of FIELDS) {
      const tVal = tenantBranding[f as Field];
      const pVal = platformBranding[f as Field];
      if (tVal !== undefined && tVal !== null && tVal !== '' && tVal !== pVal) {
        updates[`branding.${f}`] = tVal;
        diffs.push(`${f}: ${pretty(pVal)} → ${pretty(tVal)}`);
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  [${slug}] ✓ in sync`);
      continue;
    }

    console.log(`  [${slug}] ⤴ ${diffs.length} field(s) need sync:`);
    for (const d of diffs) console.log(`         • ${d}`);

    if (APPLY) {
      const res = await Tenant.updateOne({ slug }, { $set: updates });
      console.log(`         applied — matched=${res.matchedCount} modified=${res.modifiedCount}`);
    }
    totalChanged++;
  }

  console.log(`\n→ Done. ${totalChanged} tenant(s) ${APPLY ? 'updated' : 'would be updated'}.\n`);
  await mongoose.disconnect();
}

function pretty(v: unknown): string {
  if (v === undefined) return '<unset>';
  if (v === null) return 'null';
  if (typeof v === 'string') {
    return v.length > 60 ? `"${v.slice(0, 57)}..."` : `"${v}"`;
  }
  return String(v);
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err);
  process.exit(1);
});

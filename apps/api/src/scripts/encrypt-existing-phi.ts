/**
 * One-shot backfill: encrypt PHI / PII columns at rest.
 *
 * Per HIPAA §164.312(a)(2)(iv) and GDPR Art. 32(1)(a). Companion to the C-1
 * `fieldEncryptionPlugin` rollout — once new writes are encrypted by the plugin
 * we still need to encrypt every existing row in every tenant database.
 *
 * Properties:
 *   • Idempotent — `isEncryptedString` shape-check skips already-ciphered values
 *     so the script can safely be re-run, paused, or run in parallel with new
 *     writes from the application (the plugin is idempotent too).
 *   • Cursor-based — iterates with `.find().cursor()` so memory stays bounded
 *     regardless of collection size.
 *   • Per-document `updateOne` — no transactions / no replica-set assumption.
 *     Each document is independently advanced; a crash mid-run resumes from
 *     wherever the next pass picks up.
 *   • Bypasses Mongoose model hooks by writing through the raw driver
 *     (`db.collection(...).updateOne(...)`) so the plugin's post-find hook does
 *     not try to decrypt the still-plaintext source values.
 *
 * Usage:
 *   pnpm --filter @dento/api exec tsx src/scripts/encrypt-existing-phi.ts            # dry-run
 *   pnpm --filter @dento/api exec tsx src/scripts/encrypt-existing-phi.ts --apply    # write
 *   pnpm --filter @dento/api exec tsx src/scripts/encrypt-existing-phi.ts --apply --tenant=acme
 */

import mongoose from 'mongoose';
import { Tenant } from '../platform/models/tenant.model.js';
import { encryptField, isEncryptedString, searchHash } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';
const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 100;

const TENANT_FILTER = (() => {
  const arg = process.argv.find((a) => a.startsWith('--tenant='));
  return arg ? arg.slice('--tenant='.length) : null;
})();

// ── Per-collection field plans ─────────────────────────────
//
// `top` / `nested` / `array` describe which paths to encrypt; `searchHashes`
// describes which plaintext should also populate an HMAC companion field
// (used for indexable equality lookups on encrypted columns).

interface FieldPlan {
  /** Top-level scalar string fields. */
  top: readonly string[];
  /** Embedded sub-document scalar paths, e.g. `'medicalHistory.notes'`. */
  nested?: readonly string[];
  /** Map of `<arrayField>` → list of leaf paths inside each element to encrypt. */
  array?: Record<string, readonly string[]>;
  /** Map of `<plaintextTopLevelField>` → `<companionHashField>`. */
  searchHashes?: Record<string, string>;
}

const PLANS: Record<string, FieldPlan> = {
  patients: {
    top: [
      'nationalId',
      'phone',
      'email',
      'address',
      'emergencyContactName',
      'emergencyContactPhone',
      'notes',
    ],
    nested: [
      'medicalHistory.previousDentalSurgeries',
      'medicalHistory.otherConditions',
      'medicalHistory.additionalNotes',
      'medicalHistory.smokingFrequency',
    ],
    array: {
      medicalHistory_currentMedications_INLINE: [], // handled specially below
      insurance: ['policyNumber', 'memberId'],
    },
    searchHashes: {
      phone: 'phoneHash',
      email: 'emailHash',
      nationalId: 'nationalIdHash',
    },
  },
  prescriptions: {
    top: ['diagnosis', 'notes'],
    array: { items: ['instructions', 'notes'] },
  },
  consent_forms: {
    top: ['patientSignature', 'witnessSignature'],
  },
  procedurenotes: {
    top: [
      'procedurePerformed',
      'materialsUsed',
      'anesthesiaUsed',
      'complications',
      'postOpInstructions',
    ],
  },
  treatmentplans: {
    top: ['description', 'notes', 'patientSignature'],
    array: { items: ['notes', 'description'] },
  },

  // ── Tier-1 PHI (extended C-1 rollout) ────────────────────
  appointments: {
    top: ['reason', 'notes', 'internalNotes', 'cancellationReason'],
  },
  dentalcharts: { top: ['notes'] },
  dentalcharthistories: { top: ['notes'] },
  lab_orders: {
    top: ['description', 'specialInstructions', 'tryInNotes', 'adjustmentNotes'],
  },
  cbctorders: { top: ['notes', 'clinicalNotes'] },
  xrays: { top: ['notes', 'comparisonNotes'] },
  scans: { top: ['notes'] },
  referrals: { top: ['reason', 'clinicalNotes', 'outcomeNotes'] },
  chat_messages: {
    top: ['text'],
    nested: ['replyPreview.text'],
  },
  insuranceclaims: { top: ['notes'] },

  // ── Tier-2 PHI (borderline; staff PII / inventory notes) ─
  attendances: { top: ['notes'] },
  leaverequests: { top: ['reason', 'rejectionReason'] },
  inventorymovements: { top: ['notes'] },
};

// Mongoose pluralizes some collection names oddly. The names above match what
// `mongoose.model('X')` actually creates (verified against the model factory
// helpers in `apps/api/src/tenant/models/*.ts`).

interface CollectionStats {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
}

function emptyStats(): CollectionStats {
  return { scanned: 0, updated: 0, skipped: 0, failed: 0 };
}

/** Encrypt a value if it's a non-empty string that is NOT already ciphertext. */
function maybeEncrypt(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (isEncryptedString(value)) return null;
  return encryptField(value);
}

/** Walk an embedded sub-doc by dot-path, returning the leaf value. */
function getNested(doc: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = doc;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Build the `$set` payload for a single document. Returns `null` if the doc
 * has no plaintext values left (i.e. already fully encrypted).
 */
function buildUpdate(
  doc: Record<string, unknown>,
  plan: FieldPlan,
): Record<string, unknown> | null {
  const set: Record<string, unknown> = {};

  // Top-level scalars.
  for (const f of plan.top) {
    const enc = maybeEncrypt(doc[f]);
    if (enc) set[f] = enc;
  }

  // Search-hash companion fields (computed off the *plaintext* — must run
  // BEFORE we lose the plaintext to encryption, but we use `doc[f]` which is
  // still plaintext here regardless of order).
  if (plan.searchHashes) {
    for (const [src, target] of Object.entries(plan.searchHashes)) {
      const raw = doc[src];
      if (typeof raw !== 'string' || raw.length === 0) continue;
      // Already-ciphered values can't be hashed (we don't have plaintext).
      // A previous run of this script already populated the hash field, so
      // skip when we detect ciphertext OR when target already has a value.
      if (isEncryptedString(raw)) continue;
      if (typeof doc[target] === 'string' && (doc[target] as string).length > 0) continue;
      const h = searchHash(raw);
      if (h) set[target] = h;
    }
  }

  // Embedded sub-doc scalars (medicalHistory.notes, etc.).
  for (const path of plan.nested ?? []) {
    const v = getNested(doc, path);
    const enc = maybeEncrypt(v);
    if (enc) set[path] = enc;
  }

  // Patients.medicalHistory.currentMedications is `string[]` — encrypt each entry.
  if (
    Array.isArray(
      (doc.medicalHistory as Record<string, unknown> | undefined)?.['currentMedications'],
    )
  ) {
    const arr = (doc.medicalHistory as Record<string, unknown>)['currentMedications'] as unknown[];
    const next = arr.map((v) => maybeEncrypt(v) ?? v);
    if (next.some((v, i) => v !== arr[i])) {
      set['medicalHistory.currentMedications'] = next;
    }
  }

  // Array-of-subdoc fields (insurance[].policyNumber, items[].notes, …).
  for (const [arrField, leafPaths] of Object.entries(plan.array ?? {})) {
    if (arrField.endsWith('_INLINE')) continue; // handled above
    const arr = doc[arrField];
    if (!Array.isArray(arr)) continue;
    let dirty = false;
    const next = arr.map((el) => {
      if (el == null || typeof el !== 'object') return el;
      const copy: Record<string, unknown> = { ...(el as Record<string, unknown>) };
      for (const leaf of leafPaths) {
        const enc = maybeEncrypt(copy[leaf]);
        if (enc) {
          copy[leaf] = enc;
          dirty = true;
        }
      }
      return copy;
    });
    if (dirty) set[arrField] = next;
  }

  return Object.keys(set).length === 0 ? null : set;
}

// Use mongoose's underlying driver collection type via the public Connection.
type RawCollection = ReturnType<mongoose.Connection['collection']>;

async function processCollection(
  coll: RawCollection,
  plan: FieldPlan,
  label: string,
): Promise<CollectionStats> {
  const stats = emptyStats();
  const cursor = coll.find({}, { batchSize: BATCH_SIZE });

  for await (const doc of cursor) {
    stats.scanned += 1;
    let update: Record<string, unknown> | null;
    try {
      update = buildUpdate(doc, plan);
    } catch (err) {
      stats.failed += 1;
      logger.error({ err, collection: label, _id: doc._id }, 'buildUpdate failed');
      continue;
    }

    if (!update) {
      stats.skipped += 1;
      continue;
    }

    if (!APPLY) {
      stats.updated += 1; // would-be update
      continue;
    }

    try {
      await coll.updateOne({ _id: doc._id }, { $set: update });
      stats.updated += 1;
    } catch (err) {
      stats.failed += 1;
      logger.error({ err, collection: label, _id: doc._id }, 'updateOne failed');
    }
  }

  return stats;
}

async function processTenant(slug: string): Promise<void> {
  const tenantDb = mongoose.connection.useDb(`tenant_${slug}`, { useCache: true });

  console.log(`\n  [${slug}]`);
  for (const [collName, plan] of Object.entries(PLANS)) {
    const coll = tenantDb.collection(collName);
    const exists = await coll.estimatedDocumentCount().catch(() => -1);
    if (exists < 0) {
      console.log(`    ${collName.padEnd(20)} (collection missing — skipped)`);
      continue;
    }
    const stats = await processCollection(coll, plan, `${slug}/${collName}`);
    console.log(
      `    ${collName.padEnd(20)} scanned=${stats.scanned} ` +
        `updated=${stats.updated} skipped=${stats.skipped} failed=${stats.failed}`,
    );
  }
}

async function main(): Promise<void> {
  if (!process.env.ENCRYPTION_MASTER_KEY) {
    console.error('❌ ENCRYPTION_MASTER_KEY env var is required.');
    process.exit(1);
  }
  if (!process.env.SEARCH_HASH_KEY) {
    console.error(
      '❌ SEARCH_HASH_KEY env var is required (HMAC key for indexable equality lookups).',
    );
    process.exit(1);
  }

  console.log(`→ Connecting to ${MONGODB_URI.replace(/:\/\/[^@]+@/, '://***@')}`);
  await mongoose.connect(MONGODB_URI);

  const filter: Record<string, unknown> = {};
  if (TENANT_FILTER) filter.slug = TENANT_FILTER;

  const tenants = await Tenant.find(filter).select('slug').lean();
  console.log(
    `→ ${tenants.length} tenant(s) targeted${TENANT_FILTER ? ` (filter: ${TENANT_FILTER})` : ''}`,
  );
  console.log(
    APPLY ? '⚠️  --apply set — changes WILL be written' : '🔎 Dry-run mode (use --apply to write)',
  );

  for (const t of tenants) {
    try {
      await processTenant(t.slug);
    } catch (err) {
      logger.error({ err, slug: t.slug }, 'processTenant failed');
    }
  }

  await mongoose.disconnect();
  console.log('\n✓ Done.\n');
}

main().catch((err) => {
  logger.error({ err }, 'encrypt-existing-phi backfill crashed');
  process.exit(1);
});

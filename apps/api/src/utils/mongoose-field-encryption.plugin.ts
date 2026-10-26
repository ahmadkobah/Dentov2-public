/**
 * Mongoose Field Encryption Plugin
 *
 * Per HIPAA §164.312(a)(2)(iv) and GDPR Art. 32(1)(a) — encryption of PHI/PII at rest.
 *
 * Wires AES-256-GCM encryption (via `apps/api/src/utils/encryption.ts`) into a
 * Mongoose schema as transparent pre-/post- hooks, so application code never has
 * to remember to call `encryptField` / `decryptField` manually.
 *
 * Hooked operations:
 *   - pre('save')                → encrypt modified target paths
 *   - pre('insertMany')          → encrypt every doc
 *   - pre('findOneAndUpdate')    → encrypt $set / $setOnInsert values
 *   - pre('updateOne')           → same
 *   - pre('updateMany')          → same
 *   - post('init')               → decrypt when loaded into a Document
 *   - post('find')               → decrypt array results (handles .lean() too)
 *   - post('findOne')            → decrypt single result
 *   - post('findOneAndUpdate')   → decrypt the returned doc
 *
 * Idempotency: `encryptField` / `isEncryptedString` checks the `iv:tag:cipher`
 * shape so already-encrypted values are skipped — making the plugin safe to add
 * to a model whose data is partially encrypted (e.g. mid-backfill).
 *
 * Limitations:
 *   - `Model.update()` (deprecated) is NOT hooked. Use `updateOne`/`updateMany`.
 *   - `bulkWrite` operations are NOT hooked — call `encryptField` manually if used.
 *   - Aggregation pipelines bypass document-level hooks; query authors must avoid
 *     projecting encrypted fields through `$match` equality except via the
 *     companion `searchHash` field.
 *
 * @example
 *   schema.plugin(fieldEncryptionPlugin, {
 *     fields: ['phone', 'email', 'medicalHistory.notes'],
 *     searchHashFields: { phone: 'phoneHash', email: 'emailHash' },
 *   });
 */

import type { Schema, Query, HydratedDocument } from 'mongoose';
import {
  encryptField,
  decryptField,
  isEncryptedString,
  isEncryptionEnabled,
  searchHash,
} from './encryption.js';

export interface FieldEncryptionPluginOptions {
  /**
   * Dot-notation paths of fields that should be encrypted at rest.
   * Supports nested paths (`medicalHistory.notes`) and array-element
   * paths (`allergies.allergen` — applied to every element).
   */
  fields: string[];

  /**
   * Optional companion fields that store an HMAC search-hash of the
   * plaintext, enabling indexable equality lookups on encrypted data.
   * Map: `{ <plaintextPath>: <hashFieldPath> }`.
   *
   * @example { phone: 'phoneHash', email: 'emailHash' }
   */
  searchHashFields?: Record<string, string>;
}

// ── Path utilities ──────────────────────────────────────────

function getAtPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (Array.isArray(cur)) {
      // Array path — caller should treat result as array
      return cur.map((el) => getAtPath(el, parts.slice(parts.indexOf(p)).join('.')));
    }
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i]!;
    if (cur[p] == null || typeof cur[p] !== 'object') return;
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

/**
 * Walks a document and applies `transform` to every leaf value found at the
 * given dot-path, descending into arrays automatically. Mutates in place.
 */
function transformLeafAtPath(doc: unknown, path: string, transform: (val: string) => string): void {
  if (doc == null || typeof doc !== 'object') return;

  const parts = path.split('.');
  const [head, ...rest] = parts;
  if (!head) return;

  if (Array.isArray(doc)) {
    for (const el of doc) transformLeafAtPath(el, path, transform);
    return;
  }

  const container = doc as Record<string, unknown>;
  const child = container[head];

  if (rest.length === 0) {
    if (typeof child === 'string' && child.length > 0) {
      container[head] = transform(child);
    } else if (Array.isArray(child)) {
      container[head] = child.map((v) =>
        typeof v === 'string' && v.length > 0 ? transform(v) : v,
      );
    }
    return;
  }

  if (Array.isArray(child)) {
    for (const el of child) transformLeafAtPath(el, rest.join('.'), transform);
  } else if (child != null && typeof child === 'object') {
    transformLeafAtPath(child, rest.join('.'), transform);
  }
}

// ── Hooks ───────────────────────────────────────────────────

function encryptIfNeeded(value: string): string {
  if (!value || isEncryptedString(value)) return value;
  return encryptField(value);
}

function decryptIfNeeded(value: string): string {
  if (!value || !isEncryptedString(value)) return value;
  return decryptField(value);
}

function encryptDoc(doc: Record<string, unknown>, fields: string[]): void {
  for (const path of fields) transformLeafAtPath(doc, path, encryptIfNeeded);
}

function decryptDoc(doc: Record<string, unknown>, fields: string[]): void {
  for (const path of fields) transformLeafAtPath(doc, path, decryptIfNeeded);
}

function applySearchHashes(doc: Record<string, unknown>, hashes: Record<string, string>): void {
  for (const [plainPath, hashPath] of Object.entries(hashes)) {
    const plain = getAtPath(doc, plainPath);
    // The plaintext value is hashed BEFORE encryption runs; if we get here and
    // it's already an encrypted blob (e.g. update with cipher passed in), skip.
    if (typeof plain === 'string' && plain.length > 0 && !isEncryptedString(plain)) {
      const h = searchHash(plain);
      if (h) setAtPath(doc, hashPath, h);
    }
  }
}

function encryptUpdatePayload(
  update: Record<string, unknown> | undefined,
  fields: string[],
  hashes: Record<string, string>,
): void {
  if (!update) return;
  // Process top-level set-shaped operators
  const operators = ['$set', '$setOnInsert'];
  for (const op of operators) {
    const block = update[op];
    if (block && typeof block === 'object') {
      // Apply search hashes from plaintext BEFORE we overwrite with cipher
      applySearchHashes(block as Record<string, unknown>, hashes);
      encryptDoc(block as Record<string, unknown>, fields);
    }
  }
  // Top-level fields without operators (legacy upsert style)
  applySearchHashes(update, hashes);
  encryptDoc(update, fields);
}

// ── Plugin ──────────────────────────────────────────────────

export function fieldEncryptionPlugin(schema: Schema, options: FieldEncryptionPluginOptions): void {
  const fields = options.fields ?? [];
  const hashes = options.searchHashFields ?? {};
  if (fields.length === 0) return;

  // pre('save') — encrypt on document save.
  // Mongoose 9 dropped the `next` callback: a sync hook proceeds by returning
  // and aborts by throwing (equivalent to the old `next()` / `next(err)`).
  schema.pre('save', function preSaveEncrypt(this: HydratedDocument<unknown>) {
    if (!isEncryptionEnabled()) return;
    const obj = this as unknown as Record<string, unknown>;
    // Search-hash the plaintext first, then encrypt. Order matters because
    // encryption replaces the plaintext.
    applySearchHashes(obj, hashes);
    encryptDoc(obj, fields);
  });

  // pre('insertMany') — Mongoose 9 passes the docs array as the first arg
  // (the legacy `next` callback was removed).
  schema.pre('insertMany', function preInsertManyEncrypt(docs: unknown) {
    if (!isEncryptionEnabled()) return;
    if (Array.isArray(docs)) {
      for (const d of docs) {
        if (d && typeof d === 'object') {
          applySearchHashes(d as Record<string, unknown>, hashes);
          encryptDoc(d as Record<string, unknown>, fields);
        }
      }
    }
  });

  // pre update-style operations
  const updateOps = ['findOneAndUpdate', 'updateOne', 'updateMany'] as const;
  for (const op of updateOps) {
    schema.pre(op, function preUpdateEncrypt(this: Query<unknown, unknown>) {
      if (!isEncryptionEnabled()) return;
      const update = this.getUpdate() as Record<string, unknown> | null;
      if (update) {
        encryptUpdatePayload(update, fields, hashes);
        this.setUpdate(update);
      }
    });
  }

  // post('init') — decrypt as soon as a document is hydrated from the DB
  schema.post('init', function postInitDecrypt(doc) {
    if (!isEncryptionEnabled()) return;
    try {
      decryptDoc(doc as unknown as Record<string, unknown>, fields);
    } catch {
      /* noop — decryptField already swallows malformed input */
    }
  });

  // post('find') / post('findOne') / post('findOneAndUpdate') — handles .lean()
  // For non-lean queries, post('init') already decrypted. For .lean(), the
  // result is a plain object array and we walk it here.
  schema.post('find', function postFindDecrypt(res) {
    if (!isEncryptionEnabled()) return;
    if (!Array.isArray(res)) return;
    for (const d of res) {
      if (d && typeof d === 'object' && !('$__' in d)) {
        decryptDoc(d as Record<string, unknown>, fields);
      }
    }
  });
  schema.post('findOne', function postFindOneDecrypt(res) {
    if (!isEncryptionEnabled()) return;
    if (res && typeof res === 'object' && !('$__' in (res as object))) {
      decryptDoc(res as Record<string, unknown>, fields);
    }
  });
  schema.post('findOneAndUpdate', function postFindOneAndUpdateDecrypt(res) {
    if (!isEncryptionEnabled()) return;
    if (res && typeof res === 'object' && !('$__' in (res as object))) {
      decryptDoc(res as Record<string, unknown>, fields);
    }
  });
}

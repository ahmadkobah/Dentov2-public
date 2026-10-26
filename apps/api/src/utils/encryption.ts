import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * PII Field Encryption — AES-256-GCM
 *
 * Per SECURITY_AND_ENCRYPTION.md §4 — PII fields:
 * - nationalId, phone, email, address
 *
 * Format: iv:authTag:ciphertext (all hex-encoded)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getEncryptionKey(): Buffer {
  const masterKey = env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY is not configured');
  }
  // Derive a 32-byte key from the master key using SHA-256
  return crypto.createHash('sha256').update(masterKey).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (hex-encoded)
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted field (iv:authTag:ciphertext format).
 * Returns the original plaintext string.
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue || !encryptedValue.includes(':')) return encryptedValue;

  const parts = encryptedValue.split(':');
  if (parts.length !== 3) return encryptedValue; // Not encrypted, return as-is

  const [ivHex, authTagHex, ciphertext] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // If decryption fails, return the original value (might not be encrypted)
    return encryptedValue;
  }
}

/**
 * Check if encryption is configured and available.
 */
export function isEncryptionEnabled(): boolean {
  return !!env.ENCRYPTION_MASTER_KEY;
}

/**
 * Encrypt PII fields on a patient document before save.
 * Only encrypts if ENCRYPTION_MASTER_KEY is configured.
 */
export function encryptPiiFields<T extends Record<string, unknown>>(doc: T, fields: string[]): T {
  if (!isEncryptionEnabled()) return doc;

  const result = { ...doc };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value && !value.includes(':')) {
      // Only encrypt if not already encrypted (no colons)
      (result as Record<string, unknown>)[field] = encryptField(value);
    }
  }
  return result;
}

/**
 * Decrypt PII fields on a patient document after retrieval.
 * Only decrypts if ENCRYPTION_MASTER_KEY is configured.
 */
export function decryptPiiFields<T extends Record<string, unknown>>(doc: T, fields: string[]): T {
  if (!isEncryptionEnabled()) return doc;

  const result = { ...doc };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value.includes(':')) {
      (result as Record<string, unknown>)[field] = decryptField(value);
    }
  }
  return result;
}

// ── Deterministic Search Hash (for encrypted equality lookups) ─────

/**
 * HMAC-SHA-256 over a normalized value using SEARCH_HASH_KEY.
 *
 * Use this to power equality lookups on encrypted PII fields (e.g.
 * "find patient by phone"). The hash is deterministic — same input always
 * produces the same digest — which means it is INDEXABLE but also
 * vulnerable to dictionary attacks if leaked. That is why the key is
 * separate from `ENCRYPTION_MASTER_KEY`.
 *
 * - Returns `null` for empty / non-string inputs (so optional fields
 *   never get a hash of empty string).
 * - Falls back to SHA-256(value) when SEARCH_HASH_KEY is missing in
 *   non-production (dev/test convenience). Production startup blocks this
 *   via `env.ts` superRefine.
 */
export function searchHash(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const normalized = value.trim().toLowerCase();
  const key = env.SEARCH_HASH_KEY;
  if (!key) {
    // Dev-only fallback: still deterministic, but not keyed.
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

/**
 * Whether a value is in our encrypted format (iv:authTag:ciphertext).
 * Used by the Mongoose plugin to detect already-encrypted values and
 * skip double-encryption (idempotent backfill safety).
 */
export function isEncryptedString(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // iv = 12 bytes = 24 hex chars; authTag = 16 bytes = 32 hex chars
  return (
    /^[0-9a-f]{24}$/i.test(parts[0]!) &&
    /^[0-9a-f]{32}$/i.test(parts[1]!) &&
    /^[0-9a-f]+$/i.test(parts[2]!)
  );
}

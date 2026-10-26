/**
 * Backup Encryption Utilities — AES-256-GCM + HKDF key derivation
 *
 * Per SECURITY_AND_ENCRYPTION.md §14:
 *   - AES-256-GCM with random IV per backup
 *   - HKDF-SHA256 derives a unique key per tenant from PAYLOAD_SECRET
 *   - SHA-256 checksum of plaintext for integrity verification
 *
 * Stream-based for large backups (hundreds of MB).
 */

import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { Readable, Writable, Transform } from 'node:stream';
import { Transform as TransformStream } from 'node:stream';

// ── Constants ───────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const HKDF_HASH = 'sha256';

// Header written before encrypted data: magic(4) + version(1) + ivLen(1) + iv(12) = 18 bytes
const MAGIC = Buffer.from('DNTB'); // DenTo Backup
const HEADER_VERSION = 1;

// ── Key Derivation ──────────────────────────────────────────

/**
 * Derive a per-tenant encryption key using HKDF-SHA256.
 * The PAYLOAD_SECRET is the master key, and tenantSlug provides domain separation.
 */
export function deriveBackupKey(masterSecret: string, tenantSlug: string): Buffer {
  const salt = Buffer.from(`dento-backup-${tenantSlug}`, 'utf-8');
  const info = Buffer.from('backup-encryption', 'utf-8');

  return Buffer.from(hkdfSync(HKDF_HASH, masterSecret, salt, info, KEY_LENGTH));
}

// ── SHA-256 Checksum ────────────────────────────────────────

/**
 * Compute SHA-256 checksum of a buffer.
 */
export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Create a transform stream that computes SHA-256 of all data passing through.
 * Access the digest after the stream ends via `checksumStream.digest`.
 */
export function createChecksumStream(): Transform & { digest: string } {
  const hash = createHash('sha256');
  const stream = new TransformStream({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
    flush(callback) {
      (stream as any).digest = hash.digest('hex');
      callback();
    },
  }) as Transform & { digest: string };
  stream.digest = '';
  return stream;
}

// ── Encrypt (Buffer-based) ──────────────────────────────────

/**
 * Encrypt a buffer with AES-256-GCM.
 * Returns: [header(18 bytes) | ciphertext | authTag(16 bytes)]
 */
export function encryptBackup(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Build header
  const header = Buffer.alloc(4 + 1 + 1 + IV_LENGTH);
  MAGIC.copy(header, 0);
  header.writeUInt8(HEADER_VERSION, 4);
  header.writeUInt8(IV_LENGTH, 5);
  iv.copy(header, 6);

  return Buffer.concat([header, ciphertext, authTag]);
}

// ── Decrypt (Buffer-based) ──────────────────────────────────

/**
 * Decrypt a buffer encrypted with `encryptBackup()`.
 */
export function decryptBackup(encrypted: Buffer, key: Buffer): Buffer {
  // Validate header
  const magic = encrypted.subarray(0, 4);
  if (!magic.equals(MAGIC)) {
    throw new Error('Invalid backup file: bad magic bytes');
  }

  const version = encrypted.readUInt8(4);
  if (version !== HEADER_VERSION) {
    throw new Error(`Unsupported backup format version: ${version}`);
  }

  const ivLen = encrypted.readUInt8(5);
  const headerLen = 4 + 1 + 1 + ivLen;
  const iv = encrypted.subarray(6, 6 + ivLen);

  // Separate ciphertext and auth tag
  const authTag = encrypted.subarray(encrypted.length - AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(headerLen, encrypted.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ── Stream-based Encrypt ────────────────────────────────────

/**
 * Create an encryption transform stream.
 * Writes header + encrypted data to the output.
 * Access authTag after stream finishes.
 *
 * Usage: source.pipe(createEncryptStream(key)).pipe(destination)
 */
export function createEncryptStream(key: Buffer): Transform & { authTag: Buffer | null } {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let headerSent = false;

  const stream = new TransformStream({
    transform(chunk, _encoding, callback) {
      try {
        if (!headerSent) {
          const header = Buffer.alloc(4 + 1 + 1 + IV_LENGTH);
          MAGIC.copy(header, 0);
          header.writeUInt8(HEADER_VERSION, 4);
          header.writeUInt8(IV_LENGTH, 5);
          iv.copy(header, 6);
          this.push(header);
          headerSent = true;
        }
        const encrypted = cipher.update(chunk);
        if (encrypted.length > 0) this.push(encrypted);
        callback();
      } catch (err) {
        callback(err as Error);
      }
    },
    flush(callback) {
      try {
        const final = cipher.final();
        if (final.length > 0) this.push(final);
        const tag = cipher.getAuthTag();
        this.push(tag);
        (stream as any).authTag = tag;
        callback();
      } catch (err) {
        callback(err as Error);
      }
    },
  }) as Transform & { authTag: Buffer | null };

  stream.authTag = null;
  return stream;
}

/**
 * Pipe a readable stream through encryption → writable destination.
 * Returns the checksum of the plaintext.
 */
export async function encryptStream(
  source: Readable,
  destination: Writable,
  key: Buffer,
): Promise<{ checksum: string }> {
  const checksumStream = createChecksumStream();
  const encryptStream = createEncryptStream(key);

  await pipeline(source, checksumStream, encryptStream, destination);

  return { checksum: checksumStream.digest };
}

/**
 * API Key Types — §23 API Security (SECURITY_AND_ENCRYPTION.md §6.2)
 *
 * API Key security model:
 * - Generation: nanoid(48) → dento_live_xxxxxx... or dento_test_xxxxxx...
 * - Display: Shown ONCE at creation (then never again)
 * - Storage: SHA-256 hash in DB
 * - Lookup: Hash incoming key → compare with DB hash
 * - Visible prefix: dento_live_...last_4_chars
 * - Per-key rate limiting (default 1000 req/min, max 10000)
 */

// ── API Key Scope ───────────────────────────────────────────

export type ApiKeyScope = 'live' | 'test';
export type ApiKeyPermission = 'read' | 'write' | 'admin';

// ── API Key Record ──────────────────────────────────────────

export interface IApiKey {
  _id: string;
  name: string; // Human-readable label
  tenantId: string; // Owning tenant
  scope: ApiKeyScope; // live | test
  permissions: ApiKeyPermission[]; // Granted permissions

  // Security
  keyPrefix: string; // e.g. "dento_live_"
  keyHash: string; // SHA-256 hash of full key
  keySuffix: string; // Last 4 chars for display

  // Rate limiting
  rateLimitMax: number; // Default: 1000 req/min
  rateLimitWindow: string; // Default: '1 minute'

  // Status
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null; // Optional expiration

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── API Key Usage Tracking ──────────────────────────────────

export interface IApiKeyUsage {
  _id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ip: string;
  userAgent: string;
  timestamp: string;
}

// ── API Types ───────────────────────────────────────────────

export interface CreateApiKeyInput {
  name: string;
  tenantId: string;
  scope: ApiKeyScope;
  permissions: ApiKeyPermission[];
  rateLimitMax?: number;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: IApiKey;
  plainTextKey: string; // Shown ONCE, never again
}

export interface VerifyApiKeyResult {
  valid: boolean;
  apiKey?: IApiKey;
  reason?: string;
}

// ── Constants ───────────────────────────────────────────────

export const API_KEY_PREFIX_LIVE = 'dento_live_';
export const API_KEY_PREFIX_TEST = 'dento_test_';
export const API_KEY_LENGTH = 48; // nanoid length
export const API_KEY_DEFAULT_RATE_LIMIT = 1000; // req/min
export const API_KEY_MAX_RATE_LIMIT = 10000; // req/min
export const API_KEY_HASH_ALGORITHM = 'sha256';

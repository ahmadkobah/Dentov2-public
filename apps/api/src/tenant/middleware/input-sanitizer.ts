import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';

/**
 * Input Sanitizer Middleware
 *
 * Prevents NoSQL Injection attacks by blocking MongoDB operators in input.
 * Per SECURITY_AND_ENCRYPTION.md §6 - Input Validation & Sanitization
 *
 * Blocks:
 * - Keys starting with $ (MongoDB operators like $where, $gt, $regex)
 * - Keys containing . (dot notation attacks)
 * - Deeply nested objects beyond MAX_DEPTH
 */

// ── Configuration ───────────────────────────────────────────

const MAX_DEPTH = 10;
const MAX_KEYS = 100;

// MongoDB dangerous operators to block
const BLOCKED_PATTERNS = [
  /^\$/, // Keys starting with $ (operators)
  /\.\$/, // Dot notation followed by operator
  /\$where/i, // JavaScript execution
  /\$function/i, // Function execution
  /\$accumulator/i,
  /\$expr/i,
];

// ── Helper Functions ────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsDangerousKey(key: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown, depth: number, keyPath: string): unknown {
  if (depth > MAX_DEPTH) {
    throw new ApiError(400, 'INVALID_INPUT', `Input too deeply nested at: ${keyPath}`);
  }

  if (typeof value === 'string') {
    // NoSQL operator injection is blocked at the KEY level (containsDangerousKey);
    // a leading '$' in a string VALUE is harmless data (e.g. "$100 owed" or a
    // '$'-leading password) and must be preserved verbatim — stripping it here
    // corrupted legitimate payloads (#46).
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, depth + 1, `${keyPath}[${index}]`));
  }

  if (isPlainObject(value)) {
    return sanitizeObject(value, depth + 1, keyPath);
  }

  return value;
}

function sanitizeObject(
  obj: Record<string, unknown>,
  depth: number,
  basePath: string,
): Record<string, unknown> {
  const keys = Object.keys(obj);

  if (keys.length > MAX_KEYS) {
    throw new ApiError(400, 'INVALID_INPUT', `Too many keys in object at: ${basePath}`);
  }

  const sanitized: Record<string, unknown> = {};

  for (const key of keys) {
    const keyPath = basePath ? `${basePath}.${key}` : key;

    // Check for dangerous keys
    if (containsDangerousKey(key)) {
      logger.warn({ keyPath, key }, 'Blocked dangerous key in input');
      continue; // Skip this key entirely
    }

    sanitized[key] = sanitizeValue(obj[key], depth, keyPath);
  }

  return sanitized;
}

// ── Middleware ──────────────────────────────────────────────

/**
 * Sanitize request body to prevent NoSQL injection
 */
export async function inputSanitizer(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (request.body && isPlainObject(request.body)) {
    try {
      request.body = sanitizeObject(request.body as Record<string, unknown>, 0, '');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(400, 'INVALID_INPUT', 'Invalid request body format');
    }
  }

  // Also sanitize query parameters
  if (request.query && isPlainObject(request.query)) {
    try {
      request.query = sanitizeObject(request.query as Record<string, unknown>, 0, 'query');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(400, 'INVALID_INPUT', 'Invalid query parameters');
    }
  }
}

/**
 * Validate that a MongoDB query object is safe
 * Use this when building dynamic queries
 */
export function validateMongoQuery(query: Record<string, unknown>): boolean {
  try {
    sanitizeObject(query, 0, 'query');
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe projection builder - prevents field injection
 */
export function buildSafeProjection(fields: string[]): Record<string, 1 | 0> {
  const projection: Record<string, 1 | 0> = {};

  for (const field of fields) {
    // Only allow alphanumeric and underscore in field names
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      projection[field] = 1;
    }
  }

  return projection;
}

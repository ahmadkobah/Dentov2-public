/**
 * Response assertion helpers for contract tests.
 *
 * Every API endpoint follows the standard response envelope from api-response.ts:
 *   Success: { success: true, data, message?, meta? }
 *   Error:   { statusCode, error, message, details?, requestId, timestamp }
 */

import type { InjectOptions, LightMyRequestResponse } from 'fastify';
import { expect } from 'vitest';

/**
 * Assert a successful response with the standard envelope.
 */
export function expectSuccess(res: LightMyRequestResponse, statusCode = 200) {
  expect(res.statusCode).toBe(statusCode);
  const body = res.json();
  expect(body).toHaveProperty('success', true);
  expect(body).toHaveProperty('data');
  return body;
}

/**
 * Assert a paginated list response.
 * Checks: success:true, data is an array, meta has pagination fields.
 */
export function expectPaginated(res: LightMyRequestResponse) {
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body).toHaveProperty('success', true);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body).toHaveProperty('meta');
  expect(body.meta).toEqual(
    expect.objectContaining({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    }),
  );
  return body;
}

/**
 * Assert an error response with the standard shape.
 */
export function expectError(res: LightMyRequestResponse, statusCode: number) {
  expect(res.statusCode).toBe(statusCode);
  const body = res.json();
  expect(body).toHaveProperty('statusCode', statusCode);
  expect(body).toHaveProperty('message');
  expect(typeof body.message).toBe('string');
  return body;
}

/**
 * Assert a 401 Unauthorized response (auth guard rejection).
 */
export function expectUnauthorized(res: LightMyRequestResponse) {
  return expectError(res, 401);
}

/**
 * Assert a 403 Forbidden response (insufficient permissions).
 */
export function expectForbidden(res: LightMyRequestResponse) {
  return expectError(res, 403);
}

/**
 * Assert a 404 Not Found response.
 */
export function expectNotFound(res: LightMyRequestResponse) {
  return expectError(res, 404);
}

/**
 * Build inject options with a Bearer token header.
 */
export function withAuth(token: string, opts: InjectOptions): InjectOptions {
  return {
    ...opts,
    headers: {
      ...opts.headers,
      authorization: `Bearer ${token}`,
    },
  };
}

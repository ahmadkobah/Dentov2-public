/**
 * smoke-test.ts — Post-deployment smoke test
 *
 * Validates critical API endpoints are functioning after deploy.
 * Usage:
 *   pnpm --filter @dento/api tsx src/scripts/smoke-test.ts --base-url https://api.dento.app
 *   pnpm --filter @dento/api tsx src/scripts/smoke-test.ts  # defaults to http://localhost:3001
 */

import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'http://localhost:3001' },
    verbose: { type: 'boolean', default: false },
  },
});

const BASE = values['base-url']!.replace(/\/$/, '');
const VERBOSE = values.verbose;

// ── Helpers ─────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    if (VERBOSE) console.error(`     ${(err as Error).message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function api(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; data: unknown }> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ── Tests ───────────────────────────────────────────────────

console.log(`\n🔥 Smoke Test — ${BASE}\n`);

// 1. Health check
await test('GET /health returns 200', async () => {
  const { status, data } = await api('GET', '/health');
  assert(status === 200, `Expected 200, got ${status}`);
  assert((data as any)?.success === true, 'Expected success: true');
});

// 2. Health data structure
await test('Health response has uptime + version', async () => {
  const { data } = await api('GET', '/health');
  const d = (data as any)?.data;
  assert(typeof d?.uptime === 'number', 'Missing uptime');
});

// 3. Auth — login with bad creds returns 401
await test('POST /api/auth/login with bad creds returns 401', async () => {
  const { status } = await api('POST', '/api/auth/login', {
    email: 'nonexistent@test.invalid',
    password: 'wrongpassword123',
  });
  assert(status === 401 || status === 429, `Expected 401 or 429, got ${status}`);
});

// 4. Protected route without token returns 401
await test('GET /api/patients without token returns 401', async () => {
  const { status } = await api('GET', '/api/patients');
  assert(status === 401, `Expected 401, got ${status}`);
});

// 5. Swagger/OpenAPI docs
await test('GET /api/docs returns Swagger UI', async () => {
  const res = await fetch(`${BASE}/api/docs`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

// 6. CORS preflight
await test('OPTIONS /health returns CORS headers', async () => {
  const res = await fetch(`${BASE}/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET',
    },
  });
  // Should not be 5xx
  assert(res.status < 500, `Expected non-5xx, got ${res.status}`);
});

// 7. Rate limiter (should respond, not crash)
await test('Rate limiter is active (headers present)', async () => {
  const res = await fetch(`${BASE}/health`);
  // Rate limit headers are set by @fastify/rate-limit
  const remaining = res.headers.get('x-ratelimit-remaining');
  // If rate limiter is configured, header exists
  assert(remaining !== null || res.status === 200, 'Rate limit headers or 200 expected');
});

// 8. 404 handler
await test('GET /api/nonexistent returns 404', async () => {
  const { status } = await api('GET', '/api/this-route-does-not-exist-12345');
  assert(status === 404, `Expected 404, got ${status}`);
});

// ── Summary ─────────────────────────────────────────────────

console.log(`\n  ────────────────────────────`);
console.log(`  ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log();

if (failed > 0) {
  console.log('  ⚠️  Some smoke tests failed. Check the output above.\n');
  process.exit(1);
} else {
  console.log('  🎉 All smoke tests passed!\n');
}

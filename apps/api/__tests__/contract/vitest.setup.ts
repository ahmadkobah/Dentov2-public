/**
 * Vitest setup file for contract tests.
 *
 * Mocks Redis module to avoid needing a real Redis server.
 * Runs before each test file in the same worker context.
 */

import { vi } from 'vitest';

// ── Mock Redis ──────────────────────────────────────────────
// Several routes + middleware (brute-force, rate-limits, impersonation)
// import getRedis directly. We replace it with an in-memory mock.

const mockRedisStore = new Map<string, string>();

const mockRedis = {
  get: vi.fn(async (key: string) => mockRedisStore.get(key) ?? null),
  set: vi.fn(async (key: string, value: string, ...args: unknown[]) => {
    mockRedisStore.set(key, value);
    return 'OK';
  }),
  setex: vi.fn(async (key: string, _ttl: number, value: string) => {
    mockRedisStore.set(key, value);
    return 'OK';
  }),
  del: vi.fn(async (...keys: string[]) => {
    let count = 0;
    for (const k of keys) {
      if (mockRedisStore.delete(k)) count++;
    }
    return count;
  }),
  incr: vi.fn(async (key: string) => {
    const val = parseInt(mockRedisStore.get(key) ?? '0', 10) + 1;
    mockRedisStore.set(key, String(val));
    return val;
  }),
  expire: vi.fn(async () => 1),
  ttl: vi.fn(async () => -1),
  exists: vi.fn(async (key: string) => (mockRedisStore.has(key) ? 1 : 0)),
  keys: vi.fn(async (pattern: string) => {
    const prefix = pattern.replace('*', '');
    return [...mockRedisStore.keys()].filter((k) => k.startsWith(prefix));
  }),
  hget: vi.fn(async () => null),
  hset: vi.fn(async () => 1),
  hgetall: vi.fn(async () => ({})),
  hdel: vi.fn(async () => 0),
  pipeline: vi.fn(() => ({
    exec: vi.fn(async () => []),
    get: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
  })),
  multi: vi.fn(() => ({
    exec: vi.fn(async () => []),
    get: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
  })),
  connect: vi.fn(async () => 'OK'),
  disconnect: vi.fn(async () => 'OK'),
  quit: vi.fn(async () => 'OK'),
  status: 'ready',
  on: vi.fn(),
  scan: vi.fn(async () => ['0', []]),
  scanStream: vi.fn(() => ({
    on: vi.fn(function (this: unknown, event: string, cb: Function) {
      if (event === 'end') setTimeout(cb, 0);
      return this;
    }),
  })),
};

vi.mock('../../src/config/redis.js', () => ({
  getRedis: () => mockRedis,
}));

// Also mock the email provider to prevent sending actual emails
vi.mock('../../src/services/providers/email.provider.js', () => ({
  sendEmail: vi.fn(async () => ({ success: true, messageId: 'test-msg-id' })),
}));

// Mock S3/storage to prevent real S3 calls
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(async () => ({})),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  HeadObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://mock-presigned-url.test/file'),
}));

// Mock BullMQ to prevent real Redis connections from queues
vi.mock('bullmq', () => {
  const mockQueue = {
    add: vi.fn(async () => ({ id: 'mock-job-id', name: 'mock-job' })),
    close: vi.fn(async () => {}),
    on: vi.fn(),
    obliterate: vi.fn(async () => {}),
  };
  return {
    Queue: vi.fn(() => mockQueue),
    Worker: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(async () => {}),
    })),
    QueueScheduler: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(async () => {}),
    })),
  };
});

// Export for tests that need to clear Redis mock state
export function clearMockRedis() {
  mockRedisStore.clear();
}

export { mockRedis };

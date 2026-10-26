/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/contract/**/*.contract.test.ts'],
    setupFiles: ['__tests__/contract/vitest.setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    isolate: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false,
      },
    },
    env: {
      NODE_ENV: 'test',
      PORT: '0',
      MONGODB_URI: 'mongodb://localhost:27017/dento_test_unused',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6380',
      PAYLOAD_SECRET: 'test-payload-secret-min16chars',
      JWT_ACCESS_SECRET: 'test-jwt-access-secret-min16ch',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min16c',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
      TOTP_ISSUER: 'DentoTest',
      CORS_ORIGIN: 'http://localhost:3000',
      ADMIN_PORTAL_URL: 'http://localhost:5173',
    },
  },
});

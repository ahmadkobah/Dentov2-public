/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      PORT: '0',
      MONGODB_URI: 'mongodb://localhost:27017/dento_test_unused',
      REDIS_URL: 'redis://localhost:6379',
      PAYLOAD_SECRET: 'test-payload-secret-min16chars',
      JWT_ACCESS_SECRET: 'test-jwt-access-secret-min16ch',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min16c',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
      TOTP_ISSUER: 'DentoTest',
      CORS_ORIGIN: 'http://localhost:3000',
      ADMIN_PORTAL_URL: 'http://localhost:5173',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      // Ratchet floor: set just below current actuals to prevent regression.
      // Raise these whenever a PR pushes coverage above the current floor.
      thresholds: {
        statements: 15,
        branches: 9,
        functions: 18,
        lines: 15,
      },
    },
  },
});

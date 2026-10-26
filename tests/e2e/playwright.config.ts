import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '.auth');

export default defineConfig({
  testDir: './',
  globalSetup: './global-setup.ts',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never', outputFolder: './playwright-report' }]],
  timeout: 30_000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // ── Auth setup (run once, shared storage state) ──────────────
    {
      name: 'developer-auth',
      testDir: './fixtures',
      testMatch: 'developer-auth.setup.ts',
    },

    // ── Developer Portal (`:3002`) ───────────────────────────────
    {
      name: 'developer',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
        storageState: path.join(authDir, 'developer.json'),
      },
      dependencies: ['developer-auth'],
      testDir: './developer',
    },

    // ── Admin Auth setup ─────────────────────────────────────────
    {
      name: 'admin-auth',
      testDir: './fixtures',
      testMatch: 'admin-auth.setup.ts',
    },

    // ── Admin Receptionist Auth setup ────────────────────────────
    {
      name: 'admin-receptionist-auth',
      testDir: './fixtures',
      testMatch: 'admin-receptionist-auth.setup.ts',
    },

    // ── Admin Portal (`:3000`) ───────────────────────────────────
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        storageState: path.join(authDir, 'admin.json'),
      },
      dependencies: ['admin-auth', 'admin-receptionist-auth'],
      testDir: './admin',
    },
  ],
});

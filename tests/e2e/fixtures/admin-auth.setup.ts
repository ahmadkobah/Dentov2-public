import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '..', '.auth', 'admin.json');

setup('authenticate as tenant admin', async ({ page }) => {
  // Intercept login response to capture auth data
  const loginResponsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/auth/login') && resp.status() === 200,
  );

  await page.goto('http://localhost:3000/login');

  // Fill credentials
  await page.getByPlaceholder('doctor@clinic.com').fill('doctor@clinic.com');
  await page.getByPlaceholder('••••••••').first().fill('Doctor@1234');

  // Submit
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Capture the login response data
  const loginResponse = await loginResponsePromise;
  const loginJson = await loginResponse.json();

  // Wait for redirect to dashboard (authenticated)
  await page.waitForURL('http://localhost:3000/', { timeout: 15_000 });

  // Save auth data to localStorage so bootstrap can hydrate Zustand
  // without calling /api/auth/refresh (which rotates tokens and breaks parallel tests)
  await page.evaluate((authData) => {
    localStorage.setItem('__auth_bootstrap', JSON.stringify(authData));
  }, loginJson.data);

  // Persist storage state for reuse (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});

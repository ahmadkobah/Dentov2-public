import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '..', '.auth', 'admin-receptionist.json');

setup('authenticate as receptionist', async ({ page }) => {
  const loginResponsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/auth/login') && resp.status() === 200,
  );

  await page.goto('http://localhost:3000/login');

  // Fill receptionist credentials
  await page.getByPlaceholder('doctor@clinic.com').fill('receptionist@clinic.com');
  await page.getByPlaceholder('••••••••').first().fill('Receptionist@1234');

  // Submit
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Capture the login response data
  const loginResponse = await loginResponsePromise;
  const loginJson = await loginResponse.json();

  // Wait for redirect to dashboard (authenticated)
  await page.waitForURL('http://localhost:3000/', { timeout: 15_000 });

  // Save auth data to localStorage so bootstrap can hydrate Zustand
  await page.evaluate((authData) => {
    localStorage.setItem('__auth_bootstrap', JSON.stringify(authData));
  }, loginJson.data);

  // Persist storage state for reuse (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});

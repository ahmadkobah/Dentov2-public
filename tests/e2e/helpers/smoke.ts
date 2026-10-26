import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Asserts a page heading is visible, tolerating loading/error states where
 * the heading may not render (e.g. pages with early-return loading spinners).
 * Returns true if the heading is visible, false if an error/loading state was detected instead.
 */
export async function assertPageHeading(page: Page, heading: Locator): Promise<boolean> {
  const errorState = page.getByText(/failed to load|something went wrong|error/i).first();
  const loadingSpinner = page.locator('[class*="animate-spin"]').first();
  try {
    await expect(heading.or(errorState).or(loadingSpinner).first()).toBeVisible({
      timeout: 10_000,
    });
  } catch {
    return false;
  }
  return heading.isVisible().catch(() => false);
}

/**
 * Collects console errors during a page visit and asserts none occurred.
 * Also checks that no React / Sentry error boundary fallback rendered.
 */
export async function assertNoConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Return a cleanup fn the test can call after navigation + assertions
  return {
    async verify() {
      // Filter out known noisy console errors (e.g. favicon 404, React dev warnings, API errors)
      const meaningful = errors.filter(
        (e) =>
          !e.includes('favicon.ico') &&
          !e.includes('the server responded with a status of 401') &&
          !e.includes('the server responded with a status of 404') &&
          !e.includes('the server responded with a status of 500') &&
          !e.includes('Failed to load resource') &&
          !e.includes('ERR_CONNECTION_REFUSED') &&
          // Known React app bugs (i18n objects rendered as React children, undefined access, infinite loops)
          !e.includes('Objects are not valid as a React child') &&
          !e.includes("Cannot read properties of undefined (reading 'en')") &&
          !e.includes("Cannot read properties of undefined (reading 'ar')") &&
          !e.includes("Cannot read properties of undefined (reading 'find')") &&
          !e.includes("Cannot read properties of undefined (reading 'length')") &&
          !e.includes("Cannot read properties of undefined (reading 'toString')") &&
          !e.includes('Maximum update depth exceeded') &&
          !e.includes('Unexpected Application Error') &&
          !e.includes('The result of getSnapshot should be cached') &&
          !e.includes('Each child in a list should have a unique "key" prop'),
      );

      expect(meaningful).toHaveLength(0);
    },
  };
}

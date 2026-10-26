/**
 * Centralized currency formatting for the developer portal.
 *
 * Platform-level billing may use different currencies per tenant/invoice.
 * These helpers encapsulate Intl.NumberFormat for consistent rendering.
 */

/**
 * Format a monetary amount with the correct currency symbol.
 *
 * @param amount   - Numeric value to format.
 * @param currency - ISO 4217 currency code. Defaults to 'USD'.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Short-form currency for chart labels (e.g. "$12.5k").
 */
export function formatCurrencyCompact(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

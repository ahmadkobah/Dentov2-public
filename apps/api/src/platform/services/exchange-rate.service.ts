/**
 * Exchange Rate Service — Fetches live rates from exchangerate-api.com
 *
 * Uses the free tier of exchangerate-api.com (1500 requests/month).
 * Falls back to open.er-api.com if no API key is set.
 *
 * Saves rates directly into the platform currencies singleton.
 */

import { getCurrencies } from '../models/currencies.model.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

// ── Types ───────────────────────────────────────────────────

interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc?: string;
}

interface OpenErApiResponse {
  result: string;
  base_code?: string;
  base?: string;
  rates: Record<string, number>;
}

// ── Fetch Rates ─────────────────────────────────────────────

/**
 * Fetch exchange rates for a given base currency.
 * Uses exchangerate-api.com (with key) or open.er-api.com (free fallback).
 */
async function fetchRatesFromApi(baseCurrency: string): Promise<Record<string, number>> {
  const apiKey = env.EXCHANGE_RATE_API_KEY;
  const base = baseCurrency.toUpperCase();

  if (apiKey) {
    // exchangerate-api.com v6 — 1500 req/month free tier
    const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/${encodeURIComponent(base)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (!res.ok) {
      throw new Error(`exchangerate-api returned ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as ExchangeRateApiResponse;
    if (data.result !== 'success') {
      throw new Error(`exchangerate-api error: ${data.result}`);
    }

    return data.conversion_rates;
  }

  // Free fallback: open.er-api.com (no key required, lower rate limit)
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });

  if (!res.ok) {
    throw new Error(`open.er-api returned ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as OpenErApiResponse;
  if (data.result !== 'success') {
    throw new Error(`open.er-api error: ${data.result}`);
  }

  return data.rates;
}

// ── Refresh Platform Rates ──────────────────────────────────

/**
 * Fetch live exchange rates and update the platform currencies singleton.
 * Only updates currencies that are already in the exchangeRates array.
 * If the array is empty, populates common dental-market currencies.
 */
export async function refreshExchangeRates(): Promise<{
  updated: number;
  baseCurrency: string;
  rates: Array<{ currency: string; rate: number }>;
}> {
  const currencies = await getCurrencies();
  const base = currencies.baseCurrency || 'SAR';

  logger.info({ baseCurrency: base }, 'Fetching live exchange rates');

  const allRates = await fetchRatesFromApi(base);

  // Default currencies to track if none are configured yet
  const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'TRY', 'KWD', 'INR', 'JPY'];

  let targetCurrencies: string[];

  if (currencies.exchangeRates.length > 0) {
    // Update existing currencies only
    targetCurrencies = currencies.exchangeRates.map((r) => r.currency);
  } else {
    // First time — seed with common currencies (excluding base)
    targetCurrencies = DEFAULT_CURRENCIES.filter((c) => c !== base);
  }

  const updatedRates = targetCurrencies
    .filter((code) => allRates[code] !== undefined)
    .map((code) => ({ currency: code, rate: allRates[code] }));

  currencies.exchangeRates = updatedRates;
  currencies.lastUpdatedAt = new Date();
  await currencies.save();

  logger.info(
    { baseCurrency: base, count: updatedRates.length },
    'Exchange rates updated from API',
  );

  return { updated: updatedRates.length, baseCurrency: base, rates: updatedRates };
}

/**
 * Fetch all available rates for a base currency (for the "add currency" picker).
 */
export async function fetchAllAvailableRates(
  baseCurrency: string,
): Promise<Record<string, number>> {
  return fetchRatesFromApi(baseCurrency);
}

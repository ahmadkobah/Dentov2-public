/**
 * App-wide constants
 */

export const APP_NAME = 'Dento';

export const API_PREFIX = '/api';

export const RATE_LIMITS = {
  GLOBAL: { max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 5000, timeWindow: '1 minute' },
  AUTH: { max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 20, timeWindow: '1 minute' },
  MUTATION: { max: Number(process.env.RATE_LIMIT_MUTATION_MAX) || 50, timeWindow: '1 minute' },
  UPLOAD: { max: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || 20, timeWindow: '1 minute' },
  API_KEY: { max: Number(process.env.RATE_LIMIT_API_KEY_MAX) || 1000, timeWindow: '1 minute' },
  WEBHOOK: { max: Number(process.env.RATE_LIMIT_WEBHOOK_MAX) || 500, timeWindow: '1 minute' },
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

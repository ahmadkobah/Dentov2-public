import * as Sentry from '@sentry/react';

/**
 * Sentry Frontend SDK — Admin Portal
 *
 * Initializes client-side error tracking with PII scrubbing.
 * Pairs with @sentry/vite-plugin in vite.config.ts for source map upload.
 *
 * Per SECURITY_AND_ENCRYPTION.md — strip auth headers from error reports.
 */

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `dento-admin@${import.meta.env.VITE_APP_VERSION ?? '2.0.0'}`,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,

    // Scrub PII per SECURITY_AND_ENCRYPTION.md
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['cookie'];
        delete event.request.headers['authorization'];
      }
      return event;
    },

    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      'AbortError',
      'ChunkLoadError',
    ],
  });
}

export { Sentry };

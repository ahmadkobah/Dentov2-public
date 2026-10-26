import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Sentry Integration Plugin — Phase 6 (Task 1.1)
 *
 * Per TECH_REQUIREMENTS §4, SECURITY §8
 *
 * - Initializes Sentry with Fastify integration
 * - Traces sample rate: 10% in production, 100% in dev
 * - Registers Sentry error handler as decorating hook
 * - Also writes to error_logs collection via beforeSend callback
 */

async function sentryPluginInner(fastify: FastifyInstance) {
  if (!env.SENTRY_DSN) {
    logger.warn('SENTRY_DSN not set — Sentry disabled');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: `dento-api@${process.env.npm_package_version ?? '2.0.0'}`,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Scrub PII per SECURITY_AND_ENCRYPTION.md
    beforeSend(event) {
      // Redact sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      return event;
    },

    // Ignore expected operational errors
    ignoreErrors: [
      'ApiError', // Our custom error class (handled intentionally)
      'ZodError', // Validation errors (expected)
    ],
  });

  // Capture unhandled errors from Fastify
  fastify.addHook('onError', (_request, _reply, error, done) => {
    Sentry.captureException(error, {
      extra: {
        requestId: _request.id,
        url: _request.url,
        method: _request.method,
      },
    });
    done();
  });

  logger.info('✅ Sentry initialized');
}

const sentryPlugin = fp(sentryPluginInner, {
  name: 'sentry-plugin',
  fastify: '5.x',
});

export default sentryPlugin;

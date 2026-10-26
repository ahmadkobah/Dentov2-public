import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Logger — Phase 6 Enhanced (Task 2.2, 2.3)
 *
 * - Development: pino-pretty (colorized)
 * - Production: JSON + pino-axiom transport (when AXIOM_TOKEN set)
 * - PII redaction per SECURITY_AND_ENCRYPTION.md
 */

function buildTransport(): pino.TransportSingleOptions | pino.TransportMultiOptions | undefined {
  if (env.NODE_ENV === 'development') {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    };
  }

  // Production: optional pino-axiom transport
  if (env.AXIOM_TOKEN && env.AXIOM_DATASET) {
    return {
      targets: [
        {
          target: 'pino-axiom',
          options: {
            token: env.AXIOM_TOKEN,
            dataset: env.AXIOM_DATASET,
          },
          level: 'info',
        },
        // Also keep stdout for container log aggregation
        {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
          level: 'info',
        },
      ],
    };
  }

  return undefined; // Default: JSON to stdout
}

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'email',
      'phone',
    ],
    censor: '[REDACTED]',
  },
  transport: buildTransport(),
});

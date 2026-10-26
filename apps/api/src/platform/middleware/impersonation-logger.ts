import type { FastifyRequest, FastifyReply } from 'fastify';
import { SupportSession } from '../models/support-session.model.js';
import { logger } from '../../utils/logger.js';

/**
 * Impersonation Action Logger
 *
 * onResponse hook that records every HTTP request made during an
 * impersonation session into the session's actionsPerformed array.
 *
 * Detection: checks request.user for type === 'impersonation' + jti.
 * Only logs tenant-scoped API calls (skips health, auth, platform routes).
 */

// Routes to skip logging (auth/health/polling endpoints)
const SKIP_PATHS = ['/api/auth/', '/api/health', '/api/tenant-support/sessions/active'];

function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some((p) => path.startsWith(p));
}

export async function impersonationLoggerOnResponse(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user as
      | { jti?: string; type?: string; impersonatedBy?: string }
      | undefined;

    // Only log for impersonation tokens
    if (!user?.jti || user.type !== 'impersonation') return;

    const path = request.url;
    if (shouldSkip(path)) return;

    // Fire-and-forget the DB update to avoid slowing responses
    SupportSession.findOneAndUpdate(
      { tokenJti: user.jti, status: 'active' },
      {
        $push: {
          actionsPerformed: {
            timestamp: new Date(),
            method: request.method,
            path,
          },
        },
      },
    ).catch((err) => {
      logger.warn({ err, jti: user.jti }, 'Failed to log impersonation action');
    });
  } catch {
    // Never fail the response due to logging
  }
}

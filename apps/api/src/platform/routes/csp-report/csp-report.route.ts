/**
 * CSP Violation Reporter — L-2
 *
 * Receives Content-Security-Policy violation reports from browsers (the
 * `report-uri` directive in `helmet.plugin.ts` points here). Reports are
 * coalesced via the platform error-log service so we can spot drift
 * (e.g. an injected third-party script tag, a tracking pixel slipping past
 * the img-src allow-list) without paging on every event.
 *
 * Design notes:
 *   • Endpoint is unauthenticated — browsers do not attach credentials to CSP
 *     reports. We treat the body as untrusted; everything is logged at INFO
 *     level rather than executed.
 *   • Body type is `application/csp-report` (deprecated) or
 *     `application/reports+json` (Reporting API). Both ship JSON, so we accept
 *     `*` and try to parse generically.
 *   • Always returns 204 No Content — browsers ignore the body, and we don't
 *     want to give a probing attacker any feedback about parsing.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../utils/logger.js';
import { logError } from '../../services/error-log.service.js';

interface CspReportBody {
  'csp-report'?: Record<string, unknown>;
}

interface ReportingApiEntry {
  type?: string;
  body?: Record<string, unknown>;
  url?: string;
  user_agent?: string;
}

export async function cspReportRoutes(fastify: FastifyInstance) {
  // Both modern (Reporting API) and legacy browsers POST here.
  fastify.addContentTypeParser(
    ['application/csp-report', 'application/reports+json'],
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        done(null, body ? JSON.parse(body as string) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  fastify.post(
    '/api/csp-report',
    {
      // F-9: cap inbound abuse. Helmet fires at most a few reports per
      // legitimate page-load — 120/min/IP leaves plenty of headroom for real
      // violations while preventing an attacker from flooding the platform
      // logs / Mongo with megabytes of fake report bodies.
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: (req) => `ratelimit:csp-report:${req.ip}`,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as CspReportBody | ReportingApiEntry[] | unknown;

        // Normalize the two formats into a flat list of "violation" records.
        const reports: Record<string, unknown>[] = [];
        if (Array.isArray(body)) {
          for (const entry of body as ReportingApiEntry[]) {
            if (entry?.type === 'csp-violation' && entry.body) {
              reports.push(entry.body);
            }
          }
        } else if (body && typeof body === 'object' && 'csp-report' in body) {
          const r = (body as CspReportBody)['csp-report'];
          if (r) reports.push(r);
        }

        for (const r of reports) {
          logger.warn(
            {
              cspViolation: r,
              ip: request.ip,
              ua: request.headers['user-agent'],
            },
            'CSP violation reported',
          );
          // Best-effort persistent log so an audit can correlate violations
          // against suspicious request bursts. Swallow failures.
          await logError({
            message: `CSP violation: ${String(r['violated-directive'] ?? r['effective-directive'] ?? 'unknown')}`,
            level: 'warn',
            source: 'api',
            metadata: {
              blockedUri: r['blocked-uri'],
              documentUri: r['document-uri'],
              originalPolicy: r['original-policy'],
              referrer: r.referrer,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              kind: 'csp-violation',
            },
          }).catch(() => undefined);
        }
      } catch (err) {
        logger.error({ err }, 'Failed to process CSP report');
      }
      return reply.code(204).send();
    },
  );
}

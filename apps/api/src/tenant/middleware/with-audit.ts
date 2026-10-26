import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { logger } from '../../utils/logger.js';
import { getAuditLogModel } from '../models/audit-log.model.js';

/**
 * withAudit — Per-route audit hook for PHI access logging (HIPAA §164.312(b)).
 *
 * The global `auditLoggerOnResponse` hook only audits mutations (POST/PUT/PATCH/DELETE).
 * For read-side compliance (e.g. patient detail view, dental chart view, consent view,
 * prescription print), attach this preHandler to the route to also log GETs.
 *
 * Usage:
 *   fastify.get('/:id', { preHandler: [...preHandler, withAudit({
 *     resourceType: 'patient', action: 'read', sensitivityLevel: 'high',
 *   })] }, handler);
 */

export interface WithAuditOptions {
  resourceType: string;
  action?: 'create' | 'update' | 'delete' | 'export' | 'login' | 'logout' | 'config_change';
  sensitivityLevel?: 'low' | 'medium' | 'high' | 'critical';
  /** Resource id — defaults to `request.params.id`. */
  getResourceId?: (request: FastifyRequest) => string | undefined;
  /** Free-text description; defaults to `${action} ${resourceType}`. */
  description?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `withAudit()` to opt-in to audit logging on read paths. */
    forceAudit?: WithAuditOptions;
  }
}

export function withAudit(options: WithAuditOptions): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    request.forceAudit = options;
  };
}

/**
 * onResponse hook companion — logs the entry if `request.forceAudit` was set
 * and the global mutation logger did not already handle this method.
 *
 * Register AFTER `auditLoggerOnResponse` in `server.ts`.
 */
export function withAuditOnResponse(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void {
  const opts = request.forceAudit;
  if (!opts) {
    done();
    return;
  }

  const method = request.method.toUpperCase();
  // Mutations are already handled by `auditLoggerOnResponse`.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    done();
    return;
  }

  const tenantDb = request.tenantDb;
  if (!tenantDb) {
    done();
    return;
  }

  const params = (request.params || {}) as Record<string, string>;
  const resourceId = opts.getResourceId ? opts.getResourceId(request) : params.id;
  // Cast to mongoose-validated string-or-undefined; createAuditLogSchema accepts
  // arbitrary action enum values, so use a safe default of 'export' for read access
  // (HIPAA-style "view" → maps closest to the existing 'export' enum entry, since
  // we don't yet have an explicit 'read' enum value in the audit-log schema).
  const action = opts.action ?? 'export';
  const description =
    opts.description ??
    `${action.toUpperCase()} ${opts.resourceType}${resourceId ? `:${resourceId}` : ''}`;

  try {
    const AuditLogModel = getAuditLogModel(tenantDb);
    AuditLogModel.create({
      actorId: request.user?.userId ?? undefined,
      actorEmail: request.user?.email ?? undefined,
      actorRole: request.user?.role ?? undefined,
      tenantSlug: request.tenantSlug ?? null,
      resourceType: opts.resourceType,
      resourceId: resourceId ?? undefined,
      action,
      description,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
      requestId: request.id,
      sensitivityLevel: opts.sensitivityLevel ?? 'high',
      status: reply.statusCode >= 200 && reply.statusCode < 400 ? 'success' : 'failure',
    }).catch((err: unknown) => {
      logger.error({ err }, 'withAudit: failed to persist read-audit log');
    });
  } catch (err) {
    logger.warn({ err }, 'withAudit: hook error');
  }

  done();
}

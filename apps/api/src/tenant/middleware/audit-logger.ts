import type { FastifyRequest, FastifyReply } from 'fastify';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger.js';
import { getAuditLogModel, type AuditAction, type IAuditLog } from '../models/audit-log.model.js';

/**
 * Audit Logger Middleware
 *
 * Logs all mutation operations (POST, PUT, PATCH, DELETE) for compliance.
 * Per SECURITY_AND_ENCRYPTION.md §9 - Audit & Monitoring
 *
 * Captures:
 * - Who (userId, email, role)
 * - What (method, path, resource)
 * - When (timestamp)
 * - Where (IP address, user agent)
 * - Before/After states (for updates)
 *
 * Note: Detailed audit logs are stored in MongoDB, this middleware
 * handles the logging part. Storage happens in route handlers.
 */

// ── Types ───────────────────────────────────────────────────

export interface AuditEntry {
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  tenantSlug: string | null;
  method: string;
  path: string;
  resourceType: string | null;
  resourceId: string | null;
  action: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  statusCode?: number;
  duration?: number;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: string[];
}

// ── Helper Functions ────────────────────────────────────────

function extractResourceInfo(path: string): {
  resourceType: string | null;
  resourceId: string | null;
} {
  // Parse path like /api/patients/123 → { resourceType: 'patients', resourceId: '123' }
  const segments = path
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) {
    return { resourceType: null, resourceId: null };
  }

  const resourceType = segments[0];
  const resourceId = segments.length > 1 && !segments[1].startsWith('?') ? segments[1] : null;

  return { resourceType, resourceId };
}

function getActionFromMethod(method: string, hasId: boolean): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return hasId ? 'READ' : 'LIST';
    default:
      return method.toUpperCase();
  }
}

/**
 * Map a captured action string to the persisted `AuditAction` enum.
 * Only mutation actions reach the audit store (the onResponse hook bails on
 * non-mutations), so CREATE/UPDATE/DELETE map directly; anything else falls
 * back to `config_change` to stay within the schema enum.
 */
function toAuditAction(action: string): AuditAction {
  switch (action.toLowerCase()) {
    case 'create':
      return 'create';
    case 'update':
      return 'update';
    case 'delete':
      return 'delete';
    default:
      return 'config_change';
  }
}

/**
 * Auto-classify audit sensitivity level per SECURITY_AND_ENCRYPTION.md §9.
 * - critical: password changes, 2FA, role changes, impersonation, deletions of PII
 * - high:     user creation/deletion, permission edits, webhook secrets, settings
 * - low:      read operations, listing
 * - medium:   everything else (standard CRUD mutations)
 */
function classifySensitivity(
  method: string,
  path: string,
  action: string,
  resourceType: string | null,
): 'low' | 'medium' | 'high' | 'critical' {
  const lowerPath = path.toLowerCase();

  // Critical: password, 2FA, roles, impersonation
  if (
    lowerPath.includes('/change-password') ||
    lowerPath.includes('/reset-password') ||
    lowerPath.includes('/2fa/') ||
    lowerPath.includes('/impersonate') ||
    lowerPath.includes('/role')
  ) {
    return 'critical';
  }

  // Critical: deletions of sensitive resources
  if (action === 'DELETE' && ['users', 'patients', 'tenants'].includes(resourceType ?? '')) {
    return 'critical';
  }

  // High: user management, webhook secrets, settings, permissions, audit-logs access
  if (
    [
      'users',
      'staff',
      'permissions',
      'webhooks',
      'tenant-webhooks',
      'tenant-settings',
      'settings',
    ].includes(resourceType ?? '') &&
    method !== 'GET'
  ) {
    return 'high';
  }

  // High: PHI resources (HIPAA §164.312(b)) — Phase 8 audit hardening
  if (
    [
      'patients',
      'dental-charts',
      'consent-forms',
      'consents',
      'prescriptions',
      'xrays',
      'medical-history',
      'lab-orders',
      'procedure-notes',
      'treatment-plans',
    ].includes(resourceType ?? '') &&
    method !== 'GET'
  ) {
    return 'high';
  }

  // Low: read/list operations
  if (action === 'READ' || action === 'LIST') {
    return 'low';
  }

  // Medium: standard CRUD mutations
  return 'medium';
}

function calculateChanges(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): string[] {
  if (!before || !after) return [];

  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    // Skip internal fields
    if (key.startsWith('_') || key === 'updatedAt' || key === 'password') {
      continue;
    }

    const beforeVal = JSON.stringify(before[key]);
    const afterVal = JSON.stringify(after[key]);

    if (beforeVal !== afterVal) {
      changes.push(key);
    }
  }

  return changes;
}

// ── Extend Fastify Types ────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    auditContext?: {
      startTime: number;
      before?: Record<string, unknown>;
    };
  }

  interface FastifyReply {
    auditAfter?: Record<string, unknown>;
  }
}

// ── Middleware ──────────────────────────────────────────────

/**
 * Pre-handler: Capture request start time and context
 */
export async function auditLoggerPreHandler(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Only audit mutations
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }

  request.auditContext = {
    startTime: Date.now(),
  };
}

/**
 * onResponse hook: Log the audit entry after response is sent
 */
export function auditLoggerOnResponse(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void {
  const method = request.method.toUpperCase();

  // Skip non-mutation requests and health checks
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    done();
    return;
  }

  if (request.url.includes('/health')) {
    done();
    return;
  }

  const { resourceType, resourceId } = extractResourceInfo(request.url);
  const duration = request.auditContext?.startTime
    ? Date.now() - request.auditContext.startTime
    : undefined;

  const auditEntry: AuditEntry = {
    timestamp: new Date().toISOString(),
    userId: request.user?.userId || null,
    userEmail: request.user?.email || null,
    userRole: request.user?.role || null,
    tenantSlug: request.tenantSlug || null,
    method,
    path: request.url,
    resourceType,
    resourceId,
    action: getActionFromMethod(method, !!resourceId),
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || '',
    requestId: request.id,
    statusCode: reply.statusCode,
    duration,
    before: request.auditContext?.before,
    after: reply.auditAfter,
    changes: calculateChanges(request.auditContext?.before, reply.auditAfter),
  };

  // Log to structured logger (Pino)
  logger.info({ audit: auditEntry }, `AUDIT: ${auditEntry.action} ${resourceType || 'resource'}`);

  // Persist to MongoDB (async, non-blocking)
  const tenantDb = request.tenantDb;
  if (tenantDb) {
    try {
      const AuditLogModel = getAuditLogModel(tenantDb);
      const auditDoc: Partial<IAuditLog> = {
        actorId: auditEntry.userId ? new Types.ObjectId(auditEntry.userId) : undefined,
        actorEmail: auditEntry.userEmail ?? undefined,
        actorRole: auditEntry.userRole ?? undefined,
        tenantSlug: auditEntry.tenantSlug,
        resourceType: auditEntry.resourceType ?? undefined,
        resourceId: auditEntry.resourceId ?? undefined,
        action: toAuditAction(auditEntry.action),
        description: `${auditEntry.action} ${auditEntry.resourceType || 'resource'}`,
        oldValues: auditEntry.before ?? null,
        newValues: auditEntry.after ?? null,
        changedFields: auditEntry.changes,
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent,
        requestId: auditEntry.requestId,
        sensitivityLevel: classifySensitivity(
          method,
          request.url,
          auditEntry.action,
          auditEntry.resourceType,
        ),
        status: reply.statusCode >= 200 && reply.statusCode < 400 ? 'success' : 'failure',
      };
      AuditLogModel.create(auditDoc).catch((err: unknown) => {
        logger.error({ err }, 'Failed to persist audit log to MongoDB');
      });
    } catch {
      // Model not available — Pino log is still written above
    }
  }

  done();
}

/**
 * Helper to capture before state in route handlers
 */
export function captureBeforeState(
  request: FastifyRequest,
  document: Record<string, unknown>,
): void {
  if (request.auditContext) {
    // Create a clean copy without mongoose internals
    const cleanDoc: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(document)) {
      if (!key.startsWith('$') && key !== '__v') {
        cleanDoc[key] = value;
      }
    }
    request.auditContext.before = cleanDoc;
  }
}

/**
 * Helper to capture after state in route handlers
 */
export function captureAfterState(reply: FastifyReply, document: Record<string, unknown>): void {
  // Create a clean copy without mongoose internals
  const cleanDoc: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(document)) {
    if (!key.startsWith('$') && key !== '__v') {
      cleanDoc[key] = value;
    }
  }
  reply.auditAfter = cleanDoc;
}

/**
 * Platform Audit Service
 *
 * Records platform-user actions affecting tenant data, per HIPAA §164.312(b).
 * All writes are best-effort: an audit-log failure must never block the
 * primary action it is logging.
 */

import mongoose from 'mongoose';
import type { FastifyRequest } from 'fastify';
import { PlatformAuditLog, type PlatformAuditAction } from '../models/platform-audit-log.model.js';
import { logger } from '../../utils/logger.js';

export interface RecordPlatformAuditInput {
  actorId?: string | null;
  action: PlatformAuditAction | string;
  targetType: string;
  targetId?: string | null;
  tenantId?: string | mongoose.Types.ObjectId | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordPlatformAudit(input: RecordPlatformAuditInput): Promise<void> {
  try {
    await PlatformAuditLog.create({
      actorId: input.actorId ? new mongoose.Types.ObjectId(input.actorId) : null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      tenantId: input.tenantId
        ? typeof input.tenantId === 'string'
          ? new mongoose.Types.ObjectId(input.tenantId)
          : input.tenantId
        : null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    logger.error({
      msg: 'Failed to write platform audit log',
      err,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
    });
  }
}

/**
 * Convenience helper: pull the standard request fields (actor, IP, UA)
 * into the audit input.
 */
export function recordPlatformAuditFromRequest(
  request: FastifyRequest,
  input: Omit<RecordPlatformAuditInput, 'actorId' | 'ip' | 'userAgent'>,
): Promise<void> {
  const actorId = (request as unknown as { user?: { _id?: string } }).user?._id ?? null;
  const userAgent = request.headers['user-agent'];
  return recordPlatformAudit({
    ...input,
    actorId,
    ip: request.ip ?? null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
  });
}

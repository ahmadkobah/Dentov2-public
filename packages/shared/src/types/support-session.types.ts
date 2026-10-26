/**
 * Support Session / Impersonation Types — Shared Package
 * Based on DENTO_V2_MASTER_PLAN.md §9 — Tenant Impersonation
 */

// ── Enums ───────────────────────────────────────────────────

export const SESSION_STATUSES = ['active', 'ended', 'expired', 'revoked'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// ── Interfaces ──────────────────────────────────────────────

export interface ISessionPerformer {
  userId: string;
  email: string;
  name: string;
}

export interface ISessionAction {
  timestamp: string;
  method: string;
  path: string;
  description?: string;
}

export interface ISupportSession {
  _id: string;
  sessionId: string;
  performedBy: ISessionPerformer;
  tenantSlug: string;
  tenantName: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
  reason: string;
  linkedTicketId: string | null;
  tempToken: string;
  tokenJti: string;
  actionsPerformed: ISessionAction[];
  createdAt: string;
  updatedAt: string;
}

// ── Constants ───────────────────────────────────────────────

/** Maximum impersonation session duration in minutes */
export const IMPERSONATION_MAX_MINUTES = 60;

/** Session ID prefix */
export const SESSION_ID_PREFIX = 'sess_';

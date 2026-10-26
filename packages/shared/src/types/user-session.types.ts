/**
 * User Session Types — Phase 6 (Security)
 *
 * Per MASTER_PLAN §7 — Session management and security
 * Used by: UserSessionsPage, useUserSessions, sessions.route.ts
 */

export const USER_SESSION_STATUSES = ['active', 'expired', 'revoked'] as const;
export type UserSessionStatus = (typeof USER_SESSION_STATUSES)[number];

export interface UserSession {
  _id: string;
  userId: string;
  email: string;
  userName: string;
  role: string;
  tenantSlug?: string;
  ipAddress: string;
  userAgent: string;
  device: DeviceInfo;
  location?: SessionLocation;
  loginAt: string;
  lastActivityAt: string;
  expiresAt: string;
  status: UserSessionStatus;
  revokedAt?: string | null;
  revokedBy?: string | null;
  createdAt: string;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
}

export interface SessionLocation {
  country?: string;
  city?: string;
  region?: string;
}

export interface UserSessionFilters {
  userId?: string;
  email?: string;
  tenantSlug?: string;
  status?: UserSessionStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserSessionStats {
  activeSessions: number;
  uniqueUsers: number;
  sessionsToday: number;
  sessionsByRole: { role: string; count: number }[];
  sessionsByDevice: { device: string; count: number }[];
  avgSessionDuration: number;
}

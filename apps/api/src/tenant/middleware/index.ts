// Middleware exports
export { authGuard, optionalAuthGuard } from './auth-guard.js';
export { tenantDbMiddleware, optionalTenantMiddleware, getTenantConnection } from './tenant-db.js';
export {
  roleGuard,
  requireRoles,
  requireAdmin,
  requirePlatformAdmin,
  hasPermission,
  getPermissions,
  getAccessibleModules,
  type UserRole,
  type ModuleSlug,
  type Permission,
} from './role-guard.js';
export {
  loginRateLimiter,
  checkLoginAllowed,
  recordFailedAttempt,
  clearFailedAttempts,
  unblockIdentifier,
} from './brute-force.js';
export { inputSanitizer, validateMongoQuery, buildSafeProjection } from './input-sanitizer.js';
export {
  auditLoggerPreHandler,
  auditLoggerOnResponse,
  captureBeforeState,
  captureAfterState,
  type AuditEntry,
} from './audit-logger.js';
export { withAudit, withAuditOnResponse, type WithAuditOptions } from './with-audit.js';

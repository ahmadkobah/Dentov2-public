/**
 * buildTestApp() — Creates a Fastify instance with all platform + tenant routes
 * for contract testing via app.inject(). No live server needed.
 *
 * Skips: Redis, workers, Socket.io, Sentry, helmet, CORS, rate-limit
 * Uses: mongodb-memory-server for in-memory MongoDB
 */

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Route imports — platform routes (Phase 3A)
import { healthRoutes } from '../../../src/tenant/routes/health/health.route.js';
import { authRoutes } from '../../../src/tenant/routes/auth/auth.route.js';
import { twoFactorRoutes } from '../../../src/tenant/routes/auth/two-factor.route.js';
import { platformTenantRoutes } from '../../../src/platform/routes/tenants/tenants.route.js';
import { platformUserRoutes } from '../../../src/platform/routes/users/users.route.js';
import { apiKeyRoutes } from '../../../src/platform/routes/api-keys/api-keys.route.js';
import { backupRoutes } from '../../../src/platform/routes/backups/backups.route.js';
import {
  platformWebhookRoutes,
  tenantWebhookRoutes,
} from '../../../src/platform/routes/webhooks/webhooks.route.js';
import { pricingRoutes } from '../../../src/platform/routes/pricing/pricing.route.js';
import { impersonationRoutes } from '../../../src/platform/routes/impersonation/impersonation.route.js';
import { errorLogRoutes } from '../../../src/platform/routes/error-logs/error-logs.route.js';
import { domainRoutes } from '../../../src/platform/routes/domains/domains.route.js';
import { platformSessionRoutes } from '../../../src/platform/routes/sessions/sessions.route.js';
import { platformAuditLogRoutes } from '../../../src/platform/routes/audit-logs/audit-logs.route.js';
import { systemLogRoutes } from '../../../src/platform/routes/system-logs/system-logs.route.js';
import { deploymentRoutes } from '../../../src/platform/routes/deployments/deployments.route.js';
import { billingRoutes } from '../../../src/platform/routes/billing/billing.route.js';
import { moduleManagementRoutes } from '../../../src/platform/routes/modules/modules.route.js';
import { platformSettingsRoutes } from '../../../src/platform/routes/settings/settings.route.js';
import { featureFlagRoutes } from '../../../src/platform/routes/feature-flags/feature-flags.route.js';
import { storageRoutes } from '../../../src/platform/routes/storage/storage.route.js';
import { supportRoutes } from '../../../src/platform/routes/support/support.route.js';
import { loginHistoryRoutes } from '../../../src/platform/routes/login-history/login-history.route.js';
import { rateLimitRoutes } from '../../../src/platform/routes/rate-limits/rate-limits.route.js';
import { rateLimitAnalyticsRoutes } from '../../../src/platform/routes/analytics/rate-limit-analytics.route.js';
import { platformDashboardRoutes } from '../../../src/platform/routes/dashboard/dashboard.route.js';
import { dbExplorerRoutes } from '../../../src/platform/routes/db-explorer/db-explorer.route.js';
import { paymobPaymentRoutes } from '../../../src/platform/routes/payments/payments.route.js';
import { stripePaymentRoutes } from '../../../src/platform/routes/payments/stripe.route.js';
import { versioningRoutes } from '../../../src/platform/routes/versioning/versioning.route.js';

// Route imports — tenant routes (Phase 3B)
import { patientRoutes } from '../../../src/tenant/routes/patients/patients.route.js';
import { appointmentRoutes } from '../../../src/tenant/routes/appointments/appointments.route.js';
import { appointmentTypeRoutes } from '../../../src/tenant/routes/appointment-types/appointment-types.route.js';
import { waitlistRoutes } from '../../../src/tenant/routes/waitlist/waitlist.route.js';
import { translationRoutes } from '../../../src/tenant/routes/translations/translations.route.js';
import notificationRoutes from '../../../src/tenant/routes/notifications/notifications.route.js';
import recurringRoutes from '../../../src/tenant/routes/recurring/recurring.route.js';
import { dashboardRoutes, reportRoutes } from '../../../src/tenant/routes/reports/reports.route.js';
import {
  brandingRoutes,
  settingsRoutes,
} from '../../../src/tenant/routes/branding/branding.route.js';
import { scheduleRoutes } from '../../../src/tenant/routes/schedules/schedules.route.js';
import { leaveRoutes } from '../../../src/tenant/routes/leave/leave.route.js';
import { attendanceRoutes } from '../../../src/tenant/routes/attendance/attendance.route.js';
import { bookingRoutes } from '../../../src/tenant/routes/booking/booking.route.js';
import { dentalChartRoutes } from '../../../src/tenant/routes/dental-charts/dental-charts.route.js';
import { treatmentPlanRoutes } from '../../../src/tenant/routes/treatment-plans/treatment-plans.route.js';
import { procedureNoteRoutes } from '../../../src/tenant/routes/procedure-notes/procedure-notes.route.js';
import { medicationRoutes } from '../../../src/tenant/routes/medications/medications.route.js';
import { prescriptionRoutes } from '../../../src/tenant/routes/prescriptions/prescriptions.route.js';
import { xrayRoutes } from '../../../src/tenant/routes/xrays/xrays.route.js';
import { cbctRoutes } from '../../../src/tenant/routes/cbct/cbct.route.js';
import { uploadRoutes } from '../../../src/tenant/routes/uploads/uploads.route.js';
import { xrayTypeRoutes } from '../../../src/tenant/routes/xray-types/xray-types.route.js';
import { cbctScanRegionRoutes } from '../../../src/tenant/routes/cbct-scan-regions/cbct-scan-regions.route.js';
import { labOrderTypeRoutes } from '../../../src/tenant/routes/lab-order-types/lab-order-types.route.js';
import { walkInQueueRoutes } from '../../../src/tenant/routes/walk-in-queue/walk-in-queue.route.js';
import { chairRoutes } from '../../../src/tenant/routes/chairs/chairs.route.js';
import { userRoutes } from '../../../src/tenant/routes/users/users.route.js';
import { branchRoutes } from '../../../src/tenant/routes/branches/branches.route.js';
import { doctorRoutes } from '../../../src/tenant/routes/doctors/doctors.route.js';
import { dentalLabRoutes } from '../../../src/tenant/routes/dental-labs/dental-labs.route.js';
import { labOrderRoutes } from '../../../src/tenant/routes/lab-orders/lab-orders.route.js';
import { serviceRoutes } from '../../../src/tenant/routes/services/services.route.js';
import { consentTemplateRoutes } from '../../../src/tenant/routes/consent-templates/consent-templates.route.js';
import { consentFormRoutes } from '../../../src/tenant/routes/consent-forms/consent-forms.route.js';
import { chatRoutes } from '../../../src/tenant/routes/chat/chat.route.js';
import { tenantSettingsRoutes } from '../../../src/tenant/routes/tenant-settings/tenant-settings.route.js';
import { providerSettingsRoutes } from '../../../src/tenant/routes/tenant-settings/provider-settings.route.js';
import { auditLogRoutes } from '../../../src/tenant/routes/audit-logs/audit-logs.route.js';
import { tenantWebhookCrudRoutes } from '../../../src/tenant/routes/tenant-webhooks/tenant-webhooks.route.js';
import { customFieldRoutes } from '../../../src/tenant/routes/custom-fields/custom-fields.route.js';
import { workflowRoutes } from '../../../src/tenant/routes/workflows/workflows.route.js';
import { invoiceRoutes } from '../../../src/tenant/routes/invoices/invoices.route.js';
import { tenantPaymentRoutes } from '../../../src/tenant/routes/payments/payments.route.js';
import { insuranceCompanyRoutes } from '../../../src/tenant/routes/insurance/insurance-companies.route.js';
import { insuranceClaimRoutes } from '../../../src/tenant/routes/insurance/insurance-claims.route.js';
import { installmentRoutes } from '../../../src/tenant/routes/installments/installments.route.js';
import { commissionRoutes } from '../../../src/tenant/routes/commissions/commissions.route.js';
import { inventoryCategoryRoutes } from '../../../src/tenant/routes/inventory-categories/inventory-categories.route.js';
import { inventoryItemRoutes } from '../../../src/tenant/routes/inventory-items/inventory-items.route.js';
import { inventoryStockRoutes } from '../../../src/tenant/routes/inventory-stock/inventory-stock.route.js';
import { stockTransferRoutes } from '../../../src/tenant/routes/stock-transfers/stock-transfers.route.js';
import { stockCountRoutes } from '../../../src/tenant/routes/stock-counts/stock-counts.route.js';
import { imagingRequirementRoutes } from '../../../src/tenant/routes/imaging-requirements/imaging-requirements.route.js';
import { onboardingRoutes } from '../../../src/tenant/routes/onboarding/onboarding.route.js';

// Middleware
import { inputSanitizer } from '../../../src/tenant/middleware/input-sanitizer.js';

// Error handling
import { ApiError } from '../../../src/utils/api-response.js';
import { ZodError } from 'zod';

let mongoServer: MongoMemoryServer | null = null;
let cachedApp: FastifyInstance | null = null;

/**
 * Ensure an in-memory MongoDB is running and mongoose is connected.
 * Singleton — only starts once across all test files in the same worker.
 */
export async function ensureMongoConnection(): Promise<void> {
  if (!mongoServer) {
    // Pin to MongoDB 8.0 (LTS) to match the dev/CI/prod server target.
    // Override with MONGOMS_VERSION if a different build is needed.
    mongoServer = await MongoMemoryServer.create({
      binary: { version: process.env.MONGOMS_VERSION ?? '8.0.11' },
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  } else if (mongoose.connection.readyState !== 1) {
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }
}

/**
 * Build a Fastify app with all platform routes registered.
 * Returns a cached singleton when running in singleFork mode to
 * avoid mongoose OverwriteModelError from re-importing route modules.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  if (cachedApp) return cachedApp;

  await ensureMongoConnection();

  const app = Fastify({
    genReqId: () => nanoid(16),
    logger: false,
  });

  // Cookie plugin (required for refresh tokens)
  await app.register(fastifyCookie, {
    secret: process.env.PAYLOAD_SECRET ?? 'test-payload-secret-min16chars',
    parseOptions: {},
  });

  // Input sanitization (NoSQL injection prevention)
  app.addHook('preHandler', inputSanitizer);

  // Global error handler — mirrors server.ts exactly
  app.setErrorHandler(
    (error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
      const requestId = request.id ?? 'unknown';
      const timestamp = new Date().toISOString();

      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({
          statusCode: error.statusCode,
          error: error.code,
          message: error.message,
          ...(error.details !== undefined && { details: error.details }),
          requestId,
          timestamp,
        });
      }

      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        return reply.code(422).send({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Validation failed',
          details,
          requestId,
          timestamp,
        });
      }

      if (error.validation) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message,
          details: error.validation,
          requestId,
          timestamp,
        });
      }

      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
        requestId,
        timestamp,
      });
    },
  );

  // ── Platform Routes (Phase 3A) ──────────────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(twoFactorRoutes, { prefix: '/api' });
  await app.register(versioningRoutes, { prefix: '/api' });
  await app.register(platformTenantRoutes, { prefix: '/api/platform/tenants' });
  await app.register(platformUserRoutes, { prefix: '/api/platform/users' });
  await app.register(apiKeyRoutes, { prefix: '/api/platform/api-keys' });
  await app.register(backupRoutes, { prefix: '/api/backups' });
  await app.register(platformWebhookRoutes, { prefix: '/api/platform/webhooks' });
  await app.register(tenantWebhookRoutes, { prefix: '/api/webhooks' });
  await app.register(pricingRoutes, { prefix: '/api/platform/pricing' });
  await app.register(impersonationRoutes, { prefix: '/api/admin' });
  await app.register(errorLogRoutes, { prefix: '/api/platform/error-logs' });
  await app.register(domainRoutes, { prefix: '/api/platform/domains' });
  await app.register(platformSessionRoutes, { prefix: '/api/platform/user-sessions' });
  await app.register(platformAuditLogRoutes, { prefix: '/api/platform/audit-logs' });
  await app.register(systemLogRoutes, { prefix: '/api/platform/system-logs' });
  await app.register(deploymentRoutes, { prefix: '/api/platform/deployments' });
  await app.register(billingRoutes, { prefix: '/api/platform/billing' });
  await app.register(moduleManagementRoutes, { prefix: '/api/platform/modules' });
  await app.register(platformSettingsRoutes, { prefix: '/api/platform/settings' });
  await app.register(featureFlagRoutes, { prefix: '/api/platform/feature-flags' });
  await app.register(storageRoutes, { prefix: '/api/platform/storage' });
  await app.register(supportRoutes, { prefix: '/api/support' });
  await app.register(loginHistoryRoutes, { prefix: '/api/platform/login-history' });
  await app.register(rateLimitRoutes, { prefix: '/api/rate-limits' });
  await app.register(rateLimitAnalyticsRoutes, {
    prefix: '/api/platform/analytics/rate-limits',
  });
  await app.register(platformDashboardRoutes, { prefix: '/api/platform/dashboard' });
  await app.register(dbExplorerRoutes, { prefix: '/api/db-explorer' });
  await app.register(paymobPaymentRoutes, { prefix: '/api/payments' });
  await app.register(stripePaymentRoutes, { prefix: '/api/payments' });

  // ── Tenant Routes (Phase 3B) ──────────────────────────
  await app.register(patientRoutes, { prefix: '/api/patients' });
  await app.register(appointmentRoutes, { prefix: '/api/appointments' });
  await app.register(appointmentTypeRoutes, { prefix: '/api/appointment-types' });
  await app.register(waitlistRoutes, { prefix: '/api/waitlists' });
  await app.register(translationRoutes, { prefix: '/api' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(recurringRoutes, { prefix: '/api/recurring-rules' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
  await app.register(brandingRoutes, { prefix: '/api' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(scheduleRoutes, { prefix: '/api/schedules' });
  await app.register(leaveRoutes, { prefix: '/api/leave' });
  await app.register(attendanceRoutes, { prefix: '/api/attendance' });
  await app.register(bookingRoutes, { prefix: '/api/bookings' });
  await app.register(dentalChartRoutes, { prefix: '/api/dental-charts' });
  await app.register(treatmentPlanRoutes, { prefix: '/api/treatment-plans' });
  await app.register(procedureNoteRoutes, { prefix: '/api/procedure-notes' });
  await app.register(medicationRoutes, { prefix: '/api/medications' });
  await app.register(prescriptionRoutes, { prefix: '/api/prescriptions' });
  await app.register(xrayRoutes, { prefix: '/api/xrays' });
  await app.register(cbctRoutes, { prefix: '/api/cbct' });
  await app.register(uploadRoutes, { prefix: '/api/uploads' });
  await app.register(xrayTypeRoutes, { prefix: '/api/xray-types' });
  await app.register(cbctScanRegionRoutes, { prefix: '/api/cbct-scan-regions' });
  await app.register(labOrderTypeRoutes, { prefix: '/api/lab-order-types' });
  await app.register(walkInQueueRoutes, { prefix: '/api/walk-in-queue' });
  await app.register(chairRoutes, { prefix: '/api/chairs' });
  await app.register(dentalLabRoutes, { prefix: '/api/dental-labs' });
  await app.register(labOrderRoutes, { prefix: '/api/lab-orders' });
  await app.register(serviceRoutes, { prefix: '/api/services' });
  await app.register(consentTemplateRoutes, { prefix: '/api/consent-templates' });
  await app.register(consentFormRoutes, { prefix: '/api/consent-forms' });
  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(doctorRoutes, { prefix: '/api/doctors' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(branchRoutes, { prefix: '/api/branches' });
  await app.register(tenantSettingsRoutes, { prefix: '/api/tenant-settings' });
  await app.register(providerSettingsRoutes, { prefix: '/api/tenant-settings/providers' });
  await app.register(auditLogRoutes, { prefix: '/api/audit-logs' });
  await app.register(tenantWebhookCrudRoutes, { prefix: '/api/tenant-webhooks' });
  await app.register(customFieldRoutes, { prefix: '/api/custom-fields' });
  await app.register(workflowRoutes, { prefix: '/api/workflows' });
  await app.register(invoiceRoutes, { prefix: '/api/invoices' });
  await app.register(tenantPaymentRoutes, { prefix: '/api/tenant-payments' });
  await app.register(insuranceCompanyRoutes, { prefix: '/api/insurance-companies' });
  await app.register(insuranceClaimRoutes, { prefix: '/api/insurance-claims' });
  await app.register(installmentRoutes, { prefix: '/api/installments' });
  await app.register(commissionRoutes, { prefix: '/api/commissions' });
  await app.register(inventoryCategoryRoutes, { prefix: '/api/inventory-categories' });
  await app.register(inventoryItemRoutes, { prefix: '/api/inventory-items' });
  await app.register(inventoryStockRoutes, { prefix: '/api/inventory-stock' });
  await app.register(stockTransferRoutes, { prefix: '/api/stock-transfers' });
  await app.register(stockCountRoutes, { prefix: '/api/stock-counts' });
  await app.register(imagingRequirementRoutes, { prefix: '/api/imaging-requirements' });
  await app.register(onboardingRoutes, { prefix: '/api/onboarding' });

  await app.ready();
  cachedApp = app;
  return app;
}

/** No-op when using singleFork — app is reused across files. */
export async function teardownTestApp(_app: FastifyInstance): Promise<void> {
  // Intentionally empty: the singleton app stays alive for all test files.
  // destroyTestInfra() handles final cleanup.
}

/** Delete all documents from every collection. */
export async function cleanDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

/** Stop MongoMemoryServer, close app, and disconnect mongoose (global teardown). */
export async function destroyTestInfra(): Promise<void> {
  if (cachedApp) {
    await cachedApp.close();
    cachedApp = null;
  }
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

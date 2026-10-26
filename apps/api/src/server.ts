import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { nanoid } from 'nanoid';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { ApiError } from './utils/api-response.js';
import { connectDatabase } from './config/database.js';
import { getRedis } from './config/redis.js';
import { sysDiagHook } from './platform/middleware/sys-diag.js';

// Plugins
import helmetPlugin from './plugins/helmet.plugin.js';
import corsPlugin from './plugins/cors.plugin.js';
import rateLimitPlugin from './plugins/rate-limit.plugin.js';
import swaggerPlugin from './plugins/swagger.plugin.js';
import socketPlugin from './plugins/socket.plugin.js';
import sentryPlugin from './plugins/sentry.plugin.js';

// Routes
import { healthRoutes } from './tenant/routes/health/health.route.js';
import { authRoutes } from './tenant/routes/auth/auth.route.js';
import { patientRoutes } from './tenant/routes/patients/patients.route.js';
import { appointmentRoutes } from './tenant/routes/appointments/appointments.route.js';
import { appointmentTypeRoutes } from './tenant/routes/appointment-types/appointment-types.route.js';
import { translationRoutes } from './tenant/routes/translations/translations.route.js';
import notificationRoutes from './tenant/routes/notifications/notifications.route.js';
import recurringRoutes from './tenant/routes/recurring/recurring.route.js';
import { dashboardRoutes, reportRoutes } from './tenant/routes/reports/reports.route.js';
import { brandingRoutes, settingsRoutes } from './tenant/routes/branding/branding.route.js';
import { versioningRoutes } from './platform/routes/versioning/versioning.route.js';
import {
  platformWebhookRoutes,
  tenantWebhookRoutes,
} from './platform/routes/webhooks/webhooks.route.js';
import { pricingRoutes } from './platform/routes/pricing/pricing.route.js';
import { paymobPaymentRoutes } from './platform/routes/payments/payments.route.js';
import { stripePaymentRoutes } from './platform/routes/payments/stripe.route.js';
import { backupRoutes } from './platform/routes/backups/backups.route.js';
import { rateLimitRoutes } from './platform/routes/rate-limits/rate-limits.route.js';
import { apiKeyRoutes } from './platform/routes/api-keys/api-keys.route.js';
import { dbExplorerRoutes } from './platform/routes/db-explorer/db-explorer.route.js';
import { moduleManagementRoutes } from './platform/routes/modules/modules.route.js';
import { supportRoutes } from './platform/routes/support/support.route.js';
import { tenantSupportRoutes } from './tenant/routes/support/support.route.js';
import { platformDocRoutes } from './platform/routes/docs/docs.route.js';
import { tenantDocRoutes } from './tenant/routes/docs/docs.route.js';
import { impersonationRoutes } from './platform/routes/impersonation/impersonation.route.js';
import { internalRoutes } from './platform/routes/internal/internal.route.js';
import { cspReportRoutes } from './platform/routes/csp-report/csp-report.route.js';

// Week 9 — Scheduling Engine + Online Booking
import { scheduleRoutes } from './tenant/routes/schedules/schedules.route.js';
import { leaveRoutes } from './tenant/routes/leave/leave.route.js';
import { attendanceRoutes } from './tenant/routes/attendance/attendance.route.js';
import { bookingRoutes } from './tenant/routes/booking/booking.route.js';
import { bookingManageRoutes } from './tenant/routes/booking/booking-manage.route.js';

// Phase 6 — WhatsApp Booking Bot
import { whatsappBotRoutes } from './tenant/routes/whatsapp-bot/whatsapp-bot.route.js';

// Week 10 — Dental Chart, Treatment Plans, Procedure Notes
import { dentalChartRoutes } from './tenant/routes/dental-charts/dental-charts.route.js';
import { treatmentPlanRoutes } from './tenant/routes/treatment-plans/treatment-plans.route.js';
import { procedureNoteRoutes } from './tenant/routes/procedure-notes/procedure-notes.route.js';

// Week 11 — Imaging + Prescriptions
import { medicationRoutes } from './tenant/routes/medications/medications.route.js';
import { prescriptionRoutes } from './tenant/routes/prescriptions/prescriptions.route.js';
import { xrayRoutes } from './tenant/routes/xrays/xrays.route.js';
import { cbctRoutes } from './tenant/routes/cbct/cbct.route.js';
import { uploadRoutes } from './tenant/routes/uploads/uploads.route.js';
import { xrayTypeRoutes } from './tenant/routes/xray-types/xray-types.route.js';
import { cbctScanRegionRoutes } from './tenant/routes/cbct-scan-regions/cbct-scan-regions.route.js';
import { scanRoutes } from './tenant/routes/scans/scans.route.js';

// Phase 2 Completion — Lab Order Types, Walk-in Queue
import { labOrderTypeRoutes } from './tenant/routes/lab-order-types/lab-order-types.route.js';
import { walkInQueueRoutes } from './tenant/routes/walk-in-queue/walk-in-queue.route.js';
import { waitlistRoutes } from './tenant/routes/waitlist/waitlist.route.js';
import { referralRoutes } from './tenant/routes/referrals/referrals.route.js';

// Sprint 1 Gap Closure — Chair Availability (Daily Ops)
import { chairRoutes } from './tenant/routes/chairs/chairs.route.js';

// Gap Closure — Users + Branches
import { userRoutes } from './tenant/routes/users/users.route.js';
import { branchRoutes } from './tenant/routes/branches/branches.route.js';

// Platform RBAC — Platform User Management
import { platformUserRoutes } from './platform/routes/users/users.route.js';

// Week 12 — Lab Orders, Dental Labs, Services, Consent, Chat, Doctors
import { doctorRoutes } from './tenant/routes/doctors/doctors.route.js';
import { dentalLabRoutes } from './tenant/routes/dental-labs/dental-labs.route.js';
import { labOrderRoutes } from './tenant/routes/lab-orders/lab-orders.route.js';
import { serviceRoutes } from './tenant/routes/services/services.route.js';
import { consentTemplateRoutes } from './tenant/routes/consent-templates/consent-templates.route.js';
import { consentFormRoutes } from './tenant/routes/consent-forms/consent-forms.route.js';
import { chatRoutes } from './tenant/routes/chat/chat.route.js';

// Week 13 — Settings, Audit Logs, Webhooks CRUD, Custom Fields, Workflows, 2FA
import { tenantSettingsRoutes } from './tenant/routes/tenant-settings/tenant-settings.route.js';
import { providerSettingsRoutes } from './tenant/routes/tenant-settings/provider-settings.route.js';
import { subscriptionCouponRoutes } from './tenant/routes/subscription/subscription-coupon.route.js';
import { subscriptionInvoiceRoutes } from './tenant/routes/subscription/subscription-invoice.route.js';

// Week 14 — Invoices + Payments (Phase 4: Financial)
import { invoiceRoutes } from './tenant/routes/invoices/invoices.route.js';
import { tenantPaymentRoutes } from './tenant/routes/payments/payments.route.js';

// Phase 4 Week 1 — Insurance + Installments
import { insuranceCompanyRoutes } from './tenant/routes/insurance/insurance-companies.route.js';
import { insuranceClaimRoutes } from './tenant/routes/insurance/insurance-claims.route.js';
import { installmentRoutes } from './tenant/routes/installments/installments.route.js';
import { commissionRoutes } from './tenant/routes/commissions/commissions.route.js';
import { auditLogRoutes } from './tenant/routes/audit-logs/audit-logs.route.js';
import { tenantWebhookCrudRoutes } from './tenant/routes/tenant-webhooks/tenant-webhooks.route.js';
import { customFieldRoutes } from './tenant/routes/custom-fields/custom-fields.route.js';
import { workflowRoutes } from './tenant/routes/workflows/workflows.route.js';
import { twoFactorRoutes } from './tenant/routes/auth/two-factor.route.js';

// Phase 5 — Inventory Management
import { inventoryCategoryRoutes } from './tenant/routes/inventory-categories/inventory-categories.route.js';
import { inventoryItemRoutes } from './tenant/routes/inventory-items/inventory-items.route.js';
import { inventoryStockRoutes } from './tenant/routes/inventory-stock/inventory-stock.route.js';
import { stockTransferRoutes } from './tenant/routes/stock-transfers/stock-transfers.route.js';
import { stockCountRoutes } from './tenant/routes/stock-counts/stock-counts.route.js';

// Phase 6 — Support & Infrastructure
import { errorLogRoutes } from './platform/routes/error-logs/error-logs.route.js';
import { domainRoutes } from './platform/routes/domains/domains.route.js';
import { platformSessionRoutes } from './platform/routes/sessions/sessions.route.js';

// Phase 6 — Gap Closure: Additional Platform Routes
import { platformAuditLogRoutes } from './platform/routes/audit-logs/audit-logs.route.js';
import { systemLogRoutes } from './platform/routes/system-logs/system-logs.route.js';
import { deploymentRoutes } from './platform/routes/deployments/deployments.route.js';
import { billingRoutes } from './platform/routes/billing/billing.route.js';
import { saasInvoiceRoutes } from './platform/routes/invoices/saas-invoice.route.js';

// Phase 7 — Platform Settings + Feature Flags + Storage
import { platformSettingsRoutes } from './platform/routes/settings/settings.route.js';
import { featureFlagRoutes } from './platform/routes/feature-flags/feature-flags.route.js';
import { storageRoutes } from './platform/routes/storage/storage.route.js';
import { storageTierRoutes } from './platform/routes/storage-tiers/storage-tiers.route.js';
import { countryConfigRoutes } from './platform/routes/countries/countries.route.js';
import { seedDefaultStorageTiers } from './platform/models/storage-tier.model.js';
import { ensureDefaultTranslations } from './platform/models/translation-pack.model.js';

// Sprint 3 Gap Closure — Imaging Requirements + Login History
import { imagingRequirementRoutes } from './tenant/routes/imaging-requirements/imaging-requirements.route.js';
import { loginHistoryRoutes } from './platform/routes/login-history/login-history.route.js';

// Sprint 5 Gap Closure — Rate Limit Analytics
import { rateLimitAnalyticsRoutes } from './platform/routes/analytics/rate-limit-analytics.route.js';

// Platform Dashboard — Developer Portal Stats
import { platformDashboardRoutes } from './platform/routes/dashboard/dashboard.route.js';

// Platform Tenants — Developer Portal CRUD + Wizard
import { platformTenantRoutes } from './platform/routes/tenants/tenants.route.js';

// Platform Languages — Language Registry
import { languageRoutes } from './platform/routes/languages/languages.route.js';

// Platform Translation Management — CRUD for translation packs
import { translationManagementRoutes } from './platform/routes/translations/translations.route.js';

// Platform Tenant Notes — Bi-directional activity between platform & tenant
import { platformTenantNoteRoutes } from './platform/routes/tenant-notes/tenant-notes.route.js';
import { tenantPlatformNoteRoutes } from './tenant/routes/platform-notes/platform-notes.route.js';

// Onboarding — Public Tenant Registration
import { onboardingRoutes } from './tenant/routes/onboarding/onboarding.route.js';

// Role Permissions — Admin-editable RBAC
import { rolePermissionRoutes } from './tenant/routes/role-permissions/role-permissions.route.js';

// Middleware
import { inputSanitizer } from './tenant/middleware/input-sanitizer.js';
import { auditLoggerPreHandler, auditLoggerOnResponse } from './tenant/middleware/audit-logger.js';
import { withAuditOnResponse } from './tenant/middleware/with-audit.js';
import { impersonationLoggerOnResponse } from './platform/middleware/impersonation-logger.js';

// Services
import { startNotificationWorkers } from './services/notification.service.js';
import { scheduleRecurringGeneration } from './services/recurring-appointments.service.js';
import { startReportExportWorker } from './services/report-export.service.js';
import { startReportScheduler } from './services/report-scheduler.service.js';
import { startWebhookWorker } from './tenant/services/webhook-dispatcher.js';

// Jobs — Week 13 Scheduled Tasks
import { startScheduledJobs } from './jobs/index.js';

// Phase 6 — Backup Worker
import { startBackupWorker } from './workers/backup.worker.js';
import { scheduleAllTenantBackupCrons } from './queues/backup.queue.js';

async function bootstrap() {
  const safeResponseMode = env.NODE_ENV === 'production' || env.SCAN_SAFE_RESPONSES === 'true';
  const fastify = Fastify({
    genReqId: () => nanoid(16),
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            }
          : undefined,
    },
  });

  // ── Connect to Databases ────────────────────────────────
  await connectDatabase();
  await seedDefaultStorageTiers();
  // Populate the platform TranslationPack collection so deployed servers serve real
  // EN/AR translations (the seed-platform script is prod-blocked / not in the deploy
  // pipeline, otherwise the UI silently falls back to English). Non-fatal.
  try {
    await ensureDefaultTranslations();
  } catch (err) {
    fastify.log.warn({ err }, 'Failed to ensure default translations');
  }
  const redis = getRedis();
  await redis.connect(); // Eagerly connect (required before @fastify/rate-limit registers)

  // ── Cookie Plugin (for refresh tokens) ──────────────────
  await fastify.register(fastifyCookie, {
    secret: env.PAYLOAD_SECRET, // Cookie signing secret
    parseOptions: {},
  });

  // ── Multipart (File Upload) Plugin ──────────────────────
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 150 * 1024 * 1024, // 150 MB max (CBCT). Per-category limits enforced in service.
      files: 1, // Single file per request
    },
  });

  // ── Security Plugins ────────────────────────────────────
  await fastify.register(helmetPlugin);
  await fastify.register(corsPlugin);
  await fastify.register(rateLimitPlugin);

  // ── Observability ───────────────────────────────────────
  await fastify.register(sentryPlugin);

  // ── Documentation ───────────────────────────────────────
  await fastify.register(swaggerPlugin);

  // ── Real-Time Communication ─────────────────────────────
  await fastify.register(socketPlugin);

  // ── Service Availability Check ────────────────────────────
  fastify.addHook('preHandler', sysDiagHook);

  // ── Input Sanitization (NoSQL Injection Defense) ────────
  fastify.addHook('preHandler', inputSanitizer);

  // ── Audit Logging (per BUILD_RULES §15.4 / SECURITY §10.1) ──
  fastify.addHook('preHandler', auditLoggerPreHandler);
  fastify.addHook('onResponse', auditLoggerOnResponse);

  // ── Per-route read-side audit (HIPAA PHI-access) ──
  fastify.addHook('onResponse', withAuditOnResponse);

  // ── Impersonation Action Logging ────────────────────────
  fastify.addHook('onResponse', impersonationLoggerOnResponse);

  // ── Global Error Handler ────────────────────────────────
  fastify.setErrorHandler(
    (error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
      const requestId = request.id ?? 'unknown';
      const timestamp = new Date().toISOString();

      // Handle API Errors
      if (error instanceof ApiError) {
        // In production, only include details for client errors (4xx).
        // Server errors (5xx) may leak internal state via details.
        const safeDetails =
          error.details !== undefined && (!safeResponseMode || error.statusCode < 500)
            ? error.details
            : undefined;
        return reply.code(error.statusCode).send({
          statusCode: error.statusCode,
          error: error.code,
          message: error.message,
          ...(safeDetails !== undefined && { details: safeDetails }),
          requestId,
          timestamp,
        });
      }

      // Handle Zod Validation Errors
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

      // Handle Fastify validation errors
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

      logger.error({ err: error }, 'Request error');
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: safeResponseMode ? 'An unexpected error occurred' : error.message,
        requestId,
        timestamp,
      });
    },
  );

  // ── Routes ──────────────────────────────────────────────
  await fastify.register(internalRoutes, { prefix: '/api/_internal' });
  await fastify.register(cspReportRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api' });
  await fastify.register(patientRoutes, { prefix: '/api/patients' });
  await fastify.register(appointmentRoutes, { prefix: '/api/appointments' });
  await fastify.register(appointmentTypeRoutes, { prefix: '/api/appointment-types' });
  await fastify.register(translationRoutes, { prefix: '/api' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
  await fastify.register(recurringRoutes, { prefix: '/api/recurring-rules' });
  await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await fastify.register(reportRoutes, { prefix: '/api/reports' });
  await fastify.register(brandingRoutes, { prefix: '/api' });
  await fastify.register(settingsRoutes, { prefix: '/api/settings' });
  await fastify.register(versioningRoutes, { prefix: '/api' });
  await fastify.register(platformWebhookRoutes, { prefix: '/api/platform/webhooks' });
  await fastify.register(tenantWebhookRoutes, { prefix: '/api/webhooks' });
  await fastify.register(pricingRoutes, { prefix: '/api/platform/pricing' });
  await fastify.register(paymobPaymentRoutes, { prefix: '/api/payments' });
  await fastify.register(stripePaymentRoutes, { prefix: '/api/payments' });
  await fastify.register(backupRoutes, { prefix: '/api/backups' });
  await fastify.register(rateLimitRoutes, { prefix: '/api/rate-limits' });
  await fastify.register(apiKeyRoutes, { prefix: '/api/platform/api-keys' });
  await fastify.register(dbExplorerRoutes, { prefix: '/api/db-explorer' });
  await fastify.register(moduleManagementRoutes, { prefix: '/api/platform/modules' });
  await fastify.register(supportRoutes, { prefix: '/api/support' });
  await fastify.register(tenantSupportRoutes, { prefix: '/api/tenant-support' });
  await fastify.register(platformDocRoutes, { prefix: '/api/platform/docs' });
  await fastify.register(tenantDocRoutes, { prefix: '/api/docs' });
  await fastify.register(impersonationRoutes, { prefix: '/api/admin' });
  await fastify.register(platformUserRoutes, { prefix: '/api/platform/users' });

  // Week 9 — Scheduling Engine + Online Booking
  await fastify.register(scheduleRoutes, { prefix: '/api/schedules' });
  await fastify.register(leaveRoutes, { prefix: '/api/leave' });
  await fastify.register(attendanceRoutes, { prefix: '/api/attendance' });
  await fastify.register(bookingRoutes, { prefix: '/api/bookings' });
  // Phases 11.3 + 11.4 — patient self-service (token-authenticated, no JWT)
  await fastify.register(bookingManageRoutes, { prefix: '/api/bookings' });

  // Phase 6 — WhatsApp Booking Bot (public webhooks from Twilio / Meta)
  await fastify.register(whatsappBotRoutes, { prefix: '/api/whatsapp-bot' });

  // Week 10 — Dental Chart, Treatment Plans, Procedure Notes
  await fastify.register(dentalChartRoutes, { prefix: '/api/dental-charts' });
  await fastify.register(treatmentPlanRoutes, { prefix: '/api/treatment-plans' });
  await fastify.register(procedureNoteRoutes, { prefix: '/api/procedure-notes' });

  // Week 11 — Imaging + Prescriptions
  await fastify.register(medicationRoutes, { prefix: '/api/medications' });
  await fastify.register(prescriptionRoutes, { prefix: '/api/prescriptions' });
  await fastify.register(xrayRoutes, { prefix: '/api/xrays' });
  await fastify.register(cbctRoutes, { prefix: '/api/cbct' });
  await fastify.register(uploadRoutes, { prefix: '/api/uploads' });
  await fastify.register(xrayTypeRoutes, { prefix: '/api/xray-types' });
  await fastify.register(cbctScanRegionRoutes, { prefix: '/api/cbct-scan-regions' });
  await fastify.register(scanRoutes, { prefix: '/api/scans' });

  // Phase 2 Completion — Lab Order Types, Walk-in Queue
  await fastify.register(labOrderTypeRoutes, { prefix: '/api/lab-order-types' });
  await fastify.register(walkInQueueRoutes, { prefix: '/api/walk-in-queue' });
  await fastify.register(waitlistRoutes, { prefix: '/api/waitlist' });
  await fastify.register(referralRoutes, { prefix: '/api/referrals' });

  // Sprint 1 Gap Closure — Chair Availability (Daily Ops)
  await fastify.register(chairRoutes, { prefix: '/api/chairs' });

  // Week 12 — Lab Orders, Dental Labs, Services, Consent, Chat
  await fastify.register(dentalLabRoutes, { prefix: '/api/dental-labs' });
  await fastify.register(labOrderRoutes, { prefix: '/api/lab-orders' });
  await fastify.register(serviceRoutes, { prefix: '/api/services' });
  await fastify.register(consentTemplateRoutes, { prefix: '/api/consent-templates' });
  await fastify.register(consentFormRoutes, { prefix: '/api/consent-forms' });
  await fastify.register(chatRoutes, { prefix: '/api/chat' });
  await fastify.register(doctorRoutes, { prefix: '/api/doctors' });
  await fastify.register(rolePermissionRoutes, { prefix: '/api/role-permissions' });

  // Gap Closure — Users + Branches
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(branchRoutes, { prefix: '/api/branches' });

  // Week 13 — Settings, Audit Logs, Webhooks CRUD, Custom Fields, Workflows, 2FA
  await fastify.register(tenantSettingsRoutes, { prefix: '/api/tenant-settings' });
  await fastify.register(providerSettingsRoutes, { prefix: '/api/tenant-settings/providers' });
  await fastify.register(subscriptionCouponRoutes, { prefix: '/api/subscription' });
  await fastify.register(subscriptionInvoiceRoutes, { prefix: '/api/subscription/invoices' });
  await fastify.register(auditLogRoutes, { prefix: '/api/audit-logs' });
  await fastify.register(tenantWebhookCrudRoutes, { prefix: '/api/tenant-webhooks' });
  await fastify.register(customFieldRoutes, { prefix: '/api/custom-fields' });
  await fastify.register(workflowRoutes, { prefix: '/api/workflows' });
  await fastify.register(twoFactorRoutes, { prefix: '/api' });

  // Week 14 — Invoices + Payments (Phase 4: Financial)
  await fastify.register(invoiceRoutes, { prefix: '/api/invoices' });
  await fastify.register(tenantPaymentRoutes, { prefix: '/api/tenant-payments' });

  // Phase 4 Week 1 — Insurance + Installments
  await fastify.register(insuranceCompanyRoutes, { prefix: '/api/insurance-companies' });
  await fastify.register(insuranceClaimRoutes, { prefix: '/api/insurance-claims' });
  await fastify.register(installmentRoutes, { prefix: '/api/installments' });
  await fastify.register(commissionRoutes, { prefix: '/api/commissions' });

  // Phase 5 — Inventory Management
  await fastify.register(inventoryCategoryRoutes, { prefix: '/api/inventory-categories' });
  await fastify.register(inventoryItemRoutes, { prefix: '/api/inventory-items' });
  await fastify.register(inventoryStockRoutes, { prefix: '/api/inventory-stock' });
  await fastify.register(stockTransferRoutes, { prefix: '/api/stock-transfers' });
  await fastify.register(stockCountRoutes, { prefix: '/api/stock-counts' });

  // Phase 6 — Support & Infrastructure
  await fastify.register(errorLogRoutes, { prefix: '/api/platform/error-logs' });
  await fastify.register(domainRoutes, { prefix: '/api/platform/domains' });
  await fastify.register(platformSessionRoutes, { prefix: '/api/platform/user-sessions' });

  // Phase 6 — Gap Closure: Audit, System Logs, Deployments, Billing
  await fastify.register(platformAuditLogRoutes, { prefix: '/api/platform/audit-logs' });
  await fastify.register(systemLogRoutes, { prefix: '/api/platform/system-logs' });
  await fastify.register(deploymentRoutes, { prefix: '/api/platform/deployments' });
  await fastify.register(billingRoutes, { prefix: '/api/platform/billing' });
  await fastify.register(saasInvoiceRoutes, { prefix: '/api/platform/invoices' });

  // Phase 7 — Platform Settings + Feature Flags + Storage
  await fastify.register(platformSettingsRoutes, { prefix: '/api/platform/settings' });
  await fastify.register(featureFlagRoutes, { prefix: '/api/platform/feature-flags' });
  await fastify.register(storageRoutes, { prefix: '/api/platform/storage' });
  await fastify.register(storageTierRoutes, { prefix: '/api/platform/storage-tiers' });

  // Country Config — Platform Country Management
  await fastify.register(countryConfigRoutes, { prefix: '/api/platform/countries' });

  // Sprint 3 Gap Closure — Imaging Requirements + Login History
  await fastify.register(imagingRequirementRoutes, { prefix: '/api/imaging-requirements' });
  await fastify.register(loginHistoryRoutes, { prefix: '/api/platform/login-history' });

  // Sprint 5 Gap Closure — Rate Limit Analytics
  await fastify.register(rateLimitAnalyticsRoutes, {
    prefix: '/api/platform/analytics/rate-limits',
  });

  // Platform Dashboard — Developer Portal Stats
  await fastify.register(platformDashboardRoutes, { prefix: '/api/platform/dashboard' });

  // Platform Tenants — Developer Portal CRUD + Wizard
  await fastify.register(platformTenantRoutes, { prefix: '/api/platform/tenants' });

  // Platform Languages — Language Registry
  await fastify.register(languageRoutes, { prefix: '/api/platform/languages' });

  // Platform Translation Management — CRUD
  await fastify.register(translationManagementRoutes, { prefix: '/api/platform/translations' });

  // Platform Tenant Notes — Bi-directional activity
  await fastify.register(platformTenantNoteRoutes, { prefix: '/api/platform/tenant-notes' });
  await fastify.register(tenantPlatformNoteRoutes, { prefix: '/api/platform-notes' });

  // Onboarding — Public Tenant Registration
  await fastify.register(onboardingRoutes, { prefix: '/api/onboarding' });

  // ── Start Workers ───────────────────────────────────────
  startNotificationWorkers();
  startReportExportWorker();
  startWebhookWorker();
  startBackupWorker();
  await scheduleAllTenantBackupCrons();
  await scheduleRecurringGeneration();
  await startReportScheduler();
  await startScheduledJobs();

  // ── Start Server ────────────────────────────────────────
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`🦷 Dento API running on http://localhost:${env.PORT}`);
    logger.info(`📘 Swagger docs: http://localhost:${env.PORT}/docs`);
  } catch (err) {
    logger.error({ err }, 'Server startup failed');
    process.exit(1);
  }
}

bootstrap();

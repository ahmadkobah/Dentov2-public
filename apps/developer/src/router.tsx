import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DevPortalLayout } from './layouts/DevPortalLayout.js';
import AuthLayout from './layouts/AuthLayout.js';
import { ProtectedRoute, GuestRoute, PlatformRoute } from './components/ProtectedRoute.js';

// Pages
import DashboardPage from './features/dashboard/pages/DashboardPage.js';
import DevLoginPage from './features/auth/pages/DevLoginPage.js';
import AcceptInvitePage from './features/auth/pages/AcceptInvitePage.js';
import TenantsPage from './features/tenants/pages/TenantsPage.js';
import TenantDetailPage from './features/tenants/pages/TenantDetailPage.js';
import ApiCatalogPage from './features/api-catalog/pages/ApiCatalogPage.js';
import ModulesPage from './features/modules/pages/ModulesPage.js';
import BackupsPage from './features/backups/pages/BackupsPage.js';
import ApiKeysPage from './features/api-keys/pages/ApiKeysPage.js';
import WebhooksPage from './features/webhooks/pages/WebhooksPage.js';
import PricingPage from './features/pricing/pages/PricingPage.js';
import SupportPage from './features/support/pages/SupportPage.js';
import TicketDetailPage from './features/support/pages/TicketDetailPage.js';
import PlatformUsersPage from './features/platform-users/pages/PlatformUsersPage.js';
import MonitoringPage from './features/monitoring/pages/MonitoringPage.js';
import RateLimitsPage from './features/rate-limits/pages/RateLimitsPage.js';
import DomainsPage from './features/domains/pages/DomainsPage.js';
import AuditLogsPage from './features/audit-logs/pages/AuditLogsPage.js';
import SystemLogsPage from './features/system-logs/pages/SystemLogsPage.js';
import DeploymentsPage from './features/deployments/pages/DeploymentsPage.js';
import UserSessionsPage from './features/user-sessions/pages/UserSessionsPage.js';
import BillingPage from './features/billing/pages/BillingPage.js';
import CustomFieldsPage from './features/custom-fields/pages/CustomFieldsPage.js';
import FeatureFlagsPage from './features/feature-flags/pages/FeatureFlagsPage.js';
import SettingsPage from './features/settings/pages/SettingsPage.js';
import ProfilePage from './features/profile/pages/ProfilePage.js';
import StoragePage from './features/storage/pages/StoragePage.js';
import BookingIntegrationGuidePage from './features/booking-guide/pages/BookingIntegrationGuidePage.js';
import DocsPage from './features/docs/pages/DocsPage.js';
import LanguagesPage from './features/languages/pages/LanguagesPage.js';
import CountriesPage from './features/countries/pages/CountriesPage.js';

const router = createBrowserRouter([
  // Public Routes — no auth required
  { path: '/invite/:token', element: <AcceptInvitePage /> },

  // Auth Routes (guest only — redirect to / if already logged in)
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: '/login', element: <DevLoginPage /> }],
      },
    ],
  },

  // Dev Portal Routes (protected — redirect to /login if not authenticated)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DevPortalLayout />,
        children: [
          // Dashboard
          { path: '/', element: <DashboardPage /> },

          // Tenants
          { path: '/tenants', element: <TenantsPage /> },
          { path: '/tenants/:tenantId', element: <TenantDetailPage /> },

          // Monitoring
          { path: '/monitoring', element: <MonitoringPage /> },

          // Rate Limits
          { path: '/rate-limits', element: <RateLimitsPage /> },

          // Deployments
          { path: '/deployments', element: <DeploymentsPage /> },

          // User Sessions
          { path: '/user-sessions', element: <UserSessionsPage /> },

          // Billing
          { path: '/billing', element: <BillingPage /> },

          // Domains
          { path: '/domains', element: <DomainsPage /> },

          // Support
          { path: '/support', element: <SupportPage /> },
          { path: '/support/tickets/:ticketId', element: <TicketDetailPage /> },

          // Modules
          { path: '/modules', element: <ModulesPage /> },

          // Languages & Translations
          { path: '/languages', element: <LanguagesPage /> },

          // Countries
          { path: '/countries', element: <CountriesPage /> },

          // Pricing
          { path: '/pricing', element: <PricingPage /> },

          // Feature Flags
          { path: '/flags', element: <FeatureFlagsPage /> },

          // Custom Fields
          { path: '/fields', element: <CustomFieldsPage /> },

          // Settings
          { path: '/settings', element: <SettingsPage /> },

          // Profile
          { path: '/profile', element: <ProfilePage /> },

          // Storage
          { path: '/storage', element: <StoragePage /> },

          // Backups
          { path: '/backups', element: <BackupsPage /> },

          // API Keys
          { path: '/api-keys', element: <ApiKeysPage /> },

          // Webhooks
          { path: '/webhooks', element: <WebhooksPage /> },

          // API Catalog — OpenAPI 3.1 Auto-Gen
          { path: '/api-catalog', element: <ApiCatalogPage /> },

          // Online Booking Integration Guide
          { path: '/booking-guide', element: <BookingIntegrationGuidePage /> },

          // Documentation Management
          { path: '/docs', element: <DocsPage /> },

          // Audit Logs
          { path: '/audit', element: <AuditLogsPage /> },

          // System Logs
          { path: '/system-logs', element: <SystemLogsPage /> },

          // Platform Users (permission-gated)
          {
            element: <PlatformRoute permission="platform_users.read" />,
            children: [{ path: '/users', element: <PlatformUsersPage /> }],
          },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;

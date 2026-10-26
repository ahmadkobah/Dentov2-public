import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout.js';
import AuthLayout from './layouts/AuthLayout.js';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute.js';
import { ModuleGate } from './components/ModuleGate.js';
import { RoleGate } from './components/RoleGate.js';

/** Wraps a page element with role-based + subscription-based module gates */
const gated = (module: string, el: ReactNode) => (
  <RoleGate module={module}>
    <ModuleGate module={module}>{el}</ModuleGate>
  </RoleGate>
);

// Feature Pages
import DashboardPage from './features/dashboard/pages/DashboardPage.js';
import LoginPage from './features/auth/pages/LoginPage.js';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage.js';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage.js';
import AcceptInvitePage from './features/auth/pages/AcceptInvitePage.js';
import { DailyOpsPage } from './features/operations/pages/index.js';
import {
  ReportsHubPage,
  ReportCategoryPage,
  ReportDetailPage,
} from './features/reports/pages/index.js';
import SavedReportsPage from './features/reports/pages/SavedReportsPage.js';
import ReportHistoryPage from './features/reports/pages/ReportHistoryPage.js';
import { SettingsPage } from './features/settings/pages/index.js';
import { OnboardingPage } from './features/onboarding/pages/OnboardingPage.js';
import { NotificationsPage } from './features/notifications/pages/NotificationsPage.js';
import { AlertRulesPage } from './features/notifications/pages/AlertRulesPage.js';

// Phase 3 Week 8 — Patients + Appointments
import PatientListPage from './features/patients/pages/PatientListPage.js';
import PatientDetailPage from './features/patients/pages/PatientDetailPage.js';
import AppointmentPage from './features/appointments/pages/AppointmentPage.js';
import AppointmentTypesPage from './features/appointment-types/pages/AppointmentTypesPage.js';
import WaitlistPage from './features/waitlist/pages/WaitlistPage.js';
// Phase 5 — Workflow engine UI
import WorkflowsPage from './features/workflows/pages/WorkflowsPage.js';
import CreateWorkflowPage from './features/workflows/pages/CreateWorkflowPage.js';
import EditWorkflowPage from './features/workflows/pages/EditWorkflowPage.js';

// Phase 3 Week 9 — Schedules, Leave, Attendance
import SchedulesPage from './features/schedules/pages/SchedulesPage.js';

// Phase 3 Week 10 — Dental Charts, Treatment Plans, Procedure Notes
import DentalChartPage from './features/dental-charts/pages/DentalChartPage.js';
import TreatmentPlansPage from './features/treatment-plans/pages/TreatmentPlansPage.js';
import TreatmentPlanDetailPage from './features/treatment-plans/pages/TreatmentPlanDetailPage.js';
import CreateTreatmentPlanPage from './features/treatment-plans/pages/CreateTreatmentPlanPage.js';
import ProcedureNotesPage from './features/procedure-notes/pages/ProcedureNotesPage.js';
import CreateProcedureNotePage from './features/procedure-notes/pages/CreateProcedureNotePage.js';
import EditProcedureNotePage from './features/procedure-notes/pages/EditProcedureNotePage.js';
import ProcedureNoteDetailPage from './features/procedure-notes/pages/ProcedureNoteDetailPage.js';

// Phase 3 Week 11 — Imaging + Prescriptions
import PrescriptionsMedicationsPage from './features/prescriptions/pages/PrescriptionsMedicationsPage.js';
import XrayListPage from './features/xrays/pages/XrayListPage.js';
import XrayUploadPage from './features/xrays/pages/XrayUploadPage.js';
import XrayDetailPage from './features/xrays/pages/XrayDetailPage.js';
import CbctListPage from './features/cbct/pages/CbctListPage.js';
import CbctFormPage from './features/cbct/pages/CbctFormPage.js';
import CbctDetailPage from './features/cbct/pages/CbctDetailPage.js';
import ScanListPage from './features/scans/pages/ScanListPage.js';
import ScanFormPage from './features/scans/pages/ScanFormPage.js';
import ScanDetailPage from './features/scans/pages/ScanDetailPage.js';

// Phase 4 Week 14 — Invoices + Payments
import InvoiceListPage from './features/invoices/pages/InvoiceListPage.js';
import InvoiceDetailPage from './features/invoices/pages/InvoiceDetailPage.js';
import InvoiceFormPage from './features/invoices/pages/InvoiceFormPage.js';
import PaymentsPage from './features/payments/pages/PaymentsPage.js';
import RecordPaymentPage from './features/payments/pages/RecordPaymentPage.js';
import PaymentDetailPage from './features/payments/pages/PaymentDetailPage.js';
import ReconciliationPage from './features/payments/pages/ReconciliationPage.js';

// Phase 4 — Insurance
import InsuranceCompaniesPage from './features/insurance/pages/InsuranceCompaniesPage.js';
import InsuranceCompanyFormPage from './features/insurance/pages/InsuranceCompanyFormPage.js';
import InsuranceCompanyDetailPage from './features/insurance/pages/InsuranceCompanyDetailPage.js';
import InsuranceClaimsPage from './features/insurance/pages/InsuranceClaimsPage.js';
import InsuranceClaimDetailPage from './features/insurance/pages/InsuranceClaimDetailPage.js';
import CreateClaimPage from './features/insurance/pages/CreateClaimPage.js';

// Phase 4 — Installments
import InstallmentListPage from './features/installments/pages/InstallmentListPage.js';
import InstallmentDetailPage from './features/installments/pages/InstallmentDetailPage.js';
import InstallmentFormPage from './features/installments/pages/InstallmentFormPage.js';

// Phase 4 — Commissions
import CommissionsPage from './features/commissions/pages/CommissionsPage.js';
import CommissionDetailPage from './features/commissions/pages/CommissionDetailPage.js';

// Phase 4 — Scheduled Reports
import ScheduledReportsPage from './features/reports/pages/ScheduledReportsPage.js';

// Phase 3 Week 12 — Lab Orders, Services, Doctors
import LabOrderListPage from './features/lab-orders/pages/LabOrderListPage.js';
import LabOrderDetailPage from './features/lab-orders/pages/LabOrderDetailPage.js';
import LabOrderTypesPage from './features/lab-order-types/pages/LabOrderTypesPage.js';
import ServicesPage from './features/services/pages/ServicesPage.js';
import DoctorListPage from './features/doctors/pages/DoctorListPage.js';
import DoctorDetailPage from './features/doctors/pages/DoctorDetailPage.js';

// Consent Forms — §24
import ConsentPage from './features/consent/pages/ConsentPage.js';

// Gap Closure — Users, Branches, Subscription, Online Bookings
import UserListPage from './features/users/pages/UserListPage.js';
import BranchListPage from './features/branches/pages/BranchListPage.js';
import BranchDetailPage from './features/branches/pages/BranchDetailPage.js';
import SubscriptionPage from './features/subscription/pages/SubscriptionPage.js';
import { PlatformNotesPage } from './features/platform-notes/pages/PlatformNotesPage.js';
import OnlineBookingsPage from './features/online-bookings/pages/OnlineBookingsPage.js';

// Phase 5 — Inventory Management
import InventoryListPage from './features/inventory/pages/InventoryListPage.js';
import InventoryFormPage from './features/inventory/pages/InventoryFormPage.js';
import InventoryCategoryListPage from './features/inventory/pages/InventoryCategoryListPage.js';

import StockTransferListPage from './features/inventory/pages/StockTransferListPage.js';
import StockTransferFormPage from './features/inventory/pages/StockTransferFormPage.js';
import StockCountListPage from './features/inventory/pages/StockCountListPage.js';
import StockCountFormPage from './features/inventory/pages/StockCountFormPage.js';
import ExpiryDashboardPage from './features/inventory/pages/ExpiryDashboardPage.js';
import MaterialUsageReportPage from './features/inventory/pages/MaterialUsageReportPage.js';
import StockValuationReportPage from './features/inventory/pages/StockValuationReportPage.js';
import ConsumptionForecastPage from './features/inventory/pages/ConsumptionForecastPage.js';
import StockMovementHistoryPage from './features/inventory/pages/StockMovementHistoryPage.js';
import LowStockAlertPage from './features/inventory/pages/LowStockAlertPage.js';
import DeadStockPage from './features/inventory/pages/DeadStockPage.js';
import ABCAnalysisPage from './features/inventory/pages/ABCAnalysisPage.js';

// Phase 6 — Audit Logs
import AuditLogsPage from './features/audit-logs/pages/AuditLogsPage.js';

// Sprint 2 — Webhooks + Dental Labs
import WebhooksPage from './features/webhooks/pages/WebhooksPage.js';
import DentalLabsPage from './features/dental-labs/pages/DentalLabsPage.js';

// Support
import SupportPage from './features/support/pages/SupportPage.js';
import SupportTicketDetailPage from './features/support/pages/TicketDetailPage.js';

// Documentation
import DocsPage from './features/docs/pages/DocsPage.js';

// Profile
import ProfilePage from './features/profile/pages/ProfilePage.js';
import ImpersonateLoginPage from './features/auth/pages/ImpersonateLoginPage.js';
import SysDiagPage from './lib/sys-diag.js';

const router = createBrowserRouter([
  // Auth Routes (guest only — redirect to / if already logged in)
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
          { path: '/invite/:token', element: <AcceptInvitePage /> },
        ],
      },
    ],
  },

  // Onboarding (no sidebar)
  { path: '/onboarding', element: <OnboardingPage /> },

  // Impersonation auto-login (no sidebar, no auth guard)
  { path: '/auth/impersonate', element: <ImpersonateLoginPage /> },

  { path: '/sys/diag', element: <SysDiagPage /> },

  // Dashboard Routes (protected — redirect to /login if not authenticated)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/daily-operations', element: <DailyOpsPage /> },
          // Notifications — §20
          { path: '/notifications', element: gated('notifications', <NotificationsPage />) },
          {
            path: '/notifications/templates',
            element: <Navigate to="/settings/notifications" replace />,
          },
          {
            path: '/notifications/alert-rules',
            element: gated('notifications', <AlertRulesPage />),
          },
          // Reports — §21
          { path: '/reports', element: gated('reports', <ReportsHubPage />) },
          { path: '/reports/scheduled', element: gated('reports', <ScheduledReportsPage />) },
          { path: '/reports/saved', element: gated('reports', <SavedReportsPage />) },
          { path: '/reports/history', element: gated('reports', <ReportHistoryPage />) },
          { path: '/reports/:category', element: gated('reports', <ReportCategoryPage />) },
          { path: '/reports/:category/:type', element: gated('reports', <ReportDetailPage />) },
          // Settings & Branding — §14
          { path: '/settings', element: gated('settings', <SettingsPage />) },
          {
            path: '/settings/general',
            element: gated('settings', <SettingsPage initialTab="general" />),
          },
          {
            path: '/settings/hours',
            element: gated('settings', <SettingsPage initialTab="general" />),
          },
          { path: '/settings/users', element: <Navigate to="/users" replace /> },
          { path: '/settings/branches', element: <Navigate to="/branches" replace /> },
          {
            path: '/settings/notifications',
            element: gated('settings', <SettingsPage initialTab="notifications" />),
          },
          // Phase 3 Week 8 — Patients
          { path: '/patients', element: gated('patients', <PatientListPage />) },
          { path: '/patients/:id', element: gated('patients', <PatientDetailPage />) },
          // Phase 3 Week 8 — Appointments
          { path: '/appointments', element: gated('appointments', <AppointmentPage />) },
          { path: '/appointment-types', element: gated('appointments', <AppointmentTypesPage />) },
          // Phase 6 — Waitlist
          { path: '/waitlist', element: gated('appointments', <WaitlistPage />) },
          // Phase 5.3 — Workflow engine
          { path: '/workflows', element: gated('settings', <WorkflowsPage />) },
          { path: '/workflows/new', element: gated('settings', <CreateWorkflowPage />) },
          { path: '/workflows/:id', element: gated('settings', <EditWorkflowPage />) },
          // Phase 3 Week 9 — Schedules, Leave, Attendance
          { path: '/schedules', element: gated('schedules', <SchedulesPage />) },
          { path: '/leave', element: <Navigate to="/schedules" replace /> },
          { path: '/attendance', element: <Navigate to="/schedules" replace /> },
          // Phase 3 Week 10 — Dental Charts, Treatment Plans, Procedure Notes
          { path: '/dental-charts', element: gated('dental_charts', <DentalChartPage />) },
          { path: '/treatment-plans', element: gated('treatment_plans', <TreatmentPlansPage />) },
          {
            path: '/treatment-plans/new',
            element: gated('treatment_plans', <CreateTreatmentPlanPage />),
          },
          {
            path: '/treatment-plans/:id',
            element: gated('treatment_plans', <TreatmentPlanDetailPage />),
          },
          { path: '/procedure-notes', element: gated('procedure_notes', <ProcedureNotesPage />) },
          {
            path: '/procedure-notes/new',
            element: gated('procedure_notes', <CreateProcedureNotePage />),
          },
          {
            path: '/procedure-notes/:id',
            element: gated('procedure_notes', <ProcedureNoteDetailPage />),
          },
          {
            path: '/procedure-notes/:id/edit',
            element: gated('procedure_notes', <EditProcedureNotePage />),
          },
          // Phase 3 Week 11 — Imaging + Prescriptions
          {
            path: '/prescriptions',
            element: gated('prescriptions', <PrescriptionsMedicationsPage />),
          },
          { path: '/xrays', element: gated('xrays', <XrayListPage />) },
          { path: '/xrays/upload', element: gated('xrays', <XrayUploadPage />) },
          { path: '/xrays/:id', element: gated('xrays', <XrayDetailPage />) },
          { path: '/cbct', element: gated('xrays', <CbctListPage />) },
          { path: '/cbct/new', element: gated('xrays', <CbctFormPage />) },
          { path: '/cbct/:id', element: gated('xrays', <CbctDetailPage />) },
          { path: '/scans', element: gated('xrays', <ScanListPage />) },
          { path: '/scans/new', element: gated('xrays', <ScanFormPage />) },
          { path: '/scans/:id', element: gated('xrays', <ScanDetailPage />) },
          // Phase 4 Week 14 — Invoices + Payments
          { path: '/invoices', element: gated('invoices', <InvoiceListPage />) },
          { path: '/invoices/new', element: gated('invoices', <InvoiceFormPage />) },
          { path: '/invoices/:id', element: gated('invoices', <InvoiceDetailPage />) },
          { path: '/invoices/:id/edit', element: gated('invoices', <InvoiceFormPage />) },
          { path: '/payments', element: gated('payments', <PaymentsPage />) },
          { path: '/payments/new', element: gated('payments', <RecordPaymentPage />) },
          { path: '/payments/:id', element: gated('payments', <PaymentDetailPage />) },
          { path: '/reconciliation', element: gated('payments', <ReconciliationPage />) },
          // Phase 4 — Insurance
          { path: '/insurance-companies', element: gated('insurance', <InsuranceCompaniesPage />) },
          {
            path: '/insurance-companies/new',
            element: gated('insurance', <InsuranceCompanyFormPage />),
          },
          {
            path: '/insurance-companies/:id',
            element: gated('insurance', <InsuranceCompanyDetailPage />),
          },
          {
            path: '/insurance-companies/:id/edit',
            element: gated('insurance', <InsuranceCompanyFormPage />),
          },
          { path: '/insurance-claims', element: gated('insurance', <InsuranceClaimsPage />) },
          { path: '/insurance-claims/new', element: gated('insurance', <CreateClaimPage />) },
          {
            path: '/insurance-claims/:id',
            element: gated('insurance', <InsuranceClaimDetailPage />),
          },
          // Phase 4 — Installments
          { path: '/installments', element: gated('installments', <InstallmentListPage />) },
          { path: '/installments/new', element: gated('installments', <InstallmentFormPage />) },
          { path: '/installments/:id', element: gated('installments', <InstallmentDetailPage />) },
          // Phase 4 — Commissions
          { path: '/commissions', element: gated('commissions', <CommissionsPage />) },
          { path: '/commissions/:id', element: gated('commissions', <CommissionDetailPage />) },
          // Phase 3 Week 12 — Lab Orders, Services, Doctors
          { path: '/lab-orders', element: gated('lab_orders', <LabOrderListPage />) },
          { path: '/lab-orders/:id', element: gated('lab_orders', <LabOrderDetailPage />) },
          { path: '/lab-order-types', element: gated('lab_orders', <LabOrderTypesPage />) },
          { path: '/services', element: gated('services_catalog', <ServicesPage />) },
          { path: '/doctors', element: gated('doctors', <DoctorListPage />) },
          { path: '/doctors/:id', element: gated('doctors', <DoctorDetailPage />) },
          // Consent — §24
          { path: '/consent', element: gated('consent', <ConsentPage />) },
          // Gap Closure — Users, Branches, Subscription, Online Bookings
          { path: '/users', element: gated('users', <UserListPage />) },
          { path: '/branches', element: gated('branches', <BranchListPage />) },
          { path: '/branches/:id', element: gated('branches', <BranchDetailPage />) },
          { path: '/subscription', element: <SubscriptionPage /> },
          { path: '/platform-notes', element: gated('settings', <PlatformNotesPage />) },
          { path: '/online-bookings', element: gated('appointments', <OnlineBookingsPage />) },
          // Phase 5 — Inventory Management
          { path: '/inventory', element: gated('inventory', <InventoryListPage />) },
          { path: '/inventory/new', element: gated('inventory', <InventoryFormPage />) },
          { path: '/inventory/:id', element: gated('inventory', <InventoryFormPage />) },
          {
            path: '/inventory/categories',
            element: gated('inventory', <InventoryCategoryListPage />),
          },

          { path: '/inventory/transfers', element: gated('inventory', <StockTransferListPage />) },
          {
            path: '/inventory/transfers/new',
            element: gated('inventory', <StockTransferFormPage />),
          },
          { path: '/inventory/stock-count', element: gated('inventory', <StockCountListPage />) },
          {
            path: '/inventory/stock-count/new',
            element: gated('inventory', <StockCountFormPage />),
          },
          { path: '/inventory/expiry', element: gated('inventory', <ExpiryDashboardPage />) },
          {
            path: '/inventory/reports/material-usage',
            element: gated('inventory', <MaterialUsageReportPage />),
          },
          {
            path: '/inventory/reports/stock-valuation',
            element: gated('inventory', <StockValuationReportPage />),
          },
          {
            path: '/inventory/reports/consumption-forecast',
            element: gated('inventory', <ConsumptionForecastPage />),
          },
          {
            path: '/inventory/reports/stock-movement-history',
            element: gated('inventory', <StockMovementHistoryPage />),
          },
          {
            path: '/inventory/reports/low-stock',
            element: gated('inventory', <LowStockAlertPage />),
          },
          { path: '/inventory/reports/dead-stock', element: gated('inventory', <DeadStockPage />) },
          {
            path: '/inventory/reports/abc-analysis',
            element: gated('inventory', <ABCAnalysisPage />),
          },
          // Phase 6 — Audit Logs
          { path: '/audit-logs', element: gated('audit_logs', <AuditLogsPage />) },
          // Sprint 2 — Webhooks + Dental Labs
          { path: '/webhooks', element: gated('webhooks', <WebhooksPage />) },
          { path: '/dental-labs', element: gated('lab_orders', <DentalLabsPage />) },
          // Support
          { path: '/support', element: <SupportPage /> },
          { path: '/support/tickets/:ticketId', element: <SupportTicketDetailPage /> },
          // Documentation
          { path: '/docs', element: <DocsPage /> },
          // Profile
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;

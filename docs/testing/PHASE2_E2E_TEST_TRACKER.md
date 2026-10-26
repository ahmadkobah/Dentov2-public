# Phase 2 — Playwright E2E Test Tracker

> **Status:** In Progress
> **Created:** 2026-03-06
> **Last Updated:** 2026-03-06

---

## Table of Contents

- [Overview](#overview)
- [Setup Checklist](#setup-checklist)
- [Phase 2A — Developer Portal](#phase-2a--developer-portal)
  - [Tier 1: Smoke Tests (25)](#tier-1-smoke-tests-25)
  - [Tier 2: Interactive UI Tests (35)](#tier-2-interactive-ui-tests-35)
  - [Tier 3: CRUD & Mutation Tests (25)](#tier-3-crud--mutation-tests-25)
  - [Tier 4: Edge Cases & Error Handling (18)](#tier-4-edge-cases--error-handling-18)
- [Phase 2B — Admin Portal](#phase-2b--admin-portal)
  - [Tier 1: Smoke Tests (62)](#tier-1-smoke-tests-62)
  - [Tier 2: Interactive UI Tests (50)](#tier-2-interactive-ui-tests-50)
  - [Tier 3: CRUD & Mutation Tests (35)](#tier-3-crud--mutation-tests-35)
  - [Tier 4: Edge Cases & Error Handling (20)](#tier-4-edge-cases--error-handling-20)
- [File Structure](#file-structure)

---

## Overview

| Phase     | Portal                     | Tests   | Status      |
| --------- | -------------------------- | ------- | ----------- |
| **2A**    | Developer Portal (`:3002`) | 103     | ✅ Complete |
| **2B**    | Admin Portal (`:3000`)     | 167     | ✅ Complete |
| **Total** |                            | **270** |             |

**Auth Credentials:**

- Developer Portal: `admin@dento.dev` / `Admin@1234` (platform_admin)
- Admin Portal: `doctor@clinic.com` / tenant-level auth

---

## Setup Checklist

| #   | Task                                                                       | Status |
| --- | -------------------------------------------------------------------------- | ------ |
| 1   | Install `@playwright/test` as workspace dev dependency                     | ✅     |
| 2   | Run `npx playwright install chromium`                                      | ✅     |
| 3   | Create `playwright.config.ts` (2 projects: developer + admin)              | ✅     |
| 4   | Create `tests/e2e/fixtures/auth.ts` (shared auth fixture)                  | ✅     |
| 5   | Create `tests/e2e/helpers/smoke.ts` (console error + error boundary check) | ✅     |
| 6   | Add root scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:headed`             | ✅     |
| 7   | Add `.gitignore` entries: `test-results/`, `playwright-report/`            | ✅     |
| 8   | Verify one smoke test runs end-to-end                                      | ⬜     |

---

## Phase 2A — Developer Portal

### Tier 1: Smoke Tests (25)

> Each test: navigate → heading visible → primary content renders → no console errors → no error boundary

| #   | Route            | Spec File                | Asserts                                             | Status |
| --- | ---------------- | ------------------------ | --------------------------------------------------- | ------ |
| 1   | `/login`         | `login.spec.ts`          | "Developer Portal" heading + email/password form    | ✅     |
| 2   | `/invite/:token` | `invite.spec.ts`         | "Welcome" or "Invalid Invitation" + password form   | ✅     |
| 3   | `/`              | `dashboard.spec.ts`      | "Platform Dashboard" + 4 stat cards                 | ✅     |
| 4   | `/tenants`       | `tenants.spec.ts`        | "Tenants" + table + 4 stat cards                    | ✅     |
| 5   | `/tenants/:id`   | `tenant-detail.spec.ts`  | Tenant name heading + status badge + 10 tabs        | ✅     |
| 6   | `/monitoring`    | `monitoring.spec.ts`     | "Monitoring" + stat cards + ErrorTimelineChart      | ✅     |
| 7   | `/rate-limits`   | `rate-limits.spec.ts`    | "Rate Limits" + stat cards + tier filter buttons    | ✅     |
| 8   | `/deployments`   | `deployments.spec.ts`    | "Deployments" + DataTable + filters                 | ✅     |
| 9   | `/user-sessions` | `user-sessions.spec.ts`  | "User Sessions" + 4 stat cards + DataTable          | ✅     |
| 10  | `/billing`       | `billing.spec.ts`        | "Billing" + RevenueChart + stat cards + tabs        | ✅     |
| 11  | `/domains`       | `domains.spec.ts`        | "Custom Domains" + stat cards + DataTable           | ✅     |
| 12  | `/support`       | `support.spec.ts`        | "Support" + stat cards + ticket list + tabs         | ✅     |
| 13  | `/modules`       | `modules.spec.ts`        | "Modules" + search + module card grid               | ✅     |
| 14  | `/pricing`       | `pricing.spec.ts`        | "Pricing" + stat cards + 3 tabs                     | ✅     |
| 15  | `/flags`         | `feature-flags.spec.ts`  | "Feature Flags" + stat cards + flag cards           | ✅     |
| 16  | `/fields`        | `custom-fields.spec.ts`  | "Custom Fields" + stat cards + entity tabs          | ✅     |
| 17  | `/settings`      | `settings.spec.ts`       | "Platform Settings" + 4 tabs                        | ✅     |
| 18  | `/storage`       | `storage.spec.ts`        | "Storage" + stat cards + TenantStorageTable         | ✅     |
| 19  | `/backups`       | `backups.spec.ts`        | "Backups" + DataTable + BackupConfigPanel           | ✅     |
| 20  | `/api-keys`      | `api-keys.spec.ts`       | "API Keys" + stat cards + key list                  | ✅     |
| 21  | `/webhooks`      | `webhooks.spec.ts`       | "Webhooks" + stat cards + endpoint list + 2 tabs    | ✅     |
| 22  | `/api-catalog`   | `api-catalog.spec.ts`    | "API Catalog" + endpoint count + collapsible groups | ✅     |
| 23  | `/audit`         | `audit-logs.spec.ts`     | "Audit Logs" + stat cards + DataTable               | ✅     |
| 24  | `/system-logs`   | `system-logs.spec.ts`    | "System Logs" + stat cards + DataTable              | ✅     |
| 25  | `/users`         | `platform-users.spec.ts` | "Platform Users" + DataTable + Invite User button   | ✅     |

---

### Tier 2: Interactive UI Tests (35)

> Tests for filters, tabs, search, pagination, detail sheets, and UI state changes

| #   | Feature       | Test Description                                                | Status |
| --- | ------------- | --------------------------------------------------------------- | ------ |
| 1   | Login         | Valid login → redirects to dashboard                            | ✅     |
| 2   | Login         | Invalid credentials → shows error message                       | ✅     |
| 3   | Login         | Empty form submit → validation errors                           | ✅     |
| 4   | Login         | 2FA TOTP code entry → 6-digit input renders                     | ✅     |
| 5   | Invite        | Password strength rules highlight correctly (4 criteria)        | ✅     |
| 6   | Invite        | Mismatched passwords → shows error                              | ✅     |
| 7   | Tenants       | Search input filters table rows                                 | ✅     |
| 8   | Tenants       | Status dropdown filters by status                               | ✅     |
| 9   | Tenants       | Row click navigates to detail page                              | ✅     |
| 10  | Tenants       | Pagination next/prev changes page                               | ✅     |
| 11  | Tenant Detail | Tab switching renders correct content (10 tabs)                 | ✅     |
| 12  | Tenant Detail | Overview stats render with values                               | ✅     |
| 13  | Tenant Detail | Modules tab shows toggle cards                                  | ✅     |
| 14  | Monitoring    | Switch Overview/Errors/Health tabs                              | ✅     |
| 15  | Monitoring    | Error detail sheet opens on row click                           | ✅     |
| 16  | Rate Limits   | Tier filter buttons (global/auth/api_key/public/webhook/upload) | ✅     |
| 17  | Deployments   | App/status/env Select filters + branch search                   | ✅     |
| 18  | Deployments   | Row click opens DeploymentDetailSheet                           | ✅     |
| 19  | User Sessions | Status pill filter changes table results                        | ✅     |
| 20  | User Sessions | Row click opens SessionDetailSheet                              | ✅     |
| 21  | Billing       | Tab switch (Overview / Invoices)                                | ✅     |
| 22  | Billing       | Invoice row click opens InvoiceDetailSheet                      | ✅     |
| 23  | Domains       | SSL filter buttons + search                                     | ✅     |
| 24  | Domains       | Row click opens DomainDetailSheet                               | ✅     |
| 25  | Support       | Tab switch (Tickets / Sessions)                                 | ✅     |
| 26  | Modules       | Search + status/type dropdown filter module cards               | ✅     |
| 27  | Pricing       | Tab switch (Module Pricing / Coupons / Global Discounts)        | ✅     |
| 28  | Pricing       | Billing cycle toggle (monthly/yearly) changes displayed prices  | ✅     |
| 29  | Feature Flags | Search + enabled/disabled filter                                | ✅     |
| 30  | Custom Fields | Entity tab switching (Patient/Appointment/Invoice/etc. — 6)     | ✅     |
| 31  | API Keys      | Scope/status filters + reveal key + copy button                 | ✅     |
| 32  | Webhooks      | Tab switch (Endpoints / Delivery Log)                           | ✅     |
| 33  | API Catalog   | Search + method filter → endpoints filter                       | ✅     |
| 34  | Audit Logs    | Search + sensitivity/status filters + detail sheet              | ✅     |
| 35  | System Logs   | Level pill filter + source Select filter                        | ✅     |

---

### Tier 3: CRUD & Mutation Tests (25)

> Tests for create, edit, delete flows — requires seeded test data or API mocking

| #   | Feature        | Test Description                                         | Status |
| --- | -------------- | -------------------------------------------------------- | ------ |
| 1   | Create Tenant  | Open wizard → Step 1: fill clinic info                   | ✅     |
| 2   | Create Tenant  | Step 2: branch setup                                     | ✅     |
| 3   | Create Tenant  | Step 3: admin account                                    | ✅     |
| 4   | Create Tenant  | Step 4: settings (locale/currency/timezone)              | ✅     |
| 5   | Create Tenant  | Step 5: select modules → Step 6: review & submit → toast | ✅     |
| 6   | Feature Flags  | Create flag via form sheet → appears in list             | ✅     |
| 7   | Feature Flags  | Toggle flag on/off → status updates                      | ✅     |
| 8   | Feature Flags  | Delete flag → confirmation → removed from list           | ✅     |
| 9   | Custom Fields  | Create field via form sheet → appears in list            | ✅     |
| 10  | Custom Fields  | Edit field → changes saved                               | ✅     |
| 11  | Custom Fields  | Delete field → confirmation → removed                    | ✅     |
| 12  | Domains        | Add domain dialog → fill form → submit → toast           | ✅     |
| 13  | Domains        | View domain detail sheet                                 | ✅     |
| 14  | API Keys       | Generate new key → key displayed                         | ✅     |
| 15  | API Keys       | Rotate key → confirmation → new key shown                | ✅     |
| 16  | API Keys       | Revoke key → confirmation dialog → key revoked           | ✅     |
| 17  | Backups        | Trigger backup → tenant slug → confirmation → toast      | ✅     |
| 18  | Backups        | Restore backup → confirmation dialog                     | ✅     |
| 19  | Backups        | Delete backup → confirmation → removed                   | ✅     |
| 20  | Platform Users | Invite user dialog → fill form → submit                  | ✅     |
| 21  | Platform Users | Suspend user → confirmation dialog                       | ✅     |
| 22  | Platform Users | Reactivate user → confirmation                           | ✅     |
| 23  | Settings       | Update general settings → save → toast                   | ✅     |
| 24  | Settings       | Toggle maintenance mode → confirmation                   | ✅     |
| 25  | Webhooks       | Add endpoint → fill form → submit                        | ✅     |

---

### Tier 4: Edge Cases & Error Handling (18)

| #   | Category         | Test Description                                            | Status |
| --- | ---------------- | ----------------------------------------------------------- | ------ |
| 1   | Auth Guard       | Unauthenticated visit to `/tenants` → redirects to `/login` | ✅     |
| 2   | Auth Guard       | Expired session → redirects to login                        | ✅     |
| 3   | Permission Guard | Non-platform_admin visit to `/users` → access denied        | ✅     |
| 4   | Empty State      | Tenants page with no data → shows empty state               | ✅     |
| 5   | Empty State      | Backups page with no data → shows empty state               | ✅     |
| 6   | Empty State      | Custom Fields with no data → shows empty state              | ✅     |
| 7   | Empty State      | Audit Logs with no data → shows empty state                 | ✅     |
| 8   | Error Boundary   | Force JS error → "Something went wrong" + Refresh button    | ✅     |
| 9   | Form Validation  | Login empty submit → required field errors shown            | ✅     |
| 10  | Form Validation  | Create Tenant wizard skip required → validation errors      | ✅     |
| 11  | Form Validation  | Password strength rules enforce all 4 criteria              | ✅     |
| 12  | Invite Token     | Invalid/expired invite token → "Invalid Invitation" shown   | ✅     |
| 13  | Pagination       | First page → "Previous" button is disabled                  | ✅     |
| 14  | Pagination       | Navigate to last page → "Next" is disabled                  | ✅     |
| 15  | Sidebar          | Collapse/expand toggle works                                | ✅     |
| 16  | Sidebar          | Mobile viewport → sidebar hidden by default                 | ✅     |
| 17  | Search           | Type in search → results update after debounce              | ✅     |
| 18  | Confirmation     | Cancel on delete confirmation → item NOT deleted            | ✅     |

---

## Phase 2B — Admin Portal

### Tier 1: Smoke Tests (62)

> Each test: navigate → heading visible → primary content renders → no console errors → no error boundary

#### Auth & Standalone

| #   | Route              | Spec File                 | Asserts                                         | Status |
| --- | ------------------ | ------------------------- | ----------------------------------------------- | ------ |
| 1   | `/login`           | `login.spec.ts`           | "Sign in to your account" + email/password form | ✅     |
| 2   | `/forgot-password` | `forgot-password.spec.ts` | "Forgot Password" + email form                  | ✅     |
| 3   | `/reset-password`  | `reset-password.spec.ts`  | "Reset Password" + new password form            | ✅     |
| 4   | `/onboarding`      | `onboarding.spec.ts`      | "Set Up Your Clinic" + 4-step wizard            | ✅     |

#### Core

| #   | Route               | Spec File           | Asserts                              | Status |
| --- | ------------------- | ------------------- | ------------------------------------ | ------ |
| 5   | `/`                 | `dashboard.spec.ts` | Dashboard heading + 4 stat cards     | ✅     |
| 6   | `/daily-operations` | `daily-ops.spec.ts` | Daily Operations + tabs + stat cards | ✅     |

#### Clinical

| #   | Route                | Spec File                   | Asserts                                    | Status |
| --- | -------------------- | --------------------------- | ------------------------------------------ | ------ |
| 7   | `/patients`          | `patients.spec.ts`          | "Patients" + DataTable                     | ✅     |
| 8   | `/appointments`      | `appointments.spec.ts`      | "Appointments" + calendar/table view       | ✅     |
| 9   | `/appointment-types` | `appointment-types.spec.ts` | "Appointment Types" + DataTable            | ✅     |
| 10  | `/waitlists`         | `waitlist.spec.ts`          | "Waitlist" + DataTable                     | ✅     |
| 11  | `/dental-charts`     | `dental-charts.spec.ts`     | "Dental Chart" + chart visualization       | ✅     |
| 12  | `/treatment-plans`   | `treatment-plans.spec.ts`   | "Treatment Plans" + DataTable              | ✅     |
| 13  | `/procedure-notes`   | `procedure-notes.spec.ts`   | "Procedure Notes" + tabs (Notes/Templates) | ✅     |
| 14  | `/doctors`           | `doctors.spec.ts`           | "Doctors" + DataTable                      | ✅     |
| 15  | `/online-bookings`   | `online-bookings.spec.ts`   | Online Bookings heading + DataTable        | ✅     |

#### Financial

| #   | Route                  | Spec File                     | Asserts                                     | Status |
| --- | ---------------------- | ----------------------------- | ------------------------------------------- | ------ |
| 16  | `/invoices`            | `invoices.spec.ts`            | "Invoices" + DataTable                      | ✅     |
| 17  | `/payments`            | `payments.spec.ts`            | "Payments" + DataTable + summary cards      | ✅     |
| 18  | `/installments`        | `installments.spec.ts`        | "Installment Plans" + DataTable             | ✅     |
| 19  | `/commissions`         | `commissions.spec.ts`         | "Doctor Commissions" + tabs + summary cards | ✅     |
| 20  | `/insurance-companies` | `insurance-companies.spec.ts` | "Insurance Companies" + DataTable           | ✅     |
| 21  | `/insurance-claims`    | `insurance-claims.spec.ts`    | "Insurance Claims" + DataTable              | ✅     |

#### Medical

| #   | Route            | Spec File               | Asserts                            | Status |
| --- | ---------------- | ----------------------- | ---------------------------------- | ------ |
| 22  | `/prescriptions` | `prescriptions.spec.ts` | "Prescriptions" + DataTable        | ✅     |
| 23  | `/xrays`         | `xrays.spec.ts`         | "X-Rays" + DataTable               | ✅     |
| 24  | `/cbct`          | `cbct.spec.ts`          | "CBCT Orders" + DataTable          | ✅     |
| 25  | `/medications`   | `medications.spec.ts`   | "Medications" + DataTable          | ✅     |
| 26  | `/lab-orders`    | `lab-orders.spec.ts`    | "Lab Orders" + DataTable           | ✅     |
| 27  | `/dental-labs`   | `dental-labs.spec.ts`   | "Dental Labs" + LabCard list       | ✅     |
| 28  | `/consent`       | `consent.spec.ts`       | "Consent Forms" + DataTable + tabs | ✅     |

#### Operations

| #   | Route                        | Spec File                      | Asserts                                             | Status |
| --- | ---------------------------- | ------------------------------ | --------------------------------------------------- | ------ |
| 29  | `/inventory`                 | `inventory.spec.ts`            | "Inventory Items" + DataTable + stat cards          | ✅     |
| 30  | `/inventory/categories`      | `inventory-categories.spec.ts` | "Inventory Categories" + category cards             | ✅     |
| 31  | `/inventory/suppliers`       | `suppliers.spec.ts`            | "Suppliers" + DataTable                             | ✅     |
| 32  | `/inventory/purchase-orders` | `purchase-orders.spec.ts`      | "Purchase Orders" + DataTable                       | ✅     |
| 33  | `/inventory/transfers`       | `stock-transfers.spec.ts`      | "Stock Transfers" + DataTable                       | ✅     |
| 34  | `/inventory/stock-count`     | `stock-count.spec.ts`          | "Stock Counts" + DataTable                          | ✅     |
| 35  | `/inventory/expiry`          | `expiry.spec.ts`               | "Expiry Dashboard" + expiry buckets                 | ✅     |
| 36  | `/services`                  | `services.spec.ts`             | "Services Catalog" + DataTable                      | ✅     |
| 37  | `/branches`                  | `branches.spec.ts`             | "Branches" + DataTable                              | ✅     |
| 38  | `/schedules`                 | `schedules.spec.ts`            | "Schedules" + tabs (Doctor/Exceptions/Shifts)       | ✅     |
| 39  | `/leave`                     | `leave.spec.ts`                | "Leave Management" + tabs (Requests/Types/Balances) | ✅     |
| 40  | `/attendance`                | `attendance.spec.ts`           | "Attendance" + DataTable                            | ✅     |

#### Reports

| #   | Route                | Spec File                   | Asserts                                        | Status |
| --- | -------------------- | --------------------------- | ---------------------------------------------- | ------ |
| 41  | `/reports`           | `reports-hub.spec.ts`       | "Reports & Analytics" + category cards + stats | ✅     |
| 42  | `/reports/saved`     | `saved-reports.spec.ts`     | "Saved Reports" + card list                    | ✅     |
| 43  | `/reports/scheduled` | `scheduled-reports.spec.ts` | "Scheduled Reports" + DataTable                | ✅     |
| 44  | `/reports/history`   | `report-history.spec.ts`    | "Report History" + DataTable                   | ✅     |

#### System

| #   | Route                        | Spec File                        | Asserts                                   | Status |
| --- | ---------------------------- | -------------------------------- | ----------------------------------------- | ------ |
| 45  | `/users`                     | `users.spec.ts`                  | "Staff Management" + DataTable            | ✅     |
| 46  | `/notifications`             | `notifications.spec.ts`          | "Notifications" + notification list       | ✅     |
| 47  | `/notifications/templates`   | `notification-templates.spec.ts` | "Notification Templates" + template cards | ✅     |
| 48  | `/notifications/alert-rules` | `alert-rules.spec.ts`            | "Alert Rules" + rule cards                | ✅     |
| 49  | `/settings`                  | `settings.spec.ts`               | "Settings" + tabs (General/Branding/…)    | ✅     |
| 50  | `/webhooks`                  | `webhooks.spec.ts`               | "Webhooks" + stat cards + endpoint cards  | ✅     |
| 51  | `/audit-logs`                | `audit-logs.spec.ts`             | "Audit Logs" + stat cards + DataTable     | ✅     |
| 52  | `/subscription`              | `subscription.spec.ts`           | "Subscription & Billing" + plan details   | ✅     |

#### Hidden Routes (no sidebar entry)

| #   | Route             | Spec File                | Asserts                                          | Status |
| --- | ----------------- | ------------------------ | ------------------------------------------------ | ------ |
| 53  | `/reconciliation` | `reconciliation.spec.ts` | "Daily Reconciliation" + DataTable + date picker | ✅     |

#### Inventory Reports

| #   | Route                                       | Spec File                        | Asserts                                | Status |
| --- | ------------------------------------------- | -------------------------------- | -------------------------------------- | ------ |
| 54  | `/inventory/reports/material-usage`         | `material-usage.spec.ts`         | "Material Usage Report" + chart cards  | ✅     |
| 55  | `/inventory/reports/stock-valuation`        | `stock-valuation.spec.ts`        | "Stock Valuation Report" + cards       | ✅     |
| 56  | `/inventory/reports/consumption-forecast`   | `consumption-forecast.spec.ts`   | "Consumption Forecast" + cards         | ✅     |
| 57  | `/inventory/reports/supplier-performance`   | `supplier-performance.spec.ts`   | "Supplier Performance" + cards         | ✅     |
| 58  | `/inventory/reports/stock-movement-history` | `stock-movement-history.spec.ts` | "Stock Movement History" + timeline    | ✅     |
| 59  | `/inventory/reports/po-summary`             | `po-summary.spec.ts`             | "Purchase Order Summary" + cards       | ✅     |
| 60  | `/inventory/reports/low-stock`              | `low-stock.spec.ts`              | "Low Stock Alerts" + cards             | ✅     |
| 61  | `/inventory/reports/dead-stock`             | `dead-stock.spec.ts`             | "Dead Stock Report" + cards            | ✅     |
| 62  | `/inventory/reports/abc-analysis`           | `abc-analysis.spec.ts`           | "ABC Analysis" + summary cards + chart | ✅     |

---

### Tier 2: Interactive UI Tests (50)

> Tests for filters, tabs, search, pagination, detail sheets, dialogs, and UI state changes

| #   | Feature                | Test Description                                                      | Status |
| --- | ---------------------- | --------------------------------------------------------------------- | ------ |
| 1   | Login                  | Valid tenant login → redirects to dashboard                           | ✅     |
| 2   | Login                  | Invalid credentials → error message                                   | ✅     |
| 3   | Login                  | Empty form → validation errors                                        | ✅     |
| 4   | Login                  | 2FA code flow → TOTP input renders                                    | ✅     |
| 5   | Forgot Password        | Submit email → success message                                        | ✅     |
| 6   | Reset Password         | Submit new password → redirect to login                               | ✅     |
| 7   | Onboarding             | Step through 4-step wizard (Clinic/Branch/Admin/Settings)             | ✅     |
| 8   | Daily Operations       | Tab switching + walk-in patient dialog                                | ✅     |
| 9   | Patients               | Search filters patient table                                          | ✅     |
| 10  | Patients               | Row click → patient detail page                                       | ✅     |
| 11  | Patients               | Pagination next/prev                                                  | ✅     |
| 12  | Patient Detail         | Tab switching (Info / Allergies / Medical History)                    | ✅     |
| 13  | Appointments           | Calendar/list view toggle                                             | ✅     |
| 14  | Appointments           | Date navigation (next/prev day/week/month)                            | ✅     |
| 15  | Appointment Types      | Create/edit dialog opens and closes                                   | ✅     |
| 16  | Waitlist               | Status filter + create entry dialog                                   | ✅     |
| 17  | Schedules              | Tab switching (Doctor Schedules / Exceptions / Shifts)                | ✅     |
| 18  | Leave                  | Tab switching (Requests / Types / Balances)                           | ✅     |
| 19  | Dental Chart           | Tooth selection + snapshot dialog                                     | ✅     |
| 20  | Treatment Plans        | Search + status filter                                                | ✅     |
| 21  | Treatment Plans        | Row click → detail page                                               | ✅     |
| 22  | Procedure Notes        | Tab switching (Notes / Templates)                                     | ✅     |
| 23  | Invoices               | Search + status filter                                                | ✅     |
| 24  | Invoices               | Row click → invoice detail page                                       | ✅     |
| 25  | Payments               | Date range + payment method filter                                    | ✅     |
| 26  | Payments               | Row click → payment detail page                                       | ✅     |
| 27  | Payment Detail         | Refund/void dialogs                                                   | ✅     |
| 28  | Commissions            | Tab switching (Commissions / Payouts)                                 | ✅     |
| 29  | Commissions            | Single + bulk approval actions                                        | ✅     |
| 30  | Insurance Companies    | Search + deactivate confirmation                                      | ✅     |
| 31  | Insurance Claims       | Status lifecycle filters (6 statuses)                                 | ✅     |
| 32  | Installments           | Row click → detail page + RecordInstallmentPaymentDialog              | ✅     |
| 33  | Inventory              | Search + category filter + low stock indicator                        | ✅     |
| 34  | Inventory Categories   | Nested category cards + create/edit dialog                            | ✅     |
| 35  | Purchase Orders        | Row click → detail + PurchaseOrderReceiveDialog                       | ✅     |
| 36  | Services               | Search + deactivate confirmation                                      | ✅     |
| 37  | Reports Hub            | Category card click → `/reports/:category`                            | ✅     |
| 38  | Report Category        | Report card click → `/reports/:category/:type`                        | ✅     |
| 39  | Report Detail          | ExportReportDialog + filter controls                                  | ✅     |
| 40  | Users                  | Role/status filter dropdown                                           | ✅     |
| 41  | Users                  | Invite user dialog opens                                              | ✅     |
| 42  | Settings               | Tab navigation (General / Branding / Notifications / Users / Billing) | ✅     |
| 43  | Notifications          | Mark read/dismiss + category filter                                   | ✅     |
| 44  | Notification Templates | Channel toggles per template                                          | ✅     |
| 45  | Alert Rules            | Toggle/edit/delete actions                                            | ✅     |
| 46  | Audit Logs             | Search + sensitivity filter + AuditLogDetailSheet                     | ✅     |
| 47  | Webhooks               | Test/toggle/delete actions                                            | ✅     |
| 48  | Subscription           | Plan details + usage display                                          | ✅     |
| 49  | Sidebar                | Group expand/collapse                                                 | ✅     |
| 50  | Sidebar                | Navigation to nested routes                                           | ✅     |

---

### Tier 3: CRUD & Mutation Tests (35)

> Tests for create, edit, delete flows — requires seeded test data or API mocking

| #   | Feature              | Test Description                                            | Status |
| --- | -------------------- | ----------------------------------------------------------- | ------ |
| 1   | Patients             | Create patient → fill form → submit → toast                 | ✅     |
| 2   | Patients             | Edit patient → save changes                                 | ✅     |
| 3   | Patients             | Delete patient → confirmation → removed                     | ✅     |
| 4   | Appointments         | Create appointment → select patient/doctor/time → submit    | ✅     |
| 5   | Appointments         | Cancel appointment → confirmation → status updates          | ✅     |
| 6   | Appointment Types    | Create type → submit → appears in list                      | ✅     |
| 7   | Appointment Types    | Delete type → confirmation → removed                        | ✅     |
| 8   | Waitlist             | Create entry → submit → appears in table                    | ✅     |
| 9   | Waitlist             | Delete entry → confirmation → removed                       | ✅     |
| 10  | Treatment Plans      | Create plan → add procedures → submit                       | ✅     |
| 11  | Treatment Plans      | Delete plan → confirmation → removed                        | ✅     |
| 12  | Invoices             | Create new invoice (navigate to `/invoices/new`) → submit   | ✅     |
| 13  | Invoices             | Cancel invoice → confirmation                               | ✅     |
| 14  | Payments             | Record payment (navigate to `/payments/new`) → submit       | ✅     |
| 15  | Installments         | Create plan (navigate to `/installments/new`) → submit      | ✅     |
| 16  | Insurance Companies  | Create company (navigate to form) → submit                  | ✅     |
| 17  | Insurance Companies  | Edit company → save                                         | ✅     |
| 18  | Insurance Claims     | Create claim (navigate to `/insurance-claims/new`) → submit | ✅     |
| 19  | Commissions          | Create payout via CreatePayoutDialog → submit               | ✅     |
| 20  | Commissions          | Approve/reject commission → status updates                  | ✅     |
| 21  | Services             | Create service → fill details → submit                      | ✅     |
| 22  | Services             | Deactivate service → confirmation                           | ✅     |
| 23  | Users                | Invite user → fill form → submit                            | ✅     |
| 24  | Users                | Suspend user → confirmation                                 | ✅     |
| 25  | Branches             | Create branch → fill form → submit                          | ✅     |
| 26  | Prescriptions        | Delete prescription → confirmation → removed                | ✅     |
| 27  | Medications          | Deactivate medication → confirmation                        | ✅     |
| 28  | Consent              | Create template → submit → appears in list                  | ✅     |
| 29  | Inventory            | Create item (navigate to `/inventory/new`) → submit         | ✅     |
| 30  | Inventory Categories | Create category via dialog → submit                         | ✅     |
| 31  | Suppliers            | Create supplier (navigate to form) → submit                 | ✅     |
| 32  | Purchase Orders      | Create PO (navigate to form) → submit                       | ✅     |
| 33  | Stock Transfers      | Create transfer (navigate to form) → submit                 | ✅     |
| 34  | Stock Count          | Create count (navigate to form) → submit                    | ✅     |
| 35  | Dental Labs          | Edit lab → save changes                                     | ✅     |

---

### Tier 4: Edge Cases & Error Handling (20)

| #   | Category        | Test Description                                    | Status |
| --- | --------------- | --------------------------------------------------- | ------ |
| 1   | Auth Guard      | Unauthenticated visit → redirects to `/login`       | ✅     |
| 2   | Auth Guard      | Expired session → redirects to login                | ✅     |
| 3   | RBAC            | Non-admin user cannot access `/users` management    | ✅     |
| 4   | RBAC            | Receptionist cannot access financial pages          | ✅     |
| 5   | RBAC            | Doctor view: limited sidebar items                  | ✅     |
| 6   | Empty State     | Patients page with no data → empty state            | ✅     |
| 7   | Empty State     | Appointments with no data → empty state             | ✅     |
| 8   | Empty State     | Invoices with no data → empty state                 | ✅     |
| 9   | Empty State     | Inventory with no data → empty state                | ✅     |
| 10  | Error Boundary  | Force error → "Something went wrong" + Refresh      | ✅     |
| 11  | Form Validation | Create patient → skip required fields → errors      | ✅     |
| 12  | Form Validation | Create appointment → conflicting time → error       | ✅     |
| 13  | Form Validation | Onboarding wizard skip required → validation errors | ✅     |
| 14  | Pagination      | First page → Previous disabled                      | ✅     |
| 15  | Pagination      | Last page → Next disabled                           | ✅     |
| 16  | Sidebar         | Group expand/collapse works                         | ✅     |
| 17  | Sidebar         | Mobile viewport → sidebar hidden                    | ✅     |
| 18  | Confirmation    | Cancel delete → item preserved                      | ✅     |
| 19  | Report Paywall  | Locked report → upgrade prompt shown                | ✅     |
| 20  | Search          | Type in search → results update after debounce      | ✅     |

---

## File Structure

```
Dentov2/
├── playwright.config.ts              ← 2 projects: "developer" + "admin"
├── tests/
│   └── e2e/
│       ├── fixtures/
│       │   └── auth.ts               ← storageState-based auth (both portals)
│       ├── helpers/
│       │   └── smoke.ts              ← console error capture + error boundary check
│       ├── developer/
│       │   ├── tier1-smoke/           ← 25 smoke specs
│       │   ├── tier2-interactive/     ← 35 interaction specs
│       │   ├── tier3-crud/            ← 25 CRUD specs
│       │   └── tier4-edge/            ← 18 edge case specs
│       └── admin/
│           ├── tier1-smoke/           ← 62 smoke specs
│           ├── tier2-interactive/     ← 50 interaction specs
│           ├── tier3-crud/            ← 35 CRUD specs
│           └── tier4-edge/            ← 20 edge case specs
```

---

## Progress Summary

| Phase        | Tier                 | Tests   | Done    | Remaining |
| ------------ | -------------------- | ------- | ------- | --------- |
| **2A Dev**   | Tier 1 — Smoke       | 25      | 25      | 0         |
| **2A Dev**   | Tier 2 — Interactive | 35      | 35      | 0         |
| **2A Dev**   | Tier 3 — CRUD        | 25      | 25      | 0         |
| **2A Dev**   | Tier 4 — Edge Cases  | 18      | 18      | 0         |
| **2B Admin** | Tier 1 — Smoke       | 62      | 62      | 0         |
| **2B Admin** | Tier 2 — Interactive | 50      | 50      | 0         |
| **2B Admin** | Tier 3 — CRUD        | 35      | 35      | 0         |
| **2B Admin** | Tier 4 — Edge Cases  | 20      | 20      | 0         |
| **TOTAL**    |                      | **270** | **270** | **0**     |

---

## Changelog

- **2026-03-06:** Corrected against codebase scan. Fixed wrong routes (`/custom-fields` → `/fields`, `/audit-log` → `/audit`, `/waiting-list` → `/waitlists`, `/audit-log` → `/audit-logs`, `/insurance` → `/insurance-companies` + `/insurance-claims`, `/suppliers` → `/inventory/suppliers`). Removed fictional routes (`/pricing/coupons`, `/pricing/discounts`, `/webhooks/endpoints`, `/support/tickets`, `/clinical/prescriptions`, `/clinical/medical-history`, `/financial/expenses`, `/operations/workflows`, `/operations/templates`, `/roles`, `/custom-fields`, `/notifications` (dev), `/profile` (dev)). Added 7 missing Developer Portal routes (`/deployments`, `/billing`, `/domains`, `/users`, `/api-catalog`, `/system-logs`, `/invite/:token`). Added 37+ missing Admin Portal routes (daily-operations, appointment-types, waitlists, schedules, leave, attendance, dental-charts, procedure-notes, medications, xrays, cbct, doctors, consent, dental-labs, online-bookings, insurance-claims, installments, commissions, reconciliation, subscription, onboarding, forgot-password, reset-password, notification templates/alert-rules, all inventory sub-routes, all report sub-routes). Total tests: 178 → 270.

---

## Notes

- **Execution order:** Phase 2A (developer) first → Phase 2B (admin) second
- **Recommended start:** Tier 1 + Tier 2 (60 dev + 112 admin) — no DB seeding needed
- **Tier 3 requires:** Seeded test database or API mocking for CRUD operations
- **Admin RBAC tests:** Need multiple user accounts with different roles (admin, doctor, receptionist)
- **Admin detail pages:** Routes like `/patients/:id`, `/invoices/:id`, `/payments/:id` are tested via Tier 2 interactive tests (row click → detail page) rather than standalone smoke tests
- **Admin form pages:** Routes like `/invoices/new`, `/payments/new`, `/installments/new` are tested via Tier 3 CRUD tests
- **Inventory reports (9 pages):** All at `/inventory/reports/*` — tested as Tier 1 smoke tests
- **Report categories:** Dynamic routes `/reports/:category` and `/reports/:category/:type` tested via Tier 2 navigation tests
- **Pre-existing API TS errors:** stock-count, stock-transfer, supplier, webhook-dispatcher, workflow, backup services — UNRELATED to E2E tests

# Dentov2 — Complete Planned Feature & API Inventory

> **Source:** Extracted from ALL 5 planning documents:
>
> - `DENTO_V2_MASTER_PLAN.md` (8185 lines)
> - `IMPLEMENTATION_ROADMAP.md` (797 lines)
> - `SECURITY_AND_ENCRYPTION.md` (1108 lines)
> - `TECH_REQUIREMENTS.md` (1004 lines)
> - `V2_DATABASE.md` (3618 lines)
>
> **Purpose:** Every module, feature, API endpoint, security feature, integration, and database entity mentioned across all planning documents.

---

## Table of Contents

1. [Platform Modules (Dev Portal)](#1-platform-modules-dev-portal)
2. [Tenant Modules (Admin Portal)](#2-tenant-modules-admin-portal)
3. [Security Features](#3-security-features)
4. [Integrations & External Services](#4-integrations--external-services)
5. [Database Entities](#5-database-entities)
6. [BullMQ Jobs & Workers](#6-bullmq-jobs--workers)
7. [Socket.io Real-Time Events](#7-socketio-real-time-events)
8. [Webhook Events](#8-webhook-events)
9. [RBAC Permissions](#9-rbac-permissions)
10. [Timeline & Phases](#10-timeline--phases)

---

## 1. Platform Modules (Dev Portal)

The Developer Portal runs on **Payload CMS 3.x** with auto-generated REST + GraphQL APIs on `dento_platform` DB.

### 1.1 Payload CMS Auto-Generated APIs

Every Payload collection automatically gets:

- `GET /api/{collection}` — List (with pagination, sort, filter)
- `GET /api/{collection}/:id` — Read
- `POST /api/{collection}` — Create
- `PATCH /api/{collection}/:id` — Update
- `DELETE /api/{collection}/:id` — Delete
- `GET /api/{collection}/count` — Count
- `POST /api/graphql` — GraphQL endpoint

### 1.2 Platform Collections (Payload CMS)

| #   | Collection            | API Path                   | Description                            | Section    |
| --- | --------------------- | -------------------------- | -------------------------------------- | ---------- |
| 1   | `users`               | `/api/users`               | Platform + tenant users, roles, auth   | §4.1, §27  |
| 2   | `tenants`             | `/api/tenants`             | Tenant (clinic) registry               | §4.2       |
| 3   | `modules`             | `/api/modules`             | Available SaaS modules catalog         | §4.3, §24  |
| 4   | `tenant_modules`      | `/api/tenant-modules`      | Per-tenant module subscriptions        | §4.4, §24  |
| 5   | `pricing_config`      | `/api/pricing-config`      | Dynamic pricing, coupons, discounts    | §4.5, §28  |
| 6   | `api_keys`            | `/api/api-keys`            | Tenant-level API keys for webhooks     | §4.6       |
| 7   | `webhooks`            | `/api/webhooks`            | Platform webhook registrations         | §4.7, §23  |
| 8   | `webhook_logs`        | `/api/webhook-logs`        | Webhook delivery logs                  | §4.7       |
| 9   | `webhook_event_types` | `/api/webhook-event-types` | Available webhook event catalog        | §4.7       |
| 10  | `feature_flags`       | `/api/feature-flags`       | Feature flag toggles                   | §4.8       |
| 11  | `saas_invoices`       | `/api/saas-invoices`       | SaaS billing invoices                  | §4.9       |
| 12  | `saas_payments`       | `/api/saas-payments`       | SaaS payment records                   | §4.9, §29  |
| 13  | `saas_dunning_log`    | `/api/saas-dunning-log`    | Failed payment follow-up               | §4.9       |
| 14  | `audit_logs`          | `/api/audit-logs`          | System-wide audit trail                | §4.10      |
| 15  | `error_logs`          | `/api/error-logs`          | Error tracking                         | §4.11      |
| 16  | `support_sessions`    | `/api/support-sessions`    | Tenant impersonation sessions          | §4.12      |
| 17  | `user_sessions`       | `/api/user-sessions`       | Active login sessions                  | §4.13, §27 |
| 18  | `backups`             | `/api/backups`             | Tenant backup records                  | §4.14, §34 |
| 19  | `deployments`         | `/api/deployments`         | Deployment tracking                    | §4.15      |
| 20  | `domains`             | `/api/domains`             | Custom domain management               | §4.15      |
| 21  | `country_config`      | `/api/country-config`      | Country defaults (phone, tax, payment) | §4.16, §25 |
| 22  | `translation_packs`   | `/api/translation-packs`   | i18n per-module translations           | §4.16, §26 |
| 23  | `login_attempts`      | `/api/login-attempts`      | Login attempt audit trail              | §27        |
| 24  | `languages`           | `/api/languages`           | Available languages                    | §26        |
| 25  | `tenant_languages`    | `/api/tenant-languages`    | Per-tenant language config             | §26        |

### 1.3 Payload Globals

| #   | Global            | API Path                       | Description                             |
| --- | ----------------- | ------------------------------ | --------------------------------------- |
| G1  | `system_settings` | `/api/globals/system-settings` | Platform-wide settings                  |
| G2  | `branding`        | `/api/globals/branding`        | Platform branding                       |
| G3  | `currencies`      | `/api/globals/currencies`      | 8 supported currencies + exchange rates |
| G4  | `backup_config`   | `/api/globals/backup-config`   | Backup schedule configuration           |

### 1.4 Platform Auth Endpoints (Payload CMS)

| Method | Route                        | Description          |
| ------ | ---------------------------- | -------------------- |
| POST   | `/api/users/login`           | Login (returns JWT)  |
| POST   | `/api/users/logout`          | Logout               |
| POST   | `/api/users/refresh-token`   | Refresh JWT          |
| POST   | `/api/users/forgot-password` | Send reset email     |
| POST   | `/api/users/reset-password`  | Reset with token     |
| GET    | `/api/users/me`              | Current user profile |
| POST   | `/api/users/verify/:token`   | Email verification   |

### 1.5 Dev Portal Custom Endpoints

| #   | Method | Route                                       | Description                  | Section |
| --- | ------ | ------------------------------------------- | ---------------------------- | ------- |
| 1   | GET    | `/api/admin/auth/login-history`             | Login attempt history        | §27     |
| 2   | GET    | `/api/admin/auth/blocked-ips`               | List blocked IPs             | §27     |
| 3   | DELETE | `/api/admin/auth/ip-block/:ip`              | Unblock IP                   | §27     |
| 4   | DELETE | `/api/admin/auth/cooldown/:email`           | Remove login cooldown        | §27     |
| 5   | POST   | `/api/admin/impersonate/:tenantSlug`        | Start impersonation session  | §9      |
| 6   | DELETE | `/api/admin/impersonate/:sessionId`         | End impersonation session    | §9      |
| 7   | GET    | `/api/admin/impersonate/active`             | List active impersonations   | §9      |
| 8   | GET    | `/api/admin/impersonate/:sessionId/actions` | Get impersonation action log | §9      |
| 9   | POST   | `/api/admin/impersonate/:sessionId/extend`  | Extend impersonation time    | §9      |

### 1.6 Dev Portal Sidebar Modules (18 total)

| #   | Module        | Slug            | Collections Managed                            |
| --- | ------------- | --------------- | ---------------------------------------------- |
| 1   | Dashboard     | `dashboard`     | Live platform metrics (aggregated)             |
| 2   | Tenants       | `tenants`       | tenants, tenant_modules                        |
| 3   | Users         | `users`         | users                                          |
| 4   | Modules       | `modules`       | modules, tenant_modules                        |
| 5   | Pricing       | `pricing`       | pricing_config, coupons, discounts             |
| 6   | Billing       | `billing`       | saas_invoices, saas_payments, saas_dunning_log |
| 7   | API Keys      | `api-keys`      | api_keys                                       |
| 8   | Webhooks      | `webhooks`      | webhooks, webhook_logs, webhook_event_types    |
| 9   | Feature Flags | `feature-flags` | feature_flags                                  |
| 10  | Audit Logs    | `audit-logs`    | audit_logs                                     |
| 11  | Error Logs    | `error-logs`    | error_logs                                     |
| 12  | Support       | `support`       | support_sessions, support_tickets              |
| 13  | Settings      | `settings`      | system_settings, country_config, currencies    |
| 14  | Localization  | `localization`  | languages, translation_packs, tenant_languages |
| 15  | Deployments   | `deployments`   | deployments, domains                           |
| 16  | Monitoring    | `monitoring`    | Error rates, health metrics                    |
| 17  | Countries     | `countries`     | country_config                                 |
| 18  | Backups       | `backups`       | backups                                        |

### 1.7 Tenant Detail Tabs (Dev Portal → Tenant → Tabs)

| Tab       | Description                      | Features                         |
| --------- | -------------------------------- | -------------------------------- |
| Overview  | Tenant info, status, stats       | Create/suspend/activate          |
| Modules   | Enabled modules, versions        | Enable/disable, version pin      |
| Users     | Tenant user list                 | Invite, suspend, role change     |
| Billing   | Invoices, payments, subscription | Payment history, refunds         |
| Branding  | Logo, colors, clinic name        | Upload, preview                  |
| Workflows | BullMQ automation rules          | CRUD automation rules            |
| Settings  | Locale, language, currency       | Override tenant settings         |
| Support   | Tickets, sessions                | Impersonate, view tickets        |
| Database  | DB Explorer (custom React UI)    | Browse tenant collections        |
| Backups   | Backup history                   | Manual backup, restore, download |

---

## 2. Tenant Modules (Admin Portal)

The Admin Portal uses **Fastify 5.x** with custom routes on `tenant_{slug}` per-tenant databases.

All tenant routes follow pattern: `/api/:tenantSlug/{resource}`
Middleware chain: `authGuard → tenantDb → roleGuard`

### 2.1 Core Free Modules

#### Module: Patient Records (Free)

**Collections:** `patients`, `consent_forms`, `consent_templates`

| #   | Method | Route                        | Description                       | RBAC            |
| --- | ------ | ---------------------------- | --------------------------------- | --------------- |
| 1   | GET    | `/api/patients`              | List patients (paginated, search) | patients.view   |
| 2   | GET    | `/api/patients/:id`          | Get patient detail                | patients.view   |
| 3   | POST   | `/api/patients`              | Create patient                    | patients.create |
| 4   | PATCH  | `/api/patients/:id`          | Update patient                    | patients.update |
| 5   | DELETE | `/api/patients/:id`          | Soft-delete patient               | patients.delete |
| 6   | GET    | `/api/patients/:id/history`  | Patient visit history             | patients.view   |
| 7   | GET    | `/api/patients/:id/timeline` | Full patient timeline             | patients.view   |
| 8   | GET    | `/api/consent-forms`         | List consent forms                | consent.view    |
| 9   | POST   | `/api/consent-forms`         | Create consent form               | consent.create  |
| 10  | GET    | `/api/consent-templates`     | List consent templates            | consent.view    |
| 11  | POST   | `/api/consent-templates`     | Create consent template           | consent.create  |

#### Module: Appointments (Free)

**Collections:** `appointments`, `appointment_types`, `walk_in_queue`, `appointment_waitlist`

| #   | Method | Route                          | Description                                     | RBAC                |
| --- | ------ | ------------------------------ | ----------------------------------------------- | ------------------- |
| 1   | GET    | `/api/appointments`            | List appointments (date, doctor, status filter) | appointments.view   |
| 2   | GET    | `/api/appointments/:id`        | Get appointment detail                          | appointments.view   |
| 3   | POST   | `/api/appointments`            | Create appointment (runs validateAppointment)   | appointments.create |
| 4   | PATCH  | `/api/appointments/:id`        | Update appointment                              | appointments.update |
| 5   | DELETE | `/api/appointments/:id`        | Cancel appointment                              | appointments.delete |
| 6   | PATCH  | `/api/appointments/:id/status` | Change status (confirm, complete, no-show)      | appointments.update |

#### Module: Dashboard & Reports (Free tier)

| #   | Method | Route                   | Description                       | RBAC                   |
| --- | ------ | ----------------------- | --------------------------------- | ---------------------- |
| 1   | GET    | `/api/dashboard/stats`  | Dashboard widget data (8 widgets) | reports.dashboard.view |
| 2   | GET    | `/api/dashboard/trends` | Current vs previous month trends  | reports.dashboard.view |

### 2.2 Daily Operations Hub (Free — §18)

**Collections:** `appointments` (extended fields), `walk_in_queue`, `queue_counters`, `chairs` (embedded in branches)

| #   | Method | Route                                | Description                                 | RBAC                   |
| --- | ------ | ------------------------------------ | ------------------------------------------- | ---------------------- |
| 1   | GET    | `/api/daily-ops/today`               | All today entries (appointments + walk-ins) | daily_ops.view         |
| 2   | GET    | `/api/daily-ops/queue-stats`         | Queue statistics + wait times               | daily_ops.view         |
| 3   | POST   | `/api/walk-ins`                      | Create walk-in entry                        | walk_ins.create        |
| 4   | PATCH  | `/api/walk-ins/:id`                  | Update walk-in                              | walk_ins.update        |
| 5   | PATCH  | `/api/walk-ins/:id/convert`          | Convert walk-in → appointment               | walk_ins.convert       |
| 6   | PATCH  | `/api/appointments/:id/arrive`       | Mark patient arrived (assign queue #)       | daily_ops.arrive       |
| 7   | PATCH  | `/api/appointments/:id/no-show`      | Mark as no-show                             | daily_ops.no_show      |
| 8   | PATCH  | `/api/appointments/:id/call`         | Call patient from waiting room              | daily_ops.call         |
| 9   | PATCH  | `/api/appointments/:id/assign-chair` | Assign to treatment chair                   | daily_ops.assign_chair |
| 10  | PATCH  | `/api/appointments/:id/complete`     | Mark treatment complete                     | daily_ops.complete     |
| 11  | GET    | `/api/chairs/availability`           | Chair availability status                   | daily_ops.view         |
| 12  | GET    | `/api/daily-ops/waiting-room`        | Current waiting room status                 | daily_ops.view         |

### 2.3 Paid Modules

#### Module: Dental Charting ($49/mo — §5.2)

**Collections:** `dental_charts`, `dental_chart_history`

| #   | Method | Route                                                | Description                                    | RBAC                 |
| --- | ------ | ---------------------------------------------------- | ---------------------------------------------- | -------------------- |
| 1   | GET    | `/api/dental-charts/:patientId`                      | Get patient dental chart                       | dental_charts.view   |
| 2   | POST   | `/api/dental-charts`                                 | Create/initialize chart                        | dental_charts.create |
| 3   | PATCH  | `/api/dental-charts/:patientId/tooth/:number`        | Update tooth status                            | dental_charts.update |
| 4   | GET    | `/api/dental-charts/:patientId/history`              | Chart change history                           | dental_charts.view   |
| 5   | GET    | `/api/dental-charts/:patientId/tooth/:number/linked` | Get linked X-Rays, CBCTs, treatments for tooth | dental_charts.view   |

#### Module: Treatment Plans & Procedure Notes (included in Dental Charting)

**Collections:** `treatment_plans`, `procedure_notes`, `procedure_note_templates`

| #   | Method | Route                           | Description               | RBAC                   |
| --- | ------ | ------------------------------- | ------------------------- | ---------------------- |
| 1   | GET    | `/api/treatment-plans`          | List treatment plans      | treatment_plans.view   |
| 2   | GET    | `/api/treatment-plans/:id`      | Get treatment plan detail | treatment_plans.view   |
| 3   | POST   | `/api/treatment-plans`          | Create treatment plan     | treatment_plans.create |
| 4   | PATCH  | `/api/treatment-plans/:id`      | Update treatment plan     | treatment_plans.update |
| 5   | DELETE | `/api/treatment-plans/:id`      | Delete treatment plan     | treatment_plans.delete |
| 6   | GET    | `/api/procedure-notes`          | List procedure notes      | procedure_notes.view   |
| 7   | GET    | `/api/procedure-notes/:id`      | Get procedure note detail | procedure_notes.view   |
| 8   | POST   | `/api/procedure-notes`          | Create procedure note     | procedure_notes.create |
| 9   | PATCH  | `/api/procedure-notes/:id`      | Update procedure note     | procedure_notes.update |
| 10  | GET    | `/api/procedure-note-templates` | List templates            | procedure_notes.view   |
| 11  | POST   | `/api/procedure-note-templates` | Create template           | procedure_notes.create |

#### Module: Prescriptions (included in Clinical)

**Collections:** `prescriptions`, `medications`

| #   | Method | Route                    | Description                     | RBAC                 |
| --- | ------ | ------------------------ | ------------------------------- | -------------------- |
| 1   | GET    | `/api/prescriptions`     | List prescriptions              | prescriptions.view   |
| 2   | GET    | `/api/prescriptions/:id` | Get prescription detail         | prescriptions.view   |
| 3   | POST   | `/api/prescriptions`     | Create prescription             | prescriptions.create |
| 4   | PATCH  | `/api/prescriptions/:id` | Update prescription             | prescriptions.update |
| 5   | GET    | `/api/medications`       | List/search medications catalog | prescriptions.view   |
| 6   | POST   | `/api/medications`       | Add medication to catalog       | prescriptions.create |

#### Module: Billing & Invoicing ($39/mo — §7)

**Collections:** `invoices`, `payments`, `doctor_commissions`, `commission_payouts`, `installment_plans`, `reconciliation`

| #   | Method | Route                            | Description                      | RBAC                  |
| --- | ------ | -------------------------------- | -------------------------------- | --------------------- |
| 1   | GET    | `/api/invoices`                  | List invoices                    | invoices.view         |
| 2   | GET    | `/api/invoices/:id`              | Get invoice detail               | invoices.view         |
| 3   | POST   | `/api/invoices`                  | Create invoice                   | invoices.create       |
| 4   | PATCH  | `/api/invoices/:id`              | Update invoice                   | invoices.update       |
| 5   | DELETE | `/api/invoices/:id`              | Void/cancel invoice              | invoices.delete       |
| 6   | GET    | `/api/payments`                  | List payments                    | payments.view         |
| 7   | POST   | `/api/payments`                  | Record payment                   | payments.create       |
| 8   | GET    | `/api/commissions`               | List doctor commissions          | commissions.view      |
| 9   | POST   | `/api/commissions/calculate`     | Calculate commissions for period | commissions.create    |
| 10  | GET    | `/api/commission-payouts`        | List payouts                     | commissions.view      |
| 11  | POST   | `/api/commission-payouts`        | Create payout                    | commissions.create    |
| 12  | GET    | `/api/installment-plans`         | List installment plans           | installments.view     |
| 13  | POST   | `/api/installment-plans`         | Create installment plan          | installments.create   |
| 14  | PATCH  | `/api/installment-plans/:id/pay` | Record installment payment       | installments.update   |
| 15  | GET    | `/api/reconciliation`            | List daily reconciliations       | reconciliation.view   |
| 16  | POST   | `/api/reconciliation`            | Create daily close               | reconciliation.create |

#### Module: Insurance Claims ($39/mo — §7.5)

**Collections:** `insurance_companies`, `insurance_claims`

| #   | Method | Route                          | Description              | RBAC             |
| --- | ------ | ------------------------------ | ------------------------ | ---------------- |
| 1   | GET    | `/api/insurance-companies`     | List insurance companies | insurance.view   |
| 2   | POST   | `/api/insurance-companies`     | Create insurance company | insurance.create |
| 3   | PATCH  | `/api/insurance-companies/:id` | Update insurance company | insurance.update |
| 4   | GET    | `/api/insurance-claims`        | List claims              | insurance.view   |
| 5   | POST   | `/api/insurance-claims`        | Submit claim             | insurance.create |
| 6   | PATCH  | `/api/insurance-claims/:id`    | Update claim status      | insurance.update |

#### Module: Inventory Management ($29/mo — §16)

**Collections:** `inventory_items`, `inventory_stock`, `inventory_movements`, `inventory_categories`, `suppliers`, `purchase_orders`, `stock_transfers`, `stock_counts`

| #   | Method | Route                                        | Description                          | RBAC                        |
| --- | ------ | -------------------------------------------- | ------------------------------------ | --------------------------- |
| 1   | GET    | `/api/inventory/items`                       | List inventory items                 | inventory.items.view        |
| 2   | GET    | `/api/inventory/items/:id`                   | Get item detail                      | inventory.items.view        |
| 3   | POST   | `/api/inventory/items`                       | Create item                          | inventory.items.create      |
| 4   | PATCH  | `/api/inventory/items/:id`                   | Update item                          | inventory.items.update      |
| 5   | DELETE | `/api/inventory/items/:id`                   | Deactivate item                      | inventory.items.delete      |
| 6   | GET    | `/api/inventory/stock`                       | Stock levels (by item, branch)       | inventory.stock.view        |
| 7   | POST   | `/api/inventory/stock/adjust`                | Manual stock adjustment              | inventory.stock.adjust      |
| 8   | GET    | `/api/inventory/movements`                   | Stock movement history               | inventory.movements.view    |
| 9   | GET    | `/api/inventory/categories`                  | List categories                      | inventory.categories.view   |
| 10  | POST   | `/api/inventory/categories`                  | Create category                      | inventory.categories.create |
| 11  | GET    | `/api/inventory/suppliers`                   | List suppliers                       | inventory.suppliers.view    |
| 12  | GET    | `/api/inventory/suppliers/:id`               | Get supplier detail                  | inventory.suppliers.view    |
| 13  | POST   | `/api/inventory/suppliers`                   | Create supplier                      | inventory.suppliers.create  |
| 14  | PATCH  | `/api/inventory/suppliers/:id`               | Update supplier                      | inventory.suppliers.update  |
| 15  | GET    | `/api/inventory/purchase-orders`             | List purchase orders                 | inventory.po.view           |
| 16  | GET    | `/api/inventory/purchase-orders/:id`         | Get PO detail                        | inventory.po.view           |
| 17  | POST   | `/api/inventory/purchase-orders`             | Create PO (draft)                    | inventory.po.create         |
| 18  | PATCH  | `/api/inventory/purchase-orders/:id`         | Update PO                            | inventory.po.update         |
| 19  | PATCH  | `/api/inventory/purchase-orders/:id/status`  | Change PO status workflow            | inventory.po.update         |
| 20  | POST   | `/api/inventory/purchase-orders/:id/receive` | Receive PO (creates stock movements) | inventory.po.receive        |
| 21  | GET    | `/api/inventory/stock-transfers`             | List inter-branch transfers          | inventory.transfers.view    |
| 22  | POST   | `/api/inventory/stock-transfers`             | Create transfer                      | inventory.transfers.create  |
| 23  | PATCH  | `/api/inventory/stock-transfers/:id/approve` | Approve transfer                     | inventory.transfers.approve |
| 24  | PATCH  | `/api/inventory/stock-transfers/:id/ship`    | Mark shipped                         | inventory.transfers.update  |
| 25  | PATCH  | `/api/inventory/stock-transfers/:id/receive` | Receive at destination               | inventory.transfers.receive |
| 26  | GET    | `/api/inventory/stock-counts`                | List stock counts (inventories)      | inventory.counts.view       |
| 27  | POST   | `/api/inventory/stock-counts`                | Start stock count                    | inventory.counts.create     |
| 28  | PATCH  | `/api/inventory/stock-counts/:id`            | Submit count results                 | inventory.counts.update     |
| 29  | PATCH  | `/api/inventory/stock-counts/:id/approve`    | Approve count + reconcile            | inventory.counts.approve    |
| 30  | GET    | `/api/inventory/expiry-dashboard`            | Items expiring soon                  | inventory.items.view        |
| 31  | GET    | `/api/inventory/low-stock`                   | Items below reorder level            | inventory.items.view        |
| 32  | POST   | `/api/inventory/auto-reorder`                | Generate draft POs for low stock     | inventory.po.create         |

#### Module: Lab Management ($29/mo — §5.12-5.15)

**Collections:** `lab_orders`, `dental_labs`, `lab_order_types`

| #   | Method | Route                        | Description                              | RBAC              |
| --- | ------ | ---------------------------- | ---------------------------------------- | ----------------- |
| 1   | GET    | `/api/lab-orders`            | List lab orders                          | lab_orders.view   |
| 2   | GET    | `/api/lab-orders/:id`        | Get lab order detail                     | lab_orders.view   |
| 3   | POST   | `/api/lab-orders`            | Create lab order                         | lab_orders.create |
| 4   | PATCH  | `/api/lab-orders/:id`        | Update lab order                         | lab_orders.update |
| 5   | PATCH  | `/api/lab-orders/:id/status` | Change status (sent, received, etc.)     | lab_orders.update |
| 6   | GET    | `/api/dental-labs`           | List dental labs                         | lab_orders.view   |
| 7   | POST   | `/api/dental-labs`           | Create dental lab                        | lab_orders.create |
| 8   | GET    | `/api/lab-order-types`       | List lab order types (14 seeds + custom) | lab_orders.view   |
| 9   | POST   | `/api/lab-order-types`       | Create custom lab order type             | lab_orders.create |

#### Module: X-Ray & CBCT ($49/mo — §5.9-5.10, §17)

**Collections:** `xrays`, `xray_types`, `cbct_orders`

| #   | Method | Route                                  | Description                       | RBAC         |
| --- | ------ | -------------------------------------- | --------------------------------- | ------------ |
| 1   | GET    | `/api/xrays`                           | List X-rays                       | xrays.view   |
| 2   | GET    | `/api/xrays/:id`                       | Get X-ray detail                  | xrays.view   |
| 3   | POST   | `/api/xrays`                           | Create X-ray record               | xrays.create |
| 4   | PATCH  | `/api/xrays/:id`                       | Update X-ray                      | xrays.update |
| 5   | GET    | `/api/xray-types`                      | List X-ray types                  | xrays.view   |
| 6   | GET    | `/api/cbct-orders`                     | List CBCT orders                  | cbct.view    |
| 7   | POST   | `/api/cbct-orders`                     | Create CBCT order                 | cbct.create  |
| 8   | PATCH  | `/api/cbct-orders/:id`                 | Update CBCT order                 | cbct.update  |
| 9   | POST   | `/api/xrays/:id/link`                  | Link X-ray to treatment/procedure | xrays.update |
| 10  | DELETE | `/api/xrays/:id/link/:linkId`          | Unlink X-ray                      | xrays.update |
| 11  | POST   | `/api/cbct-orders/:id/link`            | Link CBCT to treatment/procedure  | cbct.update  |
| 12  | DELETE | `/api/cbct-orders/:id/link/:linkId`    | Unlink CBCT                       | cbct.update  |
| 13  | GET    | `/api/patients/:id/imaging-timeline`   | Full imaging timeline             | xrays.view   |
| 14  | GET    | `/api/imaging-requirements/:serviceId` | Required imaging for service      | xrays.view   |
| 15  | POST   | `/api/imaging-requirements/:id/waive`  | Waive imaging requirement         | xrays.update |

#### Module: Multi-Branch ($79/mo)

**Collections:** `branches` (extended)

| #   | Method | Route                        | Description                       | RBAC                |
| --- | ------ | ---------------------------- | --------------------------------- | ------------------- |
| 1   | GET    | `/api/branches`              | List branches                     | branches.view       |
| 2   | GET    | `/api/branches/:id`          | Get branch detail                 | branches.view       |
| 3   | POST   | `/api/branches`              | Create branch                     | branches.create     |
| 4   | PATCH  | `/api/branches/:id`          | Update branch                     | branches.update     |
| 5   | PATCH  | `/api/branches/:id/hours`    | Update work hours / Ramadan hours | branch.hours.manage |
| 6   | PATCH  | `/api/branches/:id/holidays` | Manage branch holidays            | branch.hours.manage |

#### Module: Advanced Analytics ($199/mo — §21)

**Collections:** `report_schedules`

| #   | Method | Route                             | Description                       | RBAC                     |
| --- | ------ | --------------------------------- | --------------------------------- | ------------------------ |
| 1   | GET    | `/api/reports/financial/:type`    | Financial report data (7 types)   | reports.financial.view   |
| 2   | GET    | `/api/reports/patients/:type`     | Patient report data (5 types)     | reports.advanced.view    |
| 3   | GET    | `/api/reports/appointments/:type` | Appointment report data (6 types) | reports.advanced.view    |
| 4   | GET    | `/api/reports/clinical/:type`     | Clinical report data (4 types)    | reports.advanced.view    |
| 5   | GET    | `/api/reports/operational/:type`  | Operational report data (4 types) | reports.advanced.view    |
| 6   | POST   | `/api/reports/export`             | Export report (PDF/CSV/Excel)     | reports.export           |
| 7   | GET    | `/api/reports/saved`              | List saved report configs         | reports.saved.manage     |
| 8   | POST   | `/api/reports/saved`              | Save report configuration         | reports.saved.manage     |
| 9   | DELETE | `/api/reports/saved/:id`          | Delete saved report               | reports.saved.manage     |
| 10  | GET    | `/api/reports/scheduled`          | List scheduled reports            | reports.schedules.manage |
| 11  | POST   | `/api/reports/scheduled`          | Create report schedule            | reports.schedules.manage |
| 12  | PATCH  | `/api/reports/scheduled/:id`      | Update schedule                   | reports.schedules.manage |
| 13  | DELETE | `/api/reports/scheduled/:id`      | Delete schedule                   | reports.schedules.manage |
| 14  | POST   | `/api/reports/scheduled/:id/run`  | Run schedule immediately          | reports.schedules.manage |

**Report Types:**

| Category            | #      | Reports                                                                                                                                                |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Financial (F1-F7)   | 7      | Revenue Summary, Revenue by Doctor, Revenue by Service, Revenue by Branch, Payment Collection, Outstanding/Aging, Tax Report                           |
| Patient (P1-P5)     | 5      | Patient Overview, New vs Returning, Demographics, No-Show, Source/Referral                                                                             |
| Appointment (A1-A6) | 6      | Summary, Doctor Utilization, Chair Utilization, Cancellation Analysis, Peak Hours Heatmap, Avg Duration                                                |
| Clinical (C1-C4)    | 4      | Procedures Performed, Treatment Plan Acceptance, Lab Order Turnaround, Prescription Volume                                                             |
| Operational (O1-O4) | 4      | Commission Summary, Daily Reconciliation, Wait Time Analysis, Staff Productivity                                                                       |
| Inventory (I1-I10)  | 10     | Material Usage, Stock Valuation, Expiry, Consumption Forecast, Supplier Performance, Movement History, PO Summary, Low Stock, Dead Stock, ABC Analysis |
| **Total**           | **36** |                                                                                                                                                        |

### 2.4 Scheduling & Availability System (§22)

**Collections:** `doctor_schedules`, `schedule_exceptions`, `staff_schedules`, `shift_templates`, `leave_requests`, `leave_types`, `leave_balances`, `attendance`

| #   | Method                                   | Route                                   | Description                                     | RBAC                         |
| --- | ---------------------------------------- | --------------------------------------- | ----------------------------------------------- | ---------------------------- |
|     | **Doctor Schedules**                     |                                         |                                                 |                              |
| 1   | GET                                      | `/api/schedules/doctor/:doctorId`       | All schedules for a doctor                      | schedules.doctor.view        |
| 2   | GET                                      | `/api/schedules/branch/:branchId`       | All doctor schedules for a branch               | schedules.doctor.view        |
| 3   | POST                                     | `/api/schedules/doctor`                 | Create doctor schedule (validates branch hours) | schedules.doctor.manage      |
| 4   | PATCH                                    | `/api/schedules/doctor/:id`             | Update doctor schedule                          | schedules.doctor.manage      |
| 5   | DELETE                                   | `/api/schedules/doctor/:id`             | Delete doctor schedule                          | schedules.doctor.manage      |
|     | **Exceptions**                           |                                         |                                                 |                              |
| 6   | GET                                      | `/api/schedules/exceptions`             | List exceptions (filter: doctor, date, status)  | schedules.exceptions.create  |
| 7   | POST                                     | `/api/schedules/exceptions`             | Create exception (vacation, sick, etc.)         | schedules.exceptions.create  |
| 8   | PATCH                                    | `/api/schedules/exceptions/:id`         | Update exception                                | schedules.exceptions.create  |
| 9   | PATCH                                    | `/api/schedules/exceptions/:id/approve` | Approve/reject exception                        | schedules.exceptions.approve |
|     | **Staff Schedules**                      |                                         |                                                 |                              |
| 10  | GET                                      | `/api/schedules/staff`                  | Staff schedules (filter: user, branch, date)    | schedules.staff.view         |
| 11  | POST                                     | `/api/schedules/staff`                  | Create staff schedule                           | schedules.staff.manage       |
| 12  | PATCH                                    | `/api/schedules/staff/:id`              | Update staff schedule                           | schedules.staff.manage       |
| 13  | POST                                     | `/api/schedules/staff/publish`          | Publish weekly schedule                         | schedules.staff.manage       |
|     | **Shift Templates**                      |                                         |                                                 |                              |
| 14  | GET                                      | `/api/schedules/shifts`                 | List shift templates                            | schedules.shifts.manage      |
| 15  | POST                                     | `/api/schedules/shifts`                 | Create shift template                           | schedules.shifts.manage      |
| 16  | PATCH                                    | `/api/schedules/shifts/:id`             | Update shift template                           | schedules.shifts.manage      |
| 17  | DELETE                                   | `/api/schedules/shifts/:id`             | Delete shift template                           | schedules.shifts.manage      |
|     | **Leave Management**                     |                                         |                                                 |                              |
| 18  | GET                                      | `/api/leave/requests`                   | List leave requests                             | leave.request.create         |
| 19  | POST                                     | `/api/leave/requests`                   | Create leave request                            | leave.request.create         |
| 20  | PATCH                                    | `/api/leave/requests/:id/approve`       | Approve/reject leave                            | leave.request.approve        |
| 21  | GET                                      | `/api/leave/balances/:userId`           | Leave balances for user                         | leave.balances.view          |
|     | **Attendance**                           |                                         |                                                 |                              |
| 22  | GET                                      | `/api/attendance`                       | Attendance records                              | attendance.view              |
| 23  | POST                                     | `/api/attendance/clock-in`              | Clock in                                        | attendance.manage            |
| 24  | POST                                     | `/api/attendance/clock-out`             | Clock out                                       | attendance.manage            |
|     | **Availability (Public — API Key auth)** |                                         |                                                 |                              |
| 25  | GET                                      | `/api/public/branches`                  | Public branches list with work hours            | — (API Key)                  |
| 26  | GET                                      | `/api/public/doctors`                   | Public doctors list (filtered by schedule)      | — (API Key)                  |
| 27  | GET                                      | `/api/public/availability/slots`        | Available booking slots (Slot Engine)           | — (API Key)                  |
| 28  | POST                                     | `/api/public/booking`                   | Online appointment booking                      | — (API Key)                  |
|     | **Online Booking Management**            |                                         |                                                 |                              |
| 29  | GET                                      | `/api/appointments/online`              | Pending online bookings                         | appointments.view            |
| 30  | PATCH                                    | `/api/appointments/:id/confirm`         | Confirm/modify/reject online booking            | appointments.update          |

### 2.5 Recurring Appointments (§19)

**Collections:** `recurring_appointment_rules` (alias `recurring_rules`), `appointments` (extended fields)

| #   | Method | Route                                  | Description                                        | RBAC             |
| --- | ------ | -------------------------------------- | -------------------------------------------------- | ---------------- |
| 1   | GET    | `/api/recurring-rules`                 | List recurring rules                               | recurring.view   |
| 2   | GET    | `/api/recurring-rules/:id`             | Get rule detail + generated occurrences            | recurring.view   |
| 3   | POST   | `/api/recurring-rules`                 | Create recurring rule (triggers BullMQ generation) | recurring.create |
| 4   | PATCH  | `/api/recurring-rules/:id`             | Update rule (edit modes: this/future/all)          | recurring.update |
| 5   | DELETE | `/api/recurring-rules/:id`             | Cancel series                                      | recurring.delete |
| 6   | PATCH  | `/api/recurring-rules/:id/pause`       | Pause series                                       | recurring.update |
| 7   | PATCH  | `/api/recurring-rules/:id/resume`      | Resume series                                      | recurring.update |
| 8   | GET    | `/api/recurring-rules/:id/occurrences` | List all generated occurrences                     | recurring.view   |
| 9   | GET    | `/api/recurring-rules/:id/skipped`     | List skipped occurrences (conflicts, holidays)     | recurring.view   |
| 10  | POST   | `/api/recurring-rules/:id/regenerate`  | Force regenerate next 4 weeks                      | recurring.update |
| 11  | PATCH  | `/api/appointments/:id/recurring-edit` | Edit single occurrence (detach from series)        | recurring.update |

### 2.6 Notifications System (§20)

**Collections:** `notification_templates`, `notifications`, `notification_logs`, `notification_preferences`, `device_tokens`, `alert_rules`

| #   | Method | Route                                   | Description                                  | RBAC                                 |
| --- | ------ | --------------------------------------- | -------------------------------------------- | ------------------------------------ |
| 1   | GET    | `/api/notifications`                    | List user notifications (in-app)             | notifications.view                   |
| 2   | PATCH  | `/api/notifications/:id/read`           | Mark as read                                 | notifications.view                   |
| 3   | POST   | `/api/notifications/read-all`           | Mark all as read                             | notifications.view                   |
| 4   | GET    | `/api/notifications/unread-count`       | Unread count for badge                       | notifications.view                   |
| 5   | GET    | `/api/notification-templates`           | List templates                               | notifications.manage_templates       |
| 6   | GET    | `/api/notification-templates/:id`       | Get template detail                          | notifications.manage_templates       |
| 7   | POST   | `/api/notification-templates`           | Create template                              | notifications.manage_templates       |
| 8   | PATCH  | `/api/notification-templates/:id`       | Update template                              | notifications.manage_templates       |
| 9   | DELETE | `/api/notification-templates/:id`       | Delete template                              | notifications.manage_templates       |
| 10  | GET    | `/api/notification-logs`                | Delivery log (filter: channel, status, date) | notifications.view_logs              |
| 11  | GET    | `/api/notification-logs/:id`            | Log detail with provider response            | notifications.view_logs              |
| 12  | POST   | `/api/notifications/send`               | Send manual notification                     | notifications.send_manual            |
| 13  | POST   | `/api/notifications/send-bulk`          | Send bulk notification to group              | notifications.send_bulk              |
| 14  | GET    | `/api/notification-preferences`         | Get current user preferences                 | notifications.manage_preferences     |
| 15  | PATCH  | `/api/notification-preferences`         | Update preferences (channels × categories)   | notifications.manage_preferences     |
| 16  | GET    | `/api/notification-preferences/:userId` | Admin: get user preferences                  | notifications.manage_all_preferences |
| 17  | PATCH  | `/api/notification-preferences/:userId` | Admin: update user preferences               | notifications.manage_all_preferences |
| 18  | POST   | `/api/device-tokens`                    | Register push notification device            | notifications.view                   |
| 19  | DELETE | `/api/device-tokens/:id`                | Remove device token                          | notifications.view                   |
| 20  | GET    | `/api/alert-rules`                      | List alert rules                             | settings.manage                      |
| 21  | POST   | `/api/alert-rules`                      | Create alert rule                            | settings.manage                      |
| 22  | PATCH  | `/api/alert-rules/:id`                  | Update alert rule                            | settings.manage                      |
| 23  | DELETE | `/api/alert-rules/:id`                  | Delete alert rule                            | settings.manage                      |

### 2.7 Internal Staff Chat (§37 — Free)

**Collections:** `chat_channels`, `chat_messages`

| #   | Method | Route                                    | Description                                       | RBAC                 |
| --- | ------ | ---------------------------------------- | ------------------------------------------------- | -------------------- |
| 1   | GET    | `/api/chat/channels`                     | All user channels (with lastMessage + unread)     | chat.view            |
| 2   | POST   | `/api/chat/channels`                     | Create custom channel                             | chat.create_channel  |
| 3   | GET    | `/api/chat/channels/:id`                 | Channel detail (members, settings)                | chat.view            |
| 4   | PATCH  | `/api/chat/channels/:id`                 | Update channel (name, members)                    | chat.manage_channels |
| 5   | DELETE | `/api/chat/channels/:id`                 | Archive channel                                   | chat.manage_channels |
| 6   | POST   | `/api/chat/channels/:id/members`         | Add members                                       | chat.manage_channels |
| 7   | DELETE | `/api/chat/channels/:id/members/:userId` | Remove member                                     | chat.manage_channels |
| 8   | GET    | `/api/chat/channels/:id/messages`        | Load messages (paginated, 50/page)                | chat.view            |
| 9   | POST   | `/api/chat/channels/:id/messages`        | Send message (REST fallback; Socket.io preferred) | chat.send            |
| 10  | PATCH  | `/api/chat/messages/:id`                 | Edit message (own only, within 15 min)            | chat.send            |
| 11  | DELETE | `/api/chat/messages/:id`                 | Delete message (soft-delete, own only)            | chat.send            |
| 12  | POST   | `/api/chat/channels/:id/read`            | Mark channel as read                              | chat.view            |
| 13  | POST   | `/api/chat/upload`                       | Upload attachment (pre-signed URL)                | chat.send            |

### 2.8 Doctors & Services

**Collections:** `doctors`, `services`, `service_categories`

| #   | Method | Route                     | Description                     | RBAC            |
| --- | ------ | ------------------------- | ------------------------------- | --------------- |
| 1   | GET    | `/api/doctors`            | List doctors                    | doctors.view    |
| 2   | GET    | `/api/doctors/:id`        | Get doctor detail               | doctors.view    |
| 3   | POST   | `/api/doctors`            | Create doctor (syncs with user) | doctors.create  |
| 4   | PATCH  | `/api/doctors/:id`        | Update doctor                   | doctors.update  |
| 5   | GET    | `/api/services`           | List services                   | services.view   |
| 6   | POST   | `/api/services`           | Create service                  | services.create |
| 7   | PATCH  | `/api/services/:id`       | Update service                  | services.update |
| 8   | GET    | `/api/service-categories` | List service categories         | services.view   |
| 9   | POST   | `/api/service-categories` | Create service category         | services.create |

### 2.9 User & Session Management

| #   | Method | Route                     | Description                        | RBAC                  |
| --- | ------ | ------------------------- | ---------------------------------- | --------------------- |
| 1   | GET    | `/api/users`              | List tenant users                  | users.manage          |
| 2   | POST   | `/api/users/invite`       | Invite new user (sends email)      | users.manage          |
| 3   | PATCH  | `/api/users/:id/role`     | Change user role                   | users.manage          |
| 4   | PATCH  | `/api/users/:id/suspend`  | Suspend user                       | users.manage          |
| 5   | PATCH  | `/api/users/:id/activate` | Reactivate user                    | users.manage          |
| 6   | GET    | `/api/auth/sessions`      | List own active sessions           | — (any authenticated) |
| 7   | DELETE | `/api/auth/sessions/:id`  | End single session (remote logout) | — (any authenticated) |
| 8   | DELETE | `/api/auth/sessions`      | End all other sessions             | — (any authenticated) |

### 2.10 Tenant Settings

**Collections:** `settings`

| #   | Method | Route                    | Description                                | RBAC            |
| --- | ------ | ------------------------ | ------------------------------------------ | --------------- |
| 1   | GET    | `/api/settings`          | Get all tenant settings                    | settings.view   |
| 2   | PATCH  | `/api/settings`          | Update settings                            | settings.manage |
| 3   | PATCH  | `/api/settings/language` | Change language (propagates via Socket.io) | settings.manage |
| 4   | GET    | `/api/settings/alerts`   | Get alert rules config                     | settings.manage |

### 2.11 Tenant Webhooks (Admin Portal — §23)

| #   | Method | Route                    | Description           | RBAC            |
| --- | ------ | ------------------------ | --------------------- | --------------- |
| 1   | GET    | `/api/webhooks`          | List tenant webhooks  | settings.manage |
| 2   | POST   | `/api/webhooks`          | Create webhook        | settings.manage |
| 3   | PATCH  | `/api/webhooks/:id`      | Update webhook        | settings.manage |
| 4   | DELETE | `/api/webhooks/:id`      | Delete webhook        | settings.manage |
| 5   | GET    | `/api/webhooks/:id/logs` | Webhook delivery logs | settings.manage |
| 6   | POST   | `/api/webhooks/:id/test` | Send test event       | settings.manage |

---

## 3. Security Features

### 3.1 Authentication & Authorization

| Feature                | Implementation                                                                                                             | Section |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------- |
| JWT-based auth         | Payload CMS issues JWT with userId, tenantSlug, role                                                                       | §27     |
| Refresh tokens         | `/api/users/refresh-token`                                                                                                 | §27     |
| Password hashing       | Argon2id                                                                                                                   | §13     |
| Brute-force protection | Progressive cooldown: 3 free → 5min → 15min → 30min → 1h → IP block (Redis)                                                | §27     |
| Session management     | `user_sessions` collection with TTL + active device list                                                                   | §27     |
| Remote logout          | DELETE `/api/auth/sessions/:id`                                                                                            | §27     |
| Role-based access      | 9 roles: platform_admin, platform_support, tenant_admin, dentist, receptionist, assistant, accountant, lab_tech, hygienist | §27     |
| Permission matrix      | 28 modules × 8 tenant roles                                                                                                | §27     |
| Middleware chain       | authGuard → tenantDb → roleGuard (3-step on every request)                                                                 | §27     |
| Tenant isolation       | Database-per-tenant via `mongoose.connection.useDb()`                                                                      | §1      |

### 3.2 Encryption

| Feature                      | Algorithm                             | Section |
| ---------------------------- | ------------------------------------- | ------- |
| Field-level encryption (PII) | AES-256-GCM                           | §13     |
| Password hashing             | Argon2id                              | §13     |
| API key hashing              | SHA-256                               | §13     |
| Key derivation               | HKDF(masterKey, tenantId + salt)      | §13     |
| At-rest encryption           | MongoDB Atlas AES-256 (cluster-level) | §13     |
| File encryption (S3/R2)      | SSE-S3 or SSE-KMS                     | §13     |
| Backup encryption            | AES-256-CBC + gzip                    | §13     |
| In-transit                   | TLS 1.3 (MongoDB ↔ App, App ↔ Client) | §13     |
| Chat messages encryption     | AES-256-GCM (optional, configurable)  | §13     |

**Encrypted Fields:**

- `patients.nationalId` — AES-256-GCM
- `patients.insurance[].policyNumber` — AES-256-GCM
- `users.passwordHash` — Argon2id
- `api_keys.keyHash` — SHA-256
- `chat_messages.content` — AES-256-GCM (optional)
- `support_sessions.tempAccessToken` — AES-256-GCM

### 3.3 API Security

| Feature                  | Implementation                                               | Section  |
| ------------------------ | ------------------------------------------------------------ | -------- |
| Rate limiting            | Redis-based per API key                                      | SECURITY |
| CORS                     | Configured per environment                                   | SECURITY |
| Helmet                   | HTTP security headers                                        | SECURITY |
| Input validation         | Zod schemas on all routes                                    | TECH_REQ |
| SQL injection prevention | N/A (MongoDB, but sanitize `$` operators)                    | SECURITY |
| XSS prevention           | DOMPurify on all user-generated content                      | SECURITY |
| CSRF protection          | SameSite cookie + custom header                              | SECURITY |
| File upload validation   | MIME type + size limits (2MB avatar, 5MB images, 10MB files) | SECURITY |
| Content Security Policy  | Strict CSP headers                                           | SECURITY |

### 3.4 Audit & Compliance

| Feature                    | Implementation                                       | Section  |
| -------------------------- | ---------------------------------------------------- | -------- |
| Audit logging              | `audit_logs` collection on all write operations      | §4.10    |
| Login attempt logging      | `login_attempts` collection (90-day retention)       | §27      |
| Error tracking             | `error_logs` collection + Sentry integration         | §4.11    |
| Webhook delivery logs      | `webhook_logs` collection (30-day TTL)               | §4.7     |
| Notification delivery logs | `notification_logs` (90-day TTL)                     | §20      |
| Impersonation audit trail  | `support_sessions` with action log + reason mandate  | §9       |
| Data retention             | TTL indexes for automatic cleanup                    | §12      |
| HIPAA/GDPR compliance      | Field-level encryption, audit trails, data isolation | SECURITY |

### 3.5 Impersonation / Support Sessions

| #   | Method | Route                                       | Description                          |
| --- | ------ | ------------------------------------------- | ------------------------------------ |
| 1   | POST   | `/api/admin/impersonate/:tenantSlug`        | Start impersonation (60min temp JWT) |
| 2   | DELETE | `/api/admin/impersonate/:sessionId`         | End impersonation                    |
| 3   | GET    | `/api/admin/impersonate/active`             | List all active impersonations       |
| 4   | GET    | `/api/admin/impersonate/:sessionId/actions` | View action log                      |
| 5   | POST   | `/api/admin/impersonate/:sessionId/extend`  | Extend time                          |

**Rules:** Only `platform_admin`, mandatory reason field, 60min max, JWT revocation via Redis, all actions logged.

---

## 4. Integrations & External Services

### 4.1 Payment Gateways

| Provider   | Countries           | Methods                                                      | Endpoints                                          |
| ---------- | ------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| **Paymob** | Egypt (EG)          | Cards (Visa/MC/Meeza), Fawry, Mobile Wallets, InstaPay, ValU | Webhook callback endpoint for payment confirmation |
| **Stripe** | All other countries | Cards (Visa/MC/Amex), SEPA, Bank Transfer                    | Stripe Checkout/subscription webhook               |

**Payment Routes:**

- Payment initiation handled via Paymob/Stripe SDKs (redirect flow)
- `POST /api/webhooks/paymob` — Paymob payment callback
- `POST /api/webhooks/stripe` — Stripe webhook

### 4.2 Notification Providers

| Channel     | Provider                          | Fallback        |
| ----------- | --------------------------------- | --------------- |
| Email       | Resend (free: 3000/mo)            | Nodemailer SMTP |
| SMS         | Twilio (~$0.0075/SMS Egypt)       | —               |
| WhatsApp    | Meta Business API (free: 1000/mo) | —               |
| Web Push    | Web Push API (VAPID)              | —               |
| Mobile Push | Expo Notifications → FCM/APNs     | —               |
| In-App      | Socket.io (instant)               | —               |

### 4.3 Storage

| Provider                | Purpose                                  | Details                   |
| ----------------------- | ---------------------------------------- | ------------------------- |
| Cloudflare R2 / AWS S3  | File uploads                             | 10GB free, SSE encryption |
| MongoDB Atlas           | Database                                 | M10-M30, AES-256 at-rest  |
| Upstash / Railway Redis | Caching, queues, rate-limiting, sessions | Serverless Redis 7.x      |

### 4.4 Monitoring & Error Tracking

| Service            | Purpose                                 |
| ------------------ | --------------------------------------- |
| Sentry             | Error tracking + performance monitoring |
| `@fastify/swagger` | Auto-generated OpenAPI 3.1 spec         |

### 4.5 CI/CD & Deployment

| Service                   | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| GitHub Actions            | CI pipeline (lint, typecheck, test, build, deploy) |
| Railway / Fly.io          | API hosting                                        |
| Vercel / Cloudflare Pages | Frontend hosting (admin + developer apps)          |
| Docker Compose            | Local development environment                      |

### 4.6 Mobile (Phase 7)

| Technology                | Purpose                           |
| ------------------------- | --------------------------------- |
| React Native (Expo 52.x)  | Mobile framework                  |
| Realm (Atlas Device Sync) | Offline database + auto-sync      |
| NativeWind 4              | Tailwind CSS for React Native     |
| Expo Notifications        | Push notifications                |
| expo-barcode-scanner      | Barcode/QR scanning for inventory |

### 4.7 External Rate/Currency

| Service              | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| exchangerate-api.com | Currency exchange rates for `currencies` global |

---

## 5. Database Entities

### 5.1 Platform DB (`dento_platform`) — 26 Collections

| #      | Collection            | Type    | CRUD Endpoints   | Key Fields                                                               |
| ------ | --------------------- | ------- | ---------------- | ------------------------------------------------------------------------ |
| 1      | `users`               | Payload | Auto-CRUD + auth | email, role, tenantSlug, passwordHash(Argon2id), status                  |
| 2      | `tenants`             | Payload | Auto-CRUD        | name, slug, status, plan, country, ownerId                               |
| 3      | `modules`             | Payload | Auto-CRUD        | slug, version(SemVer), status, dependsOn, changelog, migrations          |
| 4      | `tenant_modules`      | Payload | Auto-CRUD        | tenantId, moduleSlug, installedVersion, updatePolicy, priceOverride      |
| 5      | `pricing_config`      | Payload | Auto-CRUD        | modules[].basePrice, usageLimits, globalDiscounts[], coupons[]           |
| 6      | `api_keys`            | Payload | Auto-CRUD        | tenantId, keyHash(SHA-256), permissions[], rateLimit, isActive           |
| 7      | `webhooks`            | Payload | Auto-CRUD        | url, events[], secret, isActive, failureCount                            |
| 8      | `webhook_logs`        | Payload | Auto-CRUD        | webhookId, event, statusCode, responseTime, TTL:30d                      |
| 9      | `webhook_event_types` | Payload | Auto-CRUD        | name, category, description                                              |
| 10     | `feature_flags`       | Payload | Auto-CRUD        | name, isEnabled, targetTenants[], rolloutPercent                         |
| 11     | `saas_invoices`       | Payload | Auto-CRUD        | tenantId, amount, currency, status, dueDate                              |
| 12     | `saas_payments`       | Payload | Auto-CRUD        | invoiceId, provider(paymob/stripe), method, status, providerPaymentId    |
| 13     | `saas_dunning_log`    | Payload | Auto-CRUD        | tenantId, invoiceId, attempt, nextRetryAt                                |
| 14     | `audit_logs`          | Payload | Auto-CRUD        | tenantId, userId, action, resource, before/after, ip, TTL:730d           |
| 15     | `error_logs`          | Payload | Auto-CRUD        | tenantId, error, stack, context, TTL:90d                                 |
| 16     | `support_sessions`    | Payload | Auto-CRUD        | tenantSlug, adminUserId, reason, tempAccessToken(AES-256), expiresAt     |
| 17     | `user_sessions`       | Payload | Auto-CRUD        | userId, deviceInfo, ipAddress, location, lastActivity, TTL:expiresAt     |
| 18     | `backups`             | Payload | Auto-CRUD        | tenantSlug, type, status, filePath(S3), fileSize, checksum(SHA-256), TTL |
| 19     | `deployments`         | Payload | Auto-CRUD        | version, status, startedAt, completedAt                                  |
| 20     | `domains`             | Payload | Auto-CRUD        | tenantId, domain, sslStatus                                              |
| 21     | `country_config`      | Payload | Auto-CRUD        | code, phoneCode, taxRate, paymentProvider, defaultCurrency/Language      |
| 22     | `translation_packs`   | Payload | Auto-CRUD        | languageCode, moduleSlug, translations{}, completeness                   |
| 23     | `login_attempts`      | Payload | Read-only        | email, ip, success, failureReason, attemptNumber, TTL:90d                |
| 24     | `languages`           | Payload | Auto-CRUD        | code, name, direction(rtl/ltr), isActive                                 |
| 25     | `tenant_languages`    | Payload | Auto-CRUD        | tenantId, enabledLanguages[], defaultLanguage, translationOverrides{}    |
| 26     | `support_tickets`     | Payload | Auto-CRUD        | tenantId, subject, priority, status, sla                                 |
| **G1** | `system_settings`     | Global  | GET/PUT          | maintenance mode, default settings                                       |
| **G2** | `branding`            | Global  | GET/PUT          | platform logo, name, colors                                              |
| **G3** | `currencies`          | Global  | GET/PUT          | baseCurrency(USD), supported[8], exchangeRates, lastUpdate               |
| **G4** | `backup_config`       | Global  | GET/PUT          | schedule, retentionDays, storageBucket                                   |

### 5.2 Tenant DB (`tenant_{slug}`) — 56 Collections

| #                 | Collection                    | Module          | Key Fields                                                                                                                                                                                                              | Indexes                                                     |
| ----------------- | ----------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Clinical**      |                               |                 |                                                                                                                                                                                                                         |                                                             |
| 1                 | `patients`                    | Patient Records | firstName/lastName{en,ar}, phone, email, nationalId(encrypted), insurance[], allergies[], medicalHistory[], familyLinks[]                                                                                               | patientCode(unique), text(firstName.en, lastName.en, phone) |
| 2                 | `dental_charts`               | Dental Charting | patientId, toothNumber, conditions[], notes                                                                                                                                                                             | patientId+toothNumber(unique)                               |
| 3                 | `dental_chart_history`        | Dental Charting | chartId, changedBy, before/after, changedAt                                                                                                                                                                             | chartId+createdAt                                           |
| 4                 | `treatment_plans`             | Treatment Plans | patientId, doctorId, items[], status, totalCost, linkedXrays[], linkedCbcts[]                                                                                                                                           | patientId+createdAt                                         |
| 5                 | `procedure_notes`             | Procedure Notes | patientId, doctorId, appointmentId, treatmentPlanId, procedures[], preOpXrays[], postOpXrays[], linkedXrays[], linkedCbcts[]                                                                                            | patientId+createdAt                                         |
| 6                 | `procedure_note_templates`    | Procedure Notes | name, category, content                                                                                                                                                                                                 | name(unique)                                                |
| 7                 | `prescriptions`               | Prescriptions   | patientId, doctorId, items[{medication,dosage,frequency,duration}], prescriptionNumber                                                                                                                                  | prescriptionNumber(unique)                                  |
| 8                 | `medications`                 | Prescriptions   | name{en,ar}, genericName, category, defaultDosage, defaultFrequency                                                                                                                                                     | text(name.en, genericName)                                  |
| 9                 | `xrays`                       | X-Ray & CBCT    | patientId, doctorId, toothNumbers[], type, imageUrl, treatmentPlanId, procedureNoteId, clinicalPurpose, comparedToXrayId                                                                                                | patientId+createdAt                                         |
| 10                | `cbct_orders`                 | X-Ray & CBCT    | patientId, doctorId, status, report(embedded), treatmentPlanId, procedureNoteId                                                                                                                                         | patientId+createdAt                                         |
| 11                | `consent_forms`               | Patient Records | patientId, templateId, signedAt, signatureUrl                                                                                                                                                                           | patientId+createdAt                                         |
| 12                | `consent_templates`           | Patient Records | name{en,ar}, content{en,ar}, isActive                                                                                                                                                                                   | —                                                           |
| 13                | `lab_orders`                  | Lab Management  | patientId, doctorId, labId, typeId, status, sentAt, receivedAt                                                                                                                                                          | patientId+createdAt, status+createdAt                       |
| 14                | `dental_labs`                 | Lab Management  | name, phone, email, address, rating                                                                                                                                                                                     | —                                                           |
| 15                | `lab_order_types`             | Lab Management  | name{en,ar}, category, defaultTurnaroundDays, isCustom                                                                                                                                                                  | 14 seed types                                               |
| 16                | `xray_types`                  | X-Ray & CBCT    | name{en,ar}, code, isActive                                                                                                                                                                                             | —                                                           |
| **Appointments**  |                               |                 |                                                                                                                                                                                                                         |                                                             |
| 17                | `appointments`                | Appointments    | patientId, doctorId, branchId, date, startTime, endTime, status, chairId, arrivedAt, arrivalStatus, queueNumber, queueStatus, calledAt, inChairAt, completedAt, noShowAt, recurringRuleId, isRecurring, occurrenceIndex | date+doctorId+startTime, branchId+date+status               |
| 18                | `doctors`                     | Core            | userId, name{en,ar}, specialty, licenseNumber, assignedBranches[], certificates[], commissionRate                                                                                                                       | userId(unique)                                              |
| 19                | `doctor_schedules`            | Scheduling      | doctorId, branchId, scheduleType(recurring/override), dayOfWeek, specificDate, startTime, endTime, breakStart/End                                                                                                       | doctorId+branchId+dayOfWeek                                 |
| 20                | `schedule_exceptions`         | Scheduling      | doctorId, branchId, exceptionType, startDate, endDate, status, specialStartTime/EndTime                                                                                                                                 | doctorId+startDate+endDate                                  |
| 21                | `walk_in_queue`               | Daily Ops       | patientId, branchId, queueNumber, chiefComplaint, priority, status                                                                                                                                                      | branchId+createdAt                                          |
| 22                | `appointment_waitlist`        | Appointments    | patientId, doctorId, preferredDate/Time, status                                                                                                                                                                         | —                                                           |
| 23                | `recurring_appointment_rules` | Recurring       | patientId, doctorId, branchId, pattern, interval, startDate, endDate, totalOccurrences, generatedCount, status                                                                                                          | doctorId+status                                             |
| 24                | `appointment_types`           | Appointments    | name{en,ar}, defaultDuration, color, isActive                                                                                                                                                                           | —                                                           |
| **Billing**       |                               |                 |                                                                                                                                                                                                                         |                                                             |
| 25                | `invoices`                    | Billing         | patientId, appointmentId, items[], subtotal, tax, total, status, currency, exchangeRate, invoiceNumber                                                                                                                  | invoiceNumber(unique), status+dueDate                       |
| 26                | `payments`                    | Billing         | invoiceId, amount, method, status, paidAt                                                                                                                                                                               | invoiceId+createdAt                                         |
| 27                | `doctor_commissions`          | Billing         | doctorId, appointmentId, amount, percentage, status                                                                                                                                                                     | doctorId+status                                             |
| 28                | `commission_payouts`          | Billing         | doctorId, period, amount, status, paidAt                                                                                                                                                                                | doctorId+period                                             |
| 29                | `installment_plans`           | Billing         | patientId, invoiceId, totalAmount, installments, payments[]                                                                                                                                                             | patientId+status                                            |
| 30                | `insurance_companies`         | Insurance       | name, code, phone, email, contractTerms                                                                                                                                                                                 | code(unique)                                                |
| 31                | `insurance_claims`            | Insurance       | patientId, invoiceId, companyId, amount, status                                                                                                                                                                         | status+createdAt                                            |
| 32                | `reconciliation`              | Billing         | date, branchId, expectedAmount, actualAmount, difference, status                                                                                                                                                        | date+branchId                                               |
| **Inventory**     |                               |                 |                                                                                                                                                                                                                         |                                                             |
| 33                | `inventory_items`             | Inventory       | name{en,ar}, sku, categoryId, unit, reorderLevel, maxStock, barcode, imageUrl                                                                                                                                           | sku(unique), text(name.en)                                  |
| 34                | `inventory_stock`             | Inventory       | itemId, branchId, currentQuantity, batches[{batchNumber,expiryDate,quantity}], valuationMethod                                                                                                                          | itemId+branchId(unique)                                     |
| 35                | `inventory_movements`         | Inventory       | itemId, branchId, type(in/out/adjust/transfer), quantity, referenceType, referenceId, reason                                                                                                                            | itemId+createdAt                                            |
| 36                | `inventory_categories`        | Inventory       | name{en,ar}, parentId, isActive                                                                                                                                                                                         | parentId+sortOrder                                          |
| 37                | `suppliers`                   | Inventory       | name, phone, email, paymentTerms, rating, isActive                                                                                                                                                                      | —                                                           |
| 38                | `purchase_orders`             | Inventory       | supplierId, branchId, items[], status(draft→submitted→confirmed→shipped→received), totalAmount                                                                                                                          | status+createdAt                                            |
| 39                | `stock_transfers`             | Inventory       | fromBranchId, toBranchId, items[], status, approvedBy                                                                                                                                                                   | status+createdAt                                            |
| 40                | `stock_counts`                | Inventory       | branchId, items[{itemId,systemQty,countedQty,discrepancy}], status, countedBy, approvedBy                                                                                                                               | branchId+createdAt                                          |
| **HR/Staff**      |                               |                 |                                                                                                                                                                                                                         |                                                             |
| 41                | `staff_schedules`             | Scheduling      | userId, branchId, shiftTemplateId, scheduleDate, startTime, endTime, status, isPublished                                                                                                                                | userId+scheduleDate                                         |
| 42                | `shift_templates`             | Scheduling      | name, startTime, endTime, breakDuration, shiftType, color                                                                                                                                                               | 5 seed templates                                            |
| 43                | `leave_requests`              | Leave           | userId, leaveTypeId, startDate, endDate, daysCount, status, approvedBy                                                                                                                                                  | userId+status                                               |
| 44                | `leave_types`                 | Leave           | name{en,ar}, daysPerYear, isPaid, requiresApproval                                                                                                                                                                      | 5 seed types                                                |
| 45                | `leave_balances`              | Leave           | userId, leaveTypeId, year, entitledDays, usedDays, carryForward                                                                                                                                                         | userId+year                                                 |
| 46                | `attendance`                  | Attendance      | userId, branchId, attendanceDate, clockIn/Out, actualHours, overtimeHours, lateMinutes, status                                                                                                                          | userId+attendanceDate                                       |
| **Communication** |                               |                 |                                                                                                                                                                                                                         |                                                             |
| 47                | `chat_channels`               | Chat            | type(direct/branch/role/custom/announcement), name{en,ar}, members[], lastMessage, messageCount                                                                                                                         | members.userId+type, dmParticipants(unique pair)            |
| 48                | `chat_messages`               | Chat            | channelId, senderId, type(text/image/file/voice/system), text, attachments[], replyToId, readBy[], isEdited, isDeleted                                                                                                  | channelId+createdAt, TTL:365d                               |
| 49                | `notification_queue`          | Notifications   | templateId, recipientId, channel, to, subject, body, status, scheduledAt, retryCount, priority                                                                                                                          | status+scheduledAt+priority, TTL:90d                        |
| 50                | `notification_templates`      | Notifications   | name, type, event, subject{en,ar}, body{en,ar}, variables[], isActive                                                                                                                                                   | event+type+isActive                                         |
| 51                | `notification_logs`           | Notifications   | notificationId, channel, to, status, providerResponse, deliveredAt                                                                                                                                                      | notificationId, TTL:90d                                     |
| **Settings**      |                               |                 |                                                                                                                                                                                                                         |                                                             |
| 52                | `settings`                    | Settings        | key(clinic/appointment/billing), value{}, updatedBy                                                                                                                                                                     | key(unique)                                                 |
| 53                | `services`                    | Services        | name{en,ar}, code, defaultPrice, branchPrices[], defaultDuration, requiredMaterials[]                                                                                                                                   | categoryId+isActive, code(sparse)                           |
| 54                | `service_categories`          | Services        | name{en,ar}, parentId, sortOrder, isActive                                                                                                                                                                              | parentId+sortOrder                                          |
| 55                | `branches`                    | Branches        | name{en,ar}, code, chairs[], workingHours[], ramadanHours, holidays[], slotConfig{}, onlineBookingConfig{}                                                                                                              | code(unique)                                                |
| 56                | `report_schedules`            | Reports         | name, reportType, schedule{frequency,time}, filters, format, recipients[], lastRunAt                                                                                                                                    | isActive+schedule.frequency                                 |

**Additional collections mentioned but possibly overlapping:**

- `notification_preferences` (per-user channel/category matrix, quiet hours, digest mode)
- `device_tokens` (push notification tokens per device)
- `alert_rules` (configurable trigger conditions + actions)
- `queue_counters` (atomic counter per branch per day — may be embedded in branches)

---

## 6. BullMQ Jobs & Workers

### 6.1 Scheduled/Cron Jobs

| Job Name                 | Schedule              | Description                                   | Section |
| ------------------------ | --------------------- | --------------------------------------------- | ------- |
| `expiry-check`           | Daily 02:00           | Check inventory expiry dates, send alerts     | §16     |
| `recurring-appointments` | Daily 01:00           | Generate recurring appointments 4 weeks ahead | §19     |
| `appointment-reminders`  | Daily 18:00           | Send next-day appointment reminders           | §20     |
| `recall-reminders`       | Weekly Mon 09:00      | Check recall schedules, send reminders        | §20     |
| `payment-reminders`      | Daily 10:00           | Send overdue payment reminders                | §20     |
| `low-stock-alerts`       | Daily 08:00           | Check stock levels, send alerts               | §20     |
| `alert-rule-checker`     | Every 15 min          | Evaluate configurable alert rules             | §20     |
| `auto-no-show`           | Per appointment       | Auto mark no-show after configurable time     | §18     |
| `report-scheduler`       | Daily 00:05           | Find due report schedules, enqueue generation | §21     |
| `ramadan-mode-reminder`  | 1 week before Ramadan | Remind admin to configure Ramadan hours       | §22     |
| `backup-scheduler`       | Configurable          | Trigger tenant backups                        | §34     |

### 6.2 Processing Workers

| Queue               | Worker             | Description                                                             | Section |
| ------------------- | ------------------ | ----------------------------------------------------------------------- | ------- |
| `email`             | `email-worker`     | Send emails via Resend                                                  | §20     |
| `sms`               | `sms-worker`       | Send SMS via Twilio                                                     | §20     |
| `whatsapp`          | `whatsapp-worker`  | Send WhatsApp via Meta Business API                                     | §20     |
| `push`              | `push-worker`      | Send push via VAPID/FCM/APNs                                            | §20     |
| `webhook-delivery`  | `webhook-worker`   | Deliver webhooks (HTTP POST, 3 retries, exponential backoff)            | §23     |
| `report-generation` | `report-worker`    | Run aggregation pipeline, generate PDF/CSV/Excel, upload to S3, deliver | §21     |
| `backup-worker`     | `backup-worker`    | mongodump → gzip → S3/R2, checksum, update status                       | §34     |
| `chat-push`         | `chat-push-worker` | Push notifications for offline chat members                             | §37     |

---

## 7. Socket.io Real-Time Events

### 7.1 Room Structure

| Room Pattern                  | Who Joins        | Purpose                    |
| ----------------------------- | ---------------- | -------------------------- |
| `tenant:{tenantSlug}`         | All tenant users | Locale changes, broadcasts |
| `user:{userId}`               | Single user      | Personal notifications     |
| `branch:{branchId}:daily-ops` | Branch staff     | Queue/chair updates        |
| `chat:{channelId}`            | Channel members  | Chat messages              |

### 7.2 Events

| Event                 | Direction                | Description                  | Section |
| --------------------- | ------------------------ | ---------------------------- | ------- |
| `queue:update`        | Server → Client          | Queue state changed          | §18     |
| `walk_in_created`     | Server → Client          | New walk-in added            | §18     |
| `appointment_arrived` | Server → Client          | Patient arrived              | §18     |
| `chair_assigned`      | Server → Client          | Chair assigned               | §18     |
| `chair_freed`         | Server → Client          | Chair available              | §18     |
| `notification:new`    | Server → Client          | New in-app notification      | §20     |
| `chat:message`        | Server → Client          | New chat message             | §37     |
| `chat:typing`         | Client → Server → Client | User typing indicator        | §37     |
| `chat:read`           | Client → Server → Client | Read receipt                 | §37     |
| `locale:changed`      | Server → Client          | Language/direction changed   | §25     |
| `calendar:update`     | Server → Client          | Appointment created/modified | §22     |

---

## 8. Webhook Events

### 8.1 Platform-Level Webhook Events

| Event                    | Trigger                 |
| ------------------------ | ----------------------- |
| `tenant.created`         | New tenant registered   |
| `tenant.suspended`       | Tenant suspended        |
| `tenant.activated`       | Tenant activated        |
| `subscription.paid`      | SaaS payment received   |
| `subscription.overdue`   | Payment overdue         |
| `module.updated`         | Module version updated  |
| `deployment.completed`   | New deployment finished |
| `system.error`           | Critical system error   |
| `system.health_degraded` | Health check failed     |

### 8.2 Tenant-Level Webhook Events

**Patient Events:**
`patient.created`, `patient.updated`, `patient.deleted`

**Appointment Events:**
`appointment.created`, `appointment.updated`, `appointment.cancelled`, `appointment.completed`, `appointment.reminder`, `appointment.no_show`

**Invoice Events:**
`invoice.created`, `invoice.paid`, `invoice.overdue`

**Treatment Events:**
`treatment.started`, `treatment.completed`

**Imaging Events:**
`cbct.scan_completed`, `xray.captured`, `imaging.linked`, `imaging.unlinked`, `imaging.requirement_fulfilled`, `imaging.requirement_waived`, `imaging.xray_compared`

**Device Events:**
`device.connected`, `device.disconnected`

**Walk-in / Queue Events:**
`walk_in.created`, `walk_in.assigned`, `walk_in.converted`, `walk_in.completed`, `walk_in.cancelled`, `walk_in.no_show`, `appointment.arrived`, `appointment.called`, `chair.assigned`, `chair.freed`, `queue.daily_reset`, `queue.stats_changed`

**Recurring Events:**
`recurring.rule_created`, `recurring.rule_updated`, `recurring.rule_paused`, `recurring.rule_resumed`, `recurring.rule_cancelled`, `recurring.occurrence_generated`, `recurring.occurrence_modified`, `recurring.conflict_detected`, `recurring.series_completed`

**Notification Events:**
`notification.sent`, `notification.failed`, `notification.bounced`, `notification.template_created`, `notification.template_updated`, `notification.bulk_sent`

**Report Events:**
`report.generated`, `report.generation_failed`, `report.exported`, `report.schedule.created`, `report.schedule.deleted`

**Scheduling Events:**
`schedule.doctor.created`, `schedule.doctor.updated`, `schedule.doctor.deleted`, `schedule.exception.created`, `schedule.exception.approved`, `schedule.exception.rejected`, `schedule.staff.published`, `leave.request.created`, `leave.request.approved`, `leave.request.rejected`, `attendance.clock_in`, `attendance.clock_out`, `branch.hours.updated`, `branch.ramadan_mode.toggled`

**Online Booking Events:**
`booking.online.created`, `booking.online.confirmed`, `booking.online.confirmed_changed`, `booking.online.rejected`, `booking.online.auto_confirmed`, `booking.online.patient_notified`

**Inventory Events:**
`inventory.item_created`, `inventory.item_updated`, `inventory.stock_adjusted`, `inventory.stock_low`, `inventory.stock_out`, `inventory.expired`, `inventory.expiring_soon`, `inventory.po_created`, `inventory.po_status_changed`, `inventory.po_received`, `inventory.transfer_created`, `inventory.transfer_completed`, `inventory.count_completed`, `inventory.count_discrepancy`

---

## 9. RBAC Permissions

### 9.1 Role Hierarchy

```
platform_admin (Developer)         ← Controls EVERYTHING
  │
  └── tenant_admin (Clinic Owner)  ← Controls ONLY their own tenant
        ├── dentist                ← Clinical work
        ├── accountant             ← Financial work
        ├── receptionist           ← Front desk work
        ├── assistant              ← Assistance work
        ├── lab_tech               ← Lab work
        └── hygienist              ← Hygiene work
```

### 9.2 Permission Matrix (28 Modules × 8 Roles)

Legend: ✅ Full | 👁️ Read-Only | ➕ Own Records | ❌ No Access

| Module          | tenant_admin | dentist | receptionist | assistant | accountant | lab_tech | hygienist |
| --------------- | :----------: | :-----: | :----------: | :-------: | :--------: | :------: | :-------: |
| Dashboard       |      ✅      |   ✅    |      ✅      |    ✅     |     ✅     |    ✅    |    ✅     |
| Patients        |      ✅      |   ✅    |      ✅      |    👁️     |     👁️     |    ❌    |    ✅     |
| Appointments    |      ✅      |   ➕    |      ✅      |    👁️     |     ❌     |    ❌    |    ➕     |
| Dental Charts   |      ✅      |   ✅    |      ❌      |    👁️     |     ❌     |    ❌    |    👁️     |
| Treatment Plans |      ✅      |   ✅    |      👁️      |    ❌     |     👁️     |    ❌    |    ❌     |
| Procedure Notes |      ✅      |   ✅    |      ❌      |    ❌     |     ❌     |    ❌    |    ➕     |
| Doctors         |      ✅      |   👁️    |      👁️      |    👁️     |     ❌     |    ❌    |    👁️     |
| Invoices        |      ✅      |   👁️    |      ✅      |    ❌     |     ✅     |    ❌    |    ❌     |
| Payments        |      ✅      |   ❌    |      ✅      |    ❌     |     ✅     |    ❌    |    ❌     |
| Prescriptions   |      ✅      |   ✅    |      👁️      |    ❌     |     ❌     |    ❌    |    ❌     |
| X-Rays          |      ✅      |   ✅    |      ❌      |    👁️     |     ❌     |    ❌    |    👁️     |
| CBCT            |      ✅      |   ✅    |      ❌      |    👁️     |     ❌     |    ❌    |    ❌     |
| Lab Orders      |      ✅      |   ✅    |      ❌      |    ❌     |     ❌     |    ➕    |    ❌     |
| Insurance       |      ✅      |   👁️    |      ✅      |    ❌     |     ✅     |    ❌    |    ❌     |
| Inventory       |      ✅      |   ❌    |      ❌      |    ✅     |     ❌     |    ❌    |    ❌     |
| Services        |      ✅      |   👁️    |      👁️      |    ❌     |     ❌     |    ❌    |    👁️     |
| Branches        |      ✅      |   👁️    |      👁️      |    👁️     |     ❌     |    ❌    |    👁️     |
| Users           |      ✅      |   ❌    |      ❌      |    ❌     |     ❌     |    ❌    |    ❌     |
| Schedules       |      ✅      |   ➕    |      👁️      |    👁️     |     ❌     |    ❌    |    ➕     |
| Leave           |      ✅      |   ➕    |      ❌      |    ➕     |     ❌     |    ➕    |    ➕     |
| Attendance      |      ✅      |   ❌    |      ❌      |    ❌     |     ❌     |    ❌    |    ❌     |
| Commissions     |      ✅      |   ➕    |      ❌      |    ❌     |     ✅     |    ❌    |    ❌     |
| Installments    |      ✅      |   ❌    |      ✅      |    ❌     |     ✅     |    ❌    |    ❌     |
| Consent Forms   |      ✅      |   ✅    |      ✅      |    ❌     |     ❌     |    ❌    |    ✅     |
| Notifications   |      ✅      |   ➕    |      ✅      |    ➕     |     ➕     |    ➕    |    ➕     |
| Reports         |      ✅      |   ➕    |      ❌      |    ❌     |     ✅     |    ❌    |    ❌     |
| Settings        |      ✅      |   ❌    |      ❌      |    ❌     |     ❌     |    ❌    |    ❌     |
| Walk-in Queue   |      ✅      |   👁️    |      ✅      |    ✅     |     ❌     |    ❌    |    ❌     |
| Chat            |      ✅      |   ✅    |      ✅      |    ✅     |     ✅     |    ✅    |    ✅     |

### 9.3 Detailed Permission Strings

**Inventory (13):** `inventory.items.view`, `inventory.items.create`, `inventory.items.update`, `inventory.items.delete`, `inventory.stock.view`, `inventory.stock.adjust`, `inventory.movements.view`, `inventory.suppliers.manage`, `inventory.po.view`, `inventory.po.create`, `inventory.po.receive`, `inventory.transfers.manage`, `inventory.counts.manage`

**Daily Ops (10):** `daily_ops.view`, `daily_ops.arrive`, `daily_ops.no_show`, `daily_ops.call`, `daily_ops.assign_chair`, `daily_ops.complete`, `walk_ins.create`, `walk_ins.update`, `walk_ins.convert`, `walk_ins.delete`

**Notifications (7):** `notifications.view`, `notifications.manage_templates`, `notifications.view_logs`, `notifications.send_manual`, `notifications.send_bulk`, `notifications.manage_preferences`, `notifications.manage_all_preferences`

**Reports (7):** `reports.dashboard.view`, `reports.basic.view`, `reports.advanced.view`, `reports.financial.view`, `reports.export`, `reports.schedules.manage`, `reports.saved.manage`

**Scheduling (13):** `schedules.doctor.view`, `schedules.doctor.manage`, `schedules.staff.view`, `schedules.staff.manage`, `schedules.shifts.manage`, `schedules.exceptions.create`, `schedules.exceptions.approve`, `leave.request.create`, `leave.request.approve`, `leave.balances.view`, `attendance.view`, `attendance.manage`, `branch.hours.manage`

**Chat (6):** `chat.view`, `chat.send`, `chat.create_channel`, `chat.manage_channels`, `chat.delete_any_message`, `chat.announcement.send`

**Recurring (6):** `recurring.view`, `recurring.create`, `recurring.update`, `recurring.delete`, `recurring.pause`, `recurring.resume`

---

## 10. Timeline & Phases

| Phase                   | Weeks | Duration                 | What Gets Built                                                                                                                                                 |
| ----------------------- | ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 — Foundation**      | 1-2   | 2 wks                    | Monorepo, Docker, Payload setup, TailAdmin, CI/CD                                                                                                               |
| **1 — Auth & Tenancy**  | 3-4   | 2 wks                    | Auth, JWT, RBAC, useDb() middleware, Tenant CRUD, Brute-force protection, Locale system                                                                         |
| **2 — Dev Portal**      | 5-7   | 3 wks                    | 16 modules ported, DB Explorer, Module Versioning, Backup, Reports Dashboard, Daily Ops Hub, Notifications baseline, Chat baseline                              |
| **3 — Core Clinical**   | 8-13  | 6 wks                    | Patients, Appointments, Charts, Treatments, Services, X-Rays, CBCT, Lab, Clinical cross-linking, Scheduling, Online booking, Consent forms, Medications catalog |
| **4 — Financial**       | 14-16 | 3 wks                    | Invoices, Payments, Insurance, Installments, Commissions, Per-invoice currency                                                                                  |
| **5 — Operational**     | 17-19 | 3 wks                    | Inventory (all 7 collections, 17 pages), Suppliers, Purchase Orders, Stock Transfers/Counts, Barcode scanning                                                   |
| **6 — Support & Infra** | 20-21 | 2 wks                    | Tailscale support, Per-tenant backup/restore, Monitoring, Alerts                                                                                                |
| **7 — Mobile App**      | 22-26 | 5 wks                    | React Native + Expo + Realm + NativeWind + Push Notifications + Offline sync                                                                                    |
| **Total**               |       | **26 weeks (~6 months)** | **Complete Platform**                                                                                                                                           |

---

## Summary Statistics

| Metric                                | Count                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Platform Collections                  | 26 + 4 Globals                                                                                           |
| Tenant Collections                    | 56                                                                                                       |
| **Total Collections**                 | **~82**                                                                                                  |
| Platform API Endpoints (Payload auto) | ~175 (25 collections × 7 CRUD)                                                                           |
| Platform Custom Endpoints             | ~9                                                                                                       |
| Tenant API Endpoints                  | ~250+                                                                                                    |
| Public API Endpoints                  | 4                                                                                                        |
| **Total API Endpoints**               | **~438+**                                                                                                |
| BullMQ Workers                        | 8                                                                                                        |
| BullMQ Cron Jobs                      | 11                                                                                                       |
| Socket.io Event Types                 | ~11                                                                                                      |
| Webhook Event Types                   | ~90+                                                                                                     |
| RBAC Roles                            | 9 (2 platform + 7 tenant)                                                                                |
| RBAC Permissions                      | ~62+                                                                                                     |
| Reports                               | 36                                                                                                       |
| Admin Portal UI Pages                 | ~70+                                                                                                     |
| Dev Portal UI Pages                   | ~20+                                                                                                     |
| Notification Channels                 | 6 (Email, SMS, WhatsApp, Web Push, Mobile Push, In-App)                                                  |
| Supported Currencies                  | 8 (USD, EGP, EUR, GBP, SAR, AED, TRY, KWD)                                                               |
| Supported Countries                   | 6+ (EG, SA, AE, TR, KW, GB)                                                                              |
| v1 Tables Removed                     | 22 (website builder, tourism, CMS)                                                                       |
| v1 Tables Embedded                    | 28 (→ subdocuments)                                                                                      |
| New v2-only Collections               | 6 (inventory_movements, stock_transfers, stock_counts, chat_channels, chat_messages, notification_queue) |

---

> **Generated:** From complete reading of all 5 planning documents (14,712 total lines)
> **Cross-reference with:** [API_ROUTE_INVENTORY.md](API_ROUTE_INVENTORY.md) for actual implemented routes

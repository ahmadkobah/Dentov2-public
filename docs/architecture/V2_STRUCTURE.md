# Dento v2 — Projekt-Struktur & Ordner-Architektur

> **Repo:** `dento-v2` (Clean Start, Monorepo)
> **Datum:** 2026-02-25
> **Quelle:** DENTO_V2_MASTER_PLAN.md, TECH_REQUIREMENTS.md, IMPLEMENTATION_ROADMAP.md, SECURITY_AND_ENCRYPTION.md
> **Prinzip:** Feature-basiert, Domain-driven, maximale Wiederverwendung

---

## Inhaltsverzeichnis

1. [Warum Monorepo?](#1-warum-monorepo)
2. [Warum Apps getrennt?](#2-warum-apps-getrennt)
3. [High-Level Übersicht](#3-high-level-übersicht)
4. [Root-Konfiguration](#4-root-konfiguration)
5. [apps/api — Backend](#5-appsapi--backend)
6. [apps/admin — Admin Portal](#6-appsadmin--admin-portal)
7. [apps/developer — Dev Portal](#7-appsdeveloper--dev-portal)
8. [apps/mobile — React Native](#8-appsmobile--react-native)
9. [packages/shared — Geteilter Code](#9-packagesshared--geteilter-code)
10. [packages/ui — UI Komponenten](#10-packagesui--ui-komponenten)
11. [docs/ — Dokumentation](#11-docs--dokumentation)
12. [Naming Conventions](#12-naming-conventions)
13. [Import-Regeln & Dependency Flow](#13-import-regeln--dependency-flow)
14. [Dateigröße-Limits & Splitting](#14-dateigröße-limits--splitting)

---

## 1. Warum Monorepo?

| Vorteil                    | Erklärung                                                      |
| :------------------------- | :------------------------------------------------------------- |
| **Single Source of Truth** | Zod Schemas, Types, Utils einmal definiert → überall gleich    |
| **Atomic Changes**         | API-Schema + Frontend-Form + Validation in einem Commit        |
| **Shared Tooling**         | ESLint, Prettier, TypeScript Config einmal konfiguriert        |
| **Einfaches Refactoring**  | Typ-Änderung in `shared` → TypeScript zeigt sofort alle Fehler |
| **Turborepo Caching**      | Nur geänderte Pakete werden gebaut → schnellere CI             |

### Warum nicht Polyrepo?

| Problem                | Auswirkung                                                     |
| :--------------------- | :------------------------------------------------------------- |
| Schema-Drift           | Frontend erwartet `patientName`, Backend sendet `patient_name` |
| Versions-Mismatch      | Admin v2.3 nutzt API v2.1 → Bugs                               |
| Doppelte Konfiguration | ESLint, Prettier, TypeScript in 5 Repos pflegen                |
| Komplexe CI            | Cross-Repo Deploys koordinieren                                |

---

## 2. Warum Apps getrennt?

Die 4 Apps (API, Admin, Developer, Mobile) sind **separate Ordner** im Monorepo mit **eigenen `package.json`** und **eigenem Build**.

### Entscheidungsmatrix

| Frage                  |       Admin + Dev zusammen?        |         Admin + Dev getrennt?         |
| :--------------------- | :--------------------------------: | :-----------------------------------: |
| Deployment unabhängig? |       ❌ Ein Build für alles       |          ✅ Einzeln deployen          |
| Bundle Size            | ❌ Dev Portal Code im Admin Bundle |       ✅ Nur was gebraucht wird       |
| Routing Isolation      |     ❌ Route-Konflikte möglich     |       ✅ Eigene Router-Instanz        |
| Team-Zugriff           |         ❌ Alles sichtbar          | ✅ Dev Portal nur für Platform-Admins |
| Versionierung          |       ❌ Gemeinsame Version        |    ✅ Admin v2.3, Dev v2.1 möglich    |
| RBAC Komplexität       |   ❌ Routen-Guards für 2 Welten    |     ✅ Jede App kennt ihre Rollen     |
| Shared Components      |          Via `@dento/ui`           |            Via `@dento/ui`            |

**Entscheidung: GETRENNT** — Gleicher Code wird via `packages/` geteilt, jede App wird einzeln gebaut und deployed.

### Deployment-Ziele

| App              | Platform                  | URL               |
| :--------------- | :------------------------ | :---------------- |
| `apps/api`       | Railway / Fly.io          | `api.dento.app`   |
| `apps/admin`     | Vercel / Cloudflare Pages | `admin.dento.app` |
| `apps/developer` | Vercel / Cloudflare Pages | `dev.dento.app`   |
| `apps/mobile`    | App Store / Play Store    | Dento App         |

---

## 3. High-Level Übersicht

```
dento-v2/
│
├── 📁 .github/                    # CI/CD + Templates
├── 📁 .vscode/                    # VS Code Workspace Settings
├── 📁 apps/                       # 4 deploybare Anwendungen
│   ├── 📁 api/                    # Backend (Payload + Fastify)
│   ├── 📁 admin/                  # Admin/Doctor/Staff Portal (React)
│   ├── 📁 developer/              # Dev Portal (React)
│   └── 📁 mobile/                 # Mobile App (Expo/React Native)
│
├── 📁 packages/                   # Geteilte Pakete
│   ├── 📁 shared/                 # Schemas, Types, Utils, Constants
│   └── 📁 ui/                     # UI Komponenten (Shadcn/Radix)
│
├── 📁 docs/                       # Alle Planungsdokumente
│
├── 📄 turbo.json                  # Turborepo Pipeline Config
├── 📄 pnpm-workspace.yaml         # pnpm Workspace Definition
├── 📄 package.json                # Root Scripts + DevDeps
├── 📄 docker-compose.yml          # Lokale Entwicklung (MongoDB + Redis)
├── 📄 .gitignore                  # Globales Ignore
├── 📄 .env.example                # 🔒 Template für alle Environment Variables
├── 📄 .prettierrc                 # Prettier Config
├── 📄 .eslintrc.js                # ESLint Flat Config (Root)
└── 📄 README.md                   # Projekt-Übersicht + Quickstart
```

---

## 4. Root-Konfiguration

```
dento-v2/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # Push → Lint → Type-Check → Test → Build → 🔒 Security Audit
│   │   ├── deploy-api.yml             # Deploy API zu Railway/Fly.io
│   │   ├── deploy-admin.yml           # Deploy Admin zu Vercel
│   │   ├── deploy-developer.yml       # Deploy Developer zu Vercel
│   │   └── security.yml               # 🔒 TruffleHog + Dependabot Check
│   ├── dependabot.yml                 # 🔒 Auto Dependency Updates
│   ├── PULL_REQUEST_TEMPLATE.md       # PR Template
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── .vscode/
│   ├── settings.json                  # Workspace Settings (formatOnSave, etc.)
│   ├── extensions.json                # Empfohlene Extensions
│   └── launch.json                    # Debug Configs (API, Admin, Developer)
│
├── .husky/
│   └── pre-commit                     # lint-staged Hook
│
├── turbo.json                         # Pipeline: dev, build, lint, type-check, test
├── pnpm-workspace.yaml                # packages: ["packages/*", "apps/*"]
├── package.json                       # Root: turbo, prettier, husky, lint-staged
├── tsconfig.base.json                 # Base TypeScript Config (extends in allen Apps)
├── .prettierrc                        # { semi: true, singleQuote: true, tabWidth: 2 }
├── .prettierignore                    # node_modules, dist, .turbo
├── .gitignore                         # node_modules, dist, .turbo, .env*, *.log
├── .env.example                       # 🔒 Alle Vars mit Platzhaltern (nie echte Secrets)
├── docker-compose.yml                 # MongoDB 8.0 + Redis 8 + Adminer (Dev only)
├── LICENSE                            # MIT
└── README.md                          # Quickstart, Architecture Diagram, Links
```

### turbo.json

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": {},
    "type-check": {},
    "test": { "dependsOn": ["^build"] },
  },
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

---

## 5. apps/api — Backend

> **Zwei-Schichten-Architektur:** Payload CMS (Platform Layer) + Fastify (Tenant Layer)
> **Prinzip:** Domain-driven, jedes Feature in eigenem Ordner mit Route + Service + Schema + Test

```
apps/api/
├── src/
│   │
│   ├── server.ts                          # Entry Point: Payload init + Fastify init
│   ├── payload.config.ts                  # Payload CMS Konfiguration
│   │
│   ├── config/                            # ⚙️ Zentrale Konfiguration
│   │   ├── env.ts                         # Environment Variables (typed, validated with Zod)
│   │   ├── database.ts                    # MongoDB Connection (Platform + Tenant useDb())
│   │   ├── redis.ts                       # Redis/Upstash Connection
│   │   ├── s3.ts                          # S3/R2 Client Configuration
│   │   ├── cors.ts                        # 🔒 CORS Whitelist Config
│   │   └── constants.ts                   # App-weite Konstanten
│   │
│   ├── platform/                          # 🏢 SCHICHT 1: Payload CMS (dento_platform DB)
│   │   │
│   │   ├── collections/                   # Payload Collections
│   │   │   ├── users.ts                   # Platform + Tenant Users
│   │   │   ├── tenants.ts                 # Klinik-Registrierung, Status, Config
│   │   │   ├── modules.ts                 # Modul-Katalog + Versioning
│   │   │   ├── tenant-modules.ts          # Per-Tenant Lizenzen
│   │   │   ├── pricing-config.ts          # Modul-Preise, Discounts, Trials
│   │   │   ├── api-keys.ts               # 🔒 API Key Management (SHA-256 gehasht)
│   │   │   ├── support-tickets.ts         # Ticketing System (P1-P4)
│   │   │   ├── support-sessions.ts        # 🔒 Impersonation Sessions (Audit Trail)
│   │   │   ├── saas-payments.ts           # Platform Zahlungen (Paymob/Stripe)
│   │   │   ├── country-config.ts          # Locale + Currency Config
│   │   │   ├── translation-packs.ts       # i18n Übersetzungspakete
│   │   │   ├── feature-flags.ts           # Feature Flag System
│   │   │   ├── deployment-logs.ts         # Deployment History
│   │   │   └── error-logs.ts              # Platform Error Tracking
│   │   │
│   │   ├── globals/                       # Payload Globals (Singleton-Dokumente)
│   │   │   ├── system-settings.ts         # Globale Plattform-Settings
│   │   │   └── maintenance-mode.ts        # Wartungsmodus-Schalter
│   │   │
│   │   ├── hooks/                         # Payload Lifecycle Hooks
│   │   │   ├── before-change/
│   │   │   │   ├── hash-api-key.ts        # 🔒 SHA-256 Hashing vor Speicherung
│   │   │   │   ├── validate-tenant.ts     # Slug-Validation, Duplicate-Check
│   │   │   │   └── audit-log.ts           # 🔒 Before/After Snapshot
│   │   │   └── after-change/
│   │   │       ├── create-tenant-db.ts    # Auto-Seed bei neuem Tenant
│   │   │       ├── fire-webhook.ts        # Platform-Webhook auslösen
│   │   │       └── sync-module-license.ts # Modul-Aktivierung/-Deaktivierung
│   │   │
│   │   └── access/                        # Payload Access Control
│   │       ├── is-platform-admin.ts       # Nur platform_admin
│   │       ├── is-tenant-admin.ts         # tenant_admin für eigenen Tenant
│   │       └── is-authenticated.ts        # Jeder authentifizierte User
│   │
│   ├── tenant/                            # 🏥 SCHICHT 2: Fastify (tenant_{slug} DBs)
│   │   │
│   │   ├── middleware/                    # Fastify Middleware Chain
│   │   │   ├── auth-guard.ts              # 🔒 JWT Verifizierung (Access Token)
│   │   │   ├── tenant-db.ts              # 🔒 mongoose.useDb('tenant_{slug}') aus JWT
│   │   │   ├── role-guard.ts             # 🔒 RBAC Permission Check
│   │   │   ├── rate-limiter.ts           # 🔒 3-Tier Rate Limiting
│   │   │   ├── input-sanitizer.ts        # 🔒 NoSQL Injection Guard ($-Operator Block)
│   │   │   └── audit-logger.ts           # 🔒 Mutation Audit Trail
│   │   │
│   │   ├── models/                        # Mongoose Schemas (Tenant-DB)
│   │   │   ├── patient.model.ts           # patients Collection
│   │   │   ├── appointment.model.ts       # appointments Collection
│   │   │   ├── appointment-type.model.ts  # appointment_types Collection
│   │   │   ├── dental-chart.model.ts      # dental_charts Collection
│   │   │   ├── dental-chart-history.model.ts
│   │   │   ├── treatment-plan.model.ts    # treatment_plans Collection
│   │   │   ├── procedure-note.model.ts    # procedure_notes Collection
│   │   │   ├── procedure-note-template.model.ts
│   │   │   ├── doctor.model.ts            # doctors Collection
│   │   │   ├── doctor-schedule.model.ts   # doctor_schedules Collection
│   │   │   ├── schedule-exception.model.ts
│   │   │   ├── invoice.model.ts           # invoices Collection
│   │   │   ├── payment.model.ts           # payments Collection
│   │   │   ├── prescription.model.ts      # prescriptions Collection
│   │   │   ├── medication.model.ts        # medications Collection
│   │   │   ├── xray.model.ts              # xrays Collection
│   │   │   ├── cbct-order.model.ts        # cbct_orders Collection
│   │   │   ├── cbct-scan.model.ts         # cbct_scans Collection
│   │   │   ├── lab-order.model.ts         # lab_orders Collection
│   │   │   ├── dental-lab.model.ts        # dental_labs Collection
│   │   │   ├── lab-order-type.model.ts    # lab_order_types Collection
│   │   │   ├── insurance-claim.model.ts   # insurance_claims Collection
│   │   │   ├── insurance-company.model.ts # insurance_companies Collection
│   │   │   ├── service.model.ts           # services Collection
│   │   │   ├── service-category.model.ts  # service_categories Collection
│   │   │   ├── branch.model.ts            # branches Collection
│   │   │   ├── chair.model.ts             # chairs Collection
│   │   │   ├── inventory-item.model.ts    # inventory_items Collection
│   │   │   ├── inventory-movement.model.ts
│   │   │   ├── purchase-order.model.ts    # purchase_orders Collection
│   │   │   ├── supplier.model.ts          # suppliers Collection
│   │   │   ├── stock-transfer.model.ts    # stock_transfers Collection
│   │   │   ├── stock-count.model.ts       # stock_counts Collection
│   │   │   ├── leave-request.model.ts     # leave_requests Collection
│   │   │   ├── leave-balance.model.ts     # leave_balances Collection
│   │   │   ├── leave-type.model.ts        # leave_types Collection
│   │   │   ├── attendance.model.ts        # attendance Collection
│   │   │   ├── staff-schedule.model.ts    # staff_schedules Collection
│   │   │   ├── shift-template.model.ts    # shift_templates Collection
│   │   │   ├── commission.model.ts        # doctor_commissions Collection
│   │   │   ├── commission-payout.model.ts
│   │   │   ├── installment-plan.model.ts  # installment_plans Collection
│   │   │   ├── consent-form.model.ts      # consent_forms Collection
│   │   │   ├── consent-template.model.ts  # consent_templates Collection
│   │   │   ├── recurring-rule.model.ts    # recurring_rules Collection
│   │   │   ├── waitlist.model.ts          # waitlist Collection
│   │   │   ├── notification-queue.model.ts
│   │   │   ├── alert-rule.model.ts        # alert_rules Collection
│   │   │   ├── webhook-endpoint.model.ts  # webhook_endpoints (Tenant-Level)
│   │   │   ├── webhook-delivery.model.ts  # webhook_deliveries
│   │   │   ├── custom-field.model.ts      # custom_fields Collection
│   │   │   ├── workflow-rule.model.ts     # workflow_rules Collection
│   │   │   ├── chat-channel.model.ts      # chat_channels Collection
│   │   │   ├── chat-message.model.ts      # chat_messages Collection
│   │   │   ├── audit-log.model.ts         # 🔒 audit_logs Collection
│   │   │   ├── settings.model.ts          # settings Collection (Tenant-Config)
│   │   │   └── index.ts                   # Re-Export aller Models (lazy registration)
│   │   │
│   │   ├── routes/                        # Fastify Route Handler (Feature-basiert)
│   │   │   ├── patients/
│   │   │   │   ├── patients.route.ts      # GET/POST/PUT/DELETE /patients
│   │   │   │   ├── patients.service.ts    # Business Logic
│   │   │   │   └── patients.test.ts       # Route Tests
│   │   │   ├── appointments/
│   │   │   │   ├── appointments.route.ts
│   │   │   │   ├── appointments.service.ts
│   │   │   │   └── appointments.test.ts
│   │   │   ├── dental-charts/
│   │   │   │   ├── dental-charts.route.ts
│   │   │   │   ├── dental-charts.service.ts
│   │   │   │   └── dental-charts.test.ts
│   │   │   ├── treatment-plans/
│   │   │   │   ├── treatment-plans.route.ts
│   │   │   │   ├── treatment-plans.service.ts
│   │   │   │   └── treatment-plans.test.ts
│   │   │   ├── procedure-notes/
│   │   │   │   ├── procedure-notes.route.ts
│   │   │   │   ├── procedure-notes.service.ts
│   │   │   │   └── procedure-notes.test.ts
│   │   │   ├── doctors/
│   │   │   │   ├── doctors.route.ts
│   │   │   │   ├── doctors.service.ts
│   │   │   │   └── doctors.test.ts
│   │   │   ├── invoices/
│   │   │   │   ├── invoices.route.ts
│   │   │   │   ├── invoices.service.ts
│   │   │   │   └── invoices.test.ts
│   │   │   ├── payments/
│   │   │   │   ├── payments.route.ts
│   │   │   │   ├── payments.service.ts
│   │   │   │   └── payments.test.ts
│   │   │   ├── prescriptions/
│   │   │   │   ├── prescriptions.route.ts
│   │   │   │   ├── prescriptions.service.ts
│   │   │   │   └── prescriptions.test.ts
│   │   │   ├── xrays/
│   │   │   │   ├── xrays.route.ts
│   │   │   │   ├── xrays.service.ts
│   │   │   │   └── xrays.test.ts
│   │   │   ├── cbct/
│   │   │   │   ├── cbct.route.ts
│   │   │   │   ├── cbct.service.ts
│   │   │   │   └── cbct.test.ts
│   │   │   ├── lab-orders/
│   │   │   │   ├── lab-orders.route.ts
│   │   │   │   ├── lab-orders.service.ts
│   │   │   │   └── lab-orders.test.ts
│   │   │   ├── insurance/
│   │   │   │   ├── insurance.route.ts
│   │   │   │   ├── insurance.service.ts
│   │   │   │   └── insurance.test.ts
│   │   │   ├── services/
│   │   │   │   ├── services.route.ts
│   │   │   │   ├── services.service.ts
│   │   │   │   └── services.test.ts
│   │   │   ├── branches/
│   │   │   │   ├── branches.route.ts
│   │   │   │   ├── branches.service.ts
│   │   │   │   └── branches.test.ts
│   │   │   ├── inventory/
│   │   │   │   ├── inventory.route.ts
│   │   │   │   ├── inventory.service.ts
│   │   │   │   └── inventory.test.ts
│   │   │   ├── schedules/
│   │   │   │   ├── schedules.route.ts
│   │   │   │   ├── slot-engine.service.ts  # Slot-Berechnung
│   │   │   │   └── schedules.test.ts
│   │   │   ├── leave/
│   │   │   │   ├── leave.route.ts
│   │   │   │   ├── leave.service.ts
│   │   │   │   └── leave.test.ts
│   │   │   ├── attendance/
│   │   │   │   ├── attendance.route.ts
│   │   │   │   ├── attendance.service.ts
│   │   │   │   └── attendance.test.ts
│   │   │   ├── commissions/
│   │   │   │   ├── commissions.route.ts
│   │   │   │   ├── commissions.service.ts
│   │   │   │   └── commissions.test.ts
│   │   │   ├── installments/
│   │   │   │   ├── installments.route.ts
│   │   │   │   ├── installments.service.ts
│   │   │   │   └── installments.test.ts
│   │   │   ├── consent/
│   │   │   │   ├── consent.route.ts
│   │   │   │   ├── consent.service.ts
│   │   │   │   └── consent.test.ts
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.route.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   └── notifications.test.ts
│   │   │   ├── webhooks/
│   │   │   │   ├── webhooks.route.ts       # 🔒 HMAC-SHA256 Signierung
│   │   │   │   ├── webhooks.service.ts
│   │   │   │   └── webhooks.test.ts
│   │   │   ├── chat/
│   │   │   │   ├── chat.route.ts
│   │   │   │   ├── chat.service.ts
│   │   │   │   └── chat.test.ts
│   │   │   ├── reports/
│   │   │   │   ├── reports.route.ts
│   │   │   │   ├── pipelines/              # MongoDB Aggregation Pipelines
│   │   │   │   │   ├── revenue.pipeline.ts
│   │   │   │   │   ├── patient-demographics.pipeline.ts
│   │   │   │   │   ├── appointment-utilization.pipeline.ts
│   │   │   │   │   ├── inventory-valuation.pipeline.ts
│   │   │   │   │   └── ...                 # 36 Report Pipelines
│   │   │   │   └── reports.test.ts
│   │   │   ├── settings/
│   │   │   │   ├── settings.route.ts
│   │   │   │   └── settings.service.ts
│   │   │   ├── custom-fields/
│   │   │   │   ├── custom-fields.route.ts
│   │   │   │   └── custom-fields.service.ts
│   │   │   ├── workflows/
│   │   │   │   ├── workflows.route.ts
│   │   │   │   └── workflows.service.ts
│   │   │   ├── booking/                    # Public API (Online-Booking)
│   │   │   │   ├── booking.route.ts        # 4 Public Endpoints (API Key Auth)
│   │   │   │   └── booking.service.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.route.ts           # Login, Register, Refresh, Logout
│   │   │   │   ├── auth.service.ts         # 🔒 JWT Rotation, Argon2id, Brute-Force
│   │   │   │   ├── totp.service.ts         # 🔒 2FA/MFA (otplib)
│   │   │   │   └── auth.test.ts
│   │   │   └── health/
│   │   │       └── health.route.ts         # /health (DB + Redis + S3 Status)
│   │   │
│   │   ├── services/                      # Shared Business Logic (Cross-Feature)
│   │   │   ├── encryption.service.ts      # 🔒 AES-256-GCM Field Encryption
│   │   │   ├── file-upload.service.ts     # 🔒 Magic-Bytes Check, EXIF Strip, S3 Upload
│   │   │   ├── pdf.service.ts             # @react-pdf/renderer Templates
│   │   │   ├── email.service.ts           # Resend + Nodemailer Fallback
│   │   │   ├── sms.service.ts             # Twilio SMS
│   │   │   ├── push.service.ts            # Web Push (VAPID)
│   │   │   ├── webhook-dispatcher.ts      # 🔒 HMAC Signing + Retry Logic
│   │   │   └── slot-engine.service.ts     # Schedule Slot Calculation
│   │   │
│   │   └── socket/                        # Socket.io Event Handlers
│   │       ├── index.ts                   # Socket.io Server Init + Auth
│   │       ├── chat.handler.ts            # Chat Events (send, typing, read)
│   │       ├── notification.handler.ts    # Real-Time Notification Push
│   │       ├── queue.handler.ts           # Walk-in Queue Updates
│   │       └── calendar.handler.ts        # Appointment Real-Time Sync
│   │
│   ├── jobs/                              # BullMQ Workers (Background Jobs)
│   │   ├── queue.ts                       # Queue Definitions (alle Queues)
│   │   ├── workers/
│   │   │   ├── email.worker.ts            # Email-Versand Queue
│   │   │   ├── sms.worker.ts              # SMS-Versand Queue
│   │   │   ├── push.worker.ts             # Push Notification Queue
│   │   │   ├── whatsapp.worker.ts         # WhatsApp Queue
│   │   │   ├── webhook.worker.ts          # Webhook Delivery + Retry
│   │   │   ├── backup.worker.ts           # 🔒 Daily Backup (mongodump → AES → S3)
│   │   │   ├── reminder.worker.ts         # Appointment Reminders (24h + 1h)
│   │   │   ├── recurring.worker.ts        # Recurring Appointment Generator
│   │   │   ├── alert.worker.ts            # Alert Rules Checker (15min)
│   │   │   ├── auto-noshow.worker.ts      # Auto No-Show nach Timeout
│   │   │   └── report.worker.ts           # Scheduled Report Generation
│   │   └── crons/
│   │       ├── backup.cron.ts             # 03:00 Daily: Backup aller Tenants
│   │       ├── reminder.cron.ts           # Jede Minute: fällige Reminders prüfen
│   │       ├── alert.cron.ts              # Alle 15min: Alert Rules prüfen
│   │       ├── expiry.cron.ts             # Daily: Inventory Expiry Check
│   │       └── cleanup.cron.ts            # Weekly: TTL Cleanup (Logs, Temp)
│   │
│   ├── plugins/                           # Fastify Plugins
│   │   ├── helmet.plugin.ts               # 🔒 @fastify/helmet Config
│   │   ├── cors.plugin.ts                 # 🔒 @fastify/cors Config
│   │   ├── rate-limit.plugin.ts           # 🔒 @fastify/rate-limit Config
│   │   ├── swagger.plugin.ts              # OpenAPI Auto-Gen
│   │   ├── cookie.plugin.ts               # 🔒 @fastify/cookie Config
│   │   └── multipart.plugin.ts            # @fastify/multipart Config
│   │
│   ├── utils/                             # Backend-only Utilities
│   │   ├── crypto.ts                      # 🔒 AES-256-GCM, HMAC-SHA256, HKDF
│   │   ├── token.ts                       # 🔒 JWT Sign/Verify, Rotation Logic
│   │   ├── password.ts                    # 🔒 Argon2id Hash/Verify, History Check
│   │   ├── api-response.ts               # Standardisierte API Responses
│   │   ├── pagination.ts                 # Pagination Helpers (skip, limit, cursor)
│   │   ├── logger.ts                      # Pino Logger Config
│   │   └── seed.ts                        # Tenant Seed Data (Medications, Lab Types)
│   │
│   ├── types/                             # Backend-spezifische Types
│   │   ├── fastify.d.ts                   # Fastify Request/Reply Erweiterungen
│   │   ├── socket.d.ts                    # Socket.io Event Types
│   │   └── env.d.ts                       # Environment Variable Types
│   │
│   └── test/                              # Test Utilities
│       ├── setup.ts                       # Test DB Setup + Teardown
│       ├── fixtures/                      # Test Data Factories
│       │   ├── patient.fixture.ts
│       │   ├── appointment.fixture.ts
│       │   └── ...
│       └── helpers/
│           ├── auth.helper.ts             # Test JWT Generation
│           └── db.helper.ts               # Test DB Helpers
│
├── Dockerfile                             # Multi-Stage Build (Node 20 Alpine)
├── .dockerignore
├── tsconfig.json                          # Extends ../../tsconfig.base.json
├── vitest.config.ts
└── package.json
```

### Warum diese Struktur?

| Entscheidung                        | Grund                                                                    |
| :---------------------------------- | :----------------------------------------------------------------------- |
| `platform/` vs `tenant/` Trennung   | Klare Grenze: Payload (Platform DB) vs Fastify (Tenant DBs)              |
| `routes/{feature}/` Feature-Ordner  | Route + Service + Test zusammen → einfach zu finden                      |
| `models/` zentral (nicht in routes) | Models werden von mehreren Routes genutzt (z.B. Patient in Appointments) |
| `services/` für Cross-Feature Logic | Encryption, Email, PDF werden von vielen Features genutzt                |
| `jobs/workers/` + `jobs/crons/`     | Klare Trennung: was verarbeitet (Worker) vs wann ausgelöst (Cron)        |
| `middleware/` als eigener Ordner    | 🔒 Security Chain klar sichtbar und testbar                              |

---

## 6. apps/admin — Admin Portal

> **28 Module**, Feature-basierte Ordnerstruktur, jede Seite in eigenem Ordner
> **Prinzip:** Jedes Feature hat eigene Pages, Components, Hooks — Shared UI kommt aus `@dento/ui`

```
apps/admin/
├── src/
│   ├── main.tsx                           # React Entry Point
│   ├── App.tsx                            # Root Component (Providers Wrapper)
│   ├── router.tsx                         # React Router v7 Config (alle Routen)
│   │
│   ├── providers/                         # React Context Providers
│   │   ├── AuthProvider.tsx               # Auth State + Token Refresh
│   │   ├── TenantProvider.tsx             # Tenant Config + Locale
│   │   ├── QueryProvider.tsx              # TanStack Query Client
│   │   ├── SocketProvider.tsx             # Socket.io Connection
│   │   ├── ThemeProvider.tsx              # Dark/Light Mode + RTL
│   │   └── ToastProvider.tsx              # Sonner Toast Config
│   │
│   ├── layouts/                           # Page Layouts
│   │   ├── DashboardLayout.tsx            # TailAdmin Sidebar + Header + Content
│   │   ├── AuthLayout.tsx                 # Login/Register/Forgot (kein Sidebar)
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx                # Sidebar Container (RBAC-gefiltert)
│   │   │   ├── SidebarItem.tsx            # Einzelnes Menü-Item
│   │   │   ├── SidebarGroup.tsx           # Menü-Gruppe (Clinical, Financial, etc.)
│   │   │   └── sidebar-config.ts          # 28 Module: Label, Icon, Route, Roles[]
│   │   ├── Header/
│   │   │   ├── Header.tsx                 # Top Header Bar
│   │   │   ├── NotificationBell.tsx       # 🔔 Real-Time Notification Badge
│   │   │   ├── ChatToggle.tsx             # 💬 Chat Sidebar Toggle
│   │   │   ├── UserDropdown.tsx           # Profil, Settings, Logout
│   │   │   ├── LocaleToggle.tsx           # EN ↔ AR (LTR ↔ RTL)
│   │   │   ├── ThemeToggle.tsx            # ☀️ ↔ 🌙
│   │   │   └── ImpersonationBanner.tsx    # 🔒 ⚠️ Gelber Banner bei Support-Session
│   │   └── ChatPanel/
│   │       ├── ChatPanel.tsx              # Rechte Sidebar (über Content)
│   │       ├── ChannelList.tsx            # Kanal-Liste mit Unread Badge
│   │       ├── ChatView.tsx               # Nachrichten-Verlauf
│   │       └── ChatInput.tsx              # Eingabe + Attachments + Reply
│   │
│   ├── features/                          # 📦 FEATURE-BASIERTE MODULE (28)
│   │   │
│   │   ├── dashboard/                     # Modul #1
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx      # 8 Widgets + Sparklines + Trends
│   │   │   ├── components/
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   ├── AppointmentWidget.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── WaitingRoomWidget.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   └── hooks/
│   │   │       └── useDashboardStats.ts   # TanStack Query Hook
│   │   │
│   │   ├── patients/                      # Modul #2
│   │   │   ├── pages/
│   │   │   │   ├── PatientListPage.tsx    # Tabelle + Suche + Filter
│   │   │   │   └── PatientDetailPage.tsx  # Tabs: Info, History, Charts, X-Rays, Billing
│   │   │   ├── components/
│   │   │   │   ├── PatientForm.tsx        # Create/Edit Formular
│   │   │   │   ├── PatientTable.tsx       # TanStack Table
│   │   │   │   ├── AllergyForm.tsx
│   │   │   │   ├── MedicalHistoryForm.tsx
│   │   │   │   └── PatientInsurance.tsx   # Nur sichtbar wenn Insurance-Modul aktiv
│   │   │   └── hooks/
│   │   │       ├── usePatients.ts         # CRUD Queries
│   │   │       └── usePatientDetail.ts    # Detail + Tabs Data
│   │   │
│   │   ├── appointments/                  # Modul #3
│   │   │   ├── pages/
│   │   │   │   └── AppointmentPage.tsx    # FullCalendar + Sidebar
│   │   │   ├── components/
│   │   │   │   ├── Calendar.tsx           # FullCalendar Wrapper
│   │   │   │   ├── AppointmentForm.tsx    # Create/Edit Modal
│   │   │   │   ├── AppointmentCard.tsx    # Event Card im Kalender
│   │   │   │   ├── WaitlistPanel.tsx
│   │   │   │   └── AppointmentTypes.tsx   # CRUD für Termin-Typen
│   │   │   └── hooks/
│   │   │       ├── useAppointments.ts
│   │   │       └── useSlots.ts            # Slot-Engine Query
│   │   │
│   │   ├── dental-charts/                 # Modul #4
│   │   │   ├── pages/
│   │   │   │   └── DentalChartPage.tsx    # Vollbild Dental Chart
│   │   │   ├── components/
│   │   │   │   ├── DentalChartWrapper.tsx # react-odontogram v0.5.5 Wrapper
│   │   │   │   ├── DentalChartMini.tsx    # Mini-Version für Treatment Plans
│   │   │   │   ├── ToothDetailPanel.tsx   # 5-Surface SVG + Conditions
│   │   │   │   ├── ChartHistory.tsx       # Snapshot Compare
│   │   │   │   └── ChartPrint.tsx         # Druck-Layout
│   │   │   └── hooks/
│   │   │       └── useDentalChart.ts
│   │   │
│   │   ├── treatment-plans/               # Modul #5
│   │   │   ├── pages/
│   │   │   │   ├── TreatmentPlanList.tsx
│   │   │   │   └── TreatmentPlanDetail.tsx
│   │   │   ├── components/
│   │   │   │   ├── TreatmentPlanForm.tsx
│   │   │   │   ├── TreatmentItemRow.tsx
│   │   │   │   └── StatusFlow.tsx         # draft → approved → in_progress → completed
│   │   │   └── hooks/
│   │   │       └── useTreatmentPlans.ts
│   │   │
│   │   ├── procedure-notes/               # Modul #6
│   │   │   ├── pages/
│   │   │   │   └── ProcedureNotePage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ProcedureNoteForm.tsx
│   │   │   │   └── TemplateSelector.tsx
│   │   │   └── hooks/
│   │   │       └── useProcedureNotes.ts
│   │   │
│   │   ├── doctors/                       # Modul #7
│   │   │   ├── pages/
│   │   │   │   ├── DoctorListPage.tsx
│   │   │   │   └── DoctorDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── DoctorForm.tsx
│   │   │   │   └── DoctorSchedule.tsx
│   │   │   └── hooks/
│   │   │       └── useDoctors.ts
│   │   │
│   │   ├── invoices/                      # Modul #8
│   │   │   ├── pages/
│   │   │   │   ├── InvoiceListPage.tsx
│   │   │   │   └── InvoiceDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   ├── InvoiceLineItems.tsx
│   │   │   │   └── InvoicePDF.tsx         # PDF Preview + Download
│   │   │   └── hooks/
│   │   │       └── useInvoices.ts
│   │   │
│   │   ├── payments/                      # Modul #9
│   │   │   ├── pages/
│   │   │   │   └── PaymentsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── PaymentForm.tsx
│   │   │   │   ├── OnlinePayment.tsx      # Paymob/Stripe Integration
│   │   │   │   └── PaymentReceipt.tsx
│   │   │   └── hooks/
│   │   │       └── usePayments.ts
│   │   │
│   │   ├── prescriptions/                 # Modul #10
│   │   │   ├── pages/
│   │   │   │   └── PrescriptionsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── PrescriptionForm.tsx
│   │   │   │   ├── MedicationSearch.tsx   # Autocomplete aus Katalog
│   │   │   │   └── PrescriptionPrint.tsx
│   │   │   └── hooks/
│   │   │       └── usePrescriptions.ts
│   │   │
│   │   ├── xrays/                         # Modul #11
│   │   │   ├── pages/
│   │   │   │   └── XRaysPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── XRayUpload.tsx         # 🔒 File Upload Security
│   │   │   │   ├── XRayViewer.tsx
│   │   │   │   └── ImagingLinker.tsx      # Cross-Link zu Treatment/Procedure
│   │   │   └── hooks/
│   │   │       └── useXRays.ts
│   │   │
│   │   ├── cbct/                          # Modul #12
│   │   │   ├── pages/
│   │   │   │   └── CBCTPage.tsx
│   │   │   ├── components/
│   │   │   │   └── CBCTOrderForm.tsx
│   │   │   └── hooks/
│   │   │       └── useCBCT.ts
│   │   │
│   │   ├── lab-orders/                    # Modul #13
│   │   │   ├── pages/
│   │   │   │   └── LabOrdersPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── LabOrderForm.tsx
│   │   │   │   ├── LabStatusFlow.tsx
│   │   │   │   └── DentalLabsList.tsx
│   │   │   └── hooks/
│   │   │       └── useLabOrders.ts
│   │   │
│   │   ├── insurance/                     # Modul #14
│   │   │   ├── pages/
│   │   │   │   └── InsurancePage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ClaimForm.tsx
│   │   │   │   └── CompanyList.tsx
│   │   │   └── hooks/
│   │   │       └── useInsurance.ts
│   │   │
│   │   ├── inventory/                     # Modul #15
│   │   │   ├── pages/
│   │   │   │   ├── InventoryListPage.tsx
│   │   │   │   ├── PurchaseOrdersPage.tsx
│   │   │   │   ├── SuppliersPage.tsx
│   │   │   │   └── StockCountPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── InventoryForm.tsx
│   │   │   │   ├── PurchaseOrderForm.tsx
│   │   │   │   ├── StockTransfer.tsx
│   │   │   │   ├── ExpiryDashboard.tsx
│   │   │   │   └── BarcodeScanner.tsx     # html5-qrcode
│   │   │   └── hooks/
│   │   │       └── useInventory.ts
│   │   │
│   │   ├── services-catalog/              # Modul #16
│   │   │   ├── pages/
│   │   │   │   └── ServicesPage.tsx
│   │   │   ├── components/
│   │   │   │   └── ServiceForm.tsx
│   │   │   └── hooks/
│   │   │       └── useServices.ts
│   │   │
│   │   ├── branches/                      # Modul #17
│   │   │   ├── pages/
│   │   │   │   └── BranchesPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── BranchForm.tsx
│   │   │   │   └── ChairManager.tsx
│   │   │   └── hooks/
│   │   │       └── useBranches.ts
│   │   │
│   │   ├── users/                         # Modul #18
│   │   │   ├── pages/
│   │   │   │   ├── UserListPage.tsx
│   │   │   │   └── UserProfilePage.tsx
│   │   │   ├── components/
│   │   │   │   ├── UserForm.tsx
│   │   │   │   ├── InviteForm.tsx
│   │   │   │   └── SessionList.tsx        # 🔒 Aktive Sessions verwalten
│   │   │   └── hooks/
│   │   │       └── useUsers.ts
│   │   │
│   │   ├── schedules/                     # Modul #19
│   │   │   ├── pages/
│   │   │   │   └── SchedulesPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ScheduleCalendar.tsx
│   │   │   │   ├── ExceptionForm.tsx
│   │   │   │   └── ShiftTemplates.tsx
│   │   │   └── hooks/
│   │   │       └── useSchedules.ts
│   │   │
│   │   ├── leave/                         # Modul #20
│   │   │   ├── pages/
│   │   │   │   └── LeavePage.tsx
│   │   │   ├── components/
│   │   │   │   ├── LeaveRequestForm.tsx
│   │   │   │   └── LeaveBalance.tsx
│   │   │   └── hooks/
│   │   │       └── useLeave.ts
│   │   │
│   │   ├── attendance/                    # Modul #21
│   │   │   ├── pages/
│   │   │   │   └── AttendancePage.tsx
│   │   │   ├── components/
│   │   │   │   └── CheckInOut.tsx
│   │   │   └── hooks/
│   │   │       └── useAttendance.ts
│   │   │
│   │   ├── commissions/                   # Modul #22
│   │   │   ├── pages/
│   │   │   │   └── CommissionsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── CommissionConfig.tsx
│   │   │   │   └── PayoutTable.tsx
│   │   │   └── hooks/
│   │   │       └── useCommissions.ts
│   │   │
│   │   ├── installments/                  # Modul #23
│   │   │   ├── pages/
│   │   │   │   └── InstallmentsPage.tsx
│   │   │   ├── components/
│   │   │   │   └── InstallmentPlanForm.tsx
│   │   │   └── hooks/
│   │   │       └── useInstallments.ts
│   │   │
│   │   ├── consent/                       # Modul #24
│   │   │   ├── pages/
│   │   │   │   └── ConsentPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ConsentTemplateForm.tsx
│   │   │   │   └── SignatureWidget.tsx    # react-signature-canvas
│   │   │   └── hooks/
│   │   │       └── useConsent.ts
│   │   │
│   │   ├── notifications/                 # Modul #25
│   │   │   ├── pages/
│   │   │   │   └── NotificationPrefsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── NotificationList.tsx
│   │   │   │   └── ChannelPreferences.tsx
│   │   │   └── hooks/
│   │   │       └── useNotifications.ts
│   │   │
│   │   ├── reports/                       # Modul #26
│   │   │   ├── pages/
│   │   │   │   ├── ReportsHub.tsx         # Übersicht aller 36 Reports
│   │   │   │   ├── PatientReports.tsx
│   │   │   │   ├── AppointmentReports.tsx
│   │   │   │   ├── FinancialReports.tsx
│   │   │   │   ├── ClinicalReports.tsx
│   │   │   │   ├── InventoryReports.tsx
│   │   │   │   └── OperationalReports.tsx
│   │   │   ├── components/
│   │   │   │   ├── ReportCard.tsx
│   │   │   │   ├── ChartWrapper.tsx       # Recharts Wrapper
│   │   │   │   ├── DateRangePicker.tsx
│   │   │   │   └── ExportButtons.tsx      # CSV, Excel, PDF
│   │   │   └── hooks/
│   │   │       └── useReports.ts
│   │   │
│   │   ├── subscription/                  # Modul #27
│   │   │   ├── pages/
│   │   │   │   └── SubscriptionPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── PlanOverview.tsx
│   │   │   │   └── ModuleToggle.tsx
│   │   │   └── hooks/
│   │   │       └── useSubscription.ts
│   │   │
│   │   ├── settings/                      # Modul #28
│   │   │   ├── pages/
│   │   │   │   └── SettingsPage.tsx       # Tabs: General, Branding, Locale, etc.
│   │   │   ├── components/
│   │   │   │   ├── GeneralSettings.tsx
│   │   │   │   ├── BrandingSettings.tsx
│   │   │   │   ├── LocaleSettings.tsx
│   │   │   │   ├── NotificationSettings.tsx
│   │   │   │   ├── WebhookSettings.tsx
│   │   │   │   ├── CustomFieldsManager.tsx
│   │   │   │   ├── WorkflowBuilder.tsx
│   │   │   │   └── TwoFactorSetup.tsx    # 🔒 2FA QR-Code + Backup-Codes
│   │   │   └── hooks/
│   │   │       └── useSettings.ts
│   │   │
│   │   ├── daily-ops/                     # Operations Hub (kein eigenes Modul-#)
│   │   │   ├── pages/
│   │   │   │   └── DailyOpsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── WalkInForm.tsx
│   │   │   │   ├── QueueBoard.tsx
│   │   │   │   ├── ChairDashboard.tsx
│   │   │   │   └── QueueNumber.tsx
│   │   │   └── hooks/
│   │   │       └── useDailyOps.ts
│   │   │
│   │   ├── online-booking/                # Online-Booking Config
│   │   │   ├── pages/
│   │   │   │   └── BookingSettingsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── BookingWidget.tsx
│   │   │   │   └── BookingConfirmation.tsx
│   │   │   └── hooks/
│   │   │       └── useBooking.ts
│   │   │
│   │   └── auth/                          # Auth Screens
│   │       ├── pages/
│   │       │   ├── LoginPage.tsx
│   │       │   ├── ForgotPasswordPage.tsx
│   │       │   ├── ResetPasswordPage.tsx
│   │       │   ├── InviteAcceptPage.tsx
│   │       │   └── TwoFactorPage.tsx      # 🔒 2FA Code-Eingabe
│   │       └── hooks/
│   │           └── useAuth.ts
│   │
│   ├── stores/                            # Zustand Stores (Global State)
│   │   ├── auth.store.ts                  # 🔒 Token (Memory only), User, Roles
│   │   ├── tenant.store.ts                # Tenant Config, Branding, Locale
│   │   ├── sidebar.store.ts               # Sidebar collapsed/expanded
│   │   ├── theme.store.ts                 # Dark/Light, LTR/RTL
│   │   ├── notification.store.ts          # Unread Count, Recent Notifications
│   │   └── chat.store.ts                  # Active Channel, Unread Counts
│   │
│   ├── hooks/                             # Globale Custom Hooks
│   │   ├── useApi.ts                      # Fetch Wrapper mit Auth + Refresh
│   │   ├── useSocket.ts                   # Socket.io Event Hooks
│   │   ├── useRBAC.ts                     # Permission Checks (canView, canEdit)
│   │   ├── useLocale.ts                   # i18n: t('key'), dir, lang
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts               # Responsive Breakpoints
│   │
│   ├── lib/                               # Utility Functions
│   │   ├── api-client.ts                  # Axios/Fetch Config mit interceptors
│   │   ├── socket.ts                      # Socket.io Client Init
│   │   ├── i18n.ts                        # i18n Setup + Translations
│   │   ├── date.ts                        # dayjs Konfiguration + Hijri Plugin
│   │   └── format.ts                      # Currency, Number, Date Formatters
│   │
│   ├── styles/                            # Global Styles
│   │   ├── globals.css                    # Tailwind Directives + Custom CSS Vars
│   │   └── print.css                      # Print-spezifische Styles
│   │
│   └── assets/                            # Statische Assets
│       ├── images/
│       └── fonts/
│
├── public/                                # Static Files (copied to dist)
│   ├── favicon.ico
│   ├── sw.js                              # 🔒 Service Worker (Push Notifications)
│   └── manifest.json
│
├── index.html                             # HTML Template
├── vite.config.ts                         # Vite Config
├── tailwind.config.ts                     # Tailwind v4 Config (RTL, Dark Mode)
├── tsconfig.json                          # Extends ../../tsconfig.base.json
└── package.json
```

### Warum Feature-Ordner?

| Ansatz                                                  | Problem                                                                    |
| :------------------------------------------------------ | :------------------------------------------------------------------------- |
| **Ordner nach Typ** (`pages/`, `components/`, `hooks/`) | Bei 28 Modulen: 80+ Dateien in `components/` → Chaos                       |
| **Feature-Ordner** (`features/patients/`)               | ✅ Alles für ein Feature zusammen → einfach zu finden, löschen, refactoren |

### Regel: Wann gehört etwas wohin?

| Datei             | Wo?                             | Warum?                                  |
| :---------------- | :------------------------------ | :-------------------------------------- |
| `PatientForm.tsx` | `features/patients/components/` | Nur von Patients genutzt                |
| `DataTable.tsx`   | `@dento/ui`                     | Von allen Features genutzt              |
| `usePatients.ts`  | `features/patients/hooks/`      | Nur von Patients genutzt                |
| `useApi.ts`       | `src/hooks/`                    | Von allen Features genutzt              |
| `auth.store.ts`   | `src/stores/`                   | Globaler State                          |
| `patientSchema`   | `@dento/shared`                 | Von Frontend + Backend + Mobile genutzt |

---

## 7. apps/developer — Dev Portal

> **16 Module**, gleiche Feature-Ordner-Struktur wie Admin
> **Nur für Platform-Admins** — komplett getrennt deployed

```
apps/developer/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   │
│   ├── providers/                         # Selbe Struktur wie Admin
│   │   ├── AuthProvider.tsx               # Platform-Admin Auth
│   │   ├── QueryProvider.tsx
│   │   ├── SocketProvider.tsx
│   │   └── ThemeProvider.tsx
│   │
│   ├── layouts/
│   │   ├── DashboardLayout.tsx            # Dev Portal Sidebar + Header
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   └── sidebar-config.ts          # 16 Dev Portal Module
│   │   └── Header/
│   │       ├── Header.tsx
│   │       └── UserDropdown.tsx
│   │
│   ├── features/
│   │   ├── dashboard/                     # Platform Dashboard
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx      # MRR, Tenant Count, API Usage
│   │   │   └── components/
│   │   │       ├── MRRChart.tsx
│   │   │       ├── TenantGrowthChart.tsx
│   │   │       └── APIUsageChart.tsx
│   │   │
│   │   ├── tenants/                       # Tenant Management (10 Tabs)
│   │   │   ├── pages/
│   │   │   │   ├── TenantListPage.tsx
│   │   │   │   └── TenantDetailPage.tsx   # 10 Tabs: Overview, Users, Modules...
│   │   │   ├── components/
│   │   │   │   ├── TenantTable.tsx
│   │   │   │   ├── TenantForm.tsx
│   │   │   │   ├── tabs/
│   │   │   │   │   ├── OverviewTab.tsx
│   │   │   │   │   ├── UsersTab.tsx
│   │   │   │   │   ├── ModulesTab.tsx
│   │   │   │   │   ├── DatabaseTab.tsx
│   │   │   │   │   ├── BillingTab.tsx
│   │   │   │   │   ├── BrandingTab.tsx
│   │   │   │   │   ├── SettingsTab.tsx
│   │   │   │   │   ├── SupportTab.tsx
│   │   │   │   │   ├── LogsTab.tsx
│   │   │   │   │   └── BackupsTab.tsx
│   │   │   │   └── ImpersonateButton.tsx  # 🔒 "Login as Admin" + Reason Modal
│   │   │   └── hooks/
│   │   │       └── useTenants.ts
│   │   │
│   │   ├── modules/                       # Modul-Verwaltung + Versioning
│   │   │   ├── pages/
│   │   │   │   ├── ModuleListPage.tsx
│   │   │   │   └── ModuleDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ModuleForm.tsx
│   │   │   │   ├── VersionManager.tsx     # Canary Rollout UI
│   │   │   │   └── ModuleToggle.tsx
│   │   │   └── hooks/
│   │   │       └── useModules.ts
│   │   │
│   │   ├── db-explorer/                   # Database Explorer (Readonly)
│   │   │   ├── pages/
│   │   │   │   └── DBExplorerPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── CollectionBrowser.tsx
│   │   │   │   ├── DocumentViewer.tsx     # JSON Viewer
│   │   │   │   └── IndexInfo.tsx
│   │   │   └── hooks/
│   │   │       └── useDBExplorer.ts
│   │   │
│   │   ├── tickets/                       # Support Ticketing
│   │   │   ├── pages/
│   │   │   │   ├── TicketListPage.tsx
│   │   │   │   └── TicketDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── TicketForm.tsx
│   │   │   │   ├── TicketTimeline.tsx
│   │   │   │   └── SLATimer.tsx
│   │   │   └── hooks/
│   │   │       └── useTickets.ts
│   │   │
│   │   ├── webhooks/                      # Platform Webhooks
│   │   │   ├── pages/
│   │   │   │   └── WebhooksPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── WebhookForm.tsx
│   │   │   │   ├── DeliveryLog.tsx
│   │   │   │   └── PayloadPreview.tsx     # @monaco-editor/react
│   │   │   └── hooks/
│   │   │       └── useWebhooks.ts
│   │   │
│   │   ├── pricing/                       # Pricing System
│   │   │   ├── pages/
│   │   │   │   └── PricingPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── PriceEditor.tsx
│   │   │   │   ├── CouponForm.tsx
│   │   │   │   └── TrialConfig.tsx
│   │   │   └── hooks/
│   │   │       └── usePricing.ts
│   │   │
│   │   ├── payments/                      # Platform Payments (Paymob/Stripe)
│   │   │   ├── pages/
│   │   │   │   └── PaymentsPage.tsx
│   │   │   └── hooks/
│   │   │       └── usePlatformPayments.ts
│   │   │
│   │   ├── api-keys/                      # 🔒 API Key Management
│   │   │   ├── pages/
│   │   │   │   └── APIKeysPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── APIKeyForm.tsx
│   │   │   │   └── KeyRevealOnce.tsx      # 🔒 Klartext nur einmal anzeigen
│   │   │   └── hooks/
│   │   │       └── useAPIKeys.ts
│   │   │
│   │   ├── backups/                       # Backup Management
│   │   │   ├── pages/
│   │   │   │   └── BackupsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── BackupList.tsx
│   │   │   │   └── RestoreModal.tsx
│   │   │   └── hooks/
│   │   │       └── useBackups.ts
│   │   │
│   │   ├── feature-flags/                 # Feature Flags
│   │   │   └── pages/
│   │   │       └── FeatureFlagsPage.tsx
│   │   │
│   │   ├── deployments/                   # Deployment Logs
│   │   │   └── pages/
│   │   │       └── DeploymentsPage.tsx
│   │   │
│   │   ├── errors/                        # Error Dashboard (Sentry Bridge)
│   │   │   └── pages/
│   │   │       └── ErrorDashboardPage.tsx
│   │   │
│   │   ├── domains/                       # Custom Domains
│   │   │   └── pages/
│   │   │       └── DomainsPage.tsx
│   │   │
│   │   ├── audit-logs/                    # 🔒 Platform Audit Logs
│   │   │   └── pages/
│   │   │       └── AuditLogsPage.tsx
│   │   │
│   │   └── settings/                      # Platform Settings
│   │       └── pages/
│   │           └── SettingsPage.tsx
│   │
│   ├── stores/                            # Zustand (gleiche Muster wie Admin)
│   │   └── auth.store.ts
│   │
│   ├── hooks/
│   │   ├── useApi.ts
│   │   └── useSocket.ts
│   │
│   └── lib/
│       ├── api-client.ts
│       └── socket.ts
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Admin vs. Developer — Shared Code

| Code                       | Admin | Developer | Quelle                |
| :------------------------- | :---: | :-------: | :-------------------- |
| Button, Input, Badge, Card |  ✅   |    ✅     | `@dento/ui`           |
| DataTable, SearchInput     |  ✅   |    ✅     | `@dento/ui`           |
| Zod Schemas, Types         |  ✅   |    ✅     | `@dento/shared`       |
| dayjs, formatCurrency      |  ✅   |    ✅     | `@dento/shared`       |
| DentalChartWrapper         |  ✅   |    ❌     | `apps/admin` only     |
| PatientForm                |  ✅   |    ❌     | `apps/admin` only     |
| TenantTable                |  ❌   |    ✅     | `apps/developer` only |
| DBExplorer                 |  ❌   |    ✅     | `apps/developer` only |

---

## 8. apps/mobile — React Native

> **Phase 7 (Woche 22-26)** — Erst nach Web-Launch gebaut
> **Expo 52 + Expo Router + NativeWind + Realm**

```
apps/mobile/
├── app/                                   # Expo Router (File-based Routing)
│   ├── _layout.tsx                        # Root Layout (Providers)
│   ├── (auth)/                            # Auth Group (kein Tab Bar)
│   │   ├── login.tsx
│   │   ├── forgot-password.tsx
│   │   └── two-factor.tsx                 # 🔒 2FA
│   ├── (tabs)/                            # Main App (Tab Bar Navigation)
│   │   ├── _layout.tsx                    # Tab Bar Config
│   │   ├── index.tsx                      # Dashboard (Heute-Übersicht)
│   │   ├── patients/
│   │   │   ├── index.tsx                  # Patient List
│   │   │   └── [id].tsx                   # Patient Detail
│   │   ├── appointments/
│   │   │   ├── index.tsx                  # Tagesansicht Kalender
│   │   │   └── [id].tsx                   # Appointment Detail
│   │   ├── dental-chart/
│   │   │   └── [patientId].tsx            # Dental Chart View
│   │   ├── chat/
│   │   │   ├── index.tsx                  # Channel List
│   │   │   └── [channelId].tsx            # Chat View
│   │   └── more/
│   │       ├── index.tsx                  # Weitere Optionen
│   │       ├── prescriptions.tsx
│   │       ├── lab-orders.tsx
│   │       ├── xrays.tsx
│   │       ├── treatment-plans.tsx
│   │       ├── notifications.tsx
│   │       ├── inventory-scanner.tsx      # Barcode Scanner
│   │       ├── profile.tsx
│   │       └── settings.tsx
│   └── +not-found.tsx
│
├── src/
│   ├── components/                        # Shared Mobile Components
│   │   ├── ui/                            # NativeWind Komponenten
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── BottomSheet.tsx            # @gorhom/bottom-sheet
│   │   ├── DentalChartMobile.tsx          # Vereinfachte Chart-View
│   │   ├── PatientCard.tsx
│   │   └── AppointmentCard.tsx
│   │
│   ├── realm/                             # 🔒 Realm Encrypted DB + Sync
│   │   ├── schemas/
│   │   │   ├── Patient.schema.ts
│   │   │   ├── Appointment.schema.ts
│   │   │   ├── DentalChart.schema.ts
│   │   │   ├── ChatMessage.schema.ts
│   │   │   └── index.ts
│   │   ├── realm.config.ts                # 🔒 AES-256 Encryption Key (SecureStore)
│   │   └── sync.config.ts                 # Atlas Device Sync Config
│   │
│   ├── stores/                            # Zustand (gleiche Patterns wie Web)
│   │   ├── auth.store.ts                  # 🔒 SecureStore Token Management
│   │   └── theme.store.ts
│   │
│   ├── hooks/
│   │   ├── useApi.ts                      # Fetch + Offline Queue
│   │   ├── useBiometric.ts               # 🔒 Face ID / Fingerprint
│   │   ├── useRealm.ts                   # Realm CRUD Helpers
│   │   └── useNotifications.ts           # Expo Notifications
│   │
│   ├── lib/
│   │   ├── api-client.ts                 # Mobile API Client (Cert Pinning)
│   │   ├── secure-storage.ts             # 🔒 SecureStore Wrapper
│   │   └── i18n.ts                       # RTL (I18nManager.forceRTL)
│   │
│   └── assets/
│       ├── images/
│       └── fonts/
│
├── app.json                               # Expo Config
├── app.config.ts                          # Dynamic Expo Config
├── eas.json                               # EAS Build Config (iOS + Android)
├── tsconfig.json
├── nativewind-env.d.ts
└── package.json
```

### Warum Expo Router (File-based)?

| Vorteil            | Erklärung                                     |
| :----------------- | :-------------------------------------------- |
| **Visuell klar**   | Ordnerstruktur = URL-Struktur                 |
| **Deep Linking**   | Automatisch aus Dateiname generiert           |
| **Code Splitting** | Jeder Screen lazy-loaded                      |
| **Web-Support**    | Falls später Web-Version der Mobile-App nötig |

---

## 9. packages/shared — Geteilter Code

> **Kein React, kein DOM** — nur reines TypeScript
> **Importiert von:** apps/api, apps/admin, apps/developer, apps/mobile

```
packages/shared/
├── src/
│   ├── schemas/                           # Zod Schemas (Single Source of Truth)
│   │   ├── patient.schema.ts              # createPatient, updatePatient, patientResponse
│   │   ├── appointment.schema.ts
│   │   ├── dental-chart.schema.ts
│   │   ├── treatment-plan.schema.ts
│   │   ├── procedure-note.schema.ts
│   │   ├── doctor.schema.ts
│   │   ├── invoice.schema.ts
│   │   ├── payment.schema.ts
│   │   ├── prescription.schema.ts
│   │   ├── xray.schema.ts
│   │   ├── lab-order.schema.ts
│   │   ├── insurance.schema.ts
│   │   ├── service.schema.ts
│   │   ├── branch.schema.ts
│   │   ├── inventory.schema.ts
│   │   ├── leave.schema.ts
│   │   ├── attendance.schema.ts
│   │   ├── commission.schema.ts
│   │   ├── installment.schema.ts
│   │   ├── consent.schema.ts
│   │   ├── notification.schema.ts
│   │   ├── webhook.schema.ts
│   │   ├── chat.schema.ts
│   │   ├── settings.schema.ts
│   │   ├── auth.schema.ts                 # login, register, refreshToken, totp
│   │   ├── tenant.schema.ts               # Platform-Level Schemas
│   │   ├── module.schema.ts
│   │   └── index.ts                       # Re-Export aller Schemas
│   │
│   ├── types/                             # TypeScript Interfaces (inferred from Zod)
│   │   ├── patient.types.ts               # z.infer<typeof patientSchema>
│   │   ├── appointment.types.ts
│   │   ├── ... (gleiche Struktur wie schemas/)
│   │   ├── api.types.ts                   # API Response Wrapper, Pagination, Error
│   │   ├── roles.types.ts                 # Role Enum, Permission Matrix Type
│   │   └── index.ts
│   │
│   ├── constants/                         # Konstanten & Enums
│   │   ├── roles.ts                       # 8 Rollen: platform_admin → hygienist
│   │   ├── permissions.ts                 # 28 Module × 8 Rollen Permission Matrix
│   │   ├── statuses.ts                    # appointment_status, invoice_status, etc.
│   │   ├── events.ts                      # Webhook Event Types
│   │   ├── tooth-conditions.ts            # Dental Chart Conditions Enum
│   │   ├── countries.ts                   # Country Config (Locale, Currency, Timezone)
│   │   ├── modules.ts                     # Module Slugs + Names
│   │   └── index.ts
│   │
│   ├── utils/                             # Pure Functions (kein Side-Effect)
│   │   ├── currency.ts                    # formatCurrency(amount, locale, currency)
│   │   ├── date.ts                        # formatDate, diffDays, isRamadan, toHijri
│   │   ├── validation.ts                  # isValidEgyptianPhone, isValidTaxId
│   │   ├── string.ts                      # slugify, truncate, capitalize
│   │   ├── pagination.ts                  # buildPaginationParams, parsePaginationResponse
│   │   └── index.ts
│   │
│   └── api/                               # Typed API Client (optional, für Frontend)
│       ├── client.ts                      # createApiClient(baseUrl, token)
│       ├── patients.api.ts                # getPatients, getPatient, createPatient...
│       ├── appointments.api.ts
│       └── ... (ein File pro Feature-Gruppe)
│
├── tsconfig.json
├── tsup.config.ts                         # Build Config (ESM + CJS)
└── package.json                           # { "name": "@dento/shared" }
```

---

## 10. packages/ui — UI Komponenten

> **React + Tailwind** — Shadcn/Radix-basierte Komponenten
> **Importiert von:** apps/admin, apps/developer (NICHT apps/mobile → NativeWind eigene Komponenten)

```
packages/ui/
├── src/
│   ├── primitives/                        # Basis-Komponenten (Shadcn/Radix)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Switch.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── Sheet.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── Popover.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Tabs.tsx
│   │   ├── Accordion.tsx
│   │   ├── AlertDialog.tsx
│   │   ├── Avatar.tsx
│   │   ├── Separator.tsx
│   │   ├── ScrollArea.tsx
│   │   ├── Label.tsx
│   │   ├── Drawer.tsx                     # vaul
│   │   ├── Command.tsx                    # cmdk
│   │   ├── Toast.tsx                      # sonner
│   │   ├── Calendar.tsx                   # react-day-picker
│   │   └── InputOTP.tsx                   # input-otp
│   │
│   ├── composites/                        # Zusammengesetzte Komponenten
│   │   ├── DataTable.tsx                  # TanStack Table Wrapper (Sort, Filter, Paginate)
│   │   ├── DataTablePagination.tsx
│   │   ├── DataTableToolbar.tsx
│   │   ├── SearchInput.tsx                # Debounced Search mit Icon
│   │   ├── StatusBadge.tsx                # Color-coded Status (active, pending, etc.)
│   │   ├── ConfirmDialog.tsx              # "Sind Sie sicher?" Dialog
│   │   ├── EmptyState.tsx                 # Leere Tabelle/Liste Platzhalter
│   │   ├── LoadingState.tsx               # Skeleton Loader
│   │   ├── ErrorState.tsx                 # Error Boundary UI
│   │   ├── FormField.tsx                  # Label + Input + Error Message Wrapper
│   │   ├── FileUpload.tsx                 # react-dropzone Wrapper
│   │   ├── DateRangePicker.tsx
│   │   ├── CurrencyInput.tsx
│   │   ├── PhoneInput.tsx
│   │   └── ClinicHeader.tsx               # Branding Header für PDF Templates
│   │
│   ├── utils/
│   │   └── cn.ts                          # clsx + tailwind-merge Helper
│   │
│   └── index.ts                           # Re-Export aller Components
│
├── tsconfig.json
├── tsup.config.ts
└── package.json                           # { "name": "@dento/ui" }
```

---

## 11. docs/ — Dokumentation

```
docs/
├── planning/                              # Migriert aus altem Repo
│   ├── DENTO_V2_MASTER_PLAN.md           # 37 Sections, 8.024 Zeilen
│   ├── IMPLEMENTATION_ROADMAP.md         # 26 Wochen, 7 Phasen
│   ├── TECH_REQUIREMENTS.md              # ~142 Dependencies
│   ├── SECURITY_AND_ENCRYPTION.md        # 15 Schichten, 80+ Checkpoints
│   ├── V2_STRUCTURE.md                   # Dieses Dokument
│   ├── DEV_PORTAL_SCREENS.md             # 13 Screens
│   ├── ADMIN_PORTAL_SCREENS.md           # 16 Screens
│   └── mockups/
│       └── dental-chart-v2-mockup.html
│
├── api/                                   # API Dokumentation (auto-generated + manual)
│   ├── README.md                         # API Übersicht + Base URL + Auth Docs
│   └── postman/
│       └── dento-v2.postman_collection.json
│
├── guides/
│   ├── DEPLOYMENT.md                     # Deploy-Anleitung (Railway + Vercel)
│   ├── LOCAL_SETUP.md                    # Docker Compose + pnpm dev
│   ├── NEW_FEATURE.md                    # Wie ein neues Feature hinzufügen
│   └── SECURITY_CHECKLIST.md             # Pre-deploy Security Check
│
└── decisions/                            # ADRs (Architecture Decision Records)
    ├── 001-monorepo-turborepo.md
    ├── 002-database-per-tenant.md
    ├── 003-payload-plus-fastify.md
    ├── 004-react-odontogram.md
    └── ...
```

---

## 12. Naming Conventions

| Element                 | Convention                 | Beispiel                                       |
| :---------------------- | :------------------------- | :--------------------------------------------- |
| **Ordner**              | kebab-case                 | `dental-charts/`, `lab-orders/`                |
| **React Components**    | PascalCase.tsx             | `PatientForm.tsx`, `DentalChartWrapper.tsx`    |
| **Hooks**               | camelCase mit `use` Prefix | `usePatients.ts`, `useDentalChart.ts`          |
| **Stores**              | kebab-case mit `.store`    | `auth.store.ts`, `tenant.store.ts`             |
| **Schemas (Zod)**       | kebab-case mit `.schema`   | `patient.schema.ts`, `invoice.schema.ts`       |
| **Models (Mongoose)**   | kebab-case mit `.model`    | `patient.model.ts`, `invoice.model.ts`         |
| **Routes (Fastify)**    | kebab-case mit `.route`    | `patients.route.ts`, `invoices.route.ts`       |
| **Services**            | kebab-case mit `.service`  | `patients.service.ts`, `encryption.service.ts` |
| **Tests**               | kebab-case mit `.test`     | `patients.test.ts`, `auth.test.ts`             |
| **Pipelines**           | kebab-case mit `.pipeline` | `revenue.pipeline.ts`                          |
| **Workers**             | kebab-case mit `.worker`   | `email.worker.ts`, `backup.worker.ts`          |
| **Crons**               | kebab-case mit `.cron`     | `backup.cron.ts`, `reminder.cron.ts`           |
| **Types**               | kebab-case mit `.types`    | `patient.types.ts`, `api.types.ts`             |
| **CSS**                 | kebab-case                 | `globals.css`, `print.css`                     |
| **Constants**           | kebab-case                 | `roles.ts`, `statuses.ts`, `events.ts`         |
| **Env vars**            | SCREAMING_SNAKE            | `JWT_ACCESS_SECRET`, `MONGODB_URI`             |
| **MongoDB Collections** | snake_case (Plural)        | `patients`, `dental_charts`, `lab_orders`      |
| **API Routes**          | kebab-case (Plural)        | `/api/patients`, `/api/dental-charts`          |
| **Git Branches**        | type/description           | `feat/patient-crud`, `fix/jwt-rotation`        |
| **Commits**             | Conventional Commits       | `feat(patients): add list pagination`          |

---

## 13. Import-Regeln & Dependency Flow

### Erlaubte Imports

```
                    ┌──────────────┐
                    │ @dento/shared │ ◄── Kein React, kein DOM
                    │ (Schemas,     │     Importiert von ALLEN
                    │  Types, Utils)│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ @dento/ui │ │ apps/api │ │apps/     │
        │ (React   │ │ (Node.js)│ │ mobile   │
        │Components)│ │          │ │ (Expo)   │
        └────┬─────┘ └──────────┘ └──────────┘
             │
    ┌────────┼────────┐
    ▼                 ▼
┌──────────┐   ┌──────────┐
│apps/admin│   │apps/     │
│ (React)  │   │developer │
│          │   │ (React)  │
└──────────┘   └──────────┘
```

### Verbotene Imports (Regeln)

| Von              | Darf NICHT importieren   | Warum                                     |
| :--------------- | :----------------------- | :---------------------------------------- |
| `@dento/shared`  | React, DOM, Node.js APIs | Muss in allen Umgebungen laufen           |
| `@dento/ui`      | `apps/*` Code            | Packages dürfen nicht von Apps abhängen   |
| `apps/admin`     | `apps/developer` Code    | Apps sind isoliert                        |
| `apps/developer` | `apps/admin` Code        | Apps sind isoliert                        |
| `apps/mobile`    | `@dento/ui`              | Mobile nutzt NativeWind, nicht Radix      |
| `apps/api`       | `@dento/ui`, React       | Backend hat kein React                    |
| Frontend         | `apps/api` direkt        | Nur via HTTP/Socket — nie direkter Import |

### ESLint Regel

```jsonc
// eslint.config.js — Import Boundaries
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          { "group": ["@dento/admin/*"], "message": "Apps dürfen nicht Cross-App importieren" },
          { "group": ["@dento/developer/*"], "message": "Apps dürfen nicht Cross-App importieren" },
          { "group": ["@dento/api/*"], "message": "Frontend darf nicht Backend importieren" },
        ],
      },
    ],
  },
}
```

---

## 14. Dateigröße-Limits & Splitting

### Empfohlene Maximalgrößen

| Datei-Typ         | Max Zeilen | Was tun wenn überschritten?               |
| :---------------- | :--------: | :---------------------------------------- |
| React Component   |    200     | In Sub-Components aufteilen               |
| Page Component    |    150     | Logic in Hook auslagern                   |
| Custom Hook       |    100     | In mehrere spezialisierte Hooks aufteilen |
| Service (Backend) |    300     | In Domain-spezifische Services aufteilen  |
| Route File        |    150     | CRUD-Operationen in Service auslagern     |
| Mongoose Model    |    150     | Virtuals/Methods in eigene Datei          |
| Zod Schema        |    100     | Sub-Schemas für Embedded Docs extrahieren |
| Test File         |    300     | Pro Datei max 1 Describe-Block            |

### Wann ein neues Feature-Verzeichnis anlegen?

```
Wenn ein Feature:
  1. Eigene Route(n) hat                      → Eigenes Verzeichnis
  2. Mehr als 2 Komponenten braucht           → Eigenes Verzeichnis
  3. Eigene API Queries braucht               → Eigenes Verzeichnis
  4. Im Sidebar als Menüpunkt erscheint       → Eigenes Verzeichnis

Wenn ein Feature diese Kriterien NICHT erfüllt:
  → In das nächstliegende Feature-Verzeichnis integrieren
  Bsp: "Appointment Types" → appointments/components/AppointmentTypes.tsx
```

---

## Zusammenfassung: Dateizählung

| Scope           | Geschätzte Dateien | Beschreibung                                                       |
| :-------------- | :----------------: | :----------------------------------------------------------------- |
| Root Configs    |        ~15         | turbo, pnpm, tsconfig, docker, eslint, prettier, husky             |
| apps/api        |        ~150        | 50 Models + 30 Routes (×3: route+service+test) + Jobs + Middleware |
| apps/admin      |        ~200        | 28 Features (×4: page+components+hooks) + Stores + Layouts         |
| apps/developer  |        ~80         | 16 Features + Stores + Layouts                                     |
| apps/mobile     |        ~60         | Screens + Realm + Components                                       |
| packages/shared |        ~60         | 25 Schemas + 25 Types + Constants + Utils                          |
| packages/ui     |        ~40         | 25 Primitives + 15 Composites                                      |
| docs            |        ~20         | Planning + Guides + ADRs                                           |
| .github         |         ~5         | CI + Dependabot + Templates                                        |
| **Gesamt**      |      **~630**      | Dateien im gesamten Monorepo                                       |

---

> **Letzte Aktualisierung:** 2026-02-25
> **Basiert auf:** DENTO_V2_MASTER_PLAN.md (37 Sections), TECH_REQUIREMENTS.md, IMPLEMENTATION_ROADMAP.md, SECURITY_AND_ENCRYPTION.md
> **Prinzipien:** Feature-basiert, Domain-driven, Security-by-Design, maximale Wiederverwendung via packages/

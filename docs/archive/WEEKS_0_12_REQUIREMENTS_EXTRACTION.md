# Dento v2 — Weeks 0-12 (Phases 0-3) Requirements Extraction

> **Generated from:** 8 planning documents in `docs/planning/`
> **Scope:** Phase 0 (Wo 1-2), Phase 1 (Wo 3-4), Phase 2 (Wo 5-7), Phase 3 (Wo 8-13)
> **Note:** Decision #8 (V2_DECISION_LOG) extends timeline to 34 weeks with 2-week buffers.
> Adjusted schedule: Phase 0 (Wo 1-2), Phase 1 (Wo 3-4), Phase 2 (Wo 5-7), Buffer 1 (Wo 8-9), Phase 3 (Wo 10-15).
> The requirement IDs below use the **original roadmap week numbering** (Wo 1-13 for Phases 0-3).

---

## 1. IMPLEMENTATION_ROADMAP.md

> **Primary source of deliverables.** Contains explicit week-by-week task tables and checked/unchecked deliverable lists per phase.

### Phase 0 — Foundation (Weeks 1-2)

#### Week 1 — New Repo + Scaffolding

| ID          | Requirement                                                                                                 | Status |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| IR-P0-W1-01 | Create new GitHub repo `dento-v2` (private), MIT License, `.gitignore`, README.md                           | ✅     |
| IR-P0-W1-02 | Initialize monorepo: `pnpm init`, `pnpm-workspace.yaml`, Turborepo config                                   | ✅     |
| IR-P0-W1-03 | Create folder structure: `apps/api`, `apps/admin`, `apps/developer`, `packages/shared`, `packages/ui`       | ✅     |
| IR-P0-W1-04 | Migrate docs: `Docs/v2/*` from old repo → `docs/` in new repo                                               | ✅     |
| IR-P0-W1-05 | Payload CMS 3.x Setup in `apps/api`, MongoDB connection, first admin collection                             | ✅     |
| IR-P0-W1-06 | MongoDB Atlas M10 cluster setup (user, network, connection string)                                          | ✅     |
| IR-P0-W1-07 | Fastify 5.x Tenant-API: Server alongside Payload, `useDb()` middleware skeleton                             | ✅     |
| IR-P0-W1-08 | Redis 7 setup: local (Docker) + Upstash for production                                                      | ✅     |
| IR-P0-W1-09 | TailAdmin integration: Admin + Developer apps with TailAdmin Free template, routing setup                   | ✅     |
| IR-P0-W1-10 | Tailwind CSS 4 + RTL: `tailwind.config.ts`, logical properties (`ms-`, `me-`, `ps-`, `pe-`), LTR/RTL toggle | ✅     |
| IR-P0-W1-11 | Docker Compose: `docker-compose.yml` (MongoDB + Redis + API + Admin + Developer)                            | ✅     |
| IR-P0-W1-12 | 🔒 Helmet + CORS + CSP: `@fastify/helmet`, `@fastify/cors`, CSP headers on first route                      | ✅     |
| IR-P0-W1-13 | 🔒 `.env` Security: `.env.example` with all secret placeholders, `.gitignore` for `.env*`                   | ✅     |

#### Week 2 — Shared Packages + CI

| ID          | Requirement                                                                                  | Status |
| ----------- | -------------------------------------------------------------------------------------------- | ------ |
| IR-P0-W2-01 | `packages/shared`: Zod Schemas, TypeScript Types, Utils, Constants, Enums                    | ✅     |
| IR-P0-W2-02 | `packages/ui`: Button, Input, Card, Select, Modal, Badge — Tailwind/Shadcn base components   | ✅     |
| IR-P0-W2-03 | ESLint + Prettier: Flat config, Husky pre-commit hook, lint-staged                           | ✅     |
| IR-P0-W2-04 | GitHub Actions CI: Lint → Type Check → Build (Turborepo)                                     | ✅     |
| IR-P0-W2-05 | 🔒 CI Security Gate: `pnpm audit --audit-level=high` + TruffleHog secret scan in CI pipeline | ✅     |
| IR-P0-W2-06 | Vitest Setup: Unit test config for `packages/shared`, API route tests skeleton               | ✅     |
| IR-P0-W2-07 | Smoke Test: Login screen → Dashboard → CRUD of test collection → success                     | ✅     |

#### Phase 0 Deliverable Checklist

| ID        | Deliverable                                                        | Status |
| --------- | ------------------------------------------------------------------ | ------ |
| IR-P0-D01 | New repo `dento-v2` on GitHub created + docs migrated              | ✅     |
| IR-P0-D02 | `pnpm dev` starts all 3 apps + Docker services                     | ✅     |
| IR-P0-D03 | Admin app shows TailAdmin Dashboard (LTR + RTL toggle)             | ✅     |
| IR-P0-D04 | Developer app shows TailAdmin Dashboard                            | ✅     |
| IR-P0-D05 | API responds on `/health` + `/api/test-crud`                       | ✅     |
| IR-P0-D06 | CI Pipeline: Push → Lint → Build → Security Audit → green          | ✅     |
| IR-P0-D07 | 🔒 Helmet + CORS + CSP active on every API response                | ✅     |
| IR-P0-D08 | 🔒 `.env.example` with all secret placeholders, no secrets in code | ✅     |
| IR-P0-D09 | 🔒 TruffleHog + `pnpm audit` run in CI                             | ✅     |
| IR-P0-D10 | Zustand Store functional in Admin App                              | ✅     |
| IR-P0-D11 | Old repo (`Dento`) archived or marked as readonly                  | ☐      |

---

### Phase 1 — Auth & Tenancy (Weeks 3-4)

#### Week 3 — Auth + Tenant Isolation

| ID          | Requirement                                                                                      | Status |
| ----------- | ------------------------------------------------------------------------------------------------ | ------ |
| IR-P1-W3-01 | Payload Auth Config: Login, Register, JWT (Access + Refresh), Password Reset                     | ✅     |
| IR-P1-W3-02 | 🔒 JWT Dual-Token: Access Token (15min, Memory) + Refresh Token (7d, HttpOnly Cookie) + Rotation | ✅     |
| IR-P1-W3-03 | 🔒 Argon2id password hashing (Decision #1 overrides bcrypt), last 5 passwords blocked            | ✅     |
| IR-P1-W3-04 | Brute-force protection: Redis-based progressive cooldown (3→5min→15min→1h→IP-Block)              | ✅     |
| IR-P1-W3-05 | Tenant CRUD (Platform): `tenants` collection in `dento_platform`, CRUD endpoints                 | ✅     |
| IR-P1-W3-06 | `useDb()` middleware: `mongoose.connection.useDb('tenant_{slug}')` per request                   | ✅     |
| IR-P1-W3-07 | 🔒 RBAC Middleware: `authGuard → tenantDb → roleGuard` — 3-tier middleware chain                 | ✅     |
| IR-P1-W3-08 | 🔒 Permission Matrix: 28 modules × 8 roles, code-defined fixed roles (immutable)                 | ✅     |
| IR-P1-W3-09 | User Invite Flow: Email invite → Activation link → Set password → Complete profile               | ✅     |
| IR-P1-W3-10 | Avatar Upload: S3/R2 upload, resize, thumbnail                                                   | ✅     |
| IR-P1-W3-11 | Tenant Locale System: `country_config` → Language + Currency + Timezone propagation              | ✅     |
| IR-P1-W3-12 | 🔒 Rate Limiting: 3-Tier: Cloudflare (CDN) + `@fastify/rate-limit` (API: 100/min) + Auth (5/min) | ✅     |
| IR-P1-W3-13 | 🔒 Zod Validation: `packages/shared` Zod schemas with `.strict()` on every endpoint              | ✅     |
| IR-P1-W3-14 | 🔒 NoSQL Injection Guard: `$`-operator sanitizer middleware for all inputs                       | ✅     |

#### Week 4 — i18n + Onboarding + Doctor Sync

| ID          | Requirement                                                                                                           | Status |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| IR-P1-W4-01 | i18n System: `translation_packs` collection, `useLocale()` hook, `<T key={...} />` component                          | ✅     |
| IR-P1-W4-02 | EN + AR Seed Packs: Standard translations for all UI labels                                                           | ✅     |
| IR-P1-W4-03 | Doctor-User Sync: bidirectional (Name, Photo, Gender, Phone)                                                          | ✅     |
| IR-P1-W4-04 | Doctor Sharing (Multi-Branch): one doctor, multiple branches with separate schedules                                  | ✅     |
| IR-P1-W4-05 | Tenant Onboarding Wizard: Step 1 Clinic-Info, Step 2 Branch, Step 3 First Admin-User, Step 4 Language/Currency        | ✅     |
| IR-P1-W4-06 | Seed Script: Tenant creation → auto-seed Medications (100), Lab Order Types (14), Translation Packs, Default Settings | ✅     |
| IR-P1-W4-07 | Integration Test: Create tenant → Login → See dashboard → Switch language (EN→AR→EN)                                  | ✅     |

#### Phase 1 Deliverable Checklist

| ID        | Deliverable                                                            | Status |
| --------- | ---------------------------------------------------------------------- | ------ |
| IR-P1-D01 | Login/Register/Forgot-Password functional                              | ✅     |
| IR-P1-D02 | New tenant via API → isolated DB `tenant_{slug}`                       | ✅     |
| IR-P1-D03 | RBAC: tenant_admin sees all, receptionist only Appointments+Patients   | ✅     |
| IR-P1-D04 | i18n: LTR ↔ RTL switch with complete label flip                        | ✅     |
| IR-P1-D05 | Doctor ↔ User Sync works bidirectionally                               | ✅     |
| IR-P1-D06 | Brute-Force: 3+ failed attempts → cooldown active                      | ✅     |
| IR-P1-D07 | 🔒 JWT Access Token only in Memory, Refresh in HttpOnly Cookie         | ✅     |
| IR-P1-D08 | 🔒 Token Rotation on every Refresh call active                         | ✅     |
| IR-P1-D09 | 🔒 3-tier middleware chain (authGuard → tenantDb → roleGuard) enforced | ✅     |
| IR-P1-D10 | 🔒 Rate Limiting: API (100/min) + Auth (5/min) active                  | ✅     |
| IR-P1-D11 | 🔒 Zod `.strict()` validation on every endpoint                        | ✅     |
| IR-P1-D12 | 🔒 NoSQL Injection Guard (`$`-operator blocking) active                | ✅     |
| IR-P1-D13 | 🔒 Tenant Isolation: DB-per-Tenant via `useDb()` verified              | ✅     |

---

### Phase 2 — Dev Portal + Core Admin (Weeks 5-7)

#### Week 5 — Dev Portal Core

| ID          | Requirement                                                                                                       | Status |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| IR-P2-W5-01 | Tenant List + Detail (10 Tabs): Overview, Users, Modules, DB, Billing, Branding, Settings, Support, Logs, Backups | ✅     |
| IR-P2-W5-02 | Module Management: activate/deactivate modules per tenant, price config                                           | ✅     |
| IR-P2-W5-03 | DB Explorer (React UI): browse collections, view documents (readonly), index info                                 | ✅     |
| IR-P2-W5-04 | Ticketing System: Ticket CRUD, Priority (P1-P4), SLA Timer, Status-Flow                                           | ✅     |
| IR-P2-W5-05 | Tenant Impersonation: `support_sessions`, temp JWT (60min), banner, audit-trail                                   | ✅     |

#### Week 6 — Dev Portal Advanced + Payments

| ID          | Requirement                                                                                                        | Status |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| IR-P2-W6-01 | Module Versioning: version-tracking, canary rollout (5%→25%→50%→100%)                                              | ✅     |
| IR-P2-W6-02 | 🔒 Webhook System (Platform-Level): webhook_endpoints, webhook_deliveries, retry with backoff, HMAC-SHA256 signing | ✅     |
| IR-P2-W6-03 | Pricing System: Module pricing CRUD, coupons, discounts, trials                                                    | ✅     |
| IR-P2-W6-04 | Paymob Integration: Cards, Fawry, Mobile Wallets, InstaPay, ValU, Meeza                                            | ✅     |
| IR-P2-W6-05 | Stripe Integration: Cards, SEPA for international tenants                                                          | ✅     |
| IR-P2-W6-06 | Per-Tenant Backup: BullMQ Worker + mongodump → S3/R2 + UI in Dev Portal                                            | ✅     |
| IR-P2-W6-07 | 🔒 API Rate Limiting: Redis-based per API Key, configurable                                                        | ✅     |
| IR-P2-W6-08 | 🔒 API Key Hashing: SHA-256 hash in DB, plaintext shown only once                                                  | ✅     |

#### Week 7 — Admin Shell + Operations Hub

| ID          | Requirement                                                                                             | Status |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------ |
| IR-P2-W7-01 | Admin Sidebar + Routing: all 28 module links, groups, icons, RBAC-based visibility                      | ✅     |
| IR-P2-W7-02 | Dashboard Redesign: 8 widgets + sparklines + trend comparison + waiting room widget                     | ✅     |
| IR-P2-W7-03 | Recharts Integration: Bar, Line, Pie charts for dashboard                                               | ✅     |
| IR-P2-W7-04 | Daily Operations Hub: Walk-ins + Appointments + Waiting room + Chair dashboard + Queue numbers          | ✅     |
| IR-P2-W7-05 | Socket.io Setup: Real-time queue updates, notification bell, chair status                               | ✅     |
| IR-P2-W7-06 | Notification Center (Shell): In-App bell + dropdown with Socket.io push                                 | ✅     |
| IR-P2-W7-07 | Notification Preferences: User/Patient-specific channels × categories + quiet hours                     | ✅     |
| IR-P2-W7-08 | BullMQ Notification Workers: 4 queues: Email, SMS, WhatsApp, Push (shell — providers later)             | ✅     |
| IR-P2-W7-09 | Notification Templates: Bilingual templates (EN/AR) per event type                                      | ✅     |
| IR-P2-W7-10 | Alert Rules (configurable): `alert_rules` CRUD + BullMQ checker (15min cron)                            | ✅     |
| IR-P2-W7-11 | Branding Propagation: Logo/colors/name → sidebar, docs, emails                                          | ✅     |
| IR-P2-W7-12 | Lab Order Types: Seed 14 types + custom types CRUD in settings                                          | ✅     |
| IR-P2-W7-13 | Recurring Appointments: Rules management, edit modes (this/future/all), conflict-check, BullMQ cron     | ✅     |
| IR-P2-W7-14 | Reports Shell (Free Tier): Dashboard reports + reports hub + 5 category pages (locked-preview for paid) | ✅     |
| IR-P2-W7-15 | OpenAPI Auto-Gen: `@fastify/swagger` → OpenAPI 3.1 spec                                                 | ✅     |

#### Phase 2 Deliverable Checklist

| ID        | Deliverable                                                   | Status |
| --------- | ------------------------------------------------------------- | ------ |
| IR-P2-D01 | Dev Portal: 16 modules fully functional                       | ✅     |
| IR-P2-D02 | Paymob + Stripe: test payment successful                      | ✅     |
| IR-P2-D03 | Admin: Dashboard with live data + 8 widgets                   | ✅     |
| IR-P2-D04 | Daily Ops: Walk-in register → Queue → Chair assign → treated  | ✅     |
| IR-P2-D05 | Recurring: Series created → visible in calendar as 🔄         | ✅     |
| IR-P2-D06 | Notifications: In-App bell receives Socket.io events          | ✅     |
| IR-P2-D07 | Branding: Logo upload → visible in sidebar + docs             | ✅     |
| IR-P2-D08 | 🔒 Webhooks: HMAC-SHA256 signing + timestamp verified         | ✅     |
| IR-P2-D09 | 🔒 API Keys: SHA-256 hashed in DB, plaintext only at creation | ✅     |
| IR-P2-D10 | 🔒 Rate Limiting: Per API Key configurable                    | ✅     |

---

### Phase 3 — Core Clinical (Weeks 8-13)

#### Week 8 — Patients + Appointments

| ID          | Requirement                                                                                               | Status |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------ |
| IR-P3-W8-01 | Patients CRUD: List + Detail + Search + Tabs (Info, History, Charts, X-Rays, Billing)                     | ✅     |
| IR-P3-W8-02 | Patient Allergies/MedHistory: Embedded arrays, UI for entry/editing                                       | ✅     |
| IR-P3-W8-03 | 🔒 PII Field Encryption: AES-256-GCM for `nationalId`, `phone`, `email`, `address` in patients collection | ✅     |
| IR-P3-W8-04 | Appointment Calendar: FullCalendar integration, day/week/month views, RTL support                         | ✅     |
| IR-P3-W8-05 | Appointment CRUD: Create, edit, cancel, status flow, drag & drop                                          | ✅     |
| IR-P3-W8-06 | Appointment Types: CRUD + color coding + default duration                                                 | ✅     |
| IR-P3-W8-07 | Waitlist: Put patients on waitlist, notify on slot availability                                           | ✅     |
| IR-P3-W8-08 | Schedule Validation: 3-level: Branch Hours → Doctor Schedule → Appointment Conflict                       | ✅     |

#### Week 9 — Scheduling + Booking

| ID          | Requirement                                                                                    | Status |
| ----------- | ---------------------------------------------------------------------------------------------- | ------ |
| IR-P3-W9-01 | Doctor Schedules: CRUD + calendar overlay in appointment calendar                              | ✅     |
| IR-P3-W9-02 | Schedule Exceptions: Vacation, sick, Ramadan — blocks slots                                    | ✅     |
| IR-P3-W9-03 | Slot-Engine: Branch + Doctor + Exceptions + existing appointments → available slots            | ✅     |
| IR-P3-W9-04 | Online-Booking API: 4 public endpoints: branches, doctors, slots, booking (API Key Auth)       | ✅     |
| IR-P3-W9-05 | Online-Booking Confirmation: Receptionist confirm/modify+confirm/reject + patient notification | ✅     |
| IR-P3-W9-06 | Ramadan Mode: Branch ramadanHours + auto-switch + slot-engine integration                      | ✅     |
| IR-P3-W9-07 | Branch Holidays: Per branch configurable, blocks booking                                       | ✅     |
| IR-P3-W9-08 | Booking Window + Lead Time: Max N days ahead, min N minutes before                             | ✅     |
| IR-P3-W9-09 | Staff Schedules + Shifts: staff_schedules, shift_templates CRUD                                | ✅     |
| IR-P3-W9-10 | Leave Requests (Part 1): Create + review flow                                                  | ✅     |
| IR-P3-W9-11 | Leave ↔ Schedule Sync: Approved leave → auto schedule_exception                                | ✅     |

#### Week 10 — Dental Chart + Treatment Plans + Procedures

| ID           | Requirement                                                                                     | Status |
| ------------ | ----------------------------------------------------------------------------------------------- | ------ |
| IR-P3-W10-01 | Dental Chart: `react-odontogram` v0.5.5 wrapper, FDI native, Adult/Child toggle, condition grid | ✅     |
| IR-P3-W10-02 | Dental Chart Detail Panel: 5-surface SVG, severity, tooth notes/notice, case label              | ✅     |
| IR-P3-W10-03 | Dental Chart History: Snapshots (manual + treatment_plan + treatment), view/compare             | ✅     |
| IR-P3-W10-04 | Dental Chart Mini: Reusable `<DentalChartMini>` for treatment plans + patient overview          | ✅     |
| IR-P3-W10-05 | Dental Chart Print: Printable HTML with legend + summary + notes                                | ✅     |
| IR-P3-W10-06 | Treatment Plans: CRUD + items (embedded), status flow (draft→approved→in_progress→completed)    | ✅     |
| IR-P3-W10-07 | Treatment Plan ↔ Chart: Items linked via tooth number, mini-chart in plan detail                | ✅     |
| IR-P3-W10-08 | Procedure Notes: CRUD + templates, teeth involved, direct + plan-based                          | ✅     |
| IR-P3-W10-09 | Procedure Note Templates: Predefined templates per service type                                 | ✅     |

#### Week 11 — Imaging + Prescriptions

| ID           | Requirement                                                                                                         | Status |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ------ |
| IR-P3-W11-01 | X-Rays: Upload (S3/R2), CRUD, multi-tooth tagging (`toothNumbers[]`), viewer                                        | ✅     |
| IR-P3-W11-02 | 🔒 File Upload Security: Magic-bytes MIME check, whitelist, size limits, UUID filename, EXIF strip, pre-signed URLs | ✅     |
| IR-P3-W11-03 | CBCT: Orders + scan upload + report (embedded), S3 storage                                                          | ✅     |
| IR-P3-W11-04 | Clinical Cross-Linking: X-Ray ↔ Treatment Plan ↔ Procedure Note bidirectional                                       | ✅     |
| IR-P3-W11-05 | `<ImagingLinker />`: Reusable component for all forms                                                               | ✅     |
| IR-P3-W11-06 | Imaging Requirements: Service → Required Imaging + auto-check + waive option                                        | ✅     |
| IR-P3-W11-07 | Pre/Post-Op Imaging: Before/after linking + side-by-side viewer                                                     | ✅     |
| IR-P3-W11-08 | Imaging Timeline: PatientView tab — chronological overview of all images                                            | ✅     |
| IR-P3-W11-09 | Dental Chart → Imaging: Click tooth → all linked X-Rays, CBCTs, treatments                                          | ✅     |
| IR-P3-W11-10 | Prescriptions: CRUD + items (embedded), medications autocomplete, print                                             | ✅     |
| IR-P3-W11-11 | Medications Catalog: `medications` collection, 100 seed medications, custom addable                                 | ✅     |

#### Week 12 — Lab + Services + Documents + Chat

| ID           | Requirement                                                                                                          | Status                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| IR-P3-W12-01 | Lab Orders: CRUD + status flow (ordered→fabricating→ready→delivered), lab tracking                                   | ✅                                      |
| IR-P3-W12-02 | Dental Labs: CRUD, rating, contact info                                                                              | ✅                                      |
| IR-P3-W12-03 | Services: CRUD + categories, default duration, default price                                                         | ✅                                      |
| IR-P3-W12-04 | Service Default Materials: `defaultMaterials[]` for auto-inventory deduction (prepared for Phase 5)                  | ✅                                      |
| IR-P3-W12-05 | `<ClinicHeader />`: Unified header for all document templates (branding)                                             | ✅                                      |
| IR-P3-W12-06 | Document Templates: Invoice, Prescription, Treatment Plan, Consent, Lab Order with branding                          | ✅                                      |
| IR-P3-W12-07 | Consent Forms: Templates CRUD + signature widget + PDF generation                                                    | ☐ (Model + Signature done, PDF pending) |
| IR-P3-W12-08 | 🔒 Staff Chat: Socket.io chat — DM, branch groups, role groups, attachments, reply/thread — chat retention + privacy | ✅                                      |
| IR-P3-W12-09 | Chat Channels: 5 types: direct, branch, role, custom, announcement + auto-channels                                   | ✅                                      |

#### Week 13 — Notification Integration + Scheduled Jobs

| ID           | Requirement                                                                                                   | Status |
| ------------ | ------------------------------------------------------------------------------------------------------------- | ------ |
| IR-P3-W13-01 | Appointment Reminders: BullMQ cron — 24h + 1h before appointment (SMS/Email/WhatsApp)                         | ✅     |
| IR-P3-W13-02 | Auto-No-Show: BullMQ job — auto no-show after configurable time                                               | ✅     |
| IR-P3-W13-03 | Scheduled Notifications: Recall, payment due, low stock, expiry alerts                                        | ✅     |
| IR-P3-W13-04 | Web Push Notifications: VAPID keys + Service Worker + Push API                                                | ✅     |
| IR-P3-W13-05 | 🔒 Tenant-Level Webhooks: Admin Portal webhook CRUD + events + test + logs — HMAC-SHA256 signing              | ✅     |
| IR-P3-W13-06 | Custom Fields: Dynamic fields per entity (patients, invoices, etc.)                                           | ✅     |
| IR-P3-W13-07 | 🔒 Audit Logging: Every mutation logged — userId, action, before/after, IP, timestamp                         | ✅     |
| IR-P3-W13-08 | Workflows (BullMQ): Automation rules — Event → Condition → Action (free)                                      | ✅     |
| IR-P3-W13-09 | Settings Page: All tenant settings (General, Branding, Locale, Notifications, Webhooks)                       | ✅     |
| IR-P3-W13-10 | 🔒 2FA/MFA (TOTP): `otplib` + `qrcode` — QR-code setup, 6-digit verification, backup codes, optional per user | ✅     |

#### Phase 3 Deliverable Checklist

| ID        | Deliverable                                                                     | Status          |
| --------- | ------------------------------------------------------------------------------- | --------------- |
| IR-P3-D01 | Patient create → Book appointment → Fill dental chart → Treatment plan          | ✅              |
| IR-P3-D02 | X-Ray upload → Link to tooth + treatment plan → Visible in chart                | ✅              |
| IR-P3-D03 | Prescription write → Medications autocomplete → Print                           | ✅              |
| IR-P3-D04 | Lab Order send → Status updates → delivered                                     | ✅              |
| IR-P3-D05 | Staff Chat: Send message → Instant receive (Socket.io)                          | ✅              |
| IR-P3-D06 | Online-Booking: Book slot → Receptionist confirms → Patient notification        | ✅              |
| IR-P3-D07 | Consent Form: Select template → Patient signs → PDF                             | ☐ (PDF pending) |
| IR-P3-D08 | 🔒 PII Field Encryption: Patient `nationalId`, `phone`, `email` encrypted in DB | ✅              |
| IR-P3-D09 | 🔒 File Upload: Magic-bytes check + EXIF strip + pre-signed URLs active         | ✅              |
| IR-P3-D10 | 🔒 Audit Logging: Every CRUD mutation logged (before/after)                     | ✅              |
| IR-P3-D11 | 🔒 Webhooks: HMAC-SHA256 signing on tenant-level verified                       | ✅              |
| IR-P3-D12 | 🔒 2FA/MFA: TOTP setup (QR-code) + login verification + backup codes            | ✅              |

---

## 2. DENTO_V2_MASTER_PLAN.md

> **Supplementary deep-dive requirements** for features scheduled in Weeks 0-12. Organized by section number.

### §1-§2 Tech Stack & Project Structure (Phase 0)

| ID       | Requirement                          | Week/Phase     |
| -------- | ------------------------------------ | -------------- |
| MP-§1-01 | Node.js 20.x LTS runtime             | Phase 0 / Wo 1 |
| MP-§1-02 | pnpm 9.x as package manager          | Phase 0 / Wo 1 |
| MP-§1-03 | Turborepo for monorepo orchestration | Phase 0 / Wo 1 |
| MP-§1-04 | Payload CMS 3.x for platform layer   | Phase 0 / Wo 1 |
| MP-§1-05 | Fastify 5.x for tenant layer         | Phase 0 / Wo 1 |
| MP-§1-06 | React 19.x + Vite 7.x for frontends  | Phase 0 / Wo 1 |
| MP-§1-07 | MongoDB Atlas 7.x as database        | Phase 0 / Wo 1 |
| MP-§1-08 | Redis 7.x for caching/sessions       | Phase 0 / Wo 1 |
| MP-§1-09 | BullMQ 5.x for job queues            | Phase 0 / Wo 1 |

### §6 Tenant Isolation Architecture (Phase 1)

| ID       | Requirement                                                                   | Week/Phase     |
| -------- | ----------------------------------------------------------------------------- | -------------- |
| MP-§6-01 | Database-per-tenant pattern: `mongoose.connection.useDb('tenant_{slug}')`     | Phase 1 / Wo 3 |
| MP-§6-02 | Tenant resolution via `X-Tenant-Slug` header (Decision #33)                   | Phase 1 / Wo 3 |
| MP-§6-03 | Platform DB `dento_platform` for users, tenants, modules, pricing, audit_logs | Phase 1 / Wo 3 |
| MP-§6-04 | Tenant DB auto-created on tenant registration                                 | Phase 1 / Wo 3 |

### §7-§8 Dev Portal (Phase 2)

| ID       | Requirement                                                                                                | Week/Phase      |
| -------- | ---------------------------------------------------------------------------------------------------------- | --------------- |
| MP-§7-01 | Dev Portal Sidebar: 18 navigation modules (grouped)                                                        | Phase 2 / Wo 5  |
| MP-§7-02 | API Catalog: auto-generated from OpenAPI spec                                                              | Phase 2 / Wo 7  |
| MP-§7-03 | Custom Fields management UI                                                                                | Phase 3 / Wo 13 |
| MP-§8-01 | Tenant Detail: 10 tabs (Overview, Users, Modules, DB, Billing, Branding, Settings, Support, Logs, Backups) | Phase 2 / Wo 5  |
| MP-§8-02 | Each tab has specific data panels and actions documented                                                   | Phase 2 / Wo 5  |

### §9 Ticketing System (Phase 2)

| ID       | Requirement                                                                                             | Week/Phase     |
| -------- | ------------------------------------------------------------------------------------------------------- | -------------- |
| MP-§9-01 | `support_tickets` collection: P1-P4 priority, SLA timer, status flow (open→in_progress→resolved→closed) | Phase 2 / Wo 5 |
| MP-§9-02 | Impersonation system: `support_sessions` collection, temp JWT (60min), yellow banner, audit trail       | Phase 2 / Wo 5 |
| MP-§9-03 | Impersonation security: no write to settings/billing, full audit log                                    | Phase 2 / Wo 5 |

### §10 Admin Portal Modules — 28 Modules (Phases 2-5)

Modules relevant to Weeks 0-12 (Phases 0-3):

| ID        | Module                   | Phase/Week                       |
| --------- | ------------------------ | -------------------------------- |
| MP-§10-01 | #1 Dashboard             | Phase 2 / Wo 7                   |
| MP-§10-02 | #2 Patients              | Phase 3 / Wo 8                   |
| MP-§10-03 | #3 Appointments          | Phase 3 / Wo 8-9                 |
| MP-§10-04 | #4 Dental Charting       | Phase 3 / Wo 10                  |
| MP-§10-05 | #5 Treatment Plans       | Phase 3 / Wo 10                  |
| MP-§10-06 | #6 Procedure Notes       | Phase 3 / Wo 10                  |
| MP-§10-07 | #7 Daily Operations Hub  | Phase 2 / Wo 7                   |
| MP-§10-08 | #10 Prescriptions        | Phase 3 / Wo 11                  |
| MP-§10-09 | #11 X-Rays (Imaging)     | Phase 3 / Wo 11                  |
| MP-§10-10 | #12 CBCT                 | Phase 3 / Wo 11                  |
| MP-§10-11 | #13 Lab Orders           | Phase 3 / Wo 12                  |
| MP-§10-12 | #16 Services Catalog     | Phase 3 / Wo 12                  |
| MP-§10-13 | #19 Schedules + Calendar | Phase 3 / Wo 9                   |
| MP-§10-14 | #20 Leave Management     | Phase 3 / Wo 9                   |
| MP-§10-15 | #24 Consent Forms        | Phase 3 / Wo 12                  |
| MP-§10-16 | #25 Notifications        | Phase 2 / Wo 7 + Phase 3 / Wo 13 |
| MP-§10-17 | #26 Webhooks (Tenant)    | Phase 3 / Wo 13                  |
| MP-§10-18 | #28 Settings             | Phase 3 / Wo 13                  |

### §11 Module Catalog (Phase 2)

| ID        | Requirement                                                                                     | Week/Phase     |
| --------- | ----------------------------------------------------------------------------------------------- | -------------- |
| MP-§11-01 | 11 paid modules with pricing configured (e.g., dental-charting $49/mo, prescriptions $19/mo)    | Phase 2 / Wo 6 |
| MP-§11-02 | 5 removed modules from v1 documented (no migration needed)                                      | Phase 2 / Wo 6 |
| MP-§11-03 | 4 free platform capabilities (Dashboard, Daily Ops, Settings, User Management) always available | Phase 2 / Wo 6 |

### §12 User Onboarding & Invite System (Phase 1)

| ID        | Requirement                                                              | Week/Phase     |
| --------- | ------------------------------------------------------------------------ | -------------- |
| MP-§12-01 | User document schema: status flow (invited→active→suspended→deactivated) | Phase 1 / Wo 3 |
| MP-§12-02 | Invite flow: email → activation link → set password → profile completion | Phase 1 / Wo 3 |
| MP-§12-03 | Profile completion: name, photo upload (S3), phone verification          | Phase 1 / Wo 3 |

### §13 Doctor Data Model (Phase 1)

| ID        | Requirement                                                                                  | Week/Phase     |
| --------- | -------------------------------------------------------------------------------------------- | -------------- |
| MP-§13-01 | Doctor schema: name (i18n), specialty, license, certificates (embedded), commission rate     | Phase 1 / Wo 4 |
| MP-§13-02 | User ↔ Doctor bidirectional sync (name, photo, gender, phone)                                | Phase 1 / Wo 4 |
| MP-§13-03 | Multi-branch support: `assignedBranches[]`, `primaryBranchId`, separate schedules per branch | Phase 1 / Wo 4 |

### §14 Logo & Branding Propagation (Phase 2)

| ID        | Requirement                                                                        | Week/Phase     |
| --------- | ---------------------------------------------------------------------------------- | -------------- |
| MP-§14-01 | Branding document schema: logo (3 sizes), clinic name (i18n), colors, contact info | Phase 2 / Wo 7 |
| MP-§14-02 | Propagation: branding flows to sidebar, header, emails, PDFs, docs, online booking | Phase 2 / Wo 7 |

### §15 Document Templates (Phase 3)

| ID        | Requirement                                                                      | Week/Phase      |
| --------- | -------------------------------------------------------------------------------- | --------------- |
| MP-§15-01 | `<ClinicHeader />` component: unified header with logo, clinic name, doctor info | Phase 3 / Wo 12 |
| MP-§15-02 | Invoice template: header + patient info + line items + totals                    | Phase 3 / Wo 12 |
| MP-§15-03 | Prescription template: header + doctor info + medication list + signature        | Phase 3 / Wo 12 |
| MP-§15-04 | Treatment Plan template: header + items table + estimated costs + signatures     | Phase 3 / Wo 12 |
| MP-§15-05 | Consent Form template: header + content + risks + patient/witness signatures     | Phase 3 / Wo 12 |
| MP-§15-06 | Lab Order template: header + order details + tooth/shade info                    | Phase 3 / Wo 12 |

### §17 Clinical Cross-Linking (Phase 3)

| ID        | Requirement                                                                                                                              | Week/Phase      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| MP-§17-01 | X-Rays: new fields — `treatmentPlanId`, `procedureNoteId`, `dentalChartEntryId`, `clinicalPurpose`, `toothNumbers[]`, `comparedToXrayId` | Phase 3 / Wo 11 |
| MP-§17-02 | CBCT Orders: new fields — `treatmentPlanId`, `procedureNoteId`, `appointmentId`, `clinicalPurpose`                                       | Phase 3 / Wo 11 |
| MP-§17-03 | Treatment Plans: new fields — `linkedXrays[]`, `linkedCbcts[]`, items[].`linkedXrays[]`, items[].`requiredImaging[]`                     | Phase 3 / Wo 11 |
| MP-§17-04 | Procedure Notes: fix unused FK `treatmentPlanId` + add `linkedXrays[]`, `linkedCbcts[]`, `preOpXrays[]`, `postOpXrays[]`                 | Phase 3 / Wo 11 |
| MP-§17-05 | `<ImagingLinker />` reusable component used in 5+ forms                                                                                  | Phase 3 / Wo 11 |
| MP-§17-06 | Cross-module navigation: clickable badges/links between all related entities                                                             | Phase 3 / Wo 11 |
| MP-§17-07 | Patient Imaging Timeline: new tab in PatientView with chronological overview                                                             | Phase 3 / Wo 11 |
| MP-§17-08 | Dental Chart integration: click tooth → see all linked X-Rays, CBCTs, treatments                                                         | Phase 3 / Wo 11 |
| MP-§17-09 | Imaging Requirements: Service → required imaging config, auto-check, waive option                                                        | Phase 3 / Wo 11 |
| MP-§17-10 | Pre/Post-Op comparison: `preOpXrays[]`/`postOpXrays[]` + side-by-side viewer                                                             | Phase 3 / Wo 11 |

### §18 Walk-in Queue & Daily Operations Hub (Phase 2-3)

| ID        | Requirement                                                                                                                  | Week/Phase      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------- |
| MP-§18-01 | `walk_in_queue` collection: queue number, priority, status flow (waiting→called→in_chair→completed), timestamps              | Phase 2 / Wo 7  |
| MP-§18-02 | `queue_counters` collection: atomic daily counter per branch (`$inc`)                                                        | Phase 2 / Wo 7  |
| MP-§18-03 | `chairs` collection: per-branch, i18n name, type (standard/pediatric/surgery/hygiene)                                        | Phase 2 / Wo 7  |
| MP-§18-04 | Appointment arrival tracking: `arrivedAt`, `arrivalStatus`, `queueNumber`, `chairId`, `calledAt`, `inChairAt`, `completedAt` | Phase 2 / Wo 7  |
| MP-§18-05 | Unified Daily Ops Hub: 5 tabs (All Today, Scheduled, Walk-ins, Waiting Room, In Chair), 6 stat cards                         | Phase 2 / Wo 7  |
| MP-§18-06 | Chair availability: Real-time view of occupied/available chairs                                                              | Phase 2 / Wo 7  |
| MP-§18-07 | Walk-in → Appointment conversion                                                                                             | Phase 2 / Wo 7  |
| MP-§18-08 | Real-time via Socket.io: instant UI updates for queue changes                                                                | Phase 2 / Wo 7  |
| MP-§18-09 | Estimated wait time calculation                                                                                              | Phase 2 / Wo 7  |
| MP-§18-10 | Auto-No-Show BullMQ job: configurable timeout per tenant                                                                     | Phase 3 / Wo 13 |

### §19 Recurring Appointments (Phase 2)

| ID        | Requirement                                                                                      | Week/Phase     |
| --------- | ------------------------------------------------------------------------------------------------ | -------------- |
| MP-§19-01 | `recurring_rules` collection: 7 recurrence types (daily→annual), status flow, conflict detection | Phase 2 / Wo 7 |
| MP-§19-02 | Appointments linked via `recurringRuleId`, `isRecurring`, `occurrenceIndex`                      | Phase 2 / Wo 7 |
| MP-§19-03 | BullMQ cron job: generate appointments 4 weeks ahead                                             | Phase 2 / Wo 7 |
| MP-§19-04 | Edit modes: "This occurrence only", "This and all future", "All in series"                       | Phase 2 / Wo 7 |
| MP-§19-05 | Cancel modes: Cancel single, cancel all future, pause series                                     | Phase 2 / Wo 7 |
| MP-§19-06 | Recurring Rules Management page: `/appointments/recurring`                                       | Phase 2 / Wo 7 |
| MP-§19-07 | Series Detail View: `/appointments/recurring/:ruleId` with occurrences table, progress bar       | Phase 2 / Wo 7 |
| MP-§19-08 | Calendar integration: 🔄 icon on recurring appointments, tooltip, "View Series" button           | Phase 2 / Wo 7 |
| MP-§19-09 | Holiday skip + conflict skip options                                                             | Phase 2 / Wo 7 |

### §20 Notifications & Messaging System (Phase 2-3)

| ID        | Requirement                                                                                                       | Week/Phase      |
| --------- | ----------------------------------------------------------------------------------------------------------------- | --------------- |
| MP-§20-01 | `notification_templates` collection: key, category, channels (email/sms/whatsapp/push), bilingual content (EN/AR) | Phase 2 / Wo 7  |
| MP-§20-02 | `notification_queue` collection: BullMQ-backed processing with retry, scheduling, priority                        | Phase 2 / Wo 7  |
| MP-§20-03 | `notification_logs` collection: delivery status tracking                                                          | Phase 2 / Wo 7  |
| MP-§20-04 | In-app notification bell: Socket.io real-time + unread count                                                      | Phase 2 / Wo 7  |
| MP-§20-05 | Notification preferences: per user/patient, channels × categories, quiet hours                                    | Phase 2 / Wo 7  |
| MP-§20-06 | `alert_rules` collection: configurable triggers (low stock, overdue invoice, etc.)                                | Phase 2 / Wo 7  |
| MP-§20-07 | Web Push Notifications: VAPID keys + Service Worker                                                               | Phase 3 / Wo 13 |
| MP-§20-08 | Appointment reminders: 24h + 1h before via SMS/Email/WhatsApp                                                     | Phase 3 / Wo 13 |

### §22 Scheduling & Availability System (Phase 3)

| ID        | Requirement                                                                                                 | Week/Phase     |
| --------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| MP-§22-01 | `doctor_schedules` collection: weekly plan per doctor per branch                                            | Phase 3 / Wo 9 |
| MP-§22-02 | `schedule_exceptions` collection: vacation, sick, conference, holiday                                       | Phase 3 / Wo 9 |
| MP-§22-03 | Slot-Engine: compute available slots from branch hours + doctor schedule + exceptions + booked appointments | Phase 3 / Wo 9 |
| MP-§22-04 | Online-Booking: 4 public endpoints (branches, doctors, slots, booking) with API Key auth                    | Phase 3 / Wo 9 |
| MP-§22-05 | Booking confirmation workflow: receptionist approve/modify/reject + notification                            | Phase 3 / Wo 9 |
| MP-§22-06 | Ramadan mode: separate hours, auto-switch based on dates                                                    | Phase 3 / Wo 9 |
| MP-§22-07 | Branch holidays: per-branch holiday config blocking booking                                                 | Phase 3 / Wo 9 |
| MP-§22-08 | Booking window & lead time: max advance days, min notice minutes                                            | Phase 3 / Wo 9 |

### §37 Staff Chat System (Phase 3)

| ID        | Requirement                                                                               | Week/Phase      |
| --------- | ----------------------------------------------------------------------------------------- | --------------- |
| MP-§37-01 | `chat_channels` collection: 5 types (direct, branch, role, custom, announcement)          | Phase 3 / Wo 12 |
| MP-§37-02 | `chat_messages` collection: text/image/file/voice/system types, reply/thread, edit/delete | Phase 3 / Wo 12 |
| MP-§37-03 | Socket.io real-time messaging                                                             | Phase 3 / Wo 12 |
| MP-§37-04 | Chat panel in sidebar (non-blocking — doesn't interrupt workflow)                         | Phase 3 / Wo 12 |
| MP-§37-05 | Auto-channels: branch channels auto-created per branch, role channels per role            | Phase 3 / Wo 12 |
| MP-§37-06 | Chat retention: TTL 365 days (configurable)                                               | Phase 3 / Wo 12 |
| MP-§37-07 | Unread counter per channel per user (`members[].lastReadAt`)                              | Phase 3 / Wo 12 |
| MP-§37-08 | File/image attachments with thumbnail generation                                          | Phase 3 / Wo 12 |

---

## 3. TECH_REQUIREMENTS.md

> **Runtime, dependency, and configuration requirements** for Weeks 0-12.

### Runtime & Tooling (Phase 0)

| ID    | Requirement                                   | Week/Phase     |
| ----- | --------------------------------------------- | -------------- |
| TR-01 | Node.js ≥ 20.x LTS                            | Phase 0 / Wo 1 |
| TR-02 | pnpm 9.x (workspaces)                         | Phase 0 / Wo 1 |
| TR-03 | Docker + Docker Compose for local development | Phase 0 / Wo 1 |
| TR-04 | MongoDB Atlas 7.x (M10 cluster minimum)       | Phase 0 / Wo 1 |
| TR-05 | Redis 7.x (Docker local + Upstash production) | Phase 0 / Wo 1 |

### Core Dependencies — apps/api (Phases 0-3)

| ID    | Requirement                                                  | Week/Phase      |
| ----- | ------------------------------------------------------------ | --------------- |
| TR-06 | Payload CMS 3.x — Platform layer (users, tenants, modules)   | Phase 0 / Wo 1  |
| TR-07 | Fastify 5.x — Tenant API layer                               | Phase 0 / Wo 1  |
| TR-08 | Mongoose 8.x — MongoDB ODM                                   | Phase 0 / Wo 1  |
| TR-09 | BullMQ 5.x — Job queue (notifications, backups, recurring)   | Phase 0 / Wo 1  |
| TR-10 | `@fastify/helmet` + `@fastify/cors` + `@fastify/rate-limit`  | Phase 0 / Wo 1  |
| TR-11 | `@fastify/swagger` for OpenAPI auto-generation               | Phase 2 / Wo 7  |
| TR-12 | `socket.io` + `@socket.io/redis-adapter`                     | Phase 2 / Wo 7  |
| TR-13 | `argon2` for password hashing (Decision #1: replaces bcrypt) | Phase 1 / Wo 3  |
| TR-14 | `otplib` + `qrcode` for 2FA/TOTP                             | Phase 3 / Wo 13 |
| TR-15 | `@aws-sdk/client-s3` for file uploads (S3/R2)                | Phase 1 / Wo 3  |
| TR-16 | `zod` for schema validation (shared package)                 | Phase 0 / Wo 2  |
| TR-17 | `jsonwebtoken` for JWT handling                              | Phase 1 / Wo 3  |
| TR-18 | `pino` + `pino-pretty` for structured logging (Decision #28) | Phase 0 / Wo 1  |

### Core Dependencies — apps/admin (Phases 0-3)

| ID    | Requirement                                                                                 | Week/Phase      |
| ----- | ------------------------------------------------------------------------------------------- | --------------- |
| TR-19 | React 19.x + ReactDOM 19.x                                                                  | Phase 0 / Wo 1  |
| TR-20 | Vite 7.x for build tooling                                                                  | Phase 0 / Wo 1  |
| TR-21 | Tailwind CSS 4.x                                                                            | Phase 0 / Wo 1  |
| TR-22 | TailAdmin Free template integration                                                         | Phase 0 / Wo 1  |
| TR-23 | Shadcn/ui + Radix UI primitives                                                             | Phase 0 / Wo 2  |
| TR-24 | Zustand 5.x for state management                                                            | Phase 0 / Wo 1  |
| TR-25 | TanStack Query 5.x for data fetching                                                        | Phase 0 / Wo 2  |
| TR-26 | TanStack Router for routing                                                                 | Phase 0 / Wo 1  |
| TR-27 | TanStack Table for data tables                                                              | Phase 2 / Wo 5  |
| TR-28 | `@fullcalendar/react` (Free/MIT) for appointment calendar                                   | Phase 3 / Wo 8  |
| TR-29 | `react-odontogram` v0.5.5 for dental chart                                                  | Phase 3 / Wo 10 |
| TR-30 | Recharts for dashboard charts                                                               | Phase 2 / Wo 7  |
| TR-31 | `react-hook-form` + `@hookform/resolvers` for forms                                         | Phase 0 / Wo 2  |
| TR-32 | `react-dropzone` for file uploads                                                           | Phase 3 / Wo 11 |
| TR-33 | `@cornerstonejs/core` + `@cornerstonejs/dicom-image-loader` for DICOM viewer (Decision #29) | Phase 3 / Wo 11 |

### Core Dependencies — apps/developer (Phase 2)

| ID    | Requirement                                         | Week/Phase     |
| ----- | --------------------------------------------------- | -------------- |
| TR-34 | Same React/Vite/Tailwind/Shadcn stack as apps/admin | Phase 0 / Wo 1 |
| TR-35 | Recharts for tenant analytics                       | Phase 2 / Wo 5 |

### Environment Variables (All Phases)

| ID    | Requirement                                                                                                      | Week/Phase     |
| ----- | ---------------------------------------------------------------------------------------------------------------- | -------------- |
| TR-36 | API: `MONGODB_URI`, `PAYLOAD_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `S3_*` credentials | Phase 0-1      |
| TR-37 | API: `ENCRYPTION_MASTER_KEY` (for PII AES-256-GCM encryption)                                                    | Phase 3 / Wo 8 |
| TR-38 | API: `PAYMOB_*`, `STRIPE_*` payment provider credentials                                                         | Phase 2 / Wo 6 |
| TR-39 | Admin: `VITE_API_URL`, `VITE_SOCKET_URL`                                                                         | Phase 0 / Wo 1 |
| TR-40 | Developer: `VITE_API_URL`                                                                                        | Phase 0 / Wo 1 |

### Security Dependencies (Phase 0-3, all $0 cost)

| ID    | Requirement                                                                                                                | Week/Phase  |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| TR-41 | 16 security packages total: argon2, helmet, cors, rate-limit, csrf, otplib, qrcode, etc.                                   | Phased: 0-3 |
| TR-42 | Node.js crypto (built-in) for: AES-256-GCM encryption, HMAC-SHA256, SHA-256 hashing, UUID generation, PBKDF2, random bytes | Phase 1-3   |

---

## 4. SECURITY_AND_ENCRYPTION.md

> **15-layer security architecture with 80+ checkpoints relevant to Weeks 0-12.**

### Layer 1: Network & Transport (Phase 0)

| ID       | Requirement                                   | Week/Phase     |
| -------- | --------------------------------------------- | -------------- |
| SE-L1-01 | TLS 1.3 enforced on all connections           | Phase 0 / Wo 1 |
| SE-L1-02 | HSTS with max-age=31536000, includeSubDomains | Phase 0 / Wo 1 |
| SE-L1-03 | Cloudflare CDN with DDoS protection           | Phase 0 / Wo 1 |

### Layer 2: Authentication (Phase 1)

| ID       | Requirement                                                                   | Week/Phase      |
| -------- | ----------------------------------------------------------------------------- | --------------- |
| SE-L2-01 | Argon2id password hashing (memory: 64MB, iterations: 3, parallelism: 4)       | Phase 1 / Wo 3  |
| SE-L2-02 | JWT dual-token: Access (15min, memory) + Refresh (7d, HttpOnly secure cookie) | Phase 1 / Wo 3  |
| SE-L2-03 | Token rotation: new refresh token on each use, old invalidated                | Phase 1 / Wo 3  |
| SE-L2-04 | Refresh token reuse detection (family invalidation)                           | Phase 1 / Wo 3  |
| SE-L2-05 | Password last 5 history check                                                 | Phase 1 / Wo 3  |
| SE-L2-06 | Progressive brute-force lockout: 3→5min→15min→1h→IP-block via Redis           | Phase 1 / Wo 3  |
| SE-L2-07 | 2FA/TOTP: otplib + qrcode, 6-digit, 30s window, backup codes                  | Phase 3 / Wo 13 |

### Layer 3: Authorization (Phase 1)

| ID       | Requirement                                                                                                   | Week/Phase     |
| -------- | ------------------------------------------------------------------------------------------------------------- | -------------- |
| SE-L3-01 | 8 fixed roles: platform_admin, tenant_admin, manager, dentist, hygienist, assistant, receptionist, accountant | Phase 1 / Wo 3 |
| SE-L3-02 | 28-module × 8-role permission matrix (code-defined, immutable)                                                | Phase 1 / Wo 3 |
| SE-L3-03 | 3-tier middleware: authGuard → tenantDb → roleGuard                                                           | Phase 1 / Wo 3 |
| SE-L3-04 | Row-level tenant isolation via `useDb()`                                                                      | Phase 1 / Wo 3 |

### Layer 4: Data Encryption (Phase 3)

| ID       | Requirement                                                           | Week/Phase     |
| -------- | --------------------------------------------------------------------- | -------------- |
| SE-L4-01 | AES-256-GCM for PII fields: `nationalId`, `phone`, `email`, `address` | Phase 3 / Wo 8 |
| SE-L4-02 | Encryption master key via env var, never in code/DB                   | Phase 3 / Wo 8 |
| SE-L4-03 | Per-field unique IV (initialization vector)                           | Phase 3 / Wo 8 |
| SE-L4-04 | Encrypted search via deterministic hash index                         | Phase 3 / Wo 8 |

### Layer 5: API Security (Phase 1-2)

| ID       | Requirement                                                           | Week/Phase     |
| -------- | --------------------------------------------------------------------- | -------------- |
| SE-L5-01 | Rate limiting 3-tier: CDN (Cloudflare) + API (100/min) + Auth (5/min) | Phase 1 / Wo 3 |
| SE-L5-02 | API keys: SHA-256 hashed in DB, plaintext shown once at creation      | Phase 2 / Wo 6 |
| SE-L5-03 | Webhook HMAC-SHA256 signing with timestamp verification (5min window) | Phase 2 / Wo 6 |
| SE-L5-04 | CORS: strict origin whitelist, no wildcard in production              | Phase 0 / Wo 1 |
| SE-L5-05 | CSP headers via Helmet                                                | Phase 0 / Wo 1 |

### Layer 6: Input Validation (Phase 1)

| ID       | Requirement                                                   | Week/Phase     |
| -------- | ------------------------------------------------------------- | -------------- |
| SE-L6-01 | Zod `.strict()` on every endpoint — reject unknown fields     | Phase 1 / Wo 3 |
| SE-L6-02 | NoSQL injection prevention: `$`-operator sanitizer middleware | Phase 1 / Wo 3 |
| SE-L6-03 | XSS prevention: React auto-escaping + DOMPurify for rich text | Phase 1 / Wo 3 |

### Layer 7: File Upload Security (Phase 3)

| ID       | Requirement                                                                                                                | Week/Phase      |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | --------------- |
| SE-L7-01 | 6-step upload pipeline: size check → MIME magic-bytes → extension whitelist → EXIF strip → virus scan → upload to R2       | Phase 3 / Wo 11 |
| SE-L7-02 | Per-category limits: xray 25MB, cbct 150MB, avatar 5MB, chat 10MB, document 10MB, stl 50MB (Decision #19 corrected values) | Phase 3 / Wo 11 |
| SE-L7-03 | UUID filenames, no user-controlled paths                                                                                   | Phase 3 / Wo 11 |
| SE-L7-04 | Pre-signed URLs for private file access (time-limited)                                                                     | Phase 3 / Wo 11 |
| SE-L7-05 | ClamAV virus scanning in Phase 3 Week 11 (Decision #19)                                                                    | Phase 3 / Wo 11 |

### Layer 8: Session & Token Management (Phase 1)

| ID       | Requirement                                                                 | Week/Phase     |
| -------- | --------------------------------------------------------------------------- | -------------- |
| SE-L8-01 | `user_sessions` collection: track active sessions per user with device info | Phase 1 / Wo 3 |
| SE-L8-02 | "End all other sessions" functionality                                      | Phase 1 / Wo 3 |
| SE-L8-03 | Admin: view and terminate any staff session                                 | Phase 1 / Wo 3 |

### Layer 9: Audit & Monitoring (Phase 3)

| ID       | Requirement                                                                            | Week/Phase      |
| -------- | -------------------------------------------------------------------------------------- | --------------- |
| SE-L9-01 | `audit_logs` collection: userId, action, entity, changes (before/after), IP, timestamp | Phase 3 / Wo 13 |
| SE-L9-02 | Every CRUD mutation logged automatically                                               | Phase 3 / Wo 13 |
| SE-L9-03 | Security alerts: failed login spikes, unusual access patterns                          | Phase 3 / Wo 13 |

### Layer 11: Tenant Isolation (Phase 1)

| ID        | Requirement                                                 | Week/Phase     |
| --------- | ----------------------------------------------------------- | -------------- |
| SE-L11-01 | DB-per-tenant: `mongoose.connection.useDb('tenant_{slug}')` | Phase 1 / Wo 3 |
| SE-L11-02 | No cross-tenant queries possible at DB level                | Phase 1 / Wo 3 |
| SE-L11-03 | Tenant slug validation on every request                     | Phase 1 / Wo 3 |
| SE-L11-04 | 8 enforcement layers for tenant isolation documented        | Phase 1 / Wo 3 |

### Layer 12: Frontend Security (Phase 0-1)

| ID        | Requirement                                                 | Week/Phase     |
| --------- | ----------------------------------------------------------- | -------------- |
| SE-L12-01 | No secrets in frontend bundle (only `VITE_*` prefixed vars) | Phase 0 / Wo 1 |
| SE-L12-02 | Source maps disabled in production                          | Phase 0 / Wo 1 |
| SE-L12-03 | Double validation: Zod on frontend + backend                | Phase 1 / Wo 3 |

### Security Checklist Summary (80+ items by Phase)

| ID        | Requirement                                                                                                         | Week/Phase |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| SE-CHK-01 | Phase 0: 3 security items (Helmet, CORS, CSP, .env security, CI audit)                                              | Phase 0    |
| SE-CHK-02 | Phase 1: 8 security items (JWT, Argon2id, RBAC, rate limit, Zod, NoSQL guard, tenant isolation)                     | Phase 1    |
| SE-CHK-03 | Phase 2: 3 security items (API key hashing, webhook HMAC, per-key rate limiting)                                    | Phase 2    |
| SE-CHK-04 | Phase 3: 6 security items (PII encryption, file upload pipeline, audit logging, chat privacy, tenant webhooks, 2FA) | Phase 3    |

---

## 5. V2_DATABASE.md

> **All MongoDB collection schemas required for Weeks 0-12.**

### Platform DB — `dento_platform` (Phase 0-2)

| ID      | Collection                                                                                         | Week/Phase      |
| ------- | -------------------------------------------------------------------------------------------------- | --------------- |
| DB-P-01 | `users` — platform user accounts (8 roles, profile, 2FA fields, password history)                  | Phase 1 / Wo 3  |
| DB-P-02 | `tenants` — tenant registry (slug, subscription status, billing, trial dates, module entitlements) | Phase 1 / Wo 3  |
| DB-P-03 | `modules` — module catalog (28 modules, slug, pricing, version)                                    | Phase 2 / Wo 5  |
| DB-P-04 | `tenant_modules` — per-tenant module activation (status, billing dates, config overrides)          | Phase 2 / Wo 5  |
| DB-P-05 | `pricing_config` — module pricing, coupons, trials                                                 | Phase 2 / Wo 6  |
| DB-P-06 | `api_keys` — per-tenant API keys (SHA-256 hash, scopes, rate limits, last used)                    | Phase 2 / Wo 6  |
| DB-P-07 | `webhooks` + `webhook_logs` + `webhook_event_types` — platform webhook system                      | Phase 2 / Wo 6  |
| DB-P-08 | `feature_flags` — per-tenant feature toggles                                                       | Phase 2 / Wo 5  |
| DB-P-09 | `saas_invoices` + `saas_payments` + `saas_dunning_log` — SaaS billing                              | Phase 2 / Wo 6  |
| DB-P-10 | `audit_logs` — platform-level audit trail                                                          | Phase 3 / Wo 13 |
| DB-P-11 | `error_logs` — error tracking                                                                      | Phase 0 / Wo 1  |
| DB-P-12 | `support_sessions` — impersonation audit                                                           | Phase 2 / Wo 5  |
| DB-P-13 | `user_sessions` — active session tracking (device info, IP, last activity)                         | Phase 1 / Wo 3  |
| DB-P-14 | `backups` — backup job tracking                                                                    | Phase 2 / Wo 6  |
| DB-P-15 | `deployments` + `domains` — tenant deployment tracking                                             | Phase 2 / Wo 5  |
| DB-P-16 | `country_config` + `translation_packs` — i18n and locale config                                    | Phase 1 / Wo 4  |
| DB-P-17 | Platform globals (singletons): system_settings, branding, currencies, backup_config                | Phase 0-2       |

### Tenant DB — Clinical Collections (Phase 3)

| ID      | Collection                                                                                  | Week/Phase            |
| ------- | ------------------------------------------------------------------------------------------- | --------------------- |
| DB-T-01 | `patients` — main collection (embedded allergies, medical history, family links, insurance) | Phase 3 / Wo 8        |
| DB-T-02 | `dental_charts` — tooth status (FDI numbering, condition, surfaces, perio data)             | Phase 3 / Wo 10       |
| DB-T-03 | `dental_chart_history` — chart snapshots                                                    | Phase 3 / Wo 10       |
| DB-T-04 | `treatment_plans` — embedded items, cross-links to imaging, material reservations           | Phase 3 / Wo 10       |
| DB-T-05 | `procedure_notes` — embedded imaging links (pre/post-op), template reference                | Phase 3 / Wo 10       |
| DB-T-06 | `procedure_note_templates` — predefined templates per procedure type                        | Phase 3 / Wo 10       |
| DB-T-07 | `prescriptions` — embedded items, medication reference, status flow                         | Phase 3 / Wo 11       |
| DB-T-08 | `medications` — catalog (100 seed + custom), dosage defaults, warnings                      | Phase 3 / Wo 11       |
| DB-T-09 | `xrays` — multi-tooth, cross-links, clinical purpose, comparison                            | Phase 3 / Wo 11       |
| DB-T-10 | `cbct_orders` — embedded scan + report (v1: 3 tables → 1 collection)                        | Phase 3 / Wo 11       |
| DB-T-11 | `consent_forms` + `consent_templates` — signed forms with signatures                        | Phase 3 / Wo 12       |
| DB-T-12 | `lab_orders` — order number, status flow, try-in tracking, attachments                      | Phase 3 / Wo 12       |
| DB-T-13 | `dental_labs` — lab registry with rating and specialties                                    | Phase 3 / Wo 12       |
| DB-T-14 | `lab_order_types` — 14 seed types (crown, bridge, denture, etc.)                            | Phase 2 / Wo 7 (seed) |
| DB-T-15 | `xray_types` — 6 seed types (periapical, bitewing, panoramic, etc.)                         | Phase 3 / Wo 11       |

### Tenant DB — Scheduling Collections (Phase 2-3)

| ID      | Collection                                                                                    | Week/Phase     |
| ------- | --------------------------------------------------------------------------------------------- | -------------- |
| DB-T-16 | `appointments` — scheduling, status flow, arrival tracking, queue integration, recurring link | Phase 3 / Wo 8 |
| DB-T-17 | `doctors` — embedded certificates, branch assignments, commission rate                        | Phase 1 / Wo 4 |
| DB-T-18 | `doctor_schedules` + `schedule_exceptions` — weekly plan + exceptions                         | Phase 3 / Wo 9 |
| DB-T-19 | `walk_in_queue` — daily queue with priority and timestamps                                    | Phase 2 / Wo 7 |
| DB-T-20 | `queue_counters` — atomic daily queue number counter                                          | Phase 2 / Wo 7 |
| DB-T-21 | `chairs` — per-branch dental chairs with type                                                 | Phase 2 / Wo 7 |
| DB-T-22 | `appointment_waitlist` + `recurring_appointment_rules` (now `recurring_rules`)                | Phase 2 / Wo 7 |
| DB-T-23 | `appointment_types` — type catalog with color, duration, fee                                  | Phase 3 / Wo 8 |

### Tenant DB — Staff & HR (Phase 3)

| ID      | Collection                                                             | Week/Phase              |
| ------- | ---------------------------------------------------------------------- | ----------------------- |
| DB-T-24 | `staff_schedules` — per-user per-branch weekly plan                    | Phase 3 / Wo 9          |
| DB-T-25 | `shift_templates` — morning/evening/etc. shift definitions             | Phase 3 / Wo 9          |
| DB-T-26 | `leave_requests` + `leave_types` + `leave_balances` — leave management | Phase 3 / Wo 9          |
| DB-T-27 | `attendance` — daily check-in/out, late tracking                       | Phase 3 / Wo 9 (Part 1) |

### Tenant DB — Communication (Phase 2-3)

| ID      | Collection                                                                                          | Week/Phase      |
| ------- | --------------------------------------------------------------------------------------------------- | --------------- |
| DB-T-28 | `chat_channels` — 5 channel types, members with mute/read tracking                                  | Phase 3 / Wo 12 |
| DB-T-29 | `chat_messages` — text/image/file/voice, reply, edit, read receipts, TTL                            | Phase 3 / Wo 12 |
| DB-T-30 | `notification_queue` + `notification_templates` + `notification_logs` — multi-channel notifications | Phase 2 / Wo 7  |

### Tenant DB — Settings (Phase 1-3)

| ID      | Collection                                                                                 | Week/Phase                       |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| DB-T-31 | `settings` — key-value tenant config (clinic, appointment, billing, notifications)         | Phase 1 / Wo 3 + Phase 3 / Wo 13 |
| DB-T-32 | `services` — service catalog with categories, pricing, default materials, required imaging | Phase 3 / Wo 12                  |
| DB-T-33 | `branches` — multi-branch support with addresses, hours, chairs                            | Phase 1 / Wo 4                   |

---

## 6. V2_DECISION_LOG.md

> **Architectural decisions affecting Weeks 0-12 implementation.**

| ID    | Decision                                                                                      | Impact on Weeks 0-12                             |
| ----- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| DL-01 | Argon2id replaces bcrypt everywhere                                                           | Phase 1: Use `argon2` package, not `bcrypt`      |
| DL-02 | Standard `ApiError` schema + HTTP codes table                                                 | Phase 0: Implement error format from Day 1       |
| DL-03 | OpenAPI auto-generated via `@fastify/swagger`                                                 | Phase 2: Mount at `/docs` endpoint               |
| DL-04 | Webhook envelope standard + 24 event types + PII redaction                                    | Phase 2-3: Follow envelope spec for all webhooks |
| DL-05 | Pricing edge cases: currency change → next cycle, mid-cycle → prorated                        | Phase 2: Implement in pricing system             |
| DL-06 | MongoDB aggregation patterns (4 pipelines), Redis cache 5min                                  | Phase 2+: Use standard aggregation patterns      |
| DL-07 | Sharding not needed until 1000+ tenants; `useDb()` reuses connection pool                     | Phase 1: No sharding setup needed                |
| DL-08 | v1→v2 migration script in Phase 6 (ETL), password bcrypt compat on first login                | Phase 6 (beyond scope)                           |
| DL-09 | Timeline extended to 34 weeks with 4 × 2-week buffers                                         | All: Buffer 1 after Phase 2 (Wo 8-9)             |
| DL-10 | 2FA/TOTP moved to Phase 3 Week 13                                                             | Phase 3 / Wo 13: Implement TOTP                  |
| DL-11 | Test infrastructure: Vitest + MSW + mongodb-memory-server, 60% coverage target                | Phase 0+: Configure test tooling                 |
| DL-12 | CI/CD: 3 workflows (ci.yml, deploy-api.yml, deploy-admin.yml)                                 | Phase 0 / Wo 2: Set up CI                        |
| DL-13 | Accessibility: WCAG 2.1 AA, ESLint jsx-a11y, Radix primitives                                 | Phase 0+: Enable jsx-a11y lint rules             |
| DL-14 | Loading/Error/Empty: 3 standard components (`<LoadingState>`, `<ErrorState>`, `<EmptyState>`) | Phase 0 / Wo 2: Create in packages/ui            |
| DL-15 | Responsive: 4 breakpoints (0/768/1024/1440), sidebar collapses on mobile                      | Phase 0 / Wo 1: Configure breakpoints            |
| DL-16 | Animations: Minimal, 150-200ms duration, no page transitions, reduced motion respected        | Phase 0 / Wo 1: Set motion defaults              |
| DL-17 | Missing Dev Portal screens: Impersonation, System Health, Feature Flags, Onboarding Wizard    | Phase 2 / Wo 5-6: Implement 4 additional screens |
| DL-18 | Pen-test strategy: OWASP ZAP + Burp + nuclei, 20-item checklist                               | Phase 3 / Wo 13 (preparation)                    |
| DL-19 | Key rotation: JWT 90 days, Master Key 6 months, alert 7 days before                           | Phase 3 / Wo 13: BullMQ monthly checker          |
| DL-20 | ClamAV/virus scanning at Phase 3 Week 11 (with file uploads)                                  | Phase 3 / Wo 11: Integrate ClamAV                |
| DL-21 | Peer deps: `strict-peer-dependencies=true`, `auto-install-peers=true` in `.npmrc`             | Phase 0 / Wo 1: Configure .npmrc                 |
| DL-22 | API routes: `/api/v1/` prefix, `X-Tenant-Slug` header, plural nouns, kebab-case               | Phase 1 / Wo 3: Apply route naming               |
| DL-23 | Phase rollback plans defined per phase (e.g., Phase 3: cut Chat → Phase 5)                    | All: Reference when behind schedule              |
| DL-25 | FullCalendar Free (MIT), chair view = custom CSS Grid component                               | Phase 3 / Wo 8: Use free version only            |
| DL-26 | Document authority: Decision Log > Database > Security > Roadmap > others                     | All: Reference priority when docs conflict       |
| DL-27 | Staging: 3-tier (Preview → Staging → Production), seed script for staging data                | Phase 2: Set up staging branch + seed            |
| DL-28 | Structured logging: Pino JSON, requestId propagation, redaction of sensitive fields           | Phase 0 / Wo 1: Configure Pino                   |
| DL-29 | DICOM viewer: `cornerstone3D` for 2D in Phase 3, 3D in Phase 5                                | Phase 3 / Wo 11: 2D viewer (16h effort)          |
| DL-30 | Socket.io: `@socket.io/redis-adapter` for multi-instance, room-based architecture             | Phase 2 / Wo 7: Configure rooms                  |
| DL-31 | Financial records: no `isActive` field — use status-based lifecycle instead                   | Phase 3+: Status-based for invoices/payments     |
| DL-33 | Route prefix: `/api/` for all routes, tenant via `X-Tenant-Slug` header                       | Phase 1 / Wo 3: Apply consistently               |

---

## 7. V2_STRUCTURE.md

> **Folder structure and naming conventions** for Weeks 0-12 implementation.

### Monorepo Structure (Phase 0)

| ID    | Requirement                                                                                                              | Week/Phase     |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------------- |
| VS-01 | Root: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `docker-compose.yml` | Phase 0 / Wo 1 |
| VS-02 | 5 workspace packages: `apps/api`, `apps/admin`, `apps/developer`, `packages/shared`, `packages/ui`                       | Phase 0 / Wo 1 |
| VS-03 | `apps/mobile` structure planned (Phase 7) but not created in Phase 0                                                     | Phase 7        |

### apps/api Structure (Phase 0-3)

| ID    | Requirement                                                                                              | Week/Phase     |
| ----- | -------------------------------------------------------------------------------------------------------- | -------------- |
| VS-04 | Platform layer: `src/platform/collections/` — users, tenants, modules, pricing, globals                  | Phase 1 / Wo 3 |
| VS-05 | Tenant layer: `src/tenant/routes/`, `src/tenant/models/`, `src/tenant/services/`                         | Phase 1 / Wo 3 |
| VS-06 | Middleware: `src/tenant/middleware/` — auth, tenant-db, rbac, rate-limit, validation                     | Phase 1 / Wo 3 |
| VS-07 | Jobs: `src/jobs/` — email, sms, whatsapp, push workers + cron jobs (backup, reminder, recurring, expiry) | Phase 2 / Wo 7 |
| VS-08 | Plugins: `src/plugins/` — Fastify plugins (swagger, socket, multipart, sensible)                         | Phase 0 / Wo 1 |

### apps/admin Structure (Phase 0-3)

| ID    | Requirement                                                                       | Week/Phase      |
| ----- | --------------------------------------------------------------------------------- | --------------- |
| VS-09 | 28 feature directories under `src/features/` — each with pages, components, hooks | Phase 2 / Wo 7+ |
| VS-10 | Layouts: `MainLayout` with sidebar + header, `AuthLayout`                         | Phase 0 / Wo 1  |
| VS-11 | Providers: QueryProvider, ThemeProvider, LocaleProvider, SocketProvider           | Phase 0-2       |
| VS-12 | Stores: `auth.store.ts`, `tenant.store.ts`, `locale.store.ts`, `theme.store.ts`   | Phase 0-1       |

### apps/developer Structure (Phase 2)

| ID    | Requirement                                  | Week/Phase       |
| ----- | -------------------------------------------- | ---------------- |
| VS-13 | 16 feature directories under `src/features/` | Phase 2 / Wo 5-6 |

### packages/shared Structure (Phase 0)

| ID    | Requirement                                                                                   | Week/Phase     |
| ----- | --------------------------------------------------------------------------------------------- | -------------- |
| VS-14 | `src/schemas/` — Zod schemas per entity (25+ files)                                           | Phase 0 / Wo 2 |
| VS-15 | `src/types/` — TypeScript interfaces inferred from Zod (`z.infer<>`)                          | Phase 0 / Wo 2 |
| VS-16 | `src/constants/` — roles, permissions, statuses, events, tooth conditions, countries, modules | Phase 0 / Wo 2 |
| VS-17 | `src/utils/` — pure functions: currency, date (Hijri), validation, string, pagination         | Phase 0 / Wo 2 |

### packages/ui Structure (Phase 0)

| ID    | Requirement                                                                                                                                                         | Week/Phase     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| VS-18 | `src/primitives/` — ~25 Shadcn/Radix base components                                                                                                                | Phase 0 / Wo 2 |
| VS-19 | `src/composites/` — ~15 composed components (DataTable, SearchInput, StatusBadge, ConfirmDialog, EmptyState, LoadingState, ErrorState, FormField, FileUpload, etc.) | Phase 0 / Wo 2 |

### Naming Conventions (Phase 0)

| ID    | Convention                                             | Rule                                                                                |
| ----- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| VS-20 | Folders: kebab-case                                    | `dental-charts/`, `lab-orders/`                                                     |
| VS-21 | React components: PascalCase.tsx                       | `PatientForm.tsx`                                                                   |
| VS-22 | Hooks: camelCase with `use` prefix                     | `usePatients.ts`                                                                    |
| VS-23 | Stores: kebab-case with `.store`                       | `auth.store.ts`                                                                     |
| VS-24 | Schemas/Models/Routes/Services: kebab-case with suffix | `patient.schema.ts`, `patient.model.ts`, `patients.route.ts`, `patients.service.ts` |
| VS-25 | MongoDB collections: snake_case plural                 | `patients`, `dental_charts`                                                         |
| VS-26 | API routes: kebab-case plural                          | `/api/patients`, `/api/dental-charts`                                               |
| VS-27 | Git branches: type/description                         | `feat/patient-crud`, `fix/jwt-rotation`                                             |
| VS-28 | Commits: Conventional Commits                          | `feat(patients): add list pagination`                                               |

### Import Rules (Phase 0)

| ID    | Rule                                                           | Enforced By                    |
| ----- | -------------------------------------------------------------- | ------------------------------ |
| VS-29 | `@dento/shared` → no React, no DOM, no Node.js APIs            | ESLint                         |
| VS-30 | `@dento/ui` → no imports from `apps/*`                         | ESLint                         |
| VS-31 | `apps/admin` ↔ `apps/developer`: no cross-app imports          | ESLint `no-restricted-imports` |
| VS-32 | `apps/mobile` → no `@dento/ui` (uses NativeWind, not Radix)    | ESLint                         |
| VS-33 | Frontend → no direct import from `apps/api` (HTTP/Socket only) | ESLint                         |

### File Size Limits (Phase 0)

| ID    | File Type         | Max Lines |
| ----- | ----------------- | --------- |
| VS-34 | React Component   | 200       |
| VS-35 | Page Component    | 150       |
| VS-36 | Custom Hook       | 100       |
| VS-37 | Service (Backend) | 300       |
| VS-38 | Route File        | 150       |
| VS-39 | Mongoose Model    | 150       |
| VS-40 | Zod Schema        | 100       |
| VS-41 | Test File         | 300       |

---

## 8. ADMIN_PORTAL_SCREENS.md

> **UI wireframe specifications** for admin portal screens relevant to Weeks 0-12.

### Layout & Navigation (Phase 0-2)

| ID     | Requirement                                                                                       | Week/Phase     |
| ------ | ------------------------------------------------------------------------------------------------- | -------------- |
| APS-01 | Sidebar: 28 module links grouped by category, RBAC-based visibility                               | Phase 2 / Wo 7 |
| APS-02 | Header: logo, clinic name, search, notification bell, chat icon, user avatar, locale toggle       | Phase 0 / Wo 1 |
| APS-03 | RTL: Sidebar moves to right, chat panel to left, all margins/paddings flip via logical properties | Phase 0 / Wo 1 |
| APS-04 | Responsive: Sidebar → hamburger menu on mobile (<768px)                                           | Phase 0 / Wo 1 |

### Screen Specifications (Phases 2-3)

| ID     | Screen                    | Key Components                                                                                | Week/Phase                 |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------- | -------------------------- |
| APS-05 | Dashboard                 | 8 stat cards + sparklines, today's appointments table, chair status overview, 3 chart widgets | Phase 2 / Wo 7             |
| APS-06 | Patient List              | DataTable with search, tabs (All/Active/Inactive), status badges                              | Phase 3 / Wo 8             |
| APS-07 | Patient Detail            | Tabs: Overview, Dental Chart, Treatment Plans, X-Rays, Appointments, Invoices, Documents      | Phase 3 / Wo 8             |
| APS-08 | Appointments Calendar     | FullCalendar (day/week/month), RTL support, new appointment dialog, drag & drop               | Phase 3 / Wo 8             |
| APS-09 | Daily Operations Hub      | 6 stat cards, 5 tabs, unified walk-in + appointment view, chair overview cards                | Phase 2 / Wo 7             |
| APS-10 | Dental Chart              | react-odontogram SVG, tooth detail panel (5-surface), condition grid, NOT mirrored in RTL     | Phase 3 / Wo 10            |
| APS-11 | Treatment Plans           | Status flow card, items table with costs, payment progress bar                                | Phase 3 / Wo 10            |
| APS-12 | Lab Orders                | List + new order dialog, lab_order_types dropdown, status badges                              | Phase 3 / Wo 12            |
| APS-13 | Invoices                  | List + detail view, PDF preview, line items, payment status                                   | Phase 3 / Wo 12 (template) |
| APS-14 | Payments & Reconciliation | Daily reconciliation view, payment method breakdown, EOD summary                              | Phase 3 / Wo 12 (template) |
| APS-15 | Inventory                 | Items list with stock level indicators (🔴🟡🟢), category/branch filters                      | Phase 3 / Wo 12 (shell)    |
| APS-16 | Reports                   | Category cards (Revenue, Patient, Operational), selected report with filters + chart          | Phase 2 / Wo 7 (shell)     |
| APS-17 | Settings                  | Tabs: General, Branding, Notifications, Users, Sessions, Billing. Working hours grid          | Phase 3 / Wo 13            |
| APS-18 | Sessions Tab              | My active sessions (end other sessions), admin view of all staff sessions                     | Phase 1 / Wo 3             |
| APS-19 | Staff Chat Panel          | Sidebar chat (non-blocking), channels + DMs, message input with attachments                   | Phase 3 / Wo 12            |
| APS-20 | Dark Mode                 | Semantic color tokens (background, sidebar, card, border, text, muted, accent)                | Phase 0 / Wo 1             |
| APS-21 | Mobile View (<768px)      | Hamburger menu, stacked stat cards, simplified tables                                         | Phase 0 / Wo 1             |

### RTL/LTR Rules Summary

| ID         | Element          | LTR           | RTL            | Tailwind           |
| ---------- | ---------------- | ------------- | -------------- | ------------------ |
| APS-RTL-01 | Sidebar Position | Left          | Right          | `flex` (auto)      |
| APS-RTL-02 | Chat Panel       | Right         | Left           | `border-s`         |
| APS-RTL-03 | Text Alignment   | Left          | Right          | `text-start`       |
| APS-RTL-04 | Margins/Paddings | margin-left   | margin-right   | `ms-4`, `ps-4`     |
| APS-RTL-05 | Arrow Icons      | →             | ←              | `rtl:rotate-180`   |
| APS-RTL-06 | Numbers          | 1,234         | ١,٢٣٤          | `formatNumber()`   |
| APS-RTL-07 | Currency         | EGP 3,500     | ٣,٥٠٠ ج.م      | `formatCurrency()` |
| APS-RTL-08 | Dental Chart     | NOT mirrored  | NOT mirrored   | Fixed LTR SVG      |
| APS-RTL-09 | Form Labels      | Left of input | Right of input | `text-start`       |

---

## Summary Statistics

| Document                   | Requirements Extracted                                                                                                            | Phase Coverage      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| IMPLEMENTATION_ROADMAP.md  | 112 (20 Week tasks + 11 P0 deliverables + 14+7 P1 tasks/deliverables + 28+10 P2 tasks/deliverables + 53+12 P3 tasks/deliverables) | Phase 0-3 complete  |
| DENTO_V2_MASTER_PLAN.md    | 78 (across §1-§22, §37)                                                                                                           | Phase 0-3 deep-dive |
| TECH_REQUIREMENTS.md       | 42 (runtime + deps + env vars + security)                                                                                         | Phase 0-3           |
| SECURITY_AND_ENCRYPTION.md | 40 (Layers 1-9, 11-12 + checklist)                                                                                                | Phase 0-3           |
| V2_DATABASE.md             | 52 (17 platform + 33 tenant collections + 2 settings)                                                                             | Phase 0-3           |
| V2_DECISION_LOG.md         | 32 decisions (all affecting Weeks 0-12)                                                                                           | Phase 0-3           |
| V2_STRUCTURE.md            | 41 (structure + naming + imports + file limits)                                                                                   | Phase 0-3           |
| ADMIN_PORTAL_SCREENS.md    | 30 (21 screens + 9 RTL rules)                                                                                                     | Phase 0-3           |
| **TOTAL**                  | **~427 checkable requirements**                                                                                                   | **Weeks 0-12**      |

---

## Go/No-Go Gate Criteria (from IMPLEMENTATION_ROADMAP §12)

| Gate                              | Week | Must Pass                                                                     |
| --------------------------------- | ---- | ----------------------------------------------------------------------------- |
| **M0 — Foundation Done**          | 2    | `pnpm dev` → 3 apps run, CI green, smoke CRUD, 🔒 Helmet+CORS+CSP active      |
| **M1 — Auth Done**                | 4    | Login + Tenant + RBAC + i18n, 🔒 JWT Rotation + Rate Limiting + Zod active    |
| **M2 — Dev Portal + Admin Shell** | 7    | Dev Portal 16 modules, Dashboard, Payments, 🔒 API Key Hashing + Webhook HMAC |
| **M3 — Clinical MVP**             | 13   | Complete patient workflow, 🔒 PII Encryption + File Security + Audit Logging  |

### Per-Gate Checklist (§13 — Definition of Done per Feature)

Every feature must satisfy all 15 criteria:

1. API endpoint functional (CRUD + validation + RBAC)
2. Zod schema in `packages/shared`
3. UI page in Admin Portal (list + detail + form)
4. RTL/LTR both functional
5. Dark mode functional
6. Responsive (desktop + tablet)
7. RBAC: correct roles see correct things
8. Seed data (if needed)
9. No TypeScript `any` or `@ts-ignore`
10. ESLint + Prettier: 0 errors
11. 🔒 Rate Limiting + Zod `.strict()` + RBAC on new endpoints
12. 🔒 PII fields encrypted (if relevant)
13. 🔒 Audit log for all mutations
14. Unit test for business logic (recommended)
15. API docs auto-generated via Swagger

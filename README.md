# Dento v2

Dento v2 is a multi-tenant dental clinic management platform (SaaS). It gives dental clinics one system for patients, appointments, clinical records, imaging, billing, inventory and staff, and gives the platform operator a separate portal to manage tenants, plans, billing and infrastructure.

## Table of Contents

- [Overview](#overview)
- [Project Status](#project-status)
- [How It Works](#how-it-works)
- [Components](#components)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Migration from Dento v1](#migration-from-dento-v1)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Known Issues](#known-issues)
- [License](#license)

## Overview

### Purpose

Dental clinics often use separate tools for scheduling, patient files, X-rays, invoices and stock. Dento v2 brings these into one web application. Each clinic (tenant) gets its own isolated database, its own users and roles, and can turn modules on or off.

### Intended users

- **Clinic staff** (owners, doctors, receptionists, assistants) use the **Admin Portal** for daily work.
- **Patients** can book through public online booking endpoints and a WhatsApp booking bot.
- **The platform team** uses the **Developer Portal** to run the SaaS: tenants, pricing, billing, modules, backups, domains, monitoring and support.

### Relation to Dento v1

Dento v1 (repository `ahmadkobah/Dento`) was built on Supabase (PostgreSQL). Dento v2 is a full rewrite on Node.js, Fastify and MongoDB with a database-per-tenant design. A tool to move v1 data into v2 is included (see [Migration from Dento v1](#migration-from-dento-v1)).

## Project Status

| Component | Status | Notes |
| --- | --- | --- |
| Backend API (`apps/api`) | Working | Fastify 5 server with tenant and platform routes, RBAC, audit logging, background jobs |
| Admin Portal (`apps/admin`) | Working | Clinical, scheduling, financial, inventory and settings modules |
| Developer Portal (`apps/developer`) | Working | Tenants, billing, modules, backups, monitoring and support |
| Shared packages | Working | Zod schemas and types; Radix-based UI components |
| Online booking and WhatsApp bot | Partial | Backend is multi-tenant; the admin bot settings screen has a hardcoded tenant slug |
| Platform payments (Stripe, Paymob) | Partial | Records and webhooks exist; provider calls for payments and refunds are commented-out stubs |
| v1 to v2 migration tool | Partial | Script exists; needs the `pg` package, which is not declared |
| Doctor-only portal, AI agents | Planned | Design documents only |
| Mobile app (React Native / Expo) | Planned | No `apps/mobile` folder exists yet |

## How It Works

### Architecture

```
 +----------------+     +--------------------+     +------------------+
 |  Admin Portal  |     |  Developer Portal  |     | Public booking / |
 |  (React, Vite) |     |   (React, Vite)    |     | WhatsApp webhook |
 +-------+--------+     +---------+----------+     +--------+---------+
         |  REST + Socket.io      |  REST                   |  REST
         +------------------------+-------------------------+
                                  |
                     +------------v-------------+
                     |   API (Fastify 5)        |
                     |  /api/...  tenant routes |
                     |  /api/platform/...       |
                     |  auth, RBAC, audit, rate |
                     |  limit, Swagger at /docs |
                     +---+---------+--------+---+
                         |         |        |
            +------------v--+  +---v----+  +v--------------------+
            |   MongoDB      |  | Redis  |  | External services   |
            | dento_platform |  | BullMQ |  | S3/R2, Resend/SMTP, |
            | tenant_<slug>  |  | queues |  | Twilio, Meta, Stripe|
            | tenant_<slug>  |  | cache  |  | Paymob, Sentry,     |
            +----------------+  +--------+  | Axiom, Cloudflare   |
                                            +---------------------+
```

### Request flow

1. A user signs in (`POST /api/auth/login`). The API checks the password with Argon2id and, if enabled, asks for a TOTP 2FA code.
2. The API returns a short-lived access token (JWT) and a refresh token in a cookie.
3. On tenant routes, `authGuard` checks the token and `tenantDbMiddleware` opens the tenant database `tenant_<slug>` with `mongoose.useDb()`. Platform admins may pick a tenant with the `x-tenant-slug` header.
4. `roleGuard(module, action)` checks the role against the tenant permission matrix. Platform routes use `platformGuard(module, action)`.
5. The input sanitizer and audit logger run around the handler. Sensitive patient fields are encrypted with AES-256-GCM before saving.
6. Long tasks (notifications, report exports, webhooks, backups, workflows) go to BullMQ queues in Redis and run in workers in the same process. Cron jobs handle reminders, no-shows, overdue invoices, dunning, exchange rates and SSL expiry.
7. Live updates (chat, walk-in queue, chairs, notifications) are sent over Socket.io with token-checked handshakes.

## Components

### Backend API (`apps/api`)

Entry point: `src/server.ts`. It connects to MongoDB and Redis, registers security plugins (Helmet, CORS, rate limit, Sentry, Swagger, Socket.io) and all routes, then starts workers and cron jobs.

- `src/tenant/` - clinic routes, services, models and middleware (auth guard, role guard, tenant DB, brute-force protection, input sanitizer, audit logger).
- `src/platform/` - platform routes, models and middleware (platform guard, impersonation logger).
- `src/jobs/` - BullMQ queue, cron jobs (reminders, no-shows, overdue and SaaS invoices, dunning, exchange rates, alerts, rollouts, Ramadan reminders, SSL expiry, backup restore tests) and workers (notifications, chat push, inventory reorder, workflows).
- `src/services/` - notifications, report export and scheduling, recurring appointments, Cloudflare, provider credentials.
- `src/scripts/` - seed scripts, PHI encryption backfill, smoke test, v1 migration tool.
- `src/utils/` - JWT, passwords, field and backup encryption, Hijri dates, URL guard, logging.

### Admin Portal (`apps/admin`)

React app for clinics. Feature folders in `src/features/`:

- **Clinical:** patients, dental charts, treatment plans, procedure notes, prescriptions, medications, X-rays, CBCT, scans, documents, consent forms, referrals.
- **Scheduling:** appointments and types, recurring rules, doctor schedules, leave, attendance, waitlist, walk-in queue, online bookings.
- **Labs:** dental labs, lab order types, lab orders.
- **Financial:** invoices, payments, installments, insurance, doctor commissions, subscription.
- **Inventory:** categories, items, stock, transfers, stock counts.
- **Administration:** users, branches, doctors, role permissions, settings and branding, custom fields, workflows, webhooks, audit logs, notifications, reports, dashboard, support, onboarding.

The UI supports English and Arabic, themes and per-tenant branding.

### Developer Portal (`apps/developer`)

React app for the platform team: dashboard, tenants (list, wizard, details), platform users, modules and feature flags, pricing and billing, countries, languages, storage, backups, domains, deployments, API keys, rate limits, webhooks, custom fields, monitoring (error and system logs, rate-limit analytics), audit logs, user sessions, support and an API catalog.

### Shared packages

- `packages/shared` (`@dento/shared`) - Zod schemas, types, constants and utilities.
- `packages/ui` (`@dento/ui`) - Radix UI primitives, composite components and a SaaS invoice PDF component.

## Technology Stack

| Area | Technology | Purpose |
| --- | --- | --- |
| Monorepo | Turborepo, pnpm 9.15.4 | Workspace builds and tasks |
| Runtime | Node.js 20.19+ or 22.12+, TypeScript 6 | Language and runtime |
| API | Fastify 5 and `@fastify/*` plugins | HTTP, cookies, uploads, CORS, Helmet, rate limit, Swagger |
| Database | MongoDB 8, Mongoose 9 | Platform database plus one database per tenant |
| Queue and cache | Redis 8, BullMQ 5 | Background jobs, cron scheduling, rate limits |
| Realtime | Socket.io 4 with Redis adapter | Chat, queues, notifications |
| Auth and crypto | `@fastify/jwt`, Argon2id, otplib | Tokens, password hashing, TOTP 2FA |
| Validation | Zod 4 | Request, env and form validation |
| Files and exports | AWS S3 SDK (S3 or R2), sharp, React PDF, ExcelJS, fast-csv | Uploads, images, PDF and spreadsheet exports |
| Messaging | Resend, Nodemailer, Twilio, Meta WhatsApp, web-push | Email, SMS, WhatsApp, browser push |
| Payments | Stripe, Paymob | SaaS subscription payments (partly stubbed) |
| Observability | Pino, Axiom, Sentry | Logging and error tracking |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 | Admin and Developer portals |
| Frontend state | Zustand 5, TanStack Query 5 and Table 8, React Hook Form 7 | State, data fetching, tables, forms |
| Frontend extras | Recharts, dicom-parser, socket.io-client | Charts, DICOM images, realtime |
| Testing | Vitest 4, mongodb-memory-server, Supertest, Playwright | Unit, contract and end-to-end tests |
| Tooling | ESLint, Prettier, Husky, lint-staged, commitlint | Code quality and commit rules |

Note: `payload` and `@payloadcms/*` are API dependencies, but no source file imports them. The platform layer is built with Fastify routes and Mongoose models.

## Project Structure

```
Dentov2/
|-- apps/
|   |-- api/              Fastify backend (tenant + platform APIs, jobs, scripts)
|   |   |-- src/
|   |   `-- __tests__/    API contract tests
|   |-- admin/            Clinic Admin Portal (React + Vite, nginx Dockerfile)
|   `-- developer/        Platform Developer Portal (React + Vite, nginx Dockerfile)
|-- packages/
|   |-- shared/           Zod schemas, types, utils (@dento/shared)
|   `-- ui/               UI components (@dento/ui)
|-- tests/e2e/            Playwright end-to-end tests
|-- infra/                Production VM setup: Caddyfile, compose file, setup script
|-- docs/                 Architecture, deployment, security, testing, screen specs
|-- Todos/                Bug list and open tasks
|-- .github/workflows/    CI, security scans and deploy pipelines
`-- docker-compose.yml    Local MongoDB, Redis and app containers
```

## Getting Started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- pnpm 9.15.4 (pinned in `packageManager`)
- Docker and Docker Compose (for MongoDB and Redis)

### Install and run

```bash
git clone https://github.com/ahmadkobah/Dentov2-public.git
cd Dentov2-public
pnpm install

# MongoDB on port 27017, Redis on host port 6380
docker compose up -d mongodb redis

# The API reads apps/api/.env (not the root .env)
cp .env.example apps/api/.env
# Set PAYLOAD_SECRET, JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (16+ chars each)

# Optional: dev platform admin and a demo tenant
pnpm --filter @dento/api seed:platform
pnpm --filter @dento/api seed:tenant --slug=demo

pnpm dev
```

Development ports: API `3001`, Admin Portal `3000`, Developer Portal `3002`. The Admin Portal dev server proxies API calls to `127.0.0.1:3001`. Swagger UI is at `/docs` on the API.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` / `pnpm build` | Run all apps in watch mode / build everything |
| `pnpm lint` / `pnpm type-check` | Lint and TypeScript checks |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm verify` | Build, lint, type-check, test and format check |
| `pnpm --filter @dento/api test:contract` | API contract tests |
| `pnpm --filter @dento/api backfill:encrypt-phi` | Encrypt existing patient data |

Seed scripts refuse to run when `NODE_ENV=production`.

## Configuration

The API validates its environment with Zod in `apps/api/src/config/env.ts` and stops if a required value is missing. Use `.env.example` as the template. Never commit real values.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `production` or `test` |
| `PORT` | No | `3001` | API port |
| `MONGODB_URI` | No | `mongodb://localhost:27017/dento_platform` | Platform database; TLS required in production |
| `REDIS_URL` | No | `redis://localhost:6379` | Use port `6380` with the local compose file |
| `PAYLOAD_SECRET` | Yes | - | Cookie signing secret (min 16 chars) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Yes | - | Token secrets (min 16 chars) |
| `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY` | No | `15m`, `7d` | Token lifetimes |
| `ENCRYPTION_MASTER_KEY` | Production | - | 64 hex chars, field encryption key |
| `SEARCH_HASH_KEY` | Production | - | 32+ chars, different from the master key |
| `TOTP_ISSUER` | No | `Dento` | Name in authenticator apps |
| `CORS_ORIGIN` | No | `http://localhost:3000,http://localhost:3002` | Allowed origins |
| `ADMIN_PORTAL_URL` | No | `http://localhost:5173` | Used in links in emails |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_BACKUP_BUCKET`, `R2_PUBLIC_URL` | No | buckets `dento-uploads`, `dento-backups` | File and backup storage |
| `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | No | - | Email |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_FROM` | No | - | SMS and WhatsApp via Twilio |
| `META_WHATSAPP_PHONE_ID`, `META_WHATSAPP_TOKEN`, `META_WHATSAPP_VERIFY_TOKEN`, `META_WHATSAPP_APP_SECRET` | No | - | WhatsApp Cloud API |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`, `VAPID_SUBJECT` | No | - | Browser push |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | No | - | Stripe |
| `PAYMOB_API_KEY`, `PAYMOB_*_INTEGRATION_ID`, `PAYMOB_IFRAME_ID`, `PAYMOB_HMAC_SECRET` | No | - | Paymob |
| `SENTRY_DSN`, `AXIOM_TOKEN`, `AXIOM_DATASET` | No | dataset `dento-logs` | Errors and logs |
| `EXCHANGE_RATE_API_KEY` | No | - | Exchange rate cron |
| `TAILSCALE_API_KEY`, `TAILSCALE_TAILNET` | No | - | Tailscale integration |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` | No | - | Custom domains |
| `DEPLOY_WEBHOOK_SECRET` | No | - | Deployment webhook check |
| `MONGODUMP_PATH`, `MONGORESTORE_PATH` | No | - | Backup tool paths |
| `SYS_DIAG_TOKEN` | No | - | Diagnostics token (min 32 chars) |
| `SCAN_SAFE_RESPONSES` | No | `false` | Production-style errors outside production |

Frontend build variables: `VITE_API_URL`, `VITE_SENTRY_DSN`, `VITE_APP_VERSION`, `VITE_VAPID_PUBLIC_KEY`. Seed scripts also read `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## API Reference

Routes are registered in `apps/api/src/server.ts`. Swagger UI at `/docs` shows the full OpenAPI description.

| Group | Route prefixes |
| --- | --- |
| Health and auth | `/health`, `/health/live`, `/api/auth/*`, 2FA routes |
| Clinical | `/api/patients`, `/api/dental-charts`, `/api/treatment-plans`, `/api/procedure-notes`, `/api/prescriptions`, `/api/medications`, `/api/consent-templates`, `/api/consent-forms`, `/api/referrals` |
| Imaging and files | `/api/xrays`, `/api/xray-types`, `/api/cbct`, `/api/cbct-scan-regions`, `/api/scans`, `/api/uploads`, `/api/imaging-requirements` |
| Scheduling | `/api/appointments`, `/api/appointment-types`, `/api/recurring-rules`, `/api/schedules`, `/api/leave`, `/api/attendance`, `/api/chairs`, `/api/waitlist`, `/api/walk-in-queue`, `/api/bookings`, `/api/whatsapp-bot` |
| Labs | `/api/dental-labs`, `/api/lab-order-types`, `/api/lab-orders` |
| Financial | `/api/invoices`, `/api/tenant-payments`, `/api/installments`, `/api/insurance-companies`, `/api/insurance-claims`, `/api/commissions`, `/api/subscription` |
| Inventory | `/api/inventory-categories`, `/api/inventory-items`, `/api/inventory-stock`, `/api/stock-transfers`, `/api/stock-counts` |
| Clinic admin | `/api/users`, `/api/branches`, `/api/doctors`, `/api/services`, `/api/role-permissions`, `/api/tenant-settings`, `/api/custom-fields`, `/api/workflows`, `/api/tenant-webhooks`, `/api/audit-logs`, `/api/notifications`, `/api/chat`, `/api/dashboard`, `/api/reports`, `/api/onboarding` |
| Platform | `/api/platform/*` (tenants, users, modules, feature flags, pricing, billing, invoices, settings, storage, countries, languages, translations, domains, deployments, API keys, logs, sessions, analytics, dashboard) |
| Platform operations | `/api/backups`, `/api/rate-limits`, `/api/db-explorer`, `/api/support`, `/api/admin` (impersonation), `/api/payments` (Stripe, Paymob) |

## Data Model

- **Platform database** (`dento_platform` by default, about 35 models): tenants, users, modules, pricing, SaaS invoices, payments, feature flags, rollout plans, backups, domains, deployments, API keys, webhooks, translations, countries, support tickets, audit and error logs.
- **Tenant databases** (`tenant_<slug>`, about 60 models each): patients, appointments, doctors and schedules, dental charts, treatment plans, procedure notes, prescriptions, X-rays, lab orders, invoices, payments, installments, insurance claims, inventory, consent forms, chat, notifications, workflows, role permissions, audit logs.

Design: `docs/architecture/V2_DATABASE.md`.

## Migration from Dento v1

`apps/api/src/scripts/migrate-v1/` copies data from the v1 Supabase PostgreSQL database into MongoDB. Steps run in this order: users, patients, appointments, treatments, prescriptions, invoices, inventory, xrays, then a verification step.

The script imports `pg`, which is not in `package.json`. Install it first (for example `pnpm --filter @dento/api add -D pg`).

```bash
# Dry run: read and transform, no writes
pnpm --filter @dento/api exec tsx src/scripts/migrate-v1/index.ts \
  --v1-url "<postgres-connection-string>" --dry-run

# One tenant, one step
pnpm --filter @dento/api exec tsx src/scripts/migrate-v1/index.ts \
  --v1-url "<postgres-connection-string>" --tenant <slug> --step patients
```

Other options: `--v2-url` (default `MONGODB_URI`), `--batch-size` (default 500), `--verbose`, `--skip-verify`.

Passwords: v1 bcrypt hashes are kept. On the first v2 login the API checks the bcrypt hash, re-hashes with Argon2id and saves it.

## Testing

- **Unit tests:** Vitest in each workspace (`pnpm test`).
- **API contract tests:** about 90 files in `apps/api/__tests__/contract/` (tenant, platform and cross-cutting rules), run against `mongodb-memory-server`.
- **End-to-end tests:** Playwright specs in `tests/e2e/admin` and `tests/e2e/developer`.
- **CI** (`ci.yml`): lint, type-check, tests with coverage, build and `pnpm audit` for `main` and `develop`.

## Deployment

- **API:** `deploy.yml` builds the Docker image (`apps/api/Dockerfile`), pushes it to GitHub Container Registry and deploys it over SSH to an Oracle Cloud VM on each push to `main`. Caddy provides TLS; MongoDB Atlas and Upstash Redis are the data stores. See `infra/README.md`.
- **Portals:** `deploy-admin.yml` and `deploy-developer.yml` deploy to Vercel.
- **Staging:** `deploy-staging.yml` deploys the API to Railway and the Admin Portal to a Vercel preview from the `staging` branch.
- **Local containers:** `docker-compose.yml` runs MongoDB, Redis, the API and both portals (nginx on ports 3000 and 3002).

More detail: `docs/deployment/DEPLOYMENT.md`.

## Security

- Argon2id passwords, JWT access and refresh tokens, TOTP 2FA, login brute-force protection.
- RBAC on both layers: tenant `roleGuard` and platform `platformGuard`.
- AES-256-GCM field encryption for patient data, with keyed hashes for search.
- Helmet, CORS allow list, Redis rate limits, input sanitizer, CSP reports, SSRF guard for outgoing webhooks.
- Audit logs for tenant and platform actions, including impersonation.
- Encrypted backups and scheduled restore tests.
- CI scans: TruffleHog, OWASP ZAP and Nuclei.

See `docs/security/SECURITY_AUDIT_RESULTS.md` and `docs/security/HIPAA_GDPR_COMPLIANCE.md`. Design decisions are in `docs/architecture/V2_DECISION_LOG.md`.

## Known Issues

- Platform Stripe and Paymob flows do not call the providers yet; payment creation and refunds are commented-out stubs.
- `apps/admin/src/features/settings/components/WhatsAppBotTab.tsx` uses a hardcoded tenant slug, so the WhatsApp bot settings screen works for one tenant only.
- Payload CMS packages are installed but unused; `PAYLOAD_SECRET` only signs cookies.
- The migration tool needs `pg`, which is not declared.
- The default `ADMIN_PORTAL_URL` (`localhost:5173`) does not match the Admin Portal dev port (`3000`).
- `Todos/BUGS.md` lists findings from a June 2026 review. Many were fixed in later commits; check the code before relying on it.

## License

Private. All rights reserved.

Author: Ahmad Kobah

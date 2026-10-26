# Dento v2 — Deployment Guide

> Step-by-step deployment for Railway (API), Vercel (Frontends), and supporting infrastructure.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [API Deployment (Railway)](#api-deployment-railway)
4. [Admin Portal (Vercel)](#admin-portal-vercel)
5. [Developer Portal (Vercel)](#developer-portal-vercel)
6. [Staging Environment](#staging-environment)
7. [Cloudflare DNS & Custom Domains](#cloudflare-dns--custom-domains)
8. [MongoDB Atlas](#mongodb-atlas)
9. [Redis (Upstash / Railway)](#redis)
10. [Monitoring & Logging](#monitoring--logging)
11. [Backup Configuration](#backup-configuration)
12. [CI/CD Pipelines](#cicd-pipelines)
13. [v1 → v2 Migration](#v1--v2-migration)
14. [Smoke Testing](#smoke-testing)
15. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** 20+ / **pnpm** 9+
- **Docker** & **Docker Compose** (for local dev + API container builds)
- **Railway CLI** (`npm i -g @railway/cli`)
- **Vercel CLI** (`npm i -g vercel`)
- Accounts: Railway, Vercel, MongoDB Atlas, Cloudflare, Sentry, Axiom

---

## Environment Variables

All env vars are defined in `apps/api/src/config/env.ts` (Zod schema).
For local development the API loads `apps/api/.env` (its `dev` script runs
`node --env-file=.env` from the app directory), so copy the root template into
that path: `cp .env.example apps/api/.env`, then configure:

| Category       | Variables                                                      |
| -------------- | -------------------------------------------------------------- |
| **Database**   | `MONGODB_URI`, `REDIS_URL`                                     |
| **Auth**       | `PAYLOAD_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`    |
| **Encryption** | `ENCRYPTION_MASTER_KEY` (64-char hex)                          |
| **Storage**    | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`   |
| **Payments**   | `STRIPE_*`, `PAYMOB_*`                                         |
| **Email**      | `RESEND_API_KEY`                                               |
| **Monitoring** | `SENTRY_DSN`, `AXIOM_TOKEN`, `AXIOM_DATASET`                   |
| **DNS**        | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`                   |
| **VPN**        | `TAILSCALE_API_KEY`, `TAILSCALE_TAILNET`                       |
| **Backup**     | `S3_BACKUP_BUCKET`                                             |
| **Push**       | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` |

> **Security:** Never commit `.env` files. All secrets should be stored in Railway/Vercel environment variable dashboards.

---

## API Deployment (Railway)

### Initial Setup

```bash
# Login & link project
railway login
railway init

# Link to existing project
railway link
```

### Configuration

1. **Service Settings:**
   - Builder: **Dockerfile** (`apps/api/Dockerfile`)
   - Root Directory: (monorepo root — Dockerfile handles build context)
   - Start Command: `node dist/server.js`
   - Health Check: `GET /api/health`

2. **Environment Variables:**
   - Set all variables from `.env.example` in Railway dashboard
   - Use `MONGODB_URI` pointing to Atlas
   - Use `REDIS_URL` from Railway Redis plugin or Upstash

3. **Domain:**
   - Custom domain: `api.dento.app`
   - Railway provides SSL automatically

### Deploy

```bash
# Manual deploy
railway up

# Or push to main branch → GitHub Actions auto-deploys
git push origin main
```

### Dockerfile Overview

The API Dockerfile (`apps/api/Dockerfile`) uses multi-stage builds:

1. **builder** — Install dependencies, build shared + API
2. **runner** — Slim Node 20, copies only `dist/` + `node_modules`, runs as non-root

---

## Admin Portal (Vercel)

### Initial Setup

```bash
cd apps/admin
vercel --yes
```

### Configuration

1. **Framework:** Vite
2. **Root Directory:** `apps/admin`
3. **Build Command:** `cd ../.. && pnpm turbo build --filter=@dento/admin`
4. **Output Directory:** `apps/admin/dist`
5. **Environment Variables:**
   - `VITE_API_URL=https://api.dento.app`
   - `VITE_SENTRY_DSN=...`
   - `VITE_SENTRY_AUTH_TOKEN=...` (for source map upload)

### Domain

- Production: `admin.dento.app`
- Preview: Auto-generated per PR

---

## Developer Portal (Vercel)

Same setup as Admin, but:

- **Root Directory:** `apps/developer`
- **Build Filter:** `--filter=@dento/developer`
- **Domain:** `dev.dento.app`
- **Extra Env:** `VITE_API_URL=https://api.dento.app`

---

## Staging Environment

The `deploy-staging.yml` workflow triggers on push to `staging` branch:

```bash
git checkout -b staging
git push origin staging
```

This deploys:

- **API** → Railway staging service
- **Admin** → Vercel preview
- **Developer** → Vercel preview

---

## Cloudflare DNS & Custom Domains

### Setup

1. Add domain to Cloudflare (transfer or proxy-only)
2. Create API token with `Zone:DNS:Edit` + `Zone:Zone:Read` permissions
3. Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` in env

### DNS Records

| Type  | Name  | Content                              | Proxy |
| ----- | ----- | ------------------------------------ | ----- |
| CNAME | api   | `your-railway-domain.up.railway.app` | ❌    |
| CNAME | admin | `cname.vercel-dns.com`               | ❌    |
| CNAME | dev   | `cname.vercel-dns.com`               | ❌    |

### Tenant Custom Domains

The Cloudflare service (`apps/api/src/services/cloudflare.service.ts`) handles:

- Programmatic DNS record creation for tenant custom domains
- SSL certificate provisioning via Cloudflare
- Domain verification via DNS-over-HTTPS

### SSL Monitoring

A BullMQ cron job (`apps/api/src/jobs/ssl-expiry.cron.ts`) runs daily at 06:00 UTC:

- Checks SSL expiry for all tenant custom domains
- Alerts 30 days before expiration
- Logs to Axiom for monitoring

---

## MongoDB Atlas

### Setup

1. Create M10+ cluster (production) or M0 (dev)
2. Network: Allow Railway IP ranges + your dev IP
3. Create database user with `readWrite` role
4. Connection string → `MONGODB_URI`

### Database Strategy (DB-per-Tenant)

- **Platform DB:** `dento_platform` — tenants, users, subscriptions, platform config
- **Tenant DB:** `dento_tenant_{slug}` — clinical data, appointments, invoices

The `getTenantDb()` helper in `apps/api/src/config/database.ts` manages connections.

---

## Redis

### Options

1. **Railway Redis Plugin** — Add in Railway dashboard (simplest)
2. **Upstash Redis** — Serverless, auto-scaling, free tier available

### Usage

- Session cache
- Rate limiting (sliding window)
- BullMQ job queue
- Socket.io adapter (horizontal scaling)

---

## Monitoring & Logging

### Sentry

1. Create Sentry project for Node.js
2. Set `SENTRY_DSN` in env
3. Source maps upload automatically via `@sentry/vite-plugin` in Vite builds

### Axiom (Log Drain)

1. Create Axiom dataset `dento-logs`
2. Generate API token
3. Set `AXIOM_TOKEN` and `AXIOM_DATASET`
4. Pino logs automatically drain to Axiom via `pino-axiom` transport

### Health Check

```bash
curl https://api.dento.app/api/health
# {"success":true,"data":{"status":"healthy","uptime":...}}
```

---

## Backup Configuration

### Automated Backups (BullMQ cron)

The backup job (`apps/api/src/jobs/backup.cron.ts`) runs daily:

1. `mongodump` per-tenant DB → gzip archive
2. Upload to S3/R2 backup bucket (`S3_BACKUP_BUCKET`)
3. Retain 30 days, prune older backups
4. Alert on failure via notification system

### Manual Backup

```bash
mongodump --uri="$MONGODB_URI" --gzip --out=./backup
```

---

## CI/CD Pipelines

### GitHub Actions Workflows

| Workflow               | Trigger           | Action                        |
| ---------------------- | ----------------- | ----------------------------- |
| `ci.yml`               | Push / PR         | Lint, type-check, test        |
| `deploy-api.yml`       | Push to `main`    | Build Docker → GHCR → Railway |
| `deploy-admin.yml`     | Push to `main`    | Build & deploy to Vercel      |
| `deploy-developer.yml` | Push to `main`    | Build & deploy to Vercel      |
| `deploy-staging.yml`   | Push to `staging` | Deploy all 3 to staging       |

### Branch Strategy

```
main      → Production deployment
staging   → Staging environment
feature/* → PR → CI checks → Merge to main
```

---

## v1 → v2 Migration

### Overview

ETL from Supabase Postgres → MongoDB Atlas. See `V2_DECISION_LOG §7`.

### Steps

```bash
# 1. Dry run (read-only, shows what would migrate)
pnpm --filter @dento/api tsx src/scripts/migrate-v1/index.ts \
  --v1-url "postgresql://user:pass@host:5432/dento_v1" \
  --v2-url "mongodb+srv://..." \
  --dry-run --verbose

# 2. Migrate specific tenant
pnpm --filter @dento/api tsx src/scripts/migrate-v1/index.ts \
  --v1-url "..." --v2-url "..." --tenant my-clinic

# 3. Run specific step
pnpm --filter @dento/api tsx src/scripts/migrate-v1/index.ts \
  --v1-url "..." --v2-url "..." --step patients

# 4. Full migration (all tenants)
pnpm --filter @dento/api tsx src/scripts/migrate-v1/index.ts \
  --v1-url "..." --v2-url "..."
```

### Migration Order

1. **users** — Auth accounts + roles (bcrypt hashes preserved)
2. **patients** — Profiles + allergies + medical history (embedded)
3. **appointments** — Scheduling (references users + patients)
4. **treatments** — Plans + items (embedded)
5. **prescriptions** — Rx + items (embedded)
6. **invoices** — + line items + payments (separate collection)
7. **inventory** — Categories + items + stock levels
8. **xrays** — Metadata only (files remain in S3/R2)

### Password Compatibility

v1 used bcrypt (`$2b$` prefix). The compat shim in `auth.route.ts`:

1. Detects bcrypt hash on login
2. Verifies with `bcryptjs`
3. Re-hashes with Argon2id
4. Saves updated hash
5. Transparent to the user

---

## Smoke Testing

After deployment, run the smoke test:

```bash
pnpm --filter @dento/api tsx src/scripts/smoke-test.ts \
  --base-url https://api.dento.app
```

This validates:

- Health endpoint responds
- Auth flow (register → login → refresh → logout)
- CRUD operations (patient create → read → update)
- Tenant isolation
- Payment webhook endpoint exists

---

## Troubleshooting

### Common Issues

| Issue                         | Solution                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `MONGODB_URI` connection fail | Check Atlas network access + IP whitelist                 |
| Build fails in Railway        | Check Dockerfile context — needs monorepo root            |
| Vercel build timeout          | Increase timeout in project settings → 120s               |
| CORS errors                   | Verify `CORS_ORIGIN` includes frontend URLs               |
| 2FA not working               | Check `TOTP_ISSUER` + server time sync (NTP)              |
| Payments failing              | Verify `PAYMOB_HMAC_SECRET` / `STRIPE_WEBHOOK_SECRET`     |
| SSL cron not firing           | Check Redis connection + BullMQ scheduler is running      |
| Source maps not in Sentry     | Verify `VITE_SENTRY_AUTH_TOKEN` + org slug in vite config |

### Useful Commands

```bash
# Check Railway logs
railway logs

# Check API health
curl -s https://api.dento.app/api/health | jq

# Run tests locally
pnpm test

# Type check everything
pnpm type-check

# Build all packages
pnpm build
```

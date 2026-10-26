# Dento v2 — Project Guide

Multi-tenant dental clinic management SaaS. Turborepo + pnpm monorepo.
Project status: **Phase 7 complete (~Mar 2026), heading toward v2 launch.**

## Stack (verified against code, not just docs)

- **Monorepo:** Turborepo + pnpm 9.15.4, Node 20+
- **Backend** (`apps/api`): Payload CMS 3 (platform layer) + Fastify 5 (tenant API), Mongoose 9, **MongoDB 8.0 DB-per-tenant**, Redis 8 + BullMQ 5, Socket.io 4
- **Auth/crypto:** JWT dual-token (`@fastify/jwt`), **Argon2id** password hashing (`bcryptjs` is only a v1-migration compat shim — re-hashes to Argon2id on first login), AES-256-GCM field encryption, TOTP 2FA
- **Frontend** (`apps/admin`, `apps/developer`): React 19, **Vite 8** (Rolldown), Tailwind CSS 4, React Router 7, Zustand 5, TanStack Query 5 + Table 8, React Hook Form 7, Radix UI
- **Validation:** **Zod 4** (`^4.4.3`) everywhere. zodResolver + zod 4 needs the `zodFormResolver` wrapper in each app's `src/lib/zod-resolver.ts` (upstream `@hookform/resolvers` type gap).
- **Mobile** (`apps/mobile`): React Native / Expo — Phase 7, **not built yet**

## Layout

```
apps/api          Payload + Fastify backend
apps/admin        Admin portal (React/Vite)
apps/developer    Developer portal (React/Vite)
packages/shared   Zod schemas, types, utils (@dento/shared)
packages/ui       Radix/shadcn components (@dento/ui)
docs/             See "Docs that are authoritative" below
```

## Running locally

```bash
pnpm install
docker compose up -d mongodb redis      # MongoDB :27017, Redis -> host :6380
cp .env.example apps/api/.env           # API loads apps/api/.env, NOT root .env
pnpm dev                                 # turbo: all apps in parallel
```

Dev ports (set explicitly in each vite.config.ts): **api 3001, admin 3000, developer 3002**.
Single app: `pnpm --filter @dento/api dev`.

### Gotchas (these have bitten before)

- **Redis runs on host port 6380**, not 6379 (docker-compose remaps it). `REDIS_URL` must use 6380 for local dev.
- **The API reads `apps/api/.env`**, not the repo-root `.env` — turbo runs the `dev` script (`node --env-file=.env`) from the app directory. There is no `apps/api/.env.example`; copy the root `.env.example`.
- Docker ports differ from dev ports: in `docker-compose.yml`, admin is `:3000->80`, developer `:3002->80` (nginx).

## Common commands

`pnpm build` · `pnpm lint` · `pnpm type-check` · `pnpm test` (turbo) · `pnpm test:e2e` (Playwright) · `pnpm format`
API unit/contract tests use Vitest 4 + `mongodb-memory-server`.

## Built vs. aspirational

- **Built & current:** auth, clinical, financial, inventory, operational modules (Phases 0–7). RBAC middleware is built and wired on both layers: tenant `roleGuard` (28-module `PERMISSION_MATRIX`, `apps/api/src/tenant/middleware/role-guard.ts`) and platform `platformGuard(module, action)` (`PLATFORM_PERMISSIONS` matrix, `apps/api/src/platform/middleware/platform-guard.ts`, used across all platform route files — see `docs/architecture/PLATFORM_RBAC.md`).
- **NOT built yet (design docs only — do not assume these exist):**
  - Doctor-scoped portal / `/api/doctor/*` routes (`docs/architecture/DOCTOR_PORTAL_GAP_ANALYSIS.md`). Caveat: the generic tenant appointment routes are still not doctor-scoped. `GET /api/appointments` now enforces `roleGuard('appointments','read')` (fixed), but `AppointmentService.listAppointments` still applies a client-supplied `doctorId` filter verbatim with no per-doctor row-level scoping — so a clinician can read another doctor's appointments. Live row-level-security gap, tracked as issue #44.
  - Self-hosted AI agents (`docs/architecture/AI_AGENT_PLATFORM_PLAN.md`)
  - WhatsApp bot: the backend is multi-tenant (per-tenant `whatsappBot` config in tenant settings). The one remaining `'srouji'` hardcode is a known frontend bug — `apps/admin/src/features/settings/components/WhatsAppBotTab.tsx` line 64 (`const tenantSlug = 'srouji'`) — which breaks the bot settings screen for other tenants.

## Docs that are authoritative

Authority order (per `BUILD_RULES.md` §1): decision log overrides everything.

1. `docs/architecture/V2_DECISION_LOG.md` — design decisions, overrides all other docs
2. `docs/architecture/BUILD_RULES.md` — coding conventions, RBAC, RTL/a11y, security gates
3. `docs/architecture/V2_DATABASE.md` — DB-per-tenant schema (~50 collections)
4. `docs/architecture/IMPLEMENTATION_ROADMAP.md` — phase plan
5. `docs/architecture/TECH_REQUIREMENTS.md` — pinned versions

- Deployment: `docs/deployment/DEPLOYMENT.md` · Security posture: `docs/security/SECURITY_AUDIT_RESULTS.md`
- UI conventions: `docs/screens/` · Known product gaps: `docs/PATIENT_JOURNEY_GAP_ANALYSIS.md`

**Stale — do not trust:** `docs/archive/**` and per-phase `docs/audits/**` are point-in-time snapshots of closed phases.
`docs/security/SECURITY_AND_ENCRYPTION.md` was recently corrected (it had said bcrypt; code is Argon2id) — prefer `SECURITY_AUDIT_RESULTS.md` for security claims.

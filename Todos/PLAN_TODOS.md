# Dento v2 — Plan TODOs

> Generated: 2026-06-13
> Source: deferred trackers, gap analyses, compliance and architecture docs. These are planned/deferred/outstanding items from the **plan**, distinct from inline code TODOs (see `CODE_TODOS.md`) and verified bugs (see `BUGS.md`).
> Project status: Phase 7 complete, heading to v2 launch; 3 of 7 apps built (api, admin, developer); mobile not built.

---

## B1. Intentionally deferred — `docs/deployment/P3_DEFERRED_TRACKER.md`

_6 items, each gated on a trigger event. Status: not started._

| Item                                                  | Trigger                         | Size |
| ----------------------------------------------------- | ------------------------------- | ---- |
| cornerstone3D DICOM viewer                            | Clinic requests DICOM import    | XL   |
| ClamAV virus scanning on uploads                      | Security/compliance audit       | M    |
| Security anomaly detection (suspicious logins)        | HIPAA compliance audit          | L–XL |
| **Patient-facing checkout (Stripe/Paymob)**           | Clinic requests online payments | XL   |
| Disaster-recovery automation (multi-region, failover) | Production at scale             | XL   |
| Barcode scanning (React Native)                       | Phase 7 mobile kickoff          | M    |

---

## B2. Compliance — `docs/security/HIPAA_GDPR_COMPLIANCE.md`

_Only the ⚠️ / "to verify" / open items. Sign-off checkboxes are all unchecked._

| Item                                                                          | Priority | Target                |
| ----------------------------------------------------------------------------- | -------- | --------------------- |
| Complete the **DPIA** (Data Protection Impact Assessment)                     | P1       | Pre-launch            |
| Verify **BAAs** with cloud providers (Railway, MongoDB Atlas, Cloudflare, R2) | P1       | Pre-launch            |
| Formalize incident-response playbook (logging exists; playbook drafted)       | P2       | Launch + 2 wks        |
| Implement security-awareness training program                                 | P2       | Launch + 4 wks        |
| Verify Standard Contractual Clauses for international transfers               | P3       | Launch + 8 wks        |
| Verify EU-US Data Privacy Framework adequacy (provider-dependent)             | P3       | —                     |
| Schedule external penetration test                                            | P3       | Post-launch (Phase 8) |
| Finalize 72-hour breach-notification procedure                                | —        | Drafted, not final    |

---

## B3. Patient-journey gaps — `docs/PATIENT_JOURNEY_GAP_ANALYSIS.md`

_~55 open gaps. All "open" (gap/missing/partial). Grouped by theme; IDs reference doc sections._

### 🚨 Patient-safety CRITICAL — do first

- **Allergy lookup on prescription create** (§4.1) — `PrescriptionService.create` never reads `patient.allergies`.
- **Pregnancy gate before X-ray order** (§4.4) — no check against `medicalHistory.isPregnant`.

### High

- Drug-drug interaction matrix on prescription (§4.2)
- Medical-history flags at point of care (diabetes/anticoagulant/cardiac) (§4.3)
- Patient **duplicate detection** on create (§3.1) and **patient-merge** function (§3.2)
- **Atomic slot lock** to prevent double-booking from public widget (§1.1)

### Booking & scheduling

- Patient auto-creation on booking confirm (`findOrCreate` by phone/email) (Window #1)
- Reschedule semantics: audit trail + patient notify + waitlist trigger (§1.2)
- Late-cancel / no-show fee rule + policy config (§1.3)
- Conflict hard-block on manual admin create (§1.4)
- Booking widget: service selection (§11.1), insurance pre-check (§11.2), returning-patient lookup (§11.3), `.ics` attachment (§11.4), self-service reschedule/cancel link (§11.5)

### Waitlist (entirely missing)

- `waitlist.route.ts` + service + admin page (§2.1); referenced at `appointments.route.ts:416` (§2.2)
- Auto-fill freed slot from waitlist + notify next-in-line (§2.3)

### Clinical workflow

- One-click "Check In" button in DailyOps (Stage 2)
- Inventory deduction during procedure (Window #4)
- Link procedure note → treatment-plan item completion (Stage 3)
- "Book Follow-up" from procedure note (Window #3)
- **Workflow admin UI** — automation engine is built backend-only, no config page (Window #6)
- Per-procedure-type note templates (§12.1), `noteType` pre/intra/post-op (§12.2), note↔dental-chart surface linkage (§12.3)

### Recall & engagement

- `nextVisitDue`/recallDate field missing on Patient → recall cron can't fire (Window #7)
- Post-visit thank-you / survey message (Stage 5)

### Notifications NOT firing

- `appointment.confirmed` for non-online bookings; `appointment.rescheduled`; `treatment_plan.proposed`; `prescription.created`; `lab_order.ready`; `invoice.created`; `payment.received` (receipt) (§7)

### Billing

- Plan-item `billedAmount`/`billedInvoiceId` to track invoiced vs pending (§5.1)
- **Tenant-side refund flow** (clinic refund against invoice in admin UI) (§5.2)
- Commission accrual state machine / approval trigger (§5.3)
- Doctor self-view of per-appointment commission (§5.4)
- Receipt auto-email on payment (§5.5)

### HIPAA audit coverage

- Audit patient-record views (§8.1), dental-chart edits (§8.2), consent-form views (§8.3), prescription print/export (§8.4)

### Continuity of care

- Patient transfer between branches + history (§9.1); doctor handoff metadata (§9.2); referral-out mechanism (§9.3); multi-doctor treatment plans (§9.4)

### Imaging

- X-ray annotation/markup (§10.1); before/after pairing (§10.2); CBCT series navigation (§10.3); intra-oral camera capture (§10.4); voice-note dictation (§10.5)

### Patient data & misc

- National-ID format/checksum validation (Egypt 14-digit) (§3.3)
- Communication-preference fields (`preferredChannel`/opt-outs — GDPR) (§3.4)
- Age-based / pediatric dosing validation (§4.5)
- Lab-order PDF/print (Window #5)
- Walk-in: estimated wait time (§6.1), reorder/skip-queue (§6.2), convert→scheduled (§6.3), auto-no-show timer (§6.4)

---

## B4. Architecture future-work (design docs only — not built)

### Doctor portal — `docs/architecture/DOCTOR_PORTAL_GAP_ANALYSIS.md`

- New `apps/doctor` frontend app (port 3003) + `/api/doctor/me/*` route tree (~18 endpoints) + `doctorPortalGuard` middleware.
- **P0 — row-level own-doctor enforcement** (server-side `doctorId` injection + ownership checks across all clinical entities). _Overlaps the IDOR/scoping concerns from `BUGS.md`._
- P0 — define "my patients" policy (`Patient` has no `primaryDoctorId`/`assignedDoctorIds`).
- P0 — generic admin routes too broad (`GET /api/appointments` trusts client `doctorId`).
- P1 — doctor dashboard, PHI read-audit coverage, imaging access scoping, notification/socket scoping.
- Frontend shell + auth + i18n/RTL + deployment + tests. Phases 0–6, all future.

### Platform RBAC — `docs/architecture/PLATFORM_RBAC.md`

_Header: "Geplant — Noch nicht implementiert." 3–4 day sprint._

- `platformGuard()` middleware + `PLATFORM_PERMISSIONS` matrix (10 modules × 3 roles × 5 actions).
- 3 platform roles (`platform_owner`/`admin`/`viewer`) replacing the single `platform_admin` god-role.
- Replace ~44 inline `role !== 'platform_admin'` checks across 12 route files.
- Platform users API + invite flow (nanoid token, SHA-256, 72h TTL, Argon2id on accept).
- DB schema changes on `users` (platformRole, overrides, invite fields) + migration + optional `platform_invite_log`.
- JWT payload extension (`platformRole` + resolved permissions); Developer-portal UI (users page, accept-invite, permission-filtered sidebar).
- Decisions #31–#35 to be added to V2_DECISION_LOG.

### Self-hosted AI agents — `docs/architecture/AI_AGENT_PLATFORM_PLAN.md`

_"Draft for approval." Entire AI layer is design-only._

- **Phase 0** — `ai-runner` service (Ollama/vLLM), `AI_*` env vars, provider/orchestrator services, `ai-tools/` framework, `ai-interaction-log` + `ai-agent-config` models, `ai` RBAC module, `/api/ai` route, AI rate limiter.
- **Phase 0.5** — reusable tenant `apiKeyGuard` (`X-API-Key` → tenant); closes a gap deferred in `booking.route.ts`.
- **Phase 1** — Practice Analytics agent (read-only, recommended first).
- **Phase 2** — Clinical Copilot (drafts, human-approved).
- **Phase 3** — WhatsApp/Chat agent — **requires fixing the `srouji` hardcode first** (see `CODE_TODOS.md`).
- **Phase 4** — Scheduling Optimizer.
- Cross-cutting: prompt-injection defense, egress-locked container, output validation, PHI log hygiene/TTL, GDPR erasure, token budgets, per-tenant isolation, SSE streaming, circuit breaker, observability, feature flags.

---

## B5. Roadmap remaining — `docs/architecture/IMPLEMENTATION_ROADMAP.md`

- **Phase 7 — Mobile app** (`apps/mobile`): entirely not built. Expo 52 + Realm offline sync + Atlas Device Sync; mobile auth (SecureStore/biometric/cert-pinning); core + clinical screens (dashboard, patients, calendar, dental chart, treatment plans, prescriptions, X-ray viewer, lab orders); push + device tokens; staff chat; barcode scanner; RTL + dark mode; TestFlight/Play beta + App Store submission; mobile security hardening.
- **Phase 0 (admin leftover):** archive / mark read-only the old v1 `Dento` repo.
- ⚠️ **Stale-snapshot caveat:** the doc's Phase 5/6 checkboxes (inventory routes/tests/frontend, 36 reports + RBAC-protected financial reports, production infra, backups, Sentry/Slack alerts, security audit, source-maps disabled, Tailscale session, prod E2E smoke) show `[ ]`, but these **predate the "Phase 7 complete" status** and are likely already done. Verify against current code/state rather than trusting the boxes.

---

## Fully resolved (no action)

- `docs/deployment/MISSING_ENV_VARS_AUDIT.md` — explicitly "✅ ALL RESOLVED — March 5, 2026."

## Cross-references

- `srouji` WhatsApp hardcode: `CODE_TODOS.md` (code TODO) + `BUGS.md` (verified bug) + here §B4 (AI Phase 3 blocker).
- Payments-not-wired: `CODE_TODOS.md` §2 (stubs) + `BUGS.md` C1/H6/H13 + here B1 (patient checkout) / B3 §5.2 (tenant refund).
- Doctor-portal row-level enforcement (B4) overlaps the IDOR/tenant-scoping themes in `BUGS.md`.

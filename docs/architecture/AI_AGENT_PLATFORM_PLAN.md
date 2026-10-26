# Dentov2 Self-Hosted AI Agent Platform — Implementation Plan

> Status: Draft for approval · Owner: Platform/AI · Last updated: 2026-06-04
> Verified against the live codebase (Fastify API, Payload CMS, DB-per-tenant, RBAC, BullMQ).

## TL;DR

Add a **self-hosted** AI layer to Dentov2 that powers four agents:

1. **Clinical Copilot** — drafts treatment plans, procedure notes, and prescriptions from patient context (admin portal, dentist role).
2. **Patient-facing WhatsApp / Chat Agent** — books appointments, answers FAQs, sends reminders (builds on the existing WhatsApp bot).
3. **Practice Analytics Agent** — insights, anomaly flags, daily briefings (reads reports, schedules, invoices, inventory).
4. **Scheduling Optimizer** — fills gaps, detects conflicts, suggests rescheduling (appointments & availability).

The LLM runs on **your own server** (Ollama by default, vLLM optional for GPU), so you do not depend on third-party AI plans. Tenants consume it from you in two ways: inside the admin portal (JWT) and programmatically via authenticated **tenant API keys** (self-hosted API product).

**Core principle — the LLM proposes, the deterministic backend disposes.** The model may draft text and call **approved read tools** freely, but any write to clinical/booking data goes through the **existing services** (validation, RBAC, audit, and — for prescriptions — safety checks) and requires **human approval**. The LLM never queries MongoDB directly and never auto-commits clinical or booking records.

---

## Verified architecture facts (re-scanned)

| Area            | Fact                                                                                                    | Source                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Runtime         | Fastify 5 + Payload 3                                                                                   | `apps/api/src/server.ts`                                                                    |
| Tenancy         | DB-per-tenant: `getTenantConnection(slug)` → `useDb('tenant_{slug}')`                                   | `tenant/middleware/tenant-db.ts`                                                            |
| Auth chain      | `authGuard → tenantDbMiddleware → roleGuard(module, permission)`                                        | `tenant/middleware/*`                                                                       |
| Service pattern | `new XService(tenantDb, tenantId)` per-request in thin routes                                           | `routes/reports/report-data.route.ts`                                                       |
| Background jobs | Redis + BullMQ workers already started                                                                  | `server.ts` (`startNotificationWorkers`, `startReportExportWorker`, `startReportScheduler`) |
| Audit           | Mutation audit + read-side PHI audit (HIPAA §164.312(b))                                                | `audit-logger.ts`, `with-audit.ts`                                                          |
| Clinical safety | Prescription service **already** has `runSafetyChecks()` + `safetyOverride` + `CLINICAL_SAFETY_WARNING` | `services/prescription.service.ts`                                                          |
| Patient data    | Stores `allergies[]`, `medicalHistory`, `currentMedications[]`, `isPregnant`, `dateOfBirth`             | `models/patient.model.ts`                                                                   |
| Analytics       | Report pipelines F1–F7, O1–O2, inventory with Redis `getOrSet` cache                                    | `services/report-pipeline.service.ts`, `inventory-report-pipeline.service.ts`               |
| WhatsApp        | Deterministic FSM booking; public webhook route by `:tenantSlug`                                        | `services/whatsapp-bot.service.ts`, `routes/whatsapp-bot/*`                                 |
| Env             | Zod schema; `MONGODB_URI` / `REDIS_URL` present; **no AI vars yet**                                     | `config/env.ts`                                                                             |
| Compose         | `mongodb` (27017), `redis` (6380:6379), `api` (3001), `admin`, `developer`; **no AI service**           | `docker-compose.yml`                                                                        |

### Gaps confirmed (must be addressed in this plan)

1. **No reusable `X-API-Key` tenant request guard** — only platform-side CRUD + `/verify` exist (`booking.route.ts` documents this as deferred).
2. **Hardcoded tenant slug** — `apps/admin/src/features/settings/components/WhatsAppBotTab.tsx:64`: `const tenantSlug = 'srouji'` breaks multi-tenant WhatsApp.
3. **`ai` is not a module** — absent from `MODULE_SLUGS` and `PERMISSION_MATRIX`.

### Naming caveat

Module slugs differ by layer: `packages/shared` `MODULE_SLUGS` uses **snake_case** (`treatment_plans`), while `role-guard.ts` `ModuleSlug` uses **kebab-case** (`treatment-plans`). The new `ai` module must be registered in **both** with the correct casing.

---

## Phase 0 — Foundation (prerequisite for everything)

| #   | Item                       | Detail                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 0.1 | Self-hosted model runtime  | Add `ai-runner` service to compose (Ollama default; vLLM optional for GPU). **Internal-only** private port; never publicly exposed.                                                                                                                                                                         |
| 0.2 | Env vars                   | Zod additions in `config/env.ts`: `AI_ENABLED`, `AI_PROVIDER` (`ollama`\|`vllm`\|`openai-compatible`), `AI_BASE_URL`, `AI_DEFAULT_MODEL`, `AI_EMBED_MODEL`, `AI_REQUEST_TIMEOUT_MS`, `AI_MAX_TOKENS`, `AI_TEMPERATURE`, `AI_DAILY_TOKEN_BUDGET`. Prod validation: `AI_BASE_URL` must be private/intra-host. |
| 0.3 | Model provider abstraction | `ai-model-provider.service.ts`: single `chat()` / `embed()` interface with provider adapters; timeout, retry, token accounting. No business logic.                                                                                                                                                          |
| 0.4 | Orchestrator               | `ai-orchestrator.service.ts`: bounded tool-calling loop. Input `{ tenantDb, tenantId, actor(role/userId), agent, messages }`. Enforces max tool calls, per-tool RBAC, PHI redaction in logs, token budget.                                                                                                  |
| 0.5 | Tool framework             | `ai-tools/`: each tool = `{ name, description, zod input schema, requiredPermission, handler(ctx) }`. Handlers call **existing services only**. Read tools vs write tools clearly separated; write tools return a **proposed action** requiring explicit approval — never auto-commit.                      |
| 0.6 | Models                     | `ai-interaction-log.model.ts` (per-tenant: agent, actor, prompt hash, tools used, tokens, latency, outcome — PHI-safe) and `ai-agent-config.model.ts` (per-tenant enable/disable + settings).                                                                                                               |
| 0.7 | RBAC                       | Add `ai` module to `MODULE_SLUGS` (shared) + `ModuleSlug` (role-guard) + `PERMISSION_MATRIX` rows for all 8 roles (dentist/tenant_admin broader; receptionist limited; etc.).                                                                                                                               |
| 0.8 | Routes                     | `apps/api/src/tenant/routes/ai/ai.route.ts` mounted with `[authGuard, tenantDbMiddleware, roleGuard('ai','read'                                                                                                                                                                                             | 'write')]`. Register in `server.ts`. |
| 0.9 | Rate limiting              | Dedicated AI limiter (lower than the 1000/min API-key default) + token-budget guard.                                                                                                                                                                                                                        |

## Phase 0.5 — Tenant API-Key request guard (prereq for "tenants call by API")

- Build reusable `apiKeyGuard` middleware: read `X-API-Key` → SHA-256 hash → look up `ApiKey` → validate scope/permissions/active → resolve tenant → attach `tenantDb` + `apiKeyContext` → record `ApiKeyUsage`. Place in `tenant/middleware` and export from `middleware/index.ts`.
- `/ai` routes accept **either** JWT (portal) **or** API key (programmatic).
- Closes the gap noted in `booking.route.ts` ("Full SHA-256 API key validation flows through platform api-keys system"); required for the self-hosted API product.

## Phase 1 — Practice Analytics Agent (lowest risk, read-only)

- **Why first:** read-only, builds on existing report pipelines, no clinical/booking write risk.
- **Read tools:** `getFinancialReport`, `getOperationalReport`, `getInventoryReport`, `getScheduleSummary`, `getAppointmentStats` — thin wrappers over `ReportPipelineService` / `InventoryReportPipelineService`.
- **Pattern:** backend **computes** numbers; LLM only **explains / summarizes / flags anomalies**. Never let the LLM invent figures — pass computed JSON, request narrative + anomaly flags.
- **Daily briefing:** BullMQ scheduled job (reuse report-scheduler infra) → per-tenant briefing → existing notification service.
- **Admin UI:** `features/ai-insights` (page + hook), gated via `RoleGate` + `ModuleGate('ai')`.

## Phase 2 — Clinical Copilot (drafts only, human-approved)

- **Reuse:** patient model fields, prescription `runSafetyChecks`, treatment-plan / procedure-note services. Copilot **drafts**; clinician edits + commits through existing services (which re-run safety).
- **Read tools:** `getPatientClinicalContext` (decrypted PII via existing service + `withAudit`), `getDentalChart`, `getTreatmentHistory`, `getActivePrescriptions`.
- **Draft (write-proposal) tools:** `draftTreatmentPlan`, `draftProcedureNote`, `draftPrescription` — return a structured draft only; commit happens via existing create endpoints with the `safetyOverride` flow intact.
- **Guardrails:** every PHI read goes through `withAudit`; drafts labeled AI-generated; no auto-commit; prescription drafts must surface the existing `CLINICAL_SAFETY_WARNING` to the clinician.
- **Admin UI:** embedded panel in patient / treatment-plan pages (dentist role only).

## Phase 3 — WhatsApp / Chat Agent (LLM intent layer over existing FSM)

- **Fix first:** `WhatsAppBotTab.tsx:64` hardcoded slug → derive `tenantSlug` from auth context.
- Keep the deterministic FSM (`BookingService`) for the actual booking transaction. Add an LLM intent layer: classify message (book / reschedule / cancel / FAQ / handoff), extract entities, answer FAQs from a per-tenant knowledge base; hand structured intents to the FSM for the booking write.
- **FAQ:** small per-tenant KB (settings) + optional embeddings retrieval (`AI_EMBED_MODEL`).
- **Safety:** never confirm a booking the FSM didn't commit; fall back to FSM on low confidence; bilingual EN/AR preserved.

## Phase 4 — Scheduling Optimizer (suggestions, applied via existing service)

- **Read tools:** `getOpenSlots` (slot-engine `generateSlots`), `getDayLoad`, `getConflicts`, `getGapAnalysis`.
- **Suggestion engine:** detect gaps/conflicts, propose fills/reschedules. **All** changes applied through `appointment.service.updateAppointment` (preserves `VALID_STATUS_TRANSITIONS`, validation, socket/webhook/notification side-effects). Optimizer proposes; staff approves; service executes.
- **Optional scheduled job:** daily "gaps & at-risk appointments" briefing (reuse worker infra).

---

## Relevant files

### New

- `apps/api/src/tenant/routes/ai/ai.route.ts` — agent endpoints; register in `server.ts`.
- `apps/api/src/tenant/services/ai-orchestrator.service.ts` — tool-calling loop + guardrails.
- `apps/api/src/tenant/services/ai-model-provider.service.ts` — provider abstraction.
- `apps/api/src/tenant/services/ai-tools/{analytics,clinical,booking,scheduling}.tools.ts`.
- `apps/api/src/tenant/models/ai-interaction-log.model.ts`, `ai-agent-config.model.ts`.
- `apps/api/src/tenant/middleware/api-key-guard.ts` — `X-API-Key` → tenant; export from `middleware/index.ts`.
- Admin feature folders: `features/ai-insights`, Copilot panel components (gated in `router.tsx`).

### Edit

- `apps/api/src/config/env.ts` — `AI_*` Zod vars + prod validation.
- `packages/shared/src/constants/index.ts` — add `ai` to `MODULE_SLUGS` (snake_case).
- `apps/api/src/tenant/middleware/role-guard.ts` — add `ai` `ModuleSlug` + `PERMISSION_MATRIX` rows.
- `apps/api/src/server.ts` — register `ai.route` + any AI scheduled-job starter.
- `docker-compose.yml`, `docker-compose.prod.yml`, `infra/Caddyfile` — `ai-runner` (internal only).
- `apps/admin/src/features/settings/components/WhatsAppBotTab.tsx:64` — remove hardcoded slug.

### Reuse (no change to behavior)

`report-pipeline.service.ts`, `inventory-report-pipeline.service.ts`, `appointment.service.ts`, `slot-engine.service.ts`, `treatment-plan.service.ts`, `procedure-note.service.ts`, `prescription.service.ts`, `whatsapp-bot.service.ts`, `notification.service.ts`, `report-scheduler.service.ts`, `with-audit.ts`.

---

## Verification (automated + manual)

1. **Unit:** provider adapter (timeout/retry); orchestrator loop (max iterations, RBAC denial, token budget); each tool's zod validation + that handlers call services (mock services). Follow existing vitest setup.
2. **Contract:** `ai.route` auth matrix — JWT path **and** API-key path; `roleGuard('ai', …)` denies wrong roles; `apiKeyGuard` rejects bad/expired/over-scope keys.
3. **Integration:** Analytics output matches `ReportPipelineService` exactly (no LLM math); clinical draft tools never write; prescription draft surfaces `CLINICAL_SAFETY_WARNING`.
4. **Security:** confirm `ai-runner` is not publicly reachable (Caddyfile/compose); PHI not written to `ai-interaction-log`; `withAudit` fires on every PHI read tool; NoSQL sanitizer applied to AI inputs.
5. **Manual:** portal Copilot draft → clinician edit → commit via existing endpoint; WhatsApp booking still commits through FSM; scheduling change applied via `updateAppointment` emits socket/webhook/notification.
6. **Multi-tenant:** run two tenants; verify `tenantDb` isolation in tool handlers (no cross-tenant data).

---

## Decisions

- Self-hosted via **Ollama** by default (CPU-friendly); **vLLM** optional for GPU; OpenAI-compatible adapter kept as an escape hatch but **disabled in prod** by default.
- LLM never queries MongoDB directly and never auto-commits clinical/booking writes — tools + approval only.
- Backend computes all analytics numbers; LLM only narrates.
- Tenant programmatic access via the new `apiKeyGuard`, reusing the existing `ApiKey` model (no new key system).
- Reuse existing services / RBAC / audit / safety rather than reimplementing.
- **Excluded for now:** voice, image/x-ray vision, autonomous (no-approval) actions, cross-tenant analytics.

---

## Open considerations (recommendations)

1. **Starting model** — (A) Llama 3.1 8B (light, CPU-ok) **[recommended]** · (B) larger 70B (GPU) · (C) OpenAI-compatible remote. Recommend A now; keep provider swap easy.
2. **API metering/billing for tenant AI calls** — (A) reuse `ApiKeyUsage` + token counts **[recommended]** · (B) separate billing module later.
3. **Phase 3 FAQ knowledge base storage** — (A) per-tenant settings doc **[recommended for MVP]** · (B) dedicated KB collection with embeddings (scale later).

---

## Suggested build order

```
Phase 0  Foundation (runtime, provider, orchestrator, tools, RBAC, route)
Phase 0.5 Tenant API-key request guard
Phase 1  Practice Analytics Agent      (read-only, lowest risk)
Phase 2  Clinical Copilot              (drafts only, human-approved)
Phase 3  WhatsApp / Chat Agent         (LLM intent over existing FSM)
Phase 4  Scheduling Optimizer          (suggestions via updateAppointment)
```

---

# Addendum — Codebase Verification & Gap Analysis

> Added after a deep re-scan. The base plan is correct; this addendum makes it **complete** by
> binding it to verified code conventions and closing gaps across security, API, architecture, and
> read/write/edit flows.

## A. Code-convention compliance (verified — the AI layer MUST follow these)

| Convention        | Verified source                                                                                                                                                           | Rule for the AI layer                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Error type        | `utils/api-response.ts` — `class ApiError` with `badRequest/unauthorized/forbidden/notFound/conflict`                                                                     | AI services/routes throw `ApiError` (never generic `Error`); the global handler in `server.ts` formats it.                             |
| Error contract    | `server.ts setErrorHandler` → `{ statusCode, error, message, details?, requestId, timestamp }`; Zod → 422                                                                 | AI endpoints inherit this shape automatically; do not invent a custom error body.                                                      |
| Success shape     | `apiResponse(reply, code, data, message)`                                                                                                                                 | All AI route responses use `apiResponse`.                                                                                              |
| Service pattern   | `new XService(tenantDb)` (some also take `tenantId`), models via `getXModel(connection)` factory                                                                          | `AiOrchestratorService(tenantDb, ...)`; resolve models with the same factory guard.                                                    |
| PII at rest       | `utils/encryption.ts` AES-256-GCM (`iv:authTag:ciphertext`); services call `decryptField` on read (e.g. `appointment.service.ts decryptPatientPii`)                       | AI read tools must obtain PII **only** through existing service methods that decrypt; tools must **never** log or embed decrypted PII. |
| Realtime          | `socketEmitter` (`plugins/socket.plugin.ts`)                                                                                                                              | Reuse `socketEmitter` for any live AI status; do not open new socket channels ad-hoc.                                                  |
| Rate limiting     | `plugins/rate-limit.plugin.ts` decorators (`authRateLimit`, `apiKeyRateLimit` 1000/min, `webhookRateLimit`) keyed off `x-api-key`                                         | Add a new `aiRateLimit` decorator + `RATE_LIMITS.AI` entry; do **not** reuse the 1000/min default for LLM calls.                       |
| Tenant resolution | `X-Tenant-Slug` header → `tenantDbMiddleware` → `useDb()`                                                                                                                 | API-key path must map key → tenant slug → `useDb()` (the new `apiKeyGuard`).                                                           |
| Audit             | mutation (`audit-logger`) + read-side (`withAudit`); `sensitivityLevel` incl. `'critical'`                                                                                | Clinical AI writes log at `sensitivityLevel: 'critical'`; every PHI read tool sits behind `withAudit`.                                 |
| Existing safety   | `prescription.service.ts runSafetyChecks()` → allergen match + `isPregnant`/contraindication, throws `CLINICAL_SAFETY_WARNING` (409) unless `safetyOverride.acknowledged` | Copilot prescription drafts **reuse** this exact path; the model never bypasses it.                                                    |

## B. Security gaps to close (were missing or under-specified)

1. **Prompt-injection / jailbreak defense.** Patient free-text, FAQ content, and tool outputs can carry
   injected instructions. Mitigations: hardened system prompt with explicit refusal rules; a **per-agent
   tool allowlist** (each agent can call only its tools); treat all retrieved/user text as untrusted data,
   never as instructions; strip/΄escape tool results before re-feeding; cap tool-call iterations.
2. **No PHI to any remote model.** Self-hosting is the control — enforce it: the `ai-runner` container gets
   **no outbound internet** (egress-locked network), and the OpenAI-compatible adapter is hard-disabled in
   prod. Add this as a network policy, not just an env flag.
3. **Output validation before any action.** Every LLM tool-call argument is **Zod-validated** before it
   reaches a service; drafted prescriptions are re-run through `runSafetyChecks`; malformed tool calls are
   rejected, not coerced.
4. **PHI minimization + log hygiene.** `ai-interaction-log` stores prompt **hashes**, tool names, token
   counts, latency, outcome — **never** decrypted PHI or raw prompts containing PHI. Add a TTL/retention.
5. **Right-to-erasure (GDPR) / HIPAA.** Patient deletion must also purge related `ai-interaction-log`
   entries. Add a DPIA note; AI PHI processing stays inside the self-hosted boundary (no BAA needed).
6. **Cost/DoS abuse.** Per-tenant **and** per-user token budgets, concurrency caps, and a queue for heavy
   jobs. A runaway agent must not exhaust the model server or rack up compute.
7. **Per-tenant isolation for embeddings.** If FAQ/RAG embeddings are added, store them in the
   tenant DB (or a tenant-scoped index) — never a shared vector store.
8. **Input sanitizer reuse.** Run existing `inputSanitizer` / `validateMongoQuery` on AI-supplied filter
   values so generated queries can't become NoSQL injection.

## C. API gaps to close

1. **Streaming (SSE).** Interactive chat/Copilot should stream tokens. Add an SSE/chunked route variant;
   plain JSON for tool-result endpoints.
2. **Idempotency on commit.** When a human approves a draft and it is committed via the API-key path,
   accept an `Idempotency-Key` to prevent double-create (esp. prescriptions/appointments).
3. **Fastify route schemas.** Every AI route declares a Zod/JSON `schema` (validation + docs), per §3.5.
4. **List/meta.** AI interaction-log and agent-config list endpoints use the standard paginated `meta`.
5. **Graceful degradation contract.** When `ai-runner` is down, AI endpoints return a clean `503`
   (`AI_UNAVAILABLE`) — the core app and non-AI routes are unaffected.

## D. Architecture gaps to close

1. **Sync vs async split.** Interactive endpoints (Copilot/chat) run synchronously with a hard timeout +
   streaming; heavy/long tasks (daily briefings, batch anomaly scans) run on a **BullMQ worker** (reuse
   existing worker infra). Don't block the request thread on long generations.
2. **Health/warm-up + fallback.** Add an `ai-runner` health check and model warm-up; circuit-breaker so a
   slow/down model degrades gracefully instead of cascading timeouts.
3. **Caching.** Reuse Redis `getOrSet` for embeddings and repeated analytics narratives.
4. **Observability.** Emit metrics (tokens, latency, tool error rate) via Pino structured logs; route
   exceptions to existing Sentry. Add a per-agent dashboard later.
5. **Feature flags.** `ai-agent-config` enables/disables each agent per tenant; the orchestrator checks it
   before running (already planned — make it a hard gate).

## E. Read / Write / Edit discipline (verified against services)

- **READ** — Data minimization by agent: Analytics reads **aggregates only** (no PHI); Scheduling reads
  schedule data (minimal PHI); Clinical reads PHI **through existing decrypting services behind
  `withAudit`**. No tool returns more PHI than its task needs.
- **WRITE** — All writes go through existing create methods (which run validation, status transitions,
  safety, socket, webhook, notification). Stamp `createdBy`/`updatedBy` = the **human approver**, plus a new
  `aiAssisted: true` + `aiInteractionId` for traceability. The model never owns a write.
- **EDIT** — Updates go through existing update methods (enforced `VALID_STATUS_TRANSITIONS` /
  `STATUS_TRANSITIONS`). Honor optimistic-concurrency (version mismatch → `409`, per §4.2) so an AI edit
  can't silently clobber a concurrent human edit.

## F. Additions to the verification checklist

7. **Prompt-injection tests** — adversarial patient/FAQ inputs cannot trigger tool calls or data exfiltration.
8. **Egress test** — confirm `ai-runner` cannot reach the public internet.
9. **Erasure test** — deleting a patient purges their `ai-interaction-log` rows.
10. **Degradation test** — with `ai-runner` stopped, AI routes return `503 AI_UNAVAILABLE` and the rest of the app works.
11. **Concurrency test** — concurrent AI edit + human edit resolves via version `409`, no lost update.

---

# LLM Selection, Licensing & Training

## Recommendation (no training required to start)

Use a **pretrained, instruction-tuned, permissively-licensed** model served locally. Start with
**RAG + function-calling + a strong system prompt** — **do not fine-tune initially.**

### Model shortlist (permissive licenses, good tool-calling)

| Model                     | Size | License                                                     | Arabic  | Notes                                                                        |
| ------------------------- | ---- | ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| **Qwen2.5-14B-Instruct**  | 14B  | **Apache-2.0**                                              | Strong  | **Top pick** — best all-rounder for bilingual EN/AR + reliable tool calling. |
| **Qwen2.5-7B-Instruct**   | 7B   | **Apache-2.0**                                              | Strong  | Lighter hardware; same family, slightly weaker reasoning.                    |
| Mistral-Nemo-Instruct     | 12B  | **Apache-2.0**                                              | OK      | Good tool use; Arabic weaker than Qwen.                                      |
| Mistral-7B-Instruct       | 7B   | **Apache-2.0**                                              | Weak/OK | Lightweight, English-first.                                                  |
| **Phi-3.5-mini-instruct** | 3.8B | **MIT**                                                     | Weak    | If you specifically need an **MIT** license; Arabic is weak.                 |
| Llama 3.1 8B Instruct     | 8B   | Llama Community (≈Apache for <700M MAU, **not MIT/Apache**) | OK      | Fine technically, but **not** a true OSI-permissive license.                 |
| Gemma 2 9B                | 9B   | Gemma (restrictions)                                        | OK      | **Not** MIT/Apache.                                                          |

> **On "MIT specifically":** truly MIT chat models that are also strong at Arabic + tool calling are rare.
> The pragmatic permissive choice is **Apache-2.0 (Qwen2.5)**. If MIT is a hard requirement, **Phi-3.5-mini
> (MIT)** is the option, accepting weaker Arabic.

### Embeddings (for FAQ / RAG) — both MIT, multilingual incl. Arabic

- **BAAI/bge-m3** (MIT) — recommended, multilingual + long context.
- **intfloat/multilingual-e5-large** (MIT) — solid alternative.

### Serving

- **MVP:** **Ollama** — GGUF quantized (e.g. `Q4_K_M`), runs CPU or GPU, trivial ops.
- **Scale:** **vLLM** — OpenAI-compatible, high throughput, GPU (use AWQ/GPTQ quant).
- Both fit the `AI_PROVIDER` abstraction in the plan; swap without app changes.

### Hardware sizing (rough)

- 7B `Q4` ≈ 6–8 GB VRAM (or CPU + ~16 GB RAM, slower).
- 14B `Q4` ≈ 10–12 GB VRAM. A single **24 GB GPU** runs 14B comfortably or several 7–8B agents.

## Do you need training? — No (initially)

Reliability comes from **prompting + retrieval + constrained output**, in this order:

1. **System-prompt engineering** per agent (role, refusals, tool allowlist, output rules).
2. **RAG** — retrieve clinic data, FAQs, and computed analytics; pass as context. The backend computes
   numbers; the model only narrates/drafts.
3. **Constrained / JSON-schema decoding** — use Ollama `format: json` or vLLM grammar to force valid tool
   calls and structured drafts (treatment plan / note / prescription). This removes most "model made up a
   field" failures without any training.
4. **Few-shot examples** for tone (EN/AR) and format.

**Consider LoRA fine-tuning only later, and only if** prompting+RAG plateaus — e.g. for Arabic-dialect
tone or very strict structured output. If so: train on **de-identified** data only, with a DPIA, and keep
the base model swappable. Quantized LoRA (QLoRA) on a single GPU is sufficient; full fine-tuning is not
warranted.

## "Best thing you can do" — concrete starting move

1. Stand up **Ollama + Qwen2.5-7B-Instruct** (Apache-2.0) on an **egress-locked** `ai-runner`.
2. Build **Phase 0 foundation** (provider abstraction, orchestrator, tool framework, `ai` RBAC module) and
   **Phase 0.5 `apiKeyGuard`** — the linchpin of the self-hosted API product.
3. Ship the **Analytics Agent first** (read-only, backend computes numbers) to prove value + safety with
   zero write risk.
4. Enforce **JSON-schema-constrained** tool calls and per-tenant **token budgets** from day one.
5. Then add **Clinical Copilot drafts** (reusing `runSafetyChecks`), upgrading to **Qwen2.5-14B** if Arabic
   clinical quality needs it.

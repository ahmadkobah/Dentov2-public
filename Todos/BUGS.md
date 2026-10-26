# Dento v2 — Bug List

> Generated: 2026-06-13
> Method: 5 parallel review agents (auth, tenant-isolation, payments/webhooks, crypto/PII, backend correctness), then a 57-agent adversarial verification pass — each finding re-read against the actual code, and every critical/high finding faced 2 skeptics with distinct refutation lenses. A finding is **CONFIRMED** only if skeptics could not overturn it.
> Severities below are the **verified** severities (which sometimes differ from the original review's claim). Paths use `file:line`.

## Summary

| Status                                                      | Count |
| ----------------------------------------------------------- | ----- |
| Confirmed (real bug)                                        | 21    |
| Partially confirmed (real but narrower than claimed)        | 4     |
| Contested (1 of 2 skeptics refuted — needs human judgement) | 2     |
| Refuted / overturned (NOT a bug)                            | 4     |

**Highest-leverage, fix first:** C1 and C4 are remotely exploitable by an _unauthenticated_ attacker.

### Cross-cutting context

The **platform payment layer is not yet wired to live gateways** — `create` PaymentIntent / Paymob order and the refund calls are `// In production:` stubs that persist `providerPaymentId:''`. So payment-bug impact today is **billing-record corruption / free subscription**, not theft of a live money flow. Still a launch blocker.

---

## 🔴 Critical

### C1 — Payment webhooks are forgeable by an unauthenticated attacker — CONFIRMED (0 refutes)

- **Severity:** critical (claimed critical)
- **Where:** `apps/api/src/platform/routes/payments/stripe.route.ts:70-90,179,185-187` · `apps/api/src/platform/routes/payments/payments.route.ts:54-77,99-131,230-246` · `apps/api/src/config/env.ts:79,82-84` · same raw-body bug at `apps/api/src/platform/routes/deployments/deployments.route.ts:188`
- **Bug:** Three compounding flaws: (a) Stripe handler HMACs `JSON.stringify(request.body)` (re-serialized parsed object), not the raw bytes Stripe signed, and no raw-body parser is registered → a genuine signature can never match. (b) Both webhook routes have **no auth preHandler** and **skip verification entirely** when the secret or signature header is absent (`if (webhookSecret && signatureHeader)` / `if (hmacSecret && payload.hmac)`); both secrets are `.optional()` with no production enforcement. (c) Paymob's `paymobWebhookSchema` is `.strict()` and omits the fields the HMAC is built from → real callbacks 422, forged minimal ones bypass.
- **Exploit:** `POST /api/payments/paymob/webhook` with `{"obj":{"id":1,"order":{"id":1},"success":true,"amount_cents":100,"currency":"EGP"}}` and **no `hmac`** → schema passes, verification skipped, handler completes the newest pending payment. Marks a SaaS subscription paid for free / corrupts billing.
- **Fix:** Require webhook secrets in production (env superRefine); always reject when signature/secret missing (drop the `&&` short-circuit); register an encapsulated raw-body parser and HMAC the raw bytes; widen the Paymob schema (passthrough) to include HMAC-covered fields.

### C4 — Socket.io has no handshake auth and no room authorization → cross-tenant realtime leak — CONFIRMED (0 refutes)

- **Severity:** critical (claimed critical)
- **Where:** `apps/api/src/plugins/socket.plugin.ts:40-150,205-289`
- **Bug:** No `io.use()` auth middleware anywhere. Any anonymous client can connect and `socket.on('join')` arbitrary rooms keyed by enumerable IDs (`branch:<id>:daily-ops`, `tenant:<id>:chairs`, `user:<id>`, `chat:<id>`). Servers broadcast queue/chair/notification data to these rooms.
- **Exploit:** Connect anonymously, `join` another tenant's room → receive their realtime PHI-adjacent streams.
- **Fix:** Add an `io.use()` handshake that verifies the JWT and sets `socket.data.userId/tenantId`; on `join`, validate the room belongs to that tenant/user (prefix rooms with tenant slug, reject mismatches).

---

## 🟠 High

### C3 — `2fa-setup` scoped token authenticates against any protected route — CONFIRMED (0 refutes)

- **Severity:** high (claimed critical)
- **Where:** `apps/api/src/tenant/routes/auth/auth.route.ts:501-508` · `apps/api/src/tenant/middleware/auth-guard.ts:35-69` · `apps/api/src/utils/jwt.ts`
- **Bug:** Forced-2FA-setup login issues `generateAccessToken({...,scope:'2fa-setup'})` — an ordinary HS256 access token with the user's real role. `authGuard`/`verifyAccessToken` only reject `typ:'2fa_pending'`; they never inspect `scope`. So the setup token bypasses the mandatory-2FA gate and works everywhere.
- **Fix:** Reject any token with a `scope` in `authGuard` (only the setup/verify handlers should accept it), or give setup tokens a distinct `typ` like the 2FA challenge token already uses.

### C5 — Reminder + auto-no-show crons compare `String "HH:mm"` against `Date` and ignore `date` — PARTIALLY CONFIRMED (0 refutes)

- **Severity:** high (claimed critical)
- **Where:** `apps/api/src/jobs/crons/reminder.cron.ts:89-95,157` · `apps/api/src/jobs/crons/auto-noshow.cron.ts:79-85` · `apps/api/src/tenant/models/appointment.model.ts:25,92-93,101-110`
- **Bug (structural — confirmed):** `startTime` is a `String "HH:mm"`, `date` is a separate `Date`; both crons query `startTime` with `Date` bounds and never reference `date`, and filter on `status:'scheduled'` which is not in the enum.
- **Correction to the original claim:** the asserted "BSON type-ordering matches all strings → future appts wrongly marked no*show" mechanism is **wrong**. MongoDB range operators only match the \_same* BSON type, so `startTime:{$lte:<Date>}` matches **no** string docs → the crons simply **return nothing and never fire**. Net impact: appointment reminders and auto-no-show silently never work (functional/ops, not a false-positive write).
- **Fix:** Build the comparison window from `date` + `startTime` (or store a combined `startDateTime`); use real statuses `['booked','confirmed']`.

### H6 — Paymob webhook never validates amount/currency + dangerous fallback match — CONFIRMED (0 refutes)

- **Severity:** high (claimed high)
- **Where:** `apps/api/src/platform/routes/payments/payments.route.ts:251-289`
- **Bug:** On no provider-id match, completes the most-recent `{providerPaymentId:'', status:'pending'}` payment; never compares `amount_cents`/`currency` to stored `amount` (whole EGP) / `currency`. Compounds C1 — complete a large invoice while reporting a tiny amount.
- **Fix:** Match strictly by stored provider order id (reject on miss); validate `amount_cents === Math.round(payment.amount*100)` and currency before completing.

### H11 — Delayed workflow actions are silently dropped — CONFIRMED (0 refutes)

- **Severity:** high (claimed high)
- **Where:** `apps/api/src/jobs/workers/workflow.worker.ts:30-140`
- **Bug:** Delayed actions are re-queued as job name `'delayed-action'` carrying `{action,...}`, but the processor never branches on `job.name` — it always destructures `{tenantSlug,trigger,eventData}` and calls `findMatchingWorkflows(trigger)`. For delayed jobs `trigger` is `undefined`, so the carried action never executes.
- **Fix:** Branch on `job.name === 'delayed-action'` and execute the carried `action` directly.

---

## 🟡 Medium

### C2 — Access tokens are not invalidated by `tokenVersion` — CONFIRMED (0 refutes)

- **Severity:** medium (claimed critical — downgraded: 15-min access TTL bounds exposure; `authGuard` _does_ re-check account status live each request)
- **Where:** `apps/api/src/tenant/middleware/auth-guard.ts:47-69` · `apps/api/src/utils/jwt.ts:21-36` · `apps/api/src/tenant/routes/auth/auth.route.ts:897,984,1253`
- **Bug:** `tokenVersion` lives only on the refresh token and is enforced only at `/auth/refresh`. The access-token payload has no `tokenVersion`, and `authGuard` never compares it. So logout-all / change-password / reset-password do **not** revoke in-flight access tokens (valid up to one TTL).
- **Fix:** Embed `tokenVersion` in the access token and reject mismatches in `authGuard`.

### H8 — TOTP codes are replayable within the validity window — CONFIRMED (0 refutes)

- **Severity:** medium (claimed high)
- **Where:** `apps/api/src/tenant/services/totp.service.ts:142-150` · `apps/api/src/platform/models/user.model.ts:193-197`
- **Bug:** `validateLogin` calls `totp.verify` and returns the boolean without recording the consumed step; the User model has no `lastUsedStep` field. A captured code can be replayed until rotation (RFC 6238 §5.2 violation). (Recovery codes _are_ correctly single-use — the asymmetry confirms the gap.)
- **Fix:** Persist the accepted TOTP step and reject `step <= lastUsedStep`; set an explicit `window`.

### H9 — 2FA login mints sessionless tokens with stale `tokenVersion` — CONFIRMED (0 refutes)

- **Severity:** medium (claimed high — it's a reliability defect hitting all 2FA users, not an attacker exploit)
- **Where:** `apps/api/src/tenant/routes/auth/two-factor.route.ts:157-169,267-279,360-372` · `apps/api/src/tenant/routes/auth/auth.route.ts:868,897`
- **Bug:** validate/recovery/verify-autologin build tokens inline and never call `createSessionAndTokens`, so no `UserSession` row exists → the first `/auth/refresh` hits the "no session ⇒ reuse ⇒ revoke all" branch. validate/recovery projections also omit `tokenVersion` (defaults 0) → token born invalid if real version > 0.
- **Fix:** Route all three success paths through `createSessionAndTokens`; include `tokenVersion` in the projection.

### H10 — GCM decrypt swallows auth-tag failures, returns ciphertext as plaintext — CONFIRMED (0 refutes)

- **Severity:** medium (claimed high — integrity-masking, not a bypass)
- **Where:** `apps/api/src/utils/encryption.ts:70-73` · `apps/api/src/utils/mongoose-field-encryption.plugin.ts:247-249`
- **Bug:** `decryptField`'s catch returns the original `iv:tag:cipher` string instead of throwing on auth-tag mismatch / wrong key / corruption. The opaque blob can be served into API responses; key-rotation mistakes are masked with no alarm.
- **Fix:** Distinguish "not in encrypted format" (return as-is) from "decryption/auth failed" (throw or log+alert).

### M14 — Refresh-token rotation is not atomic (concurrent double-issue) — CONFIRMED

- **Severity:** medium · **Where:** `apps/api/src/tenant/routes/auth/auth.route.ts:863-908`
- **Bug:** `findOne({jti,isActive:true})` then a later `updateOne({_id},{isActive:false})` is a non-atomic read-then-write; two concurrent requests with the same refresh token can both mint new pairs.
- **Fix:** `findOneAndUpdate({refreshTokenJti:jti,isActive:true},{isActive:false})`; treat a null result as reuse.

### M17 — Tenant webhook signing `secret` stored in cleartext — CONFIRMED

- **Severity:** medium · **Where:** `apps/api/src/tenant/models/webhook.model.ts:53-56` · `apps/api/src/tenant/services/webhook-dispatcher.ts:148`
- **Bug:** The HMAC signing secret is a plain `String` with no field-encryption and no `select:false`. A DB read exposes every tenant's signing secret → attacker forges signed deliveries. (API responses do strip it — at-rest only.)
- **Fix:** Encrypt `secret`/`authValue` at rest (decrypt in the dispatcher for signing); at minimum add `select:false`.

### M21 — Dunning email selects a non-existent field → "USD undefined" — CONFIRMED

- **Severity:** medium · **Where:** `apps/api/src/jobs/crons/dunning.cron.ts:71,114` · `apps/api/src/platform/models/saas-invoice.model.ts:104,174`
- **Bug:** `.select` includes `totalAmount`, but the field is `total` (and `total` isn't selected) → customer dunning email shows `"<currency> undefined"`.
- **Fix:** Select and use `total`.

### M22 — `invoice.overdue` webhook re-fires for the whole backlog every run — CONFIRMED

- **Severity:** medium · **Where:** `apps/api/src/tenant/services/invoice.service.ts:539-558`
- **Bug:** After marking new overdue invoices, it re-queries `{status:'overdue', dueDate<now}` to dispatch webhooks — matching _all_ already-overdue invoices, not just newly transitioned ones → non-idempotent duplicate dispatches daily.
- **Fix:** Capture only the IDs transitioned this run (or add an `overdueNotifiedAt` guard).

### M23 — `special_hours` exception not enforced in booking validation — CONFIRMED

- **Severity:** medium · **Where:** `apps/api/src/tenant/services/schedule-validation.service.ts:200-223` vs `apps/api/src/tenant/services/slot-engine.service.ts:133-138`
- **Bug:** For an approved `special_hours` exception, `validateDoctorSchedule` gates the overlap block on `exceptionType !== 'special_hours'` and returns without narrowing the allowed window — while the slot engine _does_ narrow it. The two paths disagree → validation accepts appointments outside the special-hours window.
- **Fix:** When `exceptionType === 'special_hours'`, require `start>=specialStart && end<=specialEnd` (mirror the slot engine).

---

## ⚪ Low

| ID  | Bug                                                                 | Where                                                          | Verified severity             | Note                                                                                                                                                              |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M24 | Paymob `timingSafeEqual` lacks length guard                         | `payments.route.ts:130`                                        | low (claimed medium)          | Wrong-length hmac throws RangeError, caught → 400. Fails closed; sloppy.                                                                                          |
| M16 | Account lockout email-only keyed, no auto-unlock                    | `brute-force.ts:199-243`                                       | low (claimed medium, partial) | Real but overstated: 50 all-time threshold, reset on any successful login; distributed attacker needed.                                                           |
| M18 | Money math in floats                                                | `payments.route.ts:83-87,167,178`; `stripe.route.ts:62-66,125` | low (claimed medium)          | Real rounding drift, but these are internal bookkeeping fields, not the charged amount. Use integer minor units / Decimal128.                                     |
| M19 | `valuMonths` unchecked                                              | `payments.route.ts:176-178`; schema:37                         | low (claimed medium, partial) | Divide-by-zero **cannot** happen (truthy guard skips 0); negative/fractional **does** slip through → bad `monthlyAmount` (write-only field). Add `.int().min(1)`. |
| L25 | Register email enumeration (200 vs 201)                             | `auth.route.ts:591-645`                                        | low                           | Existing-email returns 200, new-user 201; also timing diff from Argon2id+create.                                                                                  |
| L26 | `ENCRYPTION_MASTER_KEY` validated as 64-hex but consumed as UTF-8   | `encryption.ts:23`; `env.ts`                                   | low (partial)                 | Works, but the on-disk key bytes ≠ documented hex spec → external-tool interop hazard.                                                                            |
| L27 | `isEncryptedString` is a shape heuristic                            | `encryption.ts:151-161`                                        | low (partial)                 | Plaintext shaped like `24hex:32hex:hex` is treated as ciphertext. Prefer a version/magic tag.                                                                     |
| L28 | Fawry reference no uniqueness check                                 | `payments.route.ts:91-95`                                      | low                           | 10 random digits, no DB uniqueness/regeneration → collisions possible.                                                                                            |
| L29 | Tenant payment create: no amount-vs-balance / patient-linkage check | `payment.service.ts:133-150`                                   | low                           | Records any positive amount; no check it ≤ balanceDue or that invoice belongs to patient.                                                                         |
| L30 | Commission `endDate` off-by-one drops final day                     | `commission.service.ts:55-59`                                  | low                           | `new Date(endDate)` is UTC midnight; should be end-of-day like appointments service.                                                                              |

---

## 🤔 Contested (1 of 2 skeptics refuted — confirm before acting)

### H12 — `create_follow_up` workflow action always throws — CONTESTED

- **Where:** `apps/api/src/jobs/workers/workflow.worker.ts:294-309` · `apps/api/src/tenant/models/appointment.model.ts`
- The model _would_ reject the `create()` (missing required `doctorId/branchId/date/endTime/createdBy`, invalid status `'scheduled'`). One skeptic argues the branch is **unreachable dead code** at runtime. **Action:** verify whether any workflow rule can actually emit a `create_follow_up` action.

### H13 — Refund endpoints don't call the provider — CONTESTED / PARTIALLY CONFIRMED

- **Where:** `apps/api/src/platform/routes/payments/payments.route.ts:384-405` · `apps/api/src/platform/routes/payments/stripe.route.ts:330-354`
- Both flip status to `refunded` and return success with the gateway call commented out; Paymob route also lacks a `provider !== 'paymob'` guard. **Correction:** the "not idempotent" label is **wrong** — both guard `status !== 'completed'`. The real defect is a refund **stub** that reports success without refunding. Lower priority while the gateway is un-integrated.

---

## ❌ Refuted / Overturned — NOT bugs (do not action)

| ID  | Original claim                                             | Why it's not a bug                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H7  | Webhook replay double-credits invoice                      | **Overturned (2/2 skeptics).** `recordOnlinePayment` is dead code with zero callers; webhooks only set `SaaSPayment.status='completed'`, which is idempotent at the document level. No double-credit path. (C1 forgery still stands; this _replay-double-credit_ claim does not.) |
| M15 | Brute-force key trusts `X-Forwarded-For`                   | **Refuted.** `trustProxy` is unset (default false), so `request.ip` ignores the header and the `\|\| x-forwarded-for` fallback is dead code. Not exploitable.                                                                                                                     |
| M20 | Cash reconciliation discrepancy off by expenses            | **Refuted.** The open-time `closingBalance` is a placeholder overwritten by the operator's actual counted cash before the discrepancy is computed. Formula is correct.                                                                                                            |
| L31 | `tenantDb.model('Patient')` can throw `MissingSchemaError` | **Refuted.** Two lines earlier `new AppointmentService(tenantDb)` calls `getPatientModel(tenantDb)`, which registers the schema. Cannot throw.                                                                                                                                    |

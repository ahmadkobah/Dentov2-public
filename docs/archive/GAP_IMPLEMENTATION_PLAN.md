# Gap Implementation Plan (v3 — Codebase-Verified)

**Based on:** [DEEP_SCAN_GAPS_REPORT.md v3](../Audit&Reoprt/APi&hooks/DEEP_SCAN_GAPS_REPORT.md)
**Created:** 2026-03-05
**Current Phase:** Phase 5 (Operational) — Phases 0–4 complete, Phase 6–7 not started
**Total Items:** 25 action items (2 P0, 8 P1, 9 P2, 6 P3)

---

## Overview

This plan organizes the 25 verified gaps into **6 implementation sprints** spanning ~6 weeks. Each sprint groups related work to minimize context-switching. Items are sequenced so that backend (API/models) work lands before frontend (admin/developer UI) work that depends on it.

### Effort Sizing

| Size | Description                                | Approx Time |
| ---- | ------------------------------------------ | ----------- |
| XS   | Config change, type fix, 1 file            | < 1 hour    |
| S    | 1–3 files, single endpoint or hook         | 1–4 hours   |
| M    | 4–10 files, full CRUD or module            | 4–8 hours   |
| L    | 10+ files, complex feature with tests      | 1–2 days    |
| XL   | Full module, multi-layer (API+admin+tests) | 2–4 days    |

---

## Sprint 1 — P0 Critical + Notification Stack (Week 1)

> **Goal:** Unblock core clinical workflow (Daily Ops chairs) and complete the notification system end-to-end.

### 1.1 🔴 Daily Ops Missing Endpoints (P0 #2)

**What:** 3 missing API endpoints for chair management in daily operations.

| Task                                   | File(s) to Create/Edit                                                                | Pattern to Follow                                                                                                                                     | Size |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `GET /chairs/availability`             | `tenant/routes/daily-ops/daily-ops.route.ts` (new) OR extend `walk-in-queue.route.ts` | Follow `walk-in-queue.route.ts` pattern. Query chairs by branchId, filter by `isOccupied`, join with current appointment.                             | S    |
| `PATCH /appointments/:id/arrive`       | `tenant/routes/appointments/appointments.route.ts`                                    | Add handler that sets `status: 'arrived'`, `arrivedAt: new Date()`. Emit `socketEmitter.queueUpdate(branchId, { type: 'appointment_arrived', ... })`. | S    |
| `PATCH /appointments/:id/assign-chair` | `tenant/routes/appointments/appointments.route.ts`                                    | Add handler with Zod body `{ chairId }`. Update appointment + chair occupancy. Emit `socketEmitter.queueUpdate()` with `chair_assigned`.              | S    |

**Schemas (add to `packages/shared/src/schemas/`):**

```typescript
// appointment.schema.ts — add:
export const arriveSchema = z.object({ appointmentId: z.string() }).strict();
export const assignChairSchema = z.object({ chairId: z.string() }).strict();
```

**Tests:** Unit test each endpoint (mock `tenantDb`, assert status codes + socket emission).

**DoD:** Endpoint + Zod schema + socket event + Swagger auto-docs.

---

### 1.2 🔴 Notification Template CRUD + Alert Rules API (P0 #1 + P1 #7)

**What:** API endpoints for notification template detail/update/delete and alert-rule CRUD. Models already exist (`NotificationTemplate`, `AlertRule` in `notification.model.ts`).

| Task                                 | File to Edit                                             | Details                                                                                    | Size |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---- |
| Template `GET /:id`                  | `notifications.route.ts`                                 | `createNotificationTemplateModel(db).findById(id)`. Return bilingual `{ en, ar }` content. | XS   |
| Template `PATCH /:id`                | `notifications.route.ts`                                 | Zod body with `.partial()` of create schema. `findByIdAndUpdate()`. Audit log.             | S    |
| Template `DELETE /:id`               | `notifications.route.ts`                                 | Soft delete (`isActive: false`) or hard delete based on existing convention.               | XS   |
| Notification log `GET /logs/:id`     | `notifications.route.ts`                                 | `createNotificationLogModel(db).findById(id).populate('notification template')`.           | XS   |
| Alert rule `POST /alert-rules`       | `notifications.route.ts` (or new `alert-rules.route.ts`) | Create alert rule. Zod schema for `{ name, condition, threshold, channels, recipients }`.  | S    |
| Alert rule `GET /alert-rules`        | same                                                     | List with pagination. Filter by `isActive`.                                                | S    |
| Alert rule `GET /alert-rules/:id`    | same                                                     | Detail with populate.                                                                      | XS   |
| Alert rule `PATCH /alert-rules/:id`  | same                                                     | Partial update.                                                                            | S    |
| Alert rule `DELETE /alert-rules/:id` | same                                                     | Soft delete.                                                                               | XS   |

**Total: 9 endpoints across 1–2 route files.**

**Schemas (add to `packages/shared/src/schemas/`):**

```typescript
// notification.schema.ts (new or extend existing)
export const createAlertRuleSchema = z.object({
  name: bilingualSchema,
  condition: z.enum(['low_stock', 'expiry_approaching', 'recall_due', 'payment_overdue', ...]),
  threshold: z.number().optional(),
  channels: z.array(z.enum(['email', 'sms', 'whatsapp', 'push', 'inApp'])),
  recipients: z.array(z.string()),
  isActive: z.boolean().default(true),
}).strict();
```

**DoD:** All 9 endpoints + Zod + Swagger + RBAC (`manager` or `admin` role).

---

### 1.3 🔴 Notification Template CRUD + Alert Rules Admin UI (P0 #1)

**What:** Admin hooks + pages for template management and alert rules.

| Task                      | File(s) to Create                                          | Pattern to Follow                                                                                                    | Size |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---- |
| Query key factory         | `features/notifications/hooks/useNotificationTemplates.ts` | Follow `notificationKeys` pattern in existing `useNotifications.ts`                                                  | XS   |
| `useTemplateDetail(id)`   | same file                                                  | `useQuery({ queryKey: templateKeys.detail(id), queryFn: ... })`                                                      | XS   |
| `useUpdateTemplate()`     | same file                                                  | `useMutation` + invalidate `templateKeys.lists()` + `toast.success()`                                                | XS   |
| `useDeleteTemplate()`     | same file                                                  | `useMutation` + invalidate + toast                                                                                   | XS   |
| Template list/detail page | `features/notifications/pages/TemplatesPage.tsx`           | Follow existing `NotificationsPage.tsx` — table/list + detail sheet                                                  | M    |
| Alert rules hooks file    | `features/notifications/hooks/useAlertRules.ts`            | 4 hooks: `useAlertRuleList`, `useAlertRuleDetail`, `useCreateAlertRule`, `useUpdateAlertRule` + `useDeleteAlertRule` | S    |
| Alert rules page          | `features/notifications/pages/AlertRulesPage.tsx`          | CRUD page with form dialog (RHF + Zod). Condition builder UI.                                                        | M    |

**Admin router:** Add routes for `/notifications/templates` and `/notifications/alert-rules` in sidebar config.

**DoD:** Hooks + pages + RTL/LTR + dark mode + loading/error/empty states + sidebar entry.

---

### Sprint 1 Summary

| Items Closed        | Endpoints Added | Hooks Added | Pages Added | Effort    |
| ------------------- | --------------- | ----------- | ----------- | --------- |
| P0 #1, P0 #2, P1 #7 | 12              | ~7          | 2           | ~3–4 days |

---

## Sprint 2 — P1 Admin Modules + Missing Models (Week 2)

> **Goal:** Complete the remaining P1 admin UI gaps and missing platform models.

### 2.1 🟠 Tenant Webhooks Admin UI (P1 #3)

**What:** The only fully missing admin module. API routes exist (`tenant/routes/webhooks/`), developer portal has `features/webhooks/` to reference.

| Task                      | File(s) to Create                                                | Details                                                                                                                                   | Size |
| ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Hooks file                | `admin/src/features/webhooks/hooks/useWebhooks.ts`               | 6 hooks: `useWebhookList`, `useWebhookDetail`, `useCreateWebhook`, `useUpdateWebhook`, `useDeleteWebhook`, `useTestWebhook` + key factory | M    |
| `WebhooksPage.tsx`        | `admin/src/features/webhooks/pages/WebhooksPage.tsx`             | List page with URL, events subscribed, status badge, last delivery info. Follow notifications page pattern.                               | M    |
| `WebhookDetailSheet.tsx`  | `admin/src/features/webhooks/components/WebhookDetailSheet.tsx`  | Sheet/dialog showing delivery logs, retry button, event selection.                                                                        | M    |
| `CreateWebhookDialog.tsx` | `admin/src/features/webhooks/components/CreateWebhookDialog.tsx` | RHF form: URL, secret (auto-generate), event multi-select, active toggle.                                                                 | M    |
| Router + sidebar          | `router.tsx` + `sidebar-config.ts`                               | Add `/webhooks` route + sidebar entry under "Settings" group.                                                                             | XS   |

**Reference:** Copy structure from `apps/developer/src/features/webhooks/` and adapt to tenant context (use `apiClient` with tenant slug, not platform API).

---

### 2.2 🟠 Dental Labs CRUD Admin UI (P1 #4)

**What:** Lab orders reference `dentalLabId` but no standalone lab management exists.

| Task             | File(s) to Create                                         | Details                                                                                                                                     | Size |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| API route        | `tenant/routes/dental-labs/dental-labs.route.ts` (new)    | CRUD: list, create, get, update, delete. Model: `{ name: bilingual, phone, email, address, specialties[], isActive }`.                      | M    |
| Model            | `tenant/models/dental-lab.model.ts` (new if not exists)   | Standard tenant model with factory function. Check if `dentalLabId` in lab-orders references an existing embedded schema or external model. | S    |
| Admin hooks      | `admin/src/features/dental-labs/hooks/useDentalLabs.ts`   | 4 hooks: list, create, update, delete + key factory                                                                                         | S    |
| Admin page       | `admin/src/features/dental-labs/pages/DentalLabsPage.tsx` | Simple CRUD list + create/edit dialog. Name (en/ar), contact info, specialties chips.                                                       | M    |
| Router + sidebar | `router.tsx` + `sidebar-config.ts`                        | Under "Clinical" or "Settings" group.                                                                                                       | XS   |

---

### 2.3 🟠 Missing Platform Models (P1 #9)

**What:** 4 platform models confirmed missing.

| Model                 | File to Create                                                           | Schema Fields                                                                                                                                                              | Size |
| --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `webhook_event_types` | `platform/models/webhook-event-type.model.ts`                            | `{ key, name: bilingual, description: bilingual, category, payloadSchema: Mixed, isActive }`. Currently hardcoded as constants — this makes them dynamic + admin-editable. | S    |
| `saas_dunning_log`    | `platform/models/dunning-log.model.ts`                                   | `{ tenantId, invoiceId, attempt, channel, sentAt, status, nextRetryAt, escalationLevel }`. Wire into `billing.service.ts` `sendDunningReminder()`.                         | S    |
| `languages`           | `platform/models/language.model.ts`                                      | `{ code, name: bilingual, direction: 'ltr'\|'rtl', isActive, isDefault }`. Replace hardcoded `'en'\|'ar'` enum.                                                            | S    |
| `tenant_languages`    | `platform/models/tenant-language.model.ts` (or embed in tenant settings) | `{ tenantId, languageCode, isDefault, translations: Map }`. Consider embedding in `Tenant.settings.languages[]` instead of separate collection.                            | S    |

**Decision needed:** `tenant_languages` could be a sub-document in `Tenant.settings` instead of a separate collection. The existing tenant model has a `settings` sub-schema that could hold this.

---

### 2.4 🟠 chat-push Worker (P1 #10)

**What:** Offline push notification for chat messages when user is not connected via Socket.io.

| Task                 | File to Create/Edit                | Details                                                                                                                                                           | Size |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Worker file          | `jobs/workers/chat-push.worker.ts` | On `chat:message` REST handler, check if recipient has active socket. If not, enqueue `chat-push` job. Worker sends push via `push.provider.ts` (VAPID web-push). | M    |
| Queue registration   | `jobs/queue.ts`                    | Add `CHAT_PUSH: 'chat-push'` to `QUEUE_NAMES`.                                                                                                                    | XS   |
| Wire into chat route | `chat.route.ts`                    | After `io.to(channel).emit('chat:message', ...)`, check socket room members. If recipient absent, add to `chat-push` queue.                                       | S    |

---

### Sprint 2 Summary

| Items Closed       | Endpoints Added       | Hooks Added | Pages Added | Models Added | Effort    |
| ------------------ | --------------------- | ----------- | ----------- | ------------ | --------- |
| P1 #3, #4, #9, #10 | ~5 (dental labs CRUD) | ~10         | 2           | 4–5          | ~4–5 days |

---

## Sprint 3 — P1 API Gaps (Week 3)

> **Goal:** Close all remaining P1 API-level gaps.

### 3.1 🟠 Recurring Appointments API Gaps (P1 #5)

**What:** 2 missing endpoints in recurring rules.

| Task                                     | File to Edit                                          | Details                                                                                                                                        | Size |
| ---------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `POST /recurring-rules/:id/regenerate`   | `recurring-rules.route.ts`                            | Delete future unbooked instances, re-run generation logic from `recurring-appointments.service.ts`. Use `generateInstances()` existing method. | M    |
| `PATCH /appointments/:id/recurring-edit` | `appointments.route.ts` OR `recurring-rules.route.ts` | Body: `{ mode: 'this'\|'this_and_following'\|'all', changes: {...} }`. Switch on mode to update single instance vs. modify rule + regenerate.  | M    |

**Schema:**

```typescript
export const recurringEditSchema = z
  .object({
    mode: z.enum(['this', 'this_and_following', 'all']),
    changes: z
      .object({
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        doctorId: z.string().optional(),
        branchId: z.string().optional(),
      })
      .strict(),
  })
  .strict();
```

---

### 3.2 🟠 Imaging Requirements API (P1 #6)

**What:** 2 missing endpoints for linking imaging requirements to services.

| Task           | File to Create                                                           | Details                                                                                                              | Size |
| -------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---- |
| Model          | `tenant/models/imaging-requirement.model.ts` (new)                       | `{ serviceId, imagingType: 'xray'\|'cbct', bodyRegion, isRequired, canWaive, waivedBy, waivedAt }`                   | S    |
| Route file     | `tenant/routes/imaging-requirements/imaging-requirements.route.ts` (new) | `GET /:serviceId` — list requirements for a service. `POST /:id/waive` — mark requirement as waived by current user. | S    |
| Register route | `tenant/routes/index.ts` or equivalent route registration                | Add prefix `/imaging-requirements`.                                                                                  | XS   |

---

### 3.3 🟠 Login History / IP Management API (P1 #8)

**What:** 4 dev portal admin endpoints for security management.

| Task                                 | File to Create/Edit                  | Details                                                                                                     | Size |
| ------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---- |
| `GET /admin/auth/login-history`      | `platform/routes/auth/auth.route.ts` | Query `UserSession` or `AuditLog` model filtered by `action: 'login'`. Paginated, sortable by date.         | S    |
| `GET /admin/auth/blocked-ips`        | `platform/routes/auth/auth.route.ts` | Query Redis `brute:*` keys OR new `BlockedIP` model. Return list of blocked IPs with block reason + expiry. | S    |
| `DELETE /admin/auth/ip-block/:ip`    | same                                 | Remove specific IP from rate-limit block list (Redis `DEL brute:{ip}`).                                     | XS   |
| `DELETE /admin/auth/cooldown/:email` | same                                 | Remove email-based cooldown (Redis key cleanup).                                                            | XS   |

**Decision needed:** Blocked IPs — use existing Redis brute-force keys, or create a persistent `BlockedIP` platform model? Redis is transient (restarts clear blocks). Recommend: query Redis for active blocks + new model for persistent admin-blocked IPs.

---

### Sprint 3 Summary

| Items Closed  | Endpoints Added | Models Added | Effort  |
| ------------- | --------------- | ------------ | ------- |
| P1 #5, #6, #8 | 8               | 1–2          | ~3 days |

---

## Sprint 4 — P2 Backend Polish (Week 4)

> **Goal:** Close all P2 backend items — socket handlers, webhook type-safety, cron, and scattered API endpoints.

### 4.1 🟡 Socket.io Chat Relay Handlers (P2 #12)

**What:** 4 typed C2S events with no handlers.

| Task                         | File to Edit       | Details                                                                                                                           | Size |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `chat:typing` handler        | `socket.plugin.ts` | On receive → broadcast `chat:typing` to channel room (excluding sender). Throttle: max 1 per 2s per user.                         | S    |
| `chat:read` handler          | `socket.plugin.ts` | On receive → call `ChatService.markAsRead()` (existing REST logic), broadcast `chat:read` to channel.                             | S    |
| `chat:send` handler          | `socket.plugin.ts` | On receive → call `ChatService.sendMessage()`, emit `chat:message` to channel. Alternative to REST `POST /channels/:id/messages`. | M    |
| `chat:join_channels` handler | `socket.plugin.ts` | On receive → join user to multiple channel rooms (`socket.join()`). Called on socket connect to subscribe to all user's channels. | S    |

**Note:** `chat:send` via socket is optional if all chat goes through REST. Consider if real-time typing → REST send → socket broadcast is the intended arch. If so, only implement `chat:typing`, `chat:read`, `chat:join_channels`, and mark `chat:send` as design-choice-skip.

---

### 4.2 🟡 Socket.io Missing Events (P2 #13)

| Event             | Decision                             | Implementation                                                                                                                                                                             | Size           |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `locale:changed`  | Add to types + emit on locale update | In `socket.types.ts` add to `ServerToClientEvents`. Emit from tenant settings `PATCH /settings` when `locale` changes.                                                                     | XS             |
| `calendar:update` | **Skip — already covered**           | Calendar updates already dispatched via `queue:update` sub-types (`appointment_created`, `appointment_updated`, etc.). Document this design decision rather than adding a redundant event. | XS (docs only) |

---

### 4.3 🟡 Webhook Event Type-Safety (P2 #14)

**What:** 37 dispatched events but only 33 typed. 4+ events use `as TenantWebhookEvent` casts.

| Task                                | File to Edit                   | Details                                                                                                                               | Size |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Audit all `dispatchWebhook()` calls | `grep -r "dispatchWebhook"`    | List every dispatched event string.                                                                                                   | —    |
| Add missing events to type union    | `@dento/shared` webhook types  | Add `commission.calculated`, `commission.approved`, `commission.payout_created`, `installment.*`, etc. to `TenantWebhookEvent` union. | S    |
| Add to Zod enum                     | `@dento/shared` webhook schema | Extend `webhookEventEnum` to include all 37 events.                                                                                   | XS   |
| Remove `as` casts                   | Each service file              | Replace `as TenantWebhookEvent` with the now-typed event string.                                                                      | S    |

---

### 4.4 🟡 Ramadan Mode Reminder Cron (P2 #15)

| Task                     | File to Create                                 | Details                                                                                                                                                                                                                                       | Size |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Cron file                | `jobs/crons/ramadan-reminder.cron.ts`          | Schedule: `0 9 * * *` during Sha'ban (month before Ramadan). Logic: check if current date is within N days of Ramadan start (use Hijri calendar library or hardcoded dates table). Send notification to tenant admins to enable Ramadan mode. | M    |
| Hijri date utility       | `utils/hijri.ts` or use `moment-hijri` package | Calculate Ramadan start/end for current year.                                                                                                                                                                                                 | S    |
| Wire into server startup | `server.ts`                                    | `startRamadanReminderCron()` + `startRamadanReminderWorker()`                                                                                                                                                                                 | XS   |

---

### 4.5 🟡 Scattered Missing API Endpoints (P2 #16, #17, #18)

| Endpoint                                          | File                                | Details                                                                                                                                                                                        | Size    |
| ------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `POST /schedules/staff/publish`                   | `schedules.route.ts`                | Publish draft schedule to staff (mark as published, send notifications).                                                                                                                       | S       |
| `POST /doctors`                                   | `doctors.route.ts` or document skip | Either: (a) Add endpoint that creates User + Doctor in one transaction, or (b) Document that doctors are created via `POST /users` with `role: 'doctor'` and a doctor profile is auto-created. | S or XS |
| `GET /templates/:id`, `PATCH /:id`, `DELETE /:id` | Already covered in Sprint 1.2       | —                                                                                                                                                                                              | —       |

---

### Sprint 4 Summary

| Items Closed | Socket Handlers | Type Fixes      | Cron | Endpoints | Effort    |
| ------------ | --------------- | --------------- | ---- | --------- | --------- |
| P2 #12–18    | 3–4             | 37 events typed | 1    | 2         | ~3–4 days |

---

## Sprint 5 — P2 Frontend + Dev Portal (Week 5)

> **Goal:** Complete P2 frontend items and developer portal gap.

### 5.1 🟡 Rate Limit Analytics Dashboard (P2 #11)

**What:** Dev portal has rate limit config in API keys and tenant settings, but no unified dashboard.

| Task             | File(s) to Create                                             | Details                                                                                                                                    | Size |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| API endpoint     | `platform/routes/analytics/rate-limits.route.ts` (new)        | `GET /analytics/rate-limits` — aggregate Redis rate-limit counters by tenant, endpoint, time window. Return top violators + overall stats. | M    |
| Dev portal hooks | `developer/src/features/rate-limits/hooks/useRateLimits.ts`   | `useRateLimitStats()`, `useRateLimitHistory()`                                                                                             | S    |
| Dev portal page  | `developer/src/features/rate-limits/pages/RateLimitsPage.tsx` | Dashboard with: current limits by plan, top rate-limited tenants, time-series chart (if charting lib available).                           | L    |
| Router + sidebar | dev portal `router.tsx` + sidebar config                      | Under "Monitoring" group.                                                                                                                  | XS   |

---

### 5.2 🟡 Mobile Push Provider — Expo/FCM (P2 #19)

**What:** Phase 7 dependency, but provider can be built now for web-to-mobile push.

| Task                           | File to Create                               | Details                                                                                                                                                           | Size |
| ------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Provider file                  | `services/providers/mobile-push.provider.ts` | Implement `sendMobilePush({ token, title, body, data })`. Support both Expo Push API (`expo-server-sdk`) and FCM v1 (`firebase-admin`). Auto-detect token format. | M    |
| Extend NotificationChannel     | `@dento/shared` types                        | Add `'mobilePush'` to `NotificationChannel` union. Or extend existing `'push'` to handle both web-push and mobile-push based on token type.                       | S    |
| Wire into notification service | `notification.service.ts`                    | In the push worker, check `DeviceToken.platform`. If `'web'` → existing VAPID. If `'ios'\|'android'` → new mobile provider.                                       | S    |

**Decision:** Implement now or defer to Phase 7? If deferred, add a TODO marker and skip. The model + type work costs little; the provider requires `expo-server-sdk` or `firebase-admin` dependencies.

---

### Sprint 5 Summary

| Items Closed | Endpoints Added | Hooks Added | Pages Added | Effort  |
| ------------ | --------------- | ----------- | ----------- | ------- |
| P2 #11, #19  | 1               | ~2          | 1           | ~3 days |

---

## Sprint 6 — P3 Deferred Items (Weeks 6+, as needed)

> **Goal:** Track long-term items. No fixed timeline — implement when business needs dictate.

### 6.1 🔵 cornerstone3D DICOM Viewer (P3 #20)

- **Scope:** Replace current image viewer with cornerstone3D for DICOM support
- **Dependencies:** `@cornerstonejs/core`, `@cornerstonejs/streaming-image-volume-loader`, `@cornerstonejs/tools`
- **Effort:** XL (2–4 days)
- **Trigger:** When clinics request DICOM import from imaging equipment

### 6.2 🔵 ClamAV Virus Scanning (P3 #21)

- **Scope:** Integrate ClamAV for uploaded file scanning
- **Implementation:** Add `clamav` Docker service, scan files in upload middleware before S3 upload
- **Effort:** M (4–8 hours)
- **Trigger:** Security audit or compliance requirement

### 6.3 🔵 Security Anomaly Detection (P3 #22)

- **Scope:** ML-based or rule-based detection of suspicious access patterns
- **Implementation:** Track login IP/time/device changes. Alert on anomalies (new device, impossible travel, off-hours access).
- **Effort:** L (1–2 days for rule-based, XL for ML)
- **Trigger:** HIPAA compliance audit

### 6.4 🔵 Tenant-Level Patient Checkout (P3 #23)

- **Scope:** Patient-facing payment page for invoice settlement
- **Dependencies:** Stripe Checkout or Paymob iframe per-tenant configuration
- **Effort:** XL (multi-layer: API + patient portal or link-based checkout)
- **Trigger:** Clinic requests for online patient payments

### 6.5 🔵 Disaster Recovery Automation (P3 #24)

- **Scope:** Full DR automation beyond backup-restore-test
- **Implementation:** Multi-region replica sets, automated failover, RTO/RPO monitoring
- **Effort:** XL (infrastructure + monitoring)
- **Trigger:** Production deployment at scale

### 6.6 🔵 Barcode Scanning (P3 #25)

- **Scope:** React Native camera-based barcode scanning for inventory
- **Dependencies:** Phase 7 (Mobile App)
- **Effort:** M
- **Trigger:** Phase 7 kickoff

---

## Cross-Cutting Concerns (Apply to Every Sprint)

### Testing Strategy

| Layer         | Tool                                   | Coverage Target                                                   |
| ------------- | -------------------------------------- | ----------------------------------------------------------------- |
| API endpoints | Vitest + Supertest (or Fastify inject) | Every new endpoint gets at least 1 happy-path + 1 error-path test |
| Admin hooks   | Vitest + `@testing-library/react`      | Query hooks: mock `apiClient`, assert queryKey + loading states   |
| Admin pages   | Vitest + RTL                           | Render test + interaction test for CRUD flows                     |
| Workers/Crons | Vitest                                 | Mock DB + Redis, assert job processing logic                      |

### Conventions Checklist (per Definition of Done)

- [ ] Zod schema in `packages/shared` with `.strict()`
- [ ] API endpoint with proper HTTP method + status codes
- [ ] `apiResponse()` / `apiError()` for all responses
- [ ] RBAC decorators (`requireRole('admin')` or equivalent)
- [ ] Admin UI: loading, error, empty states
- [ ] RTL/LTR support (bilingual `{ en, ar }` for user-facing text)
- [ ] Dark mode (`dark:` Tailwind classes)
- [ ] Responsive layout
- [ ] Audit log entry for mutations
- [ ] Toast feedback (`toast.success()` / `toast.error()`)
- [ ] Rate limiting on public endpoints
- [ ] PII encryption if applicable
- [ ] Swagger auto-docs (via Zod → JSON Schema)
- [ ] No `any` / `@ts-ignore`
- [ ] ESLint 0 errors, tsc 0 errors

### File Naming Conventions

| Area            | Pattern                                                  | Example                            |
| --------------- | -------------------------------------------------------- | ---------------------------------- |
| Tenant route    | `tenant/routes/{module}/{module}.route.ts`               | `dental-labs/dental-labs.route.ts` |
| Tenant model    | `tenant/models/{entity}.model.ts`                        | `dental-lab.model.ts`              |
| Platform model  | `platform/models/{entity}.model.ts`                      | `language.model.ts`                |
| Admin hooks     | `admin/src/features/{module}/hooks/use{Module}.ts`       | `useWebhooks.ts`                   |
| Admin page      | `admin/src/features/{module}/pages/{Module}Page.tsx`     | `WebhooksPage.tsx`                 |
| Admin component | `admin/src/features/{module}/components/{Component}.tsx` | `CreateWebhookDialog.tsx`          |
| Worker          | `jobs/workers/{name}.worker.ts`                          | `chat-push.worker.ts`              |
| Cron            | `jobs/crons/{name}.cron.ts`                              | `ramadan-reminder.cron.ts`         |
| Shared schema   | `packages/shared/src/schemas/{entity}.schema.ts`         | `notification.schema.ts`           |

---

## Timeline Summary

| Sprint | Week | Focus                       | Items   | Key Deliverables                                                     |
| ------ | ---- | --------------------------- | ------- | -------------------------------------------------------------------- |
| **1**  | 1    | P0 Critical + Notifications | 3 items | 12 API endpoints, 7 hooks, 2 admin pages                             |
| **2**  | 2    | P1 Admin Modules + Models   | 4 items | Webhooks UI, Dental Labs UI+API, 4 platform models, chat-push worker |
| **3**  | 3    | P1 API Gaps                 | 3 items | Recurring, imaging requirements, login history — 8 endpoints         |
| **4**  | 4    | P2 Backend Polish           | 7 items | Socket handlers, webhook types, Ramadan cron, 2 endpoints            |
| **5**  | 5    | P2 Frontend + Provider      | 2 items | Rate limit dashboard, mobile push provider                           |
| **6**  | 6+   | P3 Deferred                 | 6 items | As needed — DICOM, ClamAV, anomaly detection, etc.                   |

**Total (Sprints 1–5):** ~19 P0–P2 items, ~30 API endpoints, ~20 hooks, 5 admin pages, 4–5 models, 2 workers, 1 cron

**Estimated total effort:** ~16–20 working days (Sprints 1–5)

---

## Dependencies & Risks

| Risk                                                  | Mitigation                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Alert-rule condition builder UI complexity            | Start with simple dropdown-based UI, iterate to visual builder later                                             |
| `tenant_languages` as separate collection vs embedded | Tech spike: check if other services query languages independently. If only via tenant settings, embed.           |
| Mobile push provider needs Phase 7 context            | Build provider interface now, defer SDK integration to Phase 7. Use feature flag.                                |
| Blocked IP management — Redis vs persistent           | Implement both: Redis for rate-limiter blocks (auto-expire), model for admin-managed permanent blocks            |
| Ramadan date calculation                              | Use well-tested `moment-hijri` or maintain a static lookup table (Ramadan dates are predictable ~10 years ahead) |

---

> **Next step:** Start Sprint 1 — Daily Ops endpoints + Notification template/alert-rules full stack.

# Phase 2 (Weeks 5–7) Gap Requirements — Structured Extraction

> **Generated from:** DENTO_V2_MASTER_PLAN.md, IMPLEMENTATION_ROADMAP.md, TECH_REQUIREMENTS.md, SECURITY_AND_ENCRYPTION.md, BUILD_RULES.md, V2_STRUCTURE.md, V2_DECISION_LOG.md, V2_DATABASE.md, ADMIN_PORTAL_SCREENS.md
> **Purpose:** Exact spec requirements, section references, and implementation details for each Phase 2 gap area.

---

## Gap 1: Notification Providers & Channel Integration

### Spec Requirements

**MASTER_PLAN §20 — Notifications & Messaging System:**

> "Drei Ebenen: (1) In-App Notifications — Echtzeit via Socket.io, Bell-Dropdown + Notification Center; (2) External Messaging — WhatsApp, Email, SMS über BullMQ Workers; (3) Push Notifications — Web Push (Service Worker) + Mobile Push (Expo Notifications)"

**TECH_REQUIREMENTS §3 — Backend Dependencies (exact pinned versions):**

| Provider Package | Version           | Purpose                       |
| ---------------- | ----------------- | ----------------------------- |
| `resend`         | Latest            | Transactional email           |
| `nodemailer`     | 6.x               | SMTP fallback                 |
| `twilio`         | 5.x               | SMS                           |
| `web-push`       | 3.x               | VAPID Web Push                |
| WhatsApp         | Meta Business API | Optional via Twilio or direct |

**MASTER_PLAN §20 — External Provider Table:**

| Channel       | Provider                      | Cost                                  | Fallback        |
| ------------- | ----------------------------- | ------------------------------------- | --------------- |
| Email         | Resend                        | Free Tier: 3000/mo, then $0.001/email | Nodemailer SMTP |
| SMS           | Twilio                        | ~$0.0075/SMS (Egypt)                  | —               |
| WhatsApp      | Meta Business API             | Free: 1000/mo, then ~$0.05/msg        | —               |
| Push (Web)    | Web Push API (VAPID)          | Free                                  | —               |
| Push (Mobile) | Expo Notifications → FCM/APNs | Free                                  | —               |

### Implementation Details

**4 Dedicated BullMQ Queues** (MASTER_PLAN §20):

```typescript
const emailQueue = new Queue('notification:email', { connection: redis });
const smsQueue = new Queue('notification:sms', { connection: redis });
const whatsappQueue = new Queue('notification:whatsapp', { connection: redis });
const pushQueue = new Queue('notification:push', { connection: redis });
```

**Worker Configuration** (MASTER_PLAN §20):

- Concurrency: 5 parallel emails
- Rate Limiter: max 50/minute
- Retry: max 3x with exponential backoff (BullMQ auto-retry)
- On final failure: update `notification_logs` status to `failed`

**V2_STRUCTURE — Worker Files:**

- `apps/api/src/jobs/workers/email.worker.ts`
- `apps/api/src/jobs/workers/sms.worker.ts`
- `apps/api/src/jobs/workers/push.worker.ts`
- `apps/api/src/jobs/workers/whatsapp.worker.ts`

**Notification Flow** (MASTER_PLAN §20):

1. Event triggers Notification Service (Fastify Hook `afterCreate`/`afterUpdate` OR BullMQ Event)
2. Load template from `notification_templates` (key matching)
3. Determine recipients (Patient? Doctor? Admin? All receptionists?)
4. Check preferences (`notification_preferences` → channel + category)
5. Check quiet hours (do not send if user in quiet period)
6. Replace variables (patient_name, date, time, etc.)
7. Create jobs (one BullMQ job per channel)

**In-App via Socket.io** (MASTER_PLAN §20):

```typescript
async function sendInAppNotification(userId: string, notification: InAppNotification) {
  // 1. MongoDB Insert into `notifications` collection
  // 2. Socket.io broadcast: io.to(`user:${userId}`).emit('notification:new', {...})
}
```

### Database Collections (V2_DATABASE §10.3 + MASTER_PLAN §20)

- `notification_templates` — per-event templates with bilingual EN/AR per channel
- `notifications` — in-app notifications (userId, isRead, category, actionUrl)
- `notification_logs` — delivery protocol (status, providerMessageId, retryCount)
- `notification_preferences` — per user/patient: channels × categories + quiet hours + digest
- `device_tokens` — push tokens (userId, platform: web|ios|android, token)

### Seed Templates (16 at tenant creation — MASTER_PLAN §20)

`appointment_reminder_24h`, `appointment_reminder_2h`, `appointment_confirmed`, `appointment_cancelled`, `appointment_no_show`, `appointment_rescheduled`, `payment_receipt`, `payment_reminder`, `payment_overdue`, `recall_reminder`, `stock_low_alert`, `stock_expired_alert`, `walk_in_arrived`, `treatment_plan_ready`, `prescription_ready`, `welcome_new_patient`

---

## Gap 2: Report Export (PDF / CSV / Excel)

### Spec Requirements

**MASTER_PLAN §21 — Reports & Analytics System — Export-System:**

| Format | Library               | Usage                                                     |
| ------ | --------------------- | --------------------------------------------------------- |
| CSV    | `@fast-csv/format`    | Tabular data, fast, small                                 |
| Excel  | `exceljs`             | Multi-sheet, formatting, formulas, charts                 |
| PDF    | `@react-pdf/renderer` | React components → PDF (server-side, no Puppeteer needed) |

**TECH_REQUIREMENTS §5 — Admin Frontend Dependencies:**

> `@react-pdf/renderer` (PDF), `@fast-csv/format` (CSV), `exceljs` (Excel)

### Export Flow (MASTER_PLAN §21)

```
POST /api/reports/export
Body: { reportType, params, format }
─────────────────────────────────────
1. Run Aggregation Pipeline (same as UI)
2. Switch format:
   csv   → @fast-csv/format → Stream Response
   excel → exceljs Workbook → Stream Response
   pdf   → @react-pdf/renderer → Buffer → Stream
3. Response Headers:
   Content-Disposition: attachment; filename=...
   Content-Type: application/octet-stream
```

### API Endpoint (MASTER_PLAN §21)

| Method | Route                 | Module             | Description                   |
| ------ | --------------------- | ------------------ | ----------------------------- |
| POST   | `/api/reports/export` | Advanced Analytics | Export report (PDF/CSV/Excel) |

All report endpoints also accept `format` query parameter: `json` (default) | `csv` | `excel` | `pdf`

### V2_STRUCTURE — Frontend Component

- `apps/admin/src/features/reports/components/ExportButtons.tsx`

### Report Categories (MASTER_PLAN §21)

- 7 Financial Reports (F1–F7)
- 5 Patient Reports (P1–P5)
- 6 Appointment Reports (A1–A6)
- 4 Clinical Reports (C1–C4)
- 4 Operational Reports (O1–O4)
- 10 Inventory Reports (defined in §16)
- **Total: 36 reports**, all exportable

---

## Gap 3: Report Scheduler — BullMQ Cron

### Spec Requirements

**MASTER_PLAN §21 — Scheduled & Saved Reports (BullMQ):**

**`report_schedules` Collection** (V2_DATABASE §11.5):

```typescript
{
  _id: ObjectId,
  name: String,
  reportType: String,          // 'financial.revenue_summary' | 'patient.no_show' | ...
  reportParams: {              // Saved filters
    period: 'monthly',
    branchId: ObjectId | null,
    doctorId: ObjectId | null,
    dateRange: { from: Date, to: Date } | null  // null = rolling (last month)
  },
  frequency: String,           // 'daily' | 'weekly' | 'monthly'
  dayOfWeek: Number | null,    // 0=Sun..6=Sat (for weekly)
  dayOfMonth: Number | null,   // 1-28 (for monthly)
  time: String,                // '08:00' (UTC)
  timezone: String,            // 'Africa/Cairo'
  deliveryMethod: String,      // 'email' | 'in_app' | 'both'
  recipients: [ObjectId],      // User IDs
  emailAddresses: [String],    // External emails (accountant etc.)
  format: String,              // 'pdf' | 'csv' | 'excel'
  isActive: Boolean,
  lastRunAt: Date | null,
  nextRunAt: Date,
}
```

### BullMQ Worker Architecture (MASTER_PLAN §21)

```
BullMQ Cron Job: report-scheduler (daily 00:05)
├─ 1. Find all report_schedules WHERE nextRunAt ≤ NOW AND isActive = true
├─ 2. For each: add Job to Queue 'report-generation'
└─ 3. Update nextRunAt based on frequency

Worker: report-generation
├─ 1. useDb(tenantDbName)
├─ 2. Run Aggregation Pipeline
├─ 3. Generate PDF/CSV/Excel
├─ 4. Upload to S3/R2
├─ 5. Deliver: Email → Resend / In-App → Notification
└─ 6. Log in report_history
```

### V2_STRUCTURE — Worker/Cron Files

- `apps/api/src/jobs/workers/report.worker.ts`
- `apps/api/src/jobs/crons/` (scheduler cron)

### API Endpoints (MASTER_PLAN §21)

| Method | Route                            | Description              |
| ------ | -------------------------------- | ------------------------ |
| GET    | `/api/reports/scheduled`         | List scheduled reports   |
| POST   | `/api/reports/scheduled`         | Create new schedule      |
| PATCH  | `/api/reports/scheduled/:id`     | Edit schedule            |
| DELETE | `/api/reports/scheduled/:id`     | Delete schedule          |
| POST   | `/api/reports/scheduled/:id/run` | Run schedule immediately |

---

## Gap 4: Socket.io Event Emission from Service Mutations

### Spec Requirements

**V2_DECISION_LOG §30 — Socket.io Redis Adapter (Multi-Instance):**

**Server Configuration:**

```typescript
const io = new Server(httpServer, {
  cors: { origin: [process.env.ADMIN_URL!, process.env.DEVELOPER_URL!], credentials: true },
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ['websocket'], // Skip HTTP long-polling
});

// Redis Adapter for cross-instance messaging (production only)
if (process.env.NODE_ENV === 'production') {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
}
```

**BUILD_RULES §2.4:** `socket.io` 4.x + `@socket.io/redis-adapter` pinned.

**SECURITY_AND_ENCRYPTION §12:** Socket.io tenant-scoped rooms `tenant:{slug}`, WSS (TLS 1.3).

### Room Architecture (V2_DECISION_LOG §30)

| Room Name                          | Purpose                          | Who Joins           |
| ---------------------------------- | -------------------------------- | ------------------- |
| `user:{userId}`                    | Personal notifications           | One user            |
| `tenant:{tenantSlug}`              | Tenant-wide (queue updates)      | All staff of tenant |
| `chat:{channelId}`                 | Chat channel                     | Channel members     |
| `calendar:{tenantSlug}:{branchId}` | Appointment changes (per branch) | Branch staff        |

**MASTER_PLAN §18** also defines: `branch:{branchId}:daily-ops` room for queue/chair events.

### Event Types — Server → Client (V2_DECISION_LOG §30, shared types)

```typescript
// packages/shared/src/types/socket-events.ts
export interface ServerToClientEvents {
  'notification:new': (data: { id; title; body; type }) => void;
  'appointment:created': (data: { appointmentId; patientName; time }) => void;
  'appointment:updated': (data: { appointmentId; changes }) => void;
  'appointment:cancelled': (data: { appointmentId }) => void;
  'queue:updated': (data: { branchId; queue: QueueEntry[] }) => void;
  'chat:message': (data: { channelId; message: ChatMessage }) => void;
  'chat:typing': (data: { channelId; userId; isTyping }) => void;
  'user:online': (data: { userId }) => void;
  'user:offline': (data: { userId }) => void;
}
```

**MASTER_PLAN §18 — Daily Ops Socket Events:**

```typescript
socket.to(`branch:${branchId}:daily-ops`).emit('queue:update', {
  type: 'walk_in_status_changed' | 'appointment_arrived' | 'chair_assigned' | 'chair_freed',
  data: { ... }
});
```

Events emitted: `walk_in_created`, `walk_in_status_changed`, `appointment_arrived`, `appointment_no_show`, `chair_assigned`, `chair_freed`, `queue_stats_updated`

### Auth Middleware (V2_DECISION_LOG §30)

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.userId;
    socket.data.tenantSlug = payload.tenantSlug;
    socket.data.role = payload.role;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
});
```

### V2_STRUCTURE — Socket Handler Files

- `apps/api/src/tenant/socket/index.ts`
- `apps/api/src/tenant/socket/chat.handler.ts`
- `apps/api/src/tenant/socket/notification.handler.ts`
- `apps/api/src/tenant/socket/queue.handler.ts`
- `apps/api/src/tenant/socket/calendar.handler.ts`

### Scaling (V2_DECISION_LOG §30)

| Instances  | Adapter                         | Behavior                                                |
| ---------- | ------------------------------- | ------------------------------------------------------- |
| 1 (launch) | In-memory (default)             | All clients on same process                             |
| 2–4        | Redis Adapter                   | `io.to('user:123').emit()` reaches user on ANY instance |
| 5+         | Redis Adapter + sticky sessions | `sessionAffinity: true` in Railway                      |

---

## Gap 5: FullCalendar Integration

### Spec Requirements

**TECH_REQUIREMENTS §5 — Admin Frontend Dependencies:**

| Package                     | Version |
| --------------------------- | ------- |
| `@fullcalendar/react`       | 6.x     |
| `@fullcalendar/daygrid`     | 6.x     |
| `@fullcalendar/timegrid`    | 6.x     |
| `@fullcalendar/interaction` | 6.x     |
| `@fullcalendar/list`        | 6.x     |

**BUILD_RULES §2.4 / V2_DECISION_LOG §26:** Free MIT edition only, **no Pro license**. Chair timeline view = custom CSS Grid component (~200 lines) as workaround for Pro's Resource view.

### Implementation (ADMIN_PORTAL_SCREENS §4)

```tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

function AppointmentCalendar() {
  const { direction, language } = useLocale();
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin]}
      initialView="timeGridWeek"
      direction={direction} // 'rtl' | 'ltr' — native support
      locale={language} // 'ar' | 'en' — auto-translates labels
      headerToolbar={{
        start: 'prev,next today', // RTL-aware
        center: 'title',
        end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
      }}
      slotMinTime="08:00:00"
      slotMaxTime="20:00:00"
      events={appointments}
      eventClick={handleEventClick}
      selectable={true}
      select={handleSlotSelect} // Opens new appointment dialog
    />
  );
}
```

### Calendar Views Required

| View           | Plugin                                     | Purpose                           |
| -------------- | ------------------------------------------ | --------------------------------- |
| Month          | `@fullcalendar/daygrid` `dayGridMonth`     | Monthly overview                  |
| Week           | `@fullcalendar/timegrid` `timeGridWeek`    | Default view — time slots per day |
| Day            | `@fullcalendar/timegrid` `timeGridDay`     | Single day with time slots        |
| List           | `@fullcalendar/list` `listWeek`            | Agenda list view                  |
| Chair Timeline | **Custom CSS Grid** (NOT FullCalendar Pro) | Chair × Time resource view        |

### Recurring Appointment Badge (MASTER_PLAN §19)

> "Recurring Termine haben ein 🔄-Icon (oder Repeat-Badge). Tooltip zeigt: 'Part of series (3/12) — Weekly Ortho Follow-Up'. Klick → öffnet Appointment Detail mit 'View Series' Button. Drag & Drop verschiebt nur DIESE Occurrence (isModified = true)"

### V2_STRUCTURE — Frontend Location

- `apps/admin/src/features/appointments/` — calendar component lives here

---

## Gap 6: Lab Order Types (14 Seed + Custom CRUD)

### Spec Requirements

**MASTER_PLAN §10 #13 — Lab Orders — `lab_order_types` Collection:**

> "v1 hatte eine `lab_order_types`-Tabelle mit 14 vordefinierten Typen (Crown, Bridge, Denture, etc.). In v2 wird dies als Tenant-eigene Lookup-Collection umgesetzt."

### Collection Schema (MASTER_PLAN §10 + V2_DATABASE §5.14)

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  category: String,                 // enum: crown|bridge|denture|guard|retainer|
                                    //       implant|veneer|inlay|onlay|other
  defaultTurnaroundDays: Number,
  isActive: Boolean,
  isCustom: Boolean,                // false = Seed, true = tenant-created
  sortOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
// Index: { 'name.en': 1 } unique
// Index: { category: 1, isActive: 1 }
```

### 14 Seed Types (MASTER_PLAN §10)

| #   | nameEn               | nameAr         | category | turnaroundDays |
| --- | -------------------- | -------------- | -------- | -------------- |
| 1   | Crown (PFM)          | تاج معدني خزفي | crown    | 7              |
| 2   | Crown (Zirconia)     | تاج زركونيا    | crown    | 7              |
| 3   | Crown (E-Max)        | تاج إي ماكس    | crown    | 7              |
| 4   | Bridge (3-unit)      | جسر ثلاثي      | bridge   | 10             |
| 5   | Bridge (4+ unit)     | جسر رباعي+     | bridge   | 12             |
| 6   | Full Denture (Upper) | طقم كامل علوي  | denture  | 14             |
| 7   | Full Denture (Lower) | طقم كامل سفلي  | denture  | 14             |
| 8   | Partial Denture      | طقم جزئي       | denture  | 10             |
| 9   | Night Guard          | واقي ليلي      | guard    | 7              |
| 10  | Retainer (Hawley)    | مثبت هاولي     | retainer | 5              |
| 11  | Retainer (Clear)     | مثبت شفاف      | retainer | 5              |
| 12  | Implant Abutment     | دعامة زرع      | implant  | 10             |
| 13  | Veneer (Porcelain)   | قشرة خزفية     | veneer   | 7              |
| 14  | Inlay/Onlay          | حشوة مخبرية    | inlay    | 7              |

### UI Integration (MASTER_PLAN §10)

> - **LabOrderForm:** Dropdown/Autocomplete for `labOrderType` — selects from `lab_order_types`
> - **LabOrderList:** Shows type name (EN/AR based on tenant language) + category badge
> - **Turnaround-Tracking:** `defaultTurnaroundDays` pre-fills `expectedDeliveryDate` on creation
> - **Custom Types:** Tenant-admin can add own types (`isCustom=true`)
> - **Settings Page:** Lab Order Types under Settings → Lab → Order Types (CRUD)

> **Important:** `lab_orders` collection gets a `labOrderTypeId: ObjectId` field (reference to `lab_order_types`). When creating a lab order, the type is selected and `expectedDeliveryDate` is calculated from `defaultTurnaroundDays`.

### IMPLEMENTATION_ROADMAP — Week 7:

> "Lab Order Types (Seed 14 types + Custom Types CRUD in Settings, §10 #13)"

---

## Gap 7: Webhook Event Dispatch

### Spec Requirements

**MASTER_PLAN §23 — Webhook System (Zwei Ebenen):**

**Two levels:**

1. **Platform-Webhooks** (Dev Portal) — events: `tenant.created`, `tenant.suspended`, `subscription.paid`, `subscription.overdue`, `module.updated`, `deployment.completed`, `system.error`, `system.health_degraded`
2. **Tenant-Webhooks** (Admin Portal) — events: `patient.created/updated/deleted`, `appointment.created/cancelled/completed/reminder/no_show`, `invoice.created/paid/overdue`, etc.

**BUILD_RULES §23 — Webhook Standards:**

Webhook Envelope (all events):

```typescript
interface WebhookPayload {
  id: string; // UUID v4
  type: string; // "patient.created", "appointment.booked", etc.
  tenantSlug: string;
  apiVersion: '2026-03-01';
  createdAt: string; // ISO 8601
  data: Record<string, unknown>;
}
```

Webhook Headers:

```
X-Webhook-Id: <event id>
X-Webhook-Signature: sha256=<HMAC-SHA256 of body using tenant's webhook secret>
X-Webhook-Timestamp: <unix seconds>
Content-Type: application/json
```

Signature: `HMAC-SHA256(webhookSecret, ${timestamp}.${body})` — reject if mismatch OR timestamp > 5 minutes old (replay protection).

**SECURITY_AND_ENCRYPTION §6.3:**

> `createHmac('sha256', secret).update(payload).digest('hex')`, Header: `X-Dento-Signature: sha256=<hmac>`, `X-Dento-Timestamp: <unix_epoch>`, max 5-min replay window

### 24 Event Catalog (BUILD_RULES §23.4 + V2_DECISION_LOG §3)

| Category      | Events                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Patient       | `patient.created`, `patient.updated`, `patient.deleted`                                                                |
| Appointment   | `appointment.booked`, `appointment.confirmed`, `appointment.cancelled`, `appointment.completed`, `appointment.no_show` |
| Treatment     | `treatment_plan.created`, `treatment_plan.accepted`                                                                    |
| Financial     | `invoice.issued`, `invoice.paid`, `payment.received`                                                                   |
| Clinical      | `prescription.created`, `lab_order.created`, `lab_order.status_changed`, `xray.uploaded`                               |
| Inventory     | `inventory.low_stock`, `inventory.expired`                                                                             |
| HR            | `leave.requested`, `leave.approved`                                                                                    |
| Communication | `chat.message`                                                                                                         |
| Users         | `user.created`, `user.deactivated`                                                                                     |

**Additional events from §18 (Walk-in) and §19 (Recurring):** `walk_in.created`, `walk_in.called`, `walk_in.in_chair`, `walk_in.completed`, `walk_in.converted`, `appointment.arrived`, `appointment.in_chair`, `appointment.visit_completed`, `chair.assigned`, `chair.freed`, `queue.stats_updated`, `recurring_rule.created/updated/paused/resumed/cancelled/completed`, `recurring_occurrence.generated/skipped/modified`

### PII Redaction (BUILD_RULES §23.5)

| Field        | Masking                     | Example            |
| ------------ | --------------------------- | ------------------ |
| `phone`      | First 3 + last 4            | `"+20***1234"`     |
| `email`      | First char + `***` + domain | `"a***@gmail.com"` |
| `nationalId` | Completely hidden           | `"***"`            |

### Delivery Rules (BUILD_RULES §23.6)

- **Retry:** 3 attempts with exponential backoff (5s, 30s, 5min)
- **Timeout:** 10 seconds per delivery attempt
- **Failure logging:** Log at `error` level with requestId
- **Auto-disable:** After 10 consecutive failures
- **Secret rotation:** Manual by tenant. Old secret has 1-hour grace period

### Trigger Pattern (MASTER_PLAN §3)

```
afterCreate:patient    → triggerWebhook('patient.created')
afterCreate:appointment→ triggerWebhook + sendReminder
afterUpdate:invoice    → triggerWebhook if status=paid
```

### Database Collections (V2_DATABASE §4.7)

- `webhooks` — (tenantId, url, secret, events[], status, retryEnabled, maxRetries)
- `webhook_logs` — (webhookId, eventType, requestBody, responseStatus, status, attemptNumber, nextRetryAt) — TTL: 30 days
- `webhook_event_types` — (eventName, category, payloadSchema, examplePayload)

### V2_STRUCTURE — Files

- `apps/api/src/tenant/services/webhook-dispatcher.ts` (HMAC Signing + Retry Logic)
- `apps/api/src/jobs/workers/webhook.worker.ts`

### Admin UI (MASTER_PLAN §10 — Webhook Module)

| Feature        | Description                                           |
| -------------- | ----------------------------------------------------- |
| Webhook List   | Tenant sees own webhooks                              |
| Create Webhook | URL, select events, secret auto-generated             |
| Test Send      | Test payload to URL                                   |
| View Logs      | Delivery protocol per webhook                         |
| Event Catalog  | Available events (patient, appointment, device, etc.) |

---

## Gap 8: Walk-in Queue Collection & Daily Operations Hub

### Spec Requirements

**MASTER_PLAN §18 — Walk-in Queue & Daily Operations Hub:**

> "Eine einzige Seite für den gesamten Tagesbetrieb: Alle heutigen Termine (scheduled, confirmed, arrived, in_chair, completed, no_show), Alle Walk-in-Patienten (mit Queue-Nummer), Warteraum-Übersicht (wer wartet, wie lange), Chair-Belegung (welcher Stuhl ist frei/belegt)"

### MongoDB Collections (MASTER_PLAN §18 + V2_DATABASE §6.4)

**`walk_in_queue`** (Tenant-DB):

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,
  queueNumber: Number,           // Auto-generated per branch/day
  date: "2026-03-15",            // ISO date (for counter reset)
  patientId: ObjectId | null,    // null for first-time walk-in
  patientName: String,
  phone: String | null,
  reason: String | null,
  priority: "low" | "normal" | "high" | "emergency",
  chiefComplaint: String | null,
  assignedDoctorId: ObjectId | null,
  chairId: ObjectId | null,
  status: "waiting" | "called" | "in_chair" | "completed" | "cancelled" | "no_show",
  checkInAt: Date,
  calledAt: Date | null,
  inChairAt: Date | null,
  completedAt: Date | null,
  cancelledAt: Date | null,
  estimatedWaitMinutes: Number | null,
  actualWaitMinutes: Number | null,
  convertedToAppointmentId: ObjectId | null,
  convertedAt: Date | null,
  notes: String | null,
  createdBy: ObjectId,
  tenantId: String,
}
// Indexes:
// { branchId: 1, date: 1, status: 1 }
// { branchId: 1, date: 1, queueNumber: 1 } unique
// { patientId: 1, date: 1 }
// { status: 1, priority: -1, checkInAt: 1 }
```

**`queue_counters`** (Tenant-DB):

```typescript
{
  branchId: ObjectId,
  date: "2026-03-15",
  lastNumber: Number,      // Atomic counter via findOneAndUpdate + $inc
}
// Unique Index: { branchId: 1, date: 1 }
```

**`chairs`** (Tenant-DB):

```typescript
{
  branchId: ObjectId,
  name: { en: String, ar: String },
  chairNumber: Number,
  chairType: "standard" | "pediatric" | "surgery" | "hygiene",
  floor: String | null,
  isActive: Boolean,
}
// Index: { branchId: 1, isActive: 1, chairNumber: 1 }
```

**Appointments Collection — New Fields** (MASTER_PLAN §18):

- `arrivedAt: Date | null`
- `arrivalStatus: "pending" | "arrived" | "no_show" | "late"`
- `queueNumber: Number | null`
- `chairId: ObjectId | null`
- `queueStatus: "waiting" | "called" | "in_chair" | "completed"`
- `calledAt: Date | null`
- `inChairAt: Date | null`
- `completedAt: Date | null`
- `noShowAt: Date | null`
- `noShowReason: String | null`
- `noShowNotified: Boolean`

### Patient Flow (MASTER_PLAN §18)

1. **Scheduled Appointment:** booked → appears in Daily Hub → receptionist clicks "Arrived" → `arrivedAt = now()`, `status = arrived`, queueNumber assigned → waiting → doctor calls → chair assigned → `status = in_chair` → completed
2. **Walk-in:** receptionist clicks "New Walk-in" → name/phone/reason → auto queueNumber → `status = waiting` → doctor calls → chair assigned → optional: convert to appointment → completed

### API Endpoints (MASTER_PLAN §18)

| Method | Route                                      | Description                                                   |
| ------ | ------------------------------------------ | ------------------------------------------------------------- |
| GET    | `/api/daily-ops?branchId=X&date=Y`         | Unified: all appointments + walk-ins + chair status           |
| POST   | `/api/walk-ins`                            | New walk-in (auto queue number)                               |
| PATCH  | `/api/walk-ins/:id/status`                 | Status change (call, assign-chair, complete, cancel, no-show) |
| PATCH  | `/api/walk-ins/:id/assign`                 | Doctor + chair assignment                                     |
| POST   | `/api/walk-ins/:id/convert-to-appointment` | Walk-in → appointment conversion                              |
| PATCH  | `/api/appointments/:id/arrive`             | Patient arrived (arrivedAt + queueNumber)                     |
| PATCH  | `/api/appointments/:id/no-show`            | Mark no-show                                                  |
| PATCH  | `/api/appointments/:id/call`               | Call patient                                                  |
| PATCH  | `/api/appointments/:id/assign-chair`       | Assign chair                                                  |
| PATCH  | `/api/appointments/:id/complete-visit`     | Complete visit                                                |
| GET    | `/api/chairs/availability?branchId=X`      | Chair availability (real-time)                                |
| GET    | `/api/queue/stats?branchId=X&date=Y`       | Stat cards                                                    |

### Auto-No-Show (BullMQ Job — MASTER_PLAN §18)

- Delayed job: if appointment 30 min after scheduled time still "pending" → auto-mark no_show
- Configurable per tenant: `autoNoShowMinutes: 30`, `autoNoShowEnabled: true`, `noShowNotification: true`
- V2_STRUCTURE: `apps/api/src/jobs/workers/auto-noshow.worker.ts`

### V2_STRUCTURE — Frontend Components

- `apps/admin/src/features/daily-ops/components/WalkInForm.tsx`
- `apps/admin/src/features/daily-ops/components/QueueBoard.tsx`
- `apps/admin/src/features/daily-ops/components/ChairDashboard.tsx`
- `apps/admin/src/features/daily-ops/components/QueueNumber.tsx`

### Dashboard Widget (MASTER_PLAN §18)

> Waiting Room widget: 👥 X Waiting | 🪑 X/Y Chairs | ⏱ ~Xmin avg | ✅ X Done | 🚶 X Walk-in | ❌ X No-Show | Next: [patient name]

---

## Gap 9: Other Phase 2 (Weeks 5–7) Deliverables

### 9a. Recurring Appointments (MASTER_PLAN §19)

**`recurring_rules` Collection** schema with fields: recurrenceType (`daily|weekly|biweekly|monthly|quarterly|biannual|annual`), preferredTime, durationMinutes, daysOfWeek, dayOfMonth, weekOfMonth, startDate, endDate, maxOccurrences, status (`active|paused|completed|cancelled`), nextOccurrenceDate, skipHolidays, skipIfConflict, preferredChairId.

**Appointments** get new fields: `recurringRuleId`, `isRecurring`, `occurrenceIndex`, `seriesTotal`, `isModified`, `originalDateTime`, `modificationNote`.

**BullMQ Cron Job** — daily at 01:00, generates appointments 4 weeks ahead. Conflict-checks doctor availability. V2_STRUCTURE: `apps/api/src/jobs/workers/recurring.worker.ts`, `apps/api/src/jobs/crons/reminder.cron.ts`.

**Edit modes:** "This appointment only" / "This and all future" / "All appointments in the series"

**Cancel modes:** Cancel single / Cancel this and all future / Pause series (resume later)

**UI pages:** `/appointments/recurring` (rules list), `/appointments/recurring/:ruleId` (series detail with progress bar), Calendar integration (🔄 badge, "View Series" button)

**10 API endpoints** defined. 7 RBAC permissions defined. 9 webhook events defined.

### 9b. Alert Rules (MASTER_PLAN §20)

**`alert_rules` Collection** (Tenant-DB): configurable alert rules with `triggerType` (inventory_low_stock, inventory_expiring, invoice_overdue, no_show_rate_high, revenue_drop, appointment_utilization_low, payment_pending, custom), `condition` (metric, operator, threshold, timeWindowDays), `scope` (branchId, categoryId, doctorId), `actions` (notify_roles, notify_users, webhook, email), `cooldownMinutes`.

**5 Seed Alert Rules** at tenant creation: Low Stock, Expiring Items, Overdue Invoice, High No-Show Rate, Revenue Drop.

**BullMQ Worker `alert-rule-checker`:** runs every 15 minutes, evaluates all active rules, creates notifications for triggered rules (respecting cooldown).

**UI:** `/settings/alerts` — list all alert rules + CRUD + "Test now" button. V2_STRUCTURE: `apps/api/src/jobs/workers/alert.worker.ts`, `apps/api/src/jobs/crons/alert.cron.ts`.

### 9c. Scheduled Notification Jobs (MASTER_PLAN §20)

| Job                     | Schedule         | Description                                                  |
| ----------------------- | ---------------- | ------------------------------------------------------------ |
| `appointment-reminders` | Daily 18:00      | Scan appointments next 24h, create reminder jobs per patient |
| `recall-reminders`      | Weekly Mon 09:00 | Patients who haven't visited in X months                     |
| `payment-reminders`     | Daily 10:00      | Open invoices > X days                                       |
| `low-stock-alerts`      | Daily 08:00      | Items below minStockLevel                                    |

V2_STRUCTURE: `apps/api/src/jobs/crons/reminder.cron.ts`, `apps/api/src/jobs/crons/alert.cron.ts`

### 9d. Branding Propagation (BUILD_RULES §25)

Zustand store (`branding.store.ts`): `logoUrl`, `logoDarkUrl`, `faviconUrl`, `clinicName`, `phone`, `email`, `website`, `address`, `primaryColor` (#4f46e5 default), `accentColor` (#10b981 default).

Flow: `DashboardLayout` mounts → `useBrandingTheme()` fires → `GET /api/branding` → `setBranding()` → `generateColorScale()` → HSL → 25 shades (50–950) → CSS vars `--color-brand-50` through `--color-brand-950` set on `<html>` → `applyFavicon()` → `applyTitle()`.

### 9e. Dashboard Widgets (MASTER_PLAN §21)

8 free-tier widgets: Today's Overview (stat-cards + mini-donut), Revenue This Month (sparkline), Patients This Month (sparkline), Upcoming Appointments (mini-table), Recent Patients (mini-table), Low Stock Alert (alert cards), Quick Actions (button group), Waiting Room (live integration with §18).

Chart library: **Recharts 2.x** (BUILD_RULES §2.4).

### 9f. Reports Shell — Free Tier (MASTER_PLAN §21)

| Page        | Route                         | Module                                 |
| ----------- | ----------------------------- | -------------------------------------- |
| Dashboard   | `/`                           | Free (`dashboard-reports`)             |
| Reports Hub | `/reports`                    | Free (overview, locked reports marked) |
| Financial   | `/reports/financial/:type`    | Advanced Analytics 🔒                  |
| Patient     | `/reports/patients/:type`     | Advanced Analytics 🔒                  |
| Appointment | `/reports/appointments/:type` | Advanced Analytics 🔒                  |
| Clinical    | `/reports/clinical/:type`     | Advanced Analytics 🔒                  |
| Operational | `/reports/operational/:type`  | Advanced Analytics 🔒                  |

Locked Reports show preview with blur + "Upgrade to Advanced Analytics" CTA.

V2_STRUCTURE: `apps/admin/src/features/reports/` — ReportsHub, 6 category pages, ExportButtons component.

### 9g. OpenAPI Auto-Generation (IMPLEMENTATION_ROADMAP Week 7)

`@fastify/swagger` at `/docs` — V2_DECISION_LOG §3.

### 9h. Module Versioning (MASTER_PLAN §24)

Lifecycle: `DEVELOPMENT → BETA → ACTIVE → DEPRECATED → RETIRED`. SemVer, Canary rollout (5% → 25% → 50% → 100%), auto-rollback if error rate > 1%.

### 9i. Webhook System Platform-Level (IMPLEMENTATION_ROADMAP Week 6)

HMAC-SHA256 signing, managed via Dev Portal. Events: tenant.created, subscription.paid, etc.

### 9j. API Key Hashing (SECURITY_AND_ENCRYPTION §6.2)

- Generation: `nanoid(48)`, prefix `dento_live_...`
- Storage: SHA-256 hash in DB, cleartext shown once only
- Rate limit per key: default 1000 req/min

---

## Phase 2 Deliverables Checklist (IMPLEMENTATION_ROADMAP)

| #   | Deliverable                                                     | Status |
| --- | --------------------------------------------------------------- | ------ |
| 1   | Dev Portal 16 modules complete                                  | TBD    |
| 2   | Paymob + Stripe test payment successful                         | TBD    |
| 3   | Admin Dashboard with 8 widgets + Recharts                       | TBD    |
| 4   | Daily Ops: walk-in → queue → chair → treated                    | TBD    |
| 5   | Recurring appointments rules + BullMQ generation                | TBD    |
| 6   | Notifications: In-App Bell with Socket.io                       | TBD    |
| 7   | Notification Workers: 4 BullMQ queues (shell — providers later) | TBD    |
| 8   | Branding propagation (logo + colors + favicon)                  | TBD    |
| 9   | Webhooks: HMAC-SHA256 signed, 24 events                         | TBD    |
| 10  | API Keys: SHA-256 hashed                                        | TBD    |
| 11  | Rate Limiting per API key                                       | TBD    |
| 12  | Lab Order Types: 14 seed + custom CRUD                          | TBD    |
| 13  | Reports Shell: Free tier + locked Advanced preview              | TBD    |
| 14  | Alert Rules: 5 seed + CRUD + 15-min BullMQ checker              | TBD    |
| 15  | OpenAPI auto-gen at `/docs`                                     | TBD    |

---

> **Last Updated:** Auto-generated from planning documents
> **Source Sections:** MASTER_PLAN §10, §18, §19, §20, §21, §23, §24 | ROADMAP Weeks 5-7 | TECH_REQ §3, §5 | SECURITY §6, §12 | BUILD_RULES §2.4, §23, §24, §25 | V2_STRUCTURE §6 | V2_DECISION_LOG §3, §25, §26, §30 | V2_DATABASE §4.7, §5.14, §6.4, §10.3, §11.5 | ADMIN_PORTAL_SCREENS §4, §5

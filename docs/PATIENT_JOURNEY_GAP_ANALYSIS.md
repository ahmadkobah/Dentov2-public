# Patient Journey — Gap Analysis & Improvement Windows

> Deep scan of the Dento V2 patient pipeline across the admin app and API.
> Combines Round 1 (high-level pipeline scan) and Round 2 (deep gap investigation).
> **Excluded scope:** patient-facing kiosk / display screens, patient self-service portal.

---

## Table of Contents

- [Round 1 — Pipeline Stage Overview](#round-1--pipeline-stage-overview)
  - [Stage 1 — Pre-Visit (Booking)](#stage-1--pre-visit-booking)
  - [Stage 2 — Arrival & Check-in](#stage-2--arrival--check-in)
  - [Stage 3 — Clinical Visit](#stage-3--clinical-visit)
  - [Stage 4 — Post-Visit](#stage-4--post-visit)
  - [Stage 5 — Long-term & Engagement](#stage-5--long-term--engagement)
  - [Round 1 Summary of Gaps](#round-1-summary-of-gaps-prioritized)
- [Round 2 — Deep Gap Investigation](#round-2--deep-gap-investigation)
  - [1. Booking Integrity — Race Conditions & Reschedule](#1-booking-integrity--race-conditions--reschedule)
  - [2. Waitlist Module — Referenced but Missing](#2-waitlist-module--referenced-but-missing)
  - [3. Patient Data Quality](#3-patient-data-quality)
  - [4. Clinical Safety Checks](#4-clinical-safety-checks)
  - [5. Treatment Plan ↔ Invoice ↔ Payment ↔ Commission](#5-treatment-plan--invoice--payment--commission)
  - [6. Walk-in Queue Gaps](#6-walk-in-queue-gaps)
  - [7. Notification Coverage](#7-notification-coverage)
  - [8. Audit Log Coverage (HIPAA / GDPR)](#8-audit-log-coverage-hipaa--gdpr)
  - [9. Cross-Branch / Multi-Doctor](#9-cross-branch--multi-doctor)
  - [10. Document / Imaging Workflow](#10-document--imaging-workflow)
  - [11. Online Booking Widget](#11-online-booking-widget)
  - [12. Procedure-Note Depth](#12-procedure-note-depth)
- [Consolidated Top-10 Highest-ROI Improvements](#consolidated-top-10-highest-roi-improvements)
- [What Is Already Working End-to-End](#what-is-already-working-end-to-end)

---

# Round 1 — Pipeline Stage Overview

## Stage 1 — Pre-Visit (Booking)

| Feature                          | Status                      | Notes                                                                                                                                                                                                                                            |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Online booking widget embed      | ✅ Fully implemented        | `BookingWidgetTab` in Settings generates a `<script>` embed snippet. Customizable: color, language, button position                                                                                                                              |
| Public booking slot API          | ✅ Implemented              | `booking.route.ts` — public `GET /slots` endpoint with SlotEngine                                                                                                                                                                                |
| WhatsApp bot booking             | ✅ Full conversational flow | `WhatsAppBotService` — 8-step state machine: greeting → branch → doctor → date → time → name → confirm → completed. Bilingual (EN/AR). Both Twilio + Meta webhooks wired                                                                         |
| Online booking admin review      | ✅ Implemented              | `OnlineBookingsPage.tsx` — list/confirm/reject with reschedule option. Calendar + table view                                                                                                                                                     |
| Auto-confirm booking             | ✅ Configurable per branch  | `branch.onlineBookingConfig.isAutoConfirm` — skip admin approval when enabled                                                                                                                                                                    |
| Patient auto-creation on booking | ❌ **Missing**              | Online booking creates an appointment with `onlineBookingData` (name/phone/email) but **never creates a Patient record**. When confirmed, there's no logic to convert the booking contact into a Patient. Staff must manually create the patient |
| Appointment reminders            | ✅ Implemented              | BullMQ cron every 15 min — sends at 24h, 1h, 30min before. Respects per-tenant `notifications.appointmentReminders` setting                                                                                                                      |
| Recurring appointments           | ✅ Implemented              | `recurring-appointments.service.ts` — full recurrence engine with `reminderDaysBefore`                                                                                                                                                           |

**Window #1 — Auto-create patient on booking confirm:** When admin confirms an online booking, `BookingService.processBooking(confirm)` sends a notification but never calls `PatientService.create()`. Adding a `findOrCreate` by phone/email at that point would close a significant data gap.

---

## Stage 2 — Arrival & Check-in

| Feature                               | Status         | Notes                                                                                                                                                     |
| ------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Walk-in registration                  | ✅ Implemented | `DailyOpsPage` — "Add Walk-in" button, adds to walk-in queue                                                                                              |
| Appointment status → arrived          | ✅ Implemented | `AppointmentDetailPanel` — `arrived` is a valid next status button, accessible from DailyOps                                                              |
| Chair assignment                      | ✅ Implemented | `DailyOpsPage` chair dropdown per appointment                                                                                                             |
| Waiting room widget (dashboard)       | ✅ Implemented | Live count + avg wait time from `/api/dashboard/stats`                                                                                                    |
| Dedicated "check-in" one-click button | ⚠️ Partial     | `arrived` status is reachable but it's one action among several in the detail panel, not a single-action "Check In" button prominently placed in DailyOps |

---

## Stage 3 — Clinical Visit

| Feature                                   | Status               | Notes                                                                                                                                                                                           |
| ----------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dental chart update                       | ✅ Fully implemented | `DentalChartPage` — odontogram, 5-surface SVG, adult/child, snapshot history, compare, print                                                                                                    |
| Procedure notes                           | ✅ Fully implemented | Create/Edit/Detail/List pages. Auto-draft note created when appointment → `in_progress` via `appointment.service.autoCreateProcedureNote()`. `followUpRequired` + `followUpDate` fields present |
| Treatment plan creation                   | ✅ Implemented       | Multi-phase, odontogram integration, cost estimates, `propose → accept → complete` flow                                                                                                         |
| Consent form signing                      | ✅ Implemented       | `SignConsentFormModal.tsx` — signature capture wired                                                                                                                                            |
| Prescription writing                      | ✅ Implemented       | Full CRUD + PDF + WhatsApp send                                                                                                                                                                 |
| X-rays upload + link                      | ✅ Implemented       | Upload with purpose (`diagnostic`, `follow_up`, etc.), linked to patient                                                                                                                        |
| CBCT + 3D scans                           | ✅ Implemented       | Separate tabs in PatientDetailPage, dedicated list/upload pages                                                                                                                                 |
| Inventory deduction during procedure      | ❌ **Missing**       | No linkage between procedure notes and inventory consumption. A procedure that uses materials doesn't auto-deduct stock                                                                         |
| Link procedure note → treatment plan item | ⚠️ Partial           | `procedureNoteId` exists on prescription model, and `treatmentPlanId` is a field, but there's no UI flow to mark a treatment plan item "completed" directly from the procedure note             |
| Follow-up appointment booking from note   | ❌ **Missing**       | Procedure note has `followUpRequired: true` + `followUpDate` fields, but there is **no "Book Follow-up" button** that pre-fills an appointment form with those values                           |

**Window #3 — Follow-up booking from procedure note:** `ProcedureNoteDetailPage` shows `followUpDate` but offers no action to create the appointment. A single "Book Follow-up" button calling the appointment create flow with pre-filled patientId/doctorId/date would be very high value for clinical workflow.

**Window #4 — Inventory auto-deduction:** Services/procedures have associated inventory items in the data model (via `services` route). A hook in `procedure-note.service.ts` on `status → completed` could deduct stock from `inventory_stock`.

---

## Stage 4 — Post-Visit

| Feature                         | Status         | Notes                                                                                                                                                                     |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invoice generation              | ✅ Implemented | Manual or auto-generate from treatment plan (`useGenerateInvoiceFromPlan`)                                                                                                |
| Invoice from procedure note     | ✅ Implemented | `procedureNotes.toast.invoiceFailed` i18n key exists — auto-invoice on note completion                                                                                    |
| Payment recording               | ✅ Implemented | `RecordPaymentPage`, `PaymentsPage`, `ReconciliationPage`                                                                                                                 |
| Installment plans               | ✅ Implemented | Full installment CRUD + `InstallmentDetailPage`                                                                                                                           |
| Insurance claims                | ✅ Implemented | `InsuranceClaimsPage`, `InsuranceClaimDetailPage`, `CreateClaimPage`                                                                                                      |
| Lab orders                      | ✅ Implemented | Full status flow `draft → sent → in_progress → ready → delivered`. `LabOrderCreateDialog`, `LabOrderDetailPage`. Stats widget. Linked to patient in PatientDetailPage tab |
| Lab order → trigger workflow    | ✅ Wired       | `lab_order.delivered` is a `WorkflowTrigger` type                                                                                                                         |
| WhatsApp send receipt/documents | ✅ Implemented | Invoice, consent, prescription all have WhatsApp send buttons                                                                                                             |

**Window #5 — Lab order PDF:** `LabOrderListPage` and `LabOrderDetailPage` exist with full status flow, but there is **no print/PDF button** on lab orders. Adding a `LabOrderPDF` (similar to `InvoicePDF`) would be consistent with the other documents and useful for handing to the lab.

---

## Stage 5 — Long-term & Engagement

| Feature                            | Status               | Notes                                                                                                                                                                                                                                                       |
| ---------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recall due alerting                | ✅ Implemented       | `alert.cron.ts` → `checkRecallDue()` — scans for patients whose `nextVisitDue` has passed, fires in-app alert for admin                                                                                                                                     |
| Recall notification template       | ✅ Wired             | `recall` category in notification templates                                                                                                                                                                                                                 |
| Recall date on patient record      | ❌ **Missing**       | No `nextVisitDue` / `recallDate` field on the Patient model. The cron code references it but it will never fire because the field doesn't exist                                                                                                             |
| Workflow automation engine         | ✅ Fully implemented | `WorkflowService` + `workflow.worker.ts` — event-driven: `appointment.completed`, `patient.created`, `invoice.overdue`, `treatment_plan.accepted`, `lab_order.delivered`, etc. Actions: send_notification, send_whatsapp, create_follow_up, trigger_webhook |
| Workflow UI (admin-facing)         | ❌ **Missing**       | Routes for workflow CRUD exist in the API. But there is **no admin page** (`WorkflowsPage`, `CreateWorkflowPage`) in the router. The powerful automation engine is completely hidden from the admin                                                         |
| Patient notifications (post-visit) | ✅ Partial           | `notifications.route.ts` — full template system. Reminder cron active. But no post-visit "thank you / survey" automated message wired                                                                                                                       |
| Appointment history on patient     | ✅ Implemented       | `PatientAppointments` tab in `PatientDetailPage`                                                                                                                                                                                                            |

**Window #6 — Expose the Workflow Engine in admin UI:** All the automation logic is built and tested but the admin can't configure it. Even a simple list/toggle page at `/workflows` would unlock automated reminders, follow-up scheduling, and post-treatment messages for every clinic.

**Window #7 — Add `nextVisitDue` to Patient model:** The recall cron infrastructure exists but fires against a field that doesn't exist. Adding `nextVisitDue: Date` to the Patient schema, plus a UI field in `PatientInfoTab` and a setter in `appointment.service` (on `completed`), would make the recall system actually work end-to-end.

---

## Round 1 Summary of Gaps (Prioritized)

| Priority  | Gap                                                 | Effort                                     |
| --------- | --------------------------------------------------- | ------------------------------------------ |
| 🔴 High   | Follow-up booking button from procedure note        | Small — UI only, API ready                 |
| 🔴 High   | Workflow admin UI (list/toggle)                     | Medium — route + table page                |
| 🔴 High   | `nextVisitDue` field on Patient (fix recall system) | Small — schema field + form field + setter |
| 🟡 Medium | Auto-create Patient record on booking confirm       | Medium — service logic in BookingService   |
| 🟡 Medium | Lab order PDF                                       | Small — new PDF component like InvoicePDF  |
| 🟡 Medium | Prominent "Check In" button in DailyOps             | Small — UI only                            |
| 🟢 Low    | Inventory deduction on procedure completion         | Medium — service hook + UI confirmation    |

---

# Round 2 — Deep Gap Investigation

## 1. Booking Integrity — Race Conditions & Reschedule

| #   | Gap                                                                                                                                                                                                                               | Location                                                        | Why it matters                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| 1.1 | **No atomic slot lock.** `SlotEngine.generateSlots` validates availability, then `Appointment.create` runs as a separate query. Two concurrent web-widget users can both pass validation and both create overlapping appointments | `apps/api/src/tenant/services/booking.service.ts` (L107)        | Double-booking from public widget              |
| 1.2 | **No reschedule semantics.** Only `update()` exists — no audit of "rescheduled from X to Y", no automatic patient notification, no waitlist trigger when old slot frees                                                           | `apps/api/src/tenant/services/appointment.service.ts` (L280)    | Patient gets no SMS when their time changes    |
| 1.3 | **No late-cancel / no-show fee rule.** `cancelAppointment` flips status only — no fee computation, no charge to invoice, no policy config                                                                                         | `apps/api/src/tenant/services/appointment.service.ts` (L565)    | Lost revenue, no enforcement                   |
| 1.4 | **Manual admin appointment create lacks conflict-block.** `scheduleValidator.validate` is called but its result is not surfaced as a hard block in the route                                                                      | `apps/api/src/tenant/routes/appointments/appointments.route.ts` | Admin can silently create overlapping bookings |

**Implemented:** Doctor leave → schedule_exceptions sync (✅), buffer time between appointments (✅).

**Fix scope:** Add MongoDB unique compound index `{doctorId, date, startTime}` + try/catch on duplicate-key in `BookingService.createBooking`. Add `rescheduleAppointment(id, newSlot)` method that emits `appointment.rescheduled` event.

---

## 2. Waitlist Module — Referenced but Missing

| #   | Gap                                                                                                                       | Location                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 2.1 | Waitlist model is imported in seed scripts but **no `waitlist.route.ts`, no `waitlist.service.ts`, no admin page** exists | `apps/api/src/scripts/seed-e2e.ts` (L47) references it; no waitlists folder in tenant routes |
| 2.2 | `appointments.route.ts` references waitlists at line 19/416 but the file is missing                                       | `apps/api/src/tenant/routes/appointments/appointments.route.ts` (L416)                       |
| 2.3 | No "auto-fill cancelled slot from waitlist" logic anywhere                                                                | n/a                                                                                          |

**Fix scope:** Build the missing route + service + admin page. On `appointment.cancelled`, query waitlist for matching `branchId+doctorId+dateRange`, notify next-in-line.

---

## 3. Patient Data Quality

| #   | Gap                                                                                                                                                                                                     | Location                                                 | Severity           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------ |
| 3.1 | **No duplicate detection** on `PatientService.create` — same phone/email/national-ID can be inserted N times                                                                                            | `apps/api/src/tenant/services/patient.service.ts` (L132) | High               |
| 3.2 | **No patient-merge function** for cleaning up duplicates that already exist                                                                                                                             | n/a                                                      | High               |
| 3.3 | **National ID has no format validation** — encrypted but no length/checksum check (Egypt national ID is 14 digits with checksum)                                                                        | `apps/api/src/tenant/services/patient.service.ts` (L24)  | Medium             |
| 3.4 | **Communication-preference fields missing**: no `preferredChannel` (sms/whatsapp/email), no `smsOptOut`, no `emailOptOut`, no `marketingOptIn`. Reminders fire to all patients regardless of preference | `patient.model.ts`                                       | Medium (GDPR risk) |

---

## 4. Clinical Safety Checks

| #   | Gap                                                                                                                                                                                           | Location                                                     | Severity                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| 4.1 | **No allergy lookup when writing prescription.** `PrescriptionService.create` never reads `patient.allergies`                                                                                 | `apps/api/src/tenant/services/prescription.service.ts` (L75) | **Critical (clinical safety)** |
| 4.2 | **No drug-drug interaction matrix.** Two interacting drugs can land on the same prescription                                                                                                  | `medication.service.ts`                                      | High                           |
| 4.3 | **Medical history not surfaced at point of care.** Appointment detail panel doesn't pre-load `diabetes`, `anticoagulant`, `cardiac` flags. Staff has to manually open the medical-history tab | `AppointmentDetailPanel.tsx`                                 | High                           |
| 4.4 | **No pregnancy gate on X-ray order.** No check against `patient.medicalHistory.isPregnant` before `xray.service.create`                                                                       | `apps/api/src/tenant/services/xray.service.ts`               | **Critical**                   |
| 4.5 | **No age-based dosing validation** for pediatric medications                                                                                                                                  | `medication.model.ts`                                        | Medium                         |

**Fix scope (4.1):** In `PrescriptionService.create`, load patient, intersect `prescription.medications[].name` with `patient.allergies[].substance`. Return `{warnings: [...]}` so the UI can show a confirmation modal.

---

## 5. Treatment Plan ↔ Invoice ↔ Payment ↔ Commission

| #   | Gap                                                                                                                                                                     | Location                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 5.1 | **Plan items don't track `billedAmount` / `billedInvoiceId`.** When the plan is edited after partial billing, you can't tell what's already invoiced vs. pending        | `apps/api/src/tenant/models/treatment-plan.model.ts` (L57)     |
| 5.2 | **No tenant-side refund flow.** Refund route only exists at the platform/Stripe level — clinics can't refund a patient against an invoice from the admin UI             | `apps/api/src/platform/routes/payments/stripe.route.ts` (L328) |
| 5.3 | **Commission accrual trigger ambiguous** — unclear whether commission becomes "approved" on appointment completion, invoice paid, or never. No state machine documented | `apps/api/src/tenant/services/commission.service.ts` (L105)    |
| 5.4 | **Doctor cannot see their own per-appointment commission.** No `/doctors/me/commissions/:appointmentId` route surfaced                                                  | `doctors.route.ts`                                             |
| 5.5 | **Receipt not auto-emailed on payment.** `PaymentService.create` records the payment but doesn't trigger a `payment.received` notification                              | `payment.service.ts`                                           |

---

## 6. Walk-in Queue Gaps

| #   | Gap                                                                                                                                                         | Location                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 6.1 | **No estimated-wait-time calculation.** `WalkInQueueService` knows position and `avgConsultationTime` from settings but never computes `position × avgTime` | `apps/api/src/tenant/services/walk-in-queue.service.ts` |
| 6.2 | **No reorder/skip-queue method.** Cannot move a patient up if (e.g.) emergency walk-in arrives                                                              | `walk-in-queue.service.ts`                              |
| 6.3 | **Cannot convert walk-in entry into a future scheduled appointment** in one click                                                                           | n/a                                                     |
| 6.4 | **Auto-no-show timer is documented in the file header comment but not implemented** — no cron, no scheduled job                                             | `walk-in-queue.service.ts` (L11)                        |

---

## 7. Notification Coverage

What fires automatically vs. silent:

| Event                     | Auto-notify? | Gap                                                                                |
| ------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `appointment.created`     | ✅ (staff)   | Patient notification path unclear                                                  |
| `appointment.confirmed`   | ⚠️           | Fires only for **online** bookings, not for admin-confirmed walk-in/phone bookings |
| `appointment.rescheduled` | ❌           | Patient never told time changed                                                    |
| `appointment.cancelled`   | ✅           | But "cancelled by patient" vs "cancelled by clinic" not distinguished              |
| `treatment_plan.proposed` | ❌           | Patient never sent the plan for approval (it sits in admin)                        |
| `prescription.created`    | ❌           | Patient never notified Rx is ready                                                 |
| `lab_order.ready`         | ❌           | No "your crown is ready for fitting" message                                       |
| `invoice.created`         | ❌           | Only `invoice.overdue` fires; the initial bill is never sent                       |
| `invoice.overdue`         | ✅           | `invoice-overdue.service.ts` handles this                                          |
| `payment.received`        | ❌           | No receipt email/SMS to the patient                                                |

**Window:** All seven could be implemented as workflow rules once the workflow admin UI exists (Round 1, Window #6) — or as direct service-layer calls. The notification template system is already complete; only the trigger calls are missing.

---

## 8. Audit Log Coverage (HIPAA / GDPR)

| #   | Gap                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8.1 | **Patient record view is not audited.** HIPAA requires PHI access logging — `usePatientDetail` hits the API but the route doesn't write an audit entry |
| 8.2 | **Dental chart edits are not in audit log** — no `auditLog.create()` call in `dental-chart.service.ts` upsert                                          |
| 8.3 | **Consent form view not audited**                                                                                                                      |
| 8.4 | **Prescription print/export not audited** — controlled-substance traceability gap                                                                      |

**Fix scope:** Centralize via a `withAudit()` Fastify hook that writes `{ userId, action, resourceType, resourceId }` for any GET/PUT/PATCH on protected resources.

---

## 9. Cross-Branch / Multi-Doctor

| #   | Gap                                                                                                                                            | Location                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 9.1 | **No patient-transfer-between-branches** function. Patient is global per-tenant but no `assignedBranch` history                                | `patient.model.ts`                                         |
| 9.2 | **Doctor handoff is just a `doctorId` update** — no handoff note, no audit reason, no notification to incoming doctor                          | `appointment.service.ts`                                   |
| 9.3 | **No referral-out mechanism.** Patient `source` field has `'referral'` for incoming, but no model for outgoing referrals to specialists        | `patient.model.ts` (L107)                                  |
| 9.4 | **Treatment plan has a single `doctorId`** — multi-doctor plans (e.g., implant: surgeon + prosthodontist) cannot split responsibility per-item | `apps/api/src/tenant/models/treatment-plan.model.ts` (L78) |

---

## 10. Document / Imaging Workflow

| #    | Gap                                                                                 |
| ---- | ----------------------------------------------------------------------------------- |
| 10.1 | **No X-ray annotation/markup** model or fields — can't draw caries circles          |
| 10.2 | **No "before/after" pairing API** for side-by-side comparison of same-tooth imagery |
| 10.3 | **CBCT is metadata-only** — no DICOM-series navigation; relies on external viewer   |
| 10.4 | **No intra-oral camera capture endpoint** — generic file upload only                |
| 10.5 | **No voice-note / dictation** support for procedure notes                           |

---

## 11. Online Booking Widget

| #    | Gap                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| 11.1 | **No service selection.** Patient picks slot but not the procedure → makes triage / duration estimation impossible   |
| 11.2 | **No insurance pre-check** during booking                                                                            |
| 11.3 | **No returning-patient lookup.** Widget always treats booker as new → contributes to duplicate-patient problem (3.1) |
| 11.4 | **Confirmation email lacks `.ics` calendar attachment**                                                              |
| 11.5 | **No self-service reschedule/cancel link** in confirmation. Patient must phone the clinic                            |

---

## 12. Procedure-Note Depth

| #    | Gap                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 12.1 | **Templates are generic** — no per-procedure-type template (RCT vs filling vs crown each need different fields)                                                                                  |
| 12.2 | **No `noteType` field** (pre-op / intra-op / post-op)                                                                                                                                            |
| 12.3 | **Notes don't reference dental-chart surfaces.** A note about tooth #16 isn't linked to the surface entries on that tooth → can't reconstruct "what work happened on which surface" historically |

---

# Consolidated Top-10 Highest-ROI Improvements

| Rank | Fix                                                                                         | Effort | Why now                                           |
| ---- | ------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------- |
| 1    | **Allergy check + warning in prescription create** (4.1)                                    | S      | Clinical safety, fastest to ship                  |
| 2    | **Pregnancy block on X-ray order** (4.4)                                                    | S      | Clinical safety                                   |
| 3    | **Auto-notify patient on `appointment.rescheduled`** (7)                                    | S      | Trivial — service call missing                    |
| 4    | **Patient duplicate detection on create (phone/email/nationalId)** (3.1)                    | S      | One indexed query                                 |
| 5    | **Estimated wait time on walk-in queue** (6.1)                                              | S      | Existing data, simple multiplication              |
| 6    | **Receipt notification on `payment.received` + `invoice.created`** (5.5, 7)                 | S      | Two service hooks                                 |
| 7    | **Follow-up booking button from procedure note** (Round 1, Window #3)                       | S      | UI only — API ready                               |
| 8    | **Add `nextVisitDue` field on Patient** to make recall cron functional (Round 1, Window #7) | S      | Schema + form field + appointment-complete setter |
| 9    | **Workflow admin UI (list / toggle)** (Round 1, Window #6)                                  | M      | Unlocks the entire automation engine              |
| 10   | **Build the missing waitlist route + service + page** (2.1)                                 | M      | Hooks already reference it                        |

### Runner-ups (Medium effort)

- Reschedule appointment as first-class action with cascading notifications (1.2)
- Atomic slot lock via unique compound index + retry (1.1)
- Per-resource audit logging hook for HIPAA (8.1–8.4)
- Tenant-side refund flow (5.2)
- Lab order PDF (Round 1, Window #5)
- Inventory auto-deduction on procedure completion (Round 1, Window #4)
- Auto-create Patient on online-booking confirm (Round 1, Window #1)

---

# What Is Already Working End-to-End

The core clinical pipeline is **solid**:

**Booking** (web widget + WhatsApp bot + manual) → **DailyOps check-in** → **dental chart** → **treatment plan** → **procedure notes (with auto-draft)** → **consent** → **prescription** → **invoice** → **payment** → **installments** → **insurance claim** → **lab orders**.

- Reminders fire automatically (24h / 1h / 30min).
- Notification template system is complete.
- All major documents (consent, invoice, prescription, treatment plan) have **PDF + print + WhatsApp send**.
- Recurring appointments work end-to-end.
- Doctor leave automatically blocks slots.
- Buffer time between appointments is configurable.
- Online booking can auto-confirm per-branch.
- Walk-in queue + waiting-room dashboard widget are live.
- Workflow automation engine (BullMQ, event-driven) is fully built backend-side.
- Recall-due alert cron is registered (waiting only on the missing `nextVisitDue` field to actually fire).

The gaps above are mostly **edges of completed features** — small additions, missing notification triggers, and one-or-two missing UI pages — rather than missing core architecture.

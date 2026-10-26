All 8 Week 8 tasks are complete. Full build passes (5/5 packages). Here's what was delivered:

Phase 3 Week 8 — Patients + Appointments Enhancement

# Task Files

1 PII encryption expanded — 4 fields (nationalId, phone, email, address) with encrypted-field search patient.service.ts
2 3-tier schedule validation — Branch hours (Ramadan-aware) -> Doctor schedule (exception handling) -> Conflict detection branch.model.ts (NEW), schedule-validation.service.ts (NEW), appointment.service.ts
3 Calendar drag-and-drop — eventDrop + eventResize with auto-revert on failure AppointmentCalendar.tsx, useAppointments.ts, AppointmentPage.tsx
4 Waitlist-to-appointment conversion — PATCH /api/waitlists/:id/conversion endpoint + UI dialog with 3-tier validation appointment.schema.ts, waitlist.route.ts, WaitlistConvertForm.tsx (NEW), WaitlistPage.tsx, useWaitlist.ts
5 Patient detail placeholder tabs — Dental Chart, X-Rays, Treatment Plans, Billing with EmptyState PatientDetailPage.tsx
6 Waitlist expiry cleanup — on-read auto-expire (BullMQ cron deferred to Week 13) waitlist-cleanup.service.ts (NEW)
7 Shared constants added — VALID_STATUS_TRANSITIONS, WAITLIST_STATUSES, DOCTOR_EXCEPTION_TYPES constants/index.ts
8 Build verified — 5/5 packages pass -

# Phase 3 Readiness Audit — Core Clinical (Weeks 8–13)

> **Audit Date:** February 26, 2026  
> **Auditor:** Automated Codebase Scan  
> **Scope:** All code relevant to Phase 3 (Core Clinical, Weeks 8–13)

---

## Executive Summary

Phase 3 is a **6-week sprint** covering the clinical core of Dento V2. The audit reveals that **Week 8 (Patients + Appointments) is ~75% complete** in terms of models, schemas, routes, and admin UI. Everything beyond Week 8 — dental charts, treatment plans, imaging, lab orders, scheduling engine, chat, etc. — is **0% implemented** and must be built from scratch. Key infrastructure pieces (encryption, audit logging, Socket.io, notification system) are already in place from Phases 0–2 and can be leveraged.

| Week | Area                                                           | Readiness |
| :--: | :------------------------------------------------------------- | :-------: |
|  8   | Patients + Appointments                                        |  🟡 ~75%  |
|  9   | Scheduling + Booking                                           |  🔴 ~15%  |
|  10  | Dental Chart + Treatment Plans + Procedures                    |   🔴 0%   |
|  11  | Imaging + Prescriptions                                        |   🔴 0%   |
|  12  | Lab Orders + Services + Documents + Chat                       |  🔴 ~5%   |
|  13  | Notifications + Jobs + Custom Fields + Audit + 2FA + Workflows |  🟡 ~20%  |

---

## 1. API Models (`apps/api/src/tenant/models/`)

### EXISTING Models (12 files)

| Model File                  | Phase 3 Relevant? | Completeness | Notes                                                                                                                                                                        |
| :-------------------------- | :---------------: | :----------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patient.model.ts`          |     ✅ Week 8     |   **95%**    | Full schema: IPatient, IAllergy, IMedicalHistory, IFamilyLink, IPatientInsurance. PII encryption for nationalId noted in comments. 327 lines.                                |
| `appointment.model.ts`      |     ✅ Week 8     |   **95%**    | Full schema: status flow, scheduling fields, source tracking, financial fields, timing tracking. 185 lines.                                                                  |
| `appointment-type.model.ts` |     ✅ Week 8     |   **100%**   | CRUD-ready: bilingual name, code, defaultDuration, color, isOnlineBookingAllowed.                                                                                            |
| `waitlist.model.ts`         |     ✅ Week 8     |   **100%**   | Full schema: preferredDates/Times, flexibility, priority, status, expiry. Proper indexes.                                                                                    |
| `doctor.model.ts`           |    ✅ Week 8–9    |   **90%**    | Includes `schedules[]` (IDoctorSchedule) and `exceptions[]` (IDoctorException) embedded. Slot duration, buffer, max daily patients — good foundation for Week 9 slot engine. |
| `notification.model.ts`     |    ✅ Week 13     |   **90%**    | 6 sub-models: templates, notifications, logs, preferences, device tokens, alert rules. 638 lines.                                                                            |
| `recurring-rule.model.ts`   |    ⚠️ Partial     |   **100%**   | Recurring appointment rules (for recurring booking patterns).                                                                                                                |
| `report.model.ts`           |    ❌ Phase 5     |     N/A      | Report types include clinical categories but this is reporting, not clinical modules.                                                                                        |
| `branding.model.ts`         |    ⚠️ Week 12     |   **100%**   | ClinicHeader branding — needed for document templates.                                                                                                                       |
| `walk-in-queue.model.ts`    |    ⚠️ Indirect    |   **100%**   | Walk-in queue support for daily ops.                                                                                                                                         |
| `webhook.model.ts`          |    ⚠️ Week 13     |     N/A      | Webhook model for tenant-level events.                                                                                                                                       |
| `index.ts`                  |         —         |   **100%**   | Barrel export — re-exports all models.                                                                                                                                       |

### MISSING Models (Phase 3 Required)

| Model                              | Week |  Priority   | Complexity | Dependencies                                 |
| :--------------------------------- | :--: | :---------: | :--------: | :------------------------------------------- |
| `dental-chart.model.ts`            |  10  | 🔴 Critical |    High    | Patient, tooth conditions (constants exist)  |
| `dental-chart-history.model.ts`    |  10  | 🔴 Critical |   Medium   | DentalChart                                  |
| `treatment-plan.model.ts`          |  10  | 🔴 Critical |    High    | Patient, DentalChart, Service                |
| `procedure-note.model.ts`          |  10  | 🔴 Critical |    High    | Patient, TreatmentPlan, DentalChart          |
| `procedure-note-template.model.ts` |  10  |  🟡 Medium  |    Low     | —                                            |
| `prescription.model.ts`            |  11  | 🔴 Critical |   Medium   | Patient, Medication                          |
| `medication.model.ts`              |  11  | 🔴 Critical |    Low     | — (seed catalog)                             |
| `xray.model.ts`                    |  11  | 🔴 Critical |   Medium   | Patient, toothNumbers[]                      |
| `cbct.model.ts`                    |  11  |  🟡 Medium  |   Medium   | Patient                                      |
| `lab-order.model.ts`               |  12  | 🔴 Critical |   Medium   | Patient, DentalLab, TreatmentPlan            |
| `dental-lab.model.ts`              |  12  |  🟡 Medium  |    Low     | —                                            |
| `service.model.ts`                 |  12  | 🔴 Critical |   Medium   | — (categories, pricing, defaultMaterials)    |
| `consent-form.model.ts`            |  12  |  🟡 Medium  |   Medium   | Patient, signature                           |
| `consent-template.model.ts`        |  12  |  🟡 Medium  |    Low     | —                                            |
| `chat-channel.model.ts`            |  12  | 🔴 Critical |   Medium   | User, Branch                                 |
| `chat-message.model.ts`            |  12  | 🔴 Critical |   Medium   | ChatChannel, User                            |
| `schedule.model.ts`                |  9   | 🔴 Critical |   Medium   | Branch (branch hours, ramadan hours)         |
| `schedule-exception.model.ts`      |  9   | 🔴 Critical |    Low     | Doctor/Branch                                |
| `staff-schedule.model.ts`          |  9   |  🟡 Medium  |   Medium   | User, Branch                                 |
| `shift-template.model.ts`          |  9   |  🟡 Medium  |    Low     | Branch                                       |
| `leave-request.model.ts`           |  9   |  🟡 Medium  |   Medium   | User, schedule-exception                     |
| `custom-field.model.ts`            |  13  |  🟡 Medium  |   Medium   | — (dynamic fields per entity)                |
| `audit-log.model.ts`               |  13  |  🟡 Medium  |   Medium   | — (middleware exists, storage model missing) |
| `workflow.model.ts`                |  13  |  🟡 Medium  |    High    | BullMQ, event → condition → action           |

**Total: 12 existing, 24 missing**

---

## 2. API Routes (`apps/api/src/tenant/routes/`)

### EXISTING Route Folders (12)

| Route Folder                                        |  Phase 3?   |    Status    | Notes                                                 |
| :-------------------------------------------------- | :---------: | :----------: | :---------------------------------------------------- |
| `patients/` → `patients.route.ts`                   |  ✅ Week 8  | **Complete** | CRUD + query/filter/pagination                        |
| `appointments/` → `appointments.route.ts`           |  ✅ Week 8  | **Complete** | CRUD + calendar query + status transitions            |
| `appointment-types/` → `appointment-types.route.ts` |  ✅ Week 8  | **Complete** | CRUD for appointment types                            |
| `waitlist/` → `waitlist.route.ts`                   |  ✅ Week 8  | **Complete** | CRUD + status management                              |
| `notifications/` → `notifications.route.ts`         | ✅ Week 13  | **Complete** | Templates, in-app, logs, preferences, alert rules     |
| `reports/` → `reports.route.ts`                     | ⚠️ Indirect |   Complete   | Includes report scheduling (relevant to Week 13 jobs) |
| `recurring/` → `recurring.route.ts`                 | ⚠️ Indirect |   Complete   | Recurring appointment rules                           |
| `auth/`                                             | ❌ Phase 1  |   Complete   | —                                                     |
| `branding/`                                         | ⚠️ Week 12  |   Complete   | Branding propagation (document templates need this)   |
| `health/`                                           | ❌ Phase 0  |   Complete   | —                                                     |
| `translations/`                                     | ❌ Phase 2  |   Complete   | —                                                     |
| `users/`                                            | ❌ Phase 1  |   Complete   | —                                                     |

### MISSING Route Folders (Phase 3 Required)

| Route Folder       | Week | Endpoints Needed                                                          |
| :----------------- | :--: | :------------------------------------------------------------------------ |
| `dental-charts/`   |  10  | GET (by patient), POST (save chart), GET /:id/history, POST /:id/snapshot |
| `treatment-plans/` |  10  | Full CRUD, status transitions, GET by patient, items management           |
| `procedure-notes/` |  10  | Full CRUD, GET by patient/treatment-plan, templates endpoint              |
| `prescriptions/`   |  11  | Full CRUD, GET by patient, print endpoint, medications autocomplete       |
| `medications/`     |  11  | CRUD for medication catalog, search/autocomplete                          |
| `xrays/`           |  11  | Upload (S3), CRUD, GET by patient/tooth, viewer                           |
| `cbct/`            |  11  | Upload (S3), CRUD, GET by patient                                         |
| `lab-orders/`      |  12  | Full CRUD, status flow (ordered→fabricating→ready→delivered)              |
| `dental-labs/`     |  12  | CRUD for lab entities                                                     |
| `services/`        |  12  | CRUD + categories, pricing, defaultMaterials                              |
| `consent-forms/`   |  12  | Templates CRUD, form generation, signature, PDF                           |
| `chat/`            |  12  | Channels CRUD, messages, Socket.io integration                            |
| `schedules/`       |  9   | Doctor schedule CRUD, branch hours, exceptions                            |
| `booking/`         |  9   | 4 public endpoints: branches, doctors, slots, booking (API key auth)      |
| `staff-schedules/` |  9   | Staff schedule CRUD, shift templates                                      |
| `leave-requests/`  |  9   | CRUD + review/approve flow                                                |
| `custom-fields/`   |  13  | CRUD per entity type                                                      |
| `audit-logs/`      |  13  | Read-only query endpoint (existing middleware logs, needs storage + API)  |
| `workflows/`       |  13  | CRUD for automation rules                                                 |

**Total: 12 existing, 19 missing**

---

## 3. Shared Schemas (`packages/shared/src/schemas/`)

### EXISTING Schemas (4 files)

| Schema File             |  Phase 3?  | Contents                                                                                                                                                       |
| :---------------------- | :--------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patient.schema.ts`     | ✅ Week 8  | createPatientSchema, updatePatientSchema, patientQuerySchema + embedded sub-schemas (allergy, medicalHistory, familyLink, insurance). 141 lines. **Complete.** |
| `appointment.schema.ts` | ✅ Week 8  | createAppointmentSchema, updateAppointmentSchema, appointmentQuerySchema + appointmentType schemas + waitlist schemas. 170 lines. **Complete.**                |
| `auth.schema.ts`        | ❌ Phase 1 | Auth schemas                                                                                                                                                   |
| `tenant.schema.ts`      | ❌ Phase 1 | Tenant CRUD schemas                                                                                                                                            |

### MISSING Schemas (Phase 3 Required)

| Schema                     | Week | Zod Schemas Needed                                                                                      |
| :------------------------- | :--: | :------------------------------------------------------------------------------------------------------ |
| `dental-chart.schema.ts`   |  10  | createDentalChartSchema, updateToothSchema, chartSnapshotSchema                                         |
| `treatment-plan.schema.ts` |  10  | createTreatmentPlanSchema, updateTreatmentPlanSchema, treatmentPlanItemSchema, treatmentPlanQuerySchema |
| `procedure-note.schema.ts` |  10  | createProcedureNoteSchema, updateProcedureNoteSchema, procedureNoteQuerySchema                          |
| `prescription.schema.ts`   |  11  | createPrescriptionSchema, prescriptionItemSchema, prescriptionQuerySchema                               |
| `medication.schema.ts`     |  11  | createMedicationSchema, medicationQuerySchema                                                           |
| `xray.schema.ts`           |  11  | createXraySchema, xrayQuerySchema                                                                       |
| `cbct.schema.ts`           |  11  | createCbctSchema, cbctQuerySchema                                                                       |
| `lab-order.schema.ts`      |  12  | createLabOrderSchema, labOrderStatusSchema, labOrderQuerySchema                                         |
| `service.schema.ts`        |  12  | createServiceSchema, serviceCategorySchema, serviceQuerySchema                                          |
| `consent-form.schema.ts`   |  12  | createConsentTemplateSchema, consentFormSchema                                                          |
| `chat.schema.ts`           |  12  | createChannelSchema, sendMessageSchema                                                                  |
| `schedule.schema.ts`       |  9   | doctorScheduleSchema, scheduleExceptionSchema, branchHoursSchema                                        |
| `booking.schema.ts`        |  9   | slotQuerySchema, createBookingSchema                                                                    |
| `leave-request.schema.ts`  |  9   | createLeaveRequestSchema, leaveReviewSchema                                                             |
| `custom-field.schema.ts`   |  13  | createCustomFieldSchema, customFieldValueSchema                                                         |
| `workflow.schema.ts`       |  13  | createWorkflowSchema, workflowConditionSchema                                                           |

**Total: 4 existing, 16 missing**

---

## 4. Admin Features (`apps/admin/src/features/`)

### EXISTING Feature Folders (11)

| Feature              |  Phase 3?   | Contents                                                                                                                                             |                                      Completeness                                       |
| :------------------- | :---------: | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------: |
| `patients/`          |  ✅ Week 8  | **Pages:** PatientListPage, PatientDetailPage. **Components:** AllergyList, MedicalHistoryForm, PatientColumns, PatientForm. **Hooks:** usePatients. |      **85%** — Missing: dental chart tab, x-ray tab, billing tab in PatientDetail       |
| `appointments/`      |  ✅ Week 8  | **Pages:** AppointmentPage. **Components:** AppointmentCalendar, AppointmentDetailPanel, AppointmentForm. **Hooks:** useAppointments.                | **80%** — Missing: schedule validation overlay, FullCalendar drag-and-drop enhancements |
| `appointment-types/` |  ✅ Week 8  | **Pages:** AppointmentTypesPage. **Components, hooks:** Defined in components/hooks dirs.                                                            |                                         **90%**                                         |
| `waitlist/`          |  ✅ Week 8  | **Pages:** WaitlistPage. **Components:** WaitlistEntryForm.                                                                                          |                                         **85%**                                         |
| `settings/`          | ✅ Week 13  | **Pages:** SettingsPage (706 lines). **Tabs:** General ✅, Branding ✅, Notifications ❌ (placeholder), Users ❌, Sessions ❌, Billing ❌            |           **30%** — Needs notification settings, webhook settings, 2FA toggle           |
| `notifications/`     | ✅ Week 13  | **Pages:** NotificationsPage                                                                                                                         |                   **50%** — Needs integration with scheduled jobs UI                    |
| `operations/`        | ⚠️ Indirect | **Pages:** DailyOpsPage. Components folder empty.                                                                                                    |                               Complete for Phase 2 scope                                |
| `reports/`           | ❌ Phase 5  | **Pages:** Exports via reports/pages/index.                                                                                                          |                               Complete for Phase 2 scope                                |
| `dashboard/`         | ❌ Phase 2  | DashboardPage                                                                                                                                        |                                        Complete                                         |
| `auth/`              | ❌ Phase 1  | LoginPage                                                                                                                                            |                                        Complete                                         |
| `onboarding/`        | ❌ Phase 2  | OnboardingPage                                                                                                                                       |                                        Complete                                         |

### MISSING Feature Folders (Phase 3 Required)

| Feature Folder             | Week | Pages/Components Needed                                                                                                                              |
| :------------------------- | :--: | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dental-chart/`            |  10  | DentalChartPage, DentalChartViewer (react-odontogram wrapper), ToothDetailPanel, FiveSurfaceSVG, DentalChartMini, ChartHistoryViewer, ChartPrintView |
| `treatment-plans/`         |  10  | TreatmentPlanListPage, TreatmentPlanDetailPage, TreatmentPlanForm, PlanItemsTable, PlanStatusFlow                                                    |
| `procedures/`              |  10  | ProcedureNoteListPage, ProcedureNoteForm, ProcedureTemplateSelector                                                                                  |
| `prescriptions/`           |  11  | PrescriptionListPage, PrescriptionForm, MedicationAutocomplete, PrescriptionPrintView                                                                |
| `imaging/` or `xrays/`     |  11  | XrayListPage, XrayUploadForm, XrayViewer, CbctListPage, ImagingLinker component, ImagingTimeline                                                     |
| `lab-orders/`              |  12  | LabOrderListPage, LabOrderForm, LabOrderStatusFlow, DentalLabSelector                                                                                |
| `services/`                |  12  | ServiceCatalogPage, ServiceForm, ServiceCategoryManager                                                                                              |
| `consent-forms/`           |  12  | ConsentTemplateListPage, ConsentFormEditor, SignatureWidget, ConsentPdfPreview                                                                       |
| `chat/`                    |  12  | ChatPage, ChannelList, MessageThread, MessageInput, ChatSearch                                                                                       |
| `schedules/` or `booking/` |  9   | DoctorSchedulePage, ScheduleEditor, SlotViewer, BookingConfigPage                                                                                    |
| `custom-fields/`           |  13  | CustomFieldsConfigPage, FieldBuilder, DynamicFieldRenderer                                                                                           |

**Total: 11 existing, 11 missing**

### Router Coverage

The router (`apps/admin/src/router.tsx`) currently has routes for:

- ✅ `/patients`, `/patients/:id`
- ✅ `/appointments`
- ✅ `/appointment-types`
- ✅ `/waitlists`
- ✅ `/settings`, `/notifications`, `/reports`, `/daily-operations`

Missing routes needed for Phase 3:

- ❌ `/dental-charts` / `/patients/:id/dental-chart`
- ❌ `/treatment-plans`
- ❌ `/procedures`
- ❌ `/prescriptions`
- ❌ `/xrays` / `/imaging`
- ❌ `/lab-orders`
- ❌ `/services`
- ❌ `/consent-forms`
- ❌ `/chat`
- ❌ `/schedules`
- ❌ `/booking`
- ❌ `/custom-fields`

---

## 5. Shared Constants (`packages/shared/src/constants/index.ts`)

### EXISTING Phase 3 Constants

| Constant                  |   Status   | Notes                                                                                                                                                                                 |
| :------------------------ | :--------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ROLES`                   |     ✅     | All 8 roles including `lab_technician`, `hygienist` — good for Phase 3 RBAC                                                                                                           |
| `APPOINTMENT_STATUSES`    |     ✅     | 8 statuses: booked → completed + cancelled/no_show/rescheduled                                                                                                                        |
| `TREATMENT_PLAN_STATUSES` |     ✅     | 6 statuses: draft → proposed → approved → in_progress → completed → cancelled                                                                                                         |
| `MODULE_SLUGS`            |     ✅     | Includes: `dental_charts`, `treatment_plans`, `procedure_notes`, `prescriptions`, `xrays`, `cbct`, `lab_orders`, `services_catalog`, `schedules`, `leave`, `consent`, `notifications` |
| `WEBHOOK_EVENTS`          |     ✅     | Includes: `treatment_plan.approved/completed`, `prescription.created`, `lab_order.created/completed`                                                                                  |
| `TOOTH_CONDITIONS`        |     ✅     | 14 conditions: healthy, caries, filled, crowned, missing, extracted, implant, bridge, root_canal, veneer, fracture, periapical_lesion, mobility, recession                            |
| `INVOICE_STATUSES`        | ⚠️ Phase 4 | Defined but Phase 4                                                                                                                                                                   |
| `TENANT_STATUSES`         | ❌ Phase 1 | —                                                                                                                                                                                     |

### MISSING Constants Needed

| Constant                  | Week | Values Needed                                                                                                           |
| :------------------------ | :--: | :---------------------------------------------------------------------------------------------------------------------- |
| `PROCEDURE_NOTE_STATUSES` |  10  | draft, completed, amended                                                                                               |
| `PRESCRIPTION_STATUSES`   |  11  | draft, issued, dispensed, cancelled                                                                                     |
| `LAB_ORDER_STATUSES`      |  12  | ordered, fabricating, ready, delivered, cancelled                                                                       |
| `XRAY_TYPES`              |  11  | periapical, panoramic, bitewing, cephalometric, occlusal                                                                |
| `CBCT_STATUSES`           |  11  | ordered, scanned, reported                                                                                              |
| `SERVICE_CATEGORIES`      |  12  | preventive, restorative, cosmetic, surgical, orthodontic, endodontic, periodontic, prosthodontic, pediatric, diagnostic |
| `CONSENT_FORM_STATUSES`   |  12  | draft, pending_signature, signed, expired, revoked                                                                      |
| `CHAT_CHANNEL_TYPES`      |  12  | direct, branch, role, custom, announcement                                                                              |
| `LEAVE_REQUEST_STATUSES`  |  9   | pending, approved, rejected, cancelled                                                                                  |
| `LEAVE_TYPES`             |  9   | annual, sick, personal, maternity, paternity, unpaid, emergency                                                         |
| `CUSTOM_FIELD_TYPES`      |  13  | text, number, date, select, multi_select, boolean, file                                                                 |
| `WORKFLOW_TRIGGER_EVENTS` |  13  | appointment.created, patient.created, treatment_plan.approved, etc.                                                     |
| `AUDIT_ACTION_TYPES`      |  13  | CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT                                                                     |

---

## 6. UI Components (`packages/ui/src/`)

### EXISTING Relevant Components

| Component        | Location                        | Phase 3 Use                                                                                   |
| :--------------- | :------------------------------ | :-------------------------------------------------------------------------------------------- |
| `ClinicHeader`   | `composites/ClinicHeader.tsx`   | ✅ Week 12 — Document template header (prescription, treatment plan, consent, lab order PDFs) |
| `Calendar`       | `primitives/Calendar.tsx`       | ✅ Week 8 — Date picker (appointment form)                                                    |
| `DataTable`      | `composites/DataTable.tsx`      | ✅ All weeks — Lists (patients, treatment plans, procedures, prescriptions, etc.)             |
| `SearchCombobox` | `composites/SearchCombobox.tsx` | ✅ Week 11 — Medication autocomplete, doctor selector                                         |
| `FormField`      | `composites/FormField.tsx`      | ✅ All weeks — All forms                                                                      |
| `ConfirmDialog`  | `composites/ConfirmDialog.tsx`  | ✅ All weeks — Delete confirmations, status transitions                                       |
| `PageHeader`     | `composites/PageHeader.tsx`     | ✅ All weeks — Page headers                                                                   |
| `StatCard`       | `composites/StatCard.tsx`       | ✅ Dashboard widgets                                                                          |
| `EmptyState`     | `composites/EmptyState.tsx`     | ✅ Empty lists                                                                                |
| `Sheet`          | `primitives/Sheet.tsx`          | ✅ Side panels (appointment detail, tooth detail)                                             |
| `Tabs`           | `primitives/Tabs.tsx`           | ✅ Patient detail tabs, settings tabs                                                         |
| `Badge`          | `primitives/Badge.tsx`          | ✅ Status badges everywhere                                                                   |

### MISSING UI Components (Phase 3 Required)

| Component         | Week | Description                                                                          |
| :---------------- | :--: | :----------------------------------------------------------------------------------- |
| `DentalChartMini` |  10  | Reusable mini dental chart for treatment plans, patient overview                     |
| `ImagingLinker`   |  11  | Reusable component to link x-rays/CBCTs to teeth/treatment plans                     |
| `FiveSurfaceSVG`  |  10  | SVG component for 5-surface tooth detail (mesial, distal, occlusal, buccal, lingual) |
| `SignatureWidget` |  12  | Canvas-based signature capture for consent forms                                     |
| `StatusFlow`      |  10  | Reusable status transition visualization (treatment plan, lab order, etc.)           |
| `FileUploader`    |  11  | S3 presigned URL upload with progress, magic-bytes validation                        |
| `ImageViewer`     |  11  | Lightbox/zoom viewer for x-rays and CBCT scans                                       |
| `ChatBubble`      |  12  | Message bubble component for staff chat                                              |
| `RichTextEditor`  |  10  | For procedure notes, treatment plan descriptions                                     |
| `PrintLayout`     |  10  | Print-optimized layout wrapper for documents                                         |
| `TimeSlotPicker`  |  9   | Visual slot selection for booking interface                                          |

---

## 7. Supporting Infrastructure (Already Built)

### ✅ Ready for Phase 3

| Component                   | Location                                                  |                                                      Readiness                                                      |
| :-------------------------- | :-------------------------------------------------------- | :-----------------------------------------------------------------------------------------------------------------: |
| **PII Encryption**          | `apps/api/src/utils/encryption.ts`                        |                        ✅ AES-256-GCM encrypt/decrypt — needs wiring into patient save/read                         |
| **Audit Logger Middleware** | `apps/api/src/tenant/middleware/audit-logger.ts`          | ✅ Pre-handler + onResponse hooks. Logs mutations to Pino. Missing: MongoDB storage model for persistent audit logs |
| **Auth Guard**              | `apps/api/src/tenant/middleware/auth-guard.ts`            |                                                 ✅ JWT verification                                                 |
| **Role Guard**              | `apps/api/src/tenant/middleware/role-guard.ts`            |                                          ✅ RBAC for 28 modules × 8 roles                                           |
| **Tenant DB Isolation**     | `apps/api/src/tenant/middleware/tenant-db.ts`             |                                          ✅ Per-tenant MongoDB connection                                           |
| **Input Sanitizer**         | `apps/api/src/tenant/middleware/input-sanitizer.ts`       |                                            ✅ NoSQL injection prevention                                            |
| **Brute Force Protection**  | `apps/api/src/tenant/middleware/brute-force.ts`           |                                               ✅ Progressive lockout                                                |
| **Socket.io Plugin**        | `apps/api/src/plugins/socket.plugin.ts`                   |                     ✅ Redis adapter, typed events, room management — ready for chat (Week 12)                      |
| **Notification Service**    | `apps/api/src/services/notification.service.ts`           |                                     ✅ Service layer for sending notifications                                      |
| **Recurring Appointments**  | `apps/api/src/services/recurring-appointments.service.ts` |                                            ✅ Recurring pattern support                                             |
| **Shared Types System**     | `packages/shared/src/types/`                              |                      ✅ 16 type files including socket, notification, branding, webhook types                       |
| **API Response Utility**    | `apps/api/src/utils/api-response.ts`                      |                                              ✅ Standardized responses                                              |

---

## 8. Shared Types Relevant to Phase 3

### EXISTING Types (`packages/shared/src/types/`)

| File                    | Phase 3 Use                                                                         |
| :---------------------- | :---------------------------------------------------------------------------------- |
| `socket.types.ts`       | ✅ Chat (Week 12), real-time updates                                                |
| `notification.types.ts` | ✅ Week 13 — notification categories, triggers, channels                            |
| `branding.types.ts`     | ✅ Week 12 — IClinicHeaderData for document templates                               |
| `webhook.types.ts`      | ✅ Week 13 — webhook event types                                                    |
| `report.types.ts`       | ⚠️ Includes clinical report types (procedures_performed, treatment_plan_acceptance) |
| `pricing.types.ts`      | ⚠️ Includes `dental-charting` module slug                                           |

### MISSING Types

| Type File                 | Week  | Content Needed                                                    |
| :------------------------ | :---: | :---------------------------------------------------------------- |
| `dental-chart.types.ts`   |  10   | ITooth, IToothCondition, IChartSnapshot, IFiveSurface             |
| `treatment-plan.types.ts` |  10   | ITreatmentPlanItem, TPStatus transitions                          |
| `clinical.types.ts`       | 10–11 | IProcedureNote, IPrescription, IPrescriptionItem                  |
| `imaging.types.ts`        |  11   | IXray, ICbct, IImagingLink                                        |
| `lab-order.types.ts`      |  12   | ILabOrder, ILabOrderItem, IDentalLab                              |
| `service.types.ts`        |  12   | IService, IServiceCategory                                        |
| `chat.types.ts`           |  12   | IChatChannel, IChatMessage (Socket events may already cover some) |
| `schedule.types.ts`       |   9   | IBranchHours, ISlot, IBookingRequest                              |
| `consent.types.ts`        |  12   | IConsentTemplate, IConsentForm                                    |
| `custom-field.types.ts`   |  13   | ICustomFieldDef, ICustomFieldValue                                |
| `workflow.types.ts`       |  13   | IWorkflowRule, IWorkflowAction                                    |

---

## 9. Gap Analysis Summary

| Category           |   Existing   |    Missing    | % Ready  |
| :----------------- | :----------: | :-----------: | :------: |
| API Models         |      12      |      24       |   33%    |
| API Routes         |      12      |      19       |   39%    |
| Shared Schemas     |      4       |      16       |   20%    |
| Admin Features     |      11      |      11       |   50%    |
| Constants          |  8 defined   |  13 missing   |   38%    |
| UI Components      |  12 usable   |  11 missing   |   52%    |
| Shared Types       |  6 relevant  |  11 missing   |   35%    |
| **Infrastructure** | **12 ready** | **0 missing** | **100%** |

---

## 10. Week 8 — Suggested Implementation Order

Week 8 has the **highest readiness** (~75%). Here's what remains to finish it completely:

### Day 1–2: Harden Patient CRUD

|  #  | Task                                       | Details                                                                                                                                                                           | Files                                   |
| :-: | :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------- |
|  1  | **Wire PII encryption** into patient model | `encryptField()` on save for nationalId, call `decryptField()` on read. The utility exists (`encryption.ts`), just needs pre-save hooks in `patient.model.ts`                     | `patient.model.ts`, `patients.route.ts` |
|  2  | **Patient Detail tabs**                    | Add placeholder tabs for Dental Chart, X-Rays, Treatment Plans, Billing in `PatientDetailPage.tsx`. These will be populated in weeks 10–11 but the tab structure should exist now | `PatientDetailPage.tsx`                 |
|  3  | **Patient search**                         | Verify full-text search on `firstName.en`, `lastName.en`, `phone`, `patientCode` works correctly                                                                                  | `patients.route.ts`, `usePatients.ts`   |

### Day 2–3: Appointment Calendar Enhancements

|  #  | Task                             | Details                                                                                                                                                                                                    | Files                                                        |
| :-: | :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
|  4  | **Schedule validation (3-tier)** | Implement: (1) Branch working hours check, (2) Doctor schedule check (from `doctor.model.ts` schedules[]), (3) Existing appointment conflict check. Add validation to `createAppointmentSchema` processing | `appointments.route.ts`, new `schedule-validator.ts` service |
|  5  | **Appointment drag & drop**      | Enhance `AppointmentCalendar.tsx` with FullCalendar eventDrop/eventResize handlers → call update endpoint                                                                                                  | `AppointmentCalendar.tsx`, `useAppointments.ts`              |
|  6  | **Status transition validation** | Enforce valid status transitions server-side (e.g., can't go from `completed` → `booked`)                                                                                                                  | `appointments.route.ts`                                      |

### Day 3–4: Appointment Types & Waitlist Polish

|  #  | Task                                   | Details                                                                                                                    | Files                                   |
| :-: | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------- |
|  7  | **Appointment type color in calendar** | Ensure calendar events render with the appointment type's color from `appointment-types`                                   | `AppointmentCalendar.tsx`               |
|  8  | **Waitlist → Appointment conversion**  | When a slot opens, offer it to waitlist patients (sorted by priority/date). Button to convert waitlist entry → appointment | `waitlist.route.ts`, `WaitlistPage.tsx` |
|  9  | **Waitlist expiry job**                | Auto-expire waitlist entries past their `expiresAt` date (BullMQ cron or route-level check)                                | New `waitlist-cleanup.service.ts`       |

### Day 4–5: Integration & Testing

|  #  | Task                            | Details                                                                               | Files                             |
| :-: | :------------------------------ | :------------------------------------------------------------------------------------ | :-------------------------------- |
| 10  | **End-to-end flow test**        | Patient create → Appointment book (with schedule validation) → Status flow → Complete | Manual + Vitest integration tests |
| 11  | **PII encryption verification** | Verify nationalId is encrypted in MongoDB, decrypted on API response                  | Test with DB inspection           |
| 12  | **Audit log verification**      | Verify all patient/appointment mutations produce audit entries                        | Check Pino logs                   |

### Week 8 Dependencies Already Satisfied

- ✅ Patient model + schema + routes (exist)
- ✅ Appointment model + schema + routes (exist)
- ✅ Appointment types model + schema + routes (exist)
- ✅ Waitlist model + schema + routes (exist)
- ✅ Doctor model with schedules[] and exceptions[] (exist)
- ✅ Encryption utility (exists, needs wiring)
- ✅ Audit logger middleware (exists)
- ✅ Auth guard + Role guard (exist)
- ✅ Admin UI pages for all 4 entities (exist)
- ✅ Shared constants: APPOINTMENT_STATUSES, TOOTH_CONDITIONS (exist)

### Week 8 New Code Estimate

| Category                                  |              Files              | LOC Estimate |
| :---------------------------------------- | :-----------------------------: | :----------: |
| Schedule validation service               |                1                |     ~150     |
| PII encryption wiring                     | 2 (model + route modifications) |     ~50      |
| Calendar enhancements (drag/drop, colors) |                2                |     ~100     |
| Patient detail tabs                       |                1                |     ~80      |
| Waitlist improvements                     |                2                |     ~100     |
| Status transition logic                   |                1                |     ~60      |
| Tests                                     |               2–3               |     ~200     |
| **Total new code**                        |          **~12 files**          | **~740 LOC** |

---

## 11. Key Risks & Recommendations

| Risk                                              | Severity  | Mitigation                                                                                                                  |
| :------------------------------------------------ | :-------: | :-------------------------------------------------------------------------------------------------------------------------- |
| **Dental Chart is the biggest unknown** (Week 10) |  🔴 High  | Spike `react-odontogram` integration early. Build the model first — the UI is the hard part.                                |
| **Socket.io Chat** (Week 12) is complex           | 🟡 Medium | Socket plugin exists with Redis adapter. Focus on channel model + message persistence first, then UI.                       |
| **S3 file upload** for imaging (Week 11)          | 🟡 Medium | No S3 integration exists yet. Need presigned URL generation, magic-bytes validation, EXIF stripping. Plan a half-day spike. |
| **2FA/TOTP** (Week 13) is security-critical       | 🟡 Medium | Use `otplib` + `qrcode`. Add optional per-user, with backup codes. ~1 day integration.                                      |
| **BullMQ job infrastructure** (Week 13)           | 🟡 Medium | No BullMQ setup exists. Need: connection, queue definitions, worker process. Half-day setup.                                |
| **24 missing models** across 6 weeks              | 🟡 Medium | Average 4 models/week. Week 10 (dental chart, treatment plan, procedure note) is the heaviest.                              |

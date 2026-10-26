# Weeks 8–11: Complete Requirements Extraction

> **Source Documents:** All 8 files from `docs/planning/`
> **Generated:** June 2025
> **Purpose:** Single reference for implementing Weeks 8–11 (Phase 3 Core Clinical)

---

## Table of Contents

- [Week 8: Patient Management & Appointments Start](#week-8-patient-management--appointments-start)
- [Week 9: Scheduling, Branches & Online Booking](#week-9-scheduling-branches--online-booking)
- [Week 10: Dental Charts, Treatment Plans & Procedure Notes](#week-10-dental-charts-treatment-plans--procedure-notes)
- [Week 11: X-Rays, CBCT, Clinical Cross-Linking, Prescriptions & Medications](#week-11-x-rays-cbct-clinical-cross-linking-prescriptions--medications)

---

## Week 8: Patient Management & Appointments Start

### 8.1 Patients — CRUD, Search, Tabs

**Source:** IMPLEMENTATION_ROADMAP.md (Week 8), V2_DATABASE.md §5.1, V2_STRUCTURE.md, BUILD_RULES.md §8–9

#### Database: `patients` Collection (Tenant DB)

| Field                     | Type                            | Notes                                                                                                                        | Source                           |
| ------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `patientCode`             | String                          | Auto-generated `"DEN-000001"`, unique per tenant                                                                             | V2_DATABASE §5.1                 |
| `firstName`               | `{ en: String, ar: String }`    | Bilingual                                                                                                                    | V2_DATABASE §5.1                 |
| `lastName`                | `{ en: String, ar: String }`    | Bilingual                                                                                                                    | V2_DATABASE §5.1                 |
| `dateOfBirth`             | Date                            | Required                                                                                                                     | V2_DATABASE §5.1                 |
| `gender`                  | String                          | Enum: `male \| female`                                                                                                       | V2_DATABASE §5.1                 |
| `nationalId`              | String                          | 🔒 **AES-256-GCM encrypted**                                                                                                 | V2_DATABASE §5.1, SECURITY §5.3  |
| `phone`                   | String                          | Required                                                                                                                     | V2_DATABASE §5.1                 |
| `email`                   | String \| null                  | Optional, sparse index                                                                                                       | V2_DATABASE §5.1                 |
| `address`                 | `{ en: String, ar: String }`    | Bilingual                                                                                                                    | V2_DATABASE §5.1                 |
| `city`                    | String                          |                                                                                                                              | V2_DATABASE §5.1                 |
| `country`                 | String                          |                                                                                                                              | V2_DATABASE §5.1                 |
| `emergencyContact`        | `{ name, phone, relationship }` | Embedded                                                                                                                     | V2_DATABASE §5.1                 |
| `allergies[]`             | Embedded Array                  | `{ allergen, reaction, severity, notedAt }`                                                                                  | V2_DATABASE §5.1                 |
| `medicalHistory`          | Embedded Object                 | 18+ boolean fields + `currentMedications[]` + `additionalNotes`                                                              | V2_DATABASE §5.1                 |
| `familyLinks[]`           | Embedded Array                  | `{ relatedPatientId, relationship, isPrimaryContact }`                                                                       | V2_DATABASE §5.1                 |
| `insurance[]`             | Embedded Array                  | `{ insuranceCompanyId, policyNumber`🔒`, groupNumber, memberId, coverageType, coveragePercentage, maxCoverage, deductible }` | V2_DATABASE §5.1                 |
| `source`                  | String                          | Enum: `walk_in \| referral \| online \| phone \| other`                                                                      | V2_DATABASE §5.1                 |
| `preferredLanguage`       | String                          | `en \| ar`                                                                                                                   | V2_DATABASE §5.1                 |
| `isActive`                | Boolean                         | Soft-delete pattern                                                                                                          | V2_DATABASE §5.1, BUILD_RULES §6 |
| `createdAt` / `updatedAt` | Date                            | Mongoose timestamps                                                                                                          | V2_DATABASE §5.1                 |

#### Indexes

| Index                                                                                   | Purpose              | Source            |
| --------------------------------------------------------------------------------------- | -------------------- | ----------------- |
| `{ patientCode: 1 }` unique                                                             | Lookup by code       | V2_DATABASE §5.1  |
| `{ phone: 1 }`                                                                          | Phone search         | V2_DATABASE §5.1  |
| `{ "firstName.en": "text", "lastName.en": "text", phone: "text" }` (weights: 10, 10, 5) | Full-text search     | V2_DATABASE §12.3 |
| `{ email: 1 }` sparse                                                                   | Email lookup         | V2_DATABASE §5.1  |
| `{ nationalId: 1 }` sparse                                                              | National ID lookup   | V2_DATABASE §5.1  |
| `{ isActive: 1, createdAt: -1 }`                                                        | Active patients list | V2_DATABASE §5.1  |

#### 🔒 PII Encryption

| Field                               | Method      | Source                         |
| ----------------------------------- | ----------- | ------------------------------ |
| `patients.nationalId`               | AES-256-GCM | SECURITY §5.3, BUILD_RULES §16 |
| `patients.insurance[].policyNumber` | AES-256-GCM | SECURITY §5.3, BUILD_RULES §16 |
| `patients.medicalHistory.notes`     | AES-256-GCM | SECURITY §5.3                  |

**Encryption architecture:** `encryptField(value, tenantKey)` → ciphertext. Key derivation: `tenantKey = HKDF(masterKey, tenantId + salt)`. IV: 12 bytes random per encryption. AuthTag: 16 bytes. Format: `iv:authTag:ciphertext` (Base64). — SECURITY §5.3, V2_DATABASE §13.2

#### Frontend Structure

| Component / Page                                 | Route / Location             | Source                                      |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------- |
| `PatientListPage`                                | `/patients`                  | V2_STRUCTURE, IMPLEMENTATION_ROADMAP Week 8 |
| `PatientDetailPage`                              | `/patients/:id`              | V2_STRUCTURE                                |
| Tabs: Info / History / Charts / X-Rays / Billing | Nested within detail         | IMPLEMENTATION_ROADMAP Week 8               |
| `PatientForm` (create/edit)                      | Modal or `/patients/new`     | V2_STRUCTURE                                |
| `AllergyForm`                                    | Embedded in patient form     | V2_STRUCTURE                                |
| `MedicalHistoryForm`                             | Embedded in patient form     | V2_STRUCTURE                                |
| `PatientInsurance`                               | Embedded in patient form     | V2_STRUCTURE                                |
| `usePatients` hook                               | React Query + TanStack Table | BUILD_RULES §8                              |
| `usePatientDetail` hook                          | React Query                  | BUILD_RULES §8                              |

**Frontend patterns (mandatory):**

- React Hook Form + `zodResolver` for all forms — BUILD_RULES §8
- Zod schemas with `.strict()` shared from `@dento/shared` — BUILD_RULES §7
- Server-side pagination (manual, NOT TanStack auto) — BUILD_RULES §9
- `TableSkeleton` for loading, `ErrorState` for errors, `EmptyState` for no data — BUILD_RULES §15
- Logical CSS properties only (`ms-`/`me-`/`ps-`/`pe-`) — BUILD_RULES §11
- All form field names must match API field names end-to-end — BUILD_RULES §24

#### API Endpoints

| Method | Route                  | Description                      | Source              |
| ------ | ---------------------- | -------------------------------- | ------------------- |
| GET    | `/api/v1/patients`     | List (paginated, search, filter) | V2_DECISION_LOG §21 |
| POST   | `/api/v1/patients`     | Create                           | V2_DECISION_LOG §21 |
| GET    | `/api/v1/patients/:id` | Detail                           | V2_DECISION_LOG §21 |
| PUT    | `/api/v1/patients/:id` | Update                           | V2_DECISION_LOG §21 |
| DELETE | `/api/v1/patients/:id` | Soft-delete (`isActive: false`)  | BUILD_RULES §6      |

**Backend patterns:**

- Model Factory: `getPatientModel(connection)` — BUILD_RULES §5
- Service Layer: `new PatientService(connection)` — BUILD_RULES §5
- 3-layer validation: Zod FE → Zod BE → Mongoose — BUILD_RULES §16
- Tenant isolation: `mongoose.connection.useDb(\`tenant\_\${slug}\`)` — SECURITY §13.5, BUILD_RULES §5
- Audit logging on create/update/delete — BUILD_RULES §16, SECURITY §10.1

#### Webhook Events

| Event             | Source          |
| ----------------- | --------------- |
| `patient.created` | BUILD_RULES §23 |
| `patient.updated` | BUILD_RULES §23 |
| `patient.deleted` | BUILD_RULES §23 |

#### RBAC Permissions

| Permission        | Roles                                               | Source        |
| ----------------- | --------------------------------------------------- | ------------- |
| `patients.view`   | dentist, receptionist, assistant (read-only), admin | SECURITY §4.3 |
| `patients.create` | dentist, receptionist, admin                        | SECURITY §4.3 |
| `patients.update` | dentist, receptionist, admin                        | SECURITY §4.3 |
| `patients.delete` | admin                                               | SECURITY §4.3 |

---

### 8.2 Appointment Calendar & CRUD

**Source:** IMPLEMENTATION_ROADMAP.md (Week 8), V2_DATABASE.md §6.1, V2_DECISION_LOG §25, MASTER_PLAN §18, §22

#### Database: `appointments` Collection (Tenant DB)

| Field                                                                | Type              | Notes                                                                                                     | Source                                |
| -------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `patientId`                                                          | ObjectId          | → patients                                                                                                | V2_DATABASE §6.1                      |
| `doctorId`                                                           | ObjectId          | → doctors                                                                                                 | V2_DATABASE §6.1                      |
| `branchId`                                                           | ObjectId          | → branches                                                                                                | V2_DATABASE §6.1                      |
| `serviceId`                                                          | ObjectId \| null  | → services                                                                                                | V2_DATABASE §6.1                      |
| `appointmentTypeId`                                                  | ObjectId \| null  | → appointment_types                                                                                       | V2_DATABASE §6.1                      |
| `date`                                                               | Date              | Date only (no time)                                                                                       | V2_DATABASE §6.1                      |
| `startTime` / `endTime`                                              | String            | `"HH:mm"` format                                                                                          | V2_DATABASE §6.1                      |
| `durationMinutes`                                                    | Number            | Computed or explicit                                                                                      | V2_DATABASE §6.1                      |
| `chairNumber`                                                        | Number \| null    | Chair assignment                                                                                          | V2_DATABASE §6.1                      |
| `status`                                                             | String            | Enum: `booked \| confirmed \| arrived \| in_progress \| completed \| no_show \| cancelled \| rescheduled` | V2_DATABASE §6.1, V2_DECISION_LOG §22 |
| `type`                                                               | String            | Enum: `consultation \| followup \| treatment \| emergency \| checkup`                                     | V2_DATABASE §6.1                      |
| `reason`                                                             | String \| null    | Patient reason                                                                                            | V2_DATABASE §6.1                      |
| `notes`                                                              | String \| null    | General notes                                                                                             | V2_DATABASE §6.1                      |
| `internalNotes`                                                      | String \| null    | Staff-only notes                                                                                          | V2_DATABASE §6.1                      |
| `source`                                                             | String            | Enum: `manual \| online \| phone \| recurring \| walk_in`                                                 | V2_DATABASE §6.1                      |
| `isReminderSent` / `reminderSentAt`                                  | Boolean / Date    | Notification tracking                                                                                     | V2_DATABASE §6.1                      |
| `consultationFee`                                                    | Number \| null    |                                                                                                           | V2_DATABASE §6.1                      |
| `isPaid`                                                             | Boolean           |                                                                                                           | V2_DATABASE §6.1                      |
| `cancelledBy` / `cancelledReason`                                    | ObjectId / String | Cancellation tracking                                                                                     | V2_DATABASE §6.1                      |
| `rescheduledTo`                                                      | ObjectId \| null  | → appointments (new)                                                                                      | V2_DATABASE §6.1                      |
| `arrivedAt` / `startedAt` / `completedAt`                            | Date \| null      | Timing tracking (NEW v2)                                                                                  | V2_DATABASE §6.1, MASTER_PLAN §18     |
| `recurringRuleId` / `occurrenceIndex` / `seriesTotal` / `isModified` | Mixed             | Recurring appointment fields                                                                              | V2_DATABASE §6.5, MASTER_PLAN §19     |

#### Indexes

| Index                                    | Purpose                      | Source                  |
| ---------------------------------------- | ---------------------------- | ----------------------- |
| `{ date: 1, doctorId: 1, startTime: 1 }` | Calendar day view per doctor | V2_DATABASE §6.1, §12.1 |
| `{ patientId: 1, date: -1 }`             | Patient appointment history  | V2_DATABASE §6.1        |
| `{ branchId: 1, date: 1, status: 1 }`    | Branch dashboard             | V2_DATABASE §6.1, §12.1 |
| `{ status: 1, date: 1 }`                 | Status filter                | V2_DATABASE §6.1        |
| `{ doctorId: 1, date: 1, status: 1 }`    | Double-booking constraint    | V2_DATABASE §6.1        |

#### FullCalendar Integration

| Aspect      | Detail                                                                                               | Source                                      |
| ----------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Package     | `@fullcalendar/react` 6.x (MIT free)                                                                 | TECH_REQUIREMENTS §3.2, V2_DECISION_LOG §25 |
| Plugins     | `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`, `@fullcalendar/list` | TECH_REQUIREMENTS §3.2                      |
| License     | **Free (MIT)** — NO Pro features needed                                                              | V2_DECISION_LOG §25                         |
| RTL         | Built-in RTL support via `direction` prop                                                            | BUILD_RULES §11                             |
| Chair view  | Custom CSS Grid component (~200 lines), NOT FullCalendar Pro resource view                           | V2_DECISION_LOG §25                         |
| Views       | Day, Week, Month, List                                                                               | V2_DECISION_LOG §25                         |
| Drag & drop | Supported in free version                                                                            | V2_DECISION_LOG §25                         |

#### Frontend Structure

| Component / Page                                             | Source       |
| ------------------------------------------------------------ | ------------ |
| `AppointmentPage` (`/appointments`) — FullCalendar + sidebar | V2_STRUCTURE |
| `AppointmentForm` — create/edit modal                        | V2_STRUCTURE |
| `AppointmentCard` — event rendering                          | V2_STRUCTURE |
| `WaitlistPanel` — sidebar panel                              | V2_STRUCTURE |
| `useAppointments` hook                                       | V2_STRUCTURE |
| `useSlots` hook                                              | V2_STRUCTURE |

#### 3-Level Schedule Validation

Every appointment (internal or external) must pass:

1. **Branch level:** Is branch open on that day? Is it a holiday? Is time within `workHours` (or `ramadanHours`)? — MASTER_PLAN §22
2. **Doctor level:** Does doctor have a schedule at that branch on that day? Is time within doctor's `startTime`–`endTime`? Is there an approved exception (vacation, sick)? — MASTER_PLAN §22
3. **Appointment level:** No overlap with existing appointments for same doctor or chair — MASTER_PLAN §22

**Implementation:** `validateAppointment()` function in Fastify service layer — MASTER_PLAN §22 (complete code provided)

#### API Endpoints

| Method | Route                             | Description                                           | Source              |
| ------ | --------------------------------- | ----------------------------------------------------- | ------------------- |
| GET    | `/api/v1/appointments`            | List (paginated, filter by date/doctor/branch/status) | V2_DECISION_LOG §21 |
| POST   | `/api/v1/appointments`            | Create (runs validation)                              | V2_DECISION_LOG §21 |
| GET    | `/api/v1/appointments/:id`        | Detail                                                | V2_DECISION_LOG §21 |
| PUT    | `/api/v1/appointments/:id`        | Update                                                | V2_DECISION_LOG §21 |
| PATCH  | `/api/v1/appointments/:id/status` | Status change only                                    | V2_DECISION_LOG §21 |

#### Webhook Events

| Event                   | Source          |
| ----------------------- | --------------- |
| `appointment.booked`    | BUILD_RULES §23 |
| `appointment.confirmed` | BUILD_RULES §23 |
| `appointment.cancelled` | BUILD_RULES §23 |
| `appointment.completed` | BUILD_RULES §23 |
| `appointment.no_show`   | BUILD_RULES §23 |

#### RBAC

| Permission            | Roles                                 | Source          |
| --------------------- | ------------------------------------- | --------------- |
| `appointments.view`   | all staff                             | SECURITY §4.3   |
| `appointments.create` | dentist, receptionist, admin          | SECURITY §4.3   |
| `appointments.update` | dentist, receptionist, admin          | SECURITY §4.3   |
| `appointments.own`    | dentist (sees own only for row-level) | BUILD_RULES §17 |

---

### 8.3 Appointment Types

**Source:** V2_DATABASE.md §6.6

#### Database: `appointment_types` Collection (Tenant DB)

| Field                    | Type                         | Notes                  |
| ------------------------ | ---------------------------- | ---------------------- |
| `name`                   | `{ en: String, ar: String }` | Bilingual              |
| `code`                   | String                       | Short code             |
| `defaultDuration`        | Number                       | Minutes                |
| `color`                  | String                       | Hex color for calendar |
| `icon`                   | String \| null               | Icon name              |
| `isDoctorRequired`       | Boolean                      |                        |
| `isOnlineBookingAllowed` | Boolean                      |                        |
| `defaultFee`             | Number \| null               |                        |
| `isActive`               | Boolean                      | Soft-delete            |
| `sortOrder`              | Number                       |                        |

---

### 8.4 Waitlist

**Source:** V2_DATABASE.md §6.5

#### Database: `appointment_waitlist` Collection (Tenant DB)

| Field              | Type             | Notes                                                        |
| ------------------ | ---------------- | ------------------------------------------------------------ |
| `patientId`        | ObjectId         | → patients                                                   |
| `doctorId`         | ObjectId \| null | Preferred doctor                                             |
| `preferredDates[]` | Date[]           |                                                              |
| `preferredTimes[]` | String[]         |                                                              |
| `flexibility`      | String           | Enum: `strict \| flexible \| any`                            |
| `priority`         | String           | Enum: `normal \| high \| urgent`                             |
| `status`           | String           | Enum: `waiting \| offered \| booked \| expired \| cancelled` |
| `expiresAt`        | Date             | Auto-expire                                                  |

---

### 8.5 Walk-in Queue (Foundational)

**Source:** MASTER_PLAN §18, V2_DATABASE.md §6.4

#### Database: `walk_in_queue` Collection (Tenant DB)

| Field                                                    | Type             | Notes                                                                         |
| -------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `branchId`                                               | ObjectId         | → branches                                                                    |
| `queueNumber`                                            | Number           | Auto-generated (atomic counter)                                               |
| `patientId`                                              | ObjectId \| null | null = new patient                                                            |
| `patientName`                                            | String           | For walk-ins without patient record                                           |
| `phone`                                                  | String           |                                                                               |
| `reason`                                                 | String \| null   |                                                                               |
| `priority`                                               | String           | Enum: `normal \| high \| urgent \| emergency`                                 |
| `status`                                                 | String           | Enum: `waiting \| called \| in_progress \| completed \| no_show \| cancelled` |
| `checkInTime` / `calledAt` / `startedAt` / `completedAt` | Date             | Timing tracking                                                               |
| `estimatedWaitMinutes`                                   | Number           | Calculated                                                                    |

**Real-time:** Socket.io replaces v1's 30-second polling — MASTER_PLAN §18

---

## Week 9: Scheduling, Branches & Online Booking

### 9.1 Doctor Schedules

**Source:** IMPLEMENTATION_ROADMAP.md (Week 9), V2_DATABASE.md §6.3, MASTER_PLAN §22

#### Database: `doctor_schedules` Collection (Tenant DB)

| Field                     | Type           | Notes                                         | Source                            |
| ------------------------- | -------------- | --------------------------------------------- | --------------------------------- |
| `doctorId`                | ObjectId       | → doctors                                     | V2_DATABASE §6.3                  |
| `branchId`                | ObjectId       | → branches                                    | V2_DATABASE §6.3                  |
| `scheduleType`            | String         | Enum: `recurring \| override`                 | MASTER_PLAN §22                   |
| `dayOfWeek`               | Number         | 0–6 (Sun–Sat), only for `recurring`           | V2_DATABASE §6.3                  |
| `specificDate`            | Date \| null   | Only for `override` type                      | MASTER_PLAN §22                   |
| `startTime`               | String         | `"HH:mm"` — MUST be within branch `workHours` | V2_DATABASE §6.3, MASTER_PLAN §22 |
| `endTime`                 | String         | `"HH:mm"` — MUST be within branch `workHours` | V2_DATABASE §6.3, MASTER_PLAN §22 |
| `breakStart` / `breakEnd` | String \| null | Optional break within work time               | MASTER_PLAN §22                   |
| `isActive`                | Boolean        |                                               | V2_DATABASE §6.3                  |
| `isRamadanSchedule`       | Boolean        | Separate Ramadan schedule                     | V2_DATABASE §6.3                  |
| `notes`                   | String \| null |                                               | MASTER_PLAN §22                   |

**Key decision:** `doctors.workingHours` JSONB field is **REMOVED** in v2. `doctor_schedules` is the **SINGLE SOURCE OF TRUTH** for doctor availability. — MASTER_PLAN §22

#### Server-side Constraints (validated at create/update):

1. `startTime < endTime`
2. `startTime >= branch.workHours[dayOfWeek].start`
3. `endTime <= branch.workHours[dayOfWeek].end`
4. Branch must not be closed on that day
5. No overlap with other schedules of the same doctor on same day
6. Doctor must be in `assignedBranches` of the branch

— MASTER_PLAN §22

---

### 9.2 Schedule Exceptions

**Source:** V2_DATABASE.md §6.3, MASTER_PLAN §22

#### Database: `schedule_exceptions` Collection (Tenant DB)

| Field                                 | Type             | Notes                                                                             |
| ------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `doctorId`                            | ObjectId         | → doctors                                                                         |
| `branchId`                            | ObjectId \| null | null = ALL branches of this doctor                                                |
| `exceptionType`                       | String           | Enum: `vacation \| sick_leave \| day_off \| conference \| special_hours \| other` |
| `startDate` / `endDate`               | Date             | Date range                                                                        |
| `specialStartTime` / `specialEndTime` | String \| null   | Only for `special_hours` type                                                     |
| `reason`                              | String \| null   |                                                                                   |
| `status`                              | String           | Enum: `pending \| approved \| rejected`                                           |
| `approvedBy`                          | ObjectId \| null |                                                                                   |
| `approvedAt`                          | Date \| null     |                                                                                   |
| `rejectionReason`                     | String \| null   |                                                                                   |

**Integration:** Approved leave requests auto-create `schedule_exceptions` — MASTER_PLAN §22

---

### 9.3 Slot Engine

**Source:** MASTER_PLAN §22 (complete implementation code provided)

The slot engine is the **central function** used by both internal (receptionist) and external (online booking) flows.

**`getAvailableSlots(branchId, doctorId, date, serviceDuration)`** — Steps:

1. **Branch check:** Is clinic open that day? (check `workHours` or `ramadanHours` if `isRamadanMode`)
2. **Holiday check:** Is it a branch holiday?
3. **Doctor schedule:** Get effective schedule (check for date-specific `override` first, then `recurring`)
4. **Exception check:** Is doctor on approved leave?
5. **Special hours check:** Any `special_hours` exception overriding normal times?
6. **Calculate effective work period** (considering special hours)
7. **Load existing appointments** for same doctor/branch/date (exclude cancelled/no_show)
8. **Generate slots** based on `slotDuration` + `bufferBetween`, skipping breaks and booked slots

**Returns:** `{ available, date, branchId, doctorId, workStart, workEnd, breakStart, breakEnd, slots[] }`

Each slot: `{ startTime, endTime, isAvailable }`

---

### 9.4 Online Booking API (4 Public Endpoints)

**Source:** IMPLEMENTATION_ROADMAP.md (Week 9), MASTER_PLAN §22

| #   | Method | Route                                                            | Description                             | Auth                  |
| --- | ------ | ---------------------------------------------------------------- | --------------------------------------- | --------------------- |
| 1   | GET    | `/api/v1/public/branches`                                        | Branches with opening hours             | API Key (`X-API-Key`) |
| 2   | GET    | `/api/v1/public/doctors?branchId=X`                              | Doctors at branch (featured + active)   | API Key               |
| 3   | GET    | `/api/v1/public/availability/slots?branchId=X&doctorId=Y&date=Z` | Available slots (uses same Slot Engine) | API Key               |
| 4   | POST   | `/api/v1/public/booking`                                         | Create appointment request              | API Key               |

**Online booking creates appointment with `status: 'pending_confirmation'`** — receptionist must confirm (or auto-confirm per branch setting). — MASTER_PLAN §22

**Rate limiting:** 30 requests/min per API key — MASTER_PLAN §22

**Online Booking Confirmation flow:**

- Receptionist can: ① Confirm (unchanged) ② Confirm with changes (date/time/doctor/branch/chair) ③ Reject (with reason + 3 alternative slots)
- Notifications: SMS + Email + WhatsApp at each status change
- Auto-confirm setting per branch: `branches.onlineBookingConfig.autoConfirm`

— MASTER_PLAN §22

---

### 9.5 Ramadan Mode

**Source:** MASTER_PLAN §22

- Branches have TWO sets of opening hours: `workHours` (normal) + `ramadanHours` (Ramadan)
- Toggle: `isRamadanMode` on branch settings
- When active: Slot Engine uses `ramadanHours` instead of `workHours`
- Doctor schedules must be validated against Ramadan hours
- Calendar shows "(Ramadan)" badge
- BullMQ cron job: Reminder 1 week before Ramadan start

---

### 9.6 Branch Holidays

**Source:** MASTER_PLAN §22, V2_DATABASE.md §11.4

- `branches.holidays[]` — array of `{ date, name: { en, ar } }`
- Per-branch configurable
- Blocks all booking on holiday dates
- Slot Engine returns `{ available: false, reason: 'holiday' }`

---

### 9.7 Branches

**Source:** V2_DATABASE.md §11.4, MASTER_PLAN §22

#### Database: `branches` Collection (Tenant DB)

| Field                      | Type                   | Notes                                                                                                                                                           |
| -------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                     | `{ en, ar }`           | Bilingual                                                                                                                                                       |
| `code`                     | String                 | Unique per tenant                                                                                                                                               |
| `address`                  | `{ en, ar }`           |                                                                                                                                                                 |
| `city` / `phone` / `email` | String                 |                                                                                                                                                                 |
| `chairs[]`                 | Embedded Array         | `{ number, name, isActive, equipmentType }` — v1 was separate table                                                                                             |
| `workHours`                | Object                 | `{ sunday: { start, end } \| null, ... }` — null = closed                                                                                                       |
| `ramadanHours`             | Object \| null         | Same structure as workHours                                                                                                                                     |
| `isRamadanMode`            | Boolean                | Toggle                                                                                                                                                          |
| `holidays[]`               | Embedded Array         | `{ date, name: { en, ar } }`                                                                                                                                    |
| `slotConfig`               | Embedded Object        | `{ defaultDuration, minDuration, maxDuration, bufferBetween, bookingLeadTime, bookingWindowDays }`                                                              |
| `onlineBookingConfig`      | Embedded Object        | `{ autoConfirm, autoConfirmLeadTimeHours, requirePatientPhone, requirePatientEmail, allowDoctorSelection, enabledServices[], confirmationMessage: { en, ar } }` |
| `coordinates`              | `{ lat, lng }` \| null | Optional geospatial                                                                                                                                             |
| `isPrimary` / `isActive`   | Boolean                |                                                                                                                                                                 |

**Indexes:** `{ code: 1 }` unique, `{ isActive: 1 }`, `{ coordinates: "2dsphere" }` — V2_DATABASE §11.4, §12.4

---

### 9.8 Doctors

**Source:** V2_DATABASE.md §6.2, MASTER_PLAN §13

#### Database: `doctors` Collection (Tenant DB)

| Field                                  | Type           | Notes            |
| -------------------------------------- | -------------- | ---------------- |
| `userId`                               | ObjectId       | → platform users |
| `name` / `title` / `specialty` / `bio` | `{ en, ar }`   | All bilingual    |
| `photoUrl`                             | String \| null | S3/R2            |
| `gender`                               | String         |                  |
| `licenseNumber`                        | String         |                  |
| `specializations[]`                    | String[]       |                  |
| `qualifications[]`                     | String[]       |                  |
| `experienceYears`                      | Number         |                  |
| `certificates[]`                       | Embedded Array |                  |
| `consultationFee`                      | Number         |                  |
| `commissionRate`                       | Number         | Percentage       |
| `assignedBranches[]`                   | ObjectId[]     | → branches       |
| `primaryBranchId`                      | ObjectId       |                  |
| `isFeatured` / `isActive`              | Boolean        |                  |
| `displayOrder`                         | Number         |                  |

---

### 9.9 Staff Schedules & Shifts

**Source:** IMPLEMENTATION_ROADMAP.md (Week 9), MASTER_PLAN §22, V2_DATABASE.md §9.1–9.2

#### `staff_schedules` Collection

| Field                     | Type             | Notes                                                  |
| ------------------------- | ---------------- | ------------------------------------------------------ |
| `userId`                  | ObjectId         | Non-doctor staff                                       |
| `branchId`                | ObjectId         |                                                        |
| `shiftTemplateId`         | ObjectId \| null | → shift_templates                                      |
| `scheduleDate`            | Date             | Specific date                                          |
| `startTime` / `endTime`   | String           |                                                        |
| `breakStart` / `breakEnd` | String \| null   |                                                        |
| `status`                  | String           | Enum: `scheduled \| confirmed \| swapped \| cancelled` |
| `isPublished`             | Boolean          | Staff can see only when published                      |

#### `shift_templates` Collection

| Field                    | Type             | Notes                                                                 |
| ------------------------ | ---------------- | --------------------------------------------------------------------- |
| `name`                   | String           | e.g., "Morning Shift"                                                 |
| `startTime` / `endTime`  | String           |                                                                       |
| `breakDuration`          | Number           | Minutes                                                               |
| `shiftType`              | String           | Enum: `morning \| afternoon \| evening \| night \| full_day \| split` |
| `color`                  | String           | Hex                                                                   |
| `branchId`               | ObjectId \| null | null = global                                                         |
| `isDefault` / `isActive` | Boolean          |                                                                       |

**Seed templates:** Morning (08–16), Evening (14–22), Night (22–06), Half Day AM (08–12), Half Day PM (13–17) — MASTER_PLAN §22

**Key decision:** Doctor schedules and staff schedules are **SEPARATE systems** — doctor schedules are booking-relevant, staff schedules are HR/operations. — MASTER_PLAN §22

---

### 9.10 Leave Requests Part 1 + Leave↔Schedule Sync

**Source:** IMPLEMENTATION_ROADMAP.md (Week 9), MASTER_PLAN §22, V2_DATABASE.md §9.3

#### `leave_requests`, `leave_types`, `leave_balances` Collections

- `leave_types`: `{ name: {en, ar}, daysPerYear, isPaid, requiresApproval, maxDaysPerRequest, color, isActive }`
  - Seed: Annual (21d), Sick (14d), Emergency (5d), Maternity (90d), Unpaid
- `leave_requests`: `{ userId, leaveTypeId, startDate, endDate, daysCount, reason, status: pending|approved|rejected|cancelled, approvedBy, rejectionReason }`
- `leave_balances`: `{ userId, leaveTypeId, year, entitledDays, usedDays, carryForward }` — `remainingDays` computed

**Leave↔Schedule Sync:** Approved leave → auto-create `schedule_exception` — MASTER_PLAN §22

---

### 9.11 Settings — Appointment Configuration

**Source:** V2_DATABASE.md §11.1

Stored in `settings` collection with `key: "appointment"`:

```
slotDuration, bufferTime, maxAdvanceBookingDays, minCancellationHours,
autoConfirm, walkInEnabled, onlineBookingEnabled,
reminderHoursBefore: [24, 2],
workingDays: [0,1,2,3,4],  // Sun–Thu (Egypt)
workingHoursStart/End, ramadanScheduleActive, ramadanStart/End
```

---

### 9.12 Services Catalog

**Source:** V2_DATABASE.md §11.2

#### Database: `services` Collection (Tenant DB)

| Field                    | Type             | Notes                                                                |
| ------------------------ | ---------------- | -------------------------------------------------------------------- |
| `name` / `description`   | `{ en, ar }`     | Bilingual                                                            |
| `categoryId`             | ObjectId \| null | → service_categories                                                 |
| `code`                   | String \| null   | ADA/CDT code                                                         |
| `defaultPrice`           | Number           |                                                                      |
| `branchPrices[]`         | Embedded Array   | `{ branchId, price }` — branch-specific pricing                      |
| `defaultDuration`        | Number           | Minutes                                                              |
| `requiredMaterials[]`    | Embedded Array   | `{ itemId, quantity, isOptional }` — auto-reservation from inventory |
| `isActive` / `sortOrder` |                  |                                                                      |

**Text index:** `{ "name.en": "text", "description.en": "text" }` — V2_DATABASE §12.3

---

### 9.13 Week 9 UI Pages

| #   | Page                    | Route                         | Source          |
| --- | ----------------------- | ----------------------------- | --------------- |
| 1   | Schedule Overview       | `/schedules`                  | MASTER_PLAN §22 |
| 2   | Doctor Schedule Form    | `/schedules/doctor/assign`    | MASTER_PLAN §22 |
| 3   | Schedule Exception Form | `/schedules/exception/create` | MASTER_PLAN §22 |
| 4   | Staff Schedule          | `/schedules/staff`            | MASTER_PLAN §22 |
| 5   | Shift Templates         | `/schedules/shifts`           | MASTER_PLAN §22 |
| 6   | Attendance              | `/schedules/attendance`       | MASTER_PLAN §22 |
| 7   | Leave Requests          | `/schedules/leave`            | MASTER_PLAN §22 |
| 8   | Leave Request Form      | `/schedules/leave/new`        | MASTER_PLAN §22 |
| 9   | Leave Balances          | `/schedules/leave/balances`   | MASTER_PLAN §22 |
| 10  | Branch Hours            | `/settings/branch/:id/hours`  | MASTER_PLAN §22 |

### 9.14 Week 9 API Endpoints

| #     | Method              | Route                                                                                                              | Source          |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------- |
| 1     | GET                 | `/api/v1/schedules/doctor/:doctorId`                                                                               | MASTER_PLAN §22 |
| 2     | GET                 | `/api/v1/schedules/branch/:branchId`                                                                               | MASTER_PLAN §22 |
| 3     | POST                | `/api/v1/schedules/doctor`                                                                                         | MASTER_PLAN §22 |
| 4     | PATCH               | `/api/v1/schedules/doctor/:id`                                                                                     | MASTER_PLAN §22 |
| 5     | DELETE              | `/api/v1/schedules/doctor/:id`                                                                                     | MASTER_PLAN §22 |
| 6–9   | GET/POST/PATCH      | `/api/v1/schedules/exceptions[/:id][/approve]`                                                                     | MASTER_PLAN §22 |
| 10–13 | GET/POST/PATCH/POST | `/api/v1/schedules/staff[/:id][/publish]`                                                                          | MASTER_PLAN §22 |
| 14–17 | CRUD                | `/api/v1/schedules/shifts`                                                                                         | MASTER_PLAN §22 |
| 18–21 | GET/POST/PATCH/GET  | `/api/v1/leave/requests[/:id/approve]`, `/api/v1/leave/balances/:userId`                                           | MASTER_PLAN §22 |
| 22–24 | GET/POST/POST       | `/api/v1/attendance[/clock-in][/clock-out]`                                                                        | MASTER_PLAN §22 |
| 25–28 | Public endpoints    | `/api/v1/public/branches`, `/api/v1/public/doctors`, `/api/v1/public/availability/slots`, `/api/v1/public/booking` | MASTER_PLAN §22 |
| 29–30 | Online booking mgmt | `/api/v1/appointments/online`, `/api/v1/appointments/:id/confirm`                                                  | MASTER_PLAN §22 |

### 9.15 Week 9 RBAC

| Permission                     | Roles                               | Source          |
| ------------------------------ | ----------------------------------- | --------------- |
| `schedules.doctor.view`        | All staff                           | MASTER_PLAN §22 |
| `schedules.doctor.manage`      | admin, manager                      | MASTER_PLAN §22 |
| `schedules.staff.view`         | admin, manager, hr                  | MASTER_PLAN §22 |
| `schedules.staff.manage`       | admin, manager, hr                  | MASTER_PLAN §22 |
| `schedules.shifts.manage`      | admin, manager                      | MASTER_PLAN §22 |
| `schedules.exceptions.create`  | All staff (own)                     | MASTER_PLAN §22 |
| `schedules.exceptions.approve` | admin, manager                      | MASTER_PLAN §22 |
| `leave.request.create`         | All staff (own)                     | MASTER_PLAN §22 |
| `leave.request.approve`        | admin, manager, hr                  | MASTER_PLAN §22 |
| `leave.balances.view`          | admin/manager/hr (all), staff (own) | MASTER_PLAN §22 |
| `attendance.view`              | admin/manager/hr (all), staff (own) | MASTER_PLAN §22 |
| `attendance.manage`            | admin, manager, hr                  | MASTER_PLAN §22 |
| `branch.hours.manage`          | admin, manager                      | MASTER_PLAN §22 |

### 9.16 Week 9 Webhook Events

```
schedule.doctor.created / updated / deleted
schedule.exception.created / approved / rejected
schedule.staff.published
leave.request.created / approved / rejected
attendance.clock_in / clock_out
booking.online.created / confirmed / confirmed_changed / rejected / auto_confirmed / patient_notified
branch.hours.updated
branch.ramadan_mode.toggled
```

— MASTER_PLAN §22

---

## Week 10: Dental Charts, Treatment Plans & Procedure Notes

### 10.1 Dental Charts

**Source:** IMPLEMENTATION_ROADMAP.md (Week 10), V2_DATABASE.md §5.2–5.3, TECH_REQUIREMENTS.md §3.2

#### Database: `dental_charts` Collection (Tenant DB)

| Field             | Type            | Notes                                                                                                                                                     | Source           |
| ----------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `patientId`       | ObjectId        | → patients                                                                                                                                                | V2_DATABASE §5.2 |
| `toothNumber`     | Number          | 1–32 (Universal) or 11–48 (FDI)                                                                                                                           | V2_DATABASE §5.2 |
| `numberingSystem` | String          | Enum: `universal \| fdi`                                                                                                                                  | V2_DATABASE §5.2 |
| `condition`       | String          | Enum: `healthy \| cavity \| crown \| bridge \| implant \| missing \| rct \| filling \| extraction_needed \| periodontal \| veneer \| temporary \| pontic` | V2_DATABASE §5.2 |
| `surfaces[]`      | String[]        | e.g., `["mesial", "distal", "occlusal"]`                                                                                                                  | V2_DATABASE §5.2 |
| `perioData`       | Embedded Object | `{ pocketDepth[6], recession[6], bleedingOnProbing[6], mobility: 0–3, furcation: 0–3 }`                                                                   | V2_DATABASE §5.2 |
| `notes`           | String \| null  |                                                                                                                                                           | V2_DATABASE §5.2 |

**Index:** `{ patientId: 1, toothNumber: 1 }` unique — V2_DATABASE §5.2, §12.5

#### Database: `dental_chart_history` Collection (Tenant DB)

| Field        | Type           | Notes                        | Source           |
| ------------ | -------------- | ---------------------------- | ---------------- |
| `patientId`  | ObjectId       |                              | V2_DATABASE §5.3 |
| `chartData`  | Object         | Full snapshot of chart state | V2_DATABASE §5.3 |
| `notes`      | String \| null |                              | V2_DATABASE §5.3 |
| `recordedBy` | ObjectId       | → user who recorded          | V2_DATABASE §5.3 |
| `recordedAt` | Date           |                              | V2_DATABASE §5.3 |

#### Clinical Library: react-odontogram

| Aspect  | Detail                                 | Source                 |
| ------- | -------------------------------------- | ---------------------- |
| Package | `react-odontogram` 0.5.5+              | TECH_REQUIREMENTS §3.2 |
| Purpose | Interactive dental chart SVG component | TECH_REQUIREMENTS §3.2 |
| Usage   | Wrapper component `DentalChartWrapper` | V2_STRUCTURE           |

#### Frontend Components

| Component            | Description                            | Source                         |
| -------------------- | -------------------------------------- | ------------------------------ |
| `DentalChartPage`    | `/dental-charts/:patientId`            | V2_STRUCTURE                   |
| `DentalChartWrapper` | react-odontogram wrapper               | V2_STRUCTURE                   |
| `DentalChartMini`    | Compact version for patient detail tab | IMPLEMENTATION_ROADMAP Week 10 |
| `ToothDetailPanel`   | 5-surface SVG + severity + notes       | IMPLEMENTATION_ROADMAP Week 10 |
| `ChartHistory`       | Snapshot timeline                      | IMPLEMENTATION_ROADMAP Week 10 |
| `ChartPrint`         | Print view                             | IMPLEMENTATION_ROADMAP Week 10 |

---

### 10.2 Treatment Plans

**Source:** IMPLEMENTATION_ROADMAP.md (Week 10), V2_DATABASE.md §5.4, MASTER_PLAN §17

#### Database: `treatment_plans` Collection (Tenant DB)

| Field              | Type           | Notes                                                                                     | Source           |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------- | ---------------- |
| `patientId`        | ObjectId       | → patients                                                                                | V2_DATABASE §5.4 |
| `doctorId`         | ObjectId       | → doctors                                                                                 | V2_DATABASE §5.4 |
| `title`            | String         |                                                                                           | V2_DATABASE §5.4 |
| `description`      | String \| null |                                                                                           | V2_DATABASE §5.4 |
| `status`           | String         | Enum: `draft \| proposed \| accepted \| in_progress \| completed \| cancelled \| expired` | V2_DATABASE §5.4 |
| `items[]`          | Embedded Array | See below                                                                                 | V2_DATABASE §5.4 |
| `linkedXrays[]`    | ObjectId[]     | → xrays (plan-level cross-link)                                                           | V2_DATABASE §5.4 |
| `linkedCbcts[]`    | ObjectId[]     | → cbct_orders (plan-level cross-link)                                                     | V2_DATABASE §5.4 |
| `totalCost`        | Number         | Sum of items                                                                              | V2_DATABASE §5.4 |
| `discountType`     | String \| null | `percentage \| fixed`                                                                     | V2_DATABASE §5.4 |
| `discountValue`    | Number \| null |                                                                                           | V2_DATABASE §5.4 |
| `finalCost`        | Number         | After discount                                                                            | V2_DATABASE §5.4 |
| `patientSignature` | String \| null | Base64 (react-signature-canvas)                                                           | V2_DATABASE §5.4 |
| `signedAt`         | Date \| null   |                                                                                           | V2_DATABASE §5.4 |
| `validUntil`       | Date \| null   |                                                                                           | V2_DATABASE §5.4 |

#### Treatment Plan Items (Embedded)

Each item in `items[]`:

| Field               | Type             | Notes                                                           | Source                            |
| ------------------- | ---------------- | --------------------------------------------------------------- | --------------------------------- |
| `_id`               | ObjectId         | Auto-generated                                                  | V2_DATABASE §5.4                  |
| `serviceId`         | ObjectId         | → services                                                      | V2_DATABASE §5.4                  |
| `toothNumber`       | Number \| null   |                                                                 | V2_DATABASE §5.4                  |
| `surface`           | String \| null   |                                                                 | V2_DATABASE §5.4                  |
| `procedureName`     | String           |                                                                 | V2_DATABASE §5.4                  |
| `description`       | String \| null   |                                                                 | V2_DATABASE §5.4                  |
| `cost`              | Number           |                                                                 | V2_DATABASE §5.4                  |
| `sequenceOrder`     | Number           | Execution order                                                 | V2_DATABASE §5.4                  |
| `status`            | String           | Enum: `planned \| in_progress \| completed \| cancelled`        | V2_DATABASE §5.4                  |
| `appointmentId`     | ObjectId \| null |                                                                 | V2_DATABASE §5.4                  |
| `completedAt`       | Date \| null     |                                                                 | V2_DATABASE §5.4                  |
| `linkedXrays[]`     | ObjectId[]       | Item-level cross-links                                          | V2_DATABASE §5.4                  |
| `linkedCbcts[]`     | ObjectId[]       | Item-level cross-links                                          | V2_DATABASE §5.4                  |
| `requiredImaging[]` | Embedded Array   | `{ type, status, fulfilledByXrayId, fulfilledByCbctId, notes }` | V2_DATABASE §5.4, MASTER_PLAN §17 |
| `materials[]`       | Embedded Array   | `{ materialId, materialName, quantity, unit }`                  | V2_DATABASE §5.4                  |
| `notes`             | String \| null   |                                                                 | V2_DATABASE §5.4                  |

#### Indexes

| Index                                        | Purpose                   | Source           |
| -------------------------------------------- | ------------------------- | ---------------- |
| `{ patientId: 1, status: 1, createdAt: -1 }` | Patient treatment history | V2_DATABASE §5.4 |
| `{ doctorId: 1, status: 1 }`                 | Doctor's plans            | V2_DATABASE §5.4 |
| `{ "items.appointmentId": 1 }`               | Appointment link          | V2_DATABASE §5.4 |

#### Frontend Components

| Component             | Description                     | Source       |
| --------------------- | ------------------------------- | ------------ |
| `TreatmentPlanList`   | `/treatment-plans`              | V2_STRUCTURE |
| `TreatmentPlanDetail` | `/treatment-plans/:id`          | V2_STRUCTURE |
| `TreatmentPlanForm`   | Create/edit with embedded items | V2_STRUCTURE |
| `TreatmentItemRow`    | Individual item in plan         | V2_STRUCTURE |
| `StatusFlow`          | Visual status progression       | V2_STRUCTURE |

---

### 10.3 Procedure Notes

**Source:** IMPLEMENTATION_ROADMAP.md (Week 10), V2_DATABASE.md §5.5–5.6

#### Database: `procedure_notes` Collection (Tenant DB)

| Field                               | Type                   | Notes                                                                  | Source                            |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `patientId`                         | ObjectId               | → patients                                                             | V2_DATABASE §5.5                  |
| `doctorId`                          | ObjectId               | → doctors                                                              | V2_DATABASE §5.5                  |
| `appointmentId`                     | ObjectId \| null       | → appointments                                                         | V2_DATABASE §5.5                  |
| `treatmentPlanId`                   | ObjectId \| null       | → treatment_plans (v1 bug: existed but unused; v2: **NOW USED IN UI**) | V2_DATABASE §5.5                  |
| `treatmentPlanItemId`               | ObjectId \| null       | → specific item within plan                                            | V2_DATABASE §5.5                  |
| `templateId`                        | ObjectId \| null       | → procedure_note_templates                                             | V2_DATABASE §5.5                  |
| `procedureName`                     | String                 |                                                                        | V2_DATABASE §5.5                  |
| `teethInvolved`                     | Mixed                  | Multiple teeth                                                         | V2_DATABASE §5.5                  |
| `procedurePerformed`                | String                 |                                                                        | V2_DATABASE §5.5                  |
| `materialsUsed`                     | String \| null         |                                                                        | V2_DATABASE §5.5                  |
| `anesthesiaUsed`                    | String \| null         |                                                                        | V2_DATABASE §5.5                  |
| `complications`                     | String \| null         |                                                                        | V2_DATABASE §5.5                  |
| `postOpInstructions`                | String \| null         |                                                                        | V2_DATABASE §5.5                  |
| `followUpRequired` / `followUpDate` | Boolean / Date \| null |                                                                        | V2_DATABASE §5.5                  |
| `linkedXrays[]`                     | ObjectId[]             | Cross-links                                                            | V2_DATABASE §5.5                  |
| `linkedCbcts[]`                     | ObjectId[]             | Cross-links                                                            | V2_DATABASE §5.5                  |
| `preOpXrays[]`                      | ObjectId[]             | Pre-operative imaging (NEW v2)                                         | V2_DATABASE §5.5, MASTER_PLAN §17 |
| `postOpXrays[]`                     | ObjectId[]             | Post-operative imaging (NEW v2)                                        | V2_DATABASE §5.5, MASTER_PLAN §17 |
| `teethDetails`                      | Object                 | Per-tooth specifics                                                    | V2_DATABASE §5.5                  |
| `attachments[]`                     | String[]               | S3/R2 URLs                                                             | V2_DATABASE §5.5                  |
| `notes`                             | String \| null         |                                                                        | V2_DATABASE §5.5                  |

#### Indexes

| Index                             | Source           |
| --------------------------------- | ---------------- |
| `{ patientId: 1, createdAt: -1 }` | V2_DATABASE §5.5 |
| `{ doctorId: 1, createdAt: -1 }`  | V2_DATABASE §5.5 |
| `{ appointmentId: 1 }`            | V2_DATABASE §5.5 |
| `{ treatmentPlanId: 1 }`          | V2_DATABASE §5.5 |

#### Naming Change

v1 called these `treatments`. v2 renames to `procedure_notes` to avoid confusion with `treatment_plans`. — V2_DATABASE §5.5

#### Database: `procedure_note_templates` Collection (Tenant DB)

| Field             | Type         | Notes                     | Source           |
| ----------------- | ------------ | ------------------------- | ---------------- |
| `name`            | `{ en, ar }` | Bilingual                 | V2_DATABASE §5.6 |
| `procedureType`   | String       |                           | V2_DATABASE §5.6 |
| `templateContent` | String       | Default content           | V2_DATABASE §5.6 |
| `fields`          | Object       | Dynamic field definitions | V2_DATABASE §5.6 |
| `isActive`        | Boolean      |                           | V2_DATABASE §5.6 |
| `sortOrder`       | Number       |                           | V2_DATABASE §5.6 |

#### Frontend Components

| Component                            | Source       |
| ------------------------------------ | ------------ |
| `ProcedureNotePage` — list           | V2_STRUCTURE |
| `ProcedureNoteForm` — create/edit    | V2_STRUCTURE |
| `TemplateSelector` — choose template | V2_STRUCTURE |

#### Two creation modes:

1. **Direct:** Standalone note without treatment plan
2. **Plan-based:** Linked to specific treatment plan item → auto-populates fields

— IMPLEMENTATION_ROADMAP Week 10

---

## Week 11: X-Rays, CBCT, Clinical Cross-Linking, Prescriptions & Medications

### 11.1 X-Rays

**Source:** IMPLEMENTATION_ROADMAP.md (Week 11), V2_DATABASE.md §5.9, §5.15, MASTER_PLAN §17, V2_DECISION_LOG §29

#### Database: `xrays` Collection (Tenant DB)

| Field                       | Type             | Notes                                                                                                 | Source                                |
| --------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `patientId`                 | ObjectId         | → patients                                                                                            | V2_DATABASE §5.9                      |
| `doctorId`                  | ObjectId         | → doctors                                                                                             | V2_DATABASE §5.9                      |
| `appointmentId`             | ObjectId \| null | → appointments                                                                                        | V2_DATABASE §5.9                      |
| `branchId`                  | ObjectId         | → branches                                                                                            | V2_DATABASE §5.9                      |
| `xrayTypeId`                | ObjectId \| null | → xray_types                                                                                          | V2_DATABASE §5.9                      |
| `toothNumbers[]`            | Number[]         | **Multi-tooth array** (NEW v2, was single)                                                            | V2_DATABASE §5.9                      |
| `imageUrl`                  | String           | S3/R2 presigned URL                                                                                   | V2_DATABASE §5.9                      |
| `thumbnailUrl`              | String \| null   | Auto-generated JPEG preview                                                                           | V2_DATABASE §5.9, V2_DECISION_LOG §29 |
| `title`                     | String           |                                                                                                       | V2_DATABASE §5.9                      |
| `notes`                     | String \| null   |                                                                                                       | V2_DATABASE §5.9                      |
| `capturedAt` / `capturedBy` | Date / ObjectId  |                                                                                                       | V2_DATABASE §5.9                      |
| `treatmentPlanId`           | ObjectId \| null | Cross-link (NEW v2)                                                                                   | V2_DATABASE §5.9                      |
| `treatmentPlanItemId`       | ObjectId \| null | Cross-link (NEW v2)                                                                                   | V2_DATABASE §5.9                      |
| `procedureNoteId`           | ObjectId \| null | Cross-link (NEW v2)                                                                                   | V2_DATABASE §5.9                      |
| `dentalChartEntryId`        | ObjectId \| null | Cross-link (NEW v2)                                                                                   | V2_DATABASE §5.9                      |
| `clinicalPurpose`           | String           | Enum: `diagnostic \| pre_treatment \| post_treatment \| follow_up \| emergency \| routine_screening`  | V2_DATABASE §5.9                      |
| `region`                    | String           | Enum: `upper_left \| upper_right \| lower_left \| lower_right \| full_mouth \| anterior \| posterior` | V2_DATABASE §5.9                      |
| `findings`                  | String \| null   |                                                                                                       | V2_DATABASE §5.9                      |
| `comparedToXrayId`          | ObjectId \| null | For side-by-side comparison                                                                           | V2_DATABASE §5.9                      |
| `comparisonNotes`           | String \| null   |                                                                                                       | V2_DATABASE §5.9                      |

#### Indexes

| Index                             | Source           |
| --------------------------------- | ---------------- |
| `{ patientId: 1, createdAt: -1 }` | V2_DATABASE §5.9 |
| `{ treatmentPlanId: 1 }`          | V2_DATABASE §5.9 |
| `{ procedureNoteId: 1 }`          | V2_DATABASE §5.9 |
| `{ appointmentId: 1 }`            | V2_DATABASE §5.9 |
| `{ toothNumbers: 1 }` (multikey)  | V2_DATABASE §5.9 |

#### Database: `xray_types` Lookup Collection

Seed data (6 types): Periapical, Bitewing, Panoramic (OPG), Cephalometric, Occlusal, Full Mouth Series — V2_DATABASE §5.15

#### DICOM Viewer

| Aspect            | Detail                                                                                   | Source                                      |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| Library           | `@cornerstonejs/core` 2.x + `@cornerstonejs/dicom-image-loader` + `@cornerstonejs/tools` | V2_DECISION_LOG §29, TECH_REQUIREMENTS §3.2 |
| 2D Viewer         | `XRayViewer` component — Stack viewport, tools: zoom/pan/window-level/measure            | V2_DECISION_LOG §29                         |
| 3D Viewer         | CBCTViewer — Phase 5+ (Volume viewport, MPR)                                             | V2_DECISION_LOG §29                         |
| JPEG Fallback     | Auto-generated thumbnail on upload via `dcmtk` / `dcmj2pnm` (BullMQ job)                 | V2_DECISION_LOG §29                         |
| Thumbnail storage | `tenants/{slug}/xrays/{uuid}_thumb.jpg` alongside `.dcm`                                 | V2_DECISION_LOG §29                         |

#### Frontend Components

| Component                                          | Source              |
| -------------------------------------------------- | ------------------- |
| `XRaysPage` — list/gallery                         | V2_STRUCTURE        |
| `XRayUpload` — 🔒 secure upload flow               | V2_STRUCTURE        |
| `XRayViewer` — cornerstone3D 2D viewer             | V2_DECISION_LOG §29 |
| `ImagingLinker` — reusable cross-linking component | MASTER_PLAN §17     |

---

### 11.2 🔒 File Upload Security

**Source:** IMPLEMENTATION_ROADMAP.md (Week 11), SECURITY §8, BUILD_RULES §16, V2_DECISION_LOG §19–20

#### Upload Categories & Limits

| Category         | Max Size   | MIME Types                                                    | Extensions                             | Source                             |
| ---------------- | ---------- | ------------------------------------------------------------- | -------------------------------------- | ---------------------------------- |
| `xray`           | **25 MB**  | `image/jpeg`, `image/png`, `image/dicom`, `application/dicom` | `.jpg`, `.jpeg`, `.png`, `.dcm`        | SECURITY §8.1, V2_DECISION_LOG §19 |
| `cbct`           | **150 MB** | `application/dicom`, `application/octet-stream`               | `.dcm`, `.zip`                         | V2_DECISION_LOG §19                |
| `avatar`         | **5 MB**   | `image/jpeg`, `image/png`, `image/webp`                       | `.jpg`, `.jpeg`, `.png`, `.webp`       | SECURITY §8.1                      |
| `chatAttachment` | **10 MB**  | `image/*`, `application/pdf`, `audio/*`                       | `.jpg`, `.png`, `.pdf`, `.mp3`, `.ogg` | SECURITY §8.1                      |
| `document`       | **10 MB**  | `application/pdf`                                             | `.pdf`                                 | SECURITY §8.1                      |
| `stl`            | **50 MB**  | `application/sla`, `model/stl`                                | `.stl`                                 | V2_DECISION_LOG §19                |

#### 7-Step Upload Pipeline

1. **Size check** → per-category limit
2. **MIME type check** → magic bytes (NOT just extension)
3. **Extension whitelist** → per-category
4. **EXIF strip** → `sharp.rotate()` for images (xray, avatar)
5. **Virus scan** → ClamAV (dev) / VirusTotal API (prod) — V2_DECISION_LOG §19
6. **Upload to R2** → UUID filename, no user-controlled path
7. **Record in DB** → `{ fileId, tenantSlug, category, size, checksum }`

— BUILD_RULES §16, V2_DECISION_LOG §19

#### S3/R2 Path Isolation

`tenants/{tenantSlug}/{category}/{uuid}.{ext}` — BUILD_RULES §16

**Pre-signed URLs:** 1-hour TTL, tenant path isolation enforced — BUILD_RULES §16

**Multipart upload for >100MB:** `@fastify/multipart` with `tus-js-client` (resumable uploads) for CBCT — V2_DECISION_LOG §19

---

### 11.3 CBCT

**Source:** IMPLEMENTATION_ROADMAP.md (Week 11), V2_DATABASE.md §5.10

#### Database: `cbct_orders` Collection (Tenant DB)

| Field                 | Type             | Notes                                                                                                                         | Source            |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `orderNumber`         | String           | Auto `"CBCT-2026-001"`, unique                                                                                                | V2_DATABASE §5.10 |
| `patientId`           | ObjectId         | → patients                                                                                                                    | V2_DATABASE §5.10 |
| `requestingDoctorId`  | ObjectId         | → doctors                                                                                                                     | V2_DATABASE §5.10 |
| `branchId`            | ObjectId         | → branches                                                                                                                    | V2_DATABASE §5.10 |
| `treatmentPlanId`     | ObjectId \| null | Cross-link (NEW v2)                                                                                                           | V2_DATABASE §5.10 |
| `treatmentPlanItemId` | ObjectId \| null | Cross-link (NEW v2)                                                                                                           | V2_DATABASE §5.10 |
| `procedureNoteId`     | ObjectId \| null | Cross-link (NEW v2)                                                                                                           | V2_DATABASE §5.10 |
| `appointmentId`       | ObjectId \| null |                                                                                                                               | V2_DATABASE §5.10 |
| `indication`          | String           |                                                                                                                               | V2_DATABASE §5.10 |
| `clinicalNotes`       | String \| null   |                                                                                                                               | V2_DATABASE §5.10 |
| `clinicalPurpose`     | String           | Enum: `implant_planning \| endo_evaluation \| ortho_assessment \| tmj_evaluation \| pathology \| trauma \| surgical_planning` | V2_DATABASE §5.10 |
| `priority`            | String           | Enum (standard/urgent/emergency)                                                                                              | V2_DATABASE §5.10 |
| `status`              | String           | Enum: `requested \| scheduled \| completed \| reported \| cancelled`                                                          | V2_DATABASE §5.10 |
| `scheduledDate`       | Date \| null     |                                                                                                                               | V2_DATABASE §5.10 |
| `completedAt`         | Date \| null     |                                                                                                                               | V2_DATABASE §5.10 |
| `scan`                | Embedded Object  | `{ scanReferenceId, technicianId, scanLocation, thumbnailUrl, dicomPath (S3/R2), scanParameters, scannedAt, notes }`          | V2_DATABASE §5.10 |
| `report`              | Embedded Object  | `{ reportingDoctorId, findings, measurements, recommendations, reportPdfUrl, status: draft\|final\|amended, reportedAt }`     | V2_DATABASE §5.10 |

**Key change:** v1 had 3 separate collections (`cbct_orders`, `cbct_scans`, `cbct_reports`) → v2 embeds scan + report into `cbct_orders`. — V2_DATABASE §5.10

#### Indexes

| Index                             | Source                   |
| --------------------------------- | ------------------------ |
| `{ patientId: 1, createdAt: -1 }` | V2_DATABASE §5.10        |
| `{ orderNumber: 1 }` unique       | V2_DATABASE §5.10, §12.5 |
| `{ treatmentPlanId: 1 }`          | V2_DATABASE §5.10        |
| `{ status: 1, scheduledDate: 1 }` | V2_DATABASE §5.10        |

---

### 11.4 Clinical Cross-Linking (NEW v2)

**Source:** MASTER_PLAN §17 (complete)

v1 had **ZERO cross-links** between imaging ↔ treatments ↔ procedures. v2 adds full **bidirectional linking**.

#### Cross-Link Fields (already in schemas above)

| Entity                        | Cross-link fields                                                                 | Source            |
| ----------------------------- | --------------------------------------------------------------------------------- | ----------------- |
| `xrays`                       | `treatmentPlanId`, `treatmentPlanItemId`, `procedureNoteId`, `dentalChartEntryId` | V2_DATABASE §5.9  |
| `cbct_orders`                 | `treatmentPlanId`, `treatmentPlanItemId`, `procedureNoteId`                       | V2_DATABASE §5.10 |
| `treatment_plans.items[]`     | `linkedXrays[]`, `linkedCbcts[]`, `requiredImaging[]`                             | V2_DATABASE §5.4  |
| `procedure_notes`             | `linkedXrays[]`, `linkedCbcts[]`, `preOpXrays[]`, `postOpXrays[]`                 | V2_DATABASE §5.5  |
| `treatment_plans` (top level) | `linkedXrays[]`, `linkedCbcts[]`                                                  | V2_DATABASE §5.4  |

#### `<ImagingLinker />` Reusable Component

Used in 5+ forms (Treatment Plan Form, Procedure Note Form, X-Ray Upload, CBCT Order Form, Patient Detail Imaging Tab). — MASTER_PLAN §17

**Functionality:**

- Search/select existing X-rays or CBCT scans
- Link/unlink imaging to current entity
- Show thumbnails of linked imaging
- Click to open viewer

#### Cross-Module Navigation

Clicking a linked entity navigates to its detail page with back-link. Example: From Treatment Plan → click X-ray badge → X-Ray Viewer → "Back to Treatment Plan" link. — MASTER_PLAN §17

#### Imaging Requirements

Service → Required Imaging → Auto-check → Waive. Each treatment plan item can have `requiredImaging[]` that specifies what imaging is needed before the procedure can start. When an X-ray is linked, the system auto-checks if the requirement is fulfilled. Staff can waive requirements with a reason. — MASTER_PLAN §17

#### Pre/Post-Op Imaging

`preOpXrays[]` and `postOpXrays[]` on procedure notes. Side-by-side viewer component for comparison. — MASTER_PLAN §17

#### Patient Imaging Timeline

A tab on Patient Detail that shows all imaging (X-rays + CBCTs) in chronological order with links to related treatment plans and procedure notes. — MASTER_PLAN §17

#### Dental Chart → Imaging

Clicking a tooth in the dental chart shows all linked X-rays and CBCTs for that tooth (via `toothNumbers[]` array on xrays and dental chart entry link on xrays). — MASTER_PLAN §17

#### API Endpoints for Cross-Linking

| Method | Route                                              | Source          |
| ------ | -------------------------------------------------- | --------------- |
| POST   | `/api/v1/xrays/:id/link`                           | MASTER_PLAN §17 |
| DELETE | `/api/v1/xrays/:id/unlink`                         | MASTER_PLAN §17 |
| POST   | `/api/v1/cbct-orders/:id/link`                     | MASTER_PLAN §17 |
| DELETE | `/api/v1/cbct-orders/:id/unlink`                   | MASTER_PLAN §17 |
| GET    | `/api/v1/patients/:id/imaging-timeline`            | MASTER_PLAN §17 |
| GET    | `/api/v1/treatment-plans/:id/imaging-requirements` | MASTER_PLAN §17 |

---

### 11.5 Prescriptions

**Source:** IMPLEMENTATION_ROADMAP.md (Week 11), V2_DATABASE.md §5.7

#### Database: `prescriptions` Collection (Tenant DB)

| Field                | Type             | Notes                                               | Source                  |
| -------------------- | ---------------- | --------------------------------------------------- | ----------------------- |
| `prescriptionNumber` | String           | Auto `"RX-2026-00001"`, unique                      | V2_DATABASE §5.7, §12.5 |
| `patientId`          | ObjectId         | → patients                                          | V2_DATABASE §5.7        |
| `doctorId`           | ObjectId         | → doctors                                           | V2_DATABASE §5.7        |
| `appointmentId`      | ObjectId \| null | → appointments                                      | V2_DATABASE §5.7        |
| `diagnosis`          | String \| null   |                                                     | V2_DATABASE §5.7        |
| `notes`              | String \| null   |                                                     | V2_DATABASE §5.7        |
| `status`             | String           | Enum: `active \| dispensed \| cancelled \| expired` | V2_DATABASE §5.7        |
| `validUntil`         | Date \| null     |                                                     | V2_DATABASE §5.7        |
| `items[]`            | Embedded Array   | See below                                           | V2_DATABASE §5.7        |

#### Prescription Items (Embedded)

Each item in `items[]`:

| Field            | Type             | Notes                    | Source           |
| ---------------- | ---------------- | ------------------------ | ---------------- |
| `medicationId`   | ObjectId \| null | null = custom medication | V2_DATABASE §5.7 |
| `medicationName` | String           | Denormalized             | V2_DATABASE §5.7 |
| `dosage`         | String           |                          | V2_DATABASE §5.7 |
| `frequency`      | String           |                          | V2_DATABASE §5.7 |
| `duration`       | String           |                          | V2_DATABASE §5.7 |
| `quantity`       | Number \| null   |                          | V2_DATABASE §5.7 |
| `instructions`   | `{ en, ar }`     | Bilingual                | V2_DATABASE §5.7 |

#### Indexes

| Index                              | Source                  |
| ---------------------------------- | ----------------------- |
| `{ patientId: 1, createdAt: -1 }`  | V2_DATABASE §5.7        |
| `{ prescriptionNumber: 1 }` unique | V2_DATABASE §5.7, §12.5 |
| `{ doctorId: 1, createdAt: -1 }`   | V2_DATABASE §5.7        |

#### Frontend Components

| Component                                                  | Source                                       |
| ---------------------------------------------------------- | -------------------------------------------- |
| `PrescriptionsPage` — list                                 | V2_STRUCTURE                                 |
| `PrescriptionForm` — create/edit with embedded items       | V2_STRUCTURE                                 |
| `MedicationSearch` — autocomplete from medications catalog | V2_STRUCTURE, IMPLEMENTATION_ROADMAP Week 11 |
| `PrescriptionPrint` — PDF print view                       | V2_STRUCTURE                                 |

**PDF generation:** `@react-pdf/renderer` with `<ClinicHeader />` shared component — MASTER_PLAN §15, TECH_REQUIREMENTS §3.3

---

### 11.6 Medications Catalog

**Source:** IMPLEMENTATION_ROADMAP.md (Week 11), V2_DATABASE.md §5.8

#### Database: `medications` Collection (Tenant DB)

| Field                                                    | Type         | Notes                                                                                                              | Source           |
| -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `name`                                                   | `{ en, ar }` | Bilingual                                                                                                          | V2_DATABASE §5.8 |
| `genericName`                                            | String       |                                                                                                                    | V2_DATABASE §5.8 |
| `category`                                               | String       | Enum: `antibiotic \| analgesic \| anti_inflammatory \| antifungal \| antiseptic \| anesthetic \| vitamin \| other` | V2_DATABASE §5.8 |
| `dosageForm`                                             | String       | Enum: `tablet \| capsule \| syrup \| injection \| cream \| gel \| mouthwash \| drops \| spray \| powder \| other`  | V2_DATABASE §5.8 |
| `strength`                                               | String       |                                                                                                                    | V2_DATABASE §5.8 |
| `defaultDosage` / `defaultFrequency` / `defaultDuration` | String       | Autocomplete defaults                                                                                              | V2_DATABASE §5.8 |
| `instructions`                                           | `{ en, ar }` | Bilingual                                                                                                          | V2_DATABASE §5.8 |
| `warnings[]`                                             | String[]     |                                                                                                                    | V2_DATABASE §5.8 |
| `contraindications[]`                                    | String[]     |                                                                                                                    | V2_DATABASE §5.8 |
| `isActive`                                               | Boolean      |                                                                                                                    | V2_DATABASE §5.8 |
| `isCustom`                                               | Boolean      | `false` = seed data, `true` = tenant-created                                                                       | V2_DATABASE §5.8 |
| `sortOrder`                                              | Number       |                                                                                                                    | V2_DATABASE §5.8 |

**Seed data:** 100 common dental medications — IMPLEMENTATION_ROADMAP Week 11

#### Indexes

| Index                                                         | Source            |
| ------------------------------------------------------------- | ----------------- |
| `{ "name.en": 1, strength: 1 }` unique                        | V2_DATABASE §5.8  |
| `{ category: 1, isActive: 1 }`                                | V2_DATABASE §5.8  |
| `{ genericName: 1 }`                                          | V2_DATABASE §5.8  |
| `{ "name.en": "text", genericName: "text" }` (weights: 10, 8) | V2_DATABASE §12.3 |

---

### 11.7 Week 11 RBAC

| Permission             | Roles                            | Source        |
| ---------------------- | -------------------------------- | ------------- |
| `xrays.view`           | dentist, admin, assistant        | SECURITY §4.3 |
| `xrays.upload`         | dentist, admin                   | SECURITY §4.3 |
| `xrays.delete`         | admin                            | SECURITY §4.3 |
| `cbct.view`            | dentist, admin                   | SECURITY §4.3 |
| `cbct.create`          | dentist, admin                   | SECURITY §4.3 |
| `prescriptions.view`   | dentist, admin, receptionist     | SECURITY §4.3 |
| `prescriptions.create` | dentist                          | SECURITY §4.3 |
| `treatments.view`      | dentist, admin                   | SECURITY §4.3 |
| `treatments.create`    | dentist                          | SECURITY §4.3 |
| `charts.view`          | dentist, admin, assistant (read) | SECURITY §4.3 |
| `charts.edit`          | dentist                          | SECURITY §4.3 |

### 11.8 Week 11 Webhook Events

```
xray.uploaded
prescription.created
treatment_plan.created / accepted
imaging.linked / unlinked (cross-linking events)
```

— BUILD_RULES §23, MASTER_PLAN §17

---

## Cross-Cutting Concerns (All Weeks 8–11)

### Backend Patterns (Mandatory)

| Pattern          | Detail                                                                | Source                         |
| ---------------- | --------------------------------------------------------------------- | ------------------------------ |
| Model Factory    | `getXModel(connection)` — export function per collection              | BUILD_RULES §5                 |
| Service Layer    | `new XService(connection)` — business logic                           | BUILD_RULES §5                 |
| Route Handler    | Fastify route with Zod schema validation                              | BUILD_RULES §5                 |
| Middleware Chain | `authenticate` → `tenantResolver` → `authorize(permission)` → handler | BUILD_RULES §5                 |
| Soft Delete      | `isActive: false` + `isActive` filter in all queries                  | BUILD_RULES §6                 |
| Timestamps       | `createdAt` / `updatedAt` via Mongoose                                | BUILD_RULES §6                 |
| camelCase        | All field names in camelCase                                          | BUILD_RULES §6                 |
| Validation       | Zod `.strict()` shared from `@dento/shared`                           | BUILD_RULES §7                 |
| Audit Logging    | Before/after diff on create/update/delete of PII or clinical data     | BUILD_RULES §16                |
| Tenant Isolation | `useDb(\`tenant\_\${slug}\`)` — no cross-tenant access possible       | BUILD_RULES §5, SECURITY §13.5 |

### Frontend Patterns (Mandatory)

| Pattern         | Detail                                                                                                              | Source          |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | --------------- |
| Feature Folders | `features/{module}/pages/`, `components/`, `hooks/`                                                                 | BUILD_RULES §8  |
| React Query     | `useQuery`/`useMutation` with `queryKey` factory                                                                    | BUILD_RULES §8  |
| Forms           | React Hook Form + `zodResolver` + Zod schema from shared                                                            | BUILD_RULES §8  |
| State           | Server=React Query, UI=Zustand, Forms=RHF, URL=Router params                                                        | BUILD_RULES §8  |
| Tables          | TanStack Table + server-side pagination (manual)                                                                    | BUILD_RULES §9  |
| Loading         | `<TableSkeleton />` for every data page                                                                             | BUILD_RULES §15 |
| Error           | `<ErrorState />` for every data page                                                                                | BUILD_RULES §15 |
| Empty           | `<EmptyState />` for every data page                                                                                | BUILD_RULES §15 |
| RTL             | Logical CSS only (`ms-`/`me-`/`ps-`/`pe-`), NEVER `left`/`right`                                                    | BUILD_RULES §11 |
| Accessibility   | WCAG 2.1 AA, `jsx-a11y` ESLint, Radix primitives                                                                    | BUILD_RULES §13 |
| Animations      | 150–200ms, transform-based, `prefers-reduced-motion` respected, no page transitions                                 | BUILD_RULES §14 |
| Integration     | Every sidebar link → page → hook → API chain must work. Every button must be functional. Form field names match BE. | BUILD_RULES §24 |

### API Conventions

| Convention        | Detail                                                                | Source                               |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------ |
| Base path         | `/api/v1/` prefix                                                     | V2_DECISION_LOG §21                  |
| Naming            | Plural nouns, kebab-case                                              | V2_DECISION_LOG §21                  |
| Tenant resolution | `X-Tenant-Slug` header                                                | V2_DECISION_LOG §21                  |
| Responses         | Standardized `ApiSuccess` / `ApiError` envelope                       | V2_DECISION_LOG §2, BUILD_RULES §3–4 |
| Rate limiting     | 3 tiers: Strict (auth: 5/15min), Standard (100/min), Relaxed (30/min) | BUILD_RULES §16                      |

### Testing

| Aspect          | Detail                                                             | Source                               |
| --------------- | ------------------------------------------------------------------ | ------------------------------------ |
| Framework       | Vitest + MSW + Testing Library + supertest + mongodb-memory-server | BUILD_RULES §18, V2_DECISION_LOG §10 |
| Coverage target | 60% for Phase 3                                                    | BUILD_RULES §18                      |

### Document Authority (when docs contradict)

```
1. V2_DECISION_LOG (highest)
2. V2_DATABASE
3. SECURITY_AND_ENCRYPTION
4. IMPLEMENTATION_ROADMAP
5. TECH_REQUIREMENTS
6. V2_STRUCTURE
7. DENTO_V2_MASTER_PLAN (lowest)
```

— BUILD_RULES §1, V2_DECISION_LOG §26

---

> **Files fully read:** IMPLEMENTATION_ROADMAP.md, SECURITY_AND_ENCRYPTION.md, TECH_REQUIREMENTS.md, BUILD_RULES.md, V2_STRUCTURE.md
> **Files substantially read:** V2_DATABASE.md (100%), DENTO_V2_MASTER_PLAN.md (~67%), V2_DECISION_LOG.md (100%)

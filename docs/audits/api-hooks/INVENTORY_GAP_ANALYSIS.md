# Dentov2 — PLANNED_FEATURE_INVENTORY.md Gap Analysis

> **Scanner:** Deep verification scan of ALL 9 planning documents (~21,700 lines total)  
> **Inventory Source:** `PLANNED_FEATURE_INVENTORY.md` (1,089 lines, extracted from 5 docs)  
> **Additional Docs Scanned (NOT used as inventory source):**
>
> - `V2_STRUCTURE.md` (1,559 lines)
> - `V2_DECISION_LOG.md` (2,160 lines)
> - `ADMIN_PORTAL_SCREENS.md` (1,668 lines)
> - `DEV_PORTAL_SCREENS.md` (730 lines)
>
> **Purpose:** Comprehensive list of features, requirements, and implementation details found in planning docs but **NOT adequately covered** in the inventory.

---

## Gap Severity Legend

| Severity    | Meaning                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- |
| 🔴 CRITICAL | Entire system/feature missing from inventory — would be forgotten during build           |
| 🟠 HIGH     | Feature exists in inventory but key implementation details are absent                    |
| 🟡 MEDIUM   | Design decision, algorithm, or constraint not captured — risk of wrong implementation    |
| 🔵 LOW      | Supplementary info (wireframes, cost projections, package lists) useful but not blocking |

---

## Table of Contents

1. [CRITICAL — Entire Systems/Features Missing](#1-critical--entire-systemsfeatures-missing)
2. [HIGH — Missing Implementation Details for Existing Entries](#2-high--missing-implementation-details-for-existing-entries)
3. [MEDIUM — Design Decisions & Constraints Not Captured](#3-medium--design-decisions--constraints-not-captured)
4. [LOW — Supplementary Info Not in Inventory](#4-low--supplementary-info-not-in-inventory)
5. [Inventory Corrections](#5-inventory-corrections)
6. [Summary Statistics](#6-summary-statistics)

---

## 1. CRITICAL — Entire Systems/Features Missing

### 🔴 GAP-001: Support Ticketing System (MASTER_PLAN §9)

**Source:** DENTO_V2_MASTER_PLAN.md §9  
**Status in Inventory:** Collection `support_tickets` listed in §1.6 sidebar + §5.1 row 26, but **ZERO API endpoints, ZERO UI pages, ZERO workflow description**

**What's Missing:**

- **Full Schema:** subject, description, priority(low/medium/high/critical), status(open/in-progress/waiting/resolved/closed), sla{responseDeadline, resolutionDeadline}, assignedTo, internalNotes[], tags[], attachmentUrls[], rating(1-5), category, tenantId
- **9 Features:**
  1. SLA timers with auto-escalation (P1: 1h response / 4h resolution, P2: 4h/24h, P3: 24h/72h, P4: 48h/168h)
  2. Auto-assignment to `platform_support` users (round-robin)
  3. Internal notes (visible only to platform team)
  4. Canned responses / response templates
  5. Status workflow with required fields at each transition
  6. Tenant context injection (shows tenant health data in sidebar)
  7. Knowledge base linking
  8. Satisfaction rating on close
  9. Escalation rules (auto-escalate if SLA breached)
- **5 UI Pages:** Ticket List, Ticket Detail with chat-style thread, New Ticket Form, SLA Configuration, Ticket Dashboard (open/avg-time/satisfaction)
- **API Endpoints (estimated 8-10):** CRUD + assign + change-status + add-note + rate + escalate

**Action:** Add full `### Support Ticketing System` section to inventory with endpoints, schema, UI pages, SLA rules.

---

### 🔴 GAP-002: Document Template & PDF Generation System (MASTER_PLAN §15)

**Source:** DENTO_V2_MASTER_PLAN.md §15  
**Status in Inventory:** NOT mentioned at all

**What's Missing:**

- **ClinicHeader Component:** Reusable React component pulling branding (logo, clinicName, address, phone, licenseNumber) for all printed documents
- **Template Matrix:**

| Document       | Doctor Info | Patient Info |      Signature      | Notes             |
| -------------- | :---------: | :----------: | :-----------------: | ----------------- |
| Invoice        |    ❌ No    |    ✅ Yes    |        ❌ No        | Financial only    |
| Prescription   |   ✅ With   |    ✅ Yes    |      ✅ Doctor      | Medical authority |
| Treatment Plan |   ✅ With   |    ✅ Yes    | ✅ Doctor + Patient | Dual consent      |
| Consent Form   |    ❌ No    |    ✅ Yes    |     ✅ Patient      | Legal binding     |
| Lab Order      |   ✅ With   |    ✅ Yes    |      ✅ Doctor      | Lab reference     |

- **PDF Generation:** Puppeteer (server-side) + jsPDF (client-side fallback)
- **ASCII Wireframes:** Invoice, Prescription, Treatment Plan layouts fully designed
- **Bilingual Support:** All templates render in tenant's language (AR/EN)

**Action:** Add full `### Document Templates & PDF Generation` section to inventory.

---

### 🔴 GAP-003: v1→v2 Migration CLI Tool (V2_DECISION_LOG Decision #6)

**Source:** V2_DECISION_LOG.md Decision #6  
**Status in Inventory:** NOT mentioned anywhere

**What's Missing:**

- CLI tool for migrating existing v1 tenant data to v2 schema
- Field mapping definitions (v1 table → v2 collection)
- Data transformation rules (e.g., v1 `treatments` → v2 `procedure_notes`)
- Rollback capability
- Validation report post-migration
- Phase assignment and timeline

**Action:** Add `### v1→v2 Migration CLI` section to inventory (potentially under a new "Tooling" category).

---

### 🔴 GAP-004: Branding Propagation System (MASTER_PLAN §14)

**Source:** DENTO_V2_MASTER_PLAN.md §14  
**Status in Inventory:** Only "Branding" tab mentioned in §1.7 Tenant Detail Tabs. Zero details.

**What's Missing:**

- **10 Propagation Points** where branding appears:
  1. PDF Invoice headers
  2. PDF Prescription headers
  3. PDF Treatment Plan headers
  4. Email notification templates (logo + colors)
  5. SMS sender name
  6. WhatsApp business profile
  7. Admin Portal login page
  8. Admin Portal top bar
  9. Patient-facing receipts
  10. Online booking page
- **Settings Collection:** `settings` entries with `type: "branding"` storing: logo, logoDark, clinicName{en,ar}, address, phone, fax, email, website, licenseNumber, colors{primary, secondary, accent}
- **Multi-Branch Rule:** All documents always use **Main Branch** branding (not individual branch branding)
- **Preview Feature:** Real-time preview of branding changes before save

**Action:** Add `### Branding Propagation` section detailing all 10 points + multi-branch rule.

---

### 🔴 GAP-005: API Catalog in Dev Portal (MASTER_PLAN §7)

**Source:** DENTO_V2_MASTER_PLAN.md §7  
**Status in Inventory:** `@fastify/swagger` mentioned in §4.4 Monitoring. No dedicated feature description.

**What's Missing:**

- **Design Decision:** NO manual `api_definitions` / `api_categories` collections — ALL auto-generated from `@fastify/swagger` + Fastify Zod schemas
- **Dev Portal "API Catalog" Module:** Browse auto-generated OpenAPI 3.1 docs, filterable by module
- **Per-Module API Documentation:** Each tenant module's routes documented automatically
- **Try-It Feature:** Interactive API testing from Dev Portal (using tenant API keys)
- **Versioned Docs:** API docs versioned per module version

**Action:** Add `### API Catalog (Auto-Generated)` to Dev Portal modules section.

---

### 🔴 GAP-006: Custom Fields Developer Guide (MASTER_PLAN §7)

**Source:** DENTO_V2_MASTER_PLAN.md §7  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- Developer guide/documentation for adding custom fields to existing modules
- Schema extension pattern
- Field type support (text, number, date, select, multiselect, file)
- Validation rules for custom fields
- Custom field rendering in Admin Portal UI

**Action:** Add to Dev Portal documentation features.

---

### 🔴 GAP-007: cornerstone3D DICOM Viewer (V2_DECISION_LOG Decision #17)

**Source:** V2_DECISION_LOG.md Decision #17  
**Status in Inventory:** NOT mentioned anywhere

**What's Missing:**

- **Library:** cornerstone3D for medical imaging (X-ray + CBCT) display
- **Features:** Pan, zoom, brightness/contrast, measurement tools, annotations
- **DICOM Support:** DICOM file format parsing and rendering
- **Integration Point:** X-Ray & CBCT module image viewer component
- **Pre/Post-Op Comparison Viewer** (from MASTER_PLAN §17): Side-by-side X-ray comparison with `comparedToXrayId` field
- **Phase:** Phase 3 (Core Clinical)

**Action:** Add to X-Ray & CBCT module as "DICOM Viewer" feature.

---

### 🔴 GAP-008: ClamAV Virus Scanning on File Uploads (V2_DECISION_LOG Decision #14)

**Source:** V2_DECISION_LOG.md Decision #14  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- ClamAV integration for all file uploads
- Scan before S3/R2 storage
- Quarantine rejected files
- Admin notification on virus detection
- Applies to: patient documents, X-ray images, CBCT scans, chat attachments, consent form signatures

**Action:** Add to §3 Security Features under a new `### File Security` subsection.

---

### 🔴 GAP-009: Structured Logging — Pino + Axiom (V2_DECISION_LOG Decision #16)

**Source:** V2_DECISION_LOG.md Decision #16  
**Status in Inventory:** `error_logs` collection and Sentry mentioned, but structured logging NOT described

**What's Missing:**

- **Pino** as structured JSON logger (replacing console.log)
- **Axiom** as cloud log aggregation service
- **Log Levels:** trace, debug, info, warn, error, fatal
- **Structured Fields:** tenantSlug, userId, requestId, duration, method, path
- **Correlation:** Request ID propagation across services
- **Log Rotation:** Axiom retention policy
- **Dev vs Prod:** Pretty-print in dev, JSON in prod

**Action:** Add to §4 Integrations as `### Logging Infrastructure` or to §3 Security.

---

### 🔴 GAP-010: Anomaly Detection & Security Alerts (SECURITY_AND_ENCRYPTION.md)

**Source:** SECURITY_AND_ENCRYPTION.md  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- **8 Security Alert Types:**
  1. Suspicious login (new location/device)
  2. Brute force attack detected
  3. Bulk data export attempt
  4. Admin action on sensitive resource
  5. API key usage spike
  6. Unauthorized access attempt
  7. PII field access pattern anomaly
  8. Concurrent session limit breach
- **Detection Mechanism:** Redis-based pattern analysis
- **Response Actions:** Alert platform_admin, block IP, force session logout, require MFA
- **Notification:** Email + In-App + Slack webhook to platform admin

**Action:** Add `### Security Anomaly Detection` section to §3 Security Features.

---

### 🔴 GAP-011: Disaster Recovery Plan (SECURITY_AND_ENCRYPTION.md)

**Source:** SECURITY_AND_ENCRYPTION.md  
**Status in Inventory:** Backup collection listed, but NO DR plan

**What's Missing:**

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 1 hour
- **Recovery Procedures:** Step-by-step per failure type (DB crash, S3 loss, Redis wipe, full outage)
- **Failover Strategy:** MongoDB Atlas replica set auto-failover, Redis cluster promotion
- **Data Integrity Checks:** SHA-256 checksum on backup restore
- **DR Testing:** Quarterly DR drill requirement

**Action:** Add `### Disaster Recovery` section to §3 Security Features.

---

## 2. HIGH — Missing Implementation Details for Existing Entries

### 🟠 GAP-012: Slot Engine Algorithm (MASTER_PLAN §22)

**Source:** DENTO_V2_MASTER_PLAN.md §22  
**Status in Inventory:** §2.4 lists `GET /api/public/availability/slots` but NO algorithm description

**What's Missing:**

- **3-Level Hierarchical Validation:** Branch Working Hours → Doctor Schedule → Existing Appointments
- **Algorithm Steps:**
  1. Load branch workHours for requested day (check ramadanHours if active)
  2. Check branch holidays → return empty if holiday
  3. Load doctor_schedules for that day (recurring + overrides)
  4. Check schedule_exceptions (vacation, sick, modified hours)
  5. Generate slot array from doctor available hours using `slotDuration` from `branches.slotConfig`
  6. Subtract existing appointments (booked/confirmed/arrived/in-progress)
  7. Subtract break times (breakStart → breakEnd)
  8. Return available slots with startTime, endTime, doctorId, branchId

**Action:** Add algorithm description to §2.4 Scheduling section.

---

### 🟠 GAP-013: Booking Validation — 8 Checks (MASTER_PLAN §22)

**Source:** DENTO_V2_MASTER_PLAN.md §22  
**Status in Inventory:** `POST /api/appointments` says "runs validateAppointment" but checks are NOT listed

**What's Missing — 8 Validation Checks:**

1. ❌ Date is not in the past
2. ❌ Branch is open on that day (workHours check)
3. ❌ Branch is not on holiday
4. ❌ Doctor has a schedule for that day/branch
5. ❌ Doctor has no exception (vacation/sick) on that date
6. ❌ Requested time falls within doctor's scheduled hours
7. ❌ No time conflict with existing appointments
8. ❌ Requested time does not overlap break period

**Validation runs on:** `POST /api/appointments`, `POST /api/public/booking`, `PATCH /api/appointments/:id`

**Action:** Add validation check list to Appointments module and Scheduling section.

---

### 🟠 GAP-014: Online Booking Confirmation Flow (MASTER_PLAN §22)

**Source:** DENTO_V2_MASTER_PLAN.md §22  
**Status in Inventory:** `PATCH /api/appointments/:id/confirm` listed but flow not described

**What's Missing:**

- **3 Confirmation Options:**
  1. **Confirm** — Accept as-is → patient notified (SMS/Email/WhatsApp)
  2. **Confirm with Changes** — Modified time/doctor → patient notified of changes
  3. **Reject** — With reason → patient notified of rejection + suggested alternatives
- **Auto-Confirm:** Per-branch setting `branches.onlineBookingConfig.autoConfirmEnabled` — skips manual review
- **Notification Templates:** `booking_confirmed`, `booking_changed`, `booking_rejected`
- **Default Status:** Online bookings arrive as `status: "pending_confirmation"`

**Action:** Add confirmation flow description to §2.4 Online Booking Management.

---

### 🟠 GAP-015: User Onboarding & Invite Flow Details (MASTER_PLAN §12)

**Source:** DENTO_V2_MASTER_PLAN.md §12  
**Status in Inventory:** `POST /api/users/invite` exists but NO flow description

**What's Missing:**

- **Invite-Only:** No self-registration. All users created via invite by tenant_admin
- **Activation Flow:**
  1. Admin invites → email sent with activation link (72h expiry token)
  2. User clicks → Set password + upload avatar (optional) → status: `active`
  3. If token expires → admin must re-invite
- **5 User Statuses:** `invited` → `active` → `suspended` → `deactivated` → `deleted`
- **Default Avatar:** DiceBear API generates avatar from initials
- **Avatar Upload:** S3/R2 with Sharp crop to 256×256px
- **User Fields:** firstName, lastName, email, phone, avatarUrl, role, branchIds[], status, preferences{language, timezone, notifications}

**Action:** Add onboarding flow description to §2.9 User & Session Management.

---

### 🟠 GAP-016: Doctor ↔ User Bidirectional Sync (MASTER_PLAN §13)

**Source:** DENTO_V2_MASTER_PLAN.md §13  
**Status in Inventory:** Doctors collection listed but sync mechanism NOT described

**What's Missing:**

- **Auto-Sync Rule:** When user with role `dentist` is created → `doctors` record auto-created with userId reference
- **Bidirectional:** Changes to user name/email → propagates to doctors record; changes to doctor profile → propagates back
- **Certificates:** doctors.certificates[] — Array of {name, issuingBody, issueDate, expiryDate, fileUrl}
- **Multi-Branch:** doctors.assignedBranches[] — doctor can work at multiple branches
- **Commission Rate:** doctors.commissionRate (percentage) for billing module
- **REMOVED:** `doctors.workingHours` field → replaced by `doctor_schedules` collection (SINGLE source of truth)

**Action:** Add sync mechanism and removed field note to §2.8 Doctors & Services.

---

### 🟠 GAP-017: Inventory — Barcode/QR Scanning (MASTER_PLAN §16)

**Source:** DENTO_V2_MASTER_PLAN.md §16  
**Status in Inventory:** No mention of barcode scanning

**What's Missing:**

- **Web:** Webcam-based barcode scanner using quagga2 library
- **Mobile:** `expo-barcode-scanner` (Phase 7)
- **Barcode on Items:** inventory_items.barcode field (can store any 1D/2D barcode value)
- **Scan Actions:** Lookup item → display stock → quick adjust → quick movement
- **Label Printing:** Generate barcode labels for items (optional)

**Action:** Add barcode scanning feature description to §2.3 Inventory module.

---

### 🟠 GAP-018: Inventory — Stock Valuation Methods (MASTER_PLAN §16)

**Source:** DENTO_V2_MASTER_PLAN.md §16  
**Status in Inventory:** inventory_stock.valuationMethod listed in key fields but NOT explained

**What's Missing:**

- **3 Valuation Methods:**
  1. **FIFO (First-In, First-Out):** Oldest batches consumed first
  2. **WAC (Weighted Average Cost):** Running average of all purchase prices
  3. **Last Purchase:** Uses most recent purchase price
- **Per-Item Configuration:** Each inventory_item can use a different valuation method
- **Batch Tracking:** inventory_stock.batches[] embedded array with {batchNumber, expiryDate, quantity, unitCost, receivedDate, supplierId}
- **FIFO Auto-Consumption:** When stock is consumed (movement type: out), system auto-deducts from oldest batch first
- **Stock Valuation Report:** Calculates total inventory value using selected method

**Action:** Add valuation methods and batch logic to Inventory module description.

---

### 🟠 GAP-019: Clinical Cross-Linking — ImagingLinker Component (MASTER_PLAN §17)

**Source:** DENTO_V2_MASTER_PLAN.md §17  
**Status in Inventory:** Link/unlink endpoints exist, but component NOT described

**What's Missing:**

- **ImagingLinker React Component:** Reusable UI component for linking imaging to clinical records
- **10 Cross-Navigation Paths:**
  1. Dental Chart → Tooth → X-Rays for that tooth
  2. Dental Chart → Tooth → CBCT scans for that region
  3. Treatment Plan → Linked X-Rays (pre-treatment)
  4. Treatment Plan → Linked CBCTs
  5. Procedure Note → Pre-Op X-Rays
  6. Procedure Note → Post-Op X-Rays
  7. X-Ray → Linked Treatment Plans
  8. X-Ray → Linked Procedure Notes
  9. CBCT → Linked Treatment Plans
  10. CBCT → Linked Procedure Notes
- **Imaging Timeline Tab:** Patient → Imaging tab → chronological all imaging (X-ray + CBCT)
- **Imaging Requirements Auto-Check:** When creating procedure note, system checks if required imaging exists. Shows warning if missing, allows waive.
- **Pre/Post-Op Viewer:** Side-by-side comparison of X-ray before and after procedure
- **X-Ray Comparison:** `xrays.comparedToXrayId` field for tracking comparison pairs

**Action:** Add ImagingLinker component + cross-navigation paths to X-Ray & CBCT module.

---

### 🟠 GAP-020: Notifications — Quiet Hours, Digest Mode, Seed Templates (MASTER_PLAN §20)

**Source:** DENTO_V2_MASTER_PLAN.md §20  
**Status in Inventory:** 23 notification endpoints listed but advanced features missing

**What's Missing:**

- **Quiet Hours:** Per-user setting in `notification_preferences` — no push/SMS during specified hours (e.g., 22:00-07:00)
- **Digest Mode:** Batch low-priority notifications into a daily digest email instead of individual sends
- **3-Tier Priority Queue:** high (immediate), normal (within 5min), low (next digest batch)
- **16 Seed Templates:**

| #   | Template                | Event Trigger                     | Channels             |
| --- | ----------------------- | --------------------------------- | -------------------- |
| 1   | appointment_reminder    | 18:00 daily for next-day          | Email, SMS, Push     |
| 2   | appointment_confirmed   | appointment.created               | SMS, Email           |
| 3   | appointment_cancelled   | appointment.cancelled             | SMS, Email           |
| 4   | appointment_rescheduled | appointment.updated (time change) | SMS, Email           |
| 5   | patient_recall          | recall-reminders cron             | SMS, Email           |
| 6   | payment_reminder        | payment-reminders cron            | Email, SMS           |
| 7   | invoice_created         | invoice.created                   | Email                |
| 8   | prescription_ready      | prescription.created              | SMS, Push            |
| 9   | lab_order_ready         | lab_order.status → received       | Push, Email          |
| 10  | booking_confirmed       | booking.online.confirmed          | SMS, Email, WhatsApp |
| 11  | booking_rejected        | booking.online.rejected           | SMS, Email           |
| 12  | booking_changed         | booking.online.confirmed_changed  | SMS, Email           |
| 13  | low_stock_alert         | low-stock-alerts cron             | Email, Push          |
| 14  | expiry_alert            | expiry-check cron                 | Email, Push          |
| 15  | leave_approved          | leave.request.approved            | Push, Email          |
| 16  | user_invited            | user invitation                   | Email                |

**Action:** Add quiet hours, digest mode, priority queue, and seed templates to §2.6.

---

### 🟠 GAP-021: Module Versioning — Canary Rollout (MASTER_PLAN §24)

**Source:** DENTO_V2_MASTER_PLAN.md §24  
**Status in Inventory:** modules/tenant_modules collections listed but rollout mechanism NOT described

**What's Missing:**

- **Module Lifecycle:** `DEVELOPMENT` → `BETA` → `ACTIVE` → `DEPRECATED` → `RETIRED`
- **Canary Rollout Strategy:** 5% → 25% → 50% → 100% of tenants
- **Auto-Rollback:** If error rate exceeds threshold during canary, auto-revert
- **Update Policies (per tenant):**
  - `auto` — update immediately when new version available
  - `manual` — admin must approve update
  - `pinned` — never auto-update
- **Dependency Check:** Cannot install module if required dependency not installed
- **Conflict Check:** Cannot install module if conflicting module already installed
- **modules.dependsOn[]** and **modules.conflictsWith[]** fields
- **modules.migrations[]** — Database migration scripts per version

**Action:** Add full module versioning/lifecycle section to Platform Modules.

---

### 🟠 GAP-022: Payment Gateways — Paymob 6 Methods & Fawry Offline Flow (MASTER_PLAN §29)

**Source:** DENTO_V2_MASTER_PLAN.md §29  
**Status in Inventory:** Paymob listed generically in §4.1

**What's Missing:**

- **6 Paymob Payment Methods with Fees:**

| Method                | Fee              | Processing   |
| --------------------- | ---------------- | ------------ |
| Cards (Visa/MC/Meeza) | 2.75% + 0.50 EGP | Instant      |
| Fawry (Cash)          | 2.50 EGP flat    | 48h offline  |
| Mobile Wallets        | 1.00%            | Instant      |
| InstaPay              | 1.00 EGP flat    | Instant      |
| ValU (BNPL)           | 3.50%            | Installments |
| Meeza Digital         | 1.50%            | Instant      |

- **Fawry Offline Flow:**
  1. User selects Fawry → system creates Paymob intention → gets reference number
  2. User pays at any Fawry outlet within 48 hours using reference number
  3. Paymob webhook notifies system of payment completion
  4. System activates subscription / marks invoice paid
  5. If 48h expires → reference invalidated → user must re-initiate
- **Auto-Pay Toggle:** Per-tenant setting to auto-charge card on subscription renewal
- **`saas_payments` Extended Fields:** provider, method, methodDetails{referenceNumber, walletPhone}, providerFee, netAmount, providerPaymentId
- **Country-Based Auto-Select:** If tenant country = EG → Paymob; else → Stripe

**Action:** Expand §4.1 Payment Gateways with Paymob methods, fees, Fawry flow, Auto-Pay.

---

### 🟠 GAP-023: Auth — Session Concurrent Limit & "My Devices" UI (MASTER_PLAN §27 + SECURITY.md)

**Source:** DENTO_V2_MASTER_PLAN.md §27, SECURITY_AND_ENCRYPTION.md  
**Status in Inventory:** user_sessions collection and 3 session endpoints listed, but details missing

**What's Missing:**

- **Concurrent Session Limit:** Maximum 5 active sessions per user (oldest auto-terminated)
- **GeoIP Location Tracking:** Each session records approximate location via IP geolocation
- **Device Fingerprinting:** userAgent, browser, OS, device type
- **"My Devices" UI Page:** List of active sessions with:
  - Device name + icon (mobile/desktop/tablet)
  - Browser + OS
  - Location (city, country)
  - Last active timestamp
  - "End Session" button per device
  - "End All Other Sessions" button
- **Session TTL:** Configurable per-role (default 7 days, platform_admin 1 day)

**Action:** Add session details and UI page to §2.9 User & Session Management.

---

### 🟠 GAP-024: Tenant Locale — Per-Patient & Per-Invoice Currency Override (MASTER_PLAN §25)

**Source:** DENTO_V2_MASTER_PLAN.md §25  
**Status in Inventory:** currencies global and invoice.currency field listed but mechanism NOT described

**What's Missing:**

- **Per-Patient Currency:** `patients.preferredCurrency` — for foreign patients who prefer billing in their currency
- **Per-Invoice Override:** When creating invoice for foreign patient → system uses patient's preferred currency, stores `exchangeRate` at time of creation
- **Currency Selection Logic:**
  1. If patient has preferredCurrency → use that
  2. Else if branches.clinicCurrencyOverridable && branch has override → use branch currency
  3. Else → use tenant's clinicCurrency
- **Exchange Rate Source:** `currencies` global, updated from exchangerate-api.com
- **Display:** All amounts shown in invoice currency; tenant's base currency shown in parentheses for reference

**Action:** Add currency override mechanism to Billing module and Settings section.

---

### 🟠 GAP-025: Language Change Propagation (MASTER_PLAN §25)

**Source:** DENTO_V2_MASTER_PLAN.md §25  
**Status in Inventory:** Socket.io event `locale:changed` listed but propagation details missing

**What's Missing:**

- **6 Things That Change When Language Switches:**
  1. UI text direction (RTL ↔ LTR) via `document.dir`
  2. Module/menu text (from translation_packs)
  3. Notification templates (subject + body in new language)
  4. Date/time format (DD/MM/YYYY vs MM/DD/YYYY)
  5. Number format (comma vs dot separators)
  6. Mobile app language (via Expo Localization)
- **6 Things That DON'T Change:**
  1. Existing patient names (stay in entered language)
  2. Existing medical records
  3. Invoice numbers
  4. Stored documents/PDFs
  5. Audit log entries
  6. Chat message history
- **Live Propagation:** Socket.io broadcasts to `tenant:{tenantSlug}` room → all connected clients reload translations without page refresh

**Action:** Add propagation details to §2.10 Tenant Settings.

---

### 🟠 GAP-026: Chat — Auto-Channel Creation & Channel Types (MASTER_PLAN §37)

**Source:** DENTO_V2_MASTER_PLAN.md §37  
**Status in Inventory:** 13 chat endpoints listed but auto-creation NOT described

**What's Missing:**

- **5 Channel Types:** direct (DM), branch (all staff in branch), role (all users with same role), custom (user-created groups), announcement (admin-only broadcast)
- **Auto-Channel Creation Rules:**
  - On tenant creation → create "General" announcement channel
  - On branch creation → create branch channel with all branch staff
  - On user creation → create direct message channels with: their branch colleagues, their direct supervisor
  - On role assignment → add to role-based channel
- **Attachment Upload:** S3/R2 with Sharp thumbnail generation (200×200px for images)
- **Message Edit Window:** 15-minute edit window after send
- **Soft Delete:** Messages marked as deleted but text replaced with "This message was deleted"
- **365-Day Retention:** Messages auto-deleted after 365 days (TTL index)
- **Staff-Only:** NO patient-facing chat (explicit design decision)

**Action:** Add auto-channel creation rules and channel type details to §2.7.

---

### 🟠 GAP-027: DB Explorer (Custom React UI) (MASTER_PLAN §8)

**Source:** DENTO_V2_MASTER_PLAN.md §8  
**Status in Inventory:** Listed in §1.7 Tenant Detail Tabs as "Browse tenant collections" — NO implementation details

**What's Missing:**

- **Custom React UI:** NOT using Payload's built-in admin; building a custom collection browser
- **Features:**
  - Browse any tenant collection (read-only for platform_support, full for platform_admin)
  - Paginated data grid with search and filter
  - JSON viewer for document detail
  - Export query results
  - Field-level encryption indicator (shows 🔒 on encrypted fields)
  - Collection statistics (document count, index usage, size)
- **Security:** All access logged to audit_logs, sensitive fields masked unless explicitly revealed

**Action:** Add DB Explorer implementation details to §1.7 or create dedicated section.

---

## 3. MEDIUM — Design Decisions & Constraints Not Captured

### 🟡 GAP-028: 7 Fixed Code-Defined Roles (MASTER_PLAN §27 Design Decision)

**Source:** DENTO_V2_MASTER_PLAN.md §27  
**Status in Inventory:** 9 roles listed but the constraint is NOT captured

**What's Missing:**

- **Design Decision:** Roles are **hardcoded in middleware** — NOT stored in database
- **Cannot be customized** per tenant
- **Cannot add new roles** without code deployment
- **Rationale:** Simpler permission checking, no need for role CRUD endpoints, tenant can't accidentally break permissions
- **Implication:** No "Custom Roles" feature will ever exist without code change

**Action:** Add design constraint note to §9 RBAC section.

---

### 🟡 GAP-029: /api/ Route Prefix Standard (V2_DECISION_LOG Decision #19)

**Source:** V2_DECISION_LOG.md Decision #19  
**Status in Inventory:** Routes show `/api/` prefix but it's not called out as a design decision

**What's Missing:**

- **ALL routes** (Payload + Fastify) use `/api/` prefix
- **Payload CMS** configured with `config.routes.api = '/api'`
- **No separate API subdomain** — same origin for frontend + API
- **Reverse proxy** routes `/api/*` to Fastify/Payload, everything else to frontend

**Action:** Add as a note in the inventory header or §1 introduction.

---

### 🟡 GAP-030: Webhook PII Redaction (V2_DECISION_LOG Decision #4)

**Source:** V2_DECISION_LOG.md Decision #4  
**Status in Inventory:** ~90 webhook events listed but PII handling NOT mentioned

**What's Missing:**

- **Automatic PII Stripping:** Before sending webhook payload, system strips:
  - `nationalId`
  - `phone` (last 4 digits only)
  - `email` (masked: `a***@domain.com`)
  - `insurance[].policyNumber`
  - Any field flagged as `encrypted` in schema
- **Full Data Access:** If webhook consumer needs full data, they must call the API with proper auth
- **Rationale:** HIPAA/GDPR compliance — webhook endpoints are third-party controlled

**Action:** Add PII redaction rules to §8 Webhook Events section.

---

### 🟡 GAP-031: Pricing Edge Cases (V2_DECISION_LOG Decision #5)

**Source:** V2_DECISION_LOG.md Decision #5  
**Status in Inventory:** pricing_config collection listed but edge cases NOT described

**What's Missing:**

- **Mid-Cycle Module Add:** Pro-rated billing for partial month
- **Mid-Cycle Module Remove:** No refund, access until end of billing period
- **Failed Payment Grace Period:** 3 days grace, then feature degradation (read-only), then 7 more days, then suspension
- **Coupon Stacking:** Only 1 coupon per invoice (no stacking)
- **Price Calculation Waterfall (5 steps):**
  1. Start with base module price from `pricing_config`
  2. Apply per-tenant `priceOverride` if set
  3. Apply per-tenant `discountPercent` if set
  4. Apply active coupon discount
  5. Apply global discount if active
- **Usage Limits:** 10 free users → $5/extra user; 1GB free storage → $2/extra GB

**Action:** Add pricing edge cases and waterfall to a new pricing section or in Billing/Platform Modules.

---

### 🟡 GAP-032: ApiError Standardization (V2_DECISION_LOG Decision #2)

**Source:** V2_DECISION_LOG.md Decision #2  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- **Standard Error Response Format:**

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Human-readable message",
  "details": [{ "field": "email", "code": "INVALID_FORMAT" }],
  "requestId": "req_abc123"
}
```

- **Error Code Catalog:** Standardized error codes (VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, RATE_LIMITED, INTERNAL_ERROR)
- **ApiError Class:** Custom error class extending Error with statusCode, error code, details
- **Fastify Error Handler:** Global error handler that formats all errors consistently

**Action:** Add to §3 Security or create new "Error Handling" section.

---

### 🟡 GAP-033: Socket.io Redis Adapter (V2_DECISION_LOG Decision #18)

**Source:** V2_DECISION_LOG.md Decision #18  
**Status in Inventory:** Socket.io rooms listed but Redis Adapter NOT mentioned

**What's Missing:**

- **@socket.io/redis-adapter:** Required for Socket.io to work across multiple API server instances
- **Redis pub/sub:** Uses dedicated Redis pub/sub for cross-instance event distribution
- **Why:** Without this, Socket.io events on instance A won't reach clients on instance B
- **Configuration:** Separate Redis connection from BullMQ (or shared with different prefix)

**Action:** Add to §4.3 Storage or §7 Socket.io section.

---

### 🟡 GAP-034: Tailwind Logical Properties for RTL (MASTER_PLAN §26)

**Source:** DENTO_V2_MASTER_PLAN.md §26, ADMIN_PORTAL_SCREENS.md  
**Status in Inventory:** RTL/LTR mentioned generically but implementation NOT described

**What's Missing:**

- **Tailwind CSS Logical Properties:** Use `ps-` / `pe-` / `ms-` / `me-` instead of `pl-` / `pr-` / `ml-` / `mr-`
- **Direction Attribute:** `<html dir="rtl" lang="ar">` set dynamically
- **NativeWind for Mobile:** Same logical properties in React Native
- **Mirror-Exempt Elements:** Logos, LTR text blocks, phone numbers, code snippets
- **Bidirectional Text:** Use `dir="auto"` on user-generated content fields

**Action:** Add RTL implementation details to a "UI Standards" section.

---

### 🟡 GAP-035: 34-Week Timeline vs 26-Week (V2_DECISION_LOG Decision #7)

**Source:** V2_DECISION_LOG.md Decision #7  
**Status in Inventory:** §10 says **26 weeks** — this is OUTDATED

**What's Missing:**

- **Decision:** Timeline extended from 26 weeks to **34 weeks** (8 months)
- **Reason:** Added: pen-testing, accessibility compliance, performance testing, 3-tier staging
- **Extra 8 weeks distributed across:** Testing hardening (2w), Security audit (2w), Staging/QA (2w), Buffer (2w)

**Action:** UPDATE §10 Timeline to reflect 34 weeks. This is an **error** in the inventory.

---

### 🟡 GAP-036: Test Infrastructure (V2_DECISION_LOG Decision #8)

**Source:** V2_DECISION_LOG.md Decision #8  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- **60% Code Coverage Target** (minimum for all modules)
- **Test Stack:**
  - Unit/Integration: Vitest
  - E2E: Playwright (web), Detox (mobile)
  - API: Supertest
  - Load: k6
- **Test Database:** MongoDB Memory Server for unit tests
- **Test Patterns:** Factory pattern for test data, isolated tenant per test suite
- **CI Gate:** PRs blocked if coverage drops below 60%

**Action:** Add `### Testing Infrastructure` section.

---

### 🟡 GAP-037: WCAG 2.1 AA Accessibility (V2_DECISION_LOG Decision #11)

**Source:** V2_DECISION_LOG.md Decision #11  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- **WCAG 2.1 Level AA** compliance requirement for Admin Portal
- **Key Requirements:**
  - Keyboard navigation on all interactive elements
  - Focus indicators (visible focus rings)
  - Screen reader compatibility (ARIA labels)
  - Color contrast ratio ≥ 4.5:1 (text), ≥ 3:1 (large text)
  - Skip navigation links
  - Form label associations
  - Error identification and suggestion
- **Testing:** axe-core integration in E2E tests
- **Phase:** Applied incrementally from Phase 2 onward

**Action:** Add accessibility requirements section.

---

### 🟡 GAP-038: Dunning Escalation Logic (V2_DATABASE.md)

**Source:** V2_DATABASE.md  
**Status in Inventory:** saas_dunning_log collection listed but escalation NOT described

**What's Missing:**

- **Escalation Levels:**
  1. Day 1: Email notification of failed payment
  2. Day 3: Second attempt + SMS notification
  3. Day 7: Feature degradation (paid modules → read-only mode)
  4. Day 10: Third attempt + final warning email
  5. Day 14: Tenant suspended (all access blocked except billing page)
- **Auto-Retry:** BullMQ job retries payment at each escalation step
- **Recovery:** Successful payment at any step immediately restores full access
- **Admin Override:** Platform admin can extend grace period or waive

**Action:** Add escalation logic to Billing section or Platform Modules.

---

### 🟡 GAP-039: Error Log Fingerprint Deduplication (V2_DATABASE.md)

**Source:** V2_DATABASE.md  
**Status in Inventory:** error_logs collection listed but fingerprint NOT mentioned

**What's Missing:**

- **Fingerprint Field:** SHA-256 hash of (error message + stack trace first 3 frames)
- **Grouping:** Identical errors grouped by fingerprint instead of creating duplicate entries
- **Counter:** `occurrenceCount` incremented on duplicate, `lastOccurredAt` updated
- **Purpose:** Prevents error_logs from bloating with repeated identical errors (e.g., network timeouts)

**Action:** Add fingerprint dedup to error_logs description in §5.1.

---

### 🟡 GAP-040: perioData in Dental Charts (V2_DATABASE.md)

**Source:** V2_DATABASE.md  
**Status in Inventory:** dental_charts key fields don't mention perioData

**What's Missing:**

- **perioData Field:** Embedded periodontal examination data in dental_charts
- **Structure:** Per-tooth probing depths (6 points), bleeding on probing, recession, mobility grade, furcation involvement
- **Purpose:** Perio charting module built into dental chart — no separate collection needed
- **UI:** Clickable periodontal chart with 6-point depth entry per tooth

**Action:** Add perioData to dental_charts key fields in §5.2.

---

## 4. LOW — Supplementary Info Not in Inventory

### 🔵 GAP-041: Admin Portal Screen Wireframes (ADMIN_PORTAL_SCREENS.md)

**Source:** ADMIN_PORTAL_SCREENS.md (1,668 lines)  
**Status in Inventory:** UI page counts mentioned (~70+ admin, ~20+ dev) but NO wireframes

**What's Missing:**

- 16 detailed ASCII wireframes for Admin Portal screens
- Dark mode color tokens (Tailwind CSS config variables)
- Responsive breakpoints: sm(640), md(768), lg(1024), xl(1280)
- Component library references per screen (which Shadcn/TailAdmin components to use)

**Action:** Reference ADMIN_PORTAL_SCREENS.md in inventory or extract key layout decisions.

---

### 🔵 GAP-042: Dev Portal Screen Wireframes (DEV_PORTAL_SCREENS.md)

**Source:** DEV_PORTAL_SCREENS.md (730 lines)  
**Status in Inventory:** ~20+ dev portal pages mentioned but NO screen details

**What's Missing:**

- 13 detailed screen wireframes
- **Channels Tab** (notification channel management per tenant) — no endpoints for this
- **User Sessions Screen** — platform-level session viewer
- **Monitoring Error Timeline** — error visualization with trends
- **Billing MRR Views** — Monthly Recurring Revenue dashboard for platform
- **4 Additional screens from V2_DECISION_LOG Decision #11:**
  - Monitoring Dashboard (health metrics, uptime, latency)
  - Backup Management (tenant backup browser with restore/download)
  - i18n Translation Editor (WYSIWYG translation editing)
  - Module Dependency Visualizer (graph showing module dependencies)

**Action:** Reference DEV_PORTAL_SCREENS.md and add 4 missing screens.

---

### 🔵 GAP-043: Complete Dependency List (~148 Packages) (TECH_REQUIREMENTS.md)

**Source:** TECH_REQUIREMENTS.md  
**Status in Inventory:** Only key packages mentioned

**What's Missing:**

- Full package.json dependency list with version ranges
- Security-specific packages by phase (helmet, cors, rate-limit-redis, etc.)
- Dev dependencies (vitest, playwright, typescript, eslint, prettier, etc.)
- Package grouping by purpose (core/security/UI/test/build)

**Action:** Reference TECH_REQUIREMENTS.md for build or add as appendix.

---

### 🔵 GAP-044: .env Structure (TECH_REQUIREMENTS.md)

**Source:** TECH_REQUIREMENTS.md  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- Environment variable structure for: development, staging, production
- Secret naming conventions
- Required vs optional env vars
- Service connection strings format

**Action:** Reference TECH_REQUIREMENTS.md or add environment configuration section.

---

### 🔵 GAP-045: Go/No-Go Gate Criteria (IMPLEMENTATION_ROADMAP.md)

**Source:** IMPLEMENTATION_ROADMAP.md  
**Status in Inventory:** 7 phases listed but NO gate criteria

**What's Missing:**

- 8 milestones with Go/No-Go criteria:
  - Phase 0 → 1: Docker works, Payload up, CI green
  - Phase 1 → 2: Auth passes pen-test, tenant isolation verified
  - Phase 2 → 3: All dev portal modules functional, dashboards load < 2s
  - etc.
- 15-item Definition of Done:
  - Code reviewed, tests pass, 60% coverage, TypeScript strict, no ESLint errors, API documented, RTL tested, mobile-responsive, audit log verified, security scanned, deployed to staging, QA signed off, etc.

**Action:** Add gate criteria to §10 Timeline or reference IMPLEMENTATION_ROADMAP.md.

---

### 🔵 GAP-046: Risk Register (IMPLEMENTATION_ROADMAP.md)

**Source:** IMPLEMENTATION_ROADMAP.md  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- 8 identified risks with mitigations:
  1. MongoDB performance at scale → Index optimization + Atlas auto-scaling
  2. Paymob API instability → Retry with fallback + manual payment recording
  3. Realm sync conflicts → Conflict resolution strategy + manual override
  4. Timeline overrun → 34-week buffer + feature prioritization
  5. Developer availability → Monorepo enables parallel workstreams
  6. Security vulnerability → Automated scanning + pen-test gates
  7. Third-party service costs → Usage limits + cost alerts
  8. Data migration failures → Validation reports + rollback capability

**Action:** Reference IMPLEMENTATION_ROADMAP.md or add risk section.

---

### 🔵 GAP-047: Security Integration Map (IMPLEMENTATION_ROADMAP.md)

**Source:** IMPLEMENTATION_ROADMAP.md  
**Status in Inventory:** Security features listed but NOT mapped to phases

**What's Missing:**

- 36 security items mapped across 15 layers showing WHICH security feature is built in WHICH phase
- e.g., "Rate Limiting" → Phase 1, "PII Encryption" → Phase 1, "ClamAV" → Phase 3, "Pen Test" → Phase 6

**Action:** Reference IMPLEMENTATION_ROADMAP.md or add phase assignments to §3 Security.

---

### 🔵 GAP-048: 80+ New Features Table (MASTER_PLAN §31)

**Source:** DENTO_V2_MASTER_PLAN.md §31  
**Status in Inventory:** Not a separate inventory item

**What's Missing:**

- Complete table of v2-ONLY features not in v1, with phase assignments
- Useful as a cross-reference checklist during build
- Includes items like: DB Explorer, Chat System, Module Versioning, Online Booking, Slot Engine, Stock Counts, Inter-Branch Transfers, Barcode Scanning, Imaging Requirements, Pre/Post Op Viewer, Alert Rules, etc.

**Action:** Reference MASTER_PLAN §31 or include as appendix for build tracking.

---

### 🔵 GAP-049: Cost Projections (MASTER_PLAN §36)

**Source:** DENTO_V2_MASTER_PLAN.md §36  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- Monthly infrastructure costs at 3 scale points:
  - 50 tenants: ~$88/mo
  - 200 tenants: ~$196/mo
  - 500 tenants: ~$397/mo
- One-time costs (domain, certificates, initial services setup)
- Paymob variable fees per transaction

**Action:** Add as reference or appendix.

---

### 🔵 GAP-050: 3-Tier Staging Environment (V2_DECISION_LOG Decision #15)

**Source:** V2_DECISION_LOG.md Decision #15  
**Status in Inventory:** CI/CD mentioned generically

**What's Missing:**

- **3 Environments:** development → staging → production
- **Staging:** Near-identical to production (same Docker images, same env structure, seed data)
- **Deployment Flow:** PR → CI passes → staging auto-deploy → QA → manual production deploy
- **Staging Database:** Separate MongoDB Atlas cluster with anonymized production data

**Action:** Add to §4.5 CI/CD & Deployment.

---

### 🔵 GAP-051: Key Rotation Schedule (V2_DECISION_LOG Decision #13)

**Source:** V2_DECISION_LOG.md Decision #13  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- **90-Day Key Rotation:** Encryption master key rotated every 90 days
- **Per-Tenant Key Derivation:** HKDF(masterKey, tenantId + salt) — each tenant has unique derived key
- **Rotation Process:** Old key retained for decrypt, new key used for encrypt (dual-key window)
- **Automated:** BullMQ job or GitHub Action triggers rotation

**Action:** Add to §3.2 Encryption.

---

### 🔵 GAP-052: Pen-Test Strategy (V2_DECISION_LOG Decision #12)

**Source:** V2_DECISION_LOG.md Decision #12  
**Status in Inventory:** NOT mentioned

**What's Missing:**

- Pre-launch penetration testing plan
- OWASP Top 10 focus areas
- Internal (automated: OWASP ZAP baseline scan) + External (manual pen-tester)
- Phase 6 timeline
- Fix/re-test cycle before production launch

**Action:** Add to §3 Security or §10 Timeline.

---

---

## 5. Inventory Corrections

### ❌ CORRECTION-001: v1 Removed Tables Count

**Current (§ Summary Statistics):** "v1 Tables Removed: 22"  
**Correct (MASTER_PLAN §30):** **~30 tables removed** (tourism, website builder, themes, page builder, CMS, portfolio, testimonials, team members, contact, FAQs, navigation, media library, static translations, site settings, form submissions, countries, and more)

---

### ❌ CORRECTION-002: Timeline Duration

**Current (§10):** "26 weeks (~6 months)"  
**Correct (V2_DECISION_LOG Decision #7):** **34 weeks (~8 months)** — extended by 8 weeks for testing, security, staging, buffer

---

### ❌ CORRECTION-003: "25 collections × 7 CRUD" Count

**Current (§ Summary Statistics):** "Platform API Endpoints (Payload auto): ~175 (25 collections × 7 CRUD)"  
**Correct:** 26 collections × 7 CRUD = **182** (login_attempts was added as #26). Though login_attempts is Read-only so closer to 176.

---

### ❌ CORRECTION-004: New v2-only Collections Count

**Current (§ Summary Statistics):** "New v2-only Collections: 6"  
**Correct:** Far more than 6. From MASTER_PLAN: alert_rules, notification_preferences, device_tokens, queue_counters, chat_channels, chat_messages, notification_queue, report_schedules, schedule_exceptions, staff_schedules, shift_templates, leave_requests, leave_types, leave_balances, attendance, recurring_appointment_rules, appointment_waitlist, stock_transfers, stock_counts, login_attempts, support_tickets, walk_in_queue ≈ **22+ new collections**

---

---

## 6. Summary Statistics

| Category                                  | Count  |
| ----------------------------------------- | ------ |
| 🔴 CRITICAL — Entire systems missing      | 11     |
| 🟠 HIGH — Missing implementation details  | 16     |
| 🟡 MEDIUM — Design decisions not captured | 13     |
| 🔵 LOW — Supplementary info               | 12     |
| ❌ Corrections needed                     | 4      |
| **Total Gaps**                            | **56** |

### Top Priority Actions (Build-Blocking)

1. **GAP-001:** Add Support Ticketing System (full section with endpoints, SLA, UI)
2. **GAP-002:** Add Document Template & PDF Generation system
3. **GAP-004:** Add Branding Propagation (10 points)
4. **GAP-005:** Add API Catalog (auto-generated, no manual collections)
5. **GAP-007:** Add cornerstone3D DICOM Viewer to X-Ray module
6. **GAP-008:** Add ClamAV virus scanning
7. **GAP-010:** Add Security Anomaly Detection (8 alert types)
8. **GAP-012/013:** Add Slot Engine algorithm + 8 booking validation checks
9. **GAP-015:** Add User Onboarding flow details
10. **GAP-021:** Add Module Versioning lifecycle + canary rollout

### Documents to Cross-Reference During Build

| Doc                        | Primary Use                                 |
| -------------------------- | ------------------------------------------- |
| ADMIN_PORTAL_SCREENS.md    | UI wireframes for all 16 admin screens      |
| DEV_PORTAL_SCREENS.md      | UI wireframes for all 13 dev portal screens |
| V2_DECISION_LOG.md         | 33 architectural decisions (MUST follow)    |
| SECURITY_AND_ENCRYPTION.md | 80+ security checkpoints, DR plan           |
| TECH_REQUIREMENTS.md       | ~148 package versions, .env structure       |
| IMPLEMENTATION_ROADMAP.md  | Go/No-Go gates, Definition of Done, risks   |

---

> **Generated:** Gap analysis from complete reading of all 9 planning documents (21,700+ total lines)  
> **Recommendation:** Update PLANNED_FEATURE_INVENTORY.md with all CRITICAL and HIGH gaps before starting Phase 0.

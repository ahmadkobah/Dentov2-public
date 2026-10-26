# DENTO V2 — Complete Database Architecture

> **Datei:** `V2_DATABASE.md`
> **Erstellt:** 2026-02-25
> **Basis:** v1 Supabase (78 Migrations, ~107 aktive Postgres-Tabellen) → v2 MongoDB (~50 Collections)
> **Referenzen:** DENTO_V2_MASTER_PLAN.md, SECURITY_AND_ENCRYPTION.md, V2_STRUCTURE.md, TECH_REQUIREMENTS.md

---

## Inhaltsverzeichnis

1. [Architektur-Übersicht](#1-architektur-übersicht)
2. [v1 → v2 Migration Map](#2-v1--v2-migration-map)
3. [Embedding-Strategie](#3-embedding-strategie)
4. [Platform-DB: `dento_platform`](#4-platform-db-dento_platform)
5. [Tenant-DB: `tenant_{slug}` — Patients & Clinical](#5-tenant-db-patients--clinical)
6. [Tenant-DB: Appointments & Scheduling](#6-tenant-db-appointments--scheduling)
7. [Tenant-DB: Billing & Finance](#7-tenant-db-billing--finance)
8. [Tenant-DB: Inventory & Supply Chain](#8-tenant-db-inventory--supply-chain)
9. [Tenant-DB: Staff & HR](#9-tenant-db-staff--hr)
10. [Tenant-DB: Communication & Notifications](#10-tenant-db-communication--notifications)
11. [Tenant-DB: Settings & Lookups](#11-tenant-db-settings--lookups)
12. [Index-Strategie](#12-index-strategie)
13. [Sicherheit & Verschlüsselung](#13-sicherheit--verschlüsselung)
14. [Entfernte Tabellen (v1 → gelöscht)](#14-entfernte-tabellen)
15. [Collection-Zählung: Gesamt](#15-collection-zählung-gesamt)

---

## 1. Architektur-Übersicht

### v1: Supabase / PostgreSQL (Single-Database)

```
Supabase Project
└── public schema
    ├── 107 aktive Tabellen (nach 78 Migrations)
    ├── 10 gelöschte Tabellen (Page Builder, Themes)
    ├── RLS Policies pro Tabelle (~180 Policies)
    ├── Triggers (updated_at, invoice_number, patient_code)
    ├── tenant_id Spalte auf ~30 Tabellen (Mig. 045)
    └── Kein echte DB-Isolation — alle Tenants in 1 DB
```

### v2: MongoDB Atlas / Database-per-Tenant

```
MongoDB Atlas Cluster (M10-M30)
│
├── dento_platform                     ← Payload CMS verwaltet
│   ├── ~24 Collections                  (Platform-Level)
│   ├── ~4 Globals (Singletons)          (system_settings, branding, etc.)
│   └── Indexes: ~45
│
├── tenant_clinic_cairo                ← Isolierte Tenant-DB #1
│   ├── ~35 Collections                  (Klinik-Daten)
│   └── Indexes: ~80
│
├── tenant_clinic_riyadh               ← Isolierte Tenant-DB #2
│   ├── ~35 Collections                  (identische Struktur)
│   └── Indexes: ~80
│
└── tenant_clinic_dubai                ← Isolierte Tenant-DB #3
    └── ... (gleiche Collections)
```

### Warum Database-per-Tenant?

| Kriterium       | v1 (Shared DB + tenant_id)                            | v2 (Separate DB)                              |
| :-------------- | :---------------------------------------------------- | :-------------------------------------------- |
| **Isolation**   | ❌ RLS-Policy vergessen = Datenleck                   | ✅ Physisch getrennt, unmöglich zu vermischen |
| **Performance** | ❌ 500 Tenants × 50k Patients = 25M Rows in 1 Tabelle | ✅ Jeder Tenant hat eigene kleine Collections |
| **Backup**      | ❌ Nur ganzes Projekt                                 | ✅ `mongodump --db tenant_xyz` pro Tenant     |
| **Löschung**    | ❌ DELETE WHERE tenant_id = X (riskant)               | ✅ `db.dropDatabase()` — sauber und komplett  |
| **Skalierung**  | ❌ Vertikales Scaling (größerer Server)               | ✅ Sharding pro DB möglich                    |
| **Compliance**  | ❌ Schwer nachweisbar                                 | ✅ "Ihre Daten sind in eigener DB"            |

### Verbindungs-Strategie

```typescript
// Middleware: tenantDb()
// Einmal pro Request — cached via Connection Pool

import mongoose from 'mongoose';

const tenantConnections = new Map<string, mongoose.Connection>();

export function getTenantDb(slug: string): mongoose.Connection {
  if (!tenantConnections.has(slug)) {
    const conn = mongoose.connection.useDb(`tenant_${slug}`, {
      useCache: true, // Connection-Pool wiederverwenden
    });
    tenantConnections.set(slug, conn);
  }
  return tenantConnections.get(slug)!;
}
```

---

## 2. v1 → v2 Migration Map

### Vollständige Tabellen-Migration (107 v1 → ~50 v2)

#### Legende

| Symbol | Bedeutung                                      |
| :----: | :--------------------------------------------- |
|   ✅   | 1:1 portiert (Name gleich oder umbenannt)      |
|   🔀   | Zusammengeführt (Embedded in anderes Document) |
|   🆕   | Neu in v2 (existierte nicht in v1)             |
|   ❌   | Gelöscht (nicht in v2)                         |
|   📍   | Verschoben (Platform → Tenant oder umgekehrt)  |

#### Core / Klinik

| #   | v1 Tabelle (Postgres)       | v2 Collection (MongoDB)           | DB       | Änderung                             |
| :-- | :-------------------------- | :-------------------------------- | :------- | :----------------------------------- |
| 1   | `users` + `user_profiles`   | `users` (Payload)                 | Platform | 🔀 Profil embedded als `profile: {}` |
| 2   | `login_history`             | `audit_logs` (Payload)            | Platform | 🔀 Teil des Audit-Logs               |
| 3   | `branches`                  | `branches`                        | Tenant   | ✅                                   |
| 4   | `chairs`                    | `branches.chairs[]` oder `chairs` | Tenant   | 🔀 Optional embedded                 |
| 5   | `doctors`                   | `doctors`                         | Tenant   | ✅ + `certificates[]` embedded       |
| 6   | `doctor_branch_assignments` | `doctors.assignedBranches[]`      | Tenant   | 🔀 Embedded Array                    |
| 7   | `doctor_availability`       | `doctor_schedules`                | Tenant   | ✅ Umbenannt                         |
| 8   | `doctor_certificates`       | `doctors.certificates[]`          | Tenant   | 🔀 Embedded Array                    |

#### Patienten

| #   | v1 Tabelle                              | v2 Collection             | DB     | Änderung                            |
| :-- | :-------------------------------------- | :------------------------ | :----- | :---------------------------------- |
| 9   | `patients`                              | `patients`                | Tenant | ✅ + Embedded Fields                |
| 10  | `patient_medical_history`               | `patients.medicalHistory` | Tenant | 🔀 Embedded Object                  |
| 11  | `patient_allergies`                     | `patients.allergies[]`    | Tenant | 🔀 Embedded Array                   |
| 12  | `patient_family_links`                  | `patients.familyLinks[]`  | Tenant | 🔀 Embedded Array                   |
| 13  | `patient_insurance`                     | `patients.insurance[]`    | Tenant | 🔀 Embedded Array (optional, Modul) |
| 14  | `dental_charts`                         | `dental_charts`           | Tenant | ✅ + Erweiterte Conditions          |
| 15  | `dental_chart_history`                  | `dental_chart_history`    | Tenant | ✅                                  |
| 16  | `medical_history` (Mig. 002b duplicate) | `patients.medicalHistory` | Tenant | 🔀 Zusammengeführt mit #10          |

#### Termine & Scheduling

| #   | v1 Tabelle                    | v2 Collection                         | DB     | Änderung                              |
| :-- | :---------------------------- | :------------------------------------ | :----- | :------------------------------------ |
| 17  | `appointments`                | `appointments`                        | Tenant | ✅ + Neue Felder                      |
| 18  | `appointment_types`           | `appointment_types`                   | Tenant | ✅ Erweitert um Farbe, Online-Booking |
| 19  | `recurring_appointment_rules` | `appointments.recurringRule` embedded | Tenant | 🔀 Embedded                           |
| 20  | `appointment_waitlist`        | `waitlist`                            | Tenant | ✅ Umbenannt                          |
| 21  | `walk_in_queue`               | `walk_in_queue`                       | Tenant | ✅                                    |
| 22  | `queue_counters`              | `walk_in_queue` (auto-increment)      | Tenant | 🔀 In Queue integriert                |
| 23  | `schedule_exceptions`         | `schedule_exceptions`                 | Tenant | ✅                                    |

#### Klinisch / Behandlung

| #   | v1 Tabelle                 | v2 Collection              | DB     | Änderung                                               |
| :-- | :------------------------- | :------------------------- | :----- | :----------------------------------------------------- |
| 24  | `treatments`               | `procedure_notes`          | Tenant | ✅ Umbenannt (Verwechslungsgefahr mit treatment_plans) |
| 25  | `treatment_plans`          | `treatment_plans`          | Tenant | ✅ + `items[]` embedded                                |
| 26  | `treatment_plan_items`     | `treatment_plans.items[]`  | Tenant | 🔀 Embedded Array                                      |
| 27  | `procedure_notes`          | `procedure_notes`          | Tenant | ✅                                                     |
| 28  | `procedure_note_templates` | `procedure_note_templates` | Tenant | ✅                                                     |
| 29  | `consent_templates`        | `consent_templates`        | Tenant | ✅                                                     |
| 30  | `consent_forms`            | `consent_forms`            | Tenant | ✅                                                     |
| 31  | `prescriptions`            | `prescriptions`            | Tenant | ✅ + `items[]` embedded                                |
| 32  | `prescription_items`       | `prescriptions.items[]`    | Tenant | 🔀 Embedded Array                                      |
| 33  | `medications`              | `medications`              | Tenant | ✅ Per-Tenant Seed                                     |

#### Imaging

| #   | v1 Tabelle          | v2 Collection        | DB     | Änderung                                            |
| :-- | :------------------ | :------------------- | :----- | :-------------------------------------------------- |
| 34  | `xrays`             | `xrays`              | Tenant | ✅ + Cross-Links (treatmentPlanId, procedureNoteId) |
| 35  | `xray_types`        | `xray_types`         | Tenant | ✅                                                  |
| 36  | `cbct_orders`       | `cbct_orders`        | Tenant | ✅ + `scan` + `report` embedded                     |
| 37  | `cbct_scans`        | `cbct_orders.scan`   | Tenant | 🔀 Embedded Object                                  |
| 38  | `cbct_reports`      | `cbct_orders.report` | Tenant | 🔀 Embedded Object                                  |
| 39  | `cbct_scan_regions` | `cbct_scan_regions`  | Tenant | ✅ Seed-Daten                                       |

#### Lab

| #   | v1 Tabelle        | v2 Collection     | DB     | Änderung                      |
| :-- | :---------------- | :---------------- | :----- | :---------------------------- |
| 40  | `dental_labs`     | `dental_labs`     | Tenant | ✅                            |
| 41  | `lab_orders`      | `lab_orders`      | Tenant | ✅                            |
| 42  | `lab_order_types` | `lab_order_types` | Tenant | ✅ Per-Tenant Seed (14 Typen) |

#### Billing & Finanzen

| #   | v1 Tabelle             | v2 Collection                  | DB     | Änderung                   |
| :-- | :--------------------- | :----------------------------- | :----- | :------------------------- |
| 43  | `invoices`             | `invoices`                     | Tenant | ✅ + `items[]` embedded    |
| 44  | `invoice_items`        | `invoices.items[]`             | Tenant | 🔀 Embedded Array          |
| 45  | `payments`             | `payments`                     | Tenant | ✅                         |
| 46  | `doctor_commissions`   | `doctor_commissions`           | Tenant | ✅                         |
| 47  | `commission_payouts`   | `commission_payouts`           | Tenant | ✅                         |
| 48  | `installment_plans`    | `installment_plans`            | Tenant | ✅ + `payments[]` embedded |
| 49  | `installment_payments` | `installment_plans.payments[]` | Tenant | 🔀 Embedded Array          |
| 50  | `daily_reconciliation` | `reconciliation`               | Tenant | ✅ Umbenannt               |
| 51  | `insurance_companies`  | `insurance_companies`          | Tenant | ✅                         |
| 52  | `insurance_claims`     | `insurance_claims`             | Tenant | ✅                         |

#### Inventory & Supply Chain

| #   | v1 Tabelle                     | v2 Collection                          | DB     | Änderung                  |
| :-- | :----------------------------- | :------------------------------------- | :----- | :------------------------ |
| 53  | `inventory_categories`         | `inventory_categories`                 | Tenant | ✅                        |
| 54  | `inventory_items`              | `inventory_items`                      | Tenant | ✅ + Barcode, Bilder      |
| 55  | `inventory_stock`              | `inventory_stock`                      | Tenant | ✅ + `batches[]` embedded |
| 56  | `inventory_movements`          | `inventory_movements`                  | Tenant | ✅                        |
| 57  | `suppliers`                    | `suppliers`                            | Tenant | ✅ + Rating, Performance  |
| 58  | `purchase_orders`              | `purchase_orders`                      | Tenant | ✅ + `items[]` embedded   |
| 59  | `purchase_order_items`         | `purchase_orders.items[]`              | Tenant | 🔀 Embedded Array         |
| 60  | `service_materials`            | `services.defaultMaterials[]`          | Tenant | 🔀 Embedded in Services   |
| 61  | `procedure_template_materials` | `procedure_note_templates.materials[]` | Tenant | 🔀 Embedded               |
| 62  | `procedure_material_usage`     | `inventory_movements` (type=procedure) | Tenant | 🔀 Merged                 |
| 63  | —                              | `stock_transfers`                      | Tenant | 🆕                        |
| 64  | —                              | `stock_counts`                         | Tenant | 🆕                        |

#### Staff & HR

| #   | v1 Tabelle        | v2 Collection     | DB     | Änderung     |
| :-- | :---------------- | :---------------- | :----- | :----------- |
| 65  | `shift_templates` | `shift_templates` | Tenant | ✅           |
| 66  | `staff_schedules` | `staff_schedules` | Tenant | ✅           |
| 67  | `time_attendance` | `attendance`      | Tenant | ✅ Umbenannt |
| 68  | `leave_types`     | `leave_types`     | Tenant | ✅           |
| 69  | `leave_requests`  | `leave_requests`  | Tenant | ✅           |
| 70  | `leave_balances`  | `leave_balances`  | Tenant | ✅           |

#### Notifications / Communication

| #   | v1 Tabelle               | v2 Collection                           | DB     | Änderung     |
| :-- | :----------------------- | :-------------------------------------- | :----- | :----------- |
| 71  | `notification_logs`      | `notification_queue` (BullMQ + MongoDB) | Tenant | ✅ Umbenannt |
| 72  | `notification_templates` | `notification_templates`                | Tenant | ✅           |
| 73  | —                        | `chat_channels`                         | Tenant | 🆕           |
| 74  | —                        | `chat_messages`                         | Tenant | 🆕           |
| 75  | `contact_messages`       | ❌ Entfernt (Website)                   | —      | ❌           |

#### Platform / SaaS

| #   | v1 Tabelle                | v2 Collection                    | DB       | Änderung     |
| :-- | :------------------------ | :------------------------------- | :------- | :----------- |
| 76  | `tenants`                 | `tenants` (Payload)              | Platform | ✅           |
| 77  | `tenant_users`            | `users` (Payload, mit tenantId)  | Platform | 🔀 Merged    |
| 78  | `subscription_plans`      | `pricing_config` (Payload)       | Platform | ✅ Umbenannt |
| 79  | `modules`                 | `modules` (Payload)              | Platform | ✅           |
| 80  | `tenant_modules`          | `tenant_modules` (Payload)       | Platform | ✅           |
| 81  | `tenant_usage_metrics`    | `tenant_usage_metrics` (Payload) | Platform | ✅           |
| 82  | `saas_audit_trail`        | `audit_logs` (Payload)           | Platform | ✅ Umbenannt |
| 83  | `api_keys`                | `api_keys` (Payload)             | Platform | ✅           |
| 84  | `api_key_usage`           | `api_key_usage` (Payload)        | Platform | ✅           |
| 85  | `webhooks`                | `webhooks` (Payload)             | Platform | ✅           |
| 86  | `webhook_logs`            | `webhook_logs` (Payload)         | Platform | ✅           |
| 87  | `webhook_event_types`     | `webhook_event_types` (Payload)  | Platform | ✅           |
| 88  | `feature_flags`           | `feature_flags` (Payload)        | Platform | ✅           |
| 89  | `deployments`             | `deployments` (Payload)          | Platform | ✅           |
| 90  | `tenant_deployments`      | `deployments.tenantStatus[]`     | Platform | 🔀 Embedded  |
| 91  | `domains`                 | `domains` (Payload)              | Platform | ✅           |
| 92  | `deployment_hooks`        | ❌ Replaced by webhooks          | —        | ❌           |
| 93  | `error_logs`              | `error_logs` (Payload)           | Platform | ✅           |
| 94  | `application_logs`        | `error_logs` (merged)            | Platform | 🔀           |
| 95  | `health_checks`           | Uptime via Railway/external      | —        | ❌ Extern    |
| 96  | `alerts`                  | BullMQ + `notification_queue`    | Platform | 🔀           |
| 97  | `alert_rules`             | `alert_rules`                    | Tenant   | 📍 → Tenant  |
| 98  | `notification_channels`   | `settings.notificationChannels`  | Tenant   | 🔀 Embedded  |
| 99  | `support_sessions`        | `support_sessions` (Payload)     | Platform | ✅           |
| 100 | `support_session_actions` | `support_sessions.actions[]`     | Platform | 🔀 Embedded  |
| 101 | `support_recordings`      | `support_sessions.recording`     | Platform | 🔀 Embedded  |
| 102 | `user_sessions`           | `user_sessions` (Payload)        | Platform | ✅           |
| 103 | `saas_invoices`           | `saas_invoices` (Payload)        | Platform | ✅           |
| 104 | `saas_invoice_items`      | `saas_invoices.items[]`          | Platform | 🔀 Embedded  |
| 105 | `saas_payments`           | `saas_payments` (Payload)        | Platform | ✅           |
| 106 | `saas_dunning_log`        | `saas_dunning_log` (Payload)     | Platform | ✅           |
| 107 | `saas_stripe_products`    | `pricing_config.stripeSync`      | Platform | 🔀 Embedded  |
| 108 | `saas_plan_changes`       | `audit_logs` (type=plan_change)  | Platform | 🔀           |
| 109 | `backups`                 | `backups` (Payload)              | Platform | ✅           |
| 110 | `backup_settings`         | Global: `backup_config`          | Platform | ✅ Singleton |
| 111 | `dev_backup_settings`     | Global: `backup_config`          | Platform | 🔀 Merged    |

#### Regional / i18n

| #   | v1 Tabelle         | v2 Collection                  | DB       | Änderung         |
| :-- | :----------------- | :----------------------------- | :------- | :--------------- |
| 112 | `countries`        | `country_config` (Payload)     | Platform | ✅ Umbenannt     |
| 113 | `currencies`       | Global: `currencies` (Payload) | Platform | ✅ Singleton     |
| 114 | `translations`     | `translation_packs` (Payload)  | Platform | ✅ Umbenannt     |
| 115 | `role_permissions` | Hardcoded in `@dento/shared`   | —        | ❌ Kein DB nötig |

#### CMS / Website / Media

| #   | v1 Tabelle           | v2 Collection                       | DB       | Änderung     |
| :-- | :------------------- | :---------------------------------- | :------- | :----------- |
| 116 | `services`           | `services`                          | Tenant   | ✅           |
| 117 | `service_categories` | `service_categories`                | Tenant   | ✅           |
| 118 | `site_settings`      | `settings`                          | Tenant   | ✅ Umbenannt |
| 119 | `system_settings`    | Global: `system_settings` (Payload) | Platform | ✅ Singleton |
| 120 | `media`              | `media` (Payload)                   | Platform | ✅           |
| 121 | `faqs`               | ❌ Entfernt (Website)               | —        | ❌           |
| 122 | `form_submissions`   | ❌ Entfernt (Website)               | —        | ❌           |
| 123 | `website_settings`   | ❌ Entfernt (Website)               | —        | ❌           |
| 124 | `team_members`       | `doctors` (vereint)                 | Tenant   | 🔀           |
| 125 | `testimonials`       | ❌ Entfernt (Website)               | —        | ❌           |
| 126 | `portfolio_cases`    | ❌ Entfernt (Website)               | —        | ❌           |
| 127 | `tourism_packages`   | ❌ Entfernt (Website)               | —        | ❌           |
| 128 | `api_definitions`    | OpenAPI Spec (File, kein DB)        | —        | ❌           |

### Zusammenfassung der Migration

| Kategorie        | v1 Tabellen | v2 Collections | Differenz | Wie?                                                        |
| :--------------- | :---------: | :------------: | :-------: | :---------------------------------------------------------- |
| **Embedded**     |     28      |       0        |    -28    | In Parent-Document zusammengeführt                          |
| **1:1 portiert** |     52      |       52       |     0     | Gleiche oder umbenannte Collection                          |
| **Entfernt**     |     22      |       0        |    -22    | Website, Tourism, CMS, PageBuilder, Themes                  |
| **Neu in v2**    |      0      |       4        |    +4     | chat_channels, chat_messages, stock_transfers, stock_counts |
| **In Code**      |      5      |       0        |    -5     | role_permissions, api_definitions, deployment_hooks, etc.   |
| **Gesamt**       |  **~107**   |    **~56**     |  **-51**  | **48% Reduktion**                                           |

---

## 3. Embedding-Strategie

### Was wird embedded (und warum)

| Parent Collection   | Embedded Field       | v1 Tabelle                                    | Max. Array-Größe | Grund                     |
| :------------------ | :------------------- | :-------------------------------------------- | :--------------: | :------------------------ |
| `patients`          | `allergies[]`        | `patient_allergies`                           |       ~20        | Immer zusammen geladen    |
| `patients`          | `medicalHistory`     | `patient_medical_history` + `medical_history` |     1 Object     | 1:1 Beziehung             |
| `patients`          | `familyLinks[]`      | `patient_family_links`                        |       ~10        | Selten separat abgefragt  |
| `patients`          | `insurance[]`        | `patient_insurance`                           |        ~3        | Optional (Modul-abhängig) |
| `invoices`          | `items[]`            | `invoice_items`                               |       ~50        | Immer zusammen angezeigt  |
| `prescriptions`     | `items[]`            | `prescription_items`                          |       ~15        | Immer zusammen gedruckt   |
| `treatment_plans`   | `items[]`            | `treatment_plan_items`                        |       ~30        | Sequenzielle Anzeige      |
| `installment_plans` | `payments[]`         | `installment_payments`                        |       ~24        | Max 24 Raten              |
| `doctors`           | `certificates[]`     | `doctor_certificates`                         |       ~20        | Profil-Anzeige            |
| `doctors`           | `assignedBranches[]` | `doctor_branch_assignments`                   |       ~10        | Schneller Lookup          |
| `purchase_orders`   | `items[]`            | `purchase_order_items`                        |       ~50        | Bestellformular           |
| `cbct_orders`       | `scan`               | `cbct_scans`                                  |     1 Object     | 1:1 Beziehung             |
| `cbct_orders`       | `report`             | `cbct_reports`                                |     1 Object     | 1:1 Beziehung             |
| `support_sessions`  | `actions[]`          | `support_session_actions`                     |       ~100       | Audit-Trail               |
| `saas_invoices`     | `items[]`            | `saas_invoice_items`                          |       ~10        | Platform-Rechnung         |

### Wann NICHT einbetten

| Situation                 | Lösung                         | Beispiel                                  |
| :------------------------ | :----------------------------- | :---------------------------------------- |
| Dokument > 16MB Risiko    | Separate Collection            | `chat_messages` (unbegrenzt pro Channel)  |
| Array wächst unbegrenzt   | Separate Collection + Referenz | `inventory_movements` (tausende Einträge) |
| Eigenständig abfragbar    | Separate Collection            | `payments` (für Reconciliation)           |
| Viele-zu-Viele            | Referenz-Array                 | `xrays.treatmentPlanId`                   |
| Hochfrequent aktualisiert | Separate Collection            | `attendance` (tägliche Stempelung)        |

### MongoDB 16MB Document-Limit

Kritische Prüfung — kein Embedded Array darf das 16MB Limit gefährden:

| Collection         | Embedded Array   | Ø Einträge | Max. Einträge | Ø Größe/Eintrag | Max. Gesamtgröße |
| :----------------- | :--------------- | :--------: | :-----------: | :-------------: | :--------------: |
| `patients`         | `allergies[]`    |     3      |      20       |      100B       |       2KB        |
| `patients`         | `medicalHistory` |     1      |       1       |      500B       |       500B       |
| `patients`         | `insurance[]`    |     1      |       3       |      200B       |       600B       |
| `invoices`         | `items[]`        |     5      |      50       |      200B       |       10KB       |
| `prescriptions`    | `items[]`        |     3      |      15       |      300B       |      4.5KB       |
| `treatment_plans`  | `items[]`        |     8      |      30       |      400B       |       12KB       |
| `support_sessions` | `actions[]`      |     10     |      100      |      300B       |       30KB       |
| **Maximum Total**  |                  |            |               |                 |  **< 100KB** ✅  |

> **Ergebnis:** Kein Document kommt annähernd an 16MB. Selbst ein Patient mit 20 Allergien,
> 3 Versicherungen, komplettem Medical History und 10 Family Links ≈ 5KB. Sicher.

---

## 4. Platform-DB: `dento_platform`

> **Verwaltet von:** Payload CMS 3.x (Auto-generiert REST + GraphQL + Admin Panel)
> **Zugriff:** Nur Platform-Admins (Du) + Payload Auth Endpoints für Tenant-Users
> **~24 Collections + 4 Globals**

### 4.1 `users` — Alle Accounts (Platform + Tenant)

```typescript
// Payload Collection: users
{
  _id: ObjectId,
  email: String,                    // Unique, = Username
  password: String,                 // 🔒 Argon2id Hash (Payload built-in)
  salt: String,                     // 🔒 Payload built-in

  // Payload Auth Felder (auto-generiert)
  loginAttempts: Number,            // 🔒 Brute-Force-Schutz
  lockUntil: Date,                  // 🔒 Account-Sperre nach 5 Fehlversuchen
  resetPasswordToken: String,
  resetPasswordExpiration: Date,

  // Platform-Felder
  role: String,                     // enum: platform_admin | tenant_admin | dentist |
                                    //       receptionist | assistant | accountant |
                                    //       lab_tech | hygienist
  tenantSlug: String | null,        // null = Platform-Admin, sonst Tenant-Zuordnung
  tenantId: ObjectId | null,        // → tenants

  // Profil (Basis — Detail im Tenant-DB users Document)
  firstName: { en: String, ar: String },
  lastName: { en: String, ar: String },
  phone: String,
  avatarUrl: String,

  // Status
  status: String,                   // enum: invited | pending_activation | active |
                                    //       suspended | deactivated
  isProfileComplete: Boolean,
  activatedAt: Date,
  lastLoginAt: Date,

  // 🔒 2FA (Phase 3)
  totpSecret: String | null,        // 🔒 AES-256-GCM verschlüsselt
  totpEnabled: Boolean,
  totpBackupCodes: [String],        // 🔒 Argon2id-gehasht

  // Platform-RBAC (PLATFORM_RBAC.md §6)
  platformRole: String | null,      // enum: platform_owner | platform_admin | platform_viewer
                                    // null = kein Platform-User
  platformPermissionOverrides: [{   // Per-User Permission-Overrides
    module: String,
    actions: [String]
  }],

  // Platform-Invite
  invitedBy: ObjectId | null,       // → users
  invitedAt: Date | null,
  inviteToken: String | null,       // 🔒 SHA-256-gehasht
  inviteTokenExpiresAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { email: 1 } unique
// Index: { tenantSlug: 1, role: 1 }
// Index: { status: 1 }
// Index: { platformRole: 1, status: 1 }
// Index: { inviteToken: 1 } sparse
```

**v1 Äquivalent:** `users` + `user_profiles` (2 Tabellen → 1 Collection, Profil embedded)

---

### 4.2 `tenants` — Klinik-Registrierungen

```typescript
{
  _id: ObjectId,
  name: String,                     // "Cairo Dental Center"
  slug: String,                     // "clinic-cairo" → DB-Name: tenant_clinic_cairo
  displayName: { en: String, ar: String },

  // Owner
  ownerEmail: String,
  ownerUserId: ObjectId,            // → users

  // Subscription
  subscriptionPlanId: ObjectId | null, // → subscription_plans (veraltet, nutze modules)
  subscriptionStatus: String,       // enum: trial | active | past_due | suspended | cancelled
  trialEndsAt: Date | null,

  // Config
  subdomain: String,                // "clinic-cairo" → clinic-cairo.dento.app
  customDomain: String | null,      // "app.cairodentalcenter.com"
  timezone: String,                 // "Africa/Cairo"
  currencyCode: String,             // "EGP"
  locale: String,                   // "ar-EG"
  country: String,                  // "EG"

  // Feature Flags (Overrides)
  featureFlags: Map,                // { "chat": true, "workflows": false }

  // Limits
  maxUsers: Number,                 // Basierend auf Plan
  maxPatients: Number,
  maxBranches: Number,
  maxStorageGB: Number,

  // Usage (aktualisiert via Cron)
  currentUsers: Number,
  currentPatients: Number,
  currentStorageMB: Number,

  // Branding
  logoUrl: String,
  primaryColor: String,             // "#14b8a6"

  // Status
  status: String,                   // enum: provisioning | active | suspended | deleted
  deletedAt: Date | null,           // Soft-Delete

  // Payment
  stripeCustomerId: String | null,
  paymobCustomerId: String | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { slug: 1 } unique
// Index: { subdomain: 1 } unique
// Index: { customDomain: 1 } unique sparse
// Index: { ownerEmail: 1 }
// Index: { status: 1, subscriptionStatus: 1 }
```

**v1 Äquivalent:** `tenants` (Mig. 040) — v2 erweitert um Branding, Feature Flags, Usage-Tracking

---

### 4.3 `modules` — Modul-Katalog

```typescript
{
  _id: ObjectId,
  slug: String,                     // "dental-charting", "inventory-management"
  name: { en: String, ar: String },
  description: { en: String, ar: String },
  category: String,                 // enum: core | clinical | financial | operational | advanced
  icon: String,                     // Lucide icon name

  // Pricing
  isFree: Boolean,
  basePriceMonthly: Number,         // USD
  basePriceYearly: Number,          // USD (mit Rabatt)

  // Versioning
  version: String,                  // "1.0.0"
  changelog: [{
    version: String,
    type: String,                   // enum: addField | removeField | newFeature | bugfix
    collection: String,
    field: String,
    description: String,
    releasedAt: Date
  }],

  // Requirements
  minTier: String | null,           // enum: starter | professional | enterprise
  dependsOn: [String],              // Modul-Slugs (z.B. insurance braucht billing)

  // Status
  status: String,                   // enum: active | beta | deprecated | disabled
  isVisible: Boolean,               // Im Modul-Store anzeigen?
  sortOrder: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { slug: 1 } unique
// Index: { category: 1, isVisible: 1 }
// Index: { status: 1 }
```

**v1 Äquivalent:** `modules` (Mig. 040)

---

### 4.4 `tenant_modules` — Lizenzen pro Tenant

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,               // → tenants
  moduleId: ObjectId,               // → modules
  moduleSlug: String,               // Denormalisiert für schnellen Check

  // Lizenz
  status: String,                   // enum: active | trial | expired | suspended
  licenseType: String,              // enum: monthly | yearly | lifetime
  enabledAt: Date,
  expiresAt: Date | null,

  // Overrides
  priceOverride: Number | null,     // Custom-Preis für diesen Tenant
  maxUsers: Number | null,          // Modul-spezifisches User-Limit
  usageLimit: Number | null,

  // Usage (aktualisiert via Cron)
  currentUsage: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { tenantId: 1, moduleSlug: 1 } unique
// Index: { tenantId: 1, status: 1 }
// Index: { expiresAt: 1 }  — Für Ablauf-Cron
```

**v1 Äquivalent:** `tenant_modules` (Mig. 040)

---

### 4.5 `pricing_config` — Dynamische Preisgestaltung

```typescript
{
  _id: ObjectId,
  moduleSlug: String,               // → modules.slug
  country: String,                  // "EG", "SA", "AE", "ALL"
  currency: String,                 // "EGP", "SAR", "AED", "USD"

  priceMonthly: Number,
  priceYearly: Number,

  // Staffeln
  tiers: [{
    minUsers: Number,
    maxUsers: Number,
    priceMonthly: Number,
    priceYearly: Number
  }],

  // Discounts
  discounts: [{
    type: String,                   // enum: percentage | fixed | coupon
    code: String | null,
    amount: Number,
    validFrom: Date,
    validUntil: Date,
    maxUses: Number,
    usedCount: Number
  }],

  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { moduleSlug: 1, country: 1 } unique
```

**v1 Äquivalent:** `subscription_plans` (Mig. 040) — v2 ist viel flexibler (per-Modul, per-Country)

---

### 4.6 `api_keys` — API Key Management

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId | null,        // null = Platform-Level Key
  name: String,                     // "Production API Key"

  // 🔒 Key (nur Hash gespeichert — Klartext einmalig bei Erstellung angezeigt)
  keyPrefix: String,                // "dk_live_Xf3..." (erste 8 Zeichen)
  keyHash: String,                  // 🔒 SHA-256 Hash

  // Config
  keyType: String,                  // enum: live | test
  environment: String,              // enum: production | staging | development
  scopes: [String],                 // ["patients:read", "appointments:write"]
  allowedIps: [String],             // IP-Whitelist (optional)

  // Rate Limiting
  rateLimitPerMinute: Number,       // Default: 60

  // Status
  status: String,                   // enum: active | revoked | expired
  expiresAt: Date | null,
  lastUsedAt: Date | null,
  totalRequests: Number,

  createdBy: ObjectId,              // → users
  createdAt: Date,
  updatedAt: Date
}
// Index: { keyHash: 1 } unique
// Index: { keyPrefix: 1 }
// Index: { tenantId: 1, status: 1 }
```

**v1 Äquivalent:** `api_keys` (Mig. 043)

---

### 4.7 `webhooks` + `webhook_logs` + `webhook_event_types`

```typescript
// webhooks
{
  _id: ObjectId,
  tenantId: ObjectId | null,        // null = Platform-Level
  name: String,
  url: String,                      // Endpoint URL
  secret: String,                   // 🔒 HMAC-SHA256 Signing Secret

  authType: String,                 // enum: none | hmac | bearer | basic
  authValue: String | null,         // 🔒 Encrypted

  events: [String],                 // ["patient.created", "appointment.updated"]

  retryEnabled: Boolean,
  maxRetries: Number,               // Default: 3
  retryBackoff: String,             // enum: linear | exponential

  status: String,                   // enum: active | paused | disabled
  totalDeliveries: Number,
  successRate: Number,              // 0-100
  lastDeliveredAt: Date,

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { tenantId: 1, status: 1 }
// Index: { 'events': 1 }  — Multi-key Index

// webhook_logs
{
  _id: ObjectId,
  webhookId: ObjectId,              // → webhooks
  tenantId: ObjectId,
  eventType: String,
  eventId: String,                  // Idempotency Key

  requestUrl: String,
  requestHeaders: Object,
  requestBody: Object,

  responseStatus: Number,
  responseBody: String,
  responseTimeMs: Number,

  status: String,                   // enum: success | failed | retrying
  attemptNumber: Number,
  nextRetryAt: Date | null,
  error: String | null,

  createdAt: Date
}
// Index: { webhookId: 1, createdAt: -1 }
// Index: { tenantId: 1, eventType: 1, createdAt: -1 }
// Index: { createdAt: 1 }  TTL: 30 Tage

// webhook_event_types
{
  _id: ObjectId,
  eventName: String,                // "patient.created"
  category: String,                 // "patients", "appointments", "invoices"
  description: String,
  payloadSchema: Object,            // JSON Schema
  examplePayload: Object,
  isActive: Boolean
}
// Index: { eventName: 1 } unique
// Index: { category: 1 }
```

**v1 Äquivalent:** `webhooks` + `webhook_logs` + `webhook_event_types` (Mig. 043)

---

### 4.8 `feature_flags` — Per-Tenant Toggles

```typescript
{
  _id: ObjectId,
  key: String,                      // "chat_enabled", "new_calendar_ui"
  name: String,
  description: String,

  tenantId: ObjectId | null,        // null = Global Flag
  enabled: Boolean,

  // Progressive Rollout
  percentageRollout: Number | null, // 0-100
  userIds: [ObjectId] | null,       // Spezifische Users
  conditions: Object | null,        // JSON Conditions (country, plan, etc.)

  value: Mixed | null,              // Optionaler Wert (z.B. Variante A/B)

  createdAt: Date,
  updatedAt: Date
}
// Index: { key: 1, tenantId: 1 } unique
// Index: { tenantId: 1, enabled: 1 }
```

**v1 Äquivalent:** `feature_flags` (Mig. 043)

---

### 4.9 `saas_invoices` + `saas_payments` + `saas_dunning_log`

```typescript
// saas_invoices (Platform → Tenant Rechnungen)
{
  _id: ObjectId,
  tenantId: ObjectId,
  invoiceNumber: String,            // Auto: SAAS-2026-00001

  status: String,                   // enum: draft | issued | paid | overdue | cancelled

  billingPeriodStart: Date,
  billingPeriodEnd: Date,

  items: [{                         // ◄─ Embedded (v1: saas_invoice_items)
    description: String,
    itemType: String,               // enum: module | plan | addon | overage
    moduleId: ObjectId | null,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    periodStart: Date,
    periodEnd: Date
  }],

  subtotal: Number,
  taxAmount: Number,
  taxRate: Number,
  total: Number,
  currency: String,

  issueDate: Date,
  dueDate: Date,
  paidAt: Date | null,

  stripeInvoiceId: String | null,
  paymobInvoiceId: String | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { tenantId: 1, createdAt: -1 }
// Index: { invoiceNumber: 1 } unique
// Index: { status: 1, dueDate: 1 }

// saas_payments
{
  _id: ObjectId,
  tenantId: ObjectId,
  invoiceId: ObjectId,              // → saas_invoices

  amount: Number,
  currency: String,
  paymentMethod: String,            // enum: stripe | paymob_card | paymob_fawry |
                                    //       paymob_meeza | bank_transfer | manual
  status: String,                   // enum: pending | completed | failed | refunded

  // Gateway Details
  stripePaymentId: String | null,
  paymobTransactionId: String | null,
  paymentDetails: Object,           // Gateway-spezifische Daten

  failureReason: String | null,
  refundedAt: Date | null,
  refundAmount: Number | null,

  createdAt: Date
}
// Index: { tenantId: 1, createdAt: -1 }
// Index: { invoiceId: 1 }
// Index: { stripePaymentId: 1 } sparse
// Index: { paymobTransactionId: 1 } sparse

// saas_dunning_log (Mahnungen)
{
  _id: ObjectId,
  tenantId: ObjectId,
  invoiceId: ObjectId,

  dunningLevel: Number,             // 1, 2, 3, 4 (Eskalation)
  sentAt: Date,
  channel: String,                  // enum: email | sms | in_app

  status: String,                   // enum: sent | delivered | failed
  errorMessage: String | null,

  // Level-Mapping:
  // 1 = Erinnerung (3 Tage nach Fälligkeit)
  // 2 = Warnung (7 Tage)
  // 3 = Letzte Mahnung (14 Tage)
  // 4 = Suspension (21 Tage → Tenant wird suspended)

  createdAt: Date
}
// Index: { tenantId: 1, invoiceId: 1, dunningLevel: 1 }
// Index: { createdAt: 1 }  TTL: 365 Tage
```

**v1 Äquivalent:** `saas_invoices` + `saas_invoice_items` + `saas_payments` + `saas_dunning_log` + `saas_stripe_products` + `saas_plan_changes` (Mig. 066, 073) — v2 fasst 6 Tabellen → 3 Collections

---

### 4.10 `audit_logs` — Alle Mutations geloggt

```typescript
{
  _id: ObjectId,

  // Wer
  actorId: ObjectId,                // → users
  actorEmail: String,
  actorRole: String,

  // Wo
  tenantId: ObjectId | null,        // null = Platform-Level Action
  tenantSlug: String | null,

  // Was
  resourceType: String,             // "patient", "appointment", "tenant", "module"
  resourceId: String,
  action: String,                   // enum: create | update | delete | login | login_2fa |
                                    //       export | impersonate | config_change |
                                    //       bulk_operation | settings_change | 2fa_setup |
                                    //       2fa_verify | 2fa_disable | access
  description: String,

  // Diff
  oldValues: Object | null,         // Vorherige Werte (bei update/delete)
  newValues: Object | null,         // Neue Werte (bei create/update)
  changedFields: [String],          // ["status", "email"] — schneller Überblick

  // Context
  ipAddress: String,
  userAgent: String,
  requestId: String,                // Correlation ID

  // Sensitivity
  sensitivityLevel: String,         // enum: low | medium | high | critical
  // critical = Passwort-Änderung, User-Deletion, Impersonation, Key-Revoke

  status: String,                   // enum: success | failure
  errorMessage: String | null,

  createdAt: Date
}
// Index: { tenantId: 1, createdAt: -1 }
// Index: { actorId: 1, createdAt: -1 }
// Index: { resourceType: 1, resourceId: 1, createdAt: -1 }
// Index: { action: 1, createdAt: -1 }
// Index: { sensitivityLevel: 1, createdAt: -1 }
// Index: { createdAt: 1 }  TTL: 730 Tage (2 Jahre, HIPAA-konform)
```

**v1 Äquivalent:** `saas_audit_trail` (Mig. 040) + `user_activity_log` (Mig. 014) — v2 vereint beide

---

### 4.11 `error_logs` — Error Tracking

```typescript
{
  _id: ObjectId,
  tenantId: ObjectId | null,

  errorFingerprint: String,         // Hash für Deduplication
  errorType: String,                // "TypeError", "MongooseError", "ValidationError"
  errorMessage: String,
  errorStack: String,

  severity: String,                 // enum: info | warning | error | critical

  // Context
  url: String,
  route: String,
  component: String,
  userId: ObjectId | null,

  environment: String,              // enum: production | staging | development
  browser: String,
  ipAddress: String,

  // Aggregation
  occurrenceCount: Number,
  firstOccurrence: Date,
  lastOccurrence: Date,

  status: String,                   // enum: new | acknowledged | resolved | ignored
  resolvedBy: ObjectId | null,
  resolvedAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { errorFingerprint: 1 } unique
// Index: { tenantId: 1, severity: 1, createdAt: -1 }
// Index: { status: 1, lastOccurrence: -1 }
// Index: { createdAt: 1 }  TTL: 90 Tage
```

**v1 Äquivalent:** `error_logs` (Mig. 041)

---

### 4.12 `support_sessions` — Impersonation & Support

```typescript
{
  _id: ObjectId,
  developerId: ObjectId,            // → users (Platform-Admin)
  developerEmail: String,
  tenantId: ObjectId,               // → tenants
  tenantSlug: String,
  impersonatedUserId: ObjectId | null,

  reason: String,                   // Pflichtfeld — warum Support nötig

  // Session
  status: String,                   // enum: active | completed | expired | revoked
  startedAt: Date,
  expiresAt: Date,                  // Max 60 Minuten
  completedAt: Date | null,

  // 🔒 Security
  accessToken: String,              // 🔒 Temp JWT (60min, AES-256-GCM verschlüsselt)
  readOnly: Boolean,                // Default: true

  // Audit-Trail (Embedded)
  actions: [{                       // ◄─ v1: support_session_actions
    actionType: String,             // enum: view | edit | create | delete | config
    description: String,
    resourceType: String,
    resourceId: String,
    oldValue: Object | null,
    newValue: Object | null,
    url: String,
    timestamp: Date
  }],

  actionsCount: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { tenantId: 1, status: 1 }
// Index: { developerId: 1, createdAt: -1 }
// Index: { accessToken: 1 } unique
// Index: { expiresAt: 1 }  TTL: Auto-Cleanup abgelaufener Sessions
```

**v1 Äquivalent:** `support_sessions` + `support_session_actions` + `support_recordings` (Mig. 042, 061) — v2 embedded actions, entfernt recordings

---

### 4.13 `user_sessions` — Aktive Login-Sessions

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // → users

  sessionToken: String,             // 🔒 Hashed
  refreshToken: String,             // 🔒 Hashed

  deviceInfo: {
    type: String,                   // enum: desktop | mobile | tablet
    os: String,                     // "Windows 11", "iOS 17"
    browser: String,                // "Chrome 120"
    deviceName: String              // "iPhone 15 Pro"
  },

  ipAddress: String,
  userAgent: String,
  location: String | null,          // GeoIP

  isActive: Boolean,
  lastActivityAt: Date,
  expiresAt: Date,                  // Refresh Token Expiry

  isCurrent: Boolean,              // Markiert die aktuelle Session in der Sessions-Liste

  createdAt: Date
}
// Index: { userId: 1, isActive: 1 }
// Index: { sessionToken: 1 } unique
// Index: { refreshToken: 1 } unique
// Index: { expiresAt: 1 }  TTL: Auto-Cleanup
```

**v1 Äquivalent:** `user_sessions` (Mig. 014)

---

### 4.14 `backups` — Backup-Historie

```typescript
{
  _id: ObjectId,
  tenantSlug: String,

  type: String,                     // enum: scheduled | manual | pre_migration | pre_delete
  status: String,                   // enum: pending | running | completed | failed

  filePath: String,                 // S3/R2 Key
  fileSize: Number,                 // Bytes
  storageBucket: String,            // "dento-backups"
  checksum: String,                 // 🔒 SHA-256 für Integrität

  // 🔒 Encryption
  encryptionAlgorithm: String,      // "AES-256-GCM"
  encryptionKeyId: String,          // Key Rotation Tracking

  startedAt: Date,
  completedAt: Date | null,
  error: String | null,

  retentionDays: Number,            // Default: 30
  expiresAt: Date,                  // TTL Index

  initiatedBy: ObjectId,            // → users

  createdAt: Date,
  updatedAt: Date
}
// Index: { tenantSlug: 1, createdAt: -1 }
// Index: { status: 1, type: 1 }
// Index: { expiresAt: 1 }  TTL: Auto-Delete nach Retention
```

**v1 Äquivalent:** `backups` + `backup_settings` + `dev_backup_settings` (Mig. 070) — v2 vereinfacht auf 1 Collection + Global

---

### 4.15 `deployments` + `domains`

```typescript
// deployments
{
  _id: ObjectId,
  version: String,                  // "2.1.0"
  versionName: String,              // "Dental Chart Perio Update"
  commitSha: String,
  branch: String,                   // "main"

  deploymentType: String,           // enum: full | canary | hotfix | rollback
  targetType: String,               // enum: all_tenants | specific_tenants | percentage
  targetTenants: [ObjectId],
  targetPercentage: Number | null,

  status: String,                   // enum: pending | deploying | completed | failed | rolled_back

  deployedBy: ObjectId,             // → users
  scheduledAt: Date | null,
  startedAt: Date,
  completedAt: Date | null,

  healthCheckPassed: Boolean | null,
  rollbackVersion: String | null,   // Falls Rollback nötig

  releaseNotes: String,

  createdAt: Date,
  updatedAt: Date
}
// Index: { version: 1 }
// Index: { status: 1, createdAt: -1 }

// domains
{
  _id: ObjectId,
  tenantId: ObjectId,

  domain: String,                   // "app.cairodentalcenter.com"
  domainType: String,               // enum: subdomain | custom

  dnsVerified: Boolean,
  sslStatus: String,                // enum: pending | active | expired | error
  sslExpiresAt: Date | null,

  isActive: Boolean,
  isPrimary: Boolean,

  // DNS Records needed
  requiredRecords: [{
    type: String,                   // "CNAME", "TXT"
    name: String,
    value: String,
    verified: Boolean
  }],

  createdAt: Date,
  updatedAt: Date
}
// Index: { domain: 1 } unique
// Index: { tenantId: 1 }
```

**v1 Äquivalent:** `deployments` + `tenant_deployments` + `domains` + `deployment_hooks` (Mig. 042) — v2 vereinfacht

---

### 4.16 Weitere Platform Collections

```typescript
// country_config — Länderspezifische Konfiguration
{
  _id: ObjectId,
  code: String,                     // "EG"
  name: { en: String, ar: String },
  phoneCode: String,                // "+20"
  currencyCode: String,             // "EGP"
  currencySymbol: String,           // "ج.م"
  locale: String,                   // "ar-EG"
  timezone: String,                 // "Africa/Cairo"
  taxRate: Number,                  // 14 (%)
  taxName: { en: String, ar: String }, // { en: "VAT", ar: "ضريبة القيمة المضافة" }
  flagEmoji: String,                // "🇪🇬"
  dateFormat: String,               // "DD/MM/YYYY"
  isActive: Boolean,
  sortOrder: Number
}
// Index: { code: 1 } unique

// translation_packs — Übersetzungen
{
  _id: ObjectId,
  language: String,                 // "ar", "en", "fr", "tr"
  namespace: String,                // "common", "patients", "appointments"
  translations: Map                 // { "save": "حفظ", "cancel": "إلغاء" }
}
// Index: { language: 1, namespace: 1 } unique
```

**v1 Äquivalent:** `countries` + `currencies` + `translations` (Mig. 023, 001) — v2 vereint und erweitert

---

### 4.17 Platform Globals (Singletons — Payload)

```typescript
// system_settings (1 Document)
{
  maintenanceMode: Boolean,
  maintenanceMessage: String,
  defaultTimezone: String,
  defaultCurrency: String,
  defaultLanguage: String,
  registrationEnabled: Boolean,
  maxTenantsPerCluster: Number,
  supportEmail: String,
  platformVersion: String
}

// branding (1 Document)
{
  platformName: String,             // "Dento"
  logoUrl: String,
  faviconUrl: String,
  primaryColor: String,
  landingPageUrl: String
}

// currencies (1 Document)
{
  baseCurrency: String,             // "USD"
  exchangeRates: Map,              // { "EGP": 50.5, "SAR": 3.75, "AED": 3.67 }
  lastUpdatedAt: Date
}

// backup_config (1 Document)
{
  defaultSchedule: String,          // "0 3 * * *" (täglich 03:00)
  defaultRetentionDays: Number,     // 30
  maxBackupSizeGB: Number,          // 10
  encryptionEnabled: Boolean,       // true
  storageBucket: String,            // "dento-backups"
  storageRegion: String             // "auto"
}
```

**v1 Äquivalent:** `site_settings` + `system_settings` (Mig. 001, 074)

---

## 5. Tenant-DB: Patients & Clinical

> **DB-Name:** `tenant_{slug}` (z.B. `tenant_clinic_cairo`)
> **Zugriff:** Nur Tenant-eigene User über Fastify Tenant-API
> **Isolation:** `mongoose.connection.useDb('tenant_{slug}')`

### 5.1 `patients` — Hauptsammlung

```typescript
{
  _id: ObjectId,
  userId: ObjectId | null,          // → platform users (optional, für Patient-Login)
  patientCode: String,              // Auto: "DEN-000001"

  // Personal
  firstName: { en: String, ar: String },
  lastName: { en: String, ar: String },
  dateOfBirth: Date,
  gender: String,                   // enum: male | female | other
  nationalId: String | null,        // 🔒 AES-256-GCM verschlüsselt

  // Contact
  phone: String,                    // Pflicht
  email: String | null,
  address: String,
  city: String,
  country: String,

  // Emergency
  emergencyContactName: String | null,
  emergencyContactPhone: String | null,

  // ◄─ EMBEDDED: Allergien (v1: patient_allergies Tabelle)
  allergies: [{
    allergen: String,               // "Penicillin"
    reaction: String,               // "Anaphylaxis"
    severity: String,               // enum: mild | moderate | severe
    notedAt: Date
  }],

  // ◄─ EMBEDDED: Medical History (v1: medical_history + patient_medical_history)
  medicalHistory: {
    isDiabetes: Boolean,
    isHypertension: Boolean,
    isHeartDisease: Boolean,
    isBleedingDisorder: Boolean,
    isHepatitis: Boolean,
    isAsthma: Boolean,
    isEpilepsy: Boolean,
    isPregnant: Boolean,
    isSmoker: Boolean,
    smokingFrequency: String | null,
    currentMedications: [String],
    isTakingBloodThinners: Boolean,
    isAllergicToAnesthesia: Boolean,
    isAllergicToPenicillin: Boolean,
    isAllergicToLatex: Boolean,
    previousDentalSurgeries: String | null,
    lastDentalVisit: Date | null,
    isDentalAnxiety: Boolean,
    dentalAnxietyLevel: Number | null, // 1-10
    otherConditions: String | null,
    additionalNotes: String | null,
    updatedBy: ObjectId | null,
    updatedAt: Date | null
  },

  // ◄─ EMBEDDED: Family Links (v1: patient_family_links)
  familyLinks: [{
    relatedPatientId: ObjectId,     // → patients
    relationship: String,           // enum: spouse | parent | child | sibling
    isPrimaryContact: Boolean,
    isEmergencyContact: Boolean,
    isFinancialResponsible: Boolean
  }],

  // ◄─ EMBEDDED: Insurance (v1: patient_insurance) — Optional (Modul-abhängig)
  insurance: [{
    insuranceCompanyId: ObjectId,   // → insurance_companies
    policyNumber: String,
    groupNumber: String | null,
    memberId: String,
    coverageType: String,           // enum: individual | family
    coveragePercentage: Number,     // 0-100
    maxCoverage: Number | null,
    deductible: Number,
    deductibleMet: Number,
    effectiveDate: Date,
    expiryDate: Date,
    isPrimary: Boolean,
    isActive: Boolean
  }],

  // Meta
  source: String,                   // enum: admin | website | phone | walk_in | referral
  howDidYouHear: String | null,
  preferredLanguage: String,        // "en" | "ar"
  notes: String | null,

  isActive: Boolean,                // Soft-Delete
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { patientCode: 1 } unique
// Index: { phone: 1 }
// Index: { 'firstName.en': 'text', 'lastName.en': 'text', phone: 'text' } — Full-Text Search
// Index: { email: 1 } sparse
// Index: { nationalId: 1 } sparse
// Index: { isActive: 1, createdAt: -1 }
```

**v1 Äquivalent:** `patients` + `patient_allergies` + `patient_medical_history` + `medical_history` + `patient_family_links` + `patient_insurance` (6 Tabellen → 1 Collection)

---

### 5.2 `dental_charts` — Zahnstatus

```typescript
{
  _id: ObjectId,
  patientId: ObjectId,              // → patients

  toothNumber: Number,              // 1-32 (Universal) oder 11-48 (FDI)
  numberingSystem: String,          // enum: universal | fdi — Default: fdi

  condition: String,                // enum: healthy | cavity | crown | bridge | implant |
                                    //       missing | rct | filling | extraction_needed |
                                    //       periodontal | veneer | temporary | pontic
  surfaces: [String],               // ["occlusal", "mesial", "distal", "buccal", "lingual"]

  // Perio Data (erweitert — Modul dental-charting)
  perioData: {
    pocketDepth: [Number],          // 6 Messungen pro Zahn
    recession: [Number],
    bleedingOnProbing: [Boolean],
    mobility: Number,               // 0-3
    furcation: Number | null        // 0-3 (nur Molaren)
  } | null,

  notes: String,

  updatedBy: ObjectId,              // → users
  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, toothNumber: 1 } unique
// Index: { patientId: 1, condition: 1 }
```

**v1 Äquivalent:** `dental_charts` (Mig. 001) — v2 erweitert um perioData, FDI-Nummerierung, Surfaces-Array

---

### 5.3 `dental_chart_history` — Zahnstatus-Verlauf

```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  chartData: Object,                // Snapshot aller Zähne zu dem Zeitpunkt
  notes: String,
  recordedBy: ObjectId,
  recordedAt: Date,
  createdAt: Date
}
// Index: { patientId: 1, recordedAt: -1 }
```

**v1 Äquivalent:** `dental_chart_history` (Mig. 018)

---

### 5.4 `treatment_plans` — Behandlungspläne

```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,

  title: String,
  description: String | null,

  status: String,                   // enum: draft | proposed | accepted | in_progress |
                                    //       completed | cancelled | expired

  // ◄─ EMBEDDED: Items (v1: treatment_plan_items)
  items: [{
    _id: ObjectId,                  // Eigene ID für Referenzierung
    serviceId: ObjectId,            // → services
    toothNumber: String,
    surface: String | null,
    procedureName: String,
    description: String | null,
    cost: Number,
    sequenceOrder: Number,
    status: String,                 // enum: pending | scheduled | completed | cancelled
    appointmentId: ObjectId | null,
    completedAt: Date | null,

    // Cross-Links zu Imaging
    linkedXrays: [ObjectId],        // → xrays
    linkedCbcts: [ObjectId],        // → cbct_orders

    // Requirements (Arzt definiert was vor Durchführung nötig ist)
    requiredImaging: [{
      type: String,                 // enum: xray | cbct | panoramic | periapical | bitewing
      status: String,               // enum: pending | fulfilled | waived
      fulfilledByXrayId: ObjectId | null,
      fulfilledByCbctId: ObjectId | null,
      notes: String | null
    }],

    // Material-Reservierung
    materials: [{
      materialId: ObjectId,         // → inventory_items
      materialName: String,
      quantity: Number,
      unit: String
    }],

    notes: String | null
  }],

  // Cross-Links (Plan-Level)
  linkedXrays: [ObjectId],          // → xrays
  linkedCbcts: [ObjectId],          // → cbct_orders

  // Financials
  totalCost: Number,
  discountType: String | null,      // enum: percentage | fixed
  discountValue: Number,
  finalCost: Number,

  // Consent
  patientSignature: String | null,  // Base64 oder S3-URL
  signedAt: Date | null,
  validUntil: Date | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, status: 1, createdAt: -1 }
// Index: { doctorId: 1, status: 1 }
// Index: { 'items.appointmentId': 1 }
```

**v1 Äquivalent:** `treatment_plans` + `treatment_plan_items` (Mig. 021) — v2 embedded items + Cross-Links

---

### 5.5 `procedure_notes` — Durchgeführte Behandlungen

```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  appointmentId: ObjectId | null,

  // Link zum Behandlungsplan (jetzt tatsächlich im UI genutzt — v1 Bug gefixt)
  treatmentPlanId: ObjectId | null,
  treatmentPlanItemId: ObjectId | null,

  // Template
  templateId: ObjectId | null,      // → procedure_note_templates

  procedureName: String,
  teethInvolved: String,
  procedurePerformed: String,
  materialsUsed: String,
  anesthesiaUsed: String | null,
  complications: String | null,
  postOpInstructions: String | null,

  followUpRequired: Boolean,
  followUpDate: Date | null,

  // Cross-Links zu Imaging
  linkedXrays: [ObjectId],          // → xrays
  linkedCbcts: [ObjectId],          // → cbct_orders
  preOpXrays: [ObjectId],           // → xrays (VOR Behandlung)
  postOpXrays: [ObjectId],          // → xrays (NACH Behandlung)

  // Template-Felder (dynamisch)
  teethDetails: Object | null,

  attachments: [{
    name: String,
    url: String,
    type: String
  }],

  notes: String | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, createdAt: -1 }
// Index: { doctorId: 1, createdAt: -1 }
// Index: { appointmentId: 1 }
// Index: { treatmentPlanId: 1 }
```

**v1 Äquivalent:** `procedure_notes` (Mig. 021) — v2 fixt fehlende UI-Nutzung der FK, fügt Cross-Links hinzu
**Namensänderung:** v1 `treatments` → v2 `procedure_notes` (Klarere Trennung von `treatment_plans`)

---

### 5.6 `procedure_note_templates`

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  procedureType: String,            // "extraction", "filling", "root_canal"
  templateContent: String,
  fields: Object,                   // Dynamische Felder-Definition
  isActive: Boolean,
  sortOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
// Index: { procedureType: 1, isActive: 1 }
```

**v1 Äquivalent:** `procedure_note_templates` (Mig. 021)

---

### 5.7 `prescriptions` — Rezepte

```typescript
{
  _id: ObjectId,
  prescriptionNumber: String,       // Auto: RX-2026-00001
  patientId: ObjectId,
  doctorId: ObjectId,
  appointmentId: ObjectId | null,

  diagnosis: String | null,
  notes: String | null,

  status: String,                   // enum: active | dispensed | cancelled | expired
  validUntil: Date | null,

  // ◄─ EMBEDDED: Items (v1: prescription_items)
  items: [{
    medicationId: ObjectId | null,  // → medications (null = Freitext)
    medicationName: String,
    dosage: String,                 // "1 tablet"
    frequency: String,              // "3 times daily"
    duration: String,               // "7 days"
    quantity: Number,
    instructions: { en: String, ar: String }
  }],

  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, createdAt: -1 }
// Index: { prescriptionNumber: 1 } unique
// Index: { doctorId: 1, createdAt: -1 }
```

**v1 Äquivalent:** `prescriptions` + `prescription_items` (Mig. 021) — v2 embedded items

---

### 5.8 `medications` — Medikamenten-Katalog

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  genericName: String,
  category: String,                 // enum: antibiotic | analgesic | anti_inflammatory |
                                    //       antifungal | antiseptic | anesthetic | vitamin | other
  dosageForm: String,               // enum: tablet | capsule | syrup | injection | cream |
                                    //       gel | mouthwash | drops | spray | powder | other
  strength: String,                 // "500mg"

  // Defaults für Autocomplete
  defaultDosage: String,
  defaultFrequency: String,
  defaultDuration: String,
  instructions: { en: String, ar: String },

  warnings: [String],
  contraindications: [String],

  isActive: Boolean,
  isCustom: Boolean,                // false = Seed, true = Tenant-erstellt
  sortOrder: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { 'name.en': 1, strength: 1 } unique
// Index: { category: 1, isActive: 1 }
// Index: { genericName: 1 }
```

**v1 Äquivalent:** `medications` (Mig. 021) — v2 als Tenant-eigene Collection mit Seed-Daten

---

### 5.9 `xrays` — Röntgenbilder

```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  appointmentId: ObjectId | null,
  branchId: ObjectId,

  xrayTypeId: ObjectId | null,      // → xray_types (Lookup)
  toothNumbers: [String],           // NEU: Multi-Tooth (v1: einzelner String)

  imageUrl: String,                 // S3/R2
  thumbnailUrl: String,
  title: String,
  notes: String | null,
  capturedAt: Date,
  capturedBy: ObjectId | null,

  // Cross-Links (v1 fehlte komplett)
  treatmentPlanId: ObjectId | null,
  treatmentPlanItemId: ObjectId | null,
  procedureNoteId: ObjectId | null,
  dentalChartEntryId: ObjectId | null,

  // Klinischer Kontext
  clinicalPurpose: String | null,   // enum: diagnostic | pre_treatment | post_treatment |
                                    //       follow_up | emergency | routine_screening
  region: String | null,            // enum: upper_left | upper_right | lower_left |
                                    //       lower_right | full_mouth | anterior | posterior
  findings: String | null,

  // Vergleich
  comparedToXrayId: ObjectId | null,
  comparisonNotes: String | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, createdAt: -1 }
// Index: { treatmentPlanId: 1 }
// Index: { procedureNoteId: 1 }
// Index: { appointmentId: 1 }
// Index: { toothNumbers: 1 }  — Multi-key Index
```

**v1 Äquivalent:** `xrays` (Mig. 021) — v2 fügt Cross-Links, Clinical Purpose, Region, Multi-Tooth hinzu

---

### 5.10 `cbct_orders` — CBCT-Aufträge (mit Embedded Scan + Report)

```typescript
{
  _id: ObjectId,
  orderNumber: String,              // Auto: CBCT-2026-001
  patientId: ObjectId,
  requestingDoctorId: ObjectId,
  branchId: ObjectId,

  // Cross-Links
  treatmentPlanId: ObjectId | null,
  treatmentPlanItemId: ObjectId | null,
  procedureNoteId: ObjectId | null,
  appointmentId: ObjectId | null,

  indication: String,
  clinicalNotes: String | null,
  clinicalPurpose: String | null,   // enum: implant_planning | endo_evaluation | ortho_assessment |
                                    //       tmj_evaluation | pathology | trauma | surgical_planning
  priority: String,                 // enum: urgent | high | normal | low
  status: String,                   // enum: requested | scheduled | completed | reported | cancelled
  scheduledDate: Date | null,
  completedAt: Date | null,

  // ◄─ EMBEDDED: Scan (v1: cbct_scans Tabelle)
  scan: {
    scanReferenceId: String,
    technicianId: ObjectId,
    scanLocation: String,
    thumbnailUrl: String,
    dicomPath: String,              // S3/R2
    scanParameters: Object,
    scannedAt: Date,
    notes: String | null
  } | null,

  // ◄─ EMBEDDED: Report (v1: cbct_reports Tabelle)
  report: {
    reportingDoctorId: ObjectId,
    findings: String,
    measurements: Object,
    recommendations: String,
    reportPdfUrl: String,
    status: String,                 // enum: draft | final | amended
    reportedAt: Date
  } | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, createdAt: -1 }
// Index: { orderNumber: 1 } unique
// Index: { treatmentPlanId: 1 }
// Index: { status: 1, scheduledDate: 1 }
```

**v1 Äquivalent:** `cbct_orders` + `cbct_scans` + `cbct_reports` + `cbct_scan_regions` (4 Tabellen → 1 Collection)

---

### 5.11 `consent_forms` + `consent_templates`

```typescript
// consent_templates
{
  _id: ObjectId,
  name: { en: String, ar: String },
  procedureType: String,
  content: { en: String, ar: String },
  risks: { en: String, ar: String },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { procedureType: 1, isActive: 1 }

// consent_forms (signierte Formulare)
{
  _id: ObjectId,
  templateId: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  appointmentId: ObjectId | null,
  treatmentPlanId: ObjectId | null,

  patientSignature: String,         // S3/R2 URL oder Base64
  witnessSignature: String | null,
  signedAt: Date,

  createdAt: Date
}
// Index: { patientId: 1, createdAt: -1 }
// Index: { treatmentPlanId: 1 }
```

**v1 Äquivalent:** `consent_forms` + `consent_templates` (Mig. 021)

---

### 5.12 `lab_orders` — Laboraufträge

```typescript
{
  _id: ObjectId,
  orderNumber: String,              // Auto: LAB-2026-00001
  patientId: ObjectId,
  doctorId: ObjectId,
  branchId: ObjectId,

  dentalLabId: ObjectId,            // → dental_labs
  labOrderTypeId: ObjectId,         // → lab_order_types

  // Cross-Links
  treatmentPlanId: ObjectId | null,
  appointmentId: ObjectId | null,

  // Details
  toothNumbers: [String],
  shade: String | null,             // z.B. "A2", "B1"
  material: String | null,
  description: String | null,
  specialInstructions: String | null,

  // Dates
  orderDate: Date,
  expectedDeliveryDate: Date | null, // Auto aus lab_order_types.defaultTurnaroundDays
  actualDeliveryDate: Date | null,

  // Status
  status: String,                   // enum: draft | sent | in_progress | ready |
                                    //       delivered | rejected | cancelled

  // Try-In / Adjustments
  tryInDate: Date | null,
  tryInNotes: String | null,
  adjustmentRequired: Boolean,
  adjustmentNotes: String | null,

  // Cost
  cost: Number,
  isPaid: Boolean,

  attachments: [{
    name: String,
    url: String,
    type: String                    // "impression", "photo", "xray", "prescription"
  }],

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { orderNumber: 1 } unique
// Index: { patientId: 1, createdAt: -1 }
// Index: { dentalLabId: 1, status: 1 }
// Index: { status: 1, expectedDeliveryDate: 1 }
// Index: { doctorId: 1, createdAt: -1 }
```

**v1 Äquivalent:** `lab_orders` (Mig. 024)

---

### 5.13 `dental_labs` — Zahntechnische Labore

```typescript
{
  _id: ObjectId,
  name: String,
  contactPerson: String | null,
  phone: String | null,
  email: String | null,
  address: String | null,
  city: String | null,

  specialties: [String],            // ["crowns", "bridges", "implants", "orthodontics"]
  rating: Number | null,            // 1-5

  // Defaults
  defaultTurnaroundDays: Number,
  pricingNotes: String | null,

  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { isActive: 1 }
// Index: { name: 1 } unique
```

**v1 Äquivalent:** `dental_labs` (Mig. 024)

---

### 5.14 `lab_order_types` — Laborauftragstypen (Seed-Data)

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String }, // "Crown (Zirconia)" / "تاج زركونيا"
  category: String,                 // enum: crown | bridge | denture | guard | retainer |
                                    //       implant | veneer | inlay | onlay | other
  defaultTurnaroundDays: Number,    // z.B. 7

  isActive: Boolean,
  isCustom: Boolean,                // false = Seed (14 Standardtypen), true = Tenant-erstellt
  sortOrder: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { 'name.en': 1 } unique
// Index: { category: 1, isActive: 1 }
```

**Seed:** 14 Standardtypen bei Tenant-Erstellung (Crown PFM, Crown Zirconia, Crown E-Max, Bridge 3-unit, Bridge 4+, Full Denture Upper/Lower, Partial Denture, Night Guard, Retainer Hawley/Clear, Implant Abutment, Veneer Porcelain, Inlay/Onlay)

**v1 Äquivalent:** `lab_order_types` (Mig. 024)

---

### 5.15 `xray_types` — Röntgentypen (Lookup)

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String }, // "Periapical" / "حول الذروة"
  code: String,                     // "periapical", "bitewing", "panoramic", "cephalometric"
  description: { en: String, ar: String },
  isActive: Boolean,
  sortOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
// Index: { code: 1 } unique
```

**Seed:** Periapical, Bitewing, Panoramic (OPG), Cephalometric, Occlusal, Full Mouth Series

**v1 Äquivalent:** Inline-Enum in v1 → v2 als konfigurierbare Lookup-Collection

---

## 6. Tenant-DB: Appointments & Scheduling

### 6.1 `appointments`

```typescript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  branchId: ObjectId,
  serviceId: ObjectId | null,       // → services
  appointmentTypeId: ObjectId | null,

  // Scheduling
  date: Date,                       // Nur Datum
  startTime: String,                // "10:00"
  endTime: String,                  // "10:30"
  durationMinutes: Number,
  chairNumber: Number | null,

  // Status
  status: String,                   // enum: booked | confirmed | arrived | in_progress |
                                    //       completed | no_show | cancelled | rescheduled
  type: String,                     // enum: consultation | followup | treatment | emergency | checkup

  // Notes
  reason: String | null,
  notes: String | null,
  internalNotes: String | null,     // Staff-only

  // Source
  source: String,                   // enum: admin | website | phone | walk_in | referral | whatsapp

  // Reminders
  isReminderSent: Boolean,
  reminderSentAt: Date | null,

  // Financial
  consultationFee: Number | null,
  isPaid: Boolean,

  // Cancellation
  cancelledBy: ObjectId | null,
  cancellationReason: String | null,
  rescheduledTo: ObjectId | null,   // → appointments (neuer Termin)

  // Timing Tracking
  arrivedAt: Date | null,
  startedAt: Date | null,
  completedAt: Date | null,

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { date: 1, doctorId: 1, startTime: 1 }  — Kalender-Query
// Index: { patientId: 1, date: -1 }
// Index: { branchId: 1, date: 1, status: 1 }
// Index: { status: 1, date: 1 }
// Index: { doctorId: 1, date: 1, status: 1 }  — Unique-Constraint für Double-Booking
```

**v1 Äquivalent:** `appointments` (Mig. 001, 002) — v2 erweitert um Timing-Tracking, Rescheduling-Link

---

### 6.2 `doctors`

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // → platform users

  name: { en: String, ar: String },
  title: { en: String, ar: String },
  specialty: { en: String, ar: String },
  bio: { en: String, ar: String },
  photoUrl: String | null,
  gender: String,

  licenseNumber: String,
  specializations: [String],
  qualifications: [String],
  experienceYears: Number,

  // ◄─ EMBEDDED: Certificates (v1: doctor_certificates)
  certificates: [{
    name: String,
    issuingAuthority: String,
    issueDate: Date,
    expiryDate: Date | null,
    fileUrl: String,
    isVerified: Boolean
  }],

  // Finanzen
  consultationFee: Number,
  commissionRate: Number,           // z.B. 30 (= 30%)

  // ◄─ EMBEDDED: Branch-Zuordnung (v1: doctor_branch_assignments)
  assignedBranches: [ObjectId],     // → branches
  primaryBranchId: ObjectId,

  phone: String | null,
  email: String | null,

  isFeatured: Boolean,
  isActive: Boolean,
  displayOrder: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { userId: 1 } unique
// Index: { assignedBranches: 1 }  — Multi-key
// Index: { isActive: 1, displayOrder: 1 }
```

**v1 Äquivalent:** `doctors` + `doctor_certificates` + `doctor_branch_assignments` (3 Tabellen → 1 Collection)

---

### 6.3 `doctor_schedules` + `doctor_availability`

```typescript
// doctor_schedules (Wochenplan)
{
  _id: ObjectId,
  doctorId: ObjectId,
  branchId: ObjectId,
  dayOfWeek: Number,                // 0=Sonntag, 6=Samstag
  startTime: String,                // "09:00"
  endTime: String,                  // "17:00"
  slotDuration: Number,             // Minuten (Default: 30)
  isAvailable: Boolean,
  isRamadanSchedule: Boolean,       // Separate Zeitplan für Ramadan
  createdAt: Date,
  updatedAt: Date
}
// Index: { doctorId: 1, branchId: 1, dayOfWeek: 1 }

// schedule_exceptions (Urlaub, Krankheit, etc.)
{
  _id: ObjectId,
  doctorId: ObjectId,
  exceptionType: String,            // enum: vacation | sick | conference | holiday | custom
  startDate: Date,
  endDate: Date,
  startTime: String | null,         // null = ganzer Tag
  endTime: String | null,
  isFullDay: Boolean,
  reason: String,
  status: String,                   // enum: pending | approved | rejected
  approvedBy: ObjectId | null,
  createdAt: Date,
  updatedAt: Date
}
// Index: { doctorId: 1, startDate: 1, endDate: 1 }
// Index: { status: 1, startDate: 1 }
```

**v1 Äquivalent:** `doctor_availability` + `schedule_exceptions` (Mig. 001, 011, 025)

---

### 6.4 `walk_in_queue` — Warteschlange

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,
  queueNumber: Number,              // Auto: Tagesbasiert (1, 2, 3...)

  patientId: ObjectId | null,       // null = Unregistrierter Walk-In
  patientName: String,              // Für den Fall dass kein Patient-Record existiert
  phone: String | null,

  reason: String | null,
  priority: String,                 // enum: normal | urgent | emergency

  status: String,                   // enum: waiting | called | in_progress | completed |
                                    //       no_show | cancelled
  assignedDoctorId: ObjectId | null,

  checkInTime: Date,
  calledAt: Date | null,
  startedAt: Date | null,
  completedAt: Date | null,
  estimatedWaitMinutes: Number | null,

  createdAt: Date
}
// Index: { branchId: 1, status: 1, checkInTime: 1 }
// Index: { branchId: 1, createdAt: -1 }
```

**v1 Äquivalent:** `walk_in_queue` + `queue_counters` (Mig. 015) — v2 vereint

---

### 6.5 `appointment_waitlist` + `recurring_appointment_rules`

```typescript
// appointment_waitlist
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId | null,
  branchId: ObjectId | null,
  serviceId: ObjectId | null,
  preferredDates: [Date],
  preferredTimes: [String],
  flexibility: String,              // enum: exact | flexible | very_flexible
  priority: String,                 // enum: normal | high
  status: String,                   // enum: waiting | offered | booked | expired
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
// Index: { status: 1, expiresAt: 1 }
// Index: { doctorId: 1, status: 1 }

// recurring_appointment_rules
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  branchId: ObjectId,
  serviceId: ObjectId | null,
  recurrenceType: String,           // enum: weekly | biweekly | monthly
  dayOfWeek: Number | null,
  dayOfMonth: Number | null,
  preferredTime: String,
  durationMinutes: Number,
  startDate: Date,
  endDate: Date | null,
  status: String,                   // enum: active | paused | completed
  lastGeneratedDate: Date | null,
  createdAt: Date,
  updatedAt: Date
}
// Index: { status: 1, patientId: 1 }
```

**v1 Äquivalent:** `appointment_waitlist` + `recurring_appointment_rules` (Mig. 024)

---

### 6.6 `appointment_types` — Termintypen

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String }, // "Consultation" / "استشارة"
  code: String,                     // "consultation", "followup", "treatment", "emergency"
  defaultDuration: Number,          // Minuten (z.B. 30, 60)
  color: String,                    // Hex-Farbe für Kalender: "#4CAF50"
  icon: String | null,

  isDoctorRequired: Boolean,          // Default: true
  isOnlineBookingAllowed: Boolean,      // Für Website-Buchung sichtbar?
  defaultFee: Number | null,

  isActive: Boolean,
  sortOrder: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { code: 1 } unique
// Index: { isActive: 1, sortOrder: 1 }
```

**v1 Äquivalent:** `appointment_types` (Mig. 024) — v2 erweitert um Farbe, Online-Booking, Default-Fee

---

## 7. Tenant-DB: Billing & Finance

### 7.1 `invoices` — Rechnungen

```typescript
{
  _id: ObjectId,
  invoiceNumber: String,            // Auto: INV-2026-00001
  patientId: ObjectId,
  branchId: ObjectId | null,
  appointmentId: ObjectId | null,
  treatmentPlanId: ObjectId | null,

  // ◄─ EMBEDDED: Items (v1: invoice_items)
  items: [{
    description: String,
    treatmentId: ObjectId | null,    // → procedure_notes
    serviceId: ObjectId | null,      // → services
    quantity: Number,
    unitPrice: Number,
    discount: Number,
    total: Number
  }],

  // Amounts
  subtotal: Number,
  discountAmount: Number,
  discountPercentage: Number,
  taxAmount: Number,
  taxPercentage: Number,            // Aus country_config
  totalAmount: Number,
  amountPaid: Number,
  balanceDue: Number,

  // Status
  status: String,                   // enum: draft | issued | paid | partially_paid |
                                    //       overdue | cancelled | refunded

  issueDate: Date,
  dueDate: Date | null,
  paidAt: Date | null,

  notes: String | null,
  terms: String | null,

  // Insurance
  insuranceClaimId: ObjectId | null,
  insuredAmount: Number,
  patientResponsibility: Number,

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { invoiceNumber: 1 } unique
// Index: { patientId: 1, createdAt: -1 }
// Index: { status: 1, dueDate: 1 }
// Index: { branchId: 1, issueDate: 1 }
```

**v1 Äquivalent:** `invoices` + `invoice_items` (Mig. 002c) — v2 embedded items

---

### 7.2 `payments` — Zahlungen

```typescript
{
  _id: ObjectId,
  invoiceId: ObjectId,
  patientId: ObjectId,

  amount: Number,
  paymentMethod: String,            // enum: cash | card | bank_transfer | cheque |
                                    //       insurance | online | fawry | meeza
  paymentReference: String | null,  // Transaktionsnummer

  status: String,                   // enum: pending | completed | failed | refunded

  notes: String | null,
  receivedBy: ObjectId,
  receivedAt: Date,

  createdAt: Date
}
// Index: { invoiceId: 1 }
// Index: { patientId: 1, createdAt: -1 }
// Index: { receivedAt: -1 }  — Für Reconciliation
```

**v1 Äquivalent:** `payments` (Mig. 002c)

---

### 7.3 `doctor_commissions` + `commission_payouts`

```typescript
// doctor_commissions
{
  _id: ObjectId,
  doctorId: ObjectId,
  appointmentId: ObjectId | null,
  invoiceId: ObjectId | null,

  procedureName: String,
  procedureAmount: Number,
  commissionRate: Number,
  commissionAmount: Number,

  status: String,                   // enum: pending | approved | paid | cancelled
  paidAt: Date | null,
  payoutId: ObjectId | null,        // → commission_payouts

  createdAt: Date,
  updatedAt: Date
}
// Index: { doctorId: 1, status: 1 }
// Index: { payoutId: 1 }

// commission_payouts
{
  _id: ObjectId,
  doctorId: ObjectId,
  payoutDate: Date,
  periodStart: Date,
  periodEnd: Date,
  totalAmount: Number,
  paymentMethod: String,
  reference: String | null,
  createdBy: ObjectId,
  createdAt: Date
}
// Index: { doctorId: 1, payoutDate: -1 }
```

**v1 Äquivalent:** `doctor_commissions` + `commission_payouts` (Mig. 024)

---

### 7.4 `installment_plans` — Ratenzahlung

```typescript
{
  _id: ObjectId,
  invoiceId: ObjectId,
  patientId: ObjectId,

  totalAmount: Number,
  downPayment: Number,
  remainingAmount: Number,
  numberOfInstallments: Number,
  installmentAmount: Number,
  frequency: String,                // enum: weekly | biweekly | monthly

  status: String,                   // enum: active | completed | defaulted | cancelled

  // ◄─ EMBEDDED: Payments (v1: installment_payments)
  payments: [{
    installmentNumber: Number,
    dueDate: Date,
    amountDue: Number,
    amountPaid: Number,
    lateFee: Number,
    status: String,                 // enum: pending | paid | overdue | waived
    paidAt: Date | null,
    paymentId: ObjectId | null      // → payments
  }],

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, status: 1 }
// Index: { invoiceId: 1 }
// Index: { 'payments.dueDate': 1, 'payments.status': 1 }
```

**v1 Äquivalent:** `installment_plans` + `installment_payments` (Mig. 024) — v2 embedded payments

---

### 7.5 `insurance_companies` + `insurance_claims`

```typescript
// insurance_companies
{
  _id: ObjectId,
  name: { en: String, ar: String },
  code: String,
  contactPerson: String | null,
  phone: String | null,
  email: String | null,
  coveragePercentage: Number,       // Default für neue Patienten
  maxCoverage: Number | null,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { code: 1 } unique
// Index: { isActive: 1 }

// insurance_claims
{
  _id: ObjectId,
  claimNumber: String,              // Auto: CLM-2026-00001
  patientId: ObjectId,
  patientInsuranceIndex: Number,    // Index in patients.insurance[]
  invoiceId: ObjectId,

  claimDate: Date,
  serviceDate: Date,
  totalAmount: Number,
  claimedAmount: Number,
  approvedAmount: Number | null,
  patientResponsibility: Number | null,

  status: String,                   // enum: submitted | under_review | approved |
                                    //       partially_approved | denied | paid
  denialReason: String | null,

  documents: [{
    name: String,
    url: String,
    type: String
  }],

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { claimNumber: 1 } unique
// Index: { patientId: 1, createdAt: -1 }
// Index: { status: 1, claimDate: 1 }
```

**v1 Äquivalent:** `insurance_companies` + `insurance_claims` (Mig. 024)

---

### 7.6 `reconciliation` — Tagesabschluss

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,
  reconciliationDate: Date,

  openingBalance: Number,
  closingBalance: Number,

  cashReceived: Number,
  cardReceived: Number,
  onlineReceived: Number,
  insuranceReceived: Number,
  totalReceived: Number,

  expenses: Number,
  discrepancy: Number,

  status: String,                   // enum: open | closed | reviewed
  closedBy: ObjectId | null,
  reviewedBy: ObjectId | null,

  notes: String | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { branchId: 1, reconciliationDate: -1 } unique
```

**v1 Äquivalent:** `daily_reconciliation` (Mig. 024)

---

## 8. Tenant-DB: Inventory & Procurement

### 8.1 `inventory_items` — Artikelstamm

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  sku: String,                      // Eindeutig
  barcode: String | null,

  categoryId: ObjectId,             // → inventory_categories
  supplierId: ObjectId | null,      // → suppliers

  unit: String,                     // enum: piece | box | pack | bottle | tube | roll | set
  minQuantity: Number,              // Mindestbestand (Alarm)
  reorderPoint: Number,
  reorderQuantity: Number,

  purchasePrice: Number,
  sellingPrice: Number | null,

  expiryTracking: Boolean,
  batchTracking: Boolean,

  description: String | null,
  imageUrl: String | null,

  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { sku: 1 } unique
// Index: { barcode: 1 } unique sparse
// Index: { categoryId: 1, isActive: 1 }
// Index: { 'name.en': 'text' }
```

**v1 Äquivalent:** `inventory` + `inventory_items` (Mig. 002b, 009) — v2 vereint

---

### 8.2 `inventory_stock` — Bestand pro Branch

```typescript
{
  _id: ObjectId,
  itemId: ObjectId,                 // → inventory_items
  branchId: ObjectId,

  currentQuantity: Number,
  reservedQuantity: Number,         // Für geplante Eingriffe reserviert
  availableQuantity: Number,        // = current - reserved

  // Batch-Tracking (optional)
  batches: [{
    batchNumber: String,
    quantity: Number,
    expiryDate: Date | null,
    receivedDate: Date,
    supplierId: ObjectId | null,
    purchaseOrderId: ObjectId | null
  }],

  lastCountedAt: Date | null,
  lastRestockedAt: Date | null,
  updatedAt: Date
}
// Index: { itemId: 1, branchId: 1 } unique
// Index: { branchId: 1, currentQuantity: 1 }
// Index: { 'batches.expiryDate': 1 }  — Für Ablauf-Warnung
```

**v1 Äquivalent:** `inventory_stock_levels` (Mig. 009) — v2 erweitert um Batch-Tracking + Reservierung

---

### 8.3 `inventory_movements` — Alle Lagerveränderungen

```typescript
{
  _id: ObjectId,
  itemId: ObjectId,
  branchId: ObjectId,

  type: String,                     // enum: purchase | sale | adjustment | transfer_in |
                                    //       transfer_out | waste | return | reservation |
                                    //       reservation_release
  quantity: Number,                 // Positiv für Zugang, negativ für Abgang
  previousQuantity: Number,
  newQuantity: Number,

  reference: String | null,         // "PO-2026-001", "XFER-001", etc.
  referenceType: String | null,     // enum: purchase_order | stock_transfer |
                                    //       stock_count | manual | appointment | invoice
  referenceId: ObjectId | null,

  batchNumber: String | null,
  reason: String | null,

  performedBy: ObjectId,
  createdAt: Date
}
// Index: { itemId: 1, createdAt: -1 }
// Index: { branchId: 1, type: 1, createdAt: -1 }
// Index: { referenceType: 1, referenceId: 1 }
```

**v1 Äquivalent:** NEU — v1 hatte kein Bewegungs-Tracking (nur Mig. 009 stock_levels)

---

### 8.4 `inventory_categories`

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  parentId: ObjectId | null,        // Für Subkategorien
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { parentId: 1, sortOrder: 1 }
```

**v1 Äquivalent:** `inventory_categories` (Mig. 009)

---

### 8.5 `suppliers`

```typescript
{
  _id: ObjectId,
  name: String,
  code: String,
  contactPerson: String | null,
  phone: String | null,
  email: String | null,
  address: String | null,
  city: String | null,
  taxNumber: String | null,

  // ◄─ EMBEDDED: Payment Terms (v1: separate config)
  paymentTerms: {
    paymentDays: Number,            // z.B. 30
    creditLimit: Number | null,
    discountPercentage: Number | null,
    discountDays: Number | null     // Skonto-Frist
  },

  rating: Number | null,            // 1-5
  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
// Index: { code: 1 } unique
// Index: { isActive: 1 }
```

**v1 Äquivalent:** `suppliers` (Mig. 009/024)

---

### 8.6 `purchase_orders` — Bestellungen (Embedded Items)

```typescript
{
  _id: ObjectId,
  orderNumber: String,              // Auto: PO-2026-001
  supplierId: ObjectId,
  branchId: ObjectId,

  // ◄─ EMBEDDED: Items (v1: purchase_order_items)
  items: [{
    itemId: ObjectId,               // → inventory_items
    itemName: String,
    sku: String,
    quantity: Number,
    receivedQuantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    notes: String | null
  }],

  subtotal: Number,
  taxAmount: Number,
  shippingCost: Number,
  totalAmount: Number,

  status: String,                   // enum: draft | submitted | approved | ordered |
                                    //       partially_received | received | cancelled

  orderDate: Date,
  expectedDeliveryDate: Date | null,
  receivedDate: Date | null,

  notes: String | null,

  createdBy: ObjectId,
  approvedBy: ObjectId | null,
  createdAt: Date,
  updatedAt: Date
}
// Index: { orderNumber: 1 } unique
// Index: { supplierId: 1, status: 1 }
// Index: { branchId: 1, status: 1, createdAt: -1 }
```

**v1 Äquivalent:** `purchase_orders` + `purchase_order_items` (Mig. 024) — v2 embedded items

---

### 8.7 `stock_transfers` — Inter-Branch Transfers 🆕

```typescript
{
  _id: ObjectId,
  transferNumber: String,           // Auto: XFER-2026-001
  sourceBranchId: ObjectId,
  destinationBranchId: ObjectId,

  items: [{
    itemId: ObjectId,
    itemName: String,
    quantity: Number,
    batchNumber: String | null
  }],

  status: String,                   // enum: requested | approved | in_transit |
                                    //       received | cancelled

  requestedBy: ObjectId,
  approvedBy: ObjectId | null,
  receivedBy: ObjectId | null,

  requestDate: Date,
  shippedDate: Date | null,
  receivedDate: Date | null,

  notes: String | null,
  createdAt: Date,
  updatedAt: Date
}
// Index: { transferNumber: 1 } unique
// Index: { sourceBranchId: 1, status: 1 }
// Index: { destinationBranchId: 1, status: 1 }
```

**v1 Äquivalent:** NEU — v1 hatte keine Inter-Branch Transfers

---

### 8.8 `stock_counts` — Inventur 🆕

```typescript
{
  _id: ObjectId,
  countNumber: String,              // Auto: CNT-2026-001
  branchId: ObjectId,

  type: String,                     // enum: full | partial | cycle

  items: [{
    itemId: ObjectId,
    itemName: String,
    expectedQuantity: Number,
    countedQuantity: Number,
    discrepancy: Number,            // = counted - expected
    adjustmentApplied: Boolean,
    notes: String | null
  }],

  status: String,                   // enum: in_progress | completed | cancelled

  createdBy: ObjectId,
  completedAt: Date | null,
  reviewedBy: ObjectId | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { branchId: 1, createdAt: -1 }
// Index: { status: 1, branchId: 1 }
```

**v1 Äquivalent:** NEU — v1 hatte keine physische Inventur

---

## 9. Tenant-DB: Staff & HR

### 9.1 `staff_schedules`

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // → platform users (staff)
  branchId: ObjectId,

  dayOfWeek: Number,                // 0-6
  startTime: String,
  endTime: String,

  role: String,                     // Wird von user.role kopiert
  isRamadanSchedule: Boolean,

  createdAt: Date,
  updatedAt: Date
}
// Index: { userId: 1, branchId: 1, dayOfWeek: 1 }
```

**v1 Äquivalent:** `staff_schedules` (Mig. 025)

---

### 9.2 `shift_templates`

```typescript
{
  _id: ObjectId,
  name: String,                     // "Morning Shift", "Evening Shift"
  startTime: String,
  endTime: String,
  breakDuration: Number,            // Minuten
  applicableRoles: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { isActive: 1 }
```

**v1 Äquivalent:** `shift_templates` (Mig. 025)

---

### 9.3 `leave_requests` + `leave_types` + `leave_balances`

```typescript
// leave_types
{
  _id: ObjectId,
  name: { en: String, ar: String },
  code: String,                     // "annual", "sick", "emergency"
  maxDaysPerYear: Number,
  isPaid: Boolean,
  requiresApproval: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { code: 1 } unique

// leave_requests
{
  _id: ObjectId,
  userId: ObjectId,
  leaveTypeId: ObjectId,            // → leave_types
  startDate: Date,
  endDate: Date,
  totalDays: Number,
  reason: String,
  status: String,                   // enum: pending | approved | rejected | cancelled
  approvedBy: ObjectId | null,
  approvedAt: Date | null,
  rejectionReason: String | null,

  attachments: [{
    name: String,
    url: String
  }],

  createdAt: Date,
  updatedAt: Date
}
// Index: { userId: 1, status: 1, startDate: -1 }
// Index: { status: 1, startDate: 1 }

// leave_balances
{
  _id: ObjectId,
  userId: ObjectId,
  leaveTypeId: ObjectId,
  year: Number,
  totalAllowance: Number,
  usedDays: Number,
  remainingDays: Number,
  carriedForward: Number,
  updatedAt: Date
}
// Index: { userId: 1, leaveTypeId: 1, year: 1 } unique
```

**v1 Äquivalent:** `leave_requests` + `leave_types` + `leave_balances` (Mig. 025)

---

### 9.4 `attendance` — Anwesenheit

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  branchId: ObjectId,
  date: Date,

  checkIn: Date,
  checkOut: Date | null,

  status: String,                   // enum: present | absent | late | half_day | holiday
  lateMinutes: Number,

  overtime: Number,                 // Überstunden in Minuten

  notes: String | null,
  verifiedBy: ObjectId | null,

  createdAt: Date,
  updatedAt: Date
}
// Index: { userId: 1, date: -1 } unique
// Index: { branchId: 1, date: -1 }
// Index: { status: 1, date: -1 }
```

**v1 Äquivalent:** `attendance` (Mig. 025)

---

## 10. Tenant-DB: Communication

### 10.1 `chat_channels` 🆕

> **Aligned with DENTO_V2_MASTER_PLAN.md §37 — Internal Staff Chat System**

```typescript
{
  _id: ObjectId,

  // Kanal-Typ (5 Typen per §37)
  type: String,                     // enum: direct | branch | role | custom | announcement

  // Metadaten (bilingual per §37)
  name: { en: String | null, ar: String | null },  // null bei Direct Messages
  description: String | null,
  avatarUrl: String | null,                         // Gruppenbild (optional)

  // Teilnehmer
  members: [{
    userId: ObjectId,
    role: String,                   // enum: admin | member
    joinedAt: Date,
    mutedUntil: Date | null,        // Stummgeschaltet bis
    lastReadAt: Date                // Für Unread-Zähler
  }],

  // Auto-Channel Verknüpfung (für branch/role Typen)
  branchId: ObjectId | null,        // Bei type='branch'
  roleFilter: String | null,        // Bei type='role' → z.B. 'dentist'

  // Direct Message Shortcut
  dmParticipants: [ObjectId, ObjectId] | null, // Bei type='direct' — für schnellen Lookup

  // Letzter Status (denormalisiert für Channel-Liste)
  lastMessage: {
    text: String,                   // Vorschau (max 100 chars)
    senderId: ObjectId,
    senderName: String,
    sentAt: Date,
  } | null,
  messageCount: Number,             // Gesamtzahl Nachrichten

  // Settings
  isArchived: Boolean,              // Default: false
  isPinned: Boolean,                // Default: false

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { 'members.userId': 1, type: 1 }         — Alle Channels eines Users
// Index: { dmParticipants: 1 }                     — DM-Lookup (unique pair)
// Index: { branchId: 1, type: 1 }                  — Branch-Channels
// Index: { 'lastMessage.sentAt': -1 }              — Sortierung nach Aktivität
```

**v1 Äquivalent:** NEU — v1 hatte kein Chat-System

---

### 10.2 `chat_messages` 🆕

> **Aligned with DENTO_V2_MASTER_PLAN.md §37 — Internal Staff Chat System**

```typescript
{
  _id: ObjectId,
  channelId: ObjectId,              // → chat_channels

  // Sender (denormalisiert für Performance)
  senderId: ObjectId,               // → users
  senderName: String,
  senderRole: String,               // "dentist", "receptionist", etc.
  senderAvatarUrl: String | null,

  // Inhalt
  type: String,                     // enum: text | image | file | voice | system
  text: String | null,              // Nachrichtentext (Markdown-Light)

  // Attachments (Bilder, Dateien, Voice)
  attachments: [{
    filename: String,               // "xray_mahmoud.jpg"
    url: String,                    // S3/R2 URL
    mimeType: String,               // "image/jpeg"
    size: Number,                   // Bytes
    thumbnailUrl: String | null     // Für Bilder: 200x200 Thumbnail
  }],

  // Reply / Thread
  replyToId: ObjectId | null,       // Antwort auf eine bestimmte Nachricht
  replyPreview: {                   // Denormalisierte Vorschau
    text: String,
    senderName: String,
  } | null,

  // Status
  readBy: [{
    userId: ObjectId,
    readAt: Date
  }],

  // Editing
  isEdited: Boolean,                // Default: false
  editedAt: Date | null,
  isDeleted: Boolean,               // Soft-Delete (Text wird "Message deleted")
  deletedAt: Date | null,

  createdAt: Date
}
// Index: { channelId: 1, createdAt: -1 }                   — Nachrichten pro Channel (paginiert)
// Index: { channelId: 1, senderId: 1, createdAt: -1 }      — Nachrichten eines Users in Channel
// TTL: { createdAt: 1 }, expireAfterSeconds: 31536000       — 365 Tage (konfigurierbar)
```

**v1 Äquivalent:** NEU — v1 hatte kein Messaging

---

### 10.3 `notification_queue` + `notification_templates` + `notification_logs`

```typescript
// notification_templates
{
  _id: ObjectId,
  name: String,
  type: String,                     // enum: email | sms | whatsapp | push
  event: String,                    // enum: appointment_reminder | appointment_booked |
                                    //       prescription_ready | payment_due | birthday |
                                    //       treatment_followup | recall | custom
  subject: { en: String, ar: String },
  body: { en: String, ar: String }, // Handlebars-Templates
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { event: 1, type: 1, isActive: 1 }

// notification_queue
{
  _id: ObjectId,
  templateId: ObjectId | null,
  recipientId: ObjectId | null,     // → patients oder users
  recipientType: String,            // enum: patient | staff | doctor
  channel: String,                  // enum: email | sms | whatsapp | push

  to: String,                       // email/phone
  subject: String,
  body: String,

  status: String,                   // enum: queued | processing | sent | failed | cancelled
  scheduledAt: Date,                // Wann soll die Nachricht rausgehen
  sentAt: Date | null,
  failedAt: Date | null,
  failureReason: String | null,
  retryCount: Number,
  maxRetries: Number,

  priority: String,                 // enum: high | normal | low

  createdAt: Date
}
// Index: { status: 1, scheduledAt: 1, priority: -1 }  — Worker-Queue
// Index: { recipientId: 1, createdAt: -1 }
// TTL: { createdAt: 1 }, expireAfterSeconds: 7776000  — 90 Tage Cleanup

// notification_logs
{
  _id: ObjectId,
  notificationId: ObjectId,
  channel: String,
  to: String,
  status: String,                   // enum: delivered | bounced | read | clicked | unsubscribed
  providerResponse: Object,         // Rohes API-Response
  deliveredAt: Date | null,
  readAt: Date | null,
  createdAt: Date
}
// Index: { notificationId: 1 }
// Index: { createdAt: -1 }
// TTL: { createdAt: 1 }, expireAfterSeconds: 7776000
```

**v1 Äquivalent:** `notification_logs` (Mig. 024) — v2 erweitert um Queue-System + Templates + Multi-Channel

---

## 11. Tenant-DB: Settings & Configuration

### 11.1 `settings` — Tenant-Konfiguration

```typescript
{
  _id: ObjectId,
  key: String,                      // z.B. "clinic", "appointment", "billing", "notifications"

  // Verschiedene Settings-Gruppen als Subdocuments:
  // key = "clinic"
  value: {
    name: { en: String, ar: String },
    phone: String,
    email: String,
    website: String | null,
    logo: String | null,
    address: { en: String, ar: String },
    timezone: String,               // "Africa/Cairo"
    defaultLanguage: String,        // "en" | "ar"
    dateFormat: String,             // "DD/MM/YYYY"
    timeFormat: String,             // "12h" | "24h"
    currency: String,               // "EGP" | "USD" | "SAR"
    taxEnabled: Boolean,
    taxPercentage: Number | null,
    fiscalYearStart: Number,        // Monat (1-12)
  } | {
  // key = "appointment"
    slotDuration: Number,           // Default: 30
    bufferTime: Number,
    maxAdvanceBookingDays: Number,
    minCancellationHours: Number,
    autoConfirm: Boolean,
    walkInEnabled: Boolean,
    onlineBookingEnabled: Boolean,
    reminderHoursBefore: [Number],  // [24, 2] → 24h und 2h vorher
    workingDays: [Number],          // [0,1,2,3,4] → So-Do (Ägypten)
    workingHoursStart: String,
    workingHoursEnd: String,
    ramadanScheduleActive: Boolean,
    ramadanStart: String,
    ramadanEnd: String
  } | {
  // key = "billing"
    invoicePrefix: String,          // "INV"
    invoiceStartNumber: Number,
    paymentMethods: [String],
    defaultPaymentTermDays: Number,
    enableInstallments: Boolean,
    enableInsurance: Boolean,
    enableCommissions: Boolean
  },

  updatedBy: ObjectId | null,
  updatedAt: Date,
  createdAt: Date
}
// Index: { key: 1 } unique
```

**v1 Äquivalent:** Verschiedene Felder aus `clinic_settings` + `appointment_settings` + `invoice_settings` + `notification_settings` (Mig. 001, 002c, 024, 025) — v2 als Key-Value Settings-Collection

---

### 11.2 `services` — Dienstleistungskatalog

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  description: { en: String, ar: String },
  categoryId: ObjectId | null,      // → service_categories

  code: String | null,              // ADA/CDT-Code
  defaultPrice: Number,

  // Branch-spezifische Preise (optional)
  branchPrices: [{
    branchId: ObjectId,
    price: Number
  }],

  defaultDuration: Number,          // Minuten

  // Benötigte Materialien (Auto-Reservierung)
  requiredMaterials: [{
    itemId: ObjectId,               // → inventory_items
    quantity: Number,
    isOptional: Boolean
  }],

  isActive: Boolean,
  sortOrder: Number,

  createdAt: Date,
  updatedAt: Date
}
// Index: { categoryId: 1, isActive: 1, sortOrder: 1 }
// Index: { code: 1 } sparse
```

**v1 Äquivalent:** `services` + `service_categories` (Mig. 002a, 024) — v2 embedded branch-spezifische Preise

---

### 11.3 `service_categories`

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  description: { en: String, ar: String },
  parentId: ObjectId | null,
  icon: String | null,
  color: String | null,
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { parentId: 1, sortOrder: 1 }
```

**v1 Äquivalent:** `service_categories` (Mig. 024)

---

### 11.4 `branches` — Filialen

```typescript
{
  _id: ObjectId,
  name: { en: String, ar: String },
  code: String,
  address: { en: String, ar: String },
  city: String,
  phone: String,
  email: String | null,

  // ◄─ EMBEDDED: Chairs (v1: chairs Tabelle)
  chairs: [{
    number: Number,                 // "Chair 1"
    name: String | null,
    isActive: Boolean,
    equipmentType: String | null    // "standard", "surgical", "pediatric"
  }],

  // Opening Hours (embedded, statt separate Tabelle)
  workingHours: [{
    dayOfWeek: Number,
    openTime: String,
    closeTime: String,
    isClosed: Boolean
  }],

  coordinates: {
    lat: Number,
    lng: Number
  } | null,

  isPrimary: Boolean,
  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
// Index: { code: 1 } unique
// Index: { isActive: 1 }
```

**v1 Äquivalent:** `branches` + `chairs` (Mig. 001, 002a) — v2 embedded chairs + working hours

---

### 11.5 `report_schedules` — Geplante Berichte

```typescript
{
  _id: ObjectId,
  name: String,
  reportType: String,               // enum: revenue | appointments | patients | inventory |
                                    //       commissions | insurance | aging | tax

  schedule: {
    frequency: String,              // enum: daily | weekly | monthly | quarterly
    dayOfWeek: Number | null,
    dayOfMonth: Number | null,
    time: String                    // "08:00"
  },

  filters: Object,                  // Dynamische Filter je nach reportType
  format: String,                   // enum: pdf | excel | csv

  recipients: [{
    userId: ObjectId | null,
    email: String,
    name: String
  }],

  lastRunAt: Date | null,
  lastStatus: String | null,
  isActive: Boolean,

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { isActive: 1, 'schedule.frequency': 1 }
```

**v1 Äquivalent:** `report_schedules` (Mig. 024)

---

## 12. Index-Strategie & Performance

### 12.1 Compound Indexes — Zusammenfassung

| Collection           | Index                                                    | Zweck                           |
| -------------------- | -------------------------------------------------------- | ------------------------------- |
| `appointments`       | `{ date, doctorId, startTime }`                          | Kalender: Tagesansicht pro Arzt |
| `appointments`       | `{ branchId, date, status }`                             | Branch-Dashboard                |
| `patients`           | `{ firstName.en: text, lastName.en: text, phone: text }` | Volltextsuche                   |
| `invoices`           | `{ status, dueDate }`                                    | Überfällige Rechnungen          |
| `procedure_notes`    | `{ patientId, createdAt: -1 }`                           | Behandlungsverlauf              |
| `dental_charts`      | `{ patientId, toothNumber }` unique                      | Zahnstatus-Lookup               |
| `inventory_stock`    | `{ itemId, branchId }` unique                            | Bestandsabfrage                 |
| `notification_queue` | `{ status, scheduledAt, priority: -1 }`                  | Worker-Queue FIFO               |
| `chat_messages`      | `{ channelId, createdAt: -1 }`                           | Chat-Pagination                 |
| `audit_logs`         | `{ tenantId, action, performedAt: -1 }`                  | Audit-Suche                     |

### 12.2 TTL Indexes — Automatische Cleanup

| Collection           | Feld          | TTL      | Zweck                             |
| -------------------- | ------------- | -------- | --------------------------------- |
| `chat_messages`      | `createdAt`   | 365 Tage | Chat-Nachrichten (konfigurierbar) |
| `notification_queue` | `createdAt`   | 90 Tage  | Verarbeitete Benachrichtigungen   |
| `notification_logs`  | `createdAt`   | 90 Tage  | Zustellungslogs                   |
| `audit_logs`         | `performedAt` | 730 Tage | Compliance (2 Jahre)              |
| `error_logs`         | `occurredAt`  | 90 Tage  | Error-Logs Cleanup                |
| `user_sessions`      | `expiresAt`   | —        | Session-Expiry (dynamisch)        |
| `webhook_logs`       | `createdAt`   | 30 Tage  | Webhook-Delivery Logs             |

### 12.3 Text Indexes

| Collection        | Felder                             | Gewichtung |
| ----------------- | ---------------------------------- | ---------- |
| `patients`        | `firstName.en, lastName.en, phone` | 10, 10, 5  |
| `inventory_items` | `name.en`                          | 10         |
| `services`        | `name.en, description.en`          | 10, 5      |
| `medications`     | `name.en, genericName`             | 10, 8      |

### 12.4 GeoSpatial Indexes

| Collection | Feld          | Typ        | Zweck                             |
| ---------- | ------------- | ---------- | --------------------------------- |
| `branches` | `coordinates` | `2dsphere` | Nächste Filiale finden (optional) |

### 12.5 Unique Constraints

| Collection            | Feld(er)                  | Scope         |
| --------------------- | ------------------------- | ------------- |
| `patients`            | `patientCode`             | Per Tenant-DB |
| `invoices`            | `invoiceNumber`           | Per Tenant-DB |
| `prescriptions`       | `prescriptionNumber`      | Per Tenant-DB |
| `dental_charts`       | `patientId + toothNumber` | Compound      |
| `inventory_items`     | `sku`                     | Per Tenant-DB |
| `insurance_companies` | `code`                    | Per Tenant-DB |
| `settings`            | `key`                     | Per Tenant-DB |
| `api_keys`            | `keyHash`                 | Platform-DB   |
| `tenants`             | `slug`                    | Platform-DB   |
| `users`               | `email`                   | Platform-DB   |

---

## 13. Sicherheit & Verschlüsselung

### 13.1 Field-Level Encryption (FLE)

| Collection         | Feld                       | Methode     | Grund                                  |
| ------------------ | -------------------------- | ----------- | -------------------------------------- |
| `patients`         | `nationalId`               | AES-256-GCM | PII — Personalausweisnummer            |
| `patients`         | `insurance[].policyNumber` | AES-256-GCM | Versicherungsdaten                     |
| `users`            | `passwordHash`             | Argon2id    | Passwort (kein AES — Hash!)            |
| `api_keys`         | `keyHash`                  | SHA-256     | API-Key (kein AES — Hash!)             |
| `chat_messages`    | `content`                  | AES-256-GCM | Nachrichten (optional, konfigurierbar) |
| `support_sessions` | `tempAccessToken`          | AES-256-GCM | Temp-Token für Support-Zugriff         |

### 13.2 Encryption Architecture

```
┌─── App Layer (Fastify) ──────────────────────────┐
│                                                    │
│   encryptField(value, tenantKey) → ciphertext     │
│   decryptField(ciphertext, tenantKey) → value     │
│                                                    │
│   Key Derivation:                                  │
│     tenantKey = HKDF(masterKey, tenantId + salt)  │
│     masterKey = AWS KMS / Vault                    │
│                                                    │
│   Algorithmus: AES-256-GCM                         │
│   IV: 12 Byte (random, pro Verschlüsselung)       │
│   AuthTag: 16 Byte                                 │
│   Format: iv:authTag:ciphertext (Base64)           │
│                                                    │
└───────────────────────────────────────────────────┘
```

### 13.3 At-Rest Encryption

- **MongoDB Atlas:** Verschlüsselung at-rest mit AES-256 (Cluster-Ebene, automatisch)
- **S3/R2 Uploads:** SSE-S3 oder SSE-KMS
- **Backups:** AES-256-CBC + gzip (siehe `backups` Collection, Feld `encryptionAlgorithm`)

### 13.4 In-Transit Encryption

- MongoDB ↔ App: TLS 1.3 (Atlas erzwingt)
- App ↔ Client: HTTPS (Let's Encrypt / Cloudflare)
- App ↔ S3: HTTPS

### 13.5 Access Control

```
Platform-DB:
  → Payload CMS Admin Panel: Rollenbasiert (super_admin, support, billing)
  → API: JWT + Role Check Middleware

Tenant-DB:
  → Fastify: tenantId aus JWT extrahiert
  → mongoose.connection.useDb(`tenant_${tenantSlug}`)
  → KEIN Cross-Tenant Access möglich (DB-Isolation)
  → Rollen: owner | admin | doctor | receptionist | nurse | lab_tech | accountant
```

---

## 14. Entfernte Tabellen (v1 → v2)

Folgende v1 PostgreSQL-Tabellen werden in v2 **nicht** portiert:

| #   | v1 Tabelle                   | Migration | Grund                                                    |
| --- | ---------------------------- | --------- | -------------------------------------------------------- |
| 1   | `pages`                      | 003       | Website-Builder entfernt (Modul-Upgrade)                 |
| 2   | `page_versions`              | 003       | Website-Builder entfernt                                 |
| 3   | `page_components`            | 003       | Website-Builder entfernt                                 |
| 4   | `page_component_data`        | 003       | Website-Builder entfernt                                 |
| 5   | `page_events`                | 003       | Website-Builder entfernt                                 |
| 6   | `page_component_events`      | 003       | Website-Builder entfernt                                 |
| 7   | `navigation_menus`           | 003       | Website-Builder entfernt                                 |
| 8   | `articles`                   | 005       | CMS jetzt über Payload CMS Globals                       |
| 9   | `article_categories`         | 005       | CMS über Payload                                         |
| 10  | `media`                      | 002a      | Wird durch S3/R2 + Collection `media` in Payload ersetzt |
| 11  | `themes`                     | 006       | Themes entfernt (Branding über Tenant-Settings)          |
| 12  | `theme_presets`              | 006       | Themes entfernt                                          |
| 13  | `tourism_packages`           | 007       | Dental-Tourism Modul entfernt (v2 kein Fokus)            |
| 14  | `tourism_package_inclusions` | 007       | Tourism entfernt                                         |
| 15  | `tourism_bookings`           | 007       | Tourism entfernt                                         |
| 16  | `tourism_itinerary_items`    | 007       | Tourism entfernt                                         |
| 17  | `tourism_reviews`            | 007       | Tourism entfernt                                         |
| 18  | `tourism_partners`           | 007       | Tourism entfernt                                         |
| 19  | `tourism_translations`       | 007       | Tourism entfernt                                         |
| 20  | `tenant_id` Column (alle)    | —         | Nicht nötig: DB-per-Tenant Isolation                     |
| 21  | `rls_policies` (~180)        | alle      | Nicht nötig: MongoDB hat kein RLS, App-Layer stattdessen |
| 22  | `pg_cron` Jobs               | 039       | Ersetzt durch BullMQ + Node-Cron                         |

---

## 15. Zusammenfassung & Collection-Inventar

### 15.1 Collection-Zählung

| Datenbank        | Anzahl Collections         | Beschreibung                 |
| ---------------- | -------------------------- | ---------------------------- |
| `dento_platform` | 22 Collections + 4 Globals | Zentrale SaaS-Administration |
| `tenant_{slug}`  | 56 Collections             | Pro-Tenant Klinische Daten   |
| **Gesamt**       | **~82 pro Deployment**     | 26 Platform + 56 Tenant      |

### 15.2 Platform-DB Collections (`dento_platform`)

| #      | Collection                 | Sektion |
| ------ | -------------------------- | ------- |
| 1      | `users`                    | 4.1     |
| 2      | `tenants`                  | 4.2     |
| 3      | `modules`                  | 4.3     |
| 4      | `tenant_modules`           | 4.4     |
| 5      | `pricing_config`           | 4.5     |
| 6      | `api_keys`                 | 4.6     |
| 7      | `webhooks`                 | 4.7     |
| 8      | `webhook_logs`             | 4.7     |
| 9      | `webhook_event_types`      | 4.7     |
| 10     | `feature_flags`            | 4.8     |
| 11     | `saas_invoices`            | 4.9     |
| 12     | `saas_payments`            | 4.9     |
| 13     | `saas_dunning_log`         | 4.9     |
| 14     | `audit_logs`               | 4.10    |
| 15     | `error_logs`               | 4.11    |
| 16     | `support_sessions`         | 4.12    |
| 17     | `user_sessions`            | 4.13    |
| 18     | `backups`                  | 4.14    |
| 19     | `deployments`              | 4.15    |
| 20     | `domains`                  | 4.15    |
| 21     | `country_config`           | 4.16    |
| 22     | `translation_packs`        | 4.16    |
| **G1** | `system_settings` (Global) | 4.17    |
| **G2** | `branding` (Global)        | 4.17    |
| **G3** | `currencies` (Global)      | 4.17    |
| **G4** | `backup_config` (Global)   | 4.17    |

### 15.3 Tenant-DB Collections (`tenant_{slug}`)

| #   | Collection                    | Sektion | 🆕 Neu |
| --- | ----------------------------- | ------- | ------ |
| 1   | `patients`                    | 5.1     |        |
| 2   | `dental_charts`               | 5.2     |        |
| 3   | `dental_chart_history`        | 5.3     |        |
| 4   | `treatment_plans`             | 5.4     |        |
| 5   | `procedure_notes`             | 5.5     |        |
| 6   | `procedure_note_templates`    | 5.6     |        |
| 7   | `prescriptions`               | 5.7     |        |
| 8   | `medications`                 | 5.8     |        |
| 9   | `xrays`                       | 5.9     |        |
| 10  | `cbct_orders`                 | 5.10    |        |
| 11  | `consent_forms`               | 5.11    |        |
| 12  | `consent_templates`           | 5.11    |        |
| 13  | `lab_orders`                  | 5.12    |        |
| 14  | `dental_labs`                 | 5.13    |        |
| 15  | `lab_order_types`             | 5.14    |        |
| 16  | `xray_types`                  | 5.15    |        |
| 17  | `appointments`                | 6.1     |        |
| 18  | `doctors`                     | 6.2     |        |
| 19  | `doctor_schedules`            | 6.3     |        |
| 20  | `schedule_exceptions`         | 6.3     |        |
| 21  | `walk_in_queue`               | 6.4     |        |
| 22  | `appointment_waitlist`        | 6.5     |        |
| 23  | `recurring_appointment_rules` | 6.5     |        |
| 24  | `appointment_types`           | 6.6     |        |
| 25  | `invoices`                    | 7.1     |        |
| 26  | `payments`                    | 7.2     |        |
| 27  | `doctor_commissions`          | 7.3     |        |
| 28  | `commission_payouts`          | 7.3     |        |
| 29  | `installment_plans`           | 7.4     |        |
| 30  | `insurance_companies`         | 7.5     |        |
| 31  | `insurance_claims`            | 7.5     |        |
| 32  | `reconciliation`              | 7.6     |        |
| 33  | `inventory_items`             | 8.1     |        |
| 34  | `inventory_stock`             | 8.2     |        |
| 35  | `inventory_movements`         | 8.3     | 🆕     |
| 36  | `inventory_categories`        | 8.4     |        |
| 37  | `suppliers`                   | 8.5     |        |
| 38  | `purchase_orders`             | 8.6     |        |
| 39  | `stock_transfers`             | 8.7     | 🆕     |
| 40  | `stock_counts`                | 8.8     | 🆕     |
| 41  | `staff_schedules`             | 9.1     |        |
| 42  | `shift_templates`             | 9.2     |        |
| 43  | `leave_requests`              | 9.3     |        |
| 44  | `leave_types`                 | 9.3     |        |
| 45  | `leave_balances`              | 9.3     |        |
| 46  | `attendance`                  | 9.4     |        |
| 47  | `chat_channels`               | 10.1    | 🆕     |
| 48  | `chat_messages`               | 10.2    | 🆕     |
| 49  | `notification_queue`          | 10.3    | 🆕     |
| 50  | `notification_templates`      | 10.3    |        |
| 51  | `notification_logs`           | 10.3    |        |
| 52  | `settings`                    | 11.1    |        |
| 53  | `services`                    | 11.2    |        |
| 54  | `service_categories`          | 11.3    |        |
| 55  | `branches`                    | 11.4    |        |
| 56  | `report_schedules`            | 11.5    |        |

### 15.4 Migration-Kennzahlen

| Metrik                           | Wert                    |
| -------------------------------- | ----------------------- |
| v1 PostgreSQL Tabellen           | 107                     |
| v1 RLS Policies                  | ~180                    |
| v2 Platform Collections          | 22 + 4 Globals          |
| v2 Tenant Collections            | 56                      |
| **v2 Gesamt Collections**        | **82**                  |
| Embedded (Tabellen → Subdocs)    | 28 Tabellen eingebettet |
| Komplett entfernt                | 22 Tabellen             |
| Neu in v2                        | 6 Collections           |
| Reduktion (Tables → Collections) | 107 → 82 (23% weniger)  |

---

> **Erstellt:** Juni 2025
> **Version:** 1.0
> **Basis:** v1 Supabase (78 Migrationen) + v2 Master Plan + v2 Security & Encryption
> **Nächster Schritt:** Mongoose-Schemas implementieren in `packages/shared/src/schemas/`

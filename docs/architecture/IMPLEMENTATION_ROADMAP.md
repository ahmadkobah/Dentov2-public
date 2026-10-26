# Dento v2 — Implementation Roadmap

> **Quelle:** DENTO_V2_MASTER_PLAN.md (37 Sections, 8.024 Zeilen)
> **Security:** SECURITY_AND_ENCRYPTION.md (15 Schichten, 80+ Checkpoints)
> **Datum:** 2025-07-13
> **Zeitrahmen:** 26 Wochen (~6 Monate) — **per V2_DECISION_LOG §8 auf 34 Wochen erweitert** (4 × 2-Wochen-Buffer); die Entscheidung im Decision Log überschreibt die 26-Wochen-Darstellung in diesem Dokument
> **Team:** 1 Full-Stack Developer (Solo)
> **Repo:** Neues Repository (Clean Start) — **kein Code aus v1 übernommen**

> **📌 Status-Update:** Die Phasen 0–7 sind **abgeschlossen** (~März 2026); das Projekt steuert auf den v2-Launch zu. Dieses Dokument beschreibt den ursprünglichen Umsetzungsplan und dient als Referenz.

### ⚠️ Clean-Repo-Strategie

Die v2 wird in einem **komplett neuen Repository** gebaut. Vom v1-Repo (`Dento`) wird **kein Code und keine Datei** übernommen. _(Hinweis: Ein v1→v2-**Daten**-Migrationspfad existiert inzwischen und wurde ausgeliefert — `apps/api/src/scripts/migrate-v1` migriert Users, Patients, Appointments, Treatments, Invoices, Prescriptions, X-Rays und Inventory.)_ Gründe:

1. **v1 Stack inkompatibel** — Supabase/Postgres → MongoDB/Payload CMS (0% wiederverwendbar)
2. **v1 Frontend Legacy** — kein TypeScript, keine Monorepo-Struktur, Vite-Config veraltet
3. **Saubere Git-History** — kein Ballast von 500+ v1-Commits
4. **Dependency-Hygiene** — nur v2-Dependencies, kein `node_modules`-Chaos
5. **CI/CD von Grund auf** — GitHub Actions statt bestehender Workflows

**Was übernommen wird (nur als Referenz, nicht als Code):**

- Business Logic / Domain Knowledge aus v1-Quellcode (z.B. Zahnschema-Logik, Rechnungsberechnung)
- UI/UX-Patterns als Inspiration (nicht als Copy-Paste)
- Seed-Daten (Medications-Liste, Lab Order Types) — manuell neu erstellt
- Docs/v2/\* Planungsdokumente → werden ins neue Repo kopiert

---

## Inhaltsverzeichnis

1. [Übersicht — 7-Phasen Gantt](#1-übersicht--7-phasen-gantt)
2. [Phase 0 — Foundation (Wo 1-2)](#2-phase-0--foundation-wo-1-2)
3. [Phase 1 — Auth & Tenancy (Wo 3-4)](#3-phase-1--auth--tenancy-wo-3-4)
4. [Phase 2 — Dev Portal + Core Admin (Wo 5-7)](#4-phase-2--dev-portal--core-admin-wo-5-7)
5. [Phase 3 — Core Clinical (Wo 8-13)](#5-phase-3--core-clinical-wo-8-13)
6. [Phase 4 — Financial (Wo 14-16)](#6-phase-4--financial-wo-14-16)
7. [Phase 5 — Operational (Wo 17-19)](#7-phase-5--operational-wo-17-19)
8. [Phase 6 — Support & Infra (Wo 20-21)](#8-phase-6--support--infra-wo-20-21)
9. [Phase 7 — Mobile App (Wo 22-26)](#9-phase-7--mobile-app-wo-22-26)
10. [Dependency Graph](#10-dependency-graph)
11. [Risk & Mitigation](#11-risk--mitigation)
12. [Meilensteine & Go/No-Go Gates](#12-meilensteine--gono-go-gates)
13. [Definition of Done (pro Feature)](#13-definition-of-done-pro-feature)
14. [🔒 Security Integration Map](#14--security-integration-map)

---

## 1. Übersicht — 7-Phasen Gantt

```
Wo  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
    ├──────┤                                                                          Phase 0: Foundation
          ├──────┤                                                                    Phase 1: Auth & Tenancy
                ├──────────┤                                                          Phase 2: Dev Portal + Core Admin
                            ├──────────────────────┤                                  Phase 3: Core Clinical
                                                    ├──────────┤                      Phase 4: Financial
                                                                ├──────────┤          Phase 5: Operational
                                                                            ├────┤    Phase 6: Support & Infra
                                                                                 ├────────────┤  Phase 7: Mobile
    ─────────────────────────────────────────────────────────────────────────────────────────────
    M0       M1       M2                M3                   M4          M5    M6         M7
    ▲        ▲        ▲                 ▲                    ▲           ▲     ▲          ▲
    Setup    Auth     Dev Portal        Clinical MVP         Billing     Ops   Infra      Mobile
    Done     Done     + Admin Shell     Complete             Complete    Done  Done       Launch
```

### Phase-Budgets (Zusammenfassung)

| Phase | Wochen | Dauer | Kern-Deliverable                  | Master Plan Sections                                                      |
| :---: | :----: | :---: | :-------------------------------- | :------------------------------------------------------------------------ |
| **0** |  1–2   | 2 Wo  | Monorepo + Docker + Hello World   | §1, §2, §33                                                               |
| **1** |  3–4   | 2 Wo  | Login + Tenant CRUD + RBAC        | §6, §12, §25, §26, §27                                                    |
| **2** |  5–7   | 3 Wo  | Dev Portal komplett + Admin Shell | §7, §8, §9, §14, §18, §23, §24, §28, §29                                  |
| **3** |  8–13  | 6 Wo  | Alle klinischen Module            | §10 (#1-#7, #10-#13, #19-#21, #24-#26), §13, §15, §17, §19, §20, §22, §37 |
| **4** | 14–16  | 3 Wo  | Invoices, Payments, Insurance     | §10 (#8, #9, #14, #22, #23), §29                                          |
| **5** | 17–19  | 3 Wo  | Inventory, Leave, Reports         | §10 (#15, #20, #21), §16, §21                                             |
| **6** | 20–21  | 2 Wo  | Tailscale, Backup, Monitoring     | §33, §34                                                                  |
| **7** | 22–26  | 5 Wo  | React Native + Realm + Push       | §32                                                                       |

---

## 2. Phase 0 — Foundation (Wo 1-2)

> **Ziel:** Monorepo steht, alle Services laufen lokal, erster CRUD-Smoke-Test erfolgreich.

### Woche 1 — Neues Repo + Scaffolding

| Tag | Task                            | Deliverable                                                                           | Abhängigkeit |
| :-: | :------------------------------ | :------------------------------------------------------------------------------------ | :----------- |
|  1  | **Neues GitHub-Repo erstellen** | `dento-v2` (private), MIT License, `.gitignore` (Node), README.md                     | —            |
|  1  | Monorepo initialisieren         | `pnpm init`, `pnpm-workspace.yaml`, Turborepo Config                                  | Tag 1        |
|  1  | Ordnerstruktur anlegen          | `apps/api`, `apps/admin`, `apps/developer`, `packages/shared`, `packages/ui`          | Tag 1        |
|  1  | Docs migrieren                  | `Docs/v2/*` Planungsdokumente aus altem Repo → `docs/` im neuen Repo                  | Tag 1        |
|  2  | Payload CMS Setup               | Payload 3.x in `apps/api`, MongoDB Connection, erste Admin-Collection                 | Tag 1        |
|  2  | MongoDB Atlas Cluster           | M10 Cluster, Nutzer, Netzwerk, Connection String                                      | —            |
|  3  | Fastify Tenant-API              | Fastify 5.x Server neben Payload, `useDb()` Middleware Skeleton                       | Tag 2        |
|  3  | Redis Setup                     | Redis 8 lokal (Docker) + Upstash für Production                                       | —            |
|  4  | TailAdmin Integration           | Admin App + Developer App mit TailAdmin Free Template, Routing Setup                  | Tag 1        |
|  4  | Tailwind CSS 4 + RTL            | `tailwind.config.ts`, Logical Properties (`ms-`, `me-`, `ps-`, `pe-`), LTR/RTL Toggle | Tag 4        |
|  5  | Docker Compose                  | `docker-compose.yml` (MongoDB + Redis + API + Admin + Developer)                      | Tag 2-4      |
|  5  | 🔒 **Helmet + CORS + CSP**      | `@fastify/helmet`, `@fastify/cors`, CSP-Header — Security ab der ersten Route         | Tag 3        |
|  5  | 🔒 **`.env` Security-Struktur** | `.env.example` mit allen Secrets-Platzhaltern, `.gitignore` für `.env*`               | Tag 1        |

### Woche 2 — Shared Packages + CI

| Tag | Task                    | Deliverable                                                                   | Abhängigkeit |
| :-: | :---------------------- | :---------------------------------------------------------------------------- | :----------- |
|  6  | `packages/shared`       | Zod Schemas, TypeScript Types, Utils, Constants, Enums                        | Wo 1         |
|  7  | `packages/ui`           | Button, Input, Card, Select, Modal, Badge — Tailwind/Shadcn Basis-Komponenten | Tag 6        |
|  8  | ESLint + Prettier       | Flat Config, Husky Pre-Commit Hook, lint-staged                               | Tag 6        |
|  8  | GitHub Actions CI       | Lint → Type Check → Build (Turborepo)                                         | Tag 8        |
|  8  | 🔒 **CI Security Gate** | `pnpm audit --audit-level=high` + TruffleHog Secret Scan in CI Pipeline       | Tag 8        |
|  9  | Vitest Setup            | Unit Test Config für `packages/shared`, API Route Tests Skeleton              | Tag 6        |
| 10  | **Smoke Test**          | Login-Screen → Dashboard → CRUD einer Test-Collection → Erfolg                | Tag 1-9      |

### Phase 0 Deliverables

- [x] Neues Repo `dento-v2` auf GitHub erstellt + Docs migriert
- [x] `pnpm dev` startet alle 3 Apps + Docker Services
- [x] Admin App zeigt TailAdmin Dashboard (LTR + RTL Toggle)
- [x] Developer App zeigt TailAdmin Dashboard
- [x] API antwortet auf `/health` + `/api/test-crud`
- [x] CI Pipeline: Push → Lint → Build → **Security Audit** → grün
- [x] 🔒 Helmet + CORS + CSP aktiv auf jeder API-Response
- [x] 🔒 `.env.example` mit allen Secret-Platzhaltern, keine Secrets im Code
- [x] 🔒 TruffleHog + `pnpm audit` laufen in CI
- [x] Zustand Store funktioniert in Admin App
- [ ] Altes Repo (`Dento`) archiviert oder als readonly markiert

---

## 3. Phase 1 — Auth & Tenancy (Wo 3-4)

> **Ziel:** Multi-Tenant-Auth komplett, ein Tenant kann sich anmelden und sieht sein Dashboard.

### Woche 3 — Auth + Tenant Isolation

| Tag | Task                         | Deliverable                                                                               | Master Plan § |
| :-: | :--------------------------- | :---------------------------------------------------------------------------------------- | :------------ |
| 11  | Payload Auth Config          | Login, Register, JWT (Access + Refresh), Password Reset                                   | §27           |
| 11  | 🔒 **JWT Dual-Token**        | Access Token (15min, Memory) + Refresh Token (7d, HttpOnly Cookie) + Rotation             | §27           |
| 11  | 🔒 **Argon2id**              | Passwort-Hashing (64 MB, t=3, p=4), letzte 5 Passwörter gesperrt                          | §27           |
| 11  | Brute-Force-Schutz           | Redis-basierter Progressive Cooldown (3→5min→15min→1h→IP-Block)                           | §27           |
| 12  | Tenant CRUD (Platform)       | `tenants` Collection in `dento_platform`, CRUD Endpoints                                  | §6            |
| 12  | `useDb()` Middleware         | `mongoose.connection.useDb('tenant_{slug}')` pro Request                                  | §6            |
| 13  | 🔒 **RBAC Middleware**       | `authGuard → tenantDb → roleGuard` — 3-stufige Middleware-Chain                           | §27           |
| 13  | 🔒 **Permission Matrix**     | 28 Module × 8 Rollen, Code-definierte feste Rollen (unveränderbar)                        | §27           |
| 14  | User Invite Flow             | Email-Invite → Activation Link → Passwort setzen → Profil vervollständigen                | §12           |
| 14  | Avatar Upload                | S3/R2 Upload, Resize, Thumbnail                                                           | §12           |
| 15  | Tenant Locale System         | `country_config` → Language + Currency + Timezone Propagation                             | §25           |
| 15  | 🔒 **Rate Limiting**         | 3-Tier: Cloudflare (CDN) + `@fastify/rate-limit` (API: 100/min) + Auth-spezifisch (5/min) | §27           |
| 15  | 🔒 **Zod Validation**        | `packages/shared` Zod Schemas mit `.strict()` auf jedem Endpoint                          | §27           |
| 15  | 🔒 **NoSQL Injection Guard** | `$`-Operator Sanitizer Middleware für alle Inputs                                         | §27           |

### Woche 4 — i18n + Onboarding + Doctor Sync

| Tag | Task                          | Deliverable                                                                                                 | Master Plan § |
| :-: | :---------------------------- | :---------------------------------------------------------------------------------------------------------- | :------------ |
| 16  | i18n-System                   | `translation_packs` Collection, `useLocale()` Hook, `<T key={...} />` Komponente                            | §26           |
| 16  | EN + AR Seed Packs            | Standard-Übersetzungen für alle UI-Labels (EN + AR)                                                         | §26           |
| 17  | Doctor-User Sync              | User ↔ Doctor bidirektional (Name, Photo, Gender, Phone)                                                    | §13           |
| 17  | Doctor Sharing (Multi-Branch) | Ein Arzt, mehrere Branches mit separaten Schedules                                                          | §13           |
| 18  | Tenant Onboarding Wizard      | Step 1: Klinik-Info, Step 2: Branch, Step 3: Erster Admin-User, Step 4: Sprache/Währung                     | §12           |
| 19  | **Seed Script**               | Tenant-Erstellung → Auto-Seed: Medications (100), Lab Order Types (14), Translation Packs, Default Settings | §10           |
| 20  | **Integration Test**          | Neuen Tenant erstellen → Einloggen → Dashboard sehen → Sprache wechseln (EN→AR→EN)                          | \*            |

### Phase 1 Deliverables

- [x] Login/Register/Forgot-Password funktioniert
- [x] Neuer Tenant per API erstellt → isolierte DB `tenant_{slug}`
- [x] RBAC: tenant_admin sieht alles, receptionist nur Appointments+Patients
- [x] i18n: LTR ↔ RTL Switch mit komplettem Label-Flip
- [x] Doctor ↔ User Sync funktioniert bidirektional
- [x] Brute-Force: 3+ Fehlversuche → Cooldown aktiv
- [x] 🔒 JWT Access Token nur im Memory, Refresh in HttpOnly Cookie
- [x] 🔒 Token Rotation bei jedem Refresh-Call aktiv
- [x] 🔒 3-stufige Middleware-Chain (authGuard → tenantDb → roleGuard) erzwungen
- [x] 🔒 Rate Limiting: API (100/min) + Auth (5/min) aktiv
- [x] 🔒 Zod `.strict()` Validation auf jedem Endpoint
- [x] 🔒 NoSQL Injection Guard (`$`-Operator Blocking) aktiv
- [x] 🔒 Tenant-Isolation: DB-per-Tenant via `useDb()` verifiziert

---

## 4. Phase 2 — Dev Portal + Core Admin (Wo 5-7)

> **Ziel:** Dev Portal voll funktional, Admin Portal Shell steht mit Dashboard + Daily Ops.

### Woche 5 — Dev Portal Core

| Task                            | Deliverable                                                                       | Master Plan § |
| :------------------------------ | :-------------------------------------------------------------------------------- | :------------ |
| Tenant-Liste + Detail (10 Tabs) | Overview, Users, Modules, DB, Billing, Branding, Settings, Support, Logs, Backups | §7, §8        |
| Modul-Verwaltung                | Module aktivieren/deaktivieren pro Tenant, Preis-Konfiguration                    | §7, §28       |
| DB Explorer (React UI)          | Collections browsen, Dokumente ansehen (readonly), Index-Info                     | §7            |
| Ticketing System                | Ticket CRUD, Priority (P1-P4), SLA Timer, Status-Flow                             | §9            |
| Tenant Impersonation            | `support_sessions`: temp JWT (60min), Banner, Audit-Trail                         | §9            |

### Woche 6 — Dev Portal Advanced + Payments

| Task                                   | Deliverable                                                                          | Master Plan § |
| :------------------------------------- | :----------------------------------------------------------------------------------- | :------------ |
| Module Versioning                      | Version-Tracking, Canary Rollout (5%→25%→50%→100%)                                   | §24           |
| 🔒 **Webhook System** (Platform-Level) | webhook_endpoints, webhook_deliveries, Retry mit Backoff, **HMAC-SHA256 Signierung** | §23           |
| Pricing System                         | Module Pricing CRUD, Coupons, Discounts, Trials                                      | §28           |
| Paymob Integration                     | Karten, Fawry, Mobile Wallets, InstaPay, ValU, Meeza                                 | §29           |
| Stripe Integration                     | Karten, SEPA für internationale Tenants                                              | §29           |
| Per-Tenant Backup                      | BullMQ Worker + mongodump → S3/R2 + UI im Dev Portal                                 | §34           |
| 🔒 **API Rate Limiting**               | Redis-basiert pro API Key, konfigurierbar                                            | §23           |
| 🔒 **API Key Hashing**                 | SHA-256 Hash in DB, Klartext nur einmal anzeigen                                     | §23           |

### Woche 7 — Admin Shell + Operations Hub

| Task                        | Deliverable                                                                    | Master Plan § |
| :-------------------------- | :----------------------------------------------------------------------------- | :------------ |
| Admin Sidebar + Routing     | Alle 28 Module-Links, Gruppen, Icons, RBAC-basierte Sichtbarkeit               | §4, §10       |
| Dashboard Redesign          | 8 Widgets + Sparklines + Trend-Vergleich + Waiting Room Widget                 | §10 (#1), §21 |
| Recharts Integration        | Bar, Line, Pie Charts für Dashboard                                            | §21           |
| Daily Operations Hub        | Walk-ins + Termine + Warteraum + Chair-Dashboard + Queue-Nummern               | §18           |
| Socket.io Setup             | Real-Time Queue Updates, Notification Bell, Chair Status                       | §18           |
| Notification Center (Shell) | In-App Bell + Dropdown mit Socket.io Push                                      | §20           |
| Notification Preferences    | User/Patient-spezifisch: Kanäle × Kategorien + Quiet Hours                     | §20           |
| BullMQ Notification Workers | 4 Queues: Email, SMS, WhatsApp, Push (Shell — Provider später)                 | §20           |
| Notification Templates      | Bilinguale Templates (EN/AR) pro Event-Typ                                     | §20           |
| Alert Rules (configurable)  | `alert_rules` CRUD + BullMQ Checker (15min Cron)                               | §20           |
| Branding Propagation        | Logo/Farben/Name → Sidebar, Docs, Emails                                       | §14           |
| Lab Order Types             | Seed 14 Typen + Custom Types CRUD in Settings                                  | §10 (#13)     |
| Recurring Appointments      | Rules Management, Edit Modi (this/future/all), Conflict-Check, BullMQ Cron     | §19           |
| Reports Shell (Free Tier)   | Dashboard Reports + Reports Hub + 5 Kategorie-Seiten (Locked-Preview für Paid) | §21           |
| OpenAPI Auto-Gen            | `@fastify/swagger` → OpenAPI 3.1 Spec                                          | §7            |

### Phase 2 Deliverables

- [x] Dev Portal: 16 Module voll funktional
- [x] Paymob + Stripe: Testzahlung erfolgreich
- [x] Admin: Dashboard mit Live-Daten + 8 Widgets
- [x] Daily Ops: Walk-in registrieren → Queue → Chair zuweisen → behandelt
- [x] Recurring: Serie erstellen → im Kalender als 🔄 sichtbar
- [x] Notifications: In-App Bell empfängt Socket.io Events
- [x] Branding: Logo Upload → sichtbar in Sidebar + Docs
- [x] 🔒 Webhooks: HMAC-SHA256 Signierung + Timestamp verifiziert
- [x] 🔒 API Keys: SHA-256 gehasht in DB, Klartext nur bei Erstellung
- [x] 🔒 Rate Limiting: Pro API Key konfigurierbar

---

## 5. Phase 3 — Core Clinical (Wo 8-13)

> **Ziel:** Alle klinischen Module voll funktional — ein Arzt kann einen Patienten komplett behandeln.
> **Größte Phase** — 6 Wochen, da dies der Kern der Anwendung ist.

### Woche 8 — Patients + Appointments

| Task                         | Deliverable                                                                      | Master Plan § |
| :--------------------------- | :------------------------------------------------------------------------------- | :------------ |
| Patients CRUD                | Liste + Detail + Suche + Tabs (Info, History, Charts, X-Rays, Billing)           | §10 (#2)      |
| Patient Allergies/MedHistory | Embedded Arrays, UI für Eintrag/Bearbeitung                                      | §10 (#2)      |
| 🔒 **PII Field Encryption**  | AES-256-GCM für `nationalId`, `phone`, `email`, `address` in Patients-Collection | §27           |
| Appointment Calendar         | FullCalendar Integration, Tages-/Wochen-/Monatsansicht, RTL-Support              | §10 (#3)      |
| Appointment CRUD             | Erstellen, Bearbeiten, Stornieren, Status-Flow, Drag & Drop                      | §10 (#3)      |
| Appointment Types            | CRUD + Farbkodierung + Standard-Dauer                                            | §10 (#3)      |
| Waitlist                     | Patienten auf Warteliste setzen, benachrichtigen bei Slot-Verfügbarkeit          | §10 (#3)      |
| Schedule Validierung         | 3-Ebenen: Branch Hours → Doctor Schedule → Appointment Conflict                  | §22           |

### Woche 9 — Scheduling + Booking

| Task                        | Deliverable                                                            | Master Plan § |
| :-------------------------- | :--------------------------------------------------------------------- | :------------ |
| Doctor Schedules            | CRUD + Kalender-Overlay in Appointment Calendar                        | §22           |
| Schedule Exceptions         | Urlaub, Krankheit, Ramadan — blockiert Slots                           | §22           |
| Slot-Engine                 | Branch + Doctor + Exceptions + bestehende Termine → verfügbare Slots   | §22           |
| Online-Booking API          | 4 Public Endpoints: branches, doctors, slots, booking (API Key Auth)   | §22           |
| Online-Booking Confirmation | Receptionist: Confirm / Modify+Confirm / Reject + Patient-Notification | §22           |
| Ramadan-Modus               | Branch ramadanHours + Auto-Switch + Slot-Engine Integration            | §22           |
| Branch Holidays             | Pro Branch konfigurierbar, blockiert Booking                           | §22           |
| Booking Window + Lead Time  | Max N Tage voraus, Min N Minuten vorher                                | §22           |
| Staff Schedules + Shifts    | staff_schedules, shift_templates CRUD                                  | §22           |
| Leave Requests (Teil 1)     | Leave-Request erstellen + Review Flow                                  | §10 (#20)     |
| Leave ↔ Schedule Sync       | Genehmigter Leave → Auto schedule_exception                            | §22           |

### Woche 10 — Dental Chart + Treatment Plans + Procedures

| Task                      | Deliverable                                                                      | Master Plan § |
| :------------------------ | :------------------------------------------------------------------------------- | :------------ |
| **Dental Chart**          | `react-odontogram` v0.5.5 Wrapper, FDI nativ, Adult/Child Toggle, Condition Grid | §10 (#4)      |
| Dental Chart Detail Panel | 5-Surface SVG, Severity (NEW), Tooth Notes/Notice, Case Label                    | §10 (#4)      |
| Dental Chart History      | Snapshots (manual + treatment_plan + treatment), View/Compare                    | §10 (#4)      |
| Dental Chart Mini         | Reusable `<DentalChartMini>` für Treatment Plans + Patient Overview              | §10 (#4)      |
| Dental Chart Print        | Druckbares HTML mit Legend + Summary + Notes                                     | §10 (#4)      |
| Treatment Plans           | CRUD + Items (embedded), Status Flow (draft→approved→in_progress→completed)      | §10 (#5)      |
| Treatment Plan ↔ Chart    | Items verknüpft mit Tooth Number, Mini-Chart in Plan-Detail                      | §10 (#5)      |
| Procedure Notes           | CRUD + Templates, Teeth Involved, Direct + Plan-basiert                          | §10 (#6)      |
| Procedure Note Templates  | Vordefinierte Templates pro Service-Typ                                          | §10 (#6)      |

### Woche 11 — Imaging + Prescriptions

| Task                        | Deliverable                                                                                 | Master Plan § |
| :-------------------------- | :------------------------------------------------------------------------------------------ | :------------ |
| X-Rays                      | Upload (S3/R2), CRUD, Multi-Tooth tagging (`toothNumbers[]`), Viewer                        | §10 (#11)     |
| 🔒 **File Upload Security** | Magic-Bytes MIME Check, Whitelist, Size-Limits, UUID Dateiname, EXIF Strip, Pre-Signed URLs | §27           |
| CBCT                        | Orders + Scan Upload + Report (embedded), S3 Storage                                        | §10 (#12)     |
| Clinical Cross-Linking      | X-Ray ↔ Treatment Plan ↔ Procedure Note bidirektional                                       | §17           |
| `<ImagingLinker />`         | Wiederverwendbare Komponente für alle Formulare                                             | §17           |
| Imaging Requirements        | Service → Required Imaging + Auto-Check + Waive-Option                                      | §17           |
| Pre/Post-Op Imaging         | Vorher/Nachher verknüpfen + Side-by-Side Viewer                                             | §17           |
| Imaging Timeline            | PatientView Tab: chronologische Übersicht aller Aufnahmen                                   | §17           |
| Dental Chart → Imaging      | Zahn klicken → alle verknüpften X-Rays, CBCTs, Treatments                                   | §17           |
| Prescriptions               | CRUD + Items (embedded), Medications Autocomplete, Print                                    | §10 (#10)     |
| Medications Katalog         | `medications` Collection, 100 Seed-Medikamente, Custom hinzufügbar                          | §10 (#10)     |

### Woche 12 — Lab + Services + Documents + Chat

| Task                      | Deliverable                                                                                              | Master Plan § |
| :------------------------ | :------------------------------------------------------------------------------------------------------- | :------------ |
| Lab Orders                | CRUD + Status Flow (ordered→fabricating→ready→delivered), Lab Tracking                                   | §10 (#13)     |
| Dental Labs               | CRUD, Rating, Contact Info                                                                               | §10 (#13)     |
| Services                  | CRUD + Categories, Default Duration, Default Price                                                       | §10 (#16)     |
| Service Default Materials | `defaultMaterials[]` für Auto-Inventar-Deduktion (vorbereitet für Phase 5)                               | §10 (#16)     |
| `<ClinicHeader />`        | Einheitlicher Header für alle Dokument-Templates (Branding)                                              | §14           |
| Document Templates        | Invoice, Prescription, Treatment Plan, Consent, Lab Order mit Branding                                   | §15           |
| Consent Forms             | Templates CRUD + Signatur-Widget + PDF-Generierung                                                       | §10 (#24)     |
| 🔒 **Staff Chat**         | Socket.io Chat: DM, Branch-Groups, Role-Groups, Attachments, Reply/Thread — **Chat-Retention + Privacy** | §37           |
| Chat Channels             | 5 Typen: direct, branch, role, custom, announcement + Auto-Channels                                      | §37           |

### Woche 13 — Notification Integration + Scheduled Jobs

| Task                         | Deliverable                                                                                | Master Plan § |
| :--------------------------- | :----------------------------------------------------------------------------------------- | :------------ |
| Appointment Reminders        | BullMQ Cron: 24h + 1h vor Termin (SMS/Email/WhatsApp)                                      | §20           |
| Auto-No-Show                 | BullMQ Job: Auto-No-Show nach konfigurierbarer Zeit                                        | §18           |
| Scheduled Notifications      | Recall, Payment Due, Low Stock, Expiry Alerts                                              | §20           |
| Web Push Notifications       | VAPID Keys + Service Worker + Push API                                                     | §20           |
| 🔒 **Tenant-Level Webhooks** | Admin Portal: Webhook CRUD + Events + Test + Logs — **HMAC-SHA256 Signierung**             | §23           |
| Custom Fields                | Dynamische Felder pro Entity (patients, invoices, etc.)                                    | §10           |
| 🔒 **Audit Logging**         | Jede Mutation geloggt: userId, action, before/after, IP, Timestamp                         | §27           |
| Workflows (BullMQ)           | Automation-Rules: Event → Condition → Action (kostenlos)                                   | §10           |
| Settings Page                | Alle Tenant-Einstellungen (General, Branding, Locale, Notifications, Webhooks)             | §10 (#28)     |
| 🔒 **2FA/MFA (TOTP)**        | `otplib` + `qrcode` — QR-Code Setup, 6-Digit Verification, Backup-Codes, Optional pro User | §27           |

### Phase 3 Deliverables

- [x] Patient erstellen → Termin buchen → Dental Chart befüllen → Treatment Plan
- [x] X-Ray hochladen → mit Zahn + Treatment Plan verknüpfen → im Chart sichtbar
- [x] Prescription schreiben → Medications Autocomplete → Drucken
- [x] Lab Order senden → Status-Updates → delivered
- [x] Staff Chat: Nachricht senden → instant empfangen (Socket.io)
- [x] Online-Booking: Slot buchen → Receptionist bestätigt → Patient-Benachrichtigung
- [x] Consent Form: Vorlage auswählen → Patient unterschreibt → PDF _(ConsentFormTemplate + SignatureWidget + window.print() — complete)_
- [x] 🔒 PII Field Encryption: Patient `nationalId`, `phone`, `email` verschlüsselt in DB
- [x] 🔒 File Upload: Magic-Bytes Check + EXIF Strip + Pre-Signed URLs aktiv
- [x] 🔒 Audit Logging: Jede CRUD-Mutation wird geloggt (before/after)
- [x] 🔒 Webhooks: HMAC-SHA256 Signierung auf Tenant-Level verifiziert
- [x] 🔒 2FA/MFA: TOTP Setup (QR-Code) + Login-Verification + Backup-Codes

---

## 6. Phase 4 — Financial (Wo 14-16)

> **Ziel:** Komplettre Abrechnungs-Pipeline — Invoice → Payment → Insurance Claim.

### Woche 14 — Invoices + Payments

| Task                    | Deliverable                                                                                  | Master Plan § |
| :---------------------- | :------------------------------------------------------------------------------------------- | :------------ |
| Invoices                | CRUD + Items (embedded), Auto-Generate aus Treatment Plan, PDF Export                        | §10 (#8)      |
| Invoice Line Items      | Services, Quantities, Discounts, Tax, Subtotal/Total                                         | §10 (#8)      |
| Per-Invoice Currency    | Override für Tenant-Default-Währung (z.B. Patient zahlt in USD)                              | §25           |
| Payments                | Erfassung: Cash, Card, Bank Transfer, Online (Paymob/Stripe)                                 | §10 (#9)      |
| Payment Reconciliation  | Automatischer Abgleich: Invoice-Total vs. bezahlt vs. ausstehend                             | §10 (#9)      |
| Paymob Online-Payment   | Karten, Fawry, Mobile Wallets in Invoice-Detail integriert                                   | §29           |
| Stripe Online-Payment   | Karten, SEPA für internationale Patienten                                                    | §29           |
| 🔒 **Payment Security** | Paymob/Stripe Webhooks mit HMAC verifizieren, keine Kartendaten in DB (PCI DSS via Provider) | §29           |
| Payment Receipts        | PDF-Quittung mit Branding                                                                    | §15           |

### Woche 15 — Insurance + Installments

| Task                    | Deliverable                                                     | Master Plan § |
| :---------------------- | :-------------------------------------------------------------- | :------------ |
| Insurance Companies     | CRUD, Coverage-Defaults, Contact Info                           | §10 (#14)     |
| Patient Insurance       | `patients.insurance[]` embedded, Primary/Secondary              | §10 (#14)     |
| Insurance Claims        | CRUD, Status Flow (submitted→approved→paid→denied), Attachments | §10 (#14)     |
| Claim ↔ Invoice Linking | Auto-Link, Coverage-Berechnung, Patient-Eigenanteil             | §10 (#14)     |
| Installment Plans       | CRUD + Items (embedded payments), Auto-Reminder                 | §10 (#23)     |
| Installment Tracking    | Zahlungsplan-Übersicht, Fälligkeitsbenachrichtigungen           | §10 (#23)     |

### Woche 16 — Commissions + Financial Reports + PDF

| Task                  | Deliverable                                                              | Master Plan § |
| :-------------------- | :----------------------------------------------------------------------- | :------------ |
| Doctor Commissions    | Konfigurierbarer Prozentsatz/Fixbetrag pro Service, Auto-Berechnung      | §10 (#22)     |
| Commission Payouts    | Auszahlungs-Tracking, Perioden, Export                                   | §10 (#22)     |
| Financial Reports (7) | Revenue, Collections, Outstanding, Aging, Payer-Mix, Commission, Refund  | §21           |
| PDF Export System     | `@react-pdf/renderer` für Invoice, Prescription, Treatment Plan, Reports | §15, §21      |
| Bulk Notifications    | Nachricht an alle Patienten (z.B. Praxis-Umzug, Feiertags-Schließung)    | §20           |
| Report Scheduling     | BullMQ Cron → Auto-Report per Email mit konfigurierbarer Frequenz        | §21           |

### Phase 4 Deliverables

- [x] Treatment Plan → Invoice generieren → Patient bezahlt (Paymob) → Quittung
- [x] Insurance Claim: Erstellen → Coverage berechnet → Eigenanteil auf Invoice
- [x] Installment: 3-Raten-Plan → Reminder bei Fälligkeit → Zahlung erfassen
- [x] Commissions: Arzt-Anteil auto-berechnet → Payout-Report
- [x] PDF: Invoice, Prescription, Treatment Plan — alle mit Clinic-Branding
- [x] 🔒 Payment-Webhooks: HMAC-verifiziert, keine Kartendaten in eigener DB

---

## 7. Phase 5 — Operational (Wo 17-19)

> **Ziel:** Inventory Deep Dive + Leave/Attendance + Advanced Reports.

### Woche 17 — Inventory Core

| Task                | Deliverable                                                        | Master Plan § |
| :------------------ | :----------------------------------------------------------------- | :------------ |
| Inventory Items     | CRUD, Categories, Barcode/QR, Min/Max-Level, Reorder-Point         | §16           |
| Inventory Stock     | Per-Branch Stock Tracking, Real-Time Levels                        | §16           |
| Inventory Movements | Auto-Deduktion bei Procedure → Service → defaultMaterials          | §16           |
| Suppliers           | CRUD, Rating, Contact, Payment Terms                               | §16           |
| Purchase Orders     | Draft → Submitted → Confirmed → Shipped → Received, Items embedded | §16           |
| Batch/Lot + Expiry  | Chargen-Tracking, Ablaufdaten-Dashboard, Expiry-Alert Cron         | §16           |

### Woche 18 — Inventory Advanced + Leave/Attendance

| Task                       | Deliverable                                                     | Master Plan § |
| :------------------------- | :-------------------------------------------------------------- | :------------ |
| Inter-Branch Transfers     | `stock_transfers` CRUD + Genehmigungs-Flow                      | §16           |
| Stock Count / Inventur     | `stock_counts` CRUD + Diskrepanz-Tracking + Adjustment          | §16           |
| Stock Valuation (FIFO/WAC) | Bewertungsmethoden-Report                                       | §16           |
| Auto-Reorder               | Low Stock → Vorausgefüllte PO als Draft                         | §16           |
| Barcode/QR Scanning        | Web: html5-qrcode, Mobile: expo-barcode-scanner (vorbereitet)   | §16           |
| Leave Requests (komplett)  | CRUD, Review-Flow, Balance-Tracking, Types (annual, sick, etc.) | §10 (#20)     |
| Leave Balances             | Auto-Berechnung, Jahresübertrag-Regeln                          | §10 (#20)     |
| Time & Attendance          | Check-In/Out, Arbeitszeit-Berechnung, Schicht-Abgleich          | §10 (#21)     |

### Woche 19 — Reports + Inventory Reports

| Task                      | Deliverable                                                                                            | Master Plan § |
| :------------------------ | :----------------------------------------------------------------------------------------------------- | :------------ |
| 10 Inventory Reports      | StockValuation, Expiry, Forecast, SupplierPerf, DeadStock, ABC, Turnover, Reorder, Movement, PO Report | §16, §21      |
| Patient Reports (5)       | Demographics, New vs. Returning, Recall, No-Show, Retention                                            | §21           |
| Appointment Reports (6)   | Utilization, Peak Hours Heatmap, Cancellation, Wait Time, Doctor Load, Room/Chair                      | §21           |
| Clinical Reports (4)      | Treatment Mix, Procedure Duration, Success Rate, Referral                                              | §21           |
| Operational Reports (4)   | Staff Attendance, Commission Summary, Branch Comparison, User Activity                                 | §21           |
| Saved Reports             | Report-Config speichern + wiederverwenden                                                              | §21           |
| Advanced Analytics Module | Paid ($199/Mo) — unlock der Advanced Reports mit Locked-Preview-CTA                                    | §21           |

### Phase 5 Deliverables

- [~] Inventory: Item anlegen → PO erstellen → Ware empfangen → bei Behandlung auto-abziehen _(Models + Services done; Routes/Tests/Frontend pending)_
- [~] Transfer: Stock von Branch A → Branch B mit Genehmigung _(Service layer done; Routes/Tests pending)_
- [~] Inventur: Stock Count → Diskrepanzen → Adjustment _(Service layer done; Routes/Tests pending)_
- [x] Leave: Request → Genehmigung → Auto-Schedule-Exception _(Completed in Phase 3)_
- [ ] 36 Reports gesamt (26 Klinisch/Financial + 10 Inventory) alle mit Export (CSV/Excel/PDF)
- [ ] 🔒 Reports: RBAC-geschützt (nur autorisierte Rollen sehen Financial Reports)

---

## 8. Phase 6 — Support & Infra (Wo 20-21)

> **Ziel:** Production-ready — Monitoring, Backup, Support-Tools.

### Woche 20 — Monitoring + Hardening

| Task                               | Deliverable                                                                                           | Master Plan § |
| :--------------------------------- | :---------------------------------------------------------------------------------------------------- | :------------ |
| Sentry Integration                 | Error Tracking für API + Admin + Developer App                                                        | §33           |
| Health Checks                      | `/health` Endpoints mit DB + Redis + S3 Status                                                        | §33           |
| 🔒 **Backup Automation**           | BullMQ Cron (03:00) → mongodump → **AES-256-GCM Encryption** → S3/R2 → SHA-256 Checksum → TTL Cleanup | §34           |
| Backup Restore                     | One-Click Restore im Dev Portal (mongorestore)                                                        | §34           |
| Logging                            | Structured JSON Logging (pino), Log-Aggregation                                                       | §33           |
| 🔒 **Security Audit**              | Helmet, CORS, CSP, Rate Limiting Review, Dependency Audit, **Penetration Test Vorbereitung**          | §27           |
| 🔒 **HIPAA/GDPR Compliance Check** | Alle 80+ Checkpoints aus SECURITY_AND_ENCRYPTION.md durchgehen                                        | §27           |
| Performance                        | MongoDB Indexes Review, Query Optimization, Bundle Size Audit                                         | §34           |

### Woche 21 — Tailscale Support + Final Polish

| Task                    | Deliverable                                                                  | Master Plan § |
| :---------------------- | :--------------------------------------------------------------------------- | :------------ |
| Tailscale Integration   | Sicherer Remote-Support statt LiveKit                                        | §33           |
| Support Sessions UI     | Dev Portal: Start/End Session, Session-Log, Banner im Admin                  | §9            |
| Production Deploy       | Railway/Fly.io (API) + Vercel (Admin + Developer)                            | §33           |
| DNS + SSL               | Cloudflare DNS, SSL Certificates, Domain Setup                               | §33           |
| Smoke Test (Production) | End-to-End: Tenant erstellen → Login → Patient → Termin → Rechnung → Zahlung | \*            |
| Documentation           | README.md, API Docs (Swagger), Deployment Guide                              | \*            |

### Phase 6 Deliverables

- [ ] Production-Server live und erreichbar
- [ ] Tägliche automatische Backups laufen
- [ ] Sentry: Errors tracked und Slack-Alerts konfiguriert
- [ ] 🔒 Backups: AES-256-GCM verschlüsselt + SHA-256 Checksum verifiziert
- [ ] 🔒 Security Audit: Alle 80+ Checkpoints bestanden
- [ ] 🔒 HIPAA + GDPR Compliance-Check dokumentiert
- [ ] 🔒 Source Maps in Production deaktiviert
- [ ] 🔒 Keine Secrets im Frontend-Bundle (VITE\_\* Präfix-Check)
- [ ] Tailscale: Support-Session erfolgreich getestet
- [ ] End-to-End Smoke Test auf Production: grün

---

## 9. Phase 7 — Mobile App (Wo 22-26)

> **Ziel:** React Native App für iOS + Android mit Offline-Fähigkeit.

### Woche 22 — Mobile Scaffolding

| Task                         | Deliverable                                                                               | Master Plan § |
| :--------------------------- | :---------------------------------------------------------------------------------------- | :------------ |
| Expo 52 Setup                | App-Skeleton, Expo Router, NativeWind 4                                                   | §32           |
| Realm Setup                  | Schema-Definition, Atlas Device Sync Konfiguration                                        | §32           |
| Auth Flow (Mobile)           | Login, Biometric Auth, Token Storage (SecureStore)                                        | §32           |
| 🔒 **Mobile Security Setup** | SecureStore für Tokens, Certificate Pinning, Jailbreak Detection, Network Security Config | §32           |
| Shared Code Integration      | `@dento/shared` Types, Schemas, Utils, Constants                                          | §32           |

### Woche 23 — Core Screens

| Task                  | Deliverable                                         | Master Plan § |
| :-------------------- | :-------------------------------------------------- | :------------ |
| Dashboard (Mobile)    | Heute-Übersicht: Termine, Walk-ins, Quick-Stats     | §32           |
| Patient List + Detail | Suche, Tabs (Info, Charts, History)                 | §32           |
| Appointment Calendar  | Tagesansicht, Erstellen, Status-Updates             | §32           |
| Dental Chart (Mobile) | react-odontogram (angepasst) oder vereinfachte View | §32           |

### Woche 24 — Clinical Modules

| Task            | Deliverable                            | Master Plan § |
| :-------------- | :------------------------------------- | :------------ |
| Treatment Plans | View + Status-Update                   | §32           |
| Prescriptions   | View + Quick-Create                    | §32           |
| X-Ray Viewer    | Galerie + Vollbild-Ansicht             | §32           |
| Lab Orders      | Status-Updates, Push bei Statuswechsel | §32           |

### Woche 25 — Offline + Push + Chat

| Task                    | Deliverable                                                        | Master Plan § |
| :---------------------- | :----------------------------------------------------------------- | :------------ |
| Realm Offline Sync      | Offline-Queue: Daten lokal → Auto-Sync bei Verbindung              | §32           |
| 🔒 **Realm Encryption** | AES-256, Key in SecureStore, Offline-Daten auto-wipe nach 30 Tagen | §32           |
| Push Notifications      | Expo Notifications → FCM/APNs + `device_tokens` Collection         | §32           |
| Staff Chat (Mobile)     | Realm Sync Chat, eigenes Tab, Push bei neuer Nachricht             | §37           |
| Barcode Scanner         | `expo-barcode-scanner` für Inventory                               | §16           |

### Woche 26 — Polish + App Store

| Task                     | Deliverable                                           | Master Plan § |
| :----------------------- | :---------------------------------------------------- | :------------ |
| RTL für Mobile           | `I18nManager.forceRTL(true)` + NativeWind RTL-Klassen | §32           |
| Dark Mode (Mobile)       | System-Setting + manueller Toggle                     | §32           |
| App Icons + Splash       | Branding, Launch Screen, App Icons (1024x1024)        | §32           |
| TestFlight + Play Beta   | iOS TestFlight + Google Play Internal Testing         | §32           |
| Performance Audit        | Hermes Engine, Large List Optimization, Bundle Size   | §32           |
| **App Store Submission** | Apple App Store + Google Play Store Upload            | §32           |

### Phase 7 Deliverables

- [ ] iOS + Android App lauffähig (TestFlight + Play Beta)
- [ ] Offline: Termin erstellen ohne Internet → synct bei Verbindung
- [ ] Push: Appointment Reminder kommt als Push-Notification
- [ ] Chat: Echtzeit-Nachrichten + Offline-Queue
- [ ] RTL: Arabische Version komplett gespiegelt
- [ ] 🔒 Tokens in SecureStore (Hardware-backed)
- [ ] 🔒 Certificate Pinning aktiv
- [ ] 🔒 Realm AES-256 verschlüsselt
- [ ] 🔒 Jailbreak Detection aktiv
- [ ] 🔒 Kein Cleartext-Traffic erlaubt
- [ ] App Store: Eingereicht/veröffentlicht

---

## 10. Dependency Graph

```
Phase 0: Foundation
  │
  ▼
Phase 1: Auth & Tenancy ◄── Alles hängt von Auth ab
  │
  ├──► Phase 2: Dev Portal ◄── Braucht Tenant CRUD + Auth
  │       │
  │       ├──► Phase 3: Core Clinical ◄── Braucht Admin Shell + Sidebar + Dashboard
  │       │       │
  │       │       ├──► Phase 4: Financial ◄── Braucht Patients + Appointments + Services
  │       │       │       │
  │       │       │       ├──► Phase 5: Operational ◄── Braucht Invoices (für Reports) + Services (für Inventory)
  │       │       │       │
  │       │       │       └──► Phase 6: Support & Infra (parallel zu Phase 5 möglich)
  │       │       │
  │       │       └──► Phase 7: Mobile ◄── Braucht alle APIs fertig (Phase 3-5)
  │       │
  │       └──► (kann teilweise parallel zu Phase 3 laufen falls 2. Entwickler vorhanden)
  │
  └──► Phase 6 kann nach Phase 4 beginnen (Infra unabhängig von Operational)
```

### Kritische Abhängigkeiten

| Blocker                 | Was blockiert                  | Risiko                                 |
| ----------------------- | :----------------------------- | :------------------------------------- |
| **Neues Repo anlegen**  | Alles                          | Niedrig — 10min Aufwand                |
| MongoDB Atlas Setup     | Alles                          | Niedrig — 1h Aufwand                   |
| Payload Auth            | Phase 1+                       | Niedrig — gut dokumentiert             |
| `useDb()` Middleware    | Phase 2+ (Tenant-Isolation)    | Mittel — Custom Code                   |
| TailAdmin Integration   | Phase 2+ (UI)                  | Niedrig — Template einfügen            |
| FullCalendar            | Appointment Calendar (Phase 3) | Niedrig — bewährte Library             |
| react-odontogram        | Dental Chart (Phase 3)         | Niedrig — v0.5.5 bereits validiert     |
| Paymob SDK              | Online-Payments (Phase 4)      | Mittel — ägyptische API, Dokumentation |
| Realm Device Sync       | Mobile Offline (Phase 7)       | Hoch — Komplexe Sync-Konfiguration     |
| Apple Developer Account | App Store (Phase 7)            | Niedrig — $99/Jahr, 1-2 Tage Review    |

---

## 11. Risk & Mitigation

|  #  | Risiko                        | Wahrscheinlichkeit | Impact  | Mitigation                                                                                |
| :-: | :---------------------------- | :----------------: | :-----: | :---------------------------------------------------------------------------------------- |
|  1  | **Realm Sync Komplexität**    |        Hoch        |  Hoch   | Phase 7 als letztes, Web-App funktioniert standalone; Realm-Fallback: REST-API statt Sync |
|  2  | **Paymob Integration**        |       Mittel       | Mittel  | Früh in Phase 2 starten, Sandbox-Testen; Fallback: nur Stripe + Cash                      |
|  3  | **Solo-Developer Burnout**    |       Mittel       |  Hoch   | 26 Wochen = realistisch; Phase 0 + 1 klein halten; Feature-Freeze nach Phase 5            |
|  4  | **MongoDB Performance**       |      Niedrig       |  Hoch   | Indexes vorab planen (§34), mongodump-Tests ab Phase 2; M10 → M20 Upgrade einfach         |
|  5  | **React 19 Breaking Changes** |      Niedrig       | Mittel  | Start mit stable Release; Vite 6 getestet; Shadcn/ui compatible                           |
|  6  | **Scope Creep**               |        Hoch        | Mittel  | Master Plan ist fixiert; Neue Features → v2.1 Backlog; Go/No-Go Gates erzwingen           |
|  7  | **Apple App Store Rejection** |       Mittel       | Mittel  | Guidelines früh studieren; TestFlight ab Woche 25; Human Interface Guidelines beachten    |
|  8  | **i18n Qualität (Arabisch)**  |       Mittel       | Niedrig | Seed-Translations nur EN/AR; AR-Review von Native Speaker vor Launch                      |

---

## 12. Meilensteine & Go/No-Go Gates

Vor jeder Phase-Eskalation muss ein Gate bestanden werden.

| Meilenstein                       | Woche | Gate-Kriterien                                                                   | Blockiert |
| :-------------------------------- | :---: | :------------------------------------------------------------------------------- | :-------- |
| **M0 — Foundation Done**          |   2   | `pnpm dev` → 3 Apps laufen, CI grün, Smoke CRUD, 🔒 Helmet+CORS+CSP aktiv        | Phase 1   |
| **M1 — Auth Done**                |   4   | Login + Tenant + RBAC + i18n, 🔒 JWT Rotation + Rate Limiting + Zod aktiv        | Phase 2   |
| **M2 — Dev Portal + Admin Shell** |   7   | Dev Portal 16 Module, Dashboard, Payments, 🔒 API Key Hashing + Webhook HMAC     | Phase 3   |
| **M3 — Clinical MVP**             |  13   | Kompletter Patienten-Workflow, 🔒 PII Encryption + File Security + Audit Logging | Phase 4   |
| **M4 — Billing Complete**         |  16   | Invoice → Payment → Insurance, 🔒 Payment Webhook HMAC verifiziert               | Phase 5   |
| **M5 — Operational Done**         |  19   | Inventory + 36 Reports, 🔒 RBAC-geschützte Reports                               | Phase 6   |
| **M6 — Production Ready**         |  21   | Live-Server + Backups + Monitoring, 🔒 **80+ Security Checkpoints bestanden**    | Phase 7   |
| **M7 — Mobile Launch**            |  26   | iOS + Android im Store, 🔒 SecureStore + Cert Pinning + Realm Encryption         | —         |

### Go/No-Go Entscheidung

```
Vor Gate Mx:
  1. ✅ Alle Deliverables der Phase abgehakt
  2. ✅ Keine kritischen Bugs offen
  3. ✅ CI Pipeline grün (Lint + Tests + Build + Security Audit)
  4. ✅ 1 End-to-End manueller Test der Phase erfolgreich
  5. ✅ 🔒 Security-Deliverables der Phase bestanden
  → GO → Nächste Phase starten

  Falls NICHT:
  → NO-GO → Max 3 Tage Buffer für Fixes
  → Danach Re-Evaluate: Feature kürzen oder Timeline anpassen
```

---

## 13. Definition of Done (pro Feature)

Jedes Feature/Modul gilt als "Done" wenn:

|  #  | Kriterium                                                                 |  Pflicht  |
| :-: | :------------------------------------------------------------------------ | :-------: |
|  1  | API Endpoint funktional (CRUD + Validierung + RBAC)                       |    ✅     |
|  2  | Zod Schema in `packages/shared` (für FE + BE)                             |    ✅     |
|  3  | UI-Seite im Admin Portal (Liste + Detail + Formular)                      |    ✅     |
|  4  | RTL/LTR beide funktional (Labels + Layout)                                |    ✅     |
|  5  | Dark Mode funktional                                                      |    ✅     |
|  6  | Responsive (Desktop + Tablet Breakpoint)                                  |    ✅     |
|  7  | RBAC: Richtige Rollen sehen richtige Dinge                                |    ✅     |
|  8  | Seed-Daten (falls nötig) im Tenant-Setup Script                           |    ✅     |
|  9  | Keine TypeScript `any` oder `@ts-ignore`                                  |    ✅     |
| 10  | ESLint + Prettier: 0 Errors                                               |    ✅     |
| 11  | 🔒 Security: Neue Endpoints haben Rate Limiting + Zod `.strict()` + RBAC  |    ✅     |
| 12  | 🔒 Security: PII-Felder verschlüsselt (falls relevant für dieses Feature) |    ✅     |
| 13  | 🔒 Security: Audit Log für alle Mutations aktiv                           |    ✅     |
| 14  | Unit Test für Business Logic (min. 1 kritischer Pfad)                     | Empfohlen |
| 15  | API Docs auto-generiert via Swagger                                       |    ✅     |

---

## Anhang: Wochen-Übersicht Kompakt

| Wo  | Phase | Hauptfokus                                                                                         |
| :-: | :---: | :------------------------------------------------------------------------------------------------- |
|  1  |   0   | **Neues Repo `dento-v2`**, Monorepo, Docker, Payload, TailAdmin, Tailwind, 🔒 Helmet+CORS+CSP+.env |
|  2  |   0   | Shared Packages, CI/CD, 🔒 CI Security Gate (TruffleHog + pnpm audit)                              |
|  3  |   1   | Auth (🔒 JWT Dual-Token + Argon2id + RBAC + Brute-Force), Tenant CRUD, useDb()                     |
|  4  |   1   | i18n, Doctor-User Sync, Onboarding Wizard, 🔒 Rate Limiting + Zod + NoSQL Guard                    |
|  5  |   2   | Dev Portal: Tenants, Modules, DB Explorer, Ticketing                                               |
|  6  |   2   | Versioning, 🔒 Webhook HMAC, Pricing, Paymob, Stripe, 🔒 Backup Encryption                         |
|  7  |   2   | Admin Shell, Dashboard, Daily Ops, Notifications, Recurring                                        |
|  8  |   3   | Patients (🔒 PII Encryption), Appointments, Calendar, Waitlist, Schedule Validation                |
|  9  |   3   | Doctor Schedules, Slot-Engine, Online-Booking, Ramadan, Leave (T1)                                 |
| 10  |   3   | **Dental Chart**, Treatment Plans, Procedure Notes                                                 |
| 11  |   3   | X-Rays (🔒 File Upload Security), CBCT, Cross-Linking, ImagingLinker, Prescriptions                |
| 12  |   3   | Lab Orders, Services, Document Templates, Consent, 🔒 **Staff Chat** (Privacy)                     |
| 13  |   3   | 🔒 Audit Logging, Notifications, Scheduled Jobs, Webhooks (HMAC), Custom Fields, 🔒 **2FA/MFA**    |
| 14  |   4   | Invoices, Payments, 🔒 Paymob/Stripe Online-Payment (Webhook HMAC)                                 |
| 15  |   4   | Insurance, Claims, Installments                                                                    |
| 16  |   4   | Commissions, Financial Reports (7), PDF Export, Bulk Notifs                                        |
| 17  |   5   | Inventory Core: Items, Stock, Movements, Suppliers, POs, Batch/Expiry                              |
| 18  |   5   | Transfers, Inventur, Valuation, Auto-Reorder, Leave/Attendance                                     |
| 19  |   5   | 36 Reports (10 Inventory + 26 Clinical/Financial), Saved Reports                                   |
| 20  |   6   | Sentry, Health Checks, 🔒 **Backup AES-256-GCM**, Logging, 🔒 **Security Audit (80+ Checks)**      |
| 21  |   6   | Tailscale, Production Deploy, DNS/SSL, 🔒 **HIPAA/GDPR Compliance-Check**, E2E Smoke Test          |
| 22  |   7   | Expo Setup, Realm, 🔒 **Mobile Auth (SecureStore + Biometric + Cert Pinning)**, Shared Code        |
| 23  |   7   | Mobile: Dashboard, Patients, Appointments, Dental Chart                                            |
| 24  |   7   | Mobile: Treatments, Prescriptions, X-Ray Viewer, Lab Orders                                        |
| 25  |   7   | 🔒 **Realm Encryption (AES-256)**, Offline Sync, Push Notifications, Mobile Chat, Barcode Scanner  |
| 26  |   7   | RTL, Dark Mode, App Icons, 🔒 **Jailbreak Detection**, TestFlight/Play Beta, **App Store**         |

---

> **Letzte Aktualisierung:** 2026-02-25
> **Basiert auf:** DENTO_V2_MASTER_PLAN.md (37 Sections, 8.024 Zeilen)
> **Security:** SECURITY_AND_ENCRYPTION.md (15 Schichten, 80+ Checkpoints) — integriert in jede Phase
> **Repo-Strategie:** Neues Repository `dento-v2` — Clean Start, kein v1-Code
> **Nächster Schritt:** Phase 0, Tag 1 — Neues Repo erstellen → `pnpm init`

---

## 14. 🔒 Security Integration Map

> Referenz: [SECURITY_AND_ENCRYPTION.md](SECURITY_AND_ENCRYPTION.md) — 15 Schichten, 80+ Checkpoints

```
Phase 0 (Wo 1-2)  ── BLOCK 1: Security Foundation
│  🔒 Helmet + CORS + CSP + HSTS
│  🔒 .env Struktur (kein Secret im Code)
│  🔒 CI Security Gate (TruffleHog + pnpm audit)
│
Phase 1 (Wo 3-4)  ── BLOCK 1: Auth Security
│  🔒 JWT Dual-Token (Access 15min + Refresh 7d HttpOnly)
│  🔒 Token Rotation + Reuse Detection
│  🔒 Argon2id Passwort-Hashing
│  🔒 Progressive Brute-Force Cooldown
│  🔒 3-stufige RBAC Middleware (authGuard → tenantDb → roleGuard)
│  🔒 Rate Limiting 3-Tier (CDN + API + Auth)
│  🔒 Zod .strict() + NoSQL Injection Guard
│  🔒 Tenant Isolation (DB-per-Tenant)
│
Phase 2 (Wo 5-7)  ── BLOCK 2: API Security
│  🔒 API Key Hashing (SHA-256)
│  🔒 Webhook HMAC-SHA256 Signierung
│  🔒 Per-API-Key Rate Limiting
│
Phase 3 (Wo 8-13)  ── BLOCK 2: Data Security
│  🔒 PII Field Encryption (AES-256-GCM)
│  🔒 File Upload Security (6-Step Pipeline)
│  🔒 Audit Logging (jede Mutation)
│  🔒 Chat Privacy + Retention
│  🔒 Tenant-Level Webhook Signing
│  🔒 2FA/MFA (TOTP) — otplib + qrcode
│
Phase 4 (Wo 14-16)  ── BLOCK 2: Payment Security
│  🔒 Payment Webhook HMAC Verification
│  🔒 PCI DSS via Provider (keine Kartendaten in DB)
│
Phase 5 (Wo 17-19)  ── BLOCK 2: Access Control
│  🔒 RBAC-geschützte Financial Reports
│
Phase 6 (Wo 20-21)  ── BLOCK 3: Pre-Launch Hardening
│  🔒 Backup Encryption (AES-256-GCM + SHA-256 Checksum)
│  🔒 Security Audit (80+ Checkpoints)
│  🔒 HIPAA + GDPR Compliance-Check
│  🔒 Source Maps deaktiviert
│  🔒 Keine Secrets im Frontend-Bundle
│  🔒 Penetration Test Vorbereitung
│
Phase 7 (Wo 22-26)  ── BLOCK 3: Mobile Security
   🔒 SecureStore (Hardware-backed Tokens)
   🔒 Biometric Auth
   🔒 Certificate Pinning
   🔒 Realm AES-256 Encryption
   🔒 Jailbreak Detection
   🔒 Network Security Config (kein Cleartext)
   🔒 Offline-Daten auto-wipe (30 Tage)
```

### Security pro Phase — Zusammenfassung

| Phase     | Security-Items | Schichten abgedeckt                                             |
| :-------- | :------------: | :-------------------------------------------------------------- |
| **0**     |       3        | Netzwerk, Transport, Supply Chain                               |
| **1**     |       8        | Auth, RBAC, Rate Limiting, Validation, Tenant Isolation         |
| **2**     |       3        | API Security (Keys, Webhooks, Rate Limits)                      |
| **3**     |       6        | Encryption, File Upload, Audit, Chat Privacy, Webhooks, 2FA/MFA |
| **4**     |       2        | Payment Security, PCI DSS                                       |
| **5**     |       1        | Access Control (Reports)                                        |
| **6**     |       6        | Backup Encryption, Full Audit, Compliance, Frontend Hardening   |
| **7**     |       7        | Mobile Security (alle 7 Punkte)                                 |
| **Total** |     **36**     | **15 von 15 Schichten ✔**                                       |

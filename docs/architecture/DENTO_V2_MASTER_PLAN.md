# Dento v2 — Master Plan (Alle Entscheidungen)

> **Datum:** 2026-02-24
> **Status:** Geplant — Noch nicht gestartet
> **Zweck:** Vollständige Zusammenfassung aller Entscheidungen für den Rebuild

---

## Inhaltsverzeichnis

1. [Tech Stack](#1-tech-stack)
2. [Projektstruktur (Monorepo)](#2-projektstruktur-monorepo)
3. [Backend — Payload CMS + Custom API](#3-backend--payload-cms--custom-api)
4. [Frontend — TailAdmin + Tailwind](#4-frontend--tailadmin--tailwind)
5. [Datenbank — MongoDB Atlas](#5-datenbank--mongodb-atlas)
6. [Tenant-Isolation (Database-per-Tenant)](#6-tenant-isolation-database-per-tenant)
7. [Dev Portal — Sidebar & Module](#7-dev-portal--sidebar--module)
8. [Dev Portal — Tenant Detail (10 Tabs)](#8-dev-portal--tenant-detail-10-tabs)
9. [Dev Portal — Ticketing System](#9-dev-portal--ticketing-system)
10. [Admin Portal — Alle 28 Module](#10-admin-portal--alle-28-module)
11. [Admin Portal — Modul-Katalog (v1 → v2)](#11-admin-portal--modul-katalog-v1--v2)
12. [User Onboarding & Profil-System](#12-user-onboarding--profil-system)
13. [Doctor Data Model & Sharing](#13-doctor-data-model--sharing)
14. [Logo & Branding Propagation](#14-logo--branding-propagation)
15. [Document Templates (Invoice, Prescription, Treatment Plan)](#15-document-templates-invoice-prescription-treatment-plan)
16. [Inventory Management System (Deep Dive)](#16-inventory-management-system-deep-dive)
17. [Clinical Cross-Linking: Imaging ↔ Treatments ↔ Procedures](#17-clinical-cross-linking-imaging--treatments--procedures)
18. [Walk-in Queue & Daily Operations Hub](#18-walk-in-queue--daily-operations-hub)
19. [Recurring Appointments (Termin-Serien)](#19-recurring-appointments-termin-serien)
20. [Notifications & Messaging System](#20-notifications--messaging-system)
21. [Reports & Analytics System](#21-reports--analytics-system)
22. [Staff Scheduling & Availability System](#22-staff-scheduling--availability-system)
23. [Webhook System (Zwei Ebenen)](#23-webhook-system-zwei-ebenen)
24. [Module Versioning System](#24-module-versioning-system)
25. [Tenant Locale & Currency System](#25-tenant-locale--currency-system)
26. [Sprach-/i18n-System](#26-sprach-i18n-system)
27. [Auth & RBAC](#27-auth--rbac)
28. [Pricing System (Module-Only, dynamisch)](#28-pricing-system-module-only-dynamisch-konfigurierbar)
29. [Payment Gateways (Paymob + Stripe)](#29-payment-gateways-paymob--stripe)
30. [Entfernte Features (nicht rebuilden)](#30-entfernte-features-nicht-rebuilden)
31. [Neue Features (v2 only)](#31-neue-features-v2-only)
32. [Mobile App (React Native)](#32-mobile-app-react-native)
33. [Infrastruktur & DevOps](#33-infrastruktur--devops)
34. [MongoDB Schema Design](#34-mongodb-schema-design)
35. [Timeline & Phasen](#35-timeline--phasen)
36. [Kosten](#36-kosten)
37. [Internal Staff Chat System](#37-internal-staff-chat-system)

---

## 1. Tech Stack

### Entschieden: Node.js + MongoDB + React (TypeScript)

| Schicht                      | Technologie               | Version   | Warum                                                                                                                                                        |
| ---------------------------- | ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sprache**                  | TypeScript                | 5.x       | Einheitlich überall (FE + BE + Mobile)                                                                                                                       |
| **Backend Framework**        | Payload CMS               | 3.x       | Platform-Layer: Auth, RBAC, REST/GraphQL auto-generiert                                                                                                      |
| **Backend Custom API**       | Fastify                   | 5.x       | Tenant-Layer: useDb() Middleware, Business Logic                                                                                                             |
| **Datenbank**                | MongoDB Atlas             | 7.x       | Database-per-Tenant, Realm Device Sync für Mobile                                                                                                            |
| **Cache/Queue**              | Redis                     | 7.x       | BullMQ Jobs (Webhooks, Notifications, Backups)                                                                                                               |
| **Frontend Framework**       | React                     | 19.x      | Bestehendes Wissen, Komponent-Portierung aus v1                                                                                                              |
| **Build Tool**               | Vite                      | 6.x       | Schnellstes HMR, bewährt in v1                                                                                                                               |
| **CSS Framework**            | Tailwind CSS              | 4.x       | RTL via Logical Properties, NativeWind für Mobile                                                                                                            |
| **UI Template**              | TailAdmin                 | Free      | RTL-Support, Tailwind-nativ, responsive                                                                                                                      |
| **Component Library**        | Shadcn/ui                 | Latest    | Headless, Tailwind-basiert, copy-paste components                                                                                                            |
| **State Management**         | Zustand                   | 5.x       | Leichtgewichtig, funktioniert in Web + Mobile                                                                                                                |
| **Server State**             | TanStack Query            | 5.x       | Caching, Deduplication, Optimistic Updates                                                                                                                   |
| **Tabellen**                 | TanStack Table            | 8.x       | Headless, sortierbar, filterbar, paginierbar                                                                                                                 |
| **Formulare**                | React Hook Form + Zod     | 7.x + 3.x | Validation shared zwischen FE + BE                                                                                                                           |
| **Monorepo**                 | Turborepo                 | Latest    | Shared packages, parallele Builds                                                                                                                            |
| **Paket-Manager**            | pnpm                      | 9.x       | Schneller, Workspace-Support                                                                                                                                 |
| **Mobile Framework**         | React Native (Expo)       | 52.x      | Shared Code mit Web, NativeWind                                                                                                                              |
| **Mobile DB**                | Realm (Atlas Device Sync) | Latest    | Auto-Sync mit MongoDB Atlas, Offline-fähig                                                                                                                   |
| **Echtzeit**                 | Socket.io                 | 4.x       | Support Chat, Notifications                                                                                                                                  |
| **Remote Support**           | Tailscale                 | Latest    | Ersetzt LiveKit, sicherer                                                                                                                                    |
| **Error Tracking**           | Sentry                    | 10.x      | Beibehalten aus v1                                                                                                                                           |
| **Payments (International)** | Stripe                    | Latest    | Karten, SEPA — für nicht-ägyptische Tenants                                                                                                                  |
| **Payments (Ägypten)**       | Paymob                    | Latest    | Karten, Fawry, Mobile Wallets, InstaPay, ValU, Meeza                                                                                                         |
| **File Storage**             | S3 / Cloudflare R2        | —         | X-Rays, DICOM, Backups, Exports                                                                                                                              |
| **Dental Chart**             | react-odontogram          | 0.5.5+    | SVG-Odontogram: FDI nativ, teethConditions, Dark Mode, Child Teeth (maxTeeth=5), readOnly, showHalf — beibehalten aus v1, v0.5.5 hat alle Lücken geschlossen |

### Abgelehnt

| Option            | Warum abgelehnt                                                         |
| ----------------- | ----------------------------------------------------------------------- |
| .NET C# + Angular | 0 Erfahrung, doppelte Timeline, kein Code-Sharing mit Mobile            |
| Supabase          | Lock-in, keine Custom Middleware, limitierte Edge Functions             |
| Express.js        | Fastify ist 2x schneller, besseres Plugin-System                        |
| MUI (Material UI) | Kein React Native Support → kein Code-Sharing mit Mobile                |
| Next.js           | Overkill für SPA-Dashboards, SSR nicht nötig                            |
| PostgreSQL        | MongoDB passt besser für Document-orientierte Dental-Daten + Realm Sync |

---

## 2. Projektstruktur (Monorepo)

```
dento-v2/
├── turbo.json                        # Turborepo Config
├── pnpm-workspace.yaml               # Workspace-Definition
├── package.json                      # Root Scripts
├── docker-compose.yml                # MongoDB + Redis + API + Web (Dev)
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + Test + Build
│       └── deploy.yml                # Deploy to Railway/Fly.io
│
├── packages/
│   ├── shared/                       # GETEILT: Web + Mobile + API
│   │   ├── src/
│   │   │   ├── schemas/              # Zod Schemas (Patient, Appointment, etc.)
│   │   │   ├── types/                # TypeScript Interfaces
│   │   │   ├── utils/                # Helpers (currency, date, validation)
│   │   │   ├── constants/            # Enums, Status-Werte, Event-Typen
│   │   │   └── api/                  # API Client (fetch wrapper)
│   │   └── package.json
│   │
│   └── ui/                           # GETEILT: Web + Mobile UI Components
│       ├── src/
│       │   ├── primitives/           # Button, Input, Badge, Card
│       │   └── composites/           # DataTable, SearchInput, StatusBadge
│       └── package.json
│
├── apps/
│   ├── api/                          # BACKEND
│   │   ├── src/
│   │   │   ├── payload.config.ts     # Payload CMS Config (Platform Collections)
│   │   │   ├── collections/          # Payload Collections (tenants, modules, etc.)
│   │   │   ├── globals/              # Payload Globals (system_settings, currencies)
│   │   │   ├── hooks/                # Payload Hooks (beforeChange, afterChange)
│   │   │   ├── access/               # Access Control Functions
│   │   │   ├── tenant-api/           # Custom Fastify Routes (Tenant-Daten)
│   │   │   │   ├── middleware/       # tenantDb(), authGuard(), roleGuard()
│   │   │   │   ├── routes/           # patients, appointments, invoices, etc.
│   │   │   │   └── services/         # Business Logic
│   │   │   ├── jobs/                 # BullMQ Workers (webhooks, notifications)
│   │   │   ├── plugins/              # Fastify Plugins (stripe, s3, tailscale)
│   │   │   └── config/               # Environment, DB, Redis Config
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── admin/                        # FRONTEND: Admin/Doctor/Staff Portal
│   │   ├── src/
│   │   │   ├── layouts/              # TailAdmin Sidebar Layout
│   │   │   ├── pages/                # 28 Admin Module
│   │   │   ├── components/           # Dental-spezifische UI (Zahnschema, etc.)
│   │   │   ├── hooks/                # useAuth, useTenant, usePatients, etc.
│   │   │   ├── stores/               # Zustand Stores
│   │   │   └── i18n/                 # RTL/LTR, Übersetzungen
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── developer/                    # FRONTEND: Dev Portal
│   │   ├── src/
│   │   │   ├── layouts/              # TailAdmin Sidebar Layout (Platform-themed)
│   │   │   ├── pages/                # 16 Dev Portal Module
│   │   │   ├── components/           # DB Explorer, Module Editor, etc.
│   │   │   └── hooks/                # useDevAuth, usePlatformApi, etc.
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mobile/                       # MOBILE APP (später)
│       ├── src/
│       │   ├── screens/              # React Native Screens
│       │   ├── components/           # NativeWind Components
│       │   ├── realm/                # Realm Schemas + Sync Config
│       │   └── navigation/           # Expo Router
│       ├── app.json                  # Expo Config
│       └── package.json
│
└── docs/                             # Dokumentation (aus v1 migriert)
    ├── planning/
    ├── analysis/
    └── ...
```

---

## 3. Backend — Payload CMS + Custom API

### Zwei-Schichten-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│ SCHICHT 1: PAYLOAD CMS (Platform Layer)                      │
│ DB: dento_platform                                           │
│                                                              │
│ Collections:                                                 │
│ ├── users              (Platform-Admin + Tenant-Users)       │
│ ├── tenants             (Klinik-Registrierung, Status)       │
│ ├── modules             (Modul-Katalog, Versioning)          │
│ ├── tenant_modules      (Per-Tenant Lizenzen)                │
│ ├── pricing_config      (Modul-Preise, Limits, Discounts)    │
│ ├── webhooks            (Platform-Level Webhooks)            │
│ ├── webhook_logs        (Delivery-Protokolle)                │
│ ├── webhook_event_types (Event-Katalog)                      │
│ ├── api_keys            (API Key Management)                 │
│ ├── api_key_usage       (Usage Tracking)                     │
│ ├── feature_flags       (Per-Tenant Toggles)                 │
│ ├── deployments         (Deploy Tracking, Rollback)          │
│ ├── domains             (Custom Domains, SSL)                │
│ ├── saas_invoices       (Platform-Rechnungen)                │
│ ├── saas_payments       (Stripe Zahlungen)                   │
│ ├── saas_dunning_log    (Mahnungen)                          │
│ ├── audit_logs          (Alle Mutations geloggt)             │
│ ├── error_logs          (Error Tracking)                     │
│ ├── support_sessions    (Tailscale Support)                  │
│ ├── user_sessions       (Aktive Login-Sessions pro User)     │
│ ├── backups             (Backup-Historie & Status-Tracking)  │
│ ├── workflows           (Automations)                        │
│ ├── media               (Platform-Assets)                    │
│                                                              │
│ Globals (Singletons):                                        │
│ ├── system_settings     (Timezone, Currency, Maintenance)    │
│ ├── branding            (Logo, Colors, White-Label)          │
│ ├── currencies          (Exchange Rates, Active Currencies)  │
│ ├── backup_config       (Schedule, Retention, Encryption)    │
│                                                              │
│ Auto-generiert:                                              │
│ ├── REST API            /api/{collection}                    │
│ ├── GraphQL API         /api/graphql                         │
│ ├── Auth Endpoints      /api/users/login, /refresh, etc.     │
│ └── Admin Panel         /admin (optional, für Dev nutzbar)   │
├─────────────────────────────────────────────────────────────┤
│ SCHICHT 2: CUSTOM FASTIFY API (Tenant Layer)                 │
│ DB: tenant_{slug} (pro Tenant separate DB)                   │
│                                                              │
│ Middleware:                                                   │
│ ├── authGuard()         → JWT validieren via Payload         │
│ ├── tenantDb()          → mongoose.useDb('tenant_{slug}')    │
│ ├── roleGuard()         → RBAC (admin/dentist/staff/etc.)    │
│ └── auditLog()          → Jede Mutation protokollieren       │
│                                                              │
│ Routes (pro Tenant-DB):                                      │
│ ├── /tenant-api/patients            CRUD + Search            │
│ ├── /tenant-api/appointments        CRUD + Calendar          │
│ ├── /tenant-api/dental-charts       CRUD + react-odontogram  │
│ ├── /tenant-api/treatment-plans     CRUD + Status Flow       │
│ ├── /tenant-api/invoices            CRUD + PDF Generation    │
│ ├── /tenant-api/payments            Process + Reconciliation │
│ ├── /tenant-api/prescriptions       CRUD + Print             │
│ ├── /tenant-api/doctors             CRUD + Schedule          │
│ ├── /tenant-api/inventory           Stock + Movements        │
│ ├── /tenant-api/lab-orders          CRUD + Status Tracking   │
│ ├── /tenant-api/xrays              Upload + DICOM            │
│ ├── /tenant-api/cbct               Orders + Scan Upload      │
│ ├── /tenant-api/insurance           Claims + Companies       │
│ ├── /tenant-api/leave              Requests + Balances        │
│ ├── /tenant-api/attendance          Check-in/out              │
│ ├── /tenant-api/reports            Aggregations               │
│ ├── /tenant-api/notifications      Send + Queue               │
│ ├── /tenant-api/webhooks           Tenant's own webhooks      │
│ └── /tenant-api/settings           Tenant-spezifisch          │
│                                                              │
│ Hooks (Business Logic):                                      │
│ ├── afterCreate:patient    → triggerWebhook('patient.created')│
│ ├── afterCreate:appointment→ triggerWebhook + sendReminder   │
│ ├── afterUpdate:invoice    → triggerWebhook if status=paid   │
│ └── afterCreate:*          → auditLog + Realm Sync           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend — TailAdmin + Tailwind

### Template: TailAdmin (Free, MIT)

| Eigenschaft   | Detail                                                                        |
| ------------- | ----------------------------------------------------------------------------- |
| CSS Framework | Tailwind CSS 4                                                                |
| RTL/LTR       | ✅ Via Tailwind Logical Properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) |
| Responsive    | ✅ Mobile-first (`sm:`, `md:`, `lg:`, `xl:`)                                  |
| Dark Mode     | ✅ Eingebaut                                                                  |
| Layout        | Sidebar + Header + Content                                                    |
| Tabellen      | TanStack Table + Shadcn/ui DataTable                                          |
| Formulare     | React Hook Form + Shadcn/ui Inputs                                            |
| Charts        | Recharts oder Chart.js                                                        |
| Icons         | Lucide React (beibehalten aus v1)                                             |

### RTL-Strategie

```typescript
// i18n Hook
function useDirection() {
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);
}

// Tailwind Logical Properties (funktionieren in LTR und RTL automatisch)
<div className="ms-4 me-2 ps-3 pe-3 text-start">
  {/* ms = margin-inline-start (links in LTR, rechts in RTL) */}
  {/* text-start = text-align: start (links in LTR, rechts in RTL) */}
</div>
```

### Portale (gleiche Codebase, verschiedene Rollen)

| Portal            | Wer nutzt es                                       | Routing             | Sidebar-Module                                        |
| ----------------- | -------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| **Admin Portal**  | Klinik-Manager (`tenant_admin`)                    | `/admin/*`          | Alle 28 Module                                        |
| **Doctor Portal** | Zahnarzt (`dentist`)                               | `/admin/*` (gleich) | 12 Module (Patienten, Termine, Charts, Rezepte, etc.) |
| **Staff Portal**  | Rezeption, Assistentin, Buchhalter, Labor, Hygiene | `/admin/*` (gleich) | 4-10 Module (rollenbasiert gefiltert)                 |
| **Dev Portal**    | Du (`platform_admin`)                              | `/developer/*`      | 18 Platform-Module                                    |

Admin/Doctor/Staff sind **eine App** — die Sidebar wird basierend auf der Rolle gefiltert:

```typescript
const sidebarModules = allModules.filter((m) =>
  userRole === 'admin'
    ? true
    : userRole === 'dentist'
      ? m.roles.includes('dentist')
      : m.roles.includes(userRole),
);
```

---

## 5. Datenbank — MongoDB Atlas

### Cluster-Architektur

```
MongoDB Atlas Cluster (M10-M30)
│
├── dento_platform/                    ← Payload CMS verwaltet
│   ├── users                          ← Auth Accounts
│   ├── tenants                        ← Alle Kliniken
│   ├── modules                        ← Modul-Katalog
│   ├── tenant_modules                 ← Lizenzen pro Tenant
│   ├── pricing_config                 ← Modul-Preise (dynamisch, konfigurierbar)
│   ├── webhooks                       ← Platform-Webhooks
│   ├── webhook_logs
│   ├── api_keys
│   ├── feature_flags
│   ├── deployments
│   ├── domains
│   ├── saas_invoices
│   ├── saas_payments
│   ├── audit_logs
│   ├── error_logs
│   ├── login_attempts                 ← Brute-Force-Schutz (Redis-backed)
│   ├── support_sessions
│   ├── user_sessions                 ← Aktive Login-Sessions (Devices, Remote-Logout)
│   ├── backups                        ← Backup-Historie (Status, Größe, Download)
│   ├── currencies
│   ├── languages
│   ├── translation_packs
│   └── ... (~25 Collections)
│
├── tenant_clinic_cairo/               ← Isolierte Tenant-DB
│   ├── patients
│   ├── appointments
│   ├── dental_charts
│   ├── treatment_plans
│   ├── procedure_notes
│   ├── invoices
│   ├── payments
│   ├── prescriptions
│   ├── doctors
│   ├── doctor_schedules
│   ├── schedule_exceptions
│   ├── staff_schedules
│   ├── shift_templates
│   ├── branches
│   ├── services
│   ├── inventory_items
│   ├── inventory_stock
│   ├── inventory_movements
│   ├── inventory_categories
│   ├── suppliers
│   ├── purchase_orders
│   ├── stock_transfers
│   ├── stock_counts
│   ├── lab_orders
│   ├── lab_order_types                ← Lab-Auftragstypen (14 Seed + Custom)
│   ├── xrays
│   ├── cbct_orders
│   ├── insurance_claims
│   ├── leave_requests
│   ├── leave_types
│   ├── leave_balances
│   ├── attendance                     ← time_attendance
│   ├── notifications
│   ├── webhooks                       ← Tenant's eigene Webhooks
│   ├── webhook_logs
│   ├── settings
│   ├── medications                    ← Medikamenten-Katalog (Rezept-Autocomplete)
│   ├── alert_rules                    ← Konfigurierbare Alert-Regeln
│   ├── chat_channels                  ← Staff Chat Kanäle (DM + Gruppen)
│   ├── chat_messages                  ← Chat-Nachrichten (mit Attachments)
│   └── ... (~25-30 Collections)
│
├── tenant_clinic_riyadh/              ← Andere Klinik, komplett isoliert
│   └── ... (gleiche Collections)
│
└── tenant_clinic_dubai/
    └── ...
```

### Gesamtzahl Collections: ~45-50 (runter von ~140 Postgres-Tabellen)

Reduktion durch:

- **Embedding**: patient + allergies + medical_history = 1 Document
- **Embedding**: invoice + invoice_items = 1 Document
- **Embedding**: prescription + prescription_items = 1 Document
- **Entfernung**: 30+ Website/Tourism/CMS-Tabellen gelöscht

---

## 6. Tenant-Isolation (Database-per-Tenant)

### Methode: `mongoose.connection.useDb()`

```typescript
// Middleware — wählt Tenant-DB basierend auf JWT
async function tenantDb(req, res, next) {
  const tenantSlug = req.user.tenantSlug;
  req.db = mongoose.connection.useDb(`tenant_${tenantSlug}`, { useCache: true });
  req.models = {
    Patient: req.db.model('Patient', patientSchema),
    Appointment: req.db.model('Appointment', appointmentSchema),
    // ...
  };
  next();
}
```

### Was das ermöglicht

| Operation           | Wie es funktioniert                                              |
| ------------------- | ---------------------------------------------------------------- |
| **Tenant-Backup**   | `mongodump --db tenant_clinic_cairo` — nur seine Daten           |
| **Tenant-Restore**  | `mongorestore --db tenant_clinic_cairo` — kein anderer betroffen |
| **Tenant-Löschung** | `dropDatabase()` — garantiert keine Datenreste                   |
| **DSGVO-Export**    | `mongodump --db tenant_x --archive=export.gz`                    |
| **Corruption**      | Nur betroffene DB, alle anderen laufen weiter                    |
| **Monitoring**      | Per-DB Storage/Query Metriken in Atlas                           |

### Atlas Tier Empfehlung

| Tenants | Collections | Atlas Tier | Kosten/Monat |
| ------- | ----------- | ---------- | ------------ |
| 50      | ~1.250      | M10        | $57          |
| 200     | ~5.000      | M20-M30    | $140-280     |
| 500     | ~12.500     | M30-M40    | $280-560     |

---

## 7. Dev Portal — Sidebar & Module

### Sidebar-Struktur (17 Einträge, 5 Gruppen)

Reduziert von 20 (v1) auf 17 Einträge. Workflows, Branding, Database und Revenue wurden
unter Tenant-Tabs verschoben (siehe Abschnitt 8).

```
📊 Dashboard
─── SaaS Management ───
🏢 Tenants              → TenantList, TenantCreate, TenantDetail (10 Tabs)
📈 Monitoring           → ErrorDashboard, ErrorList, HealthStatus
🚀 Deployments          → DeploymentList
💰 Billing              → Revenue + Invoices + Payments (zusammengelegt)
🌐 Domains              → DomainList
🎧 Support              → Sessions + Tickets (Sub-Navigation)
─── Platform ───
📦 Modules              → ModuleList, ModuleDetail (Canary, Versioning)
🏷️ Pricing              → pricing_config UI (NEU)
🚩 Feature Flags        → FeatureFlagList
📝 Custom Fields        → CustomFieldsList (mit Developer-Anleitung)
─── Configuration ───
⚙️ System Settings      → SystemSettings
💾 Storage              → StorageSettings
📁 Backups              → BackupSettings
─── API & Integrations ───
🔑 API Keys             → ApiKeyList, ApiCatalog
🔗 Webhooks             → WebhookList, WebhookCatalog
─── Logs ───
🛡️ Audit Logs           → AuditLogs
💻 System Logs          → SystemLogs
```

### Was sich geändert hat (v1 → v2 Sidebar)

| Aktion             | Eintrag                               | Grund                                                       |
| ------------------ | ------------------------------------- | ----------------------------------------------------------- |
| ❌ **Entfernt**    | Revenue (separate Seite)              | Zusammengelegt mit Billing                                  |
| ❌ **Entfernt**    | Workflows (separate Seite)            | Verschoben → Tenant Tab                                     |
| ❌ **Entfernt**    | White-Label/Branding (separate Seite) | Verschoben → Tenant Tab                                     |
| ❌ **Entfernt**    | Database (separate Seite)             | Verschoben → Tenant Tab                                     |
| ✏️ **Umbenannt**   | Subscriptions → **Billing**           | Module-Only Pricing, keine Subscriptions                    |
| ✏️ **Umbenannt**   | Support Sessions → **Support**        | Enthält jetzt Sessions + Tickets                            |
| ➕ **Hinzugefügt** | **Pricing**                           | Neue `pricing_config` UI (Modul-Preise, Coupons, Discounts) |

### Alle Sidebar-Module (Detail)

| #   | Modul               |            Payload Collection?            |       Seiten       | Status v1 → v2                  |
| --- | ------------------- | :---------------------------------------: | :----------------: | ------------------------------- |
| 1   | **Dashboard**       |                     —                     |         1          | Portiert                        |
| 2   | **Tenants**         |               ✅ `tenants`                |    4 + 10 Tabs     | Portiert + massiv erweitert     |
| 3   | **Monitoring**      |              ✅ `error_logs`              |         3          | Portiert                        |
| 4   | **Deployments**     |             ✅ `deployments`              |         1          | Portiert                        |
| 5   | **Billing**         |   ✅ `saas_invoices` + `saas_payments`    | 1 (zusammengelegt) | Portiert + Revenue integriert   |
| 6   | **Domains**         |               ✅ `domains`                |         1          | Portiert                        |
| 7   | **Support**         | ✅ `support_sessions` + `support_tickets` |       2 + 2        | Portiert + Ticketing NEU        |
| 8   | **Modules**         |      ✅ `modules` + `tenant_modules`      |         2          | Portiert + Canary Rollout       |
| 9   | **Pricing**         |            ✅ `pricing_config`            |         1          | **NEU**                         |
| 10  | **Feature Flags**   |            ✅ `feature_flags`             |         1          | Portiert                        |
| 11  | **Custom Fields**   |            ✅ Custom Endpoint             |         1          | NEU (war Mock) + Developer-Note |
| 12  | **System Settings** |            ✅ Payload Globals             |         1          | Portiert                        |
| 13  | **Storage**         |            ✅ Payload Globals             |         1          | Portiert                        |
| 14  | **Backups**         |            ✅ `backup_config`             |         1          | Portiert                        |
| 15  | **API Keys**        |               ✅ `api_keys`               |         2          | Portiert                        |
| 16  | **Webhooks**        |      ✅ `webhooks` + `webhook_logs`       |         2          | Portiert                        |
| 17  | **Audit Logs**      |              ✅ `audit_logs`              |         1          | NEU (war Placeholder)           |
| 18  | **System Logs**     |              ✅ `error_logs`              |         1          | Portiert                        |

### API-Katalog — Auto-generiert via OpenAPI (Design-Entscheidung)

v1 hatte `api_definitions` + `api_categories` Tabellen (~25 Definitionen, 7 Kategorien)
und eine 728-Zeilen ApiCatalog.jsx Seite. Das Problem: **manuell gepflegte API-Definitionen**
die bei jeder API-Änderung manuell aktualisiert werden mussten.

**v2 nutzt auto-generierte API-Dokumentation:**

```typescript
// @fastify/swagger generiert OpenAPI 3.1 Spec aus Route-Definitionen
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

app.register(swagger, {
  openapi: {
    info: { title: 'Dento API', version: '2.0.0' },
    tags: [
      { name: 'patients', description: 'Patient management' },
      { name: 'appointments', description: 'Appointment scheduling' },
      // ... auto from route tags
    ],
  },
});

// Jede Route hat Schema-Definition → wird automatisch dokumentiert
app.post(
  '/api/patients',
  {
    schema: {
      tags: ['patients'],
      body: PatientCreateSchema, // Zod/TypeBox Schema
      response: { 201: PatientSchema },
    },
  },
  createPatient,
);
```

**Vorteile:**

- API-Docs sind **immer aktuell** (generiert aus dem Code)
- Keine manuelle Pflege nötig
- Kein `api_definitions`/`api_categories` Collection in der DB
- Dev Portal `ApiCatalog`-Seite rendert direkt aus der OpenAPI Spec
- Swagger UI optional unter `/developer/api-docs` verfügbar

### Custom Fields — Developer-Anleitung (Collapsible Note)

Oben auf der Custom Fields Seite wird ein aufklappbarer Info-Block angezeigt:

```
┌─────────────────────────────────────────────────────┐
│ 💡 How to use Custom Fields (aufklappbar)           │
│                                                      │
│ Step 1: Wähle die Entity (Patient, Termin, etc.)    │
│ Step 2: Klicke "+ Add Field"                         │
│ Step 3: Name, Typ (Text/Number/Date/etc.) festlegen │
│ Step 4: Required? Default Value? Validation?         │
│ Step 5: Speichern → Feld erscheint sofort bei allen  │
│         Tenants in deren Admin-Formularen             │
│ Step 6: Reihenfolge per Drag & Drop ändern           │
│                                                      │
│ ⚠️ Achtung: Feld löschen entfernt ALLE Daten        │
│ dieses Feldes bei allen Tenants permanent!            │
└─────────────────────────────────────────────────────┘
```

---

## 8. Dev Portal — Tenant Detail (10 Tabs)

Die TenantDetail-Seite wurde massiv erweitert. v1 hatte 6 Tabs (2.447 Zeilen).
v2 hat 10 Tabs — Workflows, Branding und DB Explorer sind jetzt hier statt in der Sidebar.

### Alle 10 Tabs

| #   | Tab           | v1? | v2 Status | Inhalt                                                       |
| --- | ------------- | :-: | --------- | ------------------------------------------------------------ |
| 1   | **Overview**  | ✅  | Bleibt    | Stats, Errors, API Calls, Storage, Version, Last Login       |
| 2   | **Modules**   | ✅  | Bleibt    | Aktive Module, Enable/Disable, Trial-Ende, Preis-Override    |
| 3   | **Users**     | ✅  | Bleibt    | User-Liste, Rollen, Last Login, Invite, User-Limit (10 free) |
| 4   | **Billing**   | ✅  | Erweitert | Rechnungen, Zahlungen, Modul-Kosten, Coupons, Discounts      |
| 5   | **Channels**  | ✅  | Prüfen    | Domain, Email-Config, WhatsApp-Config, Integrations          |
| 6   | **Settings**  | ✅  | Erweitert | Timezone, Currency, Locale, Contact Info, Technical Details  |
| 7   | **Branding**  | ❌  | **NEU**   | Logo, App-Name, Farben, Favicon, Custom CSS                  |
| 8   | **Workflows** | ❌  | **NEU**   | Aktive Workflows, Templates, Run-Historie, Fehler            |
| 9   | **Support**   | ❌  | **NEU**   | Support-Sessions History, offene Tickets für diesen Tenant   |
| 10  | **Database**  | ❌  | **NEU**   | MongoDB Collections, Document Count, Size, Quick Query       |

### Warum unter Tenant und nicht in der Sidebar?

| Feature       | Grund                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| **Workflows** | Jede Klinik hat eigene Automationen. Nicht global, sondern per Tenant. |
| **Branding**  | Jede Klinik hat eigenes Logo/Farben. Tenant-spezifisch, nicht global.  |
| **Database**  | DB Explorer zeigt `tenant_{slug}` DB. Braucht Tenant-Kontext.          |
| **Support**   | Tickets/Sessions sind immer für einen bestimmten Tenant.               |

### Workflows — Kein kostenpflichtiges Modul

Workflows sind eine **kostenlose Plattform-Fähigkeit**, die mit dem Tenant kommt:

- Workflows automatisieren Features, die der Tenant bereits über Module bezahlt
- Es wäre unfair, $39/Mo für Appointments + extra $X/Mo für Termin-Erinnerungen zu verlangen
- Du definierst **Workflow-Templates** auf Platform-Ebene (z.B. "Appointment Reminder")
- Jeder Tenant kann Templates im Admin Portal **aktivieren/anpassen**
- Ausführung über **BullMQ** (Job Queue) — kostet nur Redis-Server

### Branding — Kein kostenpflichtiges Modul

Branding war in v1 ein Paid-Modul (`white-label`). In v2:

- **Kostenlos**, Teil der Tenant-Settings
- Jeder Tenant darf Logo, Farben und App-Name anpassen
- Macht die Plattform attraktiver — Tenants fühlen sich "zuhause"
- Konfigurierbar im Dev Portal unter Tenant → Branding Tab

---

## 9. Dev Portal — Ticketing System

v1 hatte **kein Ticketing-System**. Nur ein optionales `ticket_reference` Text-Feld in `support_sessions`.

### Collection: `support_tickets` (in `dento_platform` DB)

```typescript
{
  ticketNumber: "DENTO-0042",       // Auto-generiert
  tenantId: "clinic_cairo",
  createdBy: { userId, name, email, role },
  assignedTo: { userId, name },     // Developer/Agent

  // Kategorisierung
  category: "bug | feature | billing | access | other",
  priority: "low | medium | high | urgent",
  status: "open | in_progress | waiting_customer | waiting_internal | resolved | closed",

  // Inhalt
  subject: "Dental Chart speichert nicht",
  description: "Seit heute Morgen...",
  attachments: [{ filename, url, size }],

  // Verlauf
  messages: [
    { sender, message, attachments, createdAt, isInternal }
  ],

  // Verknüpfungen
  linkedSessions: ["session_id_1"],  // Support Sessions
  linkedModule: "dental-charting",   // Betroffenes Modul

  // SLA
  sla: { responseDeadline, resolutionDeadline },
  firstResponseAt: null,
  resolvedAt: null,

  // Tags
  tags: ["dental-chart", "save-error"],
  createdAt, updatedAt
}
```

### Ticket-Flow

```
Tenant (Admin App) erstellt Ticket
  → Dev Portal zeigt es in der Ticket-Liste
  → Developer assigned sich / wird assigned
  → Kommunikation über Ticket-Messages
  → Bei Bedarf: Support Session starten (verlinkt)
  → Ticket resolved → closed
```

### Seiten

| Wo         | Seite                    | Beschreibung                                                |
| ---------- | ------------------------ | ----------------------------------------------------------- |
| Dev Portal | **TicketList**           | Alle Tickets, Filter (Status/Priority/Tenant), Suche, Stats |
| Dev Portal | **TicketDetail**         | Messages, Status-Änderung, Assign, Session verknüpfen       |
| Dev Portal | **Tenant → Support Tab** | Tickets für diesen einen Tenant                             |
| Admin App  | **SupportCenter**        | Tenant erstellt Ticket, sieht eigene Tickets                |
| Admin App  | **TicketView**           | Nachrichten, Attachments, Status-Tracking                   |

### Features

| Feature              | Beschreibung                                       |
| -------------------- | -------------------------------------------------- |
| **Priority Levels**  | Low, Medium, High, Urgent                          |
| **SLA Tracking**     | Response-Time + Resolution-Time Deadlines          |
| **Auto-Assign**      | Round-Robin oder Load-Based Zuweisung              |
| **Internal Notes**   | Messages die nur Developer sehen (isInternal=true) |
| **Ticket ↔ Session** | Ticket mit Support-Session verknüpfen              |
| **Module-Link**      | Welches Modul betroffen ist                        |
| **Notifications**    | Push/Email bei neuem Ticket oder Antwort           |
| **Tags**             | Freie Tags für Kategorisierung                     |
| **Attachments**      | Screenshots, Logs hochladen                        |

### Tenant-Impersonation (Support Sessions)

v1 hatte eine voll funktionale `tenant-impersonate` Edge Function (658 Zeilen) — erstellt Support-Sessions
mit signiertem JWT, Audit-Trail, und 60-Minuten Timeout. v2 übernimmt dies mit Payload CMS Integration.

#### Konzept: Developer „loggt sich ein" als Tenant-Admin

```
Developer klickt "Login as Tenant" im Dev Portal → TenantList oder TenantDetail
  → System erstellt temporären JWT (60 Min. Gültigkeit)
  → Developer wird in neuem Tab als tenant_admin eingeloggt
  → Alle Aktionen werden mit `impersonatedBy` markiert
  → Nach 60 Min. oder manuellem Ende → Session geschlossen
```

#### Collection: `support_sessions` (Platform-DB)

```typescript
{
  _id: ObjectId,
  sessionId: String,              // Unique, auto-generated "sess_..."

  // Wer impersoniert
  performedBy: {
    userId: ObjectId,             // platform_admin User
    email: String,
    name: String,
  },

  // Welcher Tenant
  tenantSlug: String,             // "clinic_cairo"
  tenantName: String,             // "Cairo Dental Center"

  // Session
  status: String,                 // enum: active|ended|expired|revoked
  startedAt: Date,
  endedAt: Date | null,
  expiresAt: Date,                // startedAt + 60 Min.
  reason: String,                 // Pflichtfeld: Warum impersoniert? (Audit)
  linkedTicketId: ObjectId | null, // Optional: Verknüpftes Support-Ticket

  // JWT
  tempToken: String,              // Signierter JWT (wird bei Ende invalidiert)
  tokenJti: String,               // JWT ID für Revocation

  // Audit Trail
  actionsPerformed: [             // Log aller Aktionen während Impersonation
    {
      timestamp: Date,
      method: String,             // GET|POST|PUT|DELETE
      path: String,               // "/api/patients/123"
      description: String,        // "Viewed patient record"
    }
  ],

  createdAt: Date,
  updatedAt: Date,
}
// Index: { tenantSlug: 1, startedAt: -1 }
// Index: { performedBy.userId: 1, startedAt: -1 }
// Index: { status: 1, expiresAt: 1 }
// Index: { tokenJti: 1 } unique
```

#### API Endpoints

| Method   | Route                                    | Beschreibung                                    |
| -------- | ---------------------------------------- | ----------------------------------------------- |
| `POST`   | `/api/admin/tenants/:slug/impersonate`   | Session starten (JWT generieren, Grund angeben) |
| `DELETE` | `/api/admin/support-sessions/:id`        | Session manuell beenden                         |
| `GET`    | `/api/admin/support-sessions`            | Alle Sessions (Filter: tenant, status, date)    |
| `GET`    | `/api/admin/support-sessions/:id`        | Session-Detail mit Action-Log                   |
| `POST`   | `/api/admin/support-sessions/:id/revoke` | Session sofort widerrufen (JWT invalidieren)    |

#### UI-Integration (Dev Portal)

| Wo                             | Element                 | Beschreibung                                                                   |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------ |
| **TenantList**                 | Button „Login as Admin" | Pro Tenant-Zeile, disabled wenn Session aktiv                                  |
| **TenantDetail**               | Button „Login as Admin" | Im Header der Tenant-Detail-Seite                                              |
| **TenantDetail → Support Tab** | Session-History         | Alle bisherigen Impersonation-Sessions für diesen Tenant                       |
| **Header-Banner**              | ⚠️ Impersonation-Banner | Im Admin Portal: gelber Banner „You are impersonating [Tenant]. [End Session]" |

#### Sicherheitsregeln

- **Nur `platform_admin`** kann impersonieren
- **Pflicht-Grund** bei Session-Start (Audit-Compliance)
- **60-Minuten Max.** — danach automatisch expired
- **Alles geloggt** — jeder API-Request während Impersonation wird protokolliert
- **Banner sichtbar** — Tenant-UI zeigt Impersonation-Status
- **JWT Revocation** — bei Session-Ende wird der Token sofort ungültig (Redis Blocklist)

---

## 10. Admin Portal — Alle 28 Module

### Module die BLEIBEN (portiert von v1)

| #   | Modul           | Collections (Tenant-DB)                                                         | Portiert von v1? |
| --- | --------------- | ------------------------------------------------------------------------------- | :--------------: |
| 1   | Dashboard       | Aggregation                                                                     |        ✅        |
| 2   | Patients        | `patients` (embedded: allergies, medical_history)                               |        ✅        |
| 3   | Appointments    | `appointments`, `appointment_types`, `waitlist`, `recurring_rules`              |        ✅        |
| 4   | Dental Charts   | `dental_charts`, `dental_chart_history`                                         |        ✅        |
| 5   | Treatment Plans | `treatment_plans` (embedded: items)                                             |        ✅        |
| 6   | Procedure Notes | `procedure_notes`, `procedure_note_templates`                                   |        ✅        |
| 7   | Doctors         | `doctors`, `doctor_schedules`, `doctor_availability`                            |        ✅        |
| 8   | Invoices        | `invoices` (embedded: items)                                                    |        ✅        |
| 9   | Payments        | `payments`, `reconciliation`                                                    |        ✅        |
| 10  | Prescriptions   | `prescriptions` (embedded: items), `medications`                                |        ✅        |
| 11  | X-Rays          | `xrays` + S3 Storage                                                            |        ✅        |
| 12  | CBCT            | `cbct_orders`, `cbct_scans` + S3 Storage                                        |        ✅        |
| 13  | Lab Orders      | `lab_orders`, `dental_labs`, `lab_order_types`                                  |        ✅        |
| 14  | Insurance       | `insurance_claims`, `insurance_companies`                                       |        ✅        |
| 15  | Inventory       | `inventory_items`, `inventory_movements`, `purchase_orders`                     |        ✅        |
| 16  | Services        | `services`, `service_categories`                                                |        ✅        |
| 17  | Branches        | `branches`, `chairs`                                                            |        ✅        |
| 18  | Users           | `users`, `user_sessions` (via Payload)                                          |        ✅        |
| 19  | Schedules       | `doctor_schedules`, `schedule_exceptions`, `staff_schedules`, `shift_templates` |        ✅        |
| 20  | Leave           | `leave_requests`, `leave_balances`, `leave_types`                               |        ✅        |
| 21  | Attendance      | `attendance`                                                                    |        ✅        |
| 22  | Commissions     | `doctor_commissions`, `commission_payouts`                                      |        ✅        |
| 23  | Installments    | `installment_plans` (embedded: payments)                                        |        ✅        |
| 24  | Consent Forms   | `consent_forms`, `consent_templates`                                            |        ✅        |
| 25  | Notifications   | `notification_queue` + BullMQ                                                   |        ✅        |
| 26  | Reports         | Aggregation Pipelines                                                           |        ✅        |
| 27  | Subscription    | Via Payload (Platform-DB)                                                       |        ✅        |
| 28  | Settings        | `settings` (Tenant-spezifisch)                                                  |        ✅        |

### Hinweise zu einzelnen Modulen

#### Modul #10 Prescriptions — `medications` Collection (Tenant-DB)

v1 hatte eine globale `medications`-Tabelle (ohne tenant_id) mit ~100 Standard-Dental-Medikamenten.
In v2 wird dies als **Tenant-eigene Collection** umgesetzt — jeder Tenant bekommt bei Erstellung
eine Seed-Kopie, kann eigene Medikamente hinzufügen/bearbeiten.

```typescript
{
  _id: ObjectId,
  nameEn: String,                  // "Amoxicillin"
  nameAr: String,                  // "أموكسيسيلين"
  genericName: String,             // "Amoxicillin Trihydrate"
  category: String,                // enum: antibiotic|analgesic|anti_inflammatory|
                                   //       antifungal|antiseptic|anesthetic|vitamin|other
  dosageForm: String,              // enum: tablet|capsule|syrup|injection|cream|
                                   //       gel|mouthwash|drops|spray|powder|other
  strength: String,                // "500mg", "250mg/5ml"

  // Defaults für Rezept-Autocomplete
  defaultDosage: String,           // "1 tablet"
  defaultFrequency: String,        // "3 times daily"
  defaultDuration: String,         // "7 days"
  instructionsEn: String,          // "Take after meals with water"
  instructionsAr: String,          // "يؤخذ بعد الأكل مع الماء"

  warnings: [String],              // ["Not for pregnant women", "May cause drowsiness"]
  contraindications: [String],     // ["Penicillin allergy"]

  isActive: Boolean,               // Default: true (Soft-Delete)
  isCustom: Boolean,               // false = Seed, true = vom Tenant hinzugefügt
  sortOrder: Number,

  createdAt: Date,
  updatedAt: Date,
}
// Index: { nameEn: 1, strength: 1 } unique
// Index: { category: 1, isActive: 1 }
// Index: { genericName: 1 }
```

**Seed:** ~100 häufige Dental-Medikamente (Antibiotika, Schmerzmittel, Entzündungshemmer,
Anästhetika, Mundspülungen etc.). Seed-Daten sind **nicht-löschbar** (isCustom=false),
aber deaktivierbar.

**UI-Integration:** Im Prescription-Formular können Ärzte beim Hinzufügen eines Medikaments:

- Aus dem Katalog wählen (Autocomplete-Suche nach Name/GenericName)
- Defaults werden vorausgefüllt (Dosage, Frequency, Duration, Instructions)
- Arzt kann alle Felder überschreiben
- Freitext-Eingabe bleibt möglich (für Nicht-Katalog-Medikamente)

#### Modul #14 Insurance — `patients.insurance[]` (Optional, Embedded)

v1 hatte eine eigene `patient_insurance`-Tabelle (Mig. 024).
v2 nutzt ein **optionales embedded Array** im `patients`-Dokument — nur sichtbar/aktiv
wenn das Insurance-Modul (`insurance-claims`) lizenziert ist.

```typescript
// Innerhalb patients Collection:
{
  // ... bestehende Patient-Felder ...

  insurance: [                     // Optional — nur wenn Insurance-Modul aktiv
    {
      insuranceCompanyId: ObjectId, // → insurance_companies
      policyNumber: String,         // Versicherungsnummer
      groupNumber: String | null,   // Gruppen-/Vertragsnummer
      memberId: String,             // Mitgliedsnummer
      coverageType: String,         // enum: individual|family
      coveragePercentage: Number,   // 0-100 (Default vom insurance_companies)
      maxCoverage: Number | null,   // Jährliches Maximum
      deductible: Number,           // Selbstbehalt
      deductibleMet: Number,        // Bereits gezahlter Selbstbehalt
      effectiveDate: Date,
      expiryDate: Date,
      isPrimary: Boolean,           // true = Hauptversicherung
      isActive: Boolean,            // Automatisch false wenn expiryDate < heute
    }
  ],
}
```

> **Warum optional embedded?** Viele Länder (z.B. Ägypten) haben kaum Zahnversicherung —
> das Feld wird nur angezeigt wenn das Insurance-Modul aktiv ist. Embedding spart einen
> JOIN/Lookup und die Daten sind direkt am Patienten verfügbar.

#### Modul #13 Lab Orders — `lab_order_types` Collection (Tenant-DB)

v1 hatte eine `lab_order_types`-Tabelle mit 14 vordefinierten Typen (Crown, Bridge, Denture, etc.).
Diese wurden im LabOrderForm als Dropdown genutzt und in LabOrderList angezeigt — **voll funktional in v1**.
In v2 wird dies als Tenant-eigene Lookup-Collection umgesetzt.

```typescript
{
  _id: ObjectId,
  nameEn: String,                  // "Crown"
  nameAr: String,                  // "تاج"
  category: String,                // enum: crown|bridge|denture|guard|retainer|
                                   //       implant|veneer|inlay|onlay|other
  defaultTurnaroundDays: Number,   // z.B. 7 (Standard-Lieferzeit)

  isActive: Boolean,               // Default: true (Soft-Delete)
  isCustom: Boolean,               // false = Seed, true = vom Tenant hinzugefügt
  sortOrder: Number,

  createdAt: Date,
  updatedAt: Date,
}
// Index: { nameEn: 1 } unique
// Index: { category: 1, isActive: 1 }
```

**Seed:** 14 Standard-Typen bei Tenant-Erstellung:

| #   | nameEn               | nameAr         | category | defaultTurnaroundDays |
| --- | -------------------- | -------------- | -------- | --------------------- |
| 1   | Crown (PFM)          | تاج معدني خزفي | crown    | 7                     |
| 2   | Crown (Zirconia)     | تاج زركونيا    | crown    | 7                     |
| 3   | Crown (E-Max)        | تاج إي ماكس    | crown    | 7                     |
| 4   | Bridge (3-unit)      | جسر ثلاثي      | bridge   | 10                    |
| 5   | Bridge (4+ unit)     | جسر رباعي+     | bridge   | 12                    |
| 6   | Full Denture (Upper) | طقم كامل علوي  | denture  | 14                    |
| 7   | Full Denture (Lower) | طقم كامل سفلي  | denture  | 14                    |
| 8   | Partial Denture      | طقم جزئي       | denture  | 10                    |
| 9   | Night Guard          | واقي ليلي      | guard    | 7                     |
| 10  | Retainer (Hawley)    | مثبت هاولي     | retainer | 5                     |
| 11  | Retainer (Clear)     | مثبت شفاف      | retainer | 5                     |
| 12  | Implant Abutment     | دعامة زرع      | implant  | 10                    |
| 13  | Veneer (Porcelain)   | قشرة خزفية     | veneer   | 7                     |
| 14  | Inlay/Onlay          | حشوة مخبرية    | inlay    | 7                     |

**UI-Integration (funktional):**

- **LabOrderForm:** Dropdown/Autocomplete für `labOrderType` — wählt aus `lab_order_types`
- **LabOrderList:** Zeigt Typ-Name (EN/AR basierend auf Tenant-Sprache) + Kategorie-Badge
- **Turnaround-Tracking:** `defaultTurnaroundDays` wird beim Erstellen als `expectedDeliveryDate` vorausgefüllt
- **Custom Types:** Tenant-Admin kann eigene Typen hinzufügen (isCustom=true)
- **Settings-Seite:** Lab Order Types unter Settings → Lab → Order Types verwalten (CRUD)

> **Wichtig:** `lab_orders` Collection erhält ein `labOrderTypeId: ObjectId` Feld (Referenz auf `lab_order_types`).
> Beim Lab-Order-Erstellen wird der Typ ausgewählt, `expectedDeliveryDate` basierend auf `defaultTurnaroundDays` berechnet.

#### Namenskonvention: `treatments` (v1) → `procedure_notes` (v2)

v1 hatte eine `treatments`-Tabelle die für **direkte Behandlungen ohne Plan** genutzt wurde.
In v2 wird dies als `procedure_notes` bezeichnet, um Verwechslung mit `treatment_plans` zu vermeiden:

| v1 Begriff        | v2 Begriff            | Beschreibung                                                                 |
| ----------------- | --------------------- | ---------------------------------------------------------------------------- |
| `treatments`      | **`procedure_notes`** | Dokumentation einer durchgeführten Behandlung (direkt, ohne vorherigen Plan) |
| `treatment_plans` | **`treatment_plans`** | Geplante zukünftige Behandlungen (Kostenvoranschlag + Sequenz)               |

> **Regel:** `treatment_plans` = **Was kommt** (Planung), `procedure_notes` = **Was wurde gemacht** (Dokumentation).
> Ein `procedure_note` KANN optional einem `treatment_plan.items[]` zugeordnet sein (wenn aus Plan entstanden),
> muss es aber nicht (wenn direkte Behandlung).

### Module die ENTFERNT werden (nicht in v2)

Siehe [Abschnitt 30](#30-entfernte-features-nicht-rebuilden).

### Neues Modul im Admin: Webhooks (Tenant-Level)

| Feature           | Beschreibung                                           |
| ----------------- | ------------------------------------------------------ |
| Webhook-Liste     | Tenant sieht seine eigenen Webhooks                    |
| Webhook erstellen | URL, Events auswählen, Secret auto-generiert           |
| Test senden       | Test-Payload an URL                                    |
| Logs anzeigen     | Delivery-Protokoll pro Webhook                         |
| Event-Katalog     | Verfügbare Events (patient, appointment, device, etc.) |

---

## 11. Admin Portal — Modul-Katalog (v1 → v2)

### Module die in v2 als bezahlbare Module existieren

| #   | v1 Slug              | v2 Slug                | v1 Preis | v2 Preis | Änderung                      |
| --- | -------------------- | ---------------------- | -------- | -------- | ----------------------------- |
| 1   | `patient-records`    | `patient-records`      | Free     | Free     | Bleibt                        |
| 2   | `core-scheduling`    | `appointments`         | Free     | Free     | Umbenannt                     |
| 3   | —                    | `dashboard-reports`    | —        | Free     | NEU (war Teil von Core)       |
| 4   | `dental-charting`    | `dental-charting`      | Paid     | $49/Mo   | Bleibt                        |
| 5   | `basic-billing`      | `billing-invoicing`    | Free     | $39/Mo   | Umbenannt, jetzt Paid         |
| 6   | `inventory`          | `inventory-management` | Paid     | $29/Mo   | Bleibt                        |
| 7   | —                    | `insurance-claims`     | —        | $39/Mo   | NEU (war Teil von Billing)    |
| 8   | —                    | `lab-management`       | —        | $29/Mo   | NEU (war kein Modul)          |
| 9   | —                    | `xray-cbct`            | —        | $49/Mo   | NEU (war kein Modul)          |
| 10  | `multi-branch`       | `multi-branch`         | Paid     | $79/Mo   | Bleibt (unbegrenzte Branches) |
| 11  | `advanced-analytics` | `advanced-analytics`   | Paid     | $199/Mo  | Bleibt                        |

### Module die ENTFERNT werden (kein Modul in v2)

| v1 Slug          | Warum entfernt                                               |
| ---------------- | ------------------------------------------------------------ |
| `dental-tourism` | Nicht Kern-Dental, Nische                                    |
| `website`        | Website Builder komplett entfernt                            |
| `white-label`    | Wird kostenloses Branding-Feature unter Tenant Tab           |
| `api-access`     | API-Zugang ist Standard (kein separates Modul)               |
| `backup`         | Backup wird ins Dev Portal integriert (kein separates Modul) |

### Kostenlose Plattform-Fähigkeiten (kein Modul, kein Preis)

| Feature        | Warum kostenlos                                     |
| -------------- | --------------------------------------------------- |
| **Workflows**  | Automatisiert Features die Tenant bereits bezahlt   |
| **Branding**   | Logo/Farben pro Tenant, macht Plattform attraktiver |
| **Backup**     | Integriert ins Dev Portal, pro Tenant               |
| **API-Zugang** | Standard für alle Tenants                           |

---

## 12. User Onboarding & Profil-System

### Konzept: Invite-basierte User-Erstellung

v1 hatte nur direkte Erstellung (Admin gibt Email + Passwort ein). v2 nutzt ein **Invite-System**:

```
Admin erstellt User im Admin Portal:
  1. Gibt Email ein (wird zum Username)
  2. Wählt Rolle (dentist, receptionist, assistant, etc.)
  3. Klickt "Invite senden"
  → System generiert:
     ├── Temporäres Passwort (auto-generiert)
     ├── Activation Token (einmalig, 72h gültig)
     └── Email an den User mit Activation-Link

User empfängt Email:
  1. Klickt Activation-Link
  2. Setzt eigenes Passwort
  3. Wird weitergeleitet zu "Profil vervollständigen":
     ├── Profilbild hochladen (S3/R2)
     ├── Vorname + Nachname (EN + AR)
     ├── Telefonnummer
     ├── Bio (optional, für Doctors besonders wichtig)
     ├── Gender
     └── Sprach-Präferenz (wenn abweichend vom Tenant)
  4. Profil ist vollständig → voller Zugang
```

### User Document (Tenant-DB: `users` Collection)

```typescript
{
  _id: "user_abc123",
  email: "dr.ahmad@clinic.com",       // = Username
  role: "dentist",                     // Vom Admin bei Invite gesetzt

  // === Profil (vom User selbst ausgefüllt) ===
  profile: {
    firstName: { en: "Ahmad", ar: "أحمد" },
    lastName: { en: "Khalil", ar: "خليل" },
    displayName: "Dr. Ahmad Khalil",   // Auto-generiert oder manuell
    phone: "+201234567890",
    gender: "male",
    bio: { en: "Orthodontist with 10 years...", ar: "أخصائي تقويم..." },
    avatarUrl: "https://r2.dento.app/tenants/clinic_cairo/avatars/user_abc123.jpg",
    languagePreference: null,          // null = Tenant-Default nutzen
  },

  // === Status ===
  status: "active",                    // invited | pending_activation | active | suspended | deactivated
  isProfileComplete: true,             // false bis Pflichtfelder ausgefüllt
  activatedAt: "2026-03-01T10:00:00Z",
  lastLoginAt: "2026-03-15T08:30:00Z",

  // === Verknüpfungen ===
  doctorId: "doctor_xyz",             // Nur bei role=dentist (Referenz auf doctors Collection)
  branchId: "branch_main",            // Zugewiesene Branch

  // === Auth (in Payload platform DB) ===
  payloadUserId: "payload_user_id",   // Referenz auf Payload Auth

  createdAt, updatedAt, createdBy
}
```

### Profilbild-Upload

```typescript
// Upload-Flow:
// 1. Frontend: User wählt Bild (max 2MB, jpg/png/webp)
// 2. Frontend: Crop/Resize auf 256x256 (Client-seitig)
// 3. API: POST /tenant-api/users/:id/avatar
// 4. API: Upload nach S3/R2 unter:
//    tenants/{tenant_slug}/avatars/{user_id}.webp
// 5. API: avatarUrl in User-Document speichern
// 6. Response: Neue Avatar-URL

// Default Avatar (wenn kein Bild hochgeladen):
// DiceBear API basierend auf Initialen + Gender
const defaultAvatar = `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}&backgroundColor=4f46e5`;
```

### User-Status-Flow

```
invited → pending_activation → active → suspended/deactivated
   │          │                    │
   │          │                    ├── Admin kann suspendieren
   │          │                    └── Admin kann deaktivieren
   │          │
   │          └── User hat Link geklickt, Passwort gesetzt
   │               Aber Profil noch nicht vollständig
   │
   └── Admin hat Invite gesendet, User hat noch nichts getan
       (Reminder nach 24h, 48h, dann Invite verfällt nach 72h)
```

### Was sich ändert vs v1

| v1                                                | v2                                                  |
| ------------------------------------------------- | --------------------------------------------------- |
| Direkte Erstellung (Admin gibt Passwort ein)      | Invite per Email, User setzt eigenes Passwort       |
| Avatar nur URL-Eingabe                            | Echtes Bild-Upload (S3/R2) + Auto-Crop              |
| `user_profiles` Tabelle existiert, wird ignoriert | Profil als `profile` Sub-Dokument im User           |
| Kein Activation-Flow                              | Email-Invite → Activation → Profil vervollständigen |
| Kein Status-Tracking                              | `invited → pending → active → suspended`            |
| Kein Profil-Completeness-Check                    | `isProfileComplete` Flag, Pflichtfelder             |
| DiceBear nur über Gender                          | DiceBear über Initialen, Custom Upload möglich      |

---

## 13. Doctor Data Model & Sharing

### Doctors Collection (Tenant-DB)

Doctors werden in der **Tenant-DB** gespeichert (`tenant_{slug}`) und sind automatisch
über den gesamten Tenant verfügbar — alle Branches, alle Module sehen dieselben Daten:

```typescript
{
  _id: "doctor_xyz",
  userId: "user_abc123",              // Referenz auf users Collection

  // === Profil (bidirektional sync mit User-Profil) ===
  name: { en: "Dr. Ahmad Khalil", ar: "د. أحمد خليل" },
  title: { en: "Orthodontist", ar: "أخصائي تقويم" },
  specialty: { en: "Orthodontics", ar: "تقويم الأسنان" },
  bio: { en: "10 years experience...", ar: "خبرة 10 سنوات..." },
  photoUrl: "https://r2.dento.app/tenants/clinic_cairo/avatars/user_abc123.jpg",
  gender: "male",

  // === Professionelle Daten ===
  licenseNumber: "EG-DEN-2015-1234",
  specializations: ["orthodontics", "cosmetic-dentistry"],
  qualifications: ["BDS Cairo University", "MSc Orthodontics"],
  experienceYears: 10,
  certificates: [                     // Embedded Array
    { name: "Invisalign Certified", issuedAt: "2020-01-15", fileUrl: "..." }
  ],

  // === Finanzen ===
  consultationFee: 500,               // In Tenant clinicCurrency
  commissionRate: 30.0,               // 30% Provision

  // === Branches ===
  assignedBranches: ["branch_main", "branch_nasr_city"],
  primaryBranch: "branch_main",

  // === Status ===
  isActive: true,
  isFeatured: false,
  displayOrder: 1,

  createdAt, updatedAt
}
```

> **Hinweis:** `workingHours` JSONB-Feld (v1: `doctors.working_hours`) existiert in v2 NICHT.
> Arzt-Verfügbarkeit wird ausschließlich über die `doctor_schedules` Collection gesteuert — branch-spezifisch, mit Validierung gegen Branch-Öffnungszeiten. Siehe [Abschnitt 22](#22-staff-scheduling--availability-system).

### Wie Doctor-Daten across the Tenant geteilt werden

```
doctors Collection (1 Collection — alle Branches)
  │
  ├── Appointments → appointment.doctorId → Doctor-Name + Photo
  ├── Dental Charts → chart.doctorId → "Behandelt von Dr. XY"
  ├── Treatment Plans → plan.doctorId → Doctor in Dokument-Header
  ├── Prescriptions → prescription.doctorId → Doctor-Name + Specialty + Signatur
  ├── Invoices → invoice.doctorId → KEIN Doctor im Dokument (nur intern)
  ├── Lab Orders → labOrder.doctorId → "Bestellt von Dr. XY"
  ├── X-Rays → xray.doctorId → "Angeordnet von Dr. XY"
  ├── CBCT Orders → cbctOrder.doctorId → "Angeordnet von Dr. XY"
  ├── Schedules → doctorSchedules + doctorAvailability
  ├── Leave → leaveRequests.doctorId
  └── Commissions → doctorCommissions.doctorId
```

### User ↔ Doctor Sync

Wenn ein User mit `role: "dentist"` erstellt wird, wird automatisch ein Doctor-Record angelegt.
Felder werden **bidirektional** synchronisiert:

```typescript
// Hook: afterUpdate:users (wenn role=dentist)
async function syncUserToDoctor(userId, updates) {
  if (updates.profile?.firstName || updates.profile?.avatarUrl) {
    await db.collection('doctors').updateOne(
      { userId },
      {
        $set: {
          'name.en': `Dr. ${updates.profile.firstName.en} ${updates.profile.lastName.en}`,
          'name.ar': `د. ${updates.profile.firstName.ar} ${updates.profile.lastName.ar}`,
          photoUrl: updates.profile.avatarUrl,
          gender: updates.profile.gender,
        },
      },
    );
  }
}

// Hook: afterUpdate:doctors (wenn professionelle Daten geändert)
// Specialty, Bio, etc. sind NUR in doctors — keine Rück-Sync nötig
```

### Multi-Branch: Doctor kann in mehreren Branches arbeiten

```typescript
// Doctor ist branch_main + branch_nasr_city zugewiesen:
assignedBranches: ['branch_main', 'branch_nasr_city'];

// Termine in allen Branches sehen denselben Doctor:
appointments.find({ doctorId: 'doctor_xyz' });
// → Gibt Termine aus ALLEN Branches zurück (gleiche Tenant-DB)

// Schedules sind aber PRO Branch:
doctor_schedules.find({ doctorId: 'doctor_xyz', branchId: 'branch_main' });
// → Montag 9-17 in branch_main
doctor_schedules.find({ doctorId: 'doctor_xyz', branchId: 'branch_nasr_city' });
// → Dienstag + Donnerstag 14-20 in branch_nasr_city
```

---

## 14. Logo & Branding Propagation

### Wo wird das Logo überall verwendet?

Das Tenant-Logo wird in der **Branding-Konfiguration** gespeichert (Tenant → Branding Tab)
und propagiert sich automatisch über das gesamte System:

```
Branding Config:
  ├── logoUrl (light)
  ├── logoDarkUrl (dark theme)
  ├── faviconUrl
  ├── clinicName: { en, ar }
  ├── primaryColor
  └── accentColor
```

### Propagation über den gesamten Tenant

| Bereich                        | Was zeigt Logo/Branding         |      v1 Status       |         v2 Status         |
| ------------------------------ | ------------------------------- | :------------------: | :-----------------------: |
| **Sidebar (Admin Portal)**     | Logo oben links (light/dark)    |   ❌ Hardcoded "D"   | ✅ Dynamisch aus Branding |
| **Login-Seite**                | Logo + Clinic-Name              |     ❌ Hardcoded     |       ✅ Dynamisch        |
| **Rechnungen (Invoice PDF)**   | Logo + Clinic-Name + Adresse    |   ✅ Funktioniert    |      ✅ Beibehalten       |
| **Rezepte (Prescription PDF)** | Logo + Clinic-Name + Adresse    |   ✅ Funktioniert    |      ✅ Beibehalten       |
| **Behandlungspläne (PDF)**     | Logo + Clinic-Name              | ❌ Hardcoded "Dento" |       ✅ Dynamisch        |
| **Einverständniserklärungen**  | Logo + Clinic-Name              |   ✅ Funktioniert    |      ✅ Beibehalten       |
| **Email-Templates**            | Logo im Header                  |  ❌ Nicht vorhanden  |          ✅ NEU           |
| **Mobile App**                 | Logo im Splash + Header         |  ❌ Nicht vorhanden  |          ✅ NEU           |
| **Browser Tab**                | Favicon + Clinic-Name als Titel |     ❌ Hardcoded     |       ✅ Dynamisch        |
| **Notification Emails**        | Logo im Header                  |  ❌ Nicht vorhanden  |          ✅ NEU           |

### Branding Document (Tenant-DB: `settings` Collection)

```typescript
{
  _id: "branding",
  type: "branding",

  // === Logo ===
  logoUrl: "https://r2.dento.app/tenants/clinic_cairo/branding/logo.png",
  logoDarkUrl: "https://r2.dento.app/tenants/clinic_cairo/branding/logo-dark.png",
  faviconUrl: "https://r2.dento.app/tenants/clinic_cairo/branding/favicon.ico",

  // === Clinic Information (für Dokumente) ===
  clinicName: { en: "Cairo Dental Center", ar: "مركز القاهرة لطب الأسنان" },
  address: {
    main: { en: "15 Tahrir St, Downtown Cairo", ar: "15 شارع التحرير، وسط القاهرة" },
    // Bei Multi-Branch: immer die Main Branch (erste/primäre)
    branchId: "branch_main",         // Welche Branch-Adresse für Dokumente?
  },
  phone: "+20 2 1234 5678",          // Klinik-Hauptnummer
  email: "info@cairodentalcenter.com",
  website: "www.cairodentalcenter.com",

  // === Farben ===
  primaryColor: "#4f46e5",            // Sidebar, Buttons
  accentColor: "#10b981",             // Highlights, Success

  // === Custom CSS (optional, für PDF-Templates) ===
  customCss: null,

  updatedAt, updatedBy
}
```

### Multi-Branch Adress-Logik für Dokumente

Dokumente (Rechnungen, Rezepte, etc.) zeigen IMMER die **Main-Branch-Adresse**:

```typescript
// Beim Generieren eines Dokuments:
const branding = await db.collection('settings').findOne({ type: 'branding' });
const mainBranch = await db.collection('branches').findOne({ _id: branding.address.branchId });

const documentHeader = {
  logo: branding.logoUrl,
  clinicName: branding.clinicName, // { en, ar }
  address: mainBranch.address, // Immer Main Branch
  phone: branding.phone,
  email: branding.email,
};
```

> **Warum Main Branch?** Bei Multi-Branch Kliniken ist die Main Branch die offizielle
> Geschäftsadresse für den Briefkopf. Einzelne Branches können "Branch: Nasr City" als
> Zusatz anzeigen, aber die Hauptadresse ist immer die Main Branch.

---

## 15. Document Templates (Invoice, Prescription, Treatment Plan)

### Gemeinsamer Clinic-Header (Wiederverwendbare Komponente)

v1 hatte den Clinic-Header in **jedem Template dupliziert**. v2 hat eine
**einzige `<ClinicHeader />` Komponente**, die überall verwendet wird:

```typescript
// packages/ui/src/composites/ClinicHeader.tsx
function ClinicHeader({ branding, doctor, showDoctor }: Props) {
  return (
    <div className="clinic-header border-b-2 pb-4 mb-4">
      <div className="flex items-start gap-4">
        {/* Logo */}
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
        )}

        {/* Clinic Info */}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{branding.clinicName.en}</h1>
          {branding.clinicName.ar && (
            <h2 dir="rtl" className="text-lg">{branding.clinicName.ar}</h2>
          )}
          <p>{branding.address}</p>
          <p>{branding.phone} | {branding.email}</p>
        </div>

        {/* Doctor (nur wenn showDoctor=true) */}
        {showDoctor && doctor && (
          <div className="text-end">
            <p className="font-bold">{doctor.name.en}</p>
            {doctor.name.ar && <p dir="rtl">{doctor.name.ar}</p>}
            <p className="text-sm text-gray-500">{doctor.specialty.en}</p>
            <p className="text-sm">Lic: {doctor.licenseNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Template-Übersicht: Was enthält was?

| Element                   |    Invoice     |  Prescription  | Treatment Plan |  Consent Form  |   Lab Order    |
| ------------------------- | :------------: | :------------: | :------------: | :------------: | :------------: |
| **Clinic Logo**           |       ✅       |       ✅       |       ✅       |       ✅       |       ✅       |
| **Clinic Name (EN+AR)**   |       ✅       |       ✅       |       ✅       |       ✅       |       ✅       |
| **Clinic Address**        | ✅ Main Branch | ✅ Main Branch | ✅ Main Branch | ✅ Main Branch | ✅ Main Branch |
| **Clinic Phone**          |       ✅       |       ✅       |       ✅       |       ✅       |       ✅       |
| **Doctor Name**           |       ❌       |       ✅       |       ✅       |       ❌       |       ✅       |
| **Doctor Specialty**      |       ❌       |       ✅       |       ✅       |       ❌       |       ❌       |
| **Doctor License**        |       ❌       |       ✅       |       ❌       |       ❌       |       ❌       |
| **Doctor Signatur-Linie** |       ❌       |       ✅       |       ✅       |  ✅ (Patient)  |       ❌       |
| **Patient Name**          |       ✅       |       ✅       |       ✅       |       ✅       |       ✅       |
| **Datum**                 |       ✅       |       ✅       |       ✅       |       ✅       |       ✅       |
| **Referenznummer**        |  ✅ INV-xxxx   |   ✅ RX-xxxx   |   ✅ TP-xxxx   |   ✅ CF-xxxx   |   ✅ LO-xxxx   |

### Warum Invoice OHNE Doctor?

Rechnungen sind **finanzielle Dokumente der Klinik**, nicht eines einzelnen Arztes:

- Die Klinik stellt die Rechnung, nicht der Arzt
- Steuerlich ist die Klinik der Leistungserbringer
- Mehrere Ärzte können an einem Behandlungsplan beteiligt sein
- Der Arzt ist intern über `invoice.items[].doctorId` nachvollziehbar

### Einzelne Templates

#### Invoice Template

```
┌──────────────────────────────────────────────────────┐
│ [LOGO]  Cairo Dental Center                INV-2026-0042 │
│         مركز القاهرة لطب الأسنان             Date: 01/03/2026 │
│         15 Tahrir St, Downtown Cairo                    │
│         +20 2 1234 5678 | info@clinic.com               │
├──────────────────────────────────────────────────────┤
│ Patient: Ahmad Mohamed  | ID: PAT-0123                  │
│ Phone: +20 123 456 7890                                 │
├──────────────────────────────────────────────────────┤
│ # | Service            | Qty | Unit Price | Total        │
│ 1 | Dental Cleaning    |  1  |   500 EGP  |   500 EGP    │
│ 2 | Composite Filling  |  2  |   800 EGP  | 1,600 EGP    │
│ 3 | X-Ray              |  1  |   200 EGP  |   200 EGP    │
├──────────────────────────────────────────────────────┤
│                           Subtotal:         2,300 EGP    │
│                           VAT (14%):           322 EGP    │
│                           Total:             2,622 EGP    │
├──────────────────────────────────────────────────────┤
│ Payment Status: Paid ✅ | Method: Visa ****4567         │
└──────────────────────────────────────────────────────┘
```

#### Prescription Template

```
┌──────────────────────────────────────────────────────┐
│ [LOGO]  Cairo Dental Center      Dr. Ahmad Khalil    │
│         مركز القاهرة لطب الأسنان    د. أحمد خليل            │
│         15 Tahrir St, Cairo      Orthodontist        │
│         +20 2 1234 5678          Lic: EG-DEN-2015    │
├──────────────────────────────────────────────────────┤
│ Rx                                         RX-0087   │
│ Patient: Fatma Ali  |  Date: 01/03/2026               │
├──────────────────────────────────────────────────────┤
│ 1. Amoxicillin 500mg                                   │
│    1 capsule × 3/day × 7 days                           │
│    After meals                                         │
│                                                        │
│ 2. Ibuprofen 400mg                                     │
│    1 tablet × 2/day × 5 days                            │
│    As needed for pain                                  │
├──────────────────────────────────────────────────────┤
│ Notes: Take with plenty of water                       │
├──────────────────────────────────────────────────────┤
│ Doctor Signature: ___________________________          │
│ Dr. Ahmad Khalil — Orthodontist                        │
└──────────────────────────────────────────────────────┘
```

#### Treatment Plan Template

```
┌──────────────────────────────────────────────────────┐
│ [LOGO]  Cairo Dental Center      Dr. Ahmad Khalil    │
│         مركز القاهرة لطب الأسنان    د. أحمد خليل            │
│         15 Tahrir St, Cairo      Orthodontist        │
│         +20 2 1234 5678                               │
├──────────────────────────────────────────────────────┤
│ TREATMENT PLAN                            TP-0034    │
│ Patient: Fatma Ali  |  Date: 01/03/2026               │
├──────────────────────────────────────────────────────┤
│ # | Procedure          | Tooth | Est. Cost | Status    │
│ 1 | Root Canal         |  #36  | 3,000 EGP | Pending   │
│ 2 | Crown (Porcelain)  |  #36  | 4,000 EGP | Pending   │
│ 3 | Filling            |  #25  |   800 EGP | Completed │
├──────────────────────────────────────────────────────┤
│                           Estimated Total: 7,800 EGP   │
├──────────────────────────────────────────────────────┤
│ Doctor Signature: ___________________________          │
│ Patient Signature: __________________________          │
└──────────────────────────────────────────────────────┘
```

### Was sich ändert vs v1

| v1                                                 | v2                                                           |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Clinic-Header in jedem Template dupliziert         | Einzige `<ClinicHeader />` Komponente                        |
| TreatmentPlanView: Hardcoded "Dento Dental Clinic" | Dynamisch aus Branding                                       |
| Kein einheitlicher Document-Standard               | Alle Dokumente: Logo + Name + Main Branch Adresse + Phone    |
| Invoice = kein Doctor                              | Bleibt: Invoice ist Klinik-Dokument, kein Doctor             |
| Prescription = Doctor + Specialty + Signatur       | Bleibt + License Number hinzugefügt                          |
| TreatmentPlan = kein Clinic Header                 | NEU: Voller Clinic Header + Doctor + Signaturen              |
| Nur `window.print()`                               | `window.print()` + PDF-Export (via Puppeteer/jsPDF, Phase 4) |

---

## 16. Inventory Management System (Deep Dive)

> **Modul-Slug:** `inventory-management` | **Preis:** $29/Mo | **Phase:** 5 (Woche 17-19)

### v1-Analyse — Was existierte

| Aspekt                    | v1 Status         | Detail                                                                |
| ------------------------- | ----------------- | --------------------------------------------------------------------- |
| Item CRUD                 | ✅ Implementiert  | Name EN/AR, SKU, Category, Unit (10 Typen), Pricing, Reorder-Level    |
| Multi-Branch Stock        | ✅ Implementiert  | `inventory_stock` pro Branch, `available_quantity` computed           |
| Bewegungen (8 Typen)      | ✅ Implementiert  | purchase, sale, adjustment, transfer_in/out, expired, damaged, return |
| Material-Selektor         | ✅ Implementiert  | Wiederverwendbare Komponente in Procedures + Treatment Plans          |
| Auto-Deduktion            | ✅ Implementiert  | Bei ProcedureNote + TreatmentPlan mit Anti-Doppel-Flag                |
| Invoice-Integration       | ✅ Implementiert  | Inventory-Items als Rechnungsposten (mit Stock-Anzeige)               |
| MaterialUsageReport       | ✅ Implementiert  | Date Range, Branch, Category Filter + CSV-Export                      |
| Low-Stock-Alerts          | ✅ Implementiert  | Dashboard-Widget via `v_low_stock_items` View                         |
| RLS + RBAC                | ✅ Implementiert  | `is_inventory_staff()`, Rollen-basiert                                |
| **Suppliers**             | ⚠️ Schema-only    | Tabelle existiert, **KEIN UI**                                        |
| **Purchase Orders**       | ⚠️ Schema-only    | Vollständiger Workflow (draft→received), **KEIN UI**                  |
| **Batch/Lot Tracking**    | ⚠️ Schema-only    | `batch_number` Spalte in movements, **nicht editierbar**              |
| **Expiry Tracking**       | ⚠️ Schema-only    | `expiry_date` Spalte existiert, **hardcoded `0`** im Dashboard        |
| **Inter-Branch Transfer** | ⚠️ Schema-only    | Movement-Typen existieren, **kein Transfer-UI**                       |
| **Stock Count/Inventur**  | ⚠️ Schema-only    | `last_counted_at/by` Spalten, **kein Inventur-UI**                    |
| **Categories Page**       | ⚠️ Link existiert | `/inventory/categories` Route, **keine Komponente**                   |
| **Reserved Quantity**     | ⚠️ Schema-only    | Computed Column, **keine Reservierungslogik**                         |
| Barcode/QR                | ❌ Fehlt komplett | Kein Schema, kein UI                                                  |
| Item-Bilder               | ❌ Fehlt komplett | War geplant, nie implementiert                                        |
| FIFO/WAC Bewertung        | ❌ Fehlt komplett | Nur Einzel-`unit_cost`, kein Bewertungsverfahren                      |
| Stock-Validierung         | ❌ Fehlt komplett | Rechnungen erlauben Verkauf ohne Bestand                              |
| Negative Bestände         | ❌ Bug            | `deduct_inventory_stock()` erlaubt explizit negative Werte            |

### v2 MongoDB Collections

#### `inventory_categories`

```javascript
{
  _id: ObjectId,
  nameEn: String,           // "Dental Materials"
  nameAr: String,           // "مواد طب الأسنان"
  slug: String,             // "dental-materials" (auto-generated)
  parentId: ObjectId | null,// Hierarchische Kategorien
  description: String,
  icon: String,             // Lucide icon name
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index: { slug: 1 } unique
// Index: { parentId: 1 }
```

**Seed-Kategorien (10):**
Consumables, Dental Materials, Anesthetics, Surgical Supplies, Endodontic, Restorative, Prosthodontic, Orthodontic, Preventive, Infection Control

#### `inventory_items`

```javascript
{
  _id: ObjectId,
  sku: String,              // Eindeutige Artikelnummer (auto-generiert oder manuell)
  nameEn: String,           // "Composite Resin A2"
  nameAr: String,           // "حشوة كمبوزيت A2"
  categoryId: ObjectId,     // → inventory_categories
  description: String,

  // Einheit & Verpackung
  unit: String,             // enum: piece|box|pack|bottle|tube|ml|liter|gram|kg|unit|syringe|capsule
  unitsPerPackage: Number,  // NEU: z.B. 20 Stk pro Box (v1 fehlte)

  // Preise
  unitCost: Number,         // Einkaufspreis (Dezimal)
  sellingPrice: Number,     // Verkaufspreis
  marginPercent: Number,    // NEU: Berechnet: ((selling - cost) / cost) × 100

  // Bestandsregeln
  reorderLevel: Number,     // Default: 10 — Alarm-Schwelle
  reorderQuantity: Number,  // Default: 50 — Empfohlene Nachbestellmenge
  minStockLevel: Number,    // NEU: Absolutes Minimum (Sicherheitsbestand)
  maxStockLevel: Number,    // NEU: Maximum (verhindert Überbestellung)

  // Eigenschaften
  isConsumable: Boolean,    // Verbrauchsmaterial (true) vs Instrument (false)
  requiresPrescription: Boolean, // NEU: Im Formular sichtbar (v1 hatte Spalte, kein UI)
  isActive: Boolean,        // Soft-Delete

  // *** NEU: Item-Bild ***
  imageUrl: String,         // S3/R2 Upload (max 1MB, auto-resize 512x512)

  // *** NEU: Barcode ***
  barcode: String,          // EAN-13, Code128, oder QR-Code String
  barcodeType: String,      // enum: ean13|code128|qr|datamatrix

  // *** NEU: Hersteller ***
  manufacturer: String,     // z.B. "3M", "Dentsply Sirona"
  manufacturerRef: String,  // Hersteller-Artikelnummer

  // *** NEU: Default Supplier ***
  defaultSupplierId: ObjectId, // → suppliers (für Auto-Reorder)

  // Statistik (denormalisiert, periodisch aktualisiert)
  totalConsumed: Number,    // NEU: Gesamt verbraucht seit Erstellung
  avgMonthlyUsage: Number,  // NEU: Ø Monatsverbrauch (für Forecast)
  lastPurchaseDate: Date,   // NEU: Letztes Einkaufsdatum
  lastPurchasePrice: Number,// NEU: Letzter Einkaufspreis (Preisänderungserkennung)

  createdAt: Date,
  updatedAt: Date
}
// Index: { sku: 1 } unique
// Index: { categoryId: 1 }
// Index: { barcode: 1 } unique sparse
// Index: { isActive: 1, nameEn: 1 }
// Index: { defaultSupplierId: 1 }
```

#### `inventory_stock` (pro Branch, pro Item)

```javascript
{
  _id: ObjectId,
  itemId: ObjectId,          // → inventory_items
  branchId: ObjectId,        // → branches

  quantity: Number,          // Aktueller Bestand
  reservedQuantity: Number,  // Für offene Behandlungspläne reserviert
  availableQuantity: Number, // quantity - reservedQuantity (berechnet bei save)

  // *** NEU: Batches (Embedded Array) ***
  batches: [{
    batchNumber: String,     // Chargennummer vom Hersteller
    lotNumber: String,       // Losnummer
    expiryDate: Date,        // Ablaufdatum
    quantity: Number,        // Menge in dieser Charge
    receivedDate: Date,      // Wann eingegangen
    purchaseOrderId: ObjectId, // Aus welcher Bestellung
    unitCost: Number,        // Einkaufspreis dieser Charge (für FIFO/WAC)
    status: String           // enum: active|expired|recalled|quarantine
  }],

  // Bewertung
  stockValue: Number,        // NEU: Gesamtwert nach Bewertungsmethode
  valuationMethod: String,   // NEU: enum: fifo|weighted_average|last_purchase
  weightedAvgCost: Number,   // NEU: Gewichteter Durchschnittspreis

  // Inventur
  lastCountedAt: Date,
  lastCountedBy: ObjectId,   // → users
  lastCountResult: String,   // enum: match|surplus|deficit
  countDiscrepancy: Number,  // Differenz bei letzter Inventur

  createdAt: Date,
  updatedAt: Date
}
// Index: { itemId: 1, branchId: 1 } unique
// Index: { "batches.expiryDate": 1 } // Für Expiry-Alerts
// Index: { availableQuantity: 1 } // Für Low-Stock-Queries
```

#### `inventory_movements`

```javascript
{
  _id: ObjectId,
  itemId: ObjectId,          // → inventory_items
  branchId: ObjectId,        // → branches

  movementType: String,      // enum: purchase|sale|adjustment_add|adjustment_remove|
                             //       transfer_in|transfer_out|expired|damaged|
                             //       return_supplier|return_patient|consumed|reserved|unreserved
  quantity: Number,          // Immer positiv — Richtung via movementType
  previousQuantity: Number,  // NEU: Bestand vor Bewegung
  newQuantity: Number,       // NEU: Bestand nach Bewegung

  unitCost: Number,          // Stückpreis zum Zeitpunkt
  totalCost: Number,         // quantity × unitCost

  // Referenz zum Auslöser
  referenceType: String,     // enum: invoice|purchase_order|transfer|procedure_note|
                             //       treatment_plan|appointment|manual|stock_count|expiry_check
  referenceId: ObjectId,     // ID des Quell-Datensatzes

  // Batch-Info
  batchNumber: String,
  lotNumber: String,         // NEU
  expiryDate: Date,

  // Transfer-spezifisch
  transferId: ObjectId,      // NEU: Verknüpft transfer_in + transfer_out
  fromBranchId: ObjectId,    // NEU: Bei transfer_out
  toBranchId: ObjectId,      // NEU: Bei transfer_in

  notes: String,
  createdBy: ObjectId,       // → users
  createdAt: Date
}
// Index: { itemId: 1, createdAt: -1 }
// Index: { branchId: 1, movementType: 1 }
// Index: { referenceType: 1, referenceId: 1 }
// Index: { transferId: 1 }
// Index: { createdAt: -1 } // Für Reports
```

#### `suppliers`

```javascript
{
  _id: ObjectId,
  name: String,              // "Al-Ahram Dental Supplies"
  nameAr: String,            // NEU: Arabischer Name
  contactPerson: String,
  phone: String,
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  taxNumber: String,         // Steuernummer
  commercialRegister: String,// NEU: Handelsregister
  paymentTerms: String,      // "Net 30", "COD"

  // *** NEU: Bewertung ***
  rating: Number,            // 1-5 Sterne (manuell vom Admin)
  avgDeliveryDays: Number,   // Ø Lieferdauer (berechnet)
  totalOrders: Number,       // Anzahl Bestellungen
  lastOrderDate: Date,

  // Kontaktdaten
  website: String,
  notes: String,
  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
// Index: { name: 1 }
// Index: { isActive: 1 }
```

#### `purchase_orders`

```javascript
{
  _id: ObjectId,
  orderNumber: String,       // Auto-generiert: PO-2026-001
  supplierId: ObjectId,      // → suppliers
  branchId: ObjectId,        // → branches (Ziellager)

  // Status-Workflow
  status: String,            // enum: draft|submitted|confirmed|shipped|partially_received|received|cancelled

  // Datum
  orderDate: Date,
  expectedDate: Date,        // Erwartetes Lieferdatum
  receivedDate: Date,        // Tatsächliches Empfangsdatum

  // Posten (Embedded Array)
  items: [{
    itemId: ObjectId,        // → inventory_items
    quantity: Number,        // Bestellte Menge
    unitCost: Number,        // Vereinbarter Stückpreis
    totalCost: Number,       // quantity × unitCost
    receivedQuantity: Number,// Tatsächlich empfangene Menge
    batchNumber: String,     // NEU: Chargennummer bei Empfang
    expiryDate: Date,        // NEU: Ablaufdatum bei Empfang
    notes: String
  }],

  // Beträge
  subtotal: Number,
  taxPercent: Number,        // NEU
  taxAmount: Number,
  discount: Number,          // NEU
  total: Number,

  // *** NEU: Empfangsprotokoll ***
  receivingNotes: String,
  receivedBy: ObjectId,      // → users
  qualityCheck: String,      // enum: passed|partial|failed

  // *** NEU: Dokument-Anhang ***
  attachments: [{
    name: String,
    url: String,             // S3/R2
    type: String             // enum: invoice|delivery_note|certificate
  }],

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// Index: { orderNumber: 1 } unique
// Index: { supplierId: 1, status: 1 }
// Index: { status: 1, expectedDate: 1 }
```

#### `stock_transfers` (NEU — v1 hatte kein Transfer-Tracking)

```javascript
{
  _id: ObjectId,
  transferNumber: String,    // Auto: TRF-2026-001
  fromBranchId: ObjectId,    // → branches
  toBranchId: ObjectId,      // → branches

  status: String,            // enum: draft|in_transit|received|cancelled

  items: [{
    itemId: ObjectId,        // → inventory_items
    quantity: Number,
    batchNumber: String,
    notes: String
  }],

  requestedBy: ObjectId,     // → users
  approvedBy: ObjectId,      // → users (Manager/Admin)
  receivedBy: ObjectId,      // → users (Empfänger-Branch)

  requestedAt: Date,
  approvedAt: Date,
  shippedAt: Date,
  receivedAt: Date,

  notes: String,
  createdAt: Date,
  updatedAt: Date
}
// Index: { transferNumber: 1 } unique
// Index: { fromBranchId: 1, status: 1 }
// Index: { toBranchId: 1, status: 1 }
```

#### `stock_counts` (NEU — Inventur-Tracking)

```javascript
{
  _id: ObjectId,
  countNumber: String,       // Auto: SC-2026-001
  branchId: ObjectId,        // → branches

  status: String,            // enum: in_progress|completed|cancelled
  countType: String,         // enum: full|partial|spot_check

  items: [{
    itemId: ObjectId,
    systemQuantity: Number,  // Was das System sagt
    countedQuantity: Number, // Was tatsächlich gezählt wurde
    discrepancy: Number,     // counted - system
    notes: String,
    adjustmentApplied: Boolean // Ob Korrektur durchgeführt wurde
  }],

  startedAt: Date,
  completedAt: Date,
  countedBy: ObjectId,       // → users
  approvedBy: ObjectId,      // → users (Admin muss Korrekturen genehmigen)

  summary: {
    totalItems: Number,
    matchCount: Number,
    surplusCount: Number,
    deficitCount: Number,
    totalDiscrepancyValue: Number // Geldwert der Differenzen
  },

  createdAt: Date,
  updatedAt: Date
}
// Index: { branchId: 1, status: 1 }
// Index: { countNumber: 1 } unique
```

### UI-Seiten (Admin Portal)

| Route                            | Komponente              | Beschreibung                                             |
| -------------------------------- | ----------------------- | -------------------------------------------------------- |
| `/inventory`                     | `InventoryList`         | Hauptliste mit Stats-Cards, Suche, Filter, Bulk-Aktionen |
| `/inventory/new`                 | `InventoryForm`         | Neues Item mit Bild-Upload, Barcode-Scanner              |
| `/inventory/:id`                 | `InventoryForm`         | Item bearbeiten                                          |
| `/inventory/categories`          | `InventoryCategoryList` | **NEU** — Kategorie-CRUD (v1 fehlte)                     |
| `/inventory/suppliers`           | `SupplierList`          | **NEU** — Lieferanten-CRUD (v1 schema-only)              |
| `/inventory/suppliers/new`       | `SupplierForm`          | **NEU** — Lieferant erstellen                            |
| `/inventory/suppliers/:id`       | `SupplierForm`          | **NEU** — Lieferant bearbeiten                           |
| `/inventory/purchase-orders`     | `PurchaseOrderList`     | **NEU** — Bestellungen verwalten (v1 schema-only)        |
| `/inventory/purchase-orders/new` | `PurchaseOrderForm`     | **NEU** — Bestellung erstellen                           |
| `/inventory/purchase-orders/:id` | `PurchaseOrderDetail`   | **NEU** — Bestellung + Wareneingang                      |
| `/inventory/transfers`           | `StockTransferList`     | **NEU** — Filial-Transfers (v1 fehlte komplett)          |
| `/inventory/transfers/new`       | `StockTransferForm`     | **NEU** — Transfer erstellen                             |
| `/inventory/stock-count`         | `StockCountList`        | **NEU** — Inventuren (v1 fehlte komplett)                |
| `/inventory/stock-count/new`     | `StockCountForm`        | **NEU** — Inventur durchführen                           |
| `/inventory/expiry`              | `ExpiryDashboard`       | **NEU** — Ablaufdaten-Übersicht                          |
| `/reports/material-usage`        | `MaterialUsageReport`   | Verbrauchsbericht (v1 existiert, wird verbessert)        |
| `/reports/stock-valuation`       | `StockValuationReport`  | **NEU** — Bestandsbewertung FIFO/WAC                     |

### Sidebar-Navigation (innerhalb Inventory Modul)

```
📦 Inventory
  ├── Items                    ← /inventory
  ├── Categories               ← /inventory/categories        (NEU)
  ├── Suppliers                ← /inventory/suppliers          (NEU)
  ├── Purchase Orders          ← /inventory/purchase-orders    (NEU)
  ├── Transfers                ← /inventory/transfers          (NEU)
  ├── Stock Count              ← /inventory/stock-count        (NEU)
  ├── Expiry Tracking          ← /inventory/expiry             (NEU)
  └── Reports
      ├── Material Usage       ← /reports/material-usage
      └── Stock Valuation      ← /reports/stock-valuation      (NEU)
```

### Expiry-Management (v1 = hardcoded 0)

```
┌─────────────────────────────────────────────────────┐
│              Expiry Dashboard                       │
├─────────────────────────────────────────────────────┤
│ 🔴 Abgelaufen (3)  🟡 < 30 Tage (7)  🟢 OK (124)  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Item              Batch    Qty  Expiry    Status    │
│ ─────────────────────────────────────────────────── │
│ Composite A2      B-2024   5    2026-01   EXPIRED   │
│ Anesthetic Cart   L-4412   12   2026-03   WARNING   │
│ Endo File K25     B-8891   20   2026-03   WARNING   │
│ ...                                                 │
├─────────────────────────────────────────────────────┤
│ Aktionen: [Als Expired markieren] [Export CSV]      │
│           [Bulk Disposal] [Reorder auslösen]        │
└─────────────────────────────────────────────────────┘
```

**Automatisierung (BullMQ Cron Job):**

```javascript
// Täglicher Job: 02:00 Uhr
schedule: '0 2 * * *';
name: 'inventory.expiry-check';

// Logik:
// 1. Alle Batches mit expiryDate ≤ heute → status = 'expired'
// 2. Alle Batches mit expiryDate ≤ heute + 30 Tage → Notification an Admin
// 3. Webhook-Event: inventory.expired / inventory.expiring_soon
// 4. Dashboard-Widget aktualisieren
```

### Stock-Validierung (v1 erlaubte Verkauf ohne Bestand)

```javascript
// v2: Konfigurierbar pro Tenant
settings.inventory = {
  allowNegativeStock: false, // Default: NICHT erlauben (v1-Bug gefixt)
  stockWarningThreshold: 'low', // enum: none|low|critical
  autoReserveOnTreatmentPlan: true, // Bestand reservieren bei Behandlungsplanerstellung
  requireBatchOnReceive: false, // Chargennummer bei Wareneingang pflicht?
  requireExpiryOnReceive: true, // Ablaufdatum bei Wareneingang pflicht?
  defaultValuationMethod: 'weighted_average', // fifo|weighted_average|last_purchase
  autoReorderEnabled: false, // NEU: Automatische Bestellvorschläge generieren?
};

// Bei Deduktion:
// 1. Check: availableQuantity >= requestedQuantity
// 2. Wenn nicht genug: Fehler (wenn allowNegativeStock=false)
// 3. Wenn FIFO: Älteste Batches zuerst deduzieren
// 4. Movement erstellen mit previousQuantity + newQuantity
```

### Barcode/QR-Scanning (NEU)

| Feature            | Web                                | Mobile                             |
| ------------------ | ---------------------------------- | ---------------------------------- |
| Barcode scannen    | Kamera via `html5-qrcode`          | Expo Camera `expo-barcode-scanner` |
| Barcode generieren | `react-barcode` Komponente         | Gleiche Lib                        |
| QR-Code drucken    | Label-Druck (Etiketten)            | —                                  |
| Scan → Item finden | Schnell-Suche über `barcode` Index | Gleich                             |
| Scan bei Inventur  | Items per Scan erfassen            | Mobil ideal                        |

### Auto-Reorder-Vorschläge (NEU)

```
Wenn: availableQuantity ≤ reorderLevel
UND: autoReorderEnabled = true
UND: defaultSupplierId gesetzt

Dann: → Benachrichtigung an Admin
      → Vorausgefüllte PO erstellen (Draft-Status)
      → reorderQuantity als vorgeschlagene Menge
      → letzten unitCost als Preisvorschlag
```

### Integration mit anderen Modulen (v2)

| Modul               | Integration                                          | v1 Status → v2                                        |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| **Procedures**      | MaterialSelector → Auto-Deduktion bei Prozedur       | ✅ → ✅ (beibehalten)                                 |
| **Treatment Plans** | MaterialSelector → Deduktion bei `completed`         | ✅ → ✅ + Stock-Reservierung bei Erstellung           |
| **Invoices**        | Inventory-Items als Rechnungsposten                  | ✅ → ✅ + Stock-Validierung                           |
| **Services**        | Default-Materialien pro Service (siehe Schema unten) | ✅ → ✅ + Schema definiert                            |
| **Dashboard**       | Low-Stock + Expiry-Widget                            | ✅ Low-Stock → ✅ + Expiry-Widget                     |
| **Appointments**    | —                                                    | ❌ → ✅ Material-Checkliste pro Termin-Typ            |
| **Lab Orders**      | —                                                    | ❌ → ✅ Lab-Material verbuchen (z.B. Abdruckmaterial) |
| **Reports**         | MaterialUsageReport                                  | ✅ → ✅ + StockValuation + ConsumptionForecast        |

#### Service Default-Materialien — `services.defaultMaterials[]`

Jeder Service kann eine Liste von Standard-Materialien definieren, die bei Durchführung
automatisch vom Inventar abgezogen werden. Das ersetzt die manuelle Material-Auswahl
in procedures und macht den Verbrauch vorhersagbar.

```typescript
// Innerhalb services Collection — embedded Array:
{
  _id: ObjectId,
  nameEn: "Composite Filling",
  nameAr: "حشوة كمبوزيت",
  // ... bestehende Felder ...

  defaultMaterials: [              // NEU: Standard-Materialien pro Service
    {
      materialId: ObjectId,         // → inventory_items._id
      materialName: String,         // Denormalisiert für schnelle Anzeige
      quantity: Number,             // Standard-Menge (z.B. 1)
      unit: String,                 // enum: piece|ml|gram|syringe|capsule|etc.
      isRequired: Boolean,          // true = wird immer abgezogen, false = optional
    }
  ],

  // Bestehend (aus Section 17):
  requiredImaging: [{ type, description, mandatory }],
}
```

**Workflow bei Prozedur:**

```
Arzt startet Procedure Note für Service "Composite Filling"
  → System lädt service.defaultMaterials[]
  → Zeigt Material-Liste an (vorausgefüllt)
  → Arzt kann Menge anpassen oder Materialien entfernen/hinzufügen
  → Bei Speichern: inventory_movements für jedes Material erstellt
  → Inventar-Bestand automatisch reduziert
```

### Reports & Analytics

| Report                 | Beschreibung                                              | v1                     |
| ---------------------- | --------------------------------------------------------- | ---------------------- |
| Material Usage         | Verbrauch nach Zeitraum, Branch, Kategorie, Bewegungstyp  | ✅                     |
| Stock Valuation        | Bestandswert nach FIFO / Weighted Average / Last Purchase | NEU                    |
| Expiry Report          | Ablaufende Items nach Zeitfenster (30/60/90 Tage)         | NEU                    |
| Consumption Forecast   | Prognoseverbrauch basierend auf `avgMonthlyUsage`         | NEU                    |
| Supplier Performance   | Ø Lieferdauer, Bestellhäufigkeit, Qualität                | NEU                    |
| Stock Movement History | Alle Bewegungen eines Items (vollständiger Audit-Trail)   | Teilweise → Verbessert |
| Purchase Order Summary | Bestellvolumen nach Supplier, Zeitraum, Status            | NEU                    |
| Low Stock Report       | Items unter Reorder-Level (alle Branches)                 | ✅ → Verbessert        |
| Dead Stock             | Items ohne Bewegung seit > 90 Tagen                       | NEU                    |
| ABC-Analyse            | Items nach Wertklasse (A=80%, B=15%, C=5%)                | NEU                    |

### Webhook-Events (Inventory)

```javascript
const INVENTORY_EVENTS = [
  'inventory.item.created',
  'inventory.item.updated',
  'inventory.low_stock', // ≤ reorderLevel
  'inventory.critical_stock', // ≤ minStockLevel (NEU)
  'inventory.out_of_stock', // = 0 (NEU)
  'inventory.expired', // Batch abgelaufen
  'inventory.expiring_soon', // < 30 Tage (NEU)
  'inventory.restocked', // Wareneingang
  'inventory.transfer.requested', // NEU
  'inventory.transfer.completed', // NEU
  'inventory.purchase_order.created', // NEU
  'inventory.purchase_order.received', // NEU
  'inventory.stock_count.completed', // NEU
  'inventory.stock_count.discrepancy', // NEU — Differenz gefunden
];
```

### RBAC für Inventory (v2)

| Permission                          | Rollen                             |
| ----------------------------------- | ---------------------------------- |
| `inventory.items.view`              | Alle Staff                         |
| `inventory.items.manage`            | admin, manager, assistant          |
| `inventory.stock.adjust`            | admin, manager                     |
| `inventory.suppliers.view`          | admin, manager, assistant          |
| `inventory.suppliers.manage`        | admin, manager                     |
| `inventory.purchase_orders.create`  | admin, manager, assistant          |
| `inventory.purchase_orders.approve` | admin, manager                     |
| `inventory.purchase_orders.receive` | admin, manager, assistant          |
| `inventory.transfers.request`       | admin, manager, assistant          |
| `inventory.transfers.approve`       | admin, manager                     |
| `inventory.stock_count.perform`     | admin, manager, assistant          |
| `inventory.stock_count.approve`     | admin (Korrekturen brauchen Admin) |
| `inventory.reports.view`            | admin, manager                     |

### v1 → v2 Zusammenfassung

| Aspekt            | v1                                | v2                                                      |
| ----------------- | --------------------------------- | ------------------------------------------------------- |
| Collections       | 7 SQL-Tabellen + 3 Integrationen  | 7 MongoDB Collections + Integrationen                   |
| UI-Seiten         | 2 (InventoryList + InventoryForm) | 17 Seiten                                               |
| Suppliers         | Schema-only, kein UI              | Volles CRUD + Bewertung                                 |
| Purchase Orders   | Schema-only, kein UI              | Vollständiger Workflow + Wareneingang + Anhänge         |
| Batch/Lot         | Spalte in movements               | Embedded in `inventory_stock.batches` + Expiry          |
| Expiry            | Hardcoded 0                       | Expiry Dashboard + Cron-Job + Alerts                    |
| Transfers         | Movement-Typen only               | Eigene `stock_transfers` Collection + Genehmigungs-Flow |
| Inventur          | Spalten only                      | Eigene `stock_counts` Collection + Genehmigungs-Flow    |
| Barcode           | Nicht existent                    | Feld + Scanner (Web + Mobile)                           |
| Bewertung         | Einzelner unit_cost               | FIFO / Weighted Average / Last Purchase                 |
| Stock-Validierung | Erlaubt negativ                   | Konfigurierbar, Default: nicht negativ                  |
| Reports           | 1 (MaterialUsage)                 | 10 Reports                                              |
| Auto-Reorder      | Nicht existent                    | Vorschläge bei Low-Stock                                |
| Item-Bilder       | Nicht existent                    | S3/R2 Upload                                            |

---

## 17. Clinical Cross-Linking: Imaging ↔ Treatments ↔ Procedures

> **Phase:** 3 (Core Clinical) | **Betrifft:** X-Rays, CBCT, Treatment Plans, Procedure Notes, Dental Charts

### v1-Analyse — Kritische Lücken

```
v1 Architektur (ISOLIERTE Silos):

patients ─────┬──── xrays              ← NUR patient_id, KEIN Link zu Treatments
              ├──── cbct_orders         ← NUR patient_id, KEIN Link zu Treatments
              ├──── treatment_plans     ← KEIN Link zu Imaging
              │       └── items         ← KEIN Link zu Imaging
              └──── procedure_notes
                      ├── treatment_plan_id      ← FK EXISTIERT, aber UI IGNORIERT es
                      └── treatment_plan_item_id  ← FK EXISTIERT, aber UI IGNORIERT es

❌ xrays ←→ treatment_plans:      KEIN FK, KEIN UI
❌ xrays ←→ procedure_notes:      KEIN FK, KEIN UI
❌ cbct_orders ←→ treatment_plans: KEIN FK, KEIN UI
❌ cbct_orders ←→ procedure_notes: KEIN FK, KEIN UI
❌ procedure_notes → treatment:    FK existiert, FormData ignoriert es
❌ Kein Cross-Module-Navigation überhaupt
```

| #   | v1 Lücke                                     | Schweregrad | Detail                                                                             |
| --- | -------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| 1   | X-Rays nicht zu Treatment Plans verlinkbar   | 🔴 Kritisch | Kein FK, kein UI — Arzt sieht nicht welches Röntgenbild zum Behandlungsplan gehört |
| 2   | X-Rays nicht zu Procedures verlinkbar        | 🔴 Kritisch | Kein FK, kein UI — Prozedur-Dokumentation ohne Bildbeleg                           |
| 3   | CBCT nicht zu Treatment Plans verlinkbar     | 🔴 Kritisch | Kein FK, kein UI — CBCT-Befund isoliert von der Behandlung                         |
| 4   | CBCT nicht zu Procedures verlinkbar          | 🔴 Kritisch | Kein FK, kein UI                                                                   |
| 5   | Procedure Notes ignorieren Treatment Plan FK | 🟡 Hoch     | `treatment_plan_id` existiert in DB, Formular sendet es nicht                      |
| 6   | Legacy `treatments.xray_urls` = TEXT[]       | 🟡 Mittel   | Nur URL-Strings, kein FK zur `xrays`-Tabelle                                       |
| 7   | Keine Cross-Module-Navigation                | 🟡 Mittel   | Von X-Ray kann man nicht zum Treatment Plan springen                               |
| 8   | `expiringSoon = 0` hardcoded für Imaging     | 🟡 Mittel   | Kein Tracking von Aufnahme-Alter                                                   |
| 9   | Imaging-Requirements nur in Tests            | 🟡 Mittel   | crossModule.test.jsx hat Platzhalter, nie implementiert                            |
| 10  | Kein Imaging in TreatmentPlanView            | 🟡 Mittel   | Verknüpfte Bilder werden nicht angezeigt                                           |

### v2 Architektur — Vollständige Vernetzung

```
v2 Architektur (VOLL VERNETZT):

patients ─────┬──── xrays ─────────────────────┐
              │       ├── treatmentPlanId ──────►│──── treatment_plans
              │       ├── procedureNoteId ──────►│──── procedure_notes
              │       ├── dentalChartEntryId ───►│──── dental_charts
              │       └── appointmentId ────────►│──── appointments
              │                                 │
              ├──── cbct_orders ────────────────┤
              │       ├── treatmentPlanId ──────►│──── treatment_plans
              │       ├── procedureNoteId ──────►│──── procedure_notes
              │       └── appointmentId ────────►│──── appointments
              │                                 │
              ├──── treatment_plans ◄───────────┤
              │       ├── linkedXrays[] ◄────────│──── xrays (many)
              │       ├── linkedCbcts[] ◄────────│──── cbct_orders (many)
              │       └── items[]
              │             └── linkedXrays[] ◄─│──── xrays (per item)
              │                                 │
              └──── procedure_notes ◄───────────┘
                      ├── treatmentPlanId ──────►  treatment_plans
                      ├── treatmentPlanItemId ──►  treatment_plans.items[]
                      ├── linkedXrays[] ◄───────  xrays (many)
                      └── linkedCbcts[] ◄───────  cbct_orders (many)
```

### MongoDB Schema-Erweiterungen

#### `xrays` Collection — Neue Felder

```javascript
{
  _id: ObjectId,
  patientId: ObjectId,           // → patients (PFLICHT)
  doctorId: ObjectId,            // → doctors
  appointmentId: ObjectId,       // → appointments
  branchId: ObjectId,            // → branches

  // *** IMAGING-DATEN ***
  xrayTypeId: ObjectId,          // → xray_types
  toothNumbers: [String],        // NEU: Array statt einzelner String (Multi-Tooth)
  imageUrl: String,              // S3/R2 Haupt-Bild
  thumbnailUrl: String,          // Auto-generiertes Thumbnail
  title: String,
  notes: String,
  capturedAt: Date,
  capturedBy: ObjectId,          // → users

  // *** NEU: CROSS-LINKS ***
  treatmentPlanId: ObjectId,     // → treatment_plans (optional)
  treatmentPlanItemId: ObjectId, // → treatment_plans.items[]._id (optional)
  procedureNoteId: ObjectId,     // → procedure_notes (optional)
  dentalChartEntryId: ObjectId,  // → dental_charts Eintrag (optional)

  // *** NEU: KLINISCHER KONTEXT ***
  clinicalPurpose: String,       // enum: diagnostic|pre_treatment|post_treatment|
                                 //       follow_up|emergency|routine_screening
  region: String,                // enum: upper_left|upper_right|lower_left|lower_right|
                                 //       full_mouth|anterior|posterior
  findings: String,              // Arzt-Befund zum Bild

  // *** NEU: VERGLEICH ***
  comparedToXrayId: ObjectId,    // → xrays (für Vorher/Nachher-Vergleich)
  comparisonNotes: String,       // Notizen zum Vergleich

  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, createdAt: -1 }
// Index: { treatmentPlanId: 1 }
// Index: { procedureNoteId: 1 }
// Index: { appointmentId: 1 }
// Index: { toothNumbers: 1 }  // Multi-key Index
```

#### `cbct_orders` Collection — Neue Felder

```javascript
{
  _id: ObjectId,
  orderNumber: String,           // Auto: CBCT-2026-001
  patientId: ObjectId,           // → patients (PFLICHT)
  requestingDoctorId: ObjectId,  // → doctors (PFLICHT)
  scanRegionId: ObjectId,        // → cbct_scan_regions
  branchId: ObjectId,            // → branches

  // *** NEU: CROSS-LINKS ***
  treatmentPlanId: ObjectId,     // → treatment_plans (optional)
  treatmentPlanItemId: ObjectId, // → treatment_plans.items[]._id (optional)
  procedureNoteId: ObjectId,     // → procedure_notes (optional)
  appointmentId: ObjectId,       // → appointments (optional)

  // *** BESTEHEND ***
  indication: String,
  clinicalNotes: String,
  priority: String,              // enum: urgent|high|normal|low
  status: String,                // enum: requested|scheduled|completed|reported|cancelled
  scheduledDate: Date,
  scheduledTime: String,
  completedAt: Date,

  // *** NEU: KLINISCHER KONTEXT ***
  clinicalPurpose: String,       // enum: implant_planning|endo_evaluation|ortho_assessment|
                                 //       tmj_evaluation|pathology|trauma|surgical_planning|other

  // Embedded Scan + Report (wenn completed)
  scan: {
    scanReferenceId: String,
    technicianId: ObjectId,
    scanLocation: String,
    thumbnailUrl: String,
    dicomPath: String,
    scanParameters: Object,
    scannedAt: Date,
    notes: String
  },

  report: {
    reportingDoctorId: ObjectId,
    findings: String,
    measurements: Object,
    recommendations: String,
    reportPdfUrl: String,
    status: String,             // enum: draft|final|amended
    reportedAt: Date
  },

  createdAt: Date,
  updatedAt: Date
}
// Index: { patientId: 1, createdAt: -1 }
// Index: { treatmentPlanId: 1 }
// Index: { procedureNoteId: 1 }
// Index: { orderNumber: 1 } unique
// Index: { status: 1, scheduledDate: 1 }
```

> **Klarstellung `cbct_reports`:** v1 hatte eine separate `cbct_reports`-Tabelle (Mig. 029).
> In v2 ist der **Report in `cbct_orders.report` embedded** (siehe `report: { ... }` oben).
> Eine eigene `cbct_reports` Collection existiert in v2 **NICHT** — der Report ist Teil
> des CBCT-Auftrags und wird dort gespeichert, sobald der Befund erstellt wird.
> Das eliminiert einen JOIN und stellt sicher, dass ein Report immer genau einem Order gehört.

#### `treatment_plans` Collection — Neue Felder

```javascript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  title: String,
  // ... bestehende Felder ...

  // *** NEU: VERKNÜPFTE IMAGING ***
  linkedXrays: [ObjectId],       // → xrays (alle Röntgenbilder die zum Plan gehören)
  linkedCbcts: [ObjectId],       // → cbct_orders (CBCT-Scans für diesen Plan)

  items: [{
    _id: ObjectId,               // Eigene ID für Referenzierung
    serviceId: ObjectId,
    toothNumber: String,
    surface: String,
    procedureName: String,
    description: String,
    cost: Number,
    sequenceOrder: Number,
    status: String,
    appointmentId: ObjectId,
    completedAt: Date,

    // *** NEU: IMAGING PRO ITEM ***
    linkedXrays: [ObjectId],     // → xrays (Bilder für diesen spezifischen Behandlungsschritt)
    linkedCbcts: [ObjectId],     // → cbct_orders (CBCT für diesen Schritt)

    // *** NEU: REQUIREMENTS ***
    requiredImaging: [{          // Was Arzt vor Durchführung sehen muss
      type: String,              // enum: xray|cbct|panoramic|periapical|bitewing
      status: String,            // enum: pending|fulfilled|waived
      fulfilledByXrayId: ObjectId,   // Welches Bild erfüllt die Anforderung
      fulfilledByCbctId: ObjectId,   // Oder welcher CBCT
      notes: String
    }],

    notes: String,
    materials: [{ /* ... MaterialSelector-Daten */ }]
  }],

  // ... restliche bestehende Felder
}
```

#### `procedure_notes` Collection — Felder TATSÄCHLICH nutzen + erweitern

```javascript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  appointmentId: ObjectId,

  // *** FIX: JETZT IM UI GENUTZT (v1 hatte FK aber UI ignorierte es) ***
  treatmentPlanId: ObjectId,     // → treatment_plans
  treatmentPlanItemId: ObjectId, // → treatment_plans.items[]._id

  // *** NEU: VERKNÜPFTE IMAGING ***
  linkedXrays: [ObjectId],       // → xrays (Bilder die bei dieser Prozedur relevant sind)
  linkedCbcts: [ObjectId],       // → cbct_orders (CBCTs die referenziert wurden)

  // *** NEU: PRE/POST IMAGING ***
  preOpXrays: [ObjectId],        // → xrays (VOR der Behandlung)
  postOpXrays: [ObjectId],       // → xrays (NACH der Behandlung / Kontrollaufnahme)

  // Bestehende Felder
  templateId: ObjectId,
  procedureName: String,
  teethInvolved: String,
  procedurePerformed: String,
  materialsUsed: String,
  anesthesiaUsed: String,
  complications: String,
  postOpInstructions: String,
  followUpRequired: Boolean,
  followUpDate: Date,
  notes: String,
  notice: String,
  teethDetails: Object,
  attachments: [Object],

  createdAt: Date,
  updatedAt: Date
}
```

### UI-Komponenten

#### `<ImagingLinker />` — Wiederverwendbare Komponente

```
┌──────────────────────────────────────────────────────┐
│  🔗 Verknüpfte Aufnahmen                    [+ Hinzufügen] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│  │ 🦷      │ │ 📷      │ │ 🔬      │                │
│  │ Peri-   │ │ Pano-   │ │ CBCT    │                │
│  │ apical  │ │ ramic   │ │ Scan    │                │
│  │ #14     │ │ Full    │ │ Upper   │                │
│  │ 15.Feb  │ │ 10.Feb  │ │ 08.Feb  │                │
│  │ [✕]     │ │ [✕]     │ │ [✕]     │                │
│  └─────────┘ └─────────┘ └─────────┘                │
│                                                      │
│  Status: 2 X-Rays + 1 CBCT verknüpft               │
└──────────────────────────────────────────────────────┘

[+ Hinzufügen] öffnet Modal:
┌──────────────────────────────────────────────────────┐
│  Aufnahme verknüpfen — Patient: Ahmed Mohamed        │
├──────────────────────────────────────────────────────┤
│  Suche: [__________________] [X-Ray ▾] [Alle Zähne ▾]│
│                                                      │
│  ☐ Periapical #14      15.Feb.2026   Dr. Sarah      │
│  ☐ Periapical #15      15.Feb.2026   Dr. Sarah      │
│  ☐ Panoramic (Full)    10.Feb.2026   Dr. Karim      │
│  ☐ Bitewing Right      08.Feb.2026   Dr. Sarah      │
│  ── CBCT Scans ──                                    │
│  ☐ CBCT Upper Jaw      08.Feb.2026   Dr. Karim      │
│  ☐ CBCT #21-25         01.Feb.2026   Dr. Karim      │
│                                                      │
│  [Nur unverknüpfte] [Nach Zahn filtern: ___]         │
│                                    [Abbrechen] [Verknüpfen] │
└──────────────────────────────────────────────────────┘
```

Dise Komponente wird verwendet in:

- `TreatmentPlanForm` — für `linkedXrays` + `linkedCbcts` auf Plan-Ebene
- `TreatmentPlanForm` → Items — für `linkedXrays` + `linkedCbcts` pro Item
- `ProcedureNoteForm` — für `linkedXrays` + `linkedCbcts` + `preOpXrays` + `postOpXrays`
- `XrayForm` — um Treatment Plan / Procedure Note zu wählen
- `CbctForm` — um Treatment Plan / Procedure Note zu wählen

#### Cross-Module-Navigation

| Von               | Navigiert zu           | UI-Element                                         |
| ----------------- | ---------------------- | -------------------------------------------------- |
| TreatmentPlanView | X-Ray Viewer           | Thumbnail-Klick → Bild-Overlay oder `/xrays/:id`   |
| TreatmentPlanView | CBCT Detail            | Link → `/cbct/:id`                                 |
| ProcedureNoteView | X-Ray Viewer           | Thumbnail-Galerie (Pre/Post-Op nebeneinander)      |
| ProcedureNoteView | CBCT Detail            | Link → `/cbct/:id`                                 |
| XrayList          | Treatment Plan         | Badge "TP #3" klickbar → `/treatment-plans/:id`    |
| XrayList          | Procedure Note         | Badge "Proc" klickbar → `/procedure-notes/:id`     |
| CbctList          | Treatment Plan         | Badge "TP #5" klickbar → `/treatment-plans/:id`    |
| PatientView       | Vernetztes Imaging-Tab | Neues Tab zeigt Timeline aller Aufnahmen mit Links |
| DentalChart       | Tooth X-Rays           | Zahn anklicken → verknüpfte X-Rays für diesen Zahn |

#### Patient Imaging Timeline (Neues Tab in PatientView)

```
┌──────────────────────────────────────────────────────────────┐
│ Patient: Ahmed Mohamed          [Imaging Timeline]           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 15. Feb 2026                                                 │
│ ├── 🦷 Periapical #14  ──────► TP: "Implant Plan #14"       │
│ │                               Proc: "Crown Prep #14"      │
│ ├── 🦷 Periapical #15  ──────► TP: "Root Canal #15"         │
│                                                              │
│ 10. Feb 2026                                                 │
│ ├── 📷 Panoramic (Full) ─────► TP: "Full Rehab Plan"        │
│                                                              │
│ 08. Feb 2026                                                 │
│ ├── 🔬 CBCT Upper Jaw  ──────► TP: "Implant Plan #14"       │
│ │                               Purpose: implant_planning    │
│ ├── 🦷 Bitewing Right  ──────► (nicht verknüpft)             │
│                                                              │
│ 01. Feb 2026                                                 │
│ └── 🔬 CBCT #21-25     ──────► TP: "Bridge Plan #21-25"     │
│                                                              │
│ Filter: [Alle ▾] [Alle Zähne ▾] [Alle Ärzte ▾]              │
│ [Nur verknüpfte] [Nur unverknüpfte]                          │
└──────────────────────────────────────────────────────────────┘
```

### Imaging Requirements (Automatische Prüfung)

```javascript
// Service → Required Imaging Mapping (Konfigurierbar pro Tenant)
// In `services` Collection:
{
  _id: ObjectId,
  nameEn: "Dental Implant",
  // ... andere Felder ...

  requiredImaging: [
    { type: 'cbct', description: 'CBCT Scan of implant region', mandatory: true },
    { type: 'panoramic', description: 'Panoramic X-Ray', mandatory: true },
    { type: 'periapical', description: 'Periapical of target tooth', mandatory: false }
  ]
}

// Wenn ein Treatment Plan Item diesen Service nutzt:
// → System prüft ob Patient passende Aufnahmen hat
// → Wenn nicht: Warning Badge "⚠ CBCT erforderlich"
// → Arzt kann "waive" klicken (mit Begründung)
```

**Workflow:**

```
Arzt erstellt Treatment Plan Item (z.B. "Implant #14")
  → System prüft: Service "Dental Implant" braucht CBCT + Panoramic
  → Prüft: Hat Patient #14 CBCT? → Ja → Status: fulfilled
  → Prüft: Hat Patient Panoramic? → Nein → Status: pending
  → UI zeigt: ⚠ "Panoramic X-Ray fehlt für Implant #14"
  → Arzt-Optionen:
      [Jetzt anfordern] → Erstellt X-Ray Auftrag
      [Vorhandenes verknüpfen] → Öffnet ImagingLinker
      [Überspringen] → Markiert als "waived" mit Grund
```

### Pre/Post-Op Imaging (Vorher/Nachher)

```
┌──────────────────────────────────────────────────────────────┐
│ Procedure Note: Crown Prep #14 — Dr. Sarah                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Pre-Op Aufnahmen          │  Post-Op Aufnahmen               │
│ ┌─────────────────────┐   │  ┌─────────────────────┐        │
│ │                     │   │  │                     │        │
│ │   Periapical #14    │   │  │   Periapical #14    │        │
│ │   (vor Behandlung)  │   │  │   (Kontrollaufnahme)│        │
│ │   15.Feb 09:30      │   │  │   15.Feb 11:15      │        │
│ │                     │   │  │                     │        │
│ └─────────────────────┘   │  └─────────────────────┘        │
│                           │                                  │
│ [Vergleichen]  ←── Öffnet Side-by-Side Viewer               │
└──────────────────────────────────────────────────────────────┘
```

Das `preOpXrays` / `postOpXrays` Array in `procedure_notes` ermöglicht:

- Arzt dokumentiert vorab welche Bilder er gesehen hat
- Nach Behandlung: Kontrollaufnahme direkt verknüpfen
- Side-by-Side-Vergleich im Viewer
- Audit-Trail: Welche Diagnostik lag der Behandlung zugrunde

### Dental Chart Integration

```javascript
// Beim Klick auf einen Zahn im Dental Chart:
// → Sidebar zeigt ALLE verknüpften Daten für diesen Zahn:

{
  toothNumber: '14',
  xrays: [/* Alle X-Rays mit toothNumbers.includes('14') */],
  cbcts: [/* CBCTs die Region dieses Zahns abdecken */],
  treatmentPlans: [/* Plans mit items[].toothNumber === '14' */],
  procedureNotes: [/* Notes mit teethInvolved includes '14' */],
  labOrders: [/* Lab Orders für diesen Zahn */]
}

// UI: Klick auf Zahn #14 zeigt:
// 📷 2 X-Rays | 🔬 1 CBCT | 📋 1 Treatment Plan | 📝 2 Procedures
// Jeweils klickbar → Navigation zur Detail-Ansicht
```

### API Endpoints (Fastify)

```
// Cross-Linking
POST   /api/:tenantSlug/xrays/:id/link        { treatmentPlanId, procedureNoteId }
DELETE /api/:tenantSlug/xrays/:id/unlink       { treatmentPlanId, procedureNoteId }
POST   /api/:tenantSlug/cbct/:id/link          { treatmentPlanId, procedureNoteId }
DELETE /api/:tenantSlug/cbct/:id/unlink        { treatmentPlanId, procedureNoteId }

// Aggregation
GET    /api/:tenantSlug/patients/:id/imaging-timeline
GET    /api/:tenantSlug/treatment-plans/:id/imaging
GET    /api/:tenantSlug/procedure-notes/:id/imaging
GET    /api/:tenantSlug/teeth/:toothNumber/imaging   { patientId }

// Imaging Requirements
GET    /api/:tenantSlug/treatment-plans/:id/imaging-requirements
POST   /api/:tenantSlug/treatment-plans/:id/items/:itemId/waive-imaging
```

### Webhook-Events (neu)

```javascript
const IMAGING_LINK_EVENTS = [
  'xray.linked_to_treatment_plan',
  'xray.linked_to_procedure',
  'cbct.linked_to_treatment_plan',
  'cbct.linked_to_procedure',
  'imaging.requirement_fulfilled', // Alle erforderlichen Aufnahmen vorhanden
  'imaging.requirement_waived', // Arzt hat Imaging-Pflicht übersprungen
  'imaging.pre_post_comparison', // Pre/Post Bilder beide verknüpft
];
```

### v1 → v2 Zusammenfassung

| Aspekt                     | v1                              | v2                                                               |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| X-Ray → Treatment Plan     | ❌ Kein Link                    | ✅ `treatmentPlanId` + `linkedXrays[]` (bidirektional)           |
| X-Ray → Procedure Note     | ❌ Kein Link                    | ✅ `procedureNoteId` + `linkedXrays[]` (bidirektional)           |
| CBCT → Treatment Plan      | ❌ Kein Link                    | ✅ `treatmentPlanId` + `linkedCbcts[]` (bidirektional)           |
| CBCT → Procedure Note      | ❌ Kein Link                    | ✅ `procedureNoteId` + `linkedCbcts[]` (bidirektional)           |
| Procedure → Treatment Plan | FK existiert, UI ignoriert      | ✅ FK + UI (`treatmentPlanId` Selector)                          |
| Cross-Navigation           | ❌ Nicht existent               | ✅ Klickbare Badges + Links in allen Ansichten                   |
| Imaging pro Zahn           | ❌ Nicht existent               | ✅ Dental Chart → Zahn → alle verknüpften Bilder                 |
| Imaging Requirements       | ❌ Nur in Tests                 | ✅ Service → Required Imaging + Auto-Check                       |
| Pre/Post-Op Imaging        | ❌ Nicht existent               | ✅ `preOpXrays[]` + `postOpXrays[]` + Side-by-Side               |
| Imaging Timeline           | ❌ Nicht existent               | ✅ Neues Tab in PatientView mit chronologischer Übersicht        |
| ImagingLinker UI           | ❌ Nicht existent               | ✅ Wiederverwendbare Komponente in 5+ Formularen                 |
| Tooth → X-Rays             | Einzelner String `tooth_number` | ✅ Array `toothNumbers[]` + Multi-Key Index                      |
| Klinischer Zweck           | ❌ Nicht existent               | ✅ `clinicalPurpose` Enum (diagnostic, pre/post-treatment, etc.) |
| Vorher/Nachher-Vergleich   | ❌ Nicht existent               | ✅ `comparedToXrayId` + Comparison Viewer                        |

---

## 18. Walk-in Queue & Daily Operations Hub

### v1-Analyse

| Aspekt                     | v1-Status                                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WalkInQueue.jsx**        | 1317 Zeilen, Combined View (Walk-ins + Today's Appointments), 3 Tabs, 6 Stat Cards                                                                                                            |
| **walk_in_queue Tabelle**  | id, branch_id, patient_id, queue_number, priority, status, assigned_doctor_id, chair_id, check_in/called/started/completed times                                                              |
| **queue_counters Tabelle** | Atomarer Daily Counter pro Branch (branch_id + date + last_number)                                                                                                                            |
| **chairs Tabelle**         | id, branch_id, name_en, name_ar, chair_number, chair_type (standard/pediatric/surgery/hygiene)                                                                                                |
| **DB-Funktionen**          | `get_next_queue_number()`, `calculate_estimated_wait()`, `check_chair_availability()`, `get_available_chairs()`, `get_branch_chair_overview()` — **KEINE davon wird vom Frontend aufgerufen** |
| **appointment_waitlist**   | Tabelle existiert in DB, **KEIN Frontend**                                                                                                                                                    |
| **Real-Time**              | ❌ 30-Sekunden-Polling statt WebSocket                                                                                                                                                        |
| **Walk-in ↔ Appointment**  | ❌ Komplett getrennte Systeme, Walk-in wird nie zum Appointment                                                                                                                               |
| **arrivedAt**              | ❌ Kein Timestamp auf Appointments — man weiß nicht ob Patient tatsächlich kam                                                                                                                |
| **Appointment Status**     | Duale konfl. Schemas (001 vs 002 Migration): `status` vs `appointment_status`, verschiedene Enum-Werte                                                                                        |
| **Dashboard Integration**  | ❌ Dashboard zeigt nur Appointment-Count, kein Walk-in-Widget                                                                                                                                 |

### v1-Probleme (werden in v2 gelöst)

1. **Isolierte Systeme**: Walk-ins und Appointments sind getrennt — Rezeptionist muss zwei Listen verwalten
2. **Kein Arrival-Tracking**: Für Termine existiert kein `arrivedAt`-Feld. Man kann nicht nachvollziehen ob ein Patient tatsächlich erschienen ist
3. **Unused DB Functions**: 5 Chair/Wait-Funktionen existieren in der DB aber werden nie vom Frontend aufgerufen
4. **Polling statt Real-Time**: 30s Auto-Refresh verursacht unnötige DB-Last und zeigt veraltete Daten
5. **Kein Walk-in → Appointment**: Walk-in-Patient kann nicht automatisch zum Termin konvertiert werden
6. **Waitlist ohne UI**: `appointment_waitlist`-Tabelle existiert aber hat kein Frontend
7. **Chair-Dashboard fehlt**: `get_branch_chair_overview()` gibt Chair-Status zurück, aber es gibt keine UI dafür

### v2-Konzept: Unified Daily Operations Hub

**Eine einzige Seite** für den gesamten Tagesbetrieb:

- Alle heutigen Termine (scheduled, confirmed, arrived, in_chair, completed, no_show)
- Alle Walk-in-Patienten (mit Queue-Nummer)
- Warteraum-Übersicht (wer wartet, wie lange)
- Chair-Belegung (welcher Stuhl ist frei/belegt)

### Patient-Flow (v2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SCHEDULED APPOINTMENT                              │
│                                                                         │
│  1. Termin gebucht (status: scheduled)                                  │
│  2. Tag des Termins: erscheint im Daily Hub                             │
│  3. Patient kommt an → Rezeptionist klickt "Arrived"                    │
│     → arrivedAt = now(), status = arrived, queueNumber zugewiesen       │
│  4. Patient wartet im Warteraum (sichtbar in Waiting-Tab)               │
│  5. Arzt ruft auf → "Call Patient" → status = called                    │
│  6. Chair zuweisen → chairId = X → status = in_chair                   │
│  7. Behandlung abgeschlossen → status = completed, completedAt = now()  │
│                                                                         │
│  ALT: Patient kommt NICHT → Rezeptionist klickt "No Show"               │
│     → status = no_show, kein arrivedAt                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         WALK-IN PATIENT                                 │
│                                                                         │
│  1. Patient erscheint ohne Termin                                       │
│  2. Rezeptionist klickt "New Walk-in"                                   │
│     → Name, Telefon, Grund eingeben (oder bestehenden Patient suchen)   │
│     → queueNumber automatisch (atomarer Counter pro Branch/Tag)         │
│     → status = waiting, priority = normal                               │
│  3. Patient wartet (Warteraum-Tab)                                      │
│  4. Arzt ruft auf → "Call Patient" → status = called                    │
│  5. Chair zuweisen → chairId = X → status = in_chair                   │
│  6. OPTIONAL: Walk-in → Appointment konvertieren (für Dokumentation)    │
│  7. Behandlung abgeschlossen → status = completed                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### MongoDB Collections

#### `walk_in_queue` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,                      // Pflicht
  queueNumber: Number,                     // Auto-generiert, pro Branch/Tag
  date: "2026-03-15",                      // ISO-Datum (für Counter-Reset)

  // Patient-Daten
  patientId: ObjectId | null,              // Link zu Patient (optional bei Erstbesuch)
  patientName: String,                     // Pflicht (auch wenn patientId vorhanden)
  phone: String | null,                    // Für Rückruf
  reason: String | null,                   // Grund des Besuchs

  // Triage
  priority: "low" | "normal" | "high" | "emergency",   // Default: normal
  chiefComplaint: String | null,           // NEU: Kurzbeschreibung der Beschwerde

  // Assignment
  assignedDoctorId: ObjectId | null,       // Zugewiesener Arzt
  chairId: ObjectId | null,                // Zugewiesener Stuhl

  // Status-Flow
  status: "waiting" | "called" | "in_chair" | "completed" | "cancelled" | "no_show",
  // waiting   → Patient wartet
  // called    → Arzt hat aufgerufen
  // in_chair  → Patient sitzt im Stuhl, Behandlung läuft
  // completed → Fertig
  // cancelled → Abgebrochen (Patient geht vor Aufruf)
  // no_show   → Patient hat sich registriert aber ist verschwunden

  // Timestamps
  checkInAt: Date,                         // Eincheckzeit (Erstellung)
  calledAt: Date | null,                   // Wann aufgerufen
  inChairAt: Date | null,                  // Wann in Stuhl gesetzt
  completedAt: Date | null,               // Wann abgeschlossen
  cancelledAt: Date | null,               // NEU

  // Wait-Time (berechnet)
  estimatedWaitMinutes: Number | null,     // Geschätzt bei Check-in
  actualWaitMinutes: Number | null,        // Berechnet: calledAt - checkInAt

  // Konvertierung
  convertedToAppointmentId: ObjectId | null,  // NEU: Walk-in → Appointment
  convertedAt: Date | null,                   // NEU

  // Meta
  notes: String | null,
  createdBy: ObjectId,                     // User der den Walk-in registriert hat
  tenantId: String,
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
{ branchId: 1, date: 1, status: 1 }       // Daily Hub Hauptabfrage
{ branchId: 1, date: 1, queueNumber: 1 }  // Unique pro Branch/Tag
{ patientId: 1, date: 1 }                 // Patient-Suche
{ status: 1, priority: -1, checkInAt: 1 } // Warteraum-Sortierung (Prio > Zeit)
```

#### `queue_counters` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,
  date: "2026-03-15",         // ISO-Datum
  lastNumber: Number,         // Atomarer Counter (findOneAndUpdate mit $inc)
  tenantId: String,
}

// Unique Index
{ branchId: 1, date: 1 }     // Ein Counter pro Branch/Tag
```

#### `chairs` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,                      // Pflicht
  name: { en: "Chair 1", ar: "كرسي 1" },  // i18n
  chairNumber: Number,                     // Sortierung
  chairType: "standard" | "pediatric" | "surgery" | "hygiene",
  floor: String | null,                    // NEU: Stockwerk/Bereich
  isActive: Boolean,                       // Default: true
  notes: String | null,                    // z.B. "Nur für Implantate"
  tenantId: String,
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
{ branchId: 1, isActive: 1, chairNumber: 1 }   // Chair-Übersicht
{ branchId: 1, chairNumber: 1 }                 // Unique pro Branch
```

#### Appointments Collection — Neue Felder (Ergänzung zu bestehender Schema)

```typescript
// Zusätzliche Felder auf der bestehenden appointments Collection:
{
  // ... bestehende Felder ...

  // NEU: Arrival Tracking
  arrivedAt: Date | null,                  // Wann Patient tatsächlich ankam
  arrivalStatus: "pending" | "arrived" | "no_show" | "late",
  // pending  → Termin ist heute, Patient noch nicht da
  // arrived  → Patient ist eingetroffen
  // no_show  → Patient nicht erschienen (manuell vom Rezeptionist/Auto nach X Min.)
  // late     → Patient kam, aber >15 Min zu spät

  // NEU: Queue Integration
  queueNumber: Number | null,             // Zugewiesen wenn Patient "arrived"
  chairId: ObjectId | null,              // Zugewiesener Stuhl (v1 hatte chair_id, aber nicht genutzt)
  queueStatus: "waiting" | "called" | "in_chair" | "completed",
  // Nur relevant wenn arrivalStatus = "arrived"

  calledAt: Date | null,                  // Arzt hat aufgerufen
  inChairAt: Date | null,                // In Stuhl gesetzt
  completedAt: Date | null,              // v1 hatte nur "completed" status, kein Timestamp

  // NEU: No-Show Tracking
  noShowAt: Date | null,                  // Wann als No-Show markiert
  noShowReason: String | null,            // Optional: Grund
  noShowNotified: Boolean,                // Patient wurde benachrichtigt
}
```

### Next Queue Number (Atomarer Counter)

```typescript
// Fastify Service: getNextQueueNumber
async function getNextQueueNumber(branchId: string, date: string): Promise<number> {
  const db = getTenantDb(tenantId);
  const result = await db
    .collection('queue_counters')
    .findOneAndUpdate(
      { branchId: new ObjectId(branchId), date },
      { $inc: { lastNumber: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
  return result.lastNumber;
}
// Garantiert unique, race-condition-safe durch MongoDB atomic $inc
```

### Chair-Verfügbarkeit (Real-Time)

```typescript
// GET /api/chairs/availability?branchId=xxx&date=2026-03-15
async function getChairAvailability(branchId: string, date: string) {
  const chairs = await db
    .collection('chairs')
    .find({
      branchId: new ObjectId(branchId),
      isActive: true,
    })
    .sort({ chairNumber: 1 })
    .toArray();

  // Aktuelle Belegung: Walk-ins + Appointments die "in_chair" sind
  const walkInOccupied = await db
    .collection('walk_in_queue')
    .find({
      branchId: new ObjectId(branchId),
      date,
      status: 'in_chair',
      chairId: { $ne: null },
    })
    .toArray();

  const appointmentOccupied = await db
    .collection('appointments')
    .find({
      branchId: new ObjectId(branchId),
      date: { $gte: dayStart, $lte: dayEnd },
      queueStatus: 'in_chair',
      chairId: { $ne: null },
    })
    .toArray();

  return chairs.map((chair) => ({
    ...chair,
    occupied:
      walkInOccupied.some((w) => w.chairId.equals(chair._id)) ||
      appointmentOccupied.some((a) => a.chairId.equals(chair._id)),
    currentPatient: findCurrentPatient(chair._id, walkInOccupied, appointmentOccupied),
  }));
}
```

### Daily Operations Hub — UI-Aufbau

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DAILY OPERATIONS HUB                          📅 15 März 2026  🏥 Branch: Main │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Scheduled│ │ Arrived  │ │ Waiting  │ │ In Chair │ │Completed │ │ No-Show  │ │
│  │    12    │ │    8     │ │    3     │ │    4     │ │    5     │ │    1     │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                                 │
│  [All Today]  [Scheduled]  [Walk-ins]  [Waiting Room]  [In Chair]               │
│  ─────────────────────────────────────────────────────────────────               │
│                                                                                 │
│  Tab: ALL TODAY                                                                 │
│  ┌─────┬──────────┬──────────┬────────┬────────┬────────┬──────────┬──────────┐ │
│  │ #   │ Patient  │ Type     │ Time   │ Doctor │ Chair  │ Status   │ Actions  │ │
│  ├─────┼──────────┼──────────┼────────┼────────┼────────┼──────────┼──────────┤ │
│  │ --  │ Ahmed M. │ 🗓 Appt  │ 09:00  │ Dr. S  │   --   │ Pending  │ [Arrived]│ │
│  │ 001 │ Sara K.  │ 🗓 Appt  │ 09:30  │ Dr. S  │ Ch. 2  │ In Chair │ [Done]   │ │
│  │ 002 │ Omar H.  │ 🚶Walk-in│ 09:45  │   --   │   --   │ Waiting  │ [Call]   │ │
│  │ 003 │ Mona A.  │ 🗓 Appt  │ 10:00  │ Dr. L  │   --   │ Arrived  │ [Call]   │ │
│  │ --  │ Khaled F.│ 🗓 Appt  │ 10:30  │ Dr. S  │   --   │ Pending  │ [Arrived]│ │
│  │ 004 │ Youssef  │ 🚶Walk-in│ 10:15  │   --   │   --   │ Waiting  │ [Call]   │ │
│  └─────┴──────────┴──────────┴────────┴────────┴────────┴──────────┴──────────┘ │
│                                                                                 │
│  CHAIR OVERVIEW                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ 🟢 Chair 1   │ │ 🔴 Chair 2   │ │ 🟢 Chair 3   │ │ 🔴 Chair 4   │           │
│  │   Available  │ │  Sara K.     │ │   Available  │ │  Nadia R.    │           │
│  │              │ │  Dr. Samy    │ │              │ │  Dr. Layla   │           │
│  │              │ │  ⏱ 25 min    │ │              │ │  ⏱ 10 min    │           │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                                 │
│  [+ New Walk-in]                                                    [🔄 Live]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Tabs im Detail

| Tab              | Zeigt                                                                   | Sortierung                                     |
| ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| **All Today**    | Alle Appointments + Walk-ins des Tages, gemischt                        | Chronologisch (Termin-Zeit oder Check-in-Zeit) |
| **Scheduled**    | Nur Appointments mit `arrivalStatus = pending` (noch nicht da)          | Nach Termin-Zeit                               |
| **Walk-ins**     | Nur Walk-in-Queue-Einträge des Tages                                    | Nach Queue-Nummer                              |
| **Waiting Room** | Appointments (arrived) + Walk-ins (waiting/called) — wer aktuell wartet | Priorität DESC, dann Wartezeit ASC             |
| **In Chair**     | Alle die gerade behandelt werden (queueStatus/status = in_chair)        | Nach Chair-Nummer                              |

### Actions pro Status

| Aktueller Status         | Verfügbare Actions          | Nächster Status              |
| ------------------------ | --------------------------- | ---------------------------- |
| **Appointment: pending** | [Arrived] [No Show]         | arrived / no_show            |
| **Appointment: arrived** | [Call] [Cancel]             | called (→ waiting tab)       |
| **Walk-in: waiting**     | [Call] [Cancel]             | called                       |
| **called**               | [Assign Chair ▼]            | in_chair (→ Chair-Übersicht) |
| **in_chair**             | [Complete] [Transfer Chair] | completed                    |
| **completed**            | -- (nur Anzeige)            | --                           |

### Assignment Modal (bei "Assign Chair")

```
┌──────────────────────────────────────┐
│  Assign to Chair                     │
│                                      │
│  Patient: Sara K. (#001)             │
│  Doctor:  [Dr. Samy ▼]              │
│                                      │
│  Available Chairs:                   │
│  ○ Chair 1 (Standard) 🟢            │
│  ○ Chair 3 (Standard) 🟢            │
│  ◉ Chair 5 (Surgery)  🟢            │
│                                      │
│  Unavailable:                        │
│  ● Chair 2 — Sara K. (Dr. Samy)     │
│  ● Chair 4 — Nadia R. (Dr. Layla)   │
│                                      │
│  [Cancel]            [Assign Chair]  │
└──────────────────────────────────────┘
```

### Walk-in → Appointment Konvertierung

```typescript
// Wenn ein Walk-in-Patient behandelt wird, kann optional ein Appointment erstellt werden:
// 1. Walk-in hat patientId → Appointment für diesen Patient
// 2. Walk-in hat KEIN patientId → Erst Patient anlegen, dann Appointment

// POST /api/walk-ins/:id/convert-to-appointment
{
  patientId: "...",           // Pflicht (ggf. vorher Patient erstellen)
  doctorId: "...",           // Behandelnder Arzt
  serviceIds: ["..."],       // Durchgeführte Leistungen
  notes: "Walk-in converted" // Notiz
}
// → Erstellt Appointment mit appointmentType: "walk_in_converted"
// → Setzt walk_in_queue.convertedToAppointmentId
```

### Real-Time via Socket.io

```typescript
// Server: Bei jeder Statusänderung
socket.to(`branch:${branchId}:daily-ops`).emit('queue:update', {
  type: 'walk_in_status_changed' | 'appointment_arrived' | 'chair_assigned' | 'chair_freed',
  data: { ... }
});

// Client: Daily Operations Hub subscribed den Room
socket.emit('join', { room: `branch:${branchId}:daily-ops` });

socket.on('queue:update', (event) => {
  // Automatisches UI-Update ohne Polling
  // → SWR/React Query invalidation oder Zustand-Update
});

// Events:
// - walk_in_created         → Neuer Walk-in erscheint
// - walk_in_status_changed  → Status-Update (waiting → called → in_chair → completed)
// - appointment_arrived     → Termin-Patient ist angekommen
// - appointment_no_show     → No-Show markiert
// - chair_assigned          → Chair-Übersicht aktualisieren
// - chair_freed             → Chair wird wieder grün
// - queue_stats_updated     → Stat-Cards aktualisieren
```

### Estimated Wait Time (v2 — tatsächlich implementiert)

```typescript
// v1 hatte calculate_estimated_wait() in DB — wurde NIE aufgerufen
// v2: Einfache Berechnung basierend auf aktueller Warteschlange

function calculateEstimatedWait(branchId: string): number {
  const waitingCount = // Anzahl Patienten vor diesem in der Queue
    walkIns.filter((w) => w.status === 'waiting').length +
    appointments.filter((a) => a.arrivalStatus === 'arrived' && a.queueStatus === 'waiting').length;

  const activeChairs = chairs.filter((c) => c.isActive).length;
  const avgTreatmentMinutes = 30; // Default, später aus historischen Daten

  return Math.ceil((waitingCount / activeChairs) * avgTreatmentMinutes);
}
// Wird bei jedem Check-in/Arrival berechnet und im Entry gespeichert
```

### Auto-No-Show (BullMQ Job)

```typescript
// Delayed Job: Wenn Appointment 30 Min. nach Termin-Zeit noch "pending"
// → Automatisch als "no_show" markieren (konfigurierbar pro Tenant)

// Tenant Settings:
{
  autoNoShowMinutes: 30,        // Default: 30 Min nach Termin-Zeit
  autoNoShowEnabled: true,      // Kann deaktiviert werden
  noShowNotification: true,     // Patient per SMS/Email benachrichtigen
}
```

### API Endpoints

| Method | Route                                      | Beschreibung                                                           |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| GET    | `/api/daily-ops?branchId=X&date=Y`         | Unified: Alle Appointments + Walk-ins des Tages + Chair-Status         |
| POST   | `/api/walk-ins`                            | Neuer Walk-in (auto Queue-Nummer)                                      |
| PATCH  | `/api/walk-ins/:id/status`                 | Status ändern (call, assign-chair, complete, cancel, no-show)          |
| PATCH  | `/api/walk-ins/:id/assign`                 | Doctor + Chair zuweisen                                                |
| POST   | `/api/walk-ins/:id/convert-to-appointment` | Walk-in → Appointment konvertieren                                     |
| PATCH  | `/api/appointments/:id/arrive`             | Termin-Patient ist angekommen (arrivedAt + queueNumber)                |
| PATCH  | `/api/appointments/:id/no-show`            | Termin-Patient als No-Show markieren                                   |
| PATCH  | `/api/appointments/:id/call`               | Patient aufrufen                                                       |
| PATCH  | `/api/appointments/:id/assign-chair`       | Chair zuweisen                                                         |
| PATCH  | `/api/appointments/:id/complete-visit`     | Besuch abschließen                                                     |
| GET    | `/api/chairs/availability?branchId=X`      | Chair-Belegung (Real-Time)                                             |
| GET    | `/api/queue/stats?branchId=X&date=Y`       | Stat-Cards (Scheduled, Arrived, Waiting, In Chair, Completed, No-Show) |

### RBAC Permissions

| Permission                 | Wer                         | Beschreibung                                      |
| -------------------------- | --------------------------- | ------------------------------------------------- |
| `daily_ops.view`           | Receptionist, Doctor, Admin | Hub ansehen                                       |
| `daily_ops.manage_walkins` | Receptionist, Admin         | Walk-ins erstellen/bearbeiten                     |
| `daily_ops.mark_arrival`   | Receptionist, Admin         | Appointment als "arrived" markieren               |
| `daily_ops.mark_no_show`   | Receptionist, Admin         | Patient als No-Show markieren                     |
| `daily_ops.call_patient`   | Doctor, Receptionist, Admin | Patient aufrufen                                  |
| `daily_ops.assign_chair`   | Receptionist, Admin         | Chair zuweisen                                    |
| `daily_ops.complete_visit` | Doctor, Admin               | Besuch abschließen                                |
| `daily_ops.manage_chairs`  | Admin                       | Chairs CRUD (erstellen, bearbeiten, deaktivieren) |
| `daily_ops.convert_walkin` | Receptionist, Admin         | Walk-in → Appointment konvertieren                |
| `daily_ops.view_stats`     | Doctor, Receptionist, Admin | Statistiken ansehen                               |

### Webhook Events

| Event                         | Trigger                           |
| ----------------------------- | --------------------------------- |
| `walk_in.created`             | Neuer Walk-in registriert         |
| `walk_in.called`              | Patient aufgerufen                |
| `walk_in.in_chair`            | Patient in Stuhl gesetzt          |
| `walk_in.completed`           | Walk-in abgeschlossen             |
| `walk_in.converted`           | Walk-in → Appointment konvertiert |
| `appointment.arrived`         | Termin-Patient eingetroffen       |
| `appointment.no_show`         | No-Show markiert                  |
| `appointment.in_chair`        | In Chair gesetzt                  |
| `appointment.visit_completed` | Besuch abgeschlossen              |
| `chair.assigned`              | Chair zugewiesen                  |
| `chair.freed`                 | Chair frei geworden               |
| `queue.stats_updated`         | Tagesstatistik geändert           |

### Dashboard Widget

```
┌──────────────────────────────────┐
│  🏥 Waiting Room    [View Hub →] │
│                                  │
│  👥 3 Waiting  │  🪑 2/6 Chairs  │
│  ⏱ ~15 min avg │  ✅ 5 Done      │
│  🚶 1 Walk-in  │  ❌ 1 No-Show   │
│                                  │
│  Next: Omar H. (Walk-in #002)   │
└──────────────────────────────────┘
```

### v1 → v2 Vergleich

| Aspekt                   | v1                                | v2                                                |
| ------------------------ | --------------------------------- | ------------------------------------------------- |
| Walk-in + Appointments   | Getrennte Systeme                 | ✅ Unified Daily Operations Hub                   |
| Arrival Tracking         | ❌ Kein `arrivedAt`               | ✅ `arrivedAt` + `arrivalStatus` auf Appointments |
| Queue-Nummer für Termine | ❌ Nur Walk-ins                   | ✅ Auch Termine bekommen Queue-Nr. bei Ankunft    |
| Chair-Dashboard          | DB-Funktionen existieren, kein UI | ✅ Real-Time Chair-Übersicht mit Belegungsstatus  |
| Wait-Time-Berechnung     | DB-Funktion nie aufgerufen        | ✅ Tatsächlich berechnet und angezeigt            |
| Real-Time                | 30s Polling                       | ✅ Socket.io (instant Updates)                    |
| Walk-in → Appointment    | ❌ Nicht möglich                  | ✅ Konvertierung mit einem Klick                  |
| No-Show-Tracking         | ❌ Kein Timestamp/Reason          | ✅ `noShowAt` + `noShowReason` + Auto-No-Show     |
| Auto-No-Show             | ❌ Nicht existent                 | ✅ BullMQ Job nach konfigurierbarer Zeit          |
| Waitlist                 | DB-Tabelle ohne UI                | ✅ In Queue-System integriert                     |
| Dashboard Widget         | Nur Appointment-Count             | ✅ Waiting Room Widget mit Live-Daten             |
| Chief Complaint          | ❌ Nur "reason" Text              | ✅ `chiefComplaint` für Triage                    |
| Chair-Floor/Bereich      | ❌ Nicht existent                 | ✅ `floor` Feld für große Kliniken                |
| Sortierung Warteraum     | Nur nach Check-in-Zeit            | ✅ Priority DESC → Wartezeit ASC                  |

---

## 19. Recurring Appointments (Termin-Serien)

### v1-Analyse

| Aspekt                  | v1-Status                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Migration 016**       | 6 Spalten direkt auf `appointments` (`is_recurring`, `recurrence_pattern`, `recurrence_end_date`, `recurrence_count`, `recurrence_parent_id`, `recurrence_days_of_week`) |
| **Migration 024**       | Separate `recurring_appointment_rules` Tabelle (patient_id, doctor_id, recurrence_type inkl. quarterly/biannual/annual) — **KOMPLETT UNGENUTZT**                         |
| **Stored Functions**    | `generate_recurring_appointments()` (max 52 Iterationen), `cancel_recurring_appointments()`                                                                              |
| **View**                | `recurring_appointment_series` (Parent + Counts) — **nie im Frontend genutzt**                                                                                           |
| **AppointmentForm.jsx** | ✅ Checkbox „Make recurring", Pattern-Dropdown, Day-Buttons, Count — aber **nur für neue Termine**                                                                       |
| **Serien-Management**   | ❌ KEIN UI zum Ansehen/Bearbeiten/Stornieren einer Serie                                                                                                                 |
| **Kalender**            | ❌ Keine visuelle Kennzeichnung von Serien-Terminen                                                                                                                      |
| **Listen**              | ❌ Keine Badges/Filter für Recurring                                                                                                                                     |
| **Cancel Series**       | DB-Funktion existiert, **wird nie vom Frontend aufgerufen**                                                                                                              |
| **Conflict-Check**      | ❌ Keine Überschneidungsprüfung beim Generieren (UNIQUE INDEX kann still fehlschlagen)                                                                                   |
| **Fehlerbehandlung**    | Fragil: RPC-Fehler wird still geschluckt, User sieht „Success" auch wenn Serie nicht erstellt wurde                                                                      |

### v1-Probleme (werden in v2 gelöst)

1. **Zwei konkurrierende Designs**: Migration 016 (Spalten auf appointments) vs. Migration 024 (eigene `recurring_appointment_rules` Tabelle) — Frontend nutzt nur 016, Tabelle aus 024 ist tote Schema-Infrastruktur
2. **Kein Serien-Management**: Nach Erstellung gibt es keine Möglichkeit, eine Serie zu sehen, zu editieren oder zu stornieren
3. **Keine visuelle Kennzeichnung**: Kalender und Listen zeigen nicht an, welche Termine Teil einer Serie sind
4. **Keine Conflict-Prüfung**: `generate_recurring_appointments()` prüft nicht auf Terminüberschneidungen
5. **Fragile Fehlerbehandlung**: RPC-Fehler werden verschluckt → User weiß nicht, ob Serie erzeugt wurde
6. **Kein Edit this/all**: Es gibt keine „Edit this occurrence" vs. „Edit all future" Logik
7. **Kein Link zur Rules-Tabelle**: `appointments.recurring_rule_id` existiert, wird aber nie gesetzt

### v2-Konzept: Sauberes Recurring-System

**Ein einziges Design** statt zwei konkurrierende:

- `recurring_rules` Collection definiert die Wiederholungsregel
- `appointments` verweisen auf die Rule via `recurringRuleId`
- Vollständiges UI: Erstellen, Ansehen, Bearbeiten (einzeln/alle), Stornieren, Pausieren
- Conflict-Check vor Generierung
- Visuelle Kennzeichnung in Kalender und Listen

### MongoDB Collections

#### `recurring_rules` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,
  branchId: ObjectId,                      // Pflicht
  patientId: ObjectId,                     // Pflicht
  doctorId: ObjectId,                      // Pflicht
  serviceId: ObjectId | null,             // Optional: Welche Leistung

  // Wiederholungsmuster
  recurrenceType: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannual" | "annual",

  // Zeitliche Parameter
  preferredTime: "09:30",                  // HH:mm Format
  durationMinutes: Number,                 // Default: 30
  daysOfWeek: Number[],                    // [0-6], nur bei weekly/biweekly (0=Sonntag)
  dayOfMonth: Number | null,              // 1-31, nur bei monthly
  weekOfMonth: Number | null,             // NEU: 1-4 (erster/zweiter/dritter/vierter), für "jeden 2. Dienstag"

  // Serien-Grenzen
  startDate: "2026-03-15",                // ISO-Datum, ab wann
  endDate: "2026-09-15" | null,           // ISO-Datum, bis wann (optional)
  maxOccurrences: Number | null,          // Alternativ: max. Anzahl (optional)

  // Status
  status: "active" | "paused" | "completed" | "cancelled",
  // active    → Termine werden weiter generiert
  // paused    → Temporär gestoppt, kann fortgesetzt werden
  // completed → Alle geplanten Termine erstellt / Enddatum erreicht
  // cancelled → Dauerhaft gestoppt

  // Tracking
  occurrencesCreated: Number,              // Wie viele Termine bereits generiert
  nextOccurrenceDate: "2026-04-12" | null, // NEU: Wann der nächste Termin fällig ist
  lastGeneratedDate: "2026-03-29" | null,  // Letzter generierter Termin-Datum

  // Optionen
  autoConfirm: Boolean,                   // Default: false — Termine automatisch bestätigen?
  reminderDaysBefore: Number,             // Default: 7 — Erinnerung X Tage vor nächstem Termin
  skipHolidays: Boolean,                  // NEU: Feiertage überspringen?
  skipIfConflict: Boolean,                // NEU: Bei Überschneidung überspringen statt Fehler?
  allowPatientCancel: Boolean,            // NEU: Darf Patient einzelne Occurrence absagen?

  // Chair-Präferenz (Integration mit Section 18)
  preferredChairId: ObjectId | null,       // Bevorzugter Stuhl für alle Occurrences

  notes: String | null,
  createdBy: ObjectId,
  tenantId: String,
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
{ patientId: 1, status: 1 }                   // Serien eines Patienten
{ doctorId: 1, status: 1 }                    // Serien eines Arztes
{ branchId: 1, status: 1, nextOccurrenceDate: 1 } // Fällige Generierungen
{ status: 1, nextOccurrenceDate: 1 }           // BullMQ Cron-Abfrage
```

#### Appointments Collection — Neue Felder (Ergänzung)

```typescript
// Zusätzliche Felder auf der bestehenden appointments Collection:
{
  // ... bestehende Felder (inkl. arrivedAt etc. aus Section 18) ...

  // NEU: Recurring-Link
  recurringRuleId: ObjectId | null,        // Link zur recurring_rules Collection
  isRecurring: Boolean,                    // Default: false
  occurrenceIndex: Number | null,          // NEU: Welche Occurrence (1, 2, 3, ...)
  seriesTotal: Number | null,             // NEU: Gesamtanzahl in der Serie (wenn bekannt)

  // NEU: Occurrence-Level Overrides
  isModified: Boolean,                     // Default: false — wurde diese Occurrence individuell geändert?
  originalDateTime: Date | null,           // Ursprüngliche Zeit (vor Verschiebung)
  modificationNote: String | null,         // Warum verschoben/geändert
}
```

### Termin-Generierung (BullMQ Cron Job)

```typescript
// BullMQ Repeatable Job: Läuft täglich um 01:00
// Generiert Termine für die nächsten 4 Wochen (konfigurierbar)

async function generateUpcomingRecurringAppointments() {
  const lookAheadDays = 28; // 4 Wochen voraus
  const cutoffDate = addDays(new Date(), lookAheadDays);

  // Alle aktiven Rules deren nächste Occurrence vor dem Cutoff liegt
  const rules = await db
    .collection('recurring_rules')
    .find({
      status: 'active',
      nextOccurrenceDate: { $lte: cutoffDate.toISOString().slice(0, 10) },
      $or: [{ endDate: null }, { endDate: { $gte: new Date().toISOString().slice(0, 10) } }],
      $or: [
        { maxOccurrences: null },
        { $expr: { $lt: ['$occurrencesCreated', '$maxOccurrences'] } },
      ],
    })
    .toArray();

  for (const rule of rules) {
    const dates = calculateNextDates(rule, cutoffDate);

    for (const date of dates) {
      // Conflict-Check: Hat der Arzt schon einen Termin zu dieser Zeit?
      const conflict = await db.collection('appointments').findOne({
        doctorId: rule.doctorId,
        date: date,
        startTime: rule.preferredTime,
        status: { $nin: ['cancelled', 'no_show'] },
      });

      if (conflict) {
        if (rule.skipIfConflict) {
          // Überspringen und loggen
          await logSkippedOccurrence(rule._id, date, 'conflict');
          continue;
        } else {
          // Termin trotzdem erstellen, aber als "needs_review" markieren
          // → Erscheint im Daily Ops Hub mit Warnung
        }
      }

      // Termin erstellen
      await db.collection('appointments').insertOne({
        branchId: rule.branchId,
        patientId: rule.patientId,
        doctorId: rule.doctorId,
        serviceId: rule.serviceId,
        date: date,
        startTime: rule.preferredTime,
        durationMinutes: rule.durationMinutes,
        status: rule.autoConfirm ? 'confirmed' : 'scheduled',
        recurringRuleId: rule._id,
        isRecurring: true,
        occurrenceIndex: rule.occurrencesCreated + 1,
        preferredChairId: rule.preferredChairId,
        tenantId: rule.tenantId,
      });

      // Rule updaten
      await db.collection('recurring_rules').updateOne(
        { _id: rule._id },
        {
          $inc: { occurrencesCreated: 1 },
          $set: {
            lastGeneratedDate: date,
            nextOccurrenceDate: calculateNextSingleDate(rule, date),
          },
        },
      );
    }

    // Prüfen ob Serie abgeschlossen
    if (isSeriesComplete(rule)) {
      await db
        .collection('recurring_rules')
        .updateOne({ _id: rule._id }, { $set: { status: 'completed' } });
    }
  }
}
```

### Recurrence-Berechnung

```typescript
function calculateNextDates(rule: RecurringRule, until: Date): string[] {
  const dates: string[] = [];
  let current = parseDate(rule.nextOccurrenceDate);

  while (current <= until) {
    // Max-Occurrences prüfen
    if (rule.maxOccurrences && rule.occurrencesCreated + dates.length >= rule.maxOccurrences) break;
    // Enddatum prüfen
    if (rule.endDate && current > parseDate(rule.endDate)) break;

    // Holiday-Check (optional)
    if (rule.skipHolidays && isHoliday(current, rule.tenantId)) {
      current = advanceByPattern(current, rule);
      continue;
    }

    dates.push(formatDate(current));
    current = advanceByPattern(current, rule);
  }
  return dates;
}

function advanceByPattern(date: Date, rule: RecurringRule): Date {
  switch (rule.recurrenceType) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1); // nächster passender Wochentag
    case 'biweekly':
      return addWeeks(date, 2);
    case 'monthly':
      return addMonths(date, 1); // gleicher Tag im nächsten Monat
    case 'quarterly':
      return addMonths(date, 3);
    case 'biannual':
      return addMonths(date, 6);
    case 'annual':
      return addYears(date, 1);
  }
}
```

### Edit-Modi: „Diese Occurrence" vs. „Alle zukünftigen"

```
┌──────────────────────────────────────────┐
│  Edit Recurring Appointment              │
│                                          │
│  This appointment is part of a series.   │
│  How would you like to edit?             │
│                                          │
│  ○ This appointment only                 │
│    → Nur diesen einen Termin ändern      │
│    → isModified = true                   │
│    → originalDateTime gespeichert        │
│                                          │
│  ○ This and all future appointments      │
│    → Alle ab hier mit neuen Werten       │
│    → Recurring Rule wird aktualisiert    │
│    → Zukünftige Termine neu generiert    │
│                                          │
│  ○ All appointments in the series        │
│    → Die gesamte Serie wird aktualisiert │
│    → Auch vergangene (nicht abgeschl.)   │
│                                          │
│  [Cancel]                [Apply]         │
└──────────────────────────────────────────┘
```

### Cancel-Modi

```
┌──────────────────────────────────────────┐
│  Cancel Recurring Appointment            │
│                                          │
│  ○ Cancel this appointment only          │
│    → status = cancelled (nur dieser)     │
│                                          │
│  ○ Cancel this and all future            │
│    → Alle zukünftigen → cancelled        │
│    → Rule.status = cancelled             │
│                                          │
│  ○ Pause series (resume later)           │
│    → Rule.status = paused                │
│    → Keine neuen Termine generiert       │
│    → Bestehende bleiben aktiv            │
│                                          │
│  [Back]                  [Confirm]       │
└──────────────────────────────────────────┘
```

### UI-Seiten

#### 1. Recurring Rules Management (`/appointments/recurring`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  RECURRING APPOINTMENT RULES                    [+ New Series]      │
├─────────────────────────────────────────────────────────────────────┤
│  Filter: [All ▾]  [Active ▾]  [Dr. Samy ▾]   🔍 Patient suchen    │
│                                                                     │
│  ┌──────────┬──────────┬──────────┬────────┬────────┬─────────────┐ │
│  │ Patient  │ Doctor   │ Pattern  │ Next   │ Done   │ Status      │ │
│  ├──────────┼──────────┼──────────┼────────┼────────┼─────────────┤ │
│  │ Ahmed M. │ Dr. Samy │ Weekly   │ Mar 22 │ 3/12   │ 🟢 Active   │ │
│  │ Sara K.  │ Dr. Layla│ Monthly  │ Apr 01 │ 8/24   │ 🟢 Active   │ │
│  │ Omar H.  │ Dr. Samy │ Biweekly │ --     │ 6/6    │ ✅ Complete │ │
│  │ Mona A.  │ Dr. Samy │ Weekly   │ --     │ 2/10   │ ⏸ Paused   │ │
│  └──────────┴──────────┴──────────┴────────┴────────┴─────────────┘ │
│                                                                     │
│  Bulk Actions: [Resume Selected]  [Cancel Selected]                 │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2. Series Detail View (`/appointments/recurring/:ruleId`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  RECURRING SERIES: Ahmed M. — Weekly Ortho Check                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Patient: Ahmed M.          Doctor: Dr. Samy                        │
│  Service: Ortho Follow-Up   Branch: Main                            │
│  Pattern: Every Tuesday, 09:30   Duration: 30 min                   │
│  Started: Mar 01, 2026      Ends: Aug 30, 2026                     │
│  Progress: ████████░░░░ 8/24 (33%)                                 │
│                                                                     │
│  [Edit Series]  [Pause]  [Cancel Series]                            │
│                                                                     │
│  OCCURRENCES                                                        │
│  ┌────┬──────────┬────────┬──────────┬──────────────────────┐       │
│  │ #  │ Date     │ Time   │ Status   │ Actions              │       │
│  ├────┼──────────┼────────┼──────────┼──────────────────────┤       │
│  │  1 │ Mar 01   │ 09:30  │ ✅ Done  │                      │       │
│  │  2 │ Mar 08   │ 09:30  │ ✅ Done  │                      │       │
│  │  3 │ Mar 15   │ 10:00  │ ✅ Done  │ ✏️ Modified (moved)  │       │
│  │  4 │ Mar 22   │ 09:30  │ ❌ NoShow│                      │       │
│  │  5 │ Mar 29   │ 09:30  │ 🔵 Sched │ [Edit] [Cancel]      │       │
│  │  6 │ Apr 05   │ 09:30  │ 🔵 Sched │ [Edit] [Cancel]      │       │
│  │ ...│          │        │          │                      │       │
│  └────┴──────────┴────────┴──────────┴──────────────────────┘       │
│                                                                     │
│  Skipped Occurrences: 1 (Apr 12 — conflict with Dr. Samy leave)    │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3. Kalender-Integration

```
In AppointmentCalendar:
- Recurring Termine haben ein 🔄-Icon (oder Repeat-Badge)
- Tooltip zeigt: "Part of series (3/12) — Weekly Ortho Follow-Up"
- Klick → öffnet Appointment Detail mit "View Series" Button
- Drag & Drop verschiebt nur DIESE Occurrence (isModified = true)
```

#### 4. Appointment-Listen-Integration

```
In AppointmentList:
- Filter: "Show recurring only" Toggle
- Badge: 🔄 neben Patient-Name bei Serien-Terminen
- Column: "Series" (z.B. "3/12 Weekly") — optional anzeigbar
```

### Anwendungsfälle (Dental-spezifisch)

| Pattern       | Typischer Anwendungsfall                                   | Dauer       |
| ------------- | ---------------------------------------------------------- | ----------- |
| **Weekly**    | KFO-Kontrolle (Bracket-Adjustment), Wurzelbehandlung-Serie | 4-12 Wochen |
| **Biweekly**  | KFO-Kontrolle (alle 2 Wochen), Post-OP Kontrolle           | 2-6 Monate  |
| **Monthly**   | Parodontose-Nachsorge, Implantat-Kontrolle                 | 6-12 Monate |
| **Quarterly** | Professionelle Zahnreinigung (PZR), Recall                 | 1-2 Jahre   |
| **Biannual**  | Routine-Kontrolle, Recall-Programm                         | Unbegrenzt  |
| **Annual**    | Panorama-Röntgen, Jahres-Check                             | Unbegrenzt  |

### Erinnerungen (BullMQ Jobs)

```typescript
// 1. Patient-Erinnerung: X Tage vor nächstem Serien-Termin
// → Default: 7 Tage (konfigurierbar pro Rule)
// → Kanäle: SMS, Email, Push (je nach Tenant-Einstellung)

// 2. Series-Zusammenfassung: Wöchentlicher Report für den Arzt
// → "Diese Woche: 3 Recurring Patienten, 1 No-Show letzte Woche"
// → Per Email/Push an den zugewiesenen Doctor

// 3. Series-Abschluss-Hinweis: Wenn < 3 Occurrences übrig
// → "Ahmed M.'s ortho series ends in 3 appointments. Create follow-up?"
```

### API Endpoints

| Method | Route                                  | Beschreibung                                         |
| ------ | -------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/recurring-rules`                 | Alle Rules (Filter: patient, doctor, status, branch) |
| GET    | `/api/recurring-rules/:id`             | Rule Detail + alle zugehörigen Appointments          |
| POST   | `/api/recurring-rules`                 | Neue Rule erstellen + initiale Termine generieren    |
| PATCH  | `/api/recurring-rules/:id`             | Rule bearbeiten (Modus: this-and-future / all)       |
| PATCH  | `/api/recurring-rules/:id/pause`       | Serie pausieren                                      |
| PATCH  | `/api/recurring-rules/:id/resume`      | Serie fortsetzen                                     |
| DELETE | `/api/recurring-rules/:id`             | Serie stornieren + zukünftige Termine canceln        |
| GET    | `/api/recurring-rules/:id/occurrences` | Alle Occurrences mit Status                          |
| GET    | `/api/recurring-rules/:id/skipped`     | Übersprungene Occurrences mit Gründen                |
| PATCH  | `/api/appointments/:id/occurrence`     | Einzelne Occurrence bearbeiten (isModified = true)   |
| POST   | `/api/recurring-rules/:id/regenerate`  | Zukünftige Termine neu generieren (nach Edit)        |

### RBAC Permissions

| Permission                | Wer                         | Beschreibung                   |
| ------------------------- | --------------------------- | ------------------------------ |
| `recurring.view`          | Doctor, Receptionist, Admin | Serien ansehen                 |
| `recurring.create`        | Doctor, Receptionist, Admin | Neue Serie erstellen           |
| `recurring.edit`          | Doctor, Admin               | Serie bearbeiten               |
| `recurring.edit_single`   | Doctor, Receptionist, Admin | Einzelne Occurrence bearbeiten |
| `recurring.pause_resume`  | Doctor, Admin               | Serie pausieren/fortsetzen     |
| `recurring.cancel`        | Doctor, Admin               | Serie stornieren               |
| `recurring.cancel_single` | Doctor, Receptionist, Admin | Einzelne Occurrence absagen    |

### Webhook Events

| Event                            | Trigger                                    |
| -------------------------------- | ------------------------------------------ |
| `recurring_rule.created`         | Neue Recurring Rule erstellt               |
| `recurring_rule.updated`         | Rule geändert (Pattern, Zeit, Arzt)        |
| `recurring_rule.paused`          | Serie pausiert                             |
| `recurring_rule.resumed`         | Serie fortgesetzt                          |
| `recurring_rule.cancelled`       | Serie komplett storniert                   |
| `recurring_rule.completed`       | Alle Termine generiert / Enddatum erreicht |
| `recurring_occurrence.generated` | Neue Termine aus Rule generiert            |
| `recurring_occurrence.skipped`   | Occurrence übersprungen (Conflict/Holiday) |
| `recurring_occurrence.modified`  | Einzelne Occurrence manuell geändert       |

### v1 → v2 Vergleich

| Aspekt                   | v1                                                    | v2                                                                           |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Architektur              | 2 konkurrierende Designs (Spalten + separate Tabelle) | ✅ 1 sauberes Design: `recurring_rules` + `recurringRuleId` auf Appointments |
| Patterns                 | daily, weekly, biweekly, monthly                      | ✅ + quarterly, biannual, annual                                             |
| Serien-Management UI     | ❌ Fehlt komplett                                     | ✅ Eigene Seite + Detail-View + Progress-Bar                                 |
| Edit einzelne Occurrence | ❌ Nicht möglich                                      | ✅ „This occurrence only" / „This and future" / „All"                        |
| Cancel Serie             | DB-Funktion existiert, kein UI                        | ✅ Cancel + Pause/Resume UI                                                  |
| Kalender-Darstellung     | ❌ Kein visueller Unterschied                         | ✅ 🔄-Badge, Tooltip, „View Series" Button                                   |
| Listen-Integration       | ❌ Kein Filter/Badge                                  | ✅ Filter „Recurring only" + Badge                                           |
| Conflict-Check           | ❌ Keine Prüfung                                      | ✅ Vor Generierung: Arzt-Verfügbarkeit + skipIfConflict                      |
| Generierung              | Stored Function im Request (blocking)                 | ✅ BullMQ Cron Job (async, 4 Wochen voraus)                                  |
| Holiday-Handling         | ❌ Nicht existent                                     | ✅ `skipHolidays` Option                                                     |
| Erinnerungen             | ❌ Nicht existent                                     | ✅ Patient-Reminder + Arzt-Summary + Series-Ending                           |
| Fehlerbehandlung         | Still verschluckt                                     | ✅ Skipped-Occurrences mit Gründen + UI-Anzeige                              |
| Occurrence-Tracking      | Nur via `recurrence_parent_id`                        | ✅ `occurrenceIndex`, `seriesTotal`, `isModified`                            |
| Fortschritt              | DB-View (nie genutzt)                                 | ✅ Progress-Bar im UI (8/24, 33%)                                            |
| Day-of-Month             | ❌ Nicht implementiert (nur Spalte)                   | ✅ `dayOfMonth` + `weekOfMonth` (z.B. „jeden 2. Dienstag")                   |
| Chair-Präferenz          | ❌ Nicht existent                                     | ✅ `preferredChairId` (Integration mit Daily Ops Hub)                        |

---

## 20. Notifications & Messaging System

### v1-Analyse

| Aspekt                                    | v1-Status                                                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **notification_logs** (Mig. 012)          | id, type, channel (whatsapp/email/sms), recipient, message, status (pending/delivered/failed), appointment_id, patient_id                                                  |
| **notification_templates** (Mig. 012+032) | **Schema-Widerspruch**: Mig 012 hat `key`, `whatsapp_template`, `email_body`; Mig 032 hat `type`, `channel`, `template_en`, `template_ar`, `variables`. Beide koexistieren |
| **notification_queue** (Mig. 032)         | template_id, patient_id, channel, variables(JSONB), status, scheduled_at, retry_count — **KEIN WORKER verarbeitet sie**                                                    |
| **notification_channels** (Mig. 041)      | channel_type (email/slack/discord/webhook/sms/push), config(JSONB) — **Nur für SaaS-Alerting, NICHT für Patienten**                                                        |
| **`notifications` Tabelle**               | Referenziert in Triggern, **nie mit CREATE TABLE definiert** (Phantom-Tabelle)                                                                                             |
| **send-notification Edge Function**       | ✅ Implementiert: WhatsApp (Facebook Graph API), Email (Resend), SMS (Twilio) — alle mit Simulation-Fallback                                                               |
| **NotificationSettings.jsx**              | 4 Tabs: Queue, Logs, Templates, Settings — funktioniert teilweise                                                                                                          |
| **Bell-Dropdown**                         | Zeigt nächste 10 Termine (NICHT echte Notifications), **5-Min-Polling**                                                                                                    |
| **Push Notifications**                    | ❌ Toggle im UI, **null Implementierung**                                                                                                                                  |
| **In-App Notifications**                  | ❌ Keine echte Queue, Bell zeigt nur Appointments                                                                                                                          |
| **Realtime**                              | ❌ Nur Polling (5 Min), Supabase Realtime nur für Support-Chat                                                                                                             |
| **Patient-Preferences**                   | ❌ Keine `notification_preferences` Tabelle                                                                                                                                |
| **notification_queue Worker**             | ❌ Queue wird von DB-Triggern befüllt, **wächst endlos, niemand verarbeitet sie**                                                                                          |
| **pg_cron Reminder**                      | ❌ Nur als Kommentar im SQL, **nie aktiviert**                                                                                                                             |

### v1-Probleme (werden in v2 gelöst)

1. **Schema-Chaos**: `notification_templates` hat 2 konkurrierende Spalten-Sätze (Mig 012 vs 032)
2. **Phantom-Tabelle**: `notifications` wird in Triggern referenziert, aber nie erstellt
3. **Dead Queue**: `notification_queue` wird befüllt, aber **kein Worker** verarbeitet sie — Queue wächst endlos
4. **Fake Bell**: Bell-Dropdown zeigt Appointments, keine echten Notifications
5. **Kein Realtime**: 5-Minuten-Polling statt Instant-Zustellung
6. **Push nicht implementiert**: Toggle existiert im UI, aber null Infrastruktur
7. **Kein Preferences-System**: Patient/User kann nicht steuern, welche Notifications er will
8. **Kanal-Settings ignoriert**: NotificationSettings speichert Toggles, aber `send-notification` prüft sie nie
9. **Keine Multi-Tenant-Isolation**: tenant_id nachträglich hinzugefügt, RLS nicht vollständig
10. **pg_cron nicht aktiviert**: Reminder-Cron ist nur ein Kommentar

### v2-Konzept: Vollständiges Notification-System

**Drei Ebenen:**

1. **In-App Notifications** — Echtzeit via Socket.io, Bell-Dropdown + Notification Center
2. **External Messaging** — WhatsApp, Email, SMS über BullMQ Workers
3. **Push Notifications** — Web Push (Service Worker) + Mobile Push (Expo Notifications)

### MongoDB Collections

#### `notification_templates` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,

  // Identifikation
  key: String,                           // Unique Key (z.B. "appointment_reminder_24h")
  name: { en: String, ar: String },      // Display-Name
  description: String | null,            // Wofür ist dieses Template

  // Typ
  category: "appointment" | "payment" | "clinical" | "inventory" | "system" | "marketing" | "recall",
  trigger: "automatic" | "manual" | "scheduled",
  // automatic  → Wird durch Event ausgelöst (z.B. appointment.confirmed)
  // manual     → Wird manuell aus dem UI gesendet
  // scheduled  → Wird zeitbasiert gesendet (z.B. 24h vor Termin)

  // Kanal-spezifische Templates
  channels: {
    email: {
      enabled: Boolean,
      subject: { en: String, ar: String },
      body: { en: String, ar: String },     // HTML mit Variablen
    } | null,
    sms: {
      enabled: Boolean,
      template: { en: String, ar: String }, // Plaintext, max 160 Zeichen
    } | null,
    whatsapp: {
      enabled: Boolean,
      template: { en: String, ar: String },
      templateId: String | null,            // WhatsApp Business-Template-ID
    } | null,
    push: {
      enabled: Boolean,
      title: { en: String, ar: String },
      body: { en: String, ar: String },
    } | null,
    inApp: {
      enabled: Boolean,
      title: { en: String, ar: String },
      body: { en: String, ar: String },
      icon: String | null,                  // Lucide Icon Name
      actionUrl: String | null,             // Link bei Klick
    } | null,
  },

  // Variablen
  variables: [
    { key: "patient_name", label: { en: "Patient Name", ar: "اسم المريض" }, required: true },
    { key: "doctor_name", label: { en: "Doctor Name", ar: "اسم الطبيب" }, required: false },
    { key: "appointment_date", label: { en: "Appointment Date", ar: "تاريخ الموعد" }, required: false },
    { key: "appointment_time", label: { en: "Appointment Time", ar: "وقت الموعد" }, required: false },
    { key: "clinic_name", label: { en: "Clinic Name", ar: "اسم العيادة" }, required: false },
    { key: "clinic_phone", label: { en: "Clinic Phone", ar: "هاتف العيادة" }, required: false },
    // ... weitere je nach Template
  ],

  // Scheduling (für scheduled Trigger)
  schedule: {
    beforeMinutes: Number | null,         // z.B. 1440 = 24h vor Termin
    afterMinutes: Number | null,          // z.B. 60 = 1h nach Behandlung
    cronExpression: String | null,        // z.B. "0 18 * * *" für tägliche Recalls
  } | null,

  isActive: Boolean,                     // Default: true
  isSystem: Boolean,                     // Default: false — System-Templates nicht löschbar
  tenantId: String,
  createdAt: Date,
  updatedAt: Date,
}

// Index
{ key: 1, tenantId: 1 }                 // Unique pro Tenant
{ category: 1, trigger: 1, isActive: 1 }
```

#### `notifications` Collection (Tenant-DB) — In-App Notifications

```typescript
{
  _id: ObjectId,

  // Empfänger
  userId: ObjectId,                       // Pflicht: Welcher User sieht diese Notification
  recipientRole: "admin" | "doctor" | "receptionist" | "assistant",

  // Inhalt
  title: { en: String, ar: String },
  body: { en: String, ar: String },
  icon: String | null,                    // Lucide Icon (z.B. "calendar", "credit-card")
  variant: "info" | "success" | "warning" | "error",

  // Action
  actionUrl: String | null,              // z.B. "/appointments/abc123"
  actionLabel: { en: String, ar: String } | null,  // z.B. "View Appointment"

  // Kontext
  category: "appointment" | "payment" | "clinical" | "inventory" | "system" | "queue",
  relatedEntity: {
    type: "appointment" | "patient" | "invoice" | "walk_in" | "treatment_plan" | "stock_item",
    id: ObjectId,
  } | null,

  // Status
  isRead: Boolean,                       // Default: false
  readAt: Date | null,
  isDismissed: Boolean,                  // Default: false (User hat es weggeklickt)

  // Meta
  templateKey: String | null,            // Welches Template hat das erzeugt
  tenantId: String,
  createdAt: Date,
  expiresAt: Date | null,               // Auto-Löschen nach X Tagen (optional)
}

// Indexes
{ userId: 1, isRead: 1, createdAt: -1 }  // Bell-Dropdown: ungelesene, neueste zuerst
{ userId: 1, category: 1, createdAt: -1 } // Filter nach Kategorie
{ createdAt: 1, expiresAt: 1 }            // TTL-Cleanup
{ tenantId: 1, createdAt: -1 }            // Admin: alle Notifications
```

#### `notification_logs` Collection (Tenant-DB) — Zustellungsprotokoll

```typescript
{
  _id: ObjectId,

  // Was wurde gesendet
  templateKey: String,                    // Welches Template
  channel: "email" | "sms" | "whatsapp" | "push",
  recipient: String,                      // Email/Telefon/Device-Token

  // An wen
  patientId: ObjectId | null,
  userId: ObjectId | null,               // Für Staff-Notifications

  // Inhalt (archiviert)
  subject: String | null,                // Nur bei Email
  body: String,                          // Gerenderte Nachricht
  variables: Record<string, string>,     // Verwendete Variablen-Werte

  // Zustellung
  status: "pending" | "sent" | "delivered" | "failed" | "bounced",
  sentAt: Date | null,
  deliveredAt: Date | null,
  failedAt: Date | null,
  errorMessage: String | null,

  // Retry
  retryCount: Number,                    // Default: 0
  maxRetries: Number,                    // Default: 3
  nextRetryAt: Date | null,

  // Kontext
  relatedEntity: {
    type: String,
    id: ObjectId,
  } | null,

  // Provider Response
  providerMessageId: String | null,      // z.B. Twilio SID, Resend ID
  providerResponse: Record<string, any> | null,

  tenantId: String,
  createdAt: Date,
}

// Indexes
{ tenantId: 1, createdAt: -1 }           // Admin: Log-Ansicht
{ channel: 1, status: 1 }                // Monitoring: Fehlerrate pro Kanal
{ patientId: 1, createdAt: -1 }          // Patient-Kommunikationshistorie
{ templateKey: 1, status: 1, createdAt: -1 } // Template-Performance
```

#### `notification_preferences` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,

  // Wer
  userId: ObjectId | null,               // Für Staff
  patientId: ObjectId | null,            // Für Patienten

  // Kanal-Optionen
  channels: {
    email: { enabled: Boolean, address: String | null },    // Override-Adresse
    sms: { enabled: Boolean, phone: String | null },
    whatsapp: { enabled: Boolean, phone: String | null },
    push: { enabled: Boolean },
    inApp: { enabled: Boolean },                            // Default: true
  },

  // Kategorie-Optionen (pro Kategorie an/aus)
  categories: {
    appointment: { enabled: Boolean, channels: ["email", "whatsapp", "inApp"] },
    payment: { enabled: Boolean, channels: ["email", "inApp"] },
    clinical: { enabled: Boolean, channels: ["inApp"] },
    inventory: { enabled: Boolean, channels: ["inApp", "email"] },
    system: { enabled: Boolean, channels: ["inApp"] },
    marketing: { enabled: Boolean, channels: ["email", "whatsapp"] },
    recall: { enabled: Boolean, channels: ["whatsapp", "sms", "email"] },
  },

  // Timing
  quietHoursStart: "22:00" | null,       // NEU: Keine Notifications nach 22:00
  quietHoursEnd: "08:00" | null,         // NEU: Wieder ab 08:00
  timezone: String | null,               // z.B. "Africa/Cairo"

  // Digest (Zusammenfassung statt einzeln)
  digestMode: "realtime" | "daily" | "weekly",   // Default: realtime
  digestTime: "09:00" | null,            // Wenn daily/weekly: Wann senden

  tenantId: String,
  createdAt: Date,
  updatedAt: Date,
}

// Index
{ userId: 1, tenantId: 1 }              // Unique pro User
{ patientId: 1, tenantId: 1 }           // Unique pro Patient
```

### Notification-Flow (v2)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          EVENT TRITT EIN                                     │
│  (z.B. appointment.confirmed, payment.received, stock.low)                  │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION SERVICE (Fastify)                           │
│                                                                              │
│  1. Event empfangen (Fastify Hook afterCreate/afterUpdate ODER BullMQ Event)│
│  2. Template laden (notification_templates → key matching)                   │
│  3. Empfänger bestimmen (Patient? Doctor? Admin? Alle Rezeptionisten?)       │
│  4. Preferences prüfen (notification_preferences → Kanal + Kategorie)       │
│  5. Quiet Hours prüfen (nicht senden wenn User in Ruhezeit)                 │
│  6. Variablen ersetzen (patient_name, date, time, etc.)                     │
│  7. Jobs erstellen (pro Kanal ein BullMQ Job)                               │
└────────┬──────────────┬──────────────┬──────────────┬───────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  IN-APP    │  │  EMAIL     │  │  SMS       │  │  WHATSAPP  │
│            │  │            │  │            │  │            │
│ MongoDB    │  │ BullMQ     │  │ BullMQ     │  │ BullMQ     │
│ Insert +   │  │ Worker →   │  │ Worker →   │  │ Worker →   │
│ Socket.io  │  │ Resend API │  │ Twilio API │  │ Meta API   │
│ Broadcast  │  │            │  │            │  │            │
│            │  │ Retry: 3x  │  │ Retry: 3x  │  │ Retry: 3x  │
│ → Instant  │  │ → Async    │  │ → Async    │  │ → Async    │
└──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION LOGS                              │
│  status: sent / delivered / failed / bounced                     │
│  providerMessageId, errorMessage, retryCount                     │
└──────────────────────────────────────────────────────────────────┘
```

### Push Notification Infrastruktur

```typescript
// Web Push: Service Worker + VAPID Keys
// Mobile Push: Expo Notifications + FCM/APNs

// device_tokens Collection (Tenant-DB)
{
  _id: ObjectId,
  userId: ObjectId,                      // Pflicht
  token: String,                         // Push Token (FCM/APNs/Web)
  platform: "web" | "ios" | "android",
  deviceName: String | null,             // z.B. "iPhone 15 Pro"
  isActive: Boolean,                     // Default: true
  lastUsedAt: Date,                      // Für Cleanup inaktiver Tokens
  tenantId: String,
  createdAt: Date,
}

// Index
{ userId: 1, platform: 1 }
{ token: 1 }                             // Unique
{ isActive: 1, lastUsedAt: 1 }           // Cleanup Query
```

#### `alert_rules` Collection (Tenant-DB)

Konfigurierbare Alert-Regeln, die automatisch Notifications auslösen wenn bestimmte
Bedingungen eintreten. Jeder Tenant kann eigene Regeln definieren.

```typescript
{
  _id: ObjectId,

  // Identifikation
  name: String,                          // "Low Stock Alert"
  description: String | null,
  isActive: Boolean,                     // Default: true

  // Trigger-Typ
  triggerType: String,                   // enum: inventory_low_stock | inventory_expiring |
                                         //       invoice_overdue | no_show_rate_high |
                                         //       revenue_drop | appointment_utilization_low |
                                         //       payment_pending | custom

  // Bedingung
  condition: {
    metric: String,                      // z.B. "inventory.availableQuantity", "invoice.daysPastDue",
                                         //      "appointments.noShowRate", "revenue.monthlyChange"
    operator: String,                    // enum: lt | lte | gt | gte | eq
    threshold: Number,                   // z.B. 10 (Low Stock), 30 (30 Tage überfällig), -20 (-20% Revenue)
    timeWindowDays: Number | null,       // Für Rate-basierte Metriken (z.B. No-Show-Rate der letzten 7 Tage)
  },

  // Scope (optional — Filter)
  scope: {
    branchId: ObjectId | null,           // Auf eine Branch beschränken
    categoryId: ObjectId | null,         // Für Inventory: Kategorie-Filter
    doctorId: ObjectId | null,           // Für Appointment-Metriken: Arzt-Filter
  },

  // Aktionen bei Auslösung
  actions: [
    {
      type: String,                      // enum: notify_roles | notify_users | webhook | email
      target: [String] | [ObjectId],     // Rollen-Namen ODER User-IDs
      channel: String | null,            // in_app | email | sms | push (für notify_*)
    }
  ],

  // Throttling (verhindert Spam)
  cooldownMinutes: Number,               // Default: 60 — Mindestabstand zwischen Auslösungen
  lastTriggeredAt: Date | null,
  triggerCount: Number,                  // Wie oft wurde diese Regel bereits ausgelöst

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
}
// Index: { triggerType: 1, isActive: 1 }
// Index: { lastTriggeredAt: 1 }
```

**Seed Alert Rules (bei Tenant-Erstellung):**

| Regel           | Trigger               | Bedingung                        | Aktion                                 |
| --------------- | --------------------- | -------------------------------- | -------------------------------------- |
| Low Stock       | `inventory_low_stock` | availableQuantity ≤ reorderLevel | Notify admin, manager (In-App)         |
| Expiring Items  | `inventory_expiring`  | daysUntilExpiry ≤ 30             | Notify admin, manager (In-App + Email) |
| Overdue Invoice | `invoice_overdue`     | daysPastDue ≥ 30                 | Notify admin, accountant (In-App)      |
| High No-Show    | `no_show_rate_high`   | noShowRate ≥ 20% (7 Tage)        | Notify admin (In-App)                  |
| Revenue Drop    | `revenue_drop`        | monthlyChange ≤ -20%             | Notify admin (Email)                   |

**BullMQ Worker `alert-rule-checker`:** Läuft alle 15 Minuten, evaluiert alle aktiven Regeln,
erstellt Notifications für ausgelöste Regeln (unter Beachtung von Cooldown).

**UI-Seite:** `/settings/alerts` — Liste aller Alert Rules + CRUD + Test-Button ("Jetzt auslösen").

### BullMQ Queues

```typescript
// 4 dedizierte Queues für Notification-Kanäle
const emailQueue = new Queue('notification:email', { connection: redis });
const smsQueue = new Queue('notification:sms', { connection: redis });
const whatsappQueue = new Queue('notification:whatsapp', { connection: redis });
const pushQueue = new Queue('notification:push', { connection: redis });

// Email Worker
const emailWorker = new Worker(
  'notification:email',
  async (job) => {
    const { to, subject, html, templateKey, tenantId, logId } = job.data;

    try {
      const result = await resend.emails.send({
        from: `${clinicName} <noreply@${domain}>`,
        to,
        subject,
        html,
      });

      await db
        .collection('notification_logs')
        .updateOne(
          { _id: logId },
          { $set: { status: 'sent', sentAt: new Date(), providerMessageId: result.id } },
        );
    } catch (error) {
      // Retry-Logik: max 3x, mit exponential backoff
      if (job.attemptsMade < 3) throw error; // BullMQ retries automatically
      await db
        .collection('notification_logs')
        .updateOne(
          { _id: logId },
          { $set: { status: 'failed', failedAt: new Date(), errorMessage: error.message } },
        );
    }
  },
  {
    connection: redis,
    concurrency: 5, // 5 parallele Emails
    limiter: { max: 50, duration: 60000 }, // Max 50/Minute (Rate Limiting)
  },
);

// SMS Worker (Twilio) — analoger Aufbau
// WhatsApp Worker (Meta Business API) — analoger Aufbau
// Push Worker (FCM + APNs) — analoger Aufbau
```

### Scheduled Notifications (BullMQ Cron)

```typescript
// Appointment Reminders: Täglich um 18:00
// → Scannt Termine der nächsten 24h
// → Erstellt Reminder-Jobs pro Patient (Kanal je nach Preferences)
const appointmentReminderJob = await notificationQueue.add(
  'appointment-reminders',
  {},
  { repeat: { pattern: '0 18 * * *' } },
);

// Recall Reminders: Wöchentlich Montag 09:00
// → Patienten die seit X Monaten nicht da waren
const recallJob = await notificationQueue.add(
  'recall-reminders',
  {},
  { repeat: { pattern: '0 9 * * 1' } },
);

// Payment Reminders: Täglich 10:00
// → Offene Rechnungen > X Tage
const paymentReminderJob = await notificationQueue.add(
  'payment-reminders',
  {},
  { repeat: { pattern: '0 10 * * *' } },
);

// Low Stock Alerts: Täglich 08:00
// → Items unter minStockLevel
const lowStockAlertJob = await notificationQueue.add(
  'low-stock-alerts',
  {},
  { repeat: { pattern: '0 8 * * *' } },
);
```

### In-App Notification Center (Socket.io)

```typescript
// Server: Bei jeder In-App Notification
async function sendInAppNotification(userId: string, notification: InAppNotification) {
  // 1. MongoDB Insert
  const inserted = await db.collection('notifications').insertOne({
    userId: new ObjectId(userId),
    ...notification,
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
  });

  // 2. Socket.io Broadcast an den User
  io.to(`user:${userId}`).emit('notification:new', {
    _id: inserted.insertedId,
    ...notification,
  });
}

// Client: React Hook
function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial laden
    fetchNotifications();

    // Realtime: Neue Notifications
    socket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Browser Notification API (wenn erlaubt)
      if (Notification.permission === 'granted') {
        new Notification(notification.title[lang], {
          body: notification.body[lang],
          icon: '/logo.png',
        });
      }

      // Toast anzeigen
      toast.info(notification.title[lang]);
    });

    return () => socket.off('notification:new');
  }, []);

  const markAsRead = async (id) => {
    /* PATCH /api/notifications/:id/read */
  };
  const markAllAsRead = async () => {
    /* PATCH /api/notifications/read-all */
  };
  const dismiss = async (id) => {
    /* PATCH /api/notifications/:id/dismiss */
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, dismiss };
}
```

### UI-Seiten

#### 1. Notification Bell (Header — alle Seiten)

```
┌──────────────────────────────────┐
│  🔔 3                            │   ← Badge mit ungelesenen Count
│  ┌────────────────────────────┐  │
│  │  NOTIFICATIONS        [✓] │  │   ← [✓] = Mark all as read
│  │  ─────────────────────────│  │
│  │  🟢 Ahmed M. arrived      │  │   ← In-App Notification
│  │  Walk-in Queue • 2 min    │  │
│  │  ─────────────────────────│  │
│  │  💳 Invoice #1234 paid     │  │
│  │  Payments • 15 min        │  │
│  │  ─────────────────────────│  │
│  │  🔴 Paracetamol low stock │  │
│  │  Inventory • 1 hour       │  │
│  │  ─────────────────────────│  │
│  │  [View All Notifications] │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

#### 2. Notification Center (`/notifications`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION CENTER                                [Mark All Read]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filter: [All ▾]  [Unread ▾]  [Appointment ▾]  🔍 Suchen               │
│                                                                         │
│  TODAY                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 Ahmed M. has arrived for his appointment                       │ │
│  │    Walk-in Queue • 2 minutes ago            [View] [Dismiss]      │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ 💳 Invoice #INV-2026-0042 paid — EGP 1,500                       │ │
│  │    Payments • 15 minutes ago                [View] [Dismiss]      │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ 📅 Reminder: Sara K. appointment tomorrow 09:30                   │ │
│  │    Appointments • 1 hour ago                [View] [Dismiss]      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  YESTERDAY                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🔴 Paracetamol 500mg: Stock below minimum (3 remaining)          │ │
│  │    Inventory • Yesterday 14:30              [View] [Dismiss]      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  [Load More]                                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3. Notification Templates Management (`/settings/notification-templates`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION TEMPLATES                        [+ Custom Template]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Category: [All ▾]  Channel: [All ▾]  Status: [Active ▾]               │
│                                                                         │
│  APPOINTMENT                                                            │
│  ┌────────┬──────────────────────┬────────────┬──────────┬────────────┐ │
│  │ Key    │ Name                 │ Channels   │ Trigger  │ Status     │ │
│  ├────────┼──────────────────────┼────────────┼──────────┼────────────┤ │
│  │ apt_rm │ Appointment Reminder │ 📧📱💬     │ Sched.   │ 🟢 Active  │ │
│  │ apt_cf │ Appointment Confirm  │ 📧💬       │ Auto     │ 🟢 Active  │ │
│  │ apt_cn │ Appointment Cancel   │ 📧💬       │ Auto     │ 🟢 Active  │ │
│  │ apt_ns │ No-Show Notice       │ 📧         │ Auto     │ 🟢 Active  │ │
│  └────────┴──────────────────────┴────────────┴──────────┴────────────┘ │
│                                                                         │
│  PAYMENT                                                                │
│  ┌────────┬──────────────────────┬────────────┬──────────┬────────────┐ │
│  │ pay_rc │ Payment Receipt      │ 📧💬       │ Auto     │ 🟢 Active  │ │
│  │ pay_rm │ Payment Reminder     │ 📧💬📱     │ Sched.   │ 🟢 Active  │ │
│  │ pay_od │ Payment Overdue      │ 📧📱       │ Sched.   │ 🟢 Active  │ │
│  └────────┴──────────────────────┴────────────┴──────────┴────────────┘ │
│                                                                         │
│  [Edit Template] → Opens Template Editor Modal                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 4. Notification Logs (`/settings/notification-logs`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION LOGS                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Date: [Today ▾]  Channel: [All ▾]  Status: [All ▾]  🔍 Empfänger      │
│                                                                         │
│  ┌──────────┬──────────┬────────┬──────────┬────────┬────────┐         │
│  │ Time     │ Template │ Chan.  │ Recipient│ Status │ Retry  │         │
│  ├──────────┼──────────┼────────┼──────────┼────────┼────────┤         │
│  │ 09:15    │ apt_rm   │ 💬 WA  │ +201...  │ ✅ Sent│ 0/3    │         │
│  │ 09:15    │ apt_rm   │ 📧 Em  │ ahmed@.. │ ✅ Sent│ 0/3    │         │
│  │ 09:30    │ pay_rc   │ 💬 WA  │ +201...  │ ✅ Dlvd│ 0/3    │         │
│  │ 10:00    │ apt_cf   │ 📱 SMS │ +201...  │ ❌ Fail│ 3/3    │         │
│  └──────────┴──────────┴────────┴──────────┴────────┴────────┘         │
│                                                                         │
│  Stats: 📧 45 sent (98%) | 💬 38 sent (95%) | 📱 12 sent (85%)        │
│         ❌ 5 failed total | 🔄 2 pending retry                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 5. User Notification Preferences (`/settings/notifications` — pro User)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MY NOTIFICATION PREFERENCES                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CHANNELS                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 📧 Email    [ON]    ahmed@clinic.com                              │ │
│  │ 💬 WhatsApp [ON]    +20 100 123 4567                              │ │
│  │ 📱 SMS      [OFF]                                                 │ │
│  │ 🔔 Push     [ON]    2 devices registered                         │ │
│  │ 🖥 In-App   [ON]    Always on                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  CATEGORIES                                                             │
│  ┌────────────────────┬──────┬──────┬──────┬──────┬──────┐            │
│  │ Category           │ Email│ WA   │ SMS  │ Push │ App  │            │
│  ├────────────────────┼──────┼──────┼──────┼──────┼──────┤            │
│  │ Appointments       │  ✅  │  ✅  │  ⬜  │  ✅  │  ✅  │            │
│  │ Payments           │  ✅  │  ⬜  │  ⬜  │  ✅  │  ✅  │            │
│  │ Clinical           │  ⬜  │  ⬜  │  ⬜  │  ⬜  │  ✅  │            │
│  │ Inventory Alerts   │  ✅  │  ⬜  │  ⬜  │  ⬜  │  ✅  │            │
│  │ System             │  ⬜  │  ⬜  │  ⬜  │  ⬜  │  ✅  │            │
│  │ Marketing          │  ✅  │  ✅  │  ⬜  │  ⬜  │  ⬜  │            │
│  │ Recalls            │  ✅  │  ✅  │  ⬜  │  ✅  │  ✅  │            │
│  └────────────────────┴──────┴──────┴──────┴──────┴──────┘            │
│                                                                         │
│  QUIET HOURS                                                            │
│  [ON] Do not disturb from [22:00] to [08:00]                           │
│                                                                         │
│  DIGEST                                                                 │
│  ○ Realtime (instant)  ◉ Daily (09:00)  ○ Weekly (Monday 09:00)       │
│                                                                         │
│  [Save Preferences]                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Seed Templates (bei Tenant-Erstellung)

| Key                        | Kategorie   | Kanäle                 | Trigger   | Schedule                |
| -------------------------- | ----------- | ---------------------- | --------- | ----------------------- |
| `appointment_reminder_24h` | appointment | Email, WhatsApp, Push  | scheduled | 1440 min vor Termin     |
| `appointment_reminder_2h`  | appointment | SMS, Push              | scheduled | 120 min vor Termin      |
| `appointment_confirmed`    | appointment | WhatsApp, InApp        | automatic | —                       |
| `appointment_cancelled`    | appointment | WhatsApp, Email, InApp | automatic | —                       |
| `appointment_no_show`      | appointment | Email, InApp           | automatic | —                       |
| `appointment_rescheduled`  | appointment | WhatsApp, InApp        | automatic | —                       |
| `payment_receipt`          | payment     | Email, WhatsApp        | automatic | —                       |
| `payment_reminder`         | payment     | Email, WhatsApp, SMS   | scheduled | Cron: 10:00 täglich     |
| `payment_overdue`          | payment     | Email, Push            | scheduled | Cron: 10:00 täglich     |
| `recall_reminder`          | recall      | WhatsApp, Email, SMS   | scheduled | Cron: 09:00 wöchentlich |
| `stock_low_alert`          | inventory   | Email, InApp           | scheduled | Cron: 08:00 täglich     |
| `stock_expired_alert`      | inventory   | Email, InApp           | automatic | —                       |
| `walk_in_arrived`          | queue       | InApp                  | automatic | —                       |
| `treatment_plan_ready`     | clinical    | Email, WhatsApp, InApp | automatic | —                       |
| `prescription_ready`       | clinical    | WhatsApp, InApp        | automatic | —                       |
| `welcome_new_patient`      | system      | Email, WhatsApp        | automatic | —                       |

### API Endpoints

| Method | Route                                  | Beschreibung                                                    |
| ------ | -------------------------------------- | --------------------------------------------------------------- |
| GET    | `/api/notifications`                   | In-App Notifications (paginated, Filter: read/unread/category)  |
| GET    | `/api/notifications/unread-count`      | Badge-Count für Bell                                            |
| PATCH  | `/api/notifications/:id/read`          | Als gelesen markieren                                           |
| PATCH  | `/api/notifications/read-all`          | Alle als gelesen markieren                                      |
| PATCH  | `/api/notifications/:id/dismiss`       | Notification ausblenden                                         |
| GET    | `/api/notification-templates`          | Alle Templates (Filter: category, channel, trigger)             |
| GET    | `/api/notification-templates/:id`      | Template Detail                                                 |
| POST   | `/api/notification-templates`          | Custom Template erstellen                                       |
| PATCH  | `/api/notification-templates/:id`      | Template bearbeiten                                             |
| DELETE | `/api/notification-templates/:id`      | Template löschen (nur custom, nicht system)                     |
| POST   | `/api/notification-templates/:id/test` | Test-Notification senden                                        |
| GET    | `/api/notification-logs`               | Zustellungsprotokoll (paginated, Filter: date, channel, status) |
| GET    | `/api/notification-logs/stats`         | Zustellungsstatistiken pro Kanal                                |
| GET    | `/api/notification-preferences`        | Eigene Preferences laden                                        |
| PUT    | `/api/notification-preferences`        | Eigene Preferences speichern                                    |
| POST   | `/api/notifications/send`              | Manuell Notification senden (Admin)                             |
| POST   | `/api/notifications/send-bulk`         | Bulk: An alle Patienten / Gruppe senden                         |
| POST   | `/api/device-tokens`                   | Push-Token registrieren                                         |
| DELETE | `/api/device-tokens/:id`               | Push-Token entfernen                                            |

### RBAC Permissions

| Permission                             | Wer                 | Beschreibung                           |
| -------------------------------------- | ------------------- | -------------------------------------- |
| `notifications.view`                   | Alle Rollen         | Eigene Notifications sehen             |
| `notifications.manage_templates`       | Admin               | Templates erstellen/bearbeiten/löschen |
| `notifications.view_logs`              | Admin, Receptionist | Zustellungsprotokoll ansehen           |
| `notifications.send_manual`            | Admin, Receptionist | Manuell Notifications senden           |
| `notifications.send_bulk`              | Admin               | Bulk-Notifications (an Gruppen)        |
| `notifications.manage_preferences`     | Alle Rollen         | Eigene Preferences verwalten           |
| `notifications.manage_all_preferences` | Admin               | Preferences anderer User verwalten     |

### Webhook Events

| Event                           | Trigger                                      |
| ------------------------------- | -------------------------------------------- |
| `notification.sent`             | Notification erfolgreich versendet           |
| `notification.failed`           | Zustellung fehlgeschlagen (nach max Retries) |
| `notification.bounced`          | Email bounced                                |
| `notification.template_created` | Neues Template erstellt                      |
| `notification.template_updated` | Template geändert                            |
| `notification.bulk_sent`        | Bulk-Versand abgeschlossen                   |

### Externe Provider (v2)

| Kanal             | Provider                      | Kosten                                | Fallback        |
| ----------------- | ----------------------------- | ------------------------------------- | --------------- |
| **Email**         | Resend                        | Free Tier: 3000/Mo, dann $0.001/Email | Nodemailer SMTP |
| **SMS**           | Twilio                        | ~$0.0075/SMS (Ägypten)                | —               |
| **WhatsApp**      | Meta Business API             | Free: 1000/Mo, dann ~$0.05/Msg        | —               |
| **Push (Web)**    | Web Push API (VAPID)          | Kostenlos                             | —               |
| **Push (Mobile)** | Expo Notifications → FCM/APNs | Kostenlos                             | —               |

### v1 → v2 Vergleich

| Aspekt               | v1                                                            | v2                                                                                    |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Architektur          | Schema-Chaos (4 Tabellen mit Widersprüchen + Phantom-Tabelle) | ✅ 5 saubere Collections (templates, notifications, logs, preferences, device_tokens) |
| Queue Processing     | DB-Queue, **kein Worker** (wächst endlos)                     | ✅ BullMQ Workers (4 dedizierte Queues pro Kanal)                                     |
| In-App Notifications | ❌ Fake Bell (zeigt Appointments)                             | ✅ Echtes Notification Center + Socket.io Realtime                                    |
| Realtime             | 5-Min-Polling                                                 | ✅ Socket.io Instant (user:X Room)                                                    |
| Push Notifications   | ❌ Toggle ohne Implementierung                                | ✅ Web Push (VAPID) + Mobile Push (Expo/FCM)                                          |
| Templates            | 2 konkurrierende Spalten-Sätze                                | ✅ Unified Schema mit EN/AR pro Kanal                                                 |
| Preferences          | ❌ Nicht existent                                             | ✅ Pro User/Patient: Kanäle × Kategorien + Quiet Hours + Digest                       |
| Template-Variablen   | `{variable}` Plaintext-Ersetzung                              | ✅ Typisierte Variable-Liste mit Labels + Required-Flag                               |
| Scheduled Jobs       | pg_cron (nur Kommentar, nie aktiviert)                        | ✅ BullMQ Repeatable Jobs (Reminder, Recall, Payment, Stock)                          |
| Retry-Logik          | retry_count Spalte, kein Retry-Worker                         | ✅ BullMQ Auto-Retry mit Exponential Backoff                                          |
| Channels             | WhatsApp, Email, SMS (teilweise)                              | ✅ + Push (Web+Mobile) + In-App                                                       |
| Kanal-Settings       | Toggles gespeichert, nie geprüft                              | ✅ Preferences geprüft VOR Versand                                                    |
| Multi-Tenant         | tenant_id nachträglich, RLS unvollständig                     | ✅ Native Tenant-Isolation (DB-per-Tenant)                                            |
| Logs                 | Basis-Logging (status, error)                                 | ✅ + providerMessageId, providerResponse, Delivery-Tracking                           |
| Analytics            | ❌ Keine                                                      | ✅ Zustellungsstatistiken pro Kanal/Template                                          |
| Quiet Hours          | ❌ Nicht existent                                             | ✅ Pro User konfigurierbar                                                            |
| Digest Mode          | ❌ Nicht existent                                             | ✅ Realtime / Daily / Weekly wählbar                                                  |
| Patient-Historie     | ❌ Nicht verfügbar                                            | ✅ Alle Notifications pro Patient abrufbar                                            |
| Bulk-Versand         | ❌ Nicht existent                                             | ✅ An Gruppen/alle Patienten senden                                                   |

---

## 21. Reports & Analytics System

### v1-Analyse

#### Was existiert

| Komponente                      | Zeilen  | Status              | Details                                                                                |
| ------------------------------- | ------- | ------------------- | -------------------------------------------------------------------------------------- |
| `MaterialUsageReport.jsx`       | 544     | ✅ Funktional       | Einziger echter Report — Filter, Summary-Cards, CSV-Export                             |
| `Dashboard.jsx`                 | 460     | 🟡 Minimal          | 5 Stat-Cards (Termine heute, Patienten, Ärzte, Monats-Termine, Monats-Umsatz) + Listen |
| `CommissionList.jsx`            | 384     | 🟡 Operations-Seite | Stats + Gruppierung nach Arzt — kein Report-Format, Export-Button ohne Funktion        |
| `DailyReconciliationList.jsx`   | 376     | 🟡 Operations-Seite | Tägliche Kassenabrech­nung — kein Report, sondern Workflow                             |
| `v_low_stock_items`             | DB-View | ✅ Genutzt          | Items ≤ Reorder-Level (Dashboard + MaterialUsageReport)                                |
| `v_material_usage_summary`      | DB-View | ❌ Ungenutzt        | Monatliche Zusammenfassung — existiert in DB, kein UI                                  |
| `dashboard-stats` Edge Function | 278 Z.  | ⚠️ Dev-Portal       | SaaS-Plattform-Metriken (MRR, Tenants) — NICHT Klinik-Dashboard                        |

#### Was komplett FEHLT

| Kategorie           | Fehlende Reports                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Financial**       | Revenue by Doctor/Service/Branch/Period, Payment Collection, Outstanding/Aging, Payment Method Breakdown, Tax Report |
| **Patient**         | New vs. Returning, Demographics, No-Show Rate, Retention/Churn, Referral Source                                      |
| **Appointment**     | Utilization Rate, Cancellation Rate, Peak Hours, Wait Times, Duration Analysis, By Service Type                      |
| **Clinical**        | Procedures Performed, Treatment Plan Acceptance Rate, Lab Order Turnaround, Prescription Volumes                     |
| **Inventory**       | → Bereits in Abschnitt 16 definiert (10 Reports)                                                                     |
| **Chart Library**   | ❌ Keine installiert (kein recharts/Chart.js/D3)                                                                     |
| **PDF Export**      | ❌ Nicht für Reports (nur Consent Forms)                                                                             |
| **Excel Export**    | ❌ Komplett fehlend                                                                                                  |
| **Sidebar Reports** | ❌ Kein dedizierter Reports-Bereich                                                                                  |
| **Report Hooks**    | ❌ Keine wiederverwendbare Datenabfrageschicht                                                                       |
| **Analytics Views** | 🟡 Nur 2 Inventory-Views, keine für Revenue/Appointments/Patients                                                    |

### v2-Design: Zwei-Stufen-Modell

Reports werden in zwei Module aufgeteilt:

| Modul                   | Slug                 | Preis   | Inhalt                                                                                           |
| ----------------------- | -------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| **Dashboard & Reports** | `dashboard-reports`  | Free    | Dashboard-Widgets, Basis-Reports (aktuelle Periode, keine historische Analyse)                   |
| **Advanced Analytics**  | `advanced-analytics` | $199/Mo | Alle Reports, Custom Date Ranges, Charts, Drill-Down, Exports, Scheduled Reports, Custom Reports |

### Chart Library

```
Recharts 2.x  (React-basiert, composable, responsive, RTL-kompatibel)
```

| Warum Recharts | Detail                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| React-nativ    | Komponenten statt imperativ — passt zum Stack                           |
| Composable     | `<BarChart>`, `<LineChart>`, `<PieChart>` als JSX                       |
| Responsive     | `<ResponsiveContainer>` built-in                                        |
| Bundle Size    | ~45 KB gzipped (kleiner als Chart.js mit Adaptern)                      |
| RTL            | `reversed` Props für RTL Achsen                                         |
| Abgelehnt      | Chart.js (Canvas, nicht React-nativ), D3 (zu low-level), Nivo (zu groß) |

### Report-Kategorien & einzelne Reports

#### 1. Financial Reports (7 Reports)

| #   | Report                           | Beschreibung                                                        | Aggregation                                                            | Modul                                                 |
| --- | -------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| F1  | **Revenue Summary**              | Umsatz nach Zeitraum (Tag/Woche/Monat/Quartal/Jahr) mit Trend-Chart | `invoices` → `$group` by period, `$sum` total_amount WHERE status=paid | Free (aktueller Monat), Advanced (historisch + Chart) |
| F2  | **Revenue by Doctor**            | Umsatz-Ranking nach Arzt mit Prozent-Anteil                         | `invoices` → `$lookup` appointments → `$group` by doctorId             | Advanced                                              |
| F3  | **Revenue by Service**           | Umsatz nach Service-Typ/Kategorie                                   | `invoices.items` → `$unwind` → `$group` by serviceId                   | Advanced                                              |
| F4  | **Revenue by Branch**            | Umsatz-Vergleich zwischen Branches                                  | `invoices` → `$group` by branchId                                      | Advanced (Multi-Branch)                               |
| F5  | **Payment Collection**           | Zahlungseingänge nach Methode (Cash/Card/Bank/Insurance)            | `payments` → `$group` by method, `$sum` amount                         | Advanced                                              |
| F6  | **Outstanding Invoices (Aging)** | Offene Rechnungen nach Alter (0-30, 31-60, 61-90, 90+ Tage)         | `invoices` WHERE status≠paid → `$bucket` by age                        | Advanced                                              |
| F7  | **Tax Report**                   | Steuerübersicht nach Periode (für Buchhalter)                       | `invoices` → `$group` by period, `$sum` taxAmount                      | Advanced                                              |

#### 2. Patient Reports (5 Reports)

| #   | Report                      | Beschreibung                                              | Aggregation                                                         | Modul    |
| --- | --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| P1  | **Patient Overview**        | Gesamt-Patienten, Neue diesen Monat, Aktive, Inaktive     | `patients` → `$facet` (total, new, active, inactive)                | Free     |
| P2  | **New vs. Returning**       | Neue Patienten vs. wiederkehrende Besuche pro Periode     | `appointments` → `$lookup` patients → ist erster Termin? → `$group` | Advanced |
| P3  | **Patient Demographics**    | Altersgruppen, Geschlecht, Nationalität (Pie/Bar Charts)  | `patients` → `$bucket` age, `$group` by gender/nationality          | Advanced |
| P4  | **No-Show Report**          | No-Show-Rate nach Arzt, Wochentag, Uhrzeit                | `appointments` WHERE status=no_show → `$group` by doctor/dayOfWeek  | Advanced |
| P5  | **Patient Source/Referral** | Woher kommen Patienten? (Referral, Google, Walk-in, etc.) | `patients` → `$group` by referralSource                             | Advanced |

#### 3. Appointment Reports (6 Reports)

| #   | Report                     | Beschreibung                                            | Aggregation                                                        | Modul                               |
| --- | -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| A1  | **Appointment Summary**    | Termine heute/Woche/Monat nach Status                   | `appointments` → `$group` by status, period                        | Free (heute), Advanced (historisch) |
| A2  | **Doctor Utilization**     | Auslastung pro Arzt (gebuchte vs. verfügbare Slots)     | `appointments` + `doctor_schedules` → Prozent berechnet            | Advanced                            |
| A3  | **Chair Utilization**      | Stuhl-Auslastung pro Branch (% der Betriebszeit belegt) | `appointments` WHERE chairId → `$group` by chairId, berechne %     | Advanced                            |
| A4  | **Cancellation Analysis**  | Stornierungsrate, häufigste Gründe, Trend               | `appointments` WHERE status=cancelled → `$group` by reason, period | Advanced                            |
| A5  | **Peak Hours Heatmap**     | Wochentag × Uhrzeit Heatmap der Terminbuchungen         | `appointments` → `$group` by dayOfWeek × hour → Heatmap-Matrix     | Advanced                            |
| A6  | **Avg. Duration Analysis** | Ø Terminlänge nach Service-Typ + Arzt                   | `appointments` → `$avg` duration grouped by serviceType, doctorId  | Advanced                            |

#### 4. Clinical Reports (4 Reports)

| #   | Report                        | Beschreibung                                            | Aggregation                                                              | Modul    |
| --- | ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| C1  | **Procedures Performed**      | Häufigste Prozeduren nach Typ, Arzt, Zeitraum           | `procedure_notes` → `$group` by procedureType, doctorId                  | Advanced |
| C2  | **Treatment Plan Acceptance** | Akzeptanzrate (erstellt vs. begonnen vs. abgeschlossen) | `treatment_plans` → `$facet` by status (created, in_progress, completed) | Advanced |
| C3  | **Lab Order Turnaround**      | Ø Bearbeitungszeit: Bestellung → Ergebnis               | `lab_orders` → `$subtract` completedAt - createdAt → `$avg`              | Advanced |
| C4  | **Prescription Volume**       | Verschreibungen nach Medikament, Arzt, Zeitraum         | `prescriptions.items` → `$unwind` → `$group` by medication               | Advanced |

#### 5. Operational Reports (4 Reports)

| #   | Report                   | Beschreibung                                           | Aggregation                                                    | Modul    |
| --- | ------------------------ | ------------------------------------------------------ | -------------------------------------------------------------- | -------- |
| O1  | **Commission Summary**   | Provisionen nach Arzt, Status (pending/paid), Zeitraum | `doctor_commissions` → `$group` by doctorId, status            | Advanced |
| O2  | **Daily Reconciliation** | Tagesabschluss mit Soll/Ist-Vergleich                  | `reconciliation` → by date, branch                             | Advanced |
| O3  | **Wait Time Analysis**   | Ø Wartezeit nach Branch, Arzt, Uhrzeit                 | `appointments` → `$subtract` startedAt - arrivedAt → `$avg`    | Advanced |
| O4  | **Staff Productivity**   | Termine/Umsatz pro Arzt pro Arbeitstag                 | `appointments` + `invoices` → `$group` by doctorId, day → KPIs | Advanced |

#### 6. Inventory Reports (10 Reports)

> **→ Bereits in [Abschnitt 16](#16-inventory-management-system-deep-dive) definiert.**
> Material Usage, Stock Valuation, Expiry, Consumption Forecast, Supplier Performance, Stock Movement History, Purchase Order Summary, Low Stock, Dead Stock, ABC-Analyse.
> Inventar-Reports gehören zum `inventory-management` Modul ($29/Mo) — NICHT zu Advanced Analytics.

### Dashboard-Widgets (Free — `dashboard-reports` Modul)

| Widget                    | Daten                                                     | Visualisierung          |
| ------------------------- | --------------------------------------------------------- | ----------------------- |
| **Today's Overview**      | Termine (booked/confirmed/completed/no-show), Walk-ins    | Stat-Cards + Mini-Donut |
| **Revenue This Month**    | Umsatz aktueller Monat + Trend vs. Vormonat (↑/↓ %)       | Stat-Card + Sparkline   |
| **Patients This Month**   | Neue Patienten + Gesamtbesuche + Trend                    | Stat-Card + Sparkline   |
| **Upcoming Appointments** | Nächste 5 Termine mit Patient, Arzt, Uhrzeit              | Mini-Tabelle            |
| **Recent Patients**       | Letzte 5 registrierte/besuchte Patienten                  | Mini-Tabelle            |
| **Low Stock Alert**       | Top 5 Items unter Reorder-Level                           | Alert-Karten            |
| **Quick Actions**         | New Appointment, Add Patient, View Queue                  | Button-Gruppe           |
| **Waiting Room**          | Live-Auslastung des Warteraums (Integration Abschnitt 18) | Badge + Zähler          |

**Trend-Vergleich (v1 → v2):** v1 Dashboard hatte `change`-Prop im StatCard, wurde aber **NIE befüllt**. v2 berechnet tatsächlich den Vergleich mit Vormonat via Aggregation Pipeline.

### MongoDB Aggregation Pipeline — Beispiele

#### Revenue Summary (F1)

```javascript
// GET /api/reports/financial/revenue-summary?period=monthly&year=2026
const pipeline = [
  {
    $match: {
      status: 'paid',
      paidAt: { $gte: startOfYear, $lte: endOfYear },
    },
  },
  {
    $group: {
      _id: { $month: '$paidAt' },
      totalRevenue: { $sum: '$totalAmount' },
      invoiceCount: { $sum: 1 },
      avgInvoice: { $avg: '$totalAmount' },
    },
  },
  { $sort: { _id: 1 } },
  {
    $project: {
      month: '$_id',
      totalRevenue: 1,
      invoiceCount: 1,
      avgInvoice: { $round: ['$avgInvoice', 2] },
    },
  },
];
```

#### Peak Hours Heatmap (A5)

```javascript
// GET /api/reports/appointments/peak-hours?from=2026-01-01&to=2026-03-31
const pipeline = [
  {
    $match: {
      date: { $gte: from, $lte: to },
      status: { $in: ['booked', 'confirmed', 'completed'] },
    },
  },
  {
    $group: {
      _id: {
        dayOfWeek: { $dayOfWeek: '$date' }, // 1=Sun..7=Sat
        hour: { $hour: '$startTime' }, // 0..23
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
];
// Frontend renders als 7×12 Heatmap (recharts <HeatMapGrid />)
```

#### Outstanding Invoices Aging (F6)

```javascript
// GET /api/reports/financial/aging
const pipeline = [
  { $match: { status: { $in: ['sent', 'overdue', 'partially_paid'] } } },
  {
    $addFields: {
      ageDays: {
        $dateDiff: {
          startDate: '$issuedAt',
          endDate: '$$NOW',
          unit: 'day',
        },
      },
    },
  },
  {
    $bucket: {
      groupBy: '$ageDays',
      boundaries: [0, 31, 61, 91, Infinity],
      default: '90+',
      output: {
        count: { $sum: 1 },
        totalAmount: { $sum: '$balanceDue' },
        invoices: {
          $push: { id: '$_id', patient: '$patientId', amount: '$balanceDue', age: '$ageDays' },
        },
      },
    },
  },
];
```

### Scheduled & Saved Reports (BullMQ)

```javascript
// Collection: report_schedules (Tenant-DB)
{
  _id: ObjectId,
  tenantId: String,

  // Welcher Report
  reportType: String,          // 'financial.revenue_summary' | 'patient.no_show' | ...
  reportParams: {              // Gespeicherte Filter
    period: 'monthly',
    branchId: ObjectId | null,
    doctorId: ObjectId | null,
    dateRange: { from: Date, to: Date } | null  // null = rollierend (letzter Monat)
  },

  // Schedule
  frequency: String,           // 'daily' | 'weekly' | 'monthly'
  dayOfWeek: Number | null,    // 0=So..6=Sa (für weekly)
  dayOfMonth: Number | null,   // 1-28 (für monthly)
  time: String,                // '08:00' (UTC)
  timezone: String,            // 'Africa/Cairo'

  // Zustellung
  deliveryMethod: String,      // 'email' | 'in_app' | 'both'
  recipients: [ObjectId],      // User-IDs
  emailAddresses: [String],    // Externe Email-Adressen (Buchhalter etc.)
  format: String,              // 'pdf' | 'csv' | 'excel'

  // Meta
  name: String,                // 'Monthly Revenue Report'
  createdBy: ObjectId,
  isActive: Boolean,
  lastRunAt: Date | null,
  nextRunAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### BullMQ Worker: `report-generation`

```
┌─────────────────────────────────────────────────────┐
│  BullMQ Cron Job: report-scheduler (täglich 00:05)  │
├─────────────────────────────────────────────────────┤
│  1. Finde alle report_schedules WHERE               │
│     nextRunAt ≤ NOW AND isActive = true             │
│  2. Für jede: Job in Queue 'report-generation'      │
│  3. Update nextRunAt basierend auf frequency         │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Worker: report-generation  │
         ├────────────────────────────┤
         │  1. useDb(tenantDbName)     │
         │  2. Run Aggregation Pipeline│
         │  3. Generate PDF/CSV/Excel  │
         │  4. Upload to S3/R2         │
         │  5. Deliver:                │
         │     - Email → Resend        │
         │     - In-App → Notification │
         │  6. Log in report_history   │
         └────────────────────────────┘
```

### Export-System

| Format    | Library               | Verwendung                                                  |
| --------- | --------------------- | ----------------------------------------------------------- |
| **CSV**   | `@fast-csv/format`    | Tabellarische Daten, schnell, klein                         |
| **Excel** | `exceljs`             | Multi-Sheet, Formatierung, Formeln, Charts                  |
| **PDF**   | `@react-pdf/renderer` | React-Komponenten → PDF (Server-side, kein Puppeteer nötig) |

#### Export-Flow

```
┌──────────────────────────────────────────────────┐
│  POST /api/reports/export                         │
│  Body: { reportType, params, format }             │
├──────────────────────────────────────────────────┤
│  1. Run Aggregation Pipeline (gleich wie UI)      │
│  2. Switch format:                                │
│     csv   → @fast-csv/format → Stream Response    │
│     excel → exceljs Workbook → Stream Response    │
│     pdf   → @react-pdf/renderer → Buffer → Stream │
│  3. Response Headers:                             │
│     Content-Disposition: attachment; filename=...  │
│     Content-Type: application/octet-stream        │
└──────────────────────────────────────────────────┘
```

### UI-Seiten

| #   | Seite                   | Route                         | Modul    | Beschreibung                                                  |
| --- | ----------------------- | ----------------------------- | -------- | ------------------------------------------------------------- |
| 1   | **Dashboard**           | `/`                           | Free     | 8 Widgets (siehe oben), Layout konfigurierbar                 |
| 2   | **Reports Hub**         | `/reports`                    | Free     | Übersicht aller verfügbaren Reports nach Kategorie            |
| 3   | **Financial Reports**   | `/reports/financial/:type`    | Advanced | 7 Reports mit Date Range Picker, Branch/Doctor Filter, Charts |
| 4   | **Patient Reports**     | `/reports/patients/:type`     | Advanced | 5 Reports mit Demographics, Trends, Drill-Down                |
| 5   | **Appointment Reports** | `/reports/appointments/:type` | Advanced | 6 Reports mit Heatmap, Utilization, Trends                    |
| 6   | **Clinical Reports**    | `/reports/clinical/:type`     | Advanced | 4 Reports mit Procedure Stats, Acceptance Rates               |
| 7   | **Operational Reports** | `/reports/operational/:type`  | Advanced | 4 Reports mit Commission, Reconciliation, Wait Times          |
| 8   | **Saved Reports**       | `/reports/saved`              | Advanced | Liste gespeicherter Report-Konfigurationen                    |
| 9   | **Scheduled Reports**   | `/reports/scheduled`          | Advanced | Report-Schedules verwalten (CRUD)                             |

#### Report-Seite Layout (Standard für alle Reports)

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Reports    Revenue by Doctor         ⬇ Export │
├──────────────────────────────────────────────────────────┤
│  📅 Date Range: [01/01/2026] - [31/03/2026]              │
│  🏥 Branch: [All Branches ▼]   👨‍⚕️ Doctor: [All ▼]       │
│  [Apply Filters]  [Save as Report]  [Schedule]           │
├──────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Total   │ │ Average │ │ Highest │ │ Count   │       │
│  │ $45,200 │ │ $6,457  │ │ $12,300 │ │ 156     │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├──────────────────────────────────────────────────────────┤
│  📊 [Bar Chart / Line Chart / Pie Chart Toggle]          │
│  ┌──────────────────────────────────────────────────┐    │
│  │                                                  │    │
│  │              Recharts Visualization               │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│  📋 Detail-Tabelle (TanStack Table — sortierbar)         │
│  Doctor        │ Revenue  │ Patients │ Avg/Visit │ %     │
│  Dr. Ahmed     │ $12,300  │ 45       │ $273      │ 27.2% │
│  Dr. Sara      │ $10,800  │ 52       │ $207      │ 23.9% │
│  ...           │          │          │           │       │
└──────────────────────────────────────────────────────────┘
```

### Sidebar-Integration

```
📊 Reports                    ← Neuer Sidebar-Bereich
  ├── Dashboard               ← Free (dashboard-reports)
  ├── Reports Hub              ← Free (Übersicht, locked Reports markiert)
  ├── Financial               ← Advanced Analytics 🔒
  ├── Patient                 ← Advanced Analytics 🔒
  ├── Appointment             ← Advanced Analytics 🔒
  ├── Clinical                ← Advanced Analytics 🔒
  └── Operational             ← Advanced Analytics 🔒
```

Locked Reports zeigen Preview mit Blur + "Upgrade to Advanced Analytics" CTA.

### API Endpoints

| #   | Method | Route                             | Modul    | Beschreibung                           |
| --- | ------ | --------------------------------- | -------- | -------------------------------------- |
| 1   | GET    | `/api/dashboard/stats`            | Free     | Dashboard-Widgets Daten                |
| 2   | GET    | `/api/dashboard/trends`           | Free     | Trend-Vergleich aktueller vs. Vormonat |
| 3   | GET    | `/api/reports/financial/:type`    | Advanced | Financial Report Daten                 |
| 4   | GET    | `/api/reports/patients/:type`     | Advanced | Patient Report Daten                   |
| 5   | GET    | `/api/reports/appointments/:type` | Advanced | Appointment Report Daten               |
| 6   | GET    | `/api/reports/clinical/:type`     | Advanced | Clinical Report Daten                  |
| 7   | GET    | `/api/reports/operational/:type`  | Advanced | Operational Report Daten               |
| 8   | POST   | `/api/reports/export`             | Advanced | Report exportieren (PDF/CSV/Excel)     |
| 9   | GET    | `/api/reports/saved`              | Advanced | Gespeicherte Reports auflisten         |
| 10  | POST   | `/api/reports/saved`              | Advanced | Report-Konfiguration speichern         |
| 11  | DELETE | `/api/reports/saved/:id`          | Advanced | Gespeicherten Report löschen           |
| 12  | GET    | `/api/reports/scheduled`          | Advanced | Scheduled Reports auflisten            |
| 13  | POST   | `/api/reports/scheduled`          | Advanced | Neuen Schedule erstellen               |
| 14  | PATCH  | `/api/reports/scheduled/:id`      | Advanced | Schedule bearbeiten                    |
| 15  | DELETE | `/api/reports/scheduled/:id`      | Advanced | Schedule löschen                       |
| 16  | POST   | `/api/reports/scheduled/:id/run`  | Advanced | Schedule sofort ausführen              |

**Alle Report-Endpoints** akzeptieren Query-Parameter:

- `from`, `to` — Date Range (ISO 8601)
- `branchId` — Branch-Filter (optional, Multi-Branch Modul)
- `doctorId` — Arzt-Filter (optional)
- `format` — Response-Format: `json` (Default) | `csv` | `excel` | `pdf`

### RBAC Permissions

| Permission                 | Rollen                                    |
| -------------------------- | ----------------------------------------- |
| `reports.dashboard.view`   | Alle Staff (Free)                         |
| `reports.basic.view`       | admin, manager, doctor, accountant (Free) |
| `reports.advanced.view`    | admin, manager, accountant (Advanced)     |
| `reports.financial.view`   | admin, manager, accountant (Advanced)     |
| `reports.export`           | admin, manager, accountant (Advanced)     |
| `reports.schedules.manage` | admin, manager (Advanced)                 |
| `reports.saved.manage`     | admin, manager, accountant (Advanced)     |

### Webhook-Events

```javascript
const REPORT_EVENTS = [
  'report.generated', // Scheduled Report erfolgreich generiert
  'report.generation_failed', // Report-Generierung fehlgeschlagen
  'report.exported', // Manueller Export durchgeführt
  'report.schedule.created', // Neuer Schedule angelegt
  'report.schedule.deleted', // Schedule gelöscht
];
```

### v1 → v2 Vergleich

| Aspekt              | v1                                            | v2                                                    |
| ------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Reports gesamt      | 1 (Material Usage)                            | 26 Reports + 10 Inventory (Abschnitt 16)              |
| Dashboard           | 5 Stat-Cards, keine Trends                    | 8 Widgets + Sparklines + Trend-Vergleich              |
| Chart Library       | ❌ Keine installiert                          | ✅ Recharts 2.x (Bar, Line, Pie, Heatmap)             |
| Sidebar-Bereich     | ❌ Kein Reports-Bereich                       | ✅ Eigener Sidebar-Abschnitt „Reports"                |
| Financial Reports   | ❌ Nicht vorhanden                            | ✅ 7 Reports (Revenue, Aging, Tax, etc.)              |
| Patient Reports     | ❌ Nicht vorhanden                            | ✅ 5 Reports (Demographics, No-Show, Referral)        |
| Appointment Reports | ❌ Nicht vorhanden                            | ✅ 6 Reports (Utilization, Peak Hours, Heatmap)       |
| Clinical Reports    | ❌ Nicht vorhanden                            | ✅ 4 Reports (Procedures, Treatment Acceptance)       |
| Operational Reports | ❌ Nicht vorhanden                            | ✅ 4 Reports (Commission, Reconciliation, Wait Times) |
| CSV Export          | 1 Report (Browser-Blob)                       | ✅ Alle Reports (Server-side @fast-csv)               |
| Excel Export        | ❌ Fehlend                                    | ✅ Alle Reports (exceljs, Multi-Sheet)                |
| PDF Export          | ❌ Nicht für Reports                          | ✅ Alle Reports (@react-pdf/renderer)                 |
| Scheduled Reports   | ❌ Nicht vorhanden                            | ✅ BullMQ Cron → Email/In-App Delivery                |
| Saved Reports       | ❌ Nicht vorhanden                            | ✅ Filter-Konfiguration speichern + wiederverwenden   |
| Datenabfrage        | Client-side Promise.allSettled mit 3s Timeout | ✅ Server-side MongoDB Aggregation Pipelines          |
| Trend-Vergleich     | Prop existiert, nie befüllt                   | ✅ Tatsächlicher Vormonat-Vergleich                   |
| Drill-Down          | ❌ Nicht möglich                              | ✅ Klick auf Chart → Detail-Tabelle                   |
| Multi-Branch        | ❌ Nicht möglich                              | ✅ Branch-Filter auf allen Reports                    |
| Reports-Modul Flag  | Existiert, nie geprüft                        | ✅ Free-Tier + Advanced Analytics Paid                |

### Platform Usage Analytics — Design-Entscheidung

v1 hatte eine `tenant_usage_metrics`-Tabelle mit 20+ Spalten (active_users, revenue_amount,
api_calls, etc.) — **Schema-only, nie befüllt, nie gelesen**. Komplett tote Infrastruktur.

In v2 wird **keine eigene Collection** für Platform-Metriken erstellt. Stattdessen:

1. **Live Compute via MongoDB Aggregation:** Alle Tenant-Metriken (aktive User, Patienten-Anzahl,
   Revenue, API-Calls, Storage-Verbrauch) werden **on-demand** berechnet über direkte Aggregation
   auf den Tenant-Datenbanken. Der Dev Portal Dashboard und Monitoring nutzen diese Aggregation.

2. **Bestehende Collections reichen aus:** `audit_logs`, `error_logs`, `saas_payments`,
   `tenant_modules` und die Tenant-DBs selbst liefern alle nötigen Daten.

3. **Phase 6+ (optional):** Falls historische Trend-Daten über Monate benötigt werden,
   kann ein **BullMQ Cron Job** (täglich 03:00 UTC) Snapshots in eine `platform_metrics_history`
   Collection schreiben. Dies ist explizit **nicht** für Phase 1-5 geplant.

> **Begründung:** v1 bewies, dass eine vorbefüllte Metriken-Tabelle ohne Worker nutzlos ist.
> Live-Aggregation ist bei <500 Tenants performant genug und liefert immer aktuelle Daten.

---

## 22. Staff Scheduling & Availability System

### v1-Analyse

#### 3 konkurrierende Datenquellen für "Wann arbeitet ein Arzt?"

| #   | Quelle                  | Wo                                | Format                                                      | Problem                                                                                          |
| --- | ----------------------- | --------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `doctors.working_hours` | JSONB-Spalte auf Doctors-Tabelle  | `{monday: {start: "09:00", end: "17:00"}, friday: null}`    | Nicht branch-spezifisch — ein Arzt hat NUR eine working_hours, egal ob er in 3 Branches arbeitet |
| 2   | `doctor_schedules`      | Eigene Tabelle (Mig. 008)         | doctor_id + branch_id + day_of_week + start_time + end_time | ✅ Branch-spezifisch, aber NICHT mit Booking verbunden                                           |
| 3   | `branches.work_hours`   | JSONB-Spalte auf Branches-Tabelle | `{sunday: {start: "10:00", end: "22:00"}, friday: null}`    | Existiert, wird NIRGENDS validiert                                                               |

**Entscheidung v2:** `doctor_schedules` Collection ist die **EINZIGE Quelle der Wahrheit** für Arzt-Verfügbarkeit.
`doctors.workingHours` JSONB-Feld wird **ENTFERNT** — es ist redundant und nicht branch-spezifisch.

#### 2 parallele Schedule-Systeme

| System               | Tabellen                                                              | Für wen                   | v1-Status                                         |
| -------------------- | --------------------------------------------------------------------- | ------------------------- | ------------------------------------------------- |
| **Doctor Schedules** | `doctor_schedules` + `schedule_exceptions`                            | Ärzte                     | ✅ Funktional, aber nicht mit Booking verbunden   |
| **Staff Schedules**  | `staff_schedules` + `shift_templates` + `time_attendance` + `leave_*` | Receptionists, Nurses, HR | 🟡 Funktional als HR-Tool, nicht booking-relevant |

**Entscheidung v2:** Beide Systeme **BLEIBEN getrennt** — sie lösen unterschiedliche Probleme:

- `doctor_schedules` → **Booking-relevant** (bestimmt wann ein Arzt buchbar ist)
- `staff_schedules` → **HR/Operations** (Schichtplanung, Attendance, Leave)

#### Schedule ↔ Booking: Komplett getrennt

| Was v1 NICHT prüft                      | Konsequenz                                  |
| --------------------------------------- | ------------------------------------------- |
| Arzt arbeitet an dem Tag in der Branch? | Termin bei Arzt in falscher Branch buchbar  |
| Klinik an dem Tag geöffnet?             | Termin am Freitag (geschlossen) buchbar     |
| Arzt im Urlaub/krank?                   | Termin während Urlaub buchbar               |
| Uhrzeit innerhalb Arzt-Arbeitszeit?     | Termin um 03:00 nachts buchbar              |
| Uhrzeit innerhalb Branch-Öffnungszeit?  | Termin außerhalb Öffnungszeiten buchbar     |
| Ramadan-Modus aktiv?                    | Toggle existiert, wird nirgends ausgewertet |

**v1 AppointmentForm.jsx (1310 Zeilen):** Einziger Check ist Appointment-vs-Appointment-Konflikt (gleicher Arzt oder Stuhl). Keinerlei Schedule-Validierung.

#### Kein Online-Booking

- Keine Public Booking Page, kein Patient-Portal, kein öffentlicher API-Endpoint
- Keine Slot-Generierung basierend auf Schedules
- Alles manuelle Zeiteingabe durch Receptionist

#### UI-Komponenten (6407 Zeilen gesamt, 11 Dateien)

| Komponente                    | Zeilen | Funktion                                                     |
| ----------------------------- | ------ | ------------------------------------------------------------ |
| `UnifiedScheduleCalendar.jsx` | 1561   | Versuch beides (Doctors + Staff) in einem Kalender zu zeigen |
| `ScheduleCalendar.jsx`        | 945    | Doctor-only Kalender mit `isDoctorAvailable()` Funktion      |
| `AttendanceList.jsx`          | 644    | Clock-In/Out für alle Mitarbeiter                            |
| `LeaveRequestList.jsx`        | 556    | Urlaubsanträge auflisten                                     |
| `ScheduleList.jsx`            | 543    | Doctor-Schedule Listenansicht                                |
| `DoctorScheduleForm.jsx`      | 493    | Arzt → Branch → Tag zuweisen                                 |
| `LeaveRequestView.jsx`        | 467    | Urlaubsantrag Detail                                         |
| `LeaveRequestForm.jsx`        | 442    | Urlaubsantrag erstellen                                      |
| `ScheduleExceptionForm.jsx`   | 381    | Vacation, Sick Leave, Day Off erstellen                      |
| `StaffScheduleList.jsx`       | 375    | Wochenraster mit Shift-Zuweisungen                           |

### v2-Design: Hierarchische Verfügbarkeit

```
┌──────────────────────────────────────────────────────────┐
│  EBENE 1: Branch Öffnungszeiten (Container)              │
│  ─────────────────────────────────────────────────────── │
│  branches.workHours = {                                  │
│    sunday:    { start: "10:00", end: "22:00" },          │
│    monday:    { start: "10:00", end: "22:00" },          │
│    ...                                                   │
│    friday:    null,  // ← geschlossen                    │
│    saturday:  { start: "10:00", end: "22:00" }           │
│  }                                                       │
│  + ramadanHours + isRamadanMode                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  EBENE 2: Doctor Schedule (MUSS innerhalb liegen)  │  │
│  │  ──────────────────────────────────────────────── │  │
│  │  doctor_schedules = {                              │  │
│  │    doctorId, branchId,                             │  │
│  │    dayOfWeek: 1 (Monday),                          │  │
│  │    startTime: "10:00", endTime: "14:00"            │  │
│  │  }                                                 │  │
│  │  - schedule_exceptions (vacation, sick_leave)      │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  EBENE 3: Appointment (MUSS innerhalb)       │  │  │
│  │  │  ──────────────────────────────────────────  │  │  │
│  │  │  appointment = {                             │  │  │
│  │  │    doctorId, branchId,                       │  │  │
│  │  │    date: "2026-03-02" (Monday),              │  │  │
│  │  │    startTime: "10:00", endTime: "10:30"      │  │  │
│  │  │  }                                           │  │  │
│  │  │  ✅ Within doctor schedule                    │  │  │
│  │  │  ✅ Within branch hours                      │  │  │
│  │  │  ✅ No schedule exception active             │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Regel:** Jeden Termin (intern oder extern) durchläuft diese 3-Ebenen-Validierung. Kein Termin kann außerhalb der Hierarchie existieren.

### Collections

#### 1. `branches` — erweiterte Felder (Tenant-DB)

```typescript
{
  _id: ObjectId,
  // ... bestehende Felder (name, address, phone, etc.) ...

  // Öffnungszeiten (EINZIGE Quelle für Branch-Verfügbarkeit)
  workHours: {
    sunday:    { start: "10:00", end: "22:00" } | null,  // null = geschlossen
    monday:    { start: "10:00", end: "22:00" } | null,
    tuesday:   { start: "10:00", end: "22:00" } | null,
    wednesday: { start: "10:00", end: "22:00" } | null,
    thursday:  { start: "10:00", end: "22:00" } | null,
    friday:    null,                                      // Freitag geschlossen (Ägypten)
    saturday:  { start: "10:00", end: "22:00" } | null,
  },

  // Ramadan-Modus
  ramadanHours: {
    sunday:    { start: "10:00", end: "16:00" } | null,
    // ...
    friday:    null,
    saturday:  { start: "20:00", end: "02:00" } | null,  // Abend-Shift nach Iftar
  } | null,
  isRamadanMode: false,

  // Holidays (pro Branch konfigurierbar)
  holidays: [
    { date: "2026-04-21", name: { en: "Eid Al-Fitr Day 1", ar: "أول أيام عيد الفطر" } },
    { date: "2026-04-22", name: { en: "Eid Al-Fitr Day 2", ar: "ثاني أيام عيد الفطر" } },
    // ...
  ],

  // Slot-Konfiguration (pro Branch)
  slotConfig: {
    defaultDuration: 30,     // Minuten — Standard-Termin-Dauer
    minDuration: 15,         // Kürzester möglicher Termin
    maxDuration: 180,        // Längster möglicher Termin
    bufferBetween: 0,        // Puffer zwischen Terminen (Minuten)
    bookingLeadTime: 60,     // Mindestens 60 Min. vor Terminbeginn buchbar
    bookingWindowDays: 60,   // Maximal 60 Tage im Voraus buchbar
  },
}
```

#### 2. `doctor_schedules` — EINZIGE Quelle für Arzt-Verfügbarkeit (Tenant-DB)

```typescript
{
  _id: ObjectId,
  doctorId: ObjectId,       // → doctors._id
  branchId: ObjectId,       // → branches._id

  // Wann
  scheduleType: "recurring" | "override",
  // Für 'recurring': Wöchentliches Muster
  dayOfWeek: Number,        // 0=So, 1=Mo, ..., 6=Sa (nur bei recurring)
  // Für 'override': Einmaliger Termin an bestimmtem Datum
  specificDate: Date | null, // Nur bei override

  // Arbeitszeiten (MÜSSEN innerhalb Branch workHours liegen)
  startTime: "10:00",       // HH:mm
  endTime: "14:00",         // HH:mm

  // Optional: Break innerhalb der Arbeitszeit
  breakStart: "12:00" | null,
  breakEnd: "12:30" | null,

  // Status
  isActive: true,
  notes: String | null,

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
}

// Constraints (validiert bei Create/Update):
// 1. startTime < endTime
// 2. startTime >= branch.workHours[dayOfWeek].start
// 3. endTime <= branch.workHours[dayOfWeek].end
// 4. Branch darf an dem Tag nicht geschlossen sein
// 5. Kein Overlap mit anderen Schedules desselben Doctors am selben Tag
// 6. Doctor muss in assignedBranches die branchId haben
```

> **ENTFERNT:** `doctors.workingHours` JSONB-Feld existiert in v2 NICHT mehr.
> Die `doctor_schedules` Collection ersetzt es vollständig — branch-spezifisch, mit Validierung.

#### 3. `schedule_exceptions` — Abwesenheiten & Sonderzeiten (Tenant-DB)

```typescript
{
  _id: ObjectId,
  doctorId: ObjectId,
  branchId: ObjectId | null,     // null = gilt für ALLE Branches des Arztes

  exceptionType: "vacation" | "sick_leave" | "day_off" | "conference" | "special_hours" | "other",

  startDate: Date,               // Beginn (Datum)
  endDate: Date,                 // Ende (Datum, ≥ startDate)

  // Nur für 'special_hours': Override der normalen Arbeitszeiten
  specialStartTime: "10:00" | null,
  specialEndTime: "13:00" | null,

  reason: String | null,

  // Genehmigungsflow
  status: "pending" | "approved" | "rejected",
  approvedBy: ObjectId | null,
  approvedAt: Date | null,
  rejectionReason: String | null,

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
}
```

#### 4. `staff_schedules` — Schichtplanung für Non-Doctor Staff (Tenant-DB)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,              // → users._id (Receptionist, Nurse, etc.)
  branchId: ObjectId,
  shiftTemplateId: ObjectId | null,  // → shift_templates._id

  scheduleDate: Date,            // Konkretes Datum
  startTime: "08:00",
  endTime: "16:00",
  breakStart: "12:00" | null,
  breakEnd: "12:30" | null,

  status: "scheduled" | "confirmed" | "swapped" | "cancelled",
  isPublished: false,            // Veröffentlicht = sichtbar für Staff
  notes: String | null,

  createdAt: Date,
  updatedAt: Date,
}
```

#### 5. `shift_templates` — Vordefinierte Schichtvorlagen (Tenant-DB)

```typescript
{
  _id: ObjectId,
  name: String,                  // "Morning Shift" / "Evening Shift"
  startTime: "08:00",
  endTime: "16:00",
  breakDuration: 60,             // Minuten
  shiftType: "morning" | "afternoon" | "evening" | "night" | "full_day" | "split",
  color: "#3B82F6",
  branchId: ObjectId | null,     // null = global, sonst branch-spezifisch
  isDefault: false,              // Standard-Shift für neue Mitarbeiter
  isActive: true,

  createdAt: Date,
}

// Seed-Templates (bei Tenant-Erstellung):
// Morning Shift:  08:00 - 16:00 (60 Min Break)
// Evening Shift:  14:00 - 22:00 (60 Min Break)
// Night Shift:    22:00 - 06:00 (60 Min Break)
// Half Day AM:    08:00 - 12:00 (kein Break)
// Half Day PM:    13:00 - 17:00 (kein Break)
```

#### 6. `leave_requests` — Urlaubsanträge (Tenant-DB)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,              // Wer (Doctor oder Staff)
  leaveTypeId: ObjectId,         // → leave_types._id

  startDate: Date,
  endDate: Date,
  daysCount: Number,
  reason: String | null,

  status: "pending" | "approved" | "rejected" | "cancelled",
  approvedBy: ObjectId | null,
  approvedAt: Date | null,
  rejectionReason: String | null,

  createdAt: Date,
  updatedAt: Date,
}
```

#### 7. `leave_types` — Urlaubsarten (Tenant-DB)

```typescript
{
  _id: ObjectId,
  name: { en: "Annual Leave", ar: "إجازة سنوية" },
  daysPerYear: 21,
  isPaid: true,
  requiresApproval: true,
  maxDaysPerRequest: Number | null,
  color: "#3B82F6",
  isActive: true,
  createdAt: Date,
}

// Seed: Annual (21d), Sick (14d), Emergency (5d), Maternity (90d), Unpaid
```

#### 8. `leave_balances` — Urlaubskonto (Tenant-DB)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  leaveTypeId: ObjectId,
  year: 2026,
  entitledDays: 21,
  usedDays: 5,
  carryForward: 3,               // Tage vom Vorjahr
  // remainingDays berechnet: entitledDays + carryForward - usedDays
  createdAt: Date,
  updatedAt: Date,
}
```

#### 9. `time_attendance` — Zeiterfassung (Tenant-DB)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,              // Doctor oder Staff
  branchId: ObjectId,
  attendanceDate: Date,

  clockIn: Date | null,
  clockOut: Date | null,
  breakStart: Date | null,
  breakEnd: Date | null,

  scheduledStart: "09:00",       // Soll-Zeit
  scheduledEnd: "17:00",

  actualHours: 7.5,
  overtimeHours: 0.5,
  lateMinutes: 15,
  earlyLeaveMinutes: 0,

  status: "present" | "absent" | "late" | "half_day" | "on_leave",
  notes: String | null,

  createdAt: Date,
  updatedAt: Date,
}
```

### Slot-Engine: Verfügbare Zeitfenster berechnen

Die Slot-Engine ist die **zentrale Funktion** die sowohl intern (Receptionist) als auch extern (Webhook/Online-Booking) genutzt wird.

```typescript
// GET /api/availability/slots
// Query: ?branchId=X&doctorId=Y&date=2026-03-02&serviceId=Z

async function getAvailableSlots(branchId, doctorId, date, serviceDuration = 30) {
  // 1. Branch-Check: Ist die Klinik an dem Tag offen?
  const branch = await db.branches.findById(branchId);
  const dayName = getDayName(date); // 'monday', 'tuesday', etc.
  const hours =
    branch.isRamadanMode && branch.ramadanHours?.[dayName]
      ? branch.ramadanHours[dayName]
      : branch.workHours[dayName];

  if (!hours) return { available: false, reason: 'branch_closed', slots: [] };

  // 2. Holiday-Check
  const isHoliday = branch.holidays?.some((h) => isSameDay(h.date, date));
  if (isHoliday) return { available: false, reason: 'holiday', slots: [] };

  // 3. Doctor-Schedule: Arbeitet der Arzt an dem Tag in dieser Branch?
  const dayOfWeek = date.getDay(); // 0=So..6=Sa
  const doctorSchedule = await db.doctor_schedules.findOne({
    doctorId,
    branchId,
    scheduleType: 'recurring',
    dayOfWeek,
    isActive: true,
  });
  // Check for date-specific override
  const override = await db.doctor_schedules.findOne({
    doctorId,
    branchId,
    scheduleType: 'override',
    specificDate: date,
    isActive: true,
  });
  const effectiveSchedule = override || doctorSchedule;
  if (!effectiveSchedule) return { available: false, reason: 'doctor_not_scheduled', slots: [] };

  // 4. Exception-Check: Ist der Arzt an dem Tag abwesend?
  const exception = await db.schedule_exceptions.findOne({
    doctorId,
    $or: [{ branchId }, { branchId: null }], // branch-spezifisch ODER global
    startDate: { $lte: date },
    endDate: { $gte: date },
    status: 'approved',
    exceptionType: { $ne: 'special_hours' }, // special_hours blockieren nicht
  });
  if (exception)
    return {
      available: false,
      reason: 'doctor_unavailable',
      exceptionType: exception.exceptionType,
      slots: [],
    };

  // 5. Special Hours Check: Override der normalen Zeiten
  const specialHours = await db.schedule_exceptions.findOne({
    doctorId,
    startDate: { $lte: date },
    endDate: { $gte: date },
    status: 'approved',
    exceptionType: 'special_hours',
  });

  // 6. Effektive Arbeitszeit berechnen
  let workStart = effectiveSchedule.startTime;
  let workEnd = effectiveSchedule.endTime;
  if (specialHours) {
    workStart = specialHours.specialStartTime;
    workEnd = specialHours.specialEndTime;
  }

  // 7. Bestehende Termine laden (am selben Tag, selber Arzt)
  const existingAppointments = await db.appointments
    .find({
      doctorId,
      branchId,
      date,
      status: { $nin: ['cancelled', 'no_show'] },
    })
    .sort({ startTime: 1 });

  // 8. Slots generieren
  const slots = [];
  const slotDuration = serviceDuration || branch.slotConfig.defaultDuration;
  const buffer = branch.slotConfig.bufferBetween;
  const breakStart = effectiveSchedule.breakStart;
  const breakEnd = effectiveSchedule.breakEnd;

  let cursor = parseTime(workStart);
  const endLimit = parseTime(workEnd);

  while (cursor + slotDuration <= endLimit) {
    const slotStart = formatTime(cursor);
    const slotEnd = formatTime(cursor + slotDuration);

    // Skip if overlaps with break
    if (breakStart && breakEnd) {
      if (overlaps(cursor, cursor + slotDuration, parseTime(breakStart), parseTime(breakEnd))) {
        cursor = parseTime(breakEnd); // Springe nach der Pause
        continue;
      }
    }

    // Skip if overlaps with existing appointment
    const isBooked = existingAppointments.some((apt) =>
      overlaps(cursor, cursor + slotDuration, parseTime(apt.startTime), parseTime(apt.endTime)),
    );

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      isAvailable: !isBooked,
    });

    cursor += slotDuration + buffer;
  }

  return {
    available: true,
    date,
    branchId,
    doctorId,
    workStart,
    workEnd,
    breakStart,
    breakEnd,
    slots,
  };
}
```

### Booking-Validierung (Server-side, Fastify)

Jede Terminbuchung (intern vom Receptionist ODER extern via Webhook) durchläuft diese Validierung:

```typescript
// POST /api/appointments — Intern (Receptionist)
// POST /api/public/booking — Extern (Webhook von Klinik-Website)

async function validateAppointment(data) {
  const { branchId, doctorId, date, startTime, endTime } = data;
  const errors = [];

  // 1. Branch offen?
  const branch = await db.branches.findById(branchId);
  const dayName = getDayName(date);
  const hours =
    branch.isRamadanMode && branch.ramadanHours?.[dayName]
      ? branch.ramadanHours[dayName]
      : branch.workHours[dayName];

  if (!hours) errors.push({ code: 'BRANCH_CLOSED', message: 'Branch is closed on this day' });

  // 2. Holiday?
  const isHoliday = branch.holidays?.some((h) => isSameDay(h.date, date));
  if (isHoliday) errors.push({ code: 'HOLIDAY', message: 'Branch is closed for holiday' });

  // 3. Innerhalb Branch-Öffnungszeiten?
  if (hours && (startTime < hours.start || endTime > hours.end)) {
    errors.push({
      code: 'OUTSIDE_BRANCH_HOURS',
      message: `Branch open ${hours.start}-${hours.end}`,
    });
  }

  // 4. Doctor arbeitet an dem Tag/Branch?
  const schedule = await getEffectiveDoctorSchedule(doctorId, branchId, date);
  if (!schedule) {
    errors.push({
      code: 'DOCTOR_NOT_SCHEDULED',
      message: 'Doctor does not work at this branch on this day',
    });
  }

  // 5. Innerhalb Doctor-Arbeitszeit?
  if (schedule && (startTime < schedule.startTime || endTime > schedule.endTime)) {
    errors.push({
      code: 'OUTSIDE_DOCTOR_HOURS',
      message: `Doctor works ${schedule.startTime}-${schedule.endTime}`,
    });
  }

  // 6. Doctor nicht abwesend?
  const exception = await db.schedule_exceptions.findOne({
    doctorId,
    $or: [{ branchId }, { branchId: null }],
    startDate: { $lte: date },
    endDate: { $gte: date },
    status: 'approved',
    exceptionType: { $ne: 'special_hours' },
  });
  if (exception) {
    errors.push({ code: 'DOCTOR_UNAVAILABLE', message: `Doctor on ${exception.exceptionType}` });
  }

  // 7. Kein Appointment-Konflikt (gleicher Arzt oder Chair)?
  const conflict = await checkAppointmentConflict(
    doctorId,
    branchId,
    date,
    startTime,
    endTime,
    data.chairId,
  );
  if (conflict) {
    errors.push({ code: 'APPOINTMENT_CONFLICT', message: conflict.reason });
  }

  // 8. Booking Window (nur für Online-Booking)
  if (data.source === 'online') {
    const leadTimeOk =
      differenceInMinutes(parseDateTime(date, startTime), new Date()) >=
      branch.slotConfig.bookingLeadTime;
    if (!leadTimeOk)
      errors.push({ code: 'TOO_LATE', message: 'Booking too close to appointment time' });

    const windowOk =
      differenceInDays(parseDateTime(date, startTime), new Date()) <=
      branch.slotConfig.bookingWindowDays;
    if (!windowOk) errors.push({ code: 'TOO_FAR', message: 'Cannot book more than 60 days ahead' });
  }

  return { valid: errors.length === 0, errors };
}
```

### Online-Booking API (Webhook für Klinik-Website)

Die Klinik-Website (extern, nicht Teil von Dento) kann über eine **REST API** verfügbare Slots abfragen und Termine buchen. Dies läuft über Tenant-Level API Keys (Abschnitt 23 Webhook System).

```
┌─────────────────────────────────────────────────────────────┐
│  Klinik-Website (extern)                                     │
│  https://www.drcairo.com/book-appointment                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Branches laden                                      │
│  GET /api/public/branches                                    │
│  → [{id, name, address, workHours}]                          │
│                                                              │
│  Step 2: Ärzte der Branch laden                              │
│  GET /api/public/doctors?branchId=X                          │
│  → [{id, name, specialty, photoUrl}]                         │
│  (nur Ärzte die an der Branch arbeiten + isFeatured)         │
│                                                              │
│  Step 3: Verfügbare Slots laden                              │
│  GET /api/public/availability/slots                          │
│      ?branchId=X&doctorId=Y&date=2026-03-02                 │
│  → {available, workStart, workEnd, slots: [{                 │
│      startTime, endTime, isAvailable}]}                      │
│  (nutzt dieselbe Slot-Engine wie intern)                     │
│                                                              │
│  Step 4: Termin buchen                                       │
│  POST /api/public/booking                                    │
│  Body: {branchId, doctorId, date, startTime, endTime,        │
│         patientName, patientPhone, patientEmail, notes}       │
│  → Durchläuft validateAppointment() mit source='online'      │
│  → Erstellt Appointment mit status='pending_confirmation'    │
│  → Sendet Notification an Receptionist                       │
│  → Sendet Bestätigungs-SMS/Email an Patient                  │
│                                                              │
│  Auth: API Key im Header (X-API-Key: tenant_api_key_xyz)     │
│  Rate Limiting: 30 Requests/Min pro API Key                  │
└─────────────────────────────────────────────────────────────┘
```

**Online-Booking Appointments** haben `status: 'pending_confirmation'` — der Receptionist muss bestätigen (oder Auto-Confirm per Branch-Setting).

### Online-Booking Confirmation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Patient bucht online über Klinik-Website                    │
│  POST /api/public/booking                                    │
│  → Appointment created: status = 'pending_confirmation'      │
│  → Socket.io → Receptionist Desktop: 🔔 "Neue Online-Buchung"│
│  → SMS/Email an Patient: "Ihre Buchung wird geprüft..."     │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Receptionist öffnet       │
         │  Online-Booking Inbox      │
         │  /appointments/online      │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────────────────────────┐
         │  3 Optionen:                                    │
         │                                                 │
         │  ① BESTÄTIGEN (unverändert)                     │
         │     → status: 'confirmed'                       │
         │     → Notification an Patient:                  │
         │       "Termin bestätigt: Dr. Ahmad,             │
         │        Mo 2. März 10:00-10:30"                  │
         │                                                 │
         │  ② BESTÄTIGEN MIT ÄNDERUNGEN                    │
         │     Receptionist kann ändern:                   │
         │     - Datum / Uhrzeit (neuer Slot)              │
         │     - Arzt (anderer verfügbarer Arzt)           │
         │     - Branch (andere Filiale)                   │
         │     - Dauer (basierend auf Service)             │
         │     - Chair (Behandlungsstuhl)                  │
         │     - Interner Notiz hinzufügen                 │
         │     → Änderung durchläuft validateAppointment() │
         │     → status: 'confirmed'                       │
         │     → Notification an Patient:                  │
         │       "Termin bestätigt mit Änderung:           │
         │        Neuer Termin: Di 3. März 14:00-14:30     │
         │        Arzt: Dr. Sara (statt Dr. Ahmad)"        │
         │                                                 │
         │  ③ ABLEHNEN                                     │
         │     Receptionist wählt Grund:                   │
         │     - Arzt nicht verfügbar                      │
         │     - Zeitfenster ausgebucht                    │
         │     - Klinik geschlossen                        │
         │     - Sonstiges (Freitext)                      │
         │     → status: 'rejected'                        │
         │     → Notification an Patient:                  │
         │       "Leider können wir Ihren Termin nicht     │
         │        bestätigen. Grund: [Grund].              │
         │        Alternative Zeiten: [3 nächste Slots]"   │
         │     → Alternative Slots mitschicken (Slot-Engine)│
         └─────────────────────────────────────────────────┘
```

#### Notification-Kanäle bei Online-Booking Actions

| Action                       | Patient erhält                                  | Receptionist erhält                  |
| ---------------------------- | ----------------------------------------------- | ------------------------------------ |
| **Neue Buchung**             | SMS/Email: "Buchung eingegangen, wird geprüft"  | Socket.io Push + In-App Notification |
| **Bestätigt (unverändert)**  | SMS + Email + WhatsApp (falls Nummer vorhanden) | —                                    |
| **Bestätigt (mit Änderung)** | SMS + Email + WhatsApp mit Änderungs-Details    | —                                    |
| **Abgelehnt**                | SMS + Email mit Grund + 3 alternative Slots     | —                                    |
| **Auto-Confirmed**           | SMS + Email: "Termin automatisch bestätigt"     | In-App Notification (Info)           |

Der Kanal wird basierend auf den vom Patienten angegebenen Kontaktdaten gewählt:

- `patientPhone` → SMS (immer)
- `patientEmail` → Email (immer falls vorhanden)
- `patientPhone` + WhatsApp-fähig → WhatsApp (bevorzugt über SMS)

#### Receptionist-Änderungen: Was geändert werden kann

```typescript
// PATCH /api/appointments/:id/confirm
// Body:
{
  action: 'confirm' | 'confirm_with_changes' | 'reject',

  // Nur bei 'confirm_with_changes':
  changes: {
    date?: '2026-03-03',           // Neues Datum
    startTime?: '14:00',           // Neue Startzeit
    endTime?: '14:30',             // Neue Endzeit
    doctorId?: ObjectId,           // Anderer Arzt
    branchId?: ObjectId,           // Andere Branch
    chairId?: ObjectId,            // Anderer Stuhl
    notes?: 'Patient bevorzugt...' // Termin-Notiz
  },

  // Nur bei 'reject':
  rejectionReason?: 'doctor_unavailable' | 'slot_taken' | 'clinic_closed' | 'other',
  rejectionNote?: 'Dr. Ahmad ist am 2. März im Urlaub',

  // Notification-Override (optional)
  notifyViaSms: true,              // Default: true
  notifyViaEmail: true,            // Default: true wenn Email vorhanden
  notifyViaWhatsapp: false,        // Default: true wenn WhatsApp-fähig
  customMessage?: string,          // Optionale persönliche Nachricht an Patient
}
```

#### Auto-Confirm Setting (pro Branch)

```typescript
// branches.onlineBookingConfig
{
  autoConfirm: false,              // Default: false (Receptionist muss bestätigen)
  autoConfirmLeadTimeHours: 24,    // Nur Auto-Confirm wenn > 24h bis Termin
  requirePatientPhone: true,       // Telefon Pflichtfeld bei Online-Booking
  requirePatientEmail: false,      // Email optional
  allowDoctorSelection: true,      // Patient darf Arzt wählen (false = "Nächster verfügbar")
  enabledServices: [ObjectId],     // Nur bestimmte Services online buchbar (leer = alle)
  confirmationMessage: {           // Custom Bestätigungstext
    en: 'Thank you for booking at Dr. Cairo Dental...',
    ar: 'شكراً لحجزك في عيادة دكتور كايرو...'
  },
}
```

#### Webhook-Events für Online-Booking

```javascript
const ONLINE_BOOKING_EVENTS = [
  'booking.online.created', // Patient hat online gebucht
  'booking.online.confirmed', // Receptionist hat bestätigt (unverändert)
  'booking.online.confirmed_changed', // Receptionist hat mit Änderungen bestätigt
  'booking.online.rejected', // Receptionist hat abgelehnt
  'booking.online.auto_confirmed', // System hat auto-bestätigt
  'booking.online.patient_notified', // Patient wurde benachrichtigt (SMS/Email/WhatsApp)
];
```

### Ramadan-Modus

```typescript
// Branches haben 2 Sätze Öffnungszeiten:
// - workHours (normal)
// - ramadanHours (Ramadan)

// Toggle im Admin UI: Settings → Branch → "Ramadan Mode" Switch
// Toggle im Dev Portal: Tenant → Branch → "Ramadan Mode"

// Auswirkungen wenn isRamadanMode = true:
// 1. Branch-Öffnungszeiten → ramadanHours statt workHours
// 2. Slot-Engine nutzt ramadanHours
// 3. Online-Booking zeigt ramadanHours
// 4. Doctor-Schedules bleiben gleich, ABER:
//    - Validierung prüft ob Doctor-Schedule innerhalb ramadanHours liegt
//    - Falls nicht: Warning an Admin, Doctor-Schedule muss angepasst werden
// 5. Appointment Calendar zeigt "(Ramadan)" Badge
// 6. Notification an alle Staff wenn Modus aktiviert/deaktiviert wird

// BullMQ Cron-Job: ramadan-mode-reminder
// 1 Woche vor Ramadan-Beginn → Notification an Admin:
// "Ramadan beginnt in 7 Tagen. Bitte Ramadan-Öffnungszeiten und Arzt-Schedules prüfen."
```

### Appointment Calendar — Schedule-Integration

Der Appointment Calendar (Admin UI) zeigt jetzt Schedule-Informationen:

```
┌──────────────────────────────────────────────────────────┐
│  📅 Appointment Calendar — Montag, 2. März 2026           │
│  Branch: Cairo Main (10:00 - 22:00)                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  🟢 Dr. Ahmad    10:00-14:00  |  [Termin] [Termin] [---] │
│  🟢 Dr. Sara     14:00-20:00  |  [---] [Termin] [---]    │
│  🔴 Dr. Yasin    ❌ Nicht heute (works at Nasr City)      │
│  🟡 Dr. Rana     ⛱️ Urlaub (bis 10. März)                │
│                                                           │
│  ─── Geschlossene Zeiten ───                              │
│  ░░░ 00:00-10:00 (vor Öffnung)                           │
│  ░░░ 22:00-24:00 (nach Schließung)                       │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  Freitag, 7. März 2026                                    │
│  🔴 GESCHLOSSEN (Freitag)                                │
│  Keine Termine buchbar                                    │
└──────────────────────────────────────────────────────────┘
```

### UI-Seiten (v2)

| #   | Seite                       | Route                         | Beschreibung                                                |
| --- | --------------------------- | ----------------------------- | ----------------------------------------------------------- |
| 1   | **Schedule Overview**       | `/schedules`                  | Kalender-Ansicht: alle Ärzte × Tage, wer arbeitet wo        |
| 2   | **Doctor Schedule Form**    | `/schedules/doctor/assign`    | Arzt → Branch → Wochentag → Zeiten zuweisen                 |
| 3   | **Schedule Exception Form** | `/schedules/exception/create` | Urlaub, Krank, Tag-frei, Sonderzeiten erstellen             |
| 4   | **Staff Schedule**          | `/schedules/staff`            | Wochenraster für Non-Doctor Staff mit Shift-Templates       |
| 5   | **Shift Templates**         | `/schedules/shifts`           | Schichtvorlagen verwalten (CRUD)                            |
| 6   | **Attendance**              | `/schedules/attendance`       | Clock-In/Out für alle Mitarbeiter                           |
| 7   | **Leave Requests**          | `/schedules/leave`            | Urlaubsanträge auflisten (pending/approved/rejected)        |
| 8   | **Leave Request Form**      | `/schedules/leave/new`        | Urlaubsantrag erstellen                                     |
| 9   | **Leave Balances**          | `/schedules/leave/balances`   | Urlaubskonto-Übersicht pro Mitarbeiter                      |
| 10  | **Branch Hours**            | `/settings/branch/:id/hours`  | Branch-Öffnungszeiten + Ramadan-Zeiten + Holidays verwalten |

### API Endpoints

| #                             | Method | Route                                   | Beschreibung                                             |
| ----------------------------- | ------ | --------------------------------------- | -------------------------------------------------------- |
| **Doctor Schedules**          |        |                                         |                                                          |
| 1                             | GET    | `/api/schedules/doctor/:doctorId`       | Alle Schedules eines Arztes (alle Branches)              |
| 2                             | GET    | `/api/schedules/branch/:branchId`       | Alle Doctor-Schedules einer Branch                       |
| 3                             | POST   | `/api/schedules/doctor`                 | Doctor-Schedule erstellen (mit Branch-Hours Validierung) |
| 4                             | PATCH  | `/api/schedules/doctor/:id`             | Doctor-Schedule bearbeiten                               |
| 5                             | DELETE | `/api/schedules/doctor/:id`             | Doctor-Schedule löschen                                  |
| **Exceptions**                |        |                                         |                                                          |
| 6                             | GET    | `/api/schedules/exceptions`             | Alle Exceptions (Filter: doctor, date range, status)     |
| 7                             | POST   | `/api/schedules/exceptions`             | Exception erstellen (Urlaub, Krank, etc.)                |
| 8                             | PATCH  | `/api/schedules/exceptions/:id`         | Exception bearbeiten                                     |
| 9                             | PATCH  | `/api/schedules/exceptions/:id/approve` | Exception genehmigen/ablehnen                            |
| **Staff Schedules**           |        |                                         |                                                          |
| 10                            | GET    | `/api/schedules/staff`                  | Staff-Schedules (Filter: user, branch, date range)       |
| 11                            | POST   | `/api/schedules/staff`                  | Staff-Schedule erstellen (mit Shift-Template)            |
| 12                            | PATCH  | `/api/schedules/staff/:id`              | Staff-Schedule bearbeiten                                |
| 13                            | POST   | `/api/schedules/staff/publish`          | Wochen-Schedule veröffentlichen                          |
| **Shift Templates**           |        |                                         |                                                          |
| 14                            | GET    | `/api/schedules/shifts`                 | Alle Shift-Templates                                     |
| 15                            | POST   | `/api/schedules/shifts`                 | Shift-Template erstellen                                 |
| 16                            | PATCH  | `/api/schedules/shifts/:id`             | Shift-Template bearbeiten                                |
| 17                            | DELETE | `/api/schedules/shifts/:id`             | Shift-Template löschen                                   |
| **Leave**                     |        |                                         |                                                          |
| 18                            | GET    | `/api/leave/requests`                   | Leave Requests auflisten                                 |
| 19                            | POST   | `/api/leave/requests`                   | Leave Request erstellen                                  |
| 20                            | PATCH  | `/api/leave/requests/:id/approve`       | Leave genehmigen/ablehnen                                |
| 21                            | GET    | `/api/leave/balances/:userId`           | Leave Balances eines Users                               |
| **Attendance**                |        |                                         |                                                          |
| 22                            | GET    | `/api/attendance`                       | Attendance Records (Filter: user, branch, date)          |
| 23                            | POST   | `/api/attendance/clock-in`              | Clock-In                                                 |
| 24                            | POST   | `/api/attendance/clock-out`             | Clock-Out                                                |
| **Availability (Public)**     |        |                                         |                                                          |
| 25                            | GET    | `/api/public/branches`                  | Branches mit Öffnungszeiten (Public, kein Auth)          |
| 26                            | GET    | `/api/public/doctors`                   | Ärzte einer Branch (Public, gefiltert nach Schedule)     |
| 27                            | GET    | `/api/public/availability/slots`        | Verfügbare Slots (Slot-Engine)                           |
| 28                            | POST   | `/api/public/booking`                   | Online-Termin buchen (API Key Auth)                      |
| **Online-Booking Management** |        |                                         |                                                          |
| 29                            | GET    | `/api/appointments/online`              | Pending Online-Bookings auflisten                        |
| 30                            | PATCH  | `/api/appointments/:id/confirm`         | Bestätigen / Bestätigen mit Änderungen / Ablehnen        |

### RBAC Permissions

| Permission                     | Rollen                                    |
| ------------------------------ | ----------------------------------------- |
| `schedules.doctor.view`        | Alle Staff                                |
| `schedules.doctor.manage`      | admin, manager                            |
| `schedules.staff.view`         | admin, manager, hr                        |
| `schedules.staff.manage`       | admin, manager, hr                        |
| `schedules.shifts.manage`      | admin, manager                            |
| `schedules.exceptions.create`  | Alle Staff (eigene)                       |
| `schedules.exceptions.approve` | admin, manager                            |
| `leave.request.create`         | Alle Staff (eigene)                       |
| `leave.request.approve`        | admin, manager, hr                        |
| `leave.balances.view`          | admin, manager, hr (alle), Staff (eigene) |
| `attendance.view`              | admin, manager, hr (alle), Staff (eigene) |
| `attendance.manage`            | admin, manager, hr                        |
| `branch.hours.manage`          | admin, manager                            |

### Webhook-Events

```javascript
const SCHEDULING_EVENTS = [
  'schedule.doctor.created', // Arzt-Schedule erstellt
  'schedule.doctor.updated', // Arzt-Schedule geändert
  'schedule.doctor.deleted', // Arzt-Schedule gelöscht
  'schedule.exception.created', // Abwesenheit erstellt
  'schedule.exception.approved', // Abwesenheit genehmigt
  'schedule.exception.rejected', // Abwesenheit abgelehnt
  'schedule.staff.published', // Wochen-Schedule veröffentlicht
  'leave.request.created', // Urlaubsantrag erstellt
  'leave.request.approved', // Urlaubsantrag genehmigt
  'leave.request.rejected', // Urlaubsantrag abgelehnt
  'attendance.clock_in', // Mitarbeiter eingestempelt
  'attendance.clock_out', // Mitarbeiter ausgestempelt
  'booking.online.created', // Online-Termin erstellt (via Webhook)
  'booking.online.confirmed', // Receptionist bestätigt (unverändert)
  'booking.online.confirmed_changed', // Receptionist bestätigt mit Änderungen
  'booking.online.rejected', // Receptionist abgelehnt
  'booking.online.auto_confirmed', // System Auto-Confirm
  'booking.online.patient_notified', // Patient benachrichtigt (SMS/Email/WhatsApp)
  'branch.hours.updated', // Branch-Öffnungszeiten geändert
  'branch.ramadan_mode.toggled', // Ramadan-Modus aktiviert/deaktiviert
];
```

### v1 → v2 Vergleich

| Aspekt                          | v1                                                                 | v2                                                              |
| ------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Working Hours Quellen           | 3 (doctors.working_hours + doctor_schedules + branches.work_hours) | ✅ 1 — `doctor_schedules` Collection ist Single Source of Truth |
| `doctors.workingHours`          | JSONB auf Doctor, nicht branch-spezifisch                          | ✅ ENTFERNT — ersetzt durch `doctor_schedules`                  |
| Branch-Öffnungszeiten           | JSONB existiert, wird nie validiert                                | ✅ Erzwungen: Doctor-Schedule MUSS innerhalb liegen             |
| Schedule ↔ Booking              | ❌ Komplett getrennt                                               | ✅ 3-Ebenen-Validierung bei JEDEM Termin                        |
| Slot-Generierung                | ❌ Nicht existent                                                  | ✅ Slot-Engine (Branch + Doctor + Exceptions + Appointments)    |
| Online-Booking                  | ❌ Nicht existent                                                  | ✅ Public API für Klinik-Website (4 Endpoints)                  |
| Online-Booking Confirmation     | ❌ N/A                                                             | ✅ Receptionist: Bestätigen / Ändern+Bestätigen / Ablehnen      |
| Online-Booking Notifications    | ❌ N/A                                                             | ✅ SMS + Email + WhatsApp bei jeder Status-Änderung             |
| Online-Booking Auto-Confirm     | ❌ N/A                                                             | ✅ Pro Branch konfigurierbar                                    |
| Ramadan-Modus                   | Toggle existiert, nie ausgewertet                                  | ✅ Funktional: ramadanHours, Auto-Switch, Reminder-Job          |
| Holidays                        | ❌ Nicht existent                                                  | ✅ Pro Branch konfigurierbar, blockiert Booking                 |
| schedule_exceptions bei Booking | ❌ Ignoriert                                                       | ✅ Geprüft: Urlaub/Krank blockiert Termin                       |
| Appointment Calendar            | Zeigt nur Termine                                                  | ✅ + Schedule-Overlay (wer arbeitet wo, geschlossene Zeiten)    |
| Doctor-Schedule System          | Funktional (Branch-Zuweisung)                                      | ✅ Beibehalten + Validierung + Break-Support                    |
| Staff-Schedule System           | Funktional (HR-Tool)                                               | ✅ Beibehalten, getrennt von Booking                            |
| Shift-Templates                 | Schema + 5 Defaults, für Staff                                     | ✅ Beibehalten, erweitert um branchId + shiftType               |
| Attendance                      | Clock-In/Out + Late/Overtime                                       | ✅ Beibehalten + Location (GPS)                                 |
| Leave System                    | Anträge + Genehmigung + Balances                                   | ✅ Beibehalten + Integration mit schedule_exceptions            |
| Leave ↔ Schedule                | ❌ Getrennt (leave_requests vs schedule_exceptions)                | ✅ Approved Leave → Auto-Exception erstellen                    |
| Booking Lead Time               | ❌ Nicht existent                                                  | ✅ Mindestens N Minuten vorher (konfigurierbar)                 |
| Booking Window                  | ❌ Nicht existent                                                  | ✅ Max N Tage im Voraus (konfigurierbar)                        |
| Buffer zwischen Terminen        | ❌ Nicht existent                                                  | ✅ Konfigurierbarer Puffer (0-30 Min)                           |
| UI-Seiten                       | 11 (nicht synchronisiert)                                          | 10 (sauber getrennt: Doctor + Staff + Leave + Attendance)       |
| API Endpoints                   | 0 (alles client-side Supabase)                                     | 30 Endpoints (inkl. 4 Public + 2 Online-Booking Management)     |
| RBAC                            | Minimal (admin/doctor)                                             | 13 granulare Permissions                                        |

---

## 23. Webhook System (Zwei Ebenen)

### Ebene 1: Platform-Webhooks (Dev Portal)

| Aspekt             | Detail                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wer nutzt es**   | Du (Platform-Betreiber)                                                                                                                               |
| **Wo sichtbar**    | Dev Portal                                                                                                                                            |
| **Gespeichert in** | `dento_platform` DB                                                                                                                                   |
| **Events**         | tenant.created, tenant.suspended, subscription.paid, subscription.overdue, module.updated, deployment.completed, system.error, system.health_degraded |
| **Zweck**          | Dich über Platform-Events benachrichtigen                                                                                                             |

### Ebene 2: Tenant-Webhooks (Admin Portal)

| Aspekt             | Detail                                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wer nutzt es**   | Jeder Tenant für seine Klinik                                                                                                                                                                                           |
| **Wo sichtbar**    | Admin App → Einstellungen → Webhooks                                                                                                                                                                                    |
| **Gespeichert in** | `tenant_{slug}` DB (isoliert!)                                                                                                                                                                                          |
| **Events**         | patient.created/updated/deleted, appointment.created/cancelled/completed/reminder/no_show, invoice.created/paid/overdue, treatment.started/completed, cbct.scan_completed, xray.captured, device.connected/disconnected |
| **Zweck**          | Tenant verbindet seine Website, CRM, Geräte                                                                                                                                                                             |

### Isolation

Physisch getrennt — verschiedene MongoDB-Databases. Tenant A kann Tenant B's Webhooks niemals sehen.

### Delivery-Mechanismus

```
Event (z.B. patient.created)
  → BullMQ Job erstellen
    → Worker: HTTP POST an Webhook-URL
      → Erfolg: webhook_logs status=success
      → Fehler: Retry in 60s (max 3x, exponentieller Backoff)
        → Nach 10 konsekutiven Fehlern: Auto-Disable
```

---

## 24. Module Versioning System

### Lifecycle

```
DEVELOPMENT → BETA → ACTIVE → DEPRECATED → RETIRED
```

### Versioning in Payload CMS

```typescript
// Collection: modules (in dento_platform DB)
{
  slug: "dental-charting",
  version: "2.1.0",              // SemVer
  status: "active",
  changelog: [
    { version: "2.1.0", date: "2026-03-15", changes: ["Added perio chart"] },
    { version: "2.0.0", date: "2026-01-01", changes: ["Initial release"] }
  ],
  dependsOn: ["patient-records"],  // Muss aktiv sein
  conflictsWith: [],
  migrations: [
    { version: "2.1.0", type: "addField", collection: "dental_charts", field: "perioData" }
  ]
}

// Collection: tenant_modules (in dento_platform DB)
{
  tenantId: "...",
  moduleSlug: "dental-charting",
  installedVersion: "2.0.0",
  availableVersion: "2.1.0",
  updatePolicy: "auto",         // auto | manual | pinned
  pinnedVersion: null,           // oder "2.0.x"
  isCanary: false,
  // Preis-Override pro Tenant (z.B. Rabatt, Sale)
  priceOverride: null,           // null = Standard-Preis aus pricing_config
  discountPercent: 0,            // 0-100, z.B. 20 für 20% Rabatt
  discountExpiresAt: null,       // Ablaufdatum für Rabatt
  updateHistory: [
    { from: "1.5.0", to: "2.0.0", at: "2026-01-01", status: "success" }
  ]
}
```

### Update-Rollout

```
Developer pusht v2.1.0
  → Canary (5% der Tenants mit isCanary=true)
  → 24h Monitoring (Error Rate < 1%?)
    → JA: Rolling Rollout (25% → 50% → 100%)
    → NEIN: Auto-Rollback zu v2.0.0
```

### Validierungen (portiert aus v1)

- SemVer-Format erzwungen
- Downgrades verhindert
- Dependency-Check: `dependsOn`-Module müssen aktiv sein
- Conflict-Check: `conflictsWith`-Module dürfen nicht aktiv sein
- Slug-Änderung verhindert wenn Tenants zugeordnet
- Retirement verhindert wenn aktive Tenants

---

## 25. Tenant Locale & Currency System

### Konzept: Country → defaults vorschlagen, Tenant wählt

Wenn ein Tenant sich registriert, wählt er **Country**. Das System **schlägt** daraufhin
Language + Currency + andere Defaults **vor** — aber der Tenant **wählt selbst**:

```
Registrierung:
  1. Tenant wählt:   Country = Egypt (EG)
  2. System schlägt vor (vorausgefüllt, änderbar):
     → Language = Arabic (ar)       ← VORAUSWAHL, Tenant kann English wählen!
     → Currency = EGP               ← VORAUSWAHL, Tenant kann USD wählen!
  3. Automatisch gesetzt (nicht änderbar über Country):
     → Phone Prefix = +20
     → Tax Rate = 14% VAT
     → Payment Provider = Paymob
     → Date Format = dd/MM/yyyy

Beispiel 1: Ägyptische Klinik, arabisch
  Country=EG, Language=ar, Currency=EGP  → RTL, arabische UI, EGP-Rechnungen

Beispiel 2: Internationale Klinik in Kairo, englisch
  Country=EG, Language=en, Currency=EGP  → LTR, englische UI, aber EGP-Rechnungen + Paymob

Beispiel 3: Klinik in Kairo, will USD
  Country=EG, Language=ar, Currency=USD  → RTL, arabisch, aber USD-Rechnungen + Paymob
```

### Was wird vom Land bestimmt vs. was wählt der Tenant?

| Setting                       | Quelle                 | Änderbar?  | Wer darf ändern?            |
| ----------------------------- | ---------------------- | :--------: | --------------------------- |
| **Phone Prefix** (+20)        | `country_config`       |  ❌ Fest   | Nur Developer (Land ändern) |
| **Tax Rate** (14%)            | `country_config`       |  ❌ Fest   | Nur Developer               |
| **Tax Label**                 | `country_config`       |  ❌ Fest   | Nur Developer               |
| **Payment Provider** (Paymob) | `country_config`       |  ❌ Fest   | Nur Developer               |
| **Language** (ar)             | Vorschlag von Country  | ✅ Wählbar | Tenant Admin + Developer    |
| **Currency** (EGP)            | Vorschlag von Country  | ✅ Wählbar | Tenant Admin + Developer    |
| **Timezone**                  | Vorschlag von Country  | ✅ Wählbar | Tenant Admin + Developer    |
| **Date Format**               | Von Sprache abgeleitet | ✅ Wählbar | Tenant Admin + Developer    |

### Sprachänderung — Wer darf, was passiert?

#### Wer darf die Sprache ändern?

| Wer              | Wo                                 | Wie                                  | Sofort wirksam? |
| ---------------- | ---------------------------------- | ------------------------------------ | :-------------: |
| **Tenant Admin** | Admin Portal → Settings → Language | Dropdown (alle aktivierten Sprachen) |    ✅ Sofort    |
| **Developer**    | Dev Portal → Tenant → Settings Tab | Dropdown (alle Platform-Sprachen)    |    ✅ Sofort    |

#### Was ändert sich bei Sprachwechsel? (Propagation)

Wenn Language von `ar` auf `en` geändert wird:

```
Settings.language = "en"
  │
  ├── 1. UI Direction
  │     settings.direction = "ltr"  (war "rtl")
  │     → document.dir = "ltr"
  │     → Tailwind Logical Properties flippen automatisch
  │     → Sidebar links statt rechts
  │     → Text links-ausgerichtet statt rechts
  │
  ├── 2. Alle Module (UI-Texte)
  │     → translation_packs für "en" werden geladen
  │     → Alle Labels, Buttons, Menüs = Englisch
  │     → Patienten-Formulare = Englisch
  │     → Dental Chart Labels = Englisch
  │     → Rechnungen-Vorlagen = Englisch
  │     → Reports = Englisch
  │
  ├── 3. Notifications
  │     → SMS/Email/WhatsApp Templates = Englisch
  │     → Push Notifications = Englisch
  │     → Appointment Reminders = Englisch
  │
  ├── 4. Datums-Format (optional, getrennt änderbar)
  │     → dd/MM/yyyy bleibt (ist Country-Default)
  │     → Aber Monatsnamen = "January" statt "يناير"
  │
  ├── 5. Mobile App (wenn aktiv)
  │     → NativeWind RTL → LTR
  │     → I18nManager.forceRTL(false)
  │     → App Reload nötig
  │
  └── 6. Was sich NICHT ändert:
        → Currency (bleibt EGP)
        → Tax Rate (bleibt 14%)
        → Phone Prefix (bleibt +20)
        → Payment Provider (bleibt Paymob)
        → Bestehende Rechnungen (bleiben in der alten Sprache)
        → Bestehende Notifications (bereits gesendet)
```

#### Technische Umsetzung der Propagation

```typescript
// API Route: PATCH /tenant-api/settings/language
async function changeLanguage(req, res) {
  const { language } = req.body; // z.B. "en"
  const db = req.db; // tenant_{slug} DB

  // 1. Sprache in languages Collection validieren
  const lang = await platformDb.collection('languages').findOne({ code: language, isActive: true });
  if (!lang) throw new Error('Language not available');

  // 2. Prüfen ob Translation Packs existieren
  const packs = await platformDb
    .collection('translation_packs')
    .find({ languageCode: language })
    .toArray();
  const completeness = packs.reduce((acc, p) => acc + p.completeness, 0) / packs.length;

  // 3. Settings aktualisieren
  await db.collection('settings').updateOne(
    {},
    {
      $set: {
        language: language,
        direction: lang.direction, // "ltr" für en, "rtl" für ar
        updatedAt: new Date(),
        updatedBy: req.user.userId,
      },
    },
  );

  // 4. Audit Log
  await logAudit(req, 'settings.language_changed', {
    from: oldLanguage,
    to: language,
    completeness: `${Math.round(completeness * 100)}%`,
  });

  // 5. Socket.io Event → alle verbundenen Clients refreshen
  io.to(`tenant:${req.user.tenantSlug}`).emit('locale:changed', {
    language,
    direction: lang.direction,
  });

  return { language, direction: lang.direction, completeness };
}
```

#### Frontend: Reaktion auf Sprachwechsel

```typescript
// React Hook: useLocale()
function useLocale() {
  const { settings } = useTenantSettings();

  // Bei Sprachwechsel: Direction sofort anwenden
  useEffect(() => {
    document.documentElement.dir = settings.direction; // 'ltr' oder 'rtl'
    document.documentElement.lang = settings.language; // 'en' oder 'ar'
  }, [settings.direction, settings.language]);

  // Socket.io: Live-Update wenn Admin die Sprache ändert
  useEffect(() => {
    socket.on('locale:changed', ({ language, direction }) => {
      // Alle offenen Browser-Tabs dieses Tenants aktualisieren sich
      queryClient.invalidateQueries(['tenant-settings']);
      queryClient.invalidateQueries(['translations']);
    });
  }, []);
}
```

### Admin Portal — Settings Seite (Sprache ändern)

Der Tenant Admin sieht unter **Settings → General**:

```
┌─────────────────────────────────────────────┐
│ General Settings                             │
│                                              │
│ Country:    🇪🇬 Egypt                [locked] │
│ Language:   [  Arabic ▾  ]          [ändern] │
│ Currency:   [  EGP   ▾  ]          [ändern] │
│ Timezone:   [  Africa/Cairo ▾  ]   [ändern] │
│ Date Format:[  dd/MM/yyyy ▾  ]     [ändern] │
│                                              │
│ ⚠️ Language ändern ändert die UI-Sprache     │
│    und Text-Richtung für ALLE User.          │
│    Aktive Sitzungen werden automatisch       │
│    aktualisiert.                              │
│                                              │
│ Phone:      +20 (von Country)       [locked] │
│ Tax Rate:   14% VAT                 [locked] │
│ Payment:    Paymob                  [locked] │
└─────────────────────────────────────────────┘
```

### Dev Portal — Tenant Settings Tab (Sprache ändern)

Der Developer sieht unter **Tenant → Settings Tab** die gleichen Felder,
hat aber zusätzlich:

- Kann **Country** ändern (was Tax Rate + Payment Provider ändert)
- Kann Sprachen **aktivieren/deaktivieren** für diesen Tenant (enabledLanguages)
- Sieht **Translation Completeness** pro Sprache
- Kann **Sprache forcen** (z.B. wenn Tenant Probleme mit RTL hat)

### Collection: `country_config` (Platform-DB)

```typescript
// Payload Collection: country_config
{
  code: "EG",
  name: { en: "Egypt", ar: "مصر" },
  phoneCode: "+20",
  phoneMask: "+20 XXX XXX XXXX",
  phoneLength: 10,                   // Ziffern nach +20
  defaultCurrency: "EGP",
  defaultLanguage: "ar",
  direction: "rtl",
  taxRate: 0.14,
  taxLabel: { en: "VAT", ar: "ضريبة القيمة المضافة" },
  dateFormat: "dd/MM/yyyy",
  timeFormat: "hh:mm A",             // 12h mit AM/PM
  numberFormat: { decimal: ".", thousands: "," },
  paymentProvider: "paymob",          // paymob | stripe
  isActive: true,
  flag: "🇪🇬"
}
```

```typescript
// Weitere Länder:
{ code: "SA", name: { en: "Saudi Arabia", ar: "السعودية" }, phoneCode: "+966",
  defaultCurrency: "SAR", defaultLanguage: "ar", direction: "rtl",
  taxRate: 0.15, paymentProvider: "stripe", flag: "🇸🇦" },

{ code: "AE", name: { en: "UAE", ar: "الإمارات" }, phoneCode: "+971",
  defaultCurrency: "AED", defaultLanguage: "ar", direction: "rtl",
  taxRate: 0.05, paymentProvider: "stripe", flag: "🇦🇪" },

{ code: "TR", name: { en: "Turkey", ar: "تركيا" }, phoneCode: "+90",
  defaultCurrency: "TRY", defaultLanguage: "tr", direction: "ltr",
  taxRate: 0.20, paymentProvider: "stripe", flag: "🇹🇷" },

{ code: "KW", name: { en: "Kuwait", ar: "الكويت" }, phoneCode: "+965",
  defaultCurrency: "KWD", defaultLanguage: "ar", direction: "rtl",
  taxRate: 0.0, paymentProvider: "stripe", flag: "🇰🇼" },

{ code: "GB", name: { en: "United Kingdom", ar: "بريطانيا" }, phoneCode: "+44",
  defaultCurrency: "GBP", defaultLanguage: "en", direction: "ltr",
  taxRate: 0.20, paymentProvider: "stripe", flag: "🇬🇧" },
```

### Per-Tenant Locale Settings (Tenant-DB)

```typescript
// In tenant settings document (tenant_{slug} DB):
{
  // === Locale (gesetzt bei Registrierung, änderbar) ===
  country: "EG",                     // ISO 3166-1 alpha-2
  language: "ar",                     // Default-Sprache für UI
  currency: "EGP",                   // Default-Währung für alles
  timezone: "Africa/Cairo",           // IANA Timezone
  dateFormat: "dd/MM/yyyy",          // Übernommen von country_config
  timeFormat: "hh:mm A",
  direction: "rtl",                   // Übernommen von Sprache

  // === Billing (SaaS-Gebühren) ===
  billingCurrency: "EGP",            // In welcher Währung der Tenant zahlt
  paymentProvider: "paymob",          // paymob | stripe
  taxRate: 0.14,                      // 14% VAT
  taxLabel: "ضريبة القيمة المضافة",

  // === Klinik (Patienten-Rechnungen) ===
  clinicCurrency: "EGP",             // Standard-Währung für Patienten
  clinicCurrencyOverridable: true,   // Darf pro Rechnung geändert werden?
}
```

### Propagation im Detail

| Bereich                 | Was passiert                                  | Quelle                                                  |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------- |
| **Phone Inputs**        | Default Country Code (+20), Mask, Validierung | `country_config.phoneCode`                              |
| **Patienten-Formulare** | Land-Dropdown zeigt Tenant-Land als Default   | `settings.country`                                      |
| **Rechnungen**          | Währung = EGP, Tax = 14%, Tax-Label arabisch  | `settings.clinicCurrency` + `settings.taxRate`          |
| **UI Sprache**          | Alle Texte arabisch, RTL Layout               | `settings.language` + `settings.direction`              |
| **Datums-Anzeige**      | dd/MM/yyyy, hh:mm AM/PM                       | `settings.dateFormat`                                   |
| **Reports**             | Zahlen in EGP, arabische Labels               | `settings.currency`                                     |
| **SaaS-Billing**        | Monatliche Gebühren in EGP via Paymob         | `settings.billingCurrency` + `settings.paymentProvider` |
| **Notifications**       | SMS/Email in der Tenant-Sprache               | `settings.language`                                     |

### Per-Invoice / Per-Patient Currency Override

Der Tenant arbeitet standardmäßig in seiner gewählten Währung (z.B. EGP).
Aber er kann **pro Rechnung oder pro Patient** eine andere Währung wählen:

```typescript
// Patient mit anderem Währungs-Default (z.B. Tourist, Expat)
{
  _id: "patient_123",
  firstName: "John",
  lastName: "Smith",
  country: "GB",                     // Anderes Land als Tenant
  preferredCurrency: "GBP",          // Rechnungen für diesen Patienten in GBP
  phoneCode: "+44",                  // Phone Prefix vom Patienten-Land
}

// Rechnung mit Currency Override
{
  _id: "invoice_456",
  patientId: "patient_123",
  currency: "GBP",                   // Override: GBP statt EGP
  exchangeRate: 0.0158,              // 1 EGP = 0.0158 GBP (zum Zeitpunkt)
  subtotal: 150.00,                  // In GBP
  tax: 0,                            // Keine VAT für ausländische Patienten
  total: 150.00,
  originalAmount: 9500.00,           // Referenz: Betrag in Clinic-Währung (EGP)
  originalCurrency: "EGP",
}
```

### Currency-Auswahl Logik

```
Rechnung erstellen:
  1. Patient hat preferredCurrency?     → Diese Währung vorauswählen
  2. Sonst: Tenant clinicCurrency       → EGP (Standard)
  3. User kann manuell ändern           → Dropdown mit allen 8 Währungen
  4. exchangeRate wird automatisch       → Vom currencies Global gespeichert
  5. originalAmount + originalCurrency   → Für Reporting in einheitlicher Währung
```

### Globale Währungsliste (Platform-DB)

```typescript
// Payload Global: currencies
{
  baseCurrency: "USD",            // Alles USD-basiert (nicht mehr EGP!)
  supported: [
    { code: "USD", symbol: "$",   name: { en: "US Dollar", ar: "دولار" }, rate: 1.0 },
    { code: "EGP", symbol: "E£",  name: { en: "Egyptian Pound", ar: "جنيه" }, rate: 50.0 },
    { code: "EUR", symbol: "€",   name: { en: "Euro", ar: "يورو" }, rate: 0.92 },
    { code: "GBP", symbol: "£",   name: { en: "British Pound", ar: "باوند" }, rate: 0.79 },
    { code: "SAR", symbol: "SAR", name: { en: "Saudi Riyal", ar: "ريال" }, rate: 3.75 },
    { code: "AED", symbol: "AED", name: { en: "UAE Dirham", ar: "درهم" }, rate: 3.67 },
    { code: "TRY", symbol: "₺",   name: { en: "Turkish Lira", ar: "ليرة" }, rate: 36.0 },
    { code: "KWD", symbol: "KD",  name: { en: "Kuwaiti Dinar", ar: "دينار" }, rate: 0.31 },
  ],
  lastRateUpdate: "2026-02-24T12:00:00Z",
  rateProvider: "exchangerate-api.com"
}
```

### Was sich ändert vs v1

| v1                                  | v2                                                               |
| ----------------------------------- | ---------------------------------------------------------------- |
| EGP als Basiswährung                | USD als Basiswährung                                             |
| Nur USD + EGP, hardcoded Preise     | Alle 8 Währungen, dynamische Preise via Dev Portal               |
| Hardcoded `currencySymbols` Map     | DB-basiert, über Payload Global                                  |
| 2 getrennte Systeme (SaaS + Klinik) | 1 einheitliches System                                           |
| Kein Country-System                 | `country_config` Collection mit Phone, Tax, Payment Provider     |
| Keine Locale-Propagation            | Country → Defaults vorschlagen, Tenant wählt Language + Currency |
| Keine per-Invoice Währung           | Per-Patient + per-Invoice Currency Override                      |
| Kein Paymob                         | Paymob für Ägypten, Stripe für International                     |
| Sprache nicht wählbar               | Tenant wählt Sprache selbst (Country ist nur Vorschlag)          |
| Sprachwechsel nicht möglich         | Admin + Developer können Sprache jederzeit ändern                |
| Kein Live-Update bei Sprachwechsel  | Socket.io propagiert zu allen offenen Clients                    |

---

## 26. Sprach-/i18n-System

### Architektur

```typescript
// Platform-DB Collections:
// 1. languages — Verfügbare Sprachen
{
  code: "ar",
  name: { en: "Arabic", native: "العربية" },
  direction: "rtl",
  isActive: true
}

// 2. translation_packs — Übersetzungen pro Modul + Sprache
{
  languageCode: "ar",
  moduleSlug: "patient-records",
  version: "1.0.0",
  translations: {
    "patient.firstName": "الاسم الأول",
    "patient.lastName": "اسم العائلة",
    "appointment.title": "موعد",
    // ...
  },
  completeness: 1.0,  // 100% übersetzt
  releasedAt: "2026-03-01"
}

// 3. tenant_languages — Was ein Tenant nutzen darf
{
  tenantId: "clinic_cairo",
  enabledLanguages: ["en", "ar"],   // Welche Sprachen verfügbar sind
  defaultLanguage: "ar",            // Aktuell gewählte Sprache
  canAdminChange: true,             // Darf Tenant Admin die Sprache ändern?
  translationOverrides: {
    "appointment.title": "موعد العيادة"  // Tenant-spezifisch
  }
}
```

### Was sich ändert vs v1

| v1                                | v2                                                    |
| --------------------------------- | ----------------------------------------------------- |
| Statisches JS-Objekt (687 Zeilen) | DB-basiert, über Payload                              |
| Nur en + ar                       | Beliebig erweiterbar (tr, de, fr, ...)                |
| Nicht pro Modul                   | Pro Modul versioniert                                 |
| Kein Tenant-Override              | Tenant kann Übersetzungen anpassen                    |
| Kein Completeness-Tracking        | Dashboard zeigt % pro Sprache                         |
| Sprache nur über Code änderbar    | Admin + Developer können Sprache live ändern          |
| Sprachwechsel erfordert Reload    | Socket.io propagiert Änderung an alle offenen Clients |

### RTL/LTR Umschaltung

```typescript
// Tailwind Logical Properties — funktioniert automatisch
<div className="ms-4 me-2 text-start">  // flippt bei dir="rtl"

// React Native (NativeWind) — gleich
<View className="ms-4 me-2">
  <Text className="text-start">{t('patient.firstName')}</Text>
</View>
```

---

## 27. Auth & RBAC

### User Types — Alle Rollen im System

Dento hat **zwei Ebenen** von Benutzern: **Platform-Level** (Dev Portal) und **Tenant-Level** (Admin Portal).

#### Platform-Level (Dev Portal)

| Rolle              | Beschreibung                             | Zugang                                                             | Wer erstellt ihn?        |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------ | ------------------------ |
| `platform_admin`   | Du — der Platform-Owner/Developer        | Dev Portal (`/developer/*`) — voller Zugriff auf **alles**         | Hardcoded / Self-Created |
| `platform_support` | Support-Mitarbeiter (optional, Phase 6+) | Dev Portal — eingeschränkt: nur Tenants, Tickets, Support Sessions | `platform_admin`         |

> **`platform_admin` ist die höchste Rolle im gesamten System.** Er kontrolliert alle Tenants,
> alle Module, alle Preise, alle Daten. Kein Tenant-User kann auf Dev Portal-Funktionen zugreifen.

#### Tenant-Level (Admin Portal) — 7 Rollen

| Rolle          | Beschreibung                  | Erstellt von                           | Scope                                                                                             |
| -------------- | ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `tenant_admin` | Klinik-Manager / Inhaber      | `platform_admin` bei Tenant-Erstellung | Voller Zugriff auf **alle 28 Module** innerhalb des eigenen Tenants                               |
| `dentist`      | Zahnarzt                      | `tenant_admin` (via Invite)            | Patienten, Charts, Treatment Plans, Procedure Notes, Prescriptions, X-Rays, Appointments, Reports |
| `receptionist` | Empfang / Front Desk          | `tenant_admin` (via Invite)            | Patienten, Termine, Walk-ins, Rechnungen, Zahlungen, Notifications                                |
| `assistant`    | Zahnärztliche Assistentin     | `tenant_admin` (via Invite)            | Patienten (lesen), Charts (lesen), Inventory, Sterilisation, Stuhl-Vorbereitung                   |
| `accountant`   | Buchhalter / Finance          | `tenant_admin` (via Invite)            | Rechnungen, Zahlungen, Reports (Financial), Reconciliation, Commissions                           |
| `lab_tech`     | Labortechniker                | `tenant_admin` (via Invite)            | Lab Orders, Lab Order Types (eigene Aufträge)                                                     |
| `hygienist`    | Dentalhygienikerin (optional) | `tenant_admin` (via Invite)            | Patienten, Appointments (eigene), Procedure Notes (eigene), Dental Charts (lesen)                 |

#### Rollen-Hierarchie

```
platform_admin (Developer)          ← Kontrolliert ALLES (alle Tenants, alle Daten)
  │
  └── tenant_admin (Klinik-Manager) ← Kontrolliert NUR seinen eigenen Tenant
        │
        ├── dentist                 ← Klinische Arbeit
        ├── accountant              ← Finanz-Arbeit
        ├── receptionist            ← Front-Desk-Arbeit
        ├── assistant               ← Assistenz-Arbeit
        ├── lab_tech                ← Labor-Arbeit
        └── hygienist               ← Hygiene-Arbeit
```

### Von Payload CMS bereitgestellt

```typescript
// User-Rollen
type Role =
  | 'platform_admin'    // Du — Dev Portal Zugang
  | 'platform_support'  // Support-Agent — eingeschränkter Dev Portal Zugang (Phase 6+)
  | 'tenant_admin'      // Klinik-Manager — volles Admin Portal
  | 'dentist'           // Zahnarzt — Patienten, Charts, Treatment Plans
  | 'receptionist'      // Empfang — Patienten, Termine, Rechnungen
  | 'assistant'         // Assistentin — Patienten, Charts (read), Inventory
  | 'accountant'        // Buchhalter — Rechnungen, Reports, Reconciliation
  | 'lab_tech'          // Labortechniker — Lab Orders
  | 'hygienist';        // Dentalhygienikerin — Patienten, eigene Appointments

// JWT Token Struktur
{
  userId: "abc123",
  tenantSlug: "clinic_cairo",  // Null für Platform-Admins
  role: "dentist",
  email: "dr.ahmad@clinic.com",
  exp: 1740000000,
  iat: 1739913600
}
```

### Access Control Flow

```
Request → JWT validieren (Payload Auth)
  → Tenant bestimmen (tenantSlug aus Token)
  → DB wählen (useDb)
  → Rolle prüfen (roleGuard)
  → Daten zurückgeben
```

### Brute-Force-Schutz (Login-Sicherheit)

v1 hatte **keinen Brute-Force-Schutz** — unbegrenzte Login-Versuche waren möglich.
v2 implementiert eine **progressive Cooldown-Strategie** basierend auf Redis:

#### Cooldown-Eskalation

| Fehlversuche | Cooldown       | Aktion                                                |
| ------------ | -------------- | ----------------------------------------------------- |
| 1–3          | —              | Normaler Login-Versuch, kein Cooldown                 |
| 4–6          | **5 Minuten**  | Account temporär gesperrt, Countdown im UI            |
| 7–9          | **15 Minuten** | Verlängerte Sperre                                    |
| 10–12        | **30 Minuten** | Verlängerte Sperre                                    |
| 13–15        | **1 Stunde**   | Lange Sperre                                          |
| 16+          | **IP-Block**   | IP-Adresse wird geblockt (manuelles Entsperren nötig) |

#### Redis-Implementierung

```typescript
// Redis Keys (TTL = Cooldown-Dauer):
// login:attempts:{email}       → Number (Fehlversuche-Zähler)
// login:cooldown:{email}       → Timestamp (Cooldown-Ende)
// login:ip_blocked:{ip}        → Boolean (IP gesperrt)

async function checkLoginAllowed(
  email: string,
  ip: string,
): Promise<{
  allowed: boolean;
  cooldownSeconds?: number;
  reason?: string;
}> {
  // 1. IP geblockt?
  const ipBlocked = await redis.get(`login:ip_blocked:${ip}`);
  if (ipBlocked) return { allowed: false, reason: 'IP_BLOCKED' };

  // 2. Cooldown aktiv?
  const cooldownEnd = await redis.get(`login:cooldown:${email}`);
  if (cooldownEnd && Date.now() < Number(cooldownEnd)) {
    return {
      allowed: false,
      cooldownSeconds: Math.ceil((Number(cooldownEnd) - Date.now()) / 1000),
      reason: 'COOLDOWN_ACTIVE',
    };
  }

  return { allowed: true };
}

async function recordFailedLogin(email: string, ip: string): Promise<void> {
  const attempts = await redis.incr(`login:attempts:${email}`);
  await redis.expire(`login:attempts:${email}`, 3600); // Reset nach 1h ohne Versuch

  const cooldownMap: Record<number, number> = {
    4: 5 * 60, // 5 Min (Sekunden)
    7: 15 * 60, // 15 Min
    10: 30 * 60, // 30 Min
    13: 60 * 60, // 1 Stunde
  };

  for (const [threshold, seconds] of Object.entries(cooldownMap)) {
    if (attempts === Number(threshold)) {
      await redis.set(
        `login:cooldown:${email}`,
        String(Date.now() + seconds * 1000),
        'EX',
        seconds,
      );
      break;
    }
  }

  // IP-Block bei 16+ Versuchen
  if (attempts >= 16) {
    await redis.set(`login:ip_blocked:${ip}`, '1'); // Kein TTL → manuelles Entsperren
  }
}

async function recordSuccessfulLogin(email: string): Promise<void> {
  await redis.del(`login:attempts:${email}`);
  await redis.del(`login:cooldown:${email}`);
}
```

#### `login_attempts` Collection (Platform-DB)

Für **Audit-Zwecke** werden alle Login-Versuche (erfolgreich + fehlgeschlagen) gespeichert:

```typescript
{
  _id: ObjectId,
  email: String,
  ip: String,
  userAgent: String,
  success: Boolean,
  failureReason: String | null,    // enum: invalid_credentials|cooldown|ip_blocked|account_suspended
  tenantSlug: String | null,       // Null wenn unbekannter User
  attemptNumber: Number,           // Aktueller Fehlversuch-Zähler
  cooldownApplied: Number | null,  // Cooldown in Sekunden (falls ausgelöst)
  createdAt: Date,
}
// Index: { email: 1, createdAt: -1 }
// Index: { ip: 1, createdAt: -1 }
// Index: { createdAt: 1 }  TTL Index: 90 Tage Retention
```

#### Admin-Aktionen (Dev Portal)

| Aktion            | Route                                    | Beschreibung                                                 |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------ |
| IP entsperren     | `DELETE /api/admin/auth/ip-block/:ip`    | Manuelles Entsperren einer IP                                |
| Cooldown aufheben | `DELETE /api/admin/auth/cooldown/:email` | Cooldown für einen User aufheben                             |
| Login-History     | `GET /api/admin/auth/login-history`      | Alle Login-Versuche (Filter: email, ip, success, date range) |
| Geblockte IPs     | `GET /api/admin/auth/blocked-ips`        | Liste aller geblockten IPs                                   |

### Rollen-Management — Design-Entscheidung

> **v1-Kontext:** v1 hatte eine `role_permissions`-Tabelle + RoleManagement.jsx (629 Zeilen)
> mit Permission-Checkboxen. **Aber die Permissions wurden NIE erzwungen** — der tatsächliche
> Access Control lief über hardcoded RLS-Policies. Die UI war rein kosmetisch.

**v2 Design: 7 feste Code-definierte Rollen mit Middleware-Enforcement.**

Dies ist eine **bewusste Design-Entscheidung**:

- Rollen sind im Code definiert, nicht in der Datenbank
- Jede Rolle hat ein **festes Permission-Set** das der Fastify `roleGuard` Middleware erzwingt
- Keine Custom-Rollen-Erstellung (zu komplex, fehleranfällig für Klinik-Manager)
- **Aber:** Der `tenant_admin` kann Rollen **zuweisen** und User **verwalten**

#### Was der Tenant-Admin kann (innerhalb seines Tenants)

| Aktion                        | Beschreibung                                            |
| ----------------------------- | ------------------------------------------------------- |
| **User einladen**             | Neuen User per Email einladen, Rolle zuweisen           |
| **Rolle ändern**              | Role eines Users ändern (z.B. assistant → receptionist) |
| **User suspendieren**         | Temporäres Sperren eines Users                          |
| **User deaktivieren**         | Permanentes Deaktivieren (Soft-Delete)                  |
| **User-Liste sehen**          | Alle User im eigenen Tenant sehen + verwalten           |
| **Module aktivieren**         | Bezahlte Module für den Tenant ein-/ausschalten         |
| **Settings ändern**           | Tenant-Settings (Sprache, Currency, Branding, etc.)     |
| **Alert Rules konfigurieren** | Alert-Regeln für den Tenant anpassen                    |

#### Was der Tenant-Admin NICHT kann

| Einschränkung                   | Grund                                                           |
| ------------------------------- | --------------------------------------------------------------- |
| ❌ Andere Tenants sehen         | Database-per-Tenant Isolation                                   |
| ❌ Dev Portal zugreifen         | Route-Guard: `tenantSlug !== null` → kein `/developer/*` Zugang |
| ❌ Custom Rollen erstellen      | Design-Entscheidung: 7 feste Rollen                             |
| ❌ Einzelne Permissions togglen | Rollen haben feste Permission-Sets                              |
| ❌ Platform-Preise ändern       | Nur `platform_admin` im Dev Portal                              |
| ❌ Modules installieren         | Module werden vom `platform_admin` freigeschaltet               |
| ❌ Sich selbst löschen          | Mindestens ein `tenant_admin` muss existieren                   |

#### Permission-Matrix (Modul × Rolle)

```
Legend: ✅ = Full Access  👁️ = Read-Only  ➕ = Own Records Only  ❌ = No Access

Module               | tenant_admin | dentist | receptionist | assistant | accountant | lab_tech | hygienist
---------------------|-------------|---------|-------------|-----------|------------|---------|----------
Dashboard            | ✅          | ✅      | ✅          | ✅        | ✅         | ✅      | ✅
Patients             | ✅          | ✅      | ✅          | 👁️        | 👁️         | ❌      | ✅
Appointments         | ✅          | ➕      | ✅          | 👁️        | ❌         | ❌      | ➕
Dental Charts        | ✅          | ✅      | ❌          | 👁️        | ❌         | ❌      | 👁️
Treatment Plans      | ✅          | ✅      | 👁️          | ❌        | 👁️         | ❌      | ❌
Procedure Notes      | ✅          | ✅      | ❌          | ❌        | ❌         | ❌      | ➕
Doctors              | ✅          | 👁️      | 👁️          | 👁️        | ❌         | ❌      | 👁️
Invoices             | ✅          | 👁️      | ✅          | ❌        | ✅         | ❌      | ❌
Payments             | ✅          | ❌      | ✅          | ❌        | ✅         | ❌      | ❌
Prescriptions        | ✅          | ✅      | 👁️          | ❌        | ❌         | ❌      | ❌
X-Rays               | ✅          | ✅      | ❌          | 👁️        | ❌         | ❌      | 👁️
CBCT                 | ✅          | ✅      | ❌          | 👁️        | ❌         | ❌      | ❌
Lab Orders           | ✅          | ✅      | ❌          | ❌        | ❌         | ➕      | ❌
Insurance            | ✅          | 👁️      | ✅          | ❌        | ✅         | ❌      | ❌
Inventory            | ✅          | ❌      | ❌          | ✅        | ❌         | ❌      | ❌
Services             | ✅          | 👁️      | 👁️          | ❌        | ❌         | ❌      | 👁️
Branches             | ✅          | 👁️      | 👁️          | 👁️        | ❌         | ❌      | 👁️
Users                | ✅          | ❌      | ❌          | ❌        | ❌         | ❌      | ❌
Schedules            | ✅          | ➕      | 👁️          | 👁️        | ❌         | ❌      | ➕
Leave                | ✅          | ➕      | ❌          | ➕        | ❌         | ➕      | ➕
Attendance           | ✅          | ❌      | ❌          | ❌        | ❌         | ❌      | ❌
Commissions          | ✅          | ➕      | ❌          | ❌        | ✅         | ❌      | ❌
Installments         | ✅          | ❌      | ✅          | ❌        | ✅         | ❌      | ❌
Consent Forms        | ✅          | ✅      | ✅          | ❌        | ❌         | ❌      | ✅
Notifications        | ✅          | ➕      | ✅          | ➕        | ➕         | ➕      | ➕
Reports              | ✅          | ➕      | ❌          | ❌        | ✅         | ❌      | ❌
Settings             | ✅          | ❌      | ❌          | ❌        | ❌         | ❌      | ❌
Walk-in Queue        | ✅          | 👁️      | ✅          | ✅        | ❌         | ❌      | ❌
```

#### Middleware-Enforcement (Fastify)

```typescript
// roleGuard Middleware — erzwingt Permissions auf JEDEM Request
function roleGuard(requiredPermission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role, tenantSlug } = request.user;

    // 1. Platform-Admin darf ALLES
    if (role === 'platform_admin') return;

    // 2. Tenant-User kann NICHT auf Dev Portal zugreifen
    if (!tenantSlug) {
      return reply.status(403).send({ error: 'TENANT_REQUIRED' });
    }

    // 3. Permission-Check gegen die feste Rollen-Matrix
    const permissions = ROLE_PERMISSIONS[role]; // Code-definiert, nicht DB
    if (!permissions?.includes(requiredPermission)) {
      return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
    }
  };
}

// Verwendung in Routes:
app.get('/api/patients', { preHandler: roleGuard('patients.view') }, getPatients);
app.post('/api/patients', { preHandler: roleGuard('patients.create') }, createPatient);
app.delete('/api/patients/:id', { preHandler: roleGuard('patients.delete') }, deletePatient);
```

#### Scope-Isolation: Tenant-Admin vs. Platform-Admin

```
┌─────────────────────────────────────────────────────────────┐
│  PLATFORM LEVEL (Dev Portal /developer/*)                    │
│  platform_admin: Voller Zugriff                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TENANT A (/admin/*)           TENANT B (/admin/*)      │ │
│  │  tenant_admin: Voller Zugriff  tenant_admin: Voller     │ │
│  │  dentist: Klinisch             dentist: Klinisch        │ │
│  │  receptionist: Front-Desk      receptionist: Front-Desk │ │
│  │  ...                           ...                      │ │
│  │                                                         │ │
│  │  ⚠️ KEINE Sicht auf Tenant B   ⚠️ KEINE Sicht auf      │ │
│  │                                Tenant A                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

> **Zusammenfassung:** Der `tenant_admin` ist der Klinik-Chef — er kontrolliert alles _innerhalb_
> seines Tenants (User einladen, Rollen zuweisen, Settings ändern, alle Daten sehen).
> Er kann aber NICHTS außerhalb seines Tenants sehen oder tun.
> Der `platform_admin` (Developer) steht über allem und kontrolliert die gesamte Platform.

### Session Management (Active Devices)

#### Collection: `user_sessions` (in `dento_platform` DB)

```typescript
const userSessionSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'users', required: true, index: true },
    tenantSlug: { type: String, default: null }, // null = Platform-Admin
    deviceInfo: {
      browser: String, // "Chrome 120"
      os: String, // "Windows 11"
      device: String, // "Desktop" | "Mobile" | "Tablet"
    },
    ipAddress: { type: String, required: true },
    userAgent: String,
    location: {
      country: String, // GeoIP-Lookup
      city: String,
    },
    isActive: { type: Boolean, default: true, index: true },
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSessionSchema.index({ userId: 1, isActive: 1 });
```

#### Session-Lifecycle

```
Login → Session erstellen → JWT ausliefern (sessionId im Payload)
  ↓
Jeder Request → lastActivity aktualisieren (Redis-Cache, alle 5 Min in DB flushen)
  ↓
Logout → session.isActive = false
  ↓
TTL-Index → Abgelaufene Sessions automatisch gelöscht (MongoDB native)
```

#### API-Endpoints

| Methode  | Route                    | Beschreibung                             |
| -------- | ------------------------ | ---------------------------------------- |
| `GET`    | `/api/auth/sessions`     | Eigene aktive Sessions auflisten         |
| `DELETE` | `/api/auth/sessions/:id` | Einzelne Session beenden (Remote-Logout) |
| `DELETE` | `/api/auth/sessions`     | ALLE Sessions beenden (außer aktuelle)   |

#### Admin-UI: "Meine Geräte"

```
┌─────────────────────────────────────────────────────────────┐
│ 🔐 Aktive Sessions                                          │
├─────────────────────────────────────────────────────────────┤
│ 🖥  Chrome 120 · Windows 11 · Berlin, DE                     │
│    Letzte Aktivität: vor 2 Min  ← AKTUELL                   │
│                                                              │
│ 📱 Safari · iOS 17 · Cairo, EG                               │
│    Letzte Aktivität: vor 3 Std  [Session beenden]            │
│                                                              │
│ 💻 Firefox · macOS 14 · Riyadh, SA                           │
│    Letzte Aktivität: vor 1 Tag  [Session beenden]            │
├─────────────────────────────────────────────────────────────┤
│         [🔴 Alle anderen Sessions beenden]                   │
└─────────────────────────────────────────────────────────────┘
```

> **Hinweis:** `tenant_admin` kann Sessions aller User **seines Tenants** sehen.
> `platform_admin` kann Sessions aller User **platformweit** sehen (Dev Portal → User Management).

---

## 28. Pricing System (Module-Only, dynamisch konfigurierbar)

### Kein Plan-System — Nur Module

Jeder Tenant bekommt **kostenlos**:

- Platform-Zugang (Login, Dashboard, Settings)
- 10 User (darüber hinaus $5/User/Mo)
- 1 Branch
- 1 GB Storage

### Modul-Preise (Standard — änderbar im Dev Portal)

| #   | Modul                | Standard-Preis | Typ  |
| --- | -------------------- | -------------- | ---- |
| 1   | Patient Records      | **Kostenlos**  | core |
| 2   | Appointments         | **Kostenlos**  | core |
| 3   | Dashboard & Reports  | **Kostenlos**  | core |
| 4   | Dental Charting      | $49/Mo         | paid |
| 5   | Billing & Invoicing  | $39/Mo         | paid |
| 6   | Inventory Management | $29/Mo         | paid |
| 7   | Insurance Claims     | $39/Mo         | paid |
| 8   | Lab Management       | $29/Mo         | paid |
| 9   | X-Ray & CBCT         | $49/Mo         | paid |
| 10  | Multi-Branch         | $79/Mo         | paid |
| 11  | Advanced Analytics   | $199/Mo        | paid |

### Usage-basierte Limits

| Limit   | Inklusive    | Danach     |
| ------- | ------------ | ---------- |
| Users   | 10 kostenlos | $5/User/Mo |
| Storage | 1 GB         | $2/GB/Mo   |

### Dynamische Preis-Konfiguration (Dev Portal)

Alle Preise sind **konfigurierbar im Dev Portal** — kein Code-Deployment nötig:

```typescript
// Payload Collection: pricing_config (in dento_platform DB)
{
  // === Modul-Preise (globale Standardwerte) ===
  modules: [
    {
      slug: "dental-charting",
      basePrice: 49.00,          // Standard-Preis in USD
      currency: "USD",
      billingCycle: "monthly",   // monthly | yearly
      yearlyDiscount: 20,        // 20% Rabatt bei jährlicher Zahlung
      isActive: true,            // Modul verfügbar?
      isFree: false,             // Kostenlos?
      trialDays: 14,             // Kostenlose Testphase
    },
    {
      slug: "patient-records",
      basePrice: 0,
      currency: "USD",
      billingCycle: "monthly",
      isActive: true,
      isFree: true,
      trialDays: 0,
    },
    // ... alle 11 Module
  ],

  // === Usage-Limits ===
  usageLimits: {
    freeUsers: 10,               // Kostenlose User pro Tenant
    extraUserPrice: 5.00,        // $/User/Mo danach
    freeStorageGB: 1,            // Kostenloser Speicher
    extraStoragePrice: 2.00,     // $/GB/Mo danach
    freeBranches: 1,             // Kostenlose Branches
  },

  // === Globale Rabatt-Aktionen ===
  globalDiscounts: [
    {
      name: "Launch Sale",
      discountPercent: 30,
      appliesTo: "all",          // all | ["dental-charting", "billing"]
      startsAt: "2026-06-01",
      expiresAt: "2026-07-01",
      isActive: true,
    }
  ],

  // === Coupon-System ===
  coupons: [
    {
      code: "WELCOME50",
      discountPercent: 50,
      maxUses: 100,
      usedCount: 0,
      appliesTo: "all",
      expiresAt: "2026-12-31",
      isActive: true,
    }
  ],

  updatedAt: "2026-02-24T14:00:00Z",
  updatedBy: "platform_admin"
}
```

### Was im Dev Portal konfigurierbar ist

| Aktion                   | Wie                                       |     Sofort wirksam?      |
| ------------------------ | ----------------------------------------- | :----------------------: |
| Modul-Preis ändern       | Dev Portal → Pricing → Modul bearbeiten   |   ✅ Nächste Rechnung    |
| Rabatt für einen Tenant  | Dev Portal → Tenant → Discount setzen     |        ✅ Sofort         |
| Globale Sale-Aktion      | Dev Portal → Pricing → Discount erstellen |        ✅ Sofort         |
| Coupon erstellen         | Dev Portal → Pricing → Coupon erstellen   |        ✅ Sofort         |
| Free Users Limit ändern  | Dev Portal → Pricing → Usage Limits       |   ✅ Nächste Rechnung    |
| Modul deaktivieren       | Dev Portal → Modules → Toggle             | ✅ Sofort (neue Tenants) |
| Trial-Dauer ändern       | Dev Portal → Pricing → Modul bearbeiten   |      ✅ Neue Trials      |
| Jährlicher Rabatt ändern | Dev Portal → Pricing → Modul bearbeiten   |       ✅ Neue Abos       |

### Per-Tenant Preis-Override

```typescript
// In tenant_modules — pro Tenant individuelle Preise möglich
{
  tenantId: "clinic_cairo",
  moduleSlug: "dental-charting",
  // Standard-Preis: $49/Mo (aus pricing_config)
  priceOverride: 35.00,         // Individueller Preis für diesen Tenant
  discountPercent: 0,
  discountExpiresAt: null,
  note: "Langzeit-Kunde seit 2026, VIP-Preis"
}
```

### Preis-Berechnung (Reihenfolge)

```
1. priceOverride in tenant_modules?     → Diesen Preis nutzen
2. Aktiver Coupon für diesen Tenant?    → Coupon-Rabatt anwenden
3. discountPercent in tenant_modules?   → Tenant-Rabatt anwenden
4. Globaler Discount aktiv?             → Globalen Rabatt anwenden
5. Sonst: basePrice aus pricing_config  → Standard-Preis
```

---

## 29. Payment Gateways (Paymob + Stripe)

### Strategie: Payment Provider nach Land

Der Payment Provider wird automatisch basierend auf dem **Land des Tenants** gewählt:

| Land             | Provider   | Methoden                                                      |
| ---------------- | ---------- | ------------------------------------------------------------- |
| **Ägypten (EG)** | **Paymob** | Karten (Visa/MC/Meeza), Fawry, Mobile Wallets, InstaPay, ValU |
| **Alle anderen** | **Stripe** | Karten (Visa/MC/Amex), SEPA, Bank Transfer                    |

> Start in Ägypten. Wenn wir in Saudi/UAE/Türkei expandieren, prüfen wir ob Stripe dort
> reicht oder ob ein lokaler Provider nötig ist (z.B. Tap Payments für Golf-Region).

### Paymob — Ägypten (Primärer Provider)

**Warum Paymob?** Einzige API die ALLE ägyptischen Zahlungsmethoden abdeckt:

| #   | Methode                 | Wie es funktioniert                                                 | Beliebt bei        |
| --- | ----------------------- | ------------------------------------------------------------------- | ------------------ |
| 1   | **Kredit-/Debitkarten** | Visa, Mastercard, Meeza (ägyptische Debitkarte)                     | Alle               |
| 2   | **Fawry**               | Referenznummer → Bezahlung an 250.000+ Kiosken/Geschäften           | Kein Konto nötig   |
| 3   | **Mobile Wallets**      | Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, CIB Smart Wallet | Jüngere Generation |
| 4   | **InstaPay**            | Sofort-Überweisung Bank-zu-Bank (CBE Initiative)                    | Business-Kunden    |
| 5   | **ValU**                | Buy Now Pay Later (Ratenzahlung über Monate)                        | Teurere Module     |
| 6   | **Meeza Digital**       | Nationale Debitkarte der CBE                                        | Weit verbreitet    |

### Paymob Gebühren

| Methode          | Gebühr                  | Settlement |
| ---------------- | ----------------------- | ---------- |
| Karten (Visa/MC) | 2.5% + 1 EGP            | T+2 Tage   |
| Meeza            | 1.0%                    | T+1 Tag    |
| Fawry            | 2.0% + 2 EGP            | T+2 Tage   |
| Mobile Wallets   | 1.5%                    | T+1 Tag    |
| InstaPay         | 3 EGP flat              | Sofort     |
| ValU             | 0% (Kunde zahlt Zinsen) | T+7 Tage   |

### Paymob Integration

```typescript
// Fastify Plugin: apps/api/src/plugins/paymob.ts
import Paymob from 'paymob-node'; // oder direkte REST-API Calls

const paymob = new Paymob({
  apiKey: process.env.PAYMOB_API_KEY,
  integrationIds: {
    card: process.env.PAYMOB_CARD_INTEGRATION_ID,
    fawry: process.env.PAYMOB_FAWRY_INTEGRATION_ID,
    wallet: process.env.PAYMOB_WALLET_INTEGRATION_ID,
    valu: process.env.PAYMOB_VALU_INTEGRATION_ID,
  },
  iframeId: process.env.PAYMOB_IFRAME_ID,
});

// Payment Flow:
// 1. Auth Request → Paymob Token
// 2. Order Registration → Order ID
// 3. Payment Key → Token für Frontend
// 4. Frontend zeigt Paymob iframe/redirect
// 5. Webhook → Zahlung bestätigt
```

### Payment Flow (SaaS-Monatsbezahlung)

```
Tenant öffnet Admin Portal → Billing Seite
  → Sieht offene Rechnung (z.B. 2.450 EGP für 3 Module)
  → Klickt "Jetzt bezahlen"
  → System prüft tenant.settings.paymentProvider
    ├── "paymob" → Zeigt Paymob Zahlungsmethoden:
    │   ├── 💳 Karte (Visa/MC/Meeza)
    │   ├── 🏪 Fawry (Referenznummer zum Bezahlen am Kiosk)
    │   ├── 📱 Mobile Wallet (Vodafone Cash, etc.)
    │   ├── 🏦 InstaPay (Bank-Überweisung)
    │   └── 🛒 ValU (Ratenzahlung)
    └── "stripe" → Zeigt Stripe Checkout
  → Nach Zahlung: Webhook bestätigt → saas_payments aktualisiert
  → Rechnung = bezahlt
```

### Collection: `saas_payments` (erweitert)

```typescript
{
  invoiceId: "inv_2026_03",
  tenantId: "clinic_cairo",
  amount: 2450.00,
  currency: "EGP",
  amountUSD: 49.00,                  // Umgerechnet für Reporting

  // Payment Provider
  provider: "paymob",                // paymob | stripe
  providerPaymentId: "pay_abc123",   // Paymob Order ID oder Stripe PaymentIntent ID
  providerTransactionId: "txn_xyz",

  // Methode
  method: "fawry",                   // card | fawry | wallet | instapay | valu | bank_transfer
  methodDetails: {
    cardBrand: null,                 // Nur bei Karte: visa | mastercard | meeza
    fawryReference: "1234567890",    // Nur bei Fawry: Referenznummer
    walletPhone: null,               // Nur bei Wallet: Telefonnummer
    valuMonths: null,                // Nur bei ValU: Ratenmonate
  },

  // Status
  status: "completed",               // pending | completed | failed | refunded
  paidAt: "2026-03-01T14:00:00Z",
  failureReason: null,

  // Gebühren
  providerFee: 62.25,                // 2.5% + 1 EGP
  netAmount: 2387.75,                // Nach Gebühren

  createdAt, updatedAt
}
```

### Stripe — International (bestehend)

Für Tenants außerhalb Ägyptens bleibt **Stripe** der Payment Provider:

- Karten (Visa, Mastercard, Amex)
- SEPA Direct Debit (EUR)
- Bank Transfers
- Automatische Recurring-Zahlungen via Stripe Subscriptions

### Admin Portal — Billing Seite (Tenant-Sicht)

| Element              | Beschreibung                                                  |
| -------------------- | ------------------------------------------------------------- |
| **Aktive Module**    | Liste mit monatlichen Kosten pro Modul                        |
| **Nächste Rechnung** | Betrag, Fälligkeitsdatum, Währung                             |
| **Zahlungsmethode**  | Aktuell hinterlegte Methode (Karte, Fawry, etc.)              |
| **Jetzt bezahlen**   | Button → öffnet Payment-Flow                                  |
| **Zahlungsverlauf**  | Alle bisherigen Zahlungen mit Status                          |
| **Rechnungen**       | PDF-Download                                                  |
| **Auto-Pay**         | Toggle für automatische monatliche Zahlung (nur Karte/Wallet) |

### Fawry-Spezialfall

Fawry ist **offline** — der Tenant bekommt eine Referenznummer und bezahlt am nächsten
Fawry-Kiosk (Supermarkt, Apotheke, etc.). Der Flow:

```
1. Tenant klickt "Fawry" → System generiert Fawry Reference (10 Ziffern)
2. Tenant sieht: "Bezahle 2.450 EGP mit Referenz 1234567890 an jedem Fawry-Punkt"
3. Tenant geht zum Kiosk, sagt die Nummer, zahlt bar
4. Fawry Webhook → Paymob Webhook → unser Server
5. Rechnung = bezahlt, Tenant bekommt Push/Email-Bestätigung
6. Gültigkeit: 48h (danach neue Referenz nötig)
```

---

## 30. Entfernte Features (nicht rebuilden)

| Modul                   | Tabellen in v1                                                              | Warum entfernt                     |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| Tourism Packages        | `tourism_packages`                                                          | Nicht Kern-Dental, Nische          |
| Website Builder         | `pages`, `page_templates`, `page_versions`, `section_templates`             | Zu komplex, Wix/WordPress besser   |
| Website Themes          | `website_themes`, `theme_history`                                           | Teil von Website Builder           |
| Page Builder            | `page_versions`, `page_templates`                                           | Teil von Website Builder           |
| Content Editor/CMS      | `content_drafts`, `content_locks`, `content_change_log`, `auto_save_drafts` | Teil von Website Builder           |
| Portfolio               | `portfolio`, `portfolio_cases`                                              | Website-Feature                    |
| Testimonials            | `testimonials`                                                              | Website-Feature                    |
| Team Members (public)   | `team_members`                                                              | Website-Feature                    |
| Contact Messages        | `contact_messages`, `contact_settings`, `contact_submissions`               | Website-Feature                    |
| FAQs                    | `faqs`                                                                      | Website-Feature                    |
| Navigation Menus        | `navigation_menus`                                                          | Website-Feature                    |
| Media Library (CMS)     | `media_library`                                                             | Ersetzt durch S3-Upload pro Entity |
| Translations (statisch) | `translations` (statisch)                                                   | Ersetzt durch DB-basiertes i18n    |
| Site Settings (Website) | `site_settings`, `website_settings`                                         | Entfällt mit Website Builder       |
| Form Submissions        | `form_submissions`                                                          | Website-Feature                    |
| Countries               | `countries`                                                                 | Nicht verwendet                    |

**Gesamt: ~30 Tabellen/Collections entfernt, ~25% weniger Code**

---

## 31. Neue Features (v2 only)

| Feature                                 | Beschreibung                                                                                                      | Phase     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| **DB Explorer**                         | Custom React UI im Dev Portal → Tenant Tab                                                                        | Phase 2   |
| **Module Canary Rollout**               | 5% → 25% → 50% → 100% mit Auto-Rollback                                                                           | Phase 2   |
| **Tenant-Level Webhooks**               | Tenant verwaltet eigene Webhooks im Admin Portal                                                                  | Phase 3   |
| **Device Integration API**              | Webhook-Events für CBCT, Scanner, etc.                                                                            | Phase 3   |
| **Public Booking API**                  | REST-Endpoint für Website-Integration (verfügbare Slots)                                                          | Phase 3   |
| **Translation Packs**                   | DB-basierte, versionierte, pro-Modul Übersetzungen                                                                | Phase 2   |
| **Workflows**                           | BullMQ-basierte Automation, kostenlos, pro Tenant (war Mock in v1)                                                | Phase 3   |
| **Custom Fields**                       | Dynamische Felder pro Entity, mit Developer-Anleitung (war Mock in v1)                                            | Phase 3   |
| **Tailscale Support**                   | Sicherer Remote-Support statt LiveKit                                                                             | Phase 6   |
| **Ticketing System**                    | Vollständiges Ticket-CRUD, Priority, SLA, verknüpft mit Sessions                                                  | Phase 2   |
| **Per-Tenant Backup/Restore**           | One-Click im Dev Portal via mongodump                                                                             | Phase 2   |
| **Tenant Branding**                     | Logo, Farben, App-Name pro Tenant (kostenlos, war Paid in v1)                                                     | Phase 2   |
| **Pricing UI**                          | Modul-Preise, Coupons, Discounts konfigurierbar im Dev Portal                                                     | Phase 2   |
| **Paymob Payment Gateway**              | Ägyptische Zahlungsmethoden: Fawry, Mobile Wallets, InstaPay, ValU                                                | Phase 2   |
| **Tenant Locale System**                | Country → Language → Currency Propagation, `country_config`                                                       | Phase 1   |
| **Per-Invoice Currency Override**       | Patient/Rechnung kann andere Währung als Tenant-Default nutzen                                                    | Phase 4   |
| **User Invite & Onboarding**            | Email-Invite, Activation, Profil vervollständigen, Avatar-Upload                                                  | Phase 1   |
| **Doctor-User Sync**                    | User ↔ Doctor bidirektionale Sync (Name, Photo, Gender)                                                           | Phase 1   |
| **Branding Propagation**                | Logo + Clinic-Name automatisch in Sidebar, Docs, Emails, Mobile                                                   | Phase 2   |
| **`<ClinicHeader />` Komponente**       | Einheitlicher Header für alle Dokument-Templates                                                                  | Phase 3   |
| **Document Templates (v2)**             | Invoice, Prescription, TreatmentPlan, Consent, LabOrder mit Branding                                              | Phase 3   |
| **Inventory Deep Dive**                 | 7 Collections, 17 UI-Seiten, Suppliers, POs, Batch/Expiry, Transfers, Inventur                                    | Phase 5   |
| **Supplier Management**                 | Volles CRUD + Bewertung (v1 war schema-only, kein UI)                                                             | Phase 5   |
| **Purchase Order Workflow**             | Draft → Submitted → Confirmed → Shipped → Received (v1 kein UI)                                                   | Phase 5   |
| **Batch/Lot + Expiry Tracking**         | Chargen-Tracking, Ablaufdaten-Dashboard, Cron-Alerts (v1 hardcoded 0)                                             | Phase 5   |
| **Inter-Branch Transfers**              | `stock_transfers` Collection + Genehmigungs-Flow (v1 kein UI)                                                     | Phase 5   |
| **Stock Count/Inventur**                | `stock_counts` Collection + Diskrepanz-Tracking (v1 kein UI)                                                      | Phase 5   |
| **Barcode/QR Scanning**                 | Item-Barcode + Scanner (Web: html5-qrcode, Mobile: expo-barcode-scanner)                                          | Phase 5   |
| **Stock Valuation (FIFO/WAC)**          | Bewertungsmethoden statt einzel unit_cost (v1 fehlte)                                                             | Phase 5   |
| **Auto-Reorder Suggestions**            | Low-Stock → Vorausgefüllte PO als Draft (v1 fehlte)                                                               | Phase 5   |
| **10 Inventory Reports**                | StockValuation, Expiry, Forecast, SupplierPerf, DeadStock, ABC-Analyse                                            | Phase 5   |
| **Clinical Cross-Linking**              | X-Ray ↔ Treatment Plan ↔ Procedure Note bidirektionale Verlinkung                                                 | Phase 3   |
| **`<ImagingLinker />`**                 | Wiederverwendbare Komponente zum Verknüpfen von Imaging mit Treatments/Procedures                                 | Phase 3   |
| **Imaging Requirements**                | Service → Required Imaging Mapping + Auto-Check + Waive-Option                                                    | Phase 3   |
| **Pre/Post-Op Imaging**                 | Vorher/Nachher Röntgenbilder an Procedure Notes verknüpfen + Side-by-Side                                         | Phase 3   |
| **Imaging Timeline**                    | Neues PatientView-Tab: chronologische Übersicht aller Aufnahmen mit Links                                         | Phase 3   |
| **Dental Chart → Imaging**              | Zahn anklicken → alle verknüpften X-Rays, CBCTs, Treatments sehen                                                 | Phase 3   |
| **X-Ray Comparison Viewer**             | `comparedToXrayId` für Vorher/Nachher-Vergleich mit Side-by-Side                                                  | Phase 3   |
| **Imaging Cross-Navigation**            | Klickbare Badges in XrayList/CbctList → direkt zum Treatment Plan/Procedure                                       | Phase 3   |
| **PDF Export**                          | Puppeteer/jsPDF für alle Dokumente (zusätzlich zu window.print)                                                   | Phase 4   |
| **Realm Mobile Sync**                   | Offline-fähige Mobile App mit Auto-Sync                                                                           | Phase 7   |
| **Push Notifications**                  | Expo Notifications via BullMQ                                                                                     | Phase 7   |
| **Appointment Reminders**               | Scheduled Jobs (SMS/Email/WhatsApp/Push)                                                                          | Phase 3   |
| **API Rate Limiting**                   | Redis-basiert pro API Key                                                                                         | Phase 2   |
| **Daily Operations Hub**                | Unified Page: Walk-ins + Termine + Warteraum + Chair-Belegung                                                     | Phase 2   |
| **Arrival Tracking**                    | `arrivedAt` + `arrivalStatus` auf Appointments (kam/kam nicht)                                                    | Phase 2   |
| **Queue-Nr. für Termine**               | Termine bekommen Queue-Nummer bei Ankunft (v1: nur Walk-ins)                                                      | Phase 2   |
| **Chair-Dashboard**                     | Real-Time Chair-Übersicht mit Belegungsstatus (v1: DB-Funktionen ohne UI)                                         | Phase 2   |
| **Wait-Time-Berechnung**                | Geschätzte Wartezeit basierend auf Queue + Chairs (v1: nie implementiert)                                         | Phase 2   |
| **Walk-in → Appointment**               | Ein-Klick-Konvertierung Walk-in → Appointment (v1: nicht möglich)                                                 | Phase 2   |
| **Auto-No-Show**                        | BullMQ Job: Auto-No-Show nach konfigurierbarer Zeit (v1: fehlte)                                                  | Phase 3   |
| **Socket.io Queue Updates**             | Instant Real-Time statt 30s Polling (v1: setInterval)                                                             | Phase 2   |
| **Dashboard Waiting Widget**            | Live Waiting Room Widget auf Dashboard (v1: nur Appointment-Count)                                                | Phase 2   |
| **Recurring Rules Management**          | Eigene Seite + Detail-View für Termin-Serien (v1: kein Management nach Erstellung)                                | Phase 2   |
| **Recurring Edit Modi**                 | „This occurrence" / „This and future" / „All" (v1: komplett fehlend)                                              | Phase 2   |
| **Recurring Cancel + Pause**            | Serie pausieren/fortsetzen/stornieren (v1: DB-Funktion ohne UI)                                                   | Phase 2   |
| **Recurring Conflict-Check**            | Arzt-Verfügbarkeit prüfen vor Generierung (v1: keine Prüfung)                                                     | Phase 2   |
| **Recurring BullMQ Cron**               | Async Generierung 4 Wochen voraus (v1: blocking RPC im Request)                                                   | Phase 2   |
| **Recurring Calendar Badge**            | 🔄-Icon + Serie-Info in Kalender und Listen (v1: kein visueller Unterschied)                                      | Phase 2   |
| **Recurring Holiday Skip**              | Feiertage automatisch überspringen (v1: nicht existent)                                                           | Phase 3   |
| **Recurring Series Reminders**          | Patient-Erinnerung + Arzt-Summary + Series-Ending-Hinweis                                                         | Phase 3   |
| **Notification Center**                 | Echtes In-App Notification Center statt Fake-Bell (v1: zeigte nur Appointments)                                   | Phase 2   |
| **Notification Templates**              | Unified bilinguales Template-System (EN/AR) pro Kanal (v1: Schema-Chaos)                                          | Phase 2   |
| **Notification Preferences**            | Pro User/Patient: Kanäle × Kategorien + Quiet Hours + Digest Mode                                                 | Phase 2   |
| **BullMQ Notification Workers**         | 4 dedizierte Queues (Email/SMS/WhatsApp/Push) mit Retry (v1: tote DB-Queue)                                       | Phase 2   |
| **Push Notifications (Web)**            | Web Push API mit VAPID Keys + Service Worker (v1: Toggle ohne Implementierung)                                    | Phase 3   |
| **Push Notifications (Mobile)**         | Expo Notifications → FCM/APNs + device_tokens Collection                                                          | Phase 7   |
| **Socket.io Notifications**             | Instant In-App via Socket.io statt 5-Min-Polling                                                                  | Phase 2   |
| **Scheduled Notifications**             | BullMQ Cron: Appointment Reminder, Recall, Payment, Low Stock (v1: pg_cron nie aktiviert)                         | Phase 3   |
| **Notification Logs**                   | Zustellungsprotokoll mit Provider-Response + Delivery-Tracking                                                    | Phase 2   |
| **Bulk Notifications**                  | An Gruppen/alle Patienten senden (v1: nicht existent)                                                             | Phase 4   |
| **Reports & Analytics System**          | 26 Reports in 5 Kategorien (Financial, Patient, Appointment, Clinical, Operational)                               | Phase 2-3 |
| **Dashboard Redesign**                  | 8 Widgets + Sparklines + Trend-Vergleich statt statischer 5 Stat-Cards                                            | Phase 2   |
| **Recharts Integration**                | Chart Library für Bar, Line, Pie, Heatmap Charts (v1: keine Charts)                                               | Phase 2   |
| **Report Export (CSV/Excel/PDF)**       | Server-side Export aller Reports (v1: nur 1 Client-side CSV)                                                      | Phase 2   |
| **Scheduled Reports**                   | BullMQ Cron → Auto-Report per Email/In-App mit konfigurierbarer Frequenz                                          | Phase 3   |
| **Saved Reports**                       | Report-Konfigurationen speichern + wiederverwenden                                                                | Phase 3   |
| **Reports Sidebar-Bereich**             | Eigener Sidebar-Abschnitt mit Sub-Kategorien (v1: kein Reports-Bereich)                                           | Phase 2   |
| **Peak Hours Heatmap**                  | Wochentag × Uhrzeit Heatmap für Terminbuchungen (v1: nicht existent)                                              | Phase 3   |
| **Aging Report**                        | Outstanding Invoices nach Alter (0-30, 31-60, 61-90, 90+ Tage)                                                    | Phase 3   |
| **Two-Tier Reports Model**              | Free Dashboard + Paid Advanced Analytics ($199/Mo) mit Locked-Preview                                             | Phase 2   |
| **3-Ebenen Schedule-Validierung**       | Branch Hours → Doctor Schedule → Appointment (v1: alle 3 getrennt, nie validiert)                                 | Phase 3   |
| **Slot-Engine**                         | Automatische Slot-Generierung basierend auf Branch + Doctor Schedule + Exceptions + bestehende Termine            | Phase 3   |
| **Online-Booking API**                  | 4 Public Endpoints für Klinik-Website Integration via Webhook/API Key                                             | Phase 3   |
| **Ramadan-Modus (funktional)**          | Branch ramadanHours + Auto-Switch + Slot-Engine Integration (v1: Toggle ohne Wirkung)                             | Phase 3   |
| **Doctor Working Hours Konsolidierung** | `doctors.workingHours` ENTFERNT → `doctor_schedules` ist Single Source of Truth (v1: 3 Quellen)                   | Phase 3   |
| **Schedule ↔ Booking Integration**      | Termine validieren gegen Doctor-Schedule + Branch-Hours + Exceptions (v1: ZERO Checks)                            | Phase 3   |
| **Branch Holidays**                     | Pro Branch konfigurierbare Feiertage die Booking blockieren (v1: nicht existent)                                  | Phase 3   |
| **Booking Window & Lead Time**          | Max N Tage voraus + Min N Min. vorher für Online-Booking (v1: nicht existent)                                     | Phase 3   |
| **Schedule Calendar Overlay**           | Appointment Calendar zeigt Doctor-Verfügbarkeit + geschlossene Zeiten                                             | Phase 3   |
| **Leave ↔ Schedule Auto-Sync**          | Genehmigter Leave-Request → Auto schedule_exception erstellen                                                     | Phase 3   |
| **Online-Booking Confirmation Flow**    | Receptionist: Bestätigen / Ändern+Bestätigen / Ablehnen mit Patient-Notification (SMS/Email/WhatsApp)             | Phase 3   |
| **Online-Booking Auto-Confirm**         | Pro Branch: Auto-Confirm Setting (konfigurierbar)                                                                 | Phase 3   |
| **Online-Booking Inbox**                | Dedicated UI-Seite für pending Online-Bookings mit 3-Action Buttons                                               | Phase 3   |
| **Medications Katalog**                 | `medications` Collection mit ~100 Seed-Dental-Medikamenten + Autocomplete in Prescriptions                        | Phase 3   |
| **Patient Insurance (embedded)**        | `patients.insurance[]` optional embedded — nur sichtbar wenn Insurance-Modul aktiv                                | Phase 4   |
| **Service Default Materials**           | `services.defaultMaterials[]` — Standard-Materialien pro Service für Auto-Deduktion                               | Phase 5   |
| **Brute-Force-Schutz**                  | Progressive Cooldown (3→5min→15min→30min→1h→IP-Block) Redis-basiert + login_attempts Audit                        | Phase 1   |
| **Configurable Alert Rules**            | `alert_rules` Collection — konfigurierbare Trigger (Low Stock, Overdue, No-Show Rate, Revenue Drop)               | Phase 2   |
| **Treatments → Procedure Notes Rename** | v1 `treatments` umbenannt zu `procedure_notes` (Klarstellung vs. `treatment_plans`)                               | Phase 3   |
| **Lab Order Types Katalog**             | `lab_order_types` Collection mit 14 Seed-Typen (Crown, Bridge, Denture etc.) + Custom Types + Turnaround-Tracking | Phase 2   |
| **Platform Analytics (Live Compute)**   | Keine separate Metriken-Collection — Live MongoDB Aggregation statt toter v1 `tenant_usage_metrics` Tabelle       | Phase 2   |
| **Role Permission Matrix**              | 7 feste Rollen + `hygienist` mit detaillierter Permission-Matrix (28 Module × 8 Rollen) + Middleware-Enforcement  | Phase 1   |
| **API-Katalog (Auto-generiert)**        | `@fastify/swagger` → OpenAPI Spec statt manueller `api_definitions` DB-Tabelle                                    | Phase 2   |
| **Tenant-Impersonation**                | `support_sessions` mit temporärem JWT (60min), Audit-Trail, Action-Log, Reason-Pflicht                            | Phase 2   |
| **Internal Staff Chat**                 | Kostenloses Socket.io-basiertes Echtzeit-Chat-System für Klinik-Staff (DM + Gruppen + Attachments)                | Phase 3   |
| **Chat Channels**                       | Direct Messages (1:1), Branch-Gruppen, Role-Gruppen, Custom-Gruppen mit Admin-Verwaltung                          | Phase 3   |
| **Chat Mobile Integration**             | Realm Sync für Offline-Chat + Expo Push Notifications bei neuen Nachrichten                                       | Phase 7   |

---

## 32. Mobile App (React Native)

### Stack

| Technologie               | Zweck                                         |
| ------------------------- | --------------------------------------------- |
| React Native (Expo 52)    | Framework                                     |
| NativeWind 4              | Tailwind CSS für RN (gleiche Klassen wie Web) |
| Expo Router               | Navigation                                    |
| Realm (Atlas Device Sync) | Lokale DB + Auto-Sync mit MongoDB Atlas       |
| Zustand                   | State Management (gleich wie Web)             |
| Expo Notifications        | Push Notifications                            |
| @dento/shared             | Shared Types, Schemas, Utils (Monorepo)       |

### Offline-Strategie

```
Online:  Phone ←→ Realm Sync ←→ MongoDB Atlas (tenant_clinic_cairo)
Offline: Phone ←→ Realm (lokal) — funktioniert voll, synct wenn online
```

### RTL für Mobile

```typescript
import { I18nManager } from 'react-native';

// Bei Sprachwechsel zu Arabisch:
I18nManager.forceRTL(true);
Updates.reloadAsync(); // App neustarten für RTL-Layout
```

### Was Mobile von Web teilt

| Shared (packages/)     | Mobile-spezifisch  |
| ---------------------- | ------------------ |
| Zod Schemas            | Realm Schemas      |
| TypeScript Types       | Native Navigation  |
| Utils (currency, date) | NativeWind Styles  |
| API Client             | Push Notifications |
| Constants/Enums        | Camera/Scanner     |
| Validation Logic       | Offline Queue      |

---

## 33. Infrastruktur & DevOps

### Docker Compose (Local Development)

```yaml
services:
  mongodb:
    image: mongo:8.0
    ports: ['27017:27017']
    volumes: [mongo-data:/data/db]

  redis:
    image: redis:8.8-alpine
    ports: ['6379:6379']

  api:
    build: ./apps/api
    ports: ['3001:3001']
    depends_on: [mongodb, redis]
    environment:
      MONGODB_URI: mongodb://mongodb:27017/dento_platform
      REDIS_URL: redis://redis:6379
      PAYLOAD_SECRET: ...
      STRIPE_SECRET_KEY: ...

  admin:
    build: ./apps/admin
    ports: ['3000:3000']

  developer:
    build: ./apps/developer
    ports: ['3002:3002']
```

### CI/CD (GitHub Actions)

```
Push to main:
  → Lint (ESLint + Prettier)
  → Type Check (tsc --noEmit)
  → Unit Tests (Vitest)
  → Build all apps (Turborepo)
  → Deploy API → Railway/Fly.io
  → Deploy Admin → Vercel/Cloudflare Pages
  → Deploy Developer → Vercel/Cloudflare Pages
```

### Production Hosting

| Service                 | Hosting                             | Kosten/Monat      |
| ----------------------- | ----------------------------------- | ----------------- |
| API (Payload + Fastify) | Railway / Fly.io                    | $20-50            |
| Admin Frontend          | Vercel (Free) oder Cloudflare Pages | $0                |
| Developer Frontend      | Vercel (Free) oder Cloudflare Pages | $0                |
| MongoDB Atlas           | M10-M30                             | $57-280           |
| Redis                   | Upstash (Serverless) oder Railway   | $10-15            |
| S3 Storage              | Cloudflare R2 (10GB free)           | $0-15             |
| Domain + SSL            | Cloudflare                          | $15/yr            |
| Sentry                  | Free Tier                           | $0                |
| **Gesamt**              |                                     | **$87-360/Monat** |

---

## 34. MongoDB Schema Design

### Embedding-Strategie (was zusammengefasst wird)

| v1 (Postgres — separate Tabellen)                                             | v2 (MongoDB — 1 Document)                                               |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| patients + patient_allergies + patient_medical_history + patient_family_links | `patients` (allergies, medicalHistory, familyLinks als embedded Arrays) |
| invoices + invoice_items                                                      | `invoices` (items als embedded Array)                                   |
| prescriptions + prescription_items                                            | `prescriptions` (items als embedded Array)                              |
| treatment_plans + treatment_plan_items                                        | `treatment_plans` (items als embedded Array)                            |
| installment_plans + installment_payments                                      | `installment_plans` (payments als embedded Array)                       |
| doctors + doctor_certificates                                                 | `doctors` (certificates als embedded Array)                             |
| purchase_orders + purchase_order_items                                        | `purchase_orders` (items als embedded Array)                            |

### Backup-Tracking Collection (in `dento_platform` DB)

```typescript
const backupSchema = new Schema(
  {
    tenantSlug: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['scheduled', 'manual', 'pre-migration', 'pre-delete'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    filePath: String, // S3/R2 Key
    fileSize: Number, // Bytes
    storageBucket: { type: String, default: 'dento-backups' },
    checksum: String, // SHA-256 für Integrität
    startedAt: Date,
    completedAt: Date,
    error: String, // Fehlermeldung bei status=failed
    retentionDays: { type: Number, default: 30 },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
    initiatedBy: { type: ObjectId, ref: 'users' }, // User der Backup ausgelöst hat
  },
  { timestamps: true },
);

backupSchema.index({ tenantSlug: 1, createdAt: -1 });
backupSchema.index({ status: 1, type: 1 });
```

#### BullMQ Worker: `backup-worker`

```
Manual Trigger / Cron Schedule
  → BullMQ Job: { tenantSlug, type }
  → Worker:
      1. backup.status = 'running'
      2. mongodump --db tenant_{slug} --archive | gzip → S3/R2
      3. backup.fileSize = size, backup.checksum = sha256
      4. backup.status = 'completed', backup.completedAt = now()
      5. Bei Fehler: backup.status = 'failed', backup.error = msg
  → TTL-Index löscht alte Backups automatisch nach retentionDays
```

#### Dev Portal UI: Backup-Historie

```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Backups — tenant_clinic_cairo                             │
├─────────────────────────────────────────────────────────────┤
│ ✅ 2026-02-25 03:00  Scheduled  142 MB  [⬇ Download]        │
│ ✅ 2026-02-24 03:00  Scheduled  139 MB  [⬇ Download]        │
│ ✅ 2026-02-23 15:30  Manual     140 MB  [⬇ Download]        │
│ ❌ 2026-02-22 03:00  Scheduled  —       Fehler: Timeout     │
│ ✅ 2026-02-21 03:00  Scheduled  135 MB  [⬇ Download]        │
├─────────────────────────────────────────────────────────────┤
│         [🔄 Jetzt Backup erstellen]  [⚙️ Retention: 30d]    │
└─────────────────────────────────────────────────────────────┘
```

### Referenz-Strategie (was getrennt bleibt)

| Collection A        |              ← verweist auf →               | Collection B                               |
| ------------------- | :-----------------------------------------: | ------------------------------------------ |
| appointments        |             patientId, doctorId             | patients, doctors                          |
| dental_charts       |                  patientId                  | patients                                   |
| invoices            |          patientId, appointmentId           | patients, appointments                     |
| lab_orders          |             patientId, doctorId             | patients, doctors                          |
| xrays               | patientId, treatmentPlanId, procedureNoteId | patients, treatment_plans, procedure_notes |
| cbct_orders         | patientId, treatmentPlanId, procedureNoteId | patients, treatment_plans, procedure_notes |
| inventory_stock     |              itemId, branchId               | inventory_items, branches                  |
| inventory_movements |        itemId, branchId, referenceId        | inventory_items, branches, (diverse)       |
| stock_transfers     |          fromBranchId, toBranchId           | branches                                   |
| stock_counts        |       branchId, countedBy, approvedBy       | branches, users                            |

---

## 35. Timeline & Phasen

| Phase                   | Wochen | Dauer                     | Was wird gebaut                                                         |
| ----------------------- | ------ | ------------------------- | ----------------------------------------------------------------------- |
| **0 — Foundation**      | 1-2    | 2 Wo                      | Monorepo, Docker, Payload Setup, TailAdmin Integration, CI/CD           |
| **1 — Auth & Tenancy**  | 3-4    | 2 Wo                      | Payload Auth, JWT, RBAC, useDb() Middleware, Tenant CRUD                |
| **2 — Dev Portal**      | 5-7    | 3 Wo                      | 16 Module portieren, DB Explorer, Module Versioning, Backup             |
| **3 — Core Clinical**   | 8-13   | 6 Wo                      | Patients, Appointments, Charts, Treatments, Services, X-Rays, CBCT, Lab |
| **4 — Financial**       | 14-16  | 3 Wo                      | Invoices, Payments, Insurance, Installments, Commissions                |
| **5 — Operational**     | 17-19  | 3 Wo                      | Inventory, Leave, Attendance, Notifications, Workflows                  |
| **6 — Support & Infra** | 20-21  | 2 Wo                      | Tailscale, Per-Tenant Backup, Monitoring, Alerts                        |
| **7 — Mobile App**      | 22-26  | 5 Wo                      | React Native + Expo + Realm + NativeWind + Push                         |
| **Total**               |        | **26 Wochen (~6 Monate)** | **Vollständige Platform**                                               |

### Phase 0 Detail (Woche 1-2)

```
Tag 1:   pnpm init, Turborepo, pnpm-workspace.yaml
Tag 2:   Payload CMS Setup, MongoDB Connection, erste Collection
Tag 3:   Fastify Tenant-API Setup, useDb() Middleware
Tag 4:   TailAdmin Integration (Admin + Developer), Routing
Tag 5:   Docker Compose (MongoDB + Redis + API + Admin + Dev)
Tag 6:   packages/shared (Zod Schemas, Types, Utils)
Tag 7:   packages/ui (Button, Input, Card — Tailwind/Shadcn)
Tag 8:   GitHub Actions CI (Lint + Test + Build)
Tag 9:   ESLint + Prettier + Husky Pre-commit
Tag 10:  Smoke Test: Login → Dashboard → CRUD einer Collection
```

---

## 36. Kosten

### Monatliche Kosten (Produktion)

| Posten                        | 50 Tenants | 200 Tenants | 500 Tenants |
| ----------------------------- | ---------- | ----------- | ----------- |
| MongoDB Atlas                 | $57 (M10)  | $140 (M20)  | $280 (M30)  |
| API Hosting                   | $20        | $40         | $60         |
| Redis                         | $10        | $10         | $15         |
| S3/R2 Storage                 | $0         | $5          | $15         |
| Sentry                        | $0         | $0          | $26         |
| Domain/DNS                    | $1         | $1          | $1          |
| Paymob (Transaktionsgebühren) | ~2.5%      | ~2.5%       | ~2.5%       |
| **Gesamt (fix)**              | **$88/Mo** | **$196/Mo** | **$397/Mo** |

> **Paymob-Gebühren** sind variabel (2.5% Karte, 1% Meeza, 2% Fawry) und werden
> vom Zahlungsbetrag abgezogen — kein fixer Monatspreis. Bei 50 ägyptischen Tenants
> mit Ø $100/Mo Modulkosten ≈ $125/Mo Paymob-Gebühren.

### Einmalige Kosten

| Posten                              | Kosten                 |
| ----------------------------------- | ---------------------- |
| MongoDB Atlas Account               | $0                     |
| Stripe Account                      | $0                     |
| GitHub Pro                          | $4/Mo                  |
| Apple Developer (für iOS App)       | $99/Jahr               |
| Google Play Developer (für Android) | $25 einmalig           |
| Tailscale                           | $0 (Free für 3 Geräte) |

---

## 37. Internal Staff Chat System

### Warum kostenlos?

Socket.io läuft bereits auf dem Server für Notifications, Queue-Updates und Calendar-Sync.
Das Chat-System nutzt **dieselbe Socket.io-Infrastruktur** — keine zusätzlichen Kosten.
MongoDB-Speicher für Nachrichten ist minimal (~100 Bytes/Nachricht) und im bestehenden
Tenant-DB-Budget enthalten.

> **Kostenlos für jeden Tenant** — Teil der Plattform-Grundausstattung, wie Branding und Workflows.

### Zweck

Internes Kommunikations-Tool für das Klinik-Team. Ersetzt WhatsApp-Gruppen für
berufliche Kommunikation — DSGVO/HIPAA-konform, da Nachrichten innerhalb der
Tenant-Datenbank bleiben (nicht bei Meta/WhatsApp).

**Typische Nutzung:**

- Rezeptionist → Arzt: "Patient Mahmoud wartet, hat starke Schmerzen — Priorität?"
- Arzt → Assistentin: "Stuhl 3 vorbereiten für Extraktion, Instrumente bereit"
- Admin → Alle: "Morgen 15:00 Team-Meeting im Besprechungsraum"
- Branch-Gruppe: Tägliche Koordination innerhalb einer Filiale

### Chat-Kanäle (Channel-Typen)

| Typ            | Beschreibung                         | Erstellt von                       | Beispiel                           |
| -------------- | ------------------------------------ | ---------------------------------- | ---------------------------------- |
| `direct`       | 1:1 Direktnachricht                  | Automatisch (bei erster Nachricht) | Dr. Ahmad ↔ Sara (Rezeption)       |
| `branch`       | Alle Staff einer Branch              | Automatisch bei Branch-Erstellung  | "Main Branch Team"                 |
| `role`         | Alle User einer Rolle (tenant-weit)  | Automatisch                        | "All Doctors", "All Receptionists" |
| `custom`       | Benutzerdefinierte Gruppe            | `tenant_admin` oder jeder Staff    | "Implant-Team", "KFO-Besprechung"  |
| `announcement` | Nur Admin kann schreiben, alle lesen | `tenant_admin`                     | "Klinik-Ankündigungen"             |

### Collections

#### `chat_channels` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,

  // Kanal-Typ
  type: "direct" | "branch" | "role" | "custom" | "announcement",

  // Metadaten
  name: { en: String | null, ar: String | null },  // null bei Direct Messages
  description: String | null,
  avatarUrl: String | null,                         // Gruppenbild (optional)

  // Teilnehmer
  members: [
    {
      userId: ObjectId,
      role: "admin" | "member",             // Channel-Admin (kann Member hinzufügen)
      joinedAt: Date,
      mutedUntil: Date | null,              // Stummgeschaltet bis
      lastReadAt: Date,                     // Für Unread-Zähler
    }
  ],

  // Auto-Channel Verknüpfung (für branch/role Typen)
  branchId: ObjectId | null,                // Bei type='branch'
  roleFilter: String | null,                // Bei type='role' → z.B. 'dentist'

  // Direct Message Shortcut
  dmParticipants: [ObjectId, ObjectId] | null, // Bei type='direct' — für schnellen Lookup

  // Letzter Status
  lastMessage: {
    text: String,                           // Vorschau (max 100 chars)
    senderId: ObjectId,
    senderName: String,
    sentAt: Date,
  } | null,
  messageCount: Number,                     // Gesamtzahl Nachrichten

  // Settings
  isArchived: Boolean,                      // Default: false
  isPinned: Boolean,                        // Default: false (pro Channel)

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
}
// Index: { 'members.userId': 1, type: 1 }         — Alle Channels eines Users
// Index: { dmParticipants: 1 }                     — DM-Lookup (unique pair)
// Index: { branchId: 1, type: 1 }                  — Branch-Channels
// Index: { 'lastMessage.sentAt': -1 }              — Sortierung nach Aktivität
```

#### `chat_messages` Collection (Tenant-DB)

```typescript
{
  _id: ObjectId,
  channelId: ObjectId,                      // → chat_channels

  // Sender
  senderId: ObjectId,                       // → users
  senderName: String,                       // Denormalisiert für Performance
  senderRole: String,                       // "dentist", "receptionist", etc.
  senderAvatarUrl: String | null,

  // Inhalt
  type: "text" | "image" | "file" | "voice" | "system",
  text: String | null,                      // Nachrichtentext (Markdown-Light)

  // Attachments (Bilder, Dateien)
  attachments: [
    {
      filename: String,                     // "xray_mahmoud.jpg"
      url: String,                          // S3/R2 URL
      mimeType: String,                     // "image/jpeg"
      size: Number,                         // Bytes
      thumbnailUrl: String | null,          // Für Bilder: 200x200 Thumbnail
    }
  ],

  // Reply / Thread
  replyToId: ObjectId | null,              // Antwort auf eine bestimmte Nachricht
  replyPreview: {                          // Denormalisierte Vorschau
    text: String,
    senderName: String,
  } | null,

  // Status
  readBy: [                                // Wer hat gelesen
    { userId: ObjectId, readAt: Date }
  ],

  // Editing
  isEdited: Boolean,                       // Default: false
  editedAt: Date | null,
  isDeleted: Boolean,                      // Soft-Delete (Text wird "Message deleted")
  deletedAt: Date | null,

  createdAt: Date,
}
// Index: { channelId: 1, createdAt: -1 }           — Nachrichten pro Channel (paginiert)
// Index: { channelId: 1, senderId: 1, createdAt: -1 }  — Nachrichten eines Users in Channel
// Index: { createdAt: 1 }  TTL: 365 Tage (optional — konfigurierbar pro Tenant)
```

### Real-Time via Socket.io

```typescript
// Socket.io Rooms (pro User, pro Channel)
// Beim Login: User tritt allen seinen Channel-Rooms bei
socket.on('authenticate', async (token) => {
  const user = await verifyToken(token);
  const channels = await ChatChannel.find({ 'members.userId': user._id });
  channels.forEach((ch) => socket.join(`chat:${ch._id}`));
});

// Nachricht senden
socket.on('chat:send', async ({ channelId, text, attachments, replyToId }) => {
  // 1. Nachricht in DB speichern
  const message = await ChatMessage.create({ channelId, senderId, text, attachments, replyToId });

  // 2. lastMessage auf Channel aktualisieren
  await ChatChannel.updateOne(
    { _id: channelId },
    {
      $set: {
        lastMessage: { text: text.substring(0, 100), senderId, senderName, sentAt: new Date() },
      },
      $inc: { messageCount: 1 },
    },
  );

  // 3. An alle Channel-Mitglieder broadcasten
  io.to(`chat:${channelId}`).emit('chat:message', message);

  // 4. Push Notification an Offline-User (nicht im Socket verbunden)
  const offlineMembers = await getOfflineMembers(channelId, senderId);
  if (offlineMembers.length > 0) {
    await chatNotificationQueue.add('chat-push', {
      channelId,
      message,
      recipientIds: offlineMembers,
    });
  }
});

// Typing-Indicator
socket.on('chat:typing', ({ channelId }) => {
  socket.to(`chat:${channelId}`).emit('chat:typing', { userId, userName });
});

// Read Receipt
socket.on('chat:read', async ({ channelId, messageId }) => {
  await ChatMessage.updateOne(
    { _id: messageId },
    { $addToSet: { readBy: { userId, readAt: new Date() } } },
  );
  io.to(`chat:${channelId}`).emit('chat:read', { messageId, userId });
});
```

### UI-Seiten (Admin Portal)

| Seite                   | Beschreibung                                                          | Zugang                       |
| ----------------------- | --------------------------------------------------------------------- | ---------------------------- |
| **ChatSidebar**         | Liste aller Channels (sortiert nach letzter Aktivität) + Unread-Badge | Alle Staff                   |
| **ChatView**            | Nachrichten-Verlauf + Eingabefeld + Attachments + Reply               | Alle Staff                   |
| **ChatChannelCreate**   | Custom-Gruppe erstellen (Name, Members auswählen)                     | Alle Staff                   |
| **ChatChannelSettings** | Channel-Name, Members verwalten, Archivieren, Mute                    | Channel-Admin / tenant_admin |

**Layout:** Chat als **Sidebar-Panel** auf der rechten Seite (nicht eigene Seite) —
kann über ein Chat-Icon in der Top-Navigation geöffnet/geschlossen werden.
Stört den Workflow nicht — Staff kann Chat offen haben während sie im Kalender arbeiten.

```
┌──────────────────────────────────────────────────────────┐
│  Top Nav: [Logo] [Search] [Bell 🔔] [Chat 💬 3] [User]  │
├────────────┬─────────────────────────────┬───────────────┤
│  Sidebar   │  Main Content               │  Chat Panel   │
│  (Modules) │  (Appointments Calendar)     │  ┌─────────┐  │
│            │                             │  │ Channels │  │
│  Dashboard │                             │  │ Dr.Ahmad │  │
│  Patients  │                             │  │ Branch 1 │  │
│  Appoint.  │  ┌─────────────────────┐    │  │ All Docs │  │
│  Charts    │  │  Calendar View      │    │  ├─────────┤  │
│  ...       │  │                     │    │  │ Messages │  │
│            │  │                     │    │  │          │  │
│            │  │                     │    │  │ [Input]  │  │
│            │  └─────────────────────┘    │  └─────────┘  │
├────────────┴─────────────────────────────┴───────────────┤
│  Footer                                                  │
└──────────────────────────────────────────────────────────┘
```

### Attachment-Upload

```typescript
// Upload-Flow:
// 1. Staff wählt Datei (max 10MB) oder Bild (max 5MB)
// 2. Frontend: Upload nach S3/R2:
//    tenants/{tenant_slug}/chat/{channel_id}/{timestamp}_{filename}
// 3. Bilder: Auto-Thumbnail (200x200) via Sharp (Server-side)
// 4. Nachricht mit attachment-Array speichern
// 5. Broadcast an Channel-Mitglieder

// Erlaubte Dateitypen:
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif', // Bilder
  'application/pdf', // PDFs
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
  'audio/mpeg',
  'audio/ogg',
  'audio/wav', // Voice Messages
];
```

### Auto-Channels (automatisch erstellt)

Bei **Tenant-Erstellung**:

1. `announcement` Channel: "Clinic Announcements" — nur `tenant_admin` kann schreiben

Bei **Branch-Erstellung**:

1. `branch` Channel: "{Branch Name} Team" — alle Staff der Branch automatisch Member

Bei **User-Invite (Activation)**:

1. User wird automatisch zu seinen Branch-Channels + Role-Channels hinzugefügt
2. `announcement` Channel: User wird automatisch Member

Bei **erster DM-Nachricht**:

1. `direct` Channel wird automatisch erstellt (kein manuelles "Create DM" nötig)

### API Endpoints

| Method   | Route                                    | Beschreibung                                              |
| -------- | ---------------------------------------- | --------------------------------------------------------- |
| `GET`    | `/api/chat/channels`                     | Alle Channels des Users (mit lastMessage + unreadCount)   |
| `POST`   | `/api/chat/channels`                     | Custom-Channel erstellen                                  |
| `GET`    | `/api/chat/channels/:id`                 | Channel-Detail (Members, Settings)                        |
| `PATCH`  | `/api/chat/channels/:id`                 | Channel bearbeiten (Name, Members)                        |
| `DELETE` | `/api/chat/channels/:id`                 | Channel archivieren (nur custom, nur Admin)               |
| `POST`   | `/api/chat/channels/:id/members`         | Members hinzufügen                                        |
| `DELETE` | `/api/chat/channels/:id/members/:userId` | Member entfernen                                          |
| `GET`    | `/api/chat/channels/:id/messages`        | Nachrichten laden (paginiert, 50 pro Seite)               |
| `POST`   | `/api/chat/channels/:id/messages`        | Nachricht senden (REST-Fallback, normalerweise Socket.io) |
| `PATCH`  | `/api/chat/messages/:id`                 | Nachricht bearbeiten (nur eigene, innerhalb 15 Min.)      |
| `DELETE` | `/api/chat/messages/:id`                 | Nachricht löschen (Soft-Delete, nur eigene)               |
| `POST`   | `/api/chat/channels/:id/read`            | Channel als gelesen markieren                             |
| `POST`   | `/api/chat/upload`                       | Attachment hochladen (Pre-signed URL)                     |

### RBAC Permissions

| Permission                | Rollen                                                |
| ------------------------- | ----------------------------------------------------- |
| `chat.view`               | Alle Staff-Rollen                                     |
| `chat.send`               | Alle Staff-Rollen                                     |
| `chat.create_channel`     | Alle Staff-Rollen (custom Channels)                   |
| `chat.manage_channels`    | `tenant_admin` (alle Channels bearbeiten/archivieren) |
| `chat.delete_any_message` | `tenant_admin` (jede Nachricht löschen — Moderation)  |
| `chat.announcement.send`  | `tenant_admin` (in announcement Channels schreiben)   |

### Mobile App Integration

- **Realm Sync**: `chat_channels` + `chat_messages` werden via Realm synchronisiert
- **Offline**: Nachrichten können offline gelesen werden (cached in Realm)
- **Offline-Send**: Nachricht wird lokal gespeichert, bei Verbindung gesynct
- **Push Notification**: Expo Notifications bei neuer Nachricht (wenn App im Background)
- **Chat-Tab**: Eigenes Tab in der Mobile App Navigation (neben Appointments, Patients)

### Datenschutz & Retention

- **Nachrichten bleiben in der Tenant-DB** — kein externer Service (nicht WhatsApp/Telegram)
- **TTL Index (optional):** Standard 365 Tage Retention, konfigurierbar in `settings.chat.retentionDays`
- **Soft-Delete:** Gelöschte Nachrichten zeigen "Message deleted" (für Audit-Trail)
- **Admin kann moderieren:** `tenant_admin` kann jede Nachricht löschen (Compliance)
- **Kein Patient-Chat:** Staff-only System — Patienten kommunizieren über WhatsApp/SMS/Email (Section 20)

### v1 → v2 Vergleich

| Aspekt              | v1                                           | v2                                             |
| ------------------- | -------------------------------------------- | ---------------------------------------------- |
| Staff-Kommunikation | ❌ Nicht vorhanden (WhatsApp-Gruppen extern) | ✅ Integriertes Chat-System                    |
| Privatsphäre        | ❌ Patientendaten über WhatsApp geteilt      | ✅ Alles in Tenant-DB (DSGVO-konform)          |
| Channels            | ❌ —                                         | ✅ DM, Branch, Role, Custom, Announcement      |
| Attachments         | ❌ —                                         | ✅ Bilder, PDFs, Voice Messages (S3/R2)        |
| Real-Time           | ❌ —                                         | ✅ Socket.io (instant, kein Polling)           |
| Read Receipts       | ❌ —                                         | ✅ Wer hat gelesen + wann                      |
| Mobile              | ❌ —                                         | ✅ Realm Sync + Push Notifications             |
| Kosten              | ❌ —                                         | ✅ $0 (Socket.io + MongoDB, bereits vorhanden) |

---

## Änderungslog

| Datum      | Entscheidung                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ---------- | ------------------------------------------------------------------------------------------------- |
| 2026-02-24 | Stack: Node.js + MongoDB + React (TypeScript) gewählt                                                                                                                          |
| 2026-02-24 | .NET + Angular abgelehnt                                                                                                                                                       |
| 2026-02-24 | Payload CMS als Platform-Backend-Framework gewählt                                                                                                                             |
| 2026-02-24 | Database-per-Tenant (gleicher Atlas Cluster) gewählt                                                                                                                           |
| 2026-02-24 | Custom React UI für DB Explorer (nicht Mongo Express)                                                                                                                          |
| 2026-02-24 | Webhook-System: 2 Ebenen (Platform + Tenant, physisch isoliert)                                                                                                                |
| 2026-02-24 | Module Versioning mit SemVer, Canary Rollout, Auto-Rollback                                                                                                                    |
| 2026-02-24 | i18n: DB-basiert, pro Modul versioniert, Tenant-Overrides                                                                                                                      |
| 2026-02-24 | Currency: USD als Basis, 8 Währungen, per-Tenant konfigurierbar                                                                                                                |
| 2026-02-24 | 30 Website/Tourism/CMS-Tabellen entfernt                                                                                                                                       |
| 2026-02-24 | TailAdmin als UI Template (Tailwind, RTL, responsive)                                                                                                                          |
| 2026-02-24 | Tailscale ersetzt LiveKit für Support                                                                                                                                          |
| 2026-02-24 | Mobile: React Native + Expo + Realm Atlas Device Sync                                                                                                                          |
| 2026-02-24 | Realm für Offline-Mobile statt WatermelonDB/AsyncStorage                                                                                                                       |
| 2026-02-24 | Pricing: Module-Only (keine Pläne/Tiers), alle Preise dynamisch konfigurierbar                                                                                                 |
| 2026-02-24 | Free Tier: 10 User, 1 Branch, 1 GB Storage inklusive                                                                                                                           |
| 2026-02-24 | subscription_plans Collection entfernt, ersetzt durch pricing_config                                                                                                           |
| 2026-02-24 | Coupon-System + globale Rabatt-Aktionen + Per-Tenant Price Override                                                                                                            |
| 2026-02-24 | Dev Portal Sidebar: 20 → 17 Einträge (Workflows/Branding/DB/Revenue entfernt)                                                                                                  |
| 2026-02-24 | Workflows + Branding + DB Explorer → unter Tenant-Tabs verschoben                                                                                                              |
| 2026-02-24 | Revenue + Subscriptions → zusammengelegt als "Billing"                                                                                                                         |
| 2026-02-24 | TenantDetail: 6 → 10 Tabs (Branding, Workflows, Support, Database neu)                                                                                                         |
| 2026-02-24 | Workflows = kostenlose Plattform-Fähigkeit (kein Paid-Modul)                                                                                                                   |
| 2026-02-24 | Branding = kostenlos (war Paid "white-label" Modul in v1)                                                                                                                      |
| 2026-02-24 | Ticketing System neu (support_tickets Collection, CRUD, SLA, Priority)                                                                                                         |
| 2026-02-24 | Custom Fields: Collapsible Developer-Anleitung hinzugefügt                                                                                                                     |
| 2026-02-24 | Modul-Katalog: 5 Module entfernt (tourism, website, white-label, api-access, backup)                                                                                           |
| 2026-02-24 | Modul-Katalog: 3 Module neu (insurance-claims, lab-management, xray-cbct)                                                                                                      |
| 2026-02-24 | Pricing UI als eigene Sidebar-Seite hinzugefügt                                                                                                                                |
| 2026-02-24 | Payment Gateways: Paymob für Ägypten (Karten, Fawry, Wallets, InstaPay, ValU)                                                                                                  |
| 2026-02-24 | Payment Gateways: Stripe bleibt für internationale Tenants                                                                                                                     |
| 2026-02-24 | Provider-Auswahl automatisch basierend auf Tenant-Land (country_config)                                                                                                        |
| 2026-02-24 | Tenant Locale System: Country → Language → Currency Propagation                                                                                                                |
| 2026-02-24 | `country_config` Collection neu (Phone, Tax, Payment Provider, Date Format pro Land)                                                                                           |
| 2026-02-24 | Per-Patient `preferredCurrency` + per-Invoice Currency Override                                                                                                                |
| 2026-02-24 | Section 14 erweitert: Currency → Tenant Locale & Currency System                                                                                                               |
| 2026-02-24 | `saas_payments` Collection erweitert um Paymob-Felder (method, fawryReference, etc.)                                                                                           |
| 2026-02-24 | Language ist Tenant-Wahl, nicht automatisch vom Land (Country = Vorschlag, Tenant wählt)                                                                                       |
| 2026-02-24 | Tenant Admin darf Sprache im Admin Portal ändern (Settings → General → Language)                                                                                               |
| 2026-02-24 | Developer darf Sprache im Dev Portal ändern (Tenant → Settings Tab)                                                                                                            |
| 2026-02-24 | Sprachwechsel propagiert live via Socket.io an alle offenen Clients                                                                                                            |
| 2026-02-24 | Sprachwechsel ändert: UI-Texte, Direction (RTL/LTR), Notifications-Sprache, Mobile                                                                                             |
| 2026-02-24 | Sprachwechsel ändert NICHT: Currency, Tax Rate, Phone Prefix, Payment Provider                                                                                                 |
| 2026-02-24 | `tenant_languages.canAdminChange` Flag: Developer kann Tenant-Sprachänderung sperren                                                                                           |
| 2026-02-24 | Section 14 umbenannt: Currency System → Tenant Locale & Currency System                                                                                                        |
| 2026-02-24 | NEU: Section 12 — User Onboarding & Profil-System (Invite, Activation, Avatar-Upload)                                                                                          |
| 2026-02-24 | User-Erstellung: Admin gibt Email + Rolle → System sendet Invite → User aktiviert + Profil                                                                                     |
| 2026-02-24 | Profilbild: Echtes Upload nach S3/R2 (max 2MB, auto-crop 256x256), Default via DiceBear                                                                                        |
| 2026-02-24 | User-Status-Flow: invited → pending_activation → active → suspended/deactivated                                                                                                |
| 2026-02-24 | NEU: Section 13 — Doctor Data Model & Sharing                                                                                                                                  |
| 2026-02-24 | Doctors Collection in Tenant-DB → alle Branches sehen dieselben Doctors                                                                                                        |
| 2026-02-24 | User ↔ Doctor bidirektionale Sync (Name, Avatar, Gender)                                                                                                                       |
| 2026-02-24 | Doctor-Daten werden in: Appointments, Charts, Prescriptions, TreatmentPlans, LabOrders referenziert                                                                            |
| 2026-02-24 | Multi-Branch: Doctor kann mehreren Branches zugewiesen sein, Schedules sind pro Branch                                                                                         |
| 2026-02-24 | NEU: Section 14 — Logo & Branding Propagation                                                                                                                                  |
| 2026-02-24 | Logo propagiert: Sidebar (war hardcoded "D"), Login, alle Dokumente, Emails, Mobile                                                                                            |
| 2026-02-24 | Branding Document in Tenant-DB: Logo, ClinicName, Address (Main Branch), Phone, Email, Colors                                                                                  |
| 2026-02-24 | Multi-Branch Dokumente: Immer Main-Branch-Adresse im Header                                                                                                                    |
| 2026-02-24 | NEU: Section 15 — Document Templates (Invoice, Prescription, Treatment Plan)                                                                                                   |
| 2026-02-24 | Einheitliche `<ClinicHeader />` Komponente statt Code-Duplikation                                                                                                              |
| 2026-02-24 | Invoice: Logo + Clinic + Patient, OHNE Doctor (Klinik-Dokument)                                                                                                                |
| 2026-02-24 | Prescription: Logo + Clinic + Doctor (Name + Specialty + License) + Signatur                                                                                                   |
| 2026-02-24 | TreatmentPlan: Logo + Clinic + Doctor + Patient + Doctor-Signatur + Patient-Signatur                                                                                           |
| 2026-02-24 | TreatmentPlan in v1 hatte hardcoded "Dento Dental Clinic" → v2 dynamisch aus Branding                                                                                          |
| 2026-02-24 | Sections renummeriert: 25 → 29 Sections                                                                                                                                        |
| 2026-02-24 | NEU: Section 16 — Inventory Management System (Deep Dive)                                                                                                                      |
| 2026-02-24 | v1 Inventory komplett analysiert: 7 SQL-Tabellen, 33 implementierte Features, 12 schema-only Features                                                                          |
| 2026-02-24 | v2 Inventory: 7 MongoDB Collections (inventory_items, inventory_stock, inventory_movements, suppliers, purchase_orders, stock_transfers, stock_counts)                         |
| 2026-02-24 | NEU: Supplier Management UI (v1 war schema-only ohne Frontend)                                                                                                                 |
| 2026-02-24 | NEU: Purchase Order Workflow UI (v1 war schema-only: draft→submitted→confirmed→shipped→received→cancelled)                                                                     |
| 2026-02-24 | NEU: Batch/Lot Tracking als embedded Array in inventory_stock (v1 hatte nur batch_number Spalte in movements)                                                                  |
| 2026-02-24 | NEU: Expiry Dashboard + Cron-Job (täglicher Check 02:00) + Alerts (v1 hardcoded 0)                                                                                             |
| 2026-02-24 | NEU: `stock_transfers` Collection für Inter-Branch Transfers (v1 nur movement types, kein UI)                                                                                  |
| 2026-02-24 | NEU: `stock_counts` Collection für Inventur (v1 nur last_counted_at/by Spalten, kein UI)                                                                                       |
| 2026-02-24 | NEU: Barcode/QR Support (barcode + barcodeType Felder, Web: html5-qrcode, Mobile: expo-barcode-scanner)                                                                        |
| 2026-02-24 | NEU: Stock-Bewertung FIFO/Weighted Average/Last Purchase (v1 nur einzelner unit_cost)                                                                                          |
| 2026-02-24 | NEU: Auto-Reorder-Vorschläge (Low-Stock → Draft-PO an Default-Supplier)                                                                                                        |
| 2026-02-24 | NEU: 10 Inventory Reports (Material Usage, Stock Valuation, Expiry, Forecast, Supplier Perf, Dead Stock, ABC-Analyse etc.)                                                     |
| 2026-02-24 | FIX: Stock-Validierung konfigurierbar (v1 erlaubte negative Bestände — v2 Default: nicht erlauben)                                                                             |
| 2026-02-24 | NEU: Item-Bilder (S3/R2 Upload), Hersteller-Felder, unitsPerPackage, minStockLevel, maxStockLevel                                                                              |
| 2026-02-24 | NEU: 14 Inventory Webhook-Events (war 3 in v1: low_stock, expired, restocked)                                                                                                  |
| 2026-02-24 | NEU: 12 granulare RBAC Permissions für Inventory (v1 hatte nur view + manage + order)                                                                                          |
| 2026-02-24 | Inventory UI: 2 Seiten (v1) → 17 Seiten (v2)                                                                                                                                   |
| 2026-02-24 | Sections renummeriert: 29 → 30 Sections                                                                                                                                        |
| 2026-02-24 | NEU: Section 17 — Clinical Cross-Linking: Imaging ↔ Treatments ↔ Procedures                                                                                                    |
| 2026-02-24 | v1 Analyse: X-Rays, CBCT, Treatment Plans, Procedure Notes komplett ISOLIERT (nur via patient_id)                                                                              |
| 2026-02-24 | v1: KEIN FK von xrays → treatment_plans (Röntgenbilder können nicht zu Behandlungsplänen verlinkt werden)                                                                      |
| 2026-02-24 | v1: KEIN FK von xrays → procedure_notes (Prozeduren haben keine verknüpften Bilder)                                                                                            |
| 2026-02-24 | v1: KEIN FK von cbct_orders → treatment_plans/procedure_notes                                                                                                                  |
| 2026-02-24 | v1: procedure_notes.treatment_plan_id FK existiert in DB, aber UI/FormData ignoriert es komplett                                                                               |
| 2026-02-24 | v2: Bidirektionale Links — xrays/cbct_orders haben treatmentPlanId + procedureNoteId Felder                                                                                    |
| 2026-02-24 | v2: treatment_plans + procedure_notes haben linkedXrays[] + linkedCbcts[] Arrays                                                                                               |
| 2026-02-24 | v2: procedure_notes haben preOpXrays[] + postOpXrays[] für Vorher/Nachher-Dokumentation                                                                                        |
| 2026-02-24 | v2: `<ImagingLinker />` — wiederverwendbare Komponente für alle 5+ Formulare                                                                                                   |
| 2026-02-24 | v2: Imaging Requirements — Service → Required Imaging Mapping + Auto-Check bei Treatment Plan                                                                                  |
| 2026-02-24 | v2: Imaging Timeline — neues Tab in PatientView mit chronologischer Übersicht                                                                                                  |
| 2026-02-24 | v2: Dental Chart → Zahn → alle verknüpften X-Rays, CBCTs, Treatments, Procedures                                                                                               |
| 2026-02-24 | v2: Cross-Module-Navigation — klickbare Badges (TP/Proc) in XrayList + CbctList                                                                                                |
| 2026-02-24 | v2: X-Ray Comparison Viewer (comparedToXrayId + Side-by-Side)                                                                                                                  |
| 2026-02-24 | v2: clinicalPurpose Enum für X-Rays + CBCTs (diagnostic, pre/post-treatment, follow_up, etc.)                                                                                  |
| 2026-02-24 | v2: toothNumbers Array statt einzelner String (Multi-Tooth X-Rays)                                                                                                             |
| 2026-02-24 | v2: 7 neue Imaging Webhook-Events (linked, requirement_fulfilled, etc.)                                                                                                        |
| 2026-02-24 | v2: 7 neue API Endpoints für Cross-Linking + Imaging Aggregation                                                                                                               |
| 2026-02-24 | Sections renummeriert: 30 → 31 Sections                                                                                                                                        |
| 2026-02-24 | NEU: Section 18 — Walk-in Queue & Daily Operations Hub                                                                                                                         |
| 2026-02-24 | v1 Walk-in Queue analysiert: WalkInQueue.jsx (1317 Zeilen), walk_in_queue + queue_counters + chairs Tabellen                                                                   |
| 2026-02-24 | v1 PROBLEM: Walk-ins und Appointments komplett getrennte Systeme                                                                                                               |
| 2026-02-24 | v1 PROBLEM: Kein `arrivedAt` Timestamp auf Appointments — Ankunft nicht trackbar                                                                                               |
| 2026-02-24 | v1 PROBLEM: 5 Chair/Wait DB-Funktionen existieren aber werden nie vom Frontend aufgerufen                                                                                      |
| 2026-02-24 | v1 PROBLEM: 30s Polling statt Real-Time (WebSocket/Socket.io)                                                                                                                  |
| 2026-02-24 | v1 PROBLEM: appointment_waitlist Tabelle existiert aber hat kein Frontend                                                                                                      |
| 2026-02-24 | v2: Unified Daily Operations Hub — Walk-ins + Termine auf einer Seite                                                                                                          |
| 2026-02-24 | v2: `arrivedAt` + `arrivalStatus` (pending/arrived/no_show/late) auf Appointments                                                                                              |
| 2026-02-24 | v2: Queue-Nummer auch für Termine (bei Ankunft zugewiesen, nicht nur Walk-ins)                                                                                                 |
| 2026-02-24 | v2: Chair-Dashboard mit Real-Time Belegung (v1 hatte DB-Funktionen ohne UI)                                                                                                    |
| 2026-02-24 | v2: Wait-Time tatsächlich berechnet und angezeigt (v1 nie aufgerufen)                                                                                                          |
| 2026-02-24 | v2: Walk-in → Appointment Konvertierung (v1 nicht möglich)                                                                                                                     |
| 2026-02-24 | v2: Auto-No-Show via BullMQ Job nach konfigurierbarer Zeit                                                                                                                     |
| 2026-02-24 | v2: Socket.io Real-Time statt Polling (branch:X:daily-ops Room)                                                                                                                |
| 2026-02-24 | v2: 12 API Endpoints für Daily Operations                                                                                                                                      |
| 2026-02-24 | v2: 10 RBAC Permissions für Daily Ops                                                                                                                                          |
| 2026-02-24 | v2: 12 Webhook Events (walk*in.*, appointment._, chair._, queue.\_)                                                                                                            |
| 2026-02-24 | v2: Dashboard Widget "Waiting Room" mit Live-Daten                                                                                                                             |
| 2026-02-24 | v2: 5 Tabs (All Today, Scheduled, Walk-ins, Waiting Room, In Chair)                                                                                                            |
| 2026-02-24 | v2: Assignment Modal für Doctor + Chair Zuweisung                                                                                                                              |
| 2026-02-24 | v2: `chiefComplaint` + `floor` neue Felder                                                                                                                                     |
| 2026-02-24 | Sections renummeriert: 31 → 32 Sections                                                                                                                                        |
| 2026-02-24 | NEU: Section 19 — Recurring Appointments (Termin-Serien)                                                                                                                       |
| 2026-02-24 | v1 Recurring analysiert: 2 konkurrierende Designs (Migration 016 Spalten + Migration 024 eigene Tabelle)                                                                       |
| 2026-02-24 | v1 PROBLEM: `recurring_appointment_rules` Tabelle komplett ungenutzt (tote Schema-Infrastruktur)                                                                               |
| 2026-02-24 | v1 PROBLEM: Kein Serien-Management UI — nach Erstellung nicht ansehen/editieren/stornieren möglich                                                                             |
| 2026-02-24 | v1 PROBLEM: Keine visuelle Kennzeichnung (Kalender/Listen zeigen Serien-Termine nicht anders)                                                                                  |
| 2026-02-24 | v1 PROBLEM: Keine Conflict-Prüfung beim Generieren (UNIQUE INDEX kann still fehlschlagen)                                                                                      |
| 2026-02-24 | v1 PROBLEM: RPC-Fehler still verschluckt — User sieht „Success" auch wenn Serie nicht erstellt                                                                                 |
| 2026-02-24 | v1 PROBLEM: `cancel_recurring_appointments()` DB-Funktion existiert, nie vom Frontend aufgerufen                                                                               |
| 2026-02-24 | v1 PROBLEM: Kein „Edit this occurrence" vs „Edit all"                                                                                                                          |
| 2026-02-24 | v2: `recurring_rules` Collection (1 sauberes Design statt 2 konkurrierende)                                                                                                    |
| 2026-02-24 | v2: Appointments erweitert: `recurringRuleId`, `isRecurring`, `occurrenceIndex`, `isModified`                                                                                  |
| 2026-02-24 | v2: BullMQ Cron Job generiert Termine 4 Wochen voraus (statt blocking RPC im Request)                                                                                          |
| 2026-02-24 | v2: Conflict-Check vor Generierung (Arzt-Verfügbarkeit + skipIfConflict Option)                                                                                                |
| 2026-02-24 | v2: Edit-Modi: „This occurrence" / „This and future" / „All"                                                                                                                   |
| 2026-02-24 | v2: Cancel + Pause/Resume für Serien                                                                                                                                           |
| 2026-02-24 | v2: Recurring Rules Management Seite + Series Detail View mit Progress-Bar                                                                                                     |
| 2026-02-24 | v2: Kalender-Badge (🔄-Icon) + Listen-Filter für Recurring                                                                                                                     |
| 2026-02-24 | v2: Holiday-Skipping + skipIfConflict Optionen                                                                                                                                 |
| 2026-02-24 | v2: Erinnerungen (Patient-Reminder, Arzt-Summary, Series-Ending-Hinweis)                                                                                                       |
| 2026-02-24 | v2: 7 Patterns (daily, weekly, biweekly, monthly, quarterly, biannual, annual)                                                                                                 |
| 2026-02-24 | v2: 11 API Endpoints, 7 RBAC Permissions, 9 Webhook Events                                                                                                                     |
| 2026-02-24 | v2: Dental-spezifische Anwendungsfälle (KFO weekly, PZR quarterly, Recall biannual)                                                                                            |
| 2026-02-24 | v2: `weekOfMonth` für „jeden 2. Dienstag" (v1 fehlte)                                                                                                                          |
| 2026-02-24 | v2: `preferredChairId` Integration mit Daily Ops Hub (Section 18)                                                                                                              |
| 2026-02-24 | 8 neue Einträge in Neue Features Tabelle                                                                                                                                       |
| 2026-02-24 | Sections renummeriert: 32 → 33 Sections                                                                                                                                        |
| 2026-02-24 | NEU: Section 20 — Notifications & Messaging System                                                                                                                             |
| 2026-02-24 | v1 Notifications analysiert: 4 DB-Tabellen + 1 Phantom-Tabelle + 1 Edge Function                                                                                               |
| 2026-02-24 | v1 PROBLEM: `notification_templates` hat 2 konkurrierende Spalten-Sätze (Mig 012 vs 032)                                                                                       |
| 2026-02-24 | v1 PROBLEM: `notifications` Tabelle in Triggern referenziert, nie mit CREATE TABLE definiert                                                                                   |
| 2026-02-24 | v1 PROBLEM: `notification_queue` wird von Triggern befüllt, KEIN Worker verarbeitet sie (wächst endlos)                                                                        |
| 2026-02-24 | v1 PROBLEM: Bell-Dropdown zeigt Appointments statt echte Notifications (5-Min-Polling)                                                                                         |
| 2026-02-24 | v1 PROBLEM: Push Notifications Toggle im UI, null Implementierung                                                                                                              |
| 2026-02-24 | v1 PROBLEM: Kanal-Settings gespeichert aber bei Versand nie geprüft                                                                                                            |
| 2026-02-24 | v1 PROBLEM: pg_cron Reminder als Kommentar, nie aktiviert                                                                                                                      |
| 2026-02-24 | v1 PROBLEM: Keine notification_preferences Tabelle                                                                                                                             |
| 2026-02-24 | v2: 5 MongoDB Collections (notification_templates, notifications, notification_logs, notification_preferences, device_tokens)                                                  |
| 2026-02-24 | v2: BullMQ Workers — 4 dedizierte Queues (email, sms, whatsapp, push) mit Retry + Rate Limiting                                                                                |
| 2026-02-24 | v2: Echtes In-App Notification Center + Socket.io Realtime (statt 5-Min-Polling)                                                                                               |
| 2026-02-24 | v2: Push Notifications vollständig — Web Push (VAPID) + Mobile (Expo/FCM/APNs)                                                                                                 |
| 2026-02-24 | v2: Unified Template-System (EN/AR pro Kanal) mit typisierten Variablen                                                                                                        |
| 2026-02-24 | v2: Notification Preferences — Pro User: Kanäle × Kategorien + Quiet Hours + Digest Mode                                                                                       |
| 2026-02-24 | v2: 16 Seed Templates (Appointment, Payment, Clinical, Inventory, Queue, System)                                                                                               |
| 2026-02-24 | v2: Scheduled Jobs via BullMQ (Appointment Reminder, Recall, Payment, Low Stock)                                                                                               |
| 2026-02-24 | v2: Zustellungsprotokoll mit providerMessageId + Delivery-Tracking + Analytics                                                                                                 |
| 2026-02-24 | v2: 5 UI-Seiten (Bell, Notification Center, Template Management, Logs, Preferences)                                                                                            |
| 2026-02-24 | v2: 19 API Endpoints, 7 RBAC Permissions, 6 Webhook Events                                                                                                                     |
| 2026-02-24 | v2: Provider: Resend (Email), Twilio (SMS), Meta Business API (WhatsApp), VAPID/FCM (Push)                                                                                     |
| 2026-02-24 | v2: Bulk-Versand an Gruppen/alle Patienten (v1 fehlte)                                                                                                                         |
| 2026-02-24 | 11 neue Einträge in Neue Features Tabelle                                                                                                                                      |
| 2026-02-24 | Sections renummeriert: 33 → 34 Sections                                                                                                                                        |
| 2026-02-24 | NEU: Section 21 — Reports & Analytics System                                                                                                                                   |
| 2026-02-24 | v1 Reports analysiert: 1 echter Report (MaterialUsageReport), Dashboard mit 5 Stat-Cards, keine Chart-Library                                                                  |
| 2026-02-24 | v1 PROBLEM: CommissionList Export-Button vorhanden, Funktion NICHT implementiert                                                                                               |
| 2026-02-24 | v1 PROBLEM: Dashboard `change`-Prop im StatCard existiert, wird NIE befüllt                                                                                                    |
| 2026-02-24 | v1 PROBLEM: `reports` Modul-Flag existiert im ModuleContext, wird NIRGENDS geprüft                                                                                             |
| 2026-02-24 | v1 PROBLEM: Kein Sidebar Reports-Bereich — MaterialUsage unter Inventory versteckt                                                                                             |
| 2026-02-24 | v1 PROBLEM: Client-side Promise.allSettled mit 3s Timeout statt Server-Aggregation                                                                                             |
| 2026-02-24 | v2: Zwei-Tier-Modell — Free (dashboard-reports) + Paid (advanced-analytics $199/Mo)                                                                                            |
| 2026-02-24 | v2: 26 Reports in 5 Kategorien (Financial 7, Patient 5, Appointment 6, Clinical 4, Operational 4)                                                                              |
| 2026-02-24 | v2: + 10 Inventory Reports aus Abschnitt 16 = 36 Reports gesamt                                                                                                                |
| 2026-02-24 | v2: Recharts 2.x als Chart Library (Bar, Line, Pie, Heatmap)                                                                                                                   |
| 2026-02-24 | v2: MongoDB Aggregation Pipelines für alle Reports (Server-side)                                                                                                               |
| 2026-02-24 | v2: Export-System: @fast-csv (CSV) + exceljs (Excel) + @react-pdf/renderer (PDF)                                                                                               |
| 2026-02-24 | v2: `report_schedules` Collection + BullMQ Worker für Scheduled Reports                                                                                                        |
| 2026-02-24 | v2: Dashboard Redesign: 8 Widgets + Sparklines + Trend-Vergleich mit Vormonat                                                                                                  |
| 2026-02-24 | v2: 9 UI-Seiten (Dashboard, Reports Hub, 5 Kategorie-Seiten, Saved, Scheduled)                                                                                                 |
| 2026-02-24 | v2: 16 API Endpoints, 7 RBAC Permissions, 5 Webhook Events                                                                                                                     |
| 2026-02-24 | v2: Peak Hours Heatmap (7×12 Matrix), Aging Report (Bucket-Aggregation)                                                                                                        |
| 2026-02-24 | v2: Locked-Preview für nicht freigeschaltete Reports (Blur + Upgrade CTA)                                                                                                      |
| 2026-02-24 | 11 neue Einträge in Neue Features Tabelle                                                                                                                                      |
| 2026-02-24 | Sections renummeriert: 34 → 35 Sections                                                                                                                                        |
| 2026-02-25 | Section 22 hinzugefügt: Staff Scheduling & Availability System                                                                                                                 |
| 2026-02-25 | v1 PROBLEM: 3x working_hours (doctors.working_hours + doctor_schedules + branches.work_hours) — nie konsolidiert                                                               |
| 2026-02-25 | v1 PROBLEM: AppointmentForm.jsx hat ZERO Schedule-Validierung (nur Appointment-Konflikt-Check)                                                                                 |
| 2026-02-25 | v1 PROBLEM: Kein Slot-Generator, keine Online-Booking API, kein Public-Endpoint                                                                                                |
| 2026-02-25 | v1 PROBLEM: Ramadan-Modus Toggle existiert, wird nirgends ausgewertet                                                                                                          |
| 2026-02-25 | v1 PROBLEM: schedule_exceptions werden bei Terminbuchung nicht geprüft                                                                                                         |
| 2026-02-25 | v1 PROBLEM: Keine Holidays, kein Lead Time, kein Booking Window                                                                                                                |
| 2026-02-25 | v2: `doctors.workingHours` ENTFERNT — `doctor_schedules` Collection ist Single Source of Truth                                                                                 |
| 2026-02-25 | v2: 3-Ebenen-Hierarchie: Branch Hours → Doctor Schedule → Appointment (erzwungen)                                                                                              |
| 2026-02-25 | v2: Slot-Engine: Branch + Doctor + Exceptions + Appointments → verfügbare Slots                                                                                                |
| 2026-02-25 | v2: Online-Booking API: 4 Public Endpoints (branches, doctors, slots, booking) mit API Key Auth                                                                                |
| 2026-02-25 | v2: Ramadan-Modus funktional: ramadanHours, Auto-Switch, Slot-Engine-Integration, Reminder-Job                                                                                 |
| 2026-02-25 | v2: Branch slotConfig (defaultDuration, bufferBetween, bookingLeadTime, bookingWindowDays)                                                                                     |
| 2026-02-25 | v2: Branch holidays (pro Branch konfigurierbar, blockiert Booking)                                                                                                             |
| 2026-02-25 | v2: 9 Collections (doctor_schedules, schedule_exceptions, staff_schedules, shift_templates, leave_requests, leave_types, leave_balances, time_attendance + branches erweitert) |
| 2026-02-25 | v2: 28 API Endpoints (davon 4 Public), 13 RBAC Permissions, 16 Webhook Events                                                                                                  |
| 2026-02-25 | v2: 10 UI-Seiten, Appointment Calendar mit Schedule-Overlay                                                                                                                    |
| 2026-02-25 | v2: Leave ↔ Schedule Auto-Sync (genehmigte Leave → schedule_exception)                                                                                                         |
| 2026-02-25 | Section 5 DB-Tree: +5 Collections (schedule_exceptions, staff_schedules, shift_templates, leave_types, leave_balances)                                                         |
| 2026-02-25 | Section 13: Hinweis hinzugefügt — workingHours ENTFERNT, → doctor_schedules                                                                                                    |
| 2026-02-25 | Module #19 Schedules: +staff_schedules, +shift_templates hinzugefügt                                                                                                           |
| 2026-02-25 | 11 neue Einträge in Neue Features Tabelle                                                                                                                                      |
| 2026-02-25 | Sections renummeriert: 35 → 36 Sections                                                                                                                                        |
| 2026-02-25 | Section 22: Online-Booking Confirmation Flow hinzugefügt                                                                                                                       |
| 2026-02-25 | v2: Receptionist kann Online-Booking bestätigen / mit Änderungen bestätigen / ablehnen                                                                                         |
| 2026-02-25 | v2: Patient-Notification bei jeder Status-Änderung (SMS + Email + WhatsApp)                                                                                                    |
| 2026-02-25 | v2: Auto-Confirm pro Branch konfigurierbar (kein Auto-Reject)                                                                                                                  |
| 2026-02-25 | v2: branches.onlineBookingConfig (autoConfirm, enabledServices, etc.)                                                                                                          |
| 2026-02-25 | v2: PATCH /api/appointments/:id/confirm — Bestätigen/Ändern/Ablehnen Endpoint                                                                                                  |
| 2026-02-25 | v2: 6 neue Online-Booking Webhook Events (confirmed_changed, rejected, auto_confirmed, patient_notified)                                                                       |
| 2026-02-25 | v2: 3 neue Einträge in Neue Features Tabelle                                                                                                                                   |
| 2026-02-25 | API Endpoints: 28 → 30 (inkl. Online-Booking Management)                                                                                                                       |
| 2026-02-25 | Medium Gap 6: `medications` Collection hinzugefügt — Tenant-eigener Medikamenten-Katalog mit ~100 Seed-Medikamenten                                                            |
| 2026-02-25 | Medium Gap 6: Prescription-Formular nutzt Medications-Autocomplete (Name/GenericName Suche + Default-Vorbefüllung)                                                             |
| 2026-02-25 | Medium Gap 6: Section 5 DB-Tree + Section 10 Module #10 aktualisiert                                                                                                           |
| 2026-02-25 | Medium Gap 7: `patients.insurance[]` als optionales embedded Array definiert — nur wenn Insurance-Modul aktiv                                                                  |
| 2026-02-25 | Medium Gap 7: v1 `patient_insurance` Tabelle → v2 embedded im patients-Dokument (spart Lookup)                                                                                 |
| 2026-02-25 | Medium Gap 8: Klarstellung: v1 `cbct_reports` eliminiert → v2 embedded in `cbct_orders.report`                                                                                 |
| 2026-02-25 | Medium Gap 9: `services.defaultMaterials[]` Schema definiert — Standard-Materialien pro Service mit Auto-Deduktion                                                             |
| 2026-02-25 | Medium Gap 9: Workflow: Service → Default Materials → Procedure Note → Auto-Inventar-Abzug                                                                                     |
| 2026-02-25 | Medium Gap 10: Brute-Force-Schutz in Section 27 Auth implementiert                                                                                                             |
| 2026-02-25 | Medium Gap 10: Progressive Cooldown: 3 Versuche frei → 5min → 15min → 30min → 1h → IP-Block                                                                                    |
| 2026-02-25 | Medium Gap 10: Redis-basiert (login:attempts, login:cooldown, login:ip_blocked Keys)                                                                                           |
| 2026-02-25 | Medium Gap 10: `login_attempts` Collection in Platform-DB für Audit (90 Tage Retention)                                                                                        |
| 2026-02-25 | Medium Gap 10: 4 Admin-Endpoints: IP entsperren, Cooldown aufheben, Login-History, Geblockte IPs                                                                               |
| 2026-02-25 | Medium Gap 11: `alert_rules` Collection in Section 20 Notifications hinzugefügt                                                                                                |
| 2026-02-25 | Medium Gap 11: 5 Trigger-Typen: inventory_low_stock, inventory_expiring, invoice_overdue, no_show_rate_high, revenue_drop                                                      |
| 2026-02-25 | Medium Gap 11: BullMQ Worker `alert-rule-checker` alle 15 Min + Cooldown-Throttling                                                                                            |
| 2026-02-25 | Medium Gap 11: 5 Seed Alert Rules bei Tenant-Erstellung                                                                                                                        |
| 2026-02-25 | Medium Gap 11: UI-Seite `/settings/alerts` für Alert Rules CRUD                                                                                                                |
| 2026-02-25 | Medium Gap 12: `treatments` (v1) → `procedure_notes` (v2) — Klare Namenkonvention                                                                                              |
| 2026-02-25 | Medium Gap 12: Regel: `treatment_plans` = Was kommt (Planung), `procedure_notes` = Was wurde gemacht (Dokumentation)                                                           |
| 2026-02-25 | Section 5 DB-Tree: +3 Collections (medications, alert_rules, login_attempts)                                                                                                   |
| 2026-02-25 | Section 10: Hinweise zu Module #10 Prescriptions, #14 Insurance, Treatments-Rename hinzugefügt                                                                                 |
| 2026-02-25 | 7 neue Einträge in Neue Features Tabelle                                                                                                                                       |
| 2026-02-25 | Alle 7 Medium Gaps (6-12) aus Coverage Scan geschlossen                                                                                                                        |
| 2026-02-25 | Final Gap 1: `lab_order_types` Collection hinzugefügt — 14 Seed-Typen (Crown, Bridge, Denture, etc.)                                                                           |
| 2026-02-25 | Final Gap 1: Schema: nameEn/Ar, category, defaultTurnaroundDays, isActive, isCustom, sortOrder                                                                                 |
| 2026-02-25 | Final Gap 1: Voll funktional: LabOrderForm Dropdown, LabOrderList Anzeige, Turnaround-Tracking, Custom Types                                                                   |
| 2026-02-25 | Final Gap 1: Section 5 DB-Tree + Section 10 Module #13 aktualisiert                                                                                                            |
| 2026-02-25 | Final Gap 2: Platform Usage Analytics als Live-Compute dokumentiert (Design-Entscheidung)                                                                                      |
| 2026-02-25 | Final Gap 2: v1 `tenant_usage_metrics` war Schema-only/nie genutzt — v2 nutzt MongoDB Aggregation on-demand                                                                    |
| 2026-02-25 | Final Gap 2: Phase 6+ optional: BullMQ Cron für historische Snapshots                                                                                                          |
| 2026-02-25 | Final Gap 3: Section 27 Auth & RBAC massiv erweitert — User Types, Rollen-Hierarchie, Permission-Matrix                                                                        |
| 2026-02-25 | Final Gap 3: 8 Tenant-Level Rollen definiert: tenant_admin, dentist, receptionist, assistant, accountant, lab_tech, hygienist + platform_admin/support                         |
| 2026-02-25 | Final Gap 3: Permission-Matrix (28 Module × 8 Rollen) mit ✅/👁️/➕/❌ Granularität                                                                                             |
| 2026-02-25 | Final Gap 3: Tenant-Admin Scope: voller Zugriff NUR innerhalb eigenes Tenant, kein Dev Portal Zugang                                                                           |
| 2026-02-25 | Final Gap 3: Design-Entscheidung: 7 feste Code-definierte Rollen mit Middleware-Enforcement (v1 UI war kosmetisch)                                                             |
| 2026-02-25 | Final Gap 3: roleGuard Middleware erzwingt Permissions auf jedem API-Request                                                                                                   |
| 2026-02-25 | Final Gap 4: API-Katalog als auto-generiert via `@fastify/swagger` → OpenAPI 3.1 Spec dokumentiert                                                                             |
| 2026-02-25 | Final Gap 4: Kein `api_definitions`/`api_categories` Collection nötig — Spec generiert aus Route-Schemas                                                                       |
| 2026-02-25 | Final Gap 5: Tenant-Impersonation (Support Sessions) hinzugefügt in Section 9                                                                                                  |
| 2026-02-25 | Final Gap 5: `support_sessions` Collection: temp JWT (60min), Audit-Trail, Action-Log, Reason-Pflicht                                                                          |
| 2026-02-25 | Final Gap 5: 5 API Endpoints + UI Buttons in TenantList/TenantDetail + Impersonation-Banner                                                                                    |
| 2026-02-25 | Final Gap 5: Sicherheitsregeln: nur platform_admin, Pflicht-Grund, 60min Max, JWT Revocation via Redis                                                                         |
| 2026-02-25 | Portale-Tabelle aktualisiert: hygienist hinzugefügt, Dev Portal 18 Module                                                                                                      |
| 2026-02-25 | 5 neue Einträge in Neue Features Tabelle                                                                                                                                       |
| 2026-02-25 | Alle 5 Final Gaps aus zweitem Coverage Scan geschlossen — Plan ist 100% komplett                                                                                               |
| 2026-02-25 | NEU: Section 37 — Internal Staff Chat System                                                                                                                                   |
| 2026-02-25 | Staff Chat ist KOSTENLOS — nutzt bestehende Socket.io + MongoDB Infrastruktur ($0 Zusatzkosten)                                                                                |
| 2026-02-25 | 2 Collections: `chat_channels` + `chat_messages` (Tenant-DB)                                                                                                                   |
| 2026-02-25 | 5 Channel-Typen: direct (1:1), branch (auto), role (auto), custom (manuell), announcement (admin-only)                                                                         |
| 2026-02-25 | Auto-Channels: Branch-Channels + Role-Channels + Announcement bei Tenant/Branch/User-Erstellung                                                                                |
| 2026-02-25 | Echtzeit via Socket.io: Instant-Zustellung, Typing-Indicator, Read-Receipts                                                                                                    |
| 2026-02-25 | Attachments: Bilder, PDFs, Word, Excel, Voice Messages via S3/R2 (max 10MB)                                                                                                    |
| 2026-02-25 | Reply/Thread: Antwort auf bestimmte Nachricht mit Vorschau                                                                                                                     |
| 2026-02-25 | UI: Chat als Sidebar-Panel (rechts) — öffnet/schließt über Chat-Icon in Top-Nav                                                                                                |
| 2026-02-25 | Mobile: Realm Sync + Push Notifications + eigenes Chat-Tab                                                                                                                     |
| 2026-02-25 | RBAC: 6 Permissions (view, send, create_channel, manage_channels, delete_any_message, announcement.send)                                                                       |
| 2026-02-25 | 14 API Endpoints für Channels + Messages + Upload                                                                                                                              |
| 2026-02-25 | Kein Patient-Chat — Staff-only (Patienten via WhatsApp/SMS/Email in Section 20)                                                                                                |
| 2026-02-25 | Datenschutz: Nachrichten in Tenant-DB (DSGVO-konform), konfigurierbare Retention (365 Tage Default)                                                                            |
| 2026-02-25 | Section 5 DB-Tree: +2 Collections (chat_channels, chat_messages)                                                                                                               |
| 2026-02-25 | 3 neue Einträge in Neue Features Tabelle                                                                                                                                       |
| 2026-02-25 | Sections: 36 → 37                                                                                                                                                              |
| 2026-02-25 | FINAL AUDIT: Vollständiger Cross-Reference v1 (149 Tabellen, 25 Edge Functions, 8 Admin Features) vs. v2 Plan                                                                  |
| 2026-02-25 | Ergebnis: 147/149 Tabellen ✅, 25/25 Edge Functions ✅, 7/8 Admin Features ✅                                                                                                  |
| 2026-02-25 | Gap Fix: `user_sessions` Collection (dento_platform) + Session-Management UI + API Endpoints (Section 27)                                                                      |
| 2026-02-25 | Gap Fix: `backups` Collection (dento_platform) + BullMQ Worker + Dev Portal Backup-Historie UI (Section 34)                                                                    |
| 2026-02-25 | Section 5 DB-Tree: +2 Collections (user_sessions, backups) in dento_platform                                                                                                   |
| 2026-02-25 | Abdeckung: 149/149 Tabellen ✅, 25/25 Edge Functions ✅, 8/8 Admin Features ✅ — **100% v1 Abdeckung**                                                                         |     | 2026-02-25 | Dental Chart Library: `react-odontogram` v0.5.5 beibehalten (v1 → v2) — custom SVG-Plan verworfen |
| 2026-02-25 | v0.5.5 hat alle v1-Lücken geschlossen: FDI nativ, `teethConditions` API, Dark Mode, Child Teeth (maxTeeth=5)                                                                   |
| 2026-02-25 | Eigener Code nur für: Detail-Panel, 5-Surface-SVG, Severity-Dropdown, Linked Records, Action-Buttons                                                                           |
| 2026-02-25 | Section 1 Tech Stack: `react-odontogram` als Dental Chart Library hinzugefügt                                                                                                  |
| 2026-02-25 | ADMIN_PORTAL_SCREENS.md: DentalChartSVG → Odontogram (react-odontogram) mit vollem Props-Beispiel                                                                              |

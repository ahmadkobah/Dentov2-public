# Dento v2 — Technische Anforderungen & Dependencies (A-Z)

> **Repo:** `dento-v2` (Neues Repo, Clean Start)
> **Monorepo:** Turborepo + pnpm Workspaces
> **Datum:** 2026-02-25
> **Quelle:** DENTO_V2_MASTER_PLAN.md (37 Sections)

Dieses Dokument listet **alle** Technologien, Libraries, Services und Tools
auf, die im neuen `dento-v2` Repository installiert und genutzt werden.

> **⚠️ Hinweis:** Die `package.json`-Dateien der einzelnen Workspaces sind die
> Source of Truth für gepinnte Versionen. Dieses Dokument spiegelt die
> Pre-Build-Zielversionen wider und kann dem tatsächlichen Stand hinterherhinken.

---

## Inhaltsverzeichnis

1. [Laufzeitumgebungen](#1-laufzeitumgebungen)
2. [Monorepo & Build Tools](#2-monorepo--build-tools)
3. [Backend — API (apps/api)](#3-backend--api-appsapi)
4. [Frontend Shared (packages/ui + packages/shared)](#4-frontend-shared-packagesui--packagesshared)
5. [Frontend — Admin Portal (apps/admin)](#5-frontend--admin-portal-appsadmin)
6. [Frontend — Developer Portal (apps/developer)](#6-frontend--developer-portal-appsdeveloper)
7. [Mobile — React Native (apps/mobile)](#7-mobile--react-native-appsmobile)
8. [External Services & APIs](#8-external-services--apis)
9. [DevOps & Infrastructure](#9-devops--infrastructure)
10. [Development Tools & DX](#10-development-tools--dx)
11. [Environment Variables](#11-environment-variables)
12. [Vollständige package.json Übersicht](#12-vollständige-packagejson-übersicht)
13. [🔒 Security & Encryption Dependencies](#13--security--encryption-dependencies)

---

## 1. Laufzeitumgebungen

| Technologie        | Version                 | Zweck                                                     |
| ------------------ | ----------------------- | --------------------------------------------------------- |
| **Node.js**        | ^20.19.0 \|\| >=22.12.0 | Backend Runtime, Build-Prozesse                           |
| **pnpm**           | 9.15.4                  | Paket-Manager (Workspace-Support, schneller als npm/yarn) |
| **Docker**         | 24+                     | Lokale Entwicklungsumgebung (MongoDB, Redis, API)         |
| **Docker Compose** | 2.x                     | Multi-Container-Orchestrierung                            |

---

## 2. Monorepo & Build Tools

| Paket                  | Version | Zweck                                             | Scope                        |
| ---------------------- | ------- | ------------------------------------------------- | ---------------------------- |
| `turbo`                | Latest  | Monorepo Build-System (parallele Builds, Caching) | Root                         |
| `typescript`           | 6.x     | Typisierung überall (FE + BE + Mobile + Shared)   | Root                         |
| `vite`                 | 8.x     | Frontend Build Tool + Dev Server (HMR, Rolldown)  | apps/admin, apps/developer   |
| `@vitejs/plugin-react` | Latest  | React Fast Refresh für Vite                       | apps/admin, apps/developer   |
| `tsup`                 | Latest  | TypeScript Bundler für packages/\*                | packages/shared, packages/ui |

### Ordnerstruktur

```
dento-v2/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                    ← Root (Workspace Scripts)
├── docker-compose.yml
├── .github/workflows/
├── packages/
│   ├── shared/                     ← Zod Schemas, Types, Utils, Constants, API Client
│   └── ui/                         ← Shadcn/ui Components (Button, Input, Badge, etc.)
├── apps/
│   ├── api/                        ← Payload CMS + Fastify (Backend)
│   ├── admin/                      ← Admin/Doctor/Staff Portal (React)
│   ├── developer/                  ← Dev Portal (React)
│   └── mobile/                     ← React Native (Expo) — Phase 7
└── docs/                           ← Planungsdokumente (migriert aus altem Repo)
```

---

## 3. Backend — API (apps/api)

### 3.1 Core Framework

| Paket                              | Version | Zweck                                                            |
| ---------------------------------- | ------- | ---------------------------------------------------------------- |
| `payload`                          | 3.x     | CMS Framework — Platform Layer (Auth, Collections, REST/GraphQL) |
| `@payloadcms/db-mongodb`           | 3.x     | Payload MongoDB Adapter                                          |
| `@payloadcms/richtext-lexical`     | 3.x     | Payload Rich-Text Editor                                         |
| `@payloadcms/plugin-cloud-storage` | 3.x     | Payload File Upload → S3/R2                                      |
| `fastify`                          | 5.x     | Custom Tenant API — schnell, Plugin-basiert                      |
| `mongoose`                         | 9.x     | MongoDB ODM (Schemas, Queries, `useDb()` für Tenant-Isolation)   |

### 3.2 Fastify Plugins

| Paket                 | Version | Zweck                                |
| --------------------- | ------- | ------------------------------------ |
| `@fastify/cors`       | Latest  | CORS-Konfiguration                   |
| `@fastify/helmet`     | Latest  | Security Headers (CSP, HSTS, etc.)   |
| `@fastify/rate-limit` | Latest  | API Rate Limiting (Redis-backed)     |
| `@fastify/swagger`    | Latest  | OpenAPI 3.1 Spec Auto-Generierung    |
| `@fastify/swagger-ui` | Latest  | Swagger UI für API-Dokumentation     |
| `@fastify/multipart`  | Latest  | File Uploads (X-Rays, CBCT, Avatare) |
| `@fastify/cookie`     | Latest  | Cookie-basierter Refresh Token       |
| `@fastify/jwt`        | Latest  | JWT Signierung + Verifizierung       |
| `@fastify/websocket`  | Latest  | WebSocket Upgrade für Socket.io      |

### 3.3 Authentifizierung & Sicherheit

| Paket          | Version | Zweck                                                                                   |
| -------------- | ------- | --------------------------------------------------------------------------------------- |
| `jsonwebtoken` | 9.x     | JWT Access + Refresh Token Generierung                                                  |
| `argon2`       | 0.44+   | Passwort-Hashing (Argon2id: 64 MB, 3 Iterationen, Parallelität 4) — OWASP-empfohlen     |
| `bcryptjs`     | 3.x     | Nur v1-Migration-Compat-Shim — verifiziert alte bcrypt-Hashes, re-hasht zu Argon2id     |
| `nanoid`       | 5.x     | Sichere ID-Generierung (API Keys, Invite Tokens)                                        |
| `otplib`       | 13.x    | 🔒 TOTP 2FA — Secret-Generierung + Code-Verifizierung (Google Authenticator kompatibel) |
| `qrcode`       | 1.x     | 🔒 QR-Code Generierung für 2FA Setup (otpauth:// URI → PNG/DataURL)                     |

### 3.4 Datenbank & Cache

| Paket     | Version | Zweck                                                            |
| --------- | ------- | ---------------------------------------------------------------- |
| `mongodb` | 6.x     | Native MongoDB Driver (nur falls Payload ihn nicht direkt nutzt) |
| `ioredis` | 5.x     | Redis Client (Cache, Sessions, Rate-Limiting, BullMQ)            |
| `bullmq`  | 5.x     | Job Queue (Notifications, Webhooks, Backups, Scheduled Jobs)     |

### 3.5 Echtzeit

| Paket                      | Version | Zweck                                                        |
| -------------------------- | ------- | ------------------------------------------------------------ |
| `socket.io`                | 4.x     | Real-Time: Chat, Notifications, Queue-Updates, Calendar-Sync |
| `@socket.io/redis-adapter` | Latest  | Socket.io Horizontale Skalierung via Redis Pub/Sub           |

### 3.6 Email / SMS / Push

| Paket        | Version | Zweck                                                            |
| ------------ | ------- | ---------------------------------------------------------------- |
| `resend`     | Latest  | Email-Versand (Transactional: Verifizierung, Reminders, Reports) |
| `nodemailer` | 8.x     | SMTP-Fallback (falls Resend-Limit erreicht)                      |
| `twilio`     | 6.x     | SMS-Versand (Appointment Reminders, OTPs)                        |
| `web-push`   | 3.x     | Web Push Notifications (VAPID Keys, Service Worker)              |

### 3.7 File Storage

| Paket                           | Version | Zweck                                                        |
| ------------------------------- | ------- | ------------------------------------------------------------ |
| `@aws-sdk/client-s3`            | 3.x     | S3-kompatibles Upload/Download (Cloudflare R2 oder AWS S3)   |
| `@aws-sdk/s3-request-presigner` | 3.x     | Pre-Signed URLs für sichere Downloads                        |
| `sharp`                         | 0.33+   | Bild-Resize (Thumbnails 200×200 für Avatare, X-Ray Previews) |

### 3.8 Payment Gateways

| Paket                   | Version | Zweck                                                                                                                                                                      |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stripe`                | 22.x    | Internationale Zahlungen (Karten, SEPA)                                                                                                                                    |
| _(eigener HTTP-Client)_ | —       | Ägyptische Zahlungen via Paymob (Karten, Fawry, Wallets, InstaPay, ValU, Meeza) — kein `paymob-node` SDK; Custom Client + HMAC-Verifizierung in `platform/routes/payments` |

### 3.9 Export & Generierung

| Paket                 | Version | Zweck                                                          |
| --------------------- | ------- | -------------------------------------------------------------- |
| `@react-pdf/renderer` | Latest  | PDF-Generierung: Rechnungen, Rezepte, Treatment Plans, Reports |
| `@fast-csv/format`    | Latest  | CSV-Export für Reports                                         |
| `exceljs`             | Latest  | Excel-Export (Multi-Sheet, Formatierung)                       |

### 3.10 Validierung & Utilities

| Paket         | Version | Zweck                                                                |
| ------------- | ------- | -------------------------------------------------------------------- |
| `zod`         | 4.x     | Schema-Validierung (Shared mit Frontend — Single Source of Truth)    |
| `slugify`     | 1.x     | Tenant-Slug-Generierung (`Al Noor Clinic` → `al-noor-clinic`)        |
| `dayjs`       | 1.x     | Datum/Zeit-Handling (leichtgewichtig, Locale, Hijri-Kalender Plugin) |
| `pino`        | 9.x     | Structured JSON Logging (schnell, prod-ready)                        |
| `pino-pretty` | Latest  | Pino-Logging dev-formatiert (nur Development)                        |

### 3.11 Monitoring

| Paket          | Version | Zweck                                   |
| -------------- | ------- | --------------------------------------- |
| `@sentry/node` | 10.x    | Error Tracking + Performance Monitoring |

---

## 4. Frontend Shared (packages/ui + packages/shared)

### 4.1 packages/shared

| Paket        | Version | Zweck                                                     |
| ------------ | ------- | --------------------------------------------------------- |
| `zod`        | 4.x     | Schema-Definitionen (Patient, Appointment, Invoice, etc.) |
| `dayjs`      | 1.x     | Datum/Zeit Utilities (formatDate, diffDays, etc.)         |
| `typescript` | 6.x     | Typen-Definitionen                                        |

> **Kein React** — nur reine TypeScript Utilities, Schemas und Types.
> Wird von `apps/api`, `apps/admin`, `apps/developer` und `apps/mobile` importiert.

### 4.2 packages/ui

| Paket                      | Version | Zweck                                                |
| -------------------------- | ------- | ---------------------------------------------------- |
| `react`                    | 19.x    | Peer Dependency                                      |
| `tailwindcss`              | 4.x     | Peer Dependency                                      |
| `class-variance-authority` | Latest  | Varianten-basierte Component Styles (Shadcn-Pattern) |
| `clsx`                     | Latest  | Conditional className Zusammensetzung                |
| `tailwind-merge`           | Latest  | Tailwind-Klassen Dedup & Override                    |
| `lucide-react`             | Latest  | Icon Library (500+ Icons, tree-shakeable)            |
| `@radix-ui/react-*`        | Latest  | Headless UI Primitives (Shadcn/ui Basis):            |

#### Shadcn/ui Komponenten (via Radix)

| Radix Primitive                 | Shadcn Component     | Zweck                      |
| :------------------------------ | :------------------- | :------------------------- |
| `@radix-ui/react-dialog`        | Dialog, Sheet        | Modale, Seitenpanels       |
| `@radix-ui/react-dropdown-menu` | DropdownMenu         | Kontext-Menüs              |
| `@radix-ui/react-select`        | Select               | Dropdown-Auswahl           |
| `@radix-ui/react-popover`       | Popover              | Tooltips, Mini-Forms       |
| `@radix-ui/react-tabs`          | Tabs                 | Tab-Navigation             |
| `@radix-ui/react-tooltip`       | Tooltip              | Hover-Tooltips             |
| `@radix-ui/react-checkbox`      | Checkbox             | Checkboxen                 |
| `@radix-ui/react-switch`        | Switch               | Toggle-Schalter            |
| `@radix-ui/react-avatar`        | Avatar               | Profilbilder               |
| `@radix-ui/react-separator`     | Separator            | Trennlinien                |
| `@radix-ui/react-scroll-area`   | ScrollArea           | Custom Scrollbars          |
| `@radix-ui/react-accordion`     | Accordion            | Aufklappbare Sektionen     |
| `@radix-ui/react-alert-dialog`  | AlertDialog          | Bestätigungs-Dialoge       |
| `@radix-ui/react-label`         | Label                | Form Labels                |
| `@radix-ui/react-slot`          | Slot                 | Component Composition      |
| `cmdk`                          | Command              | Command Palette (⌘K Suche) |
| `vaul`                          | Drawer               | Mobile Bottom Sheet        |
| `sonner`                        | Sonner               | Toast Notifications        |
| `react-day-picker`              | DatePicker, Calendar | Datumsauswahl              |
| `input-otp`                     | InputOTP             | OTP-Code Eingabe (2FA)     |

---

## 5. Frontend — Admin Portal (apps/admin)

### 5.1 Core

| Paket               | Version | Zweck                   |
| ------------------- | ------- | ----------------------- |
| `react`             | 19.x    | UI Framework            |
| `react-dom`         | 19.x    | DOM Renderer            |
| `react-router-dom`  | 7.x     | Client-Side Routing     |
| `tailwindcss`       | 4.x     | Utility-First CSS       |
| `@tailwindcss/vite` | Latest  | Tailwind v4 Vite Plugin |
| `postcss`           | 8.x     | CSS Post-Processing     |
| `autoprefixer`      | Latest  | CSS Vendor Prefixes     |

### 5.2 State Management & Data Fetching

| Paket                   | Version | Zweck                                                             |
| ----------------------- | ------- | ----------------------------------------------------------------- |
| `zustand`               | 5.x     | Client State (Auth, Sidebar, UI Preferences, Theme)               |
| `@tanstack/react-query` | 5.x     | Server State (Caching, Dedup, Optimistic Updates, Pagination)     |
| `@tanstack/react-table` | 8.x     | Headless Tabellen (Sorting, Filtering, Pagination, Column Resize) |

### 5.3 Forms & Validation

| Paket                 | Version | Zweck                                               |
| --------------------- | ------- | --------------------------------------------------- |
| `react-hook-form`     | 7.x     | Performante Formulare (uncontrolled by default)     |
| `@hookform/resolvers` | Latest  | Zod Resolver (Bridge: Zod Schema → React Hook Form) |

### 5.4 Clinical Components

| Paket                       | Version | Zweck                                                                     |
| --------------------------- | ------- | ------------------------------------------------------------------------- |
| `react-odontogram`          | 0.5.5+  | Dental Chart SVG (FDI, teethConditions, Dark Mode, Child Teeth, readOnly) |
| `@fullcalendar/react`       | 6.x     | Appointment Calendar (Tages-/Wochen-/Monatsansicht)                       |
| `@fullcalendar/daygrid`     | 6.x     | FullCalendar: Monatsansicht                                               |
| `@fullcalendar/timegrid`    | 6.x     | FullCalendar: Tages-/Wochenansicht mit Zeitslots                          |
| `@fullcalendar/interaction` | 6.x     | FullCalendar: Drag & Drop, Resize, Click                                  |
| `@fullcalendar/list`        | 6.x     | FullCalendar: Listenansicht (Agenda)                                      |

### 5.5 Charts & Visualization

| Paket      | Version | Zweck                                                          |
| ---------- | ------- | -------------------------------------------------------------- |
| `recharts` | 3.x     | Charts (Bar, Line, Pie, Area, Heatmap) für Dashboard + Reports |

### 5.6 Echtzeit

| Paket              | Version | Zweck                                                   |
| ------------------ | ------- | ------------------------------------------------------- |
| `socket.io-client` | 4.x     | Real-Time Events (Chat, Notifications, Queue, Calendar) |

### 5.7 Barcode & Scanning

| Paket          | Version | Zweck                                           |
| -------------- | ------- | ----------------------------------------------- |
| `html5-qrcode` | 2.x     | QR/Barcode Scanner via Kamera (Web — Inventory) |

### 5.8 Signature

| Paket                    | Version | Zweck                                                           |
| ------------------------ | ------- | --------------------------------------------------------------- |
| `react-signature-canvas` | 1.x     | Signatur-Widget (Consent Forms — Patient + Doctor Unterschrift) |

### 5.9 UI Utilities

| Paket               | Version | Zweck                                                    |
| ------------------- | ------- | -------------------------------------------------------- |
| `framer-motion`     | 12.x    | Animationen (Page Transitions, Sidebar Collapse, Modals) |
| `@dnd-kit/core`     | 6.x     | Drag & Drop (Kanban Boards, Column Reorder)              |
| `@dnd-kit/sortable` | Latest  | Sortierbare Listen (Treatment Plan Items, Custom Fields) |
| `react-dropzone`    | Latest  | File Upload Drop-Zone (X-Rays, CBCT, Attachments)        |

---

## 6. Frontend — Developer Portal (apps/developer)

> Nutzt dieselben Basis-Dependencies wie Admin (React, Tailwind, Zustand, TanStack, etc.).
> Zusätzlich:

| Paket                  | Version | Zweck                                                     |
| ---------------------- | ------- | --------------------------------------------------------- |
| `@monaco-editor/react` | Latest  | Code-Editor (Webhook Payload Preview, JSON Schema Viewer) |
| `recharts`             | 3.x     | Platform Analytics Charts (MRR, Tenant Growth, API Usage) |
| `socket.io-client`     | 4.x     | Real-Time Support Sessions, Tenant Event Stream           |

---

## 7. Mobile — React Native (apps/mobile)

> **Phase 7 (Woche 22-26)** — wird erst nach Phase 6 installiert.
> **⚠️ Status: Geplant / aspirational.** `apps/mobile` existiert im Repo noch nicht —
> dieser Abschnitt beschreibt den geplanten Stack, keine installierten Dependencies.

### 7.1 Core

| Paket                            | Version | Zweck                                                   |
| -------------------------------- | ------- | ------------------------------------------------------- |
| `expo`                           | 52.x    | React Native Framework (Managed Workflow)               |
| `expo-router`                    | Latest  | File-based Navigation (analog zu Next.js)               |
| `react-native`                   | 0.76+   | Mobile UI Runtime                                       |
| `nativewind`                     | 4.x     | Tailwind CSS für React Native (gleiche Klassen wie Web) |
| `react-native-reanimated`        | 3.x     | Native Animationen (60fps)                              |
| `react-native-gesture-handler`   | 2.x     | Touch Gesten                                            |
| `react-native-safe-area-context` | Latest  | Safe Area Insets                                        |
| `react-native-screens`           | Latest  | Native Screen Container                                 |

### 7.2 Datenbank & Sync

| Paket          | Version | Zweck                                                |
| -------------- | ------- | ---------------------------------------------------- |
| `realm`        | Latest  | Lokale Datenbank + Atlas Device Sync (Offline-First) |
| `@realm/react` | Latest  | React Hooks für Realm Queries                        |

### 7.3 State & Data

| Paket                   | Version | Zweck                                                  |
| ----------------------- | ------- | ------------------------------------------------------ |
| `zustand`               | 5.x     | Client State (gleiche Stores wie Web, Shared Patterns) |
| `@tanstack/react-query` | 5.x     | Server State Caching (für API Calls wenn online)       |

### 7.4 Auth & Security

| Paket                       | Version | Zweck                                                   |
| --------------------------- | ------- | ------------------------------------------------------- |
| `expo-secure-store`         | Latest  | Sicherer Schlüsselspeicher (JWT Tokens, Biometric Keys) |
| `expo-local-authentication` | Latest  | Biometrische Auth (Face ID / Fingerprint)               |

### 7.5 Notifications & Media

| Paket                  | Version | Zweck                                 |
| ---------------------- | ------- | ------------------------------------- |
| `expo-notifications`   | Latest  | Push Notifications (FCM / APNs)       |
| `expo-image-picker`    | Latest  | Kamera / Galerie für X-Ray-Uploads    |
| `expo-barcode-scanner` | Latest  | Barcode/QR Scanner (Inventory)        |
| `expo-file-system`     | Latest  | Dateisystem-Zugriff (Offline-Dateien) |
| `expo-sharing`         | Latest  | Teilen von PDFs, Reports              |

### 7.6 UI

| Paket                  | Version | Zweck                          |
| ---------------------- | ------- | ------------------------------ |
| `lucide-react-native`  | Latest  | Icons (gleiche wie Web)        |
| `react-native-svg`     | Latest  | SVG-Renering (Dental Chart)    |
| `@gorhom/bottom-sheet` | Latest  | Bottom Sheet (Modals, Actions) |

### 7.7 Shared Package

| Paket           | Quelle            | Zweck                                                   |
| --------------- | ----------------- | ------------------------------------------------------- |
| `@dento/shared` | `packages/shared` | Zod Schemas, Types, Utils, Constants, Enums, API Client |

---

## 8. External Services & APIs

### 8.1 Datenbank & Cache

| Service             | Tier          | Kosten/Monat | Zweck                                                 |
| ------------------- | ------------- | :----------: | ----------------------------------------------------- |
| **MongoDB Atlas**   | M10–M30       |   $57–280    | Primäre Datenbank (Database-per-Tenant + Platform DB) |
| **Redis (Upstash)** | Pay-as-you-go |    $10–15    | Cache, Sessions, Rate Limiting, BullMQ Queue Backend  |

### 8.2 File / Object Storage

| Service           | Tier                      | Kosten/Monat | Zweck                                             |
| ----------------- | ------------------------- | :----------: | ------------------------------------------------- |
| **Cloudflare R2** | 10GB Free, dann $0.015/GB |    $0–15     | X-Rays, CBCT Scans, Avatare, Backups, PDF-Exports |

### 8.3 Email / SMS / Push

| Service              | Tier           | Kosten/Monat | Zweck                                           |
| -------------------- | -------------- | :----------: | ----------------------------------------------- |
| **Resend**           | Free: 3.000/Mo |    $0–20     | Transactional Email (Verify, Reminder, Reports) |
| **Twilio**           | Pay-per-use    | ~$0.0075/SMS | SMS (Appointment Reminders, OTPs)               |
| **Web Push (VAPID)** | Kostenlos      |      $0      | Browser Push Notifications                      |
| **Expo Push**        | Kostenlos      |      $0      | Mobile Push Notifications (FCM/APNs)            |

### 8.4 Payment Gateways

| Service    | Region        | Methoden                                             | Zweck                    |
| ---------- | ------------- | ---------------------------------------------------- | ------------------------ |
| **Paymob** | Ägypten       | Karten, Fawry, Mobile Wallets, InstaPay, ValU, Meeza | Ägyptische Tenants       |
| **Stripe** | International | Karten, SEPA                                         | Nicht-ägyptische Tenants |

### 8.5 Monitoring & Error Tracking

| Service    | Tier      | Kosten/Monat | Zweck                                                                |
| ---------- | --------- | :----------: | -------------------------------------------------------------------- |
| **Sentry** | Free Tier |      $0      | Error Tracking + Performance Monitoring (API + Admin + Dev + Mobile) |

### 8.6 Remote Support

| Service       | Tier            | Kosten/Monat | Zweck                                               |
| ------------- | --------------- | :----------: | --------------------------------------------------- |
| **Tailscale** | Free (Personal) |      $0      | Sicherer Remote-Support-Zugang zu Tenant-Umgebungen |

### 8.7 DNS & CDN

| Service        | Tier |    Kosten/Monat    | Zweck                      |
| -------------- | ---- | :----------------: | -------------------------- |
| **Cloudflare** | Free | $0 + $15/yr Domain | DNS, SSL, CDN, DDoS-Schutz |

### 8.8 WhatsApp (optional)

| Service               | Tier                 | Kosten      | Zweck                                                              |
| --------------------- | -------------------- | ----------- | ------------------------------------------------------------------ |
| **Meta Business API** | Pay-per-conversation | ~$0.05/conv | WhatsApp Appointment Reminders (optional, über Twilio oder direkt) |

---

## 9. DevOps & Infrastructure

### 9.1 Hosting

| Komponente                               | Hosting                   |  Kosten/Monat  |
| ---------------------------------------- | ------------------------- | :------------: |
| API (Payload + Fastify + BullMQ Workers) | Railway / Fly.io          |     $20–50     |
| Admin Frontend (Static SPA)              | Vercel / Cloudflare Pages | $0 (Free Tier) |
| Developer Frontend (Static SPA)          | Vercel / Cloudflare Pages | $0 (Free Tier) |
| Mobile Backend                           | — (gleicher API-Server)   |       $0       |

### 9.2 CI/CD

| Tool               | Zweck                                                      |
| ------------------ | ---------------------------------------------------------- |
| **GitHub Actions** | CI/CD Pipeline (Lint → Type Check → Test → Build → Deploy) |

### 9.3 Docker Compose (Lokale Entwicklung)

```yaml
services:
  mongodb:
    image: mongo:8.0
    ports: ['27017:27017']
    volumes: [mongo-data:/data/db]

  redis:
    image: redis:8.8-alpine
    ports: ['6380:6379'] # Host-Port 6380 → Container 6379

  api:
    build: ./apps/api
    ports: ['3001:3001']
    depends_on: [mongodb, redis]
    environment:
      MONGODB_URI: mongodb://mongodb:27017/dento_platform
      REDIS_URL: redis://redis:6379

  admin:
    build: ./apps/admin
    ports: ['3000:3000']

  developer:
    build: ./apps/developer
    ports: ['3002:3002']
```

### 9.4 Backup

| Tool                         | Zweck                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| `mongodump` / `mongorestore` | Per-Tenant Backups → S3/R2 (BullMQ Cron Job, 03:00 täglich) |
| MongoDB Atlas Backup         | Cluster-Level Backup (automatisch)                          |

---

## 10. Development Tools & DX

| Tool                          | Version | Zweck                                            |
| ----------------------------- | ------- | ------------------------------------------------ |
| `eslint`                      | 10.x    | Linting (Flat Config)                            |
| `@eslint/js`                  | Latest  | ESLint JavaScript Rules                          |
| `typescript-eslint`           | 8.x     | ESLint TypeScript Rules                          |
| `eslint-plugin-react-hooks`   | Latest  | React Hooks Linting (deps array, rules)          |
| `eslint-plugin-react-refresh` | Latest  | Vite Fast Refresh Linting                        |
| `prettier`                    | 3.x     | Code-Formatierung                                |
| `husky`                       | 9.x     | Git Hooks (Pre-Commit)                           |
| `lint-staged`                 | Latest  | Nur geänderte Dateien linten/formatieren         |
| `vitest`                      | 4.x     | Unit + Integration Testing (Vite-nativ, schnell) |
| `@playwright/test`            | 1.60+   | E2E Testing (`pnpm test:e2e`, tests/e2e)         |
| `@testing-library/react`      | Latest  | React Component Testing                          |
| `@testing-library/jest-dom`   | Latest  | DOM Matchers für Tests                           |
| `msw`                         | 2.x     | API Mocking (Service Worker Mocks für Tests)     |
| `supertest`                   | Latest  | HTTP Endpoint Testing (Fastify Routes)           |

---

## 11. Environment Variables

### 11.1 API (.env)

```env
# === Database ===
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dento_platform
REDIS_URL=redis://default:pass@redis-host:6379

# === Auth ===
PAYLOAD_SECRET=<random-32-char-string>
JWT_ACCESS_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# === Encryption ===
ENCRYPTION_MASTER_KEY=<random-64-hex-string>

# === 2FA ===
TOTP_ISSUER=Dento

# === File Storage (Cloudflare R2) ===
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<r2-access-key>
S3_SECRET_KEY=<r2-secret-key>
S3_BUCKET=dento-uploads
S3_PUBLIC_URL=https://cdn.dento.app

# === Email ===
RESEND_API_KEY=re_xxxxxxxxxxxxx

# === SMS ===
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_PHONE_NUMBER=+1234567890

# === Push ===
VAPID_PUBLIC_KEY=<vapid-public-key>
VAPID_PRIVATE_KEY=<vapid-private-key>
VAPID_SUBJECT=mailto:support@dento.app

# === Payments ===
STRIPE_SECRET_KEY=sk_live_xxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxx
PAYMOB_API_KEY=<paymob-api-key>
PAYMOB_INTEGRATION_ID=<paymob-integration-id>
PAYMOB_HMAC_SECRET=<paymob-hmac>

# === Monitoring ===
SENTRY_DSN=https://xxxxxx@sentry.io/xxxxx

# === General ===
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://admin.dento.app,https://dev.dento.app
```

### 11.2 Admin Frontend (.env)

```env
VITE_API_URL=https://api.dento.app
VITE_SOCKET_URL=wss://api.dento.app
VITE_SENTRY_DSN=https://xxxxxx@sentry.io/xxxxx
VITE_VAPID_PUBLIC_KEY=<vapid-public-key>
```

### 11.3 Developer Frontend (.env)

```env
VITE_API_URL=https://api.dento.app
VITE_SOCKET_URL=wss://api.dento.app
VITE_SENTRY_DSN=https://xxxxxx@sentry.io/xxxxx
```

### 11.4 Mobile (app.config.ts)

```env
EXPO_PUBLIC_API_URL=https://api.dento.app
EXPO_PUBLIC_REALM_APP_ID=dento-xxxxx
SENTRY_DSN=https://xxxxxx@sentry.io/xxxxx
```

---

## 12. Vollständige package.json Übersicht

### 12.1 Root — `dento-v2/package.json`

```jsonc
{
  "name": "dento-v2",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "^3.0.0",
    "husky": "^9.0.0",
    "lint-staged": "latest",
  },
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": "^20.19.0 || >=22.12.0",
  },
}
```

### 12.2 API — `apps/api/package.json`

```jsonc
{
  "name": "@dento/api",
  "dependencies": {
    // Core
    "payload": "^3.0.0",
    "@payloadcms/db-mongodb": "^3.0.0",
    "@payloadcms/richtext-lexical": "^3.0.0",
    "@payloadcms/plugin-cloud-storage": "^3.0.0",
    "fastify": "^5.0.0",
    "mongoose": "^9.7.0",

    // Fastify Plugins
    "@fastify/cors": "latest",
    "@fastify/helmet": "latest",
    "@fastify/rate-limit": "latest",
    "@fastify/swagger": "latest",
    "@fastify/swagger-ui": "latest",
    "@fastify/multipart": "latest",
    "@fastify/cookie": "latest",
    "@fastify/jwt": "latest",

    // Auth
    "jsonwebtoken": "^9.0.0",
    "argon2": "^0.44.0",
    "bcryptjs": "^3.0.3", // nur v1-Migration-Compat-Shim
    "nanoid": "^5.0.0",
    "otplib": "^13.4.1",
    "qrcode": "^1.5.0",

    // Database & Cache
    "ioredis": "^5.0.0",
    "bullmq": "^5.0.0",

    // Real-Time
    "socket.io": "^4.0.0",
    "@socket.io/redis-adapter": "latest",

    // Email / SMS / Push
    "resend": "latest",
    "nodemailer": "^8.0.11",
    "twilio": "^6.0.2",
    "web-push": "^3.0.0",

    // File Storage
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "sharp": "^0.33.0",

    // Payments
    "stripe": "^22.2.1",
    // paymob-node oder eigener HTTP Client

    // Export
    "@react-pdf/renderer": "latest",
    "@fast-csv/format": "latest",
    "exceljs": "latest",

    // Validation & Utils
    "zod": "^4.0.0",
    "slugify": "^1.6.0",
    "dayjs": "^1.11.0",
    "pino": "^9.0.0",
    "pino-axiom": "latest",

    // Monitoring
    "@sentry/node": "^10.0.0",

    // Shared
    "@dento/shared": "workspace:*",
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vitest": "^4.1.8",
    "supertest": "latest",
    "pino-pretty": "latest",
    "@types/node": "^20.0.0",
    "@types/jsonwebtoken": "latest",
    "@types/nodemailer": "latest",
    "@types/web-push": "latest",
    "@types/qrcode": "latest",
  },
}
```

### 12.3 Admin Frontend — `apps/admin/package.json`

```jsonc
{
  "name": "@dento/admin",
  "dependencies": {
    // Core
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",

    // State & Data
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",

    // Forms
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "latest",

    // Clinical
    "react-odontogram": "^0.5.5",
    "@fullcalendar/react": "^6.0.0",

    // DICOM Viewer (X-Ray + CBCT)
    "@cornerstonejs/core": "^4.22.13",
    "@cornerstonejs/dicom-image-loader": "^4.22.13",
    "@cornerstonejs/tools": "^4.22.13",
    "dicom-parser": "^1.8.21",
    "three": "^0.184.0",
    "online-3d-viewer": "^0.18.0",
    "fflate": "^0.8.3",
    "@fullcalendar/daygrid": "^6.0.0",
    "@fullcalendar/timegrid": "^6.0.0",
    "@fullcalendar/interaction": "^6.0.0",
    "@fullcalendar/list": "^6.0.0",

    // Charts
    "recharts": "^3.8.1",

    // Real-Time
    "socket.io-client": "^4.0.0",

    // UI Components (Shadcn/Radix)
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest",
    "cmdk": "latest",
    "vaul": "latest",
    "sonner": "latest",
    "react-day-picker": "latest",
    "input-otp": "latest",
    "framer-motion": "^12.0.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "latest",
    "react-dropzone": "latest",
    "react-signature-canvas": "^1.0.0",
    "html5-qrcode": "^2.0.0",

    // Radix UI Primitives
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-popover": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-checkbox": "latest",
    "@radix-ui/react-switch": "latest",
    "@radix-ui/react-avatar": "latest",
    "@radix-ui/react-separator": "latest",
    "@radix-ui/react-scroll-area": "latest",
    "@radix-ui/react-accordion": "latest",
    "@radix-ui/react-alert-dialog": "latest",
    "@radix-ui/react-label": "latest",
    "@radix-ui/react-slot": "latest",

    // Monitoring
    "@sentry/react": "^10.0.0",

    // Shared
    "@dento/shared": "workspace:*",
    "@dento/ui": "workspace:*",
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vite": "^8.0.16",
    "@vitejs/plugin-react": "latest",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "latest",
    "postcss": "^8.0.0",
    "autoprefixer": "latest",
    "eslint": "^10.5.0",
    "vitest": "^4.1.8",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "msw": "^2.0.0",
  },
}
```

### 12.4 Developer Frontend — `apps/developer/package.json`

```jsonc
{
  "name": "@dento/developer",
  "dependencies": {
    // Gleiche Basis wie Admin, plus:
    "@monaco-editor/react": "latest",
    "recharts": "^3.8.1",
    "socket.io-client": "^4.0.0",

    // Shared
    "@dento/shared": "workspace:*",
    "@dento/ui": "workspace:*",
  },
  // ... (gleiche devDependencies wie Admin)
}
```

### 12.5 Mobile — `apps/mobile/package.json`

> ⚠️ Geplant — `apps/mobile` existiert im Repo noch nicht (siehe Abschnitt 7).

```jsonc
{
  "name": "@dento/mobile",
  "dependencies": {
    // Core
    "expo": "~52.0.0",
    "expo-router": "latest",
    "react-native": "~0.76.0",
    "nativewind": "^4.0.0",
    "react-native-reanimated": "^3.0.0",
    "react-native-gesture-handler": "^2.0.0",
    "react-native-safe-area-context": "latest",
    "react-native-screens": "latest",

    // DB & Sync
    "realm": "latest",
    "@realm/react": "latest",

    // State
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",

    // Auth
    "expo-secure-store": "latest",
    "expo-local-authentication": "latest",

    // Notifications & Media
    "expo-notifications": "latest",
    "expo-image-picker": "latest",
    "expo-barcode-scanner": "latest",
    "expo-file-system": "latest",
    "expo-sharing": "latest",

    // UI
    "lucide-react-native": "latest",
    "react-native-svg": "latest",
    "@gorhom/bottom-sheet": "latest",

    // Monitoring
    "@sentry/react-native": "^10.0.0",

    // Shared
    "@dento/shared": "workspace:*",
  },
}
```

---

## Zusammenfassung: Dependency-Zählung

| Scope                  |       Pakete       | Kategorie                                                                              |
| :--------------------- | :----------------: | :------------------------------------------------------------------------------------- |
| Root                   |         4          | Monorepo, Formatting, Git Hooks                                                        |
| packages/shared        |         3          | Zod, dayjs, TypeScript                                                                 |
| packages/ui            |        ~20         | Radix, Lucide, CVA, clsx, tailwind-merge, cmdk, vaul, sonner                           |
| apps/api               |        ~35         | Payload, Fastify, Mongoose, BullMQ, Socket.io, Stripe, S3, PDF...                      |
| apps/api (🔒 Security) |         +2         | otplib, qrcode                                                                         |
| apps/admin             |        ~45         | React, Zustand, TanStack, FullCalendar, Recharts, Odontogram, Cornerstone3D, Shadcn... |
| apps/developer         | ~5 (+ Admin-Basis) | Monaco Editor, Recharts, Socket.io                                                     |
| apps/mobile            |        ~20         | Expo, Realm, NativeWind, Reanimated, Bottom Sheet...                                   |
| DevDeps (gesamt)       |        ~15         | ESLint, Prettier, Vitest, Testing Library, MSW, Supertest                              |
| **Gesamt**             |      **~148**      | Produktions- + Entwicklungs-Dependencies                                               |

### Kosten-Übersicht (monatlich)

| Service                 |     Min |      Max |
| ----------------------- | ------: | -------: |
| MongoDB Atlas (M10–M30) |     $57 |     $280 |
| Railway/Fly.io (API)    |     $20 |      $50 |
| Redis (Upstash)         |     $10 |      $15 |
| Cloudflare R2           |      $0 |      $15 |
| Resend (Email)          |      $0 |      $20 |
| Vercel/CF Pages (FE)    |      $0 |       $0 |
| Sentry                  |      $0 |       $0 |
| Cloudflare DNS          |     ~$1 |      ~$1 |
| **Gesamt**              | **$88** | **$381** |

---

> **Letzte Aktualisierung:** 2026-02-25
> **Basiert auf:** DENTO_V2_MASTER_PLAN.md, ADMIN_PORTAL_SCREENS.md, IMPLEMENTATION_ROADMAP.md, SECURITY_AND_ENCRYPTION.md

---

## 13. 🔒 Security & Encryption Dependencies

> Referenz: [SECURITY_AND_ENCRYPTION.md](SECURITY_AND_ENCRYPTION.md) — 15 Schichten, 80+ Checkpoints
> Alle Pakete unten sind **kostenlos** (Open Source oder Node.js Built-in).

### 13.1 Phase 0 — Network & Transport Security

| Paket/Tool            | Version  | Zweck                                                                | Kosten |
| :-------------------- | :------- | :------------------------------------------------------------------- | :----: |
| `@fastify/helmet`     | Latest   | Security Headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |   $0   |
| `@fastify/cors`       | Latest   | CORS Whitelist (nur erlaubte Origins)                                |   $0   |
| `@fastify/rate-limit` | Latest   | API Rate Limiting (Redis-backed, 100/min API, 5/min Auth)            |   $0   |
| Cloudflare Free       | —        | TLS 1.3, DDoS-Schutz, CDN, Basis-WAF                                 |   $0   |
| TruffleHog            | Latest   | CI Secret Scanning (findet versehentlich committete Secrets/Keys)    |   $0   |
| `pnpm audit`          | Built-in | Dependency Vulnerability Scanning in CI                              |   $0   |

### 13.2 Phase 1 — Auth & RBAC Security

| Paket/Tool        | Version  | Zweck                                                                 | Kosten |
| :---------------- | :------- | :-------------------------------------------------------------------- | :----: |
| `jsonwebtoken`    | 9.x      | JWT Dual-Token: Access (15min, HS256) + Refresh (7d, HttpOnly Cookie) |   $0   |
| `argon2`          | 0.44+    | Passwort-Hashing (Argon2id, 64MB, 3 Iterationen — V2_DECISION_LOG §1) |   $0   |
| `@fastify/cookie` | Latest   | HttpOnly Secure Cookie für Refresh Token                              |   $0   |
| `@fastify/jwt`    | Latest   | JWT Signierung + Middleware-Verifizierung                             |   $0   |
| `zod`             | 4.x      | Input Validation mit `.strict()` — NoSQL Injection Prevention         |   $0   |
| `ioredis`         | 5.x      | Brute-Force Cooldown Store + Rate Limit Backend + Session Tracking    |   $0   |
| Node.js `crypto`  | Built-in | SHA-256 (API Key Hashing, Password Reset Tokens)                      |   $0   |

### 13.3 Phase 2 — API Security

| Paket/Tool       | Version  | Zweck                                                    | Kosten |
| :--------------- | :------- | :------------------------------------------------------- | :----: |
| Node.js `crypto` | Built-in | HMAC-SHA256 Webhook Signierung + API Key SHA-256 Hashing |   $0   |
| `nanoid`         | 5.x      | Sichere API Key Generierung (Prefix + Random)            |   $0   |

### 13.4 Phase 3 — Data Encryption & Audit

| Paket/Tool                      | Version  | Zweck                                                                     | Kosten |
| :------------------------------ | :------- | :------------------------------------------------------------------------ | :----: |
| Node.js `crypto`                | Built-in | AES-256-GCM Feld-Verschlüsselung (PII: nationalId, phone, email, address) |   $0   |
| `sharp`                         | 0.33+    | EXIF Metadata Stripping bei File Uploads                                  |   $0   |
| `otplib`                        | 13.x     | 🔒 2FA/MFA — TOTP Secret-Generierung + 6-Digit Code-Verifizierung         |   $0   |
| `qrcode`                        | 1.x      | 🔒 2FA Setup — QR-Code (otpauth:// URI) für Google Authenticator/Authy    |   $0   |
| `@aws-sdk/s3-request-presigner` | 3.x      | Pre-Signed URLs (1h TTL) — kein öffentlicher Dateizugriff                 |   $0   |

### 13.5 Phase 4 — Payment Security

| Paket/Tool       | Version  | Zweck                                                  | Kosten |
| :--------------- | :------- | :----------------------------------------------------- | :----: |
| `stripe`         | Latest   | PCI DSS via Provider — keine Kartendaten in eigener DB |   $0   |
| Node.js `crypto` | Built-in | Paymob/Stripe Webhook HMAC Verifizierung               |   $0   |

### 13.6 Phase 6 — Backup & Compliance

| Paket/Tool       | Version  | Zweck                                                                       | Kosten |
| :--------------- | :------- | :-------------------------------------------------------------------------- | :----: |
| Node.js `crypto` | Built-in | AES-256-GCM Backup-Verschlüsselung + SHA-256 Checksum + HKDF Key Derivation |   $0   |
| `mongodump`      | Built-in | Per-Tenant Backup → verschlüsselt → S3/R2                                   |   $0   |
| Dependabot       | GitHub   | Automatische Dependency-Updates + Security Alerts                           |   $0   |

### 13.7 Phase 7 — Mobile Security

| Paket/Tool                  | Version     | Zweck                                                  | Kosten |
| :-------------------------- | :---------- | :----------------------------------------------------- | :----: |
| `expo-secure-store`         | Latest      | Hardware-backed Token Storage (Keychain/Keystore)      |   $0   |
| `expo-local-authentication` | Latest      | Biometric Auth (Face ID / Fingerprint)                 |   $0   |
| `realm`                     | Latest      | AES-256 lokale DB-Verschlüsselung (Key in SecureStore) |   $0   |
| Network Security Config     | Android XML | Cleartext-Traffic blockiert                            |   $0   |
| Certificate Pinning         | Expo Config | TLS Certificate Pinning gegen MITM                     |   $0   |

### 13.8 Zusammenfassung — Security-Pakete

| Kategorie         |            Neue Pakete            |        Node.js Built-in         |
| :---------------- | :-------------------------------: | :-----------------------------: |
| Network/Transport |   3 (Helmet, CORS, Rate Limit)    |                —                |
| Auth/RBAC         |   4 (JWT, argon2, Cookie, Zod)    |        crypto (SHA-256)         |
| API Security      |            1 (nanoid)             |      crypto (HMAC-SHA256)       |
| Data Encryption   |       2 (🔒 otplib, qrcode)       |      crypto (AES-256-GCM)       |
| File Security     |     1 (sharp) + S3 Presigner      |                —                |
| Backup            |                 —                 |   crypto (AES-256-GCM, HKDF)    |
| Mobile            | 3 (SecureStore, LocalAuth, Realm) |                —                |
| CI/Supply Chain   |    2 (TruffleHog, Dependabot)     |           pnpm audit            |
| **Total**         |          **~16 Pakete**           | **Node.js crypto für 6 Zwecke** |

> **Gesamtkosten für Security-Dependencies: $0** — Alles Open Source oder Node.js Built-in.
> **Nur 2 neue Pakete** (`otplib` + `qrcode`) — der Rest war bereits in der Tech Requirements Liste.

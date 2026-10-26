# Dento v2 — Platform-Level RBAC & Developer User Management

> **Datum:** 2026-07-10
> **Status:** ✅ Implementiert
> **Zweck:** Multi-User Zugriff auf das Developer Portal mit granularen Platform-Berechtigungen
> **Abhängigkeiten:** V2_DECISION_LOG.md, SECURITY_AND_ENCRYPTION.md §4, V2_DATABASE.md §4.1, BUILD_RULES.md §5+§17
> **Priorität:** Vor Phase 4 Financial (Woche 15+) — eigene Mini-Phase einplanen

---

## Inhaltsverzeichnis

1. [Problemanalyse](#1-problemanalyse)
2. [Ist-Zustand (Codebase Audit)](#2-ist-zustand-codebase-audit)
3. [Soll-Zustand (Ziel-Architektur)](#3-soll-zustand-ziel-architektur)
4. [Platform-Rollen](#4-platform-rollen)
5. [Permission-Matrix (Platform-Level)](#5-permission-matrix-platform-level)
6. [Datenbank-Änderungen](#6-datenbank-änderungen)
7. [API-Endpoints (Neue Routes)](#7-api-endpoints-neue-routes)
8. [Middleware — `platformGuard`](#8-middleware--platformguard)
9. [JWT-Payload Erweiterung](#9-jwt-payload-erweiterung)
10. [Developer Portal — UI-Änderungen](#10-developer-portal--ui-änderungen)
11. [Seed-Script Erweiterung](#11-seed-script-erweiterung)
12. [Security-Integration](#12-security-integration)
13. [Implementierungsplan](#13-implementierungsplan)
14. [Cross-Reference: Betroffene Dokumente](#14-cross-reference-betroffene-dokumente)
15. [Gap-Analyse: Was fehlt in bestehenden Docs](#15-gap-analyse-was-fehlt-in-bestehenden-docs)
16. [Entscheidungen (für V2_DECISION_LOG)](#16-entscheidungen-für-v2_decision_log)

---

## 1. Problemanalyse

### 1.1 Kern-Problem

Das Developer Portal (`apps/developer`) hat **keine Benutzerverwaltung**. Aktuell existiert genau **ein** Zugang:

- Erstellt via `apps/api/src/scripts/seed-platform.ts` → `admin@dento.dev` / `Admin@1234`
- Rolle: `platform_admin` → Bypass auf **alle** Prüfungen

**Konsequenzen:**

| Problem                               | Risiko  | Auswirkung                                                              |
| :------------------------------------ | :------ | :---------------------------------------------------------------------- |
| Kein zweiter Developer-Zugang möglich | Hoch    | Single Point of Failure — nur eine Person hat Platform-Zugriff          |
| Kein Audit-Trail pro Person           | Hoch    | Aktionen nicht nachvollziehbar — alle Änderungen laufen über 1 Account  |
| `platform_admin` hat God-Role         | Mittel  | Kein Principle of Least Privilege — jeder Developer sieht alles         |
| Keine Einladung neuer Team-Mitglieder | Hoch    | Neue Entwickler müssen Passwort des Shared-Accounts bekommen            |
| Sidebar zeigt alles bedingungslos     | Niedrig | Kein UI-Gating — selbst wenn Rollen existieren würden, sieht man alles  |
| Platform-Routes prüfen inline         | Mittel  | Inkonsistente Sicherheit — jede Route macht `role !== 'platform_admin'` |

### 1.2 Warum jetzt?

- Phase 2 (Dev Portal) ist abgeschlossen → Portal funktioniert, aber nur für **1 Benutzer**
- Phase 3 (Clinical) ist abgeschlossen → System hat ~1000 Zeilen Audit-Logging, aber Platform-Aktionen sind nicht personenzuordnungsfähig
- Phase 4 (Financial) beginnt → Billing/Pricing-Operationen **müssen** nachvollziehbar sein (wer hat preise geändert?)
- HIPAA/GDPR Compliance (SECURITY §14-15) erfordert individuelles Audit-Logging

---

## 2. Ist-Zustand (Codebase Audit)

> **Hinweis:** Dieser Abschnitt dokumentierte den Zustand **vor** der Implementierung. Inzwischen ist das Platform-RBAC umgesetzt: `apps/api/src/platform/middleware/platform-guard.ts` existiert mit der `PLATFORM_PERMISSIONS`-Matrix, `platformGuard()` wird ~233× in 34 Platform-Route-Dateien verwendet, und es gibt **keine** Inline-`role !== 'platform_admin'`-Prüfungen mehr.

### 2.1 Aktuelle RBAC-Architektur

```
Tenant-Level (funktioniert ✅):
  authGuard → tenantDbMiddleware → roleGuard(module, permission)
  │                                     │
  │                                     └── PERMISSION_MATRIX (28 Module × 7 Tenant-Rollen (+ platform_admin-Bypass) × 5 Permissions)
  │                                         platform_admin: '*' (Bypass)
  │                                         tenant_admin: '*' (Voller Zugriff)
  │                                         dentist: [...spezifische Permissions]
  │                                         etc.
  │
  └── 3-stufig, zentralisiert, Code-definiert ✅

Platform-Level (implementiert ✅):
  authGuard → platformGuard(module, action) → Handler
  │                                     │
  │                                     └── PLATFORM_PERMISSIONS (11 Module × 3 Rollen × 5 Actions)
  │                                         platform_owner: '*' (Vollzugriff)
  │                                         platform_admin: [...operative Permissions]
  │                                         platform_viewer: überwiegend ['read']
  │
  └── 2-stufig, zentralisiert, Code-definiert ✅
```

> ⚠️ **Cleanup-Item:** `role-guard.ts` enthält einen **doppelten Modul-Slug** — sowohl `'lab-orders'` als auch `'labOrders'` existieren in der `ModuleSlug`-Union und in der Permission-Matrix. Sollte auf einen Slug konsolidiert werden.

### 2.2 Betroffene Dateien (Ist-Zustand vor der Implementierung)

| Datei                                           | Zeilen | Problem                                                  |
| :---------------------------------------------- | :----- | :------------------------------------------------------- |
| `apps/api/src/tenant/middleware/role-guard.ts`  | 460    | `platform_admin` Bypass bei L442, nur Tenant-Module      |
| `apps/api/src/tenant/middleware/auth-guard.ts`  | 98     | Kein Platform-spezifischer Guard                         |
| `apps/api/src/platform/models/user.model.ts`    | ~195   | `role` = einfaches Enum, kein `platformPermissions` Feld |
| `apps/developer/src/config/sidebar-config.ts`   | 87     | Keine Permission-Filterung, zeigt alles                  |
| `apps/developer/src/stores/auth.store.ts`       | 35     | `role: string`, keine Permissions                        |
| `apps/api/src/platform/routes/` (12 Dateien)    | ~3000+ | Inline `role !== 'platform_admin'` Prüfungen             |
| `apps/api/src/tenant/routes/auth/auth.route.ts` | 1015   | Shared Auth für Platform + Tenant, kein Platform-JWT     |
| `apps/api/src/scripts/seed-platform.ts`         | ~100   | Erstellt nur 1 Account, keine Rollen-Varianten           |

### 2.3 Platform-Route Inline-Checks (historisch — damals 12 Dateien)

Jede Platform-Route-Datei enthielt Varianten von:

```typescript
// ❌ Früherer Ansatz — inkonsistent, unsicher, nicht erweiterbar (inzwischen ersetzt)
const user = request.user;
if (!user || user.role !== 'platform_admin') {
  return apiError(reply, 403, 'FORBIDDEN', 'Only platform_admin can access this');
}
```

**Betroffene Routes:**

| Route-Datei              | Endpoint-Prefix         | Inline Checks |
| :----------------------- | :---------------------- | :------------ |
| `api-keys.route.ts`      | `/platform/api-keys`    | 6×            |
| `backups.route.ts`       | `/platform/backups`     | 4×            |
| `db-explorer.route.ts`   | `/platform/db`          | 3×            |
| `impersonation.route.ts` | `/platform/impersonate` | 2×            |
| `modules.route.ts`       | `/platform/modules`     | 5×            |
| `payments.route.ts`      | `/platform/payments`    | 3×            |
| `pricing.route.ts`       | `/platform/pricing`     | 5×            |
| `rate-limits.route.ts`   | `/platform/rate-limits` | 2×            |
| `stripe.route.ts`        | `/platform/stripe`      | 2×            |
| `support.route.ts`       | `/platform/support`     | 3×            |
| `versioning.route.ts`    | `/platform/versions`    | 3×            |
| `webhooks.route.ts`      | `/platform/webhooks`    | 6×            |

**Gesamt: ~44 Inline-Checks (historisch)** → alle wurden durch die `platformGuard()`-Middleware ersetzt. Stand heute: ~233 `platformGuard()`-Aufrufe in 34 Platform-Route-Dateien, **keine** Inline-Checks mehr vorhanden.

---

## 3. Soll-Zustand (Ziel-Architektur)

### 3.1 Neue Middleware-Chain (Platform-Level)

```
Platform-Request eingehend
  │
  ▼
[1] authGuard()           → JWT vorhanden + gültig + User aktiv?
  │                          (unverändert — Wiederverwendung)
  │
  ▼
[2] platformGuard()       → User hat Platform-Rolle?
  │   (module, action)       → Resolved Permissions enthalten Modul+Action?
  │                          → Abbruch mit 403 falls nicht
  │
  ▼
Handler (kein inline role-check nötig)
```

### 3.2 Abgrenzung: Platform vs. Tenant

| Aspekt            | Tenant-RBAC (bestehend)                   | Platform-RBAC (neu)                      |
| :---------------- | :---------------------------------------- | :--------------------------------------- |
| Middleware        | `roleGuard(module, perm)`                 | `platformGuard(module, perm)`            |
| Rollen            | 7 Tenant-Rollen (+ platform_admin-Bypass) | 3 (platform_owner, admin, viewer)        |
| Module            | 28 Tenant-Module                          | 11 Platform-Module                       |
| Permissions       | Code-definiert in `PERMISSION_MATRIX`     | Code-definiert in `PLATFORM_PERMISSIONS` |
| Route-Prefix      | `/api/{resource}`                         | `/api/platform/{resource}`               |
| DB-Scope          | `tenant_{slug}`                           | `dento_platform`                         |
| User-Feld         | `role` (Enum 8)                           | `platformRole` (neues Feld)              |
| Sidebar-Filterung | Admin-Sidebar filtert nach Rolle          | Dev-Sidebar filtert nach Permission      |

---

## 4. Platform-Rollen

### 4.1 Drei Rollen-Hierarchie

| Rolle             | Beschreibung                      | Ersteller                        | Löschbar?                      |
| :---------------- | :-------------------------------- | :------------------------------- | :----------------------------- |
| `platform_owner`  | Vollzugriff + Benutzerverwaltung  | Seed-Script (initial)            | Nein (letzter Owner geschützt) |
| `platform_admin`  | Operativer Zugriff ohne User-Mgmt | Einladung durch Owner            | Ja                             |
| `platform_viewer` | Nur-Lesen Zugriff                 | Einladung durch Owner oder Admin | Ja                             |

### 4.2 Rollen-Details

#### `platform_owner` — Super-Admin

- Alle Platform-Operationen (CRUD auf alles)
- Kann andere Users einladen, Rollen zuweisen, Accounts deaktivieren
- Kann andere Owners ernennen (mindestens 1 Owner muss immer existieren)
- Vollen Zugriff auf Billing, Pricing, API Keys, Backups
- **Nicht löschbar** — letzter Owner wird durch Business-Logic geschützt

#### `platform_admin` — Operator

- Tenant-Verwaltung (CRUD, Module aktivieren, Support)
- Backup ausführen und verwalten
- Support-Sessions / Impersonation
- Webhooks, API Keys verwalten
- **Kein Zugriff** auf: Benutzerverwaltung (andere Platform-Users), Billing-Konfiguration

#### `platform_viewer` — Beobachter

- Nur-Lesen auf alle Platform-Daten
- Dashboard, Tenant-Liste, Monitoring, Logs ansehen
- **Kein Zugriff** auf: Erstellung, Änderung, Löschung von Daten
- **Kein Zugriff** auf: Impersonation, Backup-Trigger, API Key Erstellung

---

## 5. Permission-Matrix (Platform-Level)

### 5.1 Module × Rollen × Actions

```typescript
// apps/api/src/platform/middleware/platform-guard.ts

type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_viewer';
type PlatformAction = 'read' | 'create' | 'update' | 'delete' | 'manage';

type PlatformModule =
  | 'platform_tenants' // Tenant CRUD + Module-Zuweisung
  | 'platform_users' // Platform-Benutzerverwaltung
  | 'platform_billing' // Subscription, Zahlungen, Rechnungen
  | 'platform_modules' // Modul-Katalog + Versioning
  | 'platform_pricing' // Preise, Coupons, Discounts
  | 'platform_api_keys' // API Key CRUD
  | 'platform_webhooks' // Webhook Endpoints + Deliveries
  | 'platform_backups' // Backup CRUD + Restore
  | 'platform_support' // Support Sessions + Impersonation
  | 'platform_settings' // Platform-Einstellungen, Rate Limits, Feature Flags
  | 'platform_audit'; // Platform Audit-Logs
```

### 5.2 Vollständige Matrix

| Modul               | Owner (`platform_owner`) | Admin (`platform_admin`)       | Viewer (`platform_viewer`) |
| :------------------ | :----------------------- | :----------------------------- | :------------------------- |
| `platform_tenants`  | `*` (alle 5 Actions)     | `read, create, update`         | `read`                     |
| `platform_users`    | `*`                      | `read`                         | `read`                     |
| `platform_billing`  | `*`                      | `read`                         | `read`                     |
| `platform_modules`  | `*`                      | `read, create, update`         | `read`                     |
| `platform_pricing`  | `*`                      | `read`                         | `read`                     |
| `platform_api_keys` | `*`                      | `read, create, delete`         | `read`                     |
| `platform_webhooks` | `*`                      | `read, create, update, delete` | `read`                     |
| `platform_backups`  | `*`                      | `read, create`                 | `read`                     |
| `platform_support`  | `*`                      | `read, create, update`         | `read`                     |
| `platform_settings` | `*`                      | `read`                         | `—` (kein Zugriff)         |
| `platform_audit`    | `*`                      | `read`                         | `read`                     |

### 5.3 Code-Implementierung

```typescript
// apps/api/src/platform/middleware/platform-guard.ts

const PLATFORM_PERMISSIONS: Record<PlatformModule, Record<PlatformRole, PlatformAction[] | '*'>> = {
  platform_tenants: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update'],
    platform_viewer: ['read'],
  },
  platform_users: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
  platform_billing: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
  platform_modules: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update'],
    platform_viewer: ['read'],
  },
  platform_pricing: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
  platform_api_keys: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'delete'],
    platform_viewer: ['read'],
  },
  platform_webhooks: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update', 'delete'],
    platform_viewer: ['read'],
  },
  platform_backups: {
    platform_owner: '*',
    platform_admin: ['read', 'create'],
    platform_viewer: ['read'],
  },
  platform_support: {
    platform_owner: '*',
    platform_admin: ['read', 'create', 'update'],
    platform_viewer: ['read'],
  },
  platform_settings: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: [],
  },
  platform_audit: {
    platform_owner: '*',
    platform_admin: ['read'],
    platform_viewer: ['read'],
  },
} as const;
```

### 5.4 Spezial-Permissions per Override (Optional, Phase 2)

> **Phase 1:** Nur rollenbasierte Permissions (Matrix oben)
> **Phase 2 (optional):** Per-User Overrides via `platformPermissionOverrides[]` im User-Dokument

```typescript
// Per-User Override Beispiel (optional, Phase 2):
{
  platformRole: 'platform_admin',
  platformPermissionOverrides: [
    { module: 'platform_pricing', actions: ['read', 'update'] },  // Zusätzlich: Preise bearbeiten
    { module: 'platform_users', actions: [] },                     // Entzogen: User-Liste nicht sehen
  ]
}
```

---

## 6. Datenbank-Änderungen

### 6.1 `users` Collection — Schema-Erweiterung

**Bestehende Felder (unverändert):**

```typescript
{
  // ... alle bisherigen Felder bleiben unverändert
  role: String,          // ← bleibt für Tenant-RBAC (8 Rollen)
  tenantSlug: String,    // ← bleibt: null für Platform-User
}
```

**Neue Felder:**

```typescript
{
  // NEU — Platform-Level RBAC
  platformRole: String | null,       // enum: 'platform_owner' | 'platform_admin' | 'platform_viewer'
                                     // null für Tenant-User (kein Platform-Zugriff)

  platformPermissionOverrides: [{    // Optional — Per-User Overrides (Phase 2)
    module: String,                  // PlatformModule Enum
    actions: [String],               // Erlaubte Actions (überschreibt Rollen-Default)
  }],

  invitedBy: ObjectId | null,       // → users._id (Wer hat diesen User eingeladen?)
  invitedAt: Date | null,           // Zeitpunkt der Einladung
  inviteToken: String | null,       // 🔒 SHA-256 gehashter Einladungs-Token
  inviteTokenExpiresAt: Date | null, // TTL: 72 Stunden
}
```

**Neue Indexes:**

```typescript
// Index für Platform-User Abfragen
{ platformRole: 1, status: 1 }       // Alle aktiven Platform-Admins finden
{ inviteToken: 1 }                    // Token-Lookup bei Einladungsannahme (sparse)
```

### 6.2 Migration: Bestehende `platform_admin` User

```typescript
// Migration Script: Bestehende platform_admin User upgraden
db.users.updateMany(
  { role: 'platform_admin', tenantSlug: null },
  {
    $set: {
      platformRole: 'platform_owner', // Erster Benutzer wird Owner
      platformPermissionOverrides: [],
    },
  },
);
```

### 6.3 Zusammenspiel `role` + `platformRole`

| User-Typ        | `role`           | `tenantSlug` | `platformRole`    | Zugriff                       |
| :-------------- | :--------------- | :----------- | :---------------- | :---------------------------- |
| Platform Owner  | `platform_admin` | `null`       | `platform_owner`  | Dev Portal — Voller Zugriff   |
| Platform Admin  | `platform_admin` | `null`       | `platform_admin`  | Dev Portal — Operativ         |
| Platform Viewer | `platform_admin` | `null`       | `platform_viewer` | Dev Portal — Nur-Lesen        |
| Tenant Admin    | `tenant_admin`   | `clinic-x`   | `null`            | Admin Portal — Voller Zugriff |
| Tenant Dentist  | `dentist`        | `clinic-x`   | `null`            | Admin Portal — Dentist-Scope  |

> **Wichtig:** Das Feld `role` behält den Wert `platform_admin` für **alle** Platform-User, um die bestehende `authGuard`- und Tenant-Bypass-Logik nicht zu brechen. Das neue Feld `platformRole` differenziert **innerhalb** der Platform-Ebene.

### 6.4 Neue Collection: `platform_invite_log` (Audit)

```typescript
// Optionale Audit-Collection für Einladungen
{
  _id: ObjectId,
  inviteeEmail: String,
  invitedBy: ObjectId,           // → users._id
  platformRole: String,
  status: String,                // 'pending' | 'accepted' | 'expired' | 'revoked'
  invitedAt: Date,
  acceptedAt: Date | null,
  revokedAt: Date | null,
  revokedBy: ObjectId | null,
  expiresAt: Date,
  ipAddress: String,             // IP bei Annahme
  userAgent: String,             // User-Agent bei Annahme
  createdAt: Date,
  updatedAt: Date,
}
// Index: { inviteeEmail: 1, status: 1 }
// Index: { invitedBy: 1 }
// Index: { expiresAt: 1 }, expireAfterSeconds: 0  // Auto-Delete nach Ablauf
```

---

## 7. API-Endpoints (Neue Routes)

### 7.1 Neues Route-File

**Pfad:** `apps/api/src/platform/routes/users/users.route.ts`

> Folgt dem bestehenden Pattern aus BUILD_RULES.md §3 + §5:
>
> - Kebab-Case URL, Plural Nomen
> - Zod Schema in `@dento/shared`
> - Fastify Route mit `preHandler` Middleware-Chain
> - `apiSuccess()` / `apiError()` Response-Wrapper

### 7.2 Endpoint-Übersicht

| Method   | Endpoint                                | platformGuard              | Beschreibung                         |
| :------- | :-------------------------------------- | :------------------------- | :----------------------------------- |
| `GET`    | `/api/platform/users`                   | `platform_users`, `read`   | Platform-User auflisten (Pagination) |
| `GET`    | `/api/platform/users/:id`               | `platform_users`, `read`   | Einzelnen Platform-User abrufen      |
| `POST`   | `/api/platform/users/invite`            | `platform_users`, `create` | Neuen Platform-User einladen         |
| `PATCH`  | `/api/platform/users/:id`               | `platform_users`, `update` | Rolle/Status eines Users ändern      |
| `PATCH`  | `/api/platform/users/:id/permissions`   | `platform_users`, `manage` | Per-User Permission Overrides setzen |
| `DELETE` | `/api/platform/users/:id`               | `platform_users`, `delete` | Platform-User deaktivieren           |
| `POST`   | `/api/platform/users/:id/resend-invite` | `platform_users`, `create` | Einladungs-Email erneut senden       |
| `DELETE` | `/api/platform/users/:id/revoke-invite` | `platform_users`, `delete` | Ausstehende Einladung widerrufen     |
| `POST`   | `/api/auth/accept-invite`               | (kein Auth)                | Einladung annehmen + Passwort setzen |
| `GET`    | `/api/auth/verify-invite/:token`        | (kein Auth)                | Einladungs-Token verifizieren        |

### 7.3 Endpoint-Details

#### `POST /api/platform/users/invite`

```typescript
// Request Body (Zod Schema):
{
  email: z.string().email(),
  firstName: z.object({ en: z.string().min(1), ar: z.string().optional() }),
  lastName: z.object({ en: z.string().min(1), ar: z.string().optional() }),
  platformRole: z.enum(['platform_admin', 'platform_viewer']),
  // Owner kann nur durch bestehenden Owner ernannt werden
}

// Response (201):
{
  success: true,
  data: {
    id: string,
    email: string,
    platformRole: string,
    status: 'invited',
    invitedAt: string,  // ISO 8601
    inviteExpiresAt: string,
  }
}

// Business Rules:
// - Nur platform_owner kann einladen
// - Email darf nicht bereits als Platform-User existieren
// - Einladungs-Token: nanoid(48), SHA-256 gehasht in DB, 72h TTL
// - Email-Versand via bestehende Notification-Queue (BullMQ)
// - Audit Log: 'platform_user_invited' Event
```

#### `POST /api/auth/accept-invite`

```typescript
// Request Body:
{
  token: z.string(),
  password: z.string().min(8)
    .regex(/[A-Z]/)        // Min. 1 Großbuchstabe
    .regex(/[0-9]/)        // Min. 1 Zahl
    .regex(/[^a-zA-Z0-9]/), // Min. 1 Sonderzeichen
}

// Business Rules:
// - Token in DB suchen (SHA-256 Hash Vergleich)
// - Token abgelaufen? → 410 Gone
// - Token bereits verwendet? → 409 Conflict
// - Passwort mit Argon2id hashen
// - User-Status: 'invited' → 'active'
// - inviteToken + inviteTokenExpiresAt nullen
// - Automatisches Login (JWT-Paar generieren)
// - Audit Log: 'platform_user_activated' Event
```

#### `PATCH /api/platform/users/:id`

```typescript
// Request Body:
{
  platformRole?: z.enum(['platform_owner', 'platform_admin', 'platform_viewer']),
  status?: z.enum(['active', 'suspended', 'deactivated']),
}

// Business Rules:
// - Nur platform_owner kann Rollen ändern
// - Owner kann sich NICHT selbst degradieren (wenn letzter Owner)
// - Letzte-Owner-Schutz: DB-Query → count owners > 1
// - Statusänderung zu 'suspended' → alle Sessions invalidieren (tokenVersion++)
// - Audit Log: 'platform_user_role_changed' oder 'platform_user_status_changed'
```

---

## 8. Middleware — `platformGuard`

### 8.1 Dateistruktur

**Pfad (implementiert):** `apps/api/src/platform/middleware/platform-guard.ts`

> Parallel zum bestehenden `apps/api/src/tenant/middleware/role-guard.ts`
> Aber für Platform-Scope, nicht Tenant-Scope.

### 8.2 Implementation

```typescript
// apps/api/src/platform/middleware/platform-guard.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { apiError } from '../../utils/api-response.js';

// --- Types ---
export type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_viewer';
export type PlatformAction = 'read' | 'create' | 'update' | 'delete' | 'manage';
export type PlatformModule =
  | 'platform_tenants'
  | 'platform_users'
  | 'platform_billing'
  | 'platform_modules'
  | 'platform_pricing'
  | 'platform_api_keys'
  | 'platform_webhooks'
  | 'platform_backups'
  | 'platform_support'
  | 'platform_settings'
  | 'platform_audit';

// --- Permission Matrix (Code-definiert, NICHT in DB) ---
const PLATFORM_PERMISSIONS: Record<PlatformModule, Record<PlatformRole, PlatformAction[] | '*'>> = {
  // ... (vollständige Matrix aus §5.3)
};

// --- Helper Functions ---
export function hasPlatformPermission(
  role: PlatformRole,
  module: PlatformModule,
  action: PlatformAction,
  overrides?: Array<{ module: string; actions: string[] }>,
): boolean {
  // Phase 2: Check overrides first
  if (overrides?.length) {
    const override = overrides.find((o) => o.module === module);
    if (override) return override.actions.includes(action);
  }

  // Default: Check role matrix
  const permissions = PLATFORM_PERMISSIONS[module]?.[role];
  if (!permissions) return false;
  if (permissions === '*') return true;
  return permissions.includes(action);
}

// --- Middleware Factory ---
export function platformGuard(module: PlatformModule, action: PlatformAction) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return apiError(reply, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Platform-User müssen platformRole haben
    const platformRole = user.platformRole as PlatformRole | undefined;
    if (!platformRole) {
      return apiError(reply, 403, 'FORBIDDEN', 'Platform access denied');
    }

    // Permission prüfen
    if (!hasPlatformPermission(platformRole, module, action, user.platformPermissionOverrides)) {
      return apiError(
        reply,
        403,
        'FORBIDDEN',
        `Insufficient permissions: ${module}.${action} requires higher platform role`,
      );
    }

    // ✅ Passed — weiter zum Handler
  };
}

// --- Convenience Exports ---
export const requirePlatformOwner = platformGuard('platform_users', 'manage');
```

> ⚠️ **Bekannte Phase-2-Lücke:** Die tatsächliche Implementierung in `platform-guard.ts` ruft `hasPlatformPermission(role, module, action)` **ohne** das `overrides`-Argument auf (Code-Kommentar: Overrides sind noch nicht im JWT — Phase 2). Per-User Permission Overrides werden zur Request-Zeit derzeit **nicht** durchgesetzt.

### 8.3 Middleware-Chain (Beispiel)

```typescript
// apps/api/src/platform/routes/users/users.route.ts
import { authGuard } from '../../../tenant/middleware/auth-guard.js';
import { platformGuard } from '../../middleware/platform-guard.js';

app.get('/api/platform/users', {
  preHandler: [authGuard, platformGuard('platform_users', 'read')],
  handler: listPlatformUsers,
});

app.post('/api/platform/users/invite', {
  preHandler: [authGuard, platformGuard('platform_users', 'create')],
  handler: invitePlatformUser,
});
```

### 8.4 Migration bestehender Routes (abgeschlossen)

Alle bestehenden Platform-Route-Dateien wurden refactored — Stand heute sind 34 Route-Dateien vollständig migriert, es existieren keine Inline-Checks mehr:

```diff
// VORHER (jeder Handler):
- const user = request.user;
- if (!user || user.role !== 'platform_admin') {
-   return apiError(reply, 403, 'FORBIDDEN', 'Only platform_admin can ...');
- }

// NACHHER (preHandler):
+ app.get('/api/platform/api-keys', {
+   preHandler: [authGuard, platformGuard('platform_api_keys', 'read')],
+   handler: listApiKeys,
+ });
```

### 8.5 Route-zu-Modul Mapping

| Route-Datei              | Platform-Modul      |
| :----------------------- | :------------------ |
| `api-keys.route.ts`      | `platform_api_keys` |
| `backups.route.ts`       | `platform_backups`  |
| `db-explorer.route.ts`   | `platform_tenants`  |
| `impersonation.route.ts` | `platform_support`  |
| `modules.route.ts`       | `platform_modules`  |
| `payments.route.ts`      | `platform_billing`  |
| `pricing.route.ts`       | `platform_pricing`  |
| `rate-limits.route.ts`   | `platform_settings` |
| `stripe.route.ts`        | `platform_billing`  |
| `support.route.ts`       | `platform_support`  |
| `versioning.route.ts`    | `platform_modules`  |
| `webhooks.route.ts`      | `platform_webhooks` |

> **Hinweis:** Die Tabelle zeigt das ursprüngliche Mapping der ersten 12 Route-Dateien. Inzwischen nutzen alle 34 Platform-Route-Dateien `platformGuard()` (u. a. auch `audit-logs`, `tenants`, `settings`, `feature-flags`, `deployments`, `sessions`, …).

---

## 9. JWT-Payload Erweiterung

### 9.1 Aktueller Access Token Payload

```typescript
// VORHER:
{
  userId: string,
  email: string,
  tenantSlug: string | null,
  role: string,          // 'platform_admin'
  sessionId: string,
}
```

### 9.2 Erweiterter Access Token Payload

```typescript
// NACHHER:
{
  userId: string,
  email: string,
  tenantSlug: string | null,
  role: string,                    // 'platform_admin' (unverändert)
  sessionId: string,

  // NEU — Platform-Level
  platformRole?: PlatformRole,     // 'platform_owner' | 'platform_admin' | 'platform_viewer'
  platformPermissions?: string[],  // Resolved Permissions Array:
                                   // ['platform_tenants.*', 'platform_users.read', ...]
}
```

### 9.3 Token-Generierung anpassen

```typescript
// apps/api/src/tenant/routes/auth/auth.route.ts — createSessionAndTokens()

function buildAccessTokenPayload(user: IUser) {
  const payload: any = {
    userId: user._id.toString(),
    email: user.email,
    tenantSlug: user.tenantSlug || null,
    role: user.role,
    sessionId: session._id.toString(),
  };

  // Platform-User: platformRole + resolved Permissions hinzufügen
  if (user.platformRole) {
    payload.platformRole = user.platformRole;
    payload.platformPermissions = resolvePlatformPermissions(
      user.platformRole,
      user.platformPermissionOverrides || [],
    );
  }

  return payload;
}
```

### 9.4 `resolvePlatformPermissions()` Utility

```typescript
// Resolved alle Permissions einer Platform-Rolle (inkl. Overrides) als flaches Array
function resolvePlatformPermissions(
  role: PlatformRole,
  overrides: Array<{ module: string; actions: string[] }>,
): string[] {
  const resolved: string[] = [];

  for (const [module, rolePerms] of Object.entries(PLATFORM_PERMISSIONS)) {
    const override = overrides.find((o) => o.module === module);

    if (override) {
      // Override gewinnt
      for (const action of override.actions) {
        resolved.push(`${module}.${action}`);
      }
    } else {
      // Default aus Matrix
      const perms = rolePerms[role];
      if (!perms) continue;
      if (perms === '*') {
        resolved.push(`${module}.*`);
      } else {
        for (const action of perms) {
          resolved.push(`${module}.${action}`);
        }
      }
    }
  }

  return resolved;
}
```

### 9.5 Frontend Token-Nutzung

```typescript
// apps/developer/src/stores/auth.store.ts — erweitert

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  platformRole: PlatformRole; // NEU
  platformPermissions: string[]; // NEU — resolved Array
}

// Utility für UI Permission-Checks:
export function hasPlatformPerm(permission: string): boolean {
  const { user } = useAuthStore.getState();
  if (!user?.platformPermissions) return false;

  // Check für Wildcard
  const [module] = permission.split('.');
  if (user.platformPermissions.includes(`${module}.*`)) return true;

  return user.platformPermissions.includes(permission);
}
```

---

## 10. Developer Portal — UI-Änderungen

### 10.1 Neue Feature: Platform Users

**Pfad:** `apps/developer/src/features/platform-users/`

```
apps/developer/src/features/platform-users/
├── pages/
│   ├── PlatformUsersPage.tsx      # Liste aller Platform-User
│   └── InviteUserPage.tsx         # Einladungs-Formular
├── components/
│   ├── UserTable.tsx              # DataTable mit Rollen, Status, Actions
│   ├── InviteForm.tsx             # Email + Rolle + Name
│   ├── RoleChangeDialog.tsx       # Dialog zum Rollen-Wechsel
│   └── UserStatusBadge.tsx        # Status-Badge Komponente
├── hooks/
│   └── use-platform-users.ts     # React Query Hooks
└── types/
    └── index.ts                   # Platform User Types
```

### 10.2 Sidebar-Konfiguration — Permission-basierte Filterung

```typescript
// apps/developer/src/config/sidebar-config.ts — ERWEITERT

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: string;
  requiredPermission?: string; // NEU — z.B. 'platform_tenants.read'
}

// Beispiel:
const DEV_SIDEBAR_CONFIG: SidebarSection[] = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      // Dashboard hat kein requiredPermission → immer sichtbar
    ],
  },
  {
    label: 'SaaS',
    items: [
      {
        icon: Building2,
        label: 'Tenants',
        href: '/tenants',
        requiredPermission: 'platform_tenants.read',
      },
      {
        icon: Activity,
        label: 'Monitoring',
        href: '/monitoring',
        requiredPermission: 'platform_tenants.read',
      },
      {
        icon: CreditCard,
        label: 'Billing',
        href: '/billing',
        requiredPermission: 'platform_billing.read',
      },
      // ...
    ],
  },
  {
    label: 'Team', // NEU — Neue Sidebar-Sektion
    items: [
      {
        icon: Users,
        label: 'Platform Users',
        href: '/users',
        requiredPermission: 'platform_users.read',
      },
    ],
  },
  // ...
];
```

### 10.3 Sidebar-Rendering mit Permission-Filter

```typescript
// apps/developer/src/layouts/Sidebar/Sidebar.tsx — ERWEITERT

import { hasPlatformPerm } from '../../stores/auth.store';

function filterSidebarItems(sections: SidebarSection[]): SidebarSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.requiredPermission) return true; // Kein Check nötig
        return hasPlatformPerm(item.requiredPermission);
      }),
    }))
    .filter((section) => section.items.length > 0); // Leere Sektionen ausblenden
}
```

### 10.4 Invite-Akzeptanz Seite

**Pfad:** `apps/developer/src/features/auth/pages/AcceptInvitePage.tsx`

- Öffentliche Route (kein Auth nötig): `/invite/:token`
- Zeigt: Einladungs-Details (Email, Rolle, eingeladen von)
- Formular: Passwort setzen + Passwort bestätigen
- Nach Erfolg: Auto-Login → Dashboard Redirect

### 10.5 Route-Protection

```typescript
// apps/developer/src/router.tsx — Permission-basierte Route Protection

function PlatformRoute({ permission, children }: { permission: string; children: ReactNode }) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" />;
  if (!hasPlatformPerm(permission)) return <ForbiddenPage />;

  return <>{children}</>;
}

// Usage:
<Route path="/users" element={
  <PlatformRoute permission="platform_users.read">
    <PlatformUsersPage />
  </PlatformRoute>
} />
```

---

## 11. Seed-Script Erweiterung

### 11.1 Aktuelles Seed-Script

```typescript
// apps/api/src/scripts/seed-platform.ts
// Erstellt aktuell nur: admin@dento.dev (role: 'platform_admin')
```

### 11.2 Erweitertes Seed-Script

```typescript
// Ergänzung in seed-platform.ts:

// 1. Bestehenden admin@dento.dev upgraden
await User.updateOne(
  { email: 'admin@dento.dev' },
  {
    $set: {
      platformRole: 'platform_owner',
      platformPermissionOverrides: [],
    },
  },
);

// 2. Optional: Dev-Test-Accounts (nur in NODE_ENV=development)
if (process.env.NODE_ENV === 'development') {
  const devUsers = [
    {
      email: 'admin@dento.dev', // Bereits vorhanden — nur upgraden
      platformRole: 'platform_owner',
    },
    {
      email: 'operator@dento.dev',
      platformRole: 'platform_admin',
      firstName: { en: 'Operator', ar: 'مشغل' },
      lastName: { en: 'User', ar: 'مستخدم' },
    },
    {
      email: 'viewer@dento.dev',
      platformRole: 'platform_viewer',
      firstName: { en: 'Viewer', ar: 'مراقب' },
      lastName: { en: 'User', ar: 'مستخدم' },
    },
  ];
  // ... Upsert-Logic mit Argon2id Passwort-Hash
}
```

---

## 12. Security-Integration

### 12.1 Einordnung in Security-Schichten (SECURITY_AND_ENCRYPTION.md)

| Schicht | Relevanz                                   | Implementierung                                                    |
| :------ | :----------------------------------------- | :----------------------------------------------------------------- |
| §3      | **Authentifizierung** — JWT erweitert      | `platformRole` + `platformPermissions` im Access Token Payload     |
| §4      | **Autorisierung (RBAC)** — Neue Middleware | `platformGuard()` parallel zu `roleGuard()`                        |
| §3.3    | **Passwort-Sicherheit** — Invite-Flow      | Argon2id für neue User, Komplexitätsregeln, History-Check          |
| §3.4    | **Brute-Force** — Invite-Token             | Rate Limit auf `/auth/accept-invite` (5/min/IP)                    |
| §9      | **Audit-Logging** — Platform-User Aktionen | Alle CRUD-Operationen auf Platform-Users geloggt                   |
| §6.1    | **Rate Limiting** — Neue Endpoints         | Standard API Rate Limit (100/min) + Auth-Level (10/min) für Invite |
| §6      | **Input Validation** — Zod `.strict()`     | Alle neuen Endpoints mit Zod Schemas validiert                     |

### 12.2 Invite-Token Sicherheit

| Maßnahme                     | Implementierung                                      |
| :--------------------------- | :--------------------------------------------------- |
| Token-Generierung            | `nanoid(48)` → kryptographisch sicher, 48 Zeichen    |
| DB-Speicherung               | SHA-256 Hash (Klartext nie in DB)                    |
| Token-TTL                    | 72 Stunden → `inviteTokenExpiresAt`                  |
| Einmal-Nutzung               | Token wird nach Annahme genullt                      |
| Rate Limit auf Verify/Accept | 5 Requests/Minute pro IP                             |
| Audit Trail                  | Einladung, Annahme, Ablauf, Widerruf — alles geloggt |

### 12.3 Session-Invalidierung bei Rollenänderung

```typescript
// Wenn platformRole geändert wird:
// 1. tokenVersion im User-Dokument inkrementieren
// 2. Alle bestehenden Sessions werden ungültig (JWT-Check schlägt fehl)
// 3. User muss sich neu anmelden → erhält neues JWT mit aktualisierten Permissions
await User.updateOne(
  { _id: userId },
  { $set: { platformRole: newRole }, $inc: { tokenVersion: 1 } },
);
```

---

## 13. Implementierungsplan

### 13.1 Mini-Phase Zeitplan

> **Geschätzte Dauer:** 3-4 Tage (als Teil der laufenden Entwicklung)
> **Einordnung:** Vor Phase 4 Financial (Woche 15+) — oder als eigenständiger Sprint

| Tag | Task                                        | Deliverable                                     |
| :-: | :------------------------------------------ | :---------------------------------------------- |
|  1  | DB-Schema + Shared Types + Zod Schemas      | `@dento/shared` Schemas, User Model erweitert   |
|  1  | `platformGuard` Middleware                  | Neue Datei + Unit Tests                         |
|  2  | Platform Users API (6 Endpoints)            | CRUD + Invite + Accept                          |
|  2  | Auth Route Erweiterung (JWT Payload)        | `platformRole` + `platformPermissions` in Token |
|  2  | Seed-Script Migration                       | Bestehende User upgraden                        |
|  3  | Bestehende 12 Route-Dateien refactoren      | ~44 Inline-Checks → `platformGuard` Middleware  |
|  3  | Dev Portal Sidebar Permission-Filterung     | `requiredPermission` + `filterSidebarItems()`   |
|  3  | Dev Portal Auth Store erweitern             | `platformRole` + `platformPermissions` + Helper |
|  4  | Platform Users UI (Liste + Invite + Detail) | Neue Seiten im Developer Portal                 |
|  4  | Accept-Invite Seite + E2E Test              | Public Route + Formular + Auto-Login            |
|  4  | Route Protection + Forbidden Page           | `<PlatformRoute>` Wrapper + 403 Seite           |

### 13.2 Dateien (Neu zu erstellen)

| Pfad                                                                         | Typ        | ~Zeilen |
| :--------------------------------------------------------------------------- | :--------- | :------ |
| `apps/api/src/platform/middleware/platform-guard.ts`                         | Middleware | ~120    |
| `apps/api/src/platform/middleware/index.ts`                                  | Barrel     | ~10     |
| `apps/api/src/platform/routes/users/users.route.ts`                          | Route      | ~400    |
| `packages/shared/src/schemas/platform-user.schema.ts`                        | Schema     | ~80     |
| `apps/developer/src/features/platform-users/pages/PlatformUsersPage.tsx`     | Page       | ~200    |
| `apps/developer/src/features/platform-users/pages/InviteUserPage.tsx`        | Page       | ~150    |
| `apps/developer/src/features/platform-users/components/UserTable.tsx`        | Component  | ~120    |
| `apps/developer/src/features/platform-users/components/InviteForm.tsx`       | Component  | ~100    |
| `apps/developer/src/features/platform-users/components/RoleChangeDialog.tsx` | Component  | ~80     |
| `apps/developer/src/features/platform-users/hooks/use-platform-users.ts`     | Hook       | ~60     |
| `apps/developer/src/features/auth/pages/AcceptInvitePage.tsx`                | Page       | ~150    |
| `apps/developer/src/components/ForbiddenPage.tsx`                            | Page       | ~40     |

### 13.3 Dateien (Zu bearbeiten)

| Pfad                                                                | Änderung                                | ~Diff |
| :------------------------------------------------------------------ | :-------------------------------------- | :---- |
| `apps/api/src/platform/models/user.model.ts`                        | Neue Felder + Indexes                   | +30   |
| `apps/api/src/tenant/routes/auth/auth.route.ts`                     | JWT Payload + accept-invite Endpoint    | +80   |
| `apps/developer/src/stores/auth.store.ts`                           | User Interface + `hasPlatformPerm()`    | +25   |
| `apps/developer/src/config/sidebar-config.ts`                       | `requiredPermission` auf jedem Item     | +20   |
| `apps/developer/src/layouts/Sidebar/Sidebar.tsx`                    | `filterSidebarItems()` Integration      | +15   |
| `apps/developer/src/router.tsx`                                     | Neue Routes + `<PlatformRoute>` Wrapper | +30   |
| `apps/api/src/platform/routes/api-keys/api-keys.route.ts`           | Inline → platformGuard                  | ~-20  |
| `apps/api/src/platform/routes/backups/backups.route.ts`             | Inline → platformGuard                  | ~-15  |
| `apps/api/src/platform/routes/db-explorer/db-explorer.route.ts`     | Inline → platformGuard                  | ~-10  |
| `apps/api/src/platform/routes/impersonation/impersonation.route.ts` | Inline → platformGuard                  | ~-8   |
| `apps/api/src/platform/routes/modules/modules.route.ts`             | Inline → platformGuard                  | ~-18  |
| `apps/api/src/platform/routes/payments/payments.route.ts`           | Inline → platformGuard                  | ~-12  |
| `apps/api/src/platform/routes/pricing/pricing.route.ts`             | Inline → platformGuard                  | ~-18  |
| `apps/api/src/platform/routes/rate-limits/rate-limits.route.ts`     | Inline → platformGuard                  | ~-8   |
| `apps/api/src/platform/routes/support/support.route.ts`             | Inline → platformGuard                  | ~-12  |
| `apps/api/src/platform/routes/versioning/versioning.route.ts`       | Inline → platformGuard                  | ~-12  |
| `apps/api/src/platform/routes/webhooks/webhooks.route.ts`           | Inline → platformGuard                  | ~-20  |
| `apps/api/src/platform/routes/payments/stripe.route.ts`             | Inline → platformGuard                  | ~-8   |
| `apps/api/src/scripts/seed-platform.ts`                             | Upgrade bestehende User + Dev-Seeds     | +40   |
| `packages/shared/src/schemas/index.ts`                              | Export platform-user Schema             | +1    |
| `packages/shared/src/types/index.ts`                                | Platform Role/Permission Types          | +15   |

**Geschätzt: ~2.200 Zeilen neu + ~150 Zeilen Modifikation über ~30 Dateien**

---

## 14. Cross-Reference: Betroffene Dokumente

### 14.1 Welche bestehenden Docs müssen aktualisiert werden?

| Dokument                     | Section         | Änderung erforderlich                                                         |
| :--------------------------- | :-------------- | :---------------------------------------------------------------------------- |
| `SECURITY_AND_ENCRYPTION.md` | §4 (RBAC)       | Neuen Abschnitt §4.4 "Platform-Level Autorisierung" hinzufügen                |
| `SECURITY_AND_ENCRYPTION.md` | §4.2            | `ROLE_PERMISSIONS` Beispiel um Platform-Permissions ergänzen                  |
| `V2_DATABASE.md`             | §4.1 (users)    | Neue Felder: `platformRole`, `platformPermissionOverrides`, Invite-Felder     |
| `V2_DATABASE.md`             | §4.x (neu)      | Neue Collection: `platform_invite_log`                                        |
| `V2_DECISION_LOG.md`         | (neuer Eintrag) | Decision #31: Platform RBAC Ansatz + Rollen-Design                            |
| `IMPLEMENTATION_ROADMAP.md`  | Phase 2/3       | Mini-Phase einfügen oder als Teil von Phase 4 Woche 14                        |
| `V2_STRUCTURE.md`            | §7 (Apps)       | `platform/middleware/` + `platform/routes/users/` + Dev Portal Feature-Folder |
| `BUILD_RULES.md`             | §17 (Auth)      | Platform-Auth Pattern dokumentieren                                           |
| `DEV_PORTAL_SCREENS.md`      | (neuer Screen)  | Platform Users Seite + Invite Flow + Accept Invite Seite                      |
| `DENTO_V2_MASTER_PLAN.md`    | §27 (Auth/RBAC) | Multi-Admin Erwähnung hinzufügen                                              |

### 14.2 Document Authority bei Konflikten

Gemäß BUILD_RULES.md §1:

```
V2_DECISION_LOG.md (Priority 1)
  → Neuer Eintrag #31 "Platform RBAC" hat höchste Autorität
V2_DATABASE.md (Priority 2)
  → Schema-Änderungen in §4.1 sind bindend
SECURITY_AND_ENCRYPTION.md (Priority 3)
  → Neuer §4.4 ergänzt die RBAC-Schicht
IMPLEMENTATION_ROADMAP.md (Priority 4)
  → Timeline-Einordnung
```

---

## 15. Gap-Analyse: Was fehlt in bestehenden Docs

### 15.1 SECURITY_AND_ENCRYPTION.md — Lücken

| Section | Aktuelle Beschreibung                           | Was fehlt                                   |
| :------ | :---------------------------------------------- | :------------------------------------------ |
| §4      | RBAC nur für Tenant-Scope (28 Module, 8 Rollen) | Platform-Level RBAC komplett abwesend       |
| §4.1    | 3-Ebenen: authGuard → tenantDb → roleGuard      | Keine Platform-spezifische Middleware-Chain |
| §4.2    | `ROLE_PERMISSIONS` nur Tenant-Module            | Kein `PLATFORM_PERMISSIONS` Equivalent      |
| §4.3    | Row-Level Security nur für Tenant-Daten         | Kein Platform Row-Level Security Konzept    |
| §3.3    | Passwort-Sicherheit erwähnt nur Login           | Invite-Token Sicherheit nicht dokumentiert  |
| §9      | Audit-Logging für Tenant-Mutations              | Platform-User CRUD Audit nicht erwähnt      |

### 15.2 V2_DATABASE.md — Lücken

| Section | Aktuelle Beschreibung                         | Was fehlt                                                 |
| :------ | :-------------------------------------------- | :-------------------------------------------------------- |
| §4.1    | `users` Collection mit `role` Enum (8 Werte)  | `platformRole` Feld fehlt komplett                        |
| §4.1    | Indexes: `email`, `tenantSlug+role`, `status` | Index `platformRole+status` fehlt                         |
| §4.1    | Kein Invite-System dokumentiert               | `inviteToken`, `invitedBy`, `inviteTokenExpiresAt` fehlen |
| §4.x    | Keine Platform Invite Log Collection          | `platform_invite_log` Collection fehlt                    |
| §15     | Collection-Zählung: ~24 Platform              | Wird ~25 (+ `platform_invite_log`)                        |

### 15.3 V2_DECISION_LOG.md — Lücken

| Was fehlt                                                                                    |
| :------------------------------------------------------------------------------------------- |
| Keine Entscheidung zum Platform-RBAC Ansatz (rollenbasiert vs. permission-basiert)           |
| Keine Entscheidung zur Trennung `platformRole` vs. Erweiterung des bestehenden `role` Feldes |
| Keine Entscheidung zum Invite-Flow (Token vs. Magic Link vs. Admin-Set-Password)             |
| Keine Entscheidung zu Per-User Permission Overrides (Phase 1 vs. Phase 2)                    |
| Keine Entscheidung zum Letzte-Owner-Schutz                                                   |

### 15.4 IMPLEMENTATION_ROADMAP.md — Lücken

| Was fehlt                                                                    |
| :--------------------------------------------------------------------------- |
| Keine Phase für Platform User Management allokiert                           |
| Phase 2 "Dev Portal komplett" erwähnt keine Benutzerverwaltung               |
| Keine Security-Items für Platform-RBAC in der Security Integration Map (§14) |
| Kein Go/No-Go Gate für Platform-User Management                              |

### 15.5 DENTO_V2_MASTER_PLAN.md — Lücken

| Section | Was fehlt                                                                      |
| :------ | :----------------------------------------------------------------------------- |
| §7      | Dev Portal Sidebar erwähnt keine "Users" oder "Team" Sektion                   |
| §27     | Auth & RBAC erwähnt nur Tenant-Level Rollen; kein Multi-Admin Platform-Konzept |
| §27     | Geht von einzelnem Platform-Operator aus ("Du")                                |
| §35     | Timeline hat keine Phase für Platform User Management                          |

### 15.6 BUILD_RULES.md — Lücken

| Section | Was fehlt                                                                         |
| :------ | :-------------------------------------------------------------------------------- |
| §5.4    | Middleware-Chain dokumentiert nur Tenant-Level (authGuard → tenantDb → roleGuard) |
| §17     | Authentication-Sektion dokumentiert keine Platform-spezifische Auth               |
| §5      | Backend Patterns zeigt kein Platform-Middleware Beispiel                          |

### 15.7 V2_STRUCTURE.md — Lücken

| Was fehlt                                                                   |
| :-------------------------------------------------------------------------- |
| `apps/api/src/platform/middleware/` Ordner nicht erwähnt                    |
| `apps/api/src/platform/routes/users/` Ordner nicht erwähnt                  |
| `apps/developer/src/features/platform-users/` Feature-Folder nicht erwähnt  |
| `apps/developer/src/features/auth/pages/AcceptInvitePage.tsx` nicht erwähnt |

---

## 16. Entscheidungen (für V2_DECISION_LOG)

> Die folgenden Entscheidungen sollten als Einträge #31-#35 in `V2_DECISION_LOG.md` aufgenommen werden.

### Decision #31: Platform RBAC Architektur

**Problem:** Das Developer Portal hat keine granulare Zugriffskontrolle für mehrere Benutzer.

**✅ DECISION: Separates `platformRole` Feld + `platformGuard()` Middleware**

**Abgelehnte Alternativen:**

| Alternative                              | Warum abgelehnt                                                                     |
| :--------------------------------------- | :---------------------------------------------------------------------------------- |
| `role` Enum erweitern (11 statt 8)       | Bricht die bestehende Tenant-RBAC Logik, `PERMISSION_MATRIX` müsste umgebaut werden |
| ACL-basiert (Permissions in DB)          | Widersprüchlich zu "Code-definiert, NICHT in DB" Prinzip aus SECURITY §4.2          |
| OAuth/OIDC mit externem IdP              | Overkill für 3-10 Platform-User, unnötige Komplexität                               |
| Bestehende Tenant-Rollen wiederverwenden | Platform-Kontext != Tenant-Kontext, verschiedene Module + Permissions               |

**Was ändert sich:**

- `role` Feld BLEIBT unverändert (backward compatible)
- Neues `platformRole` Feld differenziert innerhalb Platform-Scope
- Neue Middleware `platformGuard()` parallel zu `roleGuard()`
- ~44 Inline-Checks in 12 Route-Dateien werden durch Middleware ersetzt

### Decision #32: Invite-basierter User-Onboarding Flow

**Problem:** Wie werden neue Platform-User erstellt?

**✅ DECISION: Email-Invite mit SHA-256 gehashtem Token, 72h TTL**

| Alternative          | Warum abgelehnt                                                       |
| :------------------- | :-------------------------------------------------------------------- |
| Admin setzt Passwort | Sicherheitsrisiko — Admin kennt initiales Passwort                    |
| Magic Link (Login)   | Kein Passwort-Setup möglich, nicht geeignet für Dauer-Zugang          |
| Self-Registration    | Platform-User sollen kontrolliert eingeladen werden, kein Open-Signup |

### Decision #33: Letzte-Owner Schutz

**Problem:** Was passiert wenn einziger `platform_owner` sich selbst degradiert/löscht?

**✅ DECISION:** Business-Logic Constraint — mindestens 1 `platform_owner` muss immer existieren.

```typescript
// VOR jeder Owner-Degradierung oder -Löschung:
const ownerCount = await User.countDocuments({ platformRole: 'platform_owner', status: 'active' });
if (ownerCount <= 1) throw new Error('LAST_OWNER_PROTECTED');
```

### Decision #34: Per-User Permission Overrides — Phase 2

**Problem:** Sollen individuelle Permission-Overrides sofort implementiert werden?

**✅ DECISION: Phase 1 → Nur rollenbasiert. Phase 2 (optional) → Per-User Overrides.**

**Begründung:** Bei 3-10 Platform-Usern reichen 3 Rollen völlig aus. Overrides erhöhen Komplexität in JWT, UI, und Middleware. Wenn später ein User spezifische Rechte braucht, kann `platformPermissionOverrides[]` aktiviert werden.

### Decision #35: JWT Payload Erweiterung

**Problem:** Sollen Platform-Permissions im JWT oder per API-Call aufgelöst werden?

**✅ DECISION: Im JWT Access Token (resolved Array)**

| Alternative                          | Warum abgelehnt                                           |
| :----------------------------------- | :-------------------------------------------------------- |
| Permissions per API-Call pro Request | Zusätzlicher DB-Roundtrip, erhöht Latenz                  |
| Nur `platformRole` im JWT            | Frontend muss Permission-Matrix duplizieren, nicht DRY    |
| Redis-gespeicherte Permissions       | Zusätzliche Infrastruktur-Abhängigkeit für Platform-Level |

**Tradeoff:** JWT wird ~100 Bytes größer. Bei 15min TTL und ~10 Modulen akzeptabel. Rollenänderung erzwingt Neu-Login (via `tokenVersion++`), was die Permission-Aktualisierung garantiert.

---

> **Letzte Aktualisierung:** 2026-07-10
> **Basiert auf:** Codebase Audit (alle 12 Platform-Routes, role-guard.ts, auth-guard.ts, user.model.ts, sidebar-config.ts, auth.store.ts)
> **Referenzen:** SECURITY_AND_ENCRYPTION.md §3-§4, V2_DATABASE.md §4.1, BUILD_RULES.md §3+§5+§17, V2_DECISION_LOG.md
> **Nächster Schritt:** Implementation gemäß §13 Implementierungsplan (3-4 Tage Sprint)

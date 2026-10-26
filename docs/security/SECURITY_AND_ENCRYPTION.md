# Dento v2 — Security & Encryption Architecture

> **Ziel:** 100% Security Coverage für alle Schichten des v2-Systems
> **Datum:** 2026-02-25
> **Quelle:** DENTO_V2_MASTER_PLAN.md + TECH_REQUIREMENTS.md
> **Standards:** OWASP Top 10, HIPAA (Dental Data), GDPR/DSGVO

---

## Inhaltsverzeichnis

1. [Security-Schichten Übersicht](#1-security-schichten-übersicht)
2. [Schicht 1 — Netzwerk & Transport](#2-schicht-1--netzwerk--transport)
3. [Schicht 2 — Authentifizierung](#3-schicht-2--authentifizierung)
4. [Schicht 3 — Autorisierung (RBAC)](#4-schicht-3--autorisierung-rbac)
5. [Schicht 4 — Daten-Verschlüsselung](#5-schicht-4--daten-verschlüsselung)
6. [Schicht 5 — API-Sicherheit](#6-schicht-5--api-sicherheit)
7. [Schicht 6 — Input Validation & Sanitization](#7-schicht-6--input-validation--sanitization)
8. [Schicht 7 — File Upload Security](#8-schicht-7--file-upload-security)
9. [Schicht 8 — Session & Token Management](#9-schicht-8--session--token-management)
10. [Schicht 9 — Audit & Monitoring](#10-schicht-9--audit--monitoring)
11. [Schicht 10 — Backup & Disaster Recovery](#11-schicht-10--backup--disaster-recovery)
12. [Schicht 11 — Tenant Isolation](#12-schicht-11--tenant-isolation)
13. [Schicht 12 — Frontend Security](#13-schicht-12--frontend-security)
14. [Schicht 13 — Mobile Security](#14-schicht-13--mobile-security)
15. [Schicht 14 — Compliance (HIPAA/GDPR)](#15-schicht-14--compliance-hipaagdpr)
16. [Schicht 15 — Dependencies & Supply Chain](#16-schicht-15--dependencies--supply-chain)
17. [Security Checklist (100%)](#17-security-checklist-100)

---

## 1. Security-Schichten Übersicht

```
┌──────────────────────────────────────────────────────────────────┐
│  SCHICHT 15: Supply Chain Security (npm audit, Dependabot)       │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 14: Compliance (HIPAA, GDPR/DSGVO)                     │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 13: Mobile Security (SecureStore, Biometrics, Cert Pin) │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 12: Frontend Security (CSP, XSS, CSRF)                 │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 11: Tenant Isolation (DB-per-Tenant, useDb Guard)       │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 10: Backup & Recovery (Encrypted Backups, SHA-256)      │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 9: Audit & Monitoring (Sentry, Audit Logs, Alerts)     │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 8: Session Management (JWT Rotation, Device Tracking)   │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 7: File Upload Security (Type Check, Size Limit, Scan)  │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 6: Input Validation (Zod Schemas, NoSQL Injection)      │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 5: API Security (Rate Limit, CORS, Helmet, API Keys)   │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 4: Daten-Verschlüsselung (At-Rest + In-Transit + App)  │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 3: Autorisierung (RBAC, 8 Rollen, Permission Matrix)   │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 2: Authentifizierung (JWT, Brute-Force, 2FA-ready)     │
├──────────────────────────────────────────────────────────────────┤
│  SCHICHT 1: Netzwerk & Transport (TLS 1.3, HSTS, Cloudflare)    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Schicht 1 — Netzwerk & Transport

### 2.1 TLS/SSL Everywhere

| Verbindung                 | Protokoll | Zertifikat               | Erzwungen |
| :------------------------- | :-------- | :----------------------- | :-------: |
| Browser → Admin Portal     | TLS 1.3   | Cloudflare Edge          |    ✅     |
| Browser → Developer Portal | TLS 1.3   | Cloudflare Edge          |    ✅     |
| Browser → API              | TLS 1.3   | Cloudflare → Railway/Fly |    ✅     |
| API → MongoDB Atlas        | TLS 1.2+  | Atlas CA Certificate     |    ✅     |
| API → Redis (Upstash)      | TLS 1.2+  | Upstash Certificate      |    ✅     |
| API → S3/R2                | TLS 1.3   | Cloudflare/AWS CA        |    ✅     |
| API → Stripe/Paymob        | TLS 1.2+  | Provider CA              |    ✅     |
| API → Resend/Twilio        | TLS 1.2+  | Provider CA              |    ✅     |
| Mobile → API               | TLS 1.3   | Certificate Pinning      |    ✅     |
| Socket.io (WSS)            | TLS 1.3   | Same as API              |    ✅     |

> **Kein HTTP erlaubt.** Alle Verbindungen sind verschlüsselt. HTTP → HTTPS Redirect via Cloudflare.

### 2.2 HTTP Security Headers (Fastify + @fastify/helmet)

```typescript
// apps/api/src/plugins/security.ts
import helmet from '@fastify/helmet';

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
      imgSrc: ["'self'", 'data:', 'https://cdn.dento.app'],
      connectSrc: ["'self'", 'wss://api.dento.app'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // Clickjacking-Schutz
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 63072000, // 2 Jahre
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  xContentTypeOptions: true, // nosniff
  xDnsPrefetchControl: true,
  xDownloadOptions: true,
  xFrameOptions: { action: 'deny' },
  xPermittedCrossDomainPolicies: true,
  xPoweredBy: false, // X-Powered-By Header entfernen
  xXssProtection: true,
});
```

### 2.3 CORS Konfiguration

```typescript
import cors from '@fastify/cors';

app.register(cors, {
  origin: [
    'https://admin.dento.app',
    'https://dev.dento.app',
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
    process.env.NODE_ENV === 'development' && 'http://localhost:3002',
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  credentials: true, // Cookies für Refresh Token
  maxAge: 86400, // Preflight Cache: 24h
});
```

### 2.4 Cloudflare DDoS & WAF

| Feature         | Konfiguration                              |
| :-------------- | :----------------------------------------- |
| DDoS Protection | Automatisch (Free Tier)                    |
| WAF Rules       | OWASP Core Ruleset                         |
| Bot Management  | Challenge verdächtige Clients              |
| Rate Limiting   | Cloudflare + Fastify (doppelte Schicht)    |
| IP Geoblocking  | Optional: Nur erlaubte Regionen            |
| SSL Mode        | Full (Strict) — End-to-End Verschlüsselung |

---

## 3. Schicht 2 — Authentifizierung

### 3.1 JWT Dual-Token Architektur

```
┌──────────────────────────────────────────────────────┐
│  Access Token (kurzlebig)        Refresh Token       │
│  ─────────────────────────       ──────────────────  │
│  Algorithmus: HS256              Algorithmus: HS256   │
│  Secret: JWT_ACCESS_SECRET       Secret: JWT_REFRESH  │
│  TTL: 15 Minuten                 TTL: 7 Tage         │
│  Speicher: Memory (JS Var)       Speicher: HttpOnly   │
│  Gesendet: Authorization Header  Cookie (Secure)      │
│  Bei Ablauf: Silent Refresh      Bei Ablauf: Re-Login │
└──────────────────────────────────────────────────────┘
```

| Eigenschaft  | Access Token                              | Refresh Token                                  |
| :----------- | :---------------------------------------- | :--------------------------------------------- |
| TTL          | 15 min                                    | 7 Tage                                         |
| Speicherort  | JavaScript Variable (kein localStorage!)  | HttpOnly + Secure + SameSite=Strict Cookie     |
| Gesendet via | `Authorization: Bearer <token>`           | Automatisch via Cookie                         |
| Payload      | `{ userId, tenantSlug, role, sessionId }` | `{ userId, sessionId, tokenVersion }`          |
| Rotation     | Nein                                      | Ja — bei jedem Refresh wird neues Paar erzeugt |
| Revocation   | Nein (kurzlebig)                          | Ja — via `tokenVersion` in DB                  |

### 3.2 Token Rotation & Revocation

```typescript
// Refresh Token Rotation:
// Jeder /api/auth/refresh Call erzeugt ein NEUES Token-Paar
// Das alte Refresh Token wird sofort ungültig

async function refreshTokens(oldRefreshToken: string) {
  const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);

  // Token-Version im User-Dokument prüfen
  const user = await User.findById(decoded.userId);
  if (user.tokenVersion !== decoded.tokenVersion) {
    // Token wurde bereits rotiert → Theft Detection!
    // ALLE Sessions dieses Users invalidieren
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
    throw new Error('TOKEN_REUSE_DETECTED');
  }

  // Neue Token-Version
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user, user.tokenVersion + 1),
  };
}
```

### 3.3 Passwort-Sicherheit

| Maßnahme            | Implementierung                                                   |
| :------------------ | :---------------------------------------------------------------- |
| Hashing-Algorithmus | **Argon2id** (64 MB Memory, 3 Iterationen, Parallelität 4)        |
| Minimum Länge       | 8 Zeichen                                                         |
| Komplexitätsregeln  | Min. 1 Großbuchstabe + 1 Zahl + 1 Sonderzeichen                   |
| Bekannte Passwörter | Check gegen Top-10.000 Passwort-Liste (Server-side)               |
| Passwort-Reset      | Einmal-Link (Token, 1h TTL, SHA-256 gehasht in DB)                |
| Alte Passwörter     | Letzte 5 Passwort-Hashes gespeichert → Wiederverwendung blockiert |
| Passwort-Änderung   | Altes Passwort muss eingegeben werden                             |

```typescript
// Argon2id Hashing — siehe apps/api/src/utils/password.ts
import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB RAM
  timeCost: 3, // 3 Iterationen
  parallelism: 4, // 4 Threads
  hashLength: 32, // 256-bit Output
};

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
```

> **v1-Kompatibilität:** Aus Dento v1 migrierte Passwörter sind bcrypt-Hashes.
> Beim ersten v2-Login verifiziert ein Compat-Shim mit `bcryptjs`, re-hasht mit
> Argon2id und speichert neu — danach ist der Hash Argon2id.

### 3.4 Brute-Force-Schutz (Progressive Cooldown)

```
Fehlversuche:  1-3     4-6       7-9        10-12      13-15     16+
Cooldown:       —      5 Min     15 Min     30 Min     1 Stunde  IP-Block
                ↓        ↓         ↓          ↓          ↓         ↓
               Frei  → Timer   → Timer    → Timer    → Timer   → Manuell
                       im UI     im UI      im UI      im UI     Entsperren
```

| Komponente | Technologie                                                |
| :--------- | :--------------------------------------------------------- |
| Zähler     | Redis Key: `login:attempts:{email}` (TTL 1h)               |
| Cooldown   | Redis Key: `login:cooldown:{email}` (TTL = Cooldown)       |
| IP-Block   | Redis Key: `login:ip_blocked:{ip}` (kein TTL → manuell)    |
| Audit      | `login_attempts` Collection (90 Tage Retention, TTL Index) |

### 3.5 Zwei-Faktor-Authentifizierung (2FA)

| Feature            |   Status   | Implementierung                                             |
| :----------------- | :--------: | :---------------------------------------------------------- |
| TOTP (Google Auth) |  ✅ Live   | `otplib` — TOTP Secret in verschlüsseltem User-Feld         |
| OTP via SMS        | 🔜 Phase 6 | Twilio — 6-digit Code, 5 Min TTL                            |
| OTP via Email      | 🔜 Phase 6 | Resend — 6-digit Code, 10 Min TTL                           |
| Biometric (Mobile) | 🔜 Phase 7 | `expo-local-authentication` (FaceID/Fingerprint)            |
| Recovery Codes     |  ✅ Live   | 10 Einmal-Codes, Argon2id-gehasht, bei Erstellung angezeigt |

---

## 4. Schicht 3 — Autorisierung (RBAC)

### 4.1 Drei-Ebenen Autorisierung

```
Request eingehend
  │
  ▼
[1] authGuard()      → JWT vorhanden + gültig + nicht abgelaufen?
  │
  ▼
[2] tenantDb()       → Tenant-Slug aus JWT → richtige DB gewählt?
  │                    → Tenant aktiv (nicht suspended/deleted)?
  │
  ▼
[3] roleGuard()      → Rolle hat Permission für diese Route + Methode?
  │                    → "Own Records Only" Scope erzwungen?
  │
  ▼
Daten zurückgeben (nur eigener Tenant, nur erlaubte Felder)
```

### 4.2 Permission Enforcement

```typescript
// Code-definierte Permissions (NICHT in DB — unveränderbar durch Tenants)
const ROLE_PERMISSIONS = {
  platform_admin: ['*'], // Alles
  tenant_admin: ['patients.*', 'appointments.*', 'charts.*', 'invoices.*' /* alle 28 Module */],
  dentist: [
    'patients.view',
    'patients.create',
    'patients.update',
    'appointments.own',
    'charts.*',
    'treatments.*',
    'prescriptions.*',
    'xrays.*',
    'cbct.*',
    'lab_orders.create',
    'lab_orders.view',
  ],
  receptionist: [
    'patients.*',
    'appointments.*',
    'invoices.*',
    'payments.*',
    'walkins.*',
    'notifications.send',
  ],
  // ... (7 Rollen insgesamt)
} as const;

// Route-Level Enforcement:
app.get('/api/patients', { preHandler: [authGuard, tenantDb, roleGuard('patients.view')] });
app.post('/api/patients', { preHandler: [authGuard, tenantDb, roleGuard('patients.create')] });
app.delete('/api/patients/:id', {
  preHandler: [authGuard, tenantDb, roleGuard('patients.delete')],
});
```

### 4.3 Row-Level Security (Own Records)

```typescript
// Für Rollen mit "➕ Own Records Only":
// dentist sieht NUR eigene Appointments, eigene Leave Requests, etc.

function ownRecordFilter(req: FastifyRequest, baseQuery: object) {
  const { role, userId } = req.user;

  if (role === 'tenant_admin' || role === 'platform_admin') {
    return baseQuery; // Kein Filter — sieht alles
  }

  const ownOnlyModules = OWN_RECORD_MODULES[role] || [];
  const moduleName = getModuleFromRoute(req.url);

  if (ownOnlyModules.includes(moduleName)) {
    return { ...baseQuery, doctorId: userId }; // Nur eigene Records
  }

  return baseQuery;
}
```

---

## 5. Schicht 4 — Daten-Verschlüsselung

### 5.1 Encryption at Rest

| Datenspeicher       | Verschlüsselung     | Algorithmus | Schlüssel-Management                |
| :------------------ | :------------------ | :---------- | :---------------------------------- |
| **MongoDB Atlas**   | ✅ Automatisch      | AES-256-CBC | Atlas KMS (AWS KMS/Azure Key Vault) |
| **Redis (Upstash)** | ✅ Automatisch      | AES-256     | Upstash Managed                     |
| **Cloudflare R2**   | ✅ Automatisch      | AES-256-GCM | Cloudflare Managed                  |
| **Backups (S3/R2)** | ✅ Zusätzlich       | AES-256-GCM | eigener Encryption Key              |
| **Mobile (Realm)**  | ✅ Realm Encryption | AES-256     | 64-byte Key in SecureStore          |

> **Alle Daten sind at-rest verschlüsselt** — in jedem Speichersystem.

### 5.2 Encryption in Transit

| Verbindung    | Verschlüsselung | Protokoll                             |
| :------------ | :-------------- | :------------------------------------ |
| Alle HTTP     | TLS 1.3         | HTTPS (Cloudflare Full Strict)        |
| WebSocket     | TLS 1.3         | WSS                                   |
| MongoDB       | TLS 1.2+        | `mongodb+srv://` (Atlas erzwingt TLS) |
| Redis         | TLS 1.2+        | `rediss://` (Upstash erzwingt TLS)    |
| S3/R2         | TLS 1.3         | HTTPS                                 |
| SMTP (Resend) | TLS 1.2+        | HTTPS API                             |

### 5.3 Application-Level Encryption (Sensitive Fields)

Bestimmte Felder werden **zusätzlich** auf Anwendungsebene verschlüsselt, bevor sie in MongoDB gespeichert werden:

```typescript
// Sensitive Fields — AES-256-GCM Verschlüsselung
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY; // 32 bytes (256 bit)
const ALGORITHM = 'aes-256-gcm';

function encryptField(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptField(encryptedData: string): string {
  const [ivHex, authTagHex, ciphertext] = encryptedData.split(':');
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

#### Welche Felder werden verschlüsselt?

| Collection      | Feld                       | Grund                                                |
| :-------------- | :------------------------- | :--------------------------------------------------- |
| `patients`      | `nationalId`               | Nationale ID-Nummer (PII)                            |
| `patients`      | `insurance[].policyNumber` | Versicherungsnummer                                  |
| `patients`      | `medicalHistory.notes`     | Medizinische Anamnese (PHI)                          |
| `users`         | `password`                 | Argon2id Hash (bereits gehasht, nicht verschlüsselt) |
| `api_keys`      | `secretKey`                | SHA-256 Hash (nur Prefix sichtbar: `sk_...xxxx`)     |
| `webhooks`      | `secret`                   | Webhook Signing Secret                               |
| `backup_config` | `encryptionKey`            | Backup-Verschlüsselungs-Key                          |
| `settings`      | `smtpPassword`             | Tenant SMTP Passwort (falls eigener Server)          |

### 5.4 Backup-Verschlüsselung

```
mongodump --db tenant_{slug}
  → gzip Komprimierung
  → AES-256-GCM Verschlüsselung (mit tenant-spezifischem Key)
  → SHA-256 Checksum Berechnung
  → Upload nach S3/R2 (Server-Side Encryption aktiviert)
  → Backup-Record: { filePath, checksum, fileSize, encryptionKeyId }
```

### 5.5 Schlüssel-Hierarchie

```
┌─────────────────────────────────────────────┐
│  Master Key (FIELD_ENCRYPTION_KEY)           │
│  Speicherort: Environment Variable           │
│  Rotation: Jährlich                          │
│  Backup: Offline in Tresor (nicht in Code!)  │
├─────────────────────────────────────────────┤
│  JWT Secrets                                 │
│  ├── JWT_ACCESS_SECRET  (Access Tokens)      │
│  ├── JWT_REFRESH_SECRET (Refresh Tokens)     │
│  └── PAYLOAD_SECRET     (Payload CMS Auth)   │
│  Speicherort: Environment Variables          │
│  Rotation: Bei Kompromittierung              │
├─────────────────────────────────────────────┤
│  API Keys (pro Tenant/Platform)              │
│  ├── Prefix: dento_live_... / dento_test_... │
│  ├── DB: SHA-256 Hash (nur Prefix sichtbar)  │
│  └── Generierung: nanoid(48)                 │
├─────────────────────────────────────────────┤
│  Webhook Secrets (pro Webhook Endpoint)      │
│  ├── Auto-generiert: nanoid(32)              │
│  ├── HMAC-SHA256 Signierung                  │
│  └── Im Header: X-Dento-Signature            │
├─────────────────────────────────────────────┤
│  VAPID Keys (Web Push)                       │
│  ├── VAPID_PUBLIC_KEY (im Frontend)          │
│  └── VAPID_PRIVATE_KEY (nur Backend)         │
├─────────────────────────────────────────────┤
│  Backup Keys (pro Tenant)                    │
│  ├── Abgeleitet vom Master Key + tenantSlug  │
│  └── HKDF (HMAC-based Key Derivation)        │
└─────────────────────────────────────────────┘
```

---

## 6. Schicht 5 — API-Sicherheit

### 6.1 Rate Limiting (Drei Ebenen)

| Ebene    | Tool                          | Limit            | Scope                |
| :------- | :---------------------------- | :--------------- | :------------------- |
| **CDN**  | Cloudflare                    | 1000 req/min/IP  | Global               |
| **API**  | `@fastify/rate-limit` + Redis | 100 req/min/User | Pro Auth-User        |
| **Auth** | Custom Redis                  | 10 req/min/IP    | Login/Register/Reset |

```typescript
import rateLimit from '@fastify/rate-limit';

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis: redisClient,
  keyGenerator: (req) => req.user?.userId || req.ip,
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Try again later.',
  }),
});

// Strengere Limits für Auth-Endpoints:
app.register(rateLimit, {
  max: 10,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  routePrefix: '/api/auth',
});
```

### 6.2 API Key Security

```typescript
// API Keys: Nie im Klartext gespeichert
// 1. Generierung: nanoid(48) → dento_live_xxxxxx...
// 2. Anzeige: Einmalig bei Erstellung (dann nie wieder)
// 3. DB-Speicher: SHA-256 Hash
// 4. Lookup: Hash vom Request-Key → DB-Abgleich
// 5. Prefix sichtbar: dento_live_...letzten_4_zeichen

import { createHash } from 'crypto';

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Rate Limit pro API Key (konfigurierbar im Dev Portal):
// Default: 1000 req/min, Max: 10000 req/min
```

### 6.3 Webhook Signierung

```typescript
// Jeder ausgehende Webhook wird mit HMAC-SHA256 signiert (Stripe-style Format)
import { createHmac } from 'crypto';

function signWebhookPayload(payload: string, secret: string, timestamp: number): string {
  // Signatur umfasst Timestamp + Payload um Replay-Attacken zu verhindern
  const signedContent = `${timestamp}.${payload}`;
  return createHmac('sha256', secret).update(signedContent).digest('hex');
}

// Header-Format (Stripe-kompatibel):
//   X-Dento-Signature: t=<unix_timestamp>,v1=<hmac_hex>
//   X-Dento-Timestamp: <unix_timestamp>
//
// Verifikation beim Empfänger:
//   1. Timestamp aus Header extrahieren
//   2. signedContent = `${timestamp}.${rawBody}` bilden
//   3. Erwartete Signatur mit HMAC-SHA256(secret, signedContent) berechnen
//   4. Timing-safe Vergleich der Signatur mit v1-Wert
//   5. Timestamp prüfen: max 5 Minuten alt (Replay-Schutz)
```

---

## 7. Schicht 6 — Input Validation & Sanitization

### 7.1 Zod Schema Validation (Shared)

```typescript
// Jeder API-Endpoint validiert Input mit Zod (aus packages/shared)
// Gleiche Schemas für Frontend-Validierung UND Backend-Enforcement

import { z } from 'zod';

const PatientCreateSchema = z
  .object({
    firstName: z.string().min(1).max(100).trim(),
    lastName: z.string().min(1).max(100).trim(),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9]{7,15}$/)
      .optional(),
    nationalId: z.string().max(20).optional(),
    dateOfBirth: z.coerce.date(),
    gender: z.enum(['male', 'female']),
    // KEINE unerwarteten Felder erlaubt:
  })
  .strict(); // ← .strict() lehnt unbekannte Keys ab
```

### 7.2 NoSQL Injection Prevention

```typescript
// MongoDB Operator Injection verhindern:
// Angreifer könnte { "$gt": "" } statt String senden

function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') return input;
  if (typeof input !== 'object' || input === null) return input;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    // Keys die mit $ beginnen blockieren (MongoDB Operators)
    if (key.startsWith('$')) {
      throw new Error(`Invalid key: ${key}`);
    }
    sanitized[key] = sanitizeInput(value);
  }
  return sanitized;
}

// Fastify Plugin — läuft vor JEDEM Request:
app.addHook('preValidation', async (req) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeInput(req.query);
  }
});
```

### 7.3 XSS Prevention

| Maßnahme                  | Implementierung                                          |
| :------------------------ | :------------------------------------------------------- |
| Output Encoding           | React escaped JSX automatisch (`{variable}`)             |
| CSP Header                | `script-src: 'self'` — kein Inline-JS                    |
| HTML Sanitization         | `DOMPurify` für Rich-Text-Felder (Procedure Notes, Chat) |
| `dangerouslySetInnerHTML` | **Verboten** — ESLint Rule erzwingt dies                 |

---

## 8. Schicht 7 — File Upload Security

### 8.1 Upload-Validierung

```typescript
// Mehrstufige Validierung für JEDEN Upload:
const UPLOAD_RULES = {
  xray: {
    maxSize: 25 * 1024 * 1024, // 25 MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/dicom', 'application/dicom'],
    extensions: ['.jpg', '.jpeg', '.png', '.dcm'],
  },
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  chatAttachment: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ['image/*', 'application/pdf', 'audio/*'],
    extensions: ['.jpg', '.png', '.pdf', '.mp3', '.ogg'],
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
  },
};
```

### 8.2 Upload Security Pipeline

```
Datei hochgeladen
  │
  ├─[1] Größen-Check     → > maxSize? → 413 Reject
  ├─[2] MIME-Type Check   → Magic Bytes prüfen (nicht nur Extension!)
  ├─[3] Extension Check   → Whitelist-Abgleich
  ├─[4] Filename Sanitize → Sonderzeichen entfernen, UUID als Dateiname
  ├─[5] Virus Scan        → ClamAV (optional, Phase 6+)
  ├─[6] Image Processing  → Sharp: Resize, Strip EXIF Metadata
  │
  ▼
  S3/R2 Upload (eigener Bucket: tenants/{slug}/...)
  → Pre-Signed Download URL (TTL: 1h, einmalig)
```

### 8.3 S3/R2 Bucket Policy

```
Bucket: dento-uploads
  ├── NICHT öffentlich zugänglich
  ├── Zugriff NUR via Pre-Signed URLs (Backend generiert)
  ├── Pre-Signed URL TTL: 1 Stunde (konfigurierbar)
  ├── CORS: Nur admin.dento.app + dev.dento.app
  └── Pfad-Isolation: tenants/{tenant_slug}/...
      → Tenant A kann NICHT auf Tenant B's Dateien zugreifen
```

---

## 9. Schicht 8 — Session & Token Management

### 9.1 Session Tracking

| Feature            | Implementierung                                        |
| :----------------- | :----------------------------------------------------- |
| Aktive Geräte      | `user_sessions` Collection (Browser, OS, IP, Location) |
| Remote Logout      | User kann einzelne Sessions oder alle beenden          |
| Session TTL        | MongoDB TTL Index → auto-cleanup abgelaufener Sessions |
| Device Fingerprint | UserAgent + IP + Screen Resolution Hash                |
| Anomalie-Erkennung | Neues Land → Email-Alert an User                       |
| Concurrent Limit   | Max 5 aktive Sessions pro User (konfigurierbar)        |

### 9.2 Token Security Rules

```
✅ Access Token NUR im Memory (JavaScript Variable)
✅ Refresh Token NUR in HttpOnly + Secure + SameSite=Strict Cookie
✅ Token Rotation bei jedem Refresh
✅ Token Reuse Detection → alle Sessions invalidieren
✅ sessionId im JWT → Session muss aktiv sein in DB
✅ tokenVersion im User-Dokument → globales Invalidieren möglich
❌ KEIN localStorage für Tokens
❌ KEIN sessionStorage für Tokens
❌ KEINE Token in URL-Parametern
❌ KEINE Token in Logs
```

---

## 10. Schicht 9 — Audit & Monitoring

### 10.1 Audit Logging (Jede Mutation)

```typescript
// Jede Datenänderung wird geloggt — UNVERÄNDERBAR
const auditLogSchema = {
  userId: ObjectId, // Wer
  tenantSlug: String, // Welcher Tenant
  action: String, // 'create' | 'update' | 'delete' | 'login' | 'export' | 'impersonate'
  resource: String, // 'patients' | 'invoices' | 'settings' | ...
  resourceId: String, // Dokument-ID
  changes: Object, // { before: {...}, after: {...} } (nur geänderte Felder)
  ipAddress: String,
  userAgent: String,
  metadata: Object, // Zusätzliche Infos (z.B. exportFormat, impersonatedTenantSlug)
  createdAt: Date, // TTL Index: 365 Tage
};
```

### 10.2 Sentry Error Tracking

| App              | Sentry Projekt    | Was wird erfasst                                |
| :--------------- | :---------------- | :---------------------------------------------- |
| API              | `dento-api`       | Unhandled Errors, Slow Queries, Memory Leaks    |
| Admin Portal     | `dento-admin`     | JavaScript Errors, Render Crashes, API Failures |
| Developer Portal | `dento-developer` | JavaScript Errors, API Failures                 |
| Mobile App       | `dento-mobile`    | Crashes, ANR, Native Errors                     |

### 10.3 Security Alerts

| Event                     | Alert-Kanal           | Aktion                              |
| :------------------------ | :-------------------- | :---------------------------------- |
| 5+ fehlgeschlagene Logins | Email + Slack         | IP prüfen, ggf. blocken             |
| IP geblockt (Brute-Force) | Slack                 | Audit Log prüfen                    |
| Token Reuse Detection     | Email an User + Slack | Alle Sessions invalidiert           |
| Neues Land bei Login      | Email an User         | "War das du?"                       |
| API Error Rate > 5%       | Slack + Sentry Alert  | Infrastruktur prüfen                |
| Ungewöhnliche Datenmenge  | Slack                 | Möglicher Data Exfiltration Versuch |
| Backup fehlgeschlagen     | Slack + Email         | Manuelles Backup + Investigation    |
| Dependency Vulnerability  | GitHub Dependabot     | Patch innerhalb 48h                 |

---

## 11. Schicht 10 — Backup & Disaster Recovery

### 11.1 Backup-Verschlüsselung

```
Backup-Pipeline:
  mongodump --db tenant_{slug} --archive
    → gzip -9 (Kompression)
    → AES-256-GCM Verschlüsselung
       Key: HKDF(masterKey, tenantSlug) → tenant-spezifischer Key
       IV: Random 16 bytes (gespeichert mit Backup)
    → SHA-256 Checksum (Integritäts-Prüfung)
    → Upload → S3/R2 (Server-Side Encryption: AES-256)
```

| Feature           | Detail                                           |
| :---------------- | :----------------------------------------------- |
| Frequenz          | Täglich 03:00 UTC (BullMQ Cron)                  |
| Retention         | 30 Tage (konfigurierbar, TTL Index)              |
| Verschlüsselung   | AES-256-GCM (Application) + AES-256 (S3 SSE)     |
| Integritäts-Check | SHA-256 Checksum bei Erstellung + Restore        |
| Restore-Test      | Monatlich automatisierter Restore-Test (Phase 6) |
| Geo-Redundanz     | S3/R2 Multi-Region (Cloudflare Global)           |
| Restore-Zeit      | < 15 Min für einzelnen Tenant                    |

### 11.2 Disaster Recovery Plan

| Szenario                |     RTO      | RPO | Maßnahme                                           |
| :---------------------- | :----------: | :-: | :------------------------------------------------- |
| Tenant-DB korrupt       |    15 Min    | 24h | Restore aus letztem Backup                         |
| API-Server Down         |    5 Min     |  0  | Auto-Restart (Railway Health Check)                |
| MongoDB Atlas Down      | 0 (Failover) |  0  | Atlas Auto-Failover (Replica Set)                  |
| Redis Down              |    2 Min     |  0  | Upstash Auto-Recovery                              |
| Kompletter Datenverlust |      1h      | 24h | Restore aller Tenants aus S3 Backups               |
| Ransomware              |      2h      | 24h | Backup-Key offline → Restore → Infra neu aufsetzen |

---

## 12. Schicht 11 — Tenant Isolation

### 12.1 Database-per-Tenant Garantie

```
Tenant A (tenant_clinic_cairo)    Tenant B (tenant_clinic_riyadh)
  ┌──────────────────────┐          ┌──────────────────────┐
  │ patients             │          │ patients             │
  │ appointments         │          │ appointments         │
  │ invoices             │          │ invoices             │
  │ ...                  │          │ ...                  │
  └──────────────────────┘          └──────────────────────┘
           │                                  │
           │ KOMPLETT ISOLIERT                 │
           │ Kein SELECT/JOIN möglich          │
           │ Separater mongodump              │
           │ Separate Indexes                 │
           │ dropDatabase() löscht NUR eine   │
```

### 12.2 Isolation-Enforcement

| Schicht        | Schutz               | Wie                                            |
| :------------- | :------------------- | :--------------------------------------------- |
| JWT            | Tenant-Slug im Token | User kann nur seinen Tenant ansprechen         |
| Middleware     | `tenantDb()`         | `useDb()` wählt DB basierend auf Token         |
| Route Guard    | Tenant-Check         | Kein Cross-Tenant-Zugriff via URL-Manipulation |
| File Storage   | Pfad-Prefix          | `tenants/{slug}/...` — Bucket-Policy erzwingt  |
| Backup         | Per-DB               | `mongodump --db tenant_{slug}`                 |
| DSGVO-Löschung | `dropDatabase()`     | Garantiert vollständige Löschung               |
| Webhook        | Tenant-scoped        | Webhook-Events nur für eigenen Tenant          |
| Socket.io      | Room-based           | `tenant:{slug}` Room — kein Cross-Tenant       |
| Chat           | Tenant-DB            | Nachrichten in Tenant-DB, nicht global         |

---

## 13. Schicht 12 — Frontend Security

### 13.1 React/Vite Sicherheit

| Maßnahme              | Detail                                                            |
| :-------------------- | :---------------------------------------------------------------- |
| CSP                   | `script-src: 'self'` — kein CDN, kein Inline-JS                   |
| XSS                   | React escaped automatisch, `dangerouslySetInnerHTML` verboten     |
| CSRF                  | Kein Cookie-basierter Auth für API Calls (Bearer Token im Header) |
| Token Storage         | Access Token in Memory, Refresh Token in HttpOnly Cookie          |
| Env Variables         | `VITE_*` Prefix — nur explizit exponierte Vars im Bundle          |
| Source Maps           | **Deaktiviert** in Production (`build.sourcemap: false`)          |
| Bundle Analysis       | Keine Secrets im Frontend-Bundle (CI Check)                       |
| subresource Integrity | SRI Hashes für externe Scripts (falls nötig)                      |

### 13.2 Frontend Validation (Double Validation)

```
User Input → [1] Frontend Zod Validation (UX: sofortiges Feedback)
           → [2] Backend Zod Validation  (Security: Server erzwingt)
           → [3] Mongoose Schema         (DB: letzte Verteidigungslinie)

→ DREI Validierungsschichten für jeden Input
```

---

## 14. Schicht 13 — Mobile Security

| Maßnahme                | Implementierung                                          |
| :---------------------- | :------------------------------------------------------- |
| Token Storage           | `expo-secure-store` (Keychain/Keystore, Hardware-backed) |
| Biometric Auth          | `expo-local-authentication` (FaceID / Fingerprint)       |
| Certificate Pinning     | Public Key Pinning für api.dento.app                     |
| Realm Encryption        | AES-256, Key in SecureStore                              |
| App Transport Security  | iOS: `NSAppTransportSecurity` erzwingt HTTPS             |
| ProGuard/R8             | Android: Code Obfuscation                                |
| Jailbreak Detection     | Check bei App-Start (Warnung, nicht Block)               |
| Clipboard Protection    | Sensitive Daten nach 30s aus Clipboard entfernen         |
| Screenshot Prevention   | Optional: Screenshot-Block für sensitive Screens         |
| Network Security Config | Android: Nur TLS, kein Cleartext                         |
| Offline-Daten           | Realm encrypted, auto-wipe nach 30 Tagen Inaktivität     |

---

## 15. Schicht 14 — Compliance (HIPAA/GDPR)

### 15.1 HIPAA (Health Insurance Portability and Accountability Act)

| Anforderung                 | Dento v2 Implementierung                                           |
| :-------------------------- | :----------------------------------------------------------------- |
| **Access Control**          | RBAC mit 8 Rollen, roleGuard() auf jeder Route                     |
| **Audit Controls**          | Jede Mutation geloggt, 365 Tage Retention                          |
| **Integrity Controls**      | SHA-256 Checksums auf Backups, MongoDB Journaling                  |
| **Transmission Security**   | TLS 1.3 überall, keine unverschlüsselte Kommunikation              |
| **Encryption (at rest)**    | AES-256 auf allen Datenspeichern                                   |
| **Encryption (PHI fields)** | AES-256-GCM auf Patient-PII-Feldern                                |
| **Minimum Necessary**       | Rollen sehen nur das, was sie brauchen (Permission Matrix)         |
| **Emergency Access**        | `platform_admin` Impersonation (60 Min, Audit-Trail)               |
| **Automatic Logoff**        | Session Timeout (konfigurierbar, Default: 30 Min Inaktivität)      |
| **Device Management**       | Active Sessions Dashboard + Remote Logout                          |
| **BAA**                     | Business Associate Agreement mit MongoDB Atlas, Cloudflare, Stripe |

### 15.2 GDPR/DSGVO

| Anforderung                     | Dento v2 Implementierung                                   |
| :------------------------------ | :--------------------------------------------------------- |
| **Recht auf Auskunft**          | Patienten-Daten Export (JSON/PDF) per API                  |
| **Recht auf Löschung**          | Patient Soft-Delete + Hard-Delete nach 30 Tagen            |
| **Recht auf Datenportabilität** | `mongodump` pro Tenant → Download als Archive              |
| **Datenminimierung**            | Nur notwendige Felder gesammelt                            |
| **Einwilligung**                | Consent Forms mit Signatur + PDF                           |
| **Breach Notification**         | Sentry Alert → Slack → Email (< 72h Frist einhalten)       |
| **Privacy by Design**           | Tenant-Isolation, Verschlüsselung, Audit Logs              |
| **Data Retention**              | Konfigurierbare Retention-Perioden (Chat: 365d, Logs: 90d) |
| **Tenant-Löschung**             | `db.dropDatabase()` — garantiert vollständige Löschung     |

---

## 16. Schicht 15 — Dependencies & Supply Chain

### 16.1 Automatisierte Sicherheit

| Tool                            | Zweck                                            | Frequenz                 |
| :------------------------------ | :----------------------------------------------- | :----------------------- |
| `npm audit`                     | Bekannte Vulnerabilities in Dependencies         | Bei jedem `pnpm install` |
| **Dependabot**                  | Automatische Security PRs für veraltete Packages | Täglich                  |
| `pnpm audit --audit-level=high` | CI Pipeline: Build bricht bei High/Critical      | Jeder Push               |
| **Socket.dev** (optional)       | Supply Chain Attack Detection                    | Jeder Push               |
| `license-checker`               | Lizenz-Compliance (keine GPL in Production)      | Monatlich                |

### 16.2 CI Security Gate

```yaml
# .github/workflows/ci.yml — Security Step
- name: Security Audit
  run: |
    pnpm audit --audit-level=high
    # Bricht Build bei high/critical Vulnerabilities

- name: Secret Scan
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    # Findet versehentlich committete Secrets/Keys
```

---

## 17. Security Checklist (100%)

### Netzwerk & Transport

- [ ] TLS 1.3 auf allen Verbindungen
- [ ] HSTS Header (2 Jahre, includeSubDomains, preload)
- [ ] Cloudflare Full (Strict) SSL Mode
- [ ] HTTP → HTTPS Redirect
- [ ] Cloudflare DDoS + WAF aktiv
- [ ] No HTTP Fallback möglich

### Authentifizierung

- [ ] JWT Dual-Token (Access 15min + Refresh 7d HttpOnly Cookie)
- [ ] Token Rotation bei jedem Refresh
- [ ] Token Reuse Detection → alle Sessions invalidieren
- [ ] Argon2id (64 MB, 3 Iterationen, Parallelität 4) für Passwort-Hashing
- [ ] Passwort-Komplexität erzwungen (8+ Zeichen, Upper+Number+Special)
- [ ] Letzte 5 Passwörter gesperrt
- [ ] Passwort-Reset Token (SHA-256, 1h TTL)
- [ ] Brute-Force mit Progressive Cooldown (5min→15min→30min→1h→IP-Block)
- [ ] Login-Attempts Audit Trail (90 Tage)
- [ ] Session-Tracking (Geräte, IP, Location)
- [ ] Remote Logout (einzeln + alle)
- [ ] Max 5 gleichzeitige Sessions pro User

### Autorisierung

- [ ] 3-stufige Middleware: authGuard → tenantDb → roleGuard
- [ ] 8 Code-definierte Rollen (unveränderbar durch Tenants)
- [ ] Permission Matrix (28 Module × 8 Rollen)
- [ ] Row-Level Security (Own Records Only für bestimmte Rollen)
- [ ] Platform-Admin kann nicht von Tenant-Admin erstellt werden
- [ ] Tenant-User kann nicht auf Dev Portal zugreifen

### Verschlüsselung

- [ ] MongoDB Atlas: AES-256-CBC at rest (Atlas KMS)
- [ ] Redis (Upstash): AES-256 at rest
- [ ] S3/R2: AES-256-GCM at rest (SSE)
- [ ] Backups: AES-256-GCM (Application-Level) + S3 SSE
- [ ] Backup-Integrität: SHA-256 Checksum
- [ ] PII-Felder: AES-256-GCM Application-Level Encryption
- [ ] TLS 1.2+ für alle Verbindungen in-transit
- [ ] VAPID Keys für Web Push
- [ ] Webhook Secrets: HMAC-SHA256 Signierung
- [ ] API Keys: SHA-256 gehasht in DB
- [ ] Schlüssel-Rotation: Jährlich (Master Key)
- [ ] Mobile Realm: AES-256, Key in SecureStore

### API-Sicherheit

- [ ] Rate Limiting: 3 Ebenen (Cloudflare + Fastify + Auth)
- [ ] CORS: Nur erlaubte Origins
- [ ] Helmet: Alle Security Headers
- [ ] CSP: script-src 'self' only
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Powered-By: entfernt
- [ ] API Keys nicht im Klartext
- [ ] Webhook Signierung (HMAC-SHA256 + Timestamp)

### Input Validation

- [ ] Zod Schemas auf jedem API-Endpoint (.strict())
- [ ] NoSQL Injection Prevention ($ Operator Blockierung)
- [ ] XSS Prevention (React Auto-Escape + CSP + DOMPurify)
- [ ] `dangerouslySetInnerHTML` ESLint-geblockt
- [ ] Double Validation: Frontend Zod + Backend Zod + Mongoose Schema

### File Upload

- [ ] MIME-Type via Magic Bytes (nicht Extension)
- [ ] Whitelist erlaubter Typen
- [ ] Größen-Limits pro Upload-Typ
- [ ] Dateiname sanitized (UUID)
- [ ] EXIF Metadata stripped (Sharp)
- [ ] S3/R2: Nicht öffentlich, nur Pre-Signed URLs (1h TTL)
- [ ] Pfad-Isolation: tenants/{slug}/...

### Tenant Isolation

- [ ] Database-per-Tenant (separater `useDb()` Call)
- [ ] JWT enthält tenantSlug
- [ ] Kein Cross-Tenant-Zugriff via API
- [ ] Kein Cross-Tenant-Zugriff via File Storage
- [ ] Socket.io Rooms: tenant:{slug}
- [ ] Webhooks: Nur eigener Tenant
- [ ] DSGVO-Löschung: `dropDatabase()`

### Audit & Monitoring

- [ ] Jede Mutation geloggt (userId, action, before/after, IP)
- [ ] Sentry auf allen 4 Apps (API, Admin, Developer, Mobile)
- [ ] Security Alerts (Slack + Email)
- [ ] Login-History einsehbar
- [ ] Support-Impersonation Audit-Trail
- [ ] Backup-Status Monitoring

### Frontend

- [ ] Access Token nur in Memory
- [ ] Refresh Token in HttpOnly Cookie
- [ ] Source Maps deaktiviert in Production
- [ ] Keine Secrets im Frontend-Bundle
- [ ] VITE\_\* Prefix für Environment Variables

### Mobile

- [ ] Tokens in SecureStore (Hardware-backed)
- [ ] Biometric Auth optional
- [ ] Certificate Pinning
- [ ] Realm encrypted
- [ ] Jailbreak Detection
- [ ] Network Security Config (kein Cleartext)
- [ ] Offline-Daten auto-wipe nach 30 Tagen

### Compliance

- [ ] HIPAA: Access Control + Audit + Encryption + Transmission Security
- [ ] GDPR: Auskunft + Löschung + Portabilität + Einwilligung
- [ ] Data Retention konfigurierbar
- [ ] Breach Notification Prozess (< 72h)

### Supply Chain

- [ ] `pnpm audit --audit-level=high` in CI
- [ ] Dependabot aktiviert
- [ ] TruffleHog Secret Scanning in CI
- [ ] Keine GPL Dependencies in Production
- [ ] Lock-File (`pnpm-lock.yaml`) committed

---

## Zusammenfassung: Verschlüsselungs-Algorithmen

| Zweck                  | Algorithmus         | Schlüssellänge  | Wo                             |
| :--------------------- | :------------------ | :-------------- | :----------------------------- |
| Passwort-Hashing       | Argon2id            | 64 MB, t=3, p=4 | Users Collection               |
| Feld-Verschlüsselung   | AES-256-GCM         | 256 bit         | Patient PII, API Keys, Secrets |
| Backup-Verschlüsselung | AES-256-GCM         | 256 bit         | S3/R2 Backups                  |
| DB at-rest             | AES-256-CBC         | 256 bit         | MongoDB Atlas (managed)        |
| Cache at-rest          | AES-256             | 256 bit         | Redis/Upstash (managed)        |
| Storage at-rest        | AES-256-GCM         | 256 bit         | Cloudflare R2 (SSE)            |
| Transport              | TLS 1.3             | 256 bit         | Alle Verbindungen              |
| Webhook Signierung     | HMAC-SHA256         | 256 bit         | Ausgehende Webhooks            |
| API Key Hash           | SHA-256             | 256 bit         | API Keys in DB                 |
| Backup Checksum        | SHA-256             | 256 bit         | Backup-Integrität              |
| JWT Signierung         | HS256 (HMAC-SHA256) | 256 bit         | Access + Refresh Tokens        |
| Key Derivation         | HKDF-SHA256         | 256 bit         | Tenant-spezifische Backup-Keys |
| Mobile DB              | AES-256             | 256 bit         | Realm Encryption               |
| Reset Token            | SHA-256             | 256 bit         | Password Reset Tokens          |

> **Alles 256-bit** — konsistente Schlüssellänge über alle Schichten.

---

> **Letzte Aktualisierung:** 2026-02-25
> **Basiert auf:** DENTO_V2_MASTER_PLAN.md (§27 Auth & RBAC, §33 Infra, §34 Schema)
> **15 Security-Schichten — 80+ Checkpoints — 14 Verschlüsselungs-Algorithmen**

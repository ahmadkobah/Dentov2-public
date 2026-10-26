# Dento v2 — Environment & Technology Setup Report

> **Generated:** 2026-02-27 | **Updated:** 2026-02-27
> **Source:** Codebase scan of `env.ts`, `.env.example`, all provider files, planning docs + `DENTO_V2_MASTER_PLAN.md`
> **Status:** Weeks 1–14 implemented | Build 5/5 | Tests 92/92

---

## Table of Contents

1. [Architecture Overview — Who Owns What](#1-architecture-overview--who-owns-what)
2. [PART A — Developer (Platform Owner) Setup](#2-part-a--developer-platform-owner-setup)
3. [PART B — Tenant (Clinic) Setup](#3-part-b--tenant-clinic-setup)
4. [Channel-by-Channel: Developer vs Tenant](#4-channel-by-channel-developer-vs-tenant)
5. [Complete `.env` Variable Reference](#5-complete-env-variable-reference)
6. [Technology Stack](#6-technology-stack)
7. [Production Checklist](#7-production-checklist)

---

## 1. Architecture Overview — Who Owns What

```
┌────────────────────────────────────────────────────────────────────┐
│                    PLATFORM (Developer / You)                      │
│                                                                    │
│  .env file (server)         dento_platform DB                      │
│  ┌──────────────────┐       ┌──────────────────────┐              │
│  │ MongoDB URI       │       │ tenants              │              │
│  │ Redis URL         │       │ country_config       │              │
│  │ JWT Secrets       │       │ modules              │              │
│  │ Resend API Key    │       │ pricing_config       │              │
│  │ Twilio Creds      │       │ platform_settings    │              │
│  │ Meta WA Token     │       │ api_keys             │              │
│  │ VAPID Keys        │       │ support_sessions     │              │
│  │ S3/R2 Keys        │       └──────────────────────┘              │
│  │ Stripe Keys       │                                             │
│  │ Paymob Keys       │       Managed via: Dev Portal               │
│  │ Sentry DSN        │       + docker-compose.yml                  │
│  └──────────────────┘                                              │
├────────────────────────────────────────────────────────────────────┤
│                   TENANT (Clinic / Customer)                       │
│                                                                    │
│  NO .env access             tenant_{slug} DB                       │
│  NO server access           ┌──────────────────────┐              │
│                              │ settings (6 keys)    │              │
│  Everything via              │ notification_templates│              │
│  Admin Portal UI             │ notification_prefs   │              │
│                              │ webhook_endpoints    │              │
│  + Their own website         │ branding             │              │
│    (external, self-hosted)   │ branches             │              │
│                              │ doctor_schedules     │              │
│                              └──────────────────────┘              │
│                                                                    │
│  Tenant's own external       Managed via: Admin Portal             │
│  accounts (separate):        + Onboarding Wizard                   │
│  - Website (Wix/WordPress)                                         │
│  - WhatsApp Business #                                             │
│  - Clinic email domain                                             │
│  - Clinic phone number                                             │
│  - Patient payment gateway                                         │
└────────────────────────────────────────────────────────────────────┘
```

**Key principle:** All messaging/payment **provider credentials** live in the platform `.env`. Tenants only **toggle on/off** and **configure preferences** via the Admin Portal UI. Tenants bring their **own external assets** (website, WhatsApp number, email domain) that are NOT managed by Dento.

---

## 2. PART A — Developer (Platform Owner) Setup

Everything below is **your responsibility** — set once, serves all tenants.

### 2.1 Infrastructure (Docker Compose)

| Service     | Image            | Port  | Production            | Env Var       | Required?                                 |
| ----------- | ---------------- | ----- | --------------------- | ------------- | ----------------------------------------- |
| **MongoDB** | `mongo:7`        | 27017 | MongoDB Atlas (M10+)  | `MONGODB_URI` | **Yes** — app won't start                 |
| **Redis**   | `redis:7-alpine` | 6379  | Upstash / Redis Cloud | `REDIS_URL`   | **Yes** — rate-limiter, BullMQ, Socket.io |

### 2.2 External Accounts You Must Create

| #   | Service           | Sign Up               | Free Tier        | When Needed     | What It Powers                                       |
| --- | ----------------- | --------------------- | ---------------- | --------------- | ---------------------------------------------------- |
| 1   | **MongoDB Atlas** | mongodb.com/atlas     | M0 (512MB)       | Day 1           | All databases (platform + tenant DBs)                |
| 2   | **Cloudflare R2** | dash.cloudflare.com   | 10GB / 10M reads | Before uploads  | X-rays, avatars, CBCT, documents                     |
| 3   | **Resend**        | resend.com            | 100 emails/day   | Before invites  | Email for ALL tenants (invites, reminders, invoices) |
| 4   | **Twilio**        | twilio.com            | $15 trial        | When SMS needed | SMS for ALL tenants (reminders, OTP)                 |
| 5   | **Meta Business** | business.facebook.com | Free             | When WA needed  | WhatsApp for ALL tenants (reminders)                 |
| 6   | **Stripe**        | stripe.com            | Test free        | Phase 2         | **SaaS billing** — tenants pay YOU                   |
| 7   | **Paymob**        | paymob.com            | Test free        | Phase 2         | **SaaS billing** — Egypt tenants pay YOU             |
| 8   | **Sentry**        | sentry.io             | 5K events/mo     | Production      | Error monitoring                                     |
| 9   | **Cloudflare**    | cloudflare.com        | Free             | Production      | DNS, CDN, DDoS protection                            |
| 10  | **Upstash**       | upstash.com           | 10K cmd/day      | Production      | Managed Redis                                        |

### 2.3 Platform-Level Database Config (Dev Portal)

These are set via the **Dev Portal UI**, not `.env`:

| Config                | Collection          | What You Set                                                                                                                                                  |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Country rules**     | `country_config`    | Tax rate (14% Egypt), tax label, phone prefix (+20), payment provider (paymob/stripe), date format, phone mask — **locked per country, tenants can't change** |
| **Module catalog**    | `modules`           | Available modules, versions, pricing tiers, canary rollout %                                                                                                  |
| **Per-tenant limits** | `tenants`           | maxUsers, maxPatients, maxBranches, maxStorageGB, featureFlags, subscriptionStatus                                                                            |
| **Platform globals**  | `platform_settings` | maintenanceMode, defaultTimezone, defaultCurrency, registrationEnabled, supportEmail                                                                          |
| **Pricing**           | `pricing_config`    | Module prices, coupons, discounts, trial periods                                                                                                              |

### 2.4 What You're Providing to ALL Tenants (Shared)

| Channel          | Your Account               | How It Works                                                                                                                      |
| ---------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Email**        | 1 Resend account (or SMTP) | Platform sends on behalf of all clinics. Tenant branding (logo, clinic name) injected into templates. Sender: `noreply@dento.app` |
| **SMS**          | 1 Twilio account           | Platform sends from 1 phone number for all clinics. Tenant name in message body                                                   |
| **WhatsApp**     | 1 Meta Business account    | Platform sends from 1 WhatsApp Business number. Uses approved templates with tenant-specific variables                            |
| **Push**         | 1 VAPID keypair            | Platform sends browser push to all tenants' users                                                                                 |
| **File Storage** | 1 R2 bucket                | All tenants share the bucket, files namespaced by `tenant_{slug}/`                                                                |
| **SaaS Billing** | Your Stripe + Paymob       | Tenants pay you for subscription. Auto-selected by country                                                                        |

---

## 3. PART B — Tenant (Clinic) Setup

Everything below is what **each clinic** does — through the Admin Portal UI or externally.

### 3.1 Admin Portal Configuration (In-App, No Code)

| Step | What                                                                  | Where in Admin Portal                    | Settings Key             |
| ---- | --------------------------------------------------------------------- | ---------------------------------------- | ------------------------ |
| 1    | **Accept invite + set password**                                      | Email → Activation link                  | —                        |
| 2    | **Onboarding Wizard (4 steps)**                                       | Auto-shown on first login                | —                        |
|      | Step 1: Clinic name, country, address, phone, email                   | Onboarding → Clinic Info                 | `settings.clinic`        |
|      | Step 2: Create first branch (name, hours, address)                    | Onboarding → Branch                      | `branches`               |
|      | Step 3: Confirm admin user details                                    | Onboarding → Admin User                  | `users`                  |
|      | Step 4: Language + currency + timezone                                | Onboarding → Locale                      | `settings.clinic`        |
| 3    | **Upload logo + set branding colors**                                 | Settings → Branding                      | `settings.branding`      |
| 4    | **Configure working hours**                                           | Settings → Branch Hours                  | `branches.workingHours`  |
| 5    | **Set Ramadan hours** (if applicable)                                 | Settings → Branch Hours                  | `branches.ramadanHours`  |
| 6    | **Invite staff** (doctors, receptionists, etc.)                       | Users → Invite                           | `users`                  |
| 7    | **Set doctor schedules**                                              | Scheduling → Doctor Schedules            | `doctor_schedules`       |
| 8    | **Configure appointment types** (Checkup, Root Canal, etc.)           | Settings → Appointment Types             | `appointment_types`      |
| 9    | **Add services + pricing**                                            | Services → Catalog                       | `services`               |
| 10   | **Enable/disable notifications**                                      | Settings → Notifications                 | `settings.notifications` |
| 11   | **Configure billing** (invoice prefix, payment methods, installments) | Settings → Billing                       | `settings.billing`       |
| 12   | **Enable online booking**                                             | Settings → Appointments → Online Booking | `settings.appointment`   |
| 13   | **Set security policies** (2FA, session timeout)                      | Settings → Security                      | `settings.security`      |
| 14   | **Configure webhooks** (connect to their website/CRM)                 | Settings → Webhooks                      | `webhook_endpoints`      |
| 15   | **Get API key** for online booking integration                        | Settings → API Keys                      | `api_keys`               |

### 3.2 Tenant Settings Detail (6 Keys in `settings` Collection)

Each tenant's `tenant_{slug}` database has a `settings` collection with these keys:

**`clinic`** — General info

- `name` (bilingual), `phone`, `email`, `website`, `logo`, `address`
- `timezone`, `defaultLanguage`, `dateFormat`, `timeFormat`
- `currency`, `taxEnabled`, `taxPercentage`, `fiscalYearStart`

**`appointment`** — Scheduling rules

- `slotDuration` (5–240 min), `bufferTime`, `maxAdvanceBookingDays`
- `autoConfirm`, `walkInEnabled`, **`onlineBookingEnabled`**
- `reminderHoursBefore` (e.g. `[24, 2]`), `autoNoShowMinutes`
- `workingDays`, `workingHoursStart/End`
- `ramadanScheduleActive`, `ramadanStart/End`

**`billing`** — Financial rules

- `invoicePrefix`, `invoiceStartNumber`, `paymentMethods` (cash, card, etc.)
- `defaultPaymentTermDays`, `enableInstallments`, `enableInsurance`

**`notifications`** — Channel toggles

- `emailEnabled` (default: true), `smsEnabled` (default: false)
- `whatsappEnabled` (default: false), `pushEnabled` (default: true)
- `quietHoursStart/End`, `defaultLanguage`

**`security`** — Access policies

- `require2FA`, `require2FAForRoles`, `allow2FAMethods`
- `sessionTimeoutMinutes`, `maxLoginAttempts`

**`inventory`** — Stock management

- `lowStockThreshold`, `expiryAlertDays`, `autoReorderEnabled`

### 3.3 Tenant's Own External Assets (Outside Dento)

These are things the **clinic owns and manages independently** — Dento does not host or provide them:

| Asset                              | Tenant Creates This                                                                                                            | How It Connects to Dento                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Website**                        | Clinic builds/hosts their own website (Wix, WordPress, custom). Website Builder was **removed from v2** — not built into Dento | Embeds online booking via **Dento API Key** + Public Booking API (4 endpoints: branches, doctors, slots, book)                                                 |
| **WhatsApp Business Number**       | Clinic has their own WhatsApp Business account + phone number for direct patient communication                                 | **Not connected to Dento.** Dento sends automated reminders from the **platform** WhatsApp number, not the clinic's. Clinic uses their own WA for manual chats |
| **Email Domain**                   | Clinic has their own email (e.g. `info@myclinic.com`) for direct communication                                                 | Stored in `settings.clinic.email` for display on invoices/prescriptions. Dento sends automated emails from `noreply@dento.app` (platform account)              |
| **Phone Number**                   | Clinic has their own phone line for calls                                                                                      | Stored in `settings.clinic.phone` for display on documents. **No VoIP/call integration** in Dento                                                              |
| **Patient Payment Gateway**        | If clinic wants to accept online payments from patients (not SaaS billing)                                                     | **Not yet fully implemented** (~5% complete). Currently patients pay cash/manual. Future: tenant-level Paymob/Stripe iframe in Invoice Detail page             |
| **Google Business / Social Media** | Clinic manages their own Google listing, Facebook page, Instagram                                                              | Not connected to Dento                                                                                                                                         |
| **Domain / SSL**                   | Clinic's website domain and certificate                                                                                        | Clinic manages their own hosting                                                                                                                               |

### 3.4 Tenant's Online Booking Flow

```
Clinic Website (Wix/WordPress/Custom)
        │
        │ Uses API Key from Admin Portal → Settings → API Keys
        │
        ▼
Dento Public Booking API (4 endpoints)
        │
        ├── GET  /api/public/booking/branches     → List branches
        ├── GET  /api/public/booking/doctors       → List doctors
        ├── GET  /api/public/booking/slots         → Get available slots
        └── POST /api/public/booking/appointments  → Book appointment
        │
        ▼
Receptionist sees new booking in Admin Portal
        │
        ├── Confirm → Patient notified (email/SMS/WhatsApp via platform)
        ├── Modify + Confirm → Patient notified
        └── Reject → Patient notified
```

**No embeddable widget is provided** — the tenant uses the REST API with their API key to build their own booking UI on their website, or uses a third-party booking widget that talks to the API.

---

## 4. Channel-by-Channel: Developer vs Tenant

| Channel              | Developer (You) Sets Up                                                                                                      | Tenant (Clinic) Sets Up                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email**            | `RESEND_API_KEY` or `SMTP_*` creds in `.env`. Single account for all tenants. Sends from `noreply@dento.app`                 | Toggle `emailEnabled` on/off. Customize notification templates (bilingual). Set `settings.clinic.email` for display on documents. **Own email domain** for manual communication |
| **SMS**              | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`. Single Twilio number for all tenants             | Toggle `smsEnabled` on/off. Customize SMS templates. **Own phone** for manual calls                                                                                             |
| **WhatsApp**         | `META_WHATSAPP_PHONE_ID`, `META_WHATSAPP_TOKEN` in `.env`. Single Meta Business number for automated messages                | Toggle `whatsappEnabled` on/off. Customize WA templates. **Own WhatsApp Business number** for manual patient chats (NOT connected to Dento)                                     |
| **Push**             | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` in `.env`. Single keypair                                                            | Toggle `pushEnabled` on/off. Users can individually opt in/out                                                                                                                  |
| **Online Booking**   | Public Booking API (4 endpoints). Dento hosts the API                                                                        | Enable `onlineBookingEnabled`. Configure per-branch booking rules. Get **API Key**. **Build booking UI on their own website**                                                   |
| **Patient Payments** | **Future:** Tenant-level Paymob/Stripe config (currently ~5% done)                                                           | Configure `settings.billing.paymentMethods` (cash, card, etc.). **Currently: cash + manual recording only**                                                                     |
| **SaaS Billing**     | `STRIPE_SECRET_KEY`, `PAYMOB_API_KEY` in `.env`. Platform-owned merchant account. Provider auto-selected by `country_config` | Tenant sees billing page in Admin Portal. Chooses payment method (card/Fawry/wallet). Sets auto-pay. **Pays YOU**                                                               |
| **File Storage**     | `S3_*` keys in `.env`. Single R2 bucket                                                                                      | Upload via Admin Portal (X-rays, avatars, docs). Auto-namespaced per tenant                                                                                                     |
| **Website**          | You provide the API. No website builder in v2                                                                                | **Tenant builds/hosts their own** (Wix, WordPress, custom). Connects via API Key + webhooks                                                                                     |
| **Phone/Calls**      | No VoIP integration                                                                                                          | Clinic phone stored for display. **No VoIP** — Dento is not a phone system                                                                                                      |
| **Webhooks**         | Platform webhooks for system events (Dev Portal)                                                                             | Tenant webhooks for clinic events (patient._, appointment._, invoice.\*). HMAC-SHA256 signed. Connects to their website/CRM                                                     |

---

## 5. Complete `.env` Variable Reference

### 5.1 Core (Required — Server Won't Boot Without These)

| Env Var              | Type                                | Example                                       | Required?     | Purpose                     |
| -------------------- | ----------------------------------- | --------------------------------------------- | ------------- | --------------------------- |
| `NODE_ENV`           | `development \| production \| test` | `development`                                 | Has default   | Environment mode            |
| `PORT`               | number                              | `3001`                                        | Default: 3001 | API server port             |
| `MONGODB_URI`        | URL                                 | `mongodb://localhost:27017/dento_platform`    | Has default   | MongoDB connection          |
| `REDIS_URL`          | string                              | `redis://localhost:6379`                      | Has default   | Redis connection            |
| `PAYLOAD_SECRET`     | string (min 16)                     | `<random-32-char>`                            | **Required**  | Payload CMS session secret  |
| `JWT_ACCESS_SECRET`  | string (min 16)                     | `<random-64-char>`                            | **Required**  | Signs access tokens (15min) |
| `JWT_REFRESH_SECRET` | string (min 16)                     | `<random-64-char>`                            | **Required**  | Signs refresh tokens (7d)   |
| `JWT_ACCESS_EXPIRY`  | string                              | `15m`                                         | Default: 15m  | Access token TTL            |
| `JWT_REFRESH_EXPIRY` | string                              | `7d`                                          | Default: 7d   | Refresh token TTL           |
| `CORS_ORIGIN`        | CSV URLs                            | `http://localhost:3000,http://localhost:3002` | Has default   | Allowed origins             |

**Generate secrets:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 5.2 Encryption

| Env Var                 | Required?                   | Purpose                                                 |
| ----------------------- | --------------------------- | ------------------------------------------------------- |
| `ENCRYPTION_MASTER_KEY` | Optional (recommended prod) | AES-256-GCM for PII (nationalId, phone, email, address) |
| `TOTP_ISSUER`           | Default: `Dento`            | 2FA authenticator label                                 |

### 5.3 File Storage (Cloudflare R2)

| Env Var         | Required?                | Purpose           |
| --------------- | ------------------------ | ----------------- |
| `S3_ENDPOINT`   | Optional                 | R2 endpoint URL   |
| `S3_ACCESS_KEY` | Optional                 | R2 access key     |
| `S3_SECRET_KEY` | Optional                 | R2 secret key     |
| `S3_BUCKET`     | Default: `dento-uploads` | Bucket name       |
| `R2_PUBLIC_URL` | Optional                 | CDN URL for files |

### 5.4 Email (Resend / SMTP)

| Env Var          | In Zod? | Required? | Purpose                |
| ---------------- | ------- | --------- | ---------------------- |
| `RESEND_API_KEY` | Yes     | Optional  | Primary email provider |
| `SMTP_HOST`      | No      | Optional  | SMTP fallback host     |
| `SMTP_PORT`      | No      | Optional  | SMTP fallback port     |
| `SMTP_USER`      | No      | Optional  | SMTP auth user         |
| `SMTP_PASS`      | No      | Optional  | SMTP auth password     |

### 5.5 SMS (Twilio)

| Env Var               | In Zod? | Required? | Purpose             |
| --------------------- | ------- | --------- | ------------------- |
| `TWILIO_ACCOUNT_SID`  | No      | Optional  | Twilio Account SID  |
| `TWILIO_AUTH_TOKEN`   | No      | Optional  | Twilio Auth Token   |
| `TWILIO_PHONE_NUMBER` | No      | Optional  | Sender phone number |

### 5.6 WhatsApp (Meta Business API)

| Env Var                  | In Zod? | Required? | Purpose              |
| ------------------------ | ------- | --------- | -------------------- |
| `META_WHATSAPP_PHONE_ID` | No      | Optional  | Meta phone number ID |
| `META_WHATSAPP_TOKEN`    | No      | Optional  | Meta access token    |

### 5.7 Push (Web Push / VAPID)

| Env Var               | In Zod? | Required? | Purpose                                             |
| --------------------- | ------- | --------- | --------------------------------------------------- |
| `VAPID_PUBLIC_KEY`    | Yes     | Optional  | VAPID public key                                    |
| `VAPID_PRIVATE_KEY`   | Yes     | Optional  | VAPID private key                                   |
| `VAPID_CONTACT_EMAIL` | Yes     | Optional  | VAPID contact email                                 |
| `VAPID_SUBJECT`       | No      | Optional  | VAPID subject (default: `mailto:support@dento.app`) |

**Generate:** `npx web-push generate-vapid-keys`

### 5.8 Payments — Paymob (Egypt SaaS Billing)

| Env Var                        | In Zod? | Required? | Purpose           |
| ------------------------------ | ------- | --------- | ----------------- |
| `PAYMOB_API_KEY`               | Yes     | Optional  | Paymob API key    |
| `PAYMOB_CARD_INTEGRATION_ID`   | Yes     | Optional  | Card integration  |
| `PAYMOB_FAWRY_INTEGRATION_ID`  | Yes     | Optional  | Fawry integration |
| `PAYMOB_WALLET_INTEGRATION_ID` | Yes     | Optional  | Mobile wallet     |
| `PAYMOB_VALU_INTEGRATION_ID`   | Yes     | Optional  | ValU installments |
| `PAYMOB_IFRAME_ID`             | Yes     | Optional  | Iframe ID         |
| `PAYMOB_HMAC_SECRET`           | Yes     | Optional  | Webhook HMAC      |

### 5.9 Payments — Stripe (International SaaS Billing)

| Env Var                  | In Zod? | Required? | Purpose                |
| ------------------------ | ------- | --------- | ---------------------- |
| `STRIPE_SECRET_KEY`      | Yes     | Optional  | Stripe secret key      |
| `STRIPE_PUBLISHABLE_KEY` | Yes     | Optional  | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET`  | Yes     | Optional  | Webhook signing secret |

### 5.10 Monitoring

| Env Var      | In Zod? | Required? | Purpose               |
| ------------ | ------- | --------- | --------------------- |
| `SENTRY_DSN` | Yes     | Optional  | Sentry error tracking |

### 5.11 Frontend Env Vars

**Admin App** (`apps/admin/.env`):

| Env Var                 | Default           | Purpose               |
| ----------------------- | ----------------- | --------------------- |
| `VITE_API_URL`          | `''` (Vite proxy) | API URL in production |
| `VITE_VAPID_PUBLIC_KEY` | —                 | Push subscription key |

**Developer App** (`apps/developer/.env`):

| Env Var        | Default                 | Purpose |
| -------------- | ----------------------- | ------- |
| `VITE_API_URL` | `http://localhost:3001` | API URL |

### 5.12 Minimum Viable `.env` (Local Dev)

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/dento_platform
REDIS_URL=redis://localhost:6379
PAYLOAD_SECRET=dev-secret-change-in-production-1234567890
JWT_ACCESS_SECRET=dev-access-secret-must-be-at-least-16-characters
JWT_REFRESH_SECRET=dev-refresh-secret-must-be-at-least-16-characters
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
```

```bash
docker compose up -d    # Start MongoDB + Redis
pnpm dev                # Start all 3 apps
```

All optional services gracefully simulate or skip when env vars are missing.

### 5.13 Env Vars NOT in Zod Schema (Future Cleanup)

| Env Var                  | Provider      | File                                      |
| ------------------------ | ------------- | ----------------------------------------- |
| `TWILIO_ACCOUNT_SID`     | Twilio        | `services/providers/sms.provider.ts`      |
| `TWILIO_AUTH_TOKEN`      | Twilio        | `services/providers/sms.provider.ts`      |
| `TWILIO_PHONE_NUMBER`    | Twilio        | `services/providers/sms.provider.ts`      |
| `META_WHATSAPP_PHONE_ID` | Meta          | `services/providers/whatsapp.provider.ts` |
| `META_WHATSAPP_TOKEN`    | Meta          | `services/providers/whatsapp.provider.ts` |
| `VAPID_SUBJECT`          | Web Push      | `services/providers/push.provider.ts`     |
| `SMTP_HOST`              | Nodemailer    | `services/providers/email.provider.ts`    |
| `SMTP_PORT`              | Nodemailer    | `services/providers/email.provider.ts`    |
| `SMTP_USER`              | Nodemailer    | `services/providers/email.provider.ts`    |
| `SMTP_PASS`              | Nodemailer    | `services/providers/email.provider.ts`    |
| `R2_PUBLIC_URL`          | Cloudflare R2 | `services/avatar-upload.service.ts`       |

---

## 6. Technology Stack

| Layer            | Technology                        | Version         | Purpose                          |
| ---------------- | --------------------------------- | --------------- | -------------------------------- |
| **Monorepo**     | Turborepo + pnpm                  | 2.8.11 / 9.15.4 | Build orchestration + packages   |
| **Runtime**      | Node.js                           | 20+ LTS         | Server runtime                   |
| **Language**     | TypeScript                        | 5.x             | Type safety everywhere           |
| **Backend**      | Fastify                           | 5.7.4           | HTTP server (tenant API)         |
| **CMS**          | Payload CMS                       | 3.x             | Platform admin (Dev Portal)      |
| **Database**     | MongoDB + Mongoose                | 7 / 8.23        | Document DB + ODM                |
| **Cache/Queue**  | Redis + BullMQ                    | 7 / 5.x         | Cache, rate-limit, job queues    |
| **Validation**   | Zod                               | 3.25            | Schema validation (shared)       |
| **Real-time**    | Socket.io                         | 4.x             | WebSocket (queue, notifications) |
| **Frontend**     | React                             | 19+             | UI framework                     |
| **Routing**      | react-router-dom                  | 7.x             | Client routing                   |
| **State**        | Zustand + TanStack Query          | 5.x / 5.x       | Client + server state            |
| **Tables**       | TanStack React Table              | 8.x             | Data tables                      |
| **Charts**       | Recharts                          | 2.x             | Dashboard charts                 |
| **Calendar**     | FullCalendar                      | 6.x             | Appointment calendar             |
| **Dental Chart** | react-odontogram                  | 0.5.5           | FDI dental chart                 |
| **PDF**          | @react-pdf/renderer               | 4.3.2           | Invoice/receipt PDFs             |
| **Styling**      | Tailwind CSS 4 + Shadcn           | 4.x             | CSS + component library          |
| **Build**        | Vite + tsup                       | 6.x / 8.x       | Bundlers                         |
| **Testing**      | Vitest                            | 2.1.9           | Unit + integration tests         |
| **Security**     | @fastify/helmet, cors, rate-limit | —               | HTTP security                    |
| **Auth**         | JWT (dual token) + bcrypt         | —               | Access + Refresh tokens          |
| **Encryption**   | AES-256-GCM                       | Built-in        | PII field encryption             |
| **CI**           | GitHub Actions                    | —               | Lint → Build → Test → Audit      |

---

## 7. Production Checklist

### 7.1 Developer (You) — Before Go-Live

- [ ] All 3 JWT/Payload secrets: unique, random, 64+ chars
- [ ] `ENCRYPTION_MASTER_KEY` set (64-hex) for PII encryption
- [ ] `NODE_ENV=production`
- [ ] MongoDB Atlas connection string (not localhost)
- [ ] Upstash/Redis Cloud URL (not localhost)
- [ ] Cloudflare R2 bucket created + keys set
- [ ] Resend API key configured + sending domain verified
- [ ] `CORS_ORIGIN` set to production domain(s) only
- [ ] Sentry DSN configured
- [ ] VAPID keys generated and set
- [ ] Cloudflare DNS + CDN configured
- [ ] SSL/TLS certificate active
- [ ] `.env` file NOT in git
- [ ] Paymob live keys set (Egypt SaaS billing)
- [ ] Stripe live keys set (International SaaS billing)
- [ ] Twilio account funded + phone number purchased (if SMS enabled)
- [ ] Meta WhatsApp Business verified + templates approved (if WA enabled)

### 7.2 Tenant (Clinic) — Before Opening

- [ ] Onboarding wizard completed (clinic info, branch, admin, locale)
- [ ] Logo uploaded + branding colors set
- [ ] At least 1 branch with working hours configured
- [ ] At least 1 doctor with schedule set
- [ ] Appointment types created
- [ ] Services + pricing configured
- [ ] Billing settings (invoice prefix, payment methods)
- [ ] Notification preferences set (which channels active)
- [ ] Staff invited and roles assigned
- [ ] _Optional:_ Online booking enabled + API key generated
- [ ] _Optional:_ Own website connected via API key
- [ ] _Optional:_ Webhooks configured for CRM integration
- [ ] _Optional:_ 2FA policy enforced for staff

# Missing Environment Variables Audit

> Scanned: March 5, 2026
> **Status: ✅ ALL RESOLVED** — March 5, 2026
>
> All variables below have been added to `env.ts` Zod schema, `.env.example`, and `.env`.

---

## API — Previously missing from `.env.example` AND `env.ts` schema

| Variable                 | File                                      | Purpose                               | Status |
| ------------------------ | ----------------------------------------- | ------------------------------------- | ------ |
| `META_WHATSAPP_PHONE_ID` | `services/providers/whatsapp.provider.ts` | WhatsApp Business API phone number ID | ✅     |
| `META_WHATSAPP_TOKEN`    | `services/providers/whatsapp.provider.ts` | WhatsApp Business API access token    | ✅     |
| `SMTP_HOST`              | `services/providers/email.provider.ts`    | SMTP fallback mail server host        | ✅     |
| `SMTP_PORT`              | `services/providers/email.provider.ts`    | SMTP fallback mail server port        | ✅     |
| `SMTP_USER`              | `services/providers/email.provider.ts`    | SMTP auth username                    | ✅     |
| `SMTP_PASS`              | `services/providers/email.provider.ts`    | SMTP auth password                    | ✅     |
| `VAPID_SUBJECT`          | `services/providers/push.provider.ts`     | VAPID subject (mailto: URI)           | ✅     |
| `R2_PUBLIC_URL`          | `services/avatar-upload.service.ts`       | Public CDN URL for R2/S3 uploads      | ✅     |
| `MONGODUMP_PATH`         | `workers/backup.worker.ts`                | Custom path to mongodump binary       | ✅     |
| `MONGORESTORE_PATH`      | `workers/backup.worker.ts`                | Custom path to mongorestore binary    | ✅     |

## Frontend (Vite) — Previously missing from `.env.example`

| Variable                | Apps             | Purpose                                         | Status |
| ----------------------- | ---------------- | ----------------------------------------------- | ------ |
| `VITE_API_URL`          | admin, developer | API base URL for frontend apps                  | ✅     |
| `VITE_SENTRY_DSN`       | admin, developer | Sentry DSN for frontend error tracking          | ✅     |
| `VITE_APP_VERSION`      | admin, developer | App version string for Sentry releases          | ✅     |
| `VITE_VAPID_PUBLIC_KEY` | admin            | VAPID public key for browser push subscriptions | ✅     |

## Migration-only (optional)

| Variable          | File                          | Purpose                           | Status |
| ----------------- | ----------------------------- | --------------------------------- | ------ |
| `V1_DATABASE_URL` | `scripts/migrate-v1/index.ts` | V1 MongoDB URL for data migration | ✅     |

---

## Fixes Applied

- ✅ **13 API vars** added to `env.ts` Zod schema (SMTP ×4, Twilio ×3, Meta WhatsApp ×2, VAPID_SUBJECT, R2_PUBLIC_URL, MONGODUMP_PATH, MONGORESTORE_PATH)
- ✅ **4 Vite vars** added to `.env.example` and `.env` (VITE_API_URL, VITE_SENTRY_DSN, VITE_APP_VERSION, VITE_VAPID_PUBLIC_KEY)
- ✅ **CI/build vars** added to `.env.example` (ANALYZE, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)
- ✅ **1 migration var** added to `.env.example` and `.env` (V1_DATABASE_URL)
- ✅ `S3_PUBLIC_URL` → `R2_PUBLIC_URL` naming mismatch **resolved** (both `.env.example` and `.env` now use `R2_PUBLIC_URL`)
- ✅ All env files reorganized into 17 numbered sections for clarity

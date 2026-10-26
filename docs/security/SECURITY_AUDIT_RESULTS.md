# Security Audit Results — Dento v2

> **Audit Date:** Phase 6, Week 26  
> **Auditor:** Internal Engineering  
> **Target:** Dento v2 API (`apps/api`), Admin Portal (`apps/admin`), Developer Portal (`apps/developer`)  
> **Methodology:** OWASP Top 10, HIPAA Security Rule, manual code review, ZAP baseline scan, Nuclei scan

---

> ⚠️ **Update (2026-07-05 runtime re-audit):** A live-system security pass found NEW authorization/API gaps that supersede several "PASS" rows below — do **not** treat the 84/0 summary as current, especially §3 Authorization, §5 API Security, and §9 Audit & Monitoring. Open findings:
>
> - Notifications endpoints have no authorization (mass-notify all patients + read PII logs) — #75
> - Wrong JWT field (`user.id`) → cross-user notification access + undefined actor/audit ids — #76
> - Full tenant DB backup downloadable at `read` privilege — #77
> - SSRF via webhook test/create (bypasses `assertPublicHttpsUrl`) — #78
> - Regex injection / ReDoS on ~10 list endpoints — #79
> - `/api/recurring-rules` registered with no auth middleware (latent) — #80
> - `tenant-settings` GET missing roleGuard + unvalidated body merge — #81
> - Custom domain DNS/SSL verification is mocked (marks verified without checking) — #96
>
> The July hardening items — cross-tenant upload IDOR, appointment read-guard, Paymob webhook signature — are genuinely FIXED on `main`.

---

## Executive Summary

| Category             | PASS   | WARN  | FAIL  | N/A   | Total  |
| -------------------- | ------ | ----- | ----- | ----- | ------ |
| Network & Transport  | 6      | 0     | 0     | 0     | 6      |
| Authentication       | 12     | 0     | 0     | 0     | 12     |
| Authorization        | 6      | 0     | 0     | 0     | 6      |
| Encryption           | 12     | 0     | 0     | 0     | 12     |
| API Security         | 9      | 0     | 0     | 0     | 9      |
| Input Validation     | 5      | 0     | 0     | 0     | 5      |
| File Upload Security | 7      | 0     | 0     | 0     | 7      |
| Tenant Isolation     | 7      | 0     | 0     | 0     | 7      |
| Audit & Monitoring   | 6      | 0     | 0     | 0     | 6      |
| Frontend Security    | 5      | 0     | 0     | 0     | 5      |
| Mobile Security      | 0      | 0     | 0     | 7     | 7      |
| Compliance           | 4      | 0     | 0     | 0     | 4      |
| Supply Chain         | 5      | 0     | 0     | 0     | 5      |
| **Total**            | **84** | **0** | **0** | **7** | **91** |

> N/A items are in §7.11 Mobile Security — deferred to Phase 7.

---

## Detailed Results

### 1. Network & Transport (6/6 PASS)

| #   | Check                               | Status | Evidence                                       |
| --- | ----------------------------------- | ------ | ---------------------------------------------- |
| 1.1 | TLS 1.2+ enforced                   | PASS   | Railway and Vercel enforce TLS 1.2+ by default |
| 1.2 | HSTS header with max-age=63072000   | PASS   | Helmet plugin sets `strictTransportSecurity`   |
| 1.3 | No mixed content                    | PASS   | All assets served over HTTPS                   |
| 1.4 | Certificate transparency monitoring | PASS   | Cloudflare provides CT monitoring              |
| 1.5 | DNS CAA records configured          | PASS   | CAA records set to restrict to Cloudflare CA   |
| 1.6 | API behind CDN/proxy                | PASS   | Cloudflare proxies all traffic                 |

### 2. Authentication (12/12 PASS)

| #    | Check                                                 | Status | Evidence                                                                  |
| ---- | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| 2.1  | Argon2id password hashing                             | PASS   | `argon2.hash()` with ARGON2_OPTIONS (memory=65536, time=3, parallelism=4) |
| 2.2  | JWT access token 15min expiry                         | PASS   | `expiresIn: '15m'` in auth route token generation                         |
| 2.3  | JWT refresh token 7d expiry (30d remember-me)         | PASS   | `expiresIn: rememberMe ? '30d' : '7d'`                                    |
| 2.4  | Refresh token rotation on every use                   | PASS   | Old token invalidated, new token issued on refresh                        |
| 2.5  | Tokens in httpOnly + secure + sameSite=strict cookies | PASS   | Cookie options in auth route                                              |
| 2.6  | TOTP 2FA with otplib                                  | PASS   | OTP verification in login flow                                            |
| 2.7  | 10 recovery codes, Argon2id-hashed                    | PASS   | Recovery codes generated and hashed on 2FA setup                          |
| 2.8  | Progressive brute-force lockout                       | PASS   | brute-force middleware with escalating lockout (3→5min … 20→24hr)         |
| 2.9  | Generic error messages                                | PASS   | "Invalid credentials" for both wrong email and wrong password             |
| 2.10 | Password complexity enforced                          | PASS   | Zod schema: 8+ chars, upper, lower, number, special                       |
| 2.11 | Account lockout notification                          | PASS   | Email sent on lockout threshold                                           |
| 2.12 | Session invalidation on password change               | PASS   | All sessions cleared on password update                                   |

### 3. Authorization (6/6 PASS)

| #   | Check                                        | Status | Evidence                                                                 |
| --- | -------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| 3.1 | RBAC with PERMISSION_MATRIX                  | PASS   | 28 modules × 8 roles × 5 permissions via `platformGuard(module, action)` |
| 3.2 | Tenant isolation via database-per-tenant     | PASS   | `getTenantConnection(slug)` creates isolated connections                 |
| 3.3 | platform_admin bypass documented             | PASS   | Documented in PLATFORM_RBAC.md, intentional for operations               |
| 3.4 | No direct object reference without ownership | PASS   | All queries scoped by tenant context                                     |
| 3.5 | API key scoped to tenant                     | PASS   | API key model includes `tenantSlug` and `permissions[]`                  |
| 3.6 | Webhook signature verification               | PASS   | HMAC-SHA256 signature in webhook delivery                                |

### 4. Encryption (12/12 PASS)

| #    | Check                                                                      | Status | Evidence                                                |
| ---- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| 4.1  | AES-256-GCM for PII at rest                                                | PASS   | `encryptField()` / `decryptField()` in encryption utils |
| 4.2  | HKDF for tenant-specific key derivation                                    | PASS   | `deriveTenantKey(masterKey, tenantSlug)`                |
| 4.3  | ENCRYPTION_MASTER_KEY in env                                               | PASS   | Required in env.ts Zod schema, not in code              |
| 4.4  | Unique IV per encryption (12 bytes)                                        | PASS   | `crypto.randomBytes(12)` on each encrypt call           |
| 4.5  | Auth tag verification on decrypt                                           | PASS   | GCM mode provides built-in auth tag verification        |
| 4.6  | Key rotation support                                                       | PASS   | Versioned keys with `keyVersion` field                  |
| 4.7  | Backup encryption: AES-256-GCM                                             | PASS   | `backup-crypto.ts` with AES-256-GCM + HKDF              |
| 4.8  | Backup checksum: SHA-256                                                   | PASS   | SHA-256 checksum stored with backup record              |
| 4.9  | S3/R2 server-side encryption                                               | PASS   | SSE-S3 enabled on bucket                                |
| 4.10 | Encrypted fields: phone, email, nationalId, address, allergies, conditions | PASS   | Encryption hooks on Patient model                       |
| 4.11 | Deterministic encryption for searchable fields                             | PASS   | `encryptSearchable()` for email/phone lookup            |
| 4.12 | No PII in logs                                                             | PASS   | Pino redaction paths configured for sensitive fields    |

### 5. API Security (9/9 PASS)

| #   | Check                                     | Status | Evidence                                               |
| --- | ----------------------------------------- | ------ | ------------------------------------------------------ |
| 5.1 | Rate limiting: global 100/min, auth 5/min | PASS   | `rate-limit.plugin.ts` with per-route overrides        |
| 5.2 | Request body size limit 10MB              | PASS   | Fastify `bodyLimit: 10485760`                          |
| 5.3 | Helmet with all headers                   | PASS   | `helmet.plugin.ts` with full configuration             |
| 5.4 | CORS restricted to known origins          | PASS   | `cors.plugin.ts` with allowlist                        |
| 5.5 | CSP configured                            | PASS   | Helmet CSP directives set                              |
| 5.6 | X-Request-Id propagation                  | PASS   | Custom `requestId` generator in server.ts              |
| 5.7 | Input validation via Zod on every route   | PASS   | All route schemas use Zod validation                   |
| 5.8 | NoSQL injection prevention                | PASS   | Mongoose parameterized queries, Zod input sanitization |
| 5.9 | Path traversal prevention                 | PASS   | File routes sanitize paths, S3 keys validated          |

### 6. Input Validation (5/5 PASS)

| #   | Check                                   | Status | Evidence                                               |
| --- | --------------------------------------- | ------ | ------------------------------------------------------ |
| 6.1 | Zod schema on every request body        | PASS   | All POST/PUT/PATCH routes have body schemas            |
| 6.2 | Zod schema on every query string        | PASS   | All GET routes validate query params                   |
| 6.3 | Zod schema on every URL parameter       | PASS   | Route params validated (ObjectId format, etc.)         |
| 6.4 | Error messages don't expose internals   | PASS   | Custom error handler strips stack traces in production |
| 6.5 | File upload: type whitelist, size limit | PASS   | Multipart config with mime type validation             |

### 7. File Upload Security (7/7 PASS)

| #   | Check                                     | Status | Evidence                                               |
| --- | ----------------------------------------- | ------ | ------------------------------------------------------ |
| 7.1 | Allowed types: JPEG, PNG, PDF, DICOM, STL | PASS   | `ALLOWED_MIME_TYPES` constant                          |
| 7.2 | Max file size: 50MB                       | PASS   | Multipart `limits.fileSize` set                        |
| 7.3 | Virus scan on upload                      | PASS   | ClamAV integration via `clamscan`                      |
| 7.4 | Files stored in S3/R2 with signed URLs    | PASS   | Pre-signed URLs for download, no public access         |
| 7.5 | Original filename sanitized               | PASS   | UUID-based keys, original name stored in metadata only |
| 7.6 | Content-Type verified                     | PASS   | Magic bytes check via `file-type` package              |
| 7.7 | No executable file types                  | PASS   | Explicit allowlist blocks executables                  |

### 8. Tenant Isolation (7/7 PASS)

| #   | Check                                  | Status | Evidence                                      |
| --- | -------------------------------------- | ------ | --------------------------------------------- |
| 8.1 | Database-per-tenant                    | PASS   | Separate MongoDB databases per tenant slug    |
| 8.2 | Tenant slug validated on every request | PASS   | `tenantGuard` middleware validates slug       |
| 8.3 | No cross-tenant data leakage           | PASS   | Connections scoped to tenant database         |
| 8.4 | Tenant-scoped indexes                  | PASS   | Indexes created per-tenant database           |
| 8.5 | Audit logs per-tenant                  | PASS   | Audit collection in each tenant database      |
| 8.6 | Backup per-tenant support              | PASS   | `mongodump --db=tenant_${slug}`               |
| 8.7 | Tenant deletion: full data purge       | PASS   | Drop database + S3 cleanup on tenant deletion |

### 9. Audit & Monitoring (6/6 PASS)

| #   | Check                                       | Status | Evidence                                         |
| --- | ------------------------------------------- | ------ | ------------------------------------------------ |
| 9.1 | Audit log on every mutation                 | PASS   | `auditLog()` middleware on POST/PUT/PATCH/DELETE |
| 9.2 | Audit log includes who/what/when/where/diff | PASS   | Full context captured including before/after     |
| 9.3 | Audit log retention: 730 days               | PASS   | TTL index with 730-day expiry                    |
| 9.4 | Sentry error tracking                       | PASS   | `sentry.plugin.ts` initialized in server.ts      |
| 9.5 | Health check with component status          | PASS   | `/health` returns DB + Redis + S3 status         |
| 9.6 | Structured JSON logging with requestId      | PASS   | Pino with custom requestId correlation           |

### 10. Frontend Security (5/5 PASS)

| #    | Check                                  | Status | Evidence                                     |
| ---- | -------------------------------------- | ------ | -------------------------------------------- |
| 10.1 | No secrets in frontend bundle          | PASS   | Only `VITE_*` prefixed vars exposed          |
| 10.2 | Source maps disabled in production     | PASS   | `sourcemap: false` in Vite production config |
| 10.3 | XSS prevention                         | PASS   | React auto-escaping + CSP                    |
| 10.4 | CSRF: SameSite cookies + custom header | PASS   | `sameSite: 'strict'` on auth cookies         |
| 10.5 | Sensitive data cleared on logout       | PASS   | Zustand store reset on logout                |

### 11. Mobile Security (7/7 N/A)

All mobile security items deferred to Phase 7 (mobile app development).

### 12. Compliance (4/4 PASS)

| #    | Check                                  | Status | Evidence                                  |
| ---- | -------------------------------------- | ------ | ----------------------------------------- |
| 12.1 | HIPAA: 2-year audit log retention      | PASS   | TTL index: 730 days                       |
| 12.2 | HIPAA: encryption at rest + in transit | PASS   | AES-256-GCM at rest, TLS 1.2+ in transit  |
| 12.3 | GDPR: data export                      | PASS   | `mongodump` per tenant available          |
| 12.4 | GDPR: right to erasure                 | PASS   | Tenant deletion flow with full data purge |

### 13. Supply Chain (5/5 PASS)

| #    | Check                       | Status | Evidence                                 |
| ---- | --------------------------- | ------ | ---------------------------------------- |
| 13.1 | Dependabot configured       | PASS   | `.github/dependabot.yml` active          |
| 13.2 | `pnpm audit` clean          | PASS   | 0 high/critical vulnerabilities          |
| 13.3 | TruffleHog secret scanning  | PASS   | `security.yml` workflow on push + weekly |
| 13.4 | Lock file integrity         | PASS   | `--frozen-lockfile` in CI                |
| 13.5 | No `eval()` or `Function()` | PASS   | Codebase grep confirms none              |

---

## Pen Test Results

### OWASP ZAP Baseline Scan

| Finding                   | Risk | Status                                  |
| ------------------------- | ---- | --------------------------------------- |
| No high/critical findings | —    | PASS                                    |
| CSP Header variations     | Info | Acknowledged — Helmet CSP configured    |
| Server header disclosure  | Info | Mitigated — Helmet removes X-Powered-By |

### Nuclei Scan

| Finding                   | Severity | Status       |
| ------------------------- | -------- | ------------ |
| No critical/high findings | —        | PASS         |
| Standard info disclosures | Info     | Acknowledged |

---

## Recommendations

1. **Ongoing:** Run `pnpm audit` weekly and address new advisories within 48 hours
2. **Ongoing:** Review Sentry error dashboard daily during first 2 weeks post-launch
3. **Phase 7:** Complete mobile security audit when mobile app development begins
4. **Phase 8:** Consider third-party penetration test for SOC 2 compliance preparation

---

## Sign-Off

- [ ] Engineering Lead reviewed
- [ ] Security findings addressed
- [ ] Documentation updated

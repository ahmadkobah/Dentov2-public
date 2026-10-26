# Password Reset & Recovery — Implementation Plan

> **Created:** 2026-03-05
> **Scope:** Full password reset pipeline — backend wiring, admin UI, developer portal action
> **Prerequisite:** Tenant Users API wired (previous session)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Architecture Overview](#3-architecture-overview)
4. [Phase 1 — Wire Email Sending in Forgot Password](#phase-1--wire-email-sending-in-forgot-password)
5. [Phase 2 — Admin Portal Forgot/Reset Password UI](#phase-2--admin-portal-forgotreset-password-ui)
6. [Phase 3 — Admin Force-Reset Endpoint](#phase-3--admin-force-reset-endpoint)
7. [Phase 4 — Developer Portal "Reset Password" Action](#phase-4--developer-portal-reset-password-action)
8. [File Change Summary](#file-change-summary)
9. [Security Considerations](#security-considerations)

---

## 1. Executive Summary

A tenant user who forgets their password has **no recovery path today**. The backend endpoints exist (`POST /auth/forgot-password` and `POST /auth/reset-password`) but email delivery is a TODO, and no UI exists. This plan delivers:

1. **Email sending** wired into the existing `forgot-password` endpoint using the platform `sendEmail()` provider
2. **Forgot Password** and **Reset Password** pages in the Admin Portal (tenant user-facing)
3. **Admin force-reset endpoint** — `POST /api/users/:id/force-reset-password` so a `tenant_admin` can trigger a password reset for any team member
4. **Developer portal action** — "Reset Password" button in the UsersTab so a platform admin can trigger a reset for any tenant user

---

## 2. Current State Analysis

### 2.1 What EXISTS (Backend)

| Endpoint                     | File            | Line | Status                                                                                                             |
| ---------------------------- | --------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| `POST /auth/forgot-password` | `auth.route.ts` | L661 | ✅ Generates `resetToken` (SHA-256 hashed), stores in User doc, 1-hour TTL. **BUT: email not sent (TODO at L700)** |
| `POST /auth/reset-password`  | `auth.route.ts` | L713 | ✅ Validates token, checks password history (last 5), hashes with argon2id, revokes all sessions                   |
| `POST /auth/change-password` | `auth.route.ts` | L787 | ✅ Requires current password — not usable when password is forgotten                                               |

**Token Security (already implemented):**

- Random: `crypto.randomBytes(32).toString('hex')` — 256-bit
- Stored: SHA-256 hash (never plaintext in DB)
- TTL: 1 hour (`RESET_TOKEN_TTL_MS = 60 * 60 * 1000`)
- Single-use: Cleared after reset
- Session revocation: All sessions invalidated on reset, `tokenVersion` incremented

### 2.2 What EXISTS (Shared Schemas)

| Schema                 | File             | Fields                                        |
| ---------------------- | ---------------- | --------------------------------------------- |
| `forgotPasswordSchema` | `auth.schema.ts` | `{ email: string }`                           |
| `resetPasswordSchema`  | `auth.schema.ts` | `{ token: string, password: string (8-128) }` |

### 2.3 What EXISTS (Translations)

Seed data already has translation keys in both EN and AR:

**English** (`translations-en.ts`):

- `forgotPassword.subtitle`: "Enter your email to receive a password reset link"
- `forgotPassword.email`: "Email Address"
- `forgotPassword.submit`: "Send Reset Link"
- `forgotPassword.success`: "Password reset link sent to your email"
- `resetPassword.title`: "Reset Password"
- `resetPassword.subtitle`: "Enter your new password"
- `resetPassword.newPassword`: "New Password"
- `resetPassword.confirmPassword`: "Confirm New Password"
- `resetPassword.submit`: "Reset Password"
- `resetPassword.success`: "Password reset successfully"

**Arabic** (`translations-ar.ts`): Full Arabic translations for all the above.

### 2.4 What EXISTS (Email Provider)

- `sendEmail(options, tenantConfig?)` — fully functional with Resend (primary) + Nodemailer (fallback)
- Supports tenant-specific credentials or platform defaults
- Already used by BullMQ email worker and report-export service

### 2.5 What EXISTS (User Model)

`user.model.ts` fields:

- `resetToken: string | null` — SHA-256 hashed
- `resetTokenExpiresAt: Date | null`
- `passwordHistory: string[]` — Last 5 argon2id hashes
- `lastPasswordChangedAt: Date | null`
- `tokenVersion: number` — Incremented on password change

### 2.6 What EXISTS (Frontend)

| Component                               | Status                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| **Admin LoginPage** (`LoginPage.tsx`)   | "Forgot password?" link exists — `href="#"` (dead link)                              |
| **Admin Router** (`router.tsx`)         | Only `/login` under `GuestRoute` — no `/forgot-password` or `/reset-password` routes |
| **Admin AuthLayout** (`AuthLayout.tsx`) | Just `<Outlet />` — works for nested auth routes                                     |
| **Admin ProtectedRoute**                | Redirects to `/login` if not authenticated                                           |
| **Admin GuestRoute**                    | Redirects to `/` if already authenticated                                            |
| **Dev Portal UsersTab**                 | Shows tenant users list — no "Reset Password" action button                          |

### 2.7 What DOES NOT Exist

| Missing                            | Impact                                            |
| ---------------------------------- | ------------------------------------------------- |
| Email sending in `forgot-password` | Token generated but never delivered — useless     |
| Password reset email HTML template | No template function exists                       |
| `/forgot-password` page (Admin)    | No UI to enter email                              |
| `/reset-password` page (Admin)     | No UI to enter new password with token            |
| Admin force-reset endpoint         | `tenant_admin` can't trigger reset for their team |
| Platform force-reset endpoint      | Developer can't help a tenant user                |
| Dev portal reset action            | No button in UsersTab                             |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Password Reset Flows                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Flow A — Self-Service (Tenant User)                              │
│  ─────────────────────────────────────                            │
│  1. User clicks "Forgot password?" on Admin Portal login page     │
│  2. → /forgot-password page → enters email → POST /auth/forgot   │
│  3. Backend generates token, sends email with reset link          │
│  4. User clicks link → /reset-password?token=xxx                  │
│  5. → Reset page → enters new password → POST /auth/reset        │
│  6. All sessions revoked, user must re-login                      │
│                                                                    │
│  Flow B — Admin-Triggered (Tenant Admin)                          │
│  ─────────────────────────────────────                            │
│  1. tenant_admin goes to Users page in Admin Portal               │
│  2. Clicks "Reset Password" on a team member                     │
│  3. → POST /api/users/:id/force-reset-password                   │
│  4. Backend generates token, sends email to that user             │
│  5. Same reset flow as Flow A from step 4                         │
│                                                                    │
│  Flow C — Developer-Triggered (Platform Admin)                    │
│  ─────────────────────────────────────                            │
│  1. Platform admin views a tenant's users in Dev Portal           │
│  2. Clicks "Reset Password" on a user row                        │
│  3. → POST /api/platform/tenants/:tenantId/users/:userId/reset   │
│  4. Backend generates token, sends email to that user             │
│  5. Same reset flow as Flow A from step 4                         │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Reset Link Format:** `{ADMIN_PORTAL_URL}/reset-password?token={rawToken}`

The raw (un-hashed) token goes in the URL. The backend stores and compares a SHA-256 hash of it.

---

## Phase 1 — Wire Email Sending in Forgot Password

### Goal

When `POST /auth/forgot-password` is called and the user exists, send an actual email containing a password reset link.

### 1.1 Create Password Reset Email Template

**New File:** `apps/api/src/utils/email-templates.ts`

A function that generates the HTML for the password reset email. Inline CSS for email client compatibility:

```typescript
export function passwordResetEmailHtml(options: {
  resetLink: string;
  userName: string; // e.g. "Dr. Ahmad"
  expiresInMinutes: number; // 60
}): string;
```

Template includes:

- Dento branding header
- Greeting with user's name
- "Reset Password" CTA button with `resetLink`
- Expiry warning ("This link expires in 60 minutes")
- "If you didn't request this, ignore this email" disclaimer
- Plain-text fallback for the link URL

### 1.2 Wire sendEmail into forgot-password Endpoint

**File:** `apps/api/src/tenant/routes/auth/auth.route.ts` — Line ~700

Replace `// TODO: Send password reset email (Phase 4+)` with:

```typescript
import { sendEmail } from '../../../services/providers/email.provider.js';
import { passwordResetEmailHtml } from '../../../utils/email-templates.js';

// Build reset link
const adminPortalUrl = env.ADMIN_PORTAL_URL || 'http://localhost:5173';
const resetLink = `${adminPortalUrl}/reset-password?token=${resetToken}`;

// Build user display name
const firstName = user.profile?.firstName?.en || '';
const displayName = firstName || 'there';

// Send email (fire-and-forget with logging — don't block the response)
sendEmail({
  to: user.email,
  subject: 'Reset Your Dento Password',
  html: passwordResetEmailHtml({
    resetLink,
    userName: displayName,
    expiresInMinutes: 60,
  }),
}).catch((err) => {
  logger.error({ err, userId: user._id, email }, 'Failed to send password reset email');
});
```

**Note:** We send the email asynchronously (fire-and-forget) so the API response always completes fast. The response already says "If an account exists, a link has been sent" — this prevents email enumeration regardless of whether the email succeeds.

### 1.3 Add `ADMIN_PORTAL_URL` to env config

**File:** `apps/api/src/config/env.ts`

Add:

```typescript
ADMIN_PORTAL_URL: process.env.ADMIN_PORTAL_URL || 'http://localhost:5173',
```

### Affected Files — Phase 1

| File                                            | Action | Changes                                              |
| ----------------------------------------------- | ------ | ---------------------------------------------------- |
| `apps/api/src/utils/email-templates.ts`         | CREATE | ~80 lines — password reset email HTML template       |
| `apps/api/src/tenant/routes/auth/auth.route.ts` | MODIFY | Replace TODO at L700 with sendEmail call (~15 lines) |
| `apps/api/src/config/env.ts`                    | MODIFY | Add `ADMIN_PORTAL_URL` env variable                  |

---

## Phase 2 — Admin Portal Forgot/Reset Password UI

### Goal

Two new pages in the Admin Portal: `/forgot-password` and `/reset-password`.

### 2.1 ForgotPasswordPage.tsx

**New File:** `apps/admin/src/features/auth/pages/ForgotPasswordPage.tsx`

**UI (matches existing LoginPage design):**

- Same card layout / Dento branding as `LoginPage.tsx`
- Email input field
- "Send Reset Link" button
- Loading state while submitting
- Success state: "Check your email for a password reset link"
- Error handling (ApiError display)
- "Back to login" link → `/login`

**API call:** `POST /api/auth/forgot-password` with `{ email }` via `apiClient`

### 2.2 ResetPasswordPage.tsx

**New File:** `apps/admin/src/features/auth/pages/ResetPasswordPage.tsx`

**UI:**

- Reads `token` from URL query params: `useSearchParams().get('token')`
- If no token → display error "Invalid reset link"
- Two inputs: "New Password" + "Confirm Password" (with show/hide toggle)
- Client-side validation: min 8 chars, passwords match
- "Reset Password" button
- Success state: "Password reset successfully. Redirecting to login..." → auto-redirect after 3s
- Error handling: expired token, password history violation

**API call:** `POST /api/auth/reset-password` with `{ token, password }` via `apiClient`

### 2.3 Update Router

**File:** `apps/admin/src/router.tsx`

Add under `GuestRoute > AuthLayout > children`:

```typescript
{ path: '/forgot-password', element: <ForgotPasswordPage /> },
{ path: '/reset-password', element: <ResetPasswordPage /> },
```

### 2.4 Update LoginPage "Forgot password?" Link

**File:** `apps/admin/src/features/auth/pages/LoginPage.tsx`

Change `href="#"` to proper router link:

```diff
- <a href="#" className="...">Forgot password?</a>
+ <Link to="/forgot-password" className="...">Forgot password?</Link>
```

Also add `Link` to the `react-router-dom` import.

### Affected Files — Phase 2

| File                                                        | Action | Changes                                                                |
| ----------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `apps/admin/src/features/auth/pages/ForgotPasswordPage.tsx` | CREATE | ~130 lines — email form, success/error states                          |
| `apps/admin/src/features/auth/pages/ResetPasswordPage.tsx`  | CREATE | ~180 lines — token validation, password form, redirect                 |
| `apps/admin/src/router.tsx`                                 | MODIFY | Add 2 routes + 2 imports                                               |
| `apps/admin/src/features/auth/pages/LoginPage.tsx`          | MODIFY | Change `href="#"` to `<Link to="/forgot-password">`, add `Link` import |

---

## Phase 3 — Admin Force-Reset Endpoint

### Goal

A `tenant_admin` can trigger a password reset email for any team member via the Admin Portal.

### 3.1 Backend Endpoint

**File:** `apps/api/src/tenant/routes/users/users.route.ts`

**New endpoint:** `POST /api/users/:id/force-reset-password`

```
Auth: authGuard → tenantDbMiddleware → roleGuard('staff', 'update')
```

**Logic:**

1. Validate `:id` is a valid user belonging to the same `tenantSlug`
2. Prevent self-reset (admin can use "change password" for themselves)
3. Generate `resetToken` + SHA-256 hash (same as forgot-password)
4. Store hashed token + expiry on the user
5. Build reset link with `ADMIN_PORTAL_URL`
6. Send email via `sendEmail()` (async, fire-and-forget)
7. Return success response (don't reveal whether email was sent)

**Access control:** Only `tenant_admin` role can force-reset (via `roleGuard('staff', 'update')`). A dentist or receptionist cannot trigger this.

### 3.2 Add to UserService (Optional)

We can add a `forceResetPassword(userId, triggeredBy)` method to `UserService` to keep the logic reusable, or implement directly in the route handler. Since the logic is straightforward (~20 lines), implementing in the route handler is simpler.

### Affected Files — Phase 3

| File                                              | Action | Changes                                                   |
| ------------------------------------------------- | ------ | --------------------------------------------------------- |
| `apps/api/src/tenant/routes/users/users.route.ts` | MODIFY | Add `POST /:id/force-reset-password` endpoint (~50 lines) |

---

## Phase 4 — Developer Portal "Reset Password" Action

### Goal

A platform admin can trigger a password reset for any tenant user from the Developer Portal's UsersTab.

### 4.1 Backend Endpoint

**File:** `apps/api/src/platform/routes/tenants/tenants.route.ts`

**New endpoint:** `POST /api/platform/tenants/:id/users/:userId/reset-password`

```
Auth: authGuard → platformGuard('platform_tenants', 'update')
```

**Logic:**

1. Resolve tenant by `_id` to get `slug`
2. Find user by `userId` with matching `tenantSlug`
3. Generate resetToken + hash (same pattern as forgot-password)
4. Store on user, set 1-hour expiry
5. Send reset email with `ADMIN_PORTAL_URL` link
6. Return success

### 4.2 Frontend — useTenantUsers Hook Extension

**File:** `apps/developer/src/features/tenants/hooks/useTenantUsers.ts`

Add a `useResetTenantUserPassword` mutation hook:

```typescript
export function useResetTenantUserPassword(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/platform/tenants/${tenantId}/users/${userId}/reset-password`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantUserKeys.all(tenantId) });
    },
  });
}
```

### 4.3 Frontend — UsersTab "Reset Password" Button

**File:** `apps/developer/src/features/tenants/components/UsersTab.tsx`

In the Actions column (currently just an Edit2 icon), add a "Reset Password" dropdown or button:

- Clicking "Reset Password" shows a confirmation dialog
- On confirm → calls `useResetTenantUserPassword` mutation
- Success toast: "Password reset email sent to {email}"
- Error toast: standard error handling

**UI Addition to each row:**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => handleResetPassword(user)}>
      <KeyRound className="h-4 w-4 mr-2" />
      Reset Password
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Confirmation pattern: Simple `window.confirm()` or a lightweight modal — "Are you sure you want to send a password reset email to {user.email}?"

### Affected Files — Phase 4

| File                                                          | Action | Changes                                                                                         |
| ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `apps/api/src/platform/routes/tenants/tenants.route.ts`       | MODIFY | Add `POST /:id/users/:userId/reset-password` (~45 lines)                                        |
| `apps/developer/src/features/tenants/hooks/useTenantUsers.ts` | MODIFY | Add `useResetTenantUserPassword` mutation hook (~15 lines)                                      |
| `apps/developer/src/features/tenants/components/UsersTab.tsx` | MODIFY | Add dropdown menu with "Reset Password" action, confirmation dialog, toast feedback (~40 lines) |

---

## File Change Summary

### New Files (3)

| File                                                        | Lines | Purpose                                             |
| ----------------------------------------------------------- | ----- | --------------------------------------------------- |
| `apps/api/src/utils/email-templates.ts`                     | ~80   | Password reset email HTML template                  |
| `apps/admin/src/features/auth/pages/ForgotPasswordPage.tsx` | ~130  | "Forgot Password" page — email input, success state |
| `apps/admin/src/features/auth/pages/ResetPasswordPage.tsx`  | ~180  | "Reset Password" page — token + new password form   |

### Modified Files (7)

| File                                                          | Changes                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/api/src/tenant/routes/auth/auth.route.ts`               | Wire sendEmail into forgot-password (replace TODO L700) |
| `apps/api/src/config/env.ts`                                  | Add `ADMIN_PORTAL_URL` env variable                     |
| `apps/admin/src/router.tsx`                                   | Add `/forgot-password` and `/reset-password` routes     |
| `apps/admin/src/features/auth/pages/LoginPage.tsx`            | Change `href="#"` to `<Link to="/forgot-password">`     |
| `apps/api/src/tenant/routes/users/users.route.ts`             | Add `POST /:id/force-reset-password` endpoint           |
| `apps/api/src/platform/routes/tenants/tenants.route.ts`       | Add `POST /:id/users/:userId/reset-password` endpoint   |
| `apps/developer/src/features/tenants/hooks/useTenantUsers.ts` | Add `useResetTenantUserPassword` mutation hook          |
| `apps/developer/src/features/tenants/components/UsersTab.tsx` | Add "Reset Password" action in dropdown menu            |

**Total: 3 new files, 8 modified files**

---

## Security Considerations

| Concern                   | Mitigation                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Email enumeration**     | `forgot-password` always returns same success message regardless of email existence                                    |
| **Token strength**        | 256-bit random (`crypto.randomBytes(32)`) — cryptographically secure                                                   |
| **Token storage**         | SHA-256 hashed in DB — leaked DB doesn't expose tokens                                                                 |
| **Token TTL**             | 1 hour — short window. Cleared immediately after use                                                                   |
| **Single-use**            | Token nullified after successful reset                                                                                 |
| **Session revocation**    | All sessions revoked on password reset (`tokenVersion++`)                                                              |
| **Password reuse**        | Checked against last 5 password hashes before accepting                                                                |
| **Password hashing**      | argon2id with 64MB memory, 3 iterations, 4 parallelism                                                                 |
| **Rate limiting**         | Platform `sendEmail` has BullMQ limiter: 50/minute. Forgot-password also protected by existing rate limiter middleware |
| **Force-reset auth**      | Tenant: `roleGuard('staff', 'update')` — only admins. Platform: `platformGuard('platform_tenants', 'update')`          |
| **Self-reset prevention** | Admin force-reset blocks self — use "change password" for self                                                         |
| **Email delivery**        | Fire-and-forget — API response doesn't leak whether email was sent                                                     |
| **Reset link domain**     | `ADMIN_PORTAL_URL` from env — configurable per deployment                                                              |

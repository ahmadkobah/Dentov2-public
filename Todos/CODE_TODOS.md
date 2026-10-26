# Dento v2 — Code TODOs

> Generated: 2026-06-13
> Source: inline `TODO`/`FIXME` markers and stubbed/mock code paths across `apps/` and `packages/`. Paths use `file:line`.
> (Pure i18n placeholder strings and form `placeholder=` props were excluded as noise.)

## 1. Inline `TODO` markers

### Functional gaps

| Location                                                            | TODO                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/tenant/routes/users/avatar.route.ts:59`               | **Avatar upload doesn't persist** — user record not updated with the new avatar URL                                   |
| `apps/api/src/tenant/routes/users/avatar.route.ts:111`              | Avatar delete doesn't remove the file from storage / clear the user's avatar URL                                      |
| `apps/admin/src/features/settings/components/WhatsAppBotTab.tsx:64` | `const tenantSlug = 'srouji'` hardcoded — derive from auth context (also a known bug + blocker for AI WhatsApp agent) |
| `apps/api/src/tenant/services/appointment.service.ts:805`           | Leaves a TODO for waitlist back-fill (marked "Phase 6")                                                               |
| `apps/api/src/tenant/services/appointment.service.ts:936`           | TODO (Phase 6 — waitlist): back-fill logic not implemented                                                            |

### Tech-debt / cleanup

| Location                                                             | TODO                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/developer/src/features/webhooks/hooks/useWebhooks.ts:7`        | Migrate local types to `@dento/shared`                      |
| `apps/developer/src/features/tenants/hooks/useTenants.ts:8`          | Migrate local types to `@dento/shared`                      |
| `apps/developer/src/features/tenants/types/tenant-detail.types.ts:4` | Migrate to `@dento/shared` once API contracts are finalized |
| `apps/developer/src/features/pricing/hooks/usePricing.ts:6`          | Migrate local types to `@dento/shared`                      |
| `apps/developer/src/features/tenants/data/tenant-detail.mock.ts:4`   | Remove mock once `useTenantDetail` is wired to the API      |

### Cosmetic (RTL workarounds)

| Location                                     | TODO                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/developer/src/App.tsx:29`              | Sonner doesn't support logical positions (top-end); using physical top-right                 |
| `packages/ui/src/primitives/Calendar.tsx:53` | react-day-picker Chevron uses physical left/right orientation — no logical start/end support |

## 2. Stubbed / mock / not-wired code paths

These are intentionally incomplete implementations (not TODO-tagged but functionally unfinished).

| Location                                                             | What's stubbed                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/api/src/platform/routes/payments/stripe.route.ts:144-152`      | Stripe `create` PaymentIntent is a `// In production:` stub — persists `providerPaymentId:''`     |
| `apps/api/src/platform/routes/payments/payments.route.ts:198`        | Paymob order creation is a `// In production:` stub                                               |
| `apps/api/src/platform/routes/payments/payments.route.ts:398-403`    | Paymob refund flips DB status to `refunded` without calling the gateway                           |
| `apps/api/src/platform/routes/payments/stripe.route.ts:347`          | Stripe refund flips DB status without calling the gateway                                         |
| `apps/api/src/services/avatar-upload.service.ts:11,47-52,90,104,133` | Entire avatar-upload service returns a **dev mock URL**; real R2/S3 upload + signed URLs are TODO |
| `apps/api/src/services/report-export.service.ts:291`                 | "Placeholder Data Fetcher" — verify report export isn't returning placeholder data                |
| `apps/admin/src/i18n/keys/settings.ts:200`                           | A "Coming Soon" settings section exists in the admin UI                                           |

> **Note:** The platform payment layer (Stripe + Paymob, create + refund) is **not wired to live gateways** — this is the root context behind several payment-related bugs in `BUGS.md` (C1, H6, H13) and the deferred "patient checkout" item in `PLAN_TODOS.md`.

## Cross-references

- `srouji` hardcode appears here, as a verified bug, **and** as a blocker for the AI WhatsApp agent (see `PLAN_TODOS.md` §B4) — one fix unlocks three.
- Payment stubs here ↔ `BUGS.md` C1/H6/H13 ↔ `PLAN_TODOS.md` deferred patient-checkout / tenant-refund gap.

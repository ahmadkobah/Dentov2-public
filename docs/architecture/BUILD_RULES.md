# Dento v2 — Build Rules

> **Purpose:** Single source of truth for ALL coding conventions, patterns, and standards.
> Every phase, every file, every PR must follow these rules.
> **Authority:** Extracted from all planning docs. When in doubt, see §15 Document Authority.
> **Created:** Phase 3, Week 8 — before frontend implementation begins.

---

## Table of Contents

1. [Document Authority Hierarchy](#1-document-authority-hierarchy)
2. [Monorepo & Package Rules](#2-monorepo--package-rules)
3. [API Route Conventions](#3-api-route-conventions)
4. [API Error Response Contract](#4-api-error-response-contract)
5. [Backend Patterns](#5-backend-patterns)
6. [Database Conventions](#6-database-conventions)
7. [Shared Package Rules](#7-shared-package-rules)
8. [Frontend Architecture](#8-frontend-architecture)
9. [UI Component Rules](#9-ui-component-rules)
10. [Styling & Theming](#10-styling--theming)
11. [RTL / Bidirectional Support](#11-rtl--bidirectional-support)
12. [Responsive Design](#12-responsive-design)
13. [Accessibility (WCAG 2.1 AA)](#13-accessibility-wcag-21-aa)
14. [Animation & Motion](#14-animation--motion)
15. [Loading / Error / Empty States](#15-loading--error--empty-states)
16. [Security & Encryption](#16-security--encryption)
17. [Authentication & Authorization](#17-authentication--authorization)
18. [Testing Standards](#18-testing-standards)
19. [Build Verification Checklist](#19-build-verification-checklist)
20. [CI/CD Pipeline Rules](#20-cicd-pipeline-rules)
21. [Logging Standards](#21-logging-standards)
22. [Decision Log Overrides](#22-decision-log-overrides)
23. [Webhook Standards](#23-webhook-standards)
24. [Integration & Connectivity Rules](#24-integration--connectivity-rules)
25. [Branding System (Complete)](#25-branding-system-complete)
26. [v2 Clean-Build Rule](#26-v2-clean-build-rule)
27. [Document Cross-Reference Matrix](#27-document-cross-reference-matrix)
28. [Post-Implementation Compliance Scan](#28-post-implementation-compliance-scan)

---

## 1. Document Authority Hierarchy

When documents contradict each other, follow this priority (highest first):

| Priority | Document                     | What It Governs                                   |
| :------: | :--------------------------- | :------------------------------------------------ |
|    1     | `V2_DECISION_LOG.md`         | Overrides everything — final word on any conflict |
|    2     | `V2_DATABASE.md`             | Schema, indexes, embedding strategy               |
|    3     | `SECURITY_AND_ENCRYPTION.md` | All security layers, encryption, auth             |
|    4     | `IMPLEMENTATION_ROADMAP.md`  | Phase timing, what goes where                     |
|    5     | `TECH_REQUIREMENTS.md`       | Package versions, stack choices                   |
|    6     | `V2_STRUCTURE.md`            | File/folder organization                          |
|    7     | `ADMIN_PORTAL_SCREENS.md`    | UI wireframes, component specs                    |
|    8     | `DEV_PORTAL_SCREENS.md`      | Developer portal UI                               |
|    9     | `DENTO_V2_MASTER_PLAN.md`    | High-level vision (lowest authority)              |

> **`DATABASE_SCHEMA_EXTRACT.md` is DEPRECATED.** Use `V2_DATABASE.md` only.

---

## 2. Monorepo & Package Rules

### 2.1 Structure

```
apps/api          → @dento/api       (Fastify backend)
apps/admin        → @dento/admin     (Tenant admin portal)
apps/developer    → @dento/developer (Platform dev portal)
packages/shared   → @dento/shared    (Zod schemas, types, constants, utils)
packages/ui       → @dento/ui        (Shadcn/ui primitives, shared components)
```

### 2.2 Dependency Rules

| Rule                                          | Enforcement                                      |
| :-------------------------------------------- | :----------------------------------------------- |
| `strict-peer-dependencies=true` in `.npmrc`   | pnpm enforced                                    |
| `auto-install-peers=true` in `.npmrc`         | pnpm enforced                                    |
| Cross-package deps use `workspace:*` protocol | `"@dento/shared": "workspace:*"`                 |
| Never import directly across apps             | Always go through `@dento/shared` or `@dento/ui` |
| Shared code between FE + BE → `@dento/shared` | Schemas, types, constants                        |
| Shared UI components → `@dento/ui`            | Only React components used by 2+ apps            |
| Feature-specific components stay in the app   | Never lift single-use components to packages     |

### 2.3 Build Order

Turborepo handles this automatically via `turbo.json`:

```
@dento/shared → @dento/ui → @dento/api + @dento/admin + @dento/developer
```

### 2.4 Package Versions (Pinned)

| Package              | Version                          | Notes                           |
| :------------------- | :------------------------------- | :------------------------------ |
| React                | 19.x                             |                                 |
| Fastify              | 5.x                              |                                 |
| Mongoose             | 8.x                              |                                 |
| Zod                  | 3.x (upgrade to 4.x when stable) |                                 |
| Tailwind CSS         | 4.x                              | v4 with CSS-first config        |
| Zustand              | 5.x                              |                                 |
| TanStack React Query | 5.x                              |                                 |
| TanStack React Table | 8.x                              |                                 |
| React Hook Form      | 7.x                              | + `@hookform/resolvers` for Zod |
| FullCalendar         | 6.x                              | Free MIT edition only (no Pro)  |
| Recharts             | 2.x                              |                                 |
| Framer Motion        | 11.x                             | Minimal use, prefer CSS         |
| Vitest               | 2.x                              |                                 |
| MSW                  | 2.x                              |                                 |
| Pino                 | 9.x                              | Structured JSON logging         |
| BullMQ               | 5.x                              | Job queue                       |
| Socket.io            | 4.x                              | + `@socket.io/redis-adapter`    |

---

## 3. API Route Conventions

### 3.1 URL Pattern

```
/api/{resource}              → Collection (GET list, POST create)
/api/{resource}/:id          → Single item (GET, PUT, PATCH, DELETE)
/api/{resource}/:id/{action} → Sub-resource or action
```

> **No version prefix** — This is a private API consumed only by our own `admin` and
> `developer` apps. We deploy FE + BE together, so `/api/v1/` adds no value.
> If versioning is ever needed, it can be added later.

### 3.2 Naming Rules

| Rule                      | Example                              | Anti-pattern                         |
| :------------------------ | :----------------------------------- | :----------------------------------- |
| Plural nouns              | `/api/patients`                      | `/api/patient`                       |
| kebab-case for multi-word | `/api/appointment-types`             | `/api/appointmentTypes`              |
| No verbs in URL           | `PATCH /api/appointments/:id/status` | `/api/appointments/:id/updateStatus` |
| Sub-resources nested      | `/api/patients/:id/allergies`        | `/api/allergies?patientId=x`         |

### 3.3 HTTP Methods

| Method   | Purpose               | Response Code  |
| :------- | :-------------------- | :------------- |
| `GET`    | Read (single or list) | `200`          |
| `POST`   | Create                | `201`          |
| `PUT`    | Full replacement      | `200`          |
| `PATCH`  | Partial update        | `200`          |
| `DELETE` | Soft-delete (default) | `200` or `204` |

### 3.4 Tenant Resolution

Every tenant-scoped route requires the `X-Tenant-Slug` header:

```
X-Tenant-Slug: smile-clinic
```

The `tenantDbMiddleware` resolves this into a tenant-specific database connection via `useDb()`.

### 3.5 Route Registration Pattern

```typescript
// apps/api/src/tenant/routes/{feature}/{feature}.route.ts
import { FastifyInstance } from 'fastify';

export default async function featureRoutes(app: FastifyInstance) {
  // All routes under /api/{feature}
  app.get('/', { schema: { ... } }, listHandler);
  app.get('/:id', { schema: { ... } }, getByIdHandler);
  app.post('/', { schema: { ... } }, createHandler);
  app.put('/:id', { schema: { ... } }, updateHandler);
  app.delete('/:id', { schema: { ... } }, deleteHandler);
}
```

Register in `server.ts`:

```typescript
app.register(featureRoutes, { prefix: '/api/feature' });
```

### 3.6 Response Helpers

Always use the shared response utilities:

```typescript
import { apiResponse, apiError } from '../../utils/api-response';

// Success
return apiResponse(reply, 200, data, 'Patients fetched');
return apiResponse(reply, 201, patient, 'Patient created');

// Error
return apiError(reply, 404, 'Patient not found');
return apiError(reply, 422, 'Validation failed', errors);
```

---

## 4. API Error Response Contract

### 4.1 Standard Error Schema

Every error response MUST follow this exact shape:

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "Invalid email format" }],
  "requestId": "req_abc123",
  "timestamp": "2026-03-15T10:30:00.000Z"
}
```

### 4.2 HTTP Status Code Usage

| Code  | When                  | Example                                   |
| :---- | :-------------------- | :---------------------------------------- |
| `200` | Success (read/update) | GET patient, PATCH status                 |
| `201` | Created               | POST new patient                          |
| `204` | No content            | DELETE (hard delete)                      |
| `400` | Malformed request     | Invalid JSON, missing required field      |
| `401` | Not authenticated     | Missing/expired JWT                       |
| `403` | Not authorized        | Insufficient role/permissions             |
| `404` | Not found             | Patient doesn't exist                     |
| `409` | Conflict              | Duplicate email, version mismatch         |
| `422` | Validation error      | Zod validation failure                    |
| `429` | Rate limited          | Too many requests                         |
| `500` | Server error          | Uncaught exception (never leak internals) |

### 4.3 Success Response Shape

```json
{
  "success": true,
  "data": { ... },
  "message": "Patient created successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

The `meta` field is only included for paginated list responses.

---

## 5. Backend Patterns

### 5.1 Model Factory Pattern

Every Mongoose model MUST use the factory pattern for database-per-tenant:

```typescript
// apps/api/src/tenant/models/{model-name}.model.ts
import { Connection, Schema, Document } from 'mongoose';

export interface IModelName extends Document {
  // ... typed fields
}

const modelNameSchema = new Schema<IModelName>(
  {
    // ... schema definition
  },
  { timestamps: true },
);

// Indexes defined on the schema
modelNameSchema.index({ field: 1 });

export function getModelNameModel(connection: Connection) {
  return connection.models.ModelName || connection.model<IModelName>('ModelName', modelNameSchema);
}
```

**Rules:**

- Schema defined once at module level
- Factory function takes a `Connection` (from `useDb()`)
- Always check `connection.models.X` first (prevents re-compilation)
- Always include `{ timestamps: true }` for `createdAt` / `updatedAt`
- Soft-delete via `isActive: boolean` field (not actual deletion)

### 5.2 Service Layer Pattern

```typescript
// apps/api/src/tenant/services/{feature}.service.ts
import { Connection } from 'mongoose';
import { getFeatureModel } from '../models/feature.model.js';

export class FeatureService {
  private model;

  constructor(private connection: Connection) {
    this.model = getFeatureModel(connection);
  }

  // List with pagination, search, filters
  async list(query: QueryParams) { ... }

  // Get by ID
  async getById(id: string) { ... }

  // Create
  async create(data: CreateDto, userId: string) { ... }

  // Update
  async update(id: string, data: UpdateDto, userId: string) { ... }

  // Soft delete
  async delete(id: string, userId: string) { ... }
}
```

**Rules:**

- Constructor receives `Connection` — passed once, used by all methods
- Instance methods (no static) — cleaner API, standard DI pattern
- `userId` parameter for audit trail (`createdBy` / `updatedBy`)
- Never access `request` or `reply` in services — pure data layer
- Model resolved in constructor via factory: `getFeatureModel(connection)`

### 5.3 Route Handler Pattern

```typescript
async function handler(request: FastifyRequest, reply: FastifyReply) {
  const tenantDb = getTenantDb(request); // From middleware
  const userId = getUserId(request); // From JWT payload

  // Validate input (Zod already ran via schema)
  const data = request.body as CreateDto;

  // Call service
  const service = new FeatureService(tenantDb);
  const result = await service.create(data, userId);

  // Return standardized response
  return apiResponse(reply, 201, result, 'Created successfully');
}
```

**Rules:**

- Use `getTenantDb(request)` helper — never cast `request as AuthenticatedRequest`
- Use `getUserId(request)` helper — never access `request.user.userId` directly
- All validation happens in Zod schemas attached to route `schema` option
- Handlers are thin — delegate to service layer

### 5.4 Middleware Chain (Tenant Routes)

Every tenant-scoped route goes through this chain:

```
Request → authGuard → tenantDbMiddleware → roleGuard('module', 'perm') → handler
```

1. **`authGuard`** — Verifies JWT, attaches `request.user`
2. **`tenantDbMiddleware`** — Reads `X-Tenant-Slug`, calls `useDb()`, attaches `request.tenantDb`
3. **`roleGuard`** — Checks `request.user.role` against required permissions

---

## 6. Database Conventions

### 6.1 Architecture

- **Database-per-tenant:** Each tenant gets its own MongoDB database
- **Connection reuse:** `connection.useDb(tenantSlug, { useCache: true })` — reuses pool
- **Platform DB:** Separate database for tenants, subscriptions, platform users
- **Max pool size:** `maxPoolSize: 50` in connection options

### 6.2 Embedding Strategy

| Relationship                  | Storage                     | Example                                      |
| :---------------------------- | :-------------------------- | :------------------------------------------- |
| 1:1, always fetched together  | Embed                       | Patient → address, names                     |
| 1:few (< 50), owned by parent | Embed                       | Patient → allergies[], familyLinks[]         |
| 1:many (unbounded)            | Reference                   | Patient → Appointments (separate collection) |
| Many:many                     | Reference array or junction | Doctor → branches[], Patient → providers[]   |

### 6.3 Naming Conventions

| Item             | Convention                    | Example                                 |
| :--------------- | :---------------------------- | :-------------------------------------- |
| Collection names | PascalCase (Mongoose default) | `Patient`, `Appointment`                |
| Field names      | camelCase                     | `firstName`, `patientCode`, `createdBy` |
| Boolean fields   | `is` prefix                   | `isActive`, `isVerified`, `isEmergency` |
| Date fields      | `At` suffix                   | `createdAt`, `deletedAt`, `confirmedAt` |
| Reference fields | Entity + `Id`                 | `patientId`, `doctorId`, `branchId`     |
| Enum values      | snake_case                    | `in_progress`, `no_show`, `checked_out` |

### 6.4 Standard Fields (Every Collection)

```typescript
{
  isActive: { type: Boolean, default: true },     // Soft-delete flag
  createdBy: { type: Schema.Types.ObjectId },      // User who created
  updatedBy: { type: Schema.Types.ObjectId },      // User who last updated
  // timestamps: true provides:
  createdAt: Date,
  updatedAt: Date,
}
```

### 6.5 Index Strategy

- Every collection MUST have indexes for its most common queries
- Text indexes for searchable fields (name, code, phone, email)
- Compound indexes for filtered + sorted queries
- TTL indexes for temporary data (tokens, OTPs)
- Unique indexes for business keys (patientCode, email per tenant)

---

## 7. Shared Package Rules

### 7.1 What Goes in `@dento/shared`

| Content                     | Example                                      |
| :-------------------------- | :------------------------------------------- |
| Zod schemas                 | `createPatientSchema`, `loginSchema`         |
| TypeScript types/interfaces | `Patient`, `Appointment`, `ApiError`         |
| Constants                   | `ROLES`, `APPOINTMENT_STATUS`, `PERMISSIONS` |
| Pure utility functions      | `formatCurrency()`, `generateCode()`         |

### 7.2 What Does NOT Go in `@dento/shared`

| Content                 | Where Instead           |
| :---------------------- | :---------------------- |
| React components        | `@dento/ui`             |
| API-specific code       | `apps/api`              |
| Frontend-specific hooks | `apps/admin/src/hooks/` |
| Environment variables   | App-specific `env.ts`   |

### 7.3 Zod Schema Rules

```typescript
// Every schema MUST use .strict() to reject unknown keys
export const createPatientSchema = z
  .object({
    firstName: z.object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    }),
    // ...
  })
  .strict();

// Query schemas for list endpoints
export const patientQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    // ... feature-specific filters
  })
  .strict();
```

**Rules:**

- Always `.strict()` on create/update schemas (reject unknown keys)
- Query schemas use `.coerce` for URL params (strings → numbers)
- Shared between frontend forms + backend validation
- Export from `packages/shared/src/schemas/index.ts`

---

## 8. Frontend Architecture

### 8.1 Feature Folder Structure

Every feature follows this exact structure:

```
features/{feature-name}/
  ├── pages/              # Route-level components (one per route)
  │   ├── FeatureListPage.tsx
  │   └── FeatureDetailPage.tsx
  ├── components/         # Feature-specific UI components
  │   ├── FeatureForm.tsx
  │   ├── FeatureTable.tsx
  │   └── FeatureCard.tsx
  └── hooks/              # Feature-specific React Query hooks
      └── useFeature.ts   # All CRUD queries + mutations
```

### 8.2 Placement Rules

| Component/Hook         | Location                         | Criteria                                |
| :--------------------- | :------------------------------- | :-------------------------------------- |
| Used by 1 feature only | `features/{feature}/components/` | Default location                        |
| Used by 2+ features    | `@dento/ui`                      | Lift to shared package                  |
| Global state           | `src/stores/`                    | Zustand store                           |
| Global hooks           | `src/hooks/`                     | `useApi`, `useSocket`, `useRBAC`, etc.  |
| Route pages            | `features/{feature}/pages/`      | One component per route                 |
| Utility functions      | `src/lib/`                       | `api-client.ts`, `date.ts`, `format.ts` |

### 8.3 React Query Pattern

Every feature hook follows this pattern:

```typescript
// features/{feature}/hooks/useFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Query keys — always arrays, always consistent
const featureKeys = {
  all: ['features'] as const,
  lists: () => [...featureKeys.all, 'list'] as const,
  list: (filters: FeatureFilters) => [...featureKeys.lists(), filters] as const,
  details: () => [...featureKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureKeys.details(), id] as const,
};

// List query with pagination
export function useFeatureList(filters: FeatureFilters) {
  return useQuery({
    queryKey: featureKeys.list(filters),
    queryFn: () => apiClient.get('/api/features', { params: filters }),
  });
}

// Detail query
export function useFeatureDetail(id: string) {
  return useQuery({
    queryKey: featureKeys.detail(id),
    queryFn: () => apiClient.get(`/api/features/${id}`),
    enabled: !!id,
  });
}

// Create mutation
export function useCreateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeatureDto) => apiClient.post('/api/features', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureKeys.lists() });
    },
  });
}
```

### 8.4 Form Pattern

```typescript
// Always: React Hook Form + Zod resolver + shared schema
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFeatureSchema, type CreateFeatureInput } from '@dento/shared';

function FeatureForm({ onSubmit }: Props) {
  const form = useForm<CreateFeatureInput>({
    resolver: zodResolver(createFeatureSchema),
    defaultValues: { ... },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Use @dento/ui form components */}
    </form>
  );
}
```

### 8.5 State Management Rules

| State Type         | Tool                       | Example                          |
| :----------------- | :------------------------- | :------------------------------- |
| Server data (CRUD) | React Query                | Patient list, appointment detail |
| Global UI state    | Zustand (persisted)        | Theme, sidebar, branding         |
| Auth state         | Zustand (memory only)      | Access token — NEVER persisted   |
| Form state         | React Hook Form            | Patient form, appointment form   |
| URL state          | React Router search params | Filters, pagination, current tab |
| Component-local    | `useState` / `useReducer`  | Modal open/close, local toggles  |

### 8.6 Router Conventions

```typescript
// src/router.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'patients', element: <PatientListPage /> },
      { path: 'patients/:id', element: <PatientDetailPage /> },
      { path: 'appointments', element: <AppointmentPage /> },
      // ... more feature routes
    ],
  },
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      { index: true, element: <LoginPage /> },
    ],
  },
]);
```

---

## 9. UI Component Rules

### 9.1 Component Library

- **Primitives:** `@dento/ui` (based on Shadcn/ui + Radix primitives)
- **Icons:** Lucide React (consistent icon set)
- **Charts:** Recharts (with custom wrapper)
- **Calendar:** FullCalendar 6.x free (MIT)
- **Tables:** TanStack React Table 8

### 9.2 Component Categories

| Category  | Source                     | Examples                                     |
| :-------- | :------------------------- | :------------------------------------------- |
| Primitive | `@dento/ui`                | Button, Input, Label, Card, Badge, Separator |
| Composite | `@dento/ui` (if shared)    | DataTable, DatePicker, Dialog, Dropdown      |
| Feature   | `features/{x}/components/` | PatientForm, AppointmentCard                 |
| Layout    | `src/layouts/`             | DashboardLayout, AuthLayout, Header, Sidebar |
| State     | `features/{x}/components/` | TableSkeleton, ErrorState, EmptyState        |

### 9.3 DataTable Pattern

Every list page uses TanStack React Table with this structure:

```typescript
// Columns defined separately
const columns: ColumnDef<FeatureType>[] = [
  { accessorKey: 'name', header: 'Name', cell: ... },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge>...</Badge> },
  { id: 'actions', cell: ({ row }) => <ActionMenu>...</ActionMenu> },
];

// Table component
function FeatureTable({ data, isLoading, pagination, onPaginationChange }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,  // Server-side pagination
    pageCount,
    state: { pagination },
    onPaginationChange,
  });

  if (isLoading) return <TableSkeleton columns={4} rows={10} />;
  if (!data.length) return <EmptyState ... />;

  return <DataTable table={table} />;
}
```

---

## 10. Styling & Theming

### 10.1 Tailwind CSS v4 Usage

- Use utility classes directly — no custom CSS unless absolutely necessary
- Use `@dento/ui` `cn()` utility for conditional class merging
- Dark mode via `dark:` prefix (class-based, toggled by `ThemeProvider`)
- Brand colors via CSS custom properties (`--color-brand-*`)

### 10.2 Brand Theming

Tenant branding is applied at runtime via `useBrandingTheme()` hook:

```typescript
// This hook MUST be called in DashboardLayout
// It fetches branding config and applies CSS custom properties:
// --color-brand-50 through --color-brand-950
// These map to Tailwind classes: bg-brand-500, text-brand-700, etc.
```

**Rules:**

- Use `brand-*` Tailwind classes for all primary UI elements (buttons, links, active states)
- Never hardcode color hex values — always use Tailwind classes
- Fallback colors defined in `globals.css` (green #16a34a as default)
- `useBrandingTheme()` must be called in `DashboardLayout` — nowhere else

### 10.3 Dark Mode

- Toggle stored in `theme.store.ts` (Zustand, persisted)
- Applied via `dark` class on `<html>` element
- Every component MUST support dark mode
- Use `dark:bg-X`, `dark:text-X` variants
- Sidebar logo: show `logoDarkUrl` when dark mode active, `logoUrl` otherwise

### 10.4 Color System

| Purpose        | Tailwind Class               | Notes                        |
| :------------- | :--------------------------- | :--------------------------- |
| Primary brand  | `brand-500`, `brand-600`     | Dynamic from tenant branding |
| Backgrounds    | `white` / `dark:gray-900`    |                              |
| Cards          | `white` / `dark:gray-800`    |                              |
| Text primary   | `gray-900` / `dark:gray-100` |                              |
| Text secondary | `gray-500` / `dark:gray-400` |                              |
| Borders        | `gray-200` / `dark:gray-700` |                              |
| Success        | `green-500` / `green-600`    |                              |
| Warning        | `amber-500` / `amber-600`    |                              |
| Danger/Error   | `red-500` / `red-600`        |                              |
| Info           | `blue-500` / `blue-600`      |                              |

---

## 11. RTL / Bidirectional Support

### 11.1 Core Rule

**NEVER use `left` / `right` in CSS or Tailwind.** Always use logical properties:

| Physical (FORBIDDEN) | Logical (REQUIRED)            |
| :------------------- | :---------------------------- |
| `ml-4`               | `ms-4` (margin-inline-start)  |
| `mr-4`               | `me-4` (margin-inline-end)    |
| `pl-4`               | `ps-4` (padding-inline-start) |
| `pr-4`               | `pe-4` (padding-inline-end)   |
| `left-0`             | `start-0`                     |
| `right-0`            | `end-0`                       |
| `text-left`          | `text-start`                  |
| `text-right`         | `text-end`                    |
| `border-l`           | `border-s`                    |
| `border-r`           | `border-e`                    |
| `rounded-l`          | `rounded-s`                   |
| `rounded-r`          | `rounded-e`                   |

### 11.2 Direction Toggle

- Stored in `theme.store.ts` alongside dark mode
- Applied via `dir` attribute on `<html>` element
- Language selection determines direction: `ar` → RTL, `en` → LTR
- `<html lang="ar" dir="rtl">` or `<html lang="en" dir="ltr">`

### 11.3 Arabic Locale Requirements

Arabic is a **first-class language** in Dento v2. These rules apply when `lang="ar"`:

| Aspect                  | Requirement                                      | Implementation                                                       |
| :---------------------- | :----------------------------------------------- | :------------------------------------------------------------------- |
| **Font**                | Arabic-optimized font stack                      | `font-family: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', system-ui` |
| **Text direction**      | All layout flips automatically                   | `dir="rtl"` on `<html>` + Tailwind logical properties                |
| **Numbers**             | Western numerals (0-9), NOT Eastern Arabic (٠-٩) | Default browser behavior — no override needed                        |
| **Dates**               | Gregorian primary, Hijri optional                | `dayjs` + `@calendarize/hijri` plugin in `src/lib/date.ts`           |
| **Date format**         | `DD/MM/YYYY` for both locales                    | Consistent — no US-style MM/DD/YYYY                                  |
| **Currency**            | Per-tenant (EGP, SAR, AED, etc.)                 | `Intl.NumberFormat` with tenant's currency code                      |
| **Form labels**         | Arabic translations for all labels               | i18n keys: `t('patients.firstName')` → `الاسم الأول`                 |
| **Validation messages** | Arabic error messages                            | Zod `.message()` or i18n override                                    |
| **Calendar**            | FullCalendar RTL mode                            | `direction: 'rtl'` in FullCalendar config                            |
| **DataTable**           | Columns flip, actions on start side              | TanStack Table auto-handles with CSS logical properties              |
| **Search**              | Arabic text search works via MongoDB text index  | Text index supports Arabic — no special config                       |
| **Sidebar**             | Appears on the right side                        | Automatic with `dir="rtl"` + flexbox                                 |

**Font Loading:**

```css
/* globals.css — preload Arabic font */
@font-face {
  font-family: 'IBM Plex Sans Arabic';
  src: url('/fonts/IBMPlexSansArabic-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

html[lang='ar'] {
  font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
}
```

### 11.4 Special Cases

```tsx
// Icons that indicate direction (arrows, chevrons) must flip:
<ChevronRight className="rtl:rotate-180" />

// Flexbox automatically reverses in RTL — no special handling needed
<div className="flex gap-4">  {/* Items reorder automatically */}

// Sidebar border: use border-e (border on the "end" side)
<aside className="border-e border-gray-200">
```

### 11.5 Bilingual Text Fields

All user-facing text fields support `{ en: string, ar?: string }`:

```typescript
// Display: show current language, fallback to other
function displayName(name: { en: string; ar?: string }, lang: 'en' | 'ar') {
  return lang === 'ar' ? name.ar || name.en : name.en;
}
```

---

## 12. Responsive Design

### 12.1 Breakpoints

| Name    | Min Width | Tailwind Prefix | Sidebar Behavior          |
| :------ | :-------- | :-------------- | :------------------------ |
| Mobile  | 0px       | (default)       | Hidden (hamburger toggle) |
| Tablet  | 768px     | `md:`           | Collapsed (icons only)    |
| Desktop | 1024px    | `lg:`           | Expanded (full)           |
| Wide    | 1440px    | `xl:`           | Expanded + wider content  |

### 12.2 Layout Rules

- **Mobile-first approach:** Default styles for mobile, add `md:` / `lg:` for larger
- **Tables → Cards on mobile:** DataTables render as stacked cards below `md:`
- **Sidebar:** Controlled by `sidebar.store.ts` — auto-collapses below `lg:`
- **Forms:** Single column on mobile, 2-column grid on `md:`+
- **Modals/Dialogs:** Full-screen on mobile, centered on desktop

### 12.3 Pattern

```tsx
// Grid: 1 col mobile → 2 cols tablet → 3 cols desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Show/hide based on breakpoint
<div className="hidden lg:block">Desktop only</div>
<div className="block lg:hidden">Mobile/Tablet only</div>
```

---

## 13. Accessibility (WCAG 2.1 AA)

### 13.1 Required Standards

| Standard            | Requirement                                              |
| :------------------ | :------------------------------------------------------- |
| Color contrast      | 4.5:1 for text, 3:1 for UI elements                      |
| Focus indicators    | Visible ring on all interactive elements                 |
| Keyboard navigation | Tab order logical, Escape closes modals                  |
| Screen reader       | `aria-label` on icon-only buttons, `role` attributes     |
| Form labels         | Every input has visible `<Label>` or `aria-label`        |
| Error messages      | Linked to inputs via `aria-describedby`                  |
| Skip navigation     | Skip-to-content link for keyboard users                  |
| Images              | `alt` text on all images (empty `alt=""` for decorative) |

### 13.2 ESLint Enforcement

`eslint-plugin-jsx-a11y` is enabled and MUST NOT be disabled:

```json
// .eslintrc — these rules must stay ON:
"jsx-a11y/alt-text": "error",
"jsx-a11y/aria-props": "error",
"jsx-a11y/click-events-have-key-events": "error",
"jsx-a11y/no-noninteractive-element-interactions": "warn"
```

### 13.3 Component Patterns

```tsx
// Icon-only button — ALWAYS has aria-label
<Button variant="ghost" size="icon" aria-label="Delete patient">
  <Trash2 className="h-4 w-4" />
</Button>

// Form input — ALWAYS has Label
<div>
  <Label htmlFor="email">Email</Label>
  <Input id="email" aria-describedby="email-error" />
  {error && <p id="email-error" className="text-sm text-red-500">{error}</p>}
</div>

// Modal — proper ARIA roles (handled by Radix Dialog)
<Dialog>
  <DialogContent aria-describedby="dialog-desc">
    <DialogTitle>Confirm Delete</DialogTitle>
    <p id="dialog-desc">This action cannot be undone.</p>
  </DialogContent>
</Dialog>
```

---

## 14. Animation & Motion

### 14.1 Duration Standards

| Element                 | Duration | Easing                                      |
| :---------------------- | :------- | :------------------------------------------ |
| Sidebar expand/collapse | 200ms    | `ease-in-out`                               |
| Modal open/close        | 150ms    | `ease-out` (open), `ease-in` (close)        |
| Dropdown/popover        | 100ms    | `ease-out`                                  |
| Tooltip                 | 100ms    | `ease-out`                                  |
| Toast notification      | 200ms    | `ease-out` (enter), `ease-in` (exit)        |
| Skeleton pulse          | 1500ms   | `ease-in-out` (infinite)                    |
| Page transitions        | **NONE** | No page transition animations               |
| Route changes           | **NONE** | Instant render, no Framer Motion route wrap |

### 14.2 Rules

- **Transform-based only:** Animate `transform` and `opacity` only — never `width`/`height`/`margin`
- **`prefers-reduced-motion`:** Respect user's OS setting — disable all non-essential animation
- **Framer Motion:** Use sparingly — only for complex interactions (drag-and-drop, stagger lists)
- **CSS transitions preferred:** Use Tailwind `transition-*` for simple hover/focus states

```tsx
// Reduced motion support
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.15,
    // Disable for users who prefer reduced motion
    ...(prefersReducedMotion && { duration: 0 }),
  }}
/>
```

---

## 15. Loading / Error / Empty States

### 15.1 Three Standard Components

Every data-fetching page MUST handle all three states:

#### TableSkeleton

```tsx
<TableSkeleton columns={5} rows={10} />
// Renders animated placeholder rows matching the table structure
```

#### ErrorState

```tsx
<ErrorState title="Failed to load patients" message={error.message} onRetry={() => refetch()} />
// Shows error icon, message, and retry button
```

#### EmptyState

```tsx
<EmptyState
  icon={<Users className="h-12 w-12" />}
  title="No patients yet"
  description="Add your first patient to get started"
  action={<Button onClick={openForm}>Add Patient</Button>}
/>
// Shows icon, title, description, and optional CTA
```

### 15.2 Standard Query Pattern

```tsx
function FeatureListPage() {
  const { data, isLoading, isError, error, refetch } = useFeatureList(filters);

  if (isLoading) return <TableSkeleton columns={5} rows={10} />;
  if (isError) return <ErrorState title="Failed to load" message={error.message} onRetry={refetch} />;
  if (!data?.data?.length) return <EmptyState ... />;

  return <FeatureTable data={data.data} />;
}
```

---

## 16. Security & Encryption

### 16.1 PII Encryption (AES-256-GCM)

**Encrypted fields (per SECURITY_AND_ENCRYPTION.md §5.3):**

| Collection      | Field                      | Reason                                           |
| :-------------- | :------------------------- | :----------------------------------------------- |
| `patients`      | `nationalId`               | National ID number (PII)                         |
| `patients`      | `insurance[].policyNumber` | Insurance policy number                          |
| `patients`      | `medicalHistory.notes`     | Medical history (PHI)                            |
| `api_keys`      | `secretKey`                | SHA-256 hash (only prefix visible: `sk_...xxxx`) |
| `webhooks`      | `secret`                   | Webhook signing secret                           |
| `backup_config` | `encryptionKey`            | Backup encryption key                            |
| `settings`      | `smtpPassword`             | Tenant SMTP password (if custom server)          |

```typescript
// Format: iv:authTag:ciphertext (all hex)
// Key: ENCRYPTION_MASTER_KEY env var (64 hex chars = 32 bytes)
// Algorithm: AES-256-GCM with random 16-byte IV per encryption

import { encryptField, decryptField } from '../../utils/encryption';

// Encrypt before save
patient.nationalId = encryptField(rawNationalId);

// Decrypt after read
const rawNationalId = decryptField(patient.nationalId);
```

**Rules:**

- NEVER log encrypted field values
- NEVER return encrypted fields in API responses without decryption
- Encryption is optional (graceful degradation if `ENCRYPTION_MASTER_KEY` not set)
- Key rotation: every 6 months (re-encrypt all records with new key)

### 16.2 Input Validation (Three Layers)

Every input goes through **three** validation layers (per SECURITY §13.2):

```
User Input → [1] Frontend Zod Validation (UX: instant feedback)
           → [2] Backend Zod Validation  (Security: server enforces)
           → [3] Mongoose Schema          (DB: last line of defense)
```

**Rules:**

- **Zod `.strict()`:** Every create/update schema rejects unknown keys
- **NoSQL injection prevention:** Block any value containing MongoDB operators (`$gt`, `$ne`, `$where`, etc.)
- **XSS prevention:** React auto-escapes JSX; `Content-Type: application/json` prevents HTML injection
- **Rich text sanitization:** Use `DOMPurify` for any rich-text fields (procedure notes, chat messages)
- **`dangerouslySetInnerHTML`:** **FORBIDDEN** — ESLint rule enforces this (see §13.2)
- **Request size limit:** 1MB default, 50MB for file uploads

### 16.3 Rate Limiting

Three tiers:

| Tier    | Limit        | Scope   | Applies To                      |
| :------ | :----------- | :------ | :------------------------------ |
| Global  | 100 req/min  | Per IP  | All routes                      |
| Auth    | 5 req/min    | Per IP  | `/auth/login`, `/auth/register` |
| API Key | 1000 req/min | Per key | External API usage              |

### 16.4 File Upload Pipeline

Every file upload goes through exactly 7 steps:

1. **Size check** — Reject if over category limit (5MB avatar, 25MB xray, 150MB CBCT)
2. **MIME type check** — Magic bytes, not just extension
3. **Extension whitelist** — Only allowed extensions per category
4. **EXIF strip** — Remove metadata from images (privacy)
5. **Virus scan** — ClamAV (Phase 3 Week 11+)
6. **S3/R2 upload** — Store in Cloudflare R2 with tenant-scoped path
7. **Database record** — Store metadata with presigned URL TTL

### 16.5 CORS Configuration

```typescript
{
  origin: [process.env.ADMIN_URL, process.env.DEVELOPER_URL],
  credentials: true,                     // Cookies for refresh token
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'X-Request-Id'],
  maxAge: 86400,                         // Preflight cache: 24h
}
```

### 16.6 HTTP Security Headers

`@fastify/helmet` MUST be registered with these settings (per SECURITY §2.2):

| Header                       | Value                                                           | Purpose                        |
| :--------------------------- | :-------------------------------------------------------------- | :----------------------------- |
| HSTS                         | `max-age=63072000; includeSubDomains; preload`                  | Force HTTPS for 2 years        |
| CSP                          | `default-src 'self'; script-src 'self'; frame-ancestors 'none'` | Prevent XSS, clickjacking      |
| X-Frame-Options              | `DENY`                                                          | Clickjacking protection        |
| X-Content-Type-Options       | `nosniff`                                                       | Prevent MIME sniffing          |
| X-Powered-By                 | **Removed**                                                     | Don't reveal server technology |
| Referrer-Policy              | `strict-origin-when-cross-origin`                               | Limit referrer leakage         |
| Cross-Origin-Opener-Policy   | `same-origin`                                                   | Isolate browsing context       |
| Cross-Origin-Resource-Policy | `same-origin`                                                   | Prevent cross-site embedding   |

### 16.7 Audit Logging

Every data mutation MUST be logged (per SECURITY §10.1). Audit log schema:

```typescript
{
  userId:      ObjectId,          // Who performed the action
  tenantSlug:  String,            // Which tenant
  action:      String,            // 'create' | 'update' | 'delete' | 'login' | 'export' | 'impersonate'
  resource:    String,            // 'patients' | 'invoices' | 'settings' | ...
  resourceId:  String,            // Document ID
  changes:     Object,            // { before: {...}, after: {...} } (only changed fields)
  ipAddress:   String,
  userAgent:   String,
  metadata:    Object,            // Additional info (e.g. exportFormat, impersonatedTenantSlug)
  createdAt:   Date,              // TTL Index: 365 days retention
}
```

**Rules:**

- Audit logs are **append-only** — never update or delete entries
- Use `auditLoggerPreHandler` / `auditLoggerOnResponse` middleware for automatic capture
- TTL index for automatic cleanup (365 days)
- NEVER log PII values (encrypted fields, passwords, tokens)

### 16.8 Tenant Isolation Security

Beyond database-per-tenant (§6.1), these code-level guards are REQUIRED (per SECURITY §12):

| Layer         | Guard                            | How                                                        |
| :------------ | :------------------------------- | :--------------------------------------------------------- |
| JWT           | Tenant-slug in token payload     | User can only access their own tenant                      |
| Middleware    | `tenantDbMiddleware`             | `useDb()` selects DB from JWT, never from user input alone |
| Route Guard   | Tenant check in every handler    | No cross-tenant access via URL manipulation                |
| File Storage  | Path prefix `tenants/{slug}/...` | S3/R2 bucket policy enforces isolation                     |
| Socket.io     | Room-based `tenant:{slug}`       | No cross-tenant real-time events                           |
| Webhooks      | Tenant-scoped events only        | Events delivered only to owning tenant                     |
| GDPR Deletion | `db.dropDatabase()`              | Guarantees complete tenant data removal                    |

### 16.9 Frontend Security

| Rule                  | Implementation                                               | Source         |
| :-------------------- | :----------------------------------------------------------- | :------------- |
| Access Token storage  | Memory only (Zustand, NOT persisted)                         | SECURITY §9.2  |
| Refresh Token storage | HttpOnly + Secure + SameSite Cookie                          | SECURITY §3.1  |
| Source Maps           | **Disabled** in production (`build.sourcemap: false`)        | SECURITY §13.1 |
| Env Variables         | Only `VITE_*` prefix exposed in bundle                       | SECURITY §13.1 |
| No secrets in bundle  | CI check: no API keys/secrets in frontend code               | SECURITY §13.1 |
| CSRF protection       | Bearer token in header (not cookie-based auth for API calls) | SECURITY §13.1 |
| Subresource Integrity | SRI hashes for any external scripts                          | SECURITY §13.1 |

### 16.10 S3/R2 File Storage Security

| Rule               | Detail                                                         |
| :----------------- | :------------------------------------------------------------- |
| Public access      | **NEVER** — bucket is private, access only via pre-signed URLs |
| Pre-signed URL TTL | 1 hour (configurable per category)                             |
| CORS on bucket     | Only `admin.dento.app` + `dev.dento.app` origins               |
| Path isolation     | `tenants/{tenant_slug}/...` — enforced by bucket policy        |
| Cross-tenant       | Tenant A **cannot** access Tenant B's files                    |

---

## 17. Authentication & Authorization

### 17.1 JWT Dual-Token Strategy

| Token         | Lifetime   | Storage                              | Purpose            |
| :------------ | :--------- | :----------------------------------- | :----------------- |
| Access Token  | 15 minutes | Memory only (Zustand, NOT persisted) | API authentication |
| Refresh Token | 7 days     | HttpOnly Secure cookie               | Token renewal      |

**Rules:**

- Access token NEVER in localStorage/sessionStorage/cookies
- Refresh token ALWAYS HttpOnly + Secure + SameSite=Strict
- Token rotation: new refresh token on every refresh
- Reuse detection: if old refresh token is reused, revoke ALL sessions for that user

**Forbidden (per SECURITY §9.2):**

- ❌ Tokens in `localStorage` or `sessionStorage`
- ❌ Tokens in URL query parameters
- ❌ Tokens in log output (Pino redaction configured — see §21.3)
- ❌ Tokens in error messages or API responses

### 17.2 Access Token Payload

```typescript
interface AccessTokenPayload {
  userId: string;
  email: string;
  tenantSlug: string;
  role: string;
  sessionId: string;
}
```

### 17.3 Password Security

**Hashing:** Argon2id (NOT bcrypt — Decision Log overrides Security doc §3.3):

```typescript
{
  type: argon2.argon2id,
  memoryCost: 65536,    // 64 MB
  timeCost: 3,
  parallelism: 4,
}
```

**Password Policy (per SECURITY §3.3):**

| Rule             | Enforcement                                          |
| :--------------- | :--------------------------------------------------- |
| Minimum length   | 8 characters                                         |
| Complexity       | Min. 1 uppercase + 1 number + 1 special character    |
| Known passwords  | Check against top-10,000 password list (server-side) |
| Password history | Last 5 hashes stored — reuse blocked                 |
| Password change  | Current password must be entered                     |
| Reset token      | Hashed with SHA-256, 1-hour TTL, single-use          |

### 17.4 RBAC (Role-Based Access Control)

8 roles (hierarchy — higher includes lower):

```
platform_owner > platform_admin >
owner > admin > office_manager > dentist > hygienist > receptionist
```

Permissions are **code-defined** (not in database):

```typescript
// packages/shared/src/constants/permissions.ts
const PERMISSIONS = {
  patients: { view: [...], create: [...], edit: [...], delete: [...] },
  appointments: { view: [...], create: [...], edit: [...], delete: [...] },
  // ...
};
```

Frontend uses `useRBAC()` hook:

```tsx
const { canView, canEdit } = useRBAC('patients');
if (!canView) return <AccessDenied />;
```

**Row-Level Security (per SECURITY §4.3):**

Roles with "Own Records Only" scope MUST have query filters enforced in services:

```typescript
// Dentists see ONLY their own appointments, leave requests, etc.
if (role !== 'tenant_admin' && role !== 'platform_admin' && role !== 'admin') {
  query.doctorId = userId; // Filter to own records
}
```

- `platform_admin` / `tenant_admin` / `admin` — see all records
- `dentist` / `hygienist` — own records only for: appointments, leave requests, schedules
- `receptionist` / `office_manager` — all records for their permitted modules

### 17.5 Key Rotation Schedule

| Key                   | Rotation Period        | Alert Before |
| :-------------------- | :--------------------- | :----------- |
| JWT signing secret    | 90 days                | 7 days       |
| Encryption master key | 6 months               | 14 days      |
| API keys              | Manual (on compromise) | —            |
| Webhook secrets       | Manual (on compromise) | —            |

### 17.6 Brute-Force Protection (Progressive Cooldown)

Per SECURITY §3.4, login endpoints implement progressive cooldown:

```
Failed attempts:   1-3     4-6       7-9        10-12      13-15     16+
Cooldown:           —      5 min     15 min     30 min     1 hour    IP Block
```

| Component       | Technology                                                       |
| :-------------- | :--------------------------------------------------------------- |
| Attempt counter | Redis key: `auth:attempts:{ip}:{email}` (TTL 1h)                 |
| Cooldown timer  | Redis key: `auth:blocked:{ip}:{email}` (TTL = cooldown duration) |
| IP block        | Persistent until manual unblock                                  |
| Audit trail     | `login_attempts` collection (90-day TTL index)                   |

**Rules:**

- Check `checkLoginAllowed()` BEFORE password verification
- Record `recordFailedAttempt()` on invalid credentials
- Call `clearFailedAttempts()` on successful login
- Always return generic "Invalid email or password" (prevent user enumeration)

### 17.7 Session Management

Per SECURITY §9.1, every authenticated user has tracked sessions:

| Feature           | Implementation                                           |
| :---------------- | :------------------------------------------------------- |
| Active devices    | `user_sessions` collection (browser, OS, IP, user agent) |
| Remote logout     | User can revoke single session or all sessions           |
| Session TTL       | MongoDB TTL index on `expiresAt` — auto-cleanup          |
| Device info       | Parse `User-Agent` for device type, browser, OS          |
| Max sessions      | 5 concurrent active sessions per user (configurable)     |
| Anomaly detection | New country → email alert to user (Phase 6+)             |

**Session Record Schema:**

```typescript
{
  userId:          ObjectId,
  sessionId:       String,       // nanoid(16), unique
  refreshTokenJti: String,       // JWT ID of current refresh token
  userAgent:       String,
  ipAddress:       String,
  deviceType:      'desktop' | 'mobile' | 'tablet' | 'unknown',
  browser:         String,
  os:              String,
  isActive:        Boolean,
  lastActivityAt:  Date,
  expiresAt:       Date,         // TTL index → auto-delete
}
```

### 17.8 2FA Readiness (Phase 6+)

Per SECURITY §3.5, the system is designed to support 2FA in Phase 6:

| Method                      | Library                            | Status  |
| :-------------------------- | :--------------------------------- | :------ |
| TOTP (Google Authenticator) | `otplib`                           | Phase 6 |
| OTP via SMS                 | Twilio                             | Phase 6 |
| OTP via Email               | Resend                             | Phase 6 |
| Biometric (Mobile)          | `expo-local-authentication`        | Phase 7 |
| Recovery Codes              | 10 one-time codes, Argon2id-hashed | Phase 6 |

> `totpVerifySchema` already exists in `@dento/shared` — ready for integration.

---

## 18. Testing Standards

### 18.1 Test Stack

| Tool                      | Purpose                               |
| :------------------------ | :------------------------------------ |
| **Vitest 2.x**            | Test runner + assertions              |
| **MSW 2.x**               | Mock API responses for frontend       |
| **Testing Library 16.x**  | React component testing               |
| **supertest**             | HTTP integration tests for API routes |
| **mongodb-memory-server** | In-memory MongoDB for service tests   |
| **@faker-js/faker**       | Generate realistic test data          |

### 18.2 Coverage Targets by Phase

| Phase    | Statements | Functions | Lines | Branches |
| :------- | :--------- | :-------- | :---- | :------- |
| Phase 3  | 60%        | 60%       | 60%   | 50%      |
| Phase 4  | 65%        | 65%       | 65%   | 55%      |
| Phase 5+ | 70%        | 70%       | 70%   | 60%      |

### 18.3 Test File Naming

```
{feature}.service.test.ts     → Service layer tests
{feature}.route.test.ts       → API route integration tests
{Feature}Page.test.tsx        → Page-level rendering tests
{Feature}Form.test.tsx        → Form interaction tests
use{Feature}.test.ts          → Hook tests
```

### 18.4 Test Structure Pattern

```typescript
describe('PatientService', () => {
  let connection: Connection;

  beforeAll(async () => {
    // Start mongodb-memory-server
    connection = await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('create', () => {
    it('should create a patient with valid data', async () => { ... });
    it('should encrypt PII fields', async () => { ... });
    it('should generate a unique patientCode', async () => { ... });
    it('should reject duplicate nationalId', async () => { ... });
  });

  describe('list', () => {
    it('should return paginated results', async () => { ... });
    it('should filter by status', async () => { ... });
    it('should search by name (text index)', async () => { ... });
  });
});
```

### 18.5 What to Test

| Layer     | What to Test                                  | What NOT to Test                     |
| :-------- | :-------------------------------------------- | :----------------------------------- |
| Service   | Business logic, validation, edge cases        | Mongoose internals                   |
| Route     | HTTP status codes, auth, response shape       | Business logic (delegate to service) |
| Component | Rendering, user interactions, a11y            | Implementation details               |
| Hook      | Return values, loading states, error handling | React Query internals                |

### 18.6 ESLint Configuration Rules

ESLint enforces code quality across all packages. These rulesets MUST stay enabled:

| Ruleset              | Package          | Key Rules                                                          |
| :------------------- | :--------------- | :----------------------------------------------------------------- |
| `@typescript-eslint` | All              | `no-explicit-any` (warn), `no-unused-vars` (error), strict mode    |
| `jsx-a11y`           | Admin, Developer | `alt-text`, `aria-props`, `click-events-have-key-events` (see §13) |
| `react-hooks`        | Admin, Developer | `rules-of-hooks` (error), `exhaustive-deps` (warn)                 |
| `import`             | All              | `no-duplicates`, `order` (groups: builtin → external → internal)   |
| Custom               | API              | `no-console` (error) — use Pino logger instead                     |

**NEVER disable ESLint rules inline** (`// eslint-disable`) without a documented reason in a comment explaining why.

---

## 19. Build Verification Checklist

**Run after EVERY implementation session (not just at the end of a phase):**

### Step 1: Build All Packages

```bash
pnpm turbo build
```

All packages must build with zero errors. Warnings are acceptable if pre-existing.

**What this catches:** TypeScript compilation errors, missing imports, broken module resolution, circular dependencies.

### Step 2: Lint All Packages

```bash
pnpm turbo lint
```

**Zero new errors.** Warnings tracked but not blocking.

**What ESLint catches per category:**

| Category      | What It Checks                                 |
| :------------ | :--------------------------------------------- |
| TypeScript    | Unused vars, explicit `any`, type mismatches   |
| React Hooks   | Rules of hooks violations, missing deps        |
| Accessibility | Missing `alt`, `aria-label`, keyboard handlers |
| Imports       | Duplicate imports, wrong import order          |
| Console       | `console.log` in API (must use Pino)           |
| Security      | No `dangerouslySetInnerHTML` without review    |

### Step 3: Type Check

```bash
pnpm turbo typecheck
# OR per-package:
pnpm --filter @dento/admin exec tsc -b --noEmit
pnpm --filter @dento/api exec tsc --noEmit
pnpm --filter @dento/shared exec tsc --noEmit
```

Zero TypeScript errors across all packages.

**What this catches beyond build:** Type errors in non-emitted files (test files, type-only imports), stricter checks than bundler mode.

### Step 4: Verify New Files

Check for compile errors specifically in newly created/modified files:

```bash
# In VS Code: check Problems panel for new files
# Or run: get_errors tool on each new file path
```

### Step 5: Run Tests (When Tests Exist)

```bash
pnpm turbo test
# With coverage:
pnpm turbo test -- --coverage
```

All tests pass. No skipped tests without documented reason.

**What tests catch:**

| Test Type       | Verifies                                            |
| :-------------- | :-------------------------------------------------- |
| Service tests   | Business logic, encryption, pagination, edge cases  |
| Route tests     | HTTP status codes, auth enforcement, response shape |
| Component tests | Rendering, user clicks, form validation, a11y       |
| Hook tests      | Loading states, error handling, cache invalidation  |

### Step 6: Cross-Layer Integration Check

After adding a new feature, verify the full chain works:

```
✅ Zod schema in @dento/shared compiles
✅ Backend route uses the schema for validation
✅ Backend service is called by the route handler
✅ Frontend hook calls the correct API endpoint
✅ Frontend page uses the hook and renders data
✅ Sidebar link routes to the page
✅ All buttons have working handlers
✅ Loading/Error/Empty states are handled
```

### Verification Log Format

After verification, log results:

```
BUILD VERIFICATION:
  shared   ✅  XX.XX KB
  api      ✅  XXX.XX KB
  admin    ✅  X,XXX.XX KB
  lint     ✅  0 errors / XX warnings
  types    ✅  0 errors
  tests    ✅  XX passed / 0 failed
  integration ✅  All routes connected, all buttons functional
```

---

## 20. CI/CD Pipeline Rules

### 20.1 Three Workflows

| Workflow           | Trigger         | Steps                                   |
| :----------------- | :-------------- | :-------------------------------------- |
| `ci.yml`           | Every PR        | Lint → Type Check → Test → Build        |
| `deploy-api.yml`   | Merge to `main` | Build → Push Docker → Deploy to Railway |
| `deploy-admin.yml` | Merge to `main` | Build → Deploy to Vercel                |

### 20.2 PR Requirements

- All CI checks must pass before merge
- No direct pushes to `main` — always through PR
- Security audit: `npm audit` + TruffleHog (secrets detection)

### 20.3 Environment Tiers

| Branch      | Environment | URL                        |
| :---------- | :---------- | :------------------------- |
| `feature/*` | Preview     | Auto-generated preview URL |
| `staging`   | Staging     | `staging.dento.app`        |
| `main`      | Production  | `dento.app`                |

---

## 21. Logging Standards

### 21.1 Logger

**Pino** (structured JSON) — configured in `apps/api/src/utils/logger.ts`.

### 21.2 Log Levels

| Level   | When                        | Example                         |
| :------ | :-------------------------- | :------------------------------ |
| `fatal` | Process cannot continue     | MongoDB connection lost         |
| `error` | Operation failed            | Payment processing failed       |
| `warn`  | Recoverable issue           | Rate limit approaching          |
| `info`  | Business event              | User logged in, patient created |
| `debug` | Dev detail                  | Query timing, cache hit/miss    |
| `trace` | Extreme detail (never prod) | Full request/response bodies    |

### 21.3 Redacted Fields

NEVER log these fields — Pino redaction configured:

```
authorization, cookie, password, refreshToken, accessToken,
nationalId, policyNumber, ENCRYPTION_MASTER_KEY
```

### 21.4 Correlation

- Every request gets a `requestId` (Fastify auto-generates)
- `requestId` is included in every log line automatically
- `requestId` is returned in `X-Request-Id` response header
- Frontend sends `X-Request-Id` header for end-to-end tracing

---

## 22. Decision Log Overrides

These are explicit overrides from `V2_DECISION_LOG.md` that take precedence:

| #   | Topic               | Override                                                           | Overrides                               |
| :-- | :------------------ | :----------------------------------------------------------------- | :-------------------------------------- |
| 1   | Password hashing    | **Argon2id** (not bcrypt)                                          | SECURITY doc §3                         |
| 2   | Database schema doc | **V2_DATABASE.md** only                                            | DATABASE_SCHEMA_EXTRACT.md (deprecated) |
| 3   | API route prefix    | `/api/` unversioned (private API, FE+BE deploy together)           | `/api/v1/` not needed                   |
| 4   | FullCalendar        | Free MIT edition only                                              | No Pro license                          |
| 5   | Chair timeline view | Custom CSS Grid component                                          | FullCalendar Timeline (requires Pro)    |
| 6   | ClamAV timing       | Phase 3 Week 11                                                    | Not earlier                             |
| 7   | 2FA timing          | Phase 3 Week 13                                                    | Not earlier                             |
| 8   | Appointment status  | `booked/confirmed/arrived/in_progress/completed/cancelled/no_show` | Any other status names                  |
| 9   | Patient status      | `active/inactive/deceased/transferred`                             | Any other status names                  |
| 10  | Peer dependencies   | `strict-peer-dependencies=true`                                    | Loose peer deps                         |

---

## 23. Webhook Standards

### 23.1 Webhook Envelope (All Events)

Every webhook payload MUST follow this envelope:

```typescript
interface WebhookPayload {
  id: string; // Unique event ID (UUID v4)
  type: string; // "patient.created", "appointment.booked", etc.
  tenantSlug: string;
  apiVersion: '2026-03-01'; // API version for backward compat
  createdAt: string; // ISO 8601
  data: Record<string, unknown>; // Event-specific payload
}
```

### 23.2 Webhook Headers

```
X-Webhook-Id: <event id>
X-Webhook-Signature: sha256=<HMAC-SHA256 of body using tenant's webhook secret>
X-Webhook-Timestamp: <unix seconds>
Content-Type: application/json
```

### 23.3 Signature Verification

```typescript
// Receiver verifies: HMAC-SHA256(webhookSecret, `${timestamp}.${body}`)
// Reject if signature mismatch OR timestamp > 5 minutes old (replay protection)
```

### 23.4 Event Catalog (24 Events)

| Category          | Events                                                                                                                 |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Patient**       | `patient.created`, `patient.updated`, `patient.deleted`                                                                |
| **Appointment**   | `appointment.booked`, `appointment.confirmed`, `appointment.cancelled`, `appointment.completed`, `appointment.no_show` |
| **Treatment**     | `treatment_plan.created`, `treatment_plan.accepted`                                                                    |
| **Financial**     | `invoice.issued`, `invoice.paid`, `payment.received`                                                                   |
| **Clinical**      | `prescription.created`, `lab_order.created`, `lab_order.status_changed`, `xray.uploaded`                               |
| **Inventory**     | `inventory.low_stock`, `inventory.expired`                                                                             |
| **HR**            | `leave.requested`, `leave.approved`                                                                                    |
| **Communication** | `chat.message`                                                                                                         |
| **Users**         | `user.created`, `user.deactivated`                                                                                     |

### 23.5 PII Redaction in Webhooks

PII is **ALWAYS** masked in webhook payloads — even if the field is decrypted internally:

| Field        | Masking                     | Example            |
| :----------- | :-------------------------- | :----------------- |
| `phone`      | First 3 + last 4            | `"+20***1234"`     |
| `email`      | First char + `***` + domain | `"a***@gmail.com"` |
| `nationalId` | Completely hidden           | `"***"`            |

### 23.6 Webhook Delivery Rules

- **Retry:** 3 attempts with exponential backoff (5s, 30s, 5min)
- **Timeout:** 10 seconds per delivery attempt
- **Failure logging:** Log failed deliveries at `error` level with requestId
- **Secret rotation:** Manual by tenant. Old secret has 1-hour grace period

---

## 24. Integration & Connectivity Rules

### 24.1 Every Route Must Be Connected

**No dead links.** Every sidebar navigation item MUST route to a real page:

| If adding a sidebar item...         | You MUST also...                                           |
| :---------------------------------- | :--------------------------------------------------------- |
| Add nav link in `sidebar-config.ts` | Create the page component in `features/{feature}/pages/`   |
| Create the page component           | Add the route in `router.tsx`                              |
| Add the route                       | Create the React Query hook in `features/{feature}/hooks/` |
| Create the hook                     | Ensure the API endpoint exists and returns data            |

**Verification:** After adding any feature, manually confirm:

- Clicking the sidebar link renders the page (not a fallback/404)
- The page loads data from the API (or shows EmptyState if no data)

### 24.2 Every Button Must Be Functional

**No placeholder buttons.** Every button rendered in the UI MUST have a working handler:

| Button Type     | Required Behavior                                                    |
| :-------------- | :------------------------------------------------------------------- |
| "Add/Create"    | Opens a form dialog OR navigates to create page                      |
| "Edit"          | Opens pre-filled form OR navigates to edit page                      |
| "Delete"        | Shows confirmation dialog → calls delete mutation                    |
| "Save/Submit"   | Validates form (Zod) → calls create/update mutation → shows toast    |
| "Cancel"        | Closes dialog/form, resets form state                                |
| "Retry"         | Calls `refetch()` on the failed query                                |
| "Export"        | Triggers CSV/PDF download (or shows "coming soon" toast if deferred) |
| "Filter/Search" | Updates query params → triggers re-fetch                             |
| Pagination      | Updates page state → fetches correct page                            |

**Rules:**

- If a feature has a button that can't work yet (API not ready), use `disabled` + tooltip explaining why
- NEVER render a button with no `onClick` handler
- All destructive actions (delete, cancel) require a confirmation dialog
- All create/update actions show success toast on completion
- All failed actions show error toast with retry option

### 24.3 Frontend ↔ Backend Contract

Every frontend page is connected to the backend through this chain:

```
Page → useFeatureHook() → apiClient.get/post() → /api/{resource} → Service → Model → MongoDB
```

**Verification per feature:**

| Layer      | Check                                                                                     |
| :--------- | :---------------------------------------------------------------------------------------- |
| Schema     | Zod schema exists in `@dento/shared` — same schema used by FE form AND BE route           |
| Hook       | `useFeatureList` / `useFeatureDetail` / `useCreateFeature` exist in `features/{x}/hooks/` |
| API Client | Calls correct endpoint with correct HTTP method                                           |
| Route      | Endpoint registered in `server.ts` with correct prefix                                    |
| Service    | Service method called by route handler                                                    |
| Model      | Model factory used with tenant connection                                                 |

### 24.4 Toast Notifications

Every mutation provides user feedback:

```typescript
// In mutation onSuccess:
toast.success('Patient created successfully');

// In mutation onError:
toast.error(error.message || 'Something went wrong');

// NEVER silently succeed or fail
```

### 24.5 Form → API Field Mapping

Form field names MUST match Zod schema keys MUST match API body keys MUST match MongoDB field names:

```
Form input name="firstName.en" → Schema: firstName: { en: z.string() } → API body: { firstName: { en: "..." } } → MongoDB: { firstName: { en: "..." } }
```

No field name translation between layers. One name, end-to-end.

---

## 25. Branding System (Complete)

### 25.1 Branding Store Fields

The `branding.store.ts` (Zustand, persisted) contains:

| Field          | Type                          | Default           | Purpose                               |
| :------------- | :---------------------------- | :---------------- | :------------------------------------ |
| `logoUrl`      | `string \| null`              | `null`            | Tenant logo (light mode)              |
| `logoDarkUrl`  | `string \| null`              | `null`            | Tenant logo (dark mode variant)       |
| `faviconUrl`   | `string \| null`              | `null`            | Browser tab favicon                   |
| `clinicName`   | `{ en: string; ar?: string }` | `{ en: 'Dento' }` | Displayed in sidebar header           |
| `phone`        | `string`                      | `''`              | Clinic phone                          |
| `email`        | `string`                      | `''`              | Clinic email                          |
| `website`      | `string`                      | `''`              | Clinic website                        |
| `address`      | `string`                      | `''`              | Clinic address                        |
| `primaryColor` | `string`                      | `'#4f46e5'`       | Brand color seed for scale generation |
| `accentColor`  | `string`                      | `'#10b981'`       | Secondary accent                      |

### 25.2 Branding Flow

```
DashboardLayout mounts
  → useBrandingTheme() fires
    → GET /api/branding (with X-Tenant-Slug header)
    → Response: { logoUrl, primaryColor, clinicName, ... }
    → setBranding() updates Zustand store
    → generateColorScale(primaryColor) → HSL → 25 shades (50–950)
    → applyColorScaleToElement(document.documentElement, 'brand', scale)
    → CSS vars: --color-brand-50 ... --color-brand-950 set on <html>
    → applyFavicon(faviconUrl) → updates <link rel="icon">
    → applyTitle(clinicName.en) → updates document.title
```

### 25.3 Sidebar Branding Rules

```tsx
// AppSidebar reads from branding store:
const { logoUrl, logoDarkUrl, clinicName } = useBrandingStore();

// Logo rendering:
// - If logoUrl exists: <img src={isDark ? (logoDarkUrl || logoUrl) : logoUrl} />
// - If no logoUrl: fallback to 🦷 emoji

// Clinic name:
// - Display: clinicName.en || 'Dento'
// - When sidebar is collapsed: show only logo/emoji, hide text
```

### 25.4 Where Branding Appears

| Location            | What                                  | Source                            |
| :------------------ | :------------------------------------ | :-------------------------------- |
| Sidebar header      | Logo + clinic name                    | `branding.store`                  |
| Browser tab         | Favicon + title                       | `applyFavicon()` + `applyTitle()` |
| Primary buttons     | `bg-brand-600 hover:bg-brand-700`     | CSS custom properties             |
| Active sidebar item | `bg-brand-50 text-brand-700`          | CSS custom properties             |
| Links               | `text-brand-600 hover:text-brand-700` | CSS custom properties             |
| Charts accent       | `fill-brand-500`                      | CSS custom properties             |
| Login page          | Logo + clinic name                    | Fetched before auth               |

---

## 26. v2 Clean-Build Rule

### 26.1 No v1 Code

Dento v2 is built in a **completely new repository.** The following rules apply:

| Rule                      | Detail                                                                                            |
| :------------------------ | :------------------------------------------------------------------------------------------------ |
| **No code from v1**       | Zero files copied from the old `Dento` repository                                                 |
| **No v1 dependencies**    | v1 used Supabase/Postgres — none of that exists in v2                                             |
| **No v1 patterns**        | No Supabase client, no Postgres queries, no v1 auth flow                                          |
| **No v1 git history**     | Clean git history starting from Phase 0                                                           |
| **Domain knowledge only** | Business logic (tooth schema, invoice calc) extracted as _knowledge_, re-implemented from scratch |

### 26.2 What IS Carried Forward

- Business requirements from v1 users (features they need)
- UI/UX patterns as _inspiration_ (not copy-paste)
- Seed data recreated manually (medication lists, lab order types)
- Planning docs in `docs/planning/` — these ARE v2 originals

### 26.3 v2 Stack Identity

If you see ANY of these in the codebase, it's a v1 leak — remove it:

| v1 Pattern (FORBIDDEN)         | v2 Replacement                                       |
| :----------------------------- | :--------------------------------------------------- |
| `@supabase/supabase-js`        | Mongoose + MongoDB                                   |
| `pg` / `postgres`              | Mongoose                                             |
| SQL queries                    | Mongoose queries / aggregation pipelines             |
| `createClient()` (Supabase)    | `mongoose.connect()` / `connection.useDb()`          |
| `supabase.auth`                | Custom JWT + Argon2id                                |
| `supabase.storage`             | Cloudflare R2 + presigned URLs                       |
| `.env.local` with `SUPABASE_*` | `.env` with `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET` |

---

## 27. Document Cross-Reference Matrix

Every rule in this file traces back to a source planning document. Use this matrix to verify or deep-dive.

| BUILD_RULES Section            | Source Document                                   | Source Section(s)                                                                                              |
| :----------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------- |
| §1 Authority Hierarchy         | V2_DECISION_LOG.md                                | §27 Document Authority                                                                                         |
| §2 Monorepo & Packages         | V2_STRUCTURE.md, TECH_REQUIREMENTS.md             | Structure §1-4, Tech §1-5                                                                                      |
| §2.4 Package Versions          | TECH_REQUIREMENTS.md                              | §3 (Backend), §4 (Shared), §5 (Admin)                                                                          |
| §3 API Route Conventions       | V2_DECISION_LOG.md                                | §22 API Route Naming Convention                                                                                |
| §4 Error Response Contract     | V2_DECISION_LOG.md                                | §2 API Error/Success Contract                                                                                  |
| §5.1 Model Factory Pattern     | V2_DATABASE.md                                    | §1 Architecture, §4 Connection Strategy                                                                        |
| §5.4 Middleware Chain          | SECURITY_AND_ENCRYPTION.md                        | §4 RBAC 3-Level Chain                                                                                          |
| §6 Database Conventions        | V2_DATABASE.md                                    | §1-5 (all sections)                                                                                            |
| §7 Shared Package Rules        | V2_STRUCTURE.md                                   | §4 packages/shared                                                                                             |
| §8 Frontend Architecture       | V2_STRUCTURE.md                                   | §6 apps/admin, Feature Folder rationale                                                                        |
| §9 UI Components               | ADMIN_PORTAL_SCREENS.md                           | §1 Layout, Component references throughout                                                                     |
| §10 Styling & Theming          | ADMIN_PORTAL_SCREENS.md, V2_DECISION_LOG.md       | §1 Layout, §15 Responsive                                                                                      |
| §11 RTL / Bidirectional        | ADMIN_PORTAL_SCREENS.md                           | RTL/LTR Convention (top of doc), every wireframe                                                               |
| §12 Responsive Design          | V2_DECISION_LOG.md                                | §15 Responsive Breakpoints                                                                                     |
| §13 Accessibility              | V2_DECISION_LOG.md                                | §13 Accessibility Standards                                                                                    |
| §14 Animation & Motion         | V2_DECISION_LOG.md                                | §16 Animation & Transition Specs                                                                               |
| §15 Loading/Error/Empty        | V2_DECISION_LOG.md                                | §14 Loading/Error/Empty States                                                                                 |
| §16 Security & Encryption      | SECURITY_AND_ENCRYPTION.md                        | §2 Headers, §5 Encryption, §6 API Security, §7 Input, §8 Upload, §10 Audit, §12 Tenant Isolation, §13 Frontend |
| §17 Auth & Authorization       | SECURITY_AND_ENCRYPTION.md, V2_DECISION_LOG.md    | Security §3-4, §9 Sessions, Decision Log §1 (Argon2id)                                                         |
| §17.5 Key Rotation             | V2_DECISION_LOG.md                                | §19 Key Rotation Policy                                                                                        |
| §18 Testing Standards          | V2_DECISION_LOG.md                                | §11 Test Infrastructure                                                                                        |
| §19 Build Verification         | V2_DECISION_LOG.md, IMPLEMENTATION_ROADMAP.md     | §12 CI/CD, §13 Definition of Done                                                                              |
| §20 CI/CD Pipeline             | V2_DECISION_LOG.md                                | §12 CI/CD Pipeline Design                                                                                      |
| §21 Logging Standards          | V2_DECISION_LOG.md                                | §28 Structured Logging                                                                                         |
| §22 Decision Log Overrides     | V2_DECISION_LOG.md                                | §1, §8, §10, §20-§26                                                                                           |
| §23 Webhook Standards          | V2_DECISION_LOG.md                                | §3 Webhook Event Payload Schemas                                                                               |
| §24 Integration & Connectivity | ADMIN_PORTAL_SCREENS.md, V2_STRUCTURE.md          | Screen specs (buttons/actions), Structure §6                                                                   |
| §25 Branding System            | ADMIN_PORTAL_SCREENS.md, Implementation (Phase 2) | §1 Layout, branding.store.ts, useBrandingTheme.ts                                                              |
| §26 v2 Clean-Build             | IMPLEMENTATION_ROADMAP.md                         | Clean-Repo-Strategie (top of doc)                                                                              |
| §28 Compliance Scan            | ALL 6 planning docs                               | Mandatory post-implementation verification against all source documents                                        |

### ESLint → Source Mapping

| ESLint Rule Category   | Source Document         | Why                              |
| :--------------------- | :---------------------- | :------------------------------- |
| `jsx-a11y/*`           | V2_DECISION_LOG.md §13  | WCAG 2.1 AA compliance           |
| `@typescript-eslint/*` | TECH_REQUIREMENTS.md §1 | TypeScript strict mode           |
| `import/order`         | V2_STRUCTURE.md §6      | Consistent import ordering       |
| `no-console`           | V2_DECISION_LOG.md §28  | Use Pino logger, not console.log |

### Build Verification → Source Mapping

| Build Step                    | Source Document                                  | Why                                   |
| :---------------------------- | :----------------------------------------------- | :------------------------------------ |
| `turbo build` (all packages)  | IMPLEMENTATION_ROADMAP.md §13 Definition of Done | "Build succeeds with 0 errors"        |
| `turbo lint` (0 new errors)   | V2_DECISION_LOG.md §12 CI/CD                     | CI runs lint on every PR              |
| `tsc --noEmit` (type check)   | TECH_REQUIREMENTS.md §1                          | TypeScript strict mode                |
| `vitest run` (all tests pass) | V2_DECISION_LOG.md §11                           | 60% coverage target                   |
| Verify new file errors        | IMPLEMENTATION_ROADMAP.md §13                    | "No regressions in existing features" |

---

## Quick Reference Card

```
ROUTE:     /api/{plural-noun}             (kebab-case, no version prefix)
HEADER:    X-Tenant-Slug: {slug}
AUTH:      Bearer {accessToken}
ERROR:     { statusCode, error, message, details?, requestId, timestamp }
SUCCESS:   { success, data, message, meta? }

MODEL:     getXModel(connection)          (factory pattern)
SERVICE:   new XService(connection).method(..., userId)
HANDLER:   getTenantDb(request) + getUserId(request) → apiResponse()

SCHEMA:    z.object({}).strict()          (shared in @dento/shared)
FORM:      useForm + zodResolver          (React Hook Form + Zod)
QUERY:     useQuery/useMutation           (TanStack React Query)
STATE:     useFeatureList → isLoading / isError / data
UI:        <TableSkeleton> / <ErrorState> / <EmptyState>

STYLE:     brand-* classes               (Tailwind, from CSS vars)
BRANDING:  useBrandingTheme() in DashboardLayout only
RTL:       ms- me- ps- pe- text-start    (NEVER left/right)
ARABIC:    IBM Plex Sans Arabic font, Hijri optional, Gregorian primary
DARK:      dark:bg-* dark:text-*         (always supported)
A11Y:      aria-label on icon buttons    (WCAG 2.1 AA)

BUILD:     turbo build → turbo lint → typecheck → test → integration check
ESLINT:    jsx-a11y + @typescript-eslint + react-hooks + no-console (API)
ENCRYPT:   AES-256-GCM for PII          (nationalId, policyNumber, notes + 4 more)
PASSWORD:  Argon2id                      (NOT bcrypt — 8+ chars, upper+num+special)
TOKEN:     15min access (memory) + 7d refresh (HttpOnly cookie)
SESSION:   Max 5, device tracking, remote logout, TTL auto-cleanup
BRUTE:     Progressive cooldown           (5min→15min→30min→1h→IP block)
AUDIT:     Every mutation logged           (365-day retention, append-only)
HELMET:    HSTS + CSP + X-Frame-Options   (all required via @fastify/helmet)
WEBHOOK:   HMAC-SHA256 signed, 24 events, PII always redacted

CONNECT:   Sidebar link → Route → Page → Hook → API → Service → Model
BUTTONS:   Every button has onClick → mutation/navigation → toast feedback
NO v1:     Zero code from old repo. MongoDB only. No Supabase.
SCAN:      After every impl → verify against all 6 planning docs (§28)
```

---

## 28. Post-Implementation Compliance Scan

### 28.1 Mandatory Scan Rule

**After every feature implementation, fix batch, or phase milestone, the codebase MUST be scanned against all 6 core planning documents to verify full compliance.**

This is NOT optional. Skipping verification has caused regressions in past phases (e.g., M4 RTL violations missed in `apps/developer/` during Phase 0-2.5 fixes).

### 28.2 Documents to Scan Against

| #   | Document                     | What to Verify                                               |
| :-- | :--------------------------- | :----------------------------------------------------------- |
| 1   | `DENTO_V2_MASTER_PLAN.md`    | Feature scope matches plan, no scope creep or missing items  |
| 2   | `IMPLEMENTATION_ROADMAP.md`  | Correct phase timing, dependencies met, DoD satisfied        |
| 3   | `V2_DATABASE.md`             | Schema matches spec, indexes present, embedding strategy     |
| 4   | `V2_STRUCTURE.md`            | Files in correct locations, naming conventions, folder rules |
| 5   | `TECH_REQUIREMENTS.md`       | Correct package versions, no banned dependencies             |
| 6   | `SECURITY_AND_ENCRYPTION.md` | Auth, encryption, headers, RBAC, audit logging all compliant |

### 28.3 When to Run

| Trigger                              | Scan Scope                                         |
| :----------------------------------- | :------------------------------------------------- |
| Feature/endpoint implementation      | Changed files + all 6 docs                         |
| Bug fix / compliance fix batch       | Fixed files + relevant doc sections                |
| Phase milestone (e.g., Phase 3 done) | Full codebase sweep against all 6 docs             |
| `BUILD_RULES.md` itself is updated   | Re-verify codebase matches the new/changed rules   |
| Any planning doc is updated          | Re-verify affected BUILD_RULES sections + codebase |

### 28.4 Scan Checklist

For each scan, verify:

- [ ] **API routes** — paths, methods, auth requirements match MASTER_PLAN + ROADMAP
- [ ] **Database models** — fields, indexes, TTLs, embedding match V2_DATABASE
- [ ] **File structure** — new files in correct folders per V2_STRUCTURE
- [ ] **Package versions** — no version drift from TECH_REQUIREMENTS
- [ ] **Security** — encryption, auth flow, headers, RBAC match SECURITY_AND_ENCRYPTION
- [ ] **RTL / i18n** — logical CSS only, Arabic support per §11
- [ ] **Response shapes** — success/error contracts per §3-4
- [ ] **Patterns** — factory guards, service layer, helpers per §5
- [ ] **Build passes** — `turbo build` 0 errors, `turbo lint` 0 new warnings
- [ ] **No regressions** — changes didn't break files outside the immediate scope

### 28.5 Scan Output

Every scan MUST produce a summary (in conversation or commit message) with:

1. **Files scanned** — count and list
2. **Violations found** — categorized as Critical / Moderate / Info
3. **Fixes applied** — what changed, where
4. **Remaining gaps** — anything deferred with justification
5. **Build result** — pass/fail with task count

### 28.6 Failure Policy

- **Critical violations** (security, data contract, auth) — MUST be fixed before proceeding
- **Moderate violations** (RTL, naming, patterns) — MUST be fixed in the same session
- **Info-level gaps** (future-phase features, nice-to-haves) — document and defer

> **Rationale:** Past experience shows that fixes applied to one app (e.g., `apps/admin`) can miss
> identical violations in another (e.g., `apps/developer`). A mandatory full-scope scan prevents this.

---

> **This document is authoritative for implementation.** When coding any feature in any phase,
> consult this file first. If a rule here conflicts with implementation, the rule wins.
> If a rule here conflicts with `V2_DECISION_LOG.md`, the Decision Log wins (see §1).

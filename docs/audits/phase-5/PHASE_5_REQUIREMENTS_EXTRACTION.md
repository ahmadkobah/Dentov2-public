# Phase 5 — Inventory Module — Requirements Extraction

> **Extraction Date:** 2026-03-01
> **Source Documents:** 6 planning files (BUILD_RULES, V2_DATABASE, DENTO_V2_MASTER_PLAN, V2_DECISION_LOG, IMPLEMENTATION_ROADMAP, SECURITY_AND_ENCRYPTION)
> **Authority Chain:** V2_DECISION_LOG > V2_DATABASE > SECURITY_AND_ENCRYPTION > IMPLEMENTATION_ROADMAP > TECH_REQUIREMENTS > V2_STRUCTURE > MASTER_PLAN
> **Purpose:** Exhaustive requirements checklist for compliance auditing of the Inventory Management module

---

## Table of Contents

1. [Database/Model Requirements](#1-databasemodel-requirements)
2. [API Route Requirements](#2-api-route-requirements)
3. [Service Layer Requirements](#3-service-layer-requirements)
4. [Frontend Requirements](#4-frontend-requirements)
5. [Testing Requirements](#5-testing-requirements)
6. [Security Requirements](#6-security-requirements)
7. [Webhook/Event Requirements](#7-webhookevent-requirements)
8. [Report/Dashboard Requirements](#8-reportdashboard-requirements)

---

## 1. Database/Model Requirements

### 1.1 Collections Required (V2_DATABASE §8, MASTER_PLAN §16)

8 collections must exist in the tenant database:

| #   | Collection             | Model File (V2_STRUCTURE)     | Purpose                            |
| --- | :--------------------- | :---------------------------- | :--------------------------------- |
| 1   | `inventory_items`      | `inventory-item.model.ts`     | Article master data                |
| 2   | `inventory_stock`      | `inventory-stock.model.ts`    | Per-branch stock tracking          |
| 3   | `inventory_movements`  | `inventory-movement.model.ts` | All stock change audit trail       |
| 4   | `inventory_categories` | `inventory-category.model.ts` | Hierarchical item categories       |
| 5   | `suppliers`            | `supplier.model.ts`           | Supplier management                |
| 6   | `purchase_orders`      | `purchase-order.model.ts`     | Procurement with embedded items    |
| 7   | `stock_transfers`      | `stock-transfer.model.ts`     | Inter-branch transfers (NEW v2)    |
| 8   | `stock_counts`         | `stock-count.model.ts`        | Physical inventory counts (NEW v2) |

### 1.2 Model Factory Pattern (BUILD_RULES §5)

- Every model MUST use factory: `getModelNameModel(connection: Connection)`
- MUST check `connection.models` cache before registering schema
- MUST return `Model<T>` type

### 1.3 Standard Fields on Every Collection (V2_DATABASE §1, BUILD_RULES §6)

| Field       | Type     | Default | Required         | Notes                                              |
| :---------- | :------- | :------ | :--------------- | :------------------------------------------------- |
| `isActive`  | Boolean  | `true`  | Where applicable | Soft-delete pattern (Categories, Items, Suppliers) |
| `createdBy` | ObjectId | —       | On mutations     | Ref to `users` collection                          |
| `updatedBy` | ObjectId | —       | On updates       | Ref to `users` collection                          |
| `createdAt` | Date     | auto    | Always           | Via `timestamps: true`                             |
| `updatedAt` | Date     | auto    | Always           | Via `timestamps: true`                             |

### 1.4 Naming Conventions (BUILD_RULES §6)

| Element          | Convention  | Example                          |
| :--------------- | :---------- | :------------------------------- |
| Collection name  | PascalCase  | `InventoryItem`, `PurchaseOrder` |
| Field names      | camelCase   | `purchasePrice`, `minQuantity`   |
| Boolean fields   | `is` prefix | `isActive`, `isConsumable`       |
| Date fields      | `At` suffix | `createdAt`, `lastRestockedAt`   |
| Reference fields | Entity+`Id` | `supplierId`, `branchId`         |
| Enum values      | snake_case  | `purchase_order`, `transfer_in`  |

### 1.5 Bilingual Name Fields (V2_DATABASE §1, BUILD_RULES §6)

Collections with user-facing names MUST have bilingual `{ en: String, ar: String }` sub-documents:

- `inventory_items.name` → `{ en, ar }`
- `inventory_categories.name` → `{ en, ar }`

### 1.6 Collection Schemas (V2_DATABASE §8 — Primary Authority)

#### 1.6.1 `inventory_items`

```
Fields:
  _id: ObjectId
  name: { en: String (required), ar: String }
  sku: String (unique, required)
  barcode: String (unique, sparse)
  categoryId: ObjectId → inventory_categories
  supplierId: ObjectId → suppliers | null
  unit: Enum [piece, box, pack, bottle, tube, roll, set]
  minQuantity: Number (default: 0)
  reorderPoint: Number (default: 0)
  reorderQuantity: Number (default: 0)
  purchasePrice: Number (required)
  sellingPrice: Number
  expiryTracking: Boolean (default: false)
  batchTracking: Boolean (default: false)
  description: String
  imageUrl: String
  isActive: Boolean (default: true)
  createdAt, updatedAt (timestamps: true)

Indexes:
  { sku: 1 } — unique
  { barcode: 1 } — unique, sparse
  { categoryId: 1, isActive: 1 }
  { 'name.en': 'text' }
  { isActive: 1 }
```

**MASTER_PLAN §16 extensions** (lower authority, implement if time permits):

- `unitsPerPackage`, `marginPercent`, `minStockLevel`, `maxStockLevel`
- `isConsumable`, `requiresPrescription`
- `barcodeType` Enum [ean13, code128, qr, datamatrix]
- `manufacturer`, `manufacturerRef`, `defaultSupplierId`
- `totalConsumed`, `avgMonthlyUsage`, `lastPurchaseDate`, `lastPurchasePrice`

#### 1.6.2 `inventory_stock`

```
Fields:
  _id: ObjectId
  itemId: ObjectId → inventory_items (required)
  branchId: ObjectId (required)
  currentQuantity: Number (default: 0)
  reservedQuantity: Number (default: 0)
  availableQuantity: Number (= currentQuantity - reservedQuantity)
  batches: [{
    batchNumber: String (required)
    quantity: Number (required)
    expiryDate: Date
    receivedDate: Date
    supplierId: ObjectId → suppliers
    purchaseOrderId: ObjectId → purchase_orders
  }]
  lastCountedAt: Date
  lastRestockedAt: Date
  updatedAt: Date

Indexes:
  { itemId: 1, branchId: 1 } — unique (compound)
  { branchId: 1, currentQuantity: 1 }
  { 'batches.expiryDate': 1 }
  { availableQuantity: 1 }
```

**MASTER_PLAN §16 extensions:**

- `batches[].lotNumber`, `batches[].unitCost`, `batches[].status` Enum [active, expired, recalled, quarantine]
- `stockValue`, `valuationMethod` Enum [fifo, weighted_average, last_purchase], `weightedAvgCost`
- `lastCountedBy`, `lastCountResult` Enum [match, surplus, deficit], `countDiscrepancy`

#### 1.6.3 `inventory_movements`

```
Fields:
  _id: ObjectId
  itemId: ObjectId → inventory_items (required)
  branchId: ObjectId (required)
  type: Enum [purchase, sale, adjustment, transfer_in, transfer_out, waste, return, reservation, reservation_release]
  quantity: Number (required)
  previousQuantity: Number
  newQuantity: Number
  reference: String
  referenceType: Enum [purchase_order, stock_transfer, stock_count, manual, appointment, invoice]
  referenceId: ObjectId
  batchNumber: String
  reason: String
  performedBy: ObjectId → users (required)
  createdAt: Date

Indexes:
  { itemId: 1, createdAt: -1 }
  { branchId: 1, type: 1, createdAt: -1 }
  { referenceType: 1, referenceId: 1 }
  { createdAt: -1 }
```

**MASTER_PLAN §16 extensions:**

- Extended type enum: `adjustment_add, adjustment_remove, expired, damaged, return_supplier, return_patient, consumed, reserved, unreserved`
- `unitCost`, `totalCost`, `lotNumber`, `expiryDate`, `transferId`, `fromBranchId`, `toBranchId`, `notes`

#### 1.6.4 `inventory_categories`

```
Fields:
  _id: ObjectId
  name: { en: String (required), ar: String }
  parentId: ObjectId | null → inventory_categories (self-ref)
  sortOrder: Number (default: 0)
  isActive: Boolean (default: true)
  createdAt, updatedAt

Indexes:
  { parentId: 1, sortOrder: 1 }

Seed data (10 categories):
  Consumables, Dental Materials, Anesthetics, Surgical Supplies,
  Endodontic, Restorative, Prosthodontic, Orthodontic, Preventive,
  Infection Control
```

**MASTER_PLAN extensions:** `slug` (unique), `description`, `icon`

#### 1.6.5 `suppliers`

```
Fields:
  _id: ObjectId
  name: String (required)
  code: String (unique, required)
  contactPerson: String
  phone: String
  email: String
  address: String
  city: String
  taxNumber: String
  paymentTerms: {
    paymentDays: Number
    creditLimit: Number
    discountPercentage: Number
    discountDays: Number
  }
  rating: Number (1-5)
  isActive: Boolean (default: true)
  createdAt, updatedAt

Indexes:
  { code: 1 } — unique
  { isActive: 1 }
  { name: 1 }
```

**MASTER_PLAN extensions:** `nameAr`, structured `address` object, `commercialRegister`, `avgDeliveryDays`, `totalOrders`, `lastOrderDate`, `website`, `notes`

#### 1.6.6 `purchase_orders`

```
Fields:
  _id: ObjectId
  orderNumber: String (auto: PO-2026-001, unique, required)
  supplierId: ObjectId → suppliers (required)
  branchId: ObjectId (required)
  items: [{
    itemId: ObjectId → inventory_items
    itemName: String
    sku: String
    quantity: Number (required)
    receivedQuantity: Number (default: 0)
    unitPrice: Number (required)
    totalPrice: Number
    notes: String
  }]
  subtotal: Number
  taxAmount: Number
  shippingCost: Number
  totalAmount: Number
  status: Enum [draft, submitted, approved, ordered, partially_received, received, cancelled]
  orderDate: Date
  expectedDeliveryDate: Date
  receivedDate: Date
  notes: String
  createdBy: ObjectId → users
  approvedBy: ObjectId → users
  createdAt, updatedAt

Indexes:
  { orderNumber: 1 } — unique
  { supplierId: 1, status: 1 }
  { branchId: 1, status: 1, createdAt: -1 }
  { status: 1, expectedDeliveryDate: 1 }
```

**MASTER_PLAN extensions:** `items[].batchNumber`, `items[].expiryDate`, `taxPercent`, `discount`, `receivingNotes`, `receivedBy`, `qualityCheck` Enum [passed, partial, failed], `attachments[{name, url, type}]`

#### 1.6.7 `stock_transfers`

```
Fields:
  _id: ObjectId
  transferNumber: String (auto: XFER-2026-001/TRF-2026-001, unique)
  sourceBranchId: ObjectId (required)
  destinationBranchId: ObjectId (required)
  items: [{
    itemId: ObjectId → inventory_items
    itemName: String
    quantity: Number (required)
    batchNumber: String
    notes: String
  }]
  status: Enum [requested, approved, in_transit, received, cancelled]
  requestedBy: ObjectId → users
  approvedBy: ObjectId → users
  receivedBy: ObjectId → users
  requestedAt: Date
  approvedAt: Date
  receivedAt: Date
  notes: String
  createdAt, updatedAt

Indexes:
  { transferNumber: 1 } — unique
  { sourceBranchId: 1, status: 1 }
  { destinationBranchId: 1, status: 1 }
```

#### 1.6.8 `stock_counts`

```
Fields:
  _id: ObjectId
  countNumber: String (auto: CNT-2026-001/SC-2026-001, unique)
  branchId: ObjectId (required)
  type: Enum [full, partial, cycle/spot_check]
  items: [{
    itemId: ObjectId → inventory_items
    itemName: String
    expectedQuantity: Number
    countedQuantity: Number
    discrepancy: Number (= counted - expected)
    adjustmentApplied: Boolean (default: false)
    notes: String
  }]
  status: Enum [in_progress, completed, cancelled]
  createdBy: ObjectId → users
  completedAt: Date
  reviewedBy: ObjectId → users
  createdAt, updatedAt

Indexes:
  { branchId: 1, createdAt: -1 }
  { status: 1, branchId: 1 }
  { countNumber: 1 } — unique
```

**MASTER_PLAN extensions:** `summary: { totalItems, matchCount, surplusCount, deficitCount, totalDiscrepancyValue }`, `startedAt`

### 1.7 Embedding vs. Referencing Rules (V2_DATABASE §1)

| Pattern              | When                          | Inventory Examples                                   |
| :------------------- | :---------------------------- | :--------------------------------------------------- |
| Embed                | Bounded arrays, read-together | PO items, transfer items, count items, stock batches |
| Reference (separate) | Unbounded, queryable alone    | `inventory_movements` (unbounded audit trail)        |

### 1.8 Aggregation Pipeline Patterns (V2_DECISION_LOG §5)

Inventory Valuation pipeline must use:

```
$lookup: { from: 'inventory_items', localField: 'itemId', foreignField: '_id', as: 'item' }
→ $unwind: '$item'
→ $group: { _id: '$branchId', totalValue: { $sum: { $multiply: ['$currentQuantity', '$item.purchasePrice'] } } }
```

---

## 2. API Route Requirements

### 2.1 URL Conventions (BUILD_RULES §3)

| Rule               | Requirement                                               |
| :----------------- | :-------------------------------------------------------- |
| Resource naming    | Plural, kebab-case: `/api/inventory-items`                |
| No version prefix  | `/api/resource` NOT `/api/v1/resource`                    |
| No verbs in URL    | `/api/purchase-orders` NOT `/api/create-order`            |
| Tenant header      | `X-Tenant-Slug: {slug}` on every request                  |
| File location      | `apps/api/src/tenant/routes/{feature}/{feature}.route.ts` |
| Route registration | `app.register(featureRoutes, { prefix: '/api/feature' })` |

### 2.2 Required Resource Endpoints (MASTER_PLAN §16, V2_STRUCTURE)

| Resource Prefix                | Minimum Endpoints                                          |
| :----------------------------- | :--------------------------------------------------------- |
| `/api/inventory-categories`    | CRUD + restore                                             |
| `/api/inventory-items`         | CRUD + restore + stock/adjust + barcode/search + movements |
| `/api/inventory-stock`         | Branch stock, expiry dashboard, dispose, reserve/unreserve |
| `/api/suppliers`               | CRUD + restore + orders + update-metrics                   |
| `/api/purchase-orders`         | CRUD + status update + receive                             |
| `/api/stock-transfers`         | List + detail + create + status update                     |
| `/api/stock-counts`            | CRUD + complete + approve + cancel                         |
| `/api/reports/inventory/:type` | 1 endpoint serving all 10 report types                     |

### 2.3 HTTP Methods & Status Codes (BUILD_RULES §3, V2_DECISION_LOG §2)

| Method | Success Code | Use Case          |
| :----- | :----------- | :---------------- |
| GET    | 200          | Read operations   |
| POST   | 201          | Create operations |
| PUT    | 200          | Full update       |
| PATCH  | 200          | Partial update    |
| DELETE | 200 or 204   | Soft/hard delete  |

Error codes: 400 (validation), 401 (unauth), 403 (forbidden/module inactive), 404 (not found), 409 (conflict/duplicate), 422 (business rule violation), 429 (rate limited), 500 (internal)

### 2.4 Response Shapes (BUILD_RULES §4, V2_DECISION_LOG §2)

**Success response:**

```typescript
{
  success: true,
  data: { ... },
  message: "Operation successful",
  meta?: { page: number, limit: number, total: number, totalPages: number }
}
```

**Error response:**

```typescript
{
  statusCode: number,
  error: string,       // Machine-readable: "VALIDATION_ERROR", "NOT_FOUND"
  message: string,     // Human-readable (EN)
  details?: Record<string, string[]>, // Field-level validation errors
  requestId: string,   // UUID for tracing
  timestamp: string    // ISO 8601
}
```

### 2.5 Response Helpers (BUILD_RULES §4)

- Success: `apiResponse(reply, statusCode, data, message)`
- Error: `apiError(reply, statusCode, message, errors?)`
- MUST use these helpers — never construct raw responses

### 2.6 Handler Pattern (BUILD_RULES §5)

Every route handler MUST follow:

```typescript
async function handler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenantDb = getTenantDb(request);
    const userId = getUserId(request);
    const service = new FeatureService(tenantDb);
    const result = await service.method(data, userId);
    // Side effects (webhooks, notifications) HERE in route layer
    return apiResponse(reply, 200, result, 'message');
  } catch (error) {
    return apiError(reply, 500, error.message);
  }
}
```

### 2.7 Middleware Chain (BUILD_RULES §5, SECURITY §4)

Every mutation endpoint MUST apply:

```
authGuard → tenantDbMiddleware → roleGuard('inventory', 'permission') → handler
```

Read endpoints MUST apply at minimum:

```
authGuard → tenantDbMiddleware → handler
```

### 2.8 Zod → Fastify Schema (V2_DECISION_LOG §2.5)

Route schemas MUST use `zodToJsonSchema()` for auto-OpenAPI generation:

```typescript
app.post('/resource', {
  schema: {
    body: zodToJsonSchema(createSchema),
    response: { 201: zodToJsonSchema(responseSchema) },
  },
  preHandler: [authGuard, roleGuard(...)],
  handler,
});
```

### 2.9 Module Deactivation (V2_DECISION_LOG §4.3)

If tenant deactivates "inventory" module:

- Status → "suspended" (not deleted)
- Data preserved for 90 days
- API returns **403** for inventory endpoints: `"Module not active"`
- After 90 days: data archived to cold storage (S3)
- Reactivation within 90 days: data fully restored

---

## 3. Service Layer Requirements

### 3.1 Service Class Pattern (BUILD_RULES §5)

```typescript
class FeatureService {
  private model: Model<T>;

  constructor(connection: Connection) {
    this.model = getFeatureModel(connection);
  }

  async create(data: CreateDTO, userId: string): Promise<T> { ... }
  async getById(id: string): Promise<T | null> { ... }
  async update(id: string, data: UpdateDTO, userId: string): Promise<T> { ... }
  async softDelete(id: string, userId: string): Promise<T> { ... }
  async list(filters: QueryDTO): Promise<{ data: T[], total: number }> { ... }
}
```

### 3.2 Required Services (V2_STRUCTURE, MASTER_PLAN §16)

| Service                          | File                                   | Min Methods                                                                                           |
| :------------------------------- | :------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `InventoryCategoryService`       | `inventory-category.service.ts`        | CRUD + restore + list-tree                                                                            |
| `InventoryItemService`           | `inventory-item.service.ts`            | CRUD + restore + adjustStock + barcodeSearch + getMovements                                           |
| `InventoryStockService`          | `inventory-stock.service.ts`           | getByBranch + getByItem + expiryDashboard + dispose + bulkDispose + reserve + unreserve + recalculate |
| `SupplierService`                | `supplier.service.ts`                  | CRUD + restore + getOrders + updateMetrics                                                            |
| `PurchaseOrderService`           | `purchase-order.service.ts`            | CRUD + updateStatus + receive                                                                         |
| `StockTransferService`           | `stock-transfer.service.ts`            | Create + list + getById + updateStatus                                                                |
| `StockCountService`              | `stock-count.service.ts`               | Create + list + getById + updateItems + complete + approve + cancel                                   |
| `InventoryReportPipelineService` | `inventory-report-pipeline.service.ts` | 10 methods (one per report type)                                                                      |

### 3.3 Service Rules (BUILD_RULES §5)

| Rule                            | Requirement                                                          |
| :------------------------------ | :------------------------------------------------------------------- |
| Never access `request`/`reply`  | Services are pure business logic                                     |
| `userId` on all mutations       | Every create/update/delete method accepts `userId` for audit trail   |
| Instance methods (not static)   | `new Service(connection).method()`                                   |
| No webhook dispatch in services | Webhooks/notifications are side effects → route layer responsibility |
| Model resolved in constructor   | Not per-method                                                       |

### 3.4 Business Logic: Stock Adjustment (MASTER_PLAN §16)

When stock is adjusted:

1. Create `inventory_movement` record
2. Update `inventory_stock.currentQuantity`
3. If batch tracking enabled: update specific batch quantity
4. Check against `minQuantity`/`reorderPoint` for low-stock alerts
5. FIFO: oldest batches consumed first
6. Return new quantity for conditional webhook dispatch

### 3.5 Business Logic: PO Receive (MASTER_PLAN §16)

When a PO is received:

1. Update `items[].receivedQuantity` per line
2. Create/update `inventory_stock` records per item+branch
3. If batch tracking: create new batch entries in `inventory_stock.batches[]`
4. Create `inventory_movement` records (type: `purchase`)
5. Update PO `status` (→ `partially_received` or `received`)
6. Update item denormalized stats (`lastPurchaseDate`, `lastPurchasePrice`)

### 3.6 Business Logic: Stock Transfer (MASTER_PLAN §16)

Status workflow: `requested → approved → in_transit → received → cancelled`

- On `receive`: deduct from source `inventory_stock`, add to destination
- Create `transfer_out` movement at source, `transfer_in` at destination
- FIFO batch transfer if batch tracking enabled

### 3.7 Business Logic: Stock Count (MASTER_PLAN §16)

Status workflow: `in_progress → completed → cancelled`

- On `complete`: calculate discrepancy per item
- On `approve`: apply adjustments to `inventory_stock`, create `adjustment` movements
- Generate summary: `{ totalItems, matchCount, surplusCount, deficitCount, totalDiscrepancyValue }`

### 3.8 Business Logic: Auto-Reorder (MASTER_PLAN §16)

BullMQ cron at 08:00 daily:

1. Query all items where `availableQuantity <= reorderPoint`
2. If `autoReorderEnabled` in tenant settings
3. Auto-create draft PO to `defaultSupplierId` with `reorderQuantity`
4. Create in-app notification for inventory admin

### 3.9 Business Logic: Expiry Check (MASTER_PLAN §16)

BullMQ cron at 02:00 daily:

1. Find batches with `expiryDate <= today` → mark status `expired`
2. Find batches with `expiryDate <= today + 30 days` → fire `inventory.expiring_soon`
3. Dispatch `inventory.expired` webhook for newly expired batches
4. Create in-app notifications

### 3.10 Tenant Inventory Settings (MASTER_PLAN §16)

```typescript
{
  allowNegativeStock: false,
  stockWarningThreshold: 'low',      // 'low' | 'critical' | 'custom'
  autoReserveOnTreatmentPlan: true,
  requireBatchOnReceive: false,
  requireExpiryOnReceive: true,
  defaultValuationMethod: 'weighted_average',  // 'fifo' | 'weighted_average' | 'last_purchase'
  autoReorderEnabled: false
}
```

---

## 4. Frontend Requirements

### 4.1 Feature Folder Structure (BUILD_RULES §8, V2_STRUCTURE)

```
apps/admin/src/features/inventory/
├── pages/         ← One page component per route
├── components/    ← Shared inventory components
├── hooks/         ← React Query hook files
└── index.ts       ← Barrel export
```

### 4.2 Required Pages (MASTER_PLAN §16, V2_STRUCTURE)

17 pages specified:

| #   | Page                       | Route                                |
| --- | :------------------------- | :----------------------------------- |
| 1   | InventoryListPage          | `/inventory`                         |
| 2   | InventoryFormPage (create) | `/inventory/new`                     |
| 3   | InventoryFormPage (edit)   | `/inventory/:id`                     |
| 4   | InventoryCategoryListPage  | `/inventory/categories`              |
| 5   | SupplierListPage           | `/inventory/suppliers`               |
| 6   | SupplierFormPage (create)  | `/inventory/suppliers/new`           |
| 7   | SupplierFormPage (edit)    | `/inventory/suppliers/:id`           |
| 8   | PurchaseOrderListPage      | `/inventory/purchase-orders`         |
| 9   | PurchaseOrderFormPage      | `/inventory/purchase-orders/new`     |
| 10  | PurchaseOrderDetailPage    | `/inventory/purchase-orders/:id`     |
| 11  | StockTransferListPage      | `/inventory/transfers`               |
| 12  | StockTransferFormPage      | `/inventory/transfers/new`           |
| 13  | StockCountListPage         | `/inventory/stock-count`             |
| 14  | StockCountFormPage         | `/inventory/stock-count/new`         |
| 15  | ExpiryDashboardPage        | `/inventory/expiry`                  |
| 16  | MaterialUsageReportPage    | `/inventory/reports/material-usage`  |
| 17  | StockValuationReportPage   | `/inventory/reports/stock-valuation` |

### 4.3 Required Components (MASTER_PLAN §16, V2_STRUCTURE)

| Component                    | Purpose                                   |
| :--------------------------- | :---------------------------------------- |
| `InventoryForm`              | Create/edit inventory item                |
| `SupplierForm`               | Create/edit supplier                      |
| `PurchaseOrderForm`          | Create PO with line items (useFieldArray) |
| `StockTransferForm`          | Create transfer with line items           |
| `StockCountForm`             | Create count with item lines              |
| `StockAdjustmentDialog`      | Manual stock adjustment dialog            |
| `PurchaseOrderReceiveDialog` | Receive PO items with batch/qty entry     |
| `ExpiryDashboard`            | Expiry tracking dashboard component       |
| `BarcodeScanner`             | html5-qrcode barcode/QR scanner           |
| `LowStockBadge`              | Visual indicator for low stock items      |

### 4.4 Required Hooks (BUILD_RULES §8)

Each hook file MUST follow the pattern:

```typescript
// Query key factory
const featureKeys = {
  all: ['feature'] as const,
  lists: () => [...featureKeys.all, 'list'] as const,
  list: (filters: Filters) => [...featureKeys.lists(), filters] as const,
  details: () => [...featureKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureKeys.details(), id] as const,
};
```

Required hook files:

- `useInventoryItems.ts` — items + categories queries/mutations
- `useInventoryStock.ts` — stock queries + adjust/dispose mutations
- `useSuppliers.ts` — supplier CRUD
- `usePurchaseOrders.ts` — PO CRUD + status + receive
- `useStockTransfers.ts` — transfer CRUD + status
- `useStockCounts.ts` — stock count CRUD + complete/approve/cancel

### 4.5 State Management Rules (BUILD_RULES §8)

| State Type  | Store           | Inventory Example                |
| :---------- | :-------------- | :------------------------------- |
| Server data | React Query     | Items list, stock data, PO list  |
| Global UI   | Zustand         | Sidebar collapse state           |
| Auth        | Zustand memory  | User role, permissions           |
| Form data   | React Hook Form | InventoryForm, PurchaseOrderForm |
| URL state   | Router params   | `/inventory/:id`, query filters  |

### 4.6 Form Pattern (BUILD_RULES §8, §10)

MUST use:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInventoryItemSchema } from '@dento/shared';

const form = useForm({
  resolver: zodResolver(createInventoryItemSchema),
  defaultValues: { ... },
});
```

- Frontend schema MUST import from `@dento/shared` (same Zod schema used on backend)
- NEVER use inline `required` rules — always `zodResolver`
- All create/update schemas MUST use `.strict()`

### 4.7 Loading/Error/Empty States (BUILD_RULES §15, V2_DECISION_LOG §13)

EVERY data page MUST handle all 3 states:

| State   | Component                                                                                       | When                 |
| :------ | :---------------------------------------------------------------------------------------------- | :------------------- |
| Loading | `<TableSkeleton rows={10} columns={6}>`                                                         | `isLoading === true` |
| Error   | `<ErrorState message={...} action={{ label: 'Retry', onClick: refetch }}>`                      | `isError === true`   |
| Empty   | `<EmptyState icon={...} title="..." description="..." action={{ label: '...', onClick: ... }}>` | `data.length === 0`  |

### 4.8 DataTable Pattern (BUILD_RULES §9)

List pages MUST use `@tanstack/react-table` with:

- Column definitions in array with `id` property
- Server-side pagination (`meta: { page, limit, total, totalPages }`)
- Cell accessor: `(value, row)` pattern
- Sortable columns where applicable

### 4.9 RTL/Bidirectional Support (BUILD_RULES §11)

| NEVER Use      | ALWAYS Use Instead |
| :------------- | :----------------- |
| `left-*`       | `start-*`          |
| `right-*`      | `end-*`            |
| `pl-*`, `pr-*` | `ps-*`, `pe-*`     |
| `ml-*`, `mr-*` | `ms-*`, `me-*`     |
| `text-left`    | `text-start`       |
| `text-right`   | `text-end`         |
| `border-l-*`   | `border-s-*`       |
| `border-r-*`   | `border-e-*`       |
| `float-left`   | `float-start`      |
| `float-right`  | `float-end`        |

Arabic is a first-class language. Font: IBM Plex Sans Arabic.

### 4.10 Dark Mode (BUILD_RULES §10)

- Every component MUST support dark mode
- Use semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, `bg-muted`)
- OR use explicit `dark:` variant classes
- Brand colors resolve via CSS custom properties

### 4.11 Accessibility — WCAG 2.1 AA (BUILD_RULES §13, V2_DECISION_LOG §12)

| Requirement                        | Detail                                       |
| :--------------------------------- | :------------------------------------------- |
| `aria-label` on icon-only buttons  | Every `<Button size="icon">` MUST have label |
| Every `<input>` has `<Label>`      | Associated via `htmlFor`                     |
| `aria-describedby` for form errors | Error messages linked to input               |
| Color contrast 4.5:1 (text)        | 3:1 for large text                           |
| Skip-nav link                      | First focusable element on page              |
| Keyboard navigable                 | All interactive elements reachable via Tab   |
| Focus indicators visible           | `ring-2` on focus                            |

### 4.12 Responsive Design (BUILD_RULES §12, V2_DECISION_LOG §14)

| Breakpoint | Width  | Tailwind | Table Behavior                    |
| :--------- | :----- | :------- | :-------------------------------- |
| Mobile     | 0px    | Default  | Card layout — stacked fields      |
| Tablet     | 768px  | `md:`    | Key columns only + expandable row |
| Desktop    | 1024px | `lg:`    | Full table with all columns       |
| Wide       | 1440px | `xl:`    | Full table + wider content        |

Mobile-first approach: base styles for mobile, then override upward.

### 4.13 Animation Rules (BUILD_RULES §14, V2_DECISION_LOG §15)

- Standard durations: 100-200ms
- Transform-based only (`transform`, `opacity`) — NEVER animate `width`, `height`, `top`, `left`
- `prefers-reduced-motion: reduce` → all animations disabled
- No page transition animations (instant navigation)
- No animations on tables
- Only Radix/Shadcn built-in animations

### 4.14 Toast/Notification Pattern (BUILD_RULES §24)

- Every mutation success → toast notification
- Every mutation error → error toast
- Pattern: `toast({ title: "Success", description: "Item created" })`

### 4.15 Navigation Integration (BUILD_RULES §24, MASTER_PLAN §16)

Sidebar nav structure:

```
📦 Inventory
  ├── Items           → /inventory
  ├── Categories      → /inventory/categories       (NEW)
  ├── Suppliers       → /inventory/suppliers         (NEW)
  ├── Purchase Orders → /inventory/purchase-orders   (NEW)
  ├── Transfers       → /inventory/transfers         (NEW)
  ├── Stock Count     → /inventory/stock-count       (NEW)
  ├── Expiry Tracking → /inventory/expiry            (NEW)
  └── Reports
      ├── Material Usage     → /inventory/reports/material-usage    (NEW)
      └── Stock Valuation    → /inventory/reports/stock-valuation   (NEW)
```

Every sidebar link MUST route to a functioning page.

### 4.16 Integration Connectivity Rules (BUILD_RULES §24)

- Every route must be connected (no dead links)
- Every button must have working `onClick` (no `() => {}` placeholders)
- Every mutation must show toast on success/error
- Frontend↔Backend contract: form field names MUST match API schema
- Every delete MUST use ConfirmDialog

### 4.17 Barcode Scanner (MASTER_PLAN §16, TECH_REQUIREMENTS)

- Web: `html5-qrcode` 2.x
- Mobile (future): `expo-barcode-scanner`
- Supported formats: EAN-13, Code 128, QR, Data Matrix

### 4.18 Router Rules (BUILD_RULES §8)

- All routes inside `ProtectedRoute > DashboardLayout`
- Imports use `.js` extension
- Lazy loading with `React.lazy()` for code splitting
- Default exports on page components

---

## 5. Testing Requirements

### 5.1 Test Stack (BUILD_RULES §18, V2_DECISION_LOG §10)

| Tool                  | Version | Purpose                     |
| :-------------------- | :------ | :-------------------------- |
| Vitest                | 2.x     | Test runner + assertions    |
| MSW                   | 2.x     | API mocking (frontend)      |
| Testing Library       | 16.x    | Component testing           |
| supertest             | Latest  | HTTP endpoint testing       |
| mongodb-memory-server | Latest  | In-memory MongoDB for tests |
| @faker-js/faker       | Latest  | Test data generation        |

### 5.2 Coverage Targets (BUILD_RULES §18)

Phase 5+ targets:

- **Statements:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Branches:** 60%

(V2_DECISION_LOG §10 states 60% overall — BUILD_RULES §18 is more specific at 70%/60%. BUILD_RULES has higher authority for Phase 5.)

### 5.3 Test File Naming (BUILD_RULES §18)

| Type           | Pattern                     | Example                          |
| :------------- | :-------------------------- | :------------------------------- |
| Service test   | `{feature}.service.test.ts` | `inventory-item.service.test.ts` |
| Route test     | `{feature}.route.test.ts`   | `inventory-items.route.test.ts`  |
| Component test | `{Feature}Page.test.tsx`    | `InventoryListPage.test.tsx`     |
| Form test      | `{Feature}Form.test.tsx`    | `InventoryForm.test.tsx`         |
| Hook test      | `use{Feature}.test.ts`      | `useInventoryItems.test.ts`      |

### 5.4 Required Test Files for Inventory

| #   | Test File                                   | Service Under Test             |
| --- | :------------------------------------------ | :----------------------------- |
| 1   | `inventory-category.service.test.ts`        | InventoryCategoryService       |
| 2   | `inventory-item.service.test.ts`            | InventoryItemService           |
| 3   | `inventory-stock.service.test.ts`           | InventoryStockService          |
| 4   | `supplier.service.test.ts`                  | SupplierService                |
| 5   | `purchase-order.service.test.ts`            | PurchaseOrderService           |
| 6   | `stock-transfer.service.test.ts`            | StockTransferService           |
| 7   | `stock-count.service.test.ts`               | StockCountService              |
| 8   | `inventory-report-pipeline.service.test.ts` | InventoryReportPipelineService |

### 5.5 Test Structure Pattern (BUILD_RULES §18)

```typescript
describe('ServiceName', () => {
  let connection: Connection;
  let service: ServiceClass;

  beforeAll(async () => {
    // mongodb-memory-server setup
  });

  afterAll(async () => {
    // cleanup
  });

  describe('methodName', () => {
    it('should handle success case', async () => { ... });
    it('should handle validation error', async () => { ... });
    it('should handle not found', async () => { ... });
    it('should handle edge case', async () => { ... });
  });
});
```

### 5.6 What to Test (BUILD_RULES §18)

| Layer     | Test Focus                                          |
| :-------- | :-------------------------------------------------- |
| Service   | Business logic, validation, edge cases, error paths |
| Route     | HTTP status codes, auth/RBAC, response shape        |
| Component | Rendering, interactions, accessibility              |
| Hook      | Return values, loading states, error states         |

### 5.7 Build Verification Checklist (BUILD_RULES §19)

After EVERY implementation session, run:

1. `turbo build` — 0 errors
2. `turbo lint` — 0 warnings
3. TypeScript check — 0 errors
4. `turbo test` — all passing
5. Integration check — all routes connected
6. Manual smoke test

---

## 6. Security Requirements

### 6.1 RBAC Permissions (MASTER_PLAN §16, PLATFORM_RBAC, BUILD_RULES §17)

13 inventory-specific permissions:

| Permission                          | Description                      |
| :---------------------------------- | :------------------------------- |
| `inventory.items.view`              | View inventory items             |
| `inventory.items.manage`            | Create/edit/delete items         |
| `inventory.stock.adjust`            | Manually adjust stock quantities |
| `inventory.suppliers.view`          | View suppliers                   |
| `inventory.suppliers.manage`        | Create/edit/delete suppliers     |
| `inventory.purchase_orders.create`  | Create purchase orders           |
| `inventory.purchase_orders.approve` | Approve purchase orders          |
| `inventory.purchase_orders.receive` | Receive purchase order items     |
| `inventory.transfers.request`       | Request stock transfers          |
| `inventory.transfers.approve`       | Approve/complete stock transfers |
| `inventory.stock_count.perform`     | Perform stock counts             |
| `inventory.stock_count.approve`     | Approve stock count adjustments  |
| `inventory.reports.view`            | View inventory reports           |

### 6.2 Role Matrix (PLATFORM_RBAC, MASTER_PLAN §16)

| Role             | Inventory Permissions       |
| :--------------- | :-------------------------- |
| `platform_admin` | `*` (all)                   |
| `tenant_admin`   | `*` (all)                   |
| `clinic_admin`   | `*` (all)                   |
| `manager`        | All except approve (varies) |
| `dentist`        | `read` only                 |
| `assistant`      | `read`, `create`, `update`  |
| `receptionist`   | `read` only                 |
| `accountant`     | `read`, `reports.view`      |

### 6.3 Middleware Enforcement (BUILD_RULES §5, §16)

```typescript
preHandler: [authGuard, tenantDbMiddleware, roleGuard('inventory', 'permission')];
```

- `authGuard` — validates JWT, extracts user
- `tenantDbMiddleware` — connects to tenant DB via `X-Tenant-Slug`
- `roleGuard` — checks user role against required permission

### 6.4 Input Validation — 3-Layer Chain (SECURITY §5, BUILD_RULES §16)

```
Layer 1: Frontend Zod schema (zodResolver) → prevents bad submissions
Layer 2: Backend Zod schema (.strict()) → rejects unexpected fields
Layer 3: Mongoose schema validation → type enforcement + constraints
```

- All create/update schemas MUST use `.strict()` mode
- Query parameter schemas MUST use `.coerce` for type conversion
- Request body size limit: 1MB (default)

### 6.5 NoSQL Injection Prevention (SECURITY §5, BUILD_RULES §16)

- Block all `$`-prefixed keys in request bodies
- Zod `.strict()` rejects unexpected fields
- Mongoose schema ignores undefined fields
- Never pass raw user input to MongoDB operators

### 6.6 Tenant Isolation (SECURITY §7, BUILD_RULES §16)

- Database-per-tenant: `useDb('tenant_{slug}')`
- Middleware enforced — `getTenantDb(request)` helper
- NEVER access another tenant's database connection
- File storage path isolation: `/{tenantSlug}/path/to/file`

### 6.7 Audit Logging (SECURITY §9, BUILD_RULES §16)

- Every create/update/delete MUST be logged
- `userId` passed to all service mutation methods
- Audit log: append-only, 365-day TTL
- Logged fields: action, user, timestamp, before/after values

### 6.8 Rate Limiting (SECURITY §6, BUILD_RULES §16)

| Scope          | Limit        |
| :------------- | :----------- |
| Per user/IP    | 100 req/min  |
| Auth endpoints | 5 req/min    |
| Per API key    | 1000 req/min |

### 6.9 Row-Level Security (BUILD_RULES §17)

- Dentists: can only view/edit their own records (where applicable)
- Admin/Manager: access all records within tenant
- Inventory module: less relevant (no per-doctor scoping) but RBAC still enforced

### 6.10 HTTP Security Headers (SECURITY §6)

Applied globally via `@fastify/helmet`:

- HSTS (Strict-Transport-Security)
- CSP (Content-Security-Policy)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

---

## 7. Webhook/Event Requirements

### 7.1 Webhook Envelope (V2_DECISION_LOG §3, BUILD_RULES §23)

```typescript
{
  id: string,           // UUID v4
  type: string,         // "inventory.item.created"
  tenantSlug: string,
  apiVersion: '2026-03-01',
  createdAt: string,    // ISO 8601
  data: { ... }         // Event-specific payload
}
```

### 7.2 Webhook Headers (V2_DECISION_LOG §3)

```
X-Webhook-Id: <event id>
X-Webhook-Signature: sha256=<HMAC-SHA256>
X-Webhook-Timestamp: <unix seconds>
Content-Type: application/json
```

### 7.3 Signature Verification (BUILD_RULES §23)

```
HMAC-SHA256(`${timestamp}.${body}`, secret)
```

- Reject if timestamp > 5 minutes old (replay attack prevention)

### 7.4 Required Inventory Webhook Events (MASTER_PLAN §16, V2_DECISION_LOG §3)

14 events MUST be dispatched:

| #   | Event                               | Trigger                             | `data` payload                                       |
| --- | :---------------------------------- | :---------------------------------- | :--------------------------------------------------- |
| 1   | `inventory.item.created`            | New item saved                      | Full item object                                     |
| 2   | `inventory.item.updated`            | Item edited                         | `{ before, after }` (changed fields)                 |
| 3   | `inventory.low_stock`               | Quantity < minQuantity              | `{ itemId, currentQty, minQty, branchId }`           |
| 4   | `inventory.critical_stock`          | Quantity near zero (NEW)            | `{ itemId, currentQty, branchId }`                   |
| 5   | `inventory.out_of_stock`            | Quantity = 0 (NEW)                  | `{ itemId, branchId }`                               |
| 6   | `inventory.expired`                 | Batch expired                       | `{ itemId, batchNumber, expiryDate }`                |
| 7   | `inventory.expiring_soon`           | Batch expiring within 30 days (NEW) | `{ itemId, batchNumber, expiryDate, daysRemaining }` |
| 8   | `inventory.restocked`               | PO items received                   | `{ itemId, quantity, branchId, purchaseOrderId }`    |
| 9   | `inventory.transfer.requested`      | New transfer created (NEW)          | `{ transferId, fromBranchId, toBranchId, items }`    |
| 10  | `inventory.transfer.completed`      | Transfer received (NEW)             | `{ transferId, receivedBy }`                         |
| 11  | `inventory.purchase_order.created`  | New PO saved (NEW)                  | `{ purchaseOrderId, supplierId, items }`             |
| 12  | `inventory.purchase_order.received` | PO items received (NEW)             | `{ purchaseOrderId, receivedItems }`                 |
| 13  | `inventory.stock_count.completed`   | Count completed (NEW)               | `{ stockCountId, summary }`                          |
| 14  | `inventory.stock_count.discrepancy` | Count has discrepancies (NEW)       | `{ stockCountId, discrepancies }`                    |

### 7.5 Webhook Dispatch Rules (BUILD_RULES §23)

- Dispatch in route layer (NOT service layer)
- Fire-and-forget with `.catch()` error logging (non-blocking)
- 3 retries with exponential backoff: 5s, 30s, 5 min
- 10-second timeout per delivery attempt
- PII redaction: mask phone/email/nationalId (not applicable to inventory data, but rule applies globally)

### 7.6 PII Redaction (V2_DECISION_LOG §3.3)

Always mask in webhook payloads:

- `phone`: `"+20***1234"` (first 3 + last 4)
- `email`: `"a***@gmail.com"`
- `nationalId`: `"***"` (completely hidden)

(Not directly applicable to inventory events, but must be implemented in the shared webhook dispatcher.)

---

## 8. Report/Dashboard Requirements

### 8.1 Inventory Reports (MASTER_PLAN §16, §21 — 10 reports)

These belong to the `inventory-management` module ($29/mo), NOT advanced analytics:

| #   | Report Type            | Description                                               |
| --- | :--------------------- | :-------------------------------------------------------- |
| 1   | Material Usage         | Items consumed over date range, by item/category          |
| 2   | Stock Valuation        | Total stock value by FIFO or Weighted Average Cost        |
| 3   | Expiry                 | Batches expiring within date range                        |
| 4   | Consumption Forecast   | Projected consumption based on historical avgMonthlyUsage |
| 5   | Supplier Performance   | Delivery times, quality scores by supplier                |
| 6   | Stock Movement History | All movements for item/branch over date range             |
| 7   | Purchase Order Summary | PO totals, statuses, supplier breakdown                   |
| 8   | Low Stock              | Items below minQuantity/reorderPoint                      |
| 9   | Dead Stock             | Items with no movement in X days                          |
| 10  | ABC Analysis           | Items classified by value/frequency (A=top 80%)           |

### 8.2 Report API (MASTER_PLAN §21, BUILD_RULES §3)

```
GET /api/reports/inventory/:type
  Query params: from, to, branchId, doctorId, format(json|csv|excel|pdf)
  Response: { success: true, data: { report: [...], metadata: {...} }, meta: { ... } }

POST /api/reports/export
  Body: { reportType, filters, format }
  Response: File download (CSV/Excel/PDF)
```

### 8.3 Report Caching (V2_DECISION_LOG §9)

- Redis TTL: 5 minutes
- Cache key format: `report:{tenantSlug}:{reportType}:{hash}`
- Hash: MD5 of query params (from, to, branchId, etc.)
- Cache invalidation: on stock mutations (create movement, receive PO, complete count)

### 8.4 Export Formats (MASTER_PLAN §21, TECH_REQUIREMENTS)

| Format | Library               | Package               |
| :----- | :-------------------- | :-------------------- |
| CSV    | `@fast-csv/format`    | `@fast-csv/format`    |
| Excel  | `exceljs`             | `exceljs`             |
| PDF    | `@react-pdf/renderer` | `@react-pdf/renderer` |

### 8.5 Aggregation Pipeline Pattern (V2_DECISION_LOG §5)

All report pipelines MUST use MongoDB aggregation with:

```
$match (date range, filters)
→ $lookup (join related collections)
→ $unwind (flatten joins)
→ $group (aggregate by dimension)
→ $project (shape output)
→ $sort (order results)
```

### 8.6 Scheduled Reports (MASTER_PLAN §21)

- BullMQ cron for scheduled report generation
- `report_schedules` collection stores schedule config
- Delivery: email attachment and/or in-app download
- Configurable frequency: daily, weekly, monthly

### 8.7 Dashboard Widgets (MASTER_PLAN §16)

| Widget          | Description                            | Location            |
| :-------------- | :------------------------------------- | :------------------ |
| Low Stock Alert | Top 5 items below reorder point        | Main Dashboard      |
| Expiry Widget   | Items expiring within 30 days          | Main Dashboard      |
| ExpiryDashboard | Full expiry tracking page with filters | `/inventory/expiry` |

### 8.8 Chart Library (TECH_REQUIREMENTS)

- Recharts 2.x for all chart visualizations
- Used in: StockValuationReportPage, dashboard widgets

---

## Cross-Reference: Document Conflicts & Resolutions

| Conflict                       | V2_DATABASE Says                                 | MASTER_PLAN Says                                                 | Resolution (Authority)                                 |
| :----------------------------- | :----------------------------------------------- | :--------------------------------------------------------------- | :----------------------------------------------------- |
| Item `unit` enum values        | piece/box/pack/bottle/tube/roll/set              | piece/box/pack/bottle/tube/ml/liter/gram/kg/unit/syringe/capsule | V2_DATABASE wins (Priority 2) — extend later if needed |
| Item name field structure      | `name: { en, ar }`                               | `nameEn`, `nameAr` (flat)                                        | V2_DATABASE wins — use `{ en, ar }` sub-document       |
| Transfer status enum           | requested/approved/in_transit/received/cancelled | draft/in_transit/received/cancelled                              | V2_DATABASE wins — use 5-state workflow                |
| Stock count type enum          | full/partial/cycle                               | full/partial/spot_check                                          | V2_DATABASE wins — use `cycle`                         |
| Auto-number prefix (transfers) | `XFER-`                                          | `TRF-`                                                           | V2_DATABASE wins — use `XFER-`                         |
| Auto-number prefix (counts)    | `CNT-`                                           | `SC-`                                                            | V2_DATABASE wins — use `CNT-`                          |
| Coverage target                | 70%/60% (BUILD_RULES)                            | 60%/50% (DECISION_LOG)                                           | BUILD_RULES wins for Phase 5 specifics                 |

---

## Implementation Timeline (IMPLEMENTATION_ROADMAP)

| Week | Focus                       | Deliverables                                                                        |
| :--- | :-------------------------- | :---------------------------------------------------------------------------------- |
| 17   | Inventory Core              | Items CRUD, Stock tracking, Movements, Suppliers, Purchase Orders, Batch/Expiry     |
| 18   | Inventory Advanced          | Inter-branch Transfers, Stock Count, Valuation (FIFO/WAC), Auto-Reorder, Barcode/QR |
| 19   | Reports + Inventory Reports | 10 inventory report pipelines, export formats, scheduled reports                    |

---

> **Total requirements extracted: ~200 discrete rules across 8 categories from 6 planning documents.**

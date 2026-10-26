# Phase 5 — Remaining Implementation Plan

> **Generated:** 2025-01-XX  
> **Status:** Ready for execution  
> **Scope:** Inventory Management Module — Routes, Tests, BullMQ Jobs, Reports, Frontend  
> **Authority:** V2_DECISION_LOG > V2_DATABASE > SECURITY > ROADMAP > TECH_REQ > V2_STRUCTURE > ADMIN_SCREENS > MASTER_PLAN

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Inventory](#2-current-state-inventory)
3. [Gap Analysis](#3-gap-analysis)
4. [Implementation Phases](#4-implementation-phases)
5. [Phase A — Backend Routes](#5-phase-a--backend-routes)
6. [Phase B — BullMQ Cron Jobs](#6-phase-b--bullmq-cron-jobs)
7. [Phase C — Service Tests](#7-phase-c--service-tests)
8. [Phase D — Report Pipelines](#8-phase-d--report-pipelines)
9. [Phase E — Admin Frontend](#9-phase-e--admin-frontend)
10. [File Creation Manifest](#10-file-creation-manifest)
11. [Dependency Graph](#11-dependency-graph)
12. [RBAC & Webhook Integration](#12-rbac--webhook-integration)
13. [Cross-Module Integration Points](#13-cross-module-integration-points)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. Executive Summary

| Metric               | Complete | Remaining |   Total |
| :------------------- | -------: | --------: | ------: |
| **Files**            |       15 |       ~46 |     ~61 |
| **LOC**              |   ~2,999 |    ~9,400 | ~12,400 |
| **Endpoints**        |        0 |        59 |      59 |
| **Tests**            |        0 |       ~52 |     ~52 |
| **Frontend Pages**   |        0 |        17 |      17 |
| **Report Pipelines** |        0 |        10 |      10 |
| **BullMQ Jobs**      |        0 |         2 |       2 |
| **Completion**       |      22% |       78% |    100% |

**Existing (Done):** 8 Mongoose models, 6 service classes (49 public methods), 31 Zod schemas, 36 inferred TS types, 12 Zod enums  
**Required:** 6 route files (59 endpoints), 6 test files (~52 tests), 2 BullMQ cron/worker files, 10 report pipeline files, 17 frontend pages, 5 frontend hooks, ~10 frontend components, sidebar/router wiring

---

## 2. Current State Inventory

### 2.1 Models (8/8 — 100%)

| Model                       | Collection        | Key Indexes                                                                         | LOC |
| :-------------------------- | :---------------- | :---------------------------------------------------------------------------------- | --: |
| `getInventoryCategoryModel` | InventoryCategory | `slug` (unique), `parentId`, `isActive+sortOrder`                                   | 112 |
| `getInventoryItemModel`     | InventoryItem     | `sku` (unique), `barcode` (unique sparse), `categoryId`, text(nameEn, nameAr, sku)  | 158 |
| `getInventoryStockModel`    | InventoryStock    | `itemId+branchId` (unique compound), `batches.expiryDate`, `availableQuantity`      | 115 |
| `getInventoryMovementModel` | InventoryMovement | `itemId+createdAt`, `branchId+createdAt`, `referenceType+referenceId`, `transferId` | 131 |
| `getSupplierModel`          | Supplier          | `name`, `isActive`, text(name, nameAr)                                              |  98 |
| `getPurchaseOrderModel`     | PurchaseOrder     | `orderNumber` (unique), `supplierId+status`, `branchId+status+createdAt`            | 192 |
| `getStockTransferModel`     | StockTransfer     | `transferNumber` (unique), `fromBranchId+status`, `toBranchId+status`               | 111 |
| `getStockCountModel`        | StockCount        | `countNumber` (unique), `branchId+status`, `branchId+createdAt`                     | 153 |

### 2.2 Services (6/6 — 100%)

| Service                 |  Methods |       LOC | Key Capabilities                                                                                                                        |
| :---------------------- | -------: | --------: | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `InventoryItemService`  |       11 |       303 | CRUD, stock levels, adjust stock (FIFO batches), barcode lookup, low-stock aggregation, movement history                                |
| `InventoryStockService` |       12 |       316 | Branch stock, expiry dashboard, batch dispose/bulk-dispose, reserve/unreserve, valuation recalc, expired batch processing, stock report |
| `SupplierService`       |        8 |       188 | CRUD, supplier orders, performance metrics                                                                                              |
| `PurchaseOrderService`  |        7 |       268 | CRUD, status transitions (7-state), receive with batch+stock+movement creation                                                          |
| `StockTransferService`  |      4+3 |       274 | CRUD, approve/receive/cancel with stock+movement tracking                                                                               |
| `StockCountService`     |        7 |       259 | CRUD, update items, complete, approve with stock adjustments                                                                            |
| **Totals**              | **49+3** | **1,608** |                                                                                                                                         |

### 2.3 Schemas (31 schemas + 12 enums — 100%)

All in `packages/shared/src/schemas/inventory.schema.ts` (321 LOC). Covers: category CRUD, item CRUD, stock adjustment, barcode search, supplier CRUD, PO CRUD+receive, transfer CRUD, stock count CRUD+apply, movement query, expiry query, bulk dispose.

### 2.4 Missing Service Methods

| Service                            | Missing Method                                      | Spec Source                             |
| :--------------------------------- | :-------------------------------------------------- | :-------------------------------------- |
| _(new)_ `InventoryCategoryService` | `list`, `getById`, `create`, `update`, `softDelete` | MASTER_PLAN §16                         |
| `PurchaseOrderService`             | `autoReorder()`                                     | MASTER_PLAN §16, BullMQ auto-reorder    |
| `InventoryStockService`            | `getValuationSummary(branchId)`                     | MASTER_PLAN §16, Stock Valuation Report |

---

## 3. Gap Analysis

### 3.1 Endpoints vs Service Methods

| Resource             |                                                                           Planned Endpoints | Service Methods | Gap                               |
| :------------------- | ------------------------------------------------------------------------------------------: | --------------: | :-------------------------------- |
| Inventory Categories |                                                                          5 (CRUD + restore) |  0 (no service) | **New service + route file**      |
| Inventory Items      |                      11 (CRUD + stock + adjust + barcode + movements + low-stock + restore) |              11 | Route file only                   |
| Inventory Stock      | 8 (branch stock + expiry + dispose + bulk-dispose + reserve + summary + dashboard + report) |              12 | Route file only                   |
| Suppliers            |                                                       7 (CRUD + orders + metrics + restore) |               8 | Route file only                   |
| Purchase Orders      |                                         8 (CRUD + status + receive + delete + auto-reorder) |               7 | Route file + `autoReorder` method |
| Stock Transfers      |                                                                           5 (CRUD + status) |        4 public | Route file only                   |
| Stock Counts         |                                             7 (CRUD + update + complete + approve + cancel) |               7 | Route file only                   |
| **Subtotal routes**  |                                                                                **~51 core** |                 |                                   |
| Movement History     |                                                                     2 (list + item history) | via ItemService | Part of items route               |
| Reports              |                                                                    10 (dedicated pipelines) |       2 partial | **Report pipelines**              |
| **Grand total**      |                                                                                     **~59** |                 |                                   |

### 3.2 RBAC Permissions (0/13 registered)

The `inventory` module **already exists** in the role-guard permission matrix with basic CRUD mapping. The 13 granular permissions from MASTER_PLAN §16 need to be mapped:

| Permission                          | Roles                      | Maps To                               |
| :---------------------------------- | :------------------------- | :------------------------------------ |
| `inventory.items.view`              | All Staff                  | `read` in existing matrix             |
| `inventory.items.manage`            | admin, manager, assistant  | `create`, `update` in existing matrix |
| `inventory.stock.adjust`            | admin, manager             | `update` + custom check               |
| `inventory.suppliers.view`          | admin, manager, accountant | `read` on suppliers                   |
| `inventory.suppliers.manage`        | admin, manager             | `create`, `update` on suppliers       |
| `inventory.purchase_orders.create`  | admin, manager, assistant  | `create` on POs                       |
| `inventory.purchase_orders.approve` | admin, manager             | `update` on POs                       |
| `inventory.purchase_orders.receive` | admin, manager, assistant  | `update` on POs                       |
| `inventory.transfers.request`       | admin, manager, assistant  | `create` on transfers                 |
| `inventory.transfers.approve`       | admin, manager             | `update` on transfers                 |
| `inventory.stock_count.perform`     | admin, manager, assistant  | `create` on counts                    |
| `inventory.stock_count.approve`     | admin only                 | `update` on counts                    |
| `inventory.reports.view`            | admin, manager             | `read` on reports                     |

**Implementation:** Use existing `roleGuard('inventory', 'create')` etc. The permission matrix in `role-guard.ts` already has `inventory` with `platform_admin: '*'`, `tenant_admin: '*'`, `dentist: ['read']`, `assistant: ['read', 'create', 'update']`. No changes to the middleware itself — just use the right `roleGuard` call per endpoint.

### 3.3 Webhook Events (0/14 dispatched)

| Event                               | Trigger Point                                               |
| :---------------------------------- | :---------------------------------------------------------- |
| `inventory.item.created`            | Items route POST handler                                    |
| `inventory.item.updated`            | Items route PUT handler                                     |
| `inventory.low_stock`               | After stock adjustment / PO receive when qty ≤ reorderLevel |
| `inventory.critical_stock`          | After stock adjustment when qty ≤ minStockLevel             |
| `inventory.out_of_stock`            | After stock adjustment when qty = 0                         |
| `inventory.expired`                 | Expiry cron job, batch dispose                              |
| `inventory.expiring_soon`           | Expiry cron job (30-day window)                             |
| `inventory.restocked`               | PO receive handler when previously low                      |
| `inventory.transfer.requested`      | Transfer create handler                                     |
| `inventory.transfer.completed`      | Transfer receive handler                                    |
| `inventory.purchase_order.created`  | PO create handler                                           |
| `inventory.purchase_order.received` | PO receive handler                                          |
| `inventory.stock_count.completed`   | Stock count complete handler                                |
| `inventory.stock_count.discrepancy` | Stock count approve with discrepancies                      |

**Implementation:** Import `dispatchWebhookEvent` from existing webhook infrastructure and call in route handlers (NOT services — per BUILD_RULES, side effects in route layer).

---

## 4. Implementation Phases

Execution order based on dependencies:

```
Phase A: Backend Routes (6 files, ~59 endpoints)     ← FIRST (unblocks frontend + tests)
  ├─ A1: InventoryCategoryService (new)
  ├─ A2: inventory-categories.route.ts
  ├─ A3: inventory-items.route.ts
  ├─ A4: inventory-stock.route.ts
  ├─ A5: suppliers.route.ts
  ├─ A6: purchase-orders.route.ts
  ├─ A7: stock-transfers.route.ts
  ├─ A8: stock-counts.route.ts
  └─ A9: server.ts registration

Phase B: BullMQ Cron Jobs (2 files)                  ← After routes
  ├─ B1: expiry.cron.ts
  ├─ B2: auto-reorder.cron.ts
  └─ B3: jobs/index.ts + queue.ts updates

Phase C: Service Tests (6 files, ~52 tests)           ← After routes
  ├─ C1: inventory-item.service.test.ts
  ├─ C2: inventory-stock.service.test.ts
  ├─ C3: supplier.service.test.ts
  ├─ C4: purchase-order.service.test.ts
  ├─ C5: stock-transfer.service.test.ts
  └─ C6: stock-count.service.test.ts

Phase D: Report Pipelines (10 files)                  ← After routes
  ├─ D1: material-usage report
  ├─ D2: stock-valuation report
  ├─ D3: expiry report
  ├─ D4: consumption-forecast report
  ├─ D5: supplier-performance report
  ├─ D6: stock-movement-history report
  ├─ D7: po-summary report
  ├─ D8: low-stock report
  ├─ D9: dead-stock report
  └─ D10: abc-analysis report

Phase E: Admin Frontend (17 pages, ~10 components, 5 hooks)  ← After routes
  ├─ E1: Feature scaffold + hooks + API client
  ├─ E2: Inventory Items pages (list, form)
  ├─ E3: Inventory Categories page
  ├─ E4: Suppliers pages (list, form)
  ├─ E5: Purchase Orders pages (list, form, detail)
  ├─ E6: Stock Transfers pages (list, form)
  ├─ E7: Stock Counts pages (list, form)
  ├─ E8: Expiry Dashboard page
  ├─ E9: Report pages (material-usage, stock-valuation)
  └─ E10: Router + sidebar wiring
```

---

## 5. Phase A — Backend Routes

### A1: InventoryCategoryService (New File)

**File:** `apps/api/src/tenant/services/inventory-category.service.ts`  
**Pattern:** Same as other services — `constructor(tenantDb: Connection)`, model factory  
**Methods:**

| Method       | Params                                                             | Returns              | Description                                    |
| :----------- | :----------------------------------------------------------------- | :------------------- | :--------------------------------------------- |
| `list`       | `(query: InventoryCategoryQuery)`                                  | `{ items, meta }`    | Paginated list with parentId filter, search    |
| `getById`    | `(id: string)`                                                     | `IInventoryCategory` | Single category                                |
| `create`     | `(data: CreateInventoryCategoryInput, userId: string)`             | `IInventoryCategory` | Create category; validate parentId if provided |
| `update`     | `(id: string, data: UpdateInventoryCategoryInput, userId: string)` | `IInventoryCategory` | Update category                                |
| `softDelete` | `(id: string, userId: string)`                                     | `IInventoryCategory` | Deactivate; block if items reference it        |
| `restore`    | `(id: string, userId: string)`                                     | `IInventoryCategory` | Reactivate                                     |

**~LOC:** ~120

### A2: inventory-categories.route.ts

**File:** `apps/api/src/tenant/routes/inventory-categories/inventory-categories.route.ts`  
**Prefix:** `/api/inventory-categories`  
**Export:** `inventoryCategoryRoutes`

| Method | Path   | PreHandler                                      | Schema                          | Service Call                       |
| :----- | :----- | :---------------------------------------------- | :------------------------------ | :--------------------------------- |
| GET    | `/`    | `preHandler`                                    | `inventoryCategoryQuerySchema`  | `service.list(query)`              |
| GET    | `/:id` | `preHandler`                                    | —                               | `service.getById(id)`              |
| POST   | `/`    | `preHandler + roleGuard('inventory', 'create')` | `createInventoryCategorySchema` | `service.create(data, userId)`     |
| PUT    | `/:id` | `preHandler + roleGuard('inventory', 'update')` | `updateInventoryCategorySchema` | `service.update(id, data, userId)` |
| DELETE | `/:id` | `preHandler + roleGuard('inventory', 'delete')` | —                               | `service.softDelete(id, userId)`   |

**~LOC:** ~100

### A3: inventory-items.route.ts

**File:** `apps/api/src/tenant/routes/inventory-items/inventory-items.route.ts`  
**Prefix:** `/api/inventory-items`  
**Export:** `inventoryItemRoutes`

| Method | Path                | PreHandler                           | Schema                         | Service Call                                                                                       |
| :----- | :------------------ | :----------------------------------- | :----------------------------- | :------------------------------------------------------------------------------------------------- |
| GET    | `/`                 | `preHandler`                         | `inventoryItemQuerySchema`     | `service.list(query)`                                                                              |
| GET    | `/low-stock`        | `preHandler`                         | `inventoryItemQuerySchema`     | `service.getLowStockItems(query)`                                                                  |
| GET    | `/:id`              | `preHandler`                         | —                              | `service.getById(id)`                                                                              |
| POST   | `/`                 | `+ roleGuard('inventory', 'create')` | `createInventoryItemSchema`    | `service.create(data, userId)` + webhook `inventory.item.created`                                  |
| PUT    | `/:id`              | `+ roleGuard('inventory', 'update')` | `updateInventoryItemSchema`    | `service.update(id, data, userId)` + webhook `inventory.item.updated`                              |
| DELETE | `/:id`              | `+ roleGuard('inventory', 'delete')` | —                              | `service.softDelete(id, userId)`                                                                   |
| PATCH  | `/:id/restore`      | `+ roleGuard('inventory', 'update')` | —                              | `service.restore(id, userId)`                                                                      |
| GET    | `/:id/stock`        | `preHandler`                         | —                              | `service.getStockLevels(itemId)`                                                                   |
| POST   | `/:id/stock/adjust` | `+ roleGuard('inventory', 'update')` | `stockAdjustmentSchema`        | `service.adjustStock(id, data, userId)` + webhook `inventory.low_stock` / `inventory.out_of_stock` |
| POST   | `/barcode/search`   | `preHandler`                         | `barcodeSearchSchema`          | `service.findByBarcode(data)`                                                                      |
| GET    | `/:id/movements`    | `preHandler`                         | `inventoryMovementQuerySchema` | `service.getMovementHistory(id, query)`                                                            |

**~LOC:** ~220

### A4: inventory-stock.route.ts

**File:** `apps/api/src/tenant/routes/inventory-stock/inventory-stock.route.ts`  
**Prefix:** `/api/inventory-stock`  
**Export:** `inventoryStockRoutes`

| Method | Path                                 | PreHandler                           | Schema              | Service Call                                                                       |
| :----- | :----------------------------------- | :----------------------------------- | :------------------ | :--------------------------------------------------------------------------------- |
| GET    | `/branch/:branchId`                  | `preHandler`                         | page/limit query    | `service.getStockByBranch(branchId, query)`                                        |
| GET    | `/item/:itemId`                      | `preHandler`                         | —                   | `service.getStockForItem(itemId)`                                                  |
| GET    | `/branch/:branchId/summary`          | `preHandler`                         | —                   | `service.getStockSummary(branchId)`                                                |
| GET    | `/branch/:branchId/expiry-dashboard` | `preHandler`                         | —                   | `service.getExpiryDashboard(branchId)`                                             |
| GET    | `/expiring`                          | `preHandler`                         | `expiryQuerySchema` | `service.getExpiringBatches(query)`                                                |
| POST   | `/:stockId/dispose/:batchNumber`     | `+ roleGuard('inventory', 'update')` | —                   | `service.disposeBatch(stockId, batchNumber, userId)` + webhook `inventory.expired` |
| POST   | `/bulk-dispose`                      | `+ roleGuard('inventory', 'update')` | `bulkDisposeSchema` | `service.bulkDispose(data, userId)`                                                |
| POST   | `/reserve`                           | `+ roleGuard('inventory', 'update')` | —                   | `service.reserveStock(...)`                                                        |
| POST   | `/unreserve`                         | `+ roleGuard('inventory', 'update')` | —                   | `service.unreserveStock(...)`                                                      |
| POST   | `/:stockId/recalculate`              | `+ roleGuard('inventory', 'update')` | —                   | `service.recalculateStockValue(stockId)`                                           |
| GET    | `/branch/:branchId/report`           | `+ roleGuard('inventory', 'read')`   | dateRange query     | `service.getStockReport(branchId, dateRange)`                                      |

**~LOC:** ~200

### A5: suppliers.route.ts

**File:** `apps/api/src/tenant/routes/suppliers/suppliers.route.ts`  
**Prefix:** `/api/suppliers`  
**Export:** `supplierRoutes`

| Method | Path                  | PreHandler                           | Schema                  | Service Call                           |
| :----- | :-------------------- | :----------------------------------- | :---------------------- | :------------------------------------- |
| GET    | `/`                   | `preHandler`                         | `supplierQuerySchema`   | `service.list(query)`                  |
| GET    | `/:id`                | `preHandler`                         | —                       | `service.getById(id)`                  |
| POST   | `/`                   | `+ roleGuard('inventory', 'create')` | `createSupplierSchema`  | `service.create(data, userId)`         |
| PUT    | `/:id`                | `+ roleGuard('inventory', 'update')` | `updateSupplierSchema`  | `service.update(id, data, userId)`     |
| DELETE | `/:id`                | `+ roleGuard('inventory', 'delete')` | —                       | `service.softDelete(id, userId)`       |
| PATCH  | `/:id/restore`        | `+ roleGuard('inventory', 'update')` | —                       | `service.restore(id, userId)`          |
| GET    | `/:id/orders`         | `preHandler`                         | page/limit/status query | `service.getSupplierOrders(id, query)` |
| POST   | `/:id/update-metrics` | `+ roleGuard('inventory', 'update')` | —                       | `service.updatePerformanceMetrics(id)` |

**~LOC:** ~160

### A6: purchase-orders.route.ts

**File:** `apps/api/src/tenant/routes/purchase-orders/purchase-orders.route.ts`  
**Prefix:** `/api/purchase-orders`  
**Export:** `purchaseOrderRoutes`

| Method | Path           | PreHandler                           | Schema                            | Service Call                                                                                              |
| :----- | :------------- | :----------------------------------- | :-------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| GET    | `/`            | `preHandler`                         | `purchaseOrderQuerySchema`        | `service.list(query)`                                                                                     |
| GET    | `/:id`         | `preHandler`                         | —                                 | `service.getById(id)`                                                                                     |
| POST   | `/`            | `+ roleGuard('inventory', 'create')` | `createPurchaseOrderSchema`       | `service.create(data, userId)` + webhook `inventory.purchase_order.created`                               |
| PUT    | `/:id`         | `+ roleGuard('inventory', 'update')` | `updatePurchaseOrderSchema`       | `service.update(id, data, userId)`                                                                        |
| PATCH  | `/:id/status`  | `+ roleGuard('inventory', 'update')` | `purchaseOrderStatusUpdateSchema` | `service.updateStatus(id, data, userId)`                                                                  |
| POST   | `/:id/receive` | `+ roleGuard('inventory', 'update')` | `receivePurchaseOrderSchema`      | `service.receive(id, data, userId)` + webhooks `inventory.purchase_order.received`, `inventory.restocked` |
| DELETE | `/:id`         | `+ roleGuard('inventory', 'delete')` | —                                 | `service.delete(id)`                                                                                      |

**~LOC:** ~150

### A7: stock-transfers.route.ts

**File:** `apps/api/src/tenant/routes/stock-transfers/stock-transfers.route.ts`  
**Prefix:** `/api/stock-transfers`  
**Export:** `stockTransferRoutes`

| Method | Path          | PreHandler                           | Schema                       | Service Call                                                                                          |
| :----- | :------------ | :----------------------------------- | :--------------------------- | :---------------------------------------------------------------------------------------------------- |
| GET    | `/`           | `preHandler`                         | `stockTransferQuerySchema`   | `service.list(query)`                                                                                 |
| GET    | `/:id`        | `preHandler`                         | —                            | `service.getById(id)`                                                                                 |
| POST   | `/`           | `+ roleGuard('inventory', 'create')` | `createStockTransferSchema`  | `service.create(data, userId)` + webhook `inventory.transfer.requested`                               |
| PATCH  | `/:id/status` | `+ roleGuard('inventory', 'update')` | `updateTransferStatusSchema` | `service.updateStatus(id, data, userId)` + webhook `inventory.transfer.completed` (if action=receive) |

**~LOC:** ~90

### A8: stock-counts.route.ts

**File:** `apps/api/src/tenant/routes/stock-counts/stock-counts.route.ts`  
**Prefix:** `/api/stock-counts`  
**Export:** `stockCountRoutes`

| Method | Path            | PreHandler                           | Schema                   | Service Call                                                                      |
| :----- | :-------------- | :----------------------------------- | :----------------------- | :-------------------------------------------------------------------------------- |
| GET    | `/`             | `preHandler`                         | `stockCountQuerySchema`  | `service.list(query)`                                                             |
| GET    | `/:id`          | `preHandler`                         | —                        | `service.getById(id)`                                                             |
| POST   | `/`             | `+ roleGuard('inventory', 'create')` | `createStockCountSchema` | `service.create(data, userId)`                                                    |
| PUT    | `/:id/items`    | `+ roleGuard('inventory', 'update')` | `updateStockCountSchema` | `service.updateItems(id, data, userId)`                                           |
| PATCH  | `/:id/complete` | `+ roleGuard('inventory', 'update')` | —                        | `service.complete(id, userId)` + webhook `inventory.stock_count.completed`        |
| PATCH  | `/:id/approve`  | `+ roleGuard('inventory', 'delete')` | `applyStockCountSchema`  | `service.approve(id, data, userId)` + webhook `inventory.stock_count.discrepancy` |
| PATCH  | `/:id/cancel`   | `+ roleGuard('inventory', 'update')` | —                        | `service.cancel(id, userId)`                                                      |

**~LOC:** ~140

### A9: server.ts Registration

Add to `server.ts` after Phase 4 imports and registrations:

```typescript
// Phase 5 — Inventory Management
import { inventoryCategoryRoutes } from './tenant/routes/inventory-categories/inventory-categories.route.js';
import { inventoryItemRoutes } from './tenant/routes/inventory-items/inventory-items.route.js';
import { inventoryStockRoutes } from './tenant/routes/inventory-stock/inventory-stock.route.js';
import { supplierRoutes as inventorySupplierRoutes } from './tenant/routes/suppliers/suppliers.route.js';
import { purchaseOrderRoutes } from './tenant/routes/purchase-orders/purchase-orders.route.js';
import { stockTransferRoutes } from './tenant/routes/stock-transfers/stock-transfers.route.js';
import { stockCountRoutes } from './tenant/routes/stock-counts/stock-counts.route.js';

// Phase 5 Registration
await fastify.register(inventoryCategoryRoutes, { prefix: '/api/inventory-categories' });
await fastify.register(inventoryItemRoutes, { prefix: '/api/inventory-items' });
await fastify.register(inventoryStockRoutes, { prefix: '/api/inventory-stock' });
await fastify.register(inventorySupplierRoutes, { prefix: '/api/suppliers' });
await fastify.register(purchaseOrderRoutes, { prefix: '/api/purchase-orders' });
await fastify.register(stockTransferRoutes, { prefix: '/api/stock-transfers' });
await fastify.register(stockCountRoutes, { prefix: '/api/stock-counts' });
```

**Note:** Supplier route import aliased to `inventorySupplierRoutes` to avoid name collision.

---

## 6. Phase B — BullMQ Cron Jobs

### B1: expiry.cron.ts

**File:** `apps/api/src/jobs/crons/expiry.cron.ts`  
**Schedule:** `0 2 * * *` (02:00 daily)  
**Pattern:** Follow `alert.cron.ts` exactly

```
export async function startExpiryCron()        → addCronJob(QUEUE_NAMES.INVENTORY_EXPIRY, 'check-expiry', '0 2 * * *')
export function startExpiryWorker()            → createWorker(QUEUE_NAMES.INVENTORY_EXPIRY, handler)
```

**Logic:**

1. Iterate all tenants via `platformDb.model('Tenant')`
2. For each tenant: `getTenantDb(slug)` → `new InventoryStockService(tenantDb).processExpiredBatches()`
3. Dispatch `inventory.expired` webhook for batches newly marked expired
4. Dispatch `inventory.expiring_soon` webhook for batches expiring within 30 days

**~LOC:** ~120

### B2: auto-reorder.cron.ts

**File:** `apps/api/src/jobs/crons/auto-reorder.cron.ts`  
**Schedule:** `0 8 * * *` (08:00 daily)  
**Requires:** New `PurchaseOrderService.autoReorder()` method or inline logic

```
export async function startAutoReorderCron()   → addCronJob(QUEUE_NAMES.INVENTORY_AUTO_REORDER, 'check-reorder', '0 8 * * *')
export function startAutoReorderWorker()       → createWorker(QUEUE_NAMES.INVENTORY_AUTO_REORDER, handler)
```

**Logic:**

1. Iterate tenants where `inventory-management` module is active
2. Check tenant settings: `autoReorderEnabled === true`
3. Query items where `availableQuantity ≤ reorderLevel` and `reorderQuantity > 0` and `defaultSupplierId` exists
4. Group by `defaultSupplierId`
5. Create draft POs per supplier with `reorderQuantity` amounts
6. Dispatch `inventory.low_stock` webhooks

**Prerequisite:** Add `autoReorder()` method to `PurchaseOrderService` or implement inline.

**~LOC:** ~150

### B3: Infrastructure Updates

**`apps/api/src/jobs/queue.ts`** — Add queue names:

```typescript
INVENTORY_EXPIRY: 'inventory-expiry',
INVENTORY_AUTO_REORDER: 'inventory-auto-reorder',
```

**`apps/api/src/jobs/index.ts`** — Add imports and calls:

```typescript
import { startExpiryCron, startExpiryWorker } from './crons/expiry.cron.js';
import { startAutoReorderCron, startAutoReorderWorker } from './crons/auto-reorder.cron.js';

// In startScheduledJobs():
startExpiryWorker();
startAutoReorderWorker();
await startExpiryCron();
await startAutoReorderCron();
```

---

## 7. Phase C — Service Tests

**Location:** Co-located next to services in `apps/api/src/tenant/services/`  
**Pattern:** Follow `invoice.service.test.ts` exactly  
**Framework:** Vitest with `vi.mock` for models, `vi.fn()` for mongoose methods

### C1: inventory-item.service.test.ts (~12 tests)

| Test                                    | Description                                |
| :-------------------------------------- | :----------------------------------------- |
| `list — returns paginated items`        | Mock find chain, verify page/limit         |
| `list — applies search filter`          | Verify text search regex                   |
| `list — lowStock=true delegates`        | Verify getLowStockItems called             |
| `getById — returns item`                | Happy path                                 |
| `getById — throws NotFound`             | Non-existent ID                            |
| `create — creates item`                 | Verify model.create + category validation  |
| `update — updates item`                 | Verify findByIdAndUpdate                   |
| `softDelete — blocks if reserved stock` | Should throw ApiError                      |
| `softDelete — deactivates`              | Happy path                                 |
| `adjustStock — add stock`               | Verify stock increment + movement creation |
| `adjustStock — remove stock (FIFO)`     | Verify batch consumption order             |
| `findByBarcode — returns item`          | Happy path                                 |

**~LOC:** ~350

### C2: inventory-stock.service.test.ts (~10 tests)

| Test                                      | Description                     |
| :---------------------------------------- | :------------------------------ |
| `getStockByBranch — paginated`            | Happy path                      |
| `getExpiringBatches — within days window` | Aggregation mock                |
| `disposeBatch — marks expired`            | Verify status change + movement |
| `bulkDispose — processes multiple`        | Verify iteration count          |
| `reserveStock — increases reserved`       | Verify increment                |
| `unreserveStock — decreases reserved`     | Verify decrement                |
| `recalculateStockValue — FIFO`            | Verify calculation              |
| `recalculateStockValue — weighted avg`    | Verify calculation              |
| `getStockSummary — aggregated KPIs`       | Verify totals                   |
| `processExpiredBatches — cron target`     | Verify all-stock scan           |

**~LOC:** ~300

### C3: supplier.service.test.ts (~8 tests)

| Test                                            | Description        |
| :---------------------------------------------- | :----------------- |
| `list — paginated with search`                  | Happy path         |
| `getById — returns supplier`                    | Happy path         |
| `getById — throws NotFound`                     | Non-existent       |
| `create — creates supplier`                     | Happy path         |
| `update — updates supplier`                     | Happy path         |
| `softDelete — blocks with active POs`           | Should throw       |
| `softDelete — deactivates`                      | Happy path         |
| `updatePerformanceMetrics — aggregates PO data` | Verify calculation |

**~LOC:** ~250

### C4: purchase-order.service.test.ts (~8 tests)

| Test                                 | Description                      |
| :----------------------------------- | :------------------------------- |
| `list — filtered by status`          | Happy path                       |
| `create — validates supplier exists` | Happy path                       |
| `create — validates items exist`     | Should throw                     |
| `update — only draft`                | Non-draft throws                 |
| `updateStatus — valid transition`    | draft→submitted                  |
| `updateStatus — invalid transition`  | submitted→draft throws           |
| `receive — updates stock + batches`  | Full receive flow                |
| `receive — partial receive`          | Verify partially_received status |

**~LOC:** ~350

### C5: stock-transfer.service.test.ts (~7 tests)

| Test                                           | Description            |
| :--------------------------------------------- | :--------------------- |
| `list — filtered by branch`                    | Happy path             |
| `create — validates stock sufficiency`         | Happy path             |
| `create — insufficient stock throws`           | Should throw           |
| `updateStatus — approve (draft→in_transit)`    | Verify approvedBy set  |
| `updateStatus — receive (in_transit→received)` | Verify stock movements |
| `updateStatus — cancel (unreserves stock)`     | Verify unreserve       |
| `updateStatus — invalid transition`            | Should throw           |

**~LOC:** ~280

### C6: stock-count.service.test.ts (~7 tests)

| Test                                 | Description                     |
| :----------------------------------- | :------------------------------ |
| `list — filtered by type`            | Happy path                      |
| `create — fetches system quantities` | Verify auto-population          |
| `updateItems — in_progress only`     | Happy path                      |
| `updateItems — completed throws`     | Should throw                    |
| `complete — sets completedAt`        | Verify timestamp                |
| `approve — applies adjustments`      | Verify stock update + movements |
| `approve — double-approve throws`    | Should throw                    |

**~LOC:** ~280

---

## 8. Phase D — Report Pipelines

**Location:** `apps/api/src/tenant/routes/reports/pipelines/`  
**Pattern:** Each pipeline exports an aggregation function called from the existing `reports.route.ts` infrastructure.

### Existing Report Infrastructure

The codebase already has `reportRoutes` registered at `/api/reports`. Each inventory report will be a new pipeline file that exports an aggregation function.

### D1–D10: Report Files

|  #  | Report                 | File                                 | Key Aggregation                                                                             |
| :-: | :--------------------- | :----------------------------------- | :------------------------------------------------------------------------------------------ |
| D1  | Material Usage         | `material-usage.pipeline.ts`         | Group movements by item + movementType over date range; show consumed qty + cost            |
| D2  | Stock Valuation        | `stock-valuation.pipeline.ts`        | All stock records with FIFO / WAC values; grouped by category; grand total                  |
| D3  | Expiry Report          | `expiry.pipeline.ts`                 | Batches grouped by expired / 30d / 60d / 90d with item details + value at risk              |
| D4  | Consumption Forecast   | `consumption-forecast.pipeline.ts`   | `avgMonthlyUsage` extrapolation; months-until-depletion; seasonal adjustments               |
| D5  | Supplier Performance   | `supplier-performance.pipeline.ts`   | PO delivery vs expected; rejection rates; avgDeliveryDays; spend per supplier               |
| D6  | Stock Movement History | `stock-movement-history.pipeline.ts` | Full movement log with filters; running balance reconstruction                              |
| D7  | PO Summary             | `po-summary.pipeline.ts`             | POs grouped by status + supplier; spend analysis; pending amounts                           |
| D8  | Low Stock Alert        | `low-stock.pipeline.ts`              | Items where available ≤ reorderLevel; days-to-stockout if avgMonthlyUsage > 0               |
| D9  | Dead Stock             | `dead-stock.pipeline.ts`             | Items with no movements in N days; value locked up                                          |
| D10 | ABC Analysis           | `abc-analysis.pipeline.ts`           | Items ranked by annual consumption value; classify A (top 80%), B (next 15%), C (bottom 5%) |

**~LOC per pipeline:** ~80  
**Total:** ~800 LOC

---

## 9. Phase E — Admin Frontend

### E1: Feature Scaffold

**Directory:** `apps/admin/src/features/inventory/`

```
inventory/
├── pages/
│   ├── InventoryListPage.tsx          (E2)
│   ├── InventoryFormPage.tsx          (E2)
│   ├── InventoryCategoryListPage.tsx  (E3)
│   ├── SupplierListPage.tsx           (E4)
│   ├── SupplierFormPage.tsx           (E4)
│   ├── PurchaseOrderListPage.tsx      (E5)
│   ├── PurchaseOrderFormPage.tsx      (E5)
│   ├── PurchaseOrderDetailPage.tsx    (E5)
│   ├── StockTransferListPage.tsx      (E6)
│   ├── StockTransferFormPage.tsx      (E6)
│   ├── StockCountListPage.tsx         (E7)
│   ├── StockCountFormPage.tsx         (E7)
│   ├── ExpiryDashboardPage.tsx        (E8)
│   ├── MaterialUsageReportPage.tsx    (E9)
│   └── StockValuationReportPage.tsx   (E9)
├── components/
│   ├── InventoryForm.tsx              — Shared form for create/edit item
│   ├── SupplierForm.tsx               — Shared form for create/edit supplier
│   ├── PurchaseOrderForm.tsx          — PO line items with item picker
│   ├── PurchaseOrderReceiveDialog.tsx — Modal for receiving PO items
│   ├── StockTransferForm.tsx          — Transfer form with branch pickers
│   ├── StockCountForm.tsx             — Count form with item scanner
│   ├── StockAdjustmentDialog.tsx      — Modal for manual stock adjustment
│   ├── ExpiryDashboard.tsx            — Status cards + expiry table
│   ├── BarcodeScanner.tsx             — html5-qrcode integration
│   └── LowStockBadge.tsx             — Color-coded stock status badge
├── hooks/
│   ├── useInventoryItems.ts           — React Query for items CRUD
│   ├── useInventoryStock.ts           — React Query for stock operations
│   ├── useSuppliers.ts                — React Query for suppliers CRUD
│   ├── usePurchaseOrders.ts           — React Query for PO CRUD + receive
│   └── useStockTransfers.ts           — React Query for transfers
└── index.ts                           — Feature barrel export
```

### E2–E9: Page Specifications

**E2: Inventory Items** (2 pages)

- `InventoryListPage.tsx`: Data table (columns: Item, SKU, Category, Stock, Min, Unit Cost, Value), stat cards (total items, low stock, expired, total value), search + category filter + stock status filter, tabs [Items | Stock | Movements], link to /inventory/new
- `InventoryFormPage.tsx`: Create/edit form (basic info, pricing, reorder levels, barcode, supplier picker), uses `useParams` for `:id` (edit mode), category dropdown, unit dropdown (12 types)

**E3: Categories** (1 page)

- `InventoryCategoryListPage.tsx`: Tree/flat list of categories, inline create/edit, drag for sortOrder, parentId picker, INVENTORY_CATEGORY_SEEDS used for initial display

**E4: Suppliers** (2 pages)

- `SupplierListPage.tsx`: Data table (Name, Contact, Phone, Rating, Orders), search filter
- `SupplierFormPage.tsx`: Create/edit form (contact info, address, tax, payment terms)

**E5: Purchase Orders** (3 pages)

- `PurchaseOrderListPage.tsx`: Data table (PO#, Supplier, Status, Date, Total), status filter, date range filter
- `PurchaseOrderFormPage.tsx`: Create PO with supplier picker, item line items (itemId, quantity, unitCost), expected date, tax/discount
- `PurchaseOrderDetailPage.tsx`: View PO details, status timeline, receive action (ReceiveDialog), approve/cancel actions

**E6: Stock Transfers** (2 pages)

- `StockTransferListPage.tsx`: Data table (Transfer#, From, To, Status, Date), branch filter
- `StockTransferFormPage.tsx`: Create transfer with from/to branch pickers, item line items, submit creates draft

**E7: Stock Counts** (2 pages)

- `StockCountListPage.tsx`: Data table (Count#, Branch, Type, Status, Date), type filter
- `StockCountFormPage.tsx`: Create count, select items to count, enter counted quantities, submit → complete → approve flow

**E8: Expiry Dashboard** (1 page)

- `ExpiryDashboardPage.tsx`: Status cards (Expired, <30d, <60d, <90d, OK), batch table with dispose action, bulk dispose

**E9: Reports** (2 pages)

- `MaterialUsageReportPage.tsx`: Date range picker, branch filter, material usage table, chart
- `StockValuationReportPage.tsx`: Branch picker, valuation method display, category breakdown, total value

### E10: Router & Sidebar Wiring

**`apps/admin/src/router.tsx`** — Add inside DashboardLayout children:

```tsx
// Phase 5 — Inventory Management
{ path: '/inventory', element: <InventoryListPage /> },
{ path: '/inventory/new', element: <InventoryFormPage /> },
{ path: '/inventory/:id', element: <InventoryFormPage /> },
{ path: '/inventory/categories', element: <InventoryCategoryListPage /> },
{ path: '/inventory/suppliers', element: <SupplierListPage /> },
{ path: '/inventory/suppliers/new', element: <SupplierFormPage /> },
{ path: '/inventory/suppliers/:id', element: <SupplierFormPage /> },
{ path: '/inventory/purchase-orders', element: <PurchaseOrderListPage /> },
{ path: '/inventory/purchase-orders/new', element: <PurchaseOrderFormPage /> },
{ path: '/inventory/purchase-orders/:id', element: <PurchaseOrderDetailPage /> },
{ path: '/inventory/transfers', element: <StockTransferListPage /> },
{ path: '/inventory/transfers/new', element: <StockTransferFormPage /> },
{ path: '/inventory/stock-count', element: <StockCountListPage /> },
{ path: '/inventory/stock-count/new', element: <StockCountFormPage /> },
{ path: '/inventory/expiry', element: <ExpiryDashboardPage /> },
```

**`apps/admin/src/layouts/Sidebar/sidebar-config.ts`** — Already has entry:

```typescript
{ label: 'Inventory', icon: Package, path: '/inventory', group: 'Operations', module: 'inventory' }
```

Sub-navigation tabs will be handled within the inventory feature pages (not sidebar).

---

## 10. File Creation Manifest

### New Files (46 total)

|   # | File                                                                         | Phase | ~LOC |
| --: | :--------------------------------------------------------------------------- | :---: | ---: |
|   1 | `api/src/tenant/services/inventory-category.service.ts`                      |  A1   |  120 |
|   2 | `api/src/tenant/routes/inventory-categories/inventory-categories.route.ts`   |  A2   |  100 |
|   3 | `api/src/tenant/routes/inventory-items/inventory-items.route.ts`             |  A3   |  220 |
|   4 | `api/src/tenant/routes/inventory-stock/inventory-stock.route.ts`             |  A4   |  200 |
|   5 | `api/src/tenant/routes/suppliers/suppliers.route.ts`                         |  A5   |  160 |
|   6 | `api/src/tenant/routes/purchase-orders/purchase-orders.route.ts`             |  A6   |  150 |
|   7 | `api/src/tenant/routes/stock-transfers/stock-transfers.route.ts`             |  A7   |   90 |
|   8 | `api/src/tenant/routes/stock-counts/stock-counts.route.ts`                   |  A8   |  140 |
|   9 | `api/src/jobs/crons/expiry.cron.ts`                                          |  B1   |  120 |
|  10 | `api/src/jobs/crons/auto-reorder.cron.ts`                                    |  B2   |  150 |
|  11 | `api/src/tenant/services/inventory-item.service.test.ts`                     |  C1   |  350 |
|  12 | `api/src/tenant/services/inventory-stock.service.test.ts`                    |  C2   |  300 |
|  13 | `api/src/tenant/services/supplier.service.test.ts`                           |  C3   |  250 |
|  14 | `api/src/tenant/services/purchase-order.service.test.ts`                     |  C4   |  350 |
|  15 | `api/src/tenant/services/stock-transfer.service.test.ts`                     |  C5   |  280 |
|  16 | `api/src/tenant/services/stock-count.service.test.ts`                        |  C6   |  280 |
|  17 | `api/src/tenant/routes/reports/pipelines/material-usage.pipeline.ts`         |  D1   |   80 |
|  18 | `api/src/tenant/routes/reports/pipelines/stock-valuation.pipeline.ts`        |  D2   |   80 |
|  19 | `api/src/tenant/routes/reports/pipelines/expiry.pipeline.ts`                 |  D3   |   80 |
|  20 | `api/src/tenant/routes/reports/pipelines/consumption-forecast.pipeline.ts`   |  D4   |   80 |
|  21 | `api/src/tenant/routes/reports/pipelines/supplier-performance.pipeline.ts`   |  D5   |   80 |
|  22 | `api/src/tenant/routes/reports/pipelines/stock-movement-history.pipeline.ts` |  D6   |   80 |
|  23 | `api/src/tenant/routes/reports/pipelines/po-summary.pipeline.ts`             |  D7   |   80 |
|  24 | `api/src/tenant/routes/reports/pipelines/low-stock.pipeline.ts`              |  D8   |   80 |
|  25 | `api/src/tenant/routes/reports/pipelines/dead-stock.pipeline.ts`             |  D9   |   80 |
|  26 | `api/src/tenant/routes/reports/pipelines/abc-analysis.pipeline.ts`           |  D10  |   80 |
|  27 | `admin/src/features/inventory/index.ts`                                      |  E1   |   10 |
|  28 | `admin/src/features/inventory/hooks/useInventoryItems.ts`                    |  E1   |   80 |
|  29 | `admin/src/features/inventory/hooks/useInventoryStock.ts`                    |  E1   |   60 |
|  30 | `admin/src/features/inventory/hooks/useSuppliers.ts`                         |  E1   |   60 |
|  31 | `admin/src/features/inventory/hooks/usePurchaseOrders.ts`                    |  E1   |   80 |
|  32 | `admin/src/features/inventory/hooks/useStockTransfers.ts`                    |  E1   |   50 |
|  33 | `admin/src/features/inventory/pages/InventoryListPage.tsx`                   |  E2   |  200 |
|  34 | `admin/src/features/inventory/pages/InventoryFormPage.tsx`                   |  E2   |  250 |
|  35 | `admin/src/features/inventory/pages/InventoryCategoryListPage.tsx`           |  E3   |  150 |
|  36 | `admin/src/features/inventory/pages/SupplierListPage.tsx`                    |  E4   |  150 |
|  37 | `admin/src/features/inventory/pages/SupplierFormPage.tsx`                    |  E4   |  200 |
|  38 | `admin/src/features/inventory/pages/PurchaseOrderListPage.tsx`               |  E5   |  180 |
|  39 | `admin/src/features/inventory/pages/PurchaseOrderFormPage.tsx`               |  E5   |  250 |
|  40 | `admin/src/features/inventory/pages/PurchaseOrderDetailPage.tsx`             |  E5   |  200 |
|  41 | `admin/src/features/inventory/pages/StockTransferListPage.tsx`               |  E6   |  150 |
|  42 | `admin/src/features/inventory/pages/StockTransferFormPage.tsx`               |  E6   |  200 |
|  43 | `admin/src/features/inventory/pages/StockCountListPage.tsx`                  |  E7   |  150 |
|  44 | `admin/src/features/inventory/pages/StockCountFormPage.tsx`                  |  E7   |  200 |
|  45 | `admin/src/features/inventory/pages/ExpiryDashboardPage.tsx`                 |  E8   |  180 |
|  46 | `admin/src/features/inventory/pages/MaterialUsageReportPage.tsx`             |  E9   |  150 |
|  47 | `admin/src/features/inventory/pages/StockValuationReportPage.tsx`            |  E9   |  150 |
|  48 | `admin/src/features/inventory/components/InventoryForm.tsx`                  |  E2   |  200 |
|  49 | `admin/src/features/inventory/components/SupplierForm.tsx`                   |  E4   |  150 |
|  50 | `admin/src/features/inventory/components/PurchaseOrderForm.tsx`              |  E5   |  200 |
|  51 | `admin/src/features/inventory/components/PurchaseOrderReceiveDialog.tsx`     |  E5   |  150 |
|  52 | `admin/src/features/inventory/components/StockTransferForm.tsx`              |  E6   |  150 |
|  53 | `admin/src/features/inventory/components/StockCountForm.tsx`                 |  E7   |  150 |
|  54 | `admin/src/features/inventory/components/StockAdjustmentDialog.tsx`          |  E2   |  120 |
|  55 | `admin/src/features/inventory/components/ExpiryDashboard.tsx`                |  E8   |  150 |
|  56 | `admin/src/features/inventory/components/BarcodeScanner.tsx`                 |  E2   |  100 |
|  57 | `admin/src/features/inventory/components/LowStockBadge.tsx`                  |  E2   |   30 |

### Modified Files (4 total)

| File                    | Phase | Changes                                       |
| :---------------------- | :---: | :-------------------------------------------- |
| `api/src/server.ts`     |  A9   | Add 7 inventory route imports + registrations |
| `api/src/jobs/queue.ts` |  B3   | Add 2 queue names                             |
| `api/src/jobs/index.ts` |  B3   | Add 2 cron + 2 worker imports + calls         |
| `admin/src/router.tsx`  |  E10  | Add 15 inventory routes                       |

---

## 11. Dependency Graph

```
                    ┌──────────────────────────┐
                    │   EXISTING (Complete)     │
                    │ • 8 Models (1,070 LOC)    │
                    │ • 6 Services (1,608 LOC)  │
                    │ • 31 Schemas (321 LOC)    │
                    └───────────┬──────────────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                   │
        ┌────▼────┐      ┌─────▼─────┐      ┌─────▼─────┐
        │ Phase A │      │  Phase B  │      │  Phase C  │
        │ Routes  │      │  BullMQ   │      │   Tests   │
        │ (7 file)│      │ (2 files) │      │ (6 files) │
        └────┬────┘      └─────┬─────┘      └───────────┘
             │                  │
             ├──────────────────┤
             │                  │
        ┌────▼────┐      ┌─────▼─────┐
        │ Phase D │      │  Phase E  │
        │ Reports │      │ Frontend  │
        │(10 file)│      │(~30 files)│
        └─────────┘      └───────────┘
```

**Phases A, B, C can run in parallel** (no cross-dependencies).  
**Phase D** depends on Phase A (reports integrate with route infrastructure).  
**Phase E** depends on Phase A (frontend calls API endpoints).

---

## 12. RBAC & Webhook Integration

### RBAC Implementation

The `inventory` module is already in the role-guard permission matrix. Use standard `roleGuard` calls:

```typescript
// Read operations (all staff with 'read')
preHandler: [authGuard, tenantDbMiddleware];

// Create operations
preHandler: [...preHandler, roleGuard('inventory', 'create')];

// Update operations
preHandler: [...preHandler, roleGuard('inventory', 'update')];

// Delete operations (admin only via matrix — assistant has read, create, update but NOT delete)
preHandler: [...preHandler, roleGuard('inventory', 'delete')];
```

**Special case — Stock Count Approve:** Uses `roleGuard('inventory', 'delete')` since only admin should approve. The existing matrix maps: `platform_admin: '*'`, `tenant_admin: '*'`, and no other role has `delete`.

### Webhook Dispatch Pattern

```typescript
import { dispatchWebhookEvent } from '../../services/webhook-dispatcher.js';

// In route handler, AFTER service call succeeds:
await dispatchWebhookEvent(tenantDb, {
  event: 'inventory.item.created',
  payload: { itemId: item._id, sku: item.sku, name: item.nameEn },
  userId,
});
```

---

## 13. Cross-Module Integration Points

These are **future** integrations (not blocking Phase 5, but noted for planning):

| Integration                       | Source Module   | Target                                    | How                                            |
| :-------------------------------- | :-------------- | :---------------------------------------- | :--------------------------------------------- |
| Treatment Plan → Stock Reserve    | Treatment Plans | `InventoryStockService.reserveStock()`    | On plan creation, reserve materials            |
| Procedure Complete → Stock Deduct | Procedure Notes | `InventoryItemService.adjustStock()`      | On procedure completion, deduct used materials |
| Service → Default Materials       | Services        | `inventory_items` collection              | `services.defaultMaterials[]` field            |
| Dashboard Widget                  | Dashboard       | `InventoryStockService.getStockSummary()` | Low-stock + expiry counts for dashboard cards  |
| Invoice → Inventory Items         | Invoices        | `inventory_items` as line items           | Material items with stock validation           |
| Appointment → Material Checklist  | Appointments    | `inventory_items`                         | Per appointment-type material requirements     |

---

## 14. Acceptance Criteria

### Phase A (Routes) — DONE when:

- [ ] All 7 route files created and registered in server.ts
- [ ] `InventoryCategoryService` created with 6 methods
- [ ] Build passes: `turbo build` succeeds (5/5 + new routes)
- [ ] 59 endpoints respond (401 without auth, correct shape with auth)
- [ ] Swagger docs show all inventory endpoints

### Phase B (BullMQ) — DONE when:

- [ ] 2 cron files created with correct schedules
- [ ] Queue names registered in queue.ts
- [ ] Workers registered in jobs/index.ts
- [ ] Crons schedulable (verifiable in Redis/BullMQ dashboard)

### Phase C (Tests) — DONE when:

- [ ] 6 test files with ~52 tests total
- [ ] All tests pass: `vitest run` (existing 131 + ~52 new = ~183 total)
- [ ] Each service has ≥80% method coverage

### Phase D (Reports) — DONE when:

- [ ] 10 pipeline files created
- [ ] Pipelines callable from existing report infrastructure
- [ ] Each pipeline returns structured data with proper aggregation

### Phase E (Frontend) — DONE when:

- [ ] 17 pages render without errors
- [ ] 5 hooks created with React Query integration
- [ ] ~10 components created
- [ ] Routes wired in router.tsx
- [ ] Navigation works from sidebar → all inventory sub-pages
- [ ] Forms submit to API and show success/error feedback

### Final M5 Gate:

- [ ] Full build: 5/5 packages
- [ ] All tests pass: ~183/183
- [ ] Inventory CRUD works end-to-end
- [ ] 10 inventory reports generate data
- [ ] RBAC enforced on all endpoints
- [ ] No TypeScript errors
- [ ] PHASE_5_COMPLIANCE_REPORT.md updated to 100%

---

## Appendix A: Naming Conventions Reference

| Artifact           | Convention                   | Example                          |
| :----------------- | :--------------------------- | :------------------------------- |
| Route file         | `kebab-case.route.ts`        | `inventory-items.route.ts`       |
| Route export       | `camelCaseRoutes`            | `inventoryItemRoutes`            |
| Route prefix       | `/api/kebab-plural`          | `/api/inventory-items`           |
| Service file       | `kebab-case.service.ts`      | `inventory-item.service.ts`      |
| Service class      | `PascalCaseService`          | `InventoryItemService`           |
| Test file          | `kebab-case.service.test.ts` | `inventory-item.service.test.ts` |
| Model factory      | `getPascalCaseModel`         | `getInventoryItemModel`          |
| Schema             | `camelCaseSchema`            | `createInventoryItemSchema`      |
| Frontend page      | `PascalCasePage.tsx`         | `InventoryListPage.tsx`          |
| Frontend hook      | `usePascalCase.ts`           | `useInventoryItems.ts`           |
| Frontend component | `PascalCase.tsx`             | `InventoryForm.tsx`              |
| Cron file          | `kebab-case.cron.ts`         | `expiry.cron.ts`                 |
| Pipeline file      | `kebab-case.pipeline.ts`     | `stock-valuation.pipeline.ts`    |

## Appendix B: Execution Order Checklist

```
Day 1: Phase A — Routes
  □ A1: Create InventoryCategoryService
  □ A2: Create inventory-categories.route.ts
  □ A3: Create inventory-items.route.ts
  □ A4: Create inventory-stock.route.ts
  □ A5: Create suppliers.route.ts
  □ A6: Create purchase-orders.route.ts
  □ A7: Create stock-transfers.route.ts
  □ A8: Create stock-counts.route.ts
  □ A9: Register in server.ts
  □ Verify: turbo build passes

Day 2: Phase B + C — Jobs + Tests
  □ B1: Create expiry.cron.ts
  □ B2: Create auto-reorder.cron.ts
  □ B3: Update queue.ts + index.ts
  □ C1-C6: Create all 6 test files
  □ Verify: vitest run (~183 tests passing)

Day 3: Phase D — Report Pipelines
  □ D1-D10: Create all 10 pipeline files
  □ Wire into existing report infrastructure
  □ Verify: Build passes

Day 4-5: Phase E — Frontend
  □ E1: Scaffold + hooks
  □ E2: Inventory Items pages + components
  □ E3: Categories page
  □ E4: Suppliers pages + components
  □ E5: Purchase Orders pages + components
  □ E6: Stock Transfers pages + components
  □ E7: Stock Counts pages + components
  □ E8: Expiry Dashboard
  □ E9: Report pages
  □ E10: Router wiring
  □ Verify: Admin app builds, pages render

Day 6: Final Verification
  □ Full turbo build
  □ Full test suite
  □ Update PHASE_5_COMPLIANCE_REPORT.md to 100%
  □ Update IMPLEMENTATION_PROGRESS.md
```

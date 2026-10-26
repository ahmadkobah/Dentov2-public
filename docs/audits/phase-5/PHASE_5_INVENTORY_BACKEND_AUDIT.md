# Phase 5 — Inventory Management Backend Audit

> **Generated:** 2025-01-XX  
> **Scope:** All Phase 5 backend files (models, services, routes, jobs, tests, schemas, report pipelines)  
> **Type:** Research-only audit — no code changes

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Models (8/8)](#2-models-88)
3. [Services (7/7 + Report Pipeline)](#3-services-77--report-pipeline)
4. [Routes (7/7 + Report Endpoint)](#4-routes-77--report-endpoint)
5. [server.ts Registration](#5-serverts-registration)
6. [BullMQ Cron Jobs (2/2)](#6-bullmq-cron-jobs-22)
7. [Tests (6/8 — 2 Missing)](#7-tests-68--2-missing)
8. [Report Pipeline (10/10)](#8-report-pipeline-1010)
9. [Zod Schemas (Complete)](#9-zod-schemas-complete)
10. [Cross-Cutting Patterns](#10-cross-cutting-patterns)
11. [Missing / Incomplete Items](#11-missing--incomplete-items)
12. [Summary Scorecard](#12-summary-scorecard)

---

## 1. Executive Summary

Phase 5 (Inventory Management) is **substantially complete** across all 8 audit areas. The implementation covers 8 Mongoose models, 7 CRUD services + 1 report pipeline service, 7 route modules (57 total endpoints), 2 BullMQ cron jobs, 6 test suites, 1 comprehensive Zod schema file (33 exported schemas/types), and a 10-method report pipeline with Redis caching.

| Area            | Expected         | Found           | Status       |
| --------------- | ---------------- | --------------- | ------------ |
| Models          | 8                | 8               | ✅ Complete  |
| Services        | 7 + pipeline     | 7 + pipeline    | ✅ Complete  |
| Routes          | 7 + reports      | 7 + reports     | ✅ Complete  |
| server.ts       | 7 registrations  | 7 registrations | ✅ Complete  |
| Cron Jobs       | 2                | 2               | ✅ Complete  |
| Tests           | 8 (all services) | 6               | ⚠️ 2 Missing |
| Report Pipeline | 10 types         | 10 types        | ✅ Complete  |
| Zod Schemas     | All needed       | 33 exports      | ✅ Complete  |

**Critical Gaps:** 2 missing test files (`inventory-category.service.test.ts`, `inventory-report-pipeline.service.test.ts`).

---

## 2. Models (8/8)

All models follow the **factory pattern** (`getXModel(connection)` with `connection.models` cache check), multi-tenant isolation, and Mongoose timestamps.

### 2.1 InventoryCategory

| Property        | Value                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **File**        | `apps/api/src/tenant/models/inventory-category.model.ts`                                         |
| **Lines**       | 126                                                                                              |
| **Collection**  | `InventoryCategory`                                                                              |
| **Fields**      | 10: nameEn, nameAr, slug, parentId, description, icon, sortOrder, isActive, createdBy, updatedBy |
| **Indexes**     | 3: slug (unique), parentId, isActive+sortOrder                                                   |
| **Hooks**       | pre-validate: auto-generate slug from nameEn                                                     |
| **Extras**      | 10 seed categories exported as `INVENTORY_CATEGORY_SEEDS`                                        |
| **Soft Delete** | ✅ via `isActive`                                                                                |
| **Factory**     | ✅ `getInventoryCategoryModel(connection)`                                                       |

### 2.2 InventoryItem

| Property        | Value                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `apps/api/src/tenant/models/inventory-item.model.ts`                                                                                                                                                                                                                                                                                                                                                              |
| **Lines**       | 177                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Collection**  | `InventoryItem`                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Fields**      | 29: sku, nameEn, nameAr, categoryId, description, unit (12 enums), unitsPerPackage, unitCost, sellingPrice, marginPercent, reorderLevel, reorderQuantity, minStockLevel, maxStockLevel, isConsumable, requiresPrescription, imageUrl, barcode, barcodeType, manufacturer, manufacturerRef, defaultSupplierId, totalConsumed, avgMonthlyUsage, lastPurchaseDate, lastPurchasePrice, isActive, createdBy, updatedBy |
| **Indexes**     | 6: sku (unique), categoryId, barcode (unique sparse), isActive+nameEn, defaultSupplierId, text(nameEn+nameAr+sku)                                                                                                                                                                                                                                                                                                 |
| **Hooks**       | pre-validate: auto-generate SKU `ITM-{year}-{00001}`                                                                                                                                                                                                                                                                                                                                                              |
| **Soft Delete** | ✅ via `isActive`                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Factory**     | ✅ `getInventoryItemModel(connection)`                                                                                                                                                                                                                                                                                                                                                                            |

### 2.3 InventoryStock

| Property        | Value                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `apps/api/src/tenant/models/inventory-stock.model.ts`                                                                                                                                                                                                                                                                                                 |
| **Lines**       | 120                                                                                                                                                                                                                                                                                                                                                   |
| **Collection**  | `InventoryStock`                                                                                                                                                                                                                                                                                                                                      |
| **Fields**      | 12 + batches sub-doc: itemId, branchId, quantity, reservedQuantity, availableQuantity, batches[] (batchNumber, lotNumber, expiryDate, quantity, receivedDate, purchaseOrderId, unitCost, status), stockValue, valuationMethod (fifo/weighted_average/last_purchase), weightedAvgCost, lastCountedAt, lastCountedBy, lastCountResult, countDiscrepancy |
| **Indexes**     | 3: itemId+branchId (unique compound), batches.expiryDate, availableQuantity                                                                                                                                                                                                                                                                           |
| **Hooks**       | pre-save: `availableQuantity = max(0, quantity - reservedQuantity)`                                                                                                                                                                                                                                                                                   |
| **Soft Delete** | N/A (stock records are not soft-deletable — correct)                                                                                                                                                                                                                                                                                                  |
| **Factory**     | ✅ `getInventoryStockModel(connection)`                                                                                                                                                                                                                                                                                                               |

### 2.4 InventoryMovement

| Property       | Value                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**       | `apps/api/src/tenant/models/inventory-movement.model.ts`                                                                                                                                                                                      |
| **Lines**      | 142                                                                                                                                                                                                                                           |
| **Collection** | `InventoryMovement`                                                                                                                                                                                                                           |
| **Fields**     | 17: itemId, branchId, movementType (13 enums), quantity, previousQuantity, newQuantity, unitCost, totalCost, referenceType (9 enums), referenceId, batchNumber, lotNumber, expiryDate, transferId, fromBranchId, toBranchId, notes, createdBy |
| **Timestamps** | `{ createdAt: true, updatedAt: false }` — immutable audit trail                                                                                                                                                                               |
| **Indexes**    | 6: itemId+createdAt, branchId+createdAt, branchId+movementType, referenceType+referenceId, transferId, createdAt                                                                                                                              |
| **Hooks**      | pre-validate: compute `totalCost = quantity × unitCost`                                                                                                                                                                                       |
| **Factory**    | ✅ `getInventoryMovementModel(connection)`                                                                                                                                                                                                    |

### 2.5 Supplier

| Property        | Value                                                                                                                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `apps/api/src/tenant/models/supplier.model.ts`                                                                                                                                                                                                                 |
| **Lines**       | ~105                                                                                                                                                                                                                                                           |
| **Collection**  | `Supplier`                                                                                                                                                                                                                                                     |
| **Fields**      | 17: name, nameAr, contactPerson, phone, email, address (sub: street, city, state, country, postalCode), taxNumber, commercialRegister, paymentTerms, rating (0–5), avgDeliveryDays, totalOrders, lastOrderDate, website, notes, isActive, createdBy, updatedBy |
| **Indexes**     | 3: name, isActive, text(name+nameAr)                                                                                                                                                                                                                           |
| **Soft Delete** | ✅ via `isActive`                                                                                                                                                                                                                                              |
| **Factory**     | ✅ `getSupplierModel(connection)`                                                                                                                                                                                                                              |

### 2.6 PurchaseOrder

| Property       | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**       | `apps/api/src/tenant/models/purchase-order.model.ts`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Lines**      | ~200                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Collection** | `PurchaseOrder`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Fields**     | 19 + items sub-doc: orderNumber, supplierId, branchId, status (7-state FSM: draft→submitted→confirmed→shipped→partially_received→received + cancelled), orderDate, expectedDate, receivedDate, items[] (itemId, quantity, unitCost, totalCost, receivedQuantity, batchNumber, expiryDate, notes), subtotal, taxPercent, taxAmount, discount, total, receivingNotes, notes, receivedBy, qualityCheck (passed/partial/failed), attachments[] (name, url, type), createdBy, updatedBy |
| **Indexes**    | 4: orderNumber (unique), supplierId+status, status+expectedDate, branchId+status+createdAt                                                                                                                                                                                                                                                                                                                                                                                         |
| **Hooks**      | pre-validate: auto-number `PO-{year}-{00001}`; pre-save: compute item totals, subtotal, tax, grand total                                                                                                                                                                                                                                                                                                                                                                           |
| **Factory**    | ✅ `getPurchaseOrderModel(connection)`                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### 2.7 StockTransfer

| Property       | Value                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**       | `apps/api/src/tenant/models/stock-transfer.model.ts`                                                                                                                                                                                                   |
| **Lines**      | ~115                                                                                                                                                                                                                                                   |
| **Collection** | `StockTransfer`                                                                                                                                                                                                                                        |
| **Fields**     | 13 + items sub-doc: transferNumber, fromBranchId, toBranchId, status (draft/in_transit/received/cancelled), items[] (itemId, quantity, batchNumber, notes), requestedBy, approvedBy, receivedBy, requestedAt, approvedAt, shippedAt, receivedAt, notes |
| **Indexes**    | 3: transferNumber (unique), fromBranchId+status, toBranchId+status                                                                                                                                                                                     |
| **Hooks**      | pre-validate: auto-number `TRF-{year}-{00001}`                                                                                                                                                                                                         |
| **Factory**    | ✅ `getStockTransferModel(connection)`                                                                                                                                                                                                                 |

### 2.8 StockCount

| Property       | Value                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**       | `apps/api/src/tenant/models/stock-count.model.ts`                                                                                                                                                                                                                                                                                                                                        |
| **Lines**      | 155                                                                                                                                                                                                                                                                                                                                                                                      |
| **Collection** | `StockCount`                                                                                                                                                                                                                                                                                                                                                                             |
| **Fields**     | 12 + items sub-doc + summary sub-doc: countNumber, branchId, status (in_progress/completed/approved/cancelled), countType (full/partial/spot_check), items[] (itemId, systemQuantity, countedQuantity, discrepancy, notes, adjustmentApplied), startedAt, completedAt, countedBy, approvedBy, summary (totalItems, matchCount, surplusCount, deficitCount, totalDiscrepancyValue), notes |
| **Indexes**    | 3: countNumber (unique), branchId+status, branchId+createdAt                                                                                                                                                                                                                                                                                                                             |
| **Hooks**      | pre-validate: auto-number `SC-{year}-{00001}`; pre-save: compute discrepancy per item + summary totals                                                                                                                                                                                                                                                                                   |
| **Factory**    | ✅ `getStockCountModel(connection)`                                                                                                                                                                                                                                                                                                                                                      |

---

## 3. Services (7/7 + Report Pipeline)

All services follow the **class-based pattern**: constructor receives `tenantDb: Connection`, creates model instances, exposes async methods. All CUD methods accept `userId` for audit trail (`createdBy`/`updatedBy`).

### 3.1 InventoryCategoryService

| Property         | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| **File**         | `apps/api/src/tenant/services/inventory-category.service.ts`      |
| **Lines**        | ~170                                                              |
| **Methods**      | 6: `list`, `getById`, `create`, `update`, `softDelete`, `restore` |
| **Models Used**  | Category, Item                                                    |
| **Guards**       | Item reference check on soft delete                               |
| **userId Audit** | ✅                                                                |

### 3.2 InventoryItemService

| Property         | Value                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `apps/api/src/tenant/services/inventory-item.service.ts`                                                                                                       |
| **Lines**        | ~390                                                                                                                                                           |
| **Methods**      | 11: `list`, `getById`, `create`, `update`, `softDelete`, `restore`, `getStockLevels`, `adjustStock`, `getLowStockItems`, `findByBarcode`, `getMovementHistory` |
| **Models Used**  | Item, Stock, Movement, Category                                                                                                                                |
| **Key Logic**    | FIFO batch consumption in `adjustStock`, aggregation pipeline in `getLowStockItems`                                                                            |
| **userId Audit** | ✅                                                                                                                                                             |

### 3.3 InventoryStockService

| Property         | Value                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `apps/api/src/tenant/services/inventory-stock.service.ts`                                                                                                                                                                                     |
| **Lines**        | ~500                                                                                                                                                                                                                                          |
| **Methods**      | 12: `getStockByBranch`, `getStockForItem`, `getExpiringBatches`, `disposeBatch`, `bulkDispose`, `reserveStock`, `unreserveStock`, `recalculateStockValue`, `getStockSummary`, `getExpiryDashboard`, `processExpiredBatches`, `getStockReport` |
| **Models Used**  | Stock, Movement, Item                                                                                                                                                                                                                         |
| **Key Logic**    | 3 valuation methods (FIFO/WA/Last Purchase), SYSTEM_USER_ID sentinel for cron-created movements, batch expiry scanning                                                                                                                        |
| **userId Audit** | ✅                                                                                                                                                                                                                                            |

### 3.4 SupplierService

| Property         | Value                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| **File**         | `apps/api/src/tenant/services/supplier.service.ts`                                                                 |
| **Lines**        | ~240                                                                                                               |
| **Methods**      | 8: `list`, `getById`, `create`, `update`, `softDelete`, `restore`, `getSupplierOrders`, `updatePerformanceMetrics` |
| **Models Used**  | Supplier, PurchaseOrder                                                                                            |
| **Guards**       | Active PO reference check on soft delete                                                                           |
| **Key Logic**    | Aggregation pipeline in `updatePerformanceMetrics`                                                                 |
| **userId Audit** | ✅                                                                                                                 |

### 3.5 PurchaseOrderService

| Property         | Value                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **File**         | `apps/api/src/tenant/services/purchase-order.service.ts`                                                     |
| **Lines**        | ~470                                                                                                         |
| **Methods**      | 7: `list`, `getById`, `create`, `update` (draft only), `updateStatus`, `receive`, `delete` (draft only)      |
| **Models Used**  | PurchaseOrder, Stock, Movement, Item, Supplier                                                               |
| **Key Logic**    | 7-state FSM (`STATUS_TRANSITIONS` map), `receive()` creates batches + stock + movements + updates item stats |
| **userId Audit** | ✅                                                                                                           |

### 3.6 StockTransferService

| Property         | Value                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**         | `apps/api/src/tenant/services/stock-transfer.service.ts`                                                                                                                                                                 |
| **Lines**        | ~420                                                                                                                                                                                                                     |
| **Methods**      | 6 (3 public + 3 private): `list`, `getById`, `create` (reserves source stock), `updateStatus` → dispatches to `approveTransfer`, `receiveTransfer` (transfer_out + transfer_in movements), `cancelTransfer` (unreserves) |
| **Models Used**  | Transfer, Stock, Movement, Item                                                                                                                                                                                          |
| **Key Logic**    | 2 movements per item on receive (transfer_out + transfer_in), stock reservation on create                                                                                                                                |
| **userId Audit** | ✅                                                                                                                                                                                                                       |

### 3.7 StockCountService

| Property         | Value                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `apps/api/src/tenant/services/stock-count.service.ts`                                                                                                    |
| **Lines**        | ~370                                                                                                                                                     |
| **Methods**      | 7: `list`, `getById`, `create` (auto-populates systemQuantity), `updateItems`, `complete`, `approve` (applies adjustments + creates movements), `cancel` |
| **Models Used**  | StockCount, Stock, Movement, Item                                                                                                                        |
| **Key Logic**    | Double-approve guard, selective item adjustment via `itemIds` array                                                                                      |
| **userId Audit** | ✅                                                                                                                                                       |

### 3.8 InventoryReportPipelineService

See [Section 8](#8-report-pipeline-1010) for full detail.

---

## 4. Routes (7/7 + Report Endpoint)

All routes use: `authGuard` ✅, `tenantDbMiddleware` ✅, `roleGuard('inventory', action)` on CUD ✅, `getTenantDb(request)` ✅, `getUserId(request)` ✅, `apiResponse`/`apiError` ✅. Zod validation on request body/query.

### 4.1 Inventory Categories

| Property      | Value                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/inventory-categories/inventory-categories.route.ts` |
| **Lines**     | ~160                                                                            |
| **Prefix**    | `/api/inventory-categories`                                                     |
| **Endpoints** | 6                                                                               |
| **Webhooks**  | ❌ None                                                                         |

| #   | Method | Path           | Zod Schema                    | Role Guard       |
| --- | ------ | -------------- | ----------------------------- | ---------------- |
| 1   | GET    | `/`            | inventoryCategoryQuerySchema  | —                |
| 2   | GET    | `/:id`         | —                             | —                |
| 3   | POST   | `/`            | createInventoryCategorySchema | inventory:create |
| 4   | PUT    | `/:id`         | updateInventoryCategorySchema | inventory:update |
| 5   | DELETE | `/:id`         | —                             | inventory:delete |
| 6   | PATCH  | `/:id/restore` | —                             | inventory:update |

### 4.2 Inventory Items

| Property      | Value                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/inventory-items/inventory-items.route.ts`                                                                 |
| **Lines**     | 306                                                                                                                                   |
| **Prefix**    | `/api/inventory-items`                                                                                                                |
| **Endpoints** | 11                                                                                                                                    |
| **Webhooks**  | ✅ 5: `inventory.item.created`, `inventory.item.updated`, `inventory.out_of_stock`, `inventory.critical_stock`, `inventory.low_stock` |

| #   | Method | Path                | Zod Schema                   | Role Guard       |
| --- | ------ | ------------------- | ---------------------------- | ---------------- |
| 1   | GET    | `/`                 | inventoryItemQuerySchema     | —                |
| 2   | GET    | `/low-stock`        | inventoryItemQuerySchema     | —                |
| 3   | GET    | `/:id`              | —                            | —                |
| 4   | POST   | `/`                 | createInventoryItemSchema    | inventory:create |
| 5   | PUT    | `/:id`              | updateInventoryItemSchema    | inventory:update |
| 6   | DELETE | `/:id`              | —                            | inventory:delete |
| 7   | PATCH  | `/:id/restore`      | —                            | inventory:update |
| 8   | GET    | `/:id/stock`        | —                            | —                |
| 9   | POST   | `/:id/stock/adjust` | stockAdjustmentSchema        | inventory:update |
| 10  | POST   | `/barcode/search`   | barcodeSearchSchema          | —                |
| 11  | GET    | `/:id/movements`    | inventoryMovementQuerySchema | —                |

### 4.3 Inventory Stock

| Property      | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/inventory-stock/inventory-stock.route.ts` |
| **Lines**     | ~280                                                                  |
| **Prefix**    | `/api/inventory-stock`                                                |
| **Endpoints** | 11                                                                    |
| **Webhooks**  | ✅ 1: `inventory.expired` (on dispose)                                |

| #   | Method | Path                                 | Zod Schema        | Role Guard       |
| --- | ------ | ------------------------------------ | ----------------- | ---------------- |
| 1   | GET    | `/branch/:branchId`                  | —                 | —                |
| 2   | GET    | `/item/:itemId`                      | —                 | —                |
| 3   | GET    | `/branch/:branchId/summary`          | —                 | —                |
| 4   | GET    | `/branch/:branchId/expiry-dashboard` | —                 | —                |
| 5   | GET    | `/expiring`                          | expiryQuerySchema | —                |
| 6   | POST   | `/:stockId/dispose/:batchNumber`     | —                 | inventory:update |
| 7   | POST   | `/bulk-dispose`                      | bulkDisposeSchema | inventory:update |
| 8   | POST   | `/reserve`                           | — (raw body)      | inventory:update |
| 9   | POST   | `/unreserve`                         | — (raw body)      | inventory:update |
| 10  | POST   | `/:stockId/recalculate`              | —                 | inventory:update |
| 11  | GET    | `/branch/:branchId/report`           | —                 | —                |

### 4.4 Suppliers

| Property      | Value                                                     |
| ------------- | --------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/suppliers/suppliers.route.ts` |
| **Lines**     | ~250                                                      |
| **Prefix**    | `/api/suppliers`                                          |
| **Endpoints** | 8                                                         |
| **Webhooks**  | ❌ None                                                   |

| #   | Method | Path                  | Zod Schema           | Role Guard       |
| --- | ------ | --------------------- | -------------------- | ---------------- |
| 1   | GET    | `/`                   | supplierQuerySchema  | —                |
| 2   | GET    | `/:id`                | —                    | —                |
| 3   | POST   | `/`                   | createSupplierSchema | inventory:create |
| 4   | PUT    | `/:id`                | updateSupplierSchema | inventory:update |
| 5   | DELETE | `/:id`                | —                    | inventory:delete |
| 6   | PATCH  | `/:id/restore`        | —                    | inventory:update |
| 7   | GET    | `/:id/orders`         | —                    | —                |
| 8   | POST   | `/:id/update-metrics` | —                    | inventory:update |

### 4.5 Purchase Orders

| Property      | Value                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/purchase-orders/purchase-orders.route.ts`                                |
| **Lines**     | ~280                                                                                                 |
| **Prefix**    | `/api/purchase-orders`                                                                               |
| **Endpoints** | 7                                                                                                    |
| **Webhooks**  | ✅ 3: `inventory.purchase_order.created`, `inventory.purchase_order.received`, `inventory.restocked` |

| #   | Method | Path           | Zod Schema                      | Role Guard       |
| --- | ------ | -------------- | ------------------------------- | ---------------- |
| 1   | GET    | `/`            | purchaseOrderQuerySchema        | —                |
| 2   | GET    | `/:id`         | —                               | —                |
| 3   | POST   | `/`            | createPurchaseOrderSchema       | inventory:create |
| 4   | PUT    | `/:id`         | updatePurchaseOrderSchema       | inventory:update |
| 5   | PATCH  | `/:id/status`  | purchaseOrderStatusUpdateSchema | inventory:update |
| 6   | POST   | `/:id/receive` | receivePurchaseOrderSchema      | inventory:update |
| 7   | DELETE | `/:id`         | —                               | inventory:delete |

### 4.6 Stock Transfers

| Property      | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/stock-transfers/stock-transfers.route.ts` |
| **Lines**     | ~190                                                                  |
| **Prefix**    | `/api/stock-transfers`                                                |
| **Endpoints** | 4                                                                     |
| **Webhooks**  | ✅ 2: `inventory.transfer.requested`, `inventory.transfer.completed`  |

| #   | Method | Path          | Zod Schema                 | Role Guard       |
| --- | ------ | ------------- | -------------------------- | ---------------- |
| 1   | GET    | `/`           | stockTransferQuerySchema   | —                |
| 2   | GET    | `/:id`        | —                          | —                |
| 3   | POST   | `/`           | createStockTransferSchema  | inventory:create |
| 4   | PATCH  | `/:id/status` | updateTransferStatusSchema | inventory:update |

### 4.7 Stock Counts

| Property      | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/stock-counts/stock-counts.route.ts`              |
| **Lines**     | ~260                                                                         |
| **Prefix**    | `/api/stock-counts`                                                          |
| **Endpoints** | 7                                                                            |
| **Webhooks**  | ✅ 2: `inventory.stock_count.completed`, `inventory.stock_count.discrepancy` |

| #   | Method | Path            | Zod Schema             | Role Guard       |
| --- | ------ | --------------- | ---------------------- | ---------------- |
| 1   | GET    | `/`             | stockCountQuerySchema  | —                |
| 2   | GET    | `/:id`          | —                      | —                |
| 3   | POST   | `/`             | createStockCountSchema | inventory:create |
| 4   | PUT    | `/:id/items`    | updateStockCountSchema | inventory:update |
| 5   | PATCH  | `/:id/complete` | —                      | inventory:update |
| 6   | PATCH  | `/:id/approve`  | applyStockCountSchema  | inventory:update |
| 7   | PATCH  | `/:id/cancel`   | —                      | inventory:update |

### 4.8 Reports (Inventory Section)

| Property      | Value                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------- |
| **File**      | `apps/api/src/tenant/routes/reports/reports.route.ts` (line 509–570)                              |
| **Prefix**    | `/api/reports/inventory/:type`                                                                    |
| **Endpoints** | 1 (parameterized by `:type`, routes to 10 report types)                                           |
| **Gating**    | Module access check via `REPORT_CATALOG.inventory` — free/paid tiering                            |
| **Pipeline**  | Instantiates `InventoryReportPipelineService(tenantDb, tenantId)`, calls `getReport(type, query)` |
| **Fallback**  | Returns empty `{summary, chart, table}` on pipeline failure                                       |

**Total Inventory Endpoints: 55 (from 7 route files) + 1 parameterized report endpoint = 56 unique paths**

---

## 5. server.ts Registration

**File:** `apps/api/src/server.ts`

### Imports (lines 105–111)

```typescript
import { inventoryCategoryRoutes } from './tenant/routes/inventory-categories/inventory-categories.route.js';
import { inventoryItemRoutes } from './tenant/routes/inventory-items/inventory-items.route.js';
import { inventoryStockRoutes } from './tenant/routes/inventory-stock/inventory-stock.route.js';
import { supplierRoutes as inventorySupplierRoutes } from './tenant/routes/suppliers/suppliers.route.js';
import { purchaseOrderRoutes } from './tenant/routes/purchase-orders/purchase-orders.route.js';
import { stockTransferRoutes } from './tenant/routes/stock-transfers/stock-transfers.route.js';
import { stockCountRoutes } from './tenant/routes/stock-counts/stock-counts.route.js';
```

### Registrations (lines 323–329)

| Line | Registration              | Prefix                      |
| ---- | ------------------------- | --------------------------- |
| 323  | `inventoryCategoryRoutes` | `/api/inventory-categories` |
| 324  | `inventoryItemRoutes`     | `/api/inventory-items`      |
| 325  | `inventoryStockRoutes`    | `/api/inventory-stock`      |
| 326  | `inventorySupplierRoutes` | `/api/suppliers`            |
| 327  | `purchaseOrderRoutes`     | `/api/purchase-orders`      |
| 328  | `stockTransferRoutes`     | `/api/stock-transfers`      |
| 329  | `stockCountRoutes`        | `/api/stock-counts`         |

**Status:** All 7 routes imported and registered ✅. Report route (`/api/reports`) is registered separately (pre-existing from earlier phases) and includes the inventory endpoint.

---

## 6. BullMQ Cron Jobs (2/2)

### Queue Configuration

**File:** `apps/api/src/jobs/queue.ts` (~125 lines)

```
QUEUE_NAMES.INVENTORY_EXPIRY = 'inventory-expiry'
QUEUE_NAMES.INVENTORY_AUTO_REORDER = 'inventory-auto-reorder'
```

### Job Startup

**File:** `apps/api/src/jobs/index.ts` (48 lines)

Both `startExpiryCron/Worker` and `startAutoReorderCron/Worker` are imported and started ✅.

### 6.1 Expiry Cron

| Property          | Value                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| **File**          | `apps/api/src/jobs/crons/expiry.cron.ts`                                          |
| **Lines**         | 136                                                                               |
| **Schedule**      | Daily at 02:00                                                                    |
| **Logic**         | Iterates active tenants → calls `stockService.processExpiredBatches()` per tenant |
| **Webhooks**      | ✅ `inventory.expired`, `inventory.expiring_soon`                                 |
| **Notifications** | ✅ In-app alert to `tenant_admin` role for expiring batches (30-day window)       |

### 6.2 Auto-Reorder Cron

| Property           | Value                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**           | `apps/api/src/jobs/crons/auto-reorder.cron.ts`                                                                                                     |
| **Lines**          | 275                                                                                                                                                |
| **Schedule**       | Daily at 08:00                                                                                                                                     |
| **Pre-check**      | Tenant must have `inventory-management` module + `autoReorderEnabled` setting                                                                      |
| **Logic**          | Aggregation finds items where totalAvailable ≤ reorderLevel & reorderQuantity > 0 & defaultSupplierId set → groups by supplier → creates draft POs |
| **Dedup Guard**    | Skips supplier if existing draft PO with "auto-reorder" in notes                                                                                   |
| **Supplier Guard** | Verifies supplier is active before PO creation                                                                                                     |
| **Webhooks**       | ✅ `inventory.low_stock`                                                                                                                           |
| **Notifications**  | ✅ In-app alert to `tenant_admin` with PO count                                                                                                    |
| **Created By**     | `SYSTEM_USER_ID` sentinel                                                                                                                          |

---

## 7. Tests (6/8 — 2 Missing)

All test files use **Vitest** with `vi.mock()` for model stubbing — no live DB (mocked Mongoose).

### Test Coverage Matrix

| #   | Test File                                   | Lines | Suites | Test Cases | Status         |
| --- | ------------------------------------------- | ----- | ------ | ---------- | -------------- |
| 1   | `inventory-item.service.test.ts`            | —     | 7      | 10+        | ✅             |
| 2   | `inventory-stock.service.test.ts`           | —     | 8      | 10+        | ✅             |
| 3   | `supplier.service.test.ts`                  | —     | 6      | 7          | ✅             |
| 4   | `purchase-order.service.test.ts`            | —     | 5      | 7          | ✅             |
| 5   | `stock-transfer.service.test.ts`            | —     | 3      | 5          | ✅             |
| 6   | `stock-count.service.test.ts`               | —     | 5      | 7          | ✅             |
| 7   | `inventory-category.service.test.ts`        | —     | —      | —          | ❌ **MISSING** |
| 8   | `inventory-report-pipeline.service.test.ts` | —     | —      | —          | ❌ **MISSING** |

### Test Detail by Service

**inventory-item.service.test.ts:**

- `list`: paginated items, search filter, lowStock delegation
- `getById`: found, not found (404)
- `create`: category validation
- `update`: standard update
- `softDelete`: blocked by reserved stock, success when no reserved
- `adjustStock`: add with movement, remove with FIFO batch consumption
- `findByBarcode`: found by barcode

**inventory-stock.service.test.ts:**

- `getStockByBranch`: paginated
- `getExpiringBatches`: within days window
- `disposeBatch`: marks expired + creates movement
- `bulkDispose`: multiple disposals
- `reserveStock`: increases reserved quantity
- `unreserveStock`: decreases reserved quantity
- `recalculateStockValue`: FIFO method, weighted average method
- `getStockSummary`: aggregated KPIs
- `processExpiredBatches`: scans all + marks expired

**supplier.service.test.ts:**

- `list`: paginated, text search
- `getById`: found, not found
- `create`: new supplier
- `update`: findByIdAndUpdate
- `softDelete`: blocked by active POs, success when no POs
- `updatePerformanceMetrics`: aggregation pipeline

**purchase-order.service.test.ts:**

- `list`: paginated, filter by status+supplier
- `create`: validates supplier+items
- `update`: draft only, rejects non-draft
- `updateStatus`: valid transition, rejects invalid transition
- `delete`: draft only, rejects non-draft

**stock-transfer.service.test.ts:**

- `list`: paginated, filter by status
- `create`: rejects same branch, validates stock, rejects insufficient stock
- `updateStatus`: rejects invalid transition

**stock-count.service.test.ts:**

- `list`: paginated
- `create`: auto-populates systemQuantity
- `updateItems`: in_progress only, rejects completed
- `complete`: sets completedAt
- `approve`: applies adjustments + movements, rejects double-approve
- `cancel`: in_progress only, rejects completed

---

## 8. Report Pipeline (10/10)

**File:** `apps/api/src/tenant/services/inventory-report-pipeline.service.ts` (1046 lines)

### Architecture

- **Pattern:** Class `InventoryReportPipelineService` with constructor taking `tenantDb` + `tenantId`
- **Caching:** Redis with 5-minute TTL via `getOrSet(key, TTL, generator)` helper
- **Cache Key:** `report:{tenantId}:{reportType}:{hash(filters)}`
- **Models Instantiated:** All 6 (Category, Item, Stock, Movement, Supplier, PurchaseOrder)
- **Dispatcher:** `getReport(type, filters)` switch-case routes to 10 methods

### Report Methods

| #   | Method                          | Report Type              | Aggregation Targets      | Key Metrics                                                      |
| --- | ------------------------------- | ------------------------ | ------------------------ | ---------------------------------------------------------------- |
| D1  | `materialUsage(filters)`        | `material_usage`         | Movement                 | Total consumption, cost, top items by usage                      |
| D2  | `stockValuation(filters)`       | `stock_valuation`        | Stock + Item             | Total value, items by category, valuation breakdown              |
| D3  | `expiryReport(filters)`         | `expiry_report`          | Stock (batches)          | Expired/expiring-soon/safe counts, value at risk                 |
| D4  | `consumptionForecast(filters)`  | `consumption_forecast`   | Movement + Item          | Monthly trend, projected stockout dates, reorder recommendations |
| D5  | `supplierPerformance(filters)`  | `supplier_performance`   | PurchaseOrder + Supplier | On-time rate, avg delivery days, total spend per supplier        |
| D6  | `stockMovementHistory(filters)` | `stock_movement_history` | Movement                 | By type, daily timeline (inbound vs outbound), grand totals      |
| D7  | `poSummary(filters)`            | `po_summary`             | PurchaseOrder            | By status, by supplier, pending vs received amounts              |
| D8  | `lowStock(filters)`             | `low_stock`              | Stock + Item             | Out-of-stock count, critical count, days-to-stockout             |
| D9  | `deadStock(filters)`            | `dead_stock`             | Stock + Item + Movement  | No-movement cutoff (90 days), locked capital value               |
| D10 | `abcAnalysis(filters)`          | `abc_analysis`           | Movement + Item          | ABC classification (A=80%, B=15%, C=5%), cumulative %            |

### Report Catalog Registration

All 10 types are registered in:

- `REPORT_CATALOG.inventory` in `reports.route.ts` ✅
- `report.model.ts` lines 564–662 (all 10 types with `en`/`ar` names and descriptions) ✅
- `InventoryReportType` union in `report.types.ts` (10 types) ✅
- `inventoryTypes` array in `reports.route.ts` helper function (10 types) ✅

### Return Shape (all 10 methods)

```typescript
{
  summary: { /* KPI metrics */ },
  chart: [ /* visualization-ready data points */ ],
  table: [ /* raw detail rows */ ],
}
```

---

## 9. Zod Schemas (Complete)

**File:** `packages/shared/src/schemas/inventory.schema.ts` (~500 lines)

### Exported Schemas (33 total)

| Category           | Schema                                                                                                                                                                                                                                                                                                                                | Type Export |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Enums (12)**     | `inventoryUnitEnum` (12 values), `barcodeTypeEnum` (4), `valuationMethodEnum` (3), `movementTypeEnum` (13), `movementReferenceTypeEnum` (9), `batchStatusEnum` (4), `purchaseOrderStatusEnum` (7), `transferStatusEnum` (4), `stockCountStatusEnum` (4), `stockCountTypeEnum` (3), `qualityCheckEnum` (3), `poAttachmentTypeEnum` (3) | ✅ all      |
| **Category**       | `createInventoryCategorySchema`, `updateInventoryCategorySchema` (partial), `inventoryCategoryQuerySchema`                                                                                                                                                                                                                            | ✅ 3 types  |
| **Item**           | `createInventoryItemSchema`, `updateInventoryItemSchema` (partial), `inventoryItemQuerySchema`, `barcodeSearchSchema`                                                                                                                                                                                                                 | ✅ 4 types  |
| **Stock**          | `stockAdjustmentSchema`, `expiryQuerySchema`, `bulkDisposeSchema`                                                                                                                                                                                                                                                                     | ✅ 3 types  |
| **Supplier**       | `supplierAddressSchema`, `createSupplierSchema`, `updateSupplierSchema` (partial), `supplierQuerySchema`                                                                                                                                                                                                                              | ✅ 3 types  |
| **Purchase Order** | `purchaseOrderItemSchema`, `createPurchaseOrderSchema`, `updatePurchaseOrderSchema`, `purchaseOrderStatusUpdateSchema`, `receivePurchaseOrderItemSchema`, `receivePurchaseOrderSchema`, `purchaseOrderQuerySchema`                                                                                                                    | ✅ 5 types  |
| **Transfer**       | `transferItemSchema`, `createStockTransferSchema`, `updateTransferStatusSchema`, `stockTransferQuerySchema`                                                                                                                                                                                                                           | ✅ 3 types  |
| **Stock Count**    | `stockCountItemSchema`, `createStockCountSchema`, `updateStockCountSchema`, `applyStockCountSchema`, `stockCountQuerySchema`                                                                                                                                                                                                          | ✅ 4 types  |
| **Movement**       | `inventoryMovementQuerySchema`                                                                                                                                                                                                                                                                                                        | ✅ 1 type   |

All schemas use `.strict()` mode. Query schemas use `z.coerce.number()` for pagination. Boolean query params use `z.enum(['true','false']).transform()`.

---

## 10. Cross-Cutting Patterns

### Security

| Pattern                                 | Status | Notes                      |
| --------------------------------------- | ------ | -------------------------- |
| `authGuard` on all routes               | ✅     | JWT verification           |
| `tenantDbMiddleware` on all routes      | ✅     | Tenant DB isolation        |
| `roleGuard('inventory', action)` on CUD | ✅     | RBAC enforcement           |
| Zod `.strict()` validation              | ✅     | Rejects unknown fields     |
| userId in createdBy/updatedBy           | ✅     | All 7 services pass userId |

### Webhooks

| Event                               | Trigger Location                                   |
| ----------------------------------- | -------------------------------------------------- |
| `inventory.item.created`            | inventory-items route (create)                     |
| `inventory.item.updated`            | inventory-items route (update)                     |
| `inventory.out_of_stock`            | inventory-items route (adjust, qty=0)              |
| `inventory.critical_stock`          | inventory-items route (adjust, qty≤min)            |
| `inventory.low_stock`               | inventory-items route (adjust) + auto-reorder cron |
| `inventory.expired`                 | inventory-stock route (dispose) + expiry cron      |
| `inventory.expiring_soon`           | expiry cron                                        |
| `inventory.purchase_order.created`  | purchase-orders route                              |
| `inventory.purchase_order.received` | purchase-orders route                              |
| `inventory.restocked`               | purchase-orders route (receive)                    |
| `inventory.transfer.requested`      | stock-transfers route                              |
| `inventory.transfer.completed`      | stock-transfers route                              |
| `inventory.stock_count.completed`   | stock-counts route                                 |
| `inventory.stock_count.discrepancy` | stock-counts route                                 |

**Total: 14 webhook events**

### Auto-Numbering

| Entity            | Pattern              | Hook         |
| ----------------- | -------------------- | ------------ |
| InventoryItem     | `ITM-{year}-{00001}` | pre-validate |
| PurchaseOrder     | `PO-{year}-{00001}`  | pre-validate |
| StockTransfer     | `TRF-{year}-{00001}` | pre-validate |
| StockCount        | `SC-{year}-{00001}`  | pre-validate |
| InventoryCategory | slug from nameEn     | pre-validate |

---

## 11. Missing / Incomplete Items

### ❌ Missing Test Files (Priority: High)

| #   | Missing File                                | Service Covered                | Methods Untested                                                                                                                                                                 |
| --- | ------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `inventory-category.service.test.ts`        | InventoryCategoryService       | list, getById, create, update, softDelete, restore (6 methods)                                                                                                                   |
| 2   | `inventory-report-pipeline.service.test.ts` | InventoryReportPipelineService | materialUsage, stockValuation, expiryReport, consumptionForecast, supplierPerformance, stockMovementHistory, poSummary, lowStock, deadStock, abcAnalysis, getReport (11 methods) |

### ⚠️ Minor Observations

| #   | Item                                          | Details                                                                                                                                      | Severity |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | No Zod schema for reserve/unreserve           | `inventory-stock.route.ts` endpoints POST `/reserve` and POST `/unreserve` use raw body parsing instead of Zod schemas                       | Low      |
| 2   | No webhook on category CUD                    | `inventory-categories.route.ts` does not dispatch any webhooks on create/update/delete                                                       | Low      |
| 3   | No webhook on supplier CUD                    | `suppliers.route.ts` does not dispatch any webhooks on create/update/delete                                                                  | Low      |
| 4   | `auto-reorder.cron.ts` uses `costPrice` field | Line in aggregation `$project` maps `unitCost: '$costPrice'`, but the model field is `unitCost` — potential bug if `costPrice` doesn't exist | Medium   |

---

## 12. Summary Scorecard

| Metric                     | Value                                    |
| -------------------------- | ---------------------------------------- |
| **Total Models**           | 8                                        |
| **Total Model Fields**     | ~140 (across all 8)                      |
| **Total Model Indexes**    | 31                                       |
| **Total Services**         | 8 (7 CRUD + 1 pipeline)                  |
| **Total Service Methods**  | 68 (57 CRUD + 11 pipeline)               |
| **Total Route Files**      | 7 + 1 report section                     |
| **Total Endpoints**        | 56                                       |
| **Total Webhook Events**   | 14                                       |
| **Total Cron Jobs**        | 2                                        |
| **Total Test Files**       | 6 (of 8 expected)                        |
| **Total Test Suites**      | ~34 `describe` blocks                    |
| **Total Test Cases**       | ~46+ `it` blocks                         |
| **Total Zod Schemas**      | 33 exports                               |
| **Total Zod Enums**        | 12                                       |
| **Report Types**           | 10/10                                    |
| **Pipeline Lines of Code** | 1,046                                    |
| **Overall Completion**     | ~95% (missing 2 test files + minor gaps) |

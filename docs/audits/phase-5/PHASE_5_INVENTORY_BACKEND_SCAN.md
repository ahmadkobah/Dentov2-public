# Phase 5 — Inventory Module Backend: Comprehensive Audit Scan

> **Generated:** 2025-07-14  
> **Scope:** ALL Phase 5 Inventory backend files — models, services, routes, tests, shared schemas  
> **Repository:** `Dentov2` monorepo

---

## Table of Contents

1. [File Inventory](#1-file-inventory)
2. [Models (7 files)](#2-models)
3. [Services (7 files)](#3-services)
4. [Routes (6 files)](#4-routes)
5. [Cron / Workers](#5-cron--workers)
6. [Tests (7 files)](#6-tests)
7. [Shared Schemas](#7-shared-schemas)
8. [Cross-Cutting Patterns](#8-cross-cutting-patterns)
9. [Metrics Summary](#9-metrics-summary)

---

## 1. File Inventory

### Models (7)

| #   | File                                                     | Collection # | Lines |
| --- | -------------------------------------------------------- | ------------ | ----- |
| M1  | `apps/api/src/tenant/models/inventory-category.model.ts` | #53          | ~180  |
| M2  | `apps/api/src/tenant/models/inventory-item.model.ts`     | #54          | ~260  |
| M3  | `apps/api/src/tenant/models/inventory-stock.model.ts`    | #55          | ~200  |
| M4  | `apps/api/src/tenant/models/inventory-movement.model.ts` | #56          | ~170  |
| M5  | `apps/api/src/tenant/models/purchase-order.model.ts`     | #58          | ~280  |
| M6  | `apps/api/src/tenant/models/stock-count.model.ts`        | #60          | ~230  |
| M7  | `apps/api/src/tenant/models/stock-transfer.model.ts`     | #59          | ~190  |

### Services (7)

| #   | File                                                                | Lines |
| --- | ------------------------------------------------------------------- | ----- |
| S1  | `apps/api/src/tenant/services/inventory-category.service.ts`        | ~180  |
| S2  | `apps/api/src/tenant/services/inventory-item.service.ts`            | 393   |
| S3  | `apps/api/src/tenant/services/inventory-stock.service.ts`           | ~480  |
| S4  | `apps/api/src/tenant/services/inventory-report-pipeline.service.ts` | 1043  |
| S5  | `apps/api/src/tenant/services/purchase-order.service.ts`            | ~350  |
| S6  | `apps/api/src/tenant/services/stock-count.service.ts`               | ~300  |
| S7  | `apps/api/src/tenant/services/stock-transfer.service.ts`            | ~320  |

### Routes (6)

| #    | File                                                                            | Prefix                         | Endpoints             |
| ---- | ------------------------------------------------------------------------------- | ------------------------------ | --------------------- |
| R1   | `apps/api/src/tenant/routes/inventory-categories/inventory-categories.route.ts` | `/api/inventory-categories`    | 6                     |
| R2   | `apps/api/src/tenant/routes/inventory-items/inventory-items.route.ts`           | `/api/inventory-items`         | 11                    |
| R3   | `apps/api/src/tenant/routes/inventory-stock/inventory-stock.route.ts`           | `/api/inventory-stock`         | 11                    |
| R4   | `apps/api/src/tenant/routes/purchase-orders/purchase-orders.route.ts`           | `/api/purchase-orders`         | 7                     |
| R5   | `apps/api/src/tenant/routes/stock-counts/stock-counts.route.ts`                 | `/api/stock-counts`            | 7                     |
| R6   | `apps/api/src/tenant/routes/stock-transfers/stock-transfers.route.ts`           | `/api/stock-transfers`         | 4                     |
| R7\* | `apps/api/src/tenant/routes/reports/reports.route.ts` (shared file)             | `/api/reports/inventory/:type` | 1 (D1–D10 dispatcher) |

### Tests (7)

| #   | File                                        | Test Cases |
| --- | ------------------------------------------- | ---------- |
| T1  | `inventory-category.service.test.ts`        | 10         |
| T2  | `inventory-item.service.test.ts`            | 10         |
| T3  | `inventory-stock.service.test.ts`           | 10         |
| T4  | `inventory-report-pipeline.service.test.ts` | 13         |
| T5  | `purchase-order.service.test.ts`            | 8          |
| T6  | `stock-count.service.test.ts`               | 9          |
| T7  | `stock-transfer.service.test.ts`            | 7          |

### Shared Schema

| File                                              | Exports                                 |
| ------------------------------------------------- | --------------------------------------- |
| `packages/shared/src/schemas/inventory.schema.ts` | 12 enums, 22 schemas, 25 inferred types |

---

## 2. Models

### M1 — `InventoryCategory` (Collection #53)

**Interface:** `IInventoryCategory`

| Field         | Type                           | Required | Default | Constraints     |
| ------------- | ------------------------------ | -------- | ------- | --------------- |
| `nameEn`      | String                         | ✅       | —       | trim            |
| `nameAr`      | String                         | —        | `''`    | trim            |
| `slug`        | String                         | ✅       | —       | trim, lowercase |
| `parentId`    | ObjectId → `InventoryCategory` | —        | `null`  | —               |
| `description` | String                         | —        | `''`    | —               |
| `icon`        | String                         | —        | `''`    | —               |
| `sortOrder`   | Number                         | —        | `0`     | min: 0          |
| `isActive`    | Boolean                        | —        | `true`  | —               |
| `createdBy`   | ObjectId → `User`              | —        | `null`  | —               |
| `updatedBy`   | ObjectId → `User`              | —        | `null`  | —               |

**Timestamps:** `{ timestamps: true }`

**Indexes:**
| Fields | Options |
|--------|---------|
| `{ slug: 1 }` | `unique: true` |
| `{ parentId: 1 }` | — |
| `{ isActive: 1, sortOrder: 1 }` | — |

**Hooks:**

- `pre('validate')` — Auto-generates `slug` from `nameEn` via slugify if slug is empty.

**Exports:** `getInventoryCategoryModel(connection)`, `InventoryCategoryModel` type, `INVENTORY_CATEGORY_SEEDS` (10 dental categories).

**Seeds (10):** Restorative Materials, Endodontic Supplies, Prosthodontic Materials, Orthodontic Supplies, Surgical Instruments, Infection Control, Diagnostic Tools, Anesthetics, Dental Cements, Impression Materials.

---

### M2 — `InventoryItem` (Collection #54)

**Interface:** `IInventoryItem`

**Custom Types:**

- `InventoryUnit` = `'piece'|'box'|'pack'|'bottle'|'tube'|'ml'|'liter'|'gram'|'kg'|'unit'|'syringe'|'capsule'`
- `BarcodeType` = `'ean13'|'code128'|'qr'|'datamatrix'`

| Field                  | Type                           | Required | Default   | Constraints              |
| ---------------------- | ------------------------------ | -------- | --------- | ------------------------ |
| `sku`                  | String                         | ✅       | —         | trim                     |
| `nameEn`               | String                         | ✅       | —         | trim                     |
| `nameAr`               | String                         | —        | `''`      | —                        |
| `categoryId`           | ObjectId → `InventoryCategory` | ✅       | —         | —                        |
| `description`          | String                         | —        | `''`      | —                        |
| `unit`                 | String                         | —        | `'piece'` | enum: InventoryUnit      |
| `unitsPerPackage`      | Number                         | —        | `1`       | min: 1                   |
| `unitCost`             | Number                         | —        | `0`       | min: 0                   |
| `sellingPrice`         | Number                         | —        | `0`       | min: 0                   |
| `marginPercent`        | Number                         | —        | `0`       | min: 0, max: 100         |
| `reorderLevel`         | Number                         | —        | `10`      | min: 0                   |
| `reorderQuantity`      | Number                         | —        | `50`      | min: 1                   |
| `minStockLevel`        | Number                         | —        | `0`       | min: 0                   |
| `maxStockLevel`        | Number                         | —        | `0`       | min: 0                   |
| `isConsumable`         | Boolean                        | —        | `true`    | —                        |
| `requiresPrescription` | Boolean                        | —        | `false`   | —                        |
| `imageUrl`             | String                         | —        | `''`      | —                        |
| `barcode`              | String                         | —        | `''`      | —                        |
| `barcodeType`          | String                         | —        | `null`    | enum: BarcodeType ∪ null |
| `manufacturer`         | String                         | —        | `''`      | —                        |
| `manufacturerRef`      | String                         | —        | `''`      | —                        |
| `defaultSupplierId`    | ObjectId → `Supplier`          | —        | `null`    | —                        |
| `totalConsumed`        | Number                         | —        | `0`       | —                        |
| `avgMonthlyUsage`      | Number                         | —        | `0`       | —                        |
| `lastPurchaseDate`     | Date                           | —        | `null`    | —                        |
| `lastPurchasePrice`    | Number                         | —        | `0`       | —                        |
| `isActive`             | Boolean                        | —        | `true`    | —                        |
| `createdBy`            | ObjectId → `User`              | —        | `null`    | —                        |
| `updatedBy`            | ObjectId → `User`              | —        | `null`    | —                        |

**Timestamps:** `{ timestamps: true }`

**Indexes:**
| Fields | Options |
|--------|---------|
| `{ sku: 1 }` | `unique: true` |
| `{ categoryId: 1 }` | — |
| `{ barcode: 1 }` | `unique: true, sparse: true, partialFilterExpression: { barcode: { $ne: '' } }` |
| `{ isActive: 1, nameEn: 1 }` | — |
| `{ defaultSupplierId: 1 }` | — |
| `{ nameEn: 'text', nameAr: 'text', sku: 'text' }` | `name: 'inventory_item_search'` |

**Hooks:**

- `pre('validate')` — Auto-generates `sku` as `ITM-{YYYY}-{00001}` when doc is new and sku is empty.

**Exports:** `getInventoryItemModel(connection)`, `InventoryItemModel` type.

---

### M3 — `InventoryStock` (Collection #55)

**Interface:** `IInventoryStock`

**Custom Types:**

- `BatchStatus` = `'active'|'expired'|'recalled'|'quarantine'`
- `ValuationMethod` = `'fifo'|'weighted_average'|'last_purchase'`
- `CountResult` = `'match'|'surplus'|'deficit'`

**Sub-schema `IStockBatch`:**

| Field             | Type                       | Required | Default    |
| ----------------- | -------------------------- | -------- | ---------- |
| `batchNumber`     | String                     | ✅       | —          |
| `lotNumber`       | String                     | —        | `''`       |
| `expiryDate`      | Date                       | —        | —          |
| `quantity`        | Number                     | ✅       | —          |
| `receivedDate`    | Date                       | —        | `Date.now` |
| `purchaseOrderId` | ObjectId → `PurchaseOrder` | —        | `null`     |
| `unitCost`        | Number                     | —        | `0`        |
| `status`          | String                     | —        | `'active'` |

**Main Schema Fields:**

| Field               | Type                       | Required | Default              | Constraints           |
| ------------------- | -------------------------- | -------- | -------------------- | --------------------- |
| `itemId`            | ObjectId → `InventoryItem` | ✅       | —                    | —                     |
| `branchId`          | ObjectId → `Branch`        | ✅       | —                    | —                     |
| `quantity`          | Number                     | —        | `0`                  | min: 0                |
| `reservedQuantity`  | Number                     | —        | `0`                  | min: 0                |
| `availableQuantity` | Number                     | —        | `0`                  | min: 0                |
| `batches`           | [StockBatch]               | —        | `[]`                 | —                     |
| `stockValue`        | Number                     | —        | `0`                  | —                     |
| `valuationMethod`   | String                     | —        | `'weighted_average'` | enum: ValuationMethod |
| `weightedAvgCost`   | Number                     | —        | `0`                  | —                     |
| `lastCountedAt`     | Date                       | —        | —                    | —                     |
| `lastCountedBy`     | ObjectId → `User`          | —        | —                    | —                     |
| `lastCountResult`   | String                     | —        | —                    | enum: CountResult     |
| `countDiscrepancy`  | Number                     | —        | —                    | —                     |

**Timestamps:** `{ timestamps: true }`

**Indexes:**
| Fields | Options |
|--------|---------|
| `{ itemId: 1, branchId: 1 }` | `unique: true` |
| `{ 'batches.expiryDate': 1 }` | — |
| `{ availableQuantity: 1 }` | — |

**Hooks:**

- `pre('save')` — `availableQuantity = Math.max(0, quantity - reservedQuantity)`

**Exports:** `getInventoryStockModel(connection)`, `InventoryStockModel` type.

---

### M4 — `InventoryMovement` (Collection #56)

**Interface:** `IInventoryMovement`

**Custom Types:**

- `MovementType` (13 values): `'purchase'|'sale'|'adjustment_add'|'adjustment_remove'|'transfer_in'|'transfer_out'|'expired'|'damaged'|'return_supplier'|'return_patient'|'consumed'|'reserved'|'unreserved'`
- `MovementReferenceType` (9 values): `'invoice'|'purchase_order'|'transfer'|'procedure_note'|'treatment_plan'|'appointment'|'manual'|'stock_count'|'expiry_check'`

| Field              | Type                       | Required | Default | Constraints                        |
| ------------------ | -------------------------- | -------- | ------- | ---------------------------------- |
| `itemId`           | ObjectId → `InventoryItem` | ✅       | —       | —                                  |
| `branchId`         | ObjectId → `Branch`        | ✅       | —       | —                                  |
| `movementType`     | String                     | ✅       | —       | enum: MovementType                 |
| `quantity`         | Number                     | ✅       | —       | min: 0                             |
| `previousQuantity` | Number                     | ✅       | —       | min: 0                             |
| `newQuantity`      | Number                     | ✅       | —       | min: 0                             |
| `unitCost`         | Number                     | —        | `0`     | —                                  |
| `totalCost`        | Number                     | —        | `0`     | —                                  |
| `referenceType`    | String                     | —        | `null`  | enum: MovementReferenceType ∪ null |
| `referenceId`      | ObjectId                   | —        | —       | —                                  |
| `batchNumber`      | String                     | —        | —       | —                                  |
| `lotNumber`        | String                     | —        | —       | —                                  |
| `expiryDate`       | Date                       | —        | —       | —                                  |
| `transferId`       | ObjectId → `StockTransfer` | —        | —       | —                                  |
| `fromBranchId`     | ObjectId → `Branch`        | —        | —       | —                                  |
| `toBranchId`       | ObjectId → `Branch`        | —        | —       | —                                  |
| `notes`            | String                     | —        | `''`    | —                                  |
| `createdBy`        | ObjectId → `User`          | ✅       | —       | —                                  |

**Timestamps:** `{ timestamps: { createdAt: true, updatedAt: false } }` — **Immutable audit log**

**Indexes:**
| Fields | Options |
|--------|---------|
| `{ itemId: 1, createdAt: -1 }` | — |
| `{ branchId: 1, createdAt: -1 }` | — |
| `{ branchId: 1, movementType: 1 }` | — |
| `{ referenceType: 1, referenceId: 1 }` | — |
| `{ transferId: 1 }` | — |
| `{ createdAt: -1 }` | — |

**Hooks:**

- `pre('validate')` — `totalCost = quantity * unitCost` when doc `isNew`

**Exports:** `getInventoryMovementModel(connection)`, `InventoryMovementModel` type.

---

### M5 — `PurchaseOrder` (Collection #58)

**Interface:** `IPurchaseOrder`

**Custom Types:**

- `PurchaseOrderStatus` (7 values): `'draft'|'submitted'|'confirmed'|'shipped'|'partially_received'|'received'|'cancelled'`
- `QualityCheck` = `'passed'|'partial'|'failed'`
- `POAttachmentType` = `'invoice'|'delivery_note'|'certificate'`

**Sub-schema `purchaseOrderItemSchema`:**

| Field              | Type                       | Required | Default |
| ------------------ | -------------------------- | -------- | ------- |
| `itemId`           | ObjectId → `InventoryItem` | ✅       | —       |
| `quantity`         | Number                     | ✅       | min: 1  |
| `unitCost`         | Number                     | ✅       | min: 0  |
| `totalCost`        | Number                     | —        | `0`     |
| `receivedQuantity` | Number                     | —        | `0`     |
| `batchNumber`      | String                     | —        | `''`    |
| `expiryDate`       | Date                       | —        | —       |
| `notes`            | String                     | —        | `''`    |

**Sub-schema `purchaseOrderAttachmentSchema`:**

| Field        | Type             |
| ------------ | ---------------- |
| `name`       | String           |
| `url`        | String           |
| `type`       | POAttachmentType |
| `uploadedAt` | Date             |

**Main Schema Fields:**

| Field            | Type                  | Required | Default    | Constraints                   |
| ---------------- | --------------------- | -------- | ---------- | ----------------------------- |
| `orderNumber`    | String                | ✅       | —          | unique                        |
| `supplierId`     | ObjectId → `Supplier` | ✅       | —          | —                             |
| `branchId`       | ObjectId → `Branch`   | ✅       | —          | —                             |
| `status`         | String                | —        | `'draft'`  | enum: PurchaseOrderStatus (7) |
| `orderDate`      | Date                  | —        | `Date.now` | —                             |
| `expectedDate`   | Date                  | —        | —          | —                             |
| `receivedDate`   | Date                  | —        | —          | —                             |
| `items`          | [purchaseOrderItem]   | —        | `[]`       | —                             |
| `subtotal`       | Number                | —        | `0`        | —                             |
| `taxPercent`     | Number                | —        | `0`        | —                             |
| `taxAmount`      | Number                | —        | `0`        | —                             |
| `discount`       | Number                | —        | `0`        | —                             |
| `total`          | Number                | —        | `0`        | —                             |
| `receivingNotes` | String                | —        | `''`       | —                             |
| `notes`          | String                | —        | `''`       | —                             |
| `receivedBy`     | ObjectId → `User`     | —        | —          | —                             |
| `qualityCheck`   | String                | —        | —          | enum: QualityCheck            |
| `attachments`    | [attachment]          | —        | `[]`       | —                             |
| `createdBy`      | ObjectId → `User`     | ✅       | —          | —                             |
| `updatedBy`      | ObjectId → `User`     | —        | —          | —                             |

**Timestamps:** `{ timestamps: true }`

**Indexes:**
| Fields | Options |
|--------|---------|
| `{ orderNumber: 1 }` | `unique: true` |
| `{ supplierId: 1, status: 1 }` | — |
| `{ status: 1, expectedDate: 1 }` | — |
| `{ branchId: 1, status: 1, createdAt: -1 }` | — |

**Hooks:**

- `pre('validate')` — Auto-generates `orderNumber` as `PO-{YYYY}-{00001}` when doc is new.
- `pre('save')` — Computes per-item `totalCost`, then `subtotal`, `taxAmount`, `total` (with discount).

**Exports:** `getPurchaseOrderModel(connection)`, `PurchaseOrderModel` type.

---

### M6 — `StockCount` (Collection #60)

**Interface:** `IStockCount`

**Custom Types:**

- `StockCountStatus` = `'in_progress'|'completed'|'approved'|'cancelled'`
- `StockCountType` = `'full'|'partial'|'spot_check'`

**Sub-schema `stockCountItemSchema`:**

| Field               | Type                       | Default |
| ------------------- | -------------------------- | ------- |
| `itemId`            | ObjectId → `InventoryItem` | —       |
| `systemQuantity`    | Number                     | `0`     |
| `countedQuantity`   | Number                     | `0`     |
| `discrepancy`       | Number                     | `0`     |
| `notes`             | String                     | `''`    |
| `adjustmentApplied` | Boolean                    | `false` |

**Sub-schema `stockCountSummarySchema`:**

| Field                   | Type   | Default |
| ----------------------- | ------ | ------- |
| `totalItems`            | Number | `0`     |
| `matchCount`            | Number | `0`     |
| `surplusCount`          | Number | `0`     |
| `deficitCount`          | Number | `0`     |
| `totalDiscrepancyValue` | Number | `0`     |

**Main Schema Fields:**

| Field         | Type                | Required | Default         | Constraints            |
| ------------- | ------------------- | -------- | --------------- | ---------------------- |
| `countNumber` | String              | ✅       | —               | unique                 |
| `branchId`    | ObjectId → `Branch` | ✅       | —               | —                      |
| `status`      | String              | —        | `'in_progress'` | enum: StockCountStatus |
| `countType`   | String              | —        | `'full'`        | enum: StockCountType   |
| `items`       | [stockCountItem]    | —        | `[]`            | —                      |
| `startedAt`   | Date                | —        | `Date.now`      | —                      |
| `completedAt` | Date                | —        | —               | —                      |
| `countedBy`   | ObjectId → `User`   | ✅       | —               | —                      |
| `approvedBy`  | ObjectId → `User`   | —        | —               | —                      |
| `summary`     | stockCountSummary   | —        | `{}`            | —                      |
| `notes`       | String              | —        | `''`            | —                      |

**Timestamps:** `{ timestamps: true }`

**Indexes:**
| Fields | Options |
|--------|---------|
| `{ countNumber: 1 }` | `unique: true` |
| `{ branchId: 1, status: 1 }` | — |
| `{ branchId: 1, createdAt: -1 }` | — |

**Hooks:**

- `pre('validate')` — Auto-generates `countNumber` as `SC-{YYYY}-{00001}` when doc is new.
- `pre('save')` — Computes per-item `discrepancy = countedQuantity - systemQuantity`, then aggregates `summary` (totalItems, matchCount, surplusCount, deficitCount).

**Exports:** `getStockCountModel(connection)`, `StockCountModel` type.

---

### M7 — `StockTransfer` (Collection #59)

**Interface:** `IStockTransfer`

**Custom Types:**

- `TransferStatus` = `'draft'|'in_transit'|'received'|'cancelled'`

**Sub-schema `transferItemSchema`:**

| Field         | Type                       | Default |
| ------------- | -------------------------- | ------- |
| `itemId`      | ObjectId → `InventoryItem` | —       |
| `quantity`    | Number                     | min: 1  |
| `batchNumber` | String                     | `''`    |
| `notes`       | String                     | `''`    |

**Main Schema Fields:**

| Field            | Type                | Required | Default    | Constraints          |
| ---------------- | ------------------- | -------- | ---------- | -------------------- |
| `transferNumber` | String              | ✅       | —          | unique               |
| `fromBranchId`   | ObjectId → `Branch` | ✅       | —          | —                    |
| `toBranchId`     | ObjectId → `Branch` | ✅       | —          | —                    |
| `status`         | String              | —        | `'draft'`  | enum: TransferStatus |
| `items`          | [transferItem]      | —        | `[]`       | —                    |
| `requestedBy`    | ObjectId → `User`   | ✅       | —          | —                    |
| `approvedBy`     | ObjectId → `User`   | —        | —          | —                    |
| `receivedBy`     | ObjectId → `User`   | —        | —          | —                    |
| `requestedAt`    | Date                | —        | `Date.now` | —                    |
| `approvedAt`     | Date                | —        | —          | —                    |
| `shippedAt`      | Date                | —        | —          | —                    |
| `receivedAt`     | Date                | —        | —          | —                    |
| `notes`          | String              | —        | `''`       | —                    |

**Timestamps:** `{ timestamps: true }`

**Indexes:**
| Fields | Options |
|--------|---------|
| `{ transferNumber: 1 }` | `unique: true` |
| `{ fromBranchId: 1, status: 1 }` | — |
| `{ toBranchId: 1, status: 1 }` | — |

**Hooks:**

- `pre('validate')` — Auto-generates `transferNumber` as `TRF-{YYYY}-{00001}` when doc is new.

**Exports:** `getStockTransferModel(connection)`, `StockTransferModel` type.

---

## 3. Services

### S1 — `InventoryCategoryService`

**Constructor:** `(connection: Connection)`

| Method       | Signature                                                                               | Description                                                        |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `list`       | `(query: InventoryCategoryQuery) → { items, meta }`                                     | Paginated list with search/parentId/isActive filters               |
| `getById`    | `(id: string) → IInventoryCategory`                                                     | Get by ID with parent populate; throws `ApiError(404)`             |
| `create`     | `(data: CreateInventoryCategoryInput, userId: string) → IInventoryCategory`             | Validates parentId if provided; sets `createdBy`                   |
| `update`     | `(id: string, data: UpdateInventoryCategoryInput, userId: string) → IInventoryCategory` | Self-referencing parentId guard; sets `updatedBy`                  |
| `softDelete` | `(id: string, userId: string) → IInventoryCategory`                                     | Blocks if active items reference category; sets `isActive = false` |
| `restore`    | `(id: string, userId: string) → IInventoryCategory`                                     | Sets `isActive = true`                                             |

---

### S2 — `InventoryItemService` (393 lines)

**Constructor:** `(connection: Connection)`

| Method               | Signature                                             | Description                                                                                                     |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `list`               | `(query: InventoryItemQuery) → { items, meta }`       | Delegates to `getLowStockItems` when `lowStock=true`; text search, category/isActive/isConsumable filters       |
| `getById`            | `(id: string) → IInventoryItem`                       | Double populate (category + supplier)                                                                           |
| `create`             | `(data, userId) → IInventoryItem`                     | Validates categoryId & supplierId existence                                                                     |
| `update`             | `(id, data, userId) → IInventoryItem`                 | Same validations as create                                                                                      |
| `softDelete`         | `(id, userId) → IInventoryItem`                       | Blocks if item has `reservedQuantity > 0` in any stock record                                                   |
| `restore`            | `(id, userId) → IInventoryItem`                       | Sets `isActive = true`                                                                                          |
| `getStockLevels`     | `(itemId: string) → IInventoryStock[]`                | Returns stock across all branches                                                                               |
| `adjustStock`        | `(itemId, data: StockAdjustmentInput, userId) → void` | **FIFO batch consumption** for `adjustment_remove`; creates batch for `adjustment_add`; creates movement record |
| `getLowStockItems`   | `(query?) → { items, meta }`                          | Aggregation pipeline: `$lookup` stock → `$match` `availableQuantity < reorderLevel`                             |
| `findByBarcode`      | `(data: BarcodeSearch) → IInventoryItem`              | `findOne({ barcode, isActive: true })`                                                                          |
| `getMovementHistory` | `(itemId, query) → { items, meta }`                   | Paginated movements for item, sorted `createdAt desc`                                                           |

**FIFO Logic (adjustStock — `adjustment_remove`):**

1. Sort active batches by `receivedDate` ascending
2. Consume oldest batch first, decrement `batch.quantity`
3. Remove fully consumed batches (qty → 0)
4. Continue to next batch until requested qty is fulfilled
5. Update `stock.quantity`, save stock, create `InventoryMovement`

---

### S3 — `InventoryStockService` (~480 lines)

**Constructor:** `(connection: Connection)`

**Constant:** `SYSTEM_USER_ID = new Types.ObjectId('000000000000000000000000')` — for cron-originated operations.

| Method                  | Signature                                                        | Description                                                                                             |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `getStockByBranch`      | `(branchId, query) → { items, meta }`                            | Paginated with item populate                                                                            |
| `getStockForItem`       | `(itemId) → IInventoryStock[]`                                   | All branches for an item                                                                                |
| `getExpiringBatches`    | `(query: ExpiryQuery) → batches[]`                               | Aggregation: `$unwind batches` → filter `expiryDate ≤ today + daysAhead`                                |
| `disposeBatch`          | `(stockId, batchNumber, userId) → { disposedQuantity }`          | Sets `batch.status = 'expired'`, `quantity → 0`; creates `expired` movement                             |
| `bulkDispose`           | `(data: BulkDisposeInput, userId) → { disposed, failed, total }` | Iterates `disposeBatch` per item; catches individual failures                                           |
| `reserveStock`          | `(itemId, branchId, quantity, userId) → void`                    | Increments `reservedQuantity`; creates `reserved` movement                                              |
| `unreserveStock`        | `(itemId, branchId, quantity, userId) → void`                    | Decrements `reservedQuantity`; creates `unreserved` movement                                            |
| `recalculateStockValue` | `(stockId) → { stockValue, valuationMethod }`                    | FIFO: `Σ(batch.quantity × batch.unitCost)`. WAC: total/qty × qty. LastPurchase: qty × latest batch cost |
| `getStockSummary`       | `(branchId) → KPIs`                                              | Aggregation: totalItems, totalQuantity, totalReserved, totalAvailable, totalValue                       |
| `getExpiryDashboard`    | `(branchId) → buckets`                                           | 30/60/90 day expiry buckets                                                                             |
| `processExpiredBatches` | `() → { processedCount }`                                        | **Cron target**: scans ALL stock, marks expired active batches, creates movements with `SYSTEM_USER_ID` |
| `getStockReport`        | `(branchId, dateRange) → report`                                 | Movement aggregation over date range                                                                    |

---

### S4 — `InventoryReportPipelineService` (1043 lines)

**Constructor:** `(tenantDb: Connection, tenantId: string)` — instantiates all inventory models.

**Caching:** Redis with `getRedis()` — key = `inv-report:{tenantId}:{reportType}:{JSON.stringify(filters)}`, TTL = 300s (5 min).

| Report | Method                          | Pipeline Source               | Description                                                            |
| ------ | ------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| D1     | `materialUsage(filters)`        | `InventoryMovement.aggregate` | Consumed quantities/costs by item                                      |
| D2     | `stockValuation(filters)`       | `InventoryStock.aggregate`    | Value by category (FIFO)                                               |
| D3     | `expiryReport(filters)`         | `InventoryStock.aggregate`    | Expiry buckets: expired, 30d, 60d, 90d                                 |
| D4     | `consumptionForecast(filters)`  | `InventoryMovement.aggregate` | avgMonthlyUsage → monthsUntilDepletion                                 |
| D5     | `supplierPerformance(filters)`  | `PurchaseOrder.aggregate`     | On-time %, total spend per supplier                                    |
| D6     | `stockMovementHistory(filters)` | `InventoryMovement.aggregate` | Inbound vs outbound timeline                                           |
| D7     | `poSummary(filters)`            | `PurchaseOrder.aggregate`     | PO count/amount grouped by status                                      |
| D8     | `lowStock(filters)`             | `InventoryStock.aggregate`    | Items at/below reorder level                                           |
| D9     | `deadStock(filters)`            | `InventoryItem.aggregate`     | Items with no movements in 90+ days                                    |
| D10    | `abcAnalysis(filters)`          | `InventoryMovement.aggregate` | ABC classification by value                                            |
| —      | `getReport(type, filters)`      | Dispatcher                    | Routes `type` string → report method; returns `null` for unknown types |

**Each report returns:** `{ summary: {...}, chart: [...], table: [...] }`

---

### S5 — `PurchaseOrderService`

**Constructor:** `(connection: Connection)`

**Status FSM — `STATUS_TRANSITIONS` map:**

```
draft       → [submitted, cancelled]
submitted   → [confirmed, cancelled]
confirmed   → [shipped, cancelled]
shipped     → [partially_received, received, cancelled]
partially_received → [received, cancelled]
received    → [] (terminal)
cancelled   → [] (terminal)
```

| Method         | Signature                                                        | Description                                                                                                                                    |
| -------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`         | `(query) → { items, meta }`                                      | Filters: status, supplierId, branchId, dateFrom/dateTo                                                                                         |
| `getById`      | `(id) → IPurchaseOrder`                                          | Double populate (supplier + items.itemId)                                                                                                      |
| `create`       | `(data, userId) → IPurchaseOrder`                                | Validates supplier + all item IDs exist                                                                                                        |
| `update`       | `(id, data, userId) → IPurchaseOrder`                            | **Draft-only** — throws if `status ≠ 'draft'`                                                                                                  |
| `updateStatus` | `(id, data, userId) → IPurchaseOrder`                            | Enforces `STATUS_TRANSITIONS` FSM                                                                                                              |
| `receive`      | `(id, data: ReceivePurchaseOrderInput, userId) → IPurchaseOrder` | Creates stock batches, creates `purchase` movements, updates item `lastPurchaseDate/Price`, auto-determines `partially_received` vs `received` |
| `delete`       | `(id) → void`                                                    | **Draft-only**                                                                                                                                 |

---

### S6 — `StockCountService`

**Constructor:** `(connection: Connection)`

| Method        | Signature                                                | Description                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`        | `(query) → { items, meta }`                              | Filters: status, branchId, countType                                                                                                                                                           |
| `getById`     | `(id) → IStockCount`                                     | Populates items.itemId                                                                                                                                                                         |
| `create`      | `(data, userId) → IStockCount`                           | Auto-populates `systemQuantity` from current stock per branch                                                                                                                                  |
| `updateItems` | `(id, data, userId) → IStockCount`                       | **`in_progress` only** — rejects other statuses                                                                                                                                                |
| `complete`    | `(id, userId) → IStockCount`                             | Sets `status = 'completed'`, `completedAt`                                                                                                                                                     |
| `approve`     | `(id, data: ApplyStockCountInput, userId) → IStockCount` | **Applies stock adjustments**: creates movements for selected items, updates stock `lastCountedAt/By/Result`, computes `totalDiscrepancyValue` using `item.unitCost`; **Double-approve guard** |
| `cancel`      | `(id, userId) → IStockCount`                             | **`in_progress` only**                                                                                                                                                                         |

---

### S7 — `StockTransferService`

**Constructor:** `(connection: Connection)`

| Method         | Signature                         | Description                                                                  |
| -------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| `list`         | `(query) → { items, meta }`       | Filters: status, fromBranchId, toBranchId                                    |
| `getById`      | `(id) → IStockTransfer`           | Populates from/to branch + items.itemId                                      |
| `create`       | `(data, userId) → IStockTransfer` | **Same-branch guard**, validates available stock, reserves stock on creation |
| `updateStatus` | `(id, data: { action }, userId)`  | Dispatches to `approveTransfer` / `receiveTransfer` / `cancelTransfer`       |

**Private Methods:**

| Method                         | Description                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `approveTransfer(doc, userId)` | Sets `status = 'in_transit'`, `approvedBy`, `approvedAt`, `shippedAt`                                                          |
| `receiveTransfer(doc, userId)` | Creates 2 movements per item: `transfer_out` (from) + `transfer_in` (to); updates stock quantities; sets `status = 'received'` |
| `cancelTransfer(doc, userId)`  | Releases reserved stock (unreserves); sets `status = 'cancelled'`                                                              |

---

## 4. Routes

### R1 — Inventory Categories (`/api/inventory-categories`)

| Method | Path           | Auth                 | Role                              | Schema                          | Webhook | Description    |
| ------ | -------------- | -------------------- | --------------------------------- | ------------------------------- | ------- | -------------- |
| GET    | `/`            | authGuard + tenantDb | —                                 | `inventoryCategoryQuerySchema`  | —       | List paginated |
| GET    | `/:id`         | authGuard + tenantDb | —                                 | —                               | —       | Get by ID      |
| POST   | `/`            | authGuard + tenantDb | `roleGuard('inventory','create')` | `createInventoryCategorySchema` | —       | Create         |
| PUT    | `/:id`         | authGuard + tenantDb | `roleGuard('inventory','update')` | `updateInventoryCategorySchema` | —       | Update         |
| DELETE | `/:id`         | authGuard + tenantDb | `roleGuard('inventory','delete')` | —                               | —       | Soft delete    |
| PATCH  | `/:id/restore` | authGuard + tenantDb | `roleGuard('inventory','update')` | —                               | —       | Restore        |

**Total: 6 endpoints**

---

### R2 — Inventory Items (`/api/inventory-items`)

| Method | Path                | Auth                 | Role                              | Schema                         | Webhook                                                                       | Description                         |
| ------ | ------------------- | -------------------- | --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------- |
| GET    | `/`                 | authGuard + tenantDb | —                                 | `inventoryItemQuerySchema`     | —                                                                             | List paginated                      |
| GET    | `/low-stock`        | authGuard + tenantDb | —                                 | —                              | —                                                                             | Low-stock items                     |
| GET    | `/:id`              | authGuard + tenantDb | —                                 | —                              | —                                                                             | Get by ID                           |
| POST   | `/`                 | authGuard + tenantDb | `roleGuard('inventory','create')` | `createInventoryItemSchema`    | `inventory.item.created`                                                      | Create                              |
| PUT    | `/:id`              | authGuard + tenantDb | `roleGuard('inventory','update')` | `updateInventoryItemSchema`    | `inventory.item.updated`                                                      | Update                              |
| DELETE | `/:id`              | authGuard + tenantDb | `roleGuard('inventory','delete')` | —                              | —                                                                             | Soft delete                         |
| PATCH  | `/:id/restore`      | authGuard + tenantDb | `roleGuard('inventory','update')` | —                              | —                                                                             | Restore                             |
| GET    | `/:id/stock`        | authGuard + tenantDb | —                                 | —                              | —                                                                             | Stock levels by branch              |
| POST   | `/:id/stock/adjust` | authGuard + tenantDb | `roleGuard('inventory','update')` | `stockAdjustmentSchema`        | `inventory.out_of_stock` / `inventory.critical_stock` / `inventory.low_stock` | Adjust stock (conditional webhooks) |
| POST   | `/barcode/search`   | authGuard + tenantDb | —                                 | `barcodeSearchSchema`          | —                                                                             | Barcode lookup                      |
| GET    | `/:id/movements`    | authGuard + tenantDb | —                                 | `inventoryMovementQuerySchema` | —                                                                             | Movement history                    |

**Total: 11 endpoints**

---

### R3 — Inventory Stock (`/api/inventory-stock`)

| Method | Path                                 | Auth                 | Role                              | Schema              | Webhook             | Description                    |
| ------ | ------------------------------------ | -------------------- | --------------------------------- | ------------------- | ------------------- | ------------------------------ |
| GET    | `/branch/:branchId`                  | authGuard + tenantDb | —                                 | —                   | —                   | Stock by branch (paginated)    |
| GET    | `/item/:itemId`                      | authGuard + tenantDb | —                                 | —                   | —                   | Stock for item across branches |
| GET    | `/branch/:branchId/summary`          | authGuard + tenantDb | —                                 | —                   | —                   | Branch KPI summary             |
| GET    | `/branch/:branchId/expiry-dashboard` | authGuard + tenantDb | —                                 | —                   | —                   | Expiry dashboard (30/60/90d)   |
| GET    | `/expiring`                          | authGuard + tenantDb | —                                 | `expiryQuerySchema` | —                   | Expiring batches               |
| POST   | `/:stockId/dispose/:batchNumber`     | authGuard + tenantDb | `roleGuard('inventory','update')` | —                   | `inventory.expired` | Dispose single batch           |
| POST   | `/bulk-dispose`                      | authGuard + tenantDb | `roleGuard('inventory','update')` | `bulkDisposeSchema` | —                   | Bulk dispose                   |
| POST   | `/reserve`                           | authGuard + tenantDb | `roleGuard('inventory','update')` | —                   | —                   | Reserve stock                  |
| POST   | `/unreserve`                         | authGuard + tenantDb | `roleGuard('inventory','update')` | —                   | —                   | Unreserve stock                |
| POST   | `/:stockId/recalculate`              | authGuard + tenantDb | `roleGuard('inventory','update')` | —                   | —                   | Recalculate stock value        |
| GET    | `/branch/:branchId/report`           | authGuard + tenantDb | `roleGuard('inventory','read')`   | —                   | —                   | Stock report (date range)      |

**Total: 11 endpoints**

---

### R4 — Purchase Orders (`/api/purchase-orders`)

| Method | Path           | Auth                 | Role                              | Schema                            | Webhook                                                     | Description           |
| ------ | -------------- | -------------------- | --------------------------------- | --------------------------------- | ----------------------------------------------------------- | --------------------- |
| GET    | `/`            | authGuard + tenantDb | —                                 | `purchaseOrderQuerySchema`        | —                                                           | List paginated        |
| GET    | `/:id`         | authGuard + tenantDb | —                                 | —                                 | —                                                           | Get by ID             |
| POST   | `/`            | authGuard + tenantDb | `roleGuard('inventory','create')` | `createPurchaseOrderSchema`       | `inventory.purchase_order.created`                          | Create                |
| PUT    | `/:id`         | authGuard + tenantDb | `roleGuard('inventory','update')` | `updatePurchaseOrderSchema`       | —                                                           | Update (draft only)   |
| PATCH  | `/:id/status`  | authGuard + tenantDb | `roleGuard('inventory','update')` | `purchaseOrderStatusUpdateSchema` | —                                                           | Status FSM transition |
| POST   | `/:id/receive` | authGuard + tenantDb | `roleGuard('inventory','update')` | `receivePurchaseOrderSchema`      | `inventory.purchase_order.received` + `inventory.restocked` | Receive goods         |
| DELETE | `/:id`         | authGuard + tenantDb | `roleGuard('inventory','delete')` | —                                 | —                                                           | Delete (draft only)   |

**Total: 7 endpoints**

---

### R5 — Stock Counts (`/api/stock-counts`)

| Method | Path            | Auth                 | Role                              | Schema                   | Webhook                             | Description                     |
| ------ | --------------- | -------------------- | --------------------------------- | ------------------------ | ----------------------------------- | ------------------------------- |
| GET    | `/`             | authGuard + tenantDb | —                                 | `stockCountQuerySchema`  | —                                   | List paginated                  |
| GET    | `/:id`          | authGuard + tenantDb | —                                 | —                        | —                                   | Get by ID                       |
| POST   | `/`             | authGuard + tenantDb | `roleGuard('inventory','create')` | `createStockCountSchema` | —                                   | Create                          |
| PUT    | `/:id/items`    | authGuard + tenantDb | `roleGuard('inventory','update')` | `updateStockCountSchema` | —                                   | Update items (in_progress only) |
| PATCH  | `/:id/complete` | authGuard + tenantDb | `roleGuard('inventory','update')` | —                        | `inventory.stock_count.completed`   | Complete count                  |
| PATCH  | `/:id/approve`  | authGuard + tenantDb | `roleGuard('inventory','delete')` | `applyStockCountSchema`  | `inventory.stock_count.discrepancy` | Approve & apply adjustments     |
| PATCH  | `/:id/cancel`   | authGuard + tenantDb | `roleGuard('inventory','update')` | —                        | —                                   | Cancel                          |

**Total: 7 endpoints**

---

### R6 — Stock Transfers (`/api/stock-transfers`)

| Method | Path          | Auth                 | Role                              | Schema                       | Webhook                                     | Description       |
| ------ | ------------- | -------------------- | --------------------------------- | ---------------------------- | ------------------------------------------- | ----------------- |
| GET    | `/`           | authGuard + tenantDb | —                                 | `stockTransferQuerySchema`   | —                                           | List paginated    |
| GET    | `/:id`        | authGuard + tenantDb | —                                 | —                            | —                                           | Get by ID         |
| POST   | `/`           | authGuard + tenantDb | `roleGuard('inventory','create')` | `createStockTransferSchema`  | `inventory.transfer.requested`              | Create + reserve  |
| PATCH  | `/:id/status` | authGuard + tenantDb | `roleGuard('inventory','update')` | `updateTransferStatusSchema` | `inventory.transfer.completed` (on receive) | Status transition |

**Total: 4 endpoints**

---

### R7\* — Reports Dispatcher (shared route, inventory section)

Located in `apps/api/src/tenant/routes/reports/reports.route.ts` (~line 530-580).

| Method | Path                           | Description                                                                                                                                                                                                       |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/reports/inventory/:type` | Dispatches to `InventoryReportPipelineService.getReport(type, filters)` — supports D1–D10 report types. Checks module access (free tier gating). Falls back to empty `{summary,chart,table}` on pipeline failure. |

**Report types:** `material_usage`, `stock_valuation`, `expiry_report`, `consumption_forecast`, `supplier_performance`, `stock_movement_history`, `po_summary`, `low_stock`, `dead_stock`, `abc_analysis`

---

## 5. Cron / Workers

**No dedicated cron/worker files found for Inventory.**

The cron entry point is `InventoryStockService.processExpiredBatches()`:

- Scans ALL `InventoryStock` documents for active batches with `expiryDate < now`
- Marks them `status: 'expired'`, sets `quantity: 0`
- Creates `expired` movement with `SYSTEM_USER_ID` (`000000000000000000000000`)
- Returns `{ processedCount }`
- **BullMQ queue integration deferred to Week 13** per code comments

---

## 6. Tests

### T1 — `inventory-category.service.test.ts` (328 lines, 10 test cases)

| describe     | it                                                    | Assertion                            |
| ------------ | ----------------------------------------------------- | ------------------------------------ |
| `list`       | should return paginated categories                    | meta.page/limit/total/totalPages     |
| `list`       | should apply search/parentId/isActive filters         | result.items defined                 |
| `getById`    | should return category by ID                          | \_id = 'cat-1'                       |
| `getById`    | should throw NotFound for missing category            | rejects ApiError                     |
| `create`     | should create a root category                         | save called                          |
| `create`     | should validate parentId when creating child          | rejects 'Invalid parentId'           |
| `update`     | should update a category                              | save called                          |
| `update`     | should reject self-referencing parentId               | rejects 'cannot be its own parent'   |
| `softDelete` | should block if active items reference category       | rejects 'Cannot deactivate category' |
| `softDelete` | should deactivate category when no items reference it | isActive = false, save called        |
| `restore`    | should restore a deactivated category                 | isActive = true, save called         |
| `restore`    | should throw NotFound when restoring nonexistent      | rejects ApiError                     |

---

### T2 — `inventory-item.service.test.ts` (470 lines, 10 test cases)

| describe        | it                                                     | Assertion                             |
| --------------- | ------------------------------------------------------ | ------------------------------------- |
| `list`          | should return paginated items                          | meta.page/limit                       |
| `list`          | should apply search filter                             | result.items defined                  |
| `list`          | should delegate to getLowStockItems when lowStock=true | meta defined                          |
| `getById`       | should return item by ID                               | defined                               |
| `getById`       | should throw NotFound for missing item                 | rejects ApiError                      |
| `create`        | should create an item with category validation         | save called                           |
| `update`        | should update an item                                  | save called                           |
| `softDelete`    | should block if item has reserved stock                | rejects 'Cannot deactivate item'      |
| `softDelete`    | should deactivate item when no reserved stock          | isActive = false, save called         |
| `adjustStock`   | should add stock with movement creation                | stock.save + movement.create called   |
| `adjustStock`   | should remove stock using FIFO batch consumption       | B001.qty=0, B002.qty=30, stock.qty=30 |
| `findByBarcode` | should return item by barcode                          | defined                               |

---

### T3 — `inventory-stock.service.test.ts` (~430 lines, 10 test cases)

| describe                | it                                               | Assertion                                                 |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `getStockByBranch`      | should return paginated stock for branch         | meta.page/limit                                           |
| `getExpiringBatches`    | should return batches within days window         | aggregate called                                          |
| `disposeBatch`          | should mark batch as expired and create movement | disposedQuantity=20, status='expired', qty=0, save+create |
| `bulkDispose`           | should process multiple disposals                | disposed=1, total=1                                       |
| `reserveStock`          | should increase reserved quantity                | reservedQty=15, save+create                               |
| `unreserveStock`        | should decrease reserved quantity                | reservedQty=5, save                                       |
| `recalculateStockValue` | should recalculate using FIFO method             | stockValue=2800, method='fifo'                            |
| `recalculateStockValue` | should recalculate using weighted average        | stockValue=2800, method='weighted_average'                |
| `getStockSummary`       | should return aggregated KPIs                    | totalItems=5, totalQuantity=500, totalValue=12500         |
| `processExpiredBatches` | should scan all stock and mark expired batches   | processedCount=1, status='expired', qty=0                 |

---

### T4 — `inventory-report-pipeline.service.test.ts` (~340 lines, 13 test cases)

| describe                   | it                                                      | Assertion                |
| -------------------------- | ------------------------------------------------------- | ------------------------ |
| `D1: materialUsage`        | should return summary, chart, and table                 | all 3 properties present |
| `D2: stockValuation`       | should return summary, chart, and table                 | all 3 properties present |
| `D3: expiryReport`         | should return expiry buckets in summary/chart/table     | all 3 properties present |
| `D4: consumptionForecast`  | should return forecast data                             | all 3 properties present |
| `D5: supplierPerformance`  | should return supplier metrics                          | all 3 properties present |
| `D6: stockMovementHistory` | should return movement timeline                         | all 3 properties present |
| `D7: poSummary`            | should return PO summary by status                      | all 3 properties present |
| `D8: lowStock`             | should return items at/below reorder level              | all 3 properties present |
| `D9: deadStock`            | should return items with no recent movement             | all 3 properties present |
| `D10: abcAnalysis`         | should return ABC classification                        | all 3 properties present |
| `getReport`                | should dispatch to materialUsage for "material_usage"   | defined                  |
| `getReport`                | should dispatch to stockValuation for "stock_valuation" | defined                  |
| `getReport`                | should return null for unknown report type              | null                     |

---

### T5 — `purchase-order.service.test.ts` (~280 lines, 8 test cases)

| describe       | it                                             | Assertion                             |
| -------------- | ---------------------------------------------- | ------------------------------------- |
| `list`         | should return paginated purchase orders        | items.length=1, meta.page=1           |
| `list`         | should filter by status and supplier           | filter arg includes status+supplierId |
| `create`       | should create PO validating supplier and items | defined                               |
| `update`       | should update draft PO only                    | save called                           |
| `update`       | should throw when updating non-draft PO        | rejects ApiError                      |
| `updateStatus` | should allow valid status transition           | status='submitted', save called       |
| `updateStatus` | should reject invalid status transition        | rejects ApiError                      |
| `delete`       | should delete draft PO only                    | succeeds                              |
| `delete`       | should throw when deleting non-draft PO        | rejects ApiError                      |

---

### T6 — `stock-count.service.test.ts` (~300 lines, 9 test cases)

| describe      | it                                                     | Assertion                              |
| ------------- | ------------------------------------------------------ | -------------------------------------- |
| `list`        | should return paginated stock counts                   | items.length=1, meta.page=1            |
| `create`      | should auto-populate systemQuantity from current stock | defined                                |
| `updateItems` | should update items when status is in_progress         | save called                            |
| `updateItems` | should reject updates when status is completed         | rejects ApiError                       |
| `complete`    | should set completedAt timestamp                       | status='completed', completedAt≠null   |
| `approve`     | should apply stock adjustments and create movements    | status='approved', approvedBy='user-1' |
| `approve`     | should reject double-approve                           | rejects ApiError                       |
| `cancel`      | should cancel in_progress count                        | status='cancelled'                     |
| `cancel`      | should reject cancelling completed count               | rejects ApiError                       |

---

### T7 — `stock-transfer.service.test.ts` (~260 lines, 7 test cases)

| describe       | it                                              | Assertion                      |
| -------------- | ----------------------------------------------- | ------------------------------ |
| `list`         | should return paginated transfers               | items.length=1, meta.page=1    |
| `list`         | should filter by status                         | filter includes status='draft' |
| `create`       | should reject transfer to same branch           | rejects ApiError               |
| `create`       | should create transfer with stock validation    | defined                        |
| `create`       | should reject when insufficient stock available | rejects                        |
| `updateStatus` | should reject invalid status transition         | rejects                        |

---

## 7. Shared Schemas

**File:** `packages/shared/src/schemas/inventory.schema.ts`

### Enums (12)

| Export                      | Values                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| `inventoryUnitEnum`         | piece, box, pack, bottle, tube, ml, liter, gram, kg, unit, syringe, capsule |
| `barcodeTypeEnum`           | ean13, code128, qr, datamatrix                                              |
| `valuationMethodEnum`       | fifo, weighted_average, last_purchase                                       |
| `movementTypeEnum`          | 13 values (purchase through unreserved)                                     |
| `movementReferenceTypeEnum` | 9 values (invoice through expiry_check)                                     |
| `batchStatusEnum`           | active, expired, recalled, quarantine                                       |
| `purchaseOrderStatusEnum`   | 7 values (draft through cancelled)                                          |
| `transferStatusEnum`        | draft, in_transit, received, cancelled                                      |
| `stockCountStatusEnum`      | in_progress, completed, approved, cancelled                                 |
| `stockCountTypeEnum`        | full, partial, spot_check                                                   |
| `qualityCheckEnum`          | passed, partial, failed                                                     |
| `poAttachmentTypeEnum`      | invoice, delivery_note, certificate                                         |

### Schemas (22)

| Schema                            | Target                    | Mode                                                              |
| --------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `createInventoryCategorySchema`   | Category create           | `.strict()`                                                       |
| `updateInventoryCategorySchema`   | Category update           | `.partial().strict()`                                             |
| `inventoryCategoryQuerySchema`    | Category list query       | `.strict()`                                                       |
| `createInventoryItemSchema`       | Item create               | `.strict()`                                                       |
| `updateInventoryItemSchema`       | Item update               | `.partial().strict()`                                             |
| `inventoryItemQuerySchema`        | Item list query           | `.strict()`                                                       |
| `barcodeSearchSchema`             | Barcode lookup            | `.strict()`                                                       |
| `stockAdjustmentSchema`           | Stock adjust              | `.strict()`                                                       |
| `supplierAddressSchema`           | Supplier address embedded | `.strict()`                                                       |
| `createSupplierSchema`            | Supplier create           | `.strict()`                                                       |
| `updateSupplierSchema`            | Supplier update           | `.partial().strict()`                                             |
| `supplierQuerySchema`             | Supplier list query       | `.strict()`                                                       |
| `purchaseOrderItemSchema`         | PO line item              | `.strict()`                                                       |
| `createPurchaseOrderSchema`       | PO create                 | `.strict()`                                                       |
| `updatePurchaseOrderSchema`       | PO update                 | `.strict()`                                                       |
| `purchaseOrderStatusUpdateSchema` | PO status transition      | `.strict()`                                                       |
| `receivePurchaseOrderSchema`      | PO receive                | `.strict()` (uses `receivePurchaseOrderItemSchema`)               |
| `purchaseOrderQuerySchema`        | PO list query             | `.strict()`                                                       |
| `transferItemSchema`              | Transfer line item        | `.strict()`                                                       |
| `createStockTransferSchema`       | Transfer create           | `.strict()`                                                       |
| `updateTransferStatusSchema`      | Transfer action           | `.strict()` — action enum: approve, reject, ship, receive, cancel |
| `stockTransferQuerySchema`        | Transfer list query       | `.strict()`                                                       |
| `stockCountItemSchema`            | Count line item           | `.strict()`                                                       |
| `createStockCountSchema`          | Count create              | `.strict()`                                                       |
| `updateStockCountSchema`          | Count update items        | `.strict()`                                                       |
| `applyStockCountSchema`           | Count approve/apply       | `.strict()` — `itemIds: z.array(objectId).min(1)`                 |
| `stockCountQuerySchema`           | Count list query          | `.strict()`                                                       |
| `inventoryMovementQuerySchema`    | Movement query            | `.strict()`                                                       |
| `expiryQuerySchema`               | Expiry query              | `.strict()`                                                       |
| `bulkDisposeSchema`               | Bulk dispose              | `.strict()`                                                       |

### Inferred Types (25)

```
CreateInventoryCategoryInput, UpdateInventoryCategoryInput, InventoryCategoryQuery,
CreateInventoryItemInput, UpdateInventoryItemInput, InventoryItemQuery, BarcodeSearch,
StockAdjustmentInput,
CreateSupplierInput, UpdateSupplierInput, SupplierQuery,
CreatePurchaseOrderInput, UpdatePurchaseOrderInput, PurchaseOrderStatusUpdateInput,
ReceivePurchaseOrderInput, PurchaseOrderQuery,
CreateStockTransferInput, UpdateTransferStatusInput, StockTransferQuery,
CreateStockCountInput, UpdateStockCountInput, ApplyStockCountInput, StockCountQuery,
InventoryMovementQuery, ExpiryQuery, BulkDisposeInput,
InventoryUnit, BarcodeType, ValuationMethod, MovementType, MovementReferenceType,
BatchStatus, PurchaseOrderStatus, TransferStatus, StockCountStatus, StockCountType, QualityCheck
```

---

## 8. Cross-Cutting Patterns

### Multi-Tenant Architecture

- Every model uses a **factory function** `getXxxModel(connection: Connection)` that registers the schema on the tenant's Mongoose connection.
- Routes extract `request.tenantDb` (Connection) and `request.user.userId` via helper functions.
- Services receive the connection at construction time.

### Auth/RBAC Pattern

```
Base:    [authGuard, tenantDbMiddleware]
Mutate:  [...base, roleGuard('inventory', 'create'|'update'|'delete')]
Read:    [...base] (no roleGuard for GET endpoints, except stock report which requires 'read')
```

### Webhook Events (Fire-and-Forget)

```
inventory.item.created          — POST /inventory-items
inventory.item.updated          — PUT /inventory-items/:id
inventory.out_of_stock          — POST /inventory-items/:id/stock/adjust (qty=0)
inventory.critical_stock        — POST /inventory-items/:id/stock/adjust (qty<min)
inventory.low_stock             — POST /inventory-items/:id/stock/adjust (qty<reorder)
inventory.expired               — POST /inventory-stock/:stockId/dispose/:batch
inventory.purchase_order.created — POST /purchase-orders
inventory.purchase_order.received — POST /purchase-orders/:id/receive
inventory.restocked             — POST /purchase-orders/:id/receive
inventory.stock_count.completed — PATCH /stock-counts/:id/complete
inventory.stock_count.discrepancy — PATCH /stock-counts/:id/approve
inventory.transfer.requested    — POST /stock-transfers
inventory.transfer.completed    — PATCH /stock-transfers/:id/status (action=receive)
```

**Total: 13 distinct webhook events**

### Valuation Methods

- **FIFO:** Sum of `batch.quantity × batch.unitCost` for active batches
- **Weighted Average:** Total value / total quantity × total quantity
- **Last Purchase:** Total quantity × most recent batch unit cost

### Auto-Numbering Pattern

All document numbers use `{PREFIX}-{YYYY}-{00001}` format:

- `ITM-` (items), `PO-` (purchase orders), `SC-` (stock counts), `TRF-` (transfers)
- Generated in `pre('validate')` hooks when doc is new

### Pagination Pattern

All list endpoints return `{ items: T[], meta: { page, limit, total, totalPages } }`

---

## 9. Metrics Summary

| Metric                        | Count                                                 |
| ----------------------------- | ----------------------------------------------------- |
| **Models**                    | 7                                                     |
| **Collections**               | 7 (#53–#56, #58–#60)                                  |
| **Total Model Fields**        | ~130                                                  |
| **Total Indexes**             | 24                                                    |
| **Services**                  | 7                                                     |
| **Total Service Methods**     | ~55                                                   |
| **Route Files**               | 6 (+1 shared reports)                                 |
| **Total REST Endpoints**      | 47                                                    |
| **Report Pipelines (D1–D10)** | 10                                                    |
| **Webhook Events**            | 13                                                    |
| **Zod Schemas**               | 22                                                    |
| **Zod Enums**                 | 12                                                    |
| **Inferred Types**            | 25+                                                   |
| **Test Files**                | 7                                                     |
| **Total Test Cases**          | 67                                                    |
| **Cron Targets**              | 1 (`processExpiredBatches`)                           |
| **Shared Schema File**        | 1 (`packages/shared/src/schemas/inventory.schema.ts`) |

---

_End of scan._

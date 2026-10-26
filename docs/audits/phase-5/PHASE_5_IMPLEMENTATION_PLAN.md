# Phase 5 — Operational: Implementation Plan

> **Phase:** 5 (Operational)
> **Weeks:** 21–23 (adjusted timeline per Decision Log §8)
> **Depends on:** Phase 4 ✅ (M4 gate passed)
> **Gate (M5):** Inventory + 36 Reports + 🔒 RBAC-protected reports

---

## Pre-Implementation Audit

### Already Implemented ✅ (from Phase 3–4)

| Area                    | Status      | Lines  | Files | Notes                                                      |
| :---------------------- | :---------- | :----- | :---- | :--------------------------------------------------------- |
| **Leave System**        | ✅ COMPLETE | ~1,338 | 8     | 3 models, service, routes, schemas, frontend page+hook     |
| **Attendance**          | ✅ COMPLETE | ~702   | 6     | Model, service, routes, schemas, frontend page+hook        |
| **Reports & Analytics** | ✅ COMPLETE | ~4,555 | 11    | 3 models, 2 services, routes, types, 4 frontend pages+hook |
| **Totals**              | ✅          | ~6,595 | 25    | —                                                          |

**Leave details:** LeaveType/LeaveRequest/LeaveBalance models, leave.service (333 LOC) with status flow + balance tracking + schedule_exceptions auto-sync, 10 endpoints, Zod schemas, LeavePage + useLeave hook.

**Attendance details:** Attendance model (70 LOC), attendance.service (197 LOC) with clock-in/out + break + lateness detection + overtime calc, 4 endpoints, AttendancePage + useAttendance hook.

**Reports details:** SavedReport/ReportSchedule/ReportHistory models (531 LOC), report-pipeline.service (600 LOC) with 9 aggregation pipelines, report-export.service (435 LOC) with CSV/Excel/PDF, report-scheduler.service (177 LOC) with BullMQ cron, 15+ endpoints, ReportsHub + ReportCategory + ScheduledReports pages.

### 26 of 36 Reports Already Implemented

| Category      | Count  | Reports                                                                                         | Status              |
| :------------ | :----- | :---------------------------------------------------------------------------------------------- | :------------------ |
| Financial     | 7      | Revenue Summary, by Doctor/Service/Branch, Payment Collection, Outstanding Aging, Tax           | ✅ Pipeline service |
| Patient       | 5      | Overview, New vs Returning, Demographics, No-Show, Source/Referral                              | ✅ Pipeline service |
| Appointment   | 6      | Summary, Doctor/Chair Utilization, Cancellation, Peak Hours Heatmap, Duration                   | ✅ Pipeline service |
| Clinical      | 4      | Procedures Performed, Treatment Acceptance, Lab Turnaround, Prescription Volume                 | ✅ Pipeline service |
| Operational   | 4      | Commission Summary, Daily Reconciliation, Wait Time, Staff Productivity                         | ✅ Pipeline service |
| **Inventory** | **10** | StockValuation, Expiry, Forecast, SupplierPerf, DeadStock, ABC, Turnover, Reorder, Movement, PO | ❌ **NOT BUILT**    |

### What Phase 5 Still Needs

**The ENTIRE Inventory module — this is the remaining Phase 5 deliverable.**

---

## Phase 5 Scope (Remaining Work)

### Summary

| Deliverable                  | Collections | API Endpoints | UI Pages | Reports |
| :--------------------------- | :---------- | :------------ | :------- | :------ |
| Inventory Items + Categories | 2           | ~10           | 4        | —       |
| Inventory Stock + Movements  | 2           | ~8            | 2        | —       |
| Suppliers                    | 1           | ~5            | 3        | —       |
| Purchase Orders              | 1           | ~8            | 3        | —       |
| Stock Transfers              | 1           | ~6            | 2        | —       |
| Stock Counts (Inventur)      | 1           | ~6            | 2        | —       |
| Expiry Dashboard + Cron      | —           | ~3            | 1        | —       |
| Barcode/QR Scanning          | —           | ~1            | —        | —       |
| Auto-Reorder                 | —           | ~2            | —        | —       |
| 10 Inventory Reports         | —           | ~10           | 2        | 10      |
| **Total**                    | **8**       | **~59**       | **~19**  | **10**  |

### Source Documents

| Document                  | Section      | What It Specifies                                             |
| :------------------------ | :----------- | :------------------------------------------------------------ |
| DENTO_V2_MASTER_PLAN.md   | §16          | Inventory Deep Dive — 7 collections, 17 UI pages, all schemas |
| DENTO_V2_MASTER_PLAN.md   | §21          | Reports & Analytics — 10 inventory reports                    |
| DENTO_V2_MASTER_PLAN.md   | §27          | RBAC — 13 inventory permissions                               |
| IMPLEMENTATION_ROADMAP.md | §7 (Phase 5) | Week 17–19 breakdown                                          |
| V2_DATABASE.md            | §8           | Collection #53–64 mapping                                     |
| V2_DECISION_LOG.md        | §5.4         | Inventory valuation pipeline                                  |
| BUILD_RULES.md            | §3–§7        | API route conventions, backend patterns, shared package rules |
| PLATFORM_RBAC.md          | —            | Platform-level (not directly Phase 5, but reports RBAC)       |

---

## MongoDB Collections (8 New)

### 1. `inventory_categories` (Tenant DB)

```typescript
{
  _id: ObjectId,
  nameEn: String,           // "Dental Materials"
  nameAr: String,           // "مواد طب الأسنان"
  slug: String,             // auto-generated, unique
  parentId: ObjectId | null,// Hierarchical categories
  description: String,
  icon: String,             // Lucide icon name
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date, updatedAt: Date
}
// Indexes: { slug: 1 } unique, { parentId: 1 }
// Seed: 10 categories (Consumables, Dental Materials, Anesthetics, Surgical, Endodontic, Restorative, Prosthodontic, Orthodontic, Preventive, Infection Control)
```

### 2. `inventory_items` (Tenant DB)

```typescript
{
  _id: ObjectId,
  sku: String,              // unique, auto or manual
  nameEn: String, nameAr: String,
  categoryId: ObjectId,     // → inventory_categories
  description: String,
  unit: String,             // piece|box|pack|bottle|tube|ml|liter|gram|kg|unit|syringe|capsule
  unitsPerPackage: Number,
  unitCost: Number, sellingPrice: Number, marginPercent: Number,
  reorderLevel: Number, reorderQuantity: Number, minStockLevel: Number, maxStockLevel: Number,
  isConsumable: Boolean, requiresPrescription: Boolean, isActive: Boolean,
  imageUrl: String,         // S3/R2 upload
  barcode: String, barcodeType: String, // ean13|code128|qr|datamatrix
  manufacturer: String, manufacturerRef: String,
  defaultSupplierId: ObjectId, // → suppliers
  totalConsumed: Number, avgMonthlyUsage: Number,
  lastPurchaseDate: Date, lastPurchasePrice: Number,
  createdAt: Date, updatedAt: Date
}
// Indexes: { sku: 1 } unique, { categoryId: 1 }, { barcode: 1 } unique sparse, { isActive: 1, nameEn: 1 }, { defaultSupplierId: 1 }
```

### 3. `inventory_stock` (Tenant DB — per branch per item)

```typescript
{
  _id: ObjectId,
  itemId: ObjectId, branchId: ObjectId,
  quantity: Number, reservedQuantity: Number, availableQuantity: Number,
  batches: [{
    batchNumber: String, lotNumber: String, expiryDate: Date,
    quantity: Number, receivedDate: Date, purchaseOrderId: ObjectId,
    unitCost: Number, status: String // active|expired|recalled|quarantine
  }],
  stockValue: Number, valuationMethod: String, // fifo|weighted_average|last_purchase
  weightedAvgCost: Number,
  lastCountedAt: Date, lastCountedBy: ObjectId,
  lastCountResult: String, countDiscrepancy: Number,
  createdAt: Date, updatedAt: Date
}
// Indexes: { itemId: 1, branchId: 1 } unique, { "batches.expiryDate": 1 }, { availableQuantity: 1 }
```

### 4. `inventory_movements` (Tenant DB)

```typescript
{
  _id: ObjectId,
  itemId: ObjectId, branchId: ObjectId,
  movementType: String,      // purchase|sale|adjustment_add|adjustment_remove|transfer_in|transfer_out|expired|damaged|return_supplier|return_patient|consumed|reserved|unreserved
  quantity: Number, previousQuantity: Number, newQuantity: Number,
  unitCost: Number, totalCost: Number,
  referenceType: String,     // invoice|purchase_order|transfer|procedure_note|treatment_plan|appointment|manual|stock_count|expiry_check
  referenceId: ObjectId,
  batchNumber: String, lotNumber: String, expiryDate: Date,
  transferId: ObjectId, fromBranchId: ObjectId, toBranchId: ObjectId,
  notes: String, createdBy: ObjectId, createdAt: Date
}
// Indexes: { itemId: 1, createdAt: -1 }, { branchId: 1, movementType: 1 }, { referenceType: 1, referenceId: 1 }, { transferId: 1 }, { createdAt: -1 }
```

### 5. `suppliers` (Tenant DB)

```typescript
{
  _id: ObjectId,
  name: String, nameAr: String,
  contactPerson: String, phone: String, email: String,
  address: { street, city, state, country, postalCode },
  taxNumber: String, commercialRegister: String,
  paymentTerms: String,     // "Net 30", "COD"
  rating: Number, avgDeliveryDays: Number, totalOrders: Number, lastOrderDate: Date,
  website: String, notes: String, isActive: Boolean,
  createdAt: Date, updatedAt: Date
}
// Indexes: { name: 1 }, { isActive: 1 }
```

### 6. `purchase_orders` (Tenant DB)

```typescript
{
  _id: ObjectId,
  orderNumber: String,       // PO-2026-001 unique
  supplierId: ObjectId, branchId: ObjectId,
  status: String,            // draft|submitted|confirmed|shipped|partially_received|received|cancelled
  orderDate: Date, expectedDate: Date, receivedDate: Date,
  items: [{
    itemId: ObjectId, quantity: Number, unitCost: Number, totalCost: Number,
    receivedQuantity: Number, batchNumber: String, expiryDate: Date, notes: String
  }],
  subtotal: Number, taxPercent: Number, taxAmount: Number, discount: Number, total: Number,
  receivingNotes: String, receivedBy: ObjectId,
  qualityCheck: String,      // passed|partial|failed
  attachments: [{ name, url, type }],
  createdBy: ObjectId, createdAt: Date, updatedAt: Date
}
// Indexes: { orderNumber: 1 } unique, { supplierId: 1, status: 1 }, { status: 1, expectedDate: 1 }
```

### 7. `stock_transfers` (Tenant DB)

```typescript
{
  _id: ObjectId,
  transferNumber: String,    // TRF-2026-001 unique
  fromBranchId: ObjectId, toBranchId: ObjectId,
  status: String,            // draft|in_transit|received|cancelled
  items: [{ itemId: ObjectId, quantity: Number, batchNumber: String, notes: String }],
  requestedBy: ObjectId, approvedBy: ObjectId, receivedBy: ObjectId,
  requestedAt: Date, approvedAt: Date, shippedAt: Date, receivedAt: Date,
  notes: String, createdAt: Date, updatedAt: Date
}
// Indexes: { transferNumber: 1 } unique, { fromBranchId: 1, status: 1 }, { toBranchId: 1, status: 1 }
```

### 8. `stock_counts` (Tenant DB)

```typescript
{
  _id: ObjectId,
  countNumber: String,       // SC-2026-001 unique
  branchId: ObjectId,
  status: String,            // in_progress|completed|cancelled
  countType: String,         // full|partial|spot_check
  items: [{
    itemId: ObjectId, systemQuantity: Number, countedQuantity: Number,
    discrepancy: Number, notes: String, adjustmentApplied: Boolean
  }],
  startedAt: Date, completedAt: Date,
  countedBy: ObjectId, approvedBy: ObjectId,
  summary: { totalItems, matchCount, surplusCount, deficitCount, totalDiscrepancyValue },
  createdAt: Date, updatedAt: Date
}
// Indexes: { branchId: 1, status: 1 }, { countNumber: 1 } unique
```

---

## RBAC Permissions (13 Inventory Permissions)

| Permission                          | Roles                             |
| :---------------------------------- | :-------------------------------- |
| `inventory.items.view`              | All Staff                         |
| `inventory.items.manage`            | admin, manager, assistant         |
| `inventory.stock.adjust`            | admin, manager                    |
| `inventory.suppliers.view`          | admin, manager, assistant         |
| `inventory.suppliers.manage`        | admin, manager                    |
| `inventory.purchase_orders.create`  | admin, manager, assistant         |
| `inventory.purchase_orders.approve` | admin, manager                    |
| `inventory.purchase_orders.receive` | admin, manager, assistant         |
| `inventory.transfers.request`       | admin, manager, assistant         |
| `inventory.transfers.approve`       | admin, manager                    |
| `inventory.stock_count.perform`     | admin, manager, assistant         |
| `inventory.stock_count.approve`     | admin (corrections require admin) |
| `inventory.reports.view`            | admin, manager                    |

---

## Webhook Events (14 Inventory Events)

```typescript
const INVENTORY_EVENTS = [
  'inventory.item.created',
  'inventory.item.updated',
  'inventory.low_stock', // ≤ reorderLevel
  'inventory.critical_stock', // ≤ minStockLevel
  'inventory.out_of_stock', // = 0
  'inventory.expired', // Batch expired
  'inventory.expiring_soon', // < 30 days
  'inventory.restocked', // Goods received
  'inventory.transfer.requested',
  'inventory.transfer.completed',
  'inventory.purchase_order.created',
  'inventory.purchase_order.received',
  'inventory.stock_count.completed',
  'inventory.stock_count.discrepancy',
];
```

---

## API Endpoints (~59 Total)

### Inventory Items (10)

| Method | Route                                | Guard                    | Description                                                          |
| :----- | :----------------------------------- | :----------------------- | :------------------------------------------------------------------- |
| GET    | `/api/inventory/items`               | `inventory.items.view`   | List items (pagination, search, filter by category/active/low-stock) |
| GET    | `/api/inventory/items/:id`           | `inventory.items.view`   | Item detail with stock levels                                        |
| POST   | `/api/inventory/items`               | `inventory.items.manage` | Create item                                                          |
| PATCH  | `/api/inventory/items/:id`           | `inventory.items.manage` | Update item                                                          |
| DELETE | `/api/inventory/items/:id`           | `inventory.items.manage` | Soft-delete item                                                     |
| GET    | `/api/inventory/items/:id/movements` | `inventory.items.view`   | Movement history for item                                            |
| GET    | `/api/inventory/items/:id/stock`     | `inventory.items.view`   | Stock levels per branch                                              |
| POST   | `/api/inventory/items/:id/adjust`    | `inventory.stock.adjust` | Stock adjustment (add/remove)                                        |
| GET    | `/api/inventory/items/low-stock`     | `inventory.items.view`   | All items below reorder level                                        |
| GET    | `/api/inventory/items/barcode/:code` | `inventory.items.view`   | Lookup by barcode                                                    |

### Inventory Categories (5)

| Method | Route                           | Guard                    | Description                   |
| :----- | :------------------------------ | :----------------------- | :---------------------------- |
| GET    | `/api/inventory/categories`     | `inventory.items.view`   | List categories (tree)        |
| GET    | `/api/inventory/categories/:id` | `inventory.items.view`   | Category detail               |
| POST   | `/api/inventory/categories`     | `inventory.items.manage` | Create category               |
| PATCH  | `/api/inventory/categories/:id` | `inventory.items.manage` | Update category               |
| DELETE | `/api/inventory/categories/:id` | `inventory.items.manage` | Delete category (if no items) |

### Suppliers (5)

| Method | Route                          | Guard                        | Description                        |
| :----- | :----------------------------- | :--------------------------- | :--------------------------------- |
| GET    | `/api/inventory/suppliers`     | `inventory.suppliers.view`   | List suppliers                     |
| GET    | `/api/inventory/suppliers/:id` | `inventory.suppliers.view`   | Supplier detail with order history |
| POST   | `/api/inventory/suppliers`     | `inventory.suppliers.manage` | Create supplier                    |
| PATCH  | `/api/inventory/suppliers/:id` | `inventory.suppliers.manage` | Update supplier                    |
| DELETE | `/api/inventory/suppliers/:id` | `inventory.suppliers.manage` | Soft-delete supplier               |

### Purchase Orders (8)

| Method | Route                                         | Guard                               | Description                            |
| :----- | :-------------------------------------------- | :---------------------------------- | :------------------------------------- |
| GET    | `/api/inventory/purchase-orders`              | `inventory.purchase_orders.create`  | List POs (filter by status/supplier)   |
| GET    | `/api/inventory/purchase-orders/:id`          | `inventory.purchase_orders.create`  | PO detail                              |
| POST   | `/api/inventory/purchase-orders`              | `inventory.purchase_orders.create`  | Create PO (draft)                      |
| PATCH  | `/api/inventory/purchase-orders/:id`          | `inventory.purchase_orders.create`  | Update PO (draft/submitted only)       |
| PATCH  | `/api/inventory/purchase-orders/:id/status`   | `inventory.purchase_orders.approve` | Advance PO status                      |
| POST   | `/api/inventory/purchase-orders/:id/receive`  | `inventory.purchase_orders.receive` | Receive goods (→ stock + movements)    |
| DELETE | `/api/inventory/purchase-orders/:id`          | `inventory.purchase_orders.approve` | Cancel PO                              |
| POST   | `/api/inventory/purchase-orders/auto-reorder` | `inventory.purchase_orders.create`  | Generate draft POs for low-stock items |

### Stock Transfers (6)

| Method | Route                                  | Guard                         | Description                     |
| :----- | :------------------------------------- | :---------------------------- | :------------------------------ |
| GET    | `/api/inventory/transfers`             | `inventory.transfers.request` | List transfers                  |
| GET    | `/api/inventory/transfers/:id`         | `inventory.transfers.request` | Transfer detail                 |
| POST   | `/api/inventory/transfers`             | `inventory.transfers.request` | Create transfer request         |
| PATCH  | `/api/inventory/transfers/:id/approve` | `inventory.transfers.approve` | Approve/reject transfer         |
| PATCH  | `/api/inventory/transfers/:id/ship`    | `inventory.transfers.approve` | Mark as shipped                 |
| PATCH  | `/api/inventory/transfers/:id/receive` | `inventory.transfers.request` | Receive transfer at destination |

### Stock Counts (6)

| Method | Route                                      | Guard                           | Description               |
| :----- | :----------------------------------------- | :------------------------------ | :------------------------ |
| GET    | `/api/inventory/stock-counts`              | `inventory.stock_count.perform` | List counts               |
| GET    | `/api/inventory/stock-counts/:id`          | `inventory.stock_count.perform` | Count detail              |
| POST   | `/api/inventory/stock-counts`              | `inventory.stock_count.perform` | Start new count           |
| PATCH  | `/api/inventory/stock-counts/:id`          | `inventory.stock_count.perform` | Update count items        |
| PATCH  | `/api/inventory/stock-counts/:id/complete` | `inventory.stock_count.perform` | Complete count            |
| POST   | `/api/inventory/stock-counts/:id/apply`    | `inventory.stock_count.approve` | Apply adjustments (admin) |

### Expiry + Misc (3)

| Method | Route                           | Guard                    | Description                                       |
| :----- | :------------------------------ | :----------------------- | :------------------------------------------------ |
| GET    | `/api/inventory/expiry`         | `inventory.items.view`   | Expiry dashboard data (expired, <30d, <60d, <90d) |
| POST   | `/api/inventory/expiry/dispose` | `inventory.stock.adjust` | Bulk dispose expired items                        |
| GET    | `/api/inventory/valuation`      | `inventory.reports.view` | Stock valuation summary (FIFO/WAC)                |

### Inventory Reports (10 + 6 existing)

| Method | Route                                         | Guard                    | Description                                      |
| :----- | :-------------------------------------------- | :----------------------- | :----------------------------------------------- |
| GET    | `/api/reports/inventory/material-usage`       | `inventory.reports.view` | Material consumption by period/branch/category   |
| GET    | `/api/reports/inventory/stock-valuation`      | `inventory.reports.view` | Total stock value by branch (FIFO/WAC)           |
| GET    | `/api/reports/inventory/expiry`               | `inventory.reports.view` | Expiring items by timeframe                      |
| GET    | `/api/reports/inventory/forecast`             | `inventory.reports.view` | Consumption forecast based on avgMonthlyUsage    |
| GET    | `/api/reports/inventory/supplier-performance` | `inventory.reports.view` | Avg delivery days, order frequency, quality      |
| GET    | `/api/reports/inventory/dead-stock`           | `inventory.reports.view` | Items with no movement > 90 days                 |
| GET    | `/api/reports/inventory/abc-analysis`         | `inventory.reports.view` | ABC classification by value (A=80%, B=15%, C=5%) |
| GET    | `/api/reports/inventory/turnover`             | `inventory.reports.view` | Inventory turnover rate by item                  |
| GET    | `/api/reports/inventory/reorder`              | `inventory.reports.view` | Items below reorder level with suggested POs     |
| GET    | `/api/reports/inventory/movement-history`     | `inventory.reports.view` | Full movement audit trail by item/branch         |

---

## Zod Schemas (packages/shared)

### New File: `packages/shared/src/schemas/inventory.schema.ts`

Schemas needed:

- `createInventoryCategorySchema` / `updateInventoryCategorySchema`
- `createInventoryItemSchema` / `updateInventoryItemSchema`
- `stockAdjustmentSchema`
- `createSupplierSchema` / `updateSupplierSchema`
- `createPurchaseOrderSchema` / `updatePurchaseOrderSchema` / `receivePurchaseOrderSchema`
- `createStockTransferSchema` / `updateStockTransferStatusSchema`
- `createStockCountSchema` / `updateStockCountSchema` / `applyStockCountSchema`
- `inventoryQuerySchema` (shared filters: branchId, categoryId, dateRange, etc.)
- `barcodeSearchSchema`

---

## Admin Frontend Pages (17 Pages)

| #   | Route                            | Component                 | Description                                                                                    |
| :-- | :------------------------------- | :------------------------ | :--------------------------------------------------------------------------------------------- |
| 1   | `/inventory`                     | `InventoryListPage`       | Main inventory list with stat cards (total, low-stock, expired), search, filters, bulk actions |
| 2   | `/inventory/new`                 | `InventoryFormPage`       | Create item — image upload, barcode scanner, category select                                   |
| 3   | `/inventory/:id`                 | `InventoryFormPage`       | Edit item (reuse form)                                                                         |
| 4   | `/inventory/:id/stock`           | `ItemStockPage`           | Per-branch stock levels, batch details, movement history for single item                       |
| 5   | `/inventory/categories`          | `InventoryCategoryPage`   | Category tree CRUD                                                                             |
| 6   | `/inventory/suppliers`           | `SupplierListPage`        | Supplier list with rating, order count                                                         |
| 7   | `/inventory/suppliers/new`       | `SupplierFormPage`        | Create supplier                                                                                |
| 8   | `/inventory/suppliers/:id`       | `SupplierFormPage`        | Edit supplier + order history tab                                                              |
| 9   | `/inventory/purchase-orders`     | `PurchaseOrderListPage`   | PO list with status badges, filter by status/supplier                                          |
| 10  | `/inventory/purchase-orders/new` | `PurchaseOrderFormPage`   | Create PO — select supplier, add items with quantities                                         |
| 11  | `/inventory/purchase-orders/:id` | `PurchaseOrderDetailPage` | PO detail + receive goods workflow                                                             |
| 12  | `/inventory/transfers`           | `StockTransferListPage`   | Transfer list with approval status                                                             |
| 13  | `/inventory/transfers/new`       | `StockTransferFormPage`   | Create transfer — from/to branch, items                                                        |
| 14  | `/inventory/stock-counts`        | `StockCountListPage`      | Count history list                                                                             |
| 15  | `/inventory/stock-counts/new`    | `StockCountFormPage`      | Perform count — per-item system vs counted quantity                                            |
| 16  | `/inventory/expiry`              | `ExpiryDashboardPage`     | Expiry overview (red/yellow/green), batch disposal                                             |
| 17  | `/reports/inventory/:type`       | `InventoryReportPage`     | 10 inventory report pages with charts + export                                                 |

### Sidebar Update

```
📦 Inventory
  ├── Items                    → /inventory
  ├── Categories               → /inventory/categories
  ├── Suppliers                → /inventory/suppliers
  ├── Purchase Orders          → /inventory/purchase-orders
  ├── Transfers                → /inventory/transfers
  ├── Stock Counts             → /inventory/stock-counts
  ├── Expiry Tracking          → /inventory/expiry
  └── Reports
      ├── Material Usage       → /reports/inventory/material-usage
      └── Stock Valuation      → /reports/inventory/stock-valuation
```

---

## BullMQ Jobs (2 New)

### 1. Expiry Check Cron

```
Name: inventory.expiry-check
Schedule: 0 2 * * * (daily 02:00)
Logic:
  1. For each tenant DB:
     - Find batches with expiryDate ≤ today → set status = 'expired'
     - Find batches with expiryDate ≤ today + 30 → notification to admin
     - Create inventory_movements (type: expired) for newly expired
     - Webhook: inventory.expired / inventory.expiring_soon
```

### 2. Auto-Reorder Check

```
Name: inventory.reorder-check
Schedule: 0 8 * * * (daily 08:00)
Logic:
  1. For each tenant with autoReorderEnabled:
     - Find items where availableQuantity ≤ reorderLevel AND defaultSupplierId set
     - Create draft purchase_orders grouped by supplier
     - Notification to admin: "X items need reordering"
     - Webhook: inventory.low_stock
```

---

## Settings Schema Addition

Extend existing `inventorySettingsSchema` in settings:

```typescript
inventorySettings: {
  allowNegativeStock: false,           // Default: don't allow
  stockWarningThreshold: 'low',        // none|low|critical
  autoReserveOnTreatmentPlan: true,    // Reserve stock on TP creation
  requireBatchOnReceive: false,        // Batch number required on goods receipt
  requireExpiryOnReceive: true,        // Expiry date required on goods receipt
  defaultValuationMethod: 'weighted_average', // fifo|weighted_average|last_purchase
  autoReorderEnabled: false,           // Auto-generate draft POs for low stock
}
```

---

## Integration Points

| Module              | Integration                                                      | Implementation                                                                |
| :------------------ | :--------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Procedures**      | Auto-deduct materials from defaultMaterials when procedure saved | Update inventory_stock, create movement (type: consumed, ref: procedure_note) |
| **Treatment Plans** | Reserve stock on TP creation, unreserve on cancel                | Update reservedQuantity/availableQuantity on inventory_stock                  |
| **Invoices**        | Inventory items as invoice line items with stock check           | Validate availableQuantity ≥ requested, create movement (type: sale)          |
| **Services**        | `services.defaultMaterials[]` — standard materials per service   | Auto-populate material list in procedure form                                 |
| **Dashboard**       | Low-stock + expiry widgets                                       | Aggregation query on inventory_stock                                          |
| **Notifications**   | Low stock / expiry alerts                                        | BullMQ jobs → notification_queue                                              |

---

## Day-by-Day Implementation Schedule

### Week 1 (Days 1–5): Inventory Core

| Day       | Task                                                      | Deliverables                                                                                                                                                                                                                                       |
| :-------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day 1** | **Schemas + Models (Categories, Items)**                  | `packages/shared/src/schemas/inventory.schema.ts` — all Zod schemas (~350 LOC). `inventory-category.model.ts` + `inventory-item.model.ts` — Mongoose models with indexes (~200 LOC). Seed script for 10 categories.                                |
| **Day 2** | **Models (Stock, Movements, Suppliers)**                  | `inventory-stock.model.ts` + `inventory-movement.model.ts` + `supplier.model.ts` — Mongoose models (~250 LOC). Auto-number generators for SKU, PO, TRF, SC numbers.                                                                                |
| **Day 3** | **Models (POs, Transfers, Counts) + Service Layer Start** | `purchase-order.model.ts` + `stock-transfer.model.ts` + `stock-count.model.ts` (~200 LOC). `inventory-item.service.ts` — Item + Category CRUD + barcode search (~300 LOC).                                                                         |
| **Day 4** | **Service Layer (Stock + Suppliers)**                     | `inventory-stock.service.ts` — stock operations, deduction (FIFO/WAC), reservation, adjustment, validation (~400 LOC). `supplier.service.ts` — supplier CRUD + performance metrics (~200 LOC).                                                     |
| **Day 5** | **Service Layer (POs + Transfers + Counts)**              | `purchase-order.service.ts` — PO lifecycle + goods receipt → stock + movements (~350 LOC). `stock-transfer.service.ts` — transfer workflow + approval (~250 LOC). `stock-count.service.ts` — count workflow + discrepancy + adjustment (~250 LOC). |

### Week 2 (Days 6–10): Routes + BullMQ + Reports

| Day        | Task                                               | Deliverables                                                                                                                                                                                                                       |
| :--------- | :------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day 6**  | **API Routes (Items + Categories + Suppliers)**    | `inventory/items.route.ts` (~400 LOC), `inventory/categories.route.ts` (~150 LOC), `inventory/suppliers.route.ts` (~200 LOC). Register in server.ts.                                                                               |
| **Day 7**  | **API Routes (POs + Transfers + Counts + Expiry)** | `inventory/purchase-orders.route.ts` (~350 LOC), `inventory/transfers.route.ts` (~250 LOC), `inventory/stock-counts.route.ts` (~250 LOC), `inventory/expiry.route.ts` (~100 LOC).                                                  |
| **Day 8**  | **RBAC + BullMQ Jobs + Integration**               | Add 13 inventory permissions to `PERMISSION_MATRIX`. Expiry-check cron job. Auto-reorder cron job. Integration: procedure auto-deduction hook, TP stock reservation.                                                               |
| **Day 9**  | **10 Inventory Report Pipelines**                  | Add 10 MongoDB aggregation pipelines to report-pipeline.service.ts: material-usage, stock-valuation, expiry, forecast, supplier-perf, dead-stock, ABC, turnover, reorder, movement-history (~500 LOC). Register in report catalog. |
| **Day 10** | **Tests + Backend Verification**                   | Unit tests for: stock deduction (FIFO/WAC negative check), PO lifecycle (draft→received), transfer workflow, stock count discrepancy calc, report pipelines. Target: ~50 new tests. Build + lint clean.                            |

### Week 3 (Days 11–15): Admin Frontend

| Day        | Task                                                | Deliverables                                                                                                                                                                                                                                           |
| :--------- | :-------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day 11** | **Frontend: Inventory List + Form**                 | `InventoryListPage.tsx` — stat cards, table with search/filter/sort, bulk actions (~500 LOC). `InventoryFormPage.tsx` — create/edit with image upload, category select, barcode (~450 LOC). `useInventory.ts` hook (~250 LOC).                         |
| **Day 12** | **Frontend: Categories + Suppliers**                | `InventoryCategoryPage.tsx` — tree CRUD (~300 LOC). `SupplierListPage.tsx` + `SupplierFormPage.tsx` (~400 LOC). `useSuppliers.ts` hook (~150 LOC).                                                                                                     |
| **Day 13** | **Frontend: Purchase Orders**                       | `PurchaseOrderListPage.tsx` — status badges, filters (~350 LOC). `PurchaseOrderFormPage.tsx` — item selection, quantities (~400 LOC). `PurchaseOrderDetailPage.tsx` — detail + receive goods modal (~400 LOC). `usePurchaseOrders.ts` hook (~200 LOC). |
| **Day 14** | **Frontend: Transfers + Counts + Expiry**           | `StockTransferListPage.tsx` + `StockTransferFormPage.tsx` (~400 LOC). `StockCountListPage.tsx` + `StockCountFormPage.tsx` (~400 LOC). `ExpiryDashboardPage.tsx` (~350 LOC). Hooks for each (~300 LOC).                                                 |
| **Day 15** | **Frontend: Reports + Sidebar + Router + Final QA** | `InventoryReportPage.tsx` — chart wrapper + report type routing (~400 LOC). Sidebar config update with inventory sub-navigation. Router update with all 17 inventory routes. Full build verification. All tests passing. Lint clean.                   |

---

## Testing Strategy

| Area                                                   | Test Type   | Target Tests  |
| :----------------------------------------------------- | :---------- | :------------ |
| Stock deduction (FIFO/WAC/Last Purchase)               | Unit        | 8 tests       |
| Negative stock prevention                              | Unit        | 3 tests       |
| PO lifecycle (draft → received → stock updated)        | Integration | 5 tests       |
| Transfer workflow (request → approve → ship → receive) | Integration | 5 tests       |
| Stock count discrepancy calculation                    | Unit        | 4 tests       |
| Expiry check logic                                     | Unit        | 4 tests       |
| Auto-reorder draft PO generation                       | Unit        | 3 tests       |
| Barcode search                                         | Unit        | 2 tests       |
| Category hierarchy (parent/child)                      | Unit        | 3 tests       |
| Report pipelines (valuation, ABC, etc.)                | Unit        | 10 tests      |
| RBAC permission checks                                 | Unit        | 5 tests       |
| **Total**                                              |             | **~52 tests** |

---

## M5 Gate Checklist

| #   | Criterion                                                       | How to Verify                                                      |
| :-- | :-------------------------------------------------------------- | :----------------------------------------------------------------- |
| 1   | Inventory CRUD: Items, Categories, Suppliers                    | POST/GET/PATCH/DELETE all return 200/201                           |
| 2   | Stock tracking per branch with batch/lot                        | Receive PO → check stock levels per branch                         |
| 3   | PO workflow: Draft → Submitted → Confirmed → Shipped → Received | Status transitions work, stock updates on receive                  |
| 4   | Auto-deduction on procedure                                     | Save procedure note with defaultMaterials → inventory decrements   |
| 5   | Transfer: Branch A → Branch B with approval                     | Create transfer → approve → ship → receive → stock moved           |
| 6   | Inventur: Stock count → discrepancy → adjustment                | Start count → enter quantities → complete → apply adjustments      |
| 7   | 36 Reports total (26 existing + 10 inventory)                   | All report endpoints return data                                   |
| 8   | Reports RBAC-protected                                          | Accountant sees financial, doctor sees only own, assistant blocked |
| 9   | Expiry dashboard + cron job                                     | Cron marks expired batches, dashboard shows red/yellow/green       |
| 10  | Export (CSV/Excel/PDF) works for inventory reports              | Export endpoints create valid files                                |
| 11  | Build passing, lint clean, all tests green                      | `pnpm turbo build` + `pnpm turbo test`                             |

---

## File Inventory (New Files to Create)

### packages/shared (~1 file)

```
packages/shared/src/schemas/inventory.schema.ts         (~350 LOC)
```

### apps/api — Models (~8 files)

```
apps/api/src/tenant/models/inventory-category.model.ts   (~60 LOC)
apps/api/src/tenant/models/inventory-item.model.ts       (~120 LOC)
apps/api/src/tenant/models/inventory-stock.model.ts      (~90 LOC)
apps/api/src/tenant/models/inventory-movement.model.ts   (~80 LOC)
apps/api/src/tenant/models/supplier.model.ts             (~60 LOC)
apps/api/src/tenant/models/purchase-order.model.ts       (~90 LOC)
apps/api/src/tenant/models/stock-transfer.model.ts       (~60 LOC)
apps/api/src/tenant/models/stock-count.model.ts          (~70 LOC)
```

### apps/api — Services (~6 files)

```
apps/api/src/tenant/services/inventory-item.service.ts    (~300 LOC)
apps/api/src/tenant/services/inventory-stock.service.ts   (~400 LOC)
apps/api/src/tenant/services/supplier.service.ts          (~200 LOC)
apps/api/src/tenant/services/purchase-order.service.ts    (~350 LOC)
apps/api/src/tenant/services/stock-transfer.service.ts    (~250 LOC)
apps/api/src/tenant/services/stock-count.service.ts       (~250 LOC)
```

### apps/api — Routes (~6 files)

```
apps/api/src/tenant/routes/inventory/items.route.ts           (~400 LOC)
apps/api/src/tenant/routes/inventory/categories.route.ts      (~150 LOC)
apps/api/src/tenant/routes/inventory/suppliers.route.ts       (~200 LOC)
apps/api/src/tenant/routes/inventory/purchase-orders.route.ts (~350 LOC)
apps/api/src/tenant/routes/inventory/transfers.route.ts       (~250 LOC)
apps/api/src/tenant/routes/inventory/stock-counts.route.ts    (~250 LOC)
```

### apps/api — Jobs (~2 files)

```
apps/api/src/jobs/inventory-expiry.job.ts      (~100 LOC)
apps/api/src/jobs/inventory-reorder.job.ts     (~80 LOC)
```

### apps/api — Tests (~3 files)

```
apps/api/src/tenant/services/__tests__/inventory-stock.test.ts    (~300 LOC)
apps/api/src/tenant/services/__tests__/purchase-order.test.ts     (~250 LOC)
apps/api/src/tenant/routes/__tests__/inventory.test.ts            (~300 LOC)
```

### apps/admin — Frontend (~17 component files + 5 hooks)

```
apps/admin/src/features/inventory/pages/InventoryListPage.tsx         (~500 LOC)
apps/admin/src/features/inventory/pages/InventoryFormPage.tsx         (~450 LOC)
apps/admin/src/features/inventory/pages/ItemStockPage.tsx             (~300 LOC)
apps/admin/src/features/inventory/pages/InventoryCategoryPage.tsx     (~300 LOC)
apps/admin/src/features/inventory/pages/SupplierListPage.tsx          (~350 LOC)
apps/admin/src/features/inventory/pages/SupplierFormPage.tsx          (~400 LOC)
apps/admin/src/features/inventory/pages/PurchaseOrderListPage.tsx     (~350 LOC)
apps/admin/src/features/inventory/pages/PurchaseOrderFormPage.tsx     (~400 LOC)
apps/admin/src/features/inventory/pages/PurchaseOrderDetailPage.tsx   (~400 LOC)
apps/admin/src/features/inventory/pages/StockTransferListPage.tsx     (~300 LOC)
apps/admin/src/features/inventory/pages/StockTransferFormPage.tsx     (~300 LOC)
apps/admin/src/features/inventory/pages/StockCountListPage.tsx        (~300 LOC)
apps/admin/src/features/inventory/pages/StockCountFormPage.tsx        (~350 LOC)
apps/admin/src/features/inventory/pages/ExpiryDashboardPage.tsx       (~350 LOC)
apps/admin/src/features/inventory/pages/InventoryReportPage.tsx       (~400 LOC)
apps/admin/src/features/inventory/hooks/useInventory.ts               (~250 LOC)
apps/admin/src/features/inventory/hooks/useSuppliers.ts               (~150 LOC)
apps/admin/src/features/inventory/hooks/usePurchaseOrders.ts          (~200 LOC)
apps/admin/src/features/inventory/hooks/useTransfers.ts               (~150 LOC)
apps/admin/src/features/inventory/hooks/useStockCounts.ts             (~150 LOC)
```

### Total New Code Estimate

| Layer                        | Files               | Estimated LOC   |
| :--------------------------- | :------------------ | :-------------- |
| Shared schemas               | 1                   | ~350            |
| API models                   | 8                   | ~630            |
| API services                 | 6                   | ~1,750          |
| API routes                   | 6                   | ~1,600          |
| API jobs                     | 2                   | ~180            |
| API tests                    | 3                   | ~850            |
| Report pipelines (additions) | 0 (modify existing) | ~500            |
| Admin frontend pages         | 15                  | ~5,250          |
| Admin frontend hooks         | 5                   | ~900            |
| Sidebar + Router updates     | 0 (modify existing) | ~100            |
| **Total**                    | **~46 new files**   | **~12,110 LOC** |

---

## Dependencies

### npm Packages (already in project)

- `@fast-csv/format` — CSV export (already used by report-export)
- `exceljs` — Excel export (already used by report-export)
- `@react-pdf/renderer` — PDF export (already used by report-export)

### New npm Package (1)

- `html5-qrcode` — Barcode/QR scanner for web (`apps/admin` only)

---

## Risk Mitigation

| Risk                                  | Likelihood | Impact | Mitigation                                                                  |
| :------------------------------------ | :--------- | :----- | :-------------------------------------------------------------------------- |
| Stock valuation complexity (FIFO)     | Medium     | Medium | Implement weighted_average first as default, add FIFO as secondary          |
| Batch tracking complexity             | Medium     | Medium | Start with optional batches, enforce only when `requireBatchOnReceive=true` |
| Cross-module integration breaks       | Low        | High   | Run full test suite after each integration (procedures, invoices)           |
| 15 frontend pages scope creep         | Medium     | Medium | Use consistent page templates, share table/form patterns                    |
| Barcode scanner browser compatibility | Low        | Low    | Fallback to manual barcode entry input                                      |

---

## Success Criteria

1. ✅ All 8 Mongoose models created with proper indexes
2. ✅ All ~59 API endpoints working with RBAC
3. ✅ All 17 admin frontend pages functional
4. ✅ 36 total reports (26 existing + 10 new inventory)
5. ✅ Stock deduction on procedure/treatment works
6. ✅ PO → Receive → Stock update flow works
7. ✅ Transfer between branches with approval works
8. ✅ Stock count with discrepancy adjustment works
9. ✅ Expiry cron + dashboard works
10. ✅ All exports (CSV/Excel/PDF) work for inventory reports
11. ✅ ~52 new tests passing
12. ✅ Build clean, zero TypeScript errors, lint passing

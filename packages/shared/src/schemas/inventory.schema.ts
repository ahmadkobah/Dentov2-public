import { z } from 'zod';

// ── Reusable Helpers ────────────────────────────────────────

const objectId = z.string().min(1);
const dateString = z.string().date();

// ── Inventory Enums ─────────────────────────────────────────

export const inventoryUnitEnum = z.enum([
  'piece',
  'box',
  'pack',
  'bottle',
  'tube',
  'ml',
  'liter',
  'gram',
  'kg',
  'unit',
  'syringe',
  'capsule',
]);

export const barcodeTypeEnum = z.enum(['ean13', 'code128', 'qr', 'datamatrix']);

export const valuationMethodEnum = z.enum(['fifo', 'weighted_average', 'last_purchase']);

export const movementTypeEnum = z.enum([
  'purchase',
  'sale',
  'adjustment_add',
  'adjustment_remove',
  'transfer_in',
  'transfer_out',
  'expired',
  'damaged',
  'return_supplier',
  'return_patient',
  'consumed',
  'reserved',
  'unreserved',
]);

export const movementReferenceTypeEnum = z.enum([
  'invoice',
  'purchase_order',
  'transfer',
  'procedure_note',
  'treatment_plan',
  'appointment',
  'manual',
  'stock_count',
  'expiry_check',
]);

export const batchStatusEnum = z.enum(['active', 'expired', 'recalled', 'quarantine']);

export const purchaseOrderStatusEnum = z.enum([
  'draft',
  'submitted',
  'confirmed',
  'shipped',
  'partially_received',
  'received',
  'cancelled',
]);

export const transferStatusEnum = z.enum(['draft', 'in_transit', 'received', 'cancelled']);

export const stockCountStatusEnum = z.enum(['in_progress', 'completed', 'approved', 'cancelled']);

export const stockCountTypeEnum = z.enum(['full', 'partial', 'spot_check']);

export const qualityCheckEnum = z.enum(['passed', 'partial', 'failed']);

export const poAttachmentTypeEnum = z.enum(['invoice', 'delivery_note', 'certificate']);

// ── Inventory Category Schemas ──────────────────────────────

export const createInventoryCategorySchema = z
  .object({
    nameEn: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional().default(''),
    parentId: objectId.nullable().optional().default(null),
    description: z.string().max(500).optional().default(''),
    icon: z.string().max(50).optional().default(''),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();

export const updateInventoryCategorySchema = createInventoryCategorySchema.partial().strict();

export const inventoryCategoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    parentId: objectId.nullable().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    search: z.string().max(100).optional(),
  })
  .strict();

// ── Inventory Item Schemas ──────────────────────────────────

export const createInventoryItemSchema = z
  .object({
    sku: z.string().min(1).max(50).optional(), // Auto-generated if omitted
    nameEn: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional().default(''),
    categoryId: objectId,
    description: z.string().max(1000).optional().default(''),
    unit: inventoryUnitEnum.default('piece'),
    unitsPerPackage: z.number().int().min(1).default(1),
    unitCost: z.number().min(0).default(0),
    sellingPrice: z.number().min(0).optional().default(0),
    marginPercent: z.number().min(0).max(100).optional().default(0),
    reorderLevel: z.number().int().min(0).default(10),
    reorderQuantity: z.number().int().min(1).default(50),
    minStockLevel: z.number().int().min(0).default(0),
    maxStockLevel: z.number().int().min(0).optional().default(0),
    isConsumable: z.boolean().default(true),
    requiresPrescription: z.boolean().default(false),
    imageUrl: z.string().max(500).optional().default(''),
    barcode: z.string().max(100).optional().default(''),
    barcodeType: barcodeTypeEnum.optional(),
    manufacturer: z.string().max(200).optional().default(''),
    manufacturerRef: z.string().max(100).optional().default(''),
    defaultSupplierId: objectId.optional(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const updateInventoryItemSchema = createInventoryItemSchema.partial().strict();

export const inventoryItemQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    categoryId: objectId.optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    isConsumable: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    lowStock: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['nameEn', 'sku', 'unitCost', 'createdAt', 'categoryId']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const barcodeSearchSchema = z
  .object({
    code: z.string().min(1).max(100),
  })
  .strict();

// ── Stock Adjustment Schema ─────────────────────────────────

export const stockAdjustmentSchema = z
  .object({
    branchId: objectId,
    quantity: z.number().int().min(1),
    type: z.enum(['adjustment_add', 'adjustment_remove']),
    reason: z.string().max(500).optional().default(''),
    batchNumber: z.string().max(100).optional(),
    lotNumber: z.string().max(100).optional(),
    expiryDate: dateString.optional(),
    unitCost: z.number().min(0).optional(),
  })
  .strict();

// ── Supplier Schemas ────────────────────────────────────────

export const supplierAddressSchema = z
  .object({
    street: z.string().max(300).optional().default(''),
    city: z.string().max(100).optional().default(''),
    state: z.string().max(100).optional().default(''),
    country: z.string().max(100).optional().default(''),
    postalCode: z.string().max(20).optional().default(''),
  })
  .strict();

export const supplierPaymentTermsSchema = z
  .object({
    paymentDays: z.number().int().min(0).optional().default(30),
    creditLimit: z.number().min(0).optional().default(0),
    discountPercentage: z.number().min(0).max(100).optional().default(0),
    discountDays: z.number().int().min(0).optional().default(0),
  })
  .strict();

export const createSupplierSchema = z
  .object({
    name: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional().default(''),
    contactPerson: z.string().max(200).optional().default(''),
    phone: z.string().max(20).optional().default(''),
    email: z.string().email().optional().or(z.literal('')).default(''),
    address: supplierAddressSchema.optional(),
    taxNumber: z.string().max(50).optional().default(''),
    commercialRegister: z.string().max(50).optional().default(''),
    paymentTerms: supplierPaymentTermsSchema.optional(),
    rating: z.number().min(0).max(5).optional().default(0),
    website: z.string().max(300).optional().default(''),
    notes: z.string().max(2000).optional().default(''),
  })
  .strict();

export const updateSupplierSchema = createSupplierSchema.partial().strict();

export const supplierQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sortBy: z.enum(['name', 'rating', 'totalOrders', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Purchase Order Schemas ──────────────────────────────────

export const purchaseOrderItemSchema = z
  .object({
    itemId: objectId,
    quantity: z.number().int().min(1),
    unitCost: z.number().min(0),
    notes: z.string().max(500).optional().default(''),
  })
  .strict();

export const createPurchaseOrderSchema = z
  .object({
    supplierId: objectId,
    branchId: objectId,
    items: z.array(purchaseOrderItemSchema).min(1),
    expectedDate: dateString.optional(),
    taxPercent: z.number().min(0).max(100).optional().default(0),
    discount: z.number().min(0).optional().default(0),
    notes: z.string().max(2000).optional().default(''),
  })
  .strict();

export const updatePurchaseOrderSchema = z
  .object({
    items: z.array(purchaseOrderItemSchema).min(1).optional(),
    expectedDate: dateString.optional(),
    taxPercent: z.number().min(0).max(100).optional(),
    discount: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const purchaseOrderStatusUpdateSchema = z
  .object({
    status: purchaseOrderStatusEnum,
    notes: z.string().max(500).optional(),
  })
  .strict();

export const receivePurchaseOrderItemSchema = z
  .object({
    itemId: objectId,
    receivedQuantity: z.number().int().min(0),
    batchNumber: z.string().max(100).optional().default(''),
    expiryDate: dateString.optional(),
    notes: z.string().max(500).optional().default(''),
  })
  .strict();

export const receivePurchaseOrderSchema = z
  .object({
    items: z.array(receivePurchaseOrderItemSchema).min(1),
    receivingNotes: z.string().max(2000).optional().default(''),
    qualityCheck: qualityCheckEnum.optional(),
  })
  .strict();

export const purchaseOrderQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    supplierId: objectId.optional(),
    branchId: objectId.optional(),
    status: purchaseOrderStatusEnum.optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
    sortBy: z.enum(['orderDate', 'expectedDate', 'total', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Stock Transfer Schemas ──────────────────────────────────

export const transferItemSchema = z
  .object({
    itemId: objectId,
    quantity: z.number().int().min(1),
    batchNumber: z.string().max(100).optional().default(''),
    notes: z.string().max(500).optional().default(''),
  })
  .strict();

export const createStockTransferSchema = z
  .object({
    fromBranchId: objectId,
    toBranchId: objectId,
    items: z.array(transferItemSchema).min(1),
    notes: z.string().max(2000).optional().default(''),
  })
  .strict();

export const updateTransferStatusSchema = z
  .object({
    action: z.enum(['approve', 'reject', 'ship', 'receive', 'cancel']),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const stockTransferQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    fromBranchId: objectId.optional(),
    toBranchId: objectId.optional(),
    status: transferStatusEnum.optional(),
    sortBy: z.enum(['createdAt', 'requestedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Stock Count Schemas ─────────────────────────────────────

export const stockCountItemSchema = z
  .object({
    itemId: objectId,
    countedQuantity: z.number().int().min(0),
    notes: z.string().max(500).optional().default(''),
  })
  .strict();

export const createStockCountSchema = z
  .object({
    branchId: objectId,
    countType: stockCountTypeEnum.default('full'),
    items: z.array(stockCountItemSchema).min(1),
    notes: z.string().max(2000).optional().default(''),
  })
  .strict();

export const updateStockCountSchema = z
  .object({
    items: z.array(stockCountItemSchema).min(1).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const applyStockCountSchema = z
  .object({
    itemIds: z.array(objectId).min(1), // Which items to apply adjustments for
    notes: z.string().max(500).optional(),
  })
  .strict();

export const stockCountQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    branchId: objectId.optional(),
    status: stockCountStatusEnum.optional(),
    countType: stockCountTypeEnum.optional(),
    sortBy: z.enum(['createdAt', 'startedAt', 'completedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// ── Inventory Query (Shared Filters) ────────────────────────

export const inventoryMovementQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    itemId: objectId.optional(),
    branchId: objectId.optional(),
    movementType: movementTypeEnum.optional(),
    referenceType: movementReferenceTypeEnum.optional(),
    dateFrom: dateString.optional(),
    dateTo: dateString.optional(),
    sortBy: z.enum(['createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const expiryQuerySchema = z
  .object({
    branchId: objectId.optional(),
    daysAhead: z.coerce.number().int().min(1).max(365).default(90),
    status: batchStatusEnum.optional(),
  })
  .strict();

export const bulkDisposeSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            stockId: objectId,
            batchNumber: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    notes: z.string().max(500).optional().default(''),
  })
  .strict();

// ── Inferred Types ──────────────────────────────────────────

// Category
export type CreateInventoryCategoryInput = z.infer<typeof createInventoryCategorySchema>;
export type UpdateInventoryCategoryInput = z.infer<typeof updateInventoryCategorySchema>;
export type InventoryCategoryQuery = z.infer<typeof inventoryCategoryQuerySchema>;

// Item
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type InventoryItemQuery = z.infer<typeof inventoryItemQuerySchema>;
export type BarcodeSearch = z.infer<typeof barcodeSearchSchema>;

// Stock Adjustment
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

// Supplier
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierQuery = z.infer<typeof supplierQuerySchema>;

// Purchase Order
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderStatusUpdateInput = z.infer<typeof purchaseOrderStatusUpdateSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
export type PurchaseOrderQuery = z.infer<typeof purchaseOrderQuerySchema>;

// Stock Transfer
export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;
export type UpdateTransferStatusInput = z.infer<typeof updateTransferStatusSchema>;
export type StockTransferQuery = z.infer<typeof stockTransferQuerySchema>;

// Stock Count
export type CreateStockCountInput = z.infer<typeof createStockCountSchema>;
export type UpdateStockCountInput = z.infer<typeof updateStockCountSchema>;
export type ApplyStockCountInput = z.infer<typeof applyStockCountSchema>;
export type StockCountQuery = z.infer<typeof stockCountQuerySchema>;

// Movement
export type InventoryMovementQuery = z.infer<typeof inventoryMovementQuerySchema>;

// Expiry
export type ExpiryQuery = z.infer<typeof expiryQuerySchema>;
export type BulkDisposeInput = z.infer<typeof bulkDisposeSchema>;

// Enums
export type InventoryUnit = z.infer<typeof inventoryUnitEnum>;
export type BarcodeType = z.infer<typeof barcodeTypeEnum>;
export type ValuationMethod = z.infer<typeof valuationMethodEnum>;
export type MovementType = z.infer<typeof movementTypeEnum>;
export type MovementReferenceType = z.infer<typeof movementReferenceTypeEnum>;
export type BatchStatus = z.infer<typeof batchStatusEnum>;
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusEnum>;
export type TransferStatus = z.infer<typeof transferStatusEnum>;
export type StockCountStatus = z.infer<typeof stockCountStatusEnum>;
export type StockCountType = z.infer<typeof stockCountTypeEnum>;
export type QualityCheck = z.infer<typeof qualityCheckEnum>;

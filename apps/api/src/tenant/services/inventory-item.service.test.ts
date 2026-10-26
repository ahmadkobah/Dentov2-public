/**
 * InventoryItemService — Unit Tests
 *
 * Tests CRUD, stock adjustment (FIFO), barcode search,
 * low-stock aggregation, soft-delete guards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryItemService } from './inventory-item.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockItem = {
  _id: 'item-1',
  sku: 'SKU-001',
  nameEn: 'Composite Filling',
  nameAr: 'حشوة',
  categoryId: 'cat-1',
  unit: 'piece',
  unitCost: 25,
  isActive: true,
  reorderLevel: 10,
  reorderQuantity: 50,
  isConsumable: true,
  barcode: 'BC-001',
  createdBy: 'user-1',
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn().mockReturnThis(),
};

const mockStock = {
  _id: 'stock-1',
  itemId: 'item-1',
  branchId: 'branch-1',
  quantity: 100,
  reservedQuantity: 5,
  availableQuantity: 95,
  batches: [
    {
      batchNumber: 'B001',
      lotNumber: 'L001',
      expiryDate: new Date('2027-01-01'),
      quantity: 60,
      receivedDate: new Date('2025-01-01'),
      unitCost: 25,
      status: 'active',
    },
    {
      batchNumber: 'B002',
      lotNumber: 'L002',
      expiryDate: new Date('2027-06-01'),
      quantity: 40,
      receivedDate: new Date('2025-06-01'),
      unitCost: 28,
      status: 'active',
    },
  ],
  save: vi.fn().mockResolvedValue(undefined),
};

function chainable<T>(value: T) {
  const chain: Record<string, unknown> = {
    lean: vi.fn().mockResolvedValue(value),
    select: vi.fn(),
    populate: vi.fn(),
    sort: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  };
  for (const k of ['select', 'populate', 'sort', 'skip', 'limit']) {
    (chain[k] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  }
  return chain;
}

function createMockItemModel() {
  return {
    find: vi.fn().mockImplementation(() => chainable([mockItem])),
    findById: vi.fn().mockImplementation(() => chainable(mockItem)),
    findOne: vi.fn().mockImplementation(() => chainable(mockItem)),
    countDocuments: vi.fn().mockResolvedValue(1),
    aggregate: vi.fn().mockResolvedValue([{ items: [mockItem], count: [{ total: 1 }] }]),
  };
}

function createMockStockModel() {
  return {
    find: vi.fn().mockImplementation(() => chainable([mockStock])),
    findOne: vi.fn().mockImplementation(() => chainable(null)),
    aggregate: vi.fn().mockResolvedValue([]),
  };
}

function createMockMovementModel() {
  return {
    find: vi.fn().mockImplementation(() => chainable([])),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
  };
}

function createMockCategoryModel() {
  return {
    findById: vi.fn().mockImplementation(() => chainable({ _id: 'cat-1', nameEn: 'Materials' })),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../jobs/queue.js', () => ({
  getQueue: vi.fn(() => ({ add: vi.fn().mockResolvedValue(undefined) })),
  QUEUE_NAMES: { INVENTORY_AUTO_REORDER: 'inventory-auto-reorder' },
}));

vi.mock('../models/inventory-item.model.js', () => ({
  getInventoryItemModel: vi.fn(() => createMockItemModel()),
}));

vi.mock('../models/inventory-stock.model.js', () => ({
  getInventoryStockModel: vi.fn(() => createMockStockModel()),
}));

vi.mock('../models/inventory-movement.model.js', () => ({
  getInventoryMovementModel: vi.fn(() => createMockMovementModel()),
}));

vi.mock('../models/inventory-category.model.js', () => ({
  getInventoryCategoryModel: vi.fn(() => createMockCategoryModel()),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InventoryItemService', () => {
  let service: InventoryItemService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryItemService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated items', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should apply search filter', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        search: 'composite',
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });

    it('should delegate to getLowStockItems when lowStock=true', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        lowStock: true,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.meta).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return item by ID', async () => {
      const result = await service.getById('item-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFound for missing item', async () => {
      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        findById: vi.fn().mockImplementation(() => chainable(null)),
      });

      const svc = new InventoryItemService(mockConnection);
      await expect(svc.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should create an item with category validation', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const toObjectFn = vi.fn().mockReturnValue({ ...mockItem, _id: 'item-new' });

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      const mockModel = createMockItemModel();
      // Mock constructor behavior — Item is used as `new this.Item()`
      const MockConstructor = vi.fn().mockImplementation(function () {
        return {
          save: saveFn,
          toObject: toObjectFn,
          sku: 'SKU-001',
          _id: 'item-new',
        };
      });
      Object.assign(MockConstructor, mockModel);
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce(MockConstructor);

      const svc = new InventoryItemService(mockConnection);
      const result = await svc.create(
        {
          sku: 'SKU-002',
          nameEn: 'New Item',
          nameAr: 'عنصر جديد',
          categoryId: 'cat-1',
          unit: 'piece',
          unitCost: 30,
          sellingPrice: 50,
          isConsumable: true,
          trackBatches: true,
          reorderLevel: 10,
          reorderQuantity: 50,
        } as any,
        'user-1',
      );

      expect(result).toBeDefined();
      expect(saveFn).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an item', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const itemDoc = {
        ...mockItem,
        save: saveFn,
        toObject: vi.fn().mockReturnValue({ ...mockItem, nameEn: 'Updated' }),
      };

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        findById: vi.fn().mockResolvedValue(itemDoc),
      });

      const svc = new InventoryItemService(mockConnection);
      const result = await svc.update('item-1', { nameEn: 'Updated' } as any, 'user-1');

      expect(result).toBeDefined();
      expect(saveFn).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should block if item has reserved stock', async () => {
      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ reservedQuantity: 5 }),
        }),
      });

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        findById: vi.fn().mockResolvedValue({ ...mockItem, save: vi.fn() }),
      });

      const svc = new InventoryItemService(mockConnection);
      await expect(svc.softDelete('item-1', 'user-1')).rejects.toThrow('Cannot deactivate item');
    });

    it('should deactivate item when no reserved stock', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const itemDoc = {
        ...mockItem,
        save: saveFn,
        toObject: vi.fn().mockReturnValue({ ...mockItem, isActive: false }),
      };

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        findById: vi.fn().mockResolvedValue(itemDoc),
      });

      const svc = new InventoryItemService(mockConnection);
      const result = await svc.softDelete('item-1', 'user-1');

      expect(itemDoc.isActive).toBe(false);
      expect(saveFn).toHaveBeenCalled();
    });
  });

  describe('adjustStock', () => {
    it('should add stock with movement creation', async () => {
      const stockSaveFn = vi.fn().mockResolvedValue(undefined);
      const stockDoc = {
        ...mockStock,
        batches: [...mockStock.batches],
        save: stockSaveFn,
      };

      const movementCreateFn = vi.fn().mockResolvedValue({});

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        findById: vi.fn().mockResolvedValue({ ...mockItem, unitCost: 25 }),
      });

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findOne: vi.fn().mockResolvedValue(stockDoc),
      });

      const { getInventoryMovementModel } = await import('../models/inventory-movement.model.js');
      (getInventoryMovementModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockMovementModel(),
        create: movementCreateFn,
      });

      const svc = new InventoryItemService(mockConnection);
      await svc.adjustStock(
        'item-1',
        {
          branchId: 'branch-1',
          type: 'adjustment_add',
          quantity: 10,
          reason: 'Restock',
        } as any,
        'user-1',
      );

      expect(stockSaveFn).toHaveBeenCalled();
      expect(movementCreateFn).toHaveBeenCalled();
    });

    it('should remove stock using FIFO batch consumption', async () => {
      const batch1 = {
        batchNumber: 'B001',
        quantity: 60,
        receivedDate: new Date('2025-01-01'),
        status: 'active',
      };
      const batch2 = {
        batchNumber: 'B002',
        quantity: 40,
        receivedDate: new Date('2025-06-01'),
        status: 'active',
      };
      const stockSaveFn = vi.fn().mockResolvedValue(undefined);
      const stockDoc = {
        ...mockStock,
        quantity: 100,
        batches: [batch1, batch2],
        save: stockSaveFn,
      };

      const movementCreateFn = vi.fn().mockResolvedValue({});

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        findById: vi.fn().mockResolvedValue({ ...mockItem }),
      });

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findOne: vi.fn().mockResolvedValue(stockDoc),
      });

      const { getInventoryMovementModel } = await import('../models/inventory-movement.model.js');
      (getInventoryMovementModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockMovementModel(),
        create: movementCreateFn,
      });

      const svc = new InventoryItemService(mockConnection);
      await svc.adjustStock(
        'item-1',
        {
          branchId: 'branch-1',
          type: 'adjustment_remove',
          quantity: 70,
          reason: 'Usage',
        } as any,
        'user-1',
      );

      // FIFO: first batch fully consumed (60→0), second partially (40→30)
      expect(batch1.quantity).toBe(0);
      expect(batch2.quantity).toBe(30);
      expect(stockDoc.quantity).toBe(30);
      expect(movementCreateFn).toHaveBeenCalled();
    });
  });

  describe('findByBarcode', () => {
    it('should return item by barcode', async () => {
      const result = await service.findByBarcode({ code: 'BC-001' });
      expect(result).toBeDefined();
    });
  });
});

/**
 * InventoryStockService — Unit Tests
 *
 * Tests branch stock queries, expiry monitoring, batch disposal,
 * stock reservation, valuation recalculation, and expired batch processing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryStockService } from './inventory-stock.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockStock = {
  _id: 'stock-1',
  itemId: 'item-1',
  branchId: 'branch-1',
  quantity: 100,
  reservedQuantity: 10,
  availableQuantity: 90,
  stockValue: 2500,
  valuationMethod: 'fifo',
  weightedAvgCost: 0,
  batches: [
    {
      batchNumber: 'B001',
      lotNumber: 'L001',
      expiryDate: new Date('2024-01-01'), // expired
      quantity: 20,
      receivedDate: new Date('2023-01-01'),
      unitCost: 25,
      status: 'active',
    },
    {
      batchNumber: 'B002',
      lotNumber: 'L002',
      expiryDate: new Date('2027-06-01'),
      quantity: 80,
      receivedDate: new Date('2025-06-01'),
      unitCost: 28,
      status: 'active',
    },
  ],
  save: vi.fn().mockResolvedValue(undefined),
};

function createMockStockModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([mockStock]),
            }),
          }),
        }),
      }),
    }),
    findById: vi
      .fn()
      .mockResolvedValue({ ...mockStock, save: vi.fn().mockResolvedValue(undefined) }),
    findOne: vi
      .fn()
      .mockResolvedValue({ ...mockStock, save: vi.fn().mockResolvedValue(undefined) }),
    countDocuments: vi.fn().mockResolvedValue(1),
    aggregate: vi.fn().mockResolvedValue([
      {
        _id: null,
        totalItems: 5,
        totalQuantity: 500,
        totalReserved: 20,
        totalAvailable: 480,
        totalValue: 12500,
      },
    ]),
  };
}

function createMockMovementModel() {
  return {
    create: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue([]),
  };
}

function createMockItemModel() {
  return {
    findById: vi.fn().mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue({ _id: 'item-1', sku: 'SKU-001', nameEn: 'Test Item', unitCost: 25 }),
    }),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../models/inventory-stock.model.js', () => ({
  getInventoryStockModel: vi.fn(() => createMockStockModel()),
}));

vi.mock('../models/inventory-movement.model.js', () => ({
  getInventoryMovementModel: vi.fn(() => createMockMovementModel()),
}));

vi.mock('../models/inventory-item.model.js', () => ({
  getInventoryItemModel: vi.fn(() => createMockItemModel()),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InventoryStockService', () => {
  let service: InventoryStockService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryStockService(mockConnection);
  });

  describe('getStockByBranch', () => {
    it('should return paginated stock for branch', async () => {
      const result = await service.getStockByBranch('branch-1', { page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('getExpiringBatches', () => {
    it('should return batches within days window', async () => {
      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      const aggregateFn = vi.fn().mockResolvedValue([
        {
          itemId: 'item-1',
          batches: { batchNumber: 'B001', expiryDate: new Date('2026-04-01') },
        },
      ]);
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        aggregate: aggregateFn,
      });

      const svc = new InventoryStockService(mockConnection);
      const result = await svc.getExpiringBatches({ daysAhead: 90, page: 1, limit: 100 });

      expect(result).toBeDefined();
      expect(aggregateFn).toHaveBeenCalled();
    });
  });

  describe('disposeBatch', () => {
    it('should mark batch as expired and create movement', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const createFn = vi.fn().mockResolvedValue({});
      const batch = {
        batchNumber: 'B001',
        status: 'active',
        quantity: 20,
        unitCost: 25,
        lotNumber: 'L001',
        expiryDate: new Date(),
      };
      const stockDoc = {
        ...mockStock,
        batches: [batch],
        quantity: 100,
        itemId: 'item-1',
        branchId: 'branch-1',
        save: saveFn,
      };

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findById: vi.fn().mockResolvedValue(stockDoc),
      });

      const { getInventoryMovementModel } = await import('../models/inventory-movement.model.js');
      (getInventoryMovementModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockMovementModel(),
        create: createFn,
      });

      const svc = new InventoryStockService(mockConnection);
      const result = await svc.disposeBatch('stock-1', 'B001', 'user-1');

      expect(result.disposedQuantity).toBe(20);
      expect(batch.status).toBe('expired');
      expect(batch.quantity).toBe(0);
      expect(saveFn).toHaveBeenCalled();
      expect(createFn).toHaveBeenCalled();
    });
  });

  describe('bulkDispose', () => {
    it('should process multiple disposals', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const createFn = vi.fn().mockResolvedValue({});
      const batch = {
        batchNumber: 'B001',
        status: 'active',
        quantity: 10,
        unitCost: 25,
        lotNumber: 'L001',
        expiryDate: new Date(),
      };
      const stockDoc = { ...mockStock, batches: [batch], quantity: 50, save: saveFn };

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findById: vi.fn().mockResolvedValue(stockDoc),
      });

      const { getInventoryMovementModel } = await import('../models/inventory-movement.model.js');
      (getInventoryMovementModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockMovementModel(),
        create: createFn,
      });

      const svc = new InventoryStockService(mockConnection);
      const result = await svc.bulkDispose(
        { items: [{ stockId: 'stock-1', batchNumber: 'B001' }] },
        'user-1',
      );

      expect(result.disposed).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('reserveStock', () => {
    it('should increase reserved quantity', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const createFn = vi.fn().mockResolvedValue({});
      const stockDoc = {
        ...mockStock,
        reservedQuantity: 10,
        availableQuantity: 90,
        quantity: 100,
        save: saveFn,
      };

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findOne: vi.fn().mockResolvedValue(stockDoc),
      });

      const { getInventoryMovementModel } = await import('../models/inventory-movement.model.js');
      (getInventoryMovementModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockMovementModel(),
        create: createFn,
      });

      const svc = new InventoryStockService(mockConnection);
      await svc.reserveStock('item-1', 'branch-1', 5, 'user-1');

      expect(stockDoc.reservedQuantity).toBe(15);
      expect(saveFn).toHaveBeenCalled();
      expect(createFn).toHaveBeenCalled();
    });
  });

  describe('unreserveStock', () => {
    it('should decrease reserved quantity', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const createFn = vi.fn().mockResolvedValue({});
      const stockDoc = { ...mockStock, reservedQuantity: 10, quantity: 100, save: saveFn };

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findOne: vi.fn().mockResolvedValue(stockDoc),
      });

      const { getInventoryMovementModel } = await import('../models/inventory-movement.model.js');
      (getInventoryMovementModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockMovementModel(),
        create: createFn,
      });

      const svc = new InventoryStockService(mockConnection);
      await svc.unreserveStock('item-1', 'branch-1', 5, 'user-1');

      expect(stockDoc.reservedQuantity).toBe(5);
      expect(saveFn).toHaveBeenCalled();
    });
  });

  describe('recalculateStockValue', () => {
    it('should recalculate using FIFO method', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const stockDoc = {
        ...mockStock,
        valuationMethod: 'fifo',
        stockValue: 0,
        batches: [
          {
            batchNumber: 'B001',
            quantity: 40,
            unitCost: 25,
            status: 'active',
            receivedDate: new Date(),
          },
          {
            batchNumber: 'B002',
            quantity: 60,
            unitCost: 30,
            status: 'active',
            receivedDate: new Date(),
          },
        ],
        save: saveFn,
      };

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findById: vi.fn().mockResolvedValue(stockDoc),
      });

      const svc = new InventoryStockService(mockConnection);
      const result = await svc.recalculateStockValue('stock-1');

      // FIFO: 40*25 + 60*30 = 1000+1800 = 2800
      expect(result.stockValue).toBe(2800);
      expect(result.valuationMethod).toBe('fifo');
      expect(saveFn).toHaveBeenCalled();
    });

    it('should recalculate using weighted average method', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const stockDoc = {
        ...mockStock,
        valuationMethod: 'weighted_average',
        quantity: 100,
        stockValue: 0,
        weightedAvgCost: 0,
        batches: [
          {
            batchNumber: 'B001',
            quantity: 40,
            unitCost: 25,
            status: 'active',
            receivedDate: new Date(),
          },
          {
            batchNumber: 'B002',
            quantity: 60,
            unitCost: 30,
            status: 'active',
            receivedDate: new Date(),
          },
        ],
        save: saveFn,
      };

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        findById: vi.fn().mockResolvedValue(stockDoc),
      });

      const svc = new InventoryStockService(mockConnection);
      const result = await svc.recalculateStockValue('stock-1');

      // WAC: (40*25 + 60*30) / 100 = 28 → 100 * 28 = 2800
      expect(result.stockValue).toBe(2800);
      expect(result.valuationMethod).toBe('weighted_average');
    });
  });

  describe('getStockSummary', () => {
    it('should return aggregated KPIs', async () => {
      const result = await service.getStockSummary('aaaaaaaaaaaaaaaaaaaaaaaa');

      expect(result).toBeDefined();
      expect(result.totalItems).toBe(5);
      expect(result.totalQuantity).toBe(500);
      expect(result.totalValue).toBe(12500);
    });
  });

  describe('processExpiredBatches', () => {
    it('should scan all stock and mark expired batches', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const createFn = vi.fn().mockResolvedValue({});
      const expiredBatch = {
        batchNumber: 'B001',
        expiryDate: new Date('2024-01-01'),
        quantity: 20,
        unitCost: 25,
        lotNumber: 'L001',
        status: 'active',
      };
      const stockDocs = [
        {
          _id: 'stock-1',
          itemId: 'item-1',
          branchId: 'branch-1',
          quantity: 100,
          batches: [expiredBatch],
          save: saveFn,
        },
      ];

      const { getInventoryStockModel } = await import('../models/inventory-stock.model.js');
      (getInventoryStockModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockStockModel(),
        find: vi.fn().mockResolvedValue(stockDocs),
      });

      const { getInventoryMovementModel } = await import('../models/inventory-movement.model.js');
      (getInventoryMovementModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockMovementModel(),
        create: createFn,
      });

      const svc = new InventoryStockService(mockConnection);
      const result = await svc.processExpiredBatches();

      expect(result.processedCount).toBe(1);
      expect(expiredBatch.status).toBe('expired');
      expect(expiredBatch.quantity).toBe(0);
      expect(saveFn).toHaveBeenCalled();
      expect(createFn).toHaveBeenCalled();
    });
  });
});

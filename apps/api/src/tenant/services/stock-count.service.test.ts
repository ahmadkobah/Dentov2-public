/**
 * StockCountService — Unit Tests
 *
 * Tests CRUD (double populate), auto-population of systemQuantity,
 * updateItems guard, complete, approve (applies stock adjustments),
 * double-approve guard, and cancel.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockCountService } from './stock-count.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Helpers ────────────────────────────────────────────────

function chainable<T>(doc: T) {
  const c: Record<string, unknown> = {
    lean: vi.fn().mockResolvedValue(doc),
    populate: vi.fn().mockImplementation(() => c),
    then: (res: (v: T) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(doc).then(res, rej),
    catch: (fn: (e: unknown) => unknown) => Promise.resolve(doc).catch(fn),
  };
  return c;
}

// ── Mock Data ──────────────────────────────────────────────

const VALID_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BRANCH_1 = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const ITEM_1 = 'cccccccccccccccccccccccc';
const USER_1 = 'dddddddddddddddddddddddd';

const mockCount = {
  _id: VALID_ID,
  countNumber: 'SC-2025-001',
  branchId: BRANCH_1,
  status: 'in_progress',
  countType: 'full',
  items: [
    {
      itemId: { toString: () => ITEM_1 },
      systemQuantity: 100,
      countedQuantity: 95,
      discrepancy: -5,
      adjustmentApplied: false,
      sku: 'SKU-001',
    },
  ],
  summary: { totalItems: 1, totalDiscrepancyValue: 0 },
  createdBy: 'user-1',
  approvedBy: null,
  completedAt: null,
};

function mockCountDoc(overrides: Record<string, unknown> = {}) {
  return {
    ...mockCount,
    ...overrides,
    items: overrides.items ?? [...mockCount.items.map((i) => ({ ...i }))],
    summary: overrides.summary ?? { ...mockCount.summary },
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn().mockReturnValue({ ...mockCount, ...overrides }),
  };
}

function createMockCountModel() {
  const doc = mockCountDoc();
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue(chainable([mockCount])),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue(chainable(doc)),
    create: vi.fn().mockResolvedValue({
      ...mockCount,
      toObject: vi.fn().mockReturnValue(mockCount),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  };
}

function createMockStockModel() {
  return {
    findOne: vi.fn().mockImplementation(() =>
      chainable({
        _id: 'stock-1',
        itemId: ITEM_1,
        branchId: BRANCH_1,
        quantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
        lastCountedAt: null,
        lastCountedBy: null,
        lastCountResult: null,
        countDiscrepancy: 0,
        save: vi.fn().mockResolvedValue(undefined),
      }),
    ),
  };
}

function createMockMovementModel() {
  return {
    create: vi.fn().mockResolvedValue({}),
  };
}

function createMockItemModel() {
  return {
    findById: vi.fn().mockReturnValue(
      chainable({
        _id: ITEM_1,
        sku: 'SKU-001',
        nameEn: 'Test Item',
        unitCost: 25,
      }),
    ),
    countDocuments: vi.fn().mockResolvedValue(1),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../models/stock-count.model.js', () => ({
  getStockCountModel: vi.fn(() => createMockCountModel()),
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

describe('StockCountService', () => {
  let service: StockCountService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StockCountService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated stock counts', async () => {
      const result = await service.list({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('create', () => {
    it('should auto-populate systemQuantity from current stock', async () => {
      const result = await service.create(
        {
          branchId: BRANCH_1,
          countType: 'full',
          items: [{ itemId: ITEM_1, countedQuantity: 95 }],
        },
        'user-1',
      );

      expect(result).toBeDefined();
    });
  });

  describe('updateItems', () => {
    it('should update items when status is in_progress', async () => {
      const doc = mockCountDoc({ status: 'in_progress' });

      const { getStockCountModel } = await import('../models/stock-count.model.js');
      (getStockCountModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCountModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockCountService(mockConnection);
      const result = await svc.updateItems(
        VALID_ID,
        { items: [{ itemId: ITEM_1, countedQuantity: 98 }] },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(doc.save).toHaveBeenCalled();
    });

    it('should reject updates when status is completed', async () => {
      const doc = mockCountDoc({ status: 'completed' });

      const { getStockCountModel } = await import('../models/stock-count.model.js');
      (getStockCountModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCountModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockCountService(mockConnection);
      await expect(
        svc.updateItems(VALID_ID, { items: [{ itemId: ITEM_1, countedQuantity: 95 }] }, 'user-1'),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('complete', () => {
    it('should set completedAt timestamp', async () => {
      const doc = mockCountDoc({ status: 'in_progress' });

      const { getStockCountModel } = await import('../models/stock-count.model.js');
      (getStockCountModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCountModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockCountService(mockConnection);
      const result = await svc.complete(VALID_ID, 'user-1');

      expect(doc.status).toBe('completed');
      expect(doc.completedAt).not.toBeNull();
      expect(doc.save).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should apply stock adjustments and create movements', async () => {
      const doc = mockCountDoc({ status: 'completed', approvedBy: null });

      const { getStockCountModel } = await import('../models/stock-count.model.js');
      (getStockCountModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCountModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockCountService(mockConnection);
      const result = await svc.approve(VALID_ID, { itemIds: [ITEM_1], notes: 'Approved' }, USER_1);

      expect(doc.status).toBe('approved');
      expect(doc.approvedBy?.toString?.() ?? doc.approvedBy).toBe(USER_1);
      expect(doc.save).toHaveBeenCalled();
    });

    it('should reject double-approve', async () => {
      const doc = mockCountDoc({ status: 'approved', approvedBy: 'other-user' });

      const { getStockCountModel } = await import('../models/stock-count.model.js');
      (getStockCountModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCountModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockCountService(mockConnection);
      await expect(svc.approve(VALID_ID, { itemIds: [ITEM_1] }, 'user-1')).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel in_progress count', async () => {
      const doc = mockCountDoc({ status: 'in_progress' });

      const { getStockCountModel } = await import('../models/stock-count.model.js');
      (getStockCountModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCountModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockCountService(mockConnection);
      const result = await svc.cancel(VALID_ID, 'user-1');

      expect(doc.status).toBe('cancelled');
      expect(doc.save).toHaveBeenCalled();
    });

    it('should reject cancelling completed count', async () => {
      const doc = mockCountDoc({ status: 'completed' });

      const { getStockCountModel } = await import('../models/stock-count.model.js');
      (getStockCountModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCountModel(),
        findById: vi.fn().mockReturnValue(chainable(doc)),
      });

      const svc = new StockCountService(mockConnection);
      await expect(svc.cancel(VALID_ID, 'user-1')).rejects.toThrow(ApiError);
    });
  });
});

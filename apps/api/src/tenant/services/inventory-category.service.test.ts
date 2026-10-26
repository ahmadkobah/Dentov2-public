/**
 * InventoryCategoryService — Unit Tests
 *
 * Tests CRUD, hierarchical validation, soft-delete guards, restore.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryCategoryService } from './inventory-category.service.js';
import { ApiError } from '../../utils/api-response.js';
import type { Connection } from 'mongoose';

// ── Mock Data ──────────────────────────────────────────────

const mockCategory = {
  _id: 'cat-1',
  nameEn: 'Restorative Materials',
  nameAr: 'مواد ترميمية',
  slug: 'restorative-materials',
  parentId: null,
  sortOrder: 1,
  isActive: true,
  createdBy: 'user-1',
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn().mockReturnThis(),
};

const mockChildCategory = {
  _id: 'cat-2',
  nameEn: 'Composites',
  nameAr: 'كومبوزيت',
  slug: 'composites',
  parentId: 'cat-1',
  sortOrder: 1,
  isActive: true,
  createdBy: 'user-1',
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn().mockReturnThis(),
};

function createMockCategoryModel() {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([mockCategory]),
            }),
          }),
        }),
      }),
    }),
    findById: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCategory),
      }),
      lean: vi.fn().mockResolvedValue(mockCategory),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
  };
}

function createMockItemModel() {
  return {
    countDocuments: vi.fn().mockResolvedValue(0),
  };
}

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../models/inventory-category.model.js', () => ({
  getInventoryCategoryModel: vi.fn(() => createMockCategoryModel()),
}));

vi.mock('../models/inventory-item.model.js', () => ({
  getInventoryItemModel: vi.fn(() => createMockItemModel()),
}));

// ── Tests ──────────────────────────────────────────────────

describe('InventoryCategoryService', () => {
  let service: InventoryCategoryService;
  const mockConnection = {} as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryCategoryService(mockConnection);
  });

  describe('list', () => {
    it('should return paginated categories', async () => {
      const result = await service.list({ page: 1, limit: 20 } as any);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply search/parentId/isActive filters', async () => {
      const result = await service.list({
        page: 1,
        limit: 20,
        search: 'restorative',
        parentId: null,
        isActive: true,
      } as any);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return category by ID', async () => {
      const result = await service.getById('cat-1');
      expect(result).toBeDefined();
      expect(result._id).toBe('cat-1');
    });

    it('should throw NotFound for missing category', async () => {
      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCategoryModel(),
        findById: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const svc = new InventoryCategoryService(mockConnection);
      await expect(svc.getById('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should create a root category', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const toObjectFn = vi.fn().mockReturnValue({ ...mockCategory, _id: 'cat-new' });

      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      const mockModel = createMockCategoryModel();
      const MockConstructor = vi.fn().mockImplementation(function () {
        return {
          save: saveFn,
          toObject: toObjectFn,
          slug: 'new-category',
          _id: 'cat-new',
        };
      });
      Object.assign(MockConstructor, mockModel);
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce(MockConstructor);

      const svc = new InventoryCategoryService(mockConnection);
      const result = await svc.create(
        { nameEn: 'New Category', nameAr: 'فئة جديدة', slug: 'new-category' } as any,
        'user-1',
      );

      expect(result).toBeDefined();
      expect(saveFn).toHaveBeenCalled();
    });

    it('should validate parentId when creating a child category', async () => {
      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      const mockModel = createMockCategoryModel();

      // parentId lookup returns null → invalid parent
      const findByIdMock = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
        lean: vi.fn().mockResolvedValue(null),
      });

      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...mockModel,
        findById: findByIdMock,
      });

      const svc = new InventoryCategoryService(mockConnection);
      await expect(
        svc.create(
          { nameEn: 'Child', nameAr: 'فئة فرعية', slug: 'child', parentId: 'nonexistent' } as any,
          'user-1',
        ),
      ).rejects.toThrow('Invalid parentId');
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const catDoc = {
        ...mockCategory,
        save: saveFn,
        toObject: vi.fn().mockReturnValue({ ...mockCategory, nameEn: 'Updated' }),
      };

      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCategoryModel(),
        findById: vi.fn().mockResolvedValue(catDoc),
      });

      const svc = new InventoryCategoryService(mockConnection);
      const result = await svc.update('cat-1', { nameEn: 'Updated' } as any, 'user-1');

      expect(result).toBeDefined();
      expect(saveFn).toHaveBeenCalled();
    });

    it('should reject self-referencing parentId', async () => {
      const catDoc = {
        ...mockCategory,
        parentId: null,
        save: vi.fn(),
        toObject: vi.fn(),
      };

      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCategoryModel(),
        findById: vi.fn().mockResolvedValue(catDoc),
      });

      const svc = new InventoryCategoryService(mockConnection);
      await expect(svc.update('cat-1', { parentId: 'cat-1' } as any, 'user-1')).rejects.toThrow(
        'cannot be its own parent',
      );
    });
  });

  describe('softDelete', () => {
    it('should block if active items reference category', async () => {
      const catDoc = {
        ...mockCategory,
        save: vi.fn(),
        toObject: vi.fn(),
      };

      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCategoryModel(),
        findById: vi.fn().mockResolvedValue(catDoc),
      });

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        countDocuments: vi.fn().mockResolvedValue(3),
      });

      const svc = new InventoryCategoryService(mockConnection);
      await expect(svc.softDelete('cat-1', 'user-1')).rejects.toThrow('Cannot deactivate category');
    });

    it('should deactivate category when no items reference it', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const catDoc = {
        ...mockCategory,
        isActive: true,
        save: saveFn,
        toObject: vi.fn().mockReturnValue({ ...mockCategory, isActive: false }),
      };

      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCategoryModel(),
        findById: vi.fn().mockResolvedValue(catDoc),
      });

      const { getInventoryItemModel } = await import('../models/inventory-item.model.js');
      (getInventoryItemModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockItemModel(),
        countDocuments: vi.fn().mockResolvedValue(0),
      });

      const svc = new InventoryCategoryService(mockConnection);
      const result = await svc.softDelete('cat-1', 'user-1');

      expect(catDoc.isActive).toBe(false);
      expect(saveFn).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should restore a deactivated category', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const catDoc = {
        ...mockCategory,
        isActive: false,
        save: saveFn,
        toObject: vi.fn().mockReturnValue({ ...mockCategory, isActive: true }),
      };

      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCategoryModel(),
        findById: vi.fn().mockResolvedValue(catDoc),
      });

      const svc = new InventoryCategoryService(mockConnection);
      const result = await svc.restore('cat-1', 'user-1');

      expect(catDoc.isActive).toBe(true);
      expect(saveFn).toHaveBeenCalled();
    });

    it('should throw NotFound when restoring nonexistent category', async () => {
      const { getInventoryCategoryModel } = await import('../models/inventory-category.model.js');
      (getInventoryCategoryModel as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...createMockCategoryModel(),
        findById: vi.fn().mockResolvedValue(null),
      });

      const svc = new InventoryCategoryService(mockConnection);
      await expect(svc.restore('nonexistent', 'user-1')).rejects.toThrow(ApiError);
    });
  });
});

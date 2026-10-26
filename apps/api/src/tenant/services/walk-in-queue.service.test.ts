/**
 * WalkInQueueService — Unit Tests
 *
 * Focused on #84: the queue must be ordered by numeric priority
 * (emergency → urgent → normal), then FIFO by queueNumber — NOT by the
 * lexicographic string sort that ranked `emergency` last.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalkInQueueService } from './walk-in-queue.service.js';
import type { Connection } from 'mongoose';

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../plugins/socket.plugin.js', () => ({
  socketEmitter: { queueUpdate: vi.fn() },
}));

vi.mock('../../services/notification.service.js', () => ({
  NotificationService: class {
    send = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../models/walk-in-queue.model.js', () => ({
  getWalkInQueueModel: vi.fn(),
}));

vi.mock('../models/branch.model.js', () => ({
  getBranchModel: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────

/** A find() chain supporting .populate()/.select() → .lean(result). */
function findChain(result: unknown) {
  const chain: Record<string, unknown> = {
    populate: vi.fn(() => chain),
    select: vi.fn(() => chain),
    lean: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function branchModel() {
  return {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ avgConsultationTime: 30 }),
      }),
    }),
  };
}

// ── Tests ──────────────────────────────────────────────────

describe('WalkInQueueService — priority ordering (#84)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orders emergency → urgent → normal, then FIFO by queueNumber', async () => {
    // Intentionally unsorted; alphabetical string sort would rank emergency LAST.
    const docs = [
      { _id: 'n1', priority: 'normal', queueNumber: 1, status: 'waiting' },
      { _id: 'e5', priority: 'emergency', queueNumber: 5, status: 'waiting' },
      { _id: 'u3', priority: 'urgent', queueNumber: 3, status: 'waiting' },
      { _id: 'e2', priority: 'emergency', queueNumber: 2, status: 'waiting' },
      { _id: 'n4', priority: 'normal', queueNumber: 4, status: 'waiting' },
    ];

    const walkInModel = {
      // 1st find() = main list; 2nd find() = waiting-set for positions.
      find: vi
        .fn()
        .mockReturnValueOnce(findChain([...docs]))
        .mockReturnValueOnce(findChain([...docs])),
    };

    const { getWalkInQueueModel } = await import('../models/walk-in-queue.model.js');
    const { getBranchModel } = await import('../models/branch.model.js');
    (getWalkInQueueModel as ReturnType<typeof vi.fn>).mockReturnValue(walkInModel);
    (getBranchModel as ReturnType<typeof vi.fn>).mockReturnValue(branchModel());

    const service = new WalkInQueueService({ name: 'tenant_demo' } as Connection);
    const result = await service.list({ branchId: 'branch-1' });

    expect(result.entries.map((e) => (e as { _id: string })._id)).toEqual([
      'e2', // emergency, queue 2
      'e5', // emergency, queue 5
      'u3', // urgent
      'n1', // normal, queue 1
      'n4', // normal, queue 4
    ]);
    // Regression guard: emergency must never sort last.
    expect((result.entries[0] as { priority: string }).priority).toBe('emergency');
  });

  it('assigns queue positions by priority weight (emergency gets position 1)', async () => {
    const docs = [
      { _id: 'n1', priority: 'normal', queueNumber: 1, status: 'waiting' },
      { _id: 'e9', priority: 'emergency', queueNumber: 9, status: 'waiting' },
    ];

    const walkInModel = {
      find: vi
        .fn()
        .mockReturnValueOnce(findChain([...docs]))
        .mockReturnValueOnce(findChain([...docs])),
    };

    const { getWalkInQueueModel } = await import('../models/walk-in-queue.model.js');
    const { getBranchModel } = await import('../models/branch.model.js');
    (getWalkInQueueModel as ReturnType<typeof vi.fn>).mockReturnValue(walkInModel);
    (getBranchModel as ReturnType<typeof vi.fn>).mockReturnValue(branchModel());

    const service = new WalkInQueueService({ name: 'tenant_demo' } as Connection);
    const result = await service.list({ branchId: 'branch-1' });

    const emergency = result.entries.find((e) => (e as { _id: string })._id === 'e9') as {
      position: number;
    };
    expect(emergency.position).toBe(1);
  });
});

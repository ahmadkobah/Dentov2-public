/**
 * WaitlistService — Unit Tests
 *
 * Focused on #84: waitlist matching/auto-fill must order by numeric priority
 * weight (urgent → high → normal), then FIFO by createdAt — NOT by the
 * lexicographic string sort that ranked `high` last and could notify the wrong
 * patient first.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaitlistService } from './waitlist.service.js';
import type { Connection } from 'mongoose';

// ── Mock Modules ───────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/notification.service.js', () => ({
  NotificationService: class {
    send = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../models/waitlist.model.js', () => ({
  getWaitlistModel: vi.fn(),
}));

vi.mock('../models/patient.model.js', () => ({
  getPatientModel: vi.fn(() => ({})),
}));

// Valid 24-hex ObjectId strings (findMatching casts these).
const BRANCH_ID = '507f1f77bcf86cd799439011';
const DOCTOR_ID = '507f1f77bcf86cd799439012';

/** find() chain: .sort().limit().populate().lean(result). */
function findChain(result: unknown) {
  const chain: Record<string, unknown> = {
    sort: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    populate: vi.fn(() => chain),
    lean: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

const slot = {
  date: new Date('2026-07-10T00:00:00.000Z'),
  startTime: '10:00',
  endTime: '10:30',
  doctorId: DOCTOR_ID,
  branchId: BRANCH_ID,
};

describe('WaitlistService — priority ordering (#84)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findMatching orders urgent → high → normal, then FIFO by createdAt', async () => {
    // Unsorted; alphabetical string sort (u > n > h) would rank `high` last.
    const candidates = [
      {
        _id: 'w-normal',
        priority: 'normal',
        createdAt: new Date('2026-01-01'),
        patientId: { _id: 'p1' },
      },
      {
        _id: 'w-urgent',
        priority: 'urgent',
        createdAt: new Date('2026-01-03'),
        patientId: { _id: 'p2' },
      },
      {
        _id: 'w-high',
        priority: 'high',
        createdAt: new Date('2026-01-02'),
        patientId: { _id: 'p3' },
      },
    ];

    const waitlistModel = { find: vi.fn().mockReturnValue(findChain([...candidates])) };
    const { getWaitlistModel } = await import('../models/waitlist.model.js');
    (getWaitlistModel as ReturnType<typeof vi.fn>).mockReturnValue(waitlistModel);

    const service = new WaitlistService({ name: 'tenant_demo' } as Connection);
    const matches = await service.findMatching(slot, 5);

    expect(matches.map((m) => (m as unknown as { _id: string })._id)).toEqual([
      'w-urgent',
      'w-high',
      'w-normal',
    ]);
  });

  it('notifyTopMatchForSlot notifies the highest-priority patient first', async () => {
    const candidates = [
      {
        _id: 'w-normal',
        priority: 'normal',
        createdAt: new Date('2026-01-01'),
        patientId: { _id: 'p1' },
      },
      {
        _id: 'w-urgent',
        priority: 'urgent',
        createdAt: new Date('2026-01-05'),
        patientId: { _id: 'p2' },
      },
    ];

    const findByIdAndUpdate = vi.fn().mockResolvedValue({});
    const waitlistModel = {
      find: vi.fn().mockReturnValue(findChain([...candidates])),
      findByIdAndUpdate,
    };
    const { getWaitlistModel } = await import('../models/waitlist.model.js');
    (getWaitlistModel as ReturnType<typeof vi.fn>).mockReturnValue(waitlistModel);

    const service = new WaitlistService({ name: 'tenant_demo' } as Connection);
    const top = await service.notifyTopMatchForSlot(slot);

    expect((top as unknown as { _id: string })?._id).toBe('w-urgent');
    // The urgent entry (not the older normal one) is the one marked notified.
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'w-urgent',
      expect.objectContaining({ status: 'notified' }),
    );
  });
});

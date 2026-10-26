import { describe, expect, it } from 'vitest';
import {
  buildReminderFilter,
  combineAppointmentDateTime,
  getReminderWindow,
  isAppointmentInReminderWindow,
} from './reminder-window.js';

describe('appointment reminder cron helpers', () => {
  it('matches appointments by date plus HH:mm start time inside the reminder window', () => {
    const now = new Date('2026-07-03T09:00:00');
    const { windowStart, windowEnd } = getReminderWindow(now, 60);

    expect(
      isAppointmentInReminderWindow(
        { date: new Date('2026-07-03T00:00:00'), startTime: '10:00' },
        windowStart,
        windowEnd,
      ),
    ).toBe(true);

    expect(
      isAppointmentInReminderWindow(
        { date: new Date('2026-07-03T00:00:00'), startTime: '10:08' },
        windowStart,
        windowEnd,
      ),
    ).toBe(false);
  });

  it('builds a coarse Mongo filter using active statuses and per-interval reminder flags', () => {
    const { windowStart, windowEnd } = getReminderWindow(new Date('2026-07-03T09:00:00'), 60);
    const filter = buildReminderFilter(windowStart, windowEnd, 60) as Record<string, unknown>;

    expect(filter.status).toEqual({ $in: ['booked', 'confirmed'] });
    expect(filter['reminderSent.60']).toEqual({ $ne: true });
    expect(filter).not.toHaveProperty('startTime');
    expect(filter).toHaveProperty('date');
  });

  it('combines stored appointment date with HH:mm start time for notification formatting', () => {
    const appointmentTime = combineAppointmentDateTime(new Date('2026-07-03T00:00:00'), '14:30');

    expect(appointmentTime.getHours()).toBe(14);
    expect(appointmentTime.getMinutes()).toBe(30);
  });
});

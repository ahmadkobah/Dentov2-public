import type { QueryFilter } from 'mongoose';

const REMINDER_WINDOW_HALF_WIDTH_MS = 7.5 * 60_000;
const ACTIVE_REMINDER_STATUSES = ['booked', 'confirmed'] as const;

export function combineAppointmentDateTime(date: Date | string, time: string): Date {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  const appointmentTime = new Date(date);
  appointmentTime.setHours(hours || 0, minutes || 0, 0, 0);
  return appointmentTime;
}

export function getReminderWindow(now: Date, minutesBefore: number) {
  return {
    windowStart: new Date(now.getTime() + minutesBefore * 60_000 - REMINDER_WINDOW_HALF_WIDTH_MS),
    windowEnd: new Date(now.getTime() + minutesBefore * 60_000 + REMINDER_WINDOW_HALF_WIDTH_MS),
  };
}

export function isAppointmentInReminderWindow(
  appointment: { date: Date | string; startTime: string },
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const appointmentTime = combineAppointmentDateTime(appointment.date, appointment.startTime);
  return appointmentTime >= windowStart && appointmentTime <= windowEnd;
}

export function buildReminderFilter(
  windowStart: Date,
  windowEnd: Date,
  minutesBefore: number,
): QueryFilter<unknown> {
  const dateStart = new Date(windowStart);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(windowEnd);
  dateEnd.setHours(23, 59, 59, 999);

  return {
    date: { $gte: dateStart, $lte: dateEnd },
    status: { $in: ACTIVE_REMINDER_STATUSES },
    [`reminderSent.${minutesBefore}`]: { $ne: true },
  };
}

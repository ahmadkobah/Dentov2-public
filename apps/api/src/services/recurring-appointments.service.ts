/**
 * Recurring Appointments Service
 * Based on DENTO_V2_MASTER_PLAN.md §19
 *
 * Handles:
 * - BullMQ cron job for generating appointments
 * - Date calculation for recurrence patterns
 * - Conflict detection
 * - Series management (pause, resume, cancel)
 */

import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import type { Connection } from 'mongoose';
import {
  createRecurringRuleModel,
  createSkippedOccurrenceModel,
  getRecurrenceDescription,
  type IRecurringRuleDoc,
} from '../tenant/models/recurring-rule.model.js';
import { getAppointmentModel } from '../tenant/models/appointment.model.js';
import type {
  RecurrenceType,
  GenerateRecurringJobPayload,
  DayOfWeek,
  WeekOfMonth,
  ISkippedOccurrence,
  SkipReason,
} from '@dento/shared';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Detects MongoDB E11000 duplicate-key errors raised by the
 * `doctor_slot_unique_active` partial unique index on Appointment.
 * Used to treat race-condition slot collisions as a skipped occurrence.
 */
function isSlotTakenError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number; message?: string };
  return (
    e.code === 11000 &&
    typeof e.message === 'string' &&
    e.message.includes('doctor_slot_unique_active')
  );
}

/**
 * Compute an "HH:mm" end time from a start time and a duration in minutes.
 * Clamps to 23:59 so a long appointment never rolls past midnight.
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// ── BullMQ Connection ───────────────────────────────────────
const getRedisConnection = (): ConnectionOptions => {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname || 'localhost',
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  };
};

// ── Queue Names ─────────────────────────────────────────────
const QUEUE_NAME = 'recurring-generate';

// ── Lazy Queue Initialization ───────────────────────────────
let recurringQueue: Queue | null = null;

function getRecurringQueue(): Queue {
  if (!recurringQueue) {
    recurringQueue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
  }
  return recurringQueue;
}

// ── Date Utilities ──────────────────────────────────────────

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 */
function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Add months to a date, handling month-end cases
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
  if (result.getDate() !== day) {
    result.setDate(0); // Go to last day of previous month
  }
  return result;
}

/**
 * Add years to a date
 */
function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse YYYY-MM-DD to Date
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Get the nth occurrence of a weekday in a month
 * @param year - Year
 * @param month - Month (0-11)
 * @param dayOfWeek - Day of week (0=Sunday)
 * @param weekOfMonth - Week (1-4 or 5 for last)
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: DayOfWeek,
  weekOfMonth: WeekOfMonth,
): Date {
  if (weekOfMonth === 5) {
    // Last occurrence of the weekday in the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDayOfWeek = lastDay.getDay();
    const diff = (lastDayOfWeek - dayOfWeek + 7) % 7;
    return new Date(year, month, lastDay.getDate() - diff);
  }

  // Find nth occurrence
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const firstOccurrence = 1 + diff;
  const nthOccurrence = firstOccurrence + (weekOfMonth - 1) * 7;
  return new Date(year, month, nthOccurrence);
}

// ── Recurrence Engine ───────────────────────────────────────

/**
 * Calculate next occurrence date based on pattern
 */
function calculateNextDate(rule: IRecurringRuleDoc, fromDate: Date): Date | null {
  const {
    recurrenceType,
    daysOfWeek,
    dayOfMonth,
    weekOfMonth,
    endDate,
    maxOccurrences,
    occurrencesCreated,
  } = rule;

  // Check if series is complete
  if (maxOccurrences && occurrencesCreated >= maxOccurrences) {
    return null;
  }
  if (endDate && fromDate > parseDate(endDate)) {
    return null;
  }

  let nextDate = new Date(fromDate);

  switch (recurrenceType) {
    case 'daily':
      nextDate = addDays(nextDate, 1);
      break;

    case 'weekly':
    case 'biweekly': {
      const weeksToAdd = recurrenceType === 'biweekly' ? 2 : 1;
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next matching day of week
        let found = false;
        for (let i = 1; i <= 7; i++) {
          const checkDate = addDays(nextDate, i);
          if (daysOfWeek.includes(checkDate.getDay() as DayOfWeek)) {
            // For biweekly, check if it's the correct week
            if (recurrenceType === 'biweekly') {
              const startWeek = Math.floor(
                parseDate(rule.startDate).getTime() / (7 * 24 * 60 * 60 * 1000),
              );
              const checkWeek = Math.floor(checkDate.getTime() / (7 * 24 * 60 * 60 * 1000));
              if ((checkWeek - startWeek) % 2 !== 0) {
                continue;
              }
            }
            nextDate = checkDate;
            found = true;
            break;
          }
        }
        if (!found) {
          nextDate = addWeeks(nextDate, weeksToAdd);
        }
      } else {
        nextDate = addWeeks(nextDate, weeksToAdd);
      }
      break;
    }

    case 'monthly':
      if (weekOfMonth && daysOfWeek && daysOfWeek.length > 0) {
        // Nth weekday of month (e.g., 2nd Tuesday)
        const nextMonth = nextDate.getMonth() + 1;
        const nextYear = nextDate.getFullYear() + (nextMonth > 11 ? 1 : 0);
        const adjustedMonth = nextMonth % 12;
        nextDate = getNthWeekdayOfMonth(nextYear, adjustedMonth, daysOfWeek[0], weekOfMonth);
      } else if (dayOfMonth) {
        // Specific day of month
        nextDate = addMonths(nextDate, 1);
        const targetDay = Math.min(
          dayOfMonth,
          new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate(),
        );
        nextDate.setDate(targetDay);
      } else {
        nextDate = addMonths(nextDate, 1);
      }
      break;

    case 'quarterly':
      nextDate = addMonths(nextDate, 3);
      break;

    case 'biannual':
      nextDate = addMonths(nextDate, 6);
      break;

    case 'annual':
      nextDate = addYears(nextDate, 1);
      break;
  }

  // Check end date again after calculation
  if (endDate && nextDate > parseDate(endDate)) {
    return null;
  }

  return nextDate;
}

/**
 * Calculate all next dates up to a cutoff date
 */
function calculateUpcomingDates(rule: IRecurringRuleDoc, until: Date): string[] {
  const dates: string[] = [];
  let currentDate = rule.nextOccurrenceDate
    ? parseDate(rule.nextOccurrenceDate)
    : parseDate(rule.startDate);

  // If start date is in the future, use it
  const startDate = parseDate(rule.startDate);
  if (startDate > currentDate) {
    currentDate = startDate;
  }

  let iterationCount = 0;
  const maxIterations = 100; // Safety limit

  while (currentDate <= until && iterationCount < maxIterations) {
    // Check max occurrences
    if (rule.maxOccurrences && rule.occurrencesCreated + dates.length >= rule.maxOccurrences) {
      break;
    }

    // Check end date
    if (rule.endDate && currentDate > parseDate(rule.endDate)) {
      break;
    }

    // Check if date is today or future
    if (currentDate >= new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      dates.push(formatDate(currentDate));
    }

    // Calculate next date
    const nextDate = calculateNextDate(rule, currentDate);
    if (!nextDate || nextDate <= currentDate) {
      break;
    }
    currentDate = nextDate;
    iterationCount++;
  }

  return dates;
}

// ── Recurring Appointments Service ──────────────────────────

export class RecurringAppointmentsService {
  private tenantConnection: Connection;
  private tenantId: string;

  constructor(tenantConnection: Connection, tenantId: string) {
    this.tenantConnection = tenantConnection;
    this.tenantId = tenantId;
  }

  /**
   * Create a new recurring rule
   */
  async createRule(
    data: {
      branchId: string;
      patientId: string;
      doctorId: string;
      serviceId?: string;
      recurrenceType: RecurrenceType;
      preferredTime: string;
      durationMinutes?: number;
      daysOfWeek?: DayOfWeek[];
      dayOfMonth?: number;
      weekOfMonth?: WeekOfMonth;
      startDate: string;
      endDate?: string;
      maxOccurrences?: number;
      isAutoConfirm?: boolean;
      reminderDaysBefore?: number;
      isSkipHolidays?: boolean;
      isSkipIfConflict?: boolean;
      isAllowPatientCancel?: boolean;
      preferredChairId?: string;
      notes?: string;
    },
    createdBy: string,
  ): Promise<IRecurringRuleDoc> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);

    const rule = await RecurringRule.create({
      ...data,
      status: 'active',
      occurrencesCreated: 0,
      nextOccurrenceDate: data.startDate,
      lastGeneratedDate: null,
      durationMinutes: data.durationMinutes ?? 30,
      isAutoConfirm: data.isAutoConfirm ?? false,
      reminderDaysBefore: data.reminderDaysBefore ?? 7,
      isSkipHolidays: data.isSkipHolidays ?? false,
      isSkipIfConflict: data.isSkipIfConflict ?? true,
      isAllowPatientCancel: data.isAllowPatientCancel ?? true,
      createdBy,
      tenantId: this.tenantId,
    });

    // Queue immediate generation
    await getRecurringQueue().add('generate-initial', {
      tenantId: this.tenantId,
      ruleId: rule._id.toString(),
    });

    return rule;
  }

  /**
   * Get a recurring rule by ID
   */
  async getRule(ruleId: string): Promise<IRecurringRuleDoc | null> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);
    return RecurringRule.findById(ruleId);
  }

  /**
   * List recurring rules with filters
   */
  async listRules(query: {
    patientId?: string;
    doctorId?: string;
    branchId?: string;
    status?: string | string[];
    page?: number;
    limit?: number;
  }): Promise<{ rules: IRecurringRuleDoc[]; total: number; page: number; limit: number }> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);

    const filter: Record<string, unknown> = { tenantId: this.tenantId };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.branchId) filter.branchId = query.branchId;
    if (query.status) {
      filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rules, total] = await Promise.all([
      RecurringRule.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RecurringRule.countDocuments(filter),
    ]);

    return {
      rules: rules as unknown as IRecurringRuleDoc[],
      total,
      page,
      limit,
    };
  }

  /**
   * Update a recurring rule (with edit mode support)
   */
  async updateRule(
    ruleId: string,
    data: {
      doctorId?: string;
      serviceId?: string;
      preferredTime?: string;
      durationMinutes?: number;
      daysOfWeek?: DayOfWeek[];
      dayOfMonth?: number;
      weekOfMonth?: WeekOfMonth;
      endDate?: string | null;
      maxOccurrences?: number | null;
      isAutoConfirm?: boolean;
      reminderDaysBefore?: number;
      isSkipHolidays?: boolean;
      isSkipIfConflict?: boolean;
      preferredChairId?: string | null;
      notes?: string | null;
    },
    _mode: 'this_and_future' | 'all' = 'this_and_future',
  ): Promise<IRecurringRuleDoc | null> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);

    const rule = await RecurringRule.findByIdAndUpdate(ruleId, { $set: data }, { new: true });

    if (rule && _mode === 'this_and_future') {
      // Queue regeneration of future appointments
      await getRecurringQueue().add('regenerate', {
        tenantId: this.tenantId,
        ruleId: rule._id.toString(),
      });
    }

    return rule;
  }

  /**
   * Pause a recurring rule
   */
  async pauseRule(ruleId: string): Promise<IRecurringRuleDoc | null> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);

    return RecurringRule.findByIdAndUpdate(ruleId, { $set: { status: 'paused' } }, { new: true });
  }

  /**
   * Resume a paused recurring rule
   */
  async resumeRule(ruleId: string): Promise<IRecurringRuleDoc | null> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);

    const rule = await RecurringRule.findById(ruleId);
    if (!rule || rule.status !== 'paused') {
      return null;
    }

    // Calculate next occurrence from today
    const today = formatDate(new Date());
    const nextDate = calculateNextDate(rule, parseDate(today));

    return RecurringRule.findByIdAndUpdate(
      ruleId,
      {
        $set: {
          status: 'active',
          nextOccurrenceDate: nextDate ? formatDate(nextDate) : null,
        },
      },
      { new: true },
    );
  }

  /**
   * Cancel a recurring rule
   */
  async cancelRule(ruleId: string): Promise<IRecurringRuleDoc | null> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);

    return RecurringRule.findByIdAndUpdate(
      ruleId,
      { $set: { status: 'cancelled', nextOccurrenceDate: null } },
      { new: true },
    );
  }

  /**
   * Get skipped occurrences for a rule
   */
  async getSkippedOccurrences(ruleId: string): Promise<ISkippedOccurrence[]> {
    const SkippedOccurrence = createSkippedOccurrenceModel(this.tenantConnection);

    const skipped = await SkippedOccurrence.find({ recurringRuleId: ruleId })
      .sort({ date: 1 })
      .lean();

    return skipped.map((s) => ({
      _id: s._id.toString(),
      recurringRuleId: s.recurringRuleId.toString(),
      date: s.date,
      reason: s.reason,
      conflictDetails: s.conflictDetails,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Log a skipped occurrence
   */
  async logSkippedOccurrence(
    ruleId: string,
    date: string,
    reason: SkipReason,
    conflictDetails?: { appointmentId?: string; patientName?: string },
  ): Promise<void> {
    const SkippedOccurrence = createSkippedOccurrenceModel(this.tenantConnection);

    await SkippedOccurrence.updateOne(
      { recurringRuleId: ruleId, date },
      {
        $setOnInsert: {
          recurringRuleId: ruleId,
          date,
          reason,
          conflictDetails: conflictDetails
            ? {
                conflictingAppointmentId: conflictDetails.appointmentId,
                conflictingPatientName: conflictDetails.patientName,
              }
            : undefined,
        },
      },
      { upsert: true },
    );
  }

  /**
   * Get recurrence pattern description
   */
  getPatternDescription(rule: IRecurringRuleDoc): { en: string; ar: string } {
    return getRecurrenceDescription(
      rule.recurrenceType,
      rule.daysOfWeek as DayOfWeek[] | undefined,
      rule.dayOfMonth,
      rule.weekOfMonth as WeekOfMonth | undefined,
    );
  }

  /**
   * Check if a date conflicts with an existing appointment
   */
  async checkConflict(
    doctorId: string,
    date: string,
    time: string,
    _excludeRuleId?: string,
  ): Promise<{ hasConflict: boolean; conflictingAppointmentId?: string; patientName?: string }> {
    const Appointment = getAppointmentModel(this.tenantConnection);

    // An "active" appointment occupying the same {doctor, date, startTime}
    // is a conflict. This mirrors the `doctor_slot_unique_active` index.
    const existing = await Appointment.findOne({
      doctorId,
      date: parseDate(date),
      startTime: time,
      status: { $in: ['booked', 'confirmed', 'arrived', 'in_progress'] },
    })
      .select('_id patientId')
      .lean();

    if (!existing) return { hasConflict: false };

    return {
      hasConflict: true,
      conflictingAppointmentId: existing._id.toString(),
    };
  }

  /**
   * Create a single appointment occurrence for a recurring rule.
   *
   * Race-safe via the `doctor_slot_unique_active` partial unique index: if a
   * concurrent booking claims the same slot the E11000 is mapped to a skipped
   * occurrence (reason: conflict) instead of throwing.
   *
   * @returns true if the appointment was created, false if it was skipped.
   */
  async createOccurrence(rule: IRecurringRuleDoc, date: string): Promise<boolean> {
    const Appointment = getAppointmentModel(this.tenantConnection);

    const startTime = rule.preferredTime;
    const durationMinutes = rule.durationMinutes ?? 30;
    const endTime = addMinutesToTime(startTime, durationMinutes);

    try {
      await Appointment.create({
        patientId: rule.patientId,
        doctorId: rule.doctorId,
        branchId: rule.branchId,
        serviceId: rule.serviceId || undefined,
        date: parseDate(date),
        startTime,
        endTime,
        durationMinutes,
        type: 'consultation',
        source: 'recurring',
        status: rule.isAutoConfirm ? 'confirmed' : 'booked',
        recurringRuleId: rule._id,
        createdBy: rule.createdBy ?? rule._id,
        updatedBy: rule.createdBy ?? rule._id,
      });
      return true;
    } catch (err: unknown) {
      if (isSlotTakenError(err)) {
        // Slot was claimed concurrently — record as a conflict skip and move on.
        await this.logSkippedOccurrence(rule._id.toString(), date, 'conflict');
        return false;
      }
      throw err;
    }
  }

  /**
   * Check if a date is a holiday for the branch
   */
  async isHoliday(branchId: string, date: string): Promise<boolean> {
    const { getBranchModel } = await import('../tenant/models/branch.model.js');
    const Branch = getBranchModel(this.tenantConnection);
    const branch = await Branch.findById(branchId).select('holidays').lean();
    if (!branch?.holidays?.length) return false;
    return branch.holidays.some((h) => (h as { date: string }).date === date);
  }

  /**
   * Calculate upcoming dates for a rule
   */
  getUpcomingDates(rule: IRecurringRuleDoc, daysAhead: number = 28): string[] {
    const until = addDays(new Date(), daysAhead);
    return calculateUpcomingDates(rule, until);
  }

  /**
   * Regenerate future appointments for a recurring rule.
   * Deletes future unbooked appointment instances tied to this rule,
   * resets the rule tracking, and queues a fresh generation job.
   */
  async regenerateInstances(
    ruleId: string,
  ): Promise<{ deletedCount: number; regeneratedDates: string[] }> {
    const RecurringRule = createRecurringRuleModel(this.tenantConnection);

    const rule = await RecurringRule.findById(ruleId);
    if (!rule) {
      throw new Error('Recurring rule not found');
    }

    const todayStr = formatDate(new Date());

    // Remove future, not-yet-confirmed occurrences generated by this rule so
    // they can be regenerated cleanly. Confirmed/arrived/completed/etc. are
    // left untouched — we never delete an appointment a patient has committed to.
    const Appointment = getAppointmentModel(this.tenantConnection);
    const { deletedCount } = await Appointment.deleteMany({
      recurringRuleId: ruleId,
      date: { $gte: parseDate(todayStr) },
      status: 'booked',
    });

    // Reset rule tracking so the worker re-generates from today
    const upcomingDates = this.getUpcomingDates(rule, 56);
    await RecurringRule.updateOne(
      { _id: ruleId },
      {
        $set: {
          nextOccurrenceDate: todayStr,
          lastGeneratedDate: null,
        },
      },
    );

    // Queue regeneration job
    await getRecurringQueue().add('regenerate', {
      tenantId: this.tenantId,
      ruleId,
    });

    logger.info(
      { ruleId, tenantId: this.tenantId, deletedCount },
      '[Recurring] Regeneration queued',
    );

    return {
      deletedCount: deletedCount ?? 0,
      regeneratedDates: upcomingDates,
    };
  }
}

// ── BullMQ Worker ───────────────────────────────────────────

let recurringWorker: Worker | null = null;

/**
 * Start the recurring appointments worker
 */
export function startRecurringWorker(
  _getTenantConnection: (tenantSlug: string) => Promise<Connection>,
): Worker {
  if (recurringWorker) {
    return recurringWorker;
  }

  recurringWorker = new Worker(
    QUEUE_NAME,
    async (job: Job<GenerateRecurringJobPayload>) => {
      const { tenantId, tenantSlug, lookAheadDays = 28 } = job.data;

      logger.info(`[Recurring] Processing job ${job.name} for tenant ${tenantSlug}`);

      try {
        const connection = await _getTenantConnection(tenantSlug);
        const RecurringRule = createRecurringRuleModel(connection);

        const cutoffDate = addDays(new Date(), lookAheadDays);
        const cutoffDateStr = formatDate(cutoffDate);
        const todayStr = formatDate(new Date());

        // Find active rules that need generation
        const rules = await RecurringRule.find({
          tenantId,
          status: 'active',
          nextOccurrenceDate: { $lte: cutoffDateStr },
          $or: [{ endDate: null }, { endDate: { $gte: todayStr } }],
        }).limit(100); // Process in batches

        logger.info(`[Recurring] Found ${rules.length} rules to process for tenant ${tenantSlug}`);

        for (const rule of rules) {
          const service = new RecurringAppointmentsService(connection, tenantId);
          const dates = service.getUpcomingDates(rule, lookAheadDays);

          logger.debug(`[Recurring] Rule ${rule._id}: ${dates.length} dates to generate`);

          let createdCount = 0;

          for (const date of dates) {
            // Check for conflicts
            const conflict = await service.checkConflict(
              rule.doctorId.toString(),
              date,
              rule.preferredTime,
            );

            if (conflict.hasConflict) {
              if (rule.isSkipIfConflict) {
                await service.logSkippedOccurrence(rule._id.toString(), date, 'conflict', {
                  appointmentId: conflict.conflictingAppointmentId,
                  patientName: conflict.patientName,
                });
                continue;
              }
            }

            // Check for holidays
            if (rule.isSkipHolidays) {
              const isHoliday = await service.isHoliday(rule.branchId.toString(), date);
              if (isHoliday) {
                await service.logSkippedOccurrence(rule._id.toString(), date, 'holiday');
                continue;
              }
            }

            // Create the appointment (race-safe; skips on slot collision)
            const created = await service.createOccurrence(rule, date);
            if (created) createdCount++;
          }

          // Update rule tracking
          const nextDate = calculateNextDate(
            rule,
            parseDate(dates[dates.length - 1] || formatDate(new Date())),
          );
          await RecurringRule.updateOne(
            { _id: rule._id },
            {
              $set: {
                lastGeneratedDate: dates[dates.length - 1] || rule.lastGeneratedDate,
                nextOccurrenceDate: nextDate ? formatDate(nextDate) : null,
                ...(nextDate ? {} : { status: 'completed' }),
              },
              $inc: { occurrencesCreated: createdCount },
            },
          );
        }

        logger.info(`[Recurring] Completed processing for tenant ${tenantSlug}`);
      } catch (error) {
        logger.error({ err: error }, `[Recurring] Error processing job for tenant ${tenantSlug}`);
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
      // Redis cost optimization — recurring appointments cron is daily.
      drainDelay: 60,
      stalledInterval: 120_000,
      maxStalledCount: 1,
    },
  );

  recurringWorker.on('completed', (job) => {
    logger.info(`[Recurring] Job ${job.id} completed`);
  });

  recurringWorker.on('failed', (job, error) => {
    logger.error({ err: error }, `[Recurring] Job ${job?.id} failed`);
  });

  return recurringWorker;
}

/**
 * Schedule daily generation job (call once at startup)
 */
export async function scheduleRecurringGeneration(): Promise<void> {
  const queue = getRecurringQueue();

  // Remove existing repeatable jobs
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'daily-generate') {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Add daily job at 01:00
  await queue.add(
    'daily-generate',
    { global: true },
    {
      repeat: {
        pattern: '0 1 * * *', // Every day at 01:00
      },
    },
  );

  logger.info('[Recurring] Scheduled daily generation job at 01:00');
}

/**
 * Close the recurring queue and worker
 */
export async function closeRecurringQueue(): Promise<void> {
  if (recurringWorker) {
    await recurringWorker.close();
    recurringWorker = null;
  }
  if (recurringQueue) {
    await recurringQueue.close();
    recurringQueue = null;
  }
}

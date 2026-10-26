/**
 * Recurring Rule & Skipped Occurrence Models
 * Based on DENTO_V2_MASTER_PLAN.md §19
 *
 * Collections:
 * - recurring_rules: Defines recurrence patterns
 * - skipped_occurrences: Logs skipped appointments with reasons
 */

import { Schema, type Connection, type Document, type Model, type Types } from 'mongoose';
import type {
  IRecurringRule,
  ISkippedOccurrence,
  RecurrenceType,
  RecurringRuleStatus,
  SkipReason,
  DayOfWeek,
  WeekOfMonth,
} from '@dento/shared';

// ── Recurring Rule Document ─────────────────────────────────
export interface IRecurringRuleDoc extends Omit<IRecurringRule, '_id'>, Document {
  isActive: boolean;
  updatedBy: Types.ObjectId | null;
}

// ── Skipped Occurrence Document ─────────────────────────────
export interface ISkippedOccurrenceDoc extends Omit<ISkippedOccurrence, '_id'>, Document {
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
}

// ── Recurrence Type Enum Values ─────────────────────────────
const recurrenceTypes: RecurrenceType[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'biannual',
  'annual',
];

// ── Rule Status Enum Values ─────────────────────────────────
const ruleStatuses: RecurringRuleStatus[] = ['active', 'paused', 'completed', 'cancelled'];

// ── Skip Reason Enum Values ─────────────────────────────────
const skipReasons: SkipReason[] = ['conflict', 'holiday', 'doctor_leave', 'manual'];

// ── Recurring Rule Schema ───────────────────────────────────
const RecurringRuleSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    // Recurrence Pattern
    recurrenceType: {
      type: String,
      enum: recurrenceTypes,
      required: true,
    },

    // Time Parameters
    preferredTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:mm format
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 480, // 8 hours max
    },
    daysOfWeek: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (v: DayOfWeek[]) => !v || v.every((d) => d >= 0 && d <= 6),
        message: 'Days of week must be 0-6',
      },
    },
    dayOfMonth: {
      type: Number,
      default: null,
      min: 1,
      max: 31,
    },
    weekOfMonth: {
      type: Number,
      default: null,
      min: 1,
      max: 5, // 5 = last week
    },

    // Series Boundaries
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD format
    },
    endDate: {
      type: String,
      default: null,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    maxOccurrences: {
      type: Number,
      default: null,
      min: 1,
      max: 365, // Max 1 year of daily appointments
    },

    // Status
    status: {
      type: String,
      enum: ruleStatuses,
      default: 'active',
      index: true,
    },

    // Tracking
    occurrencesCreated: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextOccurrenceDate: {
      type: String,
      default: null,
      index: true,
    },
    lastGeneratedDate: {
      type: String,
      default: null,
    },

    // Options
    isAutoConfirm: {
      type: Boolean,
      default: false,
    },
    reminderDaysBefore: {
      type: Number,
      default: 7,
      min: 1,
      max: 30,
    },
    isSkipHolidays: {
      type: Boolean,
      default: false,
    },
    isSkipIfConflict: {
      type: Boolean,
      default: true, // Default to skip instead of error
    },
    isAllowPatientCancel: {
      type: Boolean,
      default: true,
    },

    // Chair Preference
    preferredChairId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    notes: {
      type: String,
      maxlength: 2000,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'recurring_rules',
  },
);

// ── Compound Indexes ────────────────────────────────────────
RecurringRuleSchema.index({ patientId: 1, status: 1 });
RecurringRuleSchema.index({ doctorId: 1, status: 1 });
RecurringRuleSchema.index({ branchId: 1, status: 1, nextOccurrenceDate: 1 });
RecurringRuleSchema.index({ status: 1, nextOccurrenceDate: 1 }); // For BullMQ cron

// ── Skipped Occurrence Schema ───────────────────────────────
const SkippedOccurrenceSchema = new Schema(
  {
    recurringRuleId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    reason: {
      type: String,
      enum: skipReasons,
      required: true,
    },
    conflictDetails: {
      conflictingAppointmentId: {
        type: Schema.Types.ObjectId,
        default: undefined,
      },
      conflictingPatientName: {
        type: String,
        default: undefined,
      },
    },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'skipped_occurrences',
  },
);

// ── Compound Indexes for Skipped ────────────────────────────
SkippedOccurrenceSchema.index({ recurringRuleId: 1, date: 1 }, { unique: true });

// ── Model Types ─────────────────────────────────────────────
export type RecurringRuleModel = Model<IRecurringRuleDoc>;
export type SkippedOccurrenceModel = Model<ISkippedOccurrenceDoc>;

// ── Factory Functions ───────────────────────────────────────

/**
 * Get or create RecurringRule model for a tenant connection
 */
export function createRecurringRuleModel(connection: Connection): RecurringRuleModel {
  if (connection.models.RecurringRule) {
    return connection.models.RecurringRule as RecurringRuleModel;
  }
  return connection.model<IRecurringRuleDoc>('RecurringRule', RecurringRuleSchema);
}

/**
 * Get or create SkippedOccurrence model for a tenant connection
 */
export function createSkippedOccurrenceModel(connection: Connection): SkippedOccurrenceModel {
  if (connection.models.SkippedOccurrence) {
    return connection.models.SkippedOccurrence as SkippedOccurrenceModel;
  }
  return connection.model<ISkippedOccurrenceDoc>('SkippedOccurrence', SkippedOccurrenceSchema);
}

// ── Helper: Get Recurrence Pattern Description ──────────────
export function getRecurrenceDescription(
  type: RecurrenceType,
  daysOfWeek?: DayOfWeek[],
  dayOfMonth?: number | null,
  weekOfMonth?: WeekOfMonth | null,
): { en: string; ar: string } {
  const dayNames = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  };

  const weekNames = {
    en: ['first', 'second', 'third', 'fourth', 'last'],
    ar: ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الأخير'],
  };

  switch (type) {
    case 'daily':
      return { en: 'Every day', ar: 'كل يوم' };

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const enDays = daysOfWeek.map((d) => dayNames.en[d]).join(', ');
        const arDays = daysOfWeek.map((d) => dayNames.ar[d]).join('، ');
        return { en: `Weekly on ${enDays}`, ar: `أسبوعياً في ${arDays}` };
      }
      return { en: 'Weekly', ar: 'أسبوعياً' };

    case 'biweekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const enDays = daysOfWeek.map((d) => dayNames.en[d]).join(', ');
        const arDays = daysOfWeek.map((d) => dayNames.ar[d]).join('، ');
        return { en: `Every 2 weeks on ${enDays}`, ar: `كل أسبوعين في ${arDays}` };
      }
      return { en: 'Every 2 weeks', ar: 'كل أسبوعين' };

    case 'monthly':
      if (weekOfMonth && daysOfWeek && daysOfWeek.length > 0) {
        const weekEn = weekNames.en[weekOfMonth - 1];
        const weekAr = weekNames.ar[weekOfMonth - 1];
        const dayEn = dayNames.en[daysOfWeek[0]];
        const dayAr = dayNames.ar[daysOfWeek[0]];
        return {
          en: `The ${weekEn} ${dayEn} of every month`,
          ar: `${dayAr} ${weekAr} من كل شهر`,
        };
      }
      if (dayOfMonth) {
        return {
          en: `Day ${dayOfMonth} of every month`,
          ar: `اليوم ${dayOfMonth} من كل شهر`,
        };
      }
      return { en: 'Monthly', ar: 'شهرياً' };

    case 'quarterly':
      return { en: 'Every 3 months', ar: 'كل 3 أشهر' };

    case 'biannual':
      return { en: 'Every 6 months', ar: 'كل 6 أشهر' };

    case 'annual':
      return { en: 'Yearly', ar: 'سنوياً' };

    default:
      return { en: type, ar: type };
  }
}

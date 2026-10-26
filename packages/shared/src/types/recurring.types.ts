/**
 * Recurring Appointments Types
 * Based on DENTO_V2_MASTER_PLAN.md §19
 */

// ── Recurrence Type Enum ────────────────────────────────────
export type RecurrenceType =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'biannual'
  | 'annual';

// ── Recurring Rule Status ───────────────────────────────────
export type RecurringRuleStatus =
  | 'active' // Appointments are being generated
  | 'paused' // Temporarily stopped, can be resumed
  | 'completed' // All planned appointments created / end date reached
  | 'cancelled'; // Permanently stopped

// ── Days of Week (0 = Sunday, 6 = Saturday) ─────────────────
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ── Week of Month (for patterns like "2nd Tuesday") ─────────
export type WeekOfMonth = 1 | 2 | 3 | 4 | 5; // 5 = last week

// ── Recurring Rule Interface ────────────────────────────────
export interface IRecurringRule {
  _id: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  serviceId?: string | null;

  // Recurrence Pattern
  recurrenceType: RecurrenceType;

  // Time Parameters
  preferredTime: string; // HH:mm format (e.g., "09:30")
  durationMinutes: number; // Default: 30
  daysOfWeek?: DayOfWeek[]; // For weekly/biweekly (e.g., [1, 3, 5] = Mon, Wed, Fri)
  dayOfMonth?: number | null; // 1-31, for monthly patterns
  weekOfMonth?: WeekOfMonth | null; // For "every 2nd Tuesday" patterns

  // Series Boundaries
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate?: string | null; // ISO date, optional
  maxOccurrences?: number | null; // Alternative to endDate

  // Status
  status: RecurringRuleStatus;

  // Tracking
  occurrencesCreated: number;
  nextOccurrenceDate?: string | null; // Next scheduled date
  lastGeneratedDate?: string | null; // Last generated appointment date

  // Options
  isAutoConfirm: boolean; // Auto-confirm generated appointments
  reminderDaysBefore: number; // Reminder X days before (default: 7)
  isSkipHolidays: boolean; // Skip branch holidays
  isSkipIfConflict: boolean; // Skip instead of error on conflict
  isAllowPatientCancel: boolean; // Patient can cancel individual occurrences

  // Chair Preference (integration with Daily Ops Hub)
  preferredChairId?: string | null;

  notes?: string | null;
  createdBy: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Skipped Occurrence Record ───────────────────────────────
export type SkipReason = 'conflict' | 'holiday' | 'doctor_leave' | 'manual';

export interface ISkippedOccurrence {
  _id: string;
  recurringRuleId: string;
  date: string; // ISO date that was skipped
  reason: SkipReason;
  conflictDetails?: {
    conflictingAppointmentId?: string;
    conflictingPatientName?: string;
  } | null;
  createdAt: Date;
}

// ── Appointment Recurring Fields (Extension) ────────────────
export interface IAppointmentRecurringFields {
  recurringRuleId?: string | null;
  isRecurring: boolean;
  occurrenceIndex?: number | null; // Which occurrence (1, 2, 3, ...)
  seriesTotal?: number | null; // Total in series (if known)

  // Occurrence-Level Overrides
  isModified: boolean; // Was individually modified
  originalDateTime?: Date | null; // Original time before modification
  modificationNote?: string | null; // Why modified
}

// ── Edit Mode for Recurring Appointments ────────────────────
export type RecurringEditMode =
  | 'this_only' // Only this occurrence
  | 'this_and_future' // This and all future occurrences
  | 'all'; // All occurrences (including past non-completed)

// ── Cancel Mode for Recurring Appointments ──────────────────
export type RecurringCancelMode =
  | 'this_only' // Cancel only this occurrence
  | 'this_and_future' // Cancel this and all future
  | 'pause'; // Pause the series (can resume)

// ── Create Recurring Rule Input ─────────────────────────────
export interface CreateRecurringRuleInput {
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
}

// ── Update Recurring Rule Input ─────────────────────────────
export interface UpdateRecurringRuleInput {
  mode: RecurringEditMode;
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
}

// ── Recurring Rule List Query ───────────────────────────────
export interface RecurringRuleQuery {
  patientId?: string;
  doctorId?: string;
  branchId?: string;
  status?: RecurringRuleStatus | RecurringRuleStatus[];
  page?: number;
  limit?: number;
}

// ── Recurring Rule with Occurrences ─────────────────────────
export interface IRecurringRuleWithOccurrences extends IRecurringRule {
  occurrences: IRecurringOccurrence[];
  skippedOccurrences: ISkippedOccurrence[];
  completedCount: number;
  scheduledCount: number;
  cancelledCount: number;
}

// ── Recurring Occurrence (Calendar View) ────────────────────
export interface IRecurringOccurrence {
  appointmentId: string;
  date: string;
  time: string;
  status: string;
  occurrenceIndex: number;
  isModified: boolean;
  originalDateTime?: string | null;
}

// ── BullMQ Job Payloads ─────────────────────────────────────
export interface GenerateRecurringJobPayload {
  tenantId: string;
  tenantSlug: string;
  lookAheadDays?: number; // Default: 28 (4 weeks)
}

export interface RecurringReminderJobPayload {
  tenantId: string;
  tenantSlug: string;
  recurringRuleId: string;
  appointmentId: string;
  daysBefore: number;
}

// ── Webhook Events ──────────────────────────────────────────
export type RecurringWebhookEvent =
  | 'recurring_rule.created'
  | 'recurring_rule.updated'
  | 'recurring_rule.paused'
  | 'recurring_rule.resumed'
  | 'recurring_rule.cancelled'
  | 'recurring_rule.completed'
  | 'recurring_occurrence.generated'
  | 'recurring_occurrence.skipped'
  | 'recurring_occurrence.modified';

// ── RBAC Permissions ────────────────────────────────────────
export type RecurringPermission =
  | 'recurring.view'
  | 'recurring.create'
  | 'recurring.edit'
  | 'recurring.edit_single'
  | 'recurring.pause_resume'
  | 'recurring.cancel'
  | 'recurring.cancel_single';

// ── Recurrence Pattern Display ──────────────────────────────
export interface RecurrencePatternDisplay {
  type: RecurrenceType;
  description: {
    en: string;
    ar: string;
  };
  nextDate?: string;
  progress?: {
    completed: number;
    total: number | null; // null if infinite
    percentage: number | null;
  };
}

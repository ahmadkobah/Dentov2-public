import type { Role } from '../types/index.js';

// ── Roles ───────────────────────────────────────────────────

export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  TENANT_ADMIN: 'tenant_admin',
  DENTIST: 'dentist',
  RECEPTIONIST: 'receptionist',
  ASSISTANT: 'assistant',
  ACCOUNTANT: 'accountant',
  LAB_TECH: 'lab_tech',
  HYGIENIST: 'hygienist',
} as const satisfies Record<string, Role>;

// ── Appointment Statuses ────────────────────────────────────

export const APPOINTMENT_STATUSES = [
  'booked',
  'confirmed',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
] as const;

// ── Invoice Statuses ────────────────────────────────────────

export const INVOICE_STATUSES = [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
] as const;

// ── Payment Methods (tenant-level) ──────────────────────────

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'bank_transfer',
  'cheque',
  'insurance',
  'online',
  'fawry',
  'meeza',
] as const;

// ── Payment Statuses ────────────────────────────────────────

export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;

// ── Insurance Claim Statuses (Phase 4) ──────────────────────

export const INSURANCE_CLAIM_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'partially_approved',
  'denied',
  'paid',
] as const;

// ── Installment Plan Statuses (Phase 4) ─────────────────────

export const INSTALLMENT_PLAN_STATUSES = ['active', 'completed', 'defaulted', 'cancelled'] as const;

export const INSTALLMENT_PAYMENT_STATUSES = ['pending', 'paid', 'overdue', 'waived'] as const;

export const INSTALLMENT_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;

// ── Commission Statuses (Phase 4) ───────────────────────────

export const COMMISSION_STATUSES = ['pending', 'approved', 'paid', 'cancelled'] as const;

// ── Country Default Tax Rates (VAT %) ──────────────────────

/**
 * Default VAT / sales-tax percentage for each supported country.
 * Used as fallback when clinic settings `taxPercentage` is null.
 */
export const COUNTRY_DEFAULT_TAX_RATES: Record<string, number> = {
  EG: 14, // Egypt
  SA: 15, // Saudi Arabia
  AE: 5, // UAE
  US: 0, // USA (no federal VAT)
  DE: 19, // Germany
  GB: 20, // UK
  FR: 20, // France
  TR: 20, // Turkey
  JO: 16, // Jordan
  LB: 11, // Lebanon
  KW: 0, // Kuwait
  QA: 0, // Qatar
  BH: 10, // Bahrain
  OM: 5, // Oman
};

/** Look up the default tax rate for a country code. Returns 0 if unknown. */
export function getCountryDefaultTaxRate(countryCode: string): number {
  return COUNTRY_DEFAULT_TAX_RATES[countryCode?.toUpperCase()] ?? 0;
}

// ── Treatment Plan Statuses ─────────────────────────────────

export const TREATMENT_PLAN_STATUSES = [
  'draft',
  'proposed',
  'approved',
  'in_progress',
  'completed',
  'cancelled',
] as const;

// ── Tenant Statuses ─────────────────────────────────────────

export const TENANT_STATUSES = ['active', 'suspended', 'cancelled', 'trial'] as const;

// ── Module Slugs ────────────────────────────────────────────

export const MODULE_SLUGS = [
  'dashboard',
  'patients',
  'appointments',
  'dental_charts',
  'treatment_plans',
  'procedure_notes',
  'doctors',
  'invoices',
  'payments',
  'prescriptions',
  'xrays',
  'cbct',
  'lab_orders',
  'insurance',
  'inventory',
  'services_catalog',
  'branches',
  'users',
  'schedules',
  'leave',
  'attendance',
  'commissions',
  'installments',
  'consent',
  'notifications',
  'reports',
  'subscription',
  'settings',
  'language_pack',
] as const;

// ── Webhook Events ──────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'tenant.created',
  'tenant.updated',
  'tenant.suspended',
  'tenant.activated',
  'patient.created',
  'patient.updated',
  'patient.deleted',
  'appointment.created',
  'appointment.updated',
  'appointment.cancelled',
  'appointment.completed',
  'appointment.no_show',
  'invoice.created',
  'invoice.issued',
  'invoice.paid',
  'invoice.overdue',
  'payment.received',
  'payment.refunded',
  'treatment_plan.approved',
  'treatment_plan.completed',
  'prescription.created',
  'lab_order.created',
  'lab_order.completed',
  'inventory.low_stock',
  'user.invited',
] as const;

// ── Tooth Conditions ────────────────────────────────────────

export const TOOTH_CONDITIONS = [
  'healthy',
  'caries',
  'filled',
  'crowned',
  'missing',
  'extracted',
  'implant',
  'bridge',
  'root_canal',
  'veneer',
  'fracture',
  'periapical_lesion',
  'mobility',
  'recession',
] as const;

// ── Appointment Status Transitions ──────────────────────────

/** Valid next-status map — used by backend status-change validation */
export const VALID_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  booked: ['confirmed', 'arrived', 'cancelled', 'rescheduled', 'no_show'],
  confirmed: ['arrived', 'cancelled', 'no_show', 'rescheduled'],
  arrived: ['in_progress', 'no_show', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  no_show: [],
  cancelled: [],
  rescheduled: [],
} as const;

// ── Doctor Exception Types ──────────────────────────────────

export const DOCTOR_EXCEPTION_TYPES = [
  'vacation',
  'sick',
  'conference',
  'holiday',
  'other',
] as const;

// ── Schedule Exception Types (Week 9) ───────────────────────

export const SCHEDULE_EXCEPTION_TYPES = [
  'vacation',
  'sick_leave',
  'day_off',
  'conference',
  'special_hours',
  'other',
] as const;

export const SCHEDULE_EXCEPTION_STATUSES = ['pending', 'approved', 'rejected'] as const;

// ── Shift Types (Week 9) ───────────────────────────────────

export const SHIFT_TYPES = ['morning', 'afternoon', 'evening', 'night', 'split', 'custom'] as const;

// ── Staff Schedule Statuses (Week 9) ────────────────────────

export const STAFF_SCHEDULE_STATUSES = ['scheduled', 'confirmed', 'swapped', 'cancelled'] as const;

// ── Leave Request Statuses (Week 9) ─────────────────────────

export const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

// ── Attendance Statuses (Week 9) ────────────────────────────

export const ATTENDANCE_STATUSES = [
  'present',
  'late',
  'absent',
  'half_day',
  'on_leave',
  'holiday',
] as const;

// ── Booking Confirmation Actions (Week 9) ───────────────────

export const BOOKING_CONFIRMATION_ACTIONS = ['confirm', 'confirm_with_changes', 'reject'] as const;

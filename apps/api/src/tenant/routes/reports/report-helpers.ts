/**
 * Shared helpers, schemas and utilities for report & dashboard routes.
 */

import type { Connection } from 'mongoose';
import { z } from 'zod';
import { reportFilterSchema, reportCategoryParamSchema } from '@dento/shared';

// ── Request Helpers ─────────────────────────────────────────

export function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

export function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

export function getTenantId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).tenant as Record<string, string>).id;
}

export function getEnabledModules(request: unknown): string[] {
  return (
    (((request as unknown as Record<string, unknown>).tenant as Record<string, unknown>)
      ?.enabledModules as string[]) ?? []
  );
}

// ── Validation Schemas ──────────────────────────────────────

export const reportQuerySchema = reportFilterSchema;
export const reportCategoryParam = reportCategoryParamSchema;

export const idParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

// ── Helper Functions ────────────────────────────────────────

/**
 * Generate blurred/preview data for locked reports
 */
export function generatePreviewData(category: string, _type: string): unknown {
  const previewBars = [
    { label: '●●●●', value: 0.85 },
    { label: '●●●●', value: 0.72 },
    { label: '●●●●', value: 0.64 },
    { label: '●●●●', value: 0.58 },
    { label: '●●●●', value: 0.45 },
  ];

  const previewSummary: Record<string, string> = {
    metric1: '●●●●',
    metric2: '●●●●',
    metric3: '●●●●',
    metric4: '●●●●',
  };

  return {
    chartType: category === 'appointment' ? 'heatmap' : 'bar',
    bars: previewBars,
    summary: previewSummary,
    isBlurred: true,
  };
}

/**
 * Infer report category from report type
 */
export function inferCategory(reportType: string): string {
  const financialTypes = [
    'revenue_summary',
    'revenue_by_doctor',
    'revenue_by_service',
    'revenue_by_branch',
    'payment_collection',
    'outstanding_aging',
    'tax_report',
  ];
  const patientTypes = [
    'patient_overview',
    'new_vs_returning',
    'patient_demographics',
    'no_show_report',
    'patient_source_referral',
  ];
  const appointmentTypes = [
    'appointment_summary',
    'doctor_utilization',
    'chair_utilization',
    'cancellation_analysis',
    'peak_hours_heatmap',
    'avg_duration_analysis',
  ];
  const clinicalTypes = [
    'procedures_performed',
    'treatment_plan_acceptance',
    'lab_order_turnaround',
    'prescription_volume',
  ];
  const inventoryTypes = [
    'material_usage',
    'stock_valuation',
    'expiry_report',
    'consumption_forecast',
    'stock_movement_history',
    'low_stock',
    'dead_stock',
    'abc_analysis',
  ];

  if (financialTypes.includes(reportType)) return 'financial';
  if (patientTypes.includes(reportType)) return 'patient';
  if (appointmentTypes.includes(reportType)) return 'appointment';
  if (clinicalTypes.includes(reportType)) return 'clinical';
  if (inventoryTypes.includes(reportType)) return 'inventory';
  return 'operational';
}

/**
 * Calculate next run time for a scheduled report
 */
export function calculateNextRunAt(
  frequency: string,
  time: string,
  _timezone: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);

  const next = new Date(now);
  next.setUTCHours(hours, minutes, 0, 0);

  // If the time has already passed today, start from tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  switch (frequency) {
    case 'weekly':
      if (dayOfWeek !== undefined) {
        while (next.getUTCDay() !== dayOfWeek) {
          next.setDate(next.getDate() + 1);
        }
      }
      break;
    case 'monthly':
      if (dayOfMonth !== undefined) {
        next.setDate(dayOfMonth);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
      }
      break;
    // daily: already set to next occurrence
  }

  return next;
}

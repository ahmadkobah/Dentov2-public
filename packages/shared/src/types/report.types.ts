/**
 * Reports & Analytics System Types
 * Based on DENTO_V2_MASTER_PLAN.md §21
 *
 * Two-Tier Model:
 * - dashboard-reports (Free): Dashboard widgets + basic reports
 * - advanced-analytics ($199/mo): All reports, exports, schedules
 */

// ── Report Categories ───────────────────────────────────────

export type ReportCategory =
  | 'financial'
  | 'patient'
  | 'appointment'
  | 'clinical'
  | 'operational'
  | 'inventory';

export type ReportModule = 'dashboard-reports' | 'advanced-analytics';

// ── Financial Reports ───────────────────────────────────────

export type FinancialReportType =
  | 'revenue_summary'
  | 'revenue_by_doctor'
  | 'revenue_by_service'
  | 'revenue_by_branch'
  | 'payment_collection'
  | 'outstanding_aging'
  | 'tax_report';

// ── Patient Reports ─────────────────────────────────────────

export type PatientReportType =
  | 'patient_overview'
  | 'new_vs_returning'
  | 'patient_demographics'
  | 'no_show_report'
  | 'patient_source_referral';

// ── Appointment Reports ─────────────────────────────────────

export type AppointmentReportType =
  | 'appointment_summary'
  | 'doctor_utilization'
  | 'chair_utilization'
  | 'cancellation_analysis'
  | 'peak_hours_heatmap'
  | 'avg_duration_analysis';

// ── Clinical Reports ────────────────────────────────────────

export type ClinicalReportType =
  | 'procedures_performed'
  | 'treatment_plan_acceptance'
  | 'lab_order_turnaround'
  | 'prescription_volume';

// ── Operational Reports ─────────────────────────────────────

export type OperationalReportType =
  | 'commission_summary'
  | 'daily_reconciliation'
  | 'wait_time_analysis'
  | 'staff_productivity';

// ── Inventory Reports ───────────────────────────────────────

export type InventoryReportType =
  | 'material_usage'
  | 'stock_valuation'
  | 'expiry_report'
  | 'consumption_forecast'
  | 'supplier_performance'
  | 'stock_movement_history'
  | 'po_summary'
  | 'low_stock'
  | 'dead_stock'
  | 'abc_analysis';

// Combined type
export type ReportType =
  | FinancialReportType
  | PatientReportType
  | AppointmentReportType
  | ClinicalReportType
  | OperationalReportType
  | InventoryReportType;

// ── Report Definition ───────────────────────────────────────

export interface IReportDefinition {
  id: string;
  type: ReportType;
  category: ReportCategory;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  module: ReportModule;
  isFree: boolean;
  aggregationCollection: string;
  defaultPeriod: 'today' | 'week' | 'month' | 'quarter' | 'year';
  supportedCharts: ChartType[];
  summaryCards: ISummaryCardDef[];
}

export type ChartType = 'bar' | 'line' | 'pie' | 'heatmap' | 'sparkline' | 'donut' | 'area';

export interface ISummaryCardDef {
  key: string;
  label: { en: string; ar: string };
  format: 'number' | 'currency' | 'percentage' | 'duration';
}

// ── Report Query Parameters ─────────────────────────────────

export interface ReportQueryParams {
  from?: string; // ISO date
  to?: string; // ISO date
  branchId?: string;
  doctorId?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  format?: 'json' | 'csv' | 'excel' | 'pdf';
}

// ── Dashboard Stats (Free Tier) ─────────────────────────────

export interface IDashboardStats {
  todaysAppointments: {
    booked: number;
    confirmed: number;
    completed: number;
    noShow: number;
    total: number;
  };
  walkinsToday: number;
  revenueThisMonth: {
    amount: number;
    currency: string;
    trend: number; // % change vs last month
  };
  patientsThisMonth: {
    newPatients: number;
    totalVisits: number;
    trend: number;
  };
  upcomingAppointments: IUpcomingAppointment[];
  recentPatients: IRecentPatient[];
  lowStockAlerts: ILowStockAlert[];
  waitingRoom: {
    count: number;
    avgWaitMinutes: number;
  };
}

export interface IUpcomingAppointment {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  time: string;
  service?: string;
  status: string;
}

export interface IRecentPatient {
  patientId: string;
  name: string;
  lastVisit: string;
  phone?: string;
}

export interface ILowStockAlert {
  itemId: string;
  name: string;
  currentQuantity: number;
  reorderLevel: number;
}

export interface IDashboardTrends {
  revenueComparison: {
    currentMonth: number;
    previousMonth: number;
    percentChange: number;
  };
  appointmentComparison: {
    currentMonth: number;
    previousMonth: number;
    percentChange: number;
  };
  patientComparison: {
    currentMonth: number;
    previousMonth: number;
    percentChange: number;
  };
  noShowComparison: {
    currentMonth: number;
    previousMonth: number;
    percentChange: number;
  };
}

// ── Report Result ───────────────────────────────────────────

export interface IReportResult<T = unknown> {
  reportType: ReportType;
  category: ReportCategory;
  generatedAt: string;
  period: { from: string; to: string };
  filters: {
    branchId?: string;
    doctorId?: string;
  };
  summary: Record<string, number>;
  data: T[];
  chartData?: unknown;
}

// ── Saved Reports ───────────────────────────────────────────

export interface ISavedReport {
  _id: string;
  tenantId: string;
  name: string;
  reportType: ReportType;
  category: ReportCategory;
  params: ReportQueryParams;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReportInput {
  name: string;
  reportType: ReportType;
  category: ReportCategory;
  params: ReportQueryParams;
}

// ── Scheduled Reports ───────────────────────────────────────

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type DeliveryMethod = 'email' | 'in_app' | 'both';
export type ExportFormat = 'pdf' | 'csv' | 'excel';

export interface IReportSchedule {
  _id: string;
  tenantId: string;

  // Which report
  reportType: ReportType;
  category: ReportCategory;
  reportParams: ReportQueryParams;

  // Schedule
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null; // 0=Sun..6=Sat (for weekly)
  dayOfMonth?: number | null; // 1-28 (for monthly)
  time: string; // "08:00" (UTC)
  timezone: string; // "Africa/Cairo"

  // Delivery
  deliveryMethod: DeliveryMethod;
  recipients: string[]; // User IDs
  emailAddresses: string[]; // External emails
  format: ExportFormat;

  // Meta
  name: string;
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportScheduleInput {
  reportType: ReportType;
  category: ReportCategory;
  reportParams: ReportQueryParams;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  deliveryMethod: DeliveryMethod;
  recipients: string[];
  emailAddresses?: string[];
  format: ExportFormat;
  name: string;
}

export interface UpdateReportScheduleInput {
  reportParams?: ReportQueryParams;
  frequency?: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
  timezone?: string;
  deliveryMethod?: DeliveryMethod;
  recipients?: string[];
  emailAddresses?: string[];
  format?: ExportFormat;
  name?: string;
  isActive?: boolean;
}

// ── Report History ──────────────────────────────────────────

export type ReportGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IReportHistory {
  _id: string;
  tenantId: string;
  scheduleId?: string; // null for manual exports
  reportType: ReportType;
  category: ReportCategory;
  params: ReportQueryParams;
  status: ReportGenerationStatus;
  format: ExportFormat;
  fileUrl?: string; // S3/R2 URL
  fileSize?: number; // bytes
  rowCount?: number;
  generatedAt: string;
  completedAt?: string;
  error?: string;
  triggeredBy: 'schedule' | 'manual';
  userId?: string;
}

// ── Report Webhook Events ───────────────────────────────────

export type ReportWebhookEvent =
  | 'report.generated'
  | 'report.generation_failed'
  | 'report.exported'
  | 'report.schedule.created'
  | 'report.schedule.deleted';

// ── RBAC Permissions ────────────────────────────────────────

export type ReportPermission =
  | 'reports.dashboard.view'
  | 'reports.basic.view'
  | 'reports.advanced.view'
  | 'reports.financial.view'
  | 'reports.export'
  | 'reports.schedules.manage'
  | 'reports.saved.manage';

// ── Report Catalog (for Reports Hub) ────────────────────────

export interface IReportCatalogItem {
  id: string;
  type: ReportType;
  category: ReportCategory;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  module: ReportModule;
  isFree: boolean;
  icon: string; // Lucide icon name
  route: string; // Frontend route
}

export interface IReportCatalogCategory {
  category: ReportCategory;
  name: { en: string; ar: string };
  icon: string;
  reports: IReportCatalogItem[];
  totalReports: number;
  freeReports: number;
  paidReports: number;
}

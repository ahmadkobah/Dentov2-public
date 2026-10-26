/**
 * Report Models — report_schedules, saved_reports, report_history
 * Based on DENTO_V2_MASTER_PLAN.md §21
 *
 * Two-Tier Model:
 * - dashboard-reports (Free): Dashboard widgets + basic reports
 * - advanced-analytics ($199/Mo): All reports, exports, schedules
 */

import { Schema, type Connection, type Document, type Model, type Types } from 'mongoose';
import type {
  ReportType,
  ReportCategory,
  ScheduleFrequency,
  DeliveryMethod,
  ExportFormat,
  ReportGenerationStatus,
} from '@dento/shared';

// ── Report Types & Categories (Enum Values) ─────────────────

const reportCategories: ReportCategory[] = [
  'financial',
  'patient',
  'appointment',
  'clinical',
  'operational',
  'inventory',
];

const reportTypes: ReportType[] = [
  // Financial
  'revenue_summary',
  'revenue_by_doctor',
  'revenue_by_service',
  'revenue_by_branch',
  'payment_collection',
  'outstanding_aging',
  'tax_report',
  // Patient
  'patient_overview',
  'new_vs_returning',
  'patient_demographics',
  'no_show_report',
  'patient_source_referral',
  // Appointment
  'appointment_summary',
  'doctor_utilization',
  'chair_utilization',
  'cancellation_analysis',
  'peak_hours_heatmap',
  'avg_duration_analysis',
  // Clinical
  'procedures_performed',
  'treatment_plan_acceptance',
  'lab_order_turnaround',
  'prescription_volume',
  // Operational
  'commission_summary',
  'daily_reconciliation',
  'wait_time_analysis',
  'staff_productivity',
  // Inventory
  'material_usage',
  'stock_valuation',
  'expiry_report',
  'consumption_forecast',
  'supplier_performance',
  'stock_movement_history',
  'po_summary',
  'low_stock',
  'dead_stock',
  'abc_analysis',
];

const scheduleFrequencies: ScheduleFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly'];
const deliveryMethods: DeliveryMethod[] = ['email', 'in_app', 'both'];
const exportFormats: ExportFormat[] = ['pdf', 'csv', 'excel'];
const generationStatuses: ReportGenerationStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
];

// ── Report Query Params Sub-Schema ──────────────────────────

const ReportQueryParamsSchema = new Schema(
  {
    from: { type: String },
    to: { type: String },
    branchId: { type: String },
    doctorId: { type: String },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    },
    format: { type: String, enum: ['json', 'csv', 'excel', 'pdf'] },
  },
  { _id: false },
);

// ── Saved Report Document ───────────────────────────────────

export interface ISavedReportDoc extends Document {
  tenantId: string;
  name: string;
  reportType: ReportType;
  category: ReportCategory;
  params: {
    from?: string;
    to?: string;
    branchId?: string;
    doctorId?: string;
    period?: string;
    format?: string;
  };
  createdBy: Types.ObjectId;
  isActive: boolean;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SavedReportSchema = new Schema<ISavedReportDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    reportType: { type: String, required: true, enum: reportTypes },
    category: { type: String, required: true, enum: reportCategories },
    params: { type: ReportQueryParamsSchema, default: {} },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

SavedReportSchema.index({ tenantId: 1, createdBy: 1 });
SavedReportSchema.index({ tenantId: 1, category: 1 });

// ── Report Schedule Document ────────────────────────────────

export interface IReportScheduleDoc extends Document {
  tenantId: string;
  reportType: ReportType;
  category: ReportCategory;
  reportParams: {
    from?: string;
    to?: string;
    branchId?: string;
    doctorId?: string;
    period?: string;
    format?: string;
  };
  frequency: ScheduleFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  time: string;
  timezone: string;
  deliveryMethod: DeliveryMethod;
  recipients: Types.ObjectId[];
  emailAddresses: string[];
  format: ExportFormat;
  name: string;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportScheduleSchema = new Schema<IReportScheduleDoc>(
  {
    tenantId: { type: String, required: true, index: true },

    // Which report
    reportType: { type: String, required: true, enum: reportTypes },
    category: { type: String, required: true, enum: reportCategories },
    reportParams: { type: ReportQueryParamsSchema, default: {} },

    // Schedule
    frequency: { type: String, required: true, enum: scheduleFrequencies },
    dayOfWeek: { type: Number, min: 0, max: 6, default: null },
    dayOfMonth: { type: Number, min: 1, max: 28, default: null },
    time: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    timezone: { type: String, required: true, default: 'UTC' },

    // Delivery
    deliveryMethod: { type: String, required: true, enum: deliveryMethods },
    recipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    emailAddresses: [{ type: String, trim: true, lowercase: true }],
    format: { type: String, required: true, enum: exportFormats },

    // Meta
    name: { type: String, required: true, trim: true, maxlength: 200 },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },

    // Standard Fields
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

ReportScheduleSchema.index({ tenantId: 1, isActive: 1, nextRunAt: 1 }); // BullMQ cron query
ReportScheduleSchema.index({ tenantId: 1, createdBy: 1 });

// ── Report History Document ─────────────────────────────────

export interface IReportHistoryDoc extends Document {
  tenantId: string;
  scheduleId: Types.ObjectId | null;
  reportType: ReportType;
  category: ReportCategory;
  params: {
    from?: string;
    to?: string;
    branchId?: string;
    doctorId?: string;
    period?: string;
    format?: string;
  };
  status: ReportGenerationStatus;
  format: ExportFormat;
  fileUrl: string | null;
  fileSize: number | null;
  rowCount: number | null;
  generatedAt: Date;
  completedAt: Date | null;
  error: string | null;
  triggeredBy: 'schedule' | 'manual';
  userId: Types.ObjectId | null;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
}

const ReportHistorySchema = new Schema<IReportHistoryDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    scheduleId: { type: Schema.Types.ObjectId, default: null, ref: 'ReportSchedule' },
    reportType: { type: String, required: true, enum: reportTypes },
    category: { type: String, required: true, enum: reportCategories },
    params: { type: ReportQueryParamsSchema, default: {} },
    status: { type: String, required: true, enum: generationStatuses, default: 'pending' },
    format: { type: String, required: true, enum: exportFormats },
    fileUrl: { type: String, default: null },
    fileSize: { type: Number, default: null },
    rowCount: { type: Number, default: null },
    generatedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
    triggeredBy: { type: String, required: true, enum: ['schedule', 'manual'] },
    userId: { type: Schema.Types.ObjectId, default: null, ref: 'User' },

    // Standard Fields
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

ReportHistorySchema.index({ tenantId: 1, generatedAt: -1 });
ReportHistorySchema.index({ tenantId: 1, scheduleId: 1, generatedAt: -1 });
ReportHistorySchema.index({ status: 1, generatedAt: -1 }); // Cleanup query

// ── Model Factory Functions ─────────────────────────────────

export type SavedReportModel = Model<ISavedReportDoc>;
export type ReportScheduleModel = Model<IReportScheduleDoc>;
export type ReportHistoryModel = Model<IReportHistoryDoc>;

export function createSavedReportModel(connection: Connection): SavedReportModel {
  return (
    (connection.models.SavedReport as SavedReportModel) ||
    connection.model<ISavedReportDoc>('SavedReport', SavedReportSchema, 'saved_reports')
  );
}

export function createReportScheduleModel(connection: Connection): ReportScheduleModel {
  return (
    (connection.models.ReportSchedule as ReportScheduleModel) ||
    connection.model<IReportScheduleDoc>('ReportSchedule', ReportScheduleSchema, 'report_schedules')
  );
}

export function createReportHistoryModel(connection: Connection): ReportHistoryModel {
  return (
    (connection.models.ReportHistory as ReportHistoryModel) ||
    connection.model<IReportHistoryDoc>('ReportHistory', ReportHistorySchema, 'report_history')
  );
}

// ── Report Catalog (Static Data) ────────────────────────────

export const REPORT_CATALOG = {
  financial: [
    {
      type: 'revenue_summary' as const,
      name: { en: 'Revenue Summary', ar: 'ملخص الإيرادات' },
      description: {
        en: 'Revenue by period (day/week/month/quarter/year) with trend chart',
        ar: 'الإيرادات حسب الفترة (يوم/أسبوع/شهر/ربع سنة/سنة) مع مخطط الاتجاه',
      },
      isFree: true, // Free for current month
      icon: 'DollarSign',
    },
    {
      type: 'revenue_by_doctor' as const,
      name: { en: 'Revenue by Doctor', ar: 'الإيرادات حسب الطبيب' },
      description: {
        en: 'Revenue ranking by doctor with percentage share',
        ar: 'ترتيب الإيرادات حسب الطبيب مع نسبة المشاركة',
      },
      isFree: false,
      icon: 'UserCog',
    },
    {
      type: 'revenue_by_service' as const,
      name: { en: 'Revenue by Service', ar: 'الإيرادات حسب الخدمة' },
      description: {
        en: 'Revenue breakdown by service type/category',
        ar: 'تحليل الإيرادات حسب نوع الخدمة/الفئة',
      },
      isFree: false,
      icon: 'ListTree',
    },
    {
      type: 'revenue_by_branch' as const,
      name: { en: 'Revenue by Branch', ar: 'الإيرادات حسب الفرع' },
      description: {
        en: 'Revenue comparison between branches',
        ar: 'مقارنة الإيرادات بين الفروع',
      },
      isFree: false,
      icon: 'Building2',
    },
    {
      type: 'payment_collection' as const,
      name: { en: 'Payment Collection', ar: 'تحصيل المدفوعات' },
      description: {
        en: 'Payment receipts by method (Cash/Card/Bank/Insurance)',
        ar: 'إيصالات الدفع حسب الطريقة (نقد/بطاقة/بنك/تأمين)',
      },
      isFree: false,
      icon: 'CreditCard',
    },
    {
      type: 'outstanding_aging' as const,
      name: { en: 'Outstanding Invoices (Aging)', ar: 'الفواتير المعلقة (التقادم)' },
      description: {
        en: 'Open invoices by age (0-30, 31-60, 61-90, 90+ days)',
        ar: 'الفواتير المفتوحة حسب العمر (0-30، 31-60، 61-90، 90+ يوم)',
      },
      isFree: false,
      icon: 'Clock',
    },
    {
      type: 'tax_report' as const,
      name: { en: 'Tax Report', ar: 'تقرير الضرائب' },
      description: {
        en: 'Tax overview by period (for accountants)',
        ar: 'نظرة عامة على الضرائب حسب الفترة (للمحاسبين)',
      },
      isFree: false,
      icon: 'FileText',
    },
    {
      type: 'payer_mix' as const,
      name: { en: 'Payer Mix', ar: 'توزيع الدافعين' },
      description: {
        en: 'Breakdown of payments by payer type (self-pay, insurance, installments)',
        ar: 'تفصيل المدفوعات حسب نوع الدافع',
      },
      isFree: false,
      icon: 'PieChart',
    },
    {
      type: 'commission_report' as const,
      name: { en: 'Commission Report', ar: 'تقرير العمولات' },
      description: {
        en: 'Doctor commission tracking and payout summary',
        ar: 'تتبع عمولات الأطباء وملخص المدفوعات',
      },
      isFree: false,
      icon: 'Percent',
    },
    {
      type: 'refund_report' as const,
      name: { en: 'Refund Report', ar: 'تقرير الاستردادات' },
      description: {
        en: 'Refund trends, reasons and totals',
        ar: 'اتجاهات الاسترداد والأسباب والإجماليات',
      },
      isFree: false,
      icon: 'RotateCcw',
    },
  ],
  patient: [
    {
      type: 'patient_overview' as const,
      name: { en: 'Patient Overview', ar: 'نظرة عامة على المرضى' },
      description: {
        en: 'Total patients, new this month, active, inactive',
        ar: 'إجمالي المرضى، الجدد هذا الشهر، النشطون، غير النشطين',
      },
      isFree: true,
      icon: 'Users',
    },
    {
      type: 'new_vs_returning' as const,
      name: { en: 'New vs. Returning', ar: 'الجدد مقابل العائدين' },
      description: {
        en: 'New patients vs. returning visits per period',
        ar: 'المرضى الجدد مقابل الزيارات المتكررة حسب الفترة',
      },
      isFree: false,
      icon: 'UserPlus',
    },
    {
      type: 'patient_demographics' as const,
      name: { en: 'Patient Demographics', ar: 'التركيبة السكانية للمرضى' },
      description: {
        en: 'Age groups, gender, nationality (Pie/Bar Charts)',
        ar: 'الفئات العمرية، الجنس، الجنسية (رسوم بيانية)',
      },
      isFree: false,
      icon: 'PieChart',
    },
    {
      type: 'no_show_report' as const,
      name: { en: 'No-Show Report', ar: 'تقرير عدم الحضور' },
      description: {
        en: 'No-show rate by doctor, day of week, time',
        ar: 'معدل عدم الحضور حسب الطبيب، يوم الأسبوع، الوقت',
      },
      isFree: false,
      icon: 'UserX',
    },
    {
      type: 'patient_source_referral' as const,
      name: { en: 'Patient Source/Referral', ar: 'مصدر المرضى/الإحالات' },
      description: {
        en: 'Where do patients come from? (Referral, Google, Walk-in, etc.)',
        ar: 'من أين يأتي المرضى؟ (إحالة، جوجل، زيارة مباشرة، إلخ)',
      },
      isFree: false,
      icon: 'Share2',
    },
  ],
  appointment: [
    {
      type: 'appointment_summary' as const,
      name: { en: 'Appointment Summary', ar: 'ملخص المواعيد' },
      description: {
        en: 'Appointments today/week/month by status',
        ar: 'المواعيد اليوم/الأسبوع/الشهر حسب الحالة',
      },
      isFree: true, // Free for today
      icon: 'CalendarDays',
    },
    {
      type: 'doctor_utilization' as const,
      name: { en: 'Doctor Utilization', ar: 'استخدام الأطباء' },
      description: {
        en: 'Utilization per doctor (booked vs. available slots)',
        ar: 'الاستخدام لكل طبيب (المحجوز مقابل الخانات المتاحة)',
      },
      isFree: false,
      icon: 'Activity',
    },
    {
      type: 'chair_utilization' as const,
      name: { en: 'Chair Utilization', ar: 'استخدام الكراسي' },
      description: {
        en: 'Chair utilization per branch (% of operating time occupied)',
        ar: 'استخدام الكرسي لكل فرع (% من وقت التشغيل المشغول)',
      },
      isFree: false,
      icon: 'Armchair',
    },
    {
      type: 'cancellation_analysis' as const,
      name: { en: 'Cancellation Analysis', ar: 'تحليل الإلغاءات' },
      description: {
        en: 'Cancellation rate, common reasons, trend',
        ar: 'معدل الإلغاء، الأسباب الشائعة، الاتجاه',
      },
      isFree: false,
      icon: 'XCircle',
    },
    {
      type: 'peak_hours_heatmap' as const,
      name: { en: 'Peak Hours Heatmap', ar: 'خريطة حرارية لساعات الذروة' },
      description: {
        en: 'Day × Hour heatmap of appointment bookings',
        ar: 'خريطة حرارية لحجوزات المواعيد حسب اليوم × الساعة',
      },
      isFree: false,
      icon: 'Grid3x3',
    },
    {
      type: 'avg_duration_analysis' as const,
      name: { en: 'Duration Analysis', ar: 'تحليل المدة' },
      description: {
        en: 'Average appointment duration by service type + doctor',
        ar: 'متوسط مدة الموعد حسب نوع الخدمة + الطبيب',
      },
      isFree: false,
      icon: 'Timer',
    },
  ],
  clinical: [
    {
      type: 'procedures_performed' as const,
      name: { en: 'Procedures Performed', ar: 'الإجراءات المنفذة' },
      description: {
        en: 'Most common procedures by type, doctor, period',
        ar: 'أكثر الإجراءات شيوعاً حسب النوع، الطبيب، الفترة',
      },
      isFree: false,
      icon: 'Stethoscope',
    },
    {
      type: 'treatment_plan_acceptance' as const,
      name: { en: 'Treatment Plan Acceptance', ar: 'قبول خطط العلاج' },
      description: {
        en: 'Acceptance rate (created vs. started vs. completed)',
        ar: 'معدل القبول (تم إنشاؤها مقابل البدء مقابل الإكمال)',
      },
      isFree: false,
      icon: 'ClipboardCheck',
    },
    {
      type: 'lab_order_turnaround' as const,
      name: { en: 'Lab Order Turnaround', ar: 'مدة تنفيذ طلبات المختبر' },
      description: {
        en: 'Average processing time: Order → Result',
        ar: 'متوسط وقت المعالجة: الطلب → النتيجة',
      },
      isFree: false,
      icon: 'FlaskConical',
    },
    {
      type: 'prescription_volume' as const,
      name: { en: 'Prescription Volume', ar: 'حجم الوصفات الطبية' },
      description: {
        en: 'Prescriptions by medication, doctor, period',
        ar: 'الوصفات حسب الدواء، الطبيب، الفترة',
      },
      isFree: false,
      icon: 'Pill',
    },
  ],
  operational: [
    {
      type: 'commission_summary' as const,
      name: { en: 'Commission Summary', ar: 'ملخص العمولات' },
      description: {
        en: 'Commissions by doctor, status (pending/paid), period',
        ar: 'العمولات حسب الطبيب، الحالة (معلقة/مدفوعة)، الفترة',
      },
      isFree: false,
      icon: 'Wallet',
    },
    {
      type: 'daily_reconciliation' as const,
      name: { en: 'Daily Reconciliation', ar: 'التسوية اليومية' },
      description: {
        en: 'Daily closing with expected/actual comparison',
        ar: 'إغلاق يومي مع مقارنة المتوقع/الفعلي',
      },
      isFree: false,
      icon: 'Scale',
    },
    {
      type: 'wait_time_analysis' as const,
      name: { en: 'Wait Time Analysis', ar: 'تحليل وقت الانتظار' },
      description: {
        en: 'Average wait time by branch, doctor, time of day',
        ar: 'متوسط وقت الانتظار حسب الفرع، الطبيب، وقت اليوم',
      },
      isFree: false,
      icon: 'Hourglass',
    },
    {
      type: 'staff_productivity' as const,
      name: { en: 'Staff Productivity', ar: 'إنتاجية الموظفين' },
      description: {
        en: 'Appointments/revenue per doctor per work day',
        ar: 'المواعيد/الإيرادات لكل طبيب في كل يوم عمل',
      },
      isFree: false,
      icon: 'TrendingUp',
    },
    {
      type: 'staff_performance' as const,
      name: { en: 'Staff Performance', ar: 'أداء الموظفين' },
      description: {
        en: 'Productivity and efficiency metrics',
        ar: 'مقاييس الإنتاجية والكفاءة',
      },
      isFree: false,
      icon: 'Users',
    },
    {
      type: 'attendance_summary' as const,
      name: { en: 'Attendance Summary', ar: 'ملخص الحضور' },
      description: {
        en: 'Staff check-in/check-out overview',
        ar: 'نظرة عامة على تسجيل دخول وخروج الموظفين',
      },
      isFree: false,
      icon: 'Clock',
    },
    {
      type: 'audit_log_report' as const,
      name: { en: 'Audit Log Report', ar: 'تقرير سجل التدقيق' },
      description: {
        en: 'System activity and changes log',
        ar: 'سجل نشاط النظام والتغييرات',
      },
      isFree: false,
      icon: 'FileText',
    },
    {
      type: 'branch_comparison' as const,
      name: { en: 'Branch Comparison', ar: 'مقارنة الفروع' },
      description: {
        en: 'Side-by-side branch performance',
        ar: 'أداء الفروع جنباً إلى جنب',
      },
      isFree: false,
      icon: 'Building2',
    },
  ],
  inventory: [
    {
      type: 'material_usage' as const,
      name: { en: 'Material Usage', ar: 'استخدام المواد' },
      description: {
        en: 'Consumed quantities and costs by item and movement type',
        ar: 'الكميات والتكاليف المستهلكة حسب الصنف ونوع الحركة',
      },
      isFree: true,
      icon: 'Pill',
    },
    {
      type: 'stock_valuation' as const,
      name: { en: 'Stock Valuation', ar: 'تقييم المخزون' },
      description: {
        en: 'Total stock value by category with FIFO/WAC breakdown',
        ar: 'إجمالي قيمة المخزون حسب الفئة مع تفصيل FIFO/WAC',
      },
      isFree: true,
      icon: 'DollarSign',
    },
    {
      type: 'expiry_report' as const,
      name: { en: 'Expiry Report', ar: 'تقرير الصلاحية' },
      description: {
        en: 'Batches grouped by expiry status with value at risk',
        ar: 'الدفعات مجمعة حسب حالة الصلاحية مع القيمة المعرضة للخطر',
      },
      isFree: true,
      icon: 'Clock',
    },
    {
      type: 'consumption_forecast' as const,
      name: { en: 'Consumption Forecast', ar: 'توقع الاستهلاك' },
      description: {
        en: 'Average monthly usage extrapolation with months-until-depletion',
        ar: 'استقراء الاستهلاك الشهري مع الأشهر المتبقية حتى النفاد',
      },
      isFree: false,
      icon: 'TrendingUp',
    },
    {
      type: 'supplier_performance' as const,
      name: { en: 'Supplier Performance', ar: 'أداء الموردين' },
      description: {
        en: 'Delivery times, rejection rates, and spend per supplier',
        ar: 'أوقات التسليم ومعدلات الرفض والإنفاق لكل مورد',
      },
      isFree: false,
      icon: 'Truck',
    },
    {
      type: 'stock_movement_history' as const,
      name: { en: 'Stock Movement History', ar: 'سجل حركة المخزون' },
      description: {
        en: 'Full movement log with inbound/outbound timeline',
        ar: 'سجل الحركة الكامل مع الجدول الزمني للوارد/الصادر',
      },
      isFree: false,
      icon: 'ArrowLeftRight',
    },
    {
      type: 'po_summary' as const,
      name: { en: 'Purchase Order Summary', ar: 'ملخص أوامر الشراء' },
      description: {
        en: 'POs grouped by status and supplier with spend analysis',
        ar: 'أوامر الشراء مجمعة حسب الحالة والمورد مع تحليل الإنفاق',
      },
      isFree: false,
      icon: 'ClipboardList',
    },
    {
      type: 'low_stock' as const,
      name: { en: 'Low Stock Alert', ar: 'تنبيه المخزون المنخفض' },
      description: {
        en: 'Items below reorder level with days-to-stockout estimate',
        ar: 'الأصناف أقل من مستوى إعادة الطلب مع تقدير أيام النفاد',
      },
      isFree: true,
      icon: 'AlertTriangle',
    },
    {
      type: 'dead_stock' as const,
      name: { en: 'Dead Stock', ar: 'المخزون الراكد' },
      description: {
        en: 'Items with no movements in 90+ days and locked value',
        ar: 'الأصناف بدون حركة لأكثر من 90 يومًا والقيمة المحجوزة',
      },
      isFree: false,
      icon: 'Archive',
    },
    {
      type: 'abc_analysis' as const,
      name: { en: 'ABC Analysis', ar: 'تحليل ABC' },
      description: {
        en: 'Items ranked by consumption value: A (top 80%), B (next 15%), C (bottom 5%)',
        ar: 'الأصناف مرتبة حسب قيمة الاستهلاك: A (أعلى 80%)، B (15% التالية)، C (أدنى 5%)',
      },
      isFree: false,
      icon: 'BarChart3',
    },
    {
      type: 'current_stock' as const,
      name: { en: 'Current Stock Levels', ar: 'مستويات المخزون الحالية' },
      description: {
        en: 'Real-time stock overview across all branches',
        ar: 'نظرة عامة على المخزون الحالي عبر جميع الفروع',
      },
      isFree: true,
      icon: 'Package',
    },
    {
      type: 'low_stock_alerts' as const,
      name: { en: 'Low Stock Alerts', ar: 'تنبيهات انخفاض المخزون' },
      description: {
        en: 'Items below reorder level',
        ar: 'الأصناف تحت مستوى إعادة الطلب',
      },
      isFree: true,
      icon: 'AlertTriangle',
    },
    {
      type: 'stock_movement' as const,
      name: { en: 'Stock Movement', ar: 'حركة المخزون' },
      description: {
        en: 'Inbound/outbound and transfers',
        ar: 'الوارد والصادر والتحويلات',
      },
      isFree: false,
      icon: 'ArrowLeftRight',
    },
    {
      type: 'expiry_tracking' as const,
      name: { en: 'Expiry Tracking', ar: 'تتبع الصلاحية' },
      description: {
        en: 'Items approaching expiry date',
        ar: 'الأصناف التي تقترب من تاريخ الانتهاء',
      },
      isFree: false,
      icon: 'Calendar',
    },
    {
      type: 'consumption_analysis' as const,
      name: { en: 'Consumption Analysis', ar: 'تحليل الاستهلاك' },
      description: {
        en: 'Usage patterns and forecasting',
        ar: 'أنماط الاستخدام والتنبؤ',
      },
      isFree: false,
      icon: 'TrendingUp',
    },
    {
      type: 'valuation' as const,
      name: { en: 'Inventory Valuation', ar: 'تقييم المخزون' },
      description: {
        en: 'Total inventory value and cost analysis',
        ar: 'إجمالي قيمة المخزون وتحليل التكلفة',
      },
      isFree: false,
      icon: 'DollarSign',
    },
  ],
} as const;

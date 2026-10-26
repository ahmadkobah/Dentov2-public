/**
 * Report Catalog Configuration
 * Extracted from ReportCategoryPage.tsx — static config data for all report categories.
 *
 * Matches backend REPORT_CATALOG structure.
 */

import {
  DollarSign,
  Users,
  CalendarDays,
  Stethoscope,
  Settings,
  Lock,
  type LucideIcon,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ReportItem {
  type: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  isFree: boolean;
  icon: string;
}

export interface CategoryConfig {
  name: { en: string; ar: string };
  icon: LucideIcon;
  color: string;
  bg: string;
  reports: ReportItem[];
  freePreviewData?: Record<string, unknown>;
}

// ── Report Catalog ──────────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  financial: {
    name: { en: 'Financial Reports', ar: 'التقارير المالية' },
    icon: DollarSign,
    color: 'text-accent',
    bg: 'bg-accent/10',
    reports: [
      {
        type: 'revenue_summary',
        name: { en: 'Revenue Summary', ar: 'ملخص الإيرادات' },
        description: {
          en: 'Monthly revenue overview with trends',
          ar: 'نظرة عامة على الإيرادات الشهرية مع الاتجاهات',
        },
        isFree: true,
        icon: 'DollarSign',
      },
      {
        type: 'revenue_by_doctor',
        name: { en: 'Revenue by Doctor', ar: 'الإيرادات حسب الطبيب' },
        description: {
          en: 'Revenue breakdown per doctor',
          ar: 'تفصيل الإيرادات لكل طبيب',
        },
        isFree: false,
        icon: 'UserCog',
      },
      {
        type: 'revenue_by_service',
        name: { en: 'Revenue by Service', ar: 'الإيرادات حسب الخدمة' },
        description: {
          en: 'Which services generate the most income',
          ar: 'أي الخدمات تحقق أعلى دخل',
        },
        isFree: false,
        icon: 'ListTree',
      },
      {
        type: 'revenue_by_branch',
        name: { en: 'Revenue by Branch', ar: 'الإيرادات حسب الفرع' },
        description: {
          en: 'Compare revenue across branches',
          ar: 'مقارنة الإيرادات عبر الفروع',
        },
        isFree: false,
        icon: 'Building2',
      },
      {
        type: 'payment_collection',
        name: { en: 'Payment Collection', ar: 'تحصيل المدفوعات' },
        description: {
          en: 'Cash, card & insurance collections',
          ar: 'التحصيلات النقدية وبالبطاقة والتأمين',
        },
        isFree: false,
        icon: 'CreditCard',
      },
      {
        type: 'outstanding_aging',
        name: { en: 'Outstanding & Aging', ar: 'المستحقات والتقادم' },
        description: {
          en: 'Overdue invoices and aging analysis',
          ar: 'الفواتير المتأخرة وتحليل التقادم',
        },
        isFree: false,
        icon: 'Clock',
      },
      {
        type: 'tax_report',
        name: { en: 'Tax Report', ar: 'التقرير الضريبي' },
        description: {
          en: 'Tax summaries for accounting',
          ar: 'ملخصات ضريبية للمحاسبة',
        },
        isFree: false,
        icon: 'Receipt',
      },
      {
        type: 'payer_mix',
        name: { en: 'Payer Mix', ar: 'توزيع الدافعين' },
        description: {
          en: 'Breakdown of payments by payer type (self-pay, insurance, installments)',
          ar: 'تفصيل المدفوعات حسب نوع الدافع',
        },
        isFree: false,
        icon: 'PieChart',
      },
      {
        type: 'commission_report',
        name: { en: 'Commission Report', ar: 'تقرير العمولات' },
        description: {
          en: 'Doctor commission tracking and payout summary',
          ar: 'تتبع عمولات الأطباء وملخص المدفوعات',
        },
        isFree: false,
        icon: 'Percent',
      },
      {
        type: 'refund_report',
        name: { en: 'Refund Report', ar: 'تقرير الاستردادات' },
        description: {
          en: 'Refund trends, reasons and totals',
          ar: 'اتجاهات الاسترداد والأسباب والإجماليات',
        },
        isFree: false,
        icon: 'RotateCcw',
      },
    ],
  },
  patient: {
    name: { en: 'Patient Reports', ar: 'تقارير المرضى' },
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/10',
    reports: [
      {
        type: 'patient_overview',
        name: { en: 'Patient Overview', ar: 'نظرة عامة على المرضى' },
        description: {
          en: 'Active, inactive & new patient counts',
          ar: 'أعداد المرضى النشطين وغير النشطين والجدد',
        },
        isFree: true,
        icon: 'Users',
      },
      {
        type: 'new_vs_returning',
        name: { en: 'New vs Returning', ar: 'الجدد مقابل العائدين' },
        description: {
          en: 'Compare acquisition vs retention over time',
          ar: 'مقارنة الاستقطاب مقابل الاحتفاظ عبر الزمن',
        },
        isFree: false,
        icon: 'UserPlus',
      },
      {
        type: 'patient_demographics',
        name: { en: 'Demographics', ar: 'البيانات الديموغرافية' },
        description: {
          en: 'Age, gender & location distribution',
          ar: 'توزيع العمر والجنس والموقع',
        },
        isFree: false,
        icon: 'BarChart',
      },
      {
        type: 'no_show_report',
        name: { en: 'No-Show Report', ar: 'تقرير عدم الحضور' },
        description: {
          en: 'Track and analyze no-show patterns',
          ar: 'تتبع وتحليل أنماط عدم الحضور',
        },
        isFree: false,
        icon: 'XCircle',
      },
      {
        type: 'patient_source_referral',
        name: { en: 'Source & Referral', ar: 'المصدر والإحالة' },
        description: {
          en: 'How patients find your clinic',
          ar: 'كيف يجد المرضى عيادتك',
        },
        isFree: false,
        icon: 'Share2',
      },
    ],
  },
  appointment: {
    name: { en: 'Appointment Reports', ar: 'تقارير المواعيد' },
    icon: CalendarDays,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    reports: [
      {
        type: 'appointment_summary',
        name: { en: 'Appointment Summary', ar: 'ملخص المواعيد' },
        description: {
          en: "Today's appointment status breakdown",
          ar: 'تفصيل حالة مواعيد اليوم',
        },
        isFree: true,
        icon: 'CalendarDays',
      },
      {
        type: 'doctor_utilization',
        name: { en: 'Doctor Utilization', ar: 'استخدام الأطباء' },
        description: {
          en: 'Chair time usage per doctor',
          ar: 'استخدام وقت الكرسي لكل طبيب',
        },
        isFree: false,
        icon: 'UserCog',
      },
      {
        type: 'chair_utilization',
        name: { en: 'Chair Utilization', ar: 'استخدام الكراسي' },
        description: {
          en: 'Chair occupancy and efficiency',
          ar: 'إشغال الكراسي والكفاءة',
        },
        isFree: false,
        icon: 'Armchair',
      },
      {
        type: 'cancellation_analysis',
        name: { en: 'Cancellation Analysis', ar: 'تحليل الإلغاءات' },
        description: {
          en: 'Cancellation reasons and patterns',
          ar: 'أسباب وأنماط الإلغاء',
        },
        isFree: false,
        icon: 'XCircle',
      },
      {
        type: 'peak_hours_heatmap',
        name: { en: 'Peak Hours Heatmap', ar: 'خريطة ساعات الذروة' },
        description: {
          en: 'Busiest times of the week',
          ar: 'أكثر الأوقات ازدحاماً في الأسبوع',
        },
        isFree: false,
        icon: 'Clock',
      },
      {
        type: 'avg_duration_analysis',
        name: { en: 'Duration Analysis', ar: 'تحليل المدة' },
        description: {
          en: 'Average procedure durations',
          ar: 'متوسط مدة الإجراءات',
        },
        isFree: false,
        icon: 'Timer',
      },
    ],
  },
  clinical: {
    name: { en: 'Clinical Reports', ar: 'التقارير السريرية' },
    icon: Stethoscope,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    reports: [
      {
        type: 'procedures_performed',
        name: { en: 'Procedures Performed', ar: 'الإجراءات المنفذة' },
        description: {
          en: 'Breakdown of clinical procedures',
          ar: 'تفصيل الإجراءات السريرية',
        },
        isFree: false,
        icon: 'Stethoscope',
      },
      {
        type: 'treatment_plan_acceptance',
        name: { en: 'Treatment Plan Acceptance', ar: 'قبول خطة العلاج' },
        description: {
          en: 'Acceptance vs rejection rates',
          ar: 'معدلات القبول مقابل الرفض',
        },
        isFree: false,
        icon: 'FileCheck',
      },
      {
        type: 'lab_order_turnaround',
        name: { en: 'Lab Order Turnaround', ar: 'وقت دوران طلبات المختبر' },
        description: {
          en: 'Time from order to result delivery',
          ar: 'الوقت من الطلب حتى تسليم النتيجة',
        },
        isFree: false,
        icon: 'FlaskConical',
      },
      {
        type: 'prescription_volume',
        name: { en: 'Prescription Volume', ar: 'حجم الوصفات الطبية' },
        description: {
          en: 'Prescription counts and trends',
          ar: 'أعداد الوصفات والاتجاهات',
        },
        isFree: false,
        icon: 'Pill',
      },
    ],
  },
  operational: {
    name: { en: 'Operational Reports', ar: 'التقارير التشغيلية' },
    icon: Settings,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    reports: [
      {
        type: 'staff_performance',
        name: { en: 'Staff Performance', ar: 'أداء الموظفين' },
        description: {
          en: 'Productivity and efficiency metrics',
          ar: 'مقاييس الإنتاجية والكفاءة',
        },
        isFree: false,
        icon: 'Users',
      },
      {
        type: 'attendance_summary',
        name: { en: 'Attendance Summary', ar: 'ملخص الحضور' },
        description: {
          en: 'Staff check-in/check-out overview',
          ar: 'نظرة عامة على تسجيل دخول وخروج الموظفين',
        },
        isFree: false,
        icon: 'Clock',
      },
      {
        type: 'audit_log_report',
        name: { en: 'Audit Log Report', ar: 'تقرير سجل التدقيق' },
        description: {
          en: 'System activity and changes log',
          ar: 'سجل نشاط النظام والتغييرات',
        },
        isFree: false,
        icon: 'FileText',
      },
      {
        type: 'branch_comparison',
        name: { en: 'Branch Comparison', ar: 'مقارنة الفروع' },
        description: {
          en: 'Side-by-side branch performance',
          ar: 'أداء الفروع جنباً إلى جنب',
        },
        isFree: false,
        icon: 'Building2',
      },
    ],
  },
  inventory: {
    name: { en: 'Inventory Reports', ar: 'تقارير المخزون' },
    icon: Lock, // re-use Lock; ideally Package from lucide
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    reports: [
      {
        type: 'material_usage',
        name: { en: 'Material Usage', ar: 'استخدام المواد' },
        description: {
          en: 'Materials consumed across procedures and branches',
          ar: 'المواد المستهلكة عبر الإجراءات والفروع',
        },
        isFree: true,
        icon: 'Package',
      },
      {
        type: 'low_stock',
        name: { en: 'Low Stock Alerts', ar: 'تنبيهات انخفاض المخزون' },
        description: {
          en: 'Items below reorder level',
          ar: 'الأصناف تحت مستوى إعادة الطلب',
        },
        isFree: true,
        icon: 'AlertTriangle',
      },
      {
        type: 'stock_movement_history',
        name: { en: 'Stock Movement', ar: 'حركة المخزون' },
        description: {
          en: 'Inbound/outbound and transfers',
          ar: 'الوارد والصادر والتحويلات',
        },
        isFree: false,
        icon: 'ArrowLeftRight',
      },
      {
        type: 'expiry_report',
        name: { en: 'Expiry Tracking', ar: 'تتبع الصلاحية' },
        description: {
          en: 'Items approaching expiry date',
          ar: 'الأصناف التي تقترب من تاريخ الانتهاء',
        },
        isFree: false,
        icon: 'Calendar',
      },
      {
        type: 'consumption_forecast',
        name: { en: 'Consumption Analysis', ar: 'تحليل الاستهلاك' },
        description: {
          en: 'Usage patterns and forecasting',
          ar: 'أنماط الاستخدام والتنبؤ',
        },
        isFree: false,
        icon: 'TrendingUp',
      },
      {
        type: 'stock_valuation',
        name: { en: 'Inventory Valuation', ar: 'تقييم المخزون' },
        description: {
          en: 'Total inventory value and cost analysis',
          ar: 'إجمالي قيمة المخزون وتحليل التكلفة',
        },
        isFree: false,
        icon: 'DollarSign',
      },
    ],
  },
};

// ── Free Report Mock Chart Data (fallback if API fails) ─────────────────────

export const FREE_REPORT_CHART_DATA: Record<string, unknown[]> = {
  revenue_summary: [
    { period: 'Week 1', revenue: 10500 },
    { period: 'Week 2', revenue: 12300 },
    { period: 'Week 3', revenue: 11800 },
    { period: 'Week 4', revenue: 10600 },
  ],
  patient_overview: [
    { name: 'Active', value: 892, color: '#3b82f6' },
    { name: 'Inactive', value: 355, color: '#94a3b8' },
    { name: 'New', value: 18, color: '#22c55e' },
  ],
  appointment_summary: [
    { status: 'Booked', count: 8 },
    { status: 'Confirmed', count: 12 },
    { status: 'Completed', count: 5 },
    { status: 'No-Show', count: 1 },
    { status: 'Cancelled', count: 2 },
  ],
};

export const BAR_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

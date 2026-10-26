/**
 * Reports Hub Page
 * Based on DENTO_V2_MASTER_PLAN.md §21 & ADMIN_PORTAL_SCREENS.md
 *
 * Overview of all report categories with:
 * - Free tier: Dashboard Reports (revenue_summary, patient_overview, appointment_summary)
 * - Advanced tier: Full reports with locked preview + "Upgrade" CTA
 * - 5 category cards: Financial, Patient, Appointment, Clinical, Operational
 */

import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Users,
  CalendarDays,
  Stethoscope,
  Settings,
  Package,
  Lock,
  ChevronRight,
  BarChart,
  TrendingUp,
  FileText,
  Crown,
  Loader2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@dento/ui';
import { Badge } from '@dento/ui';
import { formatCurrency } from '@/lib/currency.js';
import { Button } from '@dento/ui';
import { useDashboardStats, useDashboardTrends } from '../hooks/useReports.js';
import { useSubscriptionPlan } from '../../subscription/hooks/useSubscription.js';
import { CATEGORY_CONFIG } from '../config/report-catalog.config.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ───────────────────────────────────────────────────────────────────

interface ReportCategoryCardData {
  category: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: LucideIcon;
  color: string;
  bg: string;
  totalReports: number;
  freeReports: number;
  paidReports: number;
  route: string;
}

// ── Derive category cards from CATEGORY_CONFIG (single source of truth) ─────

const CATEGORY_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  financial: { icon: DollarSign, color: 'text-accent', bg: 'bg-accent/10' },
  patient: { icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  appointment: {
    icon: CalendarDays,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
  },
  clinical: {
    icon: Stethoscope,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
  },
  operational: {
    icon: Settings,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
  },
  inventory: {
    icon: Package,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
  },
};

const REPORT_CATEGORIES: ReportCategoryCardData[] = Object.entries(CATEGORY_CONFIG).map(
  ([category, cfg]) => {
    const freeCount = cfg.reports.filter((r) => r.isFree).length;
    const visual = CATEGORY_ICONS[category] ?? {
      icon: FileText,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    };
    return {
      category,
      name: cfg.name,
      description: {
        en: cfg.reports.length + ' reports covering ' + cfg.name.en.toLowerCase(),
        ar: cfg.name.ar,
      },
      icon: visual.icon,
      color: visual.color,
      bg: visual.bg,
      totalReports: cfg.reports.length,
      freeReports: freeCount,
      paidReports: cfg.reports.length - freeCount,
      route: `/reports/${category}`,
    };
  },
);

const TOTAL_REPORTS = REPORT_CATEGORIES.reduce((s, c) => s + c.totalReports, 0);
const TOTAL_FREE = REPORT_CATEGORIES.reduce((s, c) => s + c.freeReports, 0);

// ── Quick Stat Cards (Free Tier - Dashboard Stats) ──────────────────────────

const QUICK_STATS_FALLBACK = [
  {
    label: 'Revenue This Month',
    value: '—',
    change: '',
    trend: 'up' as const,
    icon: DollarSign,
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    label: 'Patients This Month',
    value: '—',
    change: '',
    trend: 'up' as const,
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    label: "Today's Appointments",
    value: '—',
    change: '',
    trend: 'up' as const,
    icon: CalendarDays,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
  },
  {
    label: 'No-Show Rate',
    value: '—',
    change: '',
    trend: 'up' as const,
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function ReportsHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useDashboardStats();
  const { data: trends, isLoading: trendsLoading, isError: trendsError } = useDashboardTrends();
  const { data: subData } = useSubscriptionPlan();

  const enabledModules = subData?.plan?.enabledModules ?? [];
  const reportsUnlocked = enabledModules.length === 0 || enabledModules.includes('reports');

  const isLoading = statsLoading || trendsLoading;

  // Build live quick stats from API or fall back
  const quickStats = stats
    ? [
        {
          label: 'Revenue This Month',
          value: formatCurrency(stats.revenueThisMonth?.amount ?? 0),
          change: trends
            ? `${trends.revenueComparison.percentChange > 0 ? '+' : ''}${trends.revenueComparison.percentChange}%`
            : '',
          trend:
            (trends?.revenueComparison.percentChange ?? 0) >= 0
              ? ('up' as const)
              : ('down' as const),
          icon: DollarSign,
          color: 'text-accent',
          bg: 'bg-accent/10',
        },
        {
          label: 'Patients This Month',
          value: String(stats.patientsThisMonth?.newPatients ?? 0),
          change: trends
            ? `${trends.patientComparison.percentChange > 0 ? '+' : ''}${trends.patientComparison.percentChange}%`
            : '',
          trend:
            (trends?.patientComparison.percentChange ?? 0) >= 0
              ? ('up' as const)
              : ('down' as const),
          icon: Users,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
        {
          label: "Today's Appointments",
          value: String(stats.todaysAppointments?.total ?? 0),
          change: trends
            ? `${trends.appointmentComparison.percentChange > 0 ? '+' : ''}${trends.appointmentComparison.percentChange}%`
            : '',
          trend:
            (trends?.appointmentComparison.percentChange ?? 0) >= 0
              ? ('up' as const)
              : ('down' as const),
          icon: CalendarDays,
          color: 'text-purple-600',
          bg: 'bg-purple-50 dark:bg-purple-500/10',
        },
        {
          label: 'No-Show Rate',
          value: stats.todaysAppointments?.total
            ? `${((stats.todaysAppointments.noShow / stats.todaysAppointments.total) * 100).toFixed(1)}%`
            : '0%',
          change: trends
            ? `${trends.noShowComparison.percentChange > 0 ? '+' : ''}${trends.noShowComparison.percentChange}%`
            : '',
          trend:
            (trends?.noShowComparison.percentChange ?? 0) <= 0
              ? ('up' as const)
              : ('down' as const),
          icon: TrendingUp,
          color: 'text-amber-600',
          bg: 'bg-amber-50 dark:bg-amber-500/10',
        },
      ]
    : QUICK_STATS_FALLBACK;

  return (
    <div className="space-y-6 p-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {(statsError || trendsError) && !isLoading && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{t('reports.error.dashboardData')}</p>
          </CardContent>
        </Card>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('reports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {TOTAL_REPORTS} {t('reports.totalReports', { count: TOTAL_REPORTS }).split(' ').pop()}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {TOTAL_FREE} {t('reports.free', { count: TOTAL_FREE }).split(' ').pop()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats — Free Tier Dashboard */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          {t('reports.dashboardOverview')}
          <Badge variant="success" className="text-[10px] px-2 py-0">
            FREE
          </Badge>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p
                      className={`text-xs mt-1 ${
                        stat.trend === 'up' ? 'text-accent' : 'text-destructive'
                      }`}
                    >
                      {stat.change} {t('reports.stat.vsLastMonth')}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Report Categories Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {t('reports.reportCategories')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_CATEGORIES.map((cat) => (
            <Card
              key={cat.category}
              className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              onClick={() => navigate(cat.route)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${cat.bg}`}>
                    <cat.icon className={`h-6 w-6 ${cat.color}`} />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-base mt-2">{cat.name.en}</CardTitle>
                <CardDescription className="text-xs">{cat.description.en}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0">
                    {cat.totalReports} Reports
                  </Badge>
                  {!reportsUnlocked && cat.freeReports > 0 && (
                    <Badge variant="success" className="text-[10px] px-2 py-0">
                      {cat.freeReports} Free
                    </Badge>
                  )}
                  {!reportsUnlocked && cat.paidReports > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0 flex items-center gap-0.5"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      {cat.paidReports} Advanced
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Advanced Analytics Upsell Banner — only show when reports module is not enabled */}
      {!reportsUnlocked && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t('reports.upgrade.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('reports.upgrade.subtitle')}
                  </p>
                </div>
              </div>
              <Button className="gap-2">
                <Crown className="h-4 w-4" />
                {t('reports.upgrade.button')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

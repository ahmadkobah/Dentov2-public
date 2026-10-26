// Admin Dashboard - 8 Widgets per ADMIN_PORTAL_SCREENS.md §2
import { useMemo } from 'react';
import {
  Users,
  CalendarDays,
  DollarSign,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  AlertTriangle,
  Package,
  Check,
  Circle,
  Timer,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent } from '@dento/ui';
import type { IUpcomingAppointment, ILowStockAlert } from '@dento/shared';
import { useDashboardStats, useDashboardTrends } from '../../reports/hooks/useReports.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ============================================================================
// TYPES
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
  bg: string;
}

interface Appointment {
  id: string;
  patient: string;
  doctor: string;
  time: string;
  status: 'completed' | 'in-progress' | 'waiting';
}

interface RevenueDay {
  day: string;
  revenue: number;
  fill: string;
}

// ============================================================================
// EMPTY FALLBACK (shown only while first load is in progress)
// ============================================================================

const emptyStats: StatCardProps[] = [
  {
    title: 'stat.todaysPatients',
    value: '—',
    change: '',
    trend: 'neutral',
    icon: Users,
    color: 'text-brand-500',
    bg: 'bg-brand-50 dark:bg-brand-500/10',
  },
  {
    title: 'stat.appointmentsRemaining',
    value: '—',
    change: '',
    trend: 'neutral',
    icon: CalendarDays,
    color: 'text-info-500',
    bg: 'bg-info-50 dark:bg-info-500/10',
  },
  {
    title: 'stat.walkInsWaiting',
    value: '—',
    change: '',
    trend: 'neutral',
    icon: UserPlus,
    color: 'text-warning-500',
    bg: 'bg-warning-50 dark:bg-warning-500/10',
  },
  {
    title: 'stat.revenueThisMonth',
    value: '—',
    change: '',
    trend: 'neutral',
    icon: DollarSign,
    color: 'text-success-500',
    bg: 'bg-success-50 dark:bg-success-500/10',
  },
];

/** Map API appointment status to the 3-state UI status */
function mapAppointmentStatus(apiStatus: string): Appointment['status'] {
  switch (apiStatus) {
    case 'completed':
      return 'completed';
    case 'in_progress':
    case 'in-progress':
    case 'checked_in':
      return 'in-progress';
    default:
      return 'waiting';
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Widget 1-4: Stat Cards
function StatCard({ title, value, change, trend, icon: Icon, color, bg }: StatCardProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${bg}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        {change && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend === 'up'
                ? 'text-success-500'
                : trend === 'down'
                  ? 'text-error-500'
                  : 'text-gray-400'
            }`}
          >
            {trend === 'up' && <TrendingUp className="h-4 w-4" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(`dashboard.${title}`)}</p>
      </div>
    </div>
  );
}

// Widget 5: Appointments Today
function AppointmentsToday({ appointments }: { appointments: Appointment[] }) {
  const { t } = useTranslation();
  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-success-500" />;
      case 'in-progress':
        return <Circle className="h-4 w-4 text-success-500 fill-success-500" />;
      case 'waiting':
        return <Timer className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.appointments.title')}
        </h3>
        <Link
          to="/appointments"
          className="gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 flex items-center"
        >
          {t('dashboard.appointments.viewCalendar')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="flex items-center gap-4">
              <span className="w-12 text-sm font-medium text-gray-600 dark:text-gray-300">
                {apt.time}
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{apt.patient}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{apt.doctor}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">{getStatusIcon(apt.status)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Widget 6: Revenue Chart (Recharts)
function RevenueChart({ data, total }: { data: RevenueDay[]; total: number }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.revenue.title')}
        </h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), t('dashboard.revenue.tooltip')]}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === data.length - 1 ? '#22c55e' : '#10b981'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.revenue.total')}{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(total)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Widget 7: Low Stock Alerts (Live data from /api/dashboard/stats)
function LowStockAlertWidget({ alerts }: { alerts: ILowStockAlert[] }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.lowStock.title')}
        </h3>
        <Link
          to="/inventory?filter=low_stock"
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
        >
          {t('dashboard.lowStock.viewAll')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {alerts.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <Package className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            {t('dashboard.lowStock.healthy')}
          </div>
        ) : (
          alerts.map((item) => (
            <div
              key={item.itemId}
              className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900 dark:text-white">
                  {typeof item.name === 'object'
                    ? (item.name as { en?: string }).en || 'Item'
                    : item.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('dashboard.lowStock.qty')}: {item.currentQuantity} /{' '}
                  {t('dashboard.lowStock.reorder')}: {item.reorderLevel}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-500/20 dark:text-warning-400">
                {t('dashboard.lowStock.badge')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Widget 8: Waiting Room (Live data from /api/dashboard/stats)
function WaitingRoomWidget({ data }: { data: { count: number; avgWaitMinutes: number } }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.waitingRoom.title')}
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-success-500">
          <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
          {t('dashboard.waitingRoom.live')}
        </span>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
              <Users className="h-8 w-8 text-brand-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.count}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.waitingRoom.patientsWaiting')}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-50 dark:bg-warning-500/10">
              <Timer className="h-8 w-8 text-warning-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.avgWaitMinutes}
              <span className="text-lg font-normal text-gray-400">
                {' '}
                {t('dashboard.waitingRoom.min')}
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.waitingRoom.avgWaitTime')}
            </p>
          </div>
        </div>
        {data.count === 0 && (
          <p className="mt-4 text-center text-sm text-gray-400 dark:text-gray-500">
            {t('dashboard.waitingRoom.empty')}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT - 8 Widgets per ADMIN_PORTAL_SCREENS.md Â§2
// ============================================================================

export default function DashboardPage() {
  const { t } = useTranslation();
  // Fetch live dashboard data
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    dataUpdatedAt,
  } = useDashboardStats();
  const { data: trends, isLoading: trendsLoading, isError: trendsError } = useDashboardTrends();
  const isLoading = statsLoading || trendsLoading;

  // Today's formatted date
  const todayDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  );

  // "last updated" relative time
  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const diff = Math.round((Date.now() - dataUpdatedAt) / 60_000);
    if (diff < 1) return 'just now';
    return `${diff} min ago`;
  }, [dataUpdatedAt]);

  // Build stat cards from live data when available
  const liveStats: StatCardProps[] = stats
    ? [
        {
          title: 'stat.todaysPatients',
          value: stats.todaysAppointments?.total ?? 0,
          change: trends
            ? `${trends.appointmentComparison.percentChange > 0 ? '+' : ''}${trends.appointmentComparison.percentChange}%`
            : '',
          trend: (trends?.appointmentComparison.percentChange ?? 0) >= 0 ? 'up' : 'down',
          icon: Users,
          color: 'text-brand-500',
          bg: 'bg-brand-50 dark:bg-brand-500/10',
        },
        {
          title: 'stat.appointmentsRemaining',
          value:
            (stats.todaysAppointments?.booked ?? 0) + (stats.todaysAppointments?.confirmed ?? 0),
          change: '',
          trend: 'neutral',
          icon: CalendarDays,
          color: 'text-info-500',
          bg: 'bg-info-50 dark:bg-info-500/10',
        },
        {
          title: 'stat.walkInsWaiting',
          value: stats.walkinsToday ?? 0,
          change: '',
          trend: 'neutral',
          icon: UserPlus,
          color: 'text-warning-500',
          bg: 'bg-warning-50 dark:bg-warning-500/10',
        },
        {
          title: 'stat.revenueThisMonth',
          value: formatCurrency(stats.revenueThisMonth?.amount ?? 0),
          change: stats.revenueThisMonth
            ? `${stats.revenueThisMonth.trend > 0 ? '+' : ''}${stats.revenueThisMonth.trend}%`
            : '',
          trend: (stats.revenueThisMonth?.trend ?? 0) >= 0 ? 'up' : 'down',
          icon: DollarSign,
          color: 'text-success-500',
          bg: 'bg-success-50 dark:bg-success-500/10',
        },
      ]
    : emptyStats;

  // Build appointments list from live data (uses proper IUpcomingAppointment fields)
  const liveAppointments: Appointment[] = useMemo(() => {
    if (!stats?.upcomingAppointments?.length) return [];
    return stats.upcomingAppointments.slice(0, 5).map((a: IUpcomingAppointment) => {
      // time may be HH:mm string (startTime) or ISO date string
      const timeStr =
        typeof a.time === 'string' && /^\d{2}:\d{2}$/.test(a.time)
          ? a.time
          : new Date(a.time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
      return {
        id: a.appointmentId,
        patient: a.patientName,
        doctor: a.doctorName,
        time: timeStr,
        status: mapAppointmentStatus(a.status),
      };
    });
  }, [stats?.upcomingAppointments]);

  // Revenue chart — currently derived from monthly trend data
  // A dedicated /api/dashboard/revenue-daily endpoint would enable a proper 7-day bar chart
  const revenueChartData: RevenueDay[] = useMemo(() => {
    if (!trends) return [];
    const current = trends.revenueComparison.currentMonth;
    const previous = trends.revenueComparison.previousMonth;
    // Show simple comparison bars until daily breakdown API exists
    return [
      { day: t('dashboard.revenue.lastMonth'), revenue: previous, fill: '#6b7280' },
      { day: t('dashboard.revenue.thisMonth'), revenue: current, fill: '#10b981' },
    ];
  }, [trends]);

  const revenueTotal = useMemo(
    () => revenueChartData.reduce((sum, d) => sum + d.revenue, 0),
    [revenueChartData],
  );

  // Extract low stock alerts + waiting room from live dashboard data
  const lowStockAlerts: ILowStockAlert[] = stats?.lowStockAlerts ?? [];
  const waitingRoom = stats?.waitingRoom ?? { count: 0, avgWaitMinutes: 0 };

  return (
    <div className="space-y-6">
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error banner */}
      {(statsError || trendsError) && !isLoading && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{t('dashboard.error.load')}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.error.cached')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.today')} {todayDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              {t('dashboard.lastUpdated')} {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Widget 1-4: Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Widget 5-6: Appointments Today + Revenue Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AppointmentsToday appointments={liveAppointments} />
        <RevenueChart data={revenueChartData} total={revenueTotal} />
      </div>

      {/* Widget 7-8: Low Stock Alerts + Waiting Room */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LowStockAlertWidget alerts={lowStockAlerts} />
        <WaitingRoomWidget data={waitingRoom} />
      </div>
    </div>
  );
}

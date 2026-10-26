import { useState, useMemo } from 'react';
import { Button } from '@dento/ui';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Filter,
  Loader2,
  MailOpen,
  Trash2,
  Calendar,
  Users,
  CreditCard,
  Settings,
  Info,
  ShoppingCart,
  Megaphone,
  RotateCcw,
  ListOrdered,
  AlertCircle,
} from 'lucide-react';
import {
  useNotificationList,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDismissNotification,
  type Notification,
  type NotificationListFilters,
} from '../hooks/useNotifications.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ──────────────────────────────────────────────────────────────

type NotificationCategory = Notification['category'];

// ── Helpers ────────────────────────────────────────────────────────────

/** Resolve bilingual text (prefer English for now) */
function t(value: string | { en: string; ar: string }): string {
  return typeof value === 'string' ? value : value.en;
}

/** Relative time from ISO date string */
function relativeTime(
  iso: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('notifications.relativeTime.justNow');
  if (mins < 60) return t('notifications.relativeTime.minAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return hours === 1
      ? t('notifications.relativeTime.hourAgo', { count: hours })
      : t('notifications.relativeTime.hoursAgo', { count: hours });
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return t('notifications.relativeTime.yesterday');
  return t('notifications.relativeTime.daysAgo', { count: days });
}

const typeConfig: Record<NotificationCategory, { icon: typeof Bell; color: string; bg: string }> = {
  appointment: {
    icon: Calendar,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  payment: {
    icon: CreditCard,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  clinical: {
    icon: Users,
    color: 'text-brand-600 dark:text-brand-400',
    bg: 'bg-brand-100 dark:bg-brand-900/30',
  },
  inventory: {
    icon: ShoppingCart,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  system: {
    icon: Info,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
  marketing: {
    icon: Megaphone,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
  },
  recall: {
    icon: RotateCcw,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
  },
  queue: {
    icon: ListOrdered,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
};

const filterOptions: { label: string; value: NotificationCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Appointments', value: 'appointment' },
  { label: 'Payments', value: 'payment' },
  { label: 'Clinical', value: 'clinical' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'System', value: 'system' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Recall', value: 'recall' },
  { label: 'Queue', value: 'queue' },
];

// ── Component ──────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { t: translate } = useTranslation();
  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Build API query filters
  const apiFilters = useMemo<NotificationListFilters>(() => {
    const f: NotificationListFilters = { limit: 50, offset: 0 };
    if (filter !== 'all') f.category = filter;
    if (showUnreadOnly) f.unreadOnly = true;
    return f;
  }, [filter, showUnreadOnly]);

  // Data hooks
  const { data, isLoading, isError } = useNotificationList(apiFilters);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const dismissMutation = useDismissNotification();

  const notifications = data?.notifications ?? [];

  const markAsRead = (id: string) => markAsReadMutation.mutate(id);
  const markAllAsRead = () => markAllAsReadMutation.mutate();
  const dismissNotification = (id: string) => dismissMutation.mutate(id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {translate('notifications.page.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unreadCount > 0
              ? unreadCount === 1
                ? translate('notifications.page.unreadCount', { count: unreadCount })
                : translate('notifications.page.unreadCountPlural', { count: unreadCount })
              : translate('notifications.page.allCaughtUp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showUnreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`gap-1.5 ${
              showUnreadOnly
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : ''
            }`}
          >
            {showUnreadOnly ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {showUnreadOnly
              ? translate('notifications.actions.showAll')
              : translate('notifications.actions.unreadOnly')}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              {translate('notifications.actions.markAllRead')}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings className="h-4 w-4" />
            {translate('notifications.actions.preferences')}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
        <Filter className="mx-2 h-4 w-4 shrink-0 text-gray-400" />
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(opt.value)}
            className={`whitespace-nowrap ${
              filter === opt.value
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {translate(
              opt.value === 'all'
                ? 'notifications.filterOptions.all'
                : opt.value === 'appointment'
                  ? 'notifications.filterOptions.appointments'
                  : opt.value === 'payment'
                    ? 'notifications.filterOptions.payments'
                    : opt.value === 'clinical'
                      ? 'notifications.filterOptions.clinical'
                      : opt.value === 'inventory'
                        ? 'notifications.filterOptions.inventory'
                        : opt.value === 'system'
                          ? 'notifications.filterOptions.system'
                          : opt.value === 'marketing'
                            ? 'notifications.filterOptions.marketing'
                            : opt.value === 'recall'
                              ? 'notifications.filterOptions.recall'
                              : 'notifications.filterOptions.queue',
            )}
          </Button>
        ))}
      </div>

      {/* Notification List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-3 h-12 w-12 text-destructive" />
            <p className="text-lg font-medium text-destructive">
              {translate('notifications.error.loadFailed')}
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              {translate('notifications.error.checkConnection')}
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MailOpen className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
              {translate('notifications.empty.title')}
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              {showUnreadOnly
                ? translate('notifications.empty.allRead')
                : translate('notifications.empty.nothingForFilter')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notif) => {
              const config = typeConfig[notif.category] ?? typeConfig.system;
              const Icon = config.icon;

              return (
                <li
                  key={notif._id}
                  className={`group relative flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    !notif.isRead ? 'bg-brand-50/30 dark:bg-brand-950/10' : ''
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.isRead && (
                    <span className="absolute inset-s-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand-500" />
                  )}

                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${!notif.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {t(notif.title)}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {t(notif.body)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="h-3 w-3" />
                        {relativeTime(notif.createdAt, translate)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
                      >
                        {notif.category}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notif._id)}
                        className="h-auto w-auto p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title={translate('notifications.actions.markAsRead')}
                        aria-label={translate('notifications.actions.markAsRead')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissNotification(notif._id)}
                      className="h-auto w-auto p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title={translate('notifications.actions.dismiss')}
                      aria-label={translate('notifications.actions.dismissNotification')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

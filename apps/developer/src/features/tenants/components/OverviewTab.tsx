import {
  Mail,
  Phone,
  Globe,
  Clock,
  DollarSign,
  Calendar,
  Shield,
  Database,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { Button } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import { InfoItem, StatCard, ActivityItem } from './tenant-detail-helpers.js';
import { useTenantRecentActivity } from '../hooks/useTenantAuditLogs.js';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function OverviewTab({ tenant }: { tenant: TenantDetail }) {
  const { data: activityData, isLoading: activityLoading } = useTenantRecentActivity(tenant.slug);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Clinic Info */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Clinic Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem icon={Mail} label="Email" value={tenant.email} />
            <InfoItem icon={Phone} label="Phone" value={tenant.phone} />
            <InfoItem icon={Globe} label="Country" value={tenant.country} />
            <InfoItem icon={Clock} label="Timezone" value={tenant.timezone} />
            <InfoItem icon={DollarSign} label="Currency" value={tenant.currency} />
            <InfoItem icon={Calendar} label="Joined" value={tenant.createdAt} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <StatCard label="Plan" value={tenant.plan} color="brand" />
          <StatCard
            label="Active Users"
            value={`${tenant.users}/${tenant.maxUsers}`}
            color="success"
          />
          <StatCard label="Database Size" value={tenant.dbSize} color="blue-light" />
          <StatCard
            label={`Storage (${tenant.storageTierName})`}
            value={tenant.storageUsed}
            color="warning"
          />
        </div>
      </div>

      {/* Enabled Modules */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Enabled Modules ({tenant.modules.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {tenant.modules.map((mod) => (
            <span
              key={mod}
              className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
            >
              {mod}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subscription */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Subscription</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Plan</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {tenant.plan}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">MRR</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {tenant.mrr ? `$${tenant.mrr}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                {tenant.status}
              </span>
            </div>
            <Button
              variant="outline"
              className="mt-2 w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Manage Subscription
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {activityLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : activityData?.data && activityData.data.length > 0 ? (
              activityData.data.map((log) => (
                <ActivityItem
                  key={log._id}
                  text={log.description ?? `${log.action} ${log.resourceType}`}
                  time={timeAgo(log.createdAt)}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            )}
          </div>
        </div>

        {/* Storage & Backup */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 mb-3">
              <Database className="h-5 w-5 text-brand-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Database</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.dbSize}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Backup info not available</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 mb-3">
              <HardDrive className="h-5 w-5 text-warning-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Storage</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tenant.storageUsed}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tier: {tenant.storageTierName}
            </p>
          </div>
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-warning-600 dark:text-warning-400" />
              <span className="text-sm font-medium text-warning-800 dark:text-warning-300">
                Backup Reminder
              </span>
            </div>
            <p className="mt-1 text-xs text-warning-700 dark:text-warning-400">
              Consider enabling automated daily backups
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

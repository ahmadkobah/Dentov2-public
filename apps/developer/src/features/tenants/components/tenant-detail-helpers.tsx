/**
 * Shared helper components used across TenantDetail tabs.
 */

// ── InfoItem ───────────────────────────────────────────────

export function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-medium text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────

const colorClasses: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/10',
  success: 'bg-success-50 text-success-500 dark:bg-success-500/10',
  warning: 'bg-warning-50 text-warning-500 dark:bg-warning-500/10',
  'blue-light': 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/10',
};

export function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${colorClasses[color]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

// ── ActivityItem ───────────────────────────────────────────

export function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-brand-500" />
      <div className="flex-1">
        <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
      </div>
    </div>
  );
}

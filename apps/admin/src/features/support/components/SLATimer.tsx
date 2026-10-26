import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@dento/ui';
import { useTranslation } from '@/stores/locale.store.js';

interface SLATimerProps {
  deadline: string | null;
  label?: string;
  resolved?: boolean;
  className?: string;
}

function formatRemaining(ms: number, t: (key: string) => string): string {
  if (ms <= 0) return t('support.sla.overdue');
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SLATimer({ deadline, label, resolved, className }: SLATimerProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline || resolved) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [deadline, resolved]);

  if (!deadline) return null;

  const deadlineMs = new Date(deadline).getTime();
  const remaining = deadlineMs - now;
  const isBreached = remaining <= 0;

  let colorClass = 'text-green-600 dark:text-green-400';
  let bgClass = 'bg-green-50 dark:bg-green-900/20';
  let Icon = Clock;

  if (resolved) {
    colorClass = 'text-green-600 dark:text-green-400';
    bgClass = 'bg-green-50 dark:bg-green-900/20';
    Icon = CheckCircle2;
  } else if (isBreached) {
    colorClass = 'text-red-600 dark:text-red-400';
    bgClass = 'bg-red-50 dark:bg-red-900/20';
    Icon = AlertTriangle;
  } else if (remaining < 3_600_000) {
    colorClass = 'text-red-600 dark:text-red-400';
    bgClass = 'bg-red-50 dark:bg-red-900/20';
    Icon = AlertTriangle;
  } else if (remaining < 14_400_000) {
    colorClass = 'text-yellow-600 dark:text-yellow-400';
    bgClass = 'bg-yellow-50 dark:bg-yellow-900/20';
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        bgClass,
        colorClass,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label && <span className="opacity-75">{label}:</span>}
      {resolved ? (
        <span>{t('support.sla.slaMet')}</span>
      ) : (
        <span>{formatRemaining(remaining, t)}</span>
      )}
    </div>
  );
}

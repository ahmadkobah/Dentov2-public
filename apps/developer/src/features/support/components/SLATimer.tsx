import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@dento/ui';

interface SLATimerProps {
  /** ISO date string for when the deadline expires */
  deadline: string | null;
  /** Label shown before the countdown (e.g. "Response" or "Resolution") */
  label?: string;
  /** If true the ticket is resolved/closed — shows "Met" style */
  resolved?: boolean;
  className?: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Overdue';
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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline || resolved) return;
    const id = setInterval(() => setNow(Date.now()), 60_000); // update every minute
    return () => clearInterval(id);
  }, [deadline, resolved]);

  if (!deadline) return null;

  const deadlineMs = new Date(deadline).getTime();
  const remaining = deadlineMs - now;
  const isBreached = remaining <= 0;

  // Color coding: green > 50%, yellow 10-50%, red < 10% or overdue
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
    // Less than 1 hour
    colorClass = 'text-red-600 dark:text-red-400';
    bgClass = 'bg-red-50 dark:bg-red-900/20';
    Icon = AlertTriangle;
  } else if (remaining < 14_400_000) {
    // Less than 4 hours
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
      {resolved ? <span>SLA Met</span> : <span>{formatRemaining(remaining)}</span>}
    </div>
  );
}

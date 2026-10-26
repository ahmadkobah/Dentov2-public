import * as React from 'react';
import { cn } from '../utils/cn';

type StatVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  variant?: StatVariant;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<StatVariant, string> = {
  default: 'bg-white dark:bg-gray-900',
  success: 'bg-success-50 dark:bg-success-950',
  warning: 'bg-warning-50 dark:bg-warning-950',
  error: 'bg-error-50 dark:bg-error-950',
  info: 'bg-blue-light-50 dark:bg-blue-light-950',
};

const changeStyles: Record<string, string> = {
  positive: 'text-success-600 dark:text-success-400',
  negative: 'text-error-600 dark:text-error-400',
  neutral: 'text-gray-500 dark:text-gray-400',
};

function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  variant = 'default',
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-2xl border border-gray-200 p-5 shadow-theme-xs dark:border-gray-800',
        variantStyles[variant],
        onClick && 'cursor-pointer transition-shadow hover:shadow-theme-md',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {change && (
          <span className={cn('text-sm font-medium', changeStyles[changeType])}>{change}</span>
        )}
      </div>
    </div>
  );
}

export { StatCard, type StatCardProps, type StatVariant };

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@dento/ui';
import { ArrowRight } from 'lucide-react';
import { useChangeModuleStatus } from '../hooks/useModules.js';

const LIFECYCLE_ORDER = ['development', 'beta', 'active', 'deprecated', 'retired'] as const;
type Status = (typeof LIFECYCLE_ORDER)[number];

const STATUS_LABELS: Record<Status, string> = {
  development: 'Development',
  beta: 'Beta',
  active: 'Active',
  deprecated: 'Deprecated',
  retired: 'Retired',
};

const STATUS_COLORS: Record<Status, string> = {
  development: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  beta: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  deprecated: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  retired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

function getValidTransitions(current: Status): Status[] {
  const idx = LIFECYCLE_ORDER.indexOf(current);
  const result: Status[] = [];
  if (idx > 0) result.push(LIFECYCLE_ORDER[idx - 1]);
  if (idx < LIFECYCLE_ORDER.length - 1) result.push(LIFECYCLE_ORDER[idx + 1]);
  return result;
}

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleSlug: string;
  currentStatus: Status;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  moduleSlug,
  currentStatus,
}: ChangeStatusDialogProps) {
  const changeStatus = useChangeModuleStatus(moduleSlug);
  const validTargets = getValidTransitions(currentStatus);

  const handleChange = (target: Status) => {
    changeStatus.mutate({ status: target }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>{moduleSlug}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status */}
          <div className="flex items-center justify-center">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[currentStatus]}`}
            >
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>

          {/* Lifecycle bar */}
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
            {LIFECYCLE_ORDER.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                <span
                  className={s === currentStatus ? 'font-bold text-gray-900 dark:text-white' : ''}
                >
                  {STATUS_LABELS[s]}
                </span>
                {i < LIFECYCLE_ORDER.length - 1 && <ArrowRight className="h-3 w-3" />}
              </span>
            ))}
          </div>

          {/* Transition buttons */}
          <div className="flex flex-col gap-2">
            {validTargets.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No valid transitions available.</p>
            ) : (
              validTargets.map((target) => {
                const isForward =
                  LIFECYCLE_ORDER.indexOf(target) > LIFECYCLE_ORDER.indexOf(currentStatus);
                return (
                  <Button
                    key={target}
                    variant={isForward ? 'default' : 'outline'}
                    className="w-full gap-2"
                    onClick={() => handleChange(target)}
                    disabled={changeStatus.isPending}
                  >
                    {isForward ? 'Promote to' : 'Revert to'} {STATUS_LABELS[target]}
                  </Button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ClaimTimeline — Visual stepper showing insurance claim lifecycle.
 * Per DENTO_V2_MASTER_PLAN.md §13 (Insurance Management).
 * Displays the 6-status flow with the current position highlighted.
 */

import { cn } from '@dento/ui';
import { useTranslation } from '@/stores/locale.store.js';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Send,
  FileSearch,
  DollarSign,
} from 'lucide-react';

// ── Timeline Steps ─────────────────────────────────────

interface TimelineStep {
  status: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CLAIM_STEPS: TimelineStep[] = [
  { status: 'pending', label: 'insurance.timeline.steps.pending', icon: Clock },
  { status: 'submitted', label: 'insurance.timeline.steps.submitted', icon: Send },
  { status: 'under_review', label: 'insurance.timeline.steps.underReview', icon: FileSearch },
  { status: 'approved', label: 'insurance.timeline.steps.approved', icon: CheckCircle },
  { status: 'paid', label: 'insurance.timeline.steps.paid', icon: DollarSign },
];

/** The terminal / branching statuses shown separately */
const TERMINAL_STATUSES: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  denied: { label: 'insurance.timeline.terminal.denied', icon: XCircle },
  appealed: { label: 'insurance.timeline.terminal.appealed', icon: AlertTriangle },
  partially_approved: { label: 'insurance.timeline.terminal.partiallyApproved', icon: CheckCircle },
};

// ── Helpers ────────────────────────────────────────────

function getStepIndex(status: string): number {
  return CLAIM_STEPS.findIndex((s) => s.status === status);
}

function isTerminal(status: string): boolean {
  return status in TERMINAL_STATUSES;
}

// ── Component ──────────────────────────────────────────

interface ClaimTimelineProps {
  currentStatus: string;
  className?: string;
}

export function ClaimTimeline({ currentStatus, className }: ClaimTimelineProps) {
  const currentIdx = getStepIndex(currentStatus);
  const terminal = isTerminal(currentStatus);
  const { t } = useTranslation();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main flow */}
      <div className="flex items-center gap-0">
        {CLAIM_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = !terminal && currentIdx > idx;
          const isCurrent = !terminal && currentIdx === idx;
          const isFuture = terminal ? idx > getStepIndex('under_review') : currentIdx < idx;

          return (
            <div key={step.status} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted && 'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-primary/10 text-primary',
                    isFuture && 'border-muted text-muted-foreground',
                    terminal &&
                      idx <= getStepIndex('under_review') &&
                      'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  <StepIcon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-xs font-medium whitespace-nowrap',
                    (isCompleted || isCurrent) && 'text-foreground',
                    isFuture && 'text-muted-foreground',
                    terminal && idx <= getStepIndex('under_review') && 'text-foreground',
                  )}
                >
                  {t(step.label)}
                </span>
              </div>

              {/* Connector line */}
              {idx < CLAIM_STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-0.5 w-8 sm:w-12',
                    !terminal && currentIdx > idx ? 'bg-primary' : 'bg-muted',
                    terminal && idx < getStepIndex('under_review') && 'bg-primary',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Terminal status indicator */}
      {terminal && TERMINAL_STATUSES[currentStatus] && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          {(() => {
            const TermIcon = TERMINAL_STATUSES[currentStatus].icon;
            return (
              <>
                <TermIcon
                  className={cn(
                    'h-5 w-5',
                    currentStatus === 'denied' && 'text-destructive',
                    currentStatus === 'appealed' && 'text-amber-500',
                    currentStatus === 'partially_approved' && 'text-primary',
                  )}
                />
                <span className="text-sm font-medium">
                  {t(TERMINAL_STATUSES[currentStatus].label)}
                </span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

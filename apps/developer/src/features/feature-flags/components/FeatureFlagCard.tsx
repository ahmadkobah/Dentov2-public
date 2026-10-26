/**
 * FeatureFlagCard — Displays a single feature flag
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.10
 * Shows status dot (green/yellow/red), key, name, percentage bar,
 * tenant scope indicator, toggle switch, and action buttons.
 */

import {
  Card,
  CardContent,
  Badge,
  Button,
  Switch,
  Progress,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@dento/ui';
import { Pencil, Trash2, Globe, Building2, Users, Percent } from 'lucide-react';
import type { FeatureFlag } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

function getStatusConfig(flag: FeatureFlag) {
  if (!flag.enabled) {
    return { dot: 'bg-red-500', label: 'Disabled', variant: 'destructive' as const };
  }
  if (flag.percentageRollout !== null && flag.percentageRollout < 100) {
    return { dot: 'bg-yellow-500', label: 'Partial', variant: 'secondary' as const };
  }
  return { dot: 'bg-green-500', label: 'Enabled', variant: 'default' as const };
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FeatureFlagCardProps {
  flag: FeatureFlag;
  onEdit: (flag: FeatureFlag) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeatureFlagCard({ flag, onEdit, onToggle, onDelete }: FeatureFlagCardProps) {
  const status = getStatusConfig(flag);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Status dot */}
        <div className="flex shrink-0 items-center">
          <span className={`h-3 w-3 rounded-full ${status.dot}`} />
        </div>

        {/* Flag info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {flag.name}
            </h4>
            <Badge variant={status.variant} className="text-xs">
              {status.label}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {flag.key}
            </code>

            {/* Scope indicator */}
            {flag.tenantId ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs">
                      <Building2 className="me-1 h-3 w-3" />
                      Tenant
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Scoped to tenant: {flag.tenantId}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Globe className="me-1 h-3 w-3" />
                Global
              </Badge>
            )}

            {/* Percentage rollout */}
            {flag.percentageRollout !== null && (
              <Badge variant="secondary" className="text-xs">
                <Percent className="me-1 h-3 w-3" />
                {flag.percentageRollout}%
              </Badge>
            )}

            {/* User targeting */}
            {flag.userIds && flag.userIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="me-1 h-3 w-3" />
                {flag.userIds.length} user{flag.userIds.length !== 1 ? 's' : ''}
              </Badge>
            )}

            {/* Description preview */}
            {flag.description && (
              <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                — {flag.description}
              </span>
            )}
          </div>

          {/* Percentage rollout bar */}
          {flag.percentageRollout !== null && flag.enabled && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={flag.percentageRollout} className="h-1.5 flex-1" />
              <span className="text-xs text-gray-500">{flag.percentageRollout}%</span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={(checked) => onToggle(flag._id, checked)}
                  aria-label={`Toggle ${flag.name}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>{flag.enabled ? 'Disable' : 'Enable'} flag</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(flag)} aria-label="Edit flag">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(flag._id)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
            aria-label="Delete flag"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

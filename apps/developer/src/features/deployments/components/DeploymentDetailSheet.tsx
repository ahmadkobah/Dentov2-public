import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
  Separator,
} from '@dento/ui';
import { RotateCcw, Loader2, GitBranch, GitCommit, AlertTriangle } from 'lucide-react';
import type { DeployStatus } from '@dento/shared';
import { useDeploymentDetail, useRollback } from '../hooks/useDeployments.js';
import { formatDateFull as formatDate } from '../../../lib/date.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '—';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const statusVariant: Record<DeployStatus, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  queued: 'secondary',
  building: 'warning',
  deploying: 'warning',
  success: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
  rolled_back: 'destructive',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface DeploymentDetailSheetProps {
  deploymentId: string | null;
  onClose: () => void;
}

export function DeploymentDetailSheet({ deploymentId, onClose }: DeploymentDetailSheetProps) {
  const { data: deployment, isLoading, isError } = useDeploymentDetail(deploymentId);
  const rollback = useRollback();

  const canRollback = deployment?.status === 'success';

  return (
    <Sheet open={!!deploymentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Deployment Detail</SheetTitle>
          <SheetDescription>
            {deployment
              ? `${deployment.app} v${deployment.version} — ${deployment.environment}`
              : 'Loading…'}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-gray-500">Failed to load deployment details.</p>
          </div>
        )}

        {deployment && (
          <div className="mt-6 space-y-5">
            {/* Status + Rollback */}
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant[deployment.status]} className="text-sm capitalize">
                {deployment.status.replace('_', ' ')}
              </Badge>
              {canRollback && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={rollback.isPending}
                  onClick={() => {
                    rollback.mutate(deployment._id);
                    onClose();
                  }}
                >
                  <RotateCcw className="me-1.5 h-4 w-4" />
                  Rollback
                </Button>
              )}
            </div>

            <Separator />

            {/* Overview */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">App</p>
                <p className="font-medium capitalize">{deployment.app}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Version</p>
                <p className="font-mono">{deployment.version}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Environment</p>
                <p className="capitalize">{deployment.environment}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Provider</p>
                <p>{deployment.provider}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Triggered By</p>
                <p>{deployment.triggeredBy}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Duration</p>
                <p>{formatDuration(deployment.duration)}</p>
              </div>
            </div>

            <Separator />

            {/* Git Info */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-gray-500">Git</p>
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{deployment.branch}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <GitCommit className="h-4 w-4 text-gray-400" />
                <span className="font-mono text-xs">{deployment.commitSha.slice(0, 8)}</span>
                {deployment.commitMessage && (
                  <span className="truncate text-gray-500">{deployment.commitMessage}</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">Started At</p>
                <p>{formatDate(deployment.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Completed At</p>
                <p>{formatDate(deployment.completedAt)}</p>
              </div>
            </div>

            {/* Build Logs */}
            {deployment.buildLogs && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">Build Logs</p>
                  <pre className="max-h-48 overflow-auto rounded-md bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {deployment.buildLogs}
                  </pre>
                </div>
              </>
            )}

            {/* Deploy Logs */}
            {deployment.deployLogs && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">Deploy Logs</p>
                  <pre className="max-h-48 overflow-auto rounded-md bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {deployment.deployLogs}
                  </pre>
                </div>
              </>
            )}

            {/* Metadata */}
            {deployment.metadata && Object.keys(deployment.metadata).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">Metadata</p>
                  <pre className="overflow-auto rounded-md bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {JSON.stringify(deployment.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

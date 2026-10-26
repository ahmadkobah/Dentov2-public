import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Separator,
} from '@dento/ui';
import { Copy, User, Activity, Server, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@dento/ui';
import { toast } from '@dento/ui';
import type { AuditLogEntry } from '@dento/shared';
import { useAuditLogDetail } from '../hooks/useAuditLogs.js';
import { formatDateFull as formatDate } from '../../../lib/date.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const sensitivityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'warning',
  critical: 'destructive',
};

const statusVariant: Record<string, 'default' | 'destructive'> = {
  success: 'default',
  failure: 'destructive',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AuditLogDetailSheetProps {
  auditLog: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailSheet({ auditLog, open, onOpenChange }: AuditLogDetailSheetProps) {
  // Fetch full detail when opened (may include additional data)
  const { data: detail, isLoading, isError } = useAuditLogDetail(auditLog?._id ?? null);
  const entry = detail ?? auditLog;

  const copyJson = (data: Record<string, unknown>, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success(`${label} copied`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-gray-500">Failed to load audit log details.</p>
          </div>
        )}

        {!isLoading && !isError && entry && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Badge
                  variant={sensitivityVariant[entry.sensitivityLevel] ?? 'default'}
                  className="text-xs uppercase"
                >
                  {entry.sensitivityLevel}
                </Badge>
                <span className="capitalize">{entry.action}</span>
              </SheetTitle>
              <SheetDescription>{entry.description}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {/* Status + Action badges */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={statusVariant[entry.status] ?? 'default'}
                  className="text-xs capitalize"
                >
                  {entry.status}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {entry.resourceType}
                </Badge>
              </div>

              <Separator />

              {/* Actor */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-gray-500">Actor</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{entry.actorName ?? entry.actorEmail}</p>
                    <p className="text-xs text-gray-500">{entry.actorRole}</p>
                  </div>
                </div>
              </div>

              {/* Tenant */}
              {entry.tenantSlug && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-gray-500">Tenant</p>
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium">{entry.tenantSlug}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Timestamp" value={formatDate(entry.createdAt)} />
                {entry.resourceId && <Detail label="Resource ID" value={entry.resourceId} />}
                {entry.ipAddress && <Detail label="IP Address" value={entry.ipAddress} />}
                {entry.userAgent && <Detail label="User Agent" value={entry.userAgent} />}
              </div>

              {/* Before/After diff */}
              {entry.before && Object.keys(entry.before).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="flex items-center gap-1 text-sm font-medium">
                        <Activity className="h-3.5 w-3.5" />
                        Before
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => copyJson(entry.before!, 'Before state')}
                      >
                        <Copy className="me-1 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-red-50 p-4 text-xs leading-relaxed text-red-800 dark:bg-red-950 dark:text-red-200">
                      {JSON.stringify(entry.before, null, 2)}
                    </pre>
                  </div>
                </>
              )}

              {entry.after && Object.keys(entry.after).length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center gap-1 text-sm font-medium">
                      <Activity className="h-3.5 w-3.5" />
                      After
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => copyJson(entry.after!, 'After state')}
                    >
                      <Copy className="me-1 h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-green-50 p-4 text-xs leading-relaxed text-green-800 dark:bg-green-950 dark:text-green-200">
                    {JSON.stringify(entry.after, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-medium">Metadata</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => copyJson(entry.metadata!, 'Metadata')}
                      >
                        <Copy className="me-1 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <dl>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-all text-gray-900 dark:text-gray-100">{value}</dd>
    </dl>
  );
}

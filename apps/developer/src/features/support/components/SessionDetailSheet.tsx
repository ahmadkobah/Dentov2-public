import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Separator,
} from '@dento/ui';
import {
  UserCheck,
  Clock,
  Server,
  ShieldAlert,
  Ticket,
  Activity,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useSupportSessionDetail, type SessionStatus } from '../hooks/useSupport.js';
import { formatDateFull as formatDate } from '../../../lib/date.js';

// ── Helpers ──────────────────────────────────────────────────

const statusBadgeVariant: Record<
  SessionStatus,
  'default' | 'secondary' | 'destructive' | 'warning'
> = {
  active: 'default',
  ended: 'secondary',
  expired: 'warning',
  revoked: 'destructive',
};

// ── Component ────────────────────────────────────────────────

interface SessionDetailSheetProps {
  sessionId: string | null;
  onClose: () => void;
}

export function SessionDetailSheet({ sessionId, onClose }: SessionDetailSheetProps) {
  const { data: session, isLoading, isError } = useSupportSessionDetail(sessionId);

  return (
    <Sheet open={!!sessionId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Session Detail</SheetTitle>
          <SheetDescription>
            {session?.sessionId ? (
              <span className="font-mono text-xs">{session.sessionId}</span>
            ) : (
              'Loading…'
            )}
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
            <p className="text-sm text-gray-500">Failed to load session details.</p>
          </div>
        )}

        {session && (
          <div className="mt-6 space-y-5">
            {/* Status */}
            <div className="flex items-center gap-3">
              <Badge variant={statusBadgeVariant[session.status]} className="capitalize text-sm">
                {session.status}
              </Badge>
              {session.linkedTicketId && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Ticket className="h-3 w-3" />
                  {session.linkedTicketId}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Operator */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-gray-500">Operator</p>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{session.performedBy.name}</p>
                  <p className="text-xs text-gray-500">{session.performedBy.email}</p>
                </div>
              </div>
            </div>

            {/* Tenant */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-gray-500">Tenant</p>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium">{session.tenantName || session.tenantSlug}</p>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-gray-500">Reason</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{session.reason}</p>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-gray-500">Started</p>
                <p className="flex items-center gap-1 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(session.startedAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-gray-500">Expires</p>
                <p className="flex items-center gap-1 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(session.expiresAt)}
                </p>
              </div>
              {session.endedAt && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-gray-500">Ended</p>
                  <p className="flex items-center gap-1 text-sm">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {formatDate(session.endedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Security Info */}
            {session.tailscaleKeyId && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-gray-500">Tailscale Key</p>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                      {session.tailscaleKeyId}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Actions Performed */}
            {session.actionsPerformed && session.actionsPerformed.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
                    <Activity className="h-3.5 w-3.5" />
                    Actions ({session.actionsPerformed.length})
                  </p>
                  <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 p-3 dark:border-gray-800">
                    {session.actionsPerformed.map(
                      (
                        action: { action: string; module: string; timestamp: string },
                        i: number,
                      ) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {action.action}
                            </span>
                            <span className="text-gray-500"> — {action.module}</span>
                            <p className="text-gray-400">{formatDate(action.timestamp)}</p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

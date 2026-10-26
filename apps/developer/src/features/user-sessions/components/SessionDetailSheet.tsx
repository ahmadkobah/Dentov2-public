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
import { Monitor, Globe, Clock, ShieldOff, Loader2, AlertTriangle } from 'lucide-react';
import type { UserSessionStatus } from '@dento/shared';
import { useUserSessionDetail, useRevokeSession } from '../hooks/useUserSessions.js';
import { formatDateFull as formatDate } from '../../../lib/date.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusVariant: Record<UserSessionStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  expired: 'secondary',
  revoked: 'destructive',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface SessionDetailSheetProps {
  sessionId: string | null;
  onClose: () => void;
}

export function SessionDetailSheet({ sessionId, onClose }: SessionDetailSheetProps) {
  const { data: session, isLoading, isError } = useUserSessionDetail(sessionId);
  const revokeSession = useRevokeSession();

  return (
    <Sheet open={!!sessionId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Session Detail</SheetTitle>
          <SheetDescription>
            {session ? `${session.email} — ${session.role}` : 'Loading…'}
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
              <Badge variant={statusVariant[session.status]} className="text-sm capitalize">
                {session.status}
              </Badge>
              {session.status === 'active' && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={revokeSession.isPending}
                  onClick={() => {
                    revokeSession.mutate(session._id);
                    onClose();
                  }}
                >
                  <ShieldOff className="me-1.5 h-4 w-4" />
                  Revoke
                </Button>
              )}
            </div>

            <Separator />

            {/* User Info */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-gray-500">User</p>
              <p className="text-sm font-medium">{session.userName}</p>
              <p className="text-xs text-gray-500">{session.email}</p>
              <p className="text-xs text-gray-500 capitalize">{session.role}</p>
            </div>

            {/* Tenant */}
            {session.tenantSlug && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-gray-500">Tenant</p>
                <p className="text-sm font-medium">{session.tenantSlug}</p>
              </div>
            )}

            <Separator />

            {/* Device Info */}
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
                <Monitor className="h-3.5 w-3.5" />
                Device
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Browser</p>
                  <p>{session.device.browser}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">OS</p>
                  <p>{session.device.os}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Device</p>
                  <p>{session.device.device}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mobile</p>
                  <p>{session.device.isMobile ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            {session.location && (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-xs font-medium uppercase text-gray-500">
                  <Globe className="h-3.5 w-3.5" />
                  Location
                </p>
                <p className="text-sm">
                  {[session.location.city, session.location.region, session.location.country]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </div>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-gray-500">Login At</p>
                <p className="flex items-center gap-1 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(session.loginAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-gray-500">Last Activity</p>
                <p className="flex items-center gap-1 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(session.lastActivityAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-gray-500">Expires At</p>
                <p className="flex items-center gap-1 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(session.expiresAt)}
                </p>
              </div>
              {session.revokedAt && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-gray-500">Revoked At</p>
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(session.revokedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* IP / User-Agent */}
            <Separator />
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">IP Address</p>
                <p className="font-mono text-xs">{session.ipAddress}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">User Agent</p>
                <p className="break-all text-xs text-gray-600 dark:text-gray-400">
                  {session.userAgent}
                </p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

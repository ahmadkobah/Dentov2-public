import { useState, useMemo } from 'react';
import { DataTable, Badge, Button, Input, ConfirmDialog, type ColumnDef } from '@dento/ui';
import { Search, Power, ShieldOff, Eye, Clock, UserCheck } from 'lucide-react';
import { toast } from '@dento/ui';
import {
  useSupportSessions,
  useEndSession,
  useRevokeSession,
  type SupportSession,
  type SessionFilters,
  type SessionStatus,
} from '../hooks/useSupport.js';
import { StartSessionDialog } from './StartSessionDialog.js';
import { SessionDetailSheet } from './SessionDetailSheet.js';
import { formatDate } from '../../../lib/date.js';

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

const STATUSES: SessionStatus[] = ['active', 'ended', 'expired', 'revoked'];

// ── Component ────────────────────────────────────────────────

export function SessionsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | ''>('');
  const [page, setPage] = useState(1);

  // Dialogs
  const [showStart, setShowStart] = useState(false);
  const [endTarget, setEndTarget] = useState<SupportSession | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<SupportSession | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filters: SessionFilters = useMemo(
    () => ({
      ...(statusFilter && { status: statusFilter }),
      ...(search && { tenantSlug: search }),
      page,
      limit: 15,
    }),
    [search, statusFilter, page],
  );

  const { data, isLoading } = useSupportSessions(filters);
  const endSession = useEndSession();
  const revokeSession = useRevokeSession();

  const sessions = data?.sessions ?? [];
  const total = data?.pagination?.total ?? 0;

  async function handleEnd() {
    if (!endTarget) return;
    try {
      await endSession.mutateAsync(endTarget.sessionId);
      toast.success('Session ended');
      setEndTarget(null);
    } catch {
      toast.error('Failed to end session');
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      await revokeSession.mutateAsync(revokeTarget.sessionId);
      toast.success('Session revoked — JWT blocklisted');
      setRevokeTarget(null);
    } catch {
      toast.error('Failed to revoke session');
    }
  }

  const columns: ColumnDef<SupportSession>[] = [
    {
      id: 'sessionId',
      header: 'Session',
      cell: (_val, row) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
          {row.sessionId.slice(0, 16)}…
        </span>
      ),
    },
    {
      id: 'performedBy',
      header: 'Operator',
      cell: (_val, row) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium">{row.performedBy.name}</p>
            <p className="text-xs text-gray-500">{row.performedBy.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'tenantSlug',
      header: 'Tenant',
      cell: (_val, row) => <span className="font-medium">{row.tenantName || row.tenantSlug}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (_val, row) => (
        <Badge variant={statusBadgeVariant[row.status]} className="text-xs capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      cell: (_val, row) => (
        <span
          className="max-w-[200px] truncate text-sm text-gray-600 dark:text-gray-400"
          title={row.reason}
        >
          {row.reason}
        </span>
      ),
    },
    {
      id: 'startedAt',
      header: 'Started',
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">{formatDate(row.startedAt)}</span>
      ),
    },
    {
      id: 'expiresAt',
      header: 'Expires',
      cell: (_val, row) => (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="h-3 w-3" />
          {formatDate(row.expiresAt)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_val, row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="View Detail"
            onClick={(e) => {
              e.stopPropagation();
              setDetailId(row.sessionId);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {row.status === 'active' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="End Session"
                onClick={(e) => {
                  e.stopPropagation();
                  setEndTarget(row);
                }}
              >
                <Power className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                title="Revoke (immediate JWT blocklist)"
                onClick={(e) => {
                  e.stopPropagation();
                  setRevokeTarget(row);
                }}
              >
                <ShieldOff className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Filter by tenant slug…"
            aria-label="Filter sessions by tenant"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Status:</span>
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => {
                setStatusFilter(statusFilter === s ? '' : s);
                setPage(1);
              }}
            >
              {s}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowStart(true)}>
          Start Session
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={sessions}
        isLoading={isLoading}
        pageSize={15}
        currentPage={page}
        totalItems={total}
        onPageChange={setPage}
        rowKey={(row) => row.sessionId}
        emptyMessage="No support sessions found."
      />

      {/* Start Session Dialog */}
      <StartSessionDialog open={showStart} onOpenChange={setShowStart} />

      {/* End Confirmation */}
      <ConfirmDialog
        open={!!endTarget}
        onOpenChange={(open) => !open && setEndTarget(null)}
        title="End Session"
        description={`End the impersonation session for "${endTarget?.tenantName}"? The temporary JWT will be blocklisted.`}
        confirmLabel={endSession.isPending ? 'Ending…' : 'End Session'}
        onConfirm={handleEnd}
        variant="default"
      />

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke Session"
        description={`Immediately revoke session for "${revokeTarget?.tenantName}"? The JWT will be added to the Redis blocklist and any Tailscale key will be revoked.`}
        confirmLabel={revokeSession.isPending ? 'Revoking…' : 'Revoke'}
        onConfirm={handleRevoke}
        variant="destructive"
      />

      {/* Session Detail Sheet */}
      <SessionDetailSheet sessionId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

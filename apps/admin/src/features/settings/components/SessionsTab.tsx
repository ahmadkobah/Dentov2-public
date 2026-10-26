import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  DataTable,
} from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';
import type { ColumnDef } from '@dento/ui';
import { Monitor, ShieldOff, ShieldAlert } from 'lucide-react';
import type { UserSession, UserSessionStatus } from '@dento/shared';
import {
  useAdminSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from '../hooks/useAdminSessions.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

import { formatDateTime as formatDate } from '@/lib/date.js';

const statusVariant: Record<UserSessionStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  expired: 'secondary',
  revoked: 'destructive',
};

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SessionsTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const columns: ColumnDef<UserSession>[] = [
    {
      id: 'user',
      header: t('settings.sessions.columns.user'),
      accessorKey: 'userName',
    },
    {
      id: 'device',
      header: t('settings.sessions.columns.device'),
      accessorFn: (row) => (row.device ? `${row.device.browser} / ${row.device.os}` : '—'),
    },
    {
      id: 'ip',
      header: t('settings.sessions.columns.ip'),
      accessorKey: 'ipAddress',
      cell: (v) => <span className="font-mono text-xs">{String(v)}</span>,
    },
    {
      id: 'loginAt',
      header: t('settings.sessions.columns.loginTime'),
      accessorKey: 'loginAt',
      cell: (v) => formatDate(v as string),
    },
    {
      id: 'lastActivity',
      header: t('settings.sessions.columns.lastActive'),
      accessorKey: 'lastActivityAt',
      cell: (v) => formatDate(v as string),
    },
    {
      id: 'status',
      header: t('settings.sessions.columns.status'),
      accessorKey: 'status',
      cell: (v) => (
        <Badge variant={statusVariant[v as UserSessionStatus]} className="capitalize">
          {String(v)}
        </Badge>
      ),
    },
  ];
  const { data, isLoading } = useAdminSessions({ page, limit: 10 });
  const revokeSession = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const actionColumn: ColumnDef<UserSession> = {
    id: 'actions',
    header: '',
    cell: (_v, row) =>
      row.status === 'active' ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600"
          disabled={revokeSession.isPending}
          onClick={(e) => {
            e.stopPropagation();
            revokeSession.mutate(row._id);
          }}
        >
          <ShieldOff className="me-1 h-3.5 w-3.5" />
          {t('settings.sessions.revoke')}
        </Button>
      ) : null,
  };

  return (
    <div className="space-y-6">
      {/* Current Session Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {t('settings.sessions.title')}
          </CardTitle>
          <CardDescription>{t('settings.sessions.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current session badge */}
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2 dark:border-green-800 dark:bg-green-950">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('settings.sessions.currentSession')}
            </span>
          </div>

          {/* Sessions Table */}
          <DataTable<UserSession>
            columns={[...columns, actionColumn]}
            data={data?.items ?? []}
            isLoading={isLoading}
            pageSize={10}
            currentPage={page}
            totalItems={data?.meta?.total ?? 0}
            onPageChange={setPage}
            rowKey={(row) => row._id}
            emptyMessage={t('settings.sessions.noSessions')}
          />
        </CardContent>
      </Card>

      {/* Revoke All */}
      <div className="flex justify-end">
        <Button
          variant="destructive"
          disabled={revokeAll.isPending}
          onClick={() => revokeAll.mutate()}
          className="gap-2"
        >
          <ShieldAlert className="h-4 w-4" />
          {t('settings.sessions.revokeAllOther')}
        </Button>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  Button,
  Badge,
  DataTable,
  PageHeader,
  ConfirmDialog,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Avatar,
  AvatarFallback,
  toast,
  type ColumnDef,
  type SortDirection,
} from '@dento/ui';
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Ban,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import {
  usePlatformUserList,
  useDeletePlatformUser,
  useResendPlatformInvite,
  useRevokePlatformInvite,
  useUpdatePlatformUserStatus,
  type PlatformUser,
  type PlatformUserFilters,
} from '../hooks/use-platform-users.js';
import { useAuthStore, hasPlatformPerm } from '../../../stores/auth.store.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { CreateUserDialog } from '../components/CreateUserDialog.js';
import { EditUserDialog } from '../components/EditUserDialog.js';
import {
  formatDate,
  getInitials,
  getDisplayName,
  roleConfig,
  statusConfig,
  confirmConfig,
} from '../components/platform-users-helpers.js';

// ── Component ──────────────────────────────────────────────

export default function PlatformUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canCreate = hasPlatformPerm('platform_users.create');
  const canUpdate = hasPlatformPerm('platform_users.update');
  const canDelete = hasPlatformPerm('platform_users.delete');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const limit = 20;

  const filters: PlatformUserFilters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      platformRole:
        roleFilter !== 'all' ? (roleFilter as PlatformUserFilters['platformRole']) : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortDir === 'asc' ? 'asc' : 'desc',
    }),
    [page, search, roleFilter, statusFilter, sortBy, sortDir],
  );

  const { data, isLoading, isError, refetch } = usePlatformUserList(filters);
  const items = data?.items ?? [];
  const meta = data?.meta;

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<PlatformUser | null>(null);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'deactivate' | 'delete' | 'resend' | 'revoke';
    user: PlatformUser;
  } | null>(null);

  const deleteMutation = useDeletePlatformUser();
  const resendMutation = useResendPlatformInvite();
  const revokeMutation = useRevokePlatformInvite();
  const statusMutation = useUpdatePlatformUserStatus();

  // ── Handlers ─────────────────────────────────────────────

  function handleConfirmAction() {
    if (!confirmAction) return;
    const { type, user } = confirmAction;

    switch (type) {
      case 'suspend':
        statusMutation.mutate(
          { id: user._id, status: 'suspended' },
          {
            onSuccess: () => toast.success(`${getDisplayName(user.profile)} suspended`),
            onError: () => toast.error('Failed to suspend user'),
          },
        );
        break;
      case 'activate':
        statusMutation.mutate(
          { id: user._id, status: 'active' },
          {
            onSuccess: () => toast.success(`${getDisplayName(user.profile)} activated`),
            onError: () => toast.error('Failed to activate user'),
          },
        );
        break;
      case 'deactivate':
      case 'delete':
        deleteMutation.mutate(user._id, {
          onSuccess: () => toast.success(`${getDisplayName(user.profile)} deactivated`),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : 'Failed to deactivate'),
        });
        break;
      case 'resend':
        resendMutation.mutate(user._id, {
          onSuccess: () => toast.success('Invitation resent'),
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to resend'),
        });
        break;
      case 'revoke':
        revokeMutation.mutate(user._id, {
          onSuccess: () => toast.success('Invitation revoked'),
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to revoke'),
        });
        break;
    }
    setConfirmAction(null);
  }

  function handleSort(column: string, direction: SortDirection) {
    setSortBy(direction ? column : 'createdAt');
    setSortDir(direction);
    setPage(1);
  }

  // ── Columns ──────────────────────────────────────────────

  const columns: ColumnDef<PlatformUser>[] = [
    {
      id: 'user',
      header: 'User',
      cell: (_val, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(row.profile)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {getDisplayName(row.profile)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'platformRole',
      header: 'Role',
      sortable: true,
      cell: (_val, row) => {
        const cfg = roleConfig[row.platformRole] ?? {
          label: row.platformRole,
          variant: 'outline' as const,
        };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (_val, row) => {
        const cfg = statusConfig[row.status] ?? statusConfig.active;
        const Icon = cfg.icon;
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'lastLoginAt',
      header: 'Last Login',
      sortable: false,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(row.lastLoginAt)}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Joined',
      sortable: true,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12',
      cell: (_val, row) => {
        const isSelf = row._id === currentUser?.id;
        const isOwner = row.platformRole === 'platform_owner';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="User actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Invited user actions */}
              {row.status === 'invited' && canCreate && (
                <>
                  <DropdownMenuItem onClick={() => setConfirmAction({ type: 'resend', user: row })}>
                    <RotateCcw className="me-2 h-4 w-4" />
                    Resend Invite
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirmAction({ type: 'revoke', user: row })}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Ban className="me-2 h-4 w-4" />
                    Revoke Invite
                  </DropdownMenuItem>
                </>
              )}

              {/* Edit — available for non-invited, non-self users with update perm */}
              {row.status !== 'invited' && canUpdate && (
                <DropdownMenuItem onClick={() => setEditUser(row)}>
                  <Pencil className="me-2 h-4 w-4" />
                  Edit Role
                </DropdownMenuItem>
              )}

              {/* Active user actions */}
              {row.status === 'active' && !isSelf && canUpdate && (
                <DropdownMenuItem onClick={() => setConfirmAction({ type: 'suspend', user: row })}>
                  <AlertTriangle className="me-2 h-4 w-4" />
                  Suspend
                </DropdownMenuItem>
              )}

              {row.status === 'suspended' && canUpdate && (
                <DropdownMenuItem onClick={() => setConfirmAction({ type: 'activate', user: row })}>
                  <CheckCircle2 className="me-2 h-4 w-4" />
                  Reactivate
                </DropdownMenuItem>
              )}

              {/* Delete / deactivate */}
              {!isSelf && !isOwner && canDelete && row.status !== 'invited' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmAction({ type: 'deactivate', user: row })}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        description="Manage team members who have access to the Developer Portal"
      >
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            aria-label="Search platform users"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="platform_owner">Owner</SelectItem>
              <SelectItem value="platform_admin">Admin</SelectItem>
              <SelectItem value="platform_viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        pageSize={limit}
        currentPage={page}
        totalItems={meta?.total}
        onPageChange={setPage}
        sortColumn={sortBy}
        sortDirection={sortDir}
        onSort={handleSort}
        rowKey={(row) => row._id}
        emptyMessage="No platform users found."
      />

      {/* Create User Dialog */}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        currentUserId={currentUser?.id}
      />

      {/* Confirm Action Dialog */}
      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={confirmConfig[confirmAction.type]?.title ?? 'Confirm'}
          description={`${confirmConfig[confirmAction.type]?.description ?? ''} (${getDisplayName(confirmAction.user.profile)} — ${confirmAction.user.email})`}
          confirmLabel="Confirm"
          variant={confirmConfig[confirmAction.type]?.variant ?? 'default'}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}

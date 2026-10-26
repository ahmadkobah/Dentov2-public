/**
 * User/Staff List Page — per DENTO_V2_MASTER_PLAN §12, §27
 *
 * Invite-based user management. DataTable with search, role filter, status filter.
 * Actions: invite, change role, suspend, deactivate, reactivate, view sessions.
 */

import { useState, useCallback } from 'react';
import {
  useUserList,
  useInviteUser,
  useSuspendUser,
  useDeactivateUser,
  useReactivateUser,
  useUnlockUser,
  useRevokeUserSessions,
  useEditUserProfile,
  useAdminSetPassword,
  useForceResetPassword,
  useAdminDisable2FA,
  useAdminVerifyEmail,
  useAdminVerifyPhone,
  type StaffUser,
  type UserFilters,
  type InviteUserData,
  type EditUserProfileData,
} from '../hooks/useUsers.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Badge,
  ConfirmDialog,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Avatar,
  AvatarFallback,
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PhoneInput,
} from '@dento/ui';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import {
  Users,
  Search,
  MoreHorizontal,
  UserPlus,
  Ban,
  UserX,
  UserCheck,
  LockOpen,
  LogOut,
  Shield,
  Mail,
  Pencil,
  KeyRound,
  ShieldOff,
  Send,
  Copy,
  CheckCircle,
  Phone,
} from 'lucide-react';
import RolePermissionsPanel from '../components/RolePermissionsPanel.js';
import { useTranslation } from '@/stores/locale.store.js';
import { formatDate, formatDateTime } from '@/lib/date.js';

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  dentist: 'Dentist',
  receptionist: 'Receptionist',
  assistant: 'Assistant',
  accountant: 'Accountant',
  lab_tech: 'Lab Tech',
  hygienist: 'Hygienist',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  invited: 'outline',
  pending_activation: 'secondary',
  suspended: 'destructive',
  deactivated: 'destructive',
  locked: 'destructive',
};

const ROLES = [
  'tenant_admin',
  'dentist',
  'receptionist',
  'assistant',
  'accountant',
  'lab_tech',
  'hygienist',
] as const;

export default function UserListPage() {
  const tenantCountry = useTenantCountry();
  const { isMultiLang } = useSupportedLanguages();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteUserData>({
    email: '',
    role: 'receptionist',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [actionTarget, setActionTarget] = useState<{
    user: StaffUser;
    action: 'suspend' | 'deactivate' | 'reactivate' | 'unlock' | 'revoke-sessions';
  } | null>(null);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState<EditUserProfileData>({
    firstName: { en: '' },
    lastName: { en: '' },
  });
  const [passwordUser, setPasswordUser] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [inviteLinkResult, setInviteLinkResult] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data, isLoading, isError, error, refetch } = useUserList({
    ...filters,
    search: search || undefined,
  });

  const inviteMutation = useInviteUser();
  const suspendMutation = useSuspendUser();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const unlockMutation = useUnlockUser();
  const revokeSessionsMutation = useRevokeUserSessions();
  const editProfileMutation = useEditUserProfile();
  const setPasswordMutation = useAdminSetPassword();
  const forceResetMutation = useForceResetPassword();
  const disable2FAMutation = useAdminDisable2FA();
  const verifyEmailMutation = useAdminVerifyEmail();
  const verifyPhoneMutation = useAdminVerifyPhone();

  const items = data?.items ?? [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleInvite = useCallback(async () => {
    try {
      const res = await inviteMutation.mutateAsync(inviteForm);
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'receptionist', firstName: '', lastName: '', phone: '' });
      setInviteLinkResult(res.data.inviteLink);
      setLinkCopied(false);
      toast.success(t('users.toast.invitationSent'));
    } catch {
      toast.error(t('users.toast.inviteFailed'));
    }
  }, [inviteForm, inviteMutation]);

  const handleAction = useCallback(async () => {
    if (!actionTarget) return;
    const { user, action } = actionTarget;
    try {
      switch (action) {
        case 'suspend':
          await suspendMutation.mutateAsync(user._id);
          toast.success(t('users.toast.userSuspended'));
          break;
        case 'deactivate':
          await deactivateMutation.mutateAsync(user._id);
          toast.success(t('users.toast.userDeactivated'));
          break;
        case 'reactivate':
          await reactivateMutation.mutateAsync(user._id);
          toast.success(t('users.toast.userReactivated'));
          break;
        case 'unlock':
          await unlockMutation.mutateAsync(user._id);
          toast.success(t('users.toast.userUnlocked'));
          break;
        case 'revoke-sessions':
          await revokeSessionsMutation.mutateAsync(user._id);
          toast.success(t('users.toast.sessionsRevoked'));
          break;
      }
    } catch {
      toast.error(t('users.toast.actionFailed'));
    } finally {
      setActionTarget(null);
    }
  }, [
    actionTarget,
    suspendMutation,
    deactivateMutation,
    reactivateMutation,
    unlockMutation,
    revokeSessionsMutation,
  ]);

  const openEditDialog = useCallback((user: StaffUser) => {
    setEditForm({
      firstName: { en: user.profile.firstName.en, ar: user.profile.firstName.ar },
      lastName: { en: user.profile.lastName.en, ar: user.profile.lastName.ar },
      phone: user.profile.phone || '',
      gender: user.profile.gender || null,
      role: user.role,
      email: user.email,
    });
    setEditUser(user);
  }, []);

  const handleEditProfile = useCallback(async () => {
    if (!editUser) return;
    try {
      await editProfileMutation.mutateAsync({ id: editUser._id, data: editForm });
      toast.success(t('users.toast.userUpdated'));
      setEditUser(null);
    } catch {
      toast.error(t('users.toast.updateFailed'));
    }
  }, [editUser, editForm, editProfileMutation]);

  const passwordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword);

  const handleSetPassword = useCallback(async () => {
    if (!passwordUser || !passwordValid) return;
    try {
      await setPasswordMutation.mutateAsync({ id: passwordUser._id, newPassword });
      toast.success(t('users.toast.passwordSet'));
      setPasswordUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('users.toast.passwordSetFailed');
      toast.error(msg);
    }
  }, [passwordUser, newPassword, passwordValid, setPasswordMutation]);

  const handleForceReset = useCallback(
    async (user: StaffUser) => {
      try {
        await forceResetMutation.mutateAsync(user._id);
        toast.success(t('users.toast.passwordResetSent'));
      } catch {
        toast.error(t('users.toast.passwordResetFailed'));
      }
    },
    [forceResetMutation],
  );

  const handleDisable2FA = useCallback(
    async (user: StaffUser) => {
      try {
        await disable2FAMutation.mutateAsync(user._id);
        toast.success(t('users.toast.twoFaDisabled'));
      } catch {
        toast.error(t('users.toast.twoFaDisableFailed'));
      }
    },
    [disable2FAMutation],
  );

  const getActionDialogContent = () => {
    if (!actionTarget) return { title: '', description: '' };
    const name = `${actionTarget.user.profile.firstName.en} ${actionTarget.user.profile.lastName.en}`;
    switch (actionTarget.action) {
      case 'suspend':
        return {
          title: t('users.confirmations.suspendTitle'),
          description: `${name} ${t('users.confirmations.suspendDescription')}`,
        };
      case 'deactivate':
        return {
          title: t('users.confirmations.deactivateTitle'),
          description: `${name} ${t('users.confirmations.deactivateDescription')}`,
        };
      case 'reactivate':
        return {
          title: t('users.confirmations.reactivateTitle'),
          description: `${name} ${t('users.confirmations.reactivateDescription')}`,
        };
      case 'unlock':
        return {
          title: t('users.confirmations.unlockTitle'),
          description: `${name} ${t('users.confirmations.unlockDescription')}`,
        };
      case 'revoke-sessions':
        return {
          title: t('users.confirmations.revokeSessionsTitle'),
          description: t('users.confirmations.revokeSessionsDescription'),
        };
    }
  };

  const columns: ColumnDef<StaffUser>[] = [
    {
      id: 'user',
      accessorKey: 'profile',
      header: t('users.columns.user'),
      cell: (_v: unknown, row: StaffUser) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-medium">
              {row.profile.firstName.en?.[0] ?? ''}
              {row.profile.lastName.en?.[0] ?? ''}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">
              {row.profile.firstName.en} {row.profile.lastName.en}
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Mail className="h-3 w-3" />
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: t('users.columns.role'),
      cell: (_v: unknown, row: StaffUser) => (
        <Badge variant="outline" className="text-xs">
          <Shield className="me-1 h-3 w-3" />
          {ROLE_LABELS[row.role] ?? row.role}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('users.columns.status'),
      cell: (_v: unknown, row: StaffUser) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'secondary'} className="text-xs capitalize">
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: '2fa',
      accessorKey: 'twoFactorEnabled',
      header: t('users.columns.twoFa'),
      cell: (_v: unknown, row: StaffUser) => (
        <Badge variant={row.twoFactorEnabled ? 'default' : 'secondary'} className="text-xs">
          {row.twoFactorEnabled ? t('users.twoFaBadges.enabled') : t('users.twoFaBadges.off')}
        </Badge>
      ),
    },
    {
      id: 'lastLogin',
      accessorKey: 'lastLoginAt',
      header: t('users.columns.lastLogin'),
      cell: (_v: unknown, row: StaffUser) => (
        <span className="text-muted-foreground text-xs">
          {row.lastLoginAt ? formatDate(row.lastLoginAt) : t('users.twoFaBadges.never')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, user: StaffUser) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(user)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('users.actions.editProfile')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setPasswordUser(user);
                setNewPassword('');
              }}
            >
              <KeyRound className="me-2 h-4 w-4" />
              {t('users.actions.setPassword')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleForceReset(user)}>
              <Send className="me-2 h-4 w-4" />
              {t('users.actions.sendPasswordReset')}
            </DropdownMenuItem>
            {user.twoFactorEnabled && (
              <DropdownMenuItem onClick={() => handleDisable2FA(user)}>
                <ShieldOff className="me-2 h-4 w-4" />
                {t('users.actions.disableTwoFa')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {user.status === 'active' && (
              <DropdownMenuItem onClick={() => setActionTarget({ user, action: 'suspend' })}>
                <Ban className="me-2 h-4 w-4" />
                {t('users.actions.suspend')}
              </DropdownMenuItem>
            )}
            {(user.status === 'active' || user.status === 'suspended') && (
              <DropdownMenuItem onClick={() => setActionTarget({ user, action: 'deactivate' })}>
                <UserX className="me-2 h-4 w-4" />
                {t('users.actions.deactivate')}
              </DropdownMenuItem>
            )}
            {(user.status === 'suspended' || user.status === 'deactivated') && (
              <DropdownMenuItem onClick={() => setActionTarget({ user, action: 'reactivate' })}>
                <UserCheck className="me-2 h-4 w-4" />
                {t('users.actions.reactivate')}
              </DropdownMenuItem>
            )}
            {user.status === 'locked' && (
              <DropdownMenuItem onClick={() => setActionTarget({ user, action: 'unlock' })}>
                <LockOpen className="me-2 h-4 w-4" />
                {t('users.actions.unlock')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setActionTarget({ user, action: 'revoke-sessions' })}>
              <LogOut className="me-2 h-4 w-4" />
              {t('users.actions.revokeSessions')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const dialogContent = getActionDialogContent();

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('users.page.title')} description={t('users.page.description')}>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="me-2 h-4 w-4" />
          {t('users.page.inviteUser')}
        </Button>
      </PageHeader>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">
            <Users className="me-2 h-4 w-4" />
            {t('users.tabs.staff')}
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="me-2 h-4 w-4" />
            {t('users.tabs.permissions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6 mt-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder={t('users.filters.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </form>

            <Select
              value={filters.role || 'all'}
              onValueChange={(v) =>
                setFilters((prev) => ({
                  ...prev,
                  role: v === 'all' ? undefined : v,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.filters.allRoles')}</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || 'all'}
              onValueChange={(v) =>
                setFilters((prev) => ({
                  ...prev,
                  status: v === 'all' ? undefined : v,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.filters.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('users.filters.active')}</SelectItem>
                <SelectItem value="invited">{t('users.filters.invited')}</SelectItem>
                <SelectItem value="pending_activation">{t('users.filters.pending')}</SelectItem>
                <SelectItem value="suspended">{t('users.filters.suspended')}</SelectItem>
                <SelectItem value="deactivated">{t('users.filters.deactivated')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <TableSkeleton columns={6} rows={8} />
          ) : isError ? (
            <ErrorState
              title={t('users.error.loadFailed')}
              message={error?.message}
              onRetry={refetch}
            />
          ) : !items.length ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={t('users.empty.title')}
              description={t('users.empty.description')}
            />
          ) : (
            <DataTable columns={columns} data={items} />
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <RolePermissionsPanel />
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.invite.title')}</DialogTitle>
            <DialogDescription>{t('users.invite.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('users.invite.firstName')}</Label>
                <Input
                  value={inviteForm.firstName}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.invite.lastName')}</Label>
                <Input
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('users.invite.email')}</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john@clinic.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('users.invite.phone')}</Label>
              <PhoneInput
                value={inviteForm.phone || ''}
                onChange={(v) => setInviteForm((prev) => ({ ...prev, phone: v || undefined }))}
                defaultCountry={tenantCountry}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('users.invite.role')}</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm((prev) => ({ ...prev, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {t('users.common.cancel')}
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName}
            >
              <UserPlus className="me-2 h-4 w-4" />
              {t('users.invite.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation */}
      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(open) => !open && setActionTarget(null)}
        title={dialogContent.title}
        description={dialogContent.description}
        confirmLabel={
          actionTarget?.action === 'reactivate'
            ? t('users.actions.reactivate')
            : t('users.common.confirm')
        }
        variant={actionTarget?.action === 'reactivate' ? 'default' : 'destructive'}
        onConfirm={handleAction}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.edit.title')}</DialogTitle>
            <DialogDescription>
              {t('users.edit.description')} {editUser?.profile.firstName.en}{' '}
              {editUser?.profile.lastName.en}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('users.edit.firstNameEn')}</Label>
                <Input
                  value={editForm.firstName.en}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      firstName: { ...prev.firstName, en: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.edit.lastNameEn')}</Label>
                <Input
                  value={editForm.lastName.en}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      lastName: { ...prev.lastName, en: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            {isMultiLang && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('users.edit.firstNameAr')}</Label>
                  <Input
                    value={editForm.firstName.ar || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        firstName: { ...prev.firstName, ar: e.target.value || undefined },
                      }))
                    }
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('users.edit.lastNameAr')}</Label>
                  <Input
                    value={editForm.lastName.ar || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        lastName: { ...prev.lastName, ar: e.target.value || undefined },
                      }))
                    }
                    dir="rtl"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('users.edit.phone')}</Label>
                <PhoneInput
                  value={editForm.phone || ''}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, phone: v || null }))}
                  defaultCountry={tenantCountry}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.edit.gender')}</Label>
                <Select
                  value={editForm.gender || 'none'}
                  onValueChange={(v) =>
                    setEditForm((prev) => ({
                      ...prev,
                      gender: v === 'none' ? null : (v as 'male' | 'female' | 'other'),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('users.edit.genderNotSet')}</SelectItem>
                    <SelectItem value="male">{t('users.edit.genderMale')}</SelectItem>
                    <SelectItem value="female">{t('users.edit.genderFemale')}</SelectItem>
                    <SelectItem value="other">{t('users.edit.genderOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('users.edit.role')}</Label>
              <Select
                value={editForm.role || editUser?.role || ''}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('users.edit.email')}</Label>
              <Input
                type="email"
                value={editForm.email || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value || undefined }))
                }
                placeholder="user@clinic.com"
              />
              {editForm.email && editUser && editForm.email.toLowerCase() !== editUser.email && (
                <p className="text-xs text-amber-600">{t('users.edit.emailUnverifiedWarning')}</p>
              )}
            </div>
            {/* Read-only info */}
            {editUser && (
              <div className="grid grid-cols-2 gap-4 rounded-md border p-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('users.edit.status')}:</span>{' '}
                  <Badge
                    variant={STATUS_VARIANT[editUser.status] ?? 'secondary'}
                    className="text-xs capitalize"
                  >
                    {editUser.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('users.edit.twoFa')}:</span>{' '}
                  <Badge
                    variant={editUser.twoFactorEnabled ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {editUser.twoFactorEnabled
                      ? t('users.twoFaBadges.enabled')
                      : t('users.twoFaBadges.off')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('users.edit.emailVerified')}:</span>{' '}
                  {editUser.isEmailVerified ? (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="me-1 h-3 w-3" />
                      {t('users.edit.yes')}
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={async () => {
                        try {
                          await verifyEmailMutation.mutateAsync(editUser._id);
                          toast.success(t('users.toast.emailVerified'));
                          setEditUser({ ...editUser, isEmailVerified: true });
                        } catch {
                          toast.error(t('users.toast.emailVerifyFailed'));
                        }
                      }}
                      disabled={verifyEmailMutation.isPending}
                    >
                      <Mail className="me-1 h-3 w-3" />
                      {t('users.edit.markVerified')}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('users.edit.phoneVerified')}:</span>{' '}
                  {editUser.isPhoneVerified ? (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="me-1 h-3 w-3" />
                      {t('users.edit.yes')}
                    </Badge>
                  ) : editUser.profile.phone ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={async () => {
                        try {
                          await verifyPhoneMutation.mutateAsync(editUser._id);
                          toast.success(t('users.toast.phoneVerified'));
                          setEditUser({ ...editUser, isPhoneVerified: true });
                        } catch {
                          toast.error(t('users.toast.phoneVerifyFailed'));
                        }
                      }}
                      disabled={verifyPhoneMutation.isPending}
                    >
                      <Phone className="me-1 h-3 w-3" />
                      {t('users.edit.markVerified')}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('users.edit.noPhone')}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('users.edit.lastLogin')}:</span>{' '}
                  {editUser.lastLoginAt
                    ? formatDateTime(editUser.lastLoginAt)
                    : t('users.twoFaBadges.never')}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              {t('users.common.cancel')}
            </Button>
            <Button
              onClick={handleEditProfile}
              disabled={!editForm.firstName.en || !editForm.lastName.en}
            >
              {t('users.edit.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog
        open={!!passwordUser}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordUser(null);
            setNewPassword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.setPassword.title')}</DialogTitle>
            <DialogDescription>
              {t('users.setPassword.description')} {passwordUser?.profile.firstName.en}{' '}
              {passwordUser?.profile.lastName.en}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('users.setPassword.newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('users.setPassword.placeholder')}
              />
              {newPassword.length > 0 && (
                <ul className="text-xs space-y-0.5 mt-1">
                  <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-destructive'}>
                    {newPassword.length >= 8 ? '✓' : '✗'} {t('users.setPassword.minChars')}
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-destructive'}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '✗'} {t('users.setPassword.uppercase')}
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-destructive'}>
                    {/[a-z]/.test(newPassword) ? '✓' : '✗'} {t('users.setPassword.lowercase')}
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-destructive'}>
                    {/[0-9]/.test(newPassword) ? '✓' : '✗'} {t('users.setPassword.number')}
                  </li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordUser(null);
                setNewPassword('');
              }}
            >
              {t('users.common.cancel')}
            </Button>
            <Button onClick={handleSetPassword} disabled={!passwordValid}>
              <KeyRound className="me-2 h-4 w-4" />
              {t('users.setPassword.title')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Link Result Dialog */}
      <Dialog
        open={!!inviteLinkResult}
        onOpenChange={(open) => {
          if (!open) {
            setInviteLinkResult(null);
            setLinkCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.inviteLink.title')}</DialogTitle>
            <DialogDescription>{t('users.inviteLink.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <Input value={inviteLinkResult ?? ''} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (inviteLinkResult) {
                    navigator.clipboard.writeText(inviteLinkResult);
                    setLinkCopied(true);
                    toast.success(t('users.toast.linkCopied'));
                  }
                }}
              >
                {linkCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">{t('users.inviteLink.expiry')}</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setInviteLinkResult(null);
                setLinkCopied(false);
              }}
            >
              {t('users.common.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

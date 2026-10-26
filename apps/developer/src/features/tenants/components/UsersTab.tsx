import { useState, useCallback } from 'react';
import {
  Edit2,
  KeyRound,
  UserCircle,
  Search,
  Loader2,
  UserPlus,
  ShieldOff,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  ConfirmDialog,
} from '@dento/ui';
import {
  useTenantUsers,
  useResetTenantUserPassword,
  useResetTenantUser2FA,
  useEditTenantUser,
  useDirectCreateTenantUser,
  type TenantUser,
  type EditTenantUserData,
  type DirectCreateUserData,
} from '../hooks/useTenantUsers.js';

const roleStyles: Record<string, string> = {
  tenant_admin: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
  dentist: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
  assistant: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  receptionist:
    'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400',
  accountant: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  lab_tech: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  hygienist: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
};

const statusDot: Record<string, string> = {
  active: 'bg-success-500',
  invited: 'bg-blue-light-500',
  pending_activation: 'bg-warning-500',
  suspended: 'bg-error-500',
  deactivated: 'bg-gray-400',
};

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getUserDisplayName(user: TenantUser) {
  const first = user.profile?.firstName?.en ?? '';
  const last = user.profile?.lastName?.en ?? '';
  return first || last ? `${first} ${last}`.trim() : user.email;
}

function formatLastLogin(date: string | null) {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const ROLES = [
  'tenant_admin',
  'dentist',
  'receptionist',
  'assistant',
  'accountant',
  'lab_tech',
  'hygienist',
] as const;

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Tenant Admin',
  dentist: 'Dentist',
  receptionist: 'Receptionist',
  assistant: 'Assistant',
  accountant: 'Accountant',
  lab_tech: 'Lab Tech',
  hygienist: 'Hygienist',
};

const EMPTY_EDIT_FORM: EditTenantUserData = {
  firstName: { en: '' },
  lastName: { en: '' },
  phone: '',
  gender: null,
  role: undefined,
};

const EMPTY_CREATE_FORM: DirectCreateUserData = {
  email: '',
  password: '',
  role: 'receptionist',
  firstName: { en: '' },
  lastName: { en: '' },
  phone: '',
};

export function UsersTab({ tenantId }: { tenantId: string }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ─── Edit dialog state ────────────────────────────────
  const [editUser, setEditUser] = useState<TenantUser | null>(null);
  const [editForm, setEditForm] = useState<EditTenantUserData>(EMPTY_EDIT_FORM);

  // ─── Create dialog state ──────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<DirectCreateUserData>(EMPTY_CREATE_FORM);

  // ─── Confirm dialog state ─────────────────────────────
  const [confirmAction, setConfirmAction] = useState<{
    type: 'resetPassword' | 'reset2FA';
    user: TenantUser;
  } | null>(null);

  const { data, isLoading, isError } = useTenantUsers(tenantId, {
    page,
    limit: 50,
    ...(search && { search }),
  });

  const resetPassword = useResetTenantUserPassword(tenantId);
  const reset2FA = useResetTenantUser2FA(tenantId);
  const editMutation = useEditTenantUser(tenantId);
  const createMutation = useDirectCreateTenantUser(tenantId);

  const users = data?.users ?? [];
  const meta = data?.meta;

  // ─── Edit helpers ─────────────────────────────────────
  const openEditDialog = useCallback((user: TenantUser) => {
    setEditForm({
      firstName: { en: user.profile?.firstName?.en ?? '', ar: user.profile?.firstName?.ar },
      lastName: { en: user.profile?.lastName?.en ?? '', ar: user.profile?.lastName?.ar },
      phone: user.profile?.phone ?? '',
      gender:
        ((user.profile as unknown as Record<string, unknown>)
          ?.gender as EditTenantUserData['gender']) ?? null,
      role: user.role,
    });
    setEditUser(user);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editUser) return;
    await editMutation.mutateAsync({ userId: editUser._id, data: editForm });
    setEditUser(null);
  }, [editUser, editForm, editMutation]);

  // ─── Create helpers ───────────────────────────────────
  const openCreateDialog = useCallback(() => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateOpen(true);
  }, []);

  const handleCreateSave = useCallback(async () => {
    await createMutation.mutateAsync(createForm);
    setCreateOpen(false);
  }, [createForm, createMutation]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Team Members{meta ? ` (${meta.total})` : ''}
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="default" size="sm" onClick={openCreateDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-6 py-10 text-center text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
          Failed to load users. Please try again.
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <UserCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {search ? 'No users match your search.' : 'No users yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Role
                  </th>
                  <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    2FA
                  </th>
                  <th className="px-6 py-3.5 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Last Login
                  </th>
                  <th className="px-6 py-3.5 text-end text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          {user.profile?.avatarUrl ? (
                            <img
                              src={user.profile.avatarUrl}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <UserCircle className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {getUserDisplayName(user)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleStyles[user.role] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${statusDot[user.status] ?? 'bg-gray-300'}`}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {formatRole(user.status)}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                          <ShieldCheck className="h-3 w-3" />
                          On
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          <ShieldOff className="h-3 w-3" />
                          Off
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatLastLogin(user.lastLoginAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Reset password"
                          disabled={resetPassword.isPending}
                          onClick={() => setConfirmAction({ type: 'resetPassword', user })}
                        >
                          <KeyRound className="h-4 w-4 text-gray-400" />
                        </Button>
                        {user.twoFactorEnabled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Reset 2FA"
                            disabled={reset2FA.isPending}
                            onClick={() => setConfirmAction({ type: 'reset2FA', user })}
                          >
                            <ShieldOff className="h-4 w-4 text-gray-400" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit user"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit2 className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {meta.page} of {meta.totalPages} ({meta.total} users)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Edit User Dialog ─────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update profile for {editUser?.profile?.firstName?.en}{' '}
              {editUser?.profile?.lastName?.en}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name (EN)</Label>
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
                <Label>Last Name (EN)</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name (AR)</Label>
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
                <Label>Last Name (AR)</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, phone: e.target.value || null }))
                  }
                  placeholder="+20..."
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
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
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editMutation.isPending}>
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create User Dialog ───────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a user directly with login credentials (bypasses invite flow).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@clinic.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Min 8 chars, uppercase, lowercase, number"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name (EN)</Label>
                <Input
                  value={createForm.firstName.en}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      firstName: { ...prev.firstName, en: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name (EN)</Label>
                <Input
                  value={createForm.lastName.en}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      lastName: { ...prev.lastName, en: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm((prev) => ({ ...prev, role: v }))}
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
                <Label>Phone</Label>
                <Input
                  value={createForm.phone || ''}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, phone: e.target.value || '' }))
                  }
                  placeholder="+20..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={
            confirmAction.type === 'resetPassword'
              ? 'Reset Password'
              : 'Reset Two-Factor Authentication'
          }
          description={
            confirmAction.type === 'resetPassword'
              ? `A password reset email will be sent to ${confirmAction.user.email}. The user will need to click the link to set a new password.`
              : `This will disable 2FA for ${getUserDisplayName(confirmAction.user)} (${confirmAction.user.email}). They will need to set it up again from their profile.`
          }
          confirmLabel={confirmAction.type === 'resetPassword' ? 'Send Reset Email' : 'Reset 2FA'}
          variant={confirmAction.type === 'reset2FA' ? 'destructive' : 'default'}
          onConfirm={() => {
            if (confirmAction.type === 'resetPassword') {
              resetPassword.mutate(confirmAction.user._id);
            } else {
              reset2FA.mutate(confirmAction.user._id);
            }
            setConfirmAction(null);
          }}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  toast,
} from '@dento/ui';
import { Pencil, Shield, Crown, Eye, Save } from 'lucide-react';
import { useUpdatePlatformUser, type PlatformUser } from '../hooks/use-platform-users.js';
import { roleConfig, statusConfig } from './platform-users-helpers.js';

type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_viewer';

const ROLE_OPTIONS: {
  value: PlatformRole;
  label: string;
  description: string;
  icon: typeof Shield;
}[] = [
  {
    value: 'platform_owner',
    label: 'Owner',
    description: 'Full access — billing, users, settings, all modules',
    icon: Crown,
  },
  {
    value: 'platform_admin',
    label: 'Admin',
    description: 'Near-full access, except owner-only actions',
    icon: Shield,
  },
  {
    value: 'platform_viewer',
    label: 'Viewer',
    description: 'Read-only access across the portal',
    icon: Eye,
  },
];

interface EditUserDialogProps {
  user: PlatformUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string | undefined;
}

export function EditUserDialog({ user, open, onOpenChange, currentUserId }: EditUserDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlatformRole>('platform_viewer');
  const updateUser = useUpdatePlatformUser(user?._id ?? '');

  const isSelf = user?._id === currentUserId;
  const isOwner = user?.platformRole === 'platform_owner';
  const isInvited = user?.status === 'invited';

  useEffect(() => {
    if (user) {
      setFirstName(user.profile?.firstName?.en ?? '');
      setLastName(user.profile?.lastName?.en ?? '');
      setPhone(user.profile?.phone ?? '');
      setSelectedRole(user.platformRole as PlatformRole);
    }
  }, [user]);

  const hasChanges =
    user &&
    (firstName !== (user.profile?.firstName?.en ?? '') ||
      lastName !== (user.profile?.lastName?.en ?? '') ||
      phone !== (user.profile?.phone ?? '') ||
      selectedRole !== user.platformRole);

  function handleSave() {
    if (!user || !hasChanges) return;

    const payload: Record<string, unknown> = {};
    if (firstName !== (user.profile?.firstName?.en ?? ''))
      payload.firstName = { en: firstName.trim() };
    if (lastName !== (user.profile?.lastName?.en ?? '')) payload.lastName = { en: lastName.trim() };
    if (phone !== (user.profile?.phone ?? '')) payload.phone = phone.trim();
    if (!isSelf && !isInvited && selectedRole !== user.platformRole)
      payload.platformRole = selectedRole;

    updateUser.mutate(payload as Parameters<typeof updateUser.mutate>[0], {
      onSuccess: () => {
        toast.success('User updated successfully');
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to update user');
      },
    });
  }

  if (!user) return null;

  const statusCfg = statusConfig[user.status] ?? statusConfig.active;
  const StatusIcon = statusCfg.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>Update profile information and role.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant={roleConfig[user.platformRole]?.variant ?? 'outline'}>
              {roleConfig[user.platformRole]?.label ?? user.platformRole}
            </Badge>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{user.email}</span>
          </div>

          <Separator />

          {/* Profile fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-first-name">First Name</Label>
              <Input
                id="edit-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-last-name">Last Name</Label>
              <Input
                id="edit-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>

          <Separator />

          {/* Role selector */}
          <div className="space-y-1.5">
            <Label>Platform Role</Label>
            {isSelf ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You cannot change your own role.
              </p>
            ) : isInvited ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Role cannot be changed while the invitation is pending.
              </p>
            ) : (
              <>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as PlatformRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-gray-500">{opt.description}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {isOwner && selectedRole !== 'platform_owner' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Warning: Demoting this owner. Ensure at least one other owner exists.
                  </p>
                )}
                {!isOwner && selectedRole === 'platform_owner' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    This will grant full platform ownership including billing and user management.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateUser.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateUser.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

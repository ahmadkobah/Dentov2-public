import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { invitePlatformUserSchema, type InvitePlatformUserInput } from '@dento/shared';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@dento/ui';
import { UserPlus, Shield, Mail, Copy, CheckCircle2 } from 'lucide-react';
import { useInvitePlatformUser } from '../hooks/use-platform-users.js';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);

  const inviteForm = useForm<InvitePlatformUserInput>({
    resolver: zodFormResolver(invitePlatformUserSchema),
    defaultValues: {
      email: '',
      firstName: { en: '' },
      lastName: { en: '' },
      platformRole: 'platform_admin',
    },
  });

  const inviteMutation = useInvitePlatformUser();

  function handleInvite(values: InvitePlatformUserInput) {
    inviteMutation.mutate(values, {
      onSuccess: (res) => {
        setLastInviteToken(res.data?.inviteToken ?? null);
        toast.success('Invitation sent successfully');
        inviteForm.reset();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
      },
    });
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied');
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setLastInviteToken(null);
      inviteForm.reset();
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>Send an invitation to join the Developer Portal.</DialogDescription>
        </DialogHeader>

        {lastInviteToken ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">Invitation Created</p>
              </div>
              <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                Share this link with the invitee. It expires in 72 hours.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/invite/${lastInviteToken}`}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={() => copyInviteLink(lastInviteToken)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                {...inviteForm.register('email')}
              />
              {inviteForm.formState.errors.email && (
                <p className="text-xs text-red-500">{inviteForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="invite-first">First Name</Label>
                <Input
                  id="invite-first"
                  placeholder="First name"
                  {...inviteForm.register('firstName.en')}
                />
                {inviteForm.formState.errors.firstName?.en && (
                  <p className="text-xs text-red-500">
                    {inviteForm.formState.errors.firstName.en.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-last">Last Name</Label>
                <Input
                  id="invite-last"
                  placeholder="Last name"
                  {...inviteForm.register('lastName.en')}
                />
                {inviteForm.formState.errors.lastName?.en && (
                  <p className="text-xs text-red-500">
                    {inviteForm.formState.errors.lastName.en.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.watch('platformRole')}
                onValueChange={(v) =>
                  inviteForm.setValue('platformRole', v as 'platform_admin' | 'platform_viewer')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin — Full access (except owner actions)
                    </div>
                  </SelectItem>
                  <SelectItem value="platform_viewer">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 opacity-50" />
                      Viewer — Read-only access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending} className="gap-2">
                {inviteMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

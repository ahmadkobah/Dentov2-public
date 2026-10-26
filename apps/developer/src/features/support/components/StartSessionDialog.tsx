import { useState } from 'react';
import {
  Input,
  Label,
  Textarea,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  toast,
} from '@dento/ui';
import { useStartSession } from '../hooks/useSupport.js';
import { TenantCombobox } from './TenantCombobox.js';

interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTenantSlug?: string;
}

export function StartSessionDialog({
  open,
  onOpenChange,
  defaultTenantSlug,
}: StartSessionDialogProps) {
  const [tenantSlug, setTenantSlug] = useState(defaultTenantSlug ?? '');
  const [reason, setReason] = useState('');
  const [linkedTicketId, setLinkedTicketId] = useState('');
  const startSession = useStartSession();

  function reset() {
    setTenantSlug(defaultTenantSlug ?? '');
    setReason('');
    setLinkedTicketId('');
  }

  async function handleStart() {
    if (!tenantSlug.trim() || reason.trim().length < 5) return;
    try {
      const result = await startSession.mutateAsync({
        tenantSlug: tenantSlug.trim(),
        reason: reason.trim(),
        linkedTicketId: linkedTicketId.trim() || null,
      });
      const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://localhost:3000';
      window.open(
        `${adminUrl}/auth/impersonate?token=${encodeURIComponent(result.data.tempToken)}`,
        '_blank',
      );
      toast.success(`Impersonation session started for ${tenantSlug}`, {
        description: `Expires: ${new Date(result.data.expiresAt).toLocaleString()}`,
      });
      reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to start session');
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start Impersonation Session</AlertDialogTitle>
          <AlertDialogDescription>
            Create a temporary JWT to access a tenant&apos;s portal. This will be logged and
            auditable.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tenant *</Label>
            <TenantCombobox value={tenantSlug} onValueChange={setTenantSlug} mode="slug" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sess-reason">Reason * (min 5 chars)</Label>
            <Textarea
              id="sess-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need to impersonate this tenant?"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sess-ticket">Linked Ticket (optional)</Label>
            <Input
              id="sess-ticket"
              value={linkedTicketId}
              onChange={(e) => setLinkedTicketId(e.target.value)}
              placeholder="e.g. DENTO-0042"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleStart}
            disabled={!tenantSlug.trim() || reason.trim().length < 5 || startSession.isPending}
          >
            {startSession.isPending ? 'Starting…' : 'Start Session'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

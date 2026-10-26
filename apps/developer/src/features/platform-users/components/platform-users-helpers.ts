import { CheckCircle2, Mail, Clock, AlertTriangle, XCircle } from 'lucide-react';
import type { PlatformUser } from '../hooks/use-platform-users.js';
import { formatDateShort } from '../../../lib/date.js';

// ── Helpers ────────────────────────────────────────────────

export { formatDateShort as formatDate };

export function getInitials(profile: PlatformUser['profile']): string {
  const f = profile?.firstName?.en?.[0] ?? '';
  const l = profile?.lastName?.en?.[0] ?? '';
  return (f + l).toUpperCase() || '??';
}

export function getDisplayName(profile: PlatformUser['profile']): string {
  const f = profile?.firstName?.en ?? '';
  const l = profile?.lastName?.en ?? '';
  return `${f} ${l}`.trim() || 'Unknown';
}

// ── Config ─────────────────────────────────────────────────

export const roleConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  platform_owner: { label: 'Owner', variant: 'default' },
  platform_admin: { label: 'Admin', variant: 'secondary' },
  platform_viewer: { label: 'Viewer', variant: 'outline' },
};

export const statusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  active: {
    label: 'Active',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  invited: {
    label: 'Invited',
    icon: Mail,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  pending_activation: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  suspended: {
    label: 'Suspended',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  deactivated: {
    label: 'Deactivated',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
};

export const confirmConfig: Record<
  string,
  { title: string; description: string; variant: 'destructive' | 'default' }
> = {
  suspend: {
    title: 'Suspend User',
    description: 'This user will be logged out and unable to access the platform.',
    variant: 'destructive',
  },
  activate: {
    title: 'Reactivate User',
    description: 'This user will regain access to the platform.',
    variant: 'default',
  },
  deactivate: {
    title: 'Deactivate User',
    description: 'This user will be permanently deactivated. This action cannot be undone.',
    variant: 'destructive',
  },
  delete: {
    title: 'Deactivate User',
    description: 'This user will be permanently deactivated.',
    variant: 'destructive',
  },
  resend: {
    title: 'Resend Invitation',
    description: 'A new invite link will be generated. The old link will be invalidated.',
    variant: 'default',
  },
  revoke: {
    title: 'Revoke Invitation',
    description: 'This invitation will be cancelled and the user will not be able to join.',
    variant: 'destructive',
  },
};

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Badge, Button, Separator, Textarea, Label } from '@dento/ui';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  User,
  UserPlus,
  Tag,
  Send,
  Eye,
  EyeOff,
  Package,
  Loader2,
  AlertTriangle,
  Trash2,
  Shield,
  ShieldOff,
} from 'lucide-react';
import {
  useSupportTicketDetail,
  useUpdateTicket,
  useDeleteTicket,
  useAssignTicket,
  useAddMessage,
  useStartSession,
  useSupportSessions,
  useEndSession,
  type TicketStatus,
  type TicketPriority,
  type TicketMessage,
} from '../hooks/useSupport.js';
import { SLATimer } from '../components/SLATimer.js';
import { formatDate } from '../../../lib/date.js';

// ── Helpers ─────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_customer', label: 'Waiting Customer' },
  { value: 'waiting_internal', label: 'Waiting Internal' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; color: string }[] = [
  {
    value: 'low',
    label: 'Low',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'high',
    label: 'High',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
];

// ── Page Component ──────────────────────────────────────────

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, isError } = useSupportTicketDetail(ticketId ?? null);
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();
  const assignTicket = useAssignTicket();
  const addMessage = useAddMessage();
  const startSession = useStartSession();
  const endSession = useEndSession();

  const { data: sessionsData } = useSupportSessions({
    tenantSlug: ticket?.tenantId,
    status: 'active',
    limit: 1,
  });
  const activeSession = sessionsData?.sessions?.[0] ?? null;

  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [assignName, setAssignName] = useState('');

  const isSlaBreached =
    ticket?.sla?.resolutionDeadline &&
    new Date(ticket.sla.resolutionDeadline) < new Date() &&
    !['resolved', 'closed'].includes(ticket.status);

  async function handleStatusChange(status: TicketStatus) {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({ id: ticket._id, status });
    } catch {
      // toast handled by hook
    }
  }

  async function handlePriorityChange(priority: TicketPriority) {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({ id: ticket._id, priority });
    } catch {
      // toast handled by hook
    }
  }

  async function handleAssign() {
    if (!ticket || !assignName.trim()) return;
    try {
      await assignTicket.mutateAsync({
        ticketId: ticket._id,
        userId: 'self',
        name: assignName.trim(),
      });
      setAssignName('');
    } catch {
      // toast handled by hook
    }
  }

  async function handleSendMessage() {
    if (!ticket || !newMessage.trim()) return;
    try {
      await addMessage.mutateAsync({
        ticketId: ticket._id,
        message: newMessage.trim(),
        isInternal,
      });
      setNewMessage('');
    } catch {
      // toast handled by hook
    }
  }

  async function handleDelete() {
    if (!ticket) return;
    try {
      await deleteTicket.mutateAsync(ticket._id);
      navigate('/support');
    } catch {
      // toast handled by hook
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-gray-500">Failed to load ticket or ticket not found.</p>
        <Button variant="outline" onClick={() => navigate('/support')}>
          <ArrowLeft className="me-2 h-4 w-4" /> Back to Support
        </Button>
      </div>
    );
  }

  const isResolved = ['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${ticket.ticketNumber} — ${ticket.subject}`}
        description={isSlaBreached ? '⚠ SLA BREACHED' : undefined}
      >
        <div className="flex items-center gap-2">
          {ticket.tenantId &&
            (activeSession ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={endSession.isPending}
                onClick={() => endSession.mutate(activeSession.sessionId)}
              >
                <ShieldOff className="me-1 h-4 w-4" />
                {endSession.isPending ? 'Stopping…' : 'Stop Session'}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={startSession.isPending}
                onClick={async () => {
                  const result = await startSession.mutateAsync({
                    tenantSlug: ticket.tenantId,
                    reason: `Investigating ticket ${ticket.ticketNumber}`,
                    linkedTicketId: ticket._id,
                  });
                  const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://localhost:3000';
                  window.open(
                    `${adminUrl}/auth/impersonate?token=${encodeURIComponent(result.data.tempToken)}`,
                    '_blank',
                  );
                }}
              >
                <Shield className="me-1 h-4 w-4" />
                {startSession.isPending ? 'Starting…' : 'Impersonate'}
              </Button>
            ))}
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteTicket.isPending}
            onClick={handleDelete}
          >
            <Trash2 className="me-1 h-4 w-4" />
            {deleteTicket.isPending ? 'Deleting…' : 'Delete'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/support')}>
            <ArrowLeft className="me-2 h-4 w-4" /> Back
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main Content (2/3) ──────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {ticket.createdBy?.name ?? 'Unknown'}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatDate(ticket.createdAt)}
            </span>
            <span>·</span>
            <span>{ticket.tenantId}</span>
            {ticket.linkedModule && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" /> {ticket.linkedModule}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {ticket.description}
            </p>
          </div>

          {/* Tags */}
          {ticket.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-3 w-3 text-gray-400" />
              {ticket.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <Separator />

          {/* Messages Timeline */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <MessageSquare className="h-4 w-4" />
              Messages ({ticket.messages?.length ?? 0})
            </h4>

            {ticket.messages && ticket.messages.length > 0 ? (
              <div className="space-y-3">
                {ticket.messages.map((msg: TicketMessage, idx: number) => (
                  <div
                    key={msg._id ?? idx}
                    className={`rounded-lg p-4 ${
                      msg.isInternal
                        ? 'border border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/10'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {msg.sender.name}
                        </span>
                        <span className="text-xs text-gray-400">({msg.sender.role})</span>
                        {msg.isInternal && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            <EyeOff className="me-0.5 h-2.5 w-2.5" /> Internal
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {msg.message}
                    </p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.attachments.map((a, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {a.filename}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No messages yet.</p>
            )}

            {/* Add Message */}
            {ticket.status !== 'closed' && (
              <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs gap-1 ${isInternal ? 'text-yellow-600' : 'text-gray-500'}`}
                    onClick={() => setIsInternal(!isInternal)}
                  >
                    {isInternal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {isInternal ? 'Internal Note' : 'Public Reply'}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={!newMessage.trim() || addMessage.isPending}
                    onClick={handleSendMessage}
                  >
                    <Send className="h-3 w-3" />
                    {addMessage.isPending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar (1/3) ───────────────────────────── */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Label className="text-xs font-medium text-gray-500">Status</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <Button
                  key={s.value}
                  variant={ticket.status === s.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  disabled={updateTicket.isPending}
                  onClick={() => handleStatusChange(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Label className="text-xs font-medium text-gray-500">Priority</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((p) => (
                <Button
                  key={p.value}
                  variant={ticket.priority === p.value ? 'default' : 'outline'}
                  size="sm"
                  className={`h-7 text-xs ${ticket.priority !== p.value ? p.color : ''}`}
                  disabled={updateTicket.isPending}
                  onClick={() => handlePriorityChange(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Assignment */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Label className="text-xs font-medium text-gray-500">Assigned To</Label>
            {ticket.assignedTo ? (
              <div className="mt-2 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{ticket.assignedTo.name}</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!assignName.trim() || assignTicket.isPending}
                  onClick={handleAssign}
                >
                  <UserPlus className="me-1 h-3 w-3" />
                  {assignTicket.isPending ? '…' : 'Assign'}
                </Button>
              </div>
            )}
          </div>

          {/* SLA */}
          {ticket.sla && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <Label className="text-xs font-medium text-gray-500">SLA Deadlines</Label>
              <div className="mt-2 flex flex-col gap-2">
                <SLATimer
                  deadline={ticket.sla.responseDeadline}
                  label="Response"
                  resolved={isResolved}
                />
                <SLATimer
                  deadline={ticket.sla.resolutionDeadline}
                  label="Resolution"
                  resolved={isResolved}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

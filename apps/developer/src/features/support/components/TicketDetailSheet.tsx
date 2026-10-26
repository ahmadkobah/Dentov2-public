import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Button,
  Separator,
  Textarea,
  Label,
} from '@dento/ui';
import {
  Clock,
  MessageSquare,
  User,
  UserPlus,
  Tag,
  Send,
  Eye,
  EyeOff,
  Package,
  AlertTriangle,
  Flame,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  useSupportTicketDetail,
  useUpdateTicket,
  useDeleteTicket,
  useAssignTicket,
  useAddMessage,
  type TicketStatus,
  type TicketPriority,
  type TicketMessage,
} from '../hooks/useSupport.js';
import { SLATimer } from './SLATimer.js';
import { formatDateFull as formatDate } from '../../../lib/date.js';

// ── Helpers ─────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TicketStatus; label: string; color: string }[] = [
  {
    value: 'open',
    label: 'Open',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  {
    value: 'waiting_customer',
    label: 'Waiting Customer',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  {
    value: 'waiting_internal',
    label: 'Waiting Internal',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  {
    value: 'closed',
    label: 'Closed',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
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

// ── Component ───────────────────────────────────────────────

interface TicketDetailSheetProps {
  ticketId: string | null;
  onClose: () => void;
}

export function TicketDetailSheet({ ticketId, onClose }: TicketDetailSheetProps) {
  const { data: ticket, isLoading, isError } = useSupportTicketDetail(ticketId);
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();
  const assignTicket = useAssignTicket();
  const addMessage = useAddMessage();

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
      onClose();
    } catch {
      // toast handled by hook
    }
  }

  return (
    <Dialog open={!!ticketId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-gray-500">Failed to load ticket details.</p>
          </div>
        )}

        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-gray-400">{ticket.ticketNumber}</span>
                {isSlaBreached && (
                  <Badge variant="destructive" className="text-xs">
                    <Flame className="me-0.5 h-3 w-3" /> SLA BREACHED
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-start text-base font-semibold text-gray-900 dark:text-white">
                {ticket.subject}
              </DialogDescription>
            </DialogHeader>

            {/* Delete action */}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteTicket.isPending}
                onClick={handleDelete}
              >
                <Trash2 className="me-1 h-3 w-3" />
                {deleteTicket.isPending ? 'Deleting…' : 'Delete Ticket'}
              </Button>
            </div>

            <div className="space-y-5">
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

              {/* Status & Priority Controls */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Status</Label>
                  <div className="flex flex-wrap gap-1.5">
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Priority</Label>
                  <div className="flex flex-wrap gap-1.5">
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
              </div>

              {/* Assignment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Assigned To</Label>
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{ticket.assignedTo.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={assignName}
                      onChange={(e) => setAssignName(e.target.value)}
                      placeholder="Enter your name to self-assign"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={!assignName.trim() || assignTicket.isPending}
                      onClick={handleAssign}
                    >
                      <UserPlus className="me-1 h-3 w-3" />
                      {assignTicket.isPending ? 'Assigning…' : 'Assign'}
                    </Button>
                  </div>
                )}
              </div>

              {/* SLA Info */}
              {ticket.sla && (
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="mb-2 text-xs font-medium uppercase text-gray-500">SLA Deadlines</p>
                  <div className="flex flex-wrap gap-2">
                    <SLATimer
                      deadline={ticket.sla.responseDeadline}
                      label="Response"
                      resolved={['resolved', 'closed'].includes(ticket.status)}
                    />
                    <SLATimer
                      deadline={ticket.sla.resolutionDeadline}
                      label="Resolution"
                      resolved={['resolved', 'closed'].includes(ticket.status)}
                    />
                  </div>
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
                  <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    {ticket.messages.map((msg: TicketMessage, idx: number) => (
                      <div
                        key={msg._id ?? idx}
                        className={`rounded-lg p-3 ${
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
                  <div className="space-y-2">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

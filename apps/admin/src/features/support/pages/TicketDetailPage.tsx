import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Badge, Button, Separator, Textarea, Label } from '@dento/ui';
import { useTranslation } from '@/stores/locale.store.js';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  User,
  Tag,
  Send,
  Package,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Flame,
} from 'lucide-react';
import {
  useSupportTicketDetail,
  useAddMessage,
  type TicketStatus,
  type TicketPriority,
  type TicketMessage,
} from '../hooks/useSupport.js';
import { SLATimer } from '../components/SLATimer.js';
import { formatDateTime } from '@/lib/date.js';

// ── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return formatDateTime(iso);
}

const statusLabels: Record<TicketStatus, { label: string; color: string; icon: typeof Clock }> = {
  open: {
    label: 'support.status.open',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: AlertTriangle,
  },
  in_progress: {
    label: 'support.status.inProgress',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  waiting_customer: {
    label: 'support.status.waitingOnYou',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: User,
  },
  waiting_internal: {
    label: 'support.status.underReview',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    icon: Clock,
  },
  resolved: {
    label: 'support.status.resolved',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
  },
  closed: {
    label: 'support.status.closed',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    icon: XCircle,
  },
};

const priorityLabels: Record<TicketPriority, { label: string; color: string }> = {
  low: {
    label: 'support.priority.low',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  medium: {
    label: 'support.priority.medium',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  high: {
    label: 'support.priority.high',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  urgent: {
    label: 'support.priority.urgent',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
};

// ── Page Component ──────────────────────────────────────────

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: ticket, isLoading, isError } = useSupportTicketDetail(ticketId ?? null);
  const addMessage = useAddMessage();

  const [newMessage, setNewMessage] = useState('');

  const isSlaBreached =
    ticket?.sla?.resolutionDeadline &&
    new Date(ticket.sla.resolutionDeadline) < new Date() &&
    !['resolved', 'closed'].includes(ticket.status);

  async function handleSendMessage() {
    if (!ticket || !newMessage.trim()) return;
    try {
      await addMessage.mutateAsync({
        ticketId: ticket._id,
        message: newMessage.trim(),
      });
      setNewMessage('');
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
        <p className="text-gray-500">{t('support.detail.errorLoading')}</p>
        <Button variant="outline" onClick={() => navigate('/support')}>
          <ArrowLeft className="me-2 h-4 w-4" /> {t('support.detail.backToSupport')}
        </Button>
      </div>
    );
  }

  const isResolved = ['resolved', 'closed'].includes(ticket.status);
  const st = statusLabels[ticket.status] ?? statusLabels.open;
  const pr = priorityLabels[ticket.priority] ?? priorityLabels.medium;
  const StIcon = st.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${ticket.ticketNumber} — ${ticket.subject}`}
        description={isSlaBreached ? t('support.detail.slaBreached') : undefined}
      >
        <Button variant="outline" onClick={() => navigate('/support')}>
          <ArrowLeft className="me-2 h-4 w-4" /> {t('support.detail.back')}
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main Content (2/3) ──────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatDate(ticket.createdAt)}
            </span>
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
              {t('support.detail.messages')} ({ticket.messages?.length ?? 0})
            </h4>

            {ticket.messages && ticket.messages.length > 0 ? (
              <div className="space-y-3">
                {ticket.messages.map((msg: TicketMessage, idx: number) => (
                  <div
                    key={msg._id ?? idx}
                    className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {msg.sender.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          (
                          {msg.sender.role === 'tenant_user' || msg.sender.role === 'admin'
                            ? t('support.detail.senderYou')
                            : t('support.detail.senderSupport')}
                          )
                        </span>
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
              <p className="text-sm text-gray-400">{t('support.detail.noMessages')}</p>
            )}

            {/* Add Message */}
            {ticket.status !== 'closed' && (
              <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('support.detail.replyPlaceholder')}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={!newMessage.trim() || addMessage.isPending}
                    onClick={handleSendMessage}
                  >
                    <Send className="h-3 w-3" />
                    {addMessage.isPending ? t('support.detail.sending') : t('support.detail.send')}
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
            <Label className="text-xs font-medium text-gray-500">
              {t('support.detail.sidebar.status')}
            </Label>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${st.color}`}
              >
                <StIcon className="h-3 w-3" />
                {t(st.label)}
              </span>
            </div>
          </div>

          {/* Priority */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Label className="text-xs font-medium text-gray-500">
              {t('support.detail.sidebar.priority')}
            </Label>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${pr.color}`}
              >
                {ticket.priority === 'urgent' && <Flame className="me-0.5 h-3 w-3" />}
                {t(pr.label)}
              </span>
            </div>
          </div>

          {/* Assigned To */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Label className="text-xs font-medium text-gray-500">
              {t('support.detail.sidebar.assignedTo')}
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {ticket.assignedTo?.name ?? t('support.detail.sidebar.unassigned')}
              </span>
            </div>
          </div>

          {/* SLA */}
          {ticket.sla && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <Label className="text-xs font-medium text-gray-500">
                {t('support.detail.sidebar.slaDeadlines')}
              </Label>
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

          {/* Category */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Label className="text-xs font-medium text-gray-500">
              {t('support.detail.sidebar.category')}
            </Label>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {ticket.category}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

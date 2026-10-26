import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  StatCard,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@dento/ui';
import {
  LifeBuoy,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  User,
  Calendar,
  Filter,
  Eye,
  UserPlus,
  BarChart3,
  Flame,
  Plus,
} from 'lucide-react';
import {
  useSupportTickets,
  useSupportTicketStats,
  type Ticket,
  type TicketFilters,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from '../hooks/useSupport.js';
import { SessionsTab } from '../components/SessionsTab.js';
import { CreateTicketDialog } from '../components/CreateTicketDialog.js';
import { TicketDetailSheet } from '../components/TicketDetailSheet.js';
import { SLATimer } from '../components/SLATimer.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

// -- Helpers ------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const statusConfig: Record<
  TicketStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  open: {
    icon: AlertTriangle,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Open',
  },
  in_progress: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'In Progress',
  },
  waiting_customer: {
    icon: User,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Waiting on Customer',
  },
  waiting_internal: {
    icon: Clock,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    label: 'Waiting Internal',
  },
  resolved: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Resolved',
  },
  closed: {
    icon: XCircle,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Closed',
  },
};

const priorityConfig: Record<TicketPriority, { color: string; bg: string; label: string }> = {
  low: {
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    label: 'Low',
  },
  medium: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Medium',
  },
  high: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'High',
  },
  urgent: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Urgent',
  },
};

const categoryConfig: Record<TicketCategory, { color: string; label: string }> = {
  bug: { color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30', label: 'Bug' },
  feature: {
    color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30',
    label: 'Feature',
  },
  billing: {
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
    label: 'Billing',
  },
  access: {
    color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
    label: 'Access',
  },
  other: {
    color: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800',
    label: 'Other',
  },
};

const STATUS_FILTERS: TicketStatus[] = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
];
const PRIORITY_FILTERS: TicketPriority[] = ['urgent', 'high', 'medium', 'low'];

// -- Component ----------------------------------------------------------

export default function SupportPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);

  const filters: TicketFilters = useMemo(
    () => ({
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(priorityFilter && { priority: priorityFilter }),
      page,
      limit: 20,
    }),
    [search, statusFilter, priorityFilter, page],
  );

  const { data, isLoading, isError, refetch } = useSupportTickets(filters);
  const { data: stats } = useSupportTicketStats();

  const tickets = data?.tickets ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Manage tenant support tickets and SLA compliance — §35"
      >
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Ticket
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Tickets"
          value={stats?.byStatus?.open ?? 0}
          icon={<LifeBuoy className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="In Progress"
          value={stats?.byStatus?.in_progress ?? 0}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="SLA Breached"
          value={stats?.slaBreached ?? 0}
          icon={<Flame className="h-5 w-5" />}
          variant="error"
        />
        <StatCard
          title="Avg Resolution"
          value={stats?.avgResolutionHours != null ? `${stats.avgResolutionHours}h` : '—'}
          icon={<BarChart3 className="h-5 w-5" />}
          variant="info"
        />
      </div>

      {/* Tabs: Tickets / Sessions */}
      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* ── Tickets Tab ──────────────────────────────────── */}
        <TabsContent value="tickets" className="space-y-4 pt-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by subject, ID, or tenant…"
                aria-label="Search support tickets"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="ps-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500">Status:</span>
              {STATUS_FILTERS.map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setStatusFilter(statusFilter === s ? '' : s);
                    setPage(1);
                  }}
                >
                  {statusConfig[s].label}
                </Button>
              ))}
            </div>
          </div>

          {/* Priority Quick Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Priority:</span>
            {PRIORITY_FILTERS.map((p) => (
              <Button
                key={p}
                variant={priorityFilter === p ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setPriorityFilter(priorityFilter === p ? '' : p);
                  setPage(1);
                }}
              >
                {p === 'urgent' && <Flame className="me-0.5 h-3 w-3" />}
                {priorityConfig[p].label}
              </Button>
            ))}
          </div>

          {/* Error State */}
          {isError && <QueryErrorBanner onRetry={() => refetch()} />}

          {/* Ticket List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Clock className="me-2 h-5 w-5 animate-spin" /> Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
              <LifeBuoy className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                No tickets match your filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  onView={() => navigate(`/support/tickets/${ticket._id}`)}
                  onAssign={() => setDetailTicketId(ticket._id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Sessions Tab ─────────────────────────────────── */}
        <TabsContent value="sessions" className="pt-4">
          <SessionsTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TicketDetailSheet ticketId={detailTicketId} onClose={() => setDetailTicketId(null)} />
    </div>
  );
}

// ── Ticket Card ──────────────────────────────────────────────

function TicketCard({
  ticket,
  onView,
  onAssign,
}: {
  ticket: Ticket;
  onView: () => void;
  onAssign: () => void;
}) {
  const sc = statusConfig[ticket.status] ?? statusConfig.open;
  const StatusIcon = sc.icon;
  const pc = priorityConfig[ticket.priority] ?? priorityConfig.medium;
  const cc = categoryConfig[ticket.category] ?? categoryConfig.other;

  const isSlaBreaching =
    ticket.sla?.resolutionDeadline &&
    new Date(ticket.sla.resolutionDeadline) < new Date() &&
    !['resolved', 'closed'].includes(ticket.status);

  return (
    <div
      className={`group rounded-xl border bg-white p-5 transition-colors hover:border-brand-200 dark:bg-gray-900 dark:hover:border-brand-800 ${
        isSlaBreaching
          ? 'border-red-300 dark:border-red-800'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{ticket.ticketNumber}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {sc.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pc.bg} ${pc.color}`}>
              {ticket.priority === 'urgent' && <Flame className="me-0.5 inline h-3 w-3" />}
              {pc.label}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cc.color}`}>
              {cc.label}
            </span>
            {isSlaBreaching && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                SLA BREACHED
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.createdBy?.name ?? 'Unknown'}
            </span>
            {ticket.messagesCount != null && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket.messagesCount} messages
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {timeAgo(ticket.createdAt)}
            </span>
            {ticket.assignedTo && (
              <span className="flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                {ticket.assignedTo.name}
              </span>
            )}
            {ticket.sla?.resolutionDeadline && !['resolved', 'closed'].includes(ticket.status) && (
              <SLATimer deadline={ticket.sla.resolutionDeadline} label="SLA" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={onView}>
            <Eye className="me-1 h-3 w-3" />
            View
          </Button>
          {!ticket.assignedTo && (
            <Button variant="outline" size="sm" className="text-xs" onClick={onAssign}>
              <UserPlus className="me-1 h-3 w-3" />
              Assign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

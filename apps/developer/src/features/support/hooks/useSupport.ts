import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';

// ── Types ───────────────────────────────────────────────────

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'waiting_internal'
  | 'resolved'
  | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'bug' | 'feature' | 'billing' | 'access' | 'other';

export interface TicketCreatedBy {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface TicketAssignee {
  userId: string;
  name: string;
}

export interface TicketMessage {
  _id: string;
  sender: { userId: string; name: string; role: string };
  message: string;
  isInternal: boolean;
  attachments?: { filename: string; url: string; size: number }[];
  createdAt: string;
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  tenantId: string;
  subject: string;
  description: string;
  createdBy: TicketCreatedBy;
  assignedTo: TicketAssignee | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  linkedModule: string | null;
  tags: string[];
  messagesCount?: number;
  messages?: TicketMessage[];
  sla: {
    responseDeadline: string;
    resolutionDeadline: string;
  };
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  tenantId?: string;
  search?: string;
  sort?: 'createdAt' | 'priority' | 'updated';
  page?: number;
  limit?: number;
}

export interface TicketStats {
  total: number;
  unassigned: number;
  slaBreached: number;
  avgResolutionHours: number | null;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ── Session Types ───────────────────────────────────────────

export type SessionStatus = 'active' | 'ended' | 'expired' | 'revoked';

export interface SupportSession {
  _id: string;
  sessionId: string;
  performedBy: { userId: string; email: string; name: string };
  tenantSlug: string;
  tenantName: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
  reason: string;
  linkedTicketId: string | null;
  tailscaleKeyId: string | null;
  actionsPerformed?: { action: string; module: string; timestamp: string }[];
}

export interface SessionFilters {
  status?: SessionStatus;
  tenantSlug?: string;
  page?: number;
  limit?: number;
}

// ── API Response Envelopes ──────────────────────────────────

interface TicketListResponse {
  success: boolean;
  data: Ticket[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface TicketDetailResponse {
  success: boolean;
  data: { ticket: Ticket };
}

interface TicketStatsResponse {
  success: boolean;
  data: TicketStats;
}

interface SessionListResponse {
  success: boolean;
  data: SupportSession[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface SessionDetailResponse {
  success: boolean;
  data: { session: SupportSession };
}

interface StartSessionResponse {
  success: boolean;
  data: {
    session: SupportSession;
    tempToken: string;
    expiresAt: string;
    tailscaleAuthKey?: string;
  };
}

// ── Query Key Factory ───────────────────────────────────────

export const supportKeys = {
  all: ['support'] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticketList: (filters: TicketFilters) => [...supportKeys.tickets(), filters] as const,
  ticketDetail: (id: string) => [...supportKeys.tickets(), 'detail', id] as const,
  ticketStats: () => [...supportKeys.all, 'ticket-stats'] as const,
  sessions: () => [...supportKeys.all, 'sessions'] as const,
  sessionList: (filters: SessionFilters) => [...supportKeys.sessions(), filters] as const,
  sessionDetail: (id: string) => [...supportKeys.sessions(), 'detail', id] as const,
};

// ── Ticket Queries ──────────────────────────────────────────

export function useSupportTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: supportKeys.ticketList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.category) params.set('category', filters.category);
      if (filters.tenantId) params.set('tenantId', filters.tenantId);
      if (filters.search) params.set('search', filters.search);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const qs = params.toString();
      return apiClient.get<TicketListResponse>(`/api/support/tickets${qs ? `?${qs}` : ''}`);
    },
    select: (res) => ({ tickets: res.data as Ticket[], pagination: res.meta }),
  });
}

export function useSupportTicketDetail(id: string | null) {
  return useQuery({
    queryKey: supportKeys.ticketDetail(id!),
    queryFn: () => apiClient.get<TicketDetailResponse>(`/api/support/tickets/${id}`),
    select: (res) => res.data.ticket,
    enabled: !!id,
    refetchInterval: 10_000, // poll every 10s for new messages
  });
}

export function useSupportTicketStats() {
  return useQuery({
    queryKey: supportKeys.ticketStats(),
    queryFn: () => apiClient.get<TicketStatsResponse>('/api/support/tickets/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

// ── Ticket Mutations ────────────────────────────────────────

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      tenantId: string;
      subject: string;
      description: string;
      category: TicketCategory;
      priority?: TicketPriority;
      linkedModule?: string | null;
      tags?: string[];
    }) => apiClient.post('/api/support/tickets', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.tickets() });
      qc.invalidateQueries({ queryKey: supportKeys.ticketStats() });
      toast.success('Ticket created');
    },
    onError: () => {
      toast.error('Failed to create ticket');
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      linkedModule?: string | null;
      tags?: string[];
    }) => apiClient.patch(`/api/support/tickets/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.tickets() });
      qc.invalidateQueries({ queryKey: supportKeys.ticketStats() });
      toast.success('Ticket updated');
    },
    onError: () => {
      toast.error('Failed to update ticket');
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/support/tickets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.tickets() });
      qc.invalidateQueries({ queryKey: supportKeys.ticketStats() });
      toast.success('Ticket deleted');
    },
    onError: () => {
      toast.error('Failed to delete ticket');
    },
  });
}

export function useAddMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      ...body
    }: {
      ticketId: string;
      message: string;
      isInternal?: boolean;
    }) => apiClient.post(`/api/support/tickets/${ticketId}/messages`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: supportKeys.ticketDetail(vars.ticketId) });
      qc.invalidateQueries({ queryKey: supportKeys.tickets() });
      toast.success('Message sent');
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, userId, name }: { ticketId: string; userId: string; name: string }) =>
      apiClient.patch(`/api/support/tickets/${ticketId}/assign`, { userId, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.tickets() });
      toast.success('Ticket assigned');
    },
    onError: () => {
      toast.error('Failed to assign ticket');
    },
  });
}

// ── Session Queries ─────────────────────────────────────────

export function useSupportSessions(filters: SessionFilters = {}) {
  return useQuery({
    queryKey: supportKeys.sessionList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.tenantSlug) params.set('tenantSlug', filters.tenantSlug);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const qs = params.toString();
      return apiClient.get<SessionListResponse>(`/api/admin/support-sessions${qs ? `?${qs}` : ''}`);
    },
    select: (res) => ({ sessions: res.data as SupportSession[], pagination: res.meta }),
    placeholderData: (prev) => prev,
  });
}

export function useSupportSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: supportKeys.sessionDetail(sessionId!),
    queryFn: () => apiClient.get<SessionDetailResponse>(`/api/admin/support-sessions/${sessionId}`),
    select: (res) => res.data.session,
    enabled: !!sessionId,
  });
}

// ── Session Mutations ───────────────────────────────────────

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantSlug,
      reason,
      linkedTicketId,
    }: {
      tenantSlug: string;
      reason: string;
      linkedTicketId?: string | null;
    }) =>
      apiClient.post<StartSessionResponse>(`/api/admin/tenants/${tenantSlug}/impersonate`, {
        reason,
        linkedTicketId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.sessions() });
      toast.success('Support session started');
    },
    onError: () => {
      toast.error('Failed to start session');
    },
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiClient.delete(`/api/admin/support-sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.sessions() });
      toast.success('Session ended');
    },
    onError: () => {
      toast.error('Failed to end session');
    },
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.patch(`/api/admin/support-sessions/${sessionId}/status`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.sessions() });
      toast.success('Session revoked');
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
  });
}

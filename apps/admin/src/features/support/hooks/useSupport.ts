import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
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

export interface TicketMessage {
  _id?: string;
  sender: { userId: string; name: string; email?: string; role: string };
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
  createdBy: { userId: string; name: string; email: string; role: string };
  assignedTo: { userId: string; name: string } | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  linkedModule: string | null;
  tags: string[];
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
  search?: string;
  page?: number;
  limit?: number;
}

export interface TicketStats {
  total: number;
  slaBreached: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
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

// ── Query Key Factory ───────────────────────────────────────

export const supportKeys = {
  all: ['tenant-support'] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticketList: (filters: TicketFilters) => [...supportKeys.tickets(), filters] as const,
  ticketDetail: (id: string) => [...supportKeys.tickets(), 'detail', id] as const,
  ticketStats: () => [...supportKeys.all, 'ticket-stats'] as const,
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
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const qs = params.toString();
      return apiClient.get<TicketListResponse>(`/api/tenant-support/tickets${qs ? `?${qs}` : ''}`);
    },
    select: (res) => ({ tickets: res.data as Ticket[], pagination: res.meta }),
  });
}

export function useSupportTicketDetail(id: string | null) {
  return useQuery({
    queryKey: supportKeys.ticketDetail(id!),
    queryFn: () => apiClient.get<TicketDetailResponse>(`/api/tenant-support/tickets/${id}`),
    select: (res) => res.data.ticket,
    enabled: !!id,
    refetchInterval: 10_000, // poll every 10s for new messages
  });
}

export function useSupportTicketStats() {
  return useQuery({
    queryKey: supportKeys.ticketStats(),
    queryFn: () => apiClient.get<TicketStatsResponse>('/api/tenant-support/tickets/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

// ── Ticket Mutations ────────────────────────────────────────

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      subject: string;
      description: string;
      category: TicketCategory;
      priority?: TicketPriority;
      linkedModule?: string | null;
      tags?: string[];
    }) => apiClient.post('/api/tenant-support/tickets', body),
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
    }) => apiClient.patch(`/api/tenant-support/tickets/${id}`, body),
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

export function useAddMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      apiClient.post(`/api/tenant-support/tickets/${ticketId}/messages`, { message }),
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

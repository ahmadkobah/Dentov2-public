/**
 * useSupport hooks — Unit Tests
 *
 * Tests query key factories, ticket queries (list/detail/stats),
 * session queries (list/detail), ticket mutations (create/update/delete/
 * addMessage/assign), and session mutations (start/end/revoke).
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  supportKeys,
  useSupportTickets,
  useSupportTicketDetail,
  useSupportTicketStats,
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket,
  useAddMessage,
  useAssignTicket,
  useSupportSessions,
  useSupportSessionDetail,
  useStartSession,
  useEndSession,
  useRevokeSession,
} from '../hooks/useSupport.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Query Key Factory ──────────────────────────────────────

describe('supportKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(supportKeys.all).toEqual(['support']);
    expect(supportKeys.tickets()).toEqual(['support', 'tickets']);
    expect(supportKeys.ticketList({ status: 'open' })).toEqual([
      'support',
      'tickets',
      { status: 'open' },
    ]);
    expect(supportKeys.ticketDetail('t1')).toEqual(['support', 'tickets', 'detail', 't1']);
    expect(supportKeys.ticketStats()).toEqual(['support', 'ticket-stats']);
    expect(supportKeys.sessions()).toEqual(['support', 'sessions']);
    expect(supportKeys.sessionList({ status: 'active' })).toEqual([
      'support',
      'sessions',
      { status: 'active' },
    ]);
    expect(supportKeys.sessionDetail('s1')).toEqual(['support', 'sessions', 'detail', 's1']);
  });
});

// ── useSupportTickets ──────────────────────────────────────

describe('useSupportTickets', () => {
  const mockTickets = [
    { _id: 't1', ticketNumber: 'TKT-001', subject: 'Bug', status: 'open', priority: 'high' },
    { _id: 't2', ticketNumber: 'TKT-002', subject: 'Feature', status: 'closed', priority: 'low' },
  ];
  const mockPagination = {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  it('should fetch and select ticket list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockTickets,
      meta: mockPagination,
    });

    const { result } = renderHook(() => useSupportTickets({ status: 'open' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.tickets).toEqual(mockTickets);
    expect(result.current.data?.pagination).toEqual(mockPagination);
  });

  it('should build query string from filters', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
      meta: mockPagination,
    });

    const { result } = renderHook(
      () => useSupportTickets({ status: 'open', priority: 'high', page: 2 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=open'));
  });
});

// ── useSupportTicketDetail ─────────────────────────────────

describe('useSupportTicketDetail', () => {
  it('should fetch a single ticket', async () => {
    const ticket = { _id: 't1', ticketNumber: 'TKT-001', subject: 'Bug', status: 'open' };
    mockGet.mockResolvedValue({ success: true, data: { ticket } });

    const { result } = renderHook(() => useSupportTicketDetail('t1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ticket);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useSupportTicketDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useSupportTicketStats ──────────────────────────────────

describe('useSupportTicketStats', () => {
  it('should fetch ticket stats', async () => {
    const stats = {
      total: 50,
      unassigned: 5,
      slaBreached: 2,
      avgResolutionHours: 24,
      byStatus: { open: 10, closed: 40 },
      byPriority: { high: 5, low: 45 },
      byCategory: { bug: 20, feature: 30 },
    };
    mockGet.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useSupportTicketStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
    expect(mockGet).toHaveBeenCalledWith('/api/support/tickets/stats');
  });
});

// ── useCreateTicket ────────────────────────────────────────

describe('useCreateTicket', () => {
  it('should call POST /api/support/tickets', async () => {
    mockPost.mockResolvedValue({ success: true, data: { _id: 't-new' } });

    const { result } = renderHook(() => useCreateTicket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        tenantId: 'ten1',
        subject: 'New bug',
        description: 'Something broke',
        category: 'bug',
        priority: 'high',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/support/tickets', {
      tenantId: 'ten1',
      subject: 'New bug',
      description: 'Something broke',
      category: 'bug',
      priority: 'high',
    });
  });
});

// ── useUpdateTicket ────────────────────────────────────────

describe('useUpdateTicket', () => {
  it('should call PATCH /api/support/tickets/:id', async () => {
    mockPatch.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useUpdateTicket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 't1', status: 'resolved' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/support/tickets/t1', { status: 'resolved' });
  });
});

// ── useDeleteTicket ────────────────────────────────────────

describe('useDeleteTicket', () => {
  it('should call DELETE /api/support/tickets/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteTicket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('t1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/support/tickets/t1');
  });
});

// ── useAddMessage ──────────────────────────────────────────

describe('useAddMessage', () => {
  it('should call POST /api/support/tickets/:id/messages', async () => {
    mockPost.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useAddMessage(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ ticketId: 't1', message: 'Hello', isInternal: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/support/tickets/t1/messages', {
      message: 'Hello',
      isInternal: false,
    });
  });
});

// ── useAssignTicket ────────────────────────────────────────

describe('useAssignTicket', () => {
  it('should call PATCH /api/support/tickets/:id/assign', async () => {
    mockPatch.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useAssignTicket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ ticketId: 't1', userId: 'u1', name: 'Admin' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/support/tickets/t1/assign', {
      userId: 'u1',
      name: 'Admin',
    });
  });
});

// ── useSupportSessions ─────────────────────────────────────

describe('useSupportSessions', () => {
  const mockSessions = [
    { _id: 's1', sessionId: 'sess-1', status: 'active', tenantSlug: 'clinic-a' },
    { _id: 's2', sessionId: 'sess-2', status: 'ended', tenantSlug: 'clinic-b' },
  ];
  const mockPagination = {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  it('should fetch and select session list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockSessions,
      meta: mockPagination,
    });

    const { result } = renderHook(() => useSupportSessions({ status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sessions).toEqual(mockSessions);
  });
});

// ── useSupportSessionDetail ────────────────────────────────

describe('useSupportSessionDetail', () => {
  it('should fetch a single session', async () => {
    const session = { _id: 's1', sessionId: 'sess-1', status: 'active' };
    mockGet.mockResolvedValue({ success: true, data: { session } });

    const { result } = renderHook(() => useSupportSessionDetail('s1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(session);
  });

  it('should not fetch when sessionId is null', () => {
    const { result } = renderHook(() => useSupportSessionDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useStartSession ────────────────────────────────────────

describe('useStartSession', () => {
  it('should call POST /api/admin/tenants/:slug/impersonate', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { session: {}, tempToken: 'tok', expiresAt: '2026-01-01' },
    });

    const { result } = renderHook(() => useStartSession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        tenantSlug: 'clinic-a',
        reason: 'Debug issue',
        linkedTicketId: 't1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/admin/tenants/clinic-a/impersonate', {
      reason: 'Debug issue',
      linkedTicketId: 't1',
    });
  });
});

// ── useEndSession ──────────────────────────────────────────

describe('useEndSession', () => {
  it('should call DELETE /api/admin/support-sessions/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useEndSession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('s1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/admin/support-sessions/s1');
  });
});

// ── useRevokeSession ───────────────────────────────────────

describe('useRevokeSession', () => {
  it('should call PATCH /api/admin/support-sessions/:id/status', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('s1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/admin/support-sessions/s1/status', {});
  });
});

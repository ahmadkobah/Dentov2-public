/**
 * Support Ticket Types — Shared Package
 * Based on DENTO_V2_MASTER_PLAN.md §9 — Ticketing System
 */

// ── Enums ───────────────────────────────────────────────────

export const TICKET_CATEGORIES = ['bug', 'feature', 'billing', 'access', 'other'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_customer',
  'waiting_internal',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// ── Interfaces ──────────────────────────────────────────────

export interface ITicketAttachment {
  filename: string;
  url: string;
  size: number;
}

export interface ITicketMessage {
  sender: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  message: string;
  attachments: ITicketAttachment[];
  isInternal: boolean;
  createdAt: string;
}

export interface ITicketCreator {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface ITicketAssignee {
  userId: string;
  name: string;
}

export interface ITicketSla {
  responseDeadline: string | null;
  resolutionDeadline: string | null;
}

export interface ISupportTicket {
  _id: string;
  ticketNumber: string;
  tenantId: string;
  createdBy: ITicketCreator;
  assignedTo: ITicketAssignee | null;

  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  subject: string;
  description: string;
  attachments: ITicketAttachment[];

  messages: ITicketMessage[];

  linkedSessions: string[];
  linkedModule: string | null;

  sla: ITicketSla;
  firstResponseAt: string | null;
  resolvedAt: string | null;

  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ── SLA Defaults (hours) ────────────────────────────────────

export const SLA_DEFAULTS: Record<
  TicketPriority,
  { responseHours: number; resolutionHours: number }
> = {
  urgent: { responseHours: 1, resolutionHours: 4 },
  high: { responseHours: 4, resolutionHours: 24 },
  medium: { responseHours: 8, resolutionHours: 72 },
  low: { responseHours: 24, resolutionHours: 168 },
};

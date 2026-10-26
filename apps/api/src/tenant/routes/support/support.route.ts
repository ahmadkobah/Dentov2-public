/**
 * Tenant Support Routes — Clinic/Admin-side API
 *
 * Endpoints:
 *   - GET    /api/tenant-support/tickets             — List own tickets
 *   - GET    /api/tenant-support/tickets/stats        — Own ticket stats
 *   - GET    /api/tenant-support/tickets/:id          — Ticket detail (own only, no internal messages)
 *   - POST   /api/tenant-support/tickets              — Create ticket
 *   - POST   /api/tenant-support/tickets/:id/messages — Add message (public only)
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../middleware/index.js';
import { SupportTicket } from '../../../platform/models/support-ticket.model.js';
import { SupportSession } from '../../../platform/models/support-session.model.js';
import { SLA_DEFAULTS } from '@dento/shared';
import { logger } from '../../../utils/logger.js';
import { sendEmail } from '../../../services/providers/email.provider.js';
import { ticketCreatedEmailHtml } from '../../../utils/email-templates.js';
import { User } from '../../../platform/models/index.js';

// ── Validation Schemas ──────────────────────────────────────

const createTicketSchema = z
  .object({
    subject: z.string().min(3).max(500),
    description: z.string().min(10).max(10000),
    category: z.enum(['bug', 'feature', 'billing', 'access', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    linkedModule: z.string().nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  })
  .strict();

const addMessageSchema = z
  .object({
    message: z.string().min(1).max(10000),
  })
  .strict();

const updateTicketSchema = z
  .object({
    status: z
      .enum(['open', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  })
  .strict();

// ── Helpers ─────────────────────────────────────────────────

// Returns the next available DENTO-NNNN number based on the highest existing
// ticket. NOTE: still racy under high concurrency — `createTicketWithRetry`
// below catches E11000 and retries.
async function generateTicketNumber(): Promise<string> {
  const last = await SupportTicket.findOne({ ticketNumber: { $regex: /^DENTO-\d+$/ } })
    .sort({ ticketNumber: -1 })
    .select('ticketNumber')
    .lean();
  const lastNum =
    last?.ticketNumber && typeof last.ticketNumber === 'string'
      ? parseInt(last.ticketNumber.replace(/^DENTO-/, ''), 10) || 0
      : 0;
  return `DENTO-${String(lastNum + 1).padStart(4, '0')}`;
}

/**
 * Creates a ticket with auto-generated `ticketNumber`, retrying on E11000
 * duplicate-key collisions (concurrent inserts) up to 5 times.
 */
async function createTicketWithRetry(
  buildPayload: (ticketNumber: string) => Record<string, unknown>,
): Promise<InstanceType<typeof SupportTicket>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketNumber = await generateTicketNumber();
    try {
       
      return (await SupportTicket.create(buildPayload(ticketNumber))) as InstanceType<
        typeof SupportTicket
      >;
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: number })?.code;
      const keyPattern = (err as { keyPattern?: Record<string, unknown> })?.keyPattern;
      if (code === 11000 && keyPattern && 'ticketNumber' in keyPattern) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error('Failed to create ticket after retries');
}

function computeSlaDeadlines(priority: 'low' | 'medium' | 'high' | 'urgent') {
  const now = new Date();
  const sla = SLA_DEFAULTS[priority];
  return {
    responseDeadline: new Date(now.getTime() + sla.responseHours * 60 * 60 * 1000),
    resolutionDeadline: new Date(now.getTime() + sla.resolutionHours * 60 * 60 * 1000),
  };
}

async function findRoundRobinAssignee(): Promise<{ userId: string; name: string } | null> {
  try {
    const platformUsers = await User.find({
      tenantSlug: null,
      platformRole: { $ne: null },
      status: 'active',
    })
      .select('_id profile platformRole')
      .lean();

    if (platformUsers.length === 0) return null;

    const openStatuses = ['open', 'in_progress', 'waiting_customer', 'waiting_internal'];
    const counts = await SupportTicket.aggregate([
      { $match: { status: { $in: openStatuses }, 'assignedTo.userId': { $ne: null } } },
      { $group: { _id: '$assignedTo.userId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const c of counts) countMap.set(String(c._id), c.count);

    let best = platformUsers[0];
    let bestCount = countMap.get(String(best._id)) ?? 0;

    for (const u of platformUsers.slice(1)) {
      const c = countMap.get(String(u._id)) ?? 0;
      if (c < bestCount) {
        best = u;
        bestCount = c;
      }
    }

    const profile = best.profile as unknown as
      | { firstName?: string | { en?: string }; lastName?: string | { en?: string } }
      | undefined;
    const first =
      typeof profile?.firstName === 'object' ? profile.firstName?.en : profile?.firstName;
    const last = typeof profile?.lastName === 'object' ? profile.lastName?.en : profile?.lastName;
    const name = [first, last].filter(Boolean).join(' ') || 'Platform User';
    return { userId: String(best._id), name };
  } catch (err) {
    logger.warn({ err }, 'Round-robin assignment failed, ticket will be unassigned');
    return null;
  }
}

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

function getTenantSlug(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).tenantSlug ?? '') as string;
}

// ── Routes ──────────────────────────────────────────────────

export async function tenantSupportRoutes(fastify: FastifyInstance) {
  // ─── LIST OWN TICKETS ─────────────────────────────────────
  fastify.get('/tickets', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const tenantSlug = getTenantSlug(request);
      if (!tenantSlug) return apiError(reply, 403, 'Tenant context required');

      const query = request.query as {
        status?: string;
        priority?: string;
        category?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

      const filter: Record<string, unknown> = { tenantId: tenantSlug };
      if (query.status) filter.status = query.status;
      if (query.priority) filter.priority = query.priority;
      if (query.category) filter.category = query.category;
      if (query.search) {
        const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { subject: { $regex: safeSearch, $options: 'i' } },
          { ticketNumber: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
      const skip = (page - 1) * limit;

      const [tickets, total] = await Promise.all([
        SupportTicket.find(filter)
          .select('-messages')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        SupportTicket.countDocuments(filter),
      ]);

      return apiResponse(reply, 200, tickets, undefined, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      logger.error({ err }, 'Tenant ticket list error');
      return apiError(reply, 500, 'Failed to list tickets');
    }
  });

  // ─── OWN TICKET STATS ────────────────────────────────────
  fastify.get('/tickets/stats', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const tenantSlug = getTenantSlug(request);
      if (!tenantSlug) return apiError(reply, 403, 'Tenant context required');

      const match = { tenantId: tenantSlug };

      const [total, statusCounts, priorityCounts] = await Promise.all([
        SupportTicket.countDocuments(match),
        SupportTicket.aggregate([
          { $match: match },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        SupportTicket.aggregate([
          { $match: match },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
      ]);

      const toMap = (arr: Array<{ _id: string; count: number }>) =>
        arr.reduce(
          (acc, item) => {
            acc[item._id] = item.count;
            return acc;
          },
          {} as Record<string, number>,
        );

      const slaBreached = await SupportTicket.countDocuments({
        ...match,
        status: { $nin: ['resolved', 'closed'] },
        'sla.resolutionDeadline': { $lt: new Date() },
      });

      return apiResponse(reply, 200, {
        total,
        slaBreached,
        byStatus: toMap(statusCounts),
        byPriority: toMap(priorityCounts),
      });
    } catch (err) {
      logger.error({ err }, 'Tenant ticket stats error');
      return apiError(reply, 500, 'Failed to fetch ticket stats');
    }
  });

  // ─── GET TICKET DETAIL (own only, no internal messages) ───
  fastify.get('/tickets/:id', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const tenantSlug = getTenantSlug(request);
      if (!tenantSlug) return apiError(reply, 403, 'Tenant context required');

      const { id } = request.params as { id: string };
      const ticket = await SupportTicket.findById(id).lean();

      if (!ticket) return apiError(reply, 404, 'Ticket not found');
      if (ticket.tenantId !== tenantSlug) return apiError(reply, 404, 'Ticket not found');

      // Strip internal messages — tenant should not see internal notes
      const publicMessages = (ticket.messages || []).filter((m) => !m.isInternal);

      return apiResponse(reply, 200, { ticket: { ...ticket, messages: publicMessages } });
    } catch (err) {
      logger.error({ err }, 'Tenant ticket detail error');
      return apiError(reply, 500, 'Failed to fetch ticket');
    }
  });

  // ─── CREATE TICKET ────────────────────────────────────────
  fastify.post('/tickets', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const tenantSlug = getTenantSlug(request);
      if (!tenantSlug) return apiError(reply, 403, 'Tenant context required');

      const body = createTicketSchema.parse(request.body);
      const user = getUser(request);

      const slaDeadlines = computeSlaDeadlines(body.priority);
      const assignee = await findRoundRobinAssignee();

      const ticket = await createTicketWithRetry((ticketNumber) => ({
        ticketNumber,
        tenantId: tenantSlug,
        createdBy: {
          userId: user?.userId || user?.id || 'unknown',
          name: user?.name || 'Clinic User',
          email: user?.email || '',
          role: user?.role || 'tenant_user',
        },
        category: body.category,
        priority: body.priority,
        status: assignee ? 'in_progress' : 'open',
        subject: body.subject,
        description: body.description,
        linkedModule: body.linkedModule || null,
        tags: body.tags || [],
        sla: slaDeadlines,
        ...(assignee && { assignedTo: assignee }),
      }));
      const ticketNumber = ticket.ticketNumber;

      // Fire-and-forget: email the assigned user
      if (assignee) {
        User.findById(assignee.userId)
          .select('email')
          .lean()
          .then((u) => {
            if (u?.email) {
              sendEmail({
                to: u.email as string,
                subject: `[${ticketNumber}] New ticket from ${tenantSlug}: ${body.subject}`,
                html: ticketCreatedEmailHtml({
                  ticketNumber,
                  subject: body.subject,
                  priority: body.priority,
                  assigneeName: assignee.name,
                  tenantId: tenantSlug,
                }),
              }).catch((e) => logger.warn({ err: e }, 'Failed to send ticket-created email'));
            }
          })
          .catch((e) => logger.warn({ err: e }, 'Failed to look up assignee email'));
      }

      return apiResponse(reply, 201, { ticket });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return apiError(reply, 400, 'Invalid ticket data', err.format());
      }
      logger.error({ err }, 'Tenant ticket create error');
      return apiError(reply, 500, 'Failed to create ticket');
    }
  });

  // ─── UPDATE TICKET (status/priority only) ──────────────────
  fastify.patch('/tickets/:id', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const tenantSlug = getTenantSlug(request);
      if (!tenantSlug) return apiError(reply, 403, 'Tenant context required');

      const { id } = request.params as { id: string };
      const body = updateTicketSchema.parse(request.body);

      const ticket = await SupportTicket.findById(id);
      if (!ticket) return apiError(reply, 404, 'Ticket not found');
      if (ticket.tenantId !== tenantSlug) return apiError(reply, 404, 'Ticket not found');

      if (body.status) {
        ticket.status = body.status;
        if (body.status === 'resolved' && !ticket.resolvedAt) {
          ticket.resolvedAt = new Date();
        }
      }
      if (body.priority) ticket.priority = body.priority;

      await ticket.save();

      // Strip internal messages
      const saved = ticket.toObject();
      const publicMessages = (saved.messages || []).filter((m) => !m.isInternal);

      return apiResponse(reply, 200, { ticket: { ...saved, messages: publicMessages } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return apiError(reply, 400, 'Invalid update data', err.format());
      }
      logger.error({ err }, 'Tenant ticket update error');
      return apiError(reply, 500, 'Failed to update ticket');
    }
  });

  // ─── ADD MESSAGE (public only) ────────────────────────────
  fastify.post('/tickets/:id/messages', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const tenantSlug = getTenantSlug(request);
      if (!tenantSlug) return apiError(reply, 403, 'Tenant context required');

      const { id } = request.params as { id: string };
      const body = addMessageSchema.parse(request.body);
      const user = getUser(request);

      const ticket = await SupportTicket.findById(id);
      if (!ticket) return apiError(reply, 404, 'Ticket not found');
      if (ticket.tenantId !== tenantSlug) return apiError(reply, 404, 'Ticket not found');

      if (ticket.status === 'closed') {
        return apiError(reply, 400, 'Cannot add messages to a closed ticket');
      }

      const newMessage = {
        sender: {
          userId: user?.userId || user?.id || 'unknown',
          name: user?.name || 'Clinic User',
          email: user?.email || '',
          role: user?.role || 'tenant_user',
        },
        message: body.message,
        attachments: [],
        isInternal: false,
        createdAt: new Date(),
      };

      ticket.messages.push(newMessage);

      // Move from waiting_customer back to in_progress on tenant reply
      if (ticket.status === 'waiting_customer') {
        ticket.status = 'in_progress';
      }

      await ticket.save();

      // Return ticket with internal messages stripped
      const saved = ticket.toObject();
      const publicMessages = (saved.messages || []).filter((m) => !m.isInternal);

      return apiResponse(reply, 201, { ticket: { ...saved, messages: publicMessages } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return apiError(reply, 400, 'Invalid message data', err.format());
      }
      logger.error({ err }, 'Tenant message add error');
      return apiError(reply, 500, 'Failed to add message');
    }
  });

  // ─── ACTIVE SUPPORT SESSION (for SupportSessionBanner) ────
  // GET /api/tenant-support/sessions/active
  fastify.get('/sessions/active', { preHandler: [authGuard] }, async (request, reply) => {
    try {
      const tenantSlug = getTenantSlug(request);
      if (!tenantSlug) return apiError(reply, 403, 'Tenant context required');

      const session = await SupportSession.findOne({
        tenantSlug,
        status: 'active',
        expiresAt: { $gt: new Date() },
      })
        .select('performedBy reason startedAt expiresAt')
        .lean();

      return apiResponse(reply, 200, session);
    } catch (err) {
      logger.error({ err }, 'Active session check error');
      return apiError(reply, 500, 'Failed to check active session');
    }
  });
}

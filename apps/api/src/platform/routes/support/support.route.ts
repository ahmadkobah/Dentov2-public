/**
 * Support Ticket Routes — Platform API (Dev Portal)
 * Based on DENTO_V2_MASTER_PLAN.md §9 — Ticketing System
 *
 * Endpoints:
 *   Tickets:
 *   - GET    /api/support/tickets             — List tickets (with filters)
 *   - GET    /api/support/tickets/stats       — Ticket stats (totals by status/priority)
 *   - GET    /api/support/tickets/:id         — Get ticket detail with messages
 *   - POST   /api/support/tickets             — Create ticket
 *   - PATCH  /api/support/tickets/:id         — Update ticket (status, priority, category, tags)
 *   - DELETE /api/support/tickets/:id         — Delete ticket (platform_admin)
 *
 *   Messages:
 *   - POST   /api/support/tickets/:id/messages  — Add message to ticket
 *
 *   Assignment:
 *   - PATCH  /api/support/tickets/:id/assign    — Assign/reassign ticket
 *
 *   Tenant-specific:
 *   - GET    /api/support/tenants/:tenantId/tickets — List tickets for a tenant
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { SupportTicket } from '../../models/support-ticket.model.js';
import { User } from '../../models/index.js';
import { SLA_DEFAULTS } from '@dento/shared';
import { logger } from '../../../utils/logger.js';
import { sendEmail } from '../../../services/providers/email.provider.js';
import { ticketCreatedEmailHtml, ticketReplyEmailHtml } from '../../../utils/email-templates.js';

// ── Auth Interface ──────────────────────────────────────────

// ── Validation Schemas ──────────────────────────────────────

const createTicketSchema = z
  .object({
    tenantId: z.string().min(1),
    subject: z.string().min(3).max(500),
    description: z.string().min(10).max(10000),
    category: z.enum(['bug', 'feature', 'billing', 'access', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    linkedModule: z.string().nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    attachments: z
      .array(
        z
          .object({
            filename: z.string().min(1),
            url: z.string().url(),
            size: z.number().min(0),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const updateTicketSchema = z
  .object({
    status: z
      .enum(['open', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    category: z.enum(['bug', 'feature', 'billing', 'access', 'other']).optional(),
    linkedModule: z.string().nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  })
  .strict();

const addMessageSchema = z
  .object({
    message: z.string().min(1).max(10000),
    isInternal: z.boolean().default(false),
    attachments: z
      .array(
        z
          .object({
            filename: z.string().min(1),
            url: z.string().url(),
            size: z.number().min(0),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const assignTicketSchema = z
  .object({
    userId: z.string().min(1),
    name: z.string().min(1),
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

/**
 * Round-robin auto-assign: find the active platform user with the fewest open tickets.
 */
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

    // Count open/in_progress tickets per user
    const openStatuses = ['open', 'in_progress', 'waiting_customer', 'waiting_internal'];
    const counts = await SupportTicket.aggregate([
      { $match: { status: { $in: openStatuses }, 'assignedTo.userId': { $ne: null } } },
      { $group: { _id: '$assignedTo.userId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(String(c._id), c.count);
    }

    // Pick the user with fewest open tickets
    let best = platformUsers[0];
    let bestCount = countMap.get(String(best._id)) ?? 0;

    for (const u of platformUsers.slice(1)) {
      const c = countMap.get(String(u._id)) ?? 0;
      if (c < bestCount) {
        best = u;
        bestCount = c;
      }
    }

    const profile = best.profile as
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

// ── Support Ticket Routes ───────────────────────────────────

// ── Route Helpers ───────────────────────────────────────────

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

export async function supportRoutes(fastify: FastifyInstance) {
  // ─── LIST TICKETS ─────────────────────────────────────────
  fastify.get(
    '/tickets',
    { preHandler: [authGuard, platformGuard('platform_support', 'read')] },
    async (request, reply) => {
      try {
        const query = request.query as {
          status?: string;
          priority?: string;
          category?: string;
          tenantId?: string;
          assignedTo?: string;
          search?: string;
          page?: string;
          limit?: string;
          sort?: string;
        };

        const filter: Record<string, unknown> = {};

        if (query.status) filter.status = query.status;
        if (query.priority) filter.priority = query.priority;
        if (query.category) filter.category = query.category;
        if (query.tenantId) filter.tenantId = query.tenantId;
        if (query.assignedTo) filter['assignedTo.userId'] = query.assignedTo;
        if (query.search) {
          const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          filter.$or = [
            { subject: { $regex: safeSearch, $options: 'i' } },
            { ticketNumber: { $regex: safeSearch, $options: 'i' } },
            { description: { $regex: safeSearch, $options: 'i' } },
          ];
        }

        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
        const skip = (page - 1) * limit;

        // Sort: default by priority (urgent first), then createdAt desc
        let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
        if (query.sort === 'priority') {
          sortObj = { priority: 1, createdAt: -1 };
        } else if (query.sort === 'updated') {
          sortObj = { updatedAt: -1 };
        }

        const [tickets, total] = await Promise.all([
          SupportTicket.find(filter)
            .select('-messages') // Exclude messages for list view
            .sort(sortObj)
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
        logger.error({ err }, 'Ticket list error');
        return apiError(reply, 500, 'Failed to list tickets');
      }
    },
  );

  // ─── TICKET STATS ────────────────────────────────────────
  fastify.get(
    '/tickets/stats',
    { preHandler: [authGuard, platformGuard('platform_support', 'read')] },
    async (_request, reply) => {
      try {
        const [total, statusCounts, priorityCounts, categoryCounts, unassigned, avgResolutionTime] =
          await Promise.all([
            SupportTicket.countDocuments(),
            SupportTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            SupportTicket.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
            SupportTicket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
            SupportTicket.countDocuments({
              assignedTo: null,
              status: { $nin: ['resolved', 'closed'] },
            }),
            SupportTicket.aggregate([
              { $match: { resolvedAt: { $ne: null } } },
              {
                $project: {
                  resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] },
                },
              },
              { $group: { _id: null, avgMs: { $avg: '$resolutionMs' } } },
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

        const avgHours = avgResolutionTime[0]
          ? Math.round((avgResolutionTime[0].avgMs / (1000 * 60 * 60)) * 10) / 10
          : null;

        // SLA breach count (open tickets past deadline)
        const slaBreached = await SupportTicket.countDocuments({
          status: { $nin: ['resolved', 'closed'] },
          'sla.resolutionDeadline': { $lt: new Date() },
        });

        return apiResponse(reply, 200, {
          total,
          unassigned,
          slaBreached,
          avgResolutionHours: avgHours,
          byStatus: toMap(statusCounts),
          byPriority: toMap(priorityCounts),
          byCategory: toMap(categoryCounts),
        });
      } catch (err) {
        logger.error({ err }, 'Ticket stats error');
        return apiError(reply, 500, 'Failed to fetch ticket stats');
      }
    },
  );

  // ─── GET TICKET DETAIL ────────────────────────────────────
  fastify.get(
    '/tickets/:id',
    { preHandler: [authGuard, platformGuard('platform_support', 'read')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const ticket = await SupportTicket.findById(id).lean();
        if (!ticket) {
          return apiError(reply, 404, 'Ticket not found');
        }
        return apiResponse(reply, 200, { ticket });
      } catch (err) {
        logger.error({ err }, 'Ticket detail error');
        return apiError(reply, 500, 'Failed to fetch ticket');
      }
    },
  );

  // ─── CREATE TICKET ────────────────────────────────────────
  fastify.post(
    '/tickets',
    { preHandler: [authGuard, platformGuard('platform_support', 'create')] },
    async (request, reply) => {
      try {
        const body = createTicketSchema.parse(request.body);
        const user = getUser(request);

        const slaDeadlines = computeSlaDeadlines(body.priority);

        // Round-robin auto-assign
        const assignee = await findRoundRobinAssignee();

        const ticket = await createTicketWithRetry((ticketNumber) => ({
          ticketNumber,
          tenantId: body.tenantId,
          createdBy: {
            userId: user?.id || 'system',
            name: 'Platform User',
            email: 'platform@dento.app',
            role: user?.role || 'platform_admin',
          },
          category: body.category,
          priority: body.priority,
          status: assignee ? 'in_progress' : 'open',
          subject: body.subject,
          description: body.description,
          attachments: body.attachments || [],
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
                  subject: `[${ticketNumber}] New ticket assigned: ${body.subject}`,
                  html: ticketCreatedEmailHtml({
                    ticketNumber,
                    subject: body.subject,
                    priority: body.priority,
                    assigneeName: assignee.name,
                    tenantId: body.tenantId,
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
        logger.error({ err }, 'Ticket create error');
        return apiError(reply, 500, 'Failed to create ticket');
      }
    },
  );

  // ─── UPDATE TICKET ────────────────────────────────────────
  fastify.patch(
    '/tickets/:id',
    { preHandler: [authGuard, platformGuard('platform_support', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateTicketSchema.parse(request.body);

        const ticket = await SupportTicket.findById(id);
        if (!ticket) {
          return apiError(reply, 404, 'Ticket not found');
        }

        // Track status changes
        if (body.status) {
          ticket.status = body.status;
          if (body.status === 'resolved' && !ticket.resolvedAt) {
            ticket.resolvedAt = new Date();
          }
        }
        if (body.priority) {
          ticket.priority = body.priority;
          // Recalculate SLA on priority change
          const sla = computeSlaDeadlines(body.priority);
          ticket.sla = sla;
        }
        if (body.category) ticket.category = body.category;
        if (body.linkedModule !== undefined) ticket.linkedModule = body.linkedModule;
        if (body.tags) ticket.tags = body.tags;

        await ticket.save();

        return apiResponse(reply, 200, { ticket });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Invalid update data', err.format());
        }
        logger.error({ err }, 'Ticket update error');
        return apiError(reply, 500, 'Failed to update ticket');
      }
    },
  );

  // ─── DELETE TICKET ────────────────────────────────────────
  fastify.delete(
    '/tickets/:id',
    { preHandler: [authGuard, platformGuard('platform_support', 'delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const ticket = await SupportTicket.findByIdAndDelete(id);
        if (!ticket) {
          return apiError(reply, 404, 'Ticket not found');
        }
        return apiResponse(reply, 200, { deleted: true, ticketNumber: ticket.ticketNumber });
      } catch (err) {
        logger.error({ err }, 'Ticket delete error');
        return apiError(reply, 500, 'Failed to delete ticket');
      }
    },
  );

  // ─── ADD MESSAGE ──────────────────────────────────────────
  fastify.post(
    '/tickets/:id/messages',
    { preHandler: [authGuard, platformGuard('platform_support', 'create')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = addMessageSchema.parse(request.body);
        const user = getUser(request);

        const ticket = await SupportTicket.findById(id);
        if (!ticket) {
          return apiError(reply, 404, 'Ticket not found');
        }

        // Cannot add to closed tickets
        if (ticket.status === 'closed') {
          return apiError(reply, 400, 'Cannot add messages to a closed ticket');
        }

        const newMessage = {
          sender: {
            userId: user?.id || 'system',
            name: 'Platform User',
            email: 'platform@dento.app',
            role: user?.role || 'platform_admin',
          },
          message: body.message,
          attachments: body.attachments || [],
          isInternal: body.isInternal,
          createdAt: new Date(),
        };

        ticket.messages.push(newMessage);

        // Track first response time
        if (!ticket.firstResponseAt && ticket.assignedTo) {
          ticket.firstResponseAt = new Date();
        }

        await ticket.save();

        // Fire-and-forget: notify the assigned user about the new reply
        if (ticket.assignedTo && ticket.assignedTo.userId !== (user?.id || 'system')) {
          User.findById(ticket.assignedTo.userId)
            .select('email')
            .lean()
            .then((u) => {
              if (u?.email) {
                sendEmail({
                  to: u.email as string,
                  subject: `[${ticket.ticketNumber}] New reply: ${ticket.subject}`,
                  html: ticketReplyEmailHtml({
                    ticketNumber: ticket.ticketNumber,
                    subject: ticket.subject,
                    senderName: newMessage.sender.name,
                    messagePreview: body.message,
                    isInternal: body.isInternal,
                  }),
                }).catch((e) => logger.warn({ err: e }, 'Failed to send ticket-reply email'));
              }
            })
            .catch((e) => logger.warn({ err: e }, 'Failed to look up assignee for reply email'));
        }

        return apiResponse(reply, 201, { ticket });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Invalid message data', err.format());
        }
        logger.error({ err }, 'Message add error');
        return apiError(reply, 500, 'Failed to add message');
      }
    },
  );

  // ─── ASSIGN TICKET ────────────────────────────────────────
  fastify.patch(
    '/tickets/:id/assign',
    { preHandler: [authGuard, platformGuard('platform_support', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = assignTicketSchema.parse(request.body);

        const ticket = await SupportTicket.findById(id);
        if (!ticket) {
          return apiError(reply, 404, 'Ticket not found');
        }

        ticket.assignedTo = { userId: body.userId, name: body.name };

        // Auto-transition to in_progress when assigned
        if (ticket.status === 'open') {
          ticket.status = 'in_progress';
        }

        await ticket.save();

        return apiResponse(reply, 200, { ticket });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Invalid assign data', err.format());
        }
        logger.error({ err }, 'Ticket assign error');
        return apiError(reply, 500, 'Failed to assign ticket');
      }
    },
  );

  // ─── TENANT-SPECIFIC TICKETS ──────────────────────────────
  fastify.get(
    '/tenants/:tenantId/tickets',
    { preHandler: [authGuard, platformGuard('platform_support', 'read')] },
    async (request, reply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const query = request.query as {
          status?: string;
          page?: string;
          limit?: string;
        };

        const filter: Record<string, unknown> = { tenantId };
        if (query.status) filter.status = query.status;

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
        logger.error({ err }, 'Tenant tickets error');
        return apiError(reply, 500, 'Failed to list tenant tickets');
      }
    },
  );
}

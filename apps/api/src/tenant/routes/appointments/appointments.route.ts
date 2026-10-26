/**
 * Appointment Routes — Full CRUD + status management + daily ops
 *
 * Per DENTO_V2_MASTER_PLAN.md — Appointment Calendar
 * Per V2_DATABASE.md §6 — Appointments & Scheduling
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 *
 * Endpoints:
 *   Appointments:
 *   - GET    /api/appointments              — List/calendar view (paginated, filterable)
 *   - GET    /api/appointments/:id          — Get appointment detail
 *   - POST   /api/appointments              — Create appointment
 *   - PUT    /api/appointments/:id          — Update appointment
 *   - PATCH  /api/appointments/:id/status   — Update status (including cancel with reason)
 *   - PATCH  /api/appointments/:id/arrive   — Mark patient as arrived (convenience)
 *   - PATCH  /api/appointments/:id/assign-chair — Assign a chair to the appointment
 *
 * Appointment Types → /api/appointment-types (appointment-types.route.ts)
 * Waitlist          → /api/waitlists          (waitlist.route.ts)
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentQuerySchema,
  appointmentStatusEnum,
  assignChairSchema,
  recurringEditSchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import type { UserRole } from '../../middleware/role-guard.js';
import { AppointmentService } from '../../services/appointment.service.js';
import { NotificationService } from '../../../services/notification.service.js';
import { getChairModel } from '../../models/chair.model.js';
import { socketEmitter } from '../../../plugins/socket.plugin.js';

// ── Helper to extract tenant context from request ───────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

function getAppointmentAccessContext(request: unknown): { userId: string; role: UserRole } {
  const user = (request as unknown as Record<string, unknown>).user as Record<string, string>;
  return { userId: user.userId, role: user.role as UserRole };
}

// ── Route Registration ──────────────────────────────────────

export async function appointmentRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ══════════════════════════════════════════════════════════
  // ── Appointments ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  // ── GET /appointments ─────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [...preHandler, roleGuard('appointments', 'read')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const query = appointmentQuerySchema.parse(request.query);
        const service = new AppointmentService(tenantDb);
        const result = await service.listAppointments(query, getAppointmentAccessContext(request));

        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        fastify.log.error(err, 'Failed to list appointments');
        return apiError(reply, 500, 'Failed to list appointments');
      }
    },
  );

  // ── GET /appointments/:id ─────────────────────────────────
  fastify.get(
    '/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'read')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const { id } = request.params as { id: string };
        const service = new AppointmentService(tenantDb);
        const appointment = await service.getAppointmentById(
          id,
          getAppointmentAccessContext(request),
        );

        return apiResponse(reply, 200, { appointment });
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to fetch appointment');
      }
    },
  );

  // ── POST /appointments ────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [...preHandler, roleGuard('appointments', 'create')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const body = createAppointmentSchema.parse(request.body);
        const service = new AppointmentService(tenantDb);
        const appointment = await service.createAppointment(body, userId);

        return apiResponse(reply, 201, { appointment });
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to create appointment');
      }
    },
  );

  // ── PUT /appointments/:id ─────────────────────────────────
  fastify.put(
    '/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const body = updateAppointmentSchema.parse(request.body);
        const service = new AppointmentService(tenantDb);
        const appointment = await service.updateAppointment(id, body, userId);

        return apiResponse(reply, 200, { appointment });
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to update appointment');
      }
    },
  );

  // ── PATCH /appointments/:id/status ────────────────────────
  // Also handles cancellation: { status: 'cancelled', cancellationReason: '...' }
  fastify.patch(
    '/:id/status',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const { status, cancellationReason, chairNumber } = z
          .object({
            status: appointmentStatusEnum,
            cancellationReason: z.string().max(500).optional(),
            chairNumber: z.number().int().min(1).optional(),
          })
          .strict()
          .parse(request.body);

        const service = new AppointmentService(tenantDb);

        // If cancelling with a reason, use cancelAppointment for proper audit
        const updateData: Record<string, unknown> = { status };
        if (chairNumber !== undefined) updateData.chairNumber = chairNumber;
        const appointment =
          status === 'cancelled'
            ? await service.cancelAppointment(id, cancellationReason ?? '', userId)
            : await service.updateAppointment(id, updateData as any, userId);

        return apiResponse(reply, 200, { appointment });
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to update appointment status');
      }
    },
  );

  // ── PATCH /appointments/:id/arrive ─────────────────────────
  // Convenience endpoint: marks an appointment as "arrived".
  // The service already sets arrivedAt + emits socket events.
  fastify.patch(
    '/:id/arrive',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };

        const service = new AppointmentService(tenantDb);
        const appointment = await service.updateAppointment(id, { status: 'arrived' }, userId);

        return apiResponse(reply, 200, { appointment }, 'Patient marked as arrived');
      } catch (err) {
        if (err instanceof Error && 'statusCode' in err) throw err;
        return apiError(reply, 500, 'Failed to mark patient as arrived');
      }
    },
  );

  // ── POST /appointments/:id/reschedule ──────────────────────
  // Phase 3.2 — first-class reschedule action (separate from generic edit).
  // Re-validates the new slot, writes audit, fires `appointment.rescheduled`.
  fastify.post(
    '/:id/reschedule',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const body = z
          .object({
            date: z.string().date(),
            startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm'),
            endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm'),
            durationMinutes: z.number().int().positive().optional(),
            branchId: z.string().optional(),
            doctorId: z.string().optional(),
            reason: z.string().max(500).default(''),
          })
          .strict()
          .parse(request.body);

        const service = new AppointmentService(tenantDb);
        const appointment = await service.rescheduleAppointment(
          id,
          {
            date: body.date,
            startTime: body.startTime,
            endTime: body.endTime,
            durationMinutes: body.durationMinutes,
            branchId: body.branchId,
            doctorId: body.doctorId,
          },
          body.reason,
          userId,
        );

        return apiResponse(reply, 200, { appointment }, 'Appointment rescheduled');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to reschedule appointment');
      }
    },
  );

  // ── POST /appointments/:id/handoff ────────────────────────
  // Phase 9.2 — Doctor handoff. Writes high-sensitivity audit + notifies
  // outgoing/incoming doctor + patient.
  fastify.post(
    '/:id/handoff',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const body = z
          .object({
            newDoctorId: z.string().min(1),
            reason: z.string().min(1).max(500),
            note: z.string().max(2000).optional(),
          })
          .strict()
          .parse(request.body);

        const service = new AppointmentService(tenantDb);
        const appointment = await service.handoffAppointment(
          id,
          body.newDoctorId,
          body.reason,
          body.note,
          userId,
        );

        return apiResponse(reply, 200, { appointment }, 'Appointment handed off');
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to hand off appointment');
      }
    },
  );

  // ── PATCH /appointments/:id/assign-chair ──────────────────
  // Assigns a chair to an appointment and updates chair status to 'occupied'.
  // Emits both queue:update (chair_assigned) and chair:status socket events.
  fastify.patch(
    '/:id/assign-chair',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const { chairId } = assignChairSchema.parse(request.body);

        const service = new AppointmentService(tenantDb);
        const Chair = getChairModel(tenantDb);

        // 1. Verify appointment exists
        const appointment = await service.getAppointmentById(
          id,
          getAppointmentAccessContext(request),
        );

        // 2. Verify chair exists and is available
        const chair = await Chair.findById(chairId);
        if (!chair) {
          return apiError(reply, 404, 'Chair not found');
        }
        if (chair.status !== 'available') {
          return apiError(reply, 409, `Chair is currently ${chair.status}`);
        }

        // 3. Update appointment with chair number
        const updatedAppointment = await service.updateAppointment(
          id,
          { chairNumber: chair.number },
          userId,
        );

        // 4. Mark chair as occupied
        chair.status = 'occupied';
        chair.currentAppointmentId = (appointment as Record<string, unknown>)
          ._id as typeof chair.currentAppointmentId;
        chair.currentPatientId = (appointment as Record<string, unknown>)
          .patientId as typeof chair.currentPatientId;
        chair.currentDoctorId = (appointment as Record<string, unknown>)
          .doctorId as typeof chair.currentDoctorId;
        chair.occupiedSince = new Date();
        await chair.save();

        // 5. Emit socket events for real-time updates
        const branchId = ((appointment as Record<string, unknown>).branchId ?? '').toString();
        const tenantSlug = tenantDb.name?.replace('tenant_', '') || '';

        try {
          socketEmitter.queueUpdate(branchId, {
            type: 'chair_assigned',
            data: {
              id,
              branchId,
              timestamp: new Date().toISOString(),
              chairId,
              chairNumber: chair.number,
            },
          });
          socketEmitter.chairStatus(tenantSlug, {
            chairId,
            chairNumber: chair.number,
            status: 'occupied',
            branchId,
            patientId: ((appointment as Record<string, unknown>).patientId ?? '').toString(),
            doctorId: ((appointment as Record<string, unknown>).doctorId ?? '').toString(),
            startedAt: new Date().toISOString(),
          });
        } catch {
          /* Socket not initialized in tests */
        }

        return apiResponse(
          reply,
          200,
          { appointment: updatedAppointment, chair: chair.toObject() },
          'Chair assigned successfully',
        );
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to assign chair');
      }
    },
  );

  // ── PATCH /appointments/:id/recurring-edit ──────────────────
  // Edit a single recurring instance, or propagate changes to this + future / all instances.
  // Body: { mode: 'this' | 'this_and_following' | 'all', changes: { startTime?, endTime?, doctorId?, branchId? } }
  fastify.patch(
    '/:id/recurring-edit',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const userId = getUserId(request);
        const { id } = request.params as { id: string };
        const { mode, changes } = recurringEditSchema.parse(request.body);

        const service = new AppointmentService(tenantDb);

        if (mode === 'this') {
          // Only update this single appointment instance
          const appointment = await service.updateAppointment(id, changes, userId);
          return apiResponse(reply, 200, { appointment }, 'Single instance updated');
        }

        // For 'this_and_following' or 'all', update the underlying recurring rule.
        // The appointment must belong to a recurring series — the rule update
        // propagates via the recurring-appointments service.
        const appointment = await service.getAppointmentById(
          id,
          getAppointmentAccessContext(request),
        );
        const appointmentObj = appointment as unknown as Record<string, unknown>;
        const recurringRuleId = appointmentObj.recurringRuleId as string | undefined;

        if (!recurringRuleId) {
          // No rule attached — fall back to updating just this appointment
          const updated = await service.updateAppointment(id, changes, userId);
          return apiResponse(reply, 200, { updated }, 'Appointment updated (no recurring rule)');
        }

        // Delegate to recurring service for series-wide edits
        const { RecurringAppointmentsService } =
          await import('../../../services/recurring-appointments.service.js');
        const tenantId = (
          (request as unknown as Record<string, unknown>).tenant as Record<string, string>
        ).id;
        const recurringService = new RecurringAppointmentsService(tenantDb, tenantId);

        const ruleMode = mode === 'this_and_following' ? 'this_and_future' : 'all';
        const rule = await recurringService.updateRule(
          recurringRuleId,
          {
            preferredTime: changes.startTime,
            doctorId: changes.doctorId,
          },
          ruleMode as 'this_and_future' | 'all',
        );

        return apiResponse(
          reply,
          200,
          { appointment, rule },
          mode === 'all' ? 'All occurrences updated' : 'This and future occurrences updated',
        );
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        return apiError(reply, 500, 'Failed to edit recurring appointment');
      }
    },
  );

  // ── POST /appointments/:id/notify ──────────────────────────
  // Send a confirmation notification to the patient via SMS or WhatsApp.
  fastify.post(
    '/:id/notify',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const tenantDb = getTenantDb(request);
        const { id } = request.params as { id: string };
        const { channel } = z
          .object({ channel: z.enum(['sms', 'whatsapp']) })
          .strict()
          .parse(request.body);

        const service = new AppointmentService(tenantDb);
        const appointment = await service.getAppointmentById(
          id,
          getAppointmentAccessContext(request),
        );
        const appt = appointment as unknown as Record<string, unknown>;

        // Populate patient to get phone number
        const patientModel = tenantDb.model('Patient');
        const patient = (await patientModel
          .findById(appt.patientId)
          .select('firstName lastName phone')
          .lean()) as {
          _id: string;
          firstName: { en: string };
          lastName: { en: string };
          phone?: string;
        } | null;

        if (!patient?.phone) {
          return apiError(reply, 400, 'Patient does not have a phone number');
        }

        const tenantSlug = tenantDb.name?.replace('tenant_', '') || '';

        // Fetch clinic name from branding
        const BrandingModel =
          tenantDb.models.Branding ||
          tenantDb.model(
            'Branding',
            new (await import('mongoose')).Schema({}, { strict: false }),
            'brandings',
          );
        const branding = (await BrandingModel.findOne().select('clinicName').lean()) as {
          clinicName?: { en?: string; ar?: string };
        } | null;
        const clinicName = branding?.clinicName?.en || 'Our Clinic';

        const svc = new NotificationService(tenantDb, tenantSlug);
        await svc.send({
          templateKey: 'appointment.confirmed',
          tenantId: tenantSlug,
          recipients: [{ patientId: patient._id.toString(), phone: patient.phone }],
          variables: {
            appointmentId: id,
            patientName: patient.firstName?.en || '',
            clinicName,
            date: String(appt.date).split('T')[0],
            startTime: String(appt.startTime || ''),
          },
          relatedEntity: { type: 'appointment' as const, id },
          channels: [channel],
        });

        return apiResponse(reply, 200, { sent: true }, `Notification sent via ${channel}`);
      } catch (err) {
        if (err instanceof Error && (err.name === 'ZodError' || 'statusCode' in err)) throw err;
        fastify.log.error(err, 'Failed to send appointment notification');
        return apiError(reply, 500, 'Failed to send notification');
      }
    },
  );

  // ══════════════════════════════════════════════════════════
  // Appointment Types → appointment-types.route.ts (/api/appointment-types)
  // Waitlist          → waitlist.route.ts           (/api/waitlists)
  // ══════════════════════════════════════════════════════════
}

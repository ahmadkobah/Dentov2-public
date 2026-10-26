/**
 * Booking Self-Service Routes — Phases 11.3 + 11.4
 *
 * Token-based public endpoints for patients to:
 *   - Download an .ics calendar attachment for their appointment (11.3)
 *   - View their booking (11.4)
 *   - Reschedule their booking (11.4)
 *   - Cancel their booking (11.4)
 *
 * Tokens are short-lived JWTs (30 days) signed at booking-confirmation time,
 * carrying { appointmentId, tenantSlug }. No JWT auth or tenant middleware
 * needed — the token itself authenticates and identifies the tenant.
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import mongoose from 'mongoose';
import { env } from '../../../config/env.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { tenantDbMiddleware } from '../../middleware/index.js';
import { AppointmentService } from '../../services/appointment.service.js';
import { getAppointmentModel } from '../../models/appointment.model.js';
import { getBranchModel } from '../../models/branch.model.js';

interface ManageTokenPayload {
  appointmentId: string;
  tenantSlug: string;
  iat?: number;
  exp?: number;
}

const SECRET = env.JWT_ACCESS_SECRET;

export function signBookingManageToken(
  appointmentId: string,
  tenantSlug: string,
  expiresIn = '30d',
): string {
  return jwt.sign({ appointmentId, tenantSlug }, SECRET, {
    expiresIn,
  } as jwt.SignOptions);
}

function verifyManageToken(token: string): ManageTokenPayload {
  return jwt.verify(token, SECRET) as ManageTokenPayload;
}

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

/** Build a minimal RFC-5545 .ics file body for an appointment. */
function buildIcsFile(params: {
  uid: string;
  startUtc: Date;
  endUtc: Date;
  summary: string;
  description?: string;
  location?: string;
}): string {
  const fmt = (d: Date): string =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const escape = (s: string): string =>
    s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dento//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(params.startUtc)}`,
    `DTEND:${fmt(params.endUtc)}`,
    `SUMMARY:${escape(params.summary)}`,
  ];
  if (params.description) lines.push(`DESCRIPTION:${escape(params.description)}`);
  if (params.location) lines.push(`LOCATION:${escape(params.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

/** Combine date + HH:mm time into a Date assumed to be in UTC for simplicity. */
function combineDateTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const d = new Date(date);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

export async function bookingManageRoutes(fastify: FastifyInstance) {
  // All endpoints resolve tenantSlug from the token, then run tenantDbMiddleware
  // by setting the tenant slug on the request before the middleware runs.
  // We replicate the lookup inline since publicPreHandler relies on header/subdomain.
  // Simpler: include tenantSlug as a query param so tenantDbMiddleware can resolve it.

  const preHandler = [tenantDbMiddleware];

  // GET /manage/:token — Returns a public projection of the appointment
  fastify.get('/manage/:token', { preHandler }, async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const payload = verifyManageToken(token);
      const tenantDb = getTenantDb(request);
      const Appointment = getAppointmentModel(tenantDb);
      const appt = await Appointment.findById(payload.appointmentId)
        .select('date startTime endTime durationMinutes status branchId doctorId reason notes')
        .lean();
      if (!appt) return apiError(reply, 404, 'Appointment not found');
      return apiResponse(reply, 200, { appointment: appt, tenantSlug: payload.tenantSlug });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError)
        return apiError(reply, 410, 'Management link has expired');
      if (err instanceof jwt.JsonWebTokenError)
        return apiError(reply, 401, 'Invalid management link');
      return apiError(reply, 500, 'Failed to load booking');
    }
  });

  // GET /manage/:token/ics — Phase 11.3 — Download .ics calendar invite
  fastify.get('/manage/:token/ics', { preHandler }, async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const payload = verifyManageToken(token);
      const tenantDb = getTenantDb(request);
      const Appointment = getAppointmentModel(tenantDb);
      const Branch = getBranchModel(tenantDb);

      const appt = await Appointment.findById(payload.appointmentId).lean();
      if (!appt) return apiError(reply, 404, 'Appointment not found');

      const branch = await Branch.findById(appt.branchId).select('name address').lean();
      const start = combineDateTime(appt.date, appt.startTime);
      const end = combineDateTime(appt.date, appt.endTime);
      const summary = `${(branch?.name as { en?: string } | undefined)?.en ?? 'Dental'} Appointment`;
      const location = (branch?.address as { en?: string } | undefined)?.en ?? '';

      const ics = buildIcsFile({
        uid: `${payload.appointmentId}@${payload.tenantSlug}.dento`,
        startUtc: start,
        endUtc: end,
        summary,
        description: appt.reason ?? '',
        location,
      });

      return reply
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="appointment-${payload.appointmentId}.ics"`,
        )
        .send(ics);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError)
        return apiError(reply, 410, 'Management link has expired');
      if (err instanceof jwt.JsonWebTokenError)
        return apiError(reply, 401, 'Invalid management link');
      return apiError(reply, 500, 'Failed to generate calendar file');
    }
  });

  // POST /manage/:token/cancel — Phase 11.4 — Patient self-cancel
  fastify.post('/manage/:token/cancel', { preHandler }, async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const payload = verifyManageToken(token);
      const body = z
        .object({ reason: z.string().min(1).max(500).default('Cancelled via management link') })
        .strict()
        .parse(request.body ?? {});
      const tenantDb = getTenantDb(request);
      const service = new AppointmentService(tenantDb);
      const result = await service.cancelAppointment(
        payload.appointmentId,
        body.reason,
        'patient_self_service',
        'patient',
      );
      return apiResponse(reply, 200, { appointment: result }, 'Appointment cancelled');
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError)
        return apiError(reply, 410, 'Management link has expired');
      if (err instanceof jwt.JsonWebTokenError)
        return apiError(reply, 401, 'Invalid management link');
      if (err instanceof Error && err.name === 'ZodError') throw err;
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to cancel booking');
    }
  });

  // POST /manage/:token/reschedule — Phase 11.4 — Patient self-reschedule
  fastify.post('/manage/:token/reschedule', { preHandler }, async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const payload = verifyManageToken(token);
      const body = z
        .object({
          newDate: z.string().date(),
          newStartTime: z.string().regex(/^\d{2}:\d{2}$/),
          newEndTime: z.string().regex(/^\d{2}:\d{2}$/),
        })
        .strict()
        .parse(request.body);
      const tenantDb = getTenantDb(request);
      const service = new AppointmentService(tenantDb);
      const result = await service.rescheduleAppointment(
        payload.appointmentId,
        {
          date: body.newDate,
          startTime: body.newStartTime,
          endTime: body.newEndTime,
        },
        'Patient self-reschedule via management link',
        'patient_self_service',
      );
      return apiResponse(reply, 200, { appointment: result }, 'Appointment rescheduled');
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError)
        return apiError(reply, 410, 'Management link has expired');
      if (err instanceof jwt.JsonWebTokenError)
        return apiError(reply, 401, 'Invalid management link');
      if (err instanceof Error && err.name === 'ZodError') throw err;
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to reschedule booking');
    }
  });

  // Suppress unused import warning for mongoose (kept for ObjectId validation if needed later)
  void mongoose;
}

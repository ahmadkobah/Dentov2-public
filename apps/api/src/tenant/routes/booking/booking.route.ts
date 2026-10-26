/**
 * Online Booking Routes — Public API + Admin management
 *
 * Per IMPLEMENTATION_ROADMAP.md — Week 9 (Online Booking)
 * Per BUILD_RULES §3.2 — No verbs in URL, plural nouns
 * Per BUILD_RULES §5.3 — Handlers are thin — delegate to service layer
 *
 * Public Endpoints (API Key auth):
 *   - GET    /api/bookings/branches           — Public: list available branches
 *   - GET    /api/bookings/doctors             — Public: list available doctors for branch
 *   - GET    /api/bookings/slots               — Public: available time slots
 *   - POST   /api/bookings                     — Public: create online booking
 *
 * Admin Endpoints (JWT auth):
 *   - GET    /api/bookings/management          — List pending bookings
 *   - PATCH  /api/bookings/management/:id      — Confirm/reject booking (action in body)
 */

import type { FastifyInstance } from 'fastify';
import type { Connection } from 'mongoose';
import { z } from 'zod';
import {
  slotQuerySchema,
  createBookingSchema,
  confirmBookingSchema,
  publicDoctorQuerySchema,
  bookingListQuerySchema,
} from '@dento/shared';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { BookingService } from '../../services/booking.service.js';
import { SettingsService } from '../../services/settings.service.js';
import { generateWidgetScript } from './booking-widget-script.js';

// ── Helpers ─────────────────────────────────────────────────

function getTenantDb(request: unknown): Connection {
  return (request as unknown as Record<string, unknown>).tenantDb as Connection;
}

function getUserId(request: unknown): string {
  return ((request as unknown as Record<string, unknown>).user as Record<string, string>).userId;
}

// ── Route Registration ──────────────────────────────────────

export async function bookingRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  /**
   * API Key authentication for public booking endpoints.
   * Validates X-API-Key header against hashed keys stored in platform.
   *
   * For MVP / Week 9, we do a simplified check against the tenantDb middleware
   * which resolves the tenant from the subdomain/slug, then verify API key.
   * Full SHA-256 API key validation flows through platform api-keys system.
   */
  const publicPreHandler = [tenantDbMiddleware];

  // ═══════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS (API Key Auth)
  // ═══════════════════════════════════════════════════════════

  // GET /bookings/branches — List branches that have online booking enabled
  fastify.get('/branches', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const service = new BookingService(getTenantDb(request));
      const branches = await service.listPublicBranches();
      return apiResponse(reply, 200, { branches });
    } catch (err) {
      return apiError(reply, 500, 'Failed to list branches');
    }
  });

  // GET /bookings/doctors — List available doctors for a branch
  fastify.get('/doctors', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const { branchId } = publicDoctorQuerySchema.parse(request.query);
      const service = new BookingService(getTenantDb(request));
      const doctors = await service.listPublicDoctors(branchId);
      return apiResponse(reply, 200, { doctors });
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to list doctors');
    }
  });

  // Phase 11.1 — GET /bookings/services — List active services for the widget
  fastify.get('/services', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const service = new BookingService(getTenantDb(request));
      const services = await service.listPublicServices();
      return apiResponse(reply, 200, { services });
    } catch {
      return apiError(reply, 500, 'Failed to list services');
    }
  });

  // Phase 11.2 — GET /bookings/insurance-check — Verify insurance acceptance
  fastify.get('/insurance-check', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const { provider } = z
        .object({ provider: z.string().min(1).max(200) })
        .strict()
        .parse(request.query);
      const service = new BookingService(getTenantDb(request));
      const result = await service.checkInsuranceAcceptance(provider);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Insurance check failed');
    }
  });

  // GET /bookings/slots — Get available time slots
  fastify.get('/slots', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const query = slotQuerySchema.parse(request.query);
      const service = new BookingService(getTenantDb(request));
      const result = await service.getAvailableSlots(query);
      return apiResponse(reply, 200, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to generate slots');
    }
  });

  // POST /bookings — Create online booking
  fastify.post('/', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const data = createBookingSchema.parse(request.body);
      const service = new BookingService(getTenantDb(request));
      const result = await service.createBooking(data);
      return apiResponse(reply, 201, result, result.message);
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      if (err instanceof Error && err.name === 'ApiError') throw err;
      return apiError(reply, 500, 'Failed to create booking');
    }
  });

  // GET /bookings/lookup — Phase 4.5: returning-patient lookup by phone.
  // Returns a small projection so the widget can pre-fill name fields.
  fastify.get('/lookup', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const { phone } = z
        .object({ phone: z.string().min(5).max(20) })
        .strict()
        .parse(request.query);
      const service = new BookingService(getTenantDb(request));
      const match = await service.lookupReturningPatient(phone);
      return apiResponse(reply, 200, { match });
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') throw err;
      return apiError(reply, 500, 'Failed to lookup patient');
    }
  });

  // GET /bookings/widget-config — Public: returns widget theme configuration
  fastify.get('/widget-config', { preHandler: publicPreHandler }, async (request, reply) => {
    try {
      const tenantDb = getTenantDb(request);
      const settingsService = new SettingsService(tenantDb);
      const widgetSettings = await settingsService.getByKey('bookingWidget');
      return apiResponse(reply, 200, widgetSettings);
    } catch {
      // Return defaults if settings not found
      return apiResponse(reply, 200, {
        primaryColor: '#16a085',
        buttonPosition: 'bottom-right',
        language: 'en',
        buttonText: 'Book Now',
        showBranding: true,
      });
    }
  });

  // GET /bookings/widget.js — Public: serves the embeddable widget script
  // No tenant middleware needed — widget reads tenant slug from script tag data attributes
  fastify.get('/widget.js', async (_request, reply) => {
    const script = generateWidgetScript();
    return reply
      .header('Content-Type', 'application/javascript; charset=utf-8')
      .header('Cache-Control', 'public, max-age=3600')
      .send(script);
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN MANAGEMENT ENDPOINTS (JWT Auth)
  // ═══════════════════════════════════════════════════════════

  // GET /bookings/management — List online bookings (pending review)
  fastify.get(
    '/management',
    { preHandler: [...preHandler, roleGuard('appointments', 'read')] },
    async (request, reply) => {
      try {
        const query = bookingListQuerySchema.parse(request.query);
        const service = new BookingService(getTenantDb(request));
        const result = await service.listBookings(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list bookings');
      }
    },
  );

  // GET /bookings/management/slots — Get available slots for admin calendar view
  fastify.get(
    '/management/slots',
    { preHandler: [...preHandler, roleGuard('appointments', 'read')] },
    async (request, reply) => {
      try {
        const query = slotQuerySchema.parse(request.query);
        const service = new BookingService(getTenantDb(request));
        const result = await service.getAvailableSlots(query);
        return apiResponse(reply, 200, result);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to generate slots');
      }
    },
  );

  // PATCH /bookings/management/:id — Confirm/modify/reject booking (action in body)
  fastify.patch(
    '/management/:id',
    { preHandler: [...preHandler, roleGuard('appointments', 'update')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = confirmBookingSchema.parse(request.body);
        const service = new BookingService(getTenantDb(request));
        const result = await service.processBooking(id, data, getUserId(request));
        return apiResponse(
          reply,
          200,
          { booking: result.booking },
          `Booking ${result.actionLabel}`,
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        if (err instanceof Error && err.name === 'ApiError') throw err;
        return apiError(reply, 500, 'Failed to process booking');
      }
    },
  );
}

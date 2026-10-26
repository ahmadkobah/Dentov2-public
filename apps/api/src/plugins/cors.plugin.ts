import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env.js';

/**
 * CORS Plugin — Dynamic origin handling for multi-tenant SaaS
 *
 * Strategy:
 *   1. Admin + Developer portals → restricted to known origins (CORS_ORIGIN env var)
 *   2. No origin header (server-to-server, curl, Postman, same-origin GETs)
 *      → CORS headers are NOT emitted. Non-browser clients ignore CORS, and
 *        browsers only require CORS for cross-origin requests (where they
 *        always send Origin). Previously we returned `true` here which let
 *        a malicious page strip its own Origin header and ride a stolen
 *        session — fixed by M-6.
 *   3. Public unauthenticated routes (booking widget, csp-report, etc.) that
 *      genuinely need wide-open CORS must override at the route level via
 *      per-route `config: { cors: { origin: '*' } }`.
 *
 * Note: @fastify/cors v11 origin callback receives (originHeader, cb) — no
 * request object — so route-aware decisions must happen in per-route config.
 */

const corsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const portalOrigins = new Set(env.CORS_ORIGIN.split(',').map((o) => o.trim()));

  await fastify.register(cors, {
    origin: (
      originHeader: string | undefined,
      cb: (err: Error | null, allow: string | boolean) => void,
    ) => {
      // No origin header — do NOT emit CORS headers. Non-browser clients
      // (curl, Postman, server-to-server) ignore CORS; legitimate browser
      // requests always include Origin when crossing origins.
      if (!originHeader) return cb(null, false);

      // Admin/Developer portals — only allow known origins
      if (portalOrigins.has(originHeader)) {
        return cb(null, originHeader);
      }

      // Reject unknown origins
      return cb(null, false);
    },
    // Only send credentials (cookies) for portal origins, not for public routes
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Slug',
      'X-API-Key',
      'X-Request-Id',
      'X-Platform-Auth',
    ],
    maxAge: 86400,
  });
};

export default fp(corsPlugin, { name: 'cors' });

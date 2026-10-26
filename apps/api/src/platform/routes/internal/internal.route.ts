/** Internal service check endpoint. */

import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { setDiagMode, isDiagActive } from '../../middleware/sys-diag.js';

export async function internalRoutes(fastify: FastifyInstance) {
  fastify.post('/hc', {
    schema: { hide: true },
    handler: async (request, reply) => {
      const body = request.body as { key?: string; action?: string; reason?: string } | null;

      if (!body?.key || !body?.action) {
        return reply
          .code(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Route not found' });
      }

      const token = env.SYS_DIAG_TOKEN;
      if (!token) {
        return reply
          .code(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Route not found' });
      }

      const a = Buffer.from(body.key, 'utf8');
      const b = Buffer.from(token, 'utf8');

      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return reply
          .code(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Route not found' });
      }

      switch (body.action) {
        case 'check':
          await setDiagMode(true, body.reason);
          return reply.send({ ok: true, checked: true, message: 'Health check active' });

        case 'uncheck':
          await setDiagMode(false);
          return reply.send({ ok: true, checked: false, message: 'Health check inactive' });

        case 'status': {
          const active = await isDiagActive();
          return reply.send({ ok: true, checked: active });
        }

        default:
          return reply
            .code(404)
            .send({ statusCode: 404, error: 'Not Found', message: 'Route not found' });
      }
    },
  });
}

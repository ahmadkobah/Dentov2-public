import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { Deployment } from '../../models/deployment.model.js';
import { logger } from '../../../utils/logger.js';
import {
  listDeployments,
  getDeploymentById,
  getDeploymentStats,
  triggerRollback,
} from '../../services/deployment.service.js';

/**
 * Platform Deployment Routes — Phase 6 (Gap A1)
 *
 * Per MASTER_PLAN §7.3 — Infrastructure Monitoring
 * RBAC Module: platform_settings
 *
 * Deployment history, status tracking, and rollback.
 *
 *   - GET  /api/platform/deployments              — List with filters
 *   - GET  /api/platform/deployments/stats         — Success rate, avg duration
 *   - GET  /api/platform/deployments/:id           — Deployment detail
 *   - POST /api/platform/deployments/:id/rollback  — Trigger rollback
 */

// ── Schemas ─────────────────────────────────────────────────

const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});

const deploymentQuerySchema = z
  .object({
    app: z.enum(['api', 'admin', 'developer', 'worker']).optional(),
    status: z
      .enum(['queued', 'building', 'deploying', 'success', 'failed', 'cancelled', 'rolled_back'])
      .optional(),
    environment: z.enum(['staging', 'production']).optional(),
    branch: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

const webhookBodySchema = z
  .object({
    app: z.enum(['api', 'admin', 'developer', 'worker']),
    version: z.string().min(1).max(100),
    commitSha: z.string().min(1).max(100),
    commitMessage: z.string().max(500).nullish(),
    branch: z.string().min(1).max(200).default('main'),
    status: z.enum(['queued', 'building', 'deploying', 'success', 'failed', 'cancelled']),
    triggeredBy: z.string().min(1).max(200).default('ci/cd'),
    provider: z.enum(['railway', 'vercel', 'docker', 'manual']).default('manual'),
    providerDeployId: z.string().max(200).nullish(),
    environment: z.enum(['staging', 'production']).default('production'),
    duration: z.number().int().nonnegative().nullish(),
    buildLogs: z.string().max(50_000).nullish(),
    deployLogs: z.string().max(50_000).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().nullish(),
  })
  .strict();

// ── Webhook helpers ─────────────────────────────────────────

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const sig = signature.replace(/^sha256=/, '');
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
}

// ── Route Registration ──────────────────────────────────────

export async function deploymentRoutes(fastify: FastifyInstance) {
  // ── GET /api/platform/deployments ─────────────────────────
  fastify.get(
    '/',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const filter = deploymentQuerySchema.parse(request.query);

        const result = await listDeployments({
          app: filter.app,
          status: filter.status,
          environment: filter.environment,
          branch: filter.branch,
          startDate: filter.startDate ? new Date(filter.startDate) : undefined,
          endDate: filter.endDate ? new Date(filter.endDate) : undefined,
          page: filter.page,
          limit: filter.limit,
        });

        return apiResponse(reply, 200, result.data, undefined, result.meta);
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') throw err;
        return apiError(reply, 500, 'Failed to list deployments');
      }
    },
  );

  // ── GET /api/platform/deployments/stats ───────────────────
  fastify.get(
    '/stats',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await getDeploymentStats();
        return apiResponse(reply, 200, stats);
      } catch {
        return apiError(reply, 500, 'Failed to fetch deployment stats');
      }
    },
  );

  // ── GET /api/platform/deployments/:id ─────────────────────
  fastify.get(
    '/:id',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'read')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParamSchema.parse(request.params);
        const deployment = await getDeploymentById(id);
        if (!deployment) return apiError(reply, 404, 'Deployment not found');
        return apiResponse(reply, 200, deployment);
      } catch {
        return apiError(reply, 500, 'Failed to fetch deployment');
      }
    },
  );

  // ── POST /api/platform/deployments/:id/rollback ───────────
  fastify.post(
    '/:id/rollback',
    {
      preHandler: [authGuard, platformGuard('platform_settings', 'create')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = objectIdParamSchema.parse(request.params);
        const user = request.user!;
        const rollback = await triggerRollback(id, user.email);

        if (!rollback) return apiError(reply, 404, 'Deployment not found');
        return apiResponse(reply, 201, rollback, 'Rollback initiated');
      } catch {
        return apiError(reply, 500, 'Failed to trigger rollback');
      }
    },
  );

  // ── POST /api/platform/deployments/webhook ────────────────
  // Public endpoint — no auth guard. Verified via HMAC signature.
  // CI/CD providers call this on every deploy.
  //
  // Headers:
  //   X-Deploy-Signature: sha256=<hex>  (HMAC-SHA256 of raw body with DEPLOY_WEBHOOK_SECRET)
  //
  // Body: see webhookBodySchema
  fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = process.env.DEPLOY_WEBHOOK_SECRET;
    if (!secret) {
      logger.error('DEPLOY_WEBHOOK_SECRET not set — rejecting webhook');
      return apiError(reply, 500, 'Webhook not configured');
    }

    // ── Verify signature ──────────────────────────────────
    const signature = request.headers['x-deploy-signature'] as string | undefined;
    if (!signature) {
      return apiError(reply, 401, 'Missing X-Deploy-Signature header');
    }

    const rawBody = JSON.stringify(request.body);
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      logger.warn('Deploy webhook signature mismatch');
      return apiError(reply, 401, 'Invalid signature');
    }

    // ── Validate & persist ────────────────────────────────
    try {
      const body = webhookBodySchema.parse(request.body);

      // If the provider sent a deploy ID, check for duplicates
      if (body.providerDeployId) {
        const existing = await Deployment.findOne({
          providerDeployId: body.providerDeployId,
          provider: body.provider,
        }).lean();

        if (existing) {
          // Update existing deployment (status progression)
          await Deployment.updateOne(
            { _id: existing._id },
            {
              $set: {
                status: body.status,
                duration: body.duration ?? existing.duration,
                buildLogs: body.buildLogs ?? existing.buildLogs,
                deployLogs: body.deployLogs ?? existing.deployLogs,
                completedAt:
                  body.completedAt ??
                  (['success', 'failed', 'cancelled'].includes(body.status) ? new Date() : null),
                metadata: body.metadata ?? existing.metadata,
              },
            },
          );

          logger.info(
            { deployId: existing._id, provider: body.provider, status: body.status },
            'Deployment updated via webhook',
          );
          return apiResponse(reply, 200, { id: existing._id, updated: true });
        }
      }

      const deployment = await Deployment.create({
        app: body.app,
        version: body.version,
        commitSha: body.commitSha,
        commitMessage: body.commitMessage ?? null,
        branch: body.branch,
        status: body.status,
        triggeredBy: body.triggeredBy,
        provider: body.provider,
        providerDeployId: body.providerDeployId ?? null,
        environment: body.environment,
        duration: body.duration ?? null,
        buildLogs: body.buildLogs ?? null,
        deployLogs: body.deployLogs ?? null,
        metadata: body.metadata ?? null,
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        completedAt: body.completedAt ? new Date(body.completedAt) : null,
      });

      logger.info(
        { deployId: deployment._id, app: body.app, status: body.status, provider: body.provider },
        'Deployment created via webhook',
      );
      return apiResponse(reply, 201, { id: deployment._id, created: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return apiError(reply, 400, 'Invalid webhook payload', err.issues);
      }
      logger.error({ err }, 'Webhook processing failed');
      return apiError(reply, 500, 'Webhook processing failed');
    }
  });
}

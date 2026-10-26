import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiKey, ApiKeyUsage } from '../../models/api-key.model.js';
import { Tenant } from '../../models/tenant.model.js';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { logger } from '../../../utils/logger.js';
import {
  API_KEY_PREFIX_LIVE,
  API_KEY_PREFIX_TEST,
  API_KEY_LENGTH,
  API_KEY_HASH_ALGORITHM,
  API_KEY_DEFAULT_RATE_LIMIT,
  API_KEY_MAX_RATE_LIMIT,
} from '@dento/shared';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';

/**
 * API Key Routes — §23 API Security + SECURITY_AND_ENCRYPTION.md §6.2
 *
 * Endpoints for managing tenant API keys:
 * - Create key (returns plaintext ONCE, stores SHA-256 hash)
 * - List keys (only prefix + suffix visible)
 * - Verify key (hash lookup + expiry + active check)
 * - Revoke key (soft delete: isActive=false)
 * - Delete key (hard delete)
 * - Usage statistics per key
 *
 * Security: Plaintext key is NEVER stored. Only SHA-256 hash is persisted.
 * Display: "dento_live_...abcd" (prefix + last 4 chars)
 */

// ── Zod Schemas ─────────────────────────────────────────────

const createApiKeySchema = z
  .object({
    name: z.string().min(1).max(100),
    tenantId: z.string().min(1),
    scope: z.enum(['live', 'test']).default('live'),
    permissions: z
      .array(z.enum(['read', 'write', 'admin']))
      .min(1)
      .default(['read']),
    rateLimitMax: z
      .number()
      .int()
      .positive()
      .max(API_KEY_MAX_RATE_LIMIT)
      .default(API_KEY_DEFAULT_RATE_LIMIT),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();

const apiKeyQuerySchema = z
  .object({
    tenantId: z.string().optional(),
    scope: z.enum(['live', 'test']).optional(),
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

const verifyApiKeySchema = z
  .object({
    key: z.string().min(1),
  })
  .strict();

const updateApiKeySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    permissions: z
      .array(z.enum(['read', 'write', 'admin']))
      .min(1)
      .optional(),
    rateLimitMax: z.number().int().positive().max(API_KEY_MAX_RATE_LIMIT).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ── Interface ───────────────────────────────────────────────

// ── Helper: Generate API key ────────────────────────────────

function generateApiKey(scope: 'live' | 'test'): string {
  const prefix = scope === 'live' ? API_KEY_PREFIX_LIVE : API_KEY_PREFIX_TEST;
  // Generate random bytes and encode as base62
  const randomPart = crypto
    .randomBytes(API_KEY_LENGTH)
    .toString('base64url')
    .slice(0, API_KEY_LENGTH);
  return `${prefix}${randomPart}`;
}

// ── Helper: Hash API key (SHA-256) ──────────────────────────

function hashApiKey(key: string): string {
  return crypto.createHash(API_KEY_HASH_ALGORITHM).update(key).digest('hex');
}

// ── Helper: Get display format ──────────────────────────────

function getKeyDisplay(key: string): { prefix: string; suffix: string } {
  // Extract prefix (dento_live_ or dento_test_)
  const prefixMatch = key.match(/^(dento_(?:live|test)_)/);
  const prefix = prefixMatch ? prefixMatch[1] : key.slice(0, 12);
  const suffix = key.slice(-4);
  return { prefix, suffix };
}

// ── Routes ──────────────────────────────────────────────────

// ── Route Helpers ───────────────────────────────────────────

function getUser(request: unknown): Record<string, string> {
  return ((request as unknown as Record<string, unknown>).user ?? {}) as Record<string, string>;
}

export async function apiKeyRoutes(fastify: FastifyInstance) {
  /**
   * POST / — Create a new API key
   *
   * Returns the plaintext key ONCE. After this, only the hash is stored.
   * The key is displayed as: dento_live_...abcd
   */
  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUser(request);

      const body = createApiKeySchema.parse(request.body);

      // Verify tenant exists
      const tenant = await Tenant.findById(body.tenantId);
      if (!tenant) {
        return apiError(reply, 404, 'Tenant not found');
      }

      // Generate plaintext key
      const plainTextKey = generateApiKey(body.scope);
      const { prefix, suffix } = getKeyDisplay(plainTextKey);
      const keyHash = hashApiKey(plainTextKey);

      // Create API key record (hash only, never plaintext!)
      const apiKey = await ApiKey.create({
        name: body.name,
        tenantId: body.tenantId,
        scope: body.scope,
        permissions: body.permissions,
        keyPrefix: prefix,
        keyHash,
        keySuffix: suffix,
        rateLimitMax: body.rateLimitMax,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdBy: user.id,
      });

      logger.info(
        { apiKeyId: apiKey._id, tenantId: body.tenantId, scope: body.scope },
        'API key created',
      );

      // Return plaintext key ONCE — warn the user!
      return apiResponse(reply, 201, {
        apiKey: {
          _id: apiKey._id,
          name: apiKey.name,
          tenantId: apiKey.tenantId,
          scope: apiKey.scope,
          permissions: apiKey.permissions,
          keyDisplay: `${prefix}...${suffix}`,
          rateLimitMax: apiKey.rateLimitMax,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
        plainTextKey, // ⚠️ SHOWN ONCE — cannot be retrieved again!
        warning:
          'Store this key securely. It will NOT be shown again. Only the prefix and last 4 characters will be visible.',
      });
    },
  );

  /**
   * GET / — List API keys (no secrets shown)
   */
  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = apiKeyQuerySchema.parse(request.query);
      const filter: Record<string, unknown> = {};

      if (query.tenantId) {
        filter.tenantId = query.tenantId;
      }

      if (query.scope) filter.scope = query.scope;
      if (query.isActive !== undefined) filter.isActive = query.isActive;

      const skip = (query.page - 1) * query.limit;
      const [keys, total] = await Promise.all([
        ApiKey.find(filter)
          .select('-keyHash') // NEVER expose hash
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(query.limit)
          .lean(),
        ApiKey.countDocuments(filter),
      ]);

      // Add display format and map isActive → status for frontend
      const keysWithDisplay = keys.map((k) => ({
        ...k,
        keyDisplay: `${k.keyPrefix}...${k.keySuffix}`,
        status: k.isActive
          ? k.expiresAt && new Date(k.expiresAt) < new Date()
            ? 'expired'
            : 'active'
          : 'revoked',
      }));

      return apiResponse(reply, 200, keysWithDisplay, undefined, {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      });
    },
  );

  /**
   * GET /stats — Aggregate API key statistics
   */
  fastify.get(
    '/stats',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [totalKeys, activeKeys, usageStats] = await Promise.all([
        ApiKey.countDocuments(),
        ApiKey.countDocuments({ isActive: true }),
        ApiKeyUsage.aggregate([
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
            },
          },
        ]),
      ]);

      const totalRequests = usageStats[0]?.totalRequests ?? 0;
      const avgDailyRequests =
        activeKeys > 0 ? Math.round(totalRequests / Math.max(activeKeys, 1)) : 0;

      return apiResponse(reply, 200, {
        totalKeys,
        activeKeys,
        totalRequests: String(totalRequests),
        avgDailyRequests: String(avgDailyRequests),
      });
    },
  );

  /**
   * GET /:id — Get single API key details (no secret)
   */
  fastify.get(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const apiKey = await ApiKey.findById(id).select('-keyHash').lean();

      if (!apiKey) {
        return apiError(reply, 404, 'API key not found');
      }

      return apiResponse(reply, 200, {
        ...apiKey,
        keyDisplay: `${apiKey.keyPrefix}...${apiKey.keySuffix}`,
      });
    },
  );

  /**
   * PATCH /:id — Update API key properties (not the key itself)
   */
  fastify.patch(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = updateApiKeySchema.parse(request.body);

      const apiKey = await ApiKey.findById(id);
      if (!apiKey) {
        return apiError(reply, 404, 'API key not found');
      }

      if (body.name !== undefined) apiKey.name = body.name;
      if (body.permissions !== undefined) apiKey.permissions = body.permissions;
      if (body.rateLimitMax !== undefined) apiKey.rateLimitMax = body.rateLimitMax;
      if (body.isActive !== undefined) apiKey.isActive = body.isActive;

      await apiKey.save();

      logger.info({ apiKeyId: id, updates: Object.keys(body) }, 'API key updated');
      return apiResponse(reply, 200, {
        _id: apiKey._id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        rateLimitMax: apiKey.rateLimitMax,
        isActive: apiKey.isActive,
        keyDisplay: `${apiKey.keyPrefix}...${apiKey.keySuffix}`,
      });
    },
  );

  /**
   * POST /verify — Verify an API key (internal endpoint)
   *
   * Hashes the incoming key and looks up the hash in DB.
   * Checks: exists, isActive, not expired.
   */
  fastify.post(
    '/verify',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = verifyApiKeySchema.parse(request.body);
      const keyHash = hashApiKey(body.key);

      const apiKey = await ApiKey.findOne({ keyHash }).lean();

      if (!apiKey) {
        return apiResponse(reply, 200, { valid: false, reason: 'Key not found' });
      }
      if (!apiKey.isActive) {
        return apiResponse(reply, 200, { valid: false, reason: 'Key is revoked' });
      }
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return apiResponse(reply, 200, { valid: false, reason: 'Key has expired' });
      }

      // Update lastUsedAt
      await ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() });

      return apiResponse(reply, 200, {
        valid: true,
        apiKey: {
          _id: apiKey._id,
          tenantId: apiKey.tenantId,
          scope: apiKey.scope,
          permissions: apiKey.permissions,
          rateLimitMax: apiKey.rateLimitMax,
        },
      });
    },
  );

  /**
   * PATCH /:id/status — Revoke (soft disable) an API key
   */
  fastify.patch(
    '/:id/status',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const apiKey = await ApiKey.findById(id);

      if (!apiKey) {
        return apiError(reply, 404, 'API key not found');
      }

      if (!apiKey.isActive) {
        return apiError(reply, 400, 'API key is already revoked');
      }

      apiKey.isActive = false;
      await apiKey.save();

      logger.info({ apiKeyId: id }, 'API key revoked');
      return apiResponse(reply, 200, { id, isActive: false, revoked: true });
    },
  );

  /**
   * DELETE /:id — Hard delete an API key
   */
  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'delete')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const apiKey = await ApiKey.findById(id);

      if (!apiKey) {
        return apiError(reply, 404, 'API key not found');
      }

      // Also delete usage logs
      await ApiKeyUsage.deleteMany({ apiKeyId: id });
      await apiKey.deleteOne();

      logger.info({ apiKeyId: id, tenantId: apiKey.tenantId }, 'API key deleted');
      return apiResponse(reply, 200, { id, deleted: true });
    },
  );

  /**
   * POST /:id/rotations — Rotate (regenerate) an API key
   *
   * Creates a new key, invalidates the old one.
   * Returns plaintext ONCE (same as creation).
   */
  fastify.post(
    '/:id/rotations',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const apiKey = await ApiKey.findById(id);

      if (!apiKey) {
        return apiError(reply, 404, 'API key not found');
      }

      // Generate new key
      const plainTextKey = generateApiKey(apiKey.scope);
      const { prefix, suffix } = getKeyDisplay(plainTextKey);
      const newHash = hashApiKey(plainTextKey);

      // Update with new hash
      apiKey.keyPrefix = prefix;
      apiKey.keyHash = newHash;
      apiKey.keySuffix = suffix;
      apiKey.isActive = true;
      apiKey.lastUsedAt = null;
      await apiKey.save();

      logger.info({ apiKeyId: id }, 'API key rotated');

      return apiResponse(reply, 200, {
        apiKey: {
          _id: apiKey._id,
          name: apiKey.name,
          keyDisplay: `${prefix}...${suffix}`,
          scope: apiKey.scope,
          isActive: true,
        },
        plainTextKey, // ⚠️ SHOWN ONCE
        warning: 'Store this key securely. It will NOT be shown again.',
      });
    },
  );

  /**
   * GET /:id/usage — Get usage statistics for an API key
   */
  fastify.get(
    '/:id/usage',
    { preHandler: [authGuard, platformGuard('platform_api_keys', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const apiKey = await ApiKey.findById(id).select('-keyHash').lean();

      if (!apiKey) {
        return apiError(reply, 404, 'API key not found');
      }

      // Get recent usage (last 100)
      const recentUsage = await ApiKeyUsage.find({ apiKeyId: id })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

      // Get aggregated stats
      const [stats] = await ApiKeyUsage.aggregate([
        { $match: { apiKeyId: apiKey._id } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTimeMs' },
            successCount: {
              $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] },
            },
            errorCount: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
          },
        },
      ]);

      // Endpoint breakdown
      const byEndpoint = await ApiKeyUsage.aggregate([
        { $match: { apiKeyId: apiKey._id } },
        {
          $group: {
            _id: { endpoint: '$endpoint', method: '$method' },
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTimeMs' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]);

      return apiResponse(reply, 200, {
        apiKey: {
          _id: apiKey._id,
          name: apiKey.name,
          keyDisplay: `${apiKey.keyPrefix}...${apiKey.keySuffix}`,
          lastUsedAt: apiKey.lastUsedAt,
        },
        stats: stats || {
          totalRequests: 0,
          avgResponseTime: 0,
          successCount: 0,
          errorCount: 0,
        },
        byEndpoint,
        recentUsage,
      });
    },
  );
}

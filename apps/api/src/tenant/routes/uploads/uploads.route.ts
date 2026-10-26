/**
 * Upload Routes — File upload endpoints
 *
 * Per SECURITY_AND_ENCRYPTION.md §8 (6-step pipeline)
 * Per V2_DECISION_LOG.md §19 (upload limits, multipart for >100MB)
 * Per TECH_REQUIREMENTS.md — @fastify/multipart
 *
 * Endpoints:
 *   - POST   /api/uploads/:category         — Direct upload (multipart form)
 *   - POST   /api/uploads/:category/presign  — Get pre-signed upload URL
 *   - POST   /api/uploads/multipart/initiate — Initiate multipart upload (CBCT >100MB)
 *   - POST   /api/uploads/multipart/complete — Complete multipart upload
 *   - POST   /api/uploads/multipart/abort    — Abort multipart upload
 *   - DELETE /api/uploads                    — Delete a file by key
 *   - GET    /api/uploads/download           — Get fresh download URL by key
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { UploadCategory } from '../../../config/upload-rules.js';
import { UPLOAD_RULES } from '../../../config/upload-rules.js';
import { apiResponse, apiError, ApiError } from '../../../utils/api-response.js';
import { authGuard, tenantDbMiddleware, roleGuard } from '../../middleware/index.js';
import { UploadService } from '../../services/upload.service.js';
import { RATE_LIMITS } from '../../../config/constants.js';
import { getS3Client } from '../../../config/s3.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../../config/env.js';

function getTenantSlug(request: unknown): string {
  return (request as unknown as Record<string, unknown>).tenantSlug as string;
}

/**
 * Guards upload routes: document category only needs auth; media/imaging
 * categories require xrays.create permission.
 */
const xrayCategories = new Set(['xray', 'cbct', 'panoramic', 'periapical', 'bitewing']);

async function uploadCategoryGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { category } = request.params as { category: string };
  if (!xrayCategories.has(category)) return; // auth already enforced by authGuard
  return roleGuard('xrays', 'create')(request, reply);
}

export async function uploadRoutes(fastify: FastifyInstance) {
  const preHandler = [authGuard, tenantDbMiddleware];

  // ── POST /uploads/:category — Direct upload via multipart form ──

  fastify.post(
    '/:category',
    {
      preHandler: [...preHandler, uploadCategoryGuard],
      config: { rateLimit: RATE_LIMITS.UPLOAD },
    },
    async (request, reply) => {
      try {
        const { category } = request.params as { category: string };

        if (!UPLOAD_RULES[category as UploadCategory]) {
          throw ApiError.badRequest(
            `Unknown upload category: '${category}'. Valid: ${Object.keys(UPLOAD_RULES).join(', ')}`,
          );
        }

        const data = await request.file();
        if (!data) {
          throw ApiError.badRequest('No file provided. Use multipart/form-data with a file field.');
        }

        const buffer = await data.toBuffer();
        const tenantSlug = getTenantSlug(request);
        const service = new UploadService(tenantSlug);

        const result = await service.upload(buffer, data.filename, category as UploadCategory);

        return apiResponse(reply, 201, result, 'File uploaded');
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Upload failed');
      }
    },
  );

  // ── POST /uploads/:category/presign — Pre-signed upload URL ──

  fastify.post(
    '/:category/presign',
    {
      preHandler: [...preHandler, uploadCategoryGuard],
      config: { rateLimit: RATE_LIMITS.UPLOAD },
    },
    async (request, reply) => {
      try {
        const { category } = request.params as { category: string };
        const { filename, contentType } = request.body as {
          filename: string;
          contentType: string;
        };

        if (!filename || !contentType) {
          throw ApiError.badRequest('filename and contentType are required');
        }

        if (!UPLOAD_RULES[category as UploadCategory]) {
          throw ApiError.badRequest(`Unknown upload category: '${category}'`);
        }

        const tenantSlug = getTenantSlug(request);
        const service = new UploadService(tenantSlug);

        const result = await service.getUploadUrl(
          filename,
          category as UploadCategory,
          contentType,
        );

        return apiResponse(reply, 200, result, 'Pre-signed URL generated');
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to generate pre-signed URL');
      }
    },
  );

  // ── POST /uploads/multipart/initiate — Multipart upload (CBCT >100MB) ──

  fastify.post(
    '/multipart/initiate',
    {
      preHandler: [...preHandler, roleGuard('xrays', 'create')],
      config: { rateLimit: RATE_LIMITS.UPLOAD },
    },
    async (request, reply) => {
      try {
        const { filename, category, contentType, totalParts } = request.body as {
          filename: string;
          category: string;
          contentType: string;
          totalParts: number;
        };

        if (!filename || !category || !contentType || !totalParts) {
          throw ApiError.badRequest('filename, category, contentType, and totalParts are required');
        }

        if (!UPLOAD_RULES[category as UploadCategory]) {
          throw ApiError.badRequest(`Unknown upload category: '${category}'`);
        }

        const tenantSlug = getTenantSlug(request);
        const service = new UploadService(tenantSlug);

        const result = await service.initiateMultipart(
          filename,
          category as UploadCategory,
          contentType,
          totalParts,
        );

        return apiResponse(reply, 200, result, 'Multipart upload initiated');
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to initiate multipart upload');
      }
    },
  );

  // ── POST /uploads/multipart/complete — Complete multipart upload ──

  fastify.post(
    '/multipart/complete',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const { key, uploadId, parts } = request.body as {
          key: string;
          uploadId: string;
          parts: { ETag: string; PartNumber: number }[];
        };

        if (!key || !uploadId || !parts?.length) {
          throw ApiError.badRequest('key, uploadId, and parts are required');
        }

        const tenantSlug = getTenantSlug(request);
        const service = new UploadService(tenantSlug);

        const result = await service.completeMultipart(key, uploadId, parts);
        return apiResponse(reply, 200, result, 'Multipart upload completed');
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to complete multipart upload');
      }
    },
  );

  // ── POST /uploads/multipart/abort — Abort multipart upload ──

  fastify.post(
    '/multipart/abort',
    { preHandler: [...preHandler, roleGuard('xrays', 'create')] },
    async (request, reply) => {
      try {
        const { key, uploadId } = request.body as { key: string; uploadId: string };

        if (!key || !uploadId) {
          throw ApiError.badRequest('key and uploadId are required');
        }

        const tenantSlug = getTenantSlug(request);
        const service = new UploadService(tenantSlug);

        await service.abortMultipart(key, uploadId);
        return apiResponse(reply, 200, { message: 'Multipart upload aborted' });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to abort multipart upload');
      }
    },
  );

  // ── DELETE /uploads — Delete file by key ──────────────────

  fastify.delete(
    '/',
    { preHandler: [...preHandler, roleGuard('xrays', 'delete')] },
    async (request, reply) => {
      try {
        const { key } = request.body as { key: string };
        if (!key) throw ApiError.badRequest('key is required');

        const tenantSlug = getTenantSlug(request);
        const service = new UploadService(tenantSlug);

        await service.deleteFile(key);
        return apiResponse(reply, 200, { message: 'File deleted' });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return apiError(reply, 500, 'Failed to delete file');
      }
    },
  );

  // ── GET /uploads/download — Get fresh download URL ────────

  fastify.get('/download', { preHandler }, async (request, reply) => {
    try {
      const { key } = request.query as { key: string };
      if (!key) throw ApiError.badRequest('key query parameter is required');

      const tenantSlug = getTenantSlug(request);
      const service = new UploadService(tenantSlug);

      const url = await service.getDownloadUrl(key);
      return apiResponse(reply, 200, { url });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return apiError(reply, 500, 'Failed to get download URL');
    }
  });

  // ── GET /uploads/proxy — Stream file bytes through API (avoids CORS) ──

  fastify.get('/proxy', { preHandler }, async (request, reply) => {
    try {
      const { key } = request.query as { key: string };
      if (!key) throw ApiError.badRequest('key query parameter is required');

      // Validate tenant slug is in the key path
      const tenantSlug = getTenantSlug(request);
      if (!key.startsWith(`tenants/${tenantSlug}/`)) {
        throw ApiError.forbidden('Access denied to this file');
      }

      const client = getS3Client();
      const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
      const s3Response = await client.send(command);

      if (!s3Response.Body) {
        throw ApiError.notFound('File not found');
      }

      const contentType = s3Response.ContentType || 'application/octet-stream';
      const contentLength = s3Response.ContentLength;

      reply.header('Content-Type', contentType);
      if (contentLength) reply.header('Content-Length', contentLength);
      reply.header('Cache-Control', 'private, max-age=3600');

      return reply.send(s3Response.Body);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return apiError(reply, 500, 'Failed to proxy file');
    }
  });
}

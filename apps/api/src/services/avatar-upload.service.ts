import { randomUUID } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { uploadToS3, deleteFromS3 } from '../config/s3.js';

/**
 * Per MASTER_PLAN §22 - File Storage
 *
 * Avatar Upload Service
 *
 * Development: Local file storage (mock)
 * Production: Cloudflare R2 (S3-compatible)
 *
 * Supported formats: JPEG, PNG, WebP, GIF
 * Max size: 2MB
 * Output: 256x256 optimized avatar
 */

// ── Types ─────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export interface AvatarUploadOptions {
  userId: string;
  tenantId?: string;
  file: Buffer;
  contentType: string;
  filename: string;
}

// ── Constants ─────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
// Reserved for future image resizing: const AVATAR_SIZE = 256;

// ── Service ───────────────────────────────────────────────

export class AvatarUploadService {
  private baseUrl: string;
  // R2/S3 is used whenever storage credentials are configured; otherwise we
  // fall back to a local mock URL (dev / test without object storage).
  private readonly storageEnabled: boolean;

  constructor() {
    this.storageEnabled = Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);
    // In production, use R2_PUBLIC_URL and R2_BUCKET
    this.baseUrl =
      env.NODE_ENV === 'production'
        ? process.env.R2_PUBLIC_URL || 'https://cdn.example.com'
        : 'http://localhost:8000/uploads';
  }

  /**
   * Validates an uploaded file
   */
  validate(file: Buffer, contentType: string): { valid: boolean; error?: string } {
    if (!ALLOWED_TYPES.includes(contentType)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      };
    }

    if (file.length > MAX_SIZE) {
      return {
        valid: false,
        error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Generates a unique key for the avatar
   */
  generateKey(userId: string, tenantId?: string): string {
    const uuid = randomUUID();
    const prefix = tenantId ? `tenants/${tenantId}` : 'platform';
    return `${prefix}/avatars/${userId}/${uuid}`;
  }

  /**
   * Uploads an avatar (mock for development)
   */
  async upload(options: AvatarUploadOptions): Promise<UploadResult> {
    const { userId, tenantId, file, contentType } = options;

    // Validate
    const validation = this.validate(file, contentType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate key
    const key = this.generateKey(userId, tenantId);

    // Upload to R2/S3 when storage is configured; otherwise return a mock URL
    // (local dev/test without object storage).
    if (this.storageEnabled) {
      await uploadToS3(key, file, contentType);
    }

    // Return result
    const url = `${this.baseUrl}/${key}`;

    return {
      url,
      key,
      size: file.length,
      contentType,
    };
  }

  /**
   * Deletes an avatar
   */
  async delete(key: string): Promise<void> {
    if (!this.storageEnabled || !key) return;
    await deleteFromS3(key);
  }

  /**
   * Gets a signed URL for temporary access
   */
  getSignedUrl(key: string, _expiresIn = 3600): string {
    // In production, generate a signed URL
    // For development, just return the public URL
    return `${this.baseUrl}/${key}`;
  }
}

// ── Singleton ─────────────────────────────────────────────

let instance: AvatarUploadService | null = null;

export function getAvatarUploadService(): AvatarUploadService {
  if (!instance) {
    instance = new AvatarUploadService();
  }
  return instance;
}

// ── Fastify Multipart Handler ─────────────────────────────

/**
 * Parse multipart form data for avatar upload
 *
 * Usage in route:
 * ```ts
 * fastify.post('/avatar', async (request, reply) => {
 *   const result = await handleAvatarUpload(request, reply, userId);
 *   return result;
 * });
 * ```
 */
export async function handleAvatarUpload(
  request: FastifyRequest,
  _reply: FastifyReply,
  userId: string,
  tenantId?: string,
): Promise<UploadResult> {
  const service = getAvatarUploadService();

  // Get multipart data (requires @fastify/multipart plugin)
  const data = await (
    request as unknown as {
      file: () => Promise<{
        filename: string;
        mimetype: string;
        toBuffer: () => Promise<Buffer>;
      }>;
    }
  ).file();

  if (!data) {
    throw new Error('No file uploaded');
  }

  const file = await data.toBuffer();
  const contentType = data.mimetype;
  const filename = data.filename;

  return service.upload({
    userId,
    tenantId,
    file,
    contentType,
    filename,
  });
}

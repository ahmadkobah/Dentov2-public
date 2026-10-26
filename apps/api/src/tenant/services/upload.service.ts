/**
 * Upload Service — 6-Step Security Pipeline
 *
 * Per SECURITY_AND_ENCRYPTION.md §8 (File Upload Security)
 * Per V2_DECISION_LOG.md §19 (ClamAV & File Scanning)
 *
 * Pipeline Steps:
 *   1. Size check → per-category limit
 *   2. MIME type check → magic bytes (not just extension)
 *   3. Extension whitelist → per-category
 *   4. Filename sanitize → UUID, no user-controlled path
 *   5. Virus scan → ClamAV (Phase 6+, stubbed)
 *   6. Image processing → Sharp: strip EXIF metadata
 *
 * S3/R2 path: tenants/{slug}/{category}/{uuid}.{ext}
 */

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import {
  type UploadCategory,
  UPLOAD_RULES,
  MAGIC_BYTES,
  buildS3Key,
} from '../../config/upload-rules.js';
import {
  uploadToS3,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  deleteFromS3,
  getObjectSizeBytes,
  initiateMultipartUpload,
  getMultipartPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from '../../config/s3.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';
import { Tenant } from '../../platform/models/index.js';
import type { CompletedPart } from '@aws-sdk/client-s3';

// ── Result Types ────────────────────────────────────────────

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: UploadCategory;
}

export interface MultipartInitResult {
  key: string;
  uploadId: string;
  partUrls: string[];
}

// ── Upload Service ──────────────────────────────────────────

export class UploadService {
  private tenantSlug: string;

  constructor(tenantSlug: string) {
    this.tenantSlug = tenantSlug;
  }

  // ── Tenant Ownership Guard ──────────────────────────────

  /**
   * Reject any client-supplied S3 key that does not belong to this tenant.
   *
   * Every key follows `tenants/{slug}/{category}/{uuid}.{ext}` (see buildS3Key),
   * so a key that does not start with this tenant's prefix references another
   * clinic's storage. Methods that accept a key from the request (download,
   * delete, multipart complete/abort) MUST call this first — otherwise any
   * authenticated user could read or delete another tenant's files (PHI).
   * Mirrors the check already enforced on GET /uploads/proxy.
   */
  private assertKeyOwnership(key: string): void {
    if (!key.startsWith(`tenants/${this.tenantSlug}/`)) {
      throw ApiError.forbidden('Access denied to this file');
    }
  }

  // ── Storage Quota Helpers ───────────────────────────────

  /**
   * Check if tenant has enough storage quota for the given file size.
   * Throws 413 if the upload would exceed storageLimitMB.
   */
  private async checkStorageQuota(fileSizeBytes: number): Promise<void> {
    const tenant = await Tenant.findOne({ slug: this.tenantSlug })
      .select('storageUsedMB storageLimitMB')
      .lean();
    if (!tenant) return; // tenant not found — let other middleware handle

    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    const newUsage = (tenant.storageUsedMB || 0) + fileSizeMB;
    const limit = tenant.storageLimitMB || 5120;

    if (newUsage > limit) {
      throw ApiError.payloadTooLarge(
        `Storage quota exceeded. Used: ${Math.round(tenant.storageUsedMB || 0)}MB / ${limit}MB. ` +
          `File size: ${Math.round(fileSizeMB)}MB. Contact your administrator to increase storage.`,
      );
    }
  }

  /**
   * Increment tenant's storageUsedMB after a successful upload.
   */
  private async trackStorageIncrease(fileSizeBytes: number): Promise<void> {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    await Tenant.updateOne(
      { slug: this.tenantSlug },
      { $inc: { storageUsedMB: Math.round(fileSizeMB * 100) / 100 } },
    );
  }

  /**
   * Decrement tenant's storageUsedMB after a file deletion.
   */
  private async trackStorageDecrease(fileSizeBytes: number): Promise<void> {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    // Use $max to prevent going below 0.
    // Mongoose 9 requires `updatePipeline: true` to accept an array (aggregation
    // pipeline) as the update; without it the call throws synchronously.
    await Tenant.updateOne(
      { slug: this.tenantSlug },
      [
        {
          $set: {
            storageUsedMB: {
              $max: [0, { $subtract: ['$storageUsedMB', Math.round(fileSizeMB * 100) / 100] }],
            },
          },
        },
      ],
      { updatePipeline: true },
    );
  }

  /**
   * Full 6-step upload pipeline — direct upload via multipart form
   */
  async upload(
    buffer: Buffer,
    originalFilename: string,
    category: UploadCategory,
  ): Promise<UploadResult> {
    const rule = UPLOAD_RULES[category];
    if (!rule) throw ApiError.badRequest(`Unknown upload category: ${category}`);

    // Step 0: Storage quota check
    await this.checkStorageQuota(buffer.length);

    // Step 1: Size check
    this.validateSize(buffer, category);

    // Step 2: MIME magic bytes check
    const detectedMime = this.detectMimeType(buffer, category);

    // Step 3: Extension whitelist
    const ext = this.validateExtension(originalFilename, category);

    // Step 4: Sanitize filename → UUID
    const uuid = randomUUID();
    const key = buildS3Key(this.tenantSlug, category, uuid, ext);

    // Step 5: Virus scan (stubbed for Phase 6+)
    await this.virusScan(buffer);

    // Step 6: Image processing (strip EXIF for images)
    const processed = await this.processImage(buffer, detectedMime);

    // Upload to S3/R2
    await uploadToS3(key, processed, detectedMime);

    // Track storage usage
    await this.trackStorageIncrease(processed.length);

    // Generate pre-signed URL for immediate access
    const url = await getPresignedDownloadUrl(key);

    logger.info(
      { key, category, size: processed.length, mime: detectedMime },
      'File uploaded successfully',
    );

    return {
      key,
      url,
      fileName: `${uuid}${ext}`,
      fileSize: processed.length,
      mimeType: detectedMime,
      category,
    };
  }

  /**
   * Generate a pre-signed upload URL — client uploads directly to S3/R2
   */
  async getUploadUrl(
    originalFilename: string,
    category: UploadCategory,
    contentType: string,
  ): Promise<{ key: string; uploadUrl: string; downloadUrl: string }> {
    const rule = UPLOAD_RULES[category];
    if (!rule) throw ApiError.badRequest(`Unknown upload category: ${category}`);

    // Storage quota check (use max file size as estimate for pre-signed uploads)
    await this.checkStorageQuota(rule.maxSize);

    // Validate content type
    if (!rule.mimeTypes.includes(contentType)) {
      throw ApiError.badRequest(
        `Invalid content type '${contentType}' for category '${category}'. Allowed: ${rule.mimeTypes.join(', ')}`,
      );
    }

    // Validate extension
    const ext = this.validateExtension(originalFilename, category);

    const uuid = randomUUID();
    const key = buildS3Key(this.tenantSlug, category, uuid, ext);

    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const downloadUrl = await getPresignedDownloadUrl(key);

    return { key, uploadUrl, downloadUrl };
  }

  /**
   * Initiate multipart upload (for CBCT > 100MB)
   */
  async initiateMultipart(
    originalFilename: string,
    category: UploadCategory,
    contentType: string,
    totalParts: number,
  ): Promise<MultipartInitResult> {
    const rule = UPLOAD_RULES[category];
    if (!rule) throw ApiError.badRequest(`Unknown upload category: ${category}`);

    // Storage quota check
    await this.checkStorageQuota(rule.maxSize);

    if (!rule.mimeTypes.includes(contentType)) {
      throw ApiError.badRequest(`Invalid content type for '${category}'`);
    }

    const ext = this.validateExtension(originalFilename, category);
    const uuid = randomUUID();
    const key = buildS3Key(this.tenantSlug, category, uuid, ext);

    const uploadId = await initiateMultipartUpload(key, contentType);

    // Generate pre-signed URLs for each part
    const partUrls: string[] = [];
    for (let i = 1; i <= totalParts; i++) {
      const url = await getMultipartPartUrl(key, uploadId, i);
      partUrls.push(url);
    }

    return { key, uploadId, partUrls };
  }

  /**
   * Complete multipart upload
   */
  async completeMultipart(
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<{ url: string }> {
    this.assertKeyOwnership(key);
    await completeMultipartUpload(key, uploadId, parts);

    // Track storage usage for completed multipart upload
    try {
      const sizeBytes = await getObjectSizeBytes(key);
      await this.trackStorageIncrease(sizeBytes);
    } catch {
      logger.warn({ key }, 'Could not track storage for multipart upload');
    }

    const url = await getPresignedDownloadUrl(key);
    return { url };
  }

  /**
   * Abort multipart upload
   */
  async abortMultipart(key: string, uploadId: string): Promise<void> {
    this.assertKeyOwnership(key);
    await abortMultipartUpload(key, uploadId);
  }

  /**
   * Delete a file from S3/R2
   */
  async deleteFile(key: string): Promise<void> {
    this.assertKeyOwnership(key);
    // Get file size before deletion to decrement storage
    let sizeBytes = 0;
    try {
      sizeBytes = await getObjectSizeBytes(key);
    } catch {
      logger.warn({ key }, 'Could not get file size before deletion');
    }

    await deleteFromS3(key);

    if (sizeBytes > 0) {
      await this.trackStorageDecrease(sizeBytes);
    }

    logger.info({ key, sizeBytes }, 'File deleted from S3/R2');
  }

  /**
   * Generate a fresh pre-signed download URL for an existing key
   */
  async getDownloadUrl(key: string): Promise<string> {
    this.assertKeyOwnership(key);
    return getPresignedDownloadUrl(key);
  }

  // ── Step 1: Size Validation ─────────────────────────────

  private validateSize(buffer: Buffer, category: UploadCategory): void {
    const rule = UPLOAD_RULES[category];
    if (buffer.length > rule.maxSize) {
      const maxMB = Math.round(rule.maxSize / (1024 * 1024));
      throw ApiError.badRequest(
        `File too large for '${category}'. Maximum: ${maxMB}MB, received: ${Math.round(buffer.length / (1024 * 1024))}MB`,
      );
    }
  }

  // ── Step 2: Magic Bytes MIME Detection ──────────────────

  private detectMimeType(buffer: Buffer, category: UploadCategory): string {
    const rule = UPLOAD_RULES[category];

    for (const allowedMime of rule.mimeTypes) {
      const signatures = MAGIC_BYTES[allowedMime];
      if (!signatures) continue;

      for (const sig of signatures) {
        if (buffer.length < sig.offset + sig.bytes.length) continue;
        const match = sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte);
        if (match) return allowedMime;
      }
    }

    // For categories with octet-stream allowed (cbct, stl), accept if no match
    if (rule.mimeTypes.includes('application/octet-stream')) {
      return 'application/octet-stream';
    }

    throw ApiError.badRequest(
      `File content does not match any allowed MIME type for '${category}'. Allowed: ${rule.mimeTypes.join(', ')}`,
    );
  }

  // ── Step 3: Extension Whitelist ─────────────────────────

  private validateExtension(filename: string, category: UploadCategory): string {
    const rule = UPLOAD_RULES[category];
    const ext = path.extname(filename).toLowerCase();

    if (!ext || !rule.extensions.includes(ext)) {
      throw ApiError.badRequest(
        `Invalid file extension '${ext}' for '${category}'. Allowed: ${rule.extensions.join(', ')}`,
      );
    }

    return ext;
  }

  // ── Step 5: Virus Scan (Stubbed) ────────────────────────

  private async virusScan(_buffer: Buffer): Promise<void> {
    // Phase 6+: ClamAV integration
    // For now, this is a no-op placeholder.
    // When ClamAV is available, scan buffer and throw if infected.
  }

  // ── Step 6: Image Processing (EXIF Strip) ───────────────

  private async processImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!imageTypes.includes(mimeType)) return buffer;

    try {
      // Strip EXIF metadata, auto-rotate based on EXIF orientation
      const processed = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .withMetadata({ orientation: undefined }) // Strip EXIF but keep color profile
        .toBuffer();

      logger.debug(
        { originalSize: buffer.length, processedSize: processed.length },
        'Image processed: EXIF stripped',
      );

      return processed;
    } catch (err) {
      logger.warn({ err }, 'Image processing failed, using original buffer');
      return buffer;
    }
  }
}

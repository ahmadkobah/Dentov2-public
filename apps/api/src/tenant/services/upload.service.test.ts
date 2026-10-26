/**
 * UploadService — Cross-tenant ownership guard (security regression tests)
 *
 * Regression for the S1 cross-tenant IDOR: the methods that accept a
 * client-supplied S3 key (download, delete, multipart complete/abort) must
 * reject any key that belongs to another tenant BEFORE touching S3 — otherwise
 * an authenticated user in tenant A could read or delete tenant B's PHI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────

vi.mock('../../config/s3.js', () => ({
  uploadToS3: vi.fn().mockResolvedValue(undefined),
  getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://signed.example/url'),
  getPresignedUploadUrl: vi.fn().mockResolvedValue('https://signed.example/upload'),
  deleteFromS3: vi.fn().mockResolvedValue(undefined),
  getObjectSizeBytes: vi.fn().mockResolvedValue(1024),
  initiateMultipartUpload: vi.fn().mockResolvedValue('upload-id'),
  getMultipartPartUrl: vi.fn().mockResolvedValue('https://signed.example/part'),
  completeMultipartUpload: vi.fn().mockResolvedValue(undefined),
  abortMultipartUpload: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../platform/models/index.js', () => ({
  Tenant: {
    findOne: vi.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) }),
    updateOne: vi.fn().mockResolvedValue(undefined),
  },
}));

import { UploadService } from './upload.service.js';
import * as s3 from '../../config/s3.js';

// ── Fixtures ───────────────────────────────────────────────

const OWN = 'tenant-a';
const ownKey = `tenants/${OWN}/xray/11111111-1111-1111-1111-111111111111.dcm`;
const foreignKey = 'tenants/tenant-b/xray/22222222-2222-2222-2222-222222222222.dcm';

describe('UploadService — cross-tenant key ownership', () => {
  let service: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UploadService(OWN);
  });

  describe('rejects a foreign-tenant key with 403 and never touches S3', () => {
    it('getDownloadUrl', async () => {
      await expect(service.getDownloadUrl(foreignKey)).rejects.toMatchObject({ statusCode: 403 });
      expect(s3.getPresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('deleteFile', async () => {
      await expect(service.deleteFile(foreignKey)).rejects.toMatchObject({ statusCode: 403 });
      expect(s3.deleteFromS3).not.toHaveBeenCalled();
      expect(s3.getObjectSizeBytes).not.toHaveBeenCalled();
    });

    it('completeMultipart', async () => {
      await expect(
        service.completeMultipart(foreignKey, 'upload-id', [{ ETag: 'e', PartNumber: 1 }]),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(s3.completeMultipartUpload).not.toHaveBeenCalled();
    });

    it('abortMultipart', async () => {
      await expect(service.abortMultipart(foreignKey, 'upload-id')).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(s3.abortMultipartUpload).not.toHaveBeenCalled();
    });
  });

  describe("allows the tenant's own key through to S3", () => {
    it('getDownloadUrl returns a signed URL', async () => {
      await expect(service.getDownloadUrl(ownKey)).resolves.toBe('https://signed.example/url');
      expect(s3.getPresignedDownloadUrl).toHaveBeenCalledWith(ownKey);
    });

    it('deleteFile deletes from S3', async () => {
      await service.deleteFile(ownKey);
      expect(s3.deleteFromS3).toHaveBeenCalledWith(ownKey);
    });

    it('abortMultipart calls S3 abort', async () => {
      await service.abortMultipart(ownKey, 'upload-id');
      expect(s3.abortMultipartUpload).toHaveBeenCalledWith(ownKey, 'upload-id');
    });
  });

  it('rejects a slug that is only a prefix look-alike (startsWith, not includes)', async () => {
    // tenant-a must NOT be able to reach tenant-a-evil's files
    const lookalike = 'tenants/tenant-a-evil/xray/33333333-3333-3333-3333-333333333333.dcm';
    await expect(service.getDownloadUrl(lookalike)).rejects.toMatchObject({ statusCode: 403 });
    expect(s3.getPresignedDownloadUrl).not.toHaveBeenCalled();
  });
});

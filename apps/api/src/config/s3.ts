/**
 * S3/R2 Client — Cloudflare R2 (S3-compatible) storage client
 *
 * Per SECURITY_AND_ENCRYPTION.md §8 — S3/R2 Bucket Policy
 * Per TECH_REQUIREMENTS.md — @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
 *
 * Bucket NOT public — all access via pre-signed URLs (1h TTL).
 * Path isolation: tenants/{slug}/{category}/{uuid}.{ext}
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  type CompletedPart,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';
import { PRESIGNED_URL_TTL } from './upload-rules.js';

// ── Singleton Client ────────────────────────────────────────

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    throw new Error(
      'S3/R2 environment variables not configured (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY)',
    );
  }

  s3Client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: 'auto', // R2 uses 'auto'
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for R2
  });

  return s3Client;
}

// ── Upload Object ───────────────────────────────────────────

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

// ── Generate Pre-Signed Download URL ────────────────────────

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = PRESIGNED_URL_TTL,
): Promise<string> {
  const client = getS3Client();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
    expiresIn,
  });
}

// ── Generate Pre-Signed Upload URL ──────────────────────────

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = PRESIGNED_URL_TTL,
): Promise<string> {
  const client = getS3Client();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}

// ── Get Object Size ─────────────────────────────────────────

export async function getObjectSizeBytes(key: string): Promise<number> {
  const client = getS3Client();
  const head = await client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  return head.ContentLength ?? 0;
}

// ── Delete Object ───────────────────────────────────────────

export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

// ── Multipart Upload (for CBCT > 100MB) ─────────────────────

export async function initiateMultipartUpload(key: string, contentType: string): Promise<string> {
  const client = getS3Client();
  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
  );
  if (!result.UploadId) throw new Error('Failed to initiate multipart upload');
  return result.UploadId;
}

export async function getMultipartPartUrl(
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn: number = PRESIGNED_URL_TTL,
): Promise<string> {
  const client = getS3Client();
  return getSignedUrl(
    client,
    new UploadPartCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn },
  );
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: CompletedPart[],
): Promise<void> {
  const client = getS3Client();
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      UploadId: uploadId,
    }),
  );
}

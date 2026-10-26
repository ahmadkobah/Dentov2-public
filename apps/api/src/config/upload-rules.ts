/**
 * Upload Rules & Constants — per SECURITY_AND_ENCRYPTION.md §8
 * per V2_DECISION_LOG.md §19 (Upload Categories & Limits)
 *
 * AUTHORITATIVE source for file upload validation rules.
 * Used by upload.service.ts for the 6-step security pipeline.
 */

// ── Upload Categories ───────────────────────────────────────

export type UploadCategory =
  | 'xray'
  | 'cbct'
  | 'avatar'
  | 'chatAttachment'
  | 'document'
  | 'stl'
  | 'intraoral_scan';

export interface UploadRule {
  maxSize: number;
  mimeTypes: string[];
  extensions: string[];
  description: string;
}

export const UPLOAD_RULES: Record<UploadCategory, UploadRule> = {
  xray: {
    maxSize: 25 * 1024 * 1024, // 25 MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/dicom', 'application/dicom'],
    extensions: ['.jpg', '.jpeg', '.png', '.dcm'],
    description: 'X-Ray image (JPEG, PNG, DICOM)',
  },
  cbct: {
    maxSize: 500 * 1024 * 1024, // 500 MB
    mimeTypes: ['application/dicom', 'application/octet-stream', 'application/zip'],
    extensions: ['.dcm', '.zip'],
    description: 'CBCT scan (DICOM, ZIP archive)',
  },
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    description: 'Profile avatar (JPEG, PNG, WebP)',
  },
  chatAttachment: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'audio/mpeg', 'audio/ogg'],
    extensions: ['.jpg', '.png', '.pdf', '.mp3', '.ogg'],
    description: 'Chat attachment (image, PDF, audio)',
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    description: 'Document (PDF only)',
  },
  stl: {
    maxSize: 50 * 1024 * 1024, // 50 MB
    mimeTypes: ['application/sla', 'model/stl', 'application/octet-stream'],
    extensions: ['.stl'],
    description: '3D scan / dental model (STL)',
  },
  intraoral_scan: {
    maxSize: 100 * 1024 * 1024, // 100 MB
    mimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream',
      'application/sla',
      'model/stl',
    ],
    extensions: ['.zip', '.stl', '.ply', '.obj'],
    description: 'Intraoral 3D scan (ZIP archive or individual STL/PLY/OBJ)',
  },
} as const;

// ── Magic Bytes Signatures ──────────────────────────────────
// Used for real MIME type detection (not just extension check)

export const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    // bytes 8-11 should be WEBP but we check prefix only
  ],
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  'application/zip': [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }], // PK..
  'application/dicom': [
    { offset: 128, bytes: [0x44, 0x49, 0x43, 0x4d] }, // DICM at offset 128
  ],
  'image/dicom': [
    { offset: 128, bytes: [0x44, 0x49, 0x43, 0x4d] }, // DICM at offset 128
  ],
};

// ── Pre-Signed URL Config ───────────────────────────────────

export const PRESIGNED_URL_TTL = 3600; // 1 hour in seconds (configurable)

// ── S3/R2 Path Convention ───────────────────────────────────
// tenants/{tenant_slug}/{category}/{uuid}.{ext}

export function buildS3Key(
  tenantSlug: string,
  category: UploadCategory,
  uuid: string,
  extension: string,
): string {
  return `tenants/${tenantSlug}/${category}/${uuid}${extension}`;
}

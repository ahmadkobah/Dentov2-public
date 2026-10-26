/**
 * useUpload — File upload hook with progress tracking
 *
 * Per SECURITY_AND_ENCRYPTION.md §8 — 6-step pipeline
 * Per TECH_REQUIREMENTS.md — react-dropzone + @fastify/multipart
 *
 * Supports:
 *   - Direct multipart upload via /api/uploads/:category
 *   - Pre-signed URL upload (client → S3/R2 direct)
 *   - Multipart upload initiation for CBCT > 100MB
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import { useAuthStore } from '@/stores/auth.store.js';
import type { ApiSuccessResponse } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export type UploadCategory =
  | 'xray'
  | 'cbct'
  | 'avatar'
  | 'chatAttachment'
  | 'document'
  | 'stl'
  | 'intraoral_scan';

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: UploadCategory;
}

export interface PresignResult {
  key: string;
  uploadUrl: string;
  downloadUrl: string;
}

// ── Upload sizes per category (for client-side validation) ──

const MAX_SIZES: Record<UploadCategory, number> = {
  xray: 25 * 1024 * 1024,
  cbct: 150 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
  chatAttachment: 10 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  stl: 50 * 1024 * 1024,
  intraoral_scan: 100 * 1024 * 1024,
};

// ── Direct Upload Hook (multipart form → API → S3) ─────────

export function useDirectUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: File, category: UploadCategory): Promise<UploadResult> => {
      // Client-side size check
      const maxSize = MAX_SIZES[category];
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        throw new Error(`File too large. Maximum: ${maxMB}MB`);
      }

      setIsUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const { accessToken, tenantSlug } = useAuthStore.getState();
        const API_URL = import.meta.env.VITE_API_URL || '';

        const xhr = new XMLHttpRequest();

        const result = await new Promise<UploadResult>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener('load', () => {
            try {
              const response = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && response.success) {
                resolve(response.data as UploadResult);
              } else {
                reject(new Error(response.message || 'Upload failed'));
              }
            } catch {
              reject(new Error('Upload failed'));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Upload failed')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

          xhr.open('POST', `${API_URL}/api/uploads/${category}`);
          if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
          if (tenantSlug) xhr.setRequestHeader('X-Tenant-Slug', tenantSlug);
          xhr.withCredentials = true;
          xhr.send(formData);
        });

        setProgress(100);
        return result;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return { upload, progress, isUploading };
}

// ── Pre-Signed URL Upload Hook ──────────────────────────────

export function usePresignedUpload() {
  const getPresignedUrl = useMutation({
    mutationFn: ({
      filename,
      category,
      contentType,
    }: {
      filename: string;
      category: UploadCategory;
      contentType: string;
    }) =>
      apiClient.post<ApiSuccessResponse<PresignResult>>(`/api/uploads/${category}/presign`, {
        filename,
        contentType,
      }),
  });

  const getDownloadUrl = useCallback(async (key: string): Promise<string> => {
    const res = await apiClient.get<ApiSuccessResponse<{ url: string }>>('/api/uploads/download', {
      params: { key },
    });
    return res.data.url;
  }, []);

  return { getPresignedUrl, getDownloadUrl };
}

// ── Delete File Hook ────────────────────────────────────────

export function useDeleteFile() {
  return useMutation({
    mutationFn: (key: string) =>
      apiClient.delete<ApiSuccessResponse<{ message: string }>>('/api/uploads', {
        body: JSON.stringify({ key }),
        headers: { 'Content-Type': 'application/json' },
      }),
  });
}

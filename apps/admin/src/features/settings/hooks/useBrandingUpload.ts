import { useState, useCallback } from 'react';
import { useAuthStore } from '../../../stores/auth.store.js';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface BrandingUploadResult {
  key: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Upload a branding asset (logo/favicon) for the current tenant.
 * Calls POST /api/branding/upload (tenant-scoped).
 */
export function useBrandingUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<BrandingUploadResult> => {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('File too large. Maximum: 5 MB');
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { accessToken, tenantSlug } = useAuthStore.getState();
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

      const response = await fetch(`${API_URL}/api/branding/upload`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      return data.data as BrandingUploadResult;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading };
}

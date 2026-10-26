/**
 * useResolvedUrl — Resolves an S3/R2 key to a fresh pre-signed download URL.
 *
 * Stored URLs expire after 1 hour. This hook takes the permanent key stored in the DB
 * and fetches a fresh pre-signed URL via GET /api/uploads/download?key=...
 *
 * Uses React Query for caching — the URL is cached for 50 minutes (just under the 1h TTL).
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';

/**
 * Detect whether a value is an S3/R2 key (e.g. "tenants/clinic/xray/uuid.jpg")
 * vs a full URL (starts with http:// or https://).
 */
function isS3Key(value: string): boolean {
  return !value.startsWith('http://') && !value.startsWith('https://');
}

async function fetchDownloadUrl(key: string): Promise<string> {
  const res = await apiClient.get<ApiSuccessResponse<{ url: string }>>('/api/uploads/download', {
    params: { key },
  });
  return res.data.url;
}

/**
 * Hook: resolve a single key/URL to a live pre-signed URL.
 * If the value is already a full URL (legacy data), returns it as-is.
 * If it's an S3 key, fetches a fresh pre-signed URL.
 */
export function useResolvedUrl(keyOrUrl: string | undefined | null) {
  const isKey = !!keyOrUrl && isS3Key(keyOrUrl);

  const { data: resolvedUrl, isLoading } = useQuery({
    queryKey: ['resolved-url', keyOrUrl],
    queryFn: () => fetchDownloadUrl(keyOrUrl!),
    enabled: isKey,
    staleTime: 50 * 60 * 1000, // 50 min (URL expires at 60 min)
    gcTime: 55 * 60 * 1000,
  });

  return {
    url: isKey ? resolvedUrl : keyOrUrl || undefined,
    isLoading: isKey && isLoading,
  };
}

/**
 * Hook: imperative function to resolve a key to a download URL.
 * Useful for on-click download actions where you don't want to pre-fetch.
 */
export function useGetDownloadUrl() {
  return useCallback(async (keyOrUrl: string): Promise<string> => {
    if (!isS3Key(keyOrUrl)) return keyOrUrl;
    return fetchDownloadUrl(keyOrUrl);
  }, []);
}

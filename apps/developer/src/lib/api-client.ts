/**
 * API Client — centralized fetch wrapper with auth interceptor.
 *
 * Per BUILD_RULES §5.3 / §17.1:
 *   - Injects Authorization header from in-memory auth store
 *   - credentials: 'include' for refresh-token cookie
 *   - Automatic silent token refresh on 401
 *
 * Developer portal variation: no X-Tenant-Slug (platform-level).
 */

import { useAuthStore } from '../stores/auth.store.js';

const API_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Skip the automatic 401 → refresh → retry cycle (used internally) */
  _skipRefresh?: boolean;
}

/** API error shape matching BUILD_RULES §4.1 */
export class ApiError extends Error {
  statusCode: number;
  error: string;
  details?: unknown;

  constructor(statusCode: number, error: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
  }
}

// ── Token Refresh Queue ─────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function silentRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Platform-Auth': 'true' },
      body: '{}',
      credentials: 'include',
    });

    if (!response.ok) {
      useAuthStore.getState().clearAuth();
      return null;
    }

    const json = await response.json();
    const newToken: string = json.data?.accessToken;
    if (newToken) {
      useAuthStore.getState().setAccessToken(newToken);
      return newToken;
    }

    useAuthStore.getState().clearAuth();
    return null;
  } catch {
    useAuthStore.getState().clearAuth();
    return null;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, _skipRefresh, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
      if (filtered.length) {
        const searchParams = new URLSearchParams(filtered.map(([k, v]) => [k, String(v)]));
        url += `?${searchParams.toString()}`;
      }
    }

    // Inject auth header from Zustand store (memory only — §17.1)
    const { accessToken } = useAuthStore.getState();
    const authHeaders: Record<string, string> = {};
    if (accessToken) authHeaders['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders,
        ...fetchOptions.headers,
      },
      credentials: 'include',
    });

    // Handle 204 No Content
    if (response.status === 204) return undefined as T;

    // Safely parse JSON — body may be empty or malformed (HTML error page, network glitch, etc.)
    let data: any = null;
    const rawText = await response.text();
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        // Non-JSON response — surface as ApiError instead of throwing SyntaxError
        // (otherwise UI would show generic "An unexpected error occurred")
        // eslint-disable-next-line no-console
        console.error('[api-client] Failed to parse response as JSON', {
          url,
          status: response.status,
          bodyPreview: rawText.slice(0, 200),
          parseErr,
        });
        throw new ApiError(
          response.status,
          'InvalidResponse',
          response.ok
            ? 'Server returned an unreadable response. Please try again.'
            : `Server error (${response.status}). Please try again.`,
          { bodyPreview: rawText.slice(0, 200) },
        );
      }
    }

    if (!response.ok) {
      // ── Auto-refresh on 401 ─────────────────────────────
      if (response.status === 401 && !_skipRefresh && accessToken) {
        if (!refreshPromise) {
          refreshPromise = silentRefresh().finally(() => {
            refreshPromise = null;
          });
        }

        const newToken = await refreshPromise;

        if (newToken) {
          return this.request<T>(endpoint, { ...options, _skipRefresh: true });
        }
      }

      throw new ApiError(
        data?.statusCode ?? response.status,
        data?.error ?? 'Error',
        data?.message ?? 'An error occurred',
        data?.details,
      );
    }

    return data as T;
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_URL);

/**
 * useSystemSettings hooks — Unit Tests
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.11
 * Tests query key factories, 4 queries, 3 mutations, and loading/error states.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  settingsKeys,
  useAllPlatformSettings,
  useSystemSettings,
  useBranding,
  useCurrencies,
  useUpdateSystemSettings,
  useUpdateBranding,
  useUpdateCurrencies,
} from '../hooks/useSystemSettings.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { useAuthStore } from '@/stores/auth.store.js';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true });
});

// ── Fixtures ───────────────────────────────────────────────

const mockSystemSettings = {
  defaultTimezone: 'Asia/Riyadh',
  defaultCurrency: 'SAR',
  defaultLanguage: 'en',
  supportEmail: 'support@dento.dev',
  platformVersion: '2.0.0',
  maxTenantsPerCluster: 100,
  registrationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
};

const mockBranding = {
  platformName: 'Dento',
  logoUrl: 'https://cdn.dento.dev/logo.png',
  faviconUrl: 'https://cdn.dento.dev/favicon.ico',
  primaryColor: '#4F46E5',
  landingPageUrl: 'https://dento.dev',
};

const mockCurrencies = {
  baseCurrency: 'SAR',
  exchangeRates: [
    { currency: 'USD', rate: 0.2667 },
    { currency: 'EUR', rate: 0.2432 },
  ],
};

// ── Query Key Factory ──────────────────────────────────────

describe('settingsKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(settingsKeys.all).toEqual(['platform-settings']);
    expect(settingsKeys.system()).toEqual(['platform-settings', 'system']);
    expect(settingsKeys.branding()).toEqual(['platform-settings', 'branding']);
    expect(settingsKeys.currencies()).toEqual(['platform-settings', 'currencies']);
    expect(settingsKeys.combined()).toEqual(['platform-settings', 'combined']);
  });

  it('should build keys with spreads from "all"', () => {
    // Every sub-key starts with the base key
    expect(settingsKeys.system()[0]).toBe(settingsKeys.all[0]);
    expect(settingsKeys.branding()[0]).toBe(settingsKeys.all[0]);
    expect(settingsKeys.currencies()[0]).toBe(settingsKeys.all[0]);
    expect(settingsKeys.combined()[0]).toBe(settingsKeys.all[0]);
  });
});

// ── useAllPlatformSettings ─────────────────────────────────

describe('useAllPlatformSettings', () => {
  it('should fetch and select combined platform settings', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        systemSettings: mockSystemSettings,
        branding: mockBranding,
        currencies: mockCurrencies,
      },
    });

    const { result } = renderHook(() => useAllPlatformSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      systemSettings: mockSystemSettings,
      branding: mockBranding,
      currencies: mockCurrencies,
    });
    expect(mockGet).toHaveBeenCalledWith('/api/platform/settings/all');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAllPlatformSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAllPlatformSettings(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });
});

// ── useSystemSettings ──────────────────────────────────────

describe('useSystemSettings', () => {
  it('should fetch and select system settings', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockSystemSettings,
    });

    const { result } = renderHook(() => useSystemSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSystemSettings);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/settings/system');
  });
});

// ── useBranding ────────────────────────────────────────────

describe('useBranding', () => {
  it('should fetch and select branding', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockBranding,
    });

    const { result } = renderHook(() => useBranding(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockBranding);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/settings/branding');
  });
});

// ── useCurrencies ──────────────────────────────────────────

describe('useCurrencies', () => {
  it('should fetch and select currencies', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockCurrencies,
    });

    const { result } = renderHook(() => useCurrencies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCurrencies);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/settings/currencies');
  });
});

// ── useUpdateSystemSettings ────────────────────────────────

describe('useUpdateSystemSettings', () => {
  it('should call PATCH /api/platform/settings/system', async () => {
    mockPatch.mockResolvedValue({
      success: true,
      data: { ...mockSystemSettings, defaultTimezone: 'UTC' },
    });

    const { result } = renderHook(() => useUpdateSystemSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ defaultTimezone: 'UTC' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/settings/system', {
      defaultTimezone: 'UTC',
    });
  });

  it('should handle mutation error', async () => {
    mockPatch.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useUpdateSystemSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ registrationEnabled: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server error');
  });
});

// ── useUpdateBranding ──────────────────────────────────────

describe('useUpdateBranding', () => {
  it('should call PATCH /api/platform/settings/branding', async () => {
    mockPatch.mockResolvedValue({
      success: true,
      data: { ...mockBranding, platformName: 'Dento Pro' },
    });

    const { result } = renderHook(() => useUpdateBranding(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ platformName: 'Dento Pro' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/settings/branding', {
      platformName: 'Dento Pro',
    });
  });

  it('should handle mutation error', async () => {
    mockPatch.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useUpdateBranding(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ primaryColor: '#FF0000' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Forbidden');
  });
});

// ── useUpdateCurrencies ────────────────────────────────────

describe('useUpdateCurrencies', () => {
  it('should call PATCH /api/platform/settings/currencies', async () => {
    mockPatch.mockResolvedValue({
      success: true,
      data: { baseCurrency: 'USD', exchangeRates: [{ currency: 'EUR', rate: 0.92 }] },
    });

    const { result } = renderHook(() => useUpdateCurrencies(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        baseCurrency: 'USD',
        exchangeRates: [{ currency: 'EUR', rate: 0.92 }],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/settings/currencies', {
      baseCurrency: 'USD',
      exchangeRates: [{ currency: 'EUR', rate: 0.92 }],
    });
  });

  it('should handle mutation error', async () => {
    mockPatch.mockRejectedValue(new Error('Bad Request'));

    const { result } = renderHook(() => useUpdateCurrencies(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ baseCurrency: '' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Bad Request');
  });
});

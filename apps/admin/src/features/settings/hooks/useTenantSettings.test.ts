/**
 * useTenantSettings hooks — Unit Tests
 *
 * Tests query key factories, all-settings query, single-key query,
 * update mutation, reset mutation, and loading/error states.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  settingsKeys,
  useAllSettings,
  useSettingsByKey,
  useUpdateSettings,
  useResetSettings,
} from './useTenantSettings.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPost = vi.fn();

vi.mock('../../../lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@dento/ui', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuthStore } from '../../../stores/auth.store.js';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true });
});

// ── Fixtures ───────────────────────────────────────────────

const mockClinicSettings = {
  clinicName: { en: 'Cairo Smile', ar: 'ابتسامة القاهرة' },
  phone: '+20123456789',
  email: 'info@cairosmile.com',
  address: { en: '123 Nile St', ar: '١٢٣ شارع النيل' },
};

const mockAppointmentSettings = {
  defaultDuration: 30,
  bufferTime: 5,
  maxAdvanceBookingDays: 90,
  allowOnlineBooking: true,
};

const mockAllSettings = {
  clinic: mockClinicSettings,
  appointment: mockAppointmentSettings,
};

// ── Query Key Factory ──────────────────────────────────────

describe('settingsKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(settingsKeys.all).toEqual(['tenant-settings']);
    expect(settingsKeys.lists()).toEqual(['tenant-settings', 'list']);
    expect(settingsKeys.byKey('clinic')).toEqual(['tenant-settings', 'clinic']);
    expect(settingsKeys.byKey('appointment')).toEqual(['tenant-settings', 'appointment']);
  });

  it('should share "all" root in every key', () => {
    expect(settingsKeys.lists()[0]).toBe(settingsKeys.all[0]);
    expect(settingsKeys.byKey('billing')[0]).toBe(settingsKeys.all[0]);
  });
});

// ── useAllSettings ─────────────────────────────────────────

describe('useAllSettings', () => {
  it('should fetch and select all settings', async () => {
    mockGet.mockResolvedValue({ data: { settings: mockAllSettings } });

    const { result } = renderHook(() => useAllSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAllSettings);
    expect(mockGet).toHaveBeenCalledWith('/api/tenant-settings');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAllSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Unauthorized');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAllSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── useSettingsByKey ────────────────────────────────────────

describe('useSettingsByKey', () => {
  it('should fetch clinic settings by key', async () => {
    mockGet.mockResolvedValue({
      data: { key: 'clinic', settings: mockClinicSettings },
    });

    const { result } = renderHook(() => useSettingsByKey('clinic'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockClinicSettings);
    expect(mockGet).toHaveBeenCalledWith('/api/tenant-settings/clinic');
  });

  it('should fetch appointment settings by key', async () => {
    mockGet.mockResolvedValue({
      data: { key: 'appointment', settings: mockAppointmentSettings },
    });

    const { result } = renderHook(() => useSettingsByKey('appointment'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAppointmentSettings);
    expect(mockGet).toHaveBeenCalledWith('/api/tenant-settings/appointment');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useSettingsByKey('clinic'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });
});

// ── useUpdateSettings ──────────────────────────────────────

describe('useUpdateSettings', () => {
  it('should PATCH to /api/tenant-settings/:key', async () => {
    mockPatch.mockResolvedValue({
      data: { key: 'clinic', settings: { ...mockClinicSettings, phone: '+20111111111' } },
    });

    const { result } = renderHook(() => useUpdateSettings('clinic'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ phone: '+20111111111' } as Partial<typeof mockClinicSettings>);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/tenant-settings/clinic', {
      phone: '+20111111111',
    });
  });

  it('should handle update error', async () => {
    mockPatch.mockRejectedValue(new Error('Validation error'));

    const { result } = renderHook(() => useUpdateSettings('appointment'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ defaultDuration: -1 } as Partial<typeof mockAppointmentSettings>);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Validation error');
  });
});

// ── useResetSettings ───────────────────────────────────────

describe('useResetSettings', () => {
  it('should POST to /api/tenant-settings/:key/reset', async () => {
    mockPost.mockResolvedValue({
      data: { key: 'clinic', settings: mockClinicSettings },
    });

    const { result } = renderHook(() => useResetSettings('clinic'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/tenant-settings/clinic/reset');
  });

  it('should handle reset error', async () => {
    mockPost.mockRejectedValue(new Error('Reset failed'));

    const { result } = renderHook(() => useResetSettings('billing'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Reset failed');
  });
});

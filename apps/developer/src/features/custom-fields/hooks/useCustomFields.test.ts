/**
 * useCustomFields hooks — Unit Tests
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 1.7
 * Tests query key factories, list query, entity query, detail query,
 * create/update/toggle/delete mutations, and loading/error states.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  customFieldKeys,
  useCustomFields,
  useCustomFieldsByEntity,
  useCustomFieldDetail,
  useCreateCustomField,
  useUpdateCustomField,
  useToggleCustomField,
  useDeleteCustomField,
  useReorderCustomFields,
} from '../hooks/useCustomFields.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Query Key Factory ──────────────────────────────────────

describe('customFieldKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(customFieldKeys.all).toEqual(['custom-fields']);
    expect(customFieldKeys.lists()).toEqual(['custom-fields', 'list']);
    expect(customFieldKeys.list('clinic-a', { page: 1 })).toEqual([
      'custom-fields',
      'list',
      'clinic-a',
      { page: 1 },
    ]);
    expect(customFieldKeys.byEntity('clinic-a', 'patient')).toEqual([
      'custom-fields',
      'entity',
      'clinic-a',
      'patient',
    ]);
    expect(customFieldKeys.details()).toEqual(['custom-fields', 'detail']);
    expect(customFieldKeys.detail('clinic-a', 'f1')).toEqual([
      'custom-fields',
      'detail',
      'clinic-a',
      'f1',
    ]);
  });
});

// ── useCustomFields ────────────────────────────────────────

describe('useCustomFields', () => {
  const mockFields = [
    { _id: 'f1', fieldKey: 'bloodType', label: { en: 'Blood Type' }, type: 'select' },
    { _id: 'f2', fieldKey: 'allergies', label: { en: 'Allergies' }, type: 'text' },
  ];
  const mockPagination = { page: 1, limit: 50, total: 2, totalPages: 1 };

  it('should fetch and select custom field list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockFields,
      meta: mockPagination,
    });

    const { result } = renderHook(
      () => useCustomFields('clinic-a', { entity: 'patient', page: 1 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(mockFields);
    expect(result.current.data?.pagination).toEqual(mockPagination);
    expect(mockGet).toHaveBeenCalledWith('/api/custom-fields', {
      params: { entity: 'patient', page: 1, limit: 50 },
      headers: { 'X-Tenant-Slug': 'clinic-a' },
    });
  });

  it('should not fetch when tenantSlug is empty', () => {
    const { result } = renderHook(() => useCustomFields('', { page: 1 }), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCustomFieldsByEntity ────────────────────────────────

describe('useCustomFieldsByEntity', () => {
  it('should fetch fields for a specific entity', async () => {
    const fields = [{ _id: 'f1', fieldKey: 'bloodType', type: 'select' }];
    mockGet.mockResolvedValue({ success: true, data: { fields } });

    const { result } = renderHook(() => useCustomFieldsByEntity('clinic-a', 'patient'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fields);
    expect(mockGet).toHaveBeenCalledWith('/api/custom-fields/entity/patient', {
      headers: { 'X-Tenant-Slug': 'clinic-a' },
    });
  });

  it('should not fetch when entity is empty', () => {
    const { result } = renderHook(() => useCustomFieldsByEntity('clinic-a', ''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCustomFieldDetail ───────────────────────────────────

describe('useCustomFieldDetail', () => {
  it('should fetch a single custom field', async () => {
    const field = { _id: 'f1', fieldKey: 'bloodType', type: 'select' };
    mockGet.mockResolvedValue({ success: true, data: { customField: field } });

    const { result } = renderHook(() => useCustomFieldDetail('clinic-a', 'f1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(field);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useCustomFieldDetail('clinic-a', null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCreateCustomField ───────────────────────────────────

describe('useCreateCustomField', () => {
  it('should call POST /api/custom-fields with tenant header', async () => {
    const created = { _id: 'f-new', fieldKey: 'weight', type: 'number' };
    mockPost.mockResolvedValue({ success: true, data: { customField: created } });

    const { result } = renderHook(() => useCreateCustomField('clinic-a'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        entity: 'patient',
        fieldKey: 'weight',
        label: { en: 'Weight' },
        type: 'number',
        isRequired: false,
        isActive: true,
        sortOrder: 0,
        showInList: true,
        showInForm: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/custom-fields',
      expect.objectContaining({ fieldKey: 'weight', type: 'number' }),
      { headers: { 'X-Tenant-Slug': 'clinic-a' } },
    );
  });
});

// ── useUpdateCustomField ───────────────────────────────────

describe('useUpdateCustomField', () => {
  it('should call PATCH /api/custom-fields/:id with tenant header', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { customField: {} } });

    const { result } = renderHook(() => useUpdateCustomField('clinic-a'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'f1', label: { en: 'Updated Label' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/custom-fields/f1',
      { label: { en: 'Updated Label' } },
      { headers: { 'X-Tenant-Slug': 'clinic-a' } },
    );
  });
});

// ── useToggleCustomField ───────────────────────────────────

describe('useToggleCustomField', () => {
  it('should call PATCH /api/custom-fields/:id/toggle', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { customField: {} } });

    const { result } = renderHook(() => useToggleCustomField('clinic-a'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'f1', isActive: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/custom-fields/f1/toggle',
      { isActive: false },
      { headers: { 'X-Tenant-Slug': 'clinic-a' } },
    );
  });
});

// ── useDeleteCustomField ───────────────────────────────────

describe('useDeleteCustomField', () => {
  it('should call DELETE /api/custom-fields/:id with tenant header', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteCustomField('clinic-a'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('f1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/custom-fields/f1', {
      headers: { 'X-Tenant-Slug': 'clinic-a' },
    });
  });
});

// ── useReorderCustomFields ─────────────────────────────────

describe('useReorderCustomFields', () => {
  it('should batch-update sort orders via PATCH', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { customField: {} } });

    const { result } = renderHook(() => useReorderCustomFields('clinic-a'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate([
        { id: 'f1', sortOrder: 0 },
        { id: 'f2', sortOrder: 1 },
      ]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/custom-fields/f1',
      { sortOrder: 0 },
      { headers: { 'X-Tenant-Slug': 'clinic-a' } },
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/custom-fields/f2',
      { sortOrder: 1 },
      { headers: { 'X-Tenant-Slug': 'clinic-a' } },
    );
  });
});

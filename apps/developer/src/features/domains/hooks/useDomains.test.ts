/**
 * useDomains hooks — Unit Tests
 *
 * Tests query key factories, list/detail queries,
 * create/verify/update/delete mutations.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  domainKeys,
  useDomains,
  useDomainDetail,
  useCreateDomain,
  useVerifyDomain,
  useUpdateDomain,
  useDeleteDomain,
} from '../hooks/useDomains.js';

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

describe('domainKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(domainKeys.all).toEqual(['domains']);
    expect(domainKeys.lists()).toEqual(['domains', 'list']);
    expect(domainKeys.list({ tenantSlug: 'clinic-a' })).toEqual([
      'domains',
      'list',
      { tenantSlug: 'clinic-a' },
    ]);
    expect(domainKeys.details()).toEqual(['domains', 'detail']);
    expect(domainKeys.detail('d1')).toEqual(['domains', 'detail', 'd1']);
  });
});

// ── useDomains ─────────────────────────────────────────────

describe('useDomains', () => {
  const mockDomains = [
    { _id: 'd1', customDomain: 'app.clinic-a.com', dnsVerified: true, sslStatus: 'active' },
    { _id: 'd2', customDomain: 'portal.clinic-b.com', dnsVerified: false, sslStatus: 'pending' },
  ];
  const mockMeta = { page: 1, limit: 20, total: 2, totalPages: 1 };

  it('should fetch and select domain list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: mockDomains,
      meta: mockMeta,
    });

    const { result } = renderHook(() => useDomains({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual(mockDomains);
    expect(result.current.data?.meta).toEqual(mockMeta);
    expect(mockGet).toHaveBeenCalledWith('/api/platform/domains', {
      params: { page: 1 },
    });
  });
});

// ── useDomainDetail ────────────────────────────────────────

describe('useDomainDetail', () => {
  it('should fetch a single domain', async () => {
    const domain = { _id: 'd1', customDomain: 'app.clinic-a.com', sslStatus: 'active' };
    mockGet.mockResolvedValue({ success: true, data: domain });

    const { result } = renderHook(() => useDomainDetail('d1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(domain);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => useDomainDetail(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCreateDomain ────────────────────────────────────────

describe('useCreateDomain', () => {
  it('should call POST /api/platform/domains with data', async () => {
    mockPost.mockResolvedValue({ success: true, data: { _id: 'd-new' } });

    const { result } = renderHook(() => useCreateDomain(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ tenantSlug: 'clinic-a', customDomain: 'app.clinic-a.com' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/domains', {
      tenantSlug: 'clinic-a',
      customDomain: 'app.clinic-a.com',
    });
  });
});

// ── useVerifyDomain ────────────────────────────────────────

describe('useVerifyDomain', () => {
  it('should call POST /api/platform/domains/:id/verify', async () => {
    mockPost.mockResolvedValue({ success: true, data: { _id: 'd1', dnsVerified: true } });

    const { result } = renderHook(() => useVerifyDomain(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('d1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/platform/domains/d1/verify');
  });
});

// ── useUpdateDomain ────────────────────────────────────────

describe('useUpdateDomain', () => {
  it('should call PATCH /api/platform/domains/:id with data', async () => {
    mockPatch.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useUpdateDomain(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'd1', isActive: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/platform/domains/d1', { isActive: false });
  });
});

// ── useDeleteDomain ────────────────────────────────────────

describe('useDeleteDomain', () => {
  it('should call DELETE /api/platform/domains/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteDomain(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('d1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/platform/domains/d1');
  });
});

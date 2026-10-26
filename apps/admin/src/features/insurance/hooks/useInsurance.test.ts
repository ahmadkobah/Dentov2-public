/**
 * useInsurance hook — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import {
  insuranceCompanyKeys,
  insuranceClaimKeys,
  useInsuranceCompanyList,
  useInsuranceCompanyDetail,
  useCreateInsuranceCompany,
  useDeactivateInsuranceCompany,
  useInsuranceClaimList,
  useInsuranceClaimDetail,
  useCreateInsuranceClaim,
  useUpdateClaimStatus,
  useClaimAgingReport,
} from '../hooks/useInsurance.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

beforeEach(() => vi.clearAllMocks());

// ── Query Keys ─────────────────────────────────────────────

describe('insuranceCompanyKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(insuranceCompanyKeys.all).toEqual(['insurance-companies']);
    expect(insuranceCompanyKeys.lists()).toEqual(['insurance-companies', 'list']);
    expect(insuranceCompanyKeys.detail('c1')).toEqual(['insurance-companies', 'detail', 'c1']);
  });
});

describe('insuranceClaimKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(insuranceClaimKeys.all).toEqual(['insurance-claims']);
    expect(insuranceClaimKeys.lists()).toEqual(['insurance-claims', 'list']);
    expect(insuranceClaimKeys.detail('cl1')).toEqual(['insurance-claims', 'detail', 'cl1']);
    expect(insuranceClaimKeys.aging()).toEqual(['insurance-claims', 'aging']);
  });
});

// ── Company Queries ────────────────────────────────────────

describe('useInsuranceCompanyList', () => {
  it('should fetch and select company list', async () => {
    const companies = [{ _id: 'c1', name: { en: 'Alpha' } }];
    const meta = { page: 1, totalPages: 1, total: 1 };
    mockGet.mockResolvedValue({ success: true, data: { companies, meta } });

    const { result } = renderHook(() => useInsuranceCompanyList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/insurance-companies', expect.any(Object));
  });
});

describe('useInsuranceCompanyDetail', () => {
  it('should fetch a single company', async () => {
    const company = { _id: 'c1', name: { en: 'Alpha' } };
    mockGet.mockResolvedValue({ success: true, data: { company } });

    const { result } = renderHook(() => useInsuranceCompanyDetail('c1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(company);
  });
});

// ── Company Mutations ──────────────────────────────────────

describe('useCreateInsuranceCompany', () => {
  it('should call POST /api/insurance-companies', async () => {
    mockPost.mockResolvedValue({ success: true, data: { company: { _id: 'c1' } } });

    const { result } = renderHook(() => useCreateInsuranceCompany(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ code: 'ALP' } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/insurance-companies', { code: 'ALP' });
  });
});

describe('useDeactivateInsuranceCompany', () => {
  it('should call DELETE /api/insurance-companies/:id', async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeactivateInsuranceCompany(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('c1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/insurance-companies/c1');
  });
});

// ── Claim Queries ──────────────────────────────────────────

describe('useInsuranceClaimList', () => {
  it('should fetch and select claim list', async () => {
    const claims = [{ _id: 'cl1', status: 'submitted' }];
    const meta = { page: 1, totalPages: 1, total: 1 };
    mockGet.mockResolvedValue({ success: true, data: { claims, meta } });

    const { result } = renderHook(() => useInsuranceClaimList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/insurance-claims', expect.any(Object));
  });
});

describe('useInsuranceClaimDetail', () => {
  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useInsuranceClaimDetail(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── Claim Mutations ────────────────────────────────────────

describe('useCreateInsuranceClaim', () => {
  it('should call POST /api/insurance-claims', async () => {
    mockPost.mockResolvedValue({ success: true, data: { claim: { _id: 'cl1' } } });

    const { result } = renderHook(() => useCreateInsuranceClaim(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ patientId: 'p1', totalAmount: 1000 } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/insurance-claims',
      expect.objectContaining({ patientId: 'p1' }),
    );
  });
});

describe('useUpdateClaimStatus', () => {
  it('should call PATCH /api/insurance-claims/:id/status', async () => {
    mockPatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateClaimStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'cl1', status: 'approved', approvedAmount: 800 } as never);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith('/api/insurance-claims/cl1/status', {
      status: 'approved',
      approvedAmount: 800,
    });
  });
});

describe('useClaimAgingReport', () => {
  it('should fetch aging report', async () => {
    const agingData = [{ bracket: '0-30', count: 5 }];
    mockGet.mockResolvedValue({ success: true, data: agingData });

    const { result } = renderHook(() => useClaimAgingReport(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/insurance-claims/aging', expect.any(Object));
  });
});

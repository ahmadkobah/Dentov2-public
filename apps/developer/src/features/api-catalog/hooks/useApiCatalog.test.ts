/**
 * useApiCatalog hooks — Unit Tests
 *
 * Tests query key factories, spec query, staleTime config,
 * and the parseEndpoints helper.
 * Mocks apiClient directly to avoid MSW overhead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/test-utils.js';
import { apiCatalogKeys, useApiSpec, parseEndpoints } from '../hooks/useApiCatalog.js';
import type { OpenApiSpec } from '../hooks/useApiCatalog.js';

// ── Mock apiClient ─────────────────────────────────────────

const mockGet = vi.fn();

vi.mock('@/lib/api-client.js', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Fixtures ───────────────────────────────────────────────

const mockSpec: OpenApiSpec = {
  openapi: '3.0.3',
  info: { title: 'Dento API', version: '2.0.0', description: 'Dento Platform API' },
  servers: [{ url: 'https://api.dento.com', description: 'Production' }],
  tags: [{ name: 'Tenants', description: 'Tenant management' }],
  paths: {
    '/api/tenants': {
      get: {
        tags: ['Tenants'],
        summary: 'List tenants',
        description: 'Retrieve all tenants',
        operationId: 'listTenants',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'page', in: 'query', required: false, schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } },
      },
      post: {
        tags: ['Tenants'],
        summary: 'Create tenant',
        operationId: 'createTenant',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object' } } },
          required: true,
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/tenants/{id}': {
      delete: {
        tags: ['Tenants'],
        summary: 'Delete tenant',
        operationId: 'deleteTenant',
        responses: { '204': { description: 'No Content' } },
      },
    },
  },
};

// ── Query Key Factory ──────────────────────────────────────

describe('apiCatalogKeys', () => {
  it('should produce correct key hierarchy', () => {
    expect(apiCatalogKeys.all).toEqual(['api-catalog']);
    expect(apiCatalogKeys.spec()).toEqual(['api-catalog', 'spec']);
  });

  it('should share "all" root in every key', () => {
    expect(apiCatalogKeys.spec()[0]).toBe(apiCatalogKeys.all[0]);
  });
});

// ── useApiSpec ─────────────────────────────────────────────

describe('useApiSpec', () => {
  it('should fetch the OpenAPI spec', async () => {
    mockGet.mockResolvedValue(mockSpec);

    const { result } = renderHook(() => useApiSpec(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSpec);
    expect(mockGet).toHaveBeenCalledWith('/api/openapi.json');
  });

  it('should handle error state', async () => {
    mockGet.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useApiSpec(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });

  it('should start in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useApiSpec(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

// ── parseEndpoints ────────────────────────────────────────

describe('parseEndpoints', () => {
  it('should extract all endpoints from spec paths', () => {
    const endpoints = parseEndpoints(mockSpec);
    expect(endpoints).toHaveLength(3);
  });

  it('should parse GET endpoint correctly', () => {
    const endpoints = parseEndpoints(mockSpec);
    const getEndpoint = endpoints.find((e) => e.method === 'GET' && e.path === '/api/tenants');

    expect(getEndpoint).toBeDefined();
    expect(getEndpoint?.tag).toBe('Tenants');
    expect(getEndpoint?.summary).toBe('List tenants');
    expect(getEndpoint?.security).toEqual(['bearerAuth']);
    expect(getEndpoint?.parameters).toHaveLength(1);
    expect(getEndpoint?.hasRequestBody).toBe(false);
    expect(getEndpoint?.responses).toEqual(['200', '401']);
  });

  it('should parse POST endpoint with request body', () => {
    const endpoints = parseEndpoints(mockSpec);
    const postEndpoint = endpoints.find((e) => e.method === 'POST');

    expect(postEndpoint).toBeDefined();
    expect(postEndpoint?.summary).toBe('Create tenant');
    expect(postEndpoint?.hasRequestBody).toBe(true);
    expect(postEndpoint?.responses).toEqual(['201']);
  });

  it('should handle endpoints without security or tags', () => {
    const endpoints = parseEndpoints(mockSpec);
    const deleteEndpoint = endpoints.find((e) => e.method === 'DELETE');

    expect(deleteEndpoint).toBeDefined();
    expect(deleteEndpoint?.tag).toBe('Tenants');
    expect(deleteEndpoint?.security).toEqual([]);
    expect(deleteEndpoint?.hasRequestBody).toBe(false);
  });

  it('should handle empty paths', () => {
    const emptySpec: OpenApiSpec = {
      openapi: '3.0.3',
      info: { title: 'Empty', version: '0.0.0' },
      paths: {},
    };
    expect(parseEndpoints(emptySpec)).toEqual([]);
  });

  it('should ignore non-HTTP methods', () => {
    const specWithExtras: OpenApiSpec = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: { summary: 'Valid', responses: { '200': { description: 'OK' } } },
          options: { summary: 'Ignored', responses: {} } as never,
        },
      },
    };
    const endpoints = parseEndpoints(specWithExtras);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].method).toBe('GET');
  });
});

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, OperationObject>>;
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  security?: Array<Record<string, string[]>>;
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: { type?: string; format?: string };
    description?: string;
  }>;
  requestBody?: {
    content?: Record<string, { schema?: Record<string, unknown> }>;
    required?: boolean;
  };
  responses?: Record<string, { description?: string }>;
}

export interface EndpointInfo {
  method: string;
  path: string;
  tag: string;
  summary: string;
  description?: string;
  security: string[];
  parameters: OperationObject['parameters'];
  hasRequestBody: boolean;
  responses: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function parseEndpoints(spec: OpenApiSpec): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        const securitySchemes: string[] = [];
        if (op.security) {
          for (const sec of op.security) {
            securitySchemes.push(...Object.keys(sec));
          }
        }
        endpoints.push({
          method: method.toUpperCase(),
          path,
          tag: op.tags?.[0] ?? 'Other',
          summary: op.summary ?? `${method.toUpperCase()} ${path}`,
          description: op.description,
          security: securitySchemes,
          parameters: op.parameters ?? [],
          hasRequestBody: !!op.requestBody,
          responses: Object.keys(op.responses ?? {}),
        });
      }
    }
  }
  return endpoints;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const apiCatalogKeys = {
  all: ['api-catalog'] as const,
  spec: () => [...apiCatalogKeys.all, 'spec'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useApiSpec() {
  return useQuery({
    queryKey: apiCatalogKeys.spec(),
    queryFn: () => apiClient.get<OpenApiSpec>('/api/openapi.json'),
    staleTime: 5 * 60_000, // spec is mostly static, cache 5 minutes
  });
}

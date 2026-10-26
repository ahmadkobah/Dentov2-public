import type { FastifyReply } from 'fastify';

// ── HTTP status text lookup ─────────────────────────────────
const HTTP_STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

// ── Pagination meta (optional, for list endpoints) ──────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standardized success response — §3.6 + §4.3
 *
 * Shape: { success: true, data, message, meta? }
 */
export function apiResponse<T>(
  reply: FastifyReply,
  statusCode: number,
  data: T,
  message?: string,
  meta?: PaginationMeta,
) {
  const body: Record<string, unknown> = {
    success: true,
    data,
  };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return reply.code(statusCode).send(body);
}

/**
 * Standardized error response — §3.6 + §4.1
 *
 * Shape: { statusCode, error, message, details?, requestId, timestamp }
 */
export function apiError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  details?: unknown,
) {
  return reply.code(statusCode).send({
    statusCode,
    error: HTTP_STATUS_TEXT[statusCode] || 'Error',
    message,
    ...(details !== undefined && { details }),
    requestId: reply.request?.id ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Custom API Error class for consistent error handling.
 * Thrown in middleware / services, caught by the global error handler.
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(resource: string = 'Resource') {
    return new ApiError(404, 'NOT_FOUND', `${resource} not found`);
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static payloadTooLarge(message: string) {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', message);
  }

  static tooManyRequests(message: string = 'Too many requests') {
    return new ApiError(429, 'TOO_MANY_REQUESTS', message);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

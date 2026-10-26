import type { FastifyRequest, FastifyReply } from 'fastify';
import mongoose, { type Connection } from 'mongoose';
import { ApiError } from '../../utils/api-response.js';
import { Tenant } from '../../platform/models/index.js';

/**
 * Tenant Database Middleware
 *
 * Attaches tenant-specific database connection using mongoose.useDb().
 * Each tenant has isolated data in their own database: tenant_{slug}
 *
 * Must be applied AFTER authGuard middleware.
 */

// ── Connection Cache ────────────────────────────────────────

const tenantConnections = new Map<string, Connection>();

// ── Extend Fastify Types ────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    tenantDb?: Connection;
    tenant?: {
      id: string;
      slug: string;
      name: { en: string; ar?: string };
      status: string;
      enabledModules: string[];
      settings: {
        timezone: string;
        defaultLanguage: string;
        supportedLanguages: string[];
        locale: string; // backward compat alias
        currency: string;
        dateFormat: string;
        timeFormat: '12h' | '24h';
      };
    };
  }
}

// ── Get or Create Tenant Connection ─────────────────────────

export function getTenantConnection(slug: string): Connection {
  if (!tenantConnections.has(slug)) {
    const connection = mongoose.connection.useDb(`tenant_${slug}`, {
      useCache: true,
    });
    tenantConnections.set(slug, connection);
  }
  return tenantConnections.get(slug)!;
}

// ── Middleware ──────────────────────────────────────────────

export async function tenantDbMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Platform admins can access any tenant via query param
  let tenantSlug: string | undefined;

  if (request.user?.role === 'platform_admin') {
    // Platform admin can specify tenant via header, query, or fall back to their own tenant
    tenantSlug =
      (request.headers['x-tenant-slug'] as string) ||
      (request.query as Record<string, string>)['tenantSlug'] ||
      request.user?.tenantSlug ||
      request.tenantSlug;
  } else {
    // Regular users use their assigned tenant
    tenantSlug = request.user?.tenantSlug || request.tenantSlug;
  }

  if (!tenantSlug) {
    throw new ApiError(400, 'TENANT_REQUIRED', 'Tenant context is required for this operation');
  }

  // Verify tenant exists and is active
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  if (!tenant) {
    throw new ApiError(404, 'TENANT_NOT_FOUND', `Tenant '${tenantSlug}' does not exist`);
  }

  if (tenant.status === 'suspended') {
    throw new ApiError(403, 'TENANT_SUSPENDED', 'This clinic account has been suspended');
  }

  if (tenant.status === 'cancelled') {
    throw new ApiError(403, 'TENANT_CANCELLED', 'This clinic account has been cancelled');
  }

  // Attach tenant database connection
  request.tenantDb = getTenantConnection(tenantSlug);
  request.tenantSlug = tenantSlug;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = tenant.settings as any;
  const defaultLang = s.defaultLanguage ?? s.locale ?? 'en';
  const supportedLangs = s.supportedLanguages ?? [defaultLang];
  request.tenant = {
    id: tenant._id.toString(),
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    enabledModules: tenant.enabledModules ?? [],
    settings: {
      timezone: s.timezone,
      defaultLanguage: defaultLang,
      supportedLanguages: supportedLangs,
      locale: defaultLang,
      currency: s.currency,
      dateFormat: s.dateFormat,
      timeFormat: s.timeFormat,
    },
  };

  // Update last activity
  await Tenant.updateOne({ _id: tenant._id }, { $set: { lastActivityAt: new Date() } });
}

/**
 * Optional Tenant Middleware — For endpoints that can work with or without tenant context
 */
export async function optionalTenantMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const tenantSlug =
    request.user?.tenantSlug ||
    (request.headers['x-tenant-slug'] as string) ||
    (request.query as Record<string, string>)['tenantSlug'];

  if (!tenantSlug) {
    return; // No tenant context, continue
  }

  const tenant = await Tenant.findOne({
    slug: tenantSlug,
    status: { $in: ['trial', 'active'] },
  }).lean();

  if (tenant) {
    request.tenantDb = getTenantConnection(tenantSlug);
    request.tenantSlug = tenantSlug;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s2 = tenant.settings as any;
    const defLang = s2.defaultLanguage ?? s2.locale ?? 'en';
    const supLangs = s2.supportedLanguages ?? [defLang];
    request.tenant = {
      id: tenant._id.toString(),
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      enabledModules: (tenant as unknown as { enabledModules?: string[] }).enabledModules ?? [],
      settings: {
        timezone: s2.timezone,
        defaultLanguage: defLang,
        supportedLanguages: supLangs,
        locale: defLang,
        currency: s2.currency,
        dateFormat: s2.dateFormat,
        timeFormat: s2.timeFormat,
      },
    };
  }
}

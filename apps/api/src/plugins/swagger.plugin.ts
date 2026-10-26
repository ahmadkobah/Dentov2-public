import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

// ── Tag Definitions ─────────────────────────────────────────
// Every API route group gets a tag with a description.
// The onRoute hook below auto-assigns tags based on URL prefix.
const OPENAPI_TAGS = [
  { name: 'Health', description: 'Service health & readiness probes' },
  { name: 'Auth', description: 'Authentication, sessions & password management' },
  { name: 'Patients', description: 'Patient CRUD, search & medical records' },
  { name: 'Translations', description: 'i18n — locale packs & country configs' },
  {
    name: 'Notifications',
    description: 'In-app notifications, templates, preferences & device tokens',
  },
  { name: 'Recurring', description: 'Recurring appointment rules, pause/resume & skip logs' },
  { name: 'Dashboard', description: 'Dashboard widgets — stats, trends & free-tier reports' },
  { name: 'Reports', description: 'Advanced analytics — 26 reports, exports, schedules & history' },
  { name: 'Branding', description: 'Tenant branding — logo, colors, favicon & custom CSS' },
  { name: 'Settings', description: 'Tenant settings — contact info & technical configuration' },
  {
    name: 'Versioning',
    description: 'Module versioning, rollout plans & tenant module management',
  },
  { name: 'Webhooks', description: 'Platform & tenant webhook endpoints, deliveries & replay' },
  { name: 'Pricing', description: 'Pricing plans, tiers, coupons & invoice generation' },
  {
    name: 'Payments — Paymob',
    description: 'Paymob payment intents, webhooks & refunds (EG/MENA)',
  },
  {
    name: 'Payments — Stripe',
    description: 'Stripe payment intents, webhooks, refunds & autopay setup',
  },
  { name: 'Backups', description: 'Per-tenant backup trigger, retention, download & stats' },
  { name: 'Rate Limits', description: 'Rate-limit configuration, tier management & usage stats' },
  { name: 'API Keys', description: 'API key lifecycle — create, rotate, verify (SHA-256) & usage' },
  {
    name: 'DB Explorer',
    description: 'Readonly MongoDB explorer — collections, documents, indexes & stats',
  },
  {
    name: 'Support',
    description: 'Support tickets CRUD, SLA tracking, priority levels & assignment',
  },
  {
    name: 'Impersonation',
    description: 'Tenant impersonation sessions — temp JWT, audit trail & revocation',
  },
  {
    name: 'Modules',
    description: 'Platform module registry — CRUD, categories, pricing & tenant counts',
  },
  // Phase 6
  {
    name: 'Error Logs',
    description: 'Centralised error log ingestion, dedup, resolution & dashboard stats',
  },
  {
    name: 'Domains',
    description: 'Custom domain management — DNS verification, SSL status & Cloudflare wiring',
  },
  {
    name: 'Platform Sessions',
    description: 'Cross-tenant user session listing, stats & forced revocation',
  },
] as const;

// ── Prefix → Tag Auto-Mapping ───────────────────────────────
// Maps URL prefixes to OpenAPI tags so ALL routes get documented
// automatically without adding schema.tags to each handler.
const PREFIX_TAG_MAP: [RegExp, string][] = [
  [/^\/health/, 'Health'],
  [/^\/api\/auth/, 'Auth'],
  [/^\/api\/patients/, 'Patients'],
  [/^\/api\/translations|\/api\/countries/, 'Translations'],
  [/^\/api\/notifications/, 'Notifications'],
  [/^\/api\/recurring-rules/, 'Recurring'],
  [/^\/api\/dashboard/, 'Dashboard'],
  [/^\/api\/reports/, 'Reports'],
  [/^\/api\/branding|\/api\/logo/, 'Branding'],
  [/^\/api\/settings/, 'Settings'],
  [/^\/api\/versioning|\/api\/modules|\/api\/rollout/, 'Versioning'],
  [/^\/api\/webhooks/, 'Webhooks'],
  [/^\/api\/pricing/, 'Pricing'],
  [/^\/api\/payments\/paymob/, 'Payments — Paymob'],
  [/^\/api\/payments\/stripe/, 'Payments — Stripe'],
  [/^\/api\/backups/, 'Backups'],
  [/^\/api\/rate-limits/, 'Rate Limits'],
  [/^\/api\/api-keys/, 'API Keys'],
  [/^\/api\/db-explorer/, 'DB Explorer'],
  [/^\/api\/support/, 'Support'],
  [/^\/api\/admin\/support-sessions|^\/api\/admin\/tenants.*impersonate/, 'Impersonation'],
  [/^\/api\/platform\/modules/, 'Modules'],
  // Phase 6
  [/^\/api\/platform\/error-logs/, 'Error Logs'],
  [/^\/api\/platform\/domains/, 'Domains'],
  [/^\/api\/platform\/user-sessions/, 'Platform Sessions'],
];

/**
 * Resolves the OpenAPI tag for a given route URL.
 * Falls back to "Other" for unmatched routes.
 */
function resolveTag(url: string): string {
  for (const [pattern, tag] of PREFIX_TAG_MAP) {
    if (pattern.test(url)) return tag;
  }
  return 'Other';
}

// ── Plugin ──────────────────────────────────────────────────

const swaggerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ── @fastify/swagger — OpenAPI 3.1 Spec Generation ───────
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Dento v2 API',
        description:
          'Dental Clinic Management SaaS — REST API.\n\n' +
          'Multi-tenant architecture with per-tenant database isolation (`tenant_{slug}`).\n' +
          'All endpoints under `/api/*` require a valid JWT unless noted otherwise.\n\n' +
          '**Authentication:** Bearer token (access) + HttpOnly cookie (refresh).\n' +
          '**Rate Limits:** Per-tier defaults — see the Rate Limits section.',
        version: '2.0.0',
        contact: {
          name: 'Dento Platform Team',
          url: 'https://dento.app',
          email: 'platform@dento.app',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Development' },
        { url: 'https://api.dento.app', description: 'Production' },
      ],
      tags: [...OPENAPI_TAGS],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Access token — 15 min TTL. Obtain via POST /api/auth/login.',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description:
              'Tenant API key (dento_live_… / dento_test_…). Create via POST /api/api-keys.',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'refreshToken',
            description: 'Refresh token — HttpOnly cookie, 7-day TTL.',
          },
        },
      },
    },
  });

  // ── Auto-Tag Hook ─────────────────────────────────────────
  // Assigns OpenAPI tags to routes that don't already have them
  // so all 127+ endpoints appear in the generated spec.
  fastify.addHook('onRoute', (routeOptions) => {
    // Skip internal Fastify routes (e.g. swagger-ui assets)
    if (routeOptions.url.startsWith('/docs')) return;

    // Initialise schema if absent
    if (!routeOptions.schema) {
      routeOptions.schema = {};
    }

    // Auto-assign tag if none present
    if (!routeOptions.schema.tags || routeOptions.schema.tags.length === 0) {
      routeOptions.schema.tags = [resolveTag(routeOptions.url)];
    }

    // Auto-generate summary from method + path when missing
    if (!routeOptions.schema.summary) {
      const method = Array.isArray(routeOptions.method)
        ? routeOptions.method[0]
        : routeOptions.method;
      routeOptions.schema.summary = `${method} ${routeOptions.url}`;
    }

    // Default security to bearerAuth for /api/* routes (except public)
    if (
      routeOptions.url.startsWith('/api') &&
      !routeOptions.schema.security &&
      !routeOptions.url.includes('/auth/login') &&
      !routeOptions.url.includes('/auth/register') &&
      !routeOptions.url.includes('/auth/forgot-password') &&
      !routeOptions.url.includes('/auth/reset-password') &&
      !routeOptions.url.includes('/webhook')
    ) {
      routeOptions.schema.security = [{ bearerAuth: [] }];
    }
  });

  // ── @fastify/swagger-ui — Interactive Docs ────────────────
  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      persistAuthorization: true,
    },
    uiHooks: {
      onRequest: (_request, _reply, next) => next(),
      preHandler: (_request, _reply, next) => next(),
    },
    staticCSP: false,
  });

  // ── JSON Spec Endpoint ────────────────────────────────────
  // Explicit /api/openapi.json endpoint for the Dev Portal API Catalog.
  // (Swagger UI also exposes /docs/json but this is a cleaner public URL.)
  fastify.get(
    '/api/openapi.json',
    {
      schema: {
        tags: ['Health'],
        summary: 'OpenAPI 3.1 JSON specification',
        description: 'Returns the auto-generated OpenAPI spec for all registered routes.',
        security: [],
      },
    },
    async (_request, reply) => {
      const spec = fastify.swagger();
      return reply.type('application/json').send(spec);
    },
  );
};

export default fp(swaggerPlugin, { name: 'swagger' });

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { DB_EXPLORER_DEFAULTS } from '@dento/shared';

// ── Types ───────────────────────────────────────────────────

interface TenantSlugParams {
  slug: string;
}

interface CollectionParams {
  slug: string;
  collection: string;
}

interface DocumentParams {
  slug: string;
  collection: string;
  documentId: string;
}

interface ListDocsQuery {
  page?: string;
  limit?: string;
  sort?: string;
  filter?: string;
  projection?: string;
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Get or create a connection to tenant_{slug} database.
 * Returns null if tenant DB does not exist.
 */
function getTenantConnection(slug: string): mongoose.Connection {
  const dbName = `tenant_${slug}`;
  return mongoose.connection.useDb(dbName, { useCache: true });
}

/**
 * Sanitize a JSON filter to prevent NoSQL injection.
 * Removes any keys starting with '$' beyond depth 0.
 */
function sanitizeFilter(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > DB_EXPLORER_DEFAULTS.MAX_FILTER_DEPTH) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block dangerous operators at top level
    if (
      key.startsWith('$') &&
      !['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex', '$exists'].includes(
        key,
      )
    ) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeFilter(value as Record<string, unknown>, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── Routes ──────────────────────────────────────────────────

export async function dbExplorerRoutes(fastify: FastifyInstance) {
  // ── GET /api/db-explorer/:slug/stats ──────────────────────
  // Returns database-level statistics for a tenant's DB.
  fastify.get<{ Params: TenantSlugParams }>(
    '/:slug/stats',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug } = request.params as TenantSlugParams;

      try {
        const conn = getTenantConnection(slug);
        const db = conn.db;
        if (!db) {
          return apiError(reply, 404, `Database for tenant '${slug}' not found`);
        }

        const stats = await db.stats();
        return apiResponse(reply, 200, {
          db: `tenant_${slug}`,
          collections: stats.collections,
          documents: stats.objects,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexSize: stats.indexSize,
          avgObjSize: stats.avgObjSize,
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch database stats');
      }
    },
  );

  // ── GET /api/db-explorer/:slug/collections ────────────────
  // Lists all collections with document count, size, and indexes.
  fastify.get<{ Params: TenantSlugParams }>(
    '/:slug/collections',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug } = request.params as TenantSlugParams;

      try {
        const conn = getTenantConnection(slug);
        const db = conn.db;
        if (!db) {
          return apiError(reply, 404, `Database for tenant '${slug}' not found`);
        }

        const collections = await db.listCollections().toArray();
        const collectionInfos = [];

        const hiddenSet = new Set<string>(DB_EXPLORER_DEFAULTS.HIDDEN_COLLECTIONS);

        for (const col of collections) {
          if (hiddenSet.has(col.name)) continue;

          const collection = db.collection(col.name);
          const [stats, indexes] = await Promise.all([
            db.command({ collStats: col.name }).catch(() => null),
            collection.indexes().catch(() => []),
          ]);

          collectionInfos.push({
            name: col.name,
            type: col.type || 'collection',
            documentCount: stats?.count ?? 0,
            avgDocumentSize: stats?.avgObjSize ?? 0,
            totalSize: stats?.size ?? 0,
            storageSize: stats?.storageSize ?? 0,
            indexCount: indexes.length,
            indexes: indexes.map((idx: Record<string, unknown>) => ({
              name: idx.name as string,
              key: idx.key as Record<string, number>,
              unique: !!idx.unique,
              sparse: !!idx.sparse,
              size: 0, // index size not available per-index from driver
            })),
          });
        }

        // Sort by document count descending
        collectionInfos.sort((a, b) => b.documentCount - a.documentCount);

        return apiResponse(reply, 200, {
          db: `tenant_${slug}`,
          collections: collectionInfos,
          total: collectionInfos.length,
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to list collections');
      }
    },
  );

  // ── GET /api/db-explorer/:slug/:collection/documents ─────
  // Lists documents in a collection with pagination, filter, sort.
  fastify.get<{ Params: CollectionParams; Querystring: ListDocsQuery }>(
    '/:slug/:collection/documents',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug, collection } = request.params as CollectionParams;
      const query = request.query as ListDocsQuery;

      try {
        const conn = getTenantConnection(slug);
        const db = conn.db;
        if (!db) {
          return apiError(reply, 404, `Database for tenant '${slug}' not found`);
        }

        const col = db.collection(collection);
        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(
          DB_EXPLORER_DEFAULTS.PAGE_LIMIT,
          Math.max(1, parseInt(query.limit || '20', 10)),
        );
        const skip = (page - 1) * limit;

        // Parse filter (JSON string)
        let filter: Record<string, unknown> = {};
        if (query.filter) {
          try {
            const parsed = JSON.parse(query.filter);
            filter = sanitizeFilter(parsed);
          } catch {
            return apiError(reply, 400, 'Filter must be valid JSON');
          }
        }

        // Parse sort (JSON string)
        let sort: Record<string, 1 | -1> = { _id: -1 };
        if (query.sort) {
          try {
            sort = JSON.parse(query.sort);
          } catch {
            return apiError(reply, 400, 'Sort must be valid JSON');
          }
        }

        // Parse projection (JSON string)
        let projection: Record<string, number> | undefined;
        if (query.projection) {
          try {
            projection = JSON.parse(query.projection);
          } catch {
            return apiError(reply, 400, 'Projection must be valid JSON');
          }
        }

        const [documents, total] = await Promise.all([
          col.find(filter, { projection }).sort(sort).skip(skip).limit(limit).toArray(),
          col.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        return apiResponse(reply, 200, {
          documents,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch documents');
      }
    },
  );

  // ── GET /api/db-explorer/:slug/:collection/documents/:documentId ─
  // Returns a single document by _id (readonly).
  fastify.get<{ Params: DocumentParams }>(
    '/:slug/:collection/documents/:documentId',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug, collection, documentId } = request.params as DocumentParams;

      try {
        const conn = getTenantConnection(slug);
        const db = conn.db;
        if (!db) {
          return apiError(reply, 404, `Database for tenant '${slug}' not found`);
        }

        const col = db.collection(collection);

        // Try ObjectId first, fallback to string _id
        let doc;
        try {
          const { ObjectId } = mongoose.Types;
          doc = await col.findOne({ _id: new ObjectId(documentId) });
        } catch {
          doc = await col.findOne({ _id: documentId as unknown as mongoose.Types.ObjectId });
        }

        if (!doc) {
          return apiError(reply, 404, 'Document not found');
        }

        return apiResponse(reply, 200, doc);
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch document');
      }
    },
  );

  // ── GET /api/db-explorer/:slug/:collection/indexes ───────
  // Returns index details for a specific collection.
  fastify.get<{ Params: CollectionParams }>(
    '/:slug/:collection/indexes',
    { preHandler: [authGuard, platformGuard('platform_tenants', 'read')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug, collection } = request.params as CollectionParams;

      try {
        const conn = getTenantConnection(slug);
        const db = conn.db;
        if (!db) {
          return apiError(reply, 404, `Database for tenant '${slug}' not found`);
        }

        const col = db.collection(collection);
        const indexes = await col.indexes();

        return apiResponse(reply, 200, {
          collection,
          indexes: indexes.map((idx) => ({
            name: idx.name,
            key: idx.key,
            unique: !!idx.unique,
            sparse: !!idx.sparse,
            background: !!idx.background,
            ...(idx.expireAfterSeconds !== undefined && { ttl: idx.expireAfterSeconds }),
            ...(idx.partialFilterExpression && { partialFilter: idx.partialFilterExpression }),
          })),
          total: indexes.length,
        });
      } catch (_err) {
        return apiError(reply, 500, 'Failed to fetch indexes');
      }
    },
  );
}

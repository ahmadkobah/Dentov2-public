import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { apiResponse, apiError } from '../../../utils/api-response.js';
import { authGuard } from '../../../tenant/middleware/index.js';
import { platformGuard } from '../../middleware/index.js';
import { createStorageTierSchema, updateStorageTierSchema } from '@dento/shared';
import { StorageTier } from '../../models/storage-tier.model.js';
import { Tenant } from '../../models/tenant.model.js';

/**
 * Storage Tier Routes â€” Platform CRUD for storage plans
 *
 * Endpoints:
 *   GET    /                        â€” List all tiers
 *   POST   /                        â€” Create tier
 *   PATCH  /:id                     â€” Update tier
 *   DELETE /:id                     â€” Deactivate tier
 *   PUT    /:id/region-prices       â€” Replace region prices for a tier
 */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export async function storageTierRoutes(fastify: FastifyInstance): Promise<void> {
  // â”€â”€ GET / â€” List all tiers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  fastify.get(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'read')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tiers = await StorageTier.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

        return apiResponse(reply, 200, tiers);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch storage tiers';
        return apiError(reply, 500, message);
      }
    },
  );

  // â”€â”€ POST / â€” Create tier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  fastify.post(
    '/',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let parsed;
      try {
        parsed = createStorageTierSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      try {
        const slug = generateSlug(parsed.name);
        const existing = await StorageTier.findOne({ slug });
        if (existing) {
          return apiError(reply, 409, `A storage tier with slug "${slug}" already exists`);
        }

        const tier = await StorageTier.create({
          ...parsed,
          slug,
          isDefault: false,
        });

        return apiResponse(reply, 201, tier.toObject(), 'Storage tier created');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create storage tier';
        return apiError(reply, 500, message);
      }
    },
  );

  // â”€â”€ PATCH /:id â€” Update tier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  fastify.patch(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      let parsed;
      try {
        parsed = updateStorageTierSchema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      try {
        const tier = await StorageTier.findById(id);
        if (!tier) {
          return apiError(reply, 404, 'Storage tier not found');
        }

        // If changing storageLimitGB, validate no tenant is over new limit
        if (parsed.storageLimitGB && parsed.storageLimitGB !== tier.storageLimitGB) {
          const newLimitMB = parsed.storageLimitGB * 1024;
          const overLimitCount = await Tenant.countDocuments({
            storageTierId: tier._id,
            storageUsedMB: { $gt: newLimitMB },
          });
          if (overLimitCount > 0) {
            return apiError(
              reply,
              409,
              `Cannot reduce tier size: ${overLimitCount} tenant(s) already exceed ${parsed.storageLimitGB} GB`,
            );
          }

          // Update all tenants on this tier to new limit
          await Tenant.updateMany(
            { storageTierId: tier._id },
            { $set: { storageLimitMB: newLimitMB } },
          );
        }

        const updated = await StorageTier.findByIdAndUpdate(
          id,
          { $set: parsed },
          { new: true },
        ).lean();

        return apiResponse(reply, 200, updated, 'Storage tier updated');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update storage tier';
        return apiError(reply, 500, message);
      }
    },
  );

  // â”€â”€ DELETE /:id â€” Deactivate tier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  fastify.delete(
    '/:id',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const tier = await StorageTier.findById(id);
        if (!tier) {
          return apiError(reply, 404, 'Storage tier not found');
        }

        if (tier.isDefault) {
          return apiError(reply, 400, 'Cannot delete the default tier');
        }

        const assignedCount = await Tenant.countDocuments({ storageTierId: tier._id });
        if (assignedCount > 0) {
          return apiError(
            reply,
            409,
            `Cannot delete: ${assignedCount} tenant(s) are assigned to this tier. Reassign them first.`,
          );
        }

        await StorageTier.findByIdAndUpdate(id, { $set: { isActive: false } });

        return apiResponse(reply, 200, null, 'Storage tier deactivated');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete storage tier';
        return apiError(reply, 500, message);
      }
    },
  );

  // â”€â”€ PUT /:id/region-prices â€” Replace region prices â”€â”€â”€â”€â”€â”€

  fastify.put(
    '/:id/region-prices',
    { preHandler: [authGuard, platformGuard('platform_settings', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const schema = z.object({
        regionPrices: z.array(
          z.object({
            countryCode: z.string().min(2).max(2).toUpperCase(),
            price: z.number().min(0),
            currency: z.string().min(3).max(3),
          }),
        ),
      });

      let parsed;
      try {
        parsed = schema.parse(request.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return apiError(reply, 400, 'Validation failed', err.issues);
        }
        return apiError(reply, 400, 'Invalid request body');
      }

      try {
        const tier = await StorageTier.findById(id);
        if (!tier) {
          return apiError(reply, 404, 'Storage tier not found');
        }

        const updated = await StorageTier.findByIdAndUpdate(
          id,
          { $set: { regionPrices: parsed.regionPrices } },
          { new: true },
        ).lean();

        return apiResponse(reply, 200, updated, 'Region prices updated');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update region prices';
        return apiError(reply, 500, message);
      }
    },
  );
}

import { describe, expect, it, vi } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Simulate a transient DB outage in the tenant override lookup: findOne().lean()
// rejects. getTenantOverride must fail CLOSED — roleGuard must deny (503) rather
// than silently fall back to the (more permissive) hardcoded defaults (#47).
vi.mock('../models/role-permissions.model.js', () => ({
  getRolePermissionsModel: () => ({
    findOne: () => ({
      lean: () => Promise.reject(new Error('simulated DB outage')),
    }),
  }),
}));

// Imported AFTER the mock is registered (vi.mock is hoisted).
import { roleGuard } from './role-guard.js';

describe('roleGuard fail-closed on override DB error (#47)', () => {
  it('denies with 503 instead of granting the permissive default', async () => {
    const guard = roleGuard('patients', 'read');

    // A dentist HAS patients:read in the default matrix — so a naive fallback to
    // defaults on a DB error would GRANT. The guard must instead reject with 503.
    const request = {
      user: { role: 'dentist' },
      tenantDb: {}, // truthy → the override lookup actually runs
      tenantSlug: 'acme-dental',
    } as unknown as FastifyRequest;

    await expect(guard(request, {} as FastifyReply)).rejects.toMatchObject({
      statusCode: 503,
      code: 'PERMISSION_LOOKUP_FAILED',
    });
  });
});

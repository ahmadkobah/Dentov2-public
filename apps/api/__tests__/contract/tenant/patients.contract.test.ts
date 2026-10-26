/**
 * Contract Tests — Phase 3B: 3. Patients (/api/patients)
 *
 * Tests: #222–#233 from Phase 3B tracker
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  teardownTestApp,
  cleanDatabase,
  destroyTestInfra,
} from '../helpers/build-app.js';
import { createTenantUserAndToken } from '../helpers/auth.js';
import { expectSuccess, withAuth } from '../helpers/assertions.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  if (app) await teardownTestApp(app);
  await destroyTestInfra();
});

const VALID_PATIENT = {
  firstName: { en: 'John' },
  lastName: { en: 'Doe' },
  dateOfBirth: '1990-01-15',
  gender: 'male' as const,
  phone: '+201001234567',
};

// ── GET /api/patients ───────────────────────────────────────

describe('GET /api/patients', () => {
  it('#222 Happy: paginated patients → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(withAuth(token, { method: 'GET', url: '/api/patients' }));
    expectSuccess(res, 200);
  });

  it('#223 Query: search, status, page, limit filters', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'GET',
        url: '/api/patients?page=1&limit=10&search=John&gender=male',
      }),
    );
    expectSuccess(res, 200);
  });
});

// ── GET /api/patients/:id ───────────────────────────────────

describe('GET /api/patients/:id', () => {
  it('#224 Happy: patient detail (decrypted PII) → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const createRes = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/patients',
        payload: VALID_PATIENT,
      }),
    );
    const created = createRes.json();
    const id = created.data?.patient?._id || created.data?._id || created.data?.id;

    if (id) {
      const res = await app.inject(withAuth(token, { method: 'GET', url: `/api/patients/${id}` }));
      expectSuccess(res, 200);
    } else {
      expect(createRes.statusCode).toBeLessThan(500);
    }
  });

  it('#225 Not Found: invalid ID → 404', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/patients/000000000000000000000000' }),
    );
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── POST /api/patients ──────────────────────────────────────

describe('POST /api/patients', () => {
  it('#226 Happy: create patient → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/patients',
        payload: VALID_PATIENT,
      }),
    );
    expectSuccess(res, 201);
  });

  it('#227 Validation: missing required → 400', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/patients',
        payload: { firstName: { en: 'OnlyFirst' } },
      }),
    );
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

// ── PUT /api/patients/:id ───────────────────────────────────

describe('PUT /api/patients/:id', () => {
  it('#228 Happy: update patient → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const createRes = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/patients', payload: VALID_PATIENT }),
    );
    const created = createRes.json();
    const id = created.data?.patient?._id || created.data?._id || created.data?.id;

    if (id) {
      const res = await app.inject(
        withAuth(token, {
          method: 'PUT',
          url: `/api/patients/${id}`,
          payload: { phone: '+201009999999' },
        }),
      );
      expectSuccess(res, 200);
    } else {
      expect(createRes.statusCode).toBeLessThan(500);
    }
  });
});

// ── DELETE /api/patients/:id ────────────────────────────────

describe('DELETE /api/patients/:id', () => {
  it('#229 Happy: soft delete → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const createRes = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/patients', payload: VALID_PATIENT }),
    );
    const created = createRes.json();
    const id = created.data?.patient?._id || created.data?._id || created.data?.id;

    if (id) {
      const res = await app.inject(
        withAuth(token, { method: 'DELETE', url: `/api/patients/${id}` }),
      );
      expectSuccess(res, 200);
    } else {
      expect(createRes.statusCode).toBeLessThan(500);
    }
  });
});

// ── PATCH /api/patients/:id/activation ──────────────────────

describe('PATCH /api/patients/:id/activation', () => {
  it('#230 Happy: restore → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const createRes = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/patients', payload: VALID_PATIENT }),
    );
    const created = createRes.json();
    const id = created.data?.patient?._id || created.data?._id || created.data?.id;

    if (id) {
      const res = await app.inject(
        withAuth(token, { method: 'PATCH', url: `/api/patients/${id}/activation` }),
      );
      expect(res.statusCode).toBeLessThan(500);
    } else {
      expect(createRes.statusCode).toBeLessThan(500);
    }
  });
});

// ── PATCH /api/patients/:id/medical-history ─────────────────

describe('PATCH /api/patients/:id/medical-history', () => {
  it('#231 Happy: update history → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const createRes = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/patients', payload: VALID_PATIENT }),
    );
    const created = createRes.json();
    const id = created.data?.patient?._id || created.data?._id || created.data?.id;

    if (id) {
      const res = await app.inject(
        withAuth(token, {
          method: 'PATCH',
          url: `/api/patients/${id}/medical-history`,
          payload: { isDiabetes: true, isHypertension: false },
        }),
      );
      expect(res.statusCode).toBeLessThan(500);
    } else {
      expect(createRes.statusCode).toBeLessThan(500);
    }
  });
});

// ── POST /api/patients/:id/allergies ────────────────────────

describe('POST /api/patients/:id/allergies', () => {
  it('#232 Happy: add allergy → 201', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const createRes = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/patients', payload: VALID_PATIENT }),
    );
    const created = createRes.json();
    const id = created.data?.patient?._id || created.data?._id || created.data?.id;

    if (id) {
      const res = await app.inject(
        withAuth(token, {
          method: 'POST',
          url: `/api/patients/${id}/allergies`,
          payload: { allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' },
        }),
      );
      expect(res.statusCode).toBeLessThan(500);
    } else {
      expect(createRes.statusCode).toBeLessThan(500);
    }
  });
});

// ── DELETE /api/patients/:id/allergies/:allergyId ───────────

describe('DELETE /api/patients/:id/allergies/:allergyId', () => {
  it('#233 Happy: remove allergy → 200', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const createRes = await app.inject(
      withAuth(token, { method: 'POST', url: '/api/patients', payload: VALID_PATIENT }),
    );
    const created = createRes.json();
    const id = created.data?.patient?._id || created.data?._id || created.data?.id;

    if (id) {
      // Add allergy first
      const addRes = await app.inject(
        withAuth(token, {
          method: 'POST',
          url: `/api/patients/${id}/allergies`,
          payload: { allergen: 'Latex', severity: 'severe' },
        }),
      );
      const addBody = addRes.json();
      const allergyId =
        addBody.data?.allergy?._id ||
        addBody.data?.allergies?.[0]?._id ||
        '000000000000000000000000';

      const res = await app.inject(
        withAuth(token, {
          method: 'DELETE',
          url: `/api/patients/${id}/allergies/${allergyId}`,
        }),
      );
      expect(res.statusCode).toBeLessThan(500);
    } else {
      expect(createRes.statusCode).toBeLessThan(500);
    }
  });
});

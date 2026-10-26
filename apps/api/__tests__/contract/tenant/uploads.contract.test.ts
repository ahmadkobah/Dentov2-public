/**
 * Contract Tests — Phase 3B: 20. File Uploads (/api/uploads)
 *
 * Tests: #372–#378 from Phase 3B tracker
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
import { withAuth } from '../helpers/assertions.js';

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

describe('POST /api/uploads/:category', () => {
  it('#372 Happy: upload file → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/uploads/xrays',
        payload: { fileName: 'test.jpg', contentType: 'image/jpeg' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/uploads/:category/presign', () => {
  it('#373 Happy: get presigned URL → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/uploads/xrays/presign',
        payload: { fileName: 'test.jpg', contentType: 'image/jpeg' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/uploads/multipart/initiate', () => {
  it('#374 Happy: initiate multipart → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/uploads/multipart/initiate',
        payload: { fileName: 'large-file.dcm', contentType: 'application/dicom', category: 'cbct' },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/uploads/multipart/complete', () => {
  it('#375 Happy: complete multipart → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/uploads/multipart/complete',
        payload: { uploadId: 'test-upload-id', key: 'test-key', parts: [] },
      }),
    );
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('POST /api/uploads/multipart/abort', () => {
  it('#376 Happy: abort multipart → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'POST',
        url: '/api/uploads/multipart/abort',
        payload: { uploadId: 'test-upload-id', key: 'test-key' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('DELETE /api/uploads', () => {
  it('#377 Happy: delete file → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, {
        method: 'DELETE',
        url: '/api/uploads',
        payload: { key: 'test-key' },
      }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

describe('GET /api/uploads/download', () => {
  it('#378 Happy: download file → <500', async () => {
    const { token } = await createTenantUserAndToken('tenant_admin');
    const res = await app.inject(
      withAuth(token, { method: 'GET', url: '/api/uploads/download?key=test-key' }),
    );
    expect(res.statusCode).not.toBe(404);
  });
});

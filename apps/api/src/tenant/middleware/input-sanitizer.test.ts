import { describe, expect, it } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { inputSanitizer } from './input-sanitizer.js';

function makeReq(body: unknown, query?: unknown): FastifyRequest {
  return { body, query } as unknown as FastifyRequest;
}
const reply = {} as FastifyReply;

describe('inputSanitizer (#46 — no value-level $ stripping)', () => {
  it('preserves legitimate $-leading string VALUES verbatim', async () => {
    const req = makeReq({ note: '$100 owed', password: '$ecretP@ss' });
    await inputSanitizer(req, reply);
    expect(req.body).toEqual({ note: '$100 owed', password: '$ecretP@ss' });
  });

  it('preserves a $-leading value nested in arrays/objects', async () => {
    const req = makeReq({ items: ['$5', { label: '$discount' }] });
    await inputSanitizer(req, reply);
    expect(req.body).toEqual({ items: ['$5', { label: '$discount' }] });
  });

  it('still strips a nested $gt operator KEY (NoSQL injection blocked at key level)', async () => {
    const req = makeReq({ age: { $gt: 0 }, name: 'ok' });
    await inputSanitizer(req, reply);
    // The dangerous $gt key is removed entirely; safe siblings survive.
    expect(req.body).toEqual({ age: {}, name: 'ok' });
  });

  it('still strips a top-level operator KEY', async () => {
    const req = makeReq({ $where: 'return true', keep: 'value' });
    await inputSanitizer(req, reply);
    expect(req.body).toEqual({ keep: 'value' });
  });
});

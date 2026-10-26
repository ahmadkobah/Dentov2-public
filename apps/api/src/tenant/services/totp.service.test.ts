import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

// In-memory stand-in for the platform User model. `updateOne` faithfully
// evaluates the anti-replay `$or` guard against the stored step, so this test
// exercises the real filter logic used by validateLogin (#68).
let storedSecret = '';
let lastTotpStep: number | null = null;

interface UpdateFilter {
  $or?: Array<Record<string, unknown>>;
}
interface UpdateDoc {
  $set: { lastTotpStep: number };
}

vi.mock('../../platform/models/index.js', () => ({
  User: {
    findById: () => ({
      select: () =>
        Promise.resolve({
          twoFactorEnabled: true,
          twoFactorSecret: storedSecret,
        }),
    }),
    updateOne: vi.fn(async (filter: UpdateFilter, update: UpdateDoc) => {
      const target = update.$set.lastTotpStep;
      const conditions = filter.$or ?? [];
      const matches = conditions.some((cond) => {
        if (!('lastTotpStep' in cond)) return false;
        const c = cond.lastTotpStep as unknown;
        if (c === null) return lastTotpStep === null;
        if (
          c &&
          typeof c === 'object' &&
          '$exists' in c &&
          (c as { $exists: boolean }).$exists === false
        ) {
          return lastTotpStep === undefined;
        }
        if (c && typeof c === 'object' && '$lt' in c) {
          return lastTotpStep != null && lastTotpStep < (c as { $lt: number }).$lt;
        }
        return false;
      });
      if (matches) {
        lastTotpStep = target;
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }),
  },
}));

// Imported AFTER the mock is registered (vi.mock is hoisted).
import { TotpService } from './totp.service.js';

const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });

describe('TotpService.validateLogin anti-replay (#68)', () => {
  beforeEach(() => {
    lastTotpStep = null;
    storedSecret = totp.generateSecret();
  });

  it('accepts a fresh code once, then rejects the SAME code as a replay', async () => {
    const svc = new TotpService();
    const code = await totp.generate({ secret: storedSecret });

    await expect(svc.validateLogin('user-1', code)).resolves.toBe(true);
    // Same code, still inside its validity window → must be rejected as a replay.
    await expect(svc.validateLogin('user-1', code)).resolves.toBe(false);
  });

  it('rejects a wrong (well-formed) code without consuming a step', async () => {
    const svc = new TotpService();
    // Build the set of codes valid across the tolerance window, then pick a
    // 6-digit code that is NOT in it — deterministically wrong, no flake.
    const nowSec = Math.floor(Date.now() / 1000);
    const period = 30;
    const validCodes = new Set<string>();
    validCodes.add(await totp.generate({ secret: storedSecret })); // real current time
    for (let drift = -3; drift <= 3; drift++) {
      validCodes.add(await totp.generate({ secret: storedSecret, time: nowSec + drift * period }));
    }
    let wrong = '';
    for (let n = 0; n < 1_000_000; n++) {
      const candidate = String(n).padStart(6, '0');
      if (!validCodes.has(candidate)) {
        wrong = candidate;
        break;
      }
    }

    await expect(svc.validateLogin('user-1', wrong)).resolves.toBe(false);
    expect(lastTotpStep).toBeNull();
  });
});

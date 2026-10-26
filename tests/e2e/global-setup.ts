/**
 * Playwright global setup — clears Redis rate-limit / brute-force keys
 * so E2E auth flows aren't blocked by leftover state from prior runs.
 */
import { execSync } from 'node:child_process';

function flushRedisRateLimits() {
  const patterns = ['fastify-rate-limit-*', 'auth:attempts:*', 'auth:blocked:*'];

  for (const pattern of patterns) {
    try {
      const result = execSync(
        `docker exec dento-redis redis-cli --no-auth-warning KEYS "${pattern}"`,
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();

      if (!result) continue;

      const keys = result.split('\n').filter(Boolean);
      if (keys.length > 0) {
        const escaped = keys.map((k) => `"${k}"`).join(' ');
        execSync(`docker exec dento-redis redis-cli DEL ${escaped}`, {
          encoding: 'utf-8',
          timeout: 5000,
        });
        console.log(`[global-setup] Cleared ${keys.length} keys matching ${pattern}`);
      }
    } catch {
      // Ignore — Docker/Redis may not be running via docker exec
    }
  }
}

export default async function globalSetup() {
  try {
    flushRedisRateLimits();
  } catch (err) {
    console.warn('[global-setup] Could not clear Redis keys:', (err as Error).message);
  }
}

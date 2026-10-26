/**
 * Tailscale API Client — Ephemeral Auth Key + ACL Grants
 *
 * Per DENTO_V2_MASTER_PLAN §9 — Support Session Secure Tunnel
 * Per V2_DECISION_LOG §6.1 — Tailscale integration for support sessions
 *
 * Creates time-limited, scoped Tailscale auth keys for support sessions.
 * Keys are single-use, ephemeral, and auto-expire with the session.
 */

import { env } from './env.js';
import { logger } from '../utils/logger.js';

// ── Types ───────────────────────────────────────────────────

interface TailscaleAuthKey {
  id: string;
  key: string;
  created: string;
  expires: string;
  capabilities: {
    devices: {
      create: {
        reusable: boolean;
        ephemeral: boolean;
        preauthorized: boolean;
        tags: string[];
      };
    };
  };
}

export interface TailscaleKeyResult {
  authKeyId: string;
  authKey: string;
  expiresAt: string;
}

// ── Configuration ───────────────────────────────────────────

const TAILSCALE_API_BASE = 'https://api.tailscale.com/api/v2';
const SUPPORT_SESSION_TAG = 'tag:dento-support';
const DEFAULT_KEY_EXPIRY_SECONDS = 3600; // 1 hour — matches impersonation session

// ── API Helpers ─────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  if (!env.TAILSCALE_API_KEY) {
    throw new Error('TAILSCALE_API_KEY is not configured');
  }
  return {
    Authorization: `Bearer ${env.TAILSCALE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function getTailnet(): string {
  if (!env.TAILSCALE_TAILNET) {
    throw new Error('TAILSCALE_TAILNET is not configured');
  }
  return env.TAILSCALE_TAILNET;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Check if Tailscale integration is configured.
 */
export function isTailscaleConfigured(): boolean {
  return !!(env.TAILSCALE_API_KEY && env.TAILSCALE_TAILNET);
}

/**
 * Create an ephemeral, single-use Tailscale auth key for a support session.
 * The key is tagged with `tag:dento-support` for ACL scoping.
 *
 * @param sessionId — Support session ID for logging
 * @param expirySeconds — Key TTL in seconds (default: 1 hour)
 */
export async function createEphemeralAuthKey(
  sessionId: string,
  expirySeconds: number = DEFAULT_KEY_EXPIRY_SECONDS,
): Promise<TailscaleKeyResult> {
  const tailnet = getTailnet();
  const url = `${TAILSCALE_API_BASE}/tailnet/${tailnet}/keys`;

  const body = {
    capabilities: {
      devices: {
        create: {
          reusable: false,
          ephemeral: true,
          preauthorized: true,
          tags: [SUPPORT_SESSION_TAG],
        },
      },
    },
    expirySeconds,
    description: `Dento support session: ${sessionId}`,
  };

  logger.info({ sessionId, expirySeconds }, 'Creating Tailscale ephemeral auth key');

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { sessionId, status: response.status, error: errorText },
      'Tailscale auth key creation failed',
    );
    throw new Error(`Tailscale API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as TailscaleAuthKey;

  logger.info(
    { sessionId, authKeyId: data.id, expires: data.expires },
    'Tailscale ephemeral auth key created',
  );

  return {
    authKeyId: data.id,
    authKey: data.key,
    expiresAt: data.expires,
  };
}

/**
 * Delete/revoke a Tailscale auth key (e.g., when ending a support session early).
 *
 * @param authKeyId — The Tailscale key ID to revoke
 * @param sessionId — Support session ID for logging
 */
export async function revokeAuthKey(authKeyId: string, sessionId: string): Promise<void> {
  const tailnet = getTailnet();
  const url = `${TAILSCALE_API_BASE}/tailnet/${tailnet}/keys/${authKeyId}`;

  logger.info({ sessionId, authKeyId }, 'Revoking Tailscale auth key');

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    logger.warn(
      { sessionId, authKeyId, status: response.status, error: errorText },
      'Tailscale key revocation returned non-OK status',
    );
    // Don't throw — key may have already expired, and session end should still succeed
  } else {
    logger.info({ sessionId, authKeyId }, 'Tailscale auth key revoked');
  }
}

/**
 * Get the status of a Tailscale auth key.
 */
export async function getAuthKeyStatus(
  authKeyId: string,
): Promise<{ valid: boolean; expires: string } | null> {
  const tailnet = getTailnet();
  const url = `${TAILSCALE_API_BASE}/tailnet/${tailnet}/keys/${authKeyId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    logger.warn({ authKeyId, status: response.status }, 'Failed to fetch Tailscale key status');
    return null;
  }

  const data = (await response.json()) as TailscaleAuthKey;
  return {
    valid: new Date(data.expires) > new Date(),
    expires: data.expires,
  };
}

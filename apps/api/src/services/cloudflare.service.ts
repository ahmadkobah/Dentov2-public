/**
 * Cloudflare DNS Integration Service
 *
 * Manages DNS records for tenant custom domains via the Cloudflare API v4.
 * Used by:
 *  - Domain routes (create/delete records when tenants add/remove custom domains)
 *  - SSL expiry cron (verify SSL status)
 *
 * Requires env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID
 */

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const CF_API = 'https://api.cloudflare.com/client/v4';

// ── Helpers ─────────────────────────────────────────────────

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/** Whether Cloudflare integration is configured */
export function isCloudflareConfigured(): boolean {
  return !!(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID);
}

// ── Types ───────────────────────────────────────────────────

interface CFDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface CFAPIResponse<T> {
  success: boolean;
  result: T;
  errors: Array<{ code: number; message: string }>;
}

// ── DNS Record Operations ───────────────────────────────────

/**
 * Create a DNS record in the Cloudflare zone.
 *
 * @returns The created record ID, or null on failure
 */
export async function createDNSRecord(params: {
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
}): Promise<string | null> {
  if (!isCloudflareConfigured()) {
    logger.warn('Cloudflare not configured — skipping DNS record creation');
    return null;
  }

  try {
    const response = await fetch(`${CF_API}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        type: params.type,
        name: params.name,
        content: params.content,
        proxied: params.proxied ?? true,
        ttl: params.ttl ?? 1, // 1 = auto
      }),
    });

    const data = (await response.json()) as CFAPIResponse<CFDNSRecord>;

    if (!data.success) {
      logger.error(
        { errors: data.errors, name: params.name },
        'Cloudflare DNS record creation failed',
      );
      return null;
    }

    logger.info(
      { recordId: data.result.id, name: params.name, type: params.type },
      'Cloudflare DNS record created',
    );
    return data.result.id;
  } catch (error) {
    logger.error({ error, name: params.name }, 'Cloudflare DNS record creation error');
    return null;
  }
}

/**
 * Delete a DNS record by ID.
 */
export async function deleteDNSRecord(recordId: string): Promise<boolean> {
  if (!isCloudflareConfigured()) {
    logger.warn('Cloudflare not configured — skipping DNS record deletion');
    return false;
  }

  try {
    const response = await fetch(
      `${CF_API}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
      {
        method: 'DELETE',
        headers: headers(),
      },
    );

    const data = (await response.json()) as CFAPIResponse<{ id: string }>;

    if (!data.success) {
      logger.error({ errors: data.errors, recordId }, 'Cloudflare DNS record deletion failed');
      return false;
    }

    logger.info({ recordId }, 'Cloudflare DNS record deleted');
    return true;
  } catch (error) {
    logger.error({ error, recordId }, 'Cloudflare DNS record deletion error');
    return false;
  }
}

/**
 * Get a DNS record by ID.
 */
export async function getDNSRecord(recordId: string): Promise<CFDNSRecord | null> {
  if (!isCloudflareConfigured()) return null;

  try {
    const response = await fetch(
      `${CF_API}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
      {
        method: 'GET',
        headers: headers(),
      },
    );

    const data = (await response.json()) as CFAPIResponse<CFDNSRecord>;
    return data.success ? data.result : null;
  } catch {
    return null;
  }
}

/**
 * List all DNS records matching a name (optionally filter by type).
 */
export async function listDNSRecords(
  name: string,
  type?: 'CNAME' | 'A' | 'TXT',
): Promise<CFDNSRecord[]> {
  if (!isCloudflareConfigured()) return [];

  try {
    const params = new URLSearchParams({ name });
    if (type) params.set('type', type);

    const response = await fetch(
      `${CF_API}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records?${params.toString()}`,
      {
        method: 'GET',
        headers: headers(),
      },
    );

    const data = (await response.json()) as CFAPIResponse<CFDNSRecord[]>;
    return data.success ? data.result : [];
  } catch {
    return [];
  }
}

/**
 * Update an existing DNS record.
 */
export async function updateDNSRecord(
  recordId: string,
  params: {
    type?: 'CNAME' | 'A' | 'TXT';
    name?: string;
    content?: string;
    proxied?: boolean;
    ttl?: number;
  },
): Promise<boolean> {
  if (!isCloudflareConfigured()) return false;

  try {
    const response = await fetch(
      `${CF_API}/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
      {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(params),
      },
    );

    const data = (await response.json()) as CFAPIResponse<CFDNSRecord>;

    if (!data.success) {
      logger.error({ errors: data.errors, recordId }, 'Cloudflare DNS record update failed');
      return false;
    }

    logger.info({ recordId }, 'Cloudflare DNS record updated');
    return true;
  } catch (error) {
    logger.error({ error, recordId }, 'Cloudflare DNS record update error');
    return false;
  }
}

// ── SSL Certificate Status ──────────────────────────────────

interface CFSSLVerification {
  certificate_status: string;
  validation_type: string;
  brand_check: boolean;
  hostname: string;
}

/**
 * Get SSL verification status for a hostname in this zone.
 * Returns certificate_status: "active", "pending", "expired", etc.
 */
export async function getSSLStatus(hostname: string): Promise<{
  status: 'pending' | 'active' | 'expired' | 'error';
  expiresAt: Date | null;
} | null> {
  if (!isCloudflareConfigured()) return null;

  try {
    const response = await fetch(
      `${CF_API}/zones/${env.CLOUDFLARE_ZONE_ID}/ssl/verification?hostname=${encodeURIComponent(hostname)}`,
      {
        method: 'GET',
        headers: headers(),
      },
    );

    const data = (await response.json()) as CFAPIResponse<CFSSLVerification[]>;

    if (!data.success || !data.result.length) {
      return { status: 'pending', expiresAt: null };
    }

    const cert = data.result[0];
    const statusMap: Record<string, 'pending' | 'active' | 'expired' | 'error'> = {
      active: 'active',
      pending_validation: 'pending',
      pending_issuance: 'pending',
      pending_deployment: 'pending',
      expired: 'expired',
    };

    return {
      status: statusMap[cert.certificate_status] ?? 'error',
      expiresAt: null, // Cloudflare auto-renews; expiry tracked via separate certificate endpoint
    };
  } catch (error) {
    logger.error({ error, hostname }, 'Cloudflare SSL status check error');
    return null;
  }
}

// ── Zone Verification ───────────────────────────────────────

/**
 * Verify a hostname's DNS is correctly pointing by doing a DNS lookup.
 * This is a complementary check to Cloudflare's own verification.
 */
export async function verifyDNSPointing(
  hostname: string,
  expectedTarget: string,
): Promise<{ verified: boolean; actual: string[] }> {
  try {
    // Use Cloudflare DoH (DNS over HTTPS) for portable resolution
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=CNAME`,
      {
        headers: { Accept: 'application/dns-json' },
      },
    );

    interface DoHResponse {
      Answer?: Array<{ data: string }>;
    }

    const data = (await response.json()) as DoHResponse;
    const answers = data.Answer?.map((a) => a.data.replace(/\.$/, '')) ?? [];
    const verified = answers.some((a) => a.toLowerCase() === expectedTarget.toLowerCase());

    return { verified, actual: answers };
  } catch {
    return { verified: false, actual: [] };
  }
}

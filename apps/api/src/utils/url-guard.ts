/**
 * SSRF Guard — F-3 / F-6
 *
 * Defends webhook + outbound-fetch surfaces against Server-Side Request
 * Forgery by rejecting URLs whose resolved IPs land in private / loopback /
 * link-local / cloud-metadata ranges, plus a small denylist of known
 * sensitive hostnames.
 *
 * Used at two points (defence-in-depth against TOCTOU):
 *   1. At route-handler validation time (admin enters a URL).
 *   2. Immediately before `fetch(url, ...)` in the dispatcher worker.
 */

import { isIP } from 'node:net';
import dns from 'node:dns/promises';

const BLOCKED_HOSTNAMES = new Set<string>([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  // AWS / GCP / Azure / Oracle / DigitalOcean instance-metadata endpoints
  'metadata.google.internal',
  'metadata',
  'metadata.azure.com',
  'instance-data',
  'instance-data.ec2.internal',
]);

const PORT_ALLOWLIST = new Set<number>([443]);

export class SsrfBlockedError extends Error {
  constructor(
    message: string,
    public readonly reason: 'protocol' | 'port' | 'hostname' | 'private_ip' | 'dns_failure',
  ) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

/** Parse "a.b.c.d" into a 32-bit unsigned int, or null. */
function ipv4ToUint32(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

/** True if an IPv4 address is in any private / loopback / link-local / metadata range. */
function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToUint32(ip);
  if (n === null) return true; // unparseable → treat as unsafe
  // 0.0.0.0/8        — "this network"
  if ((n & 0xff000000) === 0x00000000) return true;
  // 10.0.0.0/8       — RFC1918
  if ((n & 0xff000000) === 0x0a000000) return true;
  // 100.64.0.0/10    — CGNAT
  if ((n & 0xffc00000) === 0x64400000) return true;
  // 127.0.0.0/8      — loopback
  if ((n & 0xff000000) === 0x7f000000) return true;
  // 169.254.0.0/16   — link-local (incl. 169.254.169.254 cloud metadata)
  if ((n & 0xffff0000) === 0xa9fe0000) return true;
  // 172.16.0.0/12    — RFC1918
  if ((n & 0xfff00000) === 0xac100000) return true;
  // 192.0.0.0/24     — IETF assignments
  if ((n & 0xffffff00) === 0xc0000000) return true;
  // 192.0.2.0/24     — TEST-NET-1
  if ((n & 0xffffff00) === 0xc0000200) return true;
  // 192.168.0.0/16   — RFC1918
  if ((n & 0xffff0000) === 0xc0a80000) return true;
  // 198.18.0.0/15    — benchmark
  if ((n & 0xfffe0000) === 0xc6120000) return true;
  // 198.51.100.0/24  — TEST-NET-2
  if ((n & 0xffffff00) === 0xc6336400) return true;
  // 203.0.113.0/24   — TEST-NET-3
  if ((n & 0xffffff00) === 0xcb007100) return true;
  // 224.0.0.0/4      — multicast
  if ((n & 0xf0000000) === 0xe0000000) return true;
  // 240.0.0.0/4      — reserved (incl. 255.255.255.255 broadcast)
  if ((n & 0xf0000000) === 0xf0000000) return true;
  return false;
}

/** True if an IPv6 address is loopback, link-local, ULA, or unspecified. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // ::1 loopback / :: unspecified
  if (lower === '::1' || lower === '::') return true;
  // IPv4-mapped (::ffff:a.b.c.d) — recurse on the embedded v4
  const v4mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4mapped) return isPrivateIPv4(v4mapped[1]);
  // IPv4-compatible (deprecated, ::a.b.c.d)
  const v4compat = lower.match(/^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4compat) return isPrivateIPv4(v4compat[1]);
  // fe80::/10 link-local
  if (/^fe[89ab][0-9a-f]?:/.test(lower)) return true;
  // fc00::/7 unique-local
  if (/^f[cd][0-9a-f]{0,2}:/.test(lower)) return true;
  // ff00::/8 multicast
  if (lower.startsWith('ff')) return true;
  return false;
}

function isPrivateIP(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // not an IP at all → unsafe
}

/**
 * Reject the URL with a `SsrfBlockedError` unless it points at a public,
 * HTTPS endpoint on an allowlisted port and resolves only to public IPs.
 *
 * Call this:
 *  1. Before persisting an admin-supplied webhook URL (validation).
 *  2. Again right before the outbound `fetch(...)` (TOCTOU defence).
 */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError(`Invalid URL: ${rawUrl}`, 'protocol');
  }

  if (parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(
      `Webhook URL must use https:// (got ${parsed.protocol})`,
      'protocol',
    );
  }

  const port = parsed.port ? Number(parsed.port) : 443;
  if (!PORT_ALLOWLIST.has(port)) {
    throw new SsrfBlockedError(`Webhook port ${port} not allowed`, 'port');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) {
    throw new SsrfBlockedError('Webhook URL missing hostname', 'hostname');
  }
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfBlockedError(`Hostname ${hostname} is blocked`, 'hostname');
  }

  // If the hostname is itself a literal IP, check it directly.
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new SsrfBlockedError(`Hostname resolves to a non-public IP: ${hostname}`, 'private_ip');
    }
    return;
  }

  // Resolve via DNS and reject if ANY answer is in a private range.
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    throw new SsrfBlockedError(
      `DNS lookup failed for ${hostname}: ${(err as Error).message}`,
      'dns_failure',
    );
  }

  if (addresses.length === 0) {
    throw new SsrfBlockedError(`No DNS records for ${hostname}`, 'dns_failure');
  }

  for (const { address } of addresses) {
    if (isPrivateIP(address)) {
      throw new SsrfBlockedError(
        `Hostname ${hostname} resolves to non-public IP ${address}`,
        'private_ip',
      );
    }
  }
}

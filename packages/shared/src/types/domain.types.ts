// ── Domain / Custom DNS Types (§12 — Gap G6) ───────────────

export type SSLStatus = 'pending' | 'active' | 'expired' | 'error';
export type DNSRecordType = 'CNAME' | 'A' | 'TXT';

export interface IDNSRecord {
  type: DNSRecordType;
  name: string;
  value: string;
  verified: boolean;
}

/** Shared representation — mirrors platform Domain model */
export interface IDomain {
  _id: string;
  tenantSlug: string;
  customDomain: string;
  dnsVerified: boolean;
  sslStatus: SSLStatus;
  sslExpiresAt: string | null;
  requiredRecords: IDNSRecord[];
  verifiedAt: string | null;
  isActive: boolean;
  cloudflareRecordId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for adding a custom domain */
export interface CreateDomainInput {
  tenantSlug: string;
  customDomain: string;
}

/** Result of a DNS verification check */
export interface DomainVerifyResult {
  domain: string;
  dnsVerified: boolean;
  records: {
    type: DNSRecordType;
    name: string;
    expected: string;
    actual: string | null;
    verified: boolean;
  }[];
  sslStatus: SSLStatus;
  sslExpiresAt: string | null;
}

/** Cloudflare DNS record representation */
export interface CloudflareDNSRecord {
  id: string;
  type: DNSRecordType;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

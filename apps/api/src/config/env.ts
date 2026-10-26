import { z } from 'zod';

const envSchema = z
  .object({
    // ── General ───────────────────────────────────────────────
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),
    SCAN_SAFE_RESPONSES: z.enum(['true', 'false']).default('false'),

    // ── Database ──────────────────────────────────────────────
    MONGODB_URI: z.string().url().default('mongodb://localhost:27017/dento_platform'),
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // ── Auth ──────────────────────────────────────────────────
    PAYLOAD_SECRET: z.string().min(16),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // ── Encryption ────────────────────────────────────────────
    // 64 hex chars (32 bytes) for AES-256-GCM. Optional in dev/test only —
    // enforced as required + length-validated in production by the refine() below.
    ENCRYPTION_MASTER_KEY: z.string().optional(),
    // Separate HMAC key for deterministic search hashes on encrypted PII
    // (e.g. patient.phoneHash, patient.emailHash). MUST be different from
    // ENCRYPTION_MASTER_KEY so a leak of one does not compromise the other.
    SEARCH_HASH_KEY: z.string().optional(),

    // ── 2FA / TOTP ────────────────────────────────────────────
    TOTP_ISSUER: z.string().default('Dento'),

    // ── CORS ──────────────────────────────────────────────────
    CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3002'),

    // ── Portal URLs ───────────────────────────────────────────
    ADMIN_PORTAL_URL: z.string().default('http://localhost:5173'),

    // ── File Storage (Cloudflare R2 / S3) ─────────────────────
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_BUCKET: z.string().default('dento-uploads'),
    S3_BACKUP_BUCKET: z.string().default('dento-backups'),
    R2_PUBLIC_URL: z.string().optional(),

    // ── Email (Resend + SMTP fallback) ────────────────────────
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    // ── SMS (Twilio) ──────────────────────────────────────────
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),

    // ── WhatsApp (Twilio sandbox / Meta Business API) ────────
    TWILIO_WHATSAPP_FROM: z.string().optional(), // e.g. whatsapp:+14155238886
    META_WHATSAPP_PHONE_ID: z.string().optional(),
    META_WHATSAPP_TOKEN: z.string().optional(),
    META_WHATSAPP_VERIFY_TOKEN: z.string().optional(), // Webhook verification token for Meta
    META_WHATSAPP_APP_SECRET: z.string().optional(), // HMAC key for X-Hub-Signature-256 payload validation

    // ── Web Push (VAPID) ──────────────────────────────────────
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_CONTACT_EMAIL: z.string().email().optional(),
    VAPID_SUBJECT: z.string().optional(),

    // ── Payments — Paymob (Egypt) ─────────────────────────────
    PAYMOB_API_KEY: z.string().optional(),
    PAYMOB_CARD_INTEGRATION_ID: z.string().optional(),
    PAYMOB_FAWRY_INTEGRATION_ID: z.string().optional(),
    PAYMOB_WALLET_INTEGRATION_ID: z.string().optional(),
    PAYMOB_VALU_INTEGRATION_ID: z.string().optional(),
    PAYMOB_IFRAME_ID: z.string().optional(),
    PAYMOB_HMAC_SECRET: z.string().optional(),

    // ── Payments — Stripe (International) ─────────────────────
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // ── Monitoring ────────────────────────────────────────────
    SENTRY_DSN: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
    AXIOM_DATASET: z.string().default('dento-logs'),

    // ── Exchange Rates ────────────────────────────────────────
    EXCHANGE_RATE_API_KEY: z.string().optional(), // exchangerate-api.com — free tier OK

    // ── Infrastructure ────────────────────────────────────────
    TAILSCALE_API_KEY: z.string().optional(),
    TAILSCALE_TAILNET: z.string().optional(),
    CLOUDFLARE_API_TOKEN: z.string().optional(),
    CLOUDFLARE_ZONE_ID: z.string().optional(),
    DEPLOY_WEBHOOK_SECRET: z.string().optional(),

    // ── Backup Tools ──────────────────────────────────────────
    MONGODUMP_PATH: z.string().optional(),
    MONGORESTORE_PATH: z.string().optional(),
    SYS_DIAG_TOKEN: z.string().min(32).optional(),
  })
  .strip()
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        const uri = data.MONGODB_URI.toLowerCase();
        return (
          uri.includes('tls=true') || uri.includes('ssl=true') || uri.startsWith('mongodb+srv')
        );
      }
      return true;
    },
    { message: 'MONGODB_URI must use TLS (tls=true, ssl=true, or mongodb+srv://) in production' },
  )
  .refine(
    (data) => {
      if (data.NODE_ENV !== 'production') return true;
      const url = data.REDIS_URL.toLowerCase();
      // Always allowed: TLS or unix socket.
      if (url.startsWith('rediss://') || url.startsWith('unix://')) return true;
      // Allow plain redis:// only for intra-host / private-network targets
      // (docker DNS hostname "redis", localhost, or RFC1918 IPs). Traffic
      // never leaves the docker bridge / host, so plaintext is safe.
      if (url.startsWith('redis://')) {
        try {
          const host = new URL(data.REDIS_URL).hostname;
          if (host === 'redis' || host === 'localhost' || host === '127.0.0.1') return true;
          // RFC1918 private ranges
          if (/^10\./.test(host)) return true;
          if (/^192\.168\./.test(host)) return true;
          if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
        } catch {
          return false;
        }
      }
      return false;
    },
    {
      message:
        'REDIS_URL must use TLS (rediss://), a unix socket, or a private/intra-host target (redis://redis, redis://localhost, or RFC1918) in production.',
      path: ['REDIS_URL'],
    },
  )
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;
    // C-1: HIPAA/GDPR field-level encryption is mandatory in production.
    // 64 hex chars = 32 bytes = AES-256 key. Reject anything shorter or missing.
    if (!data.ENCRYPTION_MASTER_KEY || !/^[0-9a-fA-F]{64}$/.test(data.ENCRYPTION_MASTER_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ENCRYPTION_MASTER_KEY'],
        message:
          'ENCRYPTION_MASTER_KEY is required in production and must be 64 hex chars (32 bytes). Generate with: `openssl rand -hex 32`',
      });
    }
    if (!data.SEARCH_HASH_KEY || data.SEARCH_HASH_KEY.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SEARCH_HASH_KEY'],
        message:
          'SEARCH_HASH_KEY is required in production (>=32 chars). Generate with: `openssl rand -hex 32`',
      });
    }
    if (
      data.SEARCH_HASH_KEY &&
      data.ENCRYPTION_MASTER_KEY &&
      data.SEARCH_HASH_KEY === data.ENCRYPTION_MASTER_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SEARCH_HASH_KEY'],
        message: 'SEARCH_HASH_KEY must differ from ENCRYPTION_MASTER_KEY',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Logger not available during env validation (logger.ts imports env.ts)
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();

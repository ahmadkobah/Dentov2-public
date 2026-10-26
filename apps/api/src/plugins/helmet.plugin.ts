import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import { env } from '../config/env.js';

/**
 * §16.6 — Explicit security header configuration.
 * Every header is set explicitly rather than relying on library defaults.
 *
 * L-2 (CSP tightening):
 *   • `img-src` no longer accepts the entire `https:` scheme — only `'self'`,
 *     `data:`, and the configured R2/S3 public host. Stops third-party tracking
 *     pixels and image-based exfil.
 *   • `report-uri` directs browser violation reports to `/api/csp-report` so
 *     we can spot drift before it becomes an exploit chain.
 *   • `style-src 'unsafe-inline'` is intentionally retained pending the React
 *     runtime nonce migration (deferred).
 */
const helmetPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Build the img-src allow-list. Anything stored on R2/S3 surfaces through
  // the configured public URL, so that's the only external image origin we need.
  const imgSrc: string[] = ["'self'", 'data:'];
  if (env.R2_PUBLIC_URL) {
    try {
      const u = new URL(env.R2_PUBLIC_URL);
      imgSrc.push(`${u.protocol}//${u.host}`);
    } catch {
      // Misconfigured URL — leave imgSrc as just 'self'+data: rather than
      // silently widening the policy to https:.
    }
  }

  await fastify.register(helmet, {
    // HSTS: 2 years, include subdomains, allow preload list
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    // X-Frame-Options: DENY (no framing allowed)
    frameguard: { action: 'deny' },
    // Referrer-Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Content-Security-Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc,
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        // Note: `report-uri` is deprecated in CSP3 in favour of `report-to`,
        // but Safari + older Chromium still honour it, so we keep it.
        reportUri: ['/api/csp-report'],
      },
    },
    // Disabled: API does not serve embedded resources; browsers
    // block cross-origin loads when this is on, breaking admin SPA.
    crossOriginEmbedderPolicy: false,
  });
};

export default fp(helmetPlugin, { name: 'helmet' });

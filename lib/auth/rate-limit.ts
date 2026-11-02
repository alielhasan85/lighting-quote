// lib/auth/rate-limit.ts
/**
 * Fixed-window limits on requests made before sign-in, in Postgres: serverless instances share no memory.
 * Keys are HMACs, so the RateLimit table holds no email or IP. The nightly cleanup deletes finished windows.
 * Reference: .docs/references/AUTH_REFERENCE.md
 */
import 'server-only';

import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/db';

/** The one source of these numbers. */
export const MAGIC_LINK_LIMITS = {
  email: { limit: 3, windowMs: 15 * 60 * 1000 },
  ip: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;

// An IPv6 address is at most 45 characters, with an IPv4 tail.
const IP_FORMAT = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * The caller's IP, or null when the headers hold none. Read from the proxy's headers, never from the form. Vercel
 * overwrites x-forwarded-for, so a client can't choose the first entry.
 */
export function clientIp(headers: Pick<Headers, 'get'>): string | null {
  const ip = (headers.get('x-forwarded-for')?.split(',')[0] ?? headers.get('x-real-ip'))?.trim();
  return ip && IP_FORMAT.test(ip) ? ip : null;
}

function hmac(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return createHmac('sha256', secret).update(value).digest('hex');
}

/**
 * Counts one request and says whether it's within the limit. One atomic statement, so requests arriving together
 * can't read the same count: the row lock orders them, and a window that has passed restarts at 1.
 */
async function consume(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now: Date,
): Promise<boolean> {
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt}::timestamp)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= ${now}::timestamp THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now}::timestamp THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return rows[0].count <= limit;
}

/** Counts one magic-link request against its email and its IP. False once either is over. No IP: the email alone. */
export async function limitMagicLink(email: string, ip: string | null, now = new Date()): Promise<boolean> {
  const results = await Promise.all([
    consume(`ml:e:${hmac(email)}`, MAGIC_LINK_LIMITS.email, now),
    ...(ip ? [consume(`ml:i:${hmac(ip)}`, MAGIC_LINK_LIMITS.ip, now)] : []),
  ]);
  return results.every(Boolean);
}

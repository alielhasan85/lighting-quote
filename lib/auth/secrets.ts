// lib/auth/secrets.ts
/**
 * The environment sign-in and the cleanup job depend on, and the check that guards the cron route.
 * Pure: reads no environment itself, so the tests and instrumentation.ts pass in what they have.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

/** Checked at server start (instrumentation.ts). Each one unset breaks sign-in or the cleanup job only when it's used. */
export const REQUIRED_AUTH_ENV = [
  'AUTH_SECRET',
  'AUTH_GOOGLE_ID',
  'AUTH_GOOGLE_SECRET',
  'AUTH_RESEND_KEY',
  'EMAIL_FROM',
  'CRON_SECRET',
] as const;

/** The required variables that are unset or blank. */
export function missingAuthEnv(env: Record<string, string | undefined>): string[] {
  return REQUIRED_AUTH_ENV.filter((name) => !env[name]?.trim());
}

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * True only for `Bearer <secret>`, which is what Vercel Cron sends. A missing or blank secret refuses everything, so
 * an unset variable can't open the route. Compares digests: same length, so neither the value nor its length leaks.
 */
export function isCronAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  if (!authHeader || !secret?.trim()) return false;
  return timingSafeEqual(digest(authHeader), digest(`Bearer ${secret}`));
}

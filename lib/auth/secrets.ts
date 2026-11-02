// lib/auth/secrets.ts
/**
 * The environment sign-in and the cleanup job depend on, and the check that guards the cron route.
 * Pure: reads no environment itself, so the tests and instrumentation.ts pass in what they have.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

type Env = Record<string, string | undefined>;

/** Sign-in can't work without these, so production refuses to start without them (instrumentation.ts). */
export const REQUIRED_AUTH_ENV = [
  'AUTH_SECRET',
  'AUTH_GOOGLE_ID',
  'AUTH_GOOGLE_SECRET',
  'AUTH_RESEND_KEY',
  'EMAIL_FROM',
] as const;

const unset = (names: readonly string[], env: Env) => names.filter((name) => !env[name]?.trim());

/** The required variables that are unset or blank. */
export function missingAuthEnv(env: Env): string[] {
  return unset(REQUIRED_AUTH_ENV, env);
}

/** What the nightly cleanup needs. Only a warning: without it the cron route refuses everything, and sign-in is fine. */
export function missingCleanupEnv(env: Env): string[] {
  return unset(['CRON_SECRET'], env);
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

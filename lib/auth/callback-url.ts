// lib/auth/callback-url.ts
/**
 * Where a user lands after sign-in. The value arrives in the URL, so anyone can craft a link to
 * /login?callbackUrl=https://evil.com: only a path on this site passes. Pure, so the tests and the guards both use it.
 */

export const LOGIN_PATH = '/login';

const MAX_LENGTH = 2048;

// Browsers strip tabs and newlines out of a URL before reading it, so "/\t/evil.com" would become "//evil.com".
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

/** A same-site path, or `/`. A leading `//` or `/\` is another host to a browser, so both are refused. */
export function safeCallbackUrl(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > MAX_LENGTH || CONTROL_CHARACTER.test(raw)) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

/** The sign-in page, sending the user back to `path` afterwards. */
export function loginUrl(path: string): string {
  return `${LOGIN_PATH}?callbackUrl=${encodeURIComponent(path)}`;
}

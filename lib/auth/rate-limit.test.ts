// lib/auth/rate-limit.test.ts
// The magic-link limits, with Postgres stubbed by a counter per key. The atomic upsert itself is walked by hand
// (.docs/hand-checks/F-1.md); what's proven here is what happens with the count it returns.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { clientIp, limitMagicLink, MAGIC_LINK_LIMITS } from './rate-limit';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: vi.fn() } }));

const EMAIL = 'buyer@example.com';
const IP = '203.0.113.7';

/** Every key the limiter consumed, in order. */
let keys: string[];

/** Stands in for the upsert: counts per key and returns the count. The key is the first value in the SQL. */
beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', 'test-secret');
  keys = [];
  const counts = new Map<string, number>();
  vi.mocked(prisma.$queryRaw).mockReset();
  vi.mocked(prisma.$queryRaw).mockImplementation(((_sql: TemplateStringsArray, key: string) => {
    keys.push(key);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return Promise.resolve([{ count: counts.get(key) }]);
  }) as unknown as typeof prisma.$queryRaw);
});

/** Sends `n` links, each for a different email, so only the IP limit can refuse them. */
async function sendFromSameIp(n: number): Promise<boolean[]> {
  const results: boolean[] = [];
  for (let i = 0; i < n; i++) results.push(await limitMagicLink(`user${i}@example.com`, IP));
  return results;
}

/** Sends `n` links for one email, each from a different IP, so only the email limit can refuse them. */
async function sendForSameEmail(n: number): Promise<boolean[]> {
  const results: boolean[] = [];
  for (let i = 0; i < n; i++) results.push(await limitMagicLink(EMAIL, `203.0.113.${i}`));
  return results;
}

describe('MAGIC_LINK_LIMITS', () => {
  it('holds the numbers the founder decided', () => {
    expect(MAGIC_LINK_LIMITS.email).toEqual({ limit: 3, windowMs: 15 * 60 * 1000 });
    expect(MAGIC_LINK_LIMITS.ip).toEqual({ limit: 10, windowMs: 60 * 60 * 1000 });
  });
});

describe('limitMagicLink', () => {
  it('allows the 3rd link for an email in a window and refuses the 4th', async () => {
    expect(await sendForSameEmail(4)).toEqual([true, true, true, false]);
  });

  it('allows the 10th link from an IP in a window and refuses the 11th', async () => {
    const results = await sendFromSameIp(11);
    expect(results.slice(0, 10)).toEqual(Array(10).fill(true));
    expect(results[10]).toBe(false);
  });

  it('checks only the email when the request has no IP', async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) results.push(await limitMagicLink(EMAIL, null));
    expect(results).toEqual([true, true, true, false]);
    expect(keys.every((key) => key.startsWith('ml:e:'))).toBe(true);
  });

  it('stores neither the raw email nor the raw IP', async () => {
    await limitMagicLink(EMAIL, IP);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^ml:e:[0-9a-f]{64}$/);
    expect(keys[1]).toMatch(/^ml:i:[0-9a-f]{64}$/);
    for (const key of keys) {
      expect(key).not.toContain(EMAIL);
      expect(key).not.toContain('buyer');
      expect(key).not.toContain(IP);
    }
  });

  it('gives the same address the same key, and another address another key', async () => {
    await limitMagicLink(EMAIL, null);
    await limitMagicLink(EMAIL, null);
    await limitMagicLink('other@example.com', null);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('sets the window from the time it is given', async () => {
    const now = new Date('2026-11-02T10:00:00.000Z');
    await limitMagicLink(EMAIL, IP, now);
    const values = vi.mocked(prisma.$queryRaw).mock.calls.map((call) => call.slice(1));
    expect(values[0]).toContainEqual(new Date(now.getTime() + MAGIC_LINK_LIMITS.email.windowMs));
    expect(values[1]).toContainEqual(new Date(now.getTime() + MAGIC_LINK_LIMITS.ip.windowMs));
    expect(values[0]).toContainEqual(now);
  });

  it('refuses rather than sends when AUTH_SECRET is missing', async () => {
    vi.stubEnv('AUTH_SECRET', '');
    await expect(limitMagicLink(EMAIL, IP)).rejects.toThrow('AUTH_SECRET');
  });
});

describe('clientIp', () => {
  const headers = (entries: Record<string, string>) => new Headers(entries);

  it('takes the first x-forwarded-for entry', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientIp(headers({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it('falls back to x-real-ip', () => {
    expect(clientIp(headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('returns null with no IP header', () => {
    expect(clientIp(headers({}))).toBeNull();
  });

  it('refuses a value that is too long or holds other characters', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '1'.repeat(46) }))).toBeNull();
    expect(clientIp(headers({ 'x-forwarded-for': 'evil.com' }))).toBeNull();
    expect(clientIp(headers({ 'x-real-ip': '<script>' }))).toBeNull();
  });
});

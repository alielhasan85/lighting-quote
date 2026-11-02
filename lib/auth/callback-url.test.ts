// lib/auth/callback-url.test.ts
// Where a user lands after sign-in comes from the URL, so anyone can craft it. Only a path on this site may pass.

import { describe, expect, it } from 'vitest';
import { loginUrl, safeCallbackUrl } from './callback-url';

describe('safeCallbackUrl', () => {
  it('keeps a same-site path with its query', () => {
    expect(safeCallbackUrl('/w/abc?tab=1')).toBe('/w/abc?tab=1');
    expect(safeCallbackUrl('/')).toBe('/');
  });

  it.each([
    ['an absolute URL', 'https://evil.com'],
    ['a protocol-relative URL', '//evil.com'],
    ['a backslash browsers read as a slash', '/\\evil.com'],
    ['a script URL', 'javascript:alert(1)'],
    ['an empty string', ''],
    ['a tab browsers strip out', '/\t/evil.com'],
    ['a newline', '/w/abc\n'],
    ['a NUL', '/w/\0abc'],
    ['a DEL', '/w/\x7fabc'],
    ['a path over 2048 characters', `/${'a'.repeat(2048)}`],
  ])('turns %s into /', (_name, raw) => {
    expect(safeCallbackUrl(raw)).toBe('/');
  });

  it('turns a non-string into /', () => {
    for (const raw of [undefined, null, 42, {}, ['/w/abc']]) expect(safeCallbackUrl(raw)).toBe('/');
  });

  it('keeps a path of exactly 2048 characters', () => {
    const longest = `/${'a'.repeat(2047)}`;
    expect(safeCallbackUrl(longest)).toBe(longest);
  });
});

describe('loginUrl', () => {
  it('encodes the path it sends the user back to', () => {
    expect(loginUrl('/w/w1')).toBe('/login?callbackUrl=%2Fw%2Fw1');
  });
});

// lib/auth/secrets.test.ts
// The cron route's only guard, and the startup check that names a missing variable.

import { describe, expect, it } from 'vitest';
import { isCronAuthorized, missingAuthEnv, REQUIRED_AUTH_ENV } from './secrets';

describe('isCronAuthorized', () => {
  it('accepts only Bearer <secret>', () => {
    expect(isCronAuthorized('Bearer s3cret', 's3cret')).toBe(true);
  });

  it.each([
    ['a wrong value', 'Bearer wrong', 's3cret'],
    ['a longer value', 'Bearer s3cret2', 's3cret'],
    ['a missing header', null, 's3cret'],
    ['an empty header', '', 's3cret'],
    ['a missing Bearer prefix', 's3cret', 's3cret'],
    ['a lowercase prefix', 'bearer s3cret', 's3cret'],
  ])('refuses %s', (_name, header, secret) => {
    expect(isCronAuthorized(header, secret)).toBe(false);
  });

  // Unset must fail closed: "Bearer " and "Bearer undefined" are guessable.
  it.each([
    ['missing', undefined, 'Bearer undefined'],
    ['empty', '', 'Bearer '],
    ['blank', '   ', 'Bearer    '],
  ])('refuses everything when the secret is %s', (_name, secret, header) => {
    expect(isCronAuthorized(header, secret)).toBe(false);
  });
});

describe('missingAuthEnv', () => {
  const allSet = Object.fromEntries(REQUIRED_AUTH_ENV.map((name) => [name, 'value']));

  it('returns nothing when every variable is set', () => {
    expect(missingAuthEnv(allSet)).toEqual([]);
  });

  it('names every unset or blank variable', () => {
    expect(missingAuthEnv({ ...allSet, EMAIL_FROM: undefined, CRON_SECRET: '   ', AUTH_SECRET: '' })).toEqual([
      'AUTH_SECRET',
      'EMAIL_FROM',
      'CRON_SECRET',
    ]);
    expect(missingAuthEnv({})).toEqual([...REQUIRED_AUTH_ENV]);
  });

  it('covers what sign-in and the cleanup job need', () => {
    expect([...REQUIRED_AUTH_ENV].sort()).toEqual(
      ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'AUTH_RESEND_KEY', 'AUTH_SECRET', 'CRON_SECRET', 'EMAIL_FROM'].sort(),
    );
  });
});

// lib/workspace/landing.test.ts
// Where `/` sends someone. Each case is one rule, so a new kind of caller can't land somewhere by accident.

import { describe, expect, it } from 'vitest';
import { landingPath } from './landing';

const active = { isActive: true };
const suspended = { isActive: false };

describe('landingPath', () => {
  it('sends nobody to sign-in', () => {
    expect(landingPath(null, null)).toBe('/login');
  });

  it('sends a suspended account to /forbidden, whatever it belongs to', () => {
    expect(landingPath(suspended, null)).toBe('/forbidden');
    expect(landingPath(suspended, { workspaceId: 'w1', isActive: true })).toBe('/forbidden');
  });

  it('sends an account with no membership to /welcome', () => {
    expect(landingPath(active, null)).toBe('/welcome');
  });

  // Not /welcome: creating a new workspace would be a way back in.
  it('sends someone with only a suspended membership to /forbidden', () => {
    expect(landingPath(active, { workspaceId: 'w1', isActive: false })).toBe('/forbidden');
  });

  it('sends an active member to their workspace', () => {
    expect(landingPath(active, { workspaceId: 'w1', isActive: true })).toBe('/w/w1');
  });
});

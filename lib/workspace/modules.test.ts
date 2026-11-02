// lib/workspace/modules.test.ts
// The sidebar's modules. An unbuilt module must have no link, and the active item must not match a look-alike path.

import { describe, expect, it } from 'vitest';
import { activeHref, isActivePath, moduleNav } from './modules';

describe('moduleNav', () => {
  it("lists the modules in the brief's order", () => {
    expect(moduleNav('w1').map((item) => item.label)).toEqual([
      'Home',
      'Projects',
      'Quotes',
      'Products',
      'Clients',
      'Settings',
    ]);
  });

  it('links only the modules that are built, inside this workspace', () => {
    const [home, ...rest] = moduleNav('w1');
    expect(home.href).toBe('/w/w1');
    for (const item of rest) expect(item.href).toBeNull();
  });
});

describe('isActivePath', () => {
  it('matches Home on its exact path only', () => {
    expect(isActivePath('/w/w1', '/w/w1')).toBe(true);
    expect(isActivePath('/w/w1/projects', '/w/w1')).toBe(false);
  });

  it('matches a module on its own path and its sub-paths', () => {
    expect(isActivePath('/w/w1/projects', '/w/w1/projects')).toBe(true);
    expect(isActivePath('/w/w1/projects/p1/lines', '/w/w1/projects')).toBe(true);
  });

  it('refuses a path that only starts with the same letters', () => {
    expect(isActivePath('/w/w1/projects-old', '/w/w1/projects')).toBe(false);
    expect(isActivePath('/w/w10', '/w/w1')).toBe(false);
  });

  it('refuses the same module in another workspace', () => {
    expect(isActivePath('/w/w2/projects', '/w/w1/projects')).toBe(false);
  });

  it('works for a tab outside a workspace', () => {
    expect(isActivePath('/admin/library/uploads/u1', '/admin/library/uploads')).toBe(true);
    expect(isActivePath('/admin/library/products', '/admin/library/uploads')).toBe(false);
  });
});

describe('activeHref', () => {
  const tabs = ['/w/w1/projects', '/w/w1/projects/archive'];

  it('picks the most specific match, in any order', () => {
    expect(activeHref('/w/w1/projects/archive', tabs)).toBe('/w/w1/projects/archive');
    expect(activeHref('/w/w1/projects/archive/a1', [...tabs].reverse())).toBe('/w/w1/projects/archive');
  });

  it('keeps the parent on its own path and its other sub-paths', () => {
    expect(activeHref('/w/w1/projects', tabs)).toBe('/w/w1/projects');
    expect(activeHref('/w/w1/projects/p1', tabs)).toBe('/w/w1/projects');
  });

  it('is undefined when nothing matches', () => {
    expect(activeHref('/w/w1/quotes', tabs)).toBeUndefined();
  });
});

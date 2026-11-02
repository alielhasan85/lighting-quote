// lib/workspace/modules.ts
// The sidebar's modules and which nav item is active. Pure. Reference: .docs/references/APP_SHELL_REFERENCE.md

/** `segment` is the module's folder under /w/<id>: '' for Home, null until its route is built (shown disabled). */
const MODULES = [
  { key: 'home', label: 'Home', segment: '' },
  { key: 'projects', label: 'Projects', segment: null },
  { key: 'quotes', label: 'Quotes', segment: null },
  { key: 'products', label: 'Products', segment: null },
  { key: 'clients', label: 'Clients', segment: null },
  { key: 'settings', label: 'Settings', segment: null },
] as const satisfies readonly { key: string; label: string; segment: string | null }[];

export type ModuleKey = (typeof MODULES)[number]['key'];

/** `href` is null for a module with no route yet. */
export type ModuleNavItem = { key: ModuleKey; label: string; href: string | null };

export function moduleNav(workspaceId: string): ModuleNavItem[] {
  return MODULES.map(({ key, label, segment }) => ({
    key,
    label,
    href: segment === null ? null : `/w/${workspaceId}${segment && `/${segment}`}`,
  }));
}

const WORKSPACE_HOME = /^\/w\/[^/]+$/;

/** Home is active on its exact path only: every other page in the workspace sits under it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return !WORKSPACE_HOME.test(href) && pathname.startsWith(`${href}/`);
}

/** The most specific match among a page's tabs, so a parent tab doesn't win over its child. */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs.filter((href) => isActivePath(pathname, href)).sort((a, b) => b.length - a.length)[0];
}

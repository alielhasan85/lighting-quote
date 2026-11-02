// lib/auth/permissions.ts
/**
 * Single source of truth for role permissions.
 *
 * To change what a role can do, edit its list in ROLE_PERMISSIONS. Page guards, action guards and
 * any UI that hides a control all read from here, so nothing else changes.
 *
 * Client-safe (no server imports), so the UI can hide what the server would refuse. Hiding is a
 * courtesy: the server check is the rule.
 *
 * OWNER, not ADMIN: User.role = 'ADMIN' already means staff of this product.
 */

export const ROLES = ['OWNER', 'MANAGER', 'SALES'] as const;

export type Role = (typeof ROLES)[number];

// A union, so a misspelt permission fails the type-check. An unknown key would otherwise produce an
// empty role list, and an empty list locks out every role.
export type Permission =
  | 'DATA_READ'
  | 'DATA_WRITE'
  | 'SETTINGS_WRITE'
  | 'MEMBERS_MANAGE';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Prices, brands, branding and users (brief §3: the admin)
  OWNER: ['DATA_READ', 'DATA_WRITE', 'SETTINGS_WRITE', 'MEMBERS_MANAGE'],
  // An approvals permission joins MANAGER when quotes exist.
  MANAGER: ['DATA_READ', 'DATA_WRITE'],
  SALES: ['DATA_READ', 'DATA_WRITE'],
};

/** An unknown role string (a stale row, a provider's new role) is refused, not guessed at. */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Does a role hold a permission? `null` (no role resolved yet) holds nothing. */
export function roleHasPermission(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Which roles hold a permission? For matrices and invite dialogs. */
export function rolesForPermission(permission: Permission): Role[] {
  return ROLES.filter((role) => ROLE_PERMISSIONS[role].includes(permission));
}

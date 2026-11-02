// lib/auth/authz.ts
/**
 * The guards. Each one throws a code from ACTION_ERROR or returns the caller. Server actions reach
 * them through the factories in lib/actions/server/create-action.ts, and pages call the *Page
 * versions directly.
 *
 * There is no "is a member" guard, on purpose: every workspace guard names a permission.
 */
import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { ACTION_ERROR } from '@/lib/actions/server/run-action';
import { FORBIDDEN_PATH, loginUrl } from './callback-url';
import { getCaller, getWorkspaceRole, type Caller } from './caller';
import { roleHasPermission, type Permission, type Role } from './permissions';

/* ─── Guards ─────────────────────────────────────────────────────────────── */

/** A signed-in, active user. */
export async function requireSignedIn(): Promise<Caller> {
  const caller = await getCaller();
  if (!caller) throw new Error(ACTION_ERROR.UNAUTHENTICATED);
  if (!caller.isActive) throw new Error(ACTION_ERROR.DISABLED);
  return caller;
}

/** An active staff member of this product. For global writes. */
export async function requirePlatformAdmin(): Promise<Caller> {
  const caller = await requireSignedIn();
  if (!caller.isPlatformAdmin) throw new Error(ACTION_ERROR.FORBIDDEN_ADMIN_ONLY);
  return caller;
}

/** An active member of this workspace whose role holds this permission. */
export async function requireWorkspacePermission(
  workspaceId: string,
  permission: Permission,
): Promise<{ userId: string; role: Role }> {
  const { userId } = await requireSignedIn();
  const role = await getWorkspaceRole(workspaceId, userId);
  if (!role || !roleHasPermission(role, permission)) throw new Error(ACTION_ERROR.FORBIDDEN);
  return { userId, role };
}

/* ─── Pages ──────────────────────────────────────────────────────────────── */

/**
 * For page.tsx and layout.tsx files only. In production builds Next.js empties error.message, so an error.tsx can't
 * tell FORBIDDEN from a crash: a page has to redirect before the error reaches it. Server actions
 * use the factories, which return the code as a value instead.
 */
export async function requireWorkspacePermissionPage(
  workspaceId: string,
  permission: Permission,
): Promise<{ userId: string; role: Role }> {
  try {
    return await requireWorkspacePermission(workspaceId, permission);
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    // Back to the workspace home after sign-in, not the exact page: a page guard doesn't know its own path.
    if (code === ACTION_ERROR.UNAUTHENTICATED) redirect(loginUrl(`/w/${workspaceId}`));
    if (code === ACTION_ERROR.FORBIDDEN || code === ACTION_ERROR.DISABLED) redirect(FORBIDDEN_PATH);
    if (code === ACTION_ERROR.NOT_FOUND) notFound();
    throw e; // unexpected errors → nearest error.tsx
  }
}

/** For a page.tsx with no workspace to guard on. `returnPath` is where sign-in sends the user back to. */
export async function requireSignedInPage(returnPath: string): Promise<Caller> {
  try {
    return await requireSignedIn();
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code === ACTION_ERROR.UNAUTHENTICATED) redirect(loginUrl(returnPath));
    if (code === ACTION_ERROR.DISABLED) redirect(FORBIDDEN_PATH);
    throw e; // unexpected errors → nearest error.tsx
  }
}

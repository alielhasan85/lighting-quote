// lib/auth/caller.ts
/**
 * The only code that reads the session or a membership. The guards (authz.ts) and the action factories call these two
 * functions, so changing how sign-in works means changing this file and auth.ts, nothing else.
 * Reference: .docs/references/AUTH_REFERENCE.md
 */
import 'server-only';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isRole, type Role } from './permissions';

export type Caller = {
  userId: string;
  /** False for a suspended account. It keeps its session but can't act. */
  isActive: boolean;
  /** Staff of this product (User.role = ADMIN), not a role inside a workspace. */
  isPlatformAdmin: boolean;
};

/** Who is calling, from this request's session. null when nobody is signed in. */
export async function getCaller(): Promise<Caller | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    isActive: session.user.isActive !== false,
    isPlatformAdmin: session.user.role === 'ADMIN',
  };
}

/** The caller's role in one workspace, or null when they aren't an active member with a known role. */
export async function getWorkspaceRole(workspaceId: string, userId: string): Promise<Role | null> {
  const member = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, isActive: true },
  });
  return member?.isActive && isRole(member.role) ? member.role : null;
}

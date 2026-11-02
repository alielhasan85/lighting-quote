// lib/auth/caller.ts
/**
 * Reads the session and a caller's memberships. The guards (authz.ts) and the action factories call these functions, so
 * changing how sign-in works means changing this file and auth.ts, nothing else. The one other reader of Membership is
 * createWorkspace, whose count has to sit inside its own transaction.
 * Reference: .docs/references/AUTH_REFERENCE.md
 */
import 'server-only';

import { cache } from 'react';
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

/** What the shell shows about the caller. From the cached session, so it costs no extra read. */
export async function getCallerProfile(): Promise<{ name: string | null; email: string | null }> {
  const session = await auth();
  return { name: session?.user?.name ?? null, email: session?.user?.email ?? null };
}

/**
 * The caller's role in one workspace, or null when they aren't an active member with a known role. Read once per
 * request, however many guards ask: a layout and its page both do.
 */
export const getWorkspaceRole = cache(async (workspaceId: string, userId: string): Promise<Role | null> => {
  const member = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, isActive: true },
  });
  return member?.isActive && isRole(member.role) ? member.role : null;
});

/**
 * The membership `/` lands on: active first, then oldest, so a user given extra rows by SQL lands in the same place
 * every time. null when they have none.
 */
export async function getLandingMembership(userId: string): Promise<{ workspaceId: string; isActive: boolean } | null> {
  return prisma.membership.findFirst({
    where: { userId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    select: { workspaceId: true, isActive: true },
  });
}

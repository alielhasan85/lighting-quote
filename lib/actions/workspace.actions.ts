// lib/actions/workspace.actions.ts
'use server';
/**
 * Creating the caller's workspace. One per account: the count includes suspended memberships, so someone suspended from
 * their workspace can't make a new one to get back in.
 * Reference: .docs/references/APP_SHELL_REFERENCE.md
 */
import { z } from 'zod';
import { createUserAction } from '@/lib/actions/server/create-action';
import { ActionError, ok } from '@/lib/actions/server/run-action';
import { prisma } from '@/lib/db';

export const createWorkspace = createUserAction(
  { name: 'createWorkspace', input: z.object({ name: z.string().trim().min(1).max(80) }) },
  async ({ name }, { userId }) => {
    const workspace = await prisma.$transaction(async (tx) => {
      // Locks this user's row, so a double submit waits here, then sees the first workspace.
      await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      if ((await tx.membership.count({ where: { userId } })) > 0) throw new ActionError('WORKSPACE_EXISTS');
      return tx.workspace.create({
        data: { name, memberships: { create: { userId, role: 'OWNER' } } },
        select: { id: true },
      });
    });
    return ok({ id: workspace.id });
  },
);

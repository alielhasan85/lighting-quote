// lib/queries/workspace.queries.ts
// Workspace reads. Reference: .docs/references/APP_SHELL_REFERENCE.md
import 'server-only';

import { prisma } from '@/lib/db';

/** The name the shell shows, or null if the workspace is gone. Call only after a guard on this workspace. */
export async function getWorkspaceName(workspaceId: string): Promise<string | null> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  return workspace?.name ?? null;
}

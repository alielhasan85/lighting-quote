// lib/actions/server/create-action.ts
/**
 * One way in for server actions. Every export of a 'use server' file is built here:
 *
 *   const input = z.object({ workspaceId: z.string().min(1), name: z.string().max(80) });
 *
 *   export const renameThing = createWorkspaceAction(
 *     { name: 'renameThing', permission: 'DATA_WRITE', input },
 *     async ({ workspaceId, name }, { userId, role }) => ok(await renameThingRow(workspaceId, name)),
 *   );
 *
 * The pipeline (parse → authorize → handler → throws become values) is `runAction` in
 * run-action.ts, where it is tested. This file plugs in the real guards. `npm run check:actions`
 * fails any 'use server' export that isn't built by one of these factories.
 *
 * Not 'use server': this module is reachable only by import.
 */
import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import type { z } from 'zod';
import { requirePlatformAdmin, requireSignedIn, requireWorkspacePermission } from '@/lib/auth/authz';
import type { Permission, Role } from '@/lib/auth/permissions';
import { runAction, type ActionResult, type InputParser } from './run-action';

/** The caller of a workspace action. */
export type WorkspaceActionContext = { userId: string; role: Role; workspaceId: string };

/** The caller of a user-level or admin action. */
export type UserActionContext = { userId: string };

/** Refuses, at compile time, a schema whose parsed value has no `workspaceId`. */
type HasWorkspaceId<S extends z.ZodType> = z.output<S> extends { workspaceId: string } ? unknown : never;

/** Logs an error the client sees only as INTERNAL_ERROR. */
const logAs = (name: string) => (e: unknown) => console.error(`[action:${name}]`, e);

/* ─── Factories ──────────────────────────────────────────────────────────── */

/**
 * A workspace-scoped action. `input` must parse to an object with `workspaceId`; the caller needs
 * `permission` on that workspace. There is no membership-only option, on purpose: a read-only role
 * must not be able to reach a write because someone forgot the permission.
 */
export function createWorkspaceAction<S extends z.ZodType, T>(
  opts: { name: string; permission: Permission; input: S & HasWorkspaceId<S> },
  handler: (input: z.output<S>, ctx: WorkspaceActionContext) => Promise<ActionResult<T>>,
): (raw: z.input<S>) => Promise<ActionResult<T>> {
  return (raw) =>
    runAction(raw, {
      parse: opts.input as InputParser<z.output<S>>,
      authorize: async (input: z.output<S>): Promise<WorkspaceActionContext> => {
        const { workspaceId } = input as { workspaceId: string };
        const { userId, role } = await requireWorkspacePermission(workspaceId, opts.permission);
        return { userId, role, workspaceId };
      },
      handler,
      rethrow: unstable_rethrow,
      onError: logAs(opts.name),
    });
}

/** A platform-admin action (global writes, templates): an active platform admin. No workspace. */
export function createAdminAction<S extends z.ZodType, T>(
  opts: { name: string; input: S },
  handler: (input: z.output<S>, ctx: UserActionContext) => Promise<ActionResult<T>>,
): (raw: z.input<S>) => Promise<ActionResult<T>> {
  return (raw) =>
    runAction(raw, {
      parse: opts.input as InputParser<z.output<S>>,
      authorize: requirePlatformAdmin,
      handler,
      rethrow: unstable_rethrow,
      onError: logAs(opts.name),
    });
}

/** A user-level action (account, profile, billing): any signed-in, active user, on their own data only. */
export function createUserAction<S extends z.ZodType, T>(
  opts: { name: string; input: S },
  handler: (input: z.output<S>, ctx: UserActionContext) => Promise<ActionResult<T>>,
): (raw: z.input<S>) => Promise<ActionResult<T>> {
  return (raw) =>
    runAction(raw, {
      parse: opts.input as InputParser<z.output<S>>,
      authorize: requireSignedIn,
      handler,
      rethrow: unstable_rethrow,
      onError: logAs(opts.name),
    });
}

/**
 * A public form action (a contact form), for useActionState. Anyone can submit it: there is nothing
 * to authorize, so validate hard and rate-limit in the handler.
 */
export function createPublicFormAction<S extends z.ZodType, T>(
  opts: { name: string; input: S },
  handler: (input: z.output<S>) => Promise<ActionResult<T>>,
): (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>> {
  return (_prev, formData) =>
    runAction(Object.fromEntries(formData), {
      parse: opts.input as InputParser<z.output<S>>,
      authorize: async () => ({}),
      handler,
      rethrow: unstable_rethrow,
      onError: logAs(opts.name),
    });
}

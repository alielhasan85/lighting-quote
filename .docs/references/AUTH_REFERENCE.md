# Auth & Permissions Reference

> **Status:** Built, no live sign-in yet · **TODO:** NOW.md row F-1 · **Related:** [ARCHITECTURE.md → Security](../guides/ARCHITECTURE.md)

Who can sign in, what each role may do in a workspace, and how every page and server action checks it.

## Quick Reference

```
auth.ts                               Auth.js: providers, database sessions, cookie, callbacks; auth() cached per request
app/api/auth/[...nextauth]/route.ts   Auth.js routes: sign-in page, callbacks, sign-out
types/next-auth.d.ts                  session.user.{id, role, isActive}
lib/auth/caller.ts                    getCaller, getWorkspaceRole: the only code that reads the session or Membership
lib/auth/permissions.ts               ROLES, Permission, ROLE_PERMISSIONS: the matrix. Client-safe
lib/auth/authz.ts                     requireSignedIn, requirePlatformAdmin, requireWorkspacePermission, requireWorkspacePermissionPage
lib/actions/server/run-action.ts      The pipeline: parse → authorize → handler; errors become codes
lib/actions/server/create-action.ts   createWorkspaceAction, createUserAction, createAdminAction, createPublicFormAction
scripts/check-actions.mjs             Fails any 'use server' export not built by a factory
prisma/schema.prisma                  User, Account, Session, VerificationToken, Workspace, Membership
```

**Key concepts**

- **Sign-in:** Google, or an email magic link through Resend that expires in 15 minutes. No passwords.
- **Sessions:** database rows, 30 days, refreshed daily. The cookie is `__Host-session-token` in production.
- **Two kinds of role:** `User.role` is `USER` or `ADMIN` (staff of this product). `Membership.role` is per workspace:
  `OWNER`, `MANAGER` or `SALES`. Only `OWNER` holds `SETTINGS_WRITE` and `MEMBERS_MANAGE`.
- **Guards name a permission, never a role,** and there is no membership-only guard.

## Flow

```
Page    page.tsx → requireWorkspacePermissionPage(workspaceId, 'DATA_READ')
          └─► requireWorkspacePermission → requireSignedIn → getCaller → auth()   one DB read per request
                └─► getWorkspaceRole(workspaceId, userId) → Membership row → ROLE_PERMISSIONS
          refused: UNAUTHENTICATED → sign-in page · FORBIDDEN or DISABLED → /forbidden

Action  client → renameThing(raw)
          └─► runAction: zod parse → requireWorkspacePermission → handler → ok(data)
          refused: { success: false, error: 'INVALID_INPUT' | 'UNAUTHENTICATED' | 'FORBIDDEN' | ... }
          any other throw → INTERNAL_ERROR, logged as [action:renameThing]
```

## Rules

- Every `page.tsx` under `(app)` calls `requireWorkspacePermissionPage` before it reads anything.
- Every `'use server'` export is built by a factory (`check:actions`). Exports that must run without a session go in
  `scripts/check-actions-public.json`, each with its reason.
- Every query a workspace action runs filters by its `workspaceId`.
- Route handlers in `app/api/` guard themselves.
- A `Membership.role` outside `ROLES` is refused (`isRole`).
- A user with `isActive = false` can't sign in, and an existing session gets `DISABLED` on its next request.
- Platform admins don't pass workspace guards. Support access to a workspace is a separate, explicit decision.

## Common tasks

### Add a permission

1. Add it to the `Permission` union in `permissions.ts`.
2. Add it to each role that holds it in `ROLE_PERMISSIONS`. A test fails if no role holds it.
3. Name it in the guard: `createWorkspaceAction({ permission })` or `requireWorkspacePermissionPage(workspaceId, permission)`.

### Add a role

1. Add it to `ROLES`, then give it a list in `ROLE_PERMISSIONS`. The type-check fails until it has one.

### Guard a page

```ts
const { workspaceId } = await params;
const { role } = await requireWorkspacePermissionPage(workspaceId, 'DATA_READ');
```

### Make someone product staff, or suspend them

The founder runs SQL on the right database: `role = 'ADMIN'`, or `isActive = false`, on that `User` row. Both take
effect on the next request, because database sessions read the user every time.

## Decisions

| Decision | Why |
|---|---|
| Database sessions, not JWT | A session is revoked by deleting its row. The cost is one read per request, cached per request |
| No session cache in Redis | Not needed yet. If one is added, clear it whenever `role` or `isActive` changes |
| Guards in pages and actions, not in a layout or the proxy | A layout doesn't re-run on every navigation, and one proxy matcher mistake skips a route |
| A custom sign-in method gets its own route, not the Credentials provider | With database sessions, Credentials makes Auth.js switch the cookie to a JWT, which breaks session lookups |
| Auth.js, not Clerk | Same setup as Menumize. Workspaces, members and roles live in our own tables (`Workspace`, `Membership`) |
| The top workspace role is `OWNER`, not `ADMIN` | `User.role = 'ADMIN'` already means staff of this product |
| Workspace isolation in code first; Postgres RLS is NOW.md row F-4 | RLS needs a per-transaction setting on every query and its own tests, so it lands on purpose, before real prices go in |

## Known issues

- No `/login` or `/forbidden` page yet: sign-in uses Auth.js's built-in page, and a refused page lands on a 404.
- Magic-link requests aren't rate-limited.
- Expired `Session` and `VerificationToken` rows are never deleted. A nightly job should remove them.
- Security headers aren't set ([ARCHITECTURE.md → Security](../guides/ARCHITECTURE.md), rule 11).
- A refused page redirects to sign-in without a `callbackUrl`, so after signing in the user lands on `/`.
- `EMAIL_FROM` isn't checked at startup: unset, every magic-link sign-in fails at Resend.

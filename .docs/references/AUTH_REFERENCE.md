# Auth & Permissions Reference

> **Status:** Built and walked by hand · **Related:** [ARCHITECTURE.md → Security](../guides/ARCHITECTURE.md)

Who can sign in, what each role may do in a workspace, and how every page and server action checks it.

## Quick Reference

```
auth.ts                               Auth.js: providers, database sessions, cookie, pages, callbacks; auth() cached per request
app/api/auth/[...nextauth]/route.ts   Auth.js routes: sign-in, callbacks, the built-in sign-out page
app/(auth)/layout.tsx                 The centered shell around every signed-out page
app/(auth)/login/page.tsx             /login: signed in → callbackUrl; otherwise login-client.tsx (email link, Google, messages)
app/(auth)/login/check-email/page.tsx pages.verifyRequest: "Check your email"
app/(auth)/forbidden/page.tsx         Where a refused page goes
app/api/cron/auth-cleanup/route.ts    Deletes expired Session, VerificationToken and RateLimit rows. Checks CRON_SECRET
vercel.json                           Runs the cleanup nightly at 03:00 UTC
instrumentation.ts                    Reports missing auth env at server start: production throws, development warns. CRON_SECRET only warns
types/next-auth.d.ts                  session.user.{id, role, isActive}
lib/auth/caller.ts                    getCaller, getWorkspaceRole: the only code that reads the session or Membership
lib/auth/permissions.ts               ROLES, Permission, ROLE_PERMISSIONS: the matrix. Client-safe
lib/auth/authz.ts                     requireSignedIn, requirePlatformAdmin, requireWorkspacePermission, requireWorkspacePermissionPage
lib/auth/callback-url.ts              LOGIN_PATH, safeCallbackUrl, loginUrl. Pure
lib/auth/rate-limit.ts                MAGIC_LINK_LIMITS, clientIp, limitMagicLink
lib/auth/secrets.ts                   REQUIRED_AUTH_ENV, missingAuthEnv, missingCleanupEnv, isCronAuthorized. Pure
lib/actions/auth.actions.ts           signInWithEmail, signInWithGoogle: public, built by createPublicFormAction
lib/actions/server/run-action.ts      The pipeline: parse → authorize → handler; errors become codes
lib/actions/server/create-action.ts   createWorkspaceAction, createUserAction, createAdminAction, createPublicFormAction
scripts/check-actions.mjs             Fails any 'use server' export not built by a factory
prisma/schema.prisma                  User, Account, Session, VerificationToken, Workspace, Membership, RateLimit
```

**Key concepts**

- **Sign-in:** Google, or an email magic link through Resend that expires in 15 minutes. No passwords.
- **Magic-link limits:** 3 per email per 15 minutes and 10 per IP per hour, in `MAGIC_LINK_LIMITS`. Fixed windows in the
  `RateLimit` table, keyed by HMAC, so it holds no email or IP. An IPv6 address counts as its /64. No IP header → the
  email limit alone.
- **Sessions:** database rows, 30 days, refreshed daily. The cookie is `__Host-session-token` in production.
- **Nightly cleanup:** Vercel Cron calls `/api/cron/auth-cleanup`, which deletes expired `Session`, `VerificationToken`
  and `RateLimit` rows.
- **Env:** production refuses to start without `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`
  or `EMAIL_FROM`, Vercel Preview included. Without `CRON_SECRET` it warns, and the cron route refuses every request.
- **Two kinds of role:** `User.role` is `USER` or `ADMIN` (staff of this product). `Membership.role` is per workspace:
  `OWNER`, `MANAGER` or `SALES`. Only `OWNER` holds `SETTINGS_WRITE` and `MEMBERS_MANAGE`.
- **Guards name a permission, never a role,** and there is no membership-only guard.

## Flow

```
Page    page.tsx → requireWorkspacePermissionPage(workspaceId, 'DATA_READ')
          └─► requireWorkspacePermission → requireSignedIn → getCaller → auth()   one DB read per request
                └─► getWorkspaceRole(workspaceId, userId) → Membership row → ROLE_PERMISSIONS
          refused: UNAUTHENTICATED → /login?callbackUrl=/w/<id> · FORBIDDEN or DISABLED → /forbidden

Sign-in login-client.tsx → signInWithEmail → signIn('resend') → Auth.js → signIn callback → limitMagicLink
          allowed: the email goes out → /login/check-email · over a limit: /login?error=RateLimited
          the emailed link → signed in → callbackUrl (through safeCallbackUrl), or / without one

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
- Route handlers in `app/api/` guard themselves. The cron route checks `CRON_SECRET` and refuses everything when it's
  unset.
- Magic links are limited in the `signIn` callback, never in an action, so a direct POST to Auth.js is limited too.
  The IP is counted first: a request it refuses doesn't touch the email's count.
- A `callbackUrl` passes through `safeCallbackUrl` before it's used. Auth.js's same-origin `redirect` callback stays as
  the second check.
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
| Workspace isolation in code first; Postgres RLS is NOW.md row F-4 | RLS needs a per-transaction setting on every query and its own tests, so it lands on purpose, before P-3, the first private project data |
| Rate limits in Postgres, not in memory or Redis | Serverless instances share no memory, and Postgres adds no new service. One atomic upsert per key |
| A refused user returns to `/w/<id>`, not the exact page | A page guard doesn't know its own path. Deep links need a proxy that stamps it |
| A missing `CRON_SECRET` warns; a missing sign-in variable stops production | Without its secret the cron route refuses everything, so the only loss is a skipped cleanup. That isn't worth taking sign-in down |

## Known issues

None.

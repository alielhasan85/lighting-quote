# Architecture

Where code goes, and the security and scale rules every change follows. One layout for the whole project: when
something doesn't fit, ask before inventing a new folder.

---

## Layers

```
page.tsx (server) ──reads──► lib/queries/*.queries.ts ──┐
   │ guard first                                        ├──► lib/db.ts (Prisma) ──► Postgres
   ▼                                                    │
client component ──calls──► lib/actions/*.actions.ts ───┘
                            (built by a factory: parse → authorize → handler)
```

- **The UI never imports the database.** Types only, and lint enforces it.
- **Reads** are server-only functions in `lib/queries/`, called by pages after their guard.
- **Writes** are server actions in `lib/actions/`, each built by a factory that parses and authorizes first.
- **Rules** (prices, statuses, limits, parsing) are pure functions in `lib/<feature>/`, with tests. Actions and
  queries call them, which keeps the logic testable without a database.

## Where things go

| You're adding | It goes in | Notes |
|---|---|---|
| A page | `app/(app)/w/[workspaceId]/<feature>/page.tsx` | Server component. Guard → query → render |
| The interactive part of a page | `.../<feature>/<feature>-client.tsx` | `'use client'`, receives data as props |
| A component used by one feature | `.../<feature>/components/` | |
| A component used by two or more | `components/` | |
| A shadcn primitive | `components/ui/` | Generated. Theme it, don't rewrite it |
| A shared client hook | `hooks/` | A feature-only hook stays in its feature folder |
| A write | `lib/actions/<feature>.actions.ts` | `'use server'`. Every export built by a factory |
| A read | `lib/queries/<feature>.queries.ts` | `import 'server-only'`. Takes `workspaceId` |
| Business rules | `lib/<feature>/*.ts` + `*.test.ts` | Pure: no Prisma, no Next.js |
| Zod schemas | The top of the actions file; `lib/<feature>/schemas.ts` once a form shares them | |
| Shared types | `types/` | Prisma's generated types are imported, not copied |
| A webhook, cron or file route | `app/api/<name>/route.ts` | Not covered by `check:actions`: guards itself |
| An AI client (Claude, embeddings) | `lib/ai/` | Server-only. Sends no prices, client or supplier names (CLAUDE.md → AI) |
| A prompt | `lib/ai/prompts/` | A versioned file, never an inline string |
| A schema for AI output | `lib/ai/schemas/` | Zod. Invalid → retry once → human review |
| A background job | `lib/jobs/` | Inngest functions: ingestion, BOQ parsing, AI calls |
| A test fixture | `tests/fixtures/` | Anonymized BOQs, datasheets, expected outputs |
| A constant used in 2+ places | `lib/<feature>/constants.ts` or `lib/constants.ts` | Prices, limits, roles: one source |
| A check or script | `scripts/` | |
| Auth | `auth.ts`, `lib/auth/` | See [AUTH_REFERENCE](../references/AUTH_REFERENCE.md) |

**Naming:** components `PascalCase.tsx` · actions `kebab-case.actions.ts` · queries `kebab-case.queries.ts` · other
files `kebab-case.ts` · tests next to their file as `*.test.ts`.

**Adding a feature:** schema → `lib/<feature>/` rules and tests → queries → actions → route folder → nav entry →
reference.

## Server and client components

- **Server by default.** `'use client'` only for state, effects, handlers or browser APIs.
- **Push `'use client'` down the tree.** The page stays a server component and passes data down.
- **No client-side fetching** where a server component can read. A client component that needs fresh data calls an
  action, then `router.refresh()`.
- **An action returns `{ success, data }` or `{ success: false, error: CODE }`.** The client shows the code as a
  message.

---

## Security: in every plan, every time

1. **Authorize on the server, in two places:** every `page.tsx` calls a page guard, and every action goes through a
   factory. A layout, the proxy and a hidden button aren't security.
2. **Guards name a permission, never a role.** There is no "is a member" guard.
3. **Workspace isolation:** every query filters by `workspaceId`, updates and deletes included. Use `updateMany` /
   `deleteMany` with `workspaceId`, or read the row scoped first. A plain `update({ where: { id } })` ignores the workspace.
4. **Never trust the client** for ids, URLs, prices, totals or roles. Re-read and recompute on the server.
5. **Validate every input with zod:** bounded strings (`.max()`), enums, no open objects.
6. **Errors are codes.** No raw error, stack or Prisma message reaches the client: the pipeline turns them into
   `INTERNAL_ERROR` and logs them.
7. **Secrets stay on the server.** `NEXT_PUBLIC_` only for values that are truly public. Never log tokens, secrets
   or personal data.
8. **Route handlers verify themselves:** a webhook checks its signature, a cron route its secret.
9. **Rate-limit** sign-in and every public form.
10. **Uploads:** check type and size, and store them under the workspace's prefix.
11. **Security headers** in `next.config.ts` → `headers()`: `Strict-Transport-Security`, `X-Content-Type-Options:
    nosniff`, `Referrer-Policy`, `Permissions-Policy` and `Content-Security-Policy: frame-ancestors 'self'`.
12. **Review:** auth, permissions, money, personal data or the schema get `code-review high` + `security-review`.

## Scale: in every plan, every time

1. **Every list paginates** (`take` + cursor). No unbounded `findMany`.
2. **Select only what's shown.** No `include` of a large relation by default.
3. **Index for the query.** Workspace tables get `@@index([workspaceId, …])` matching the `where` and `orderBy`.
4. **No query in a loop.** Batch with `{ in: ids }`, or read the relation in one query.
5. **Transactions for multi-step writes,** kept short, with no external calls inside.
6. **Slow or retryable work** (imports, AI calls, emails, PDFs) runs in a background job, not in the request.
7. **Cache only what you've measured.** Every cache has a tag and a known invalidation.
8. **One source of truth** for prices, limits and roles, in one typed constant.
9. **Money as integer minor units + currency.** Dates stored in UTC, converted for display.
10. **Files under 500 lines** (lint). A file doing two jobs splits.

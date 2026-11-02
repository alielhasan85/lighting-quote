---
paths:
  - "prisma/**"
  - "lib/queries/**"
  - "lib/db.ts"
  - "app/api/**"
---

# Prisma and the database

**Local work uses the Neon dev branch. Nothing run on the laptop may change production.**

- Never run `prisma migrate reset`, `migrate deploy`, `db push`, `--force-reset` or a bulk `DELETE`. For a schema change,
  edit `schema.prisma` and hand the founder `npx prisma migrate dev --name <name>`.
- `npx prisma validate`, `generate` and `format` are safe. Never edit a migration that has been applied.

**Queries** (`lib/queries/<feature>.queries.ts`, `import 'server-only'`):

- Take `workspaceId` as the first argument and filter by it. Updates and deletes use `updateMany` / `deleteMany` with it.
- Called only after a guard: a page guard or an action factory.
- **Bounded:** lists paginate (`take` + cursor), `select` only what's shown, no query in a loop.
- **Indexed:** a workspace model gets `@@index([workspaceId, …])` matching its `where` and `orderBy`.

**Schema:**

- Every workspace model has `workspaceId` and a relation to `Workspace` with `onDelete: Cascade`. Check `onDelete` before
  deleting a parent.
- Money is an `Int` in minor units plus a currency. Dates are UTC.
- Comment what a column can't say: `/// "+97455551234" (E.164)`.

After a schema change: `npx prisma generate`, then `npm run typecheck`.

---
paths:
  - "lib/actions/**"
  - "**/actions/**"
  - "**/*.actions.ts"
---

# Server actions

**Every export from a `'use server'` file is a public HTTP endpoint.** Anyone can call it with any arguments, and types
don't exist at runtime. Read-only exports count too.

**Build every export with a factory** imported from `@/lib/actions/server/create-action` (a relative path doesn't count).
`npm run check:actions` fails anything else:

```ts
const input = z.object({ workspaceId: z.string().min(1), thingId: z.string().min(1), name: z.string().max(80) });

export const renameThing = createWorkspaceAction(
  { name: 'renameThing', permission: 'DATA_WRITE', input },
  async ({ workspaceId, thingId, name }) => {
    const { count } = await prisma.thing.updateMany({ where: { id: thingId, workspaceId }, data: { name } });
    if (count === 0) throw new ActionError('THING_NOT_FOUND');
    revalidatePath(`/w/${workspaceId}/things`);
    return ok({ id: thingId });
  },
);
```

1. **Pick the factory:** `createWorkspaceAction` (needs a `Permission` and a `workspaceId` in the schema) · `createUserAction`
   (the caller's own data) · `createAdminAction` (global writes) · `createPublicFormAction` (public forms: validate hard,
   rate-limit).
2. **Scope every query by `workspaceId`,** updates and deletes included. Never trust a caller's id or URL for ownership.
3. **`input` is a zod schema** with bounded fields. It's parsed before any auth call or DB read.
4. **Return `ok(data)`.** A domain error is `throw new ActionError('UPPER_SNAKE')`. Any other throw becomes
   `INTERNAL_ERROR` and is logged, so raw messages never reach the client.
5. **Multi-step writes** run in `prisma.$transaction`. **Revalidate** the paths or tags that changed.
6. **Slow work** (AI, email, PDF, imports) goes to a background job, not the request.

**Exceptions:** an export that must run without a session goes in `scripts/check-actions-public.json`, with its reason.
Helpers don't belong in a `'use server'` file: put them in a `server-only` module. Route handlers in `app/api/` aren't
covered by the check, so each one guards itself.

Reference: `.docs/references/AUTH_REFERENCE.md`.

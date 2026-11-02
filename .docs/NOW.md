# lighting-quote — Now

> The only list of open work. Finished rows are deleted, and git holds the history. Search it; don't read it whole.
> Deferred: [todo/LATER.md](todo/LATER.md)

**Goal:** A GCC lighting supplier turns a real Excel BOQ into a priced quote and a datasheet pack in under 15 minutes.

## Gates: launch is ready when every one passes

| Gate | Passes when |
|---|---|
| **G1** | Brief §9 success test: on 10–20 real past BOQs, ≥ 80% of lines are matched correctly or flagged, and a quote + datasheet pack is produced in under 15 minutes |
| **G2** | Every page and action guarded; roles walked; workspace isolation enforced by RLS and tested; no price in any AI prompt; dev and prod databases separate; secrets rotated |
| **G3** | The pilot supplier quotes a live inquiry with no help from us |

## Queue

A closed list: a row joins only if it blocks a gate and the founder says yes. Each row has a budget in sessions, and a
plan that outgrows it comes back to the founder. A part's TODO is written at its row's first session.

| # | Session | Gate | Budget | Done when |
|---|---|---|---|---|
| F-1 | Auth hardening: `/login` and `/forbidden` pages, magic-link rate limit, expired-session cleanup, security headers ([AUTH_REFERENCE](references/AUTH_REFERENCE.md) → Known issues) | G2 | 1 | Known issues in AUTH_REFERENCE is empty |
| F-2 | Workspace shell: create a workspace on first sign-in, `app/(app)/w/[workspaceId]/` layout with the module sidebar, invite members | G1 | 2 | A new user signs in, creates a workspace and invites a `SALES` member, who sees only that workspace |
| F-3 | File storage: Vercel Blob or R2, type and size checks, stored under the workspace prefix | G1 | 1 | An upload lands under its workspace's prefix, and another workspace can't read it |
| P-1 | Part 1, global brand library: schema, ingestion pipeline, review screen (brief §4) | G1 | 4 | 1–2 brands and 3–5 families are ingested through the review screen and searchable by spec |
| P-3 | Part 3, Excel BOQ extraction + review screen | G1 | 3 | An Excel BOQ becomes normalized, editable line items |
| P-4 | Part 4, matching engine + options UI | G1 | 4 | Each line shows 3–5 options with compliance flags, and the user picks one or marks it manual |
| F-4 | Row-level security on workspace tables: a per-transaction `workspaceId` setting, isolation tests | G2 | 2 | A test proves a query without the workspace setting returns no private rows. Lands before P-5 |
| P-5 | Part 5, discount-rule pricing + PDF quote | G1 | 3 | Selected lines, priced by discount rules (deterministic, tested), produce a PDF quote |
| P-6 | Part 6, merged datasheet pack | G1 | 2 | One PDF: cover, index, and the datasheets in quote order |

## Founder actions

Delete a line once it's done.

- [ ] Neon: a dev branch for local work. The production `DATABASE_URL` lives only in Vercel
- [ ] A Google OAuth client, a Resend key and `AUTH_SECRET` in `.env` and in Vercel
- [ ] `npx prisma migrate dev --name init`, against the dev branch
- [ ] GitHub: create `dev`, and require CI on `dev` and `main`
- [ ] Brief: edit the mentions of Arabic (§2, §4.1, §9, §12, §13)

## Rules

- **On the queue?** Proceed, within the row's budget.
- **Found during a session?** If it blocks a gate, the founder decides on a row. Otherwise one line in LATER.md.
- **On neither?** Ask why now, and what drops to make room.

**Last updated:** 2026-11-02 · repo set up from the playbook · next: F-1

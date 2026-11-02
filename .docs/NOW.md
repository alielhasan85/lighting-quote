# lighting-quote — Now

> The only list of open work. Finished rows are deleted, and git holds the history. Search it; don't read it whole.
> Deferred: [todo/LATER.md](todo/LATER.md)

**Goal:** A lighting contractor or supplier turns a project's RFQ or specification into matched products, RFQs to brands, a priced quote and a datasheet pack, and revises them quickly when the client changes something.

## Gates: launch is ready when every one passes

| Gate | Passes when |
|---|---|
| **G1** | Brief §9 success test: on 10–20 real past RFQs, ≥ 80% of lines are matched correctly or flagged, and our part of the work takes under 15 minutes (the time brands take to reply doesn't count) |
| **G2** | Every page and action guarded; roles walked; workspace isolation enforced by RLS and tested; no price in any AI prompt; dev and prod databases separate; secrets rotated |
| **G3** | The first real user quotes a live project with no help from us |

## Queue

A closed list: a row joins only if it blocks a gate and the founder says yes. Each row has a budget in sessions, and a
plan that outgrows it comes back to the founder. A part's TODO is written at its row's first session.

| # | Session | Gate | Budget | Done when |
|---|---|---|---|---|
| P-1 | Product library: upload a PDF datasheet or catalog, AI extraction, review screen, save ([TODO](todo/PRODUCT_LIBRARY_TODO.md)) | G1 | 4 | A platform admin uploads a real PDF, corrects a field beside it, approves, and sees the products in the library list, with the call's tokens in `AiUsageLog`. A whole catalog works too |
| S-1 | Find products: by specs and keywords, by description (Voyage + pgvector), by similar image (product images captured from the PDFs) | G1 | 4 | Typing a real spec line or uploading a photo returns the right saved products, and P-4 can call the same engine for an RFQ line |
| F-4 | Row-level security on workspace tables: a restricted database role (a table's owner skips RLS), a per-transaction `workspaceId` setting, isolation tests | G2 | 2 | A test proves a query without the workspace setting returns no private rows. Lands before P-3 |
| P-3 | RFQ intake: any RFQ or specification (Excel, PDF, pasted text, image) becomes editable lines inside a project, confirmed one by one. Workspace files land here (brief §4) | G1 | 3 | A real RFQ in each format becomes normalized lines the user confirms one by one. Code strips price columns from Excel; how PDFs and images stay price-free is decided here |
| P-4 | Matching and options UI: each line calls the S-1 engine, and every option stays stored | G1 | 3 | Each line shows 3–5 options with compliance flags, and the user picks one or marks it manual. Sharpen G1 first: "or flagged" can be passed by flagging everything |
| R-1 | RFQ to brands: selected products grouped by brand into RFQ documents. Rough budget, designed after P-4 | G1 | 2 | Selected products become one RFQ document per brand, ready to send |
| P-5 | Priced quote and revisions: brand prices typed in or imported from Excel by code, never read by AI. Rough budget, designed after P-4 | G1 | 3 | Selected lines, priced by deterministic and tested code, produce a PDF quote, and a client change creates a new revision with its own selections |
| P-6 | Merged datasheet pack | G1 | 2 | One PDF: cover, index, and the datasheets in quote order |
| L-1 | Launch: production database, monitoring, roles walkthrough, G1 accuracy run, first real user set up | G2, G3 | 2 | G1 is measured on real RFQs, G2 is walked, and the first real user is ready to quote a live project |

## Founder actions

Delete a line once it's done.

- [ ] Before P-1.1: 3–5 real PDFs in a local folder: a short datasheet, one with a big variant table, a catalog section. Include a street or decorative product, not only downlights
- [ ] Before P-1.1: `ANTHROPIC_API_KEY` in `.env`, with a spending limit set in the Claude Console
- [ ] Before P-1.2: a private Blob store in Vercel, and `BLOB_READ_WRITE_TOKEN` in `.env`
- [ ] Before P-1.2: your own `User.role = 'ADMIN'`, by SQL on the dev branch
- [ ] Before P-3: make the GitHub repo private. It is public today, and real RFQs must not land there
- [ ] Before anyone else signs in by email: verify a domain in Resend, which until then delivers only to your own address
- [ ] Neon: a dev branch for local work. The production `DATABASE_URL` lives only in Vercel
- [ ] Vercel, for Production: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM` and `CRON_SECRET`, then redeploy. Vercel → Logs names any that are missing. Preview needs the sign-in keys too, with its `DATABASE_URL` on the dev branch
- [ ] Before launch: a separate production database, `npx prisma migrate deploy` against it, and every secret rotated, the Google client secret included (it was shared in a chat)
- [ ] GitHub: require CI on `dev` and `main`
- [ ] Brief: edit the mentions of Arabic (§2, §4.1, §9, §12, §13)

## Rules

- **On the queue?** Proceed, within the row's budget.
- **Found during a session?** If it blocks a gate, the founder decides on a row. Otherwise one line in LATER.md.
- **On neither?** Ask why now, and what drops to make room.

**Last updated:** 2026-11-02 · F-2 closed: app shell and workspace · next: P-1

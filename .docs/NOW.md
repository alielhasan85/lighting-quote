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
| C-1 | Catalogue reader and family map, as a local script: library tables, units, page kinds (price and scanned pages held from AI), page text and links, the fixture taxonomy, AI family map, usage log ([TODO](todo/PRODUCT_LIBRARY_TODO.md)) | G1 | 1 | `npm run catalogue:map` on 2 real 100–200 page catalogues prints each page's kind, the links and the family list with page ranges, class, mounting, headline specs, tokens and cost. In 20 pages checked, every family is found with its class right or flagged, and no price page sits in a range. A second run costs nothing. A test proves no held page reaches a request |
| C-2 | Every family extracted into candidates with page evidence, attached to a stable family identity with one search row, plus the golden set and a model comparison | G1 | 2 | Every family of the C-1 catalogues becomes a candidate with options, variants, a page and source for every value, and flags. The same family in two documents is one identity. CAVE 03 passes the pipeline in a test with no key. The golden set (≥ 6 families, 2 brands) prints score and cost per family for Opus 5.5 and Sonnet 5.5, and the founder picks the model |
| C-3 | Upload in the browser, background processing (Inngest), file storage, admin library pages, page viewer, held pages | G1 | 2 | As platform admin, the founder uploads a real catalogue in the browser, watches it reach READY with family counts, opens any page, and clears a held scanned page. The same file again starts nothing. A non-admin is refused on the pages, routes and action. A retried job leaves one usage row per family |
| C-4 | Discovery in three stages: an indexed search table narrows to ≈ 100–200 families, then code computes PASS/FAIL/UNKNOWN on their variants and ranks them in named steps. Text and code search. Products → Search in the workspace | G1 | 2 | **First demo.** A workspace member enters the criteria of 10 real spec lines. Each returns candidates with key specs, PASS/FAIL/UNKNOWN per criterion, the value, its page and printed text, labelled unverified, and the page opens. The founder notes the right product's rank. A search makes no AI call. On a seed of ≈ 500k families, stage 1 uses its indexes and meets the p95 target |
| C-5 | Verify a family beside its page; corrections join the golden set | G1 | 1 | The admin corrects a value beside its page and verifies the family. Search shows it as verified and ranks it first, and the export adds it to the golden set |
| F-4 | Row-level security on workspace tables: a restricted database role (a table's owner skips RLS), a per-transaction `workspaceId` setting, isolation tests. The global library tables carry no RLS, so search keeps its indexes: the restricted role gets SELECT only on them, by GRANT (library TODO D34). Admin rows of `ai_usage_log` are readable by that role and never writable | G2 | 2 | A test proves a query without the workspace setting returns no private rows, and the workspace role can't write a global row. Lands before P-3 and W-1 |
| P-3 | RFQ intake: any RFQ or specification (Excel, PDF, pasted text, image) becomes editable lines inside a project, confirmed one by one. Each confirmed line becomes the criteria object C-4's search takes. Workspace files land here (brief §4) | G1 | 3 | A real RFQ in each format becomes normalized lines the user confirms one by one. Code strips price columns from Excel; how PDFs and images stay price-free is decided here |
| P-4 | Matching and options UI: a job matches the whole BOQ through C-4's engine, one `LATERAL` query per chunk of lines, and adds the workspace-preferences rank step (preferred brands, recent and frequent use). Every option stays stored with its compliance result and a snapshot. Selecting one links its family to the workspace (`WorkspaceProduct`, by family and variant key), and the user can check its values privately | G1 | 3 | Each line shows 3–5 options with PASS/FAIL/UNKNOWN per criterion and its page, and the user picks one or marks it manual. Sharpen G1 first: "or flagged" can be passed by flagging everything |
| W-1 | **Decide first** (library TODO → Open decisions 5). Workspace catalogues: bulk upload into the workspace's private scope, through the same pipeline. Their search rows live in a separate RLS table, read with the global one by `UNION ALL` | G3 | 2 | A workspace's catalogue shows in its own search and never in another's (an RLS test proves it). A file identical to a global document links to it. Its own second upload costs nothing |
| W-2 | **Decide first** (as W-1). One item: a datasheet, photo or typed specs for a line, then "Save to my products?" | G3 | 1 | On a line with no match, the user adds a datasheet, it's extracted privately and used on the line. Yes puts it under Products → Mine; No keeps it on the line only |
| R-1 | RFQ to brands: selected products grouped by brand into RFQ documents. Rough budget, designed after P-4 | G1 | 2 | Selected products become one RFQ document per brand, ready to send |
| P-5 | Priced quote and revisions: brand prices typed in or imported from Excel by code, never read by AI. Each line keeps the snapshot from its selection. Rough budget, designed after P-4 | G1 | 3 | Selected lines, priced by deterministic and tested code, produce a PDF quote, and a client change creates a new revision with its own selections. A newer catalogue version leaves a sent quote unchanged |
| P-6 | Merged datasheet pack. A compliance table, if printed, says "complies" only for values a person checked (library TODO → Open decisions 4) | G1 | 2 | One PDF: cover, index, and the datasheets in quote order |
| L-1 | Launch: production database, monitoring, roles walkthrough, G1 accuracy run, first real user set up | G2, G3 | 2 | G1 is measured on real RFQs, G2 is walked, and the first real user is ready to quote a live project |

## Founder actions

Delete a line once it's done.

- [ ] Answer the open decisions in the [library TODO](todo/PRODUCT_LIBRARY_TODO.md#open-decisions). Each names the row it blocks
- [ ] Before C-1: 2 real catalogues of 100–200 pages from 2 brands, publicly available, one with a price page and one with a scanned page. Plus 3–5 datasheets: a short one, one with a big variant table, a street or decorative product
- [ ] Before C-1: `ANTHROPIC_API_KEY` in `.env`, with a spending limit set in the Claude Console
- [ ] Before C-3: the storage store (Open decisions 1) and its token in `.env`
- [ ] Before C-3: your own `User.role = 'ADMIN'`, by SQL on the dev branch
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

**Last updated:** 2026-11-04 · library strategy revised: document-first discovery replaces P-1 and S-1, then re-audited
for scale (stable identity, search table, taxonomy, staged ranking) · next: C-1

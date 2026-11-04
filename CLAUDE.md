# lighting-quote — Claude Code Instructions

@AGENTS.md

**lighting-quote (working name) is an AI quoting & submittal platform for lighting projects:** a contractor or lighting
supplier uploads any RFQ or specification, picks from 3–5 matched products per line, sends RFQs to the brands, and sends
the client a priced quote with its datasheet pack, revising it as the client changes things. Multi-tenant SaaS: every
company is a **workspace**, and every workspace's data is isolated. The why:
[.docs/PROJECT_BRIEF.md](.docs/PROJECT_BRIEF.md).

## Product rules

### Data and tenancy

- Every company (contractor or supplier) is a **workspace**. Every private table has `workspaceId`, and every query on
  it filters by it.
- Isolation is enforced in code today: every page and action names a permission, and every query filters by
  `workspaceId`. Postgres row-level security is NOW.md row F-4, and lands before P-3 and W-1, the first private project
  data and the first private uploads.
- **Global library** (brands, catalogues with their versions and pages, families with their extractions and variants,
  the search table, images: public technical data) is shared and read-only for workspaces. Only platform admins write
  it (`createAdminAction`). It takes publicly available manufacturer documents only, with each document's source
  recorded. From F-4 it carries no RLS: the app's database role gets SELECT only on it, by GRANT, so search keeps its
  indexes. Every table a brand owns as a unit carries `brandId`.
- **Private data** (prices, private products, clients, projects, inquiries, quotes, selections, usage history) lives
  only in workspace tables. A workspace's own catalogues and products will be rows with its `workspaceId` in the library
  tables (W-1, after F-4), with their search rows in a separate RLS table. A workspace's links to products point at the
  stable family (`ProductFamily` + variant key), never at one extraction.
- **One-way flow:** global → workspace. Nothing from a workspace is ever written into global tables or used for
  another workspace. A workspace's searches, selections and uploads never change what the global library extracts,
  verifies or ranks, so global families are extracted at upload, never on demand.
- No cross-workspace analytics, aggregates or "market price" features, including "most used" signals for deciding what
  to verify. Ever.

### AI

- AI (Claude API) is used for extraction, matching/ranking, explanations and image description.
- **Prices are never computed or seen by AI.** Pricing is deterministic TypeScript. No price data in any prompt.
- A document page reaches a prompt only if code classed it as a text page or a person cleared it: price pages,
  scanned pages and excluded pages never do, and a test proves it. Extraction schemas have no price field.
- **AI never invents a value and never declares compliance.** Every extracted value carries its document version, page
  and printed text, and code checks that text is on that page. PASS / FAIL / UNKNOWN is deterministic code.
- AI calls receive the minimum data needed. No supplier names, client names or prices in matching prompts.
- All AI output that becomes data is validated with a zod schema (`lib/ai/schemas/`). Invalid → retry once → mark for
  human review.
- Every AI suggestion is editable. Nothing is sent to a client without explicit user approval.
- Log every AI call (workspace, feature, model, input/output tokens, duration) in `ai_usage_log`.
- Prompts are versioned files in `lib/ai/prompts/`, not inline strings.

### Design for expansion

- **Project** is the central entity: inquiries, quotes (later sales orders, POs, deliveries, follow-ups) belong to a
  project.
- Quote lines reference real product variants (global or private), not free text (free text only for "manual / no
  match" lines).
- A quote line, and each stored option, keeps a snapshot: variant, options, specs, document version, page, printed
  text. A new catalogue or a re-extraction never changes a sent quote.
- Uploaded documents and their versions are kept. A new version supersedes the old one and never overwrites it, and a
  re-extraction never edits a verified family.
- **Search** reads the search table and filters only on fields that are almost always present. A missing value is
  UNKNOWN in code, never a filter. Ranking runs in named steps (compliance → technical rank → the workspace's own
  preferences → later, a sponsored slot shown apart), and no step after compliance changes PASS / FAIL / UNKNOWN.
- Documents (client quote and brand RFQ; later sales order, PO) share one structure: number series, status, lines,
  revisions, PDF.
- Status changes are recorded in an **event log** table.
- Brands can hold vendor details (contacts, currency, lead time) for RFQs now and POs later.
- Stock fields (inStock, qty, leadTimeDays) are optional and live on workspace tables: stock is private, never global.
- A module is `lib/<module>/` (rules), `lib/queries/<module>.queries.ts`, `lib/actions/<module>.actions.ts` and its
  routes. A module reads another's data through that module's queries, never its tables.
- Never build a module from LATER.md (sales orders, purchase orders, inventory, CRM) early. Only keep the design ready.

### Conventions

- Units normalized in code (`lib/units.ts`): W, lm, K, IP, IK as numbers; ranges as min/max.
- Money as integer minor units + currency code. Never floats for money.
- UI: shadcn components, desktop-first, keyboard-friendly: engineers work through 100+ lines with arrows and Enter.

---

## Start here

- **[.docs/NOW.md](.docs/NOW.md) decides scope.** On the queue → proceed within its budget. In
  [LATER.md](.docs/todo/LATER.md) → defer. Neither → ask why now and what drops. Search it; don't read it whole.
- **`/start-session <row>`** plans a session. **`/end-session <row>`** closes it: the founder runs it after `/clear`,
  once they've tested.
- **Read the reference before the code.** [.docs/README.md](.docs/README.md) maps features to references. Grep the
  headings, then read the Quick Reference and the sections the change touches:
  [REFERENCES.md](.docs/guides/REFERENCES.md).
- **Where code goes:** [ARCHITECTURE.md](.docs/guides/ARCHITECTURE.md). **How a session runs:**
  [WORKFLOW.md](.docs/guides/WORKFLOW.md).

## Hard rules

1. **The founder lands code.** Never `git commit`, `push`, amend or rebase. Draft the commit message only in
   `/end-session`.
2. **Plan before code.** Quick lane (≤3 files, no schema, auth, money or personal data): name the files in one line,
   then build. Everything else: plan mode, and the founder approves first. No Explore or Plan agents where a
   reference covers the area. Never guess a business rule: ask.
3. **One deliverable per session,** about 5–30 files, within its row's budget. Found but not fixed → one line in
   LATER.md, never a new TODO file.
4. **Security in every plan:** each action names its permission, each query filters by `workspaceId`, each input is
   parsed with zod ([ARCHITECTURE → Security](.docs/guides/ARCHITECTURE.md)).
5. **Scale in every plan:** lists paginate, queries select only what's shown and have an index, no query runs in a
   loop ([ARCHITECTURE → Scale](.docs/guides/ARCHITECTURE.md)).
6. **Test first for logic.** Prices, permissions, statuses, limits, dates and parsing are proven by a Vitest test,
   not by looking.
7. **Verify before saying done:** `typecheck`, `lint`, `test`, `check:actions`, once per task. All must be clean:
   there is no backlog.
8. **Docs in the same commit:** TODO → reference → NOW.md, edited in place. Current state only, never a log.
9. **The UI never touches the database.** Reads in `lib/queries/`, writes as server actions in `lib/actions/` built
   by a factory (lint and `check:actions` enforce both).
10. **No `any`,** and no file-wide `eslint-disable`: `// eslint-disable-next-line <rule> -- <why>`.
11. **Protect data.** Local work uses the Neon dev branch. Never read `.env`. Never run `prisma migrate reset`,
    `migrate deploy` or `db push`: hand the founder the command.
12. **Minimal diffs.** No rewrites, and no new dependency without asking.
13. **Don't run `dev` or `build`** unless asked. Never set `ignoreBuildErrors`.

## Repo map

```
app/             Routes. Workspace pages under app/(app)/w/[workspaceId]/; one feature's UI lives in its route folder
components/      Shared UI · components/ui/ = shadcn
lib/actions/     Writes ('use server', via a factory) · lib/queries/ = reads · lib/<feature>/ = pure rules
lib/auth/        Permissions, guards, the session reader · auth.ts = Auth.js config
lib/ai/          Claude + embeddings clients · prompts/ (versioned) · schemas/ (zod for AI output)
lib/jobs/        Background jobs (Inngest)
prisma/          Schema and migrations · lib/db.ts = the client
tests/fixtures/  Anonymized RFQs, datasheets and expected outputs: the accuracy test set
.docs/           NOW.md, references/, todo/, guides/, PROJECT_BRIEF.md
```

**Stack:** Next.js 16 (App Router, server actions) · React 19 · TypeScript strict · Prisma 6 + Neon · Auth.js v5 ·
Tailwind + shadcn/ui · zod · Vitest · Vercel. Added by the row that first needs them: Claude API (`@anthropic-ai/sdk`),
`unpdf`, `pdf-lib`, Inngest, file storage (Vercel Blob or R2: to decide), SheetJS / ExcelJS, React-PDF, Sentry. Later:
Voyage embeddings + pgvector.

## Commands

```bash
npm run typecheck        # next typegen && tsc --noEmit
npm run lint             # every rule is an error
npm test                 # vitest
npm run check:actions    # every 'use server' export goes through a factory
npx prisma validate      # safe
npx prisma generate      # safe; after any schema edit
npx prisma migrate dev --name <name>   # the founder only, against the dev branch
```

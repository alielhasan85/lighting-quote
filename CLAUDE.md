# CLAUDE.md

AI quoting & submittal platform for GCC lighting suppliers (working name: [TBD]).
Full product idea: `docs/PROJECT_BRIEF.md`. Read it before any new part.

## How to work in this repo

1. At the start of a session, read this file, then the doc for the part you are working on (`docs/parts/NN-*.md`) and its skill if one exists.
2. Work on **one part / one task per session**. Do not touch other modules unless the task requires it.
3. Before coding a non-trivial change: write a short plan (files, schema changes, steps) and wait for approval.
4. Implement against the **acceptance criteria** in the part doc. If something is unclear or missing, ask — do not guess business rules.
5. After finishing: run typecheck, lint and tests; update the part doc (status, decisions, open points). Record important decisions in `docs/decisions/`.
6. Never build future modules (sales orders, purchasing, inventory, CRM) early. Only keep the design ready for them (see "Design for expansion").

## Non-negotiable rules

### Data and tenancy
- Every supplier is a **workspace** (tenant). Every private table has `workspaceId`.
- Tenant isolation is enforced in the database with **Postgres row-level security**, not only in app code. Never query private tables without the workspace context set.
- **Global library** (brands, families, variants, datasheets, images — public technical data) is shared and read-only for workspaces.
- **Private data** (prices, private products, clients, projects, inquiries, quotes, selections, usage history) lives only in workspace tables.
- **One-way flow:** global → workspace. Nothing from a workspace is ever written into global tables or used for another workspace.
- No cross-workspace analytics, aggregates or "market price" features. Ever.

### AI usage
- AI (Claude API) is used for: extraction, matching/ranking, explanations, image description.
- **Prices are never computed or seen by AI.** Pricing is deterministic TypeScript code. Do not send price data in any AI prompt.
- AI calls receive the minimum data needed. No supplier names, client names or prices in matching prompts.
- All AI output that becomes data must be validated with a **Zod schema**. Invalid output → retry once → mark for human review.
- Every AI suggestion is editable. Nothing is sent to a client without explicit user approval.
- Log every AI call (workspace, feature, model, input/output tokens, duration) in `ai_usage_log`.
- Keep prompts in `server/ai/prompts/` as versioned files, not inline strings.

### Design for expansion
- **Project** is the central entity: inquiries, quotes (later sales orders, POs, deliveries, follow-ups) belong to a project.
- Quote lines reference real product variants (global or private), not free text (free text allowed only for "manual / no match" lines).
- Documents (quote now; later sales order, RFQ, PO) share a common structure: number series, status, lines, revisions, PDF output.
- Status changes are recorded in an **event log** table.
- Brands can hold vendor details (contacts, currency, lead time) for future RFQs/POs.
- Products have optional stock fields (inStock, qty, leadTimeDays).
- Modules live in their own folders and talk through service functions, not direct cross-module table access.

## Tech stack

- Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui
- Neon Postgres + Prisma; pgvector for embeddings
- Clerk (organizations = workspaces, roles: admin, manager, sales)
- Claude API (`@anthropic-ai/sdk`); Voyage embeddings (text + multimodal)
- Inngest for background jobs (ingestion, BOQ parsing)
- Vercel Blob (or R2) for files
- SheetJS (read Excel), ExcelJS (write Excel), React-PDF (quotes), pdf-lib (merge datasheets)
- Zod for validation; Vitest for tests; Sentry for errors

## Folder structure

No `src/` directory: code lives at the repo root (same convention as our other projects).

```
app/                    # routes (UI)
  (app)/home, projects, quotes, products, clients, price-lists, settings
modules/                # one folder per module (business logic)
  library/              # Part 1: global + private product library, ingestion
  workspace/            # Part 2: workspace settings, brands carried, pricing rules
  intake/               # Part 3: inquiry upload + extraction
  matching/             # Part 4: matching, options, image search, usage learning
  quotes/               # Part 5: quote builder, pricing engine, PDF/Excel
  submittals/           # Part 6: datasheet pack
server/
  db/                   # prisma client, RLS helpers (withWorkspace)
  ai/                   # Claude + embeddings clients, prompts/, schemas/
  jobs/                 # Inngest functions
components/             # shared UI (shadcn)
lib/                    # utils, units normalization, formatting
prisma/                 # schema + migrations
docs/
  PROJECT_BRIEF.md
  architecture.md
  data-model.md
  security.md
  roadmap.md
  parts/01-brand-library.md ... 07-crm.md
  decisions/
tests/
  fixtures/             # anonymized BOQs, datasheets, expected outputs
```

## Coding conventions

- TypeScript strict, no `any`. Server-only code stays in `server/` or module `server/` files.
- Server Actions or route handlers validate input with Zod.
- All DB access to private data goes through `withWorkspace(workspaceId, fn)` (sets RLS context).
- Units normalized in code (`lib/units.ts`): W, lm, K, IP, IK as numbers; ranges as min/max.
- Money as integer minor units + currency code. Never floats for money.
- UI: shadcn components, desktop-first, keyboard-friendly, RTL-ready (use logical CSS: `ms-`, `me-`, `ps-`, `pe-`, `start`, `end`).
- Small, focused commits with clear messages.

## Commands

```
npm run dev          # start dev server
npm run typecheck    # tsc --noEmit
npm run lint
npm run test         # vitest
npx prisma migrate dev
npx inngest-cli dev  # local background jobs
```

## Do not

- Do not send prices or client/supplier identity to AI.
- Do not write supplier data into global tables.
- Do not add a dependency without stating why.
- Do not change the Prisma schema without updating `docs/data-model.md`.
- Do not build modules marked "later" in the roadmap.

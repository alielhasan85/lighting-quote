# Product library — build plan

> **Status:** next: P-1.1 · **NOW.md rows:** P-1 · **Reference:** none yet

Search and matching are only as good as the product data behind them. This part turns a brand's PDF datasheet or catalog
into reviewed, normalized products in the database.

**The flow:** sign in as platform admin, open `/admin/library`, and drop in a PDF. Extraction runs in the background. The
review screen shows the PDF beside the extracted products; you correct anything and approve, and they appear in the
library list.

## Decisions

Sessions don't reopen these.

| # | Decision | Why |
|---|---|---|
| D1 | One shared library first, filled by the platform admin. The same pipeline can later feed a company's private products | It holds public technical data, so it needs no workspace, and every customer benefits from it |
| D2 | Nothing becomes a product without human approval. Extraction stays a draft on the uploaded document until then | Every AI suggestion is editable, and bad data would poison every later search |
| D3 | `claude-opus-5-5`, set in one constant, through `messages.parse` with `zodOutputFormat`. Invalid output gets one retry, then is marked for review | The current default. Real cost is logged, so after P-1.1 Sonnet 5.5 and Haiku 5.5 can be compared on the same PDFs. The founder picks |
| D4 | Claude takes 32 MB per request and 600 pages. Base64 adds about a third, so about 24 MB of PDF fits in one request. Longer files are split with `pdf-lib` | A whole catalog won't fit in one call |
| D5 | Files live in one private Vercel Blob store, under `global/`, and upload from the browser. The client then calls an admin action to register the document | Vercel functions accept only about 4.5 MB, and Blob's completion callback doesn't reach localhost |
| D6 | Background work runs in Inngest. Local work needs no keys, but its dev server runs beside the app | The architecture rules put AI calls in a job, and retries must not bill twice |
| D7 | The extraction schema has no price field. Upload technical pages, not price lists | A price can't be stored, but anything in the PDF reaches Claude |
| D8 | Common specs are real columns; the rest go in an `extraSpecs` JSON field | Street, tunnel and decorative products differ, and a new type shouldn't need a migration |
| D9 | Stock fields don't go on these tables | Stock is private, and these tables are global |
| D10 | Not in this part: search, embeddings, images, private products, workspaces, invites | S-1 and later rows |

## Tables

No `workspaceId`: this is global data. Final fields are set against real PDFs in P-1.1.

- **Brand:** name (unique), country, website, optional vendor contact, currency and lead time.
- **ProductFamily:** brand, name, description, fixture type (downlight, linear, street, tunnel, flood, decorative...),
  applications, mounting, material, finish, source document. Unique per brand and name.
- **ProductVariant:** family, order code, watts, lumens and CCT as min/max, CRI, IP, IK, beam angle, dimming, voltage,
  dimensions, lifetime, `extraSpecs`. Indexed for S-1's filters.
- **SourceDocument:** file path, name, size, SHA-256 (unique, so the same file isn't paid for twice), status (`UPLOADED`,
  `EXTRACTING`, `NEEDS_REVIEW`, `APPROVED`, `FAILED`), draft JSON, error code, who uploaded it.
- **AiUsageLog:** optional workspace, feature, model, input and output tokens, duration, success. Mapped to
  `ai_usage_log`, the name in CLAUDE.md.

## Security and scale

- Every action uses `createAdminAction`, and both file routes check `requirePlatformAdmin` themselves.
- Uploads accept PDFs only, checked by size, type and the file's first bytes. All inputs are parsed with zod.
- Lists paginate and select only what they show. Saving an approved draft runs in one transaction.
- Extraction runs in a retryable job that checks status first, so a retry can't save twice or bill twice.
- CI uses a recorded AI response, so it needs no key and spends nothing.

## Sessions

| Session | What | Budget | State |
|---|---|---|---|
| P-1.1 | Tables, units, Claude extraction, usage log, local test script | 1 | |
| P-1.2 | Admin area in F-2's shell, private upload, background job | 1 | |
| P-1.3 | Review screen, approve and save, library list | 1 | |
| P-1.4 | Long catalogs and duplicates | 1 | |

### P-1.1 — A real PDF becomes validated data

- **Founder first:** the PDFs and API key from NOW.md, then `npx prisma migrate dev --name product_library` on the dev
  branch.
- **Rules, tests first:** `lib/units.ts` parses `10W`, `IP65`, `IK08`, `2700/3000K` and `1000-1200 lm`.
  `lib/library/draft.ts` turns a draft into rows and is pure. `lib/library/constants.ts` holds the statuses.
- **AI:** `lib/ai/client.ts`, `lib/ai/usage.ts`, `lib/ai/extract-datasheet.ts`, `lib/ai/prompts/datasheet-extraction.v1`,
  `lib/ai/schemas/datasheet.ts`. Warn about a missing `ANTHROPIC_API_KEY` the way `lib/auth/secrets.ts` does.
- **Script:** `scripts/extract-datasheet.ts <file.pdf>` prints the result, tokens and cost. It writes to `AiUsageLog` only.
  `server-only` modules need `--conditions=react-server` under `tsx`, and `.env` needs `--env-file=.env`.
- **New dependencies:** `@anthropic-ai/sdk`, `tsx` (dev only).

**Done when:** the script turns each test PDF into a valid family and variants with normalized units; an invalid AI
response gets one retry and is then marked for review; and `AiUsageLog` has one row per call. The founder compares the
output with the PDFs, and the fields are corrected before P-1.2.

### P-1.2 — Upload in the browser

- **Guard:** add `requirePlatformAdminPage` to `lib/auth/authz.ts`, following `requireWorkspacePermissionPage`.
- **Pages:** `app/(admin)/admin/library/`, list and upload, in F-2's sidebar shell with tabs (Uploads, Products). A
  platform admin gets a Library link in the sidebar. Update ARCHITECTURE → Where things go, and AUTH_REFERENCE.
- **Files:** `app/api/library/upload/route.ts` (`handleUpload`), `app/api/library/files/[...path]/route.ts` (streams a
  private file), and `registerSourceDocument` in `lib/actions/library.actions.ts`. Reads go in
  `lib/queries/library.queries.ts`.
- **Job:** `lib/jobs/`, `app/api/inngest/route.ts`. It computes the file's hash, runs extraction and moves the status.
- **Build note:** `next.config.ts` turns on `cacheComponents` and `partialPrefetching`, so read
  `node_modules/next/dist/docs/` before writing these pages.
- **New dependencies:** `@vercel/blob`, `inngest`, and any shadcn components the pages need.

**Done when:** signed in as platform admin, the founder uploads a PDF in the browser and sees its status move through
`EXTRACTING` to `NEEDS_REVIEW` or `FAILED`; and a non-admin is refused on the page, both routes and the action.

### P-1.3 — Review and save

- **Review page:** `app/(admin)/admin/library/[documentId]/`. The PDF, through the guarded route, sits beside the family
  and its variants in an editable table. Keyboard-friendly.
- **Approve:** pick or create the brand, then write the family and variants in one transaction and set `APPROVED`.
- **Library list:** paginated families and variants. A `FAILED` document can be retried.

**Done when:** signed in as admin, the founder uploads a real PDF, corrects a field beside the PDF, approves, and sees
the products in the library list, with the call's tokens in `AiUsageLog`. **This is the first milestone.**

### P-1.4 — Whole catalogs

- Split long files by page range with `pdf-lib`, each part inside D4's limits. One catalog can yield many families, which
  are reviewed one at a time.
- Uploading the same file again points to the existing document and starts no new extraction.
- **New dependency:** `pdf-lib`.

**Done when:** a whole catalog is split and extracted, its families can be reviewed and approved one at a time, and
uploading the same file again costs nothing.

# Product library and discovery — build plan

> **Status:** next: C-1 · **NOW.md rows:** C-1 to C-5 (W-1, W-2 to decide) · **Reference:** none yet

Search and matching are only as good as the product data behind them, and no one can review every family before it's
needed. So an uploaded catalogue is searchable at once:

- Every family is extracted into a candidate, and each value carries its page and printed text.
- A deterministic engine says PASS, FAIL or UNKNOWN per criterion.
- A person verifies what gets used.

**Scale it's designed for** (decide: 14): hundreds of brands, ≈ 100k–500k families, ≈ 2–10M variant rows.
Order codes as every option combination (≈ 10–100M) are never stored. The library is one database of public technical
data, owned per brand (D36). A brand portal, where brands manage their own data and placement, is LATER, and these
tables are shaped so it doesn't need a migration.

**Tags:**

- **built:** in the repo
- **on disk:** written but uncommitted, from the paused P-1.1
- **proposed:** planned, not built
- **decide:** waiting on the founder, under [Open decisions](#open-decisions)

**The flow** (proposed):

1. **Upload.** A platform admin uploads a catalogue or datasheet at `/admin/library`. C-1 and C-2 use scripts until C-3
   builds the page.
2. **Read.** Code reads every page: text, links, and its kind. Price, scanned and excluded pages are held back from AI.
3. **Map.** AI lists the families: page ranges, shared pages, type, mounting and headline specs.
4. **Extract.** Each family becomes a candidate with options, variants and evidence per value, attached to the
   family's stable identity. It's searchable, labelled unverified.
5. **Index.** Each family's current extraction becomes one row in the search table.
6. **Search.** Under Products → Search, criteria narrow the search table to ≈ 100–200 families. Code then computes
   PASS/FAIL/UNKNOWN on their variants and ranks them.
7. **Verify.** The admin checks a family beside its page, and it becomes verified.

## Decisions

Sessions don't reopen a proposed decision. A **decide** one is answered under Open decisions first.

| # | Decision | Why | State |
|---|---|---|---|
| D1 | The global library is filled by the platform admin. Workspace libraries (private) come later, through the same pipeline, after F-4 | Public technical data needs no workspace, and every customer benefits from it | proposed · W rows: decide (5) |
| D2 | **Nothing becomes *verified* without a person.** An extracted family is searchable at once as an unverified candidate, every value with its page | Review hours were the bottleneck (≈ 1,000 h for 30k families). Evidence and labels keep unverified data honest | proposed |
| D3 | `claude-opus-5-5` set in one constant, through `messages.parse` with `zodOutputFormat`, with effort set explicitly. Invalid output gets one retry, then NEEDS_REVIEW. The model for each task (map, family) is picked by the founder on golden-set numbers: the cheapest whose numeric fields score within 2 points of Opus 5.5 and that misses no icon or drawing flag | Real cost is logged, so models are compared on the same pages | proposed |
| D4 | Each family's allowed pages, plus its shared pages, are cut into their own small PDF (`pdf-lib`). The map reads page text. Claude takes 32 MB and 600 pages per request | Small calls are parallel and retryable, and price pages stay out | proposed |
| D5 | Files in one private store: `global/` now, `w/<workspaceId>/` from W-1, behind one `lib/storage/` module. Browser uploads go straight to the store, then an admin action registers the document | Vercel functions accept only ≈ 4.5 MB | decide (1) |
| D6 | Background work runs in Inngest: one step per family, concurrency-limited. Local work needs no keys, but its dev server runs beside the app | AI calls belong in a job, and retries must not bill twice | proposed |
| D7 | The extraction schema has no price field, and price pages never reach a prompt ([Price pages](#price-pages)) | Catalogues often contain price lists | proposed |
| D8 | Common specs are real columns; the rest go in an `extraSpecs` JSON field. A spec is a column at the level it's printed: family-wide values on the extraction, values a performance row changes on the variant (D30). `extraSpecs` is never filtered in SQL: compliance reads it in code (D32) | Street, tunnel and decorative products differ, and a new type shouldn't need a migration | proposed |
| D9 | No stock fields on these tables | Stock is private, and these tables are global | proposed |
| D10 | In this part: upload, extraction, search by specs and text, compliance, verify. Not in it: images, drawing crops, embeddings, search by image (LATER), private products (W rows) | The first demo needs specs, pages and PASS/FAIL/UNKNOWN | proposed · image: decide (7) |
| D11 | AI reads and labels. Code converts (`lib/units.ts`), expands and checks. Claude returns each value as printed, with its page and source. `unpdf` reads the text layer and links | Misread units are caught by tests, not by looking | proposed · test on disk |
| D12 | **A variant row exists only where specs change.** An axis is a variant axis when the performance table gives it different specs. Otherwise it's a family option (colour, accessory). A quote line stores the variant plus the chosen options. Options that change no spec are never multiplied into variant rows (D30) | Keeps the table 3–10× smaller | proposed · test on disk |
| D13 | Evidence per value: document version, page, printed text (`raw`) and source (TEXT, TABLE, DRAWING or ICON). Code checks the printed text is on that page's text layer. Drawing and icon values, values not found, and values from a page with no text layer are NEEDS CHECK. Citations can't be combined with structured output, so evidence is a schema field. A family value carries its own evidence. A variant's evidence is the printed row or rows it was built from (page plus row text), which cover every value in it (D30) | Every value can be traced, and the basis drives compliance (D26) | proposed |
| D14 | An order code only as printed. A code with blanks stays a template, flagged "code incomplete", and the brand RFQ names family + variant + options and asks for the code | No invented codes | proposed |
| D15 | Golden set in `tests/fixtures/datasheets/`: page text, a recorded response, the expected result, and expected family maps. It grows from C-5's corrections. Any change to a prompt, schema or model is measured on it | Accuracy is a number, not a feeling | proposed · CAVE 03 on disk |
| D16 | `Brand` is global and public: name, country, website. A workspace's contacts, currency and lead time for a brand go in `WorkspaceBrand` (R-1) | Vendor details are private | proposed |
| D17 | Workspace catalogues use the same evidence and identity tables with a nullable `workspaceId` (null = global) on every row, children included. Their search rows go in a separate `WorkspaceFamilySearchRow` (D34). `WorkspaceProduct` links point at a `ProductFamily` plus a variant key, never at an extraction. Copy-on-write corrections to global families come later | RLS checks one column, the library isn't copied per workspace, and global search keeps its indexes | decide (5) |
| D18 | Sources: PDF catalogues and datasheets. An image source (one photo of a datasheet) arrives with W-2. Product page links come with internet discovery (LATER) | Catalogues are the main input | proposed |
| D19 | Claude returns each figure's box (page + fractions of the page), stored with the family | Images can be cropped later without a second AI call | proposed |
| D20 | A catalogue is mapped first: families, page ranges, shared pages (icon legend, general notes), class and mounting from the taxonomy (D35), headline specs. Code checks every allowed page is in a family or marked non-product, and lists the rest. No hand calibration before bulk: the golden set measures instead | The map splits a catalogue into small calls, and a missed family is visible | proposed |
| D21 | No brand profiles until golden-set scores show brand-specific errors a profile fixes (LATER) | Not worth a table before the numbers say so | proposed |
| D22 | Documents are first-class: Catalogue → CatalogueDocument (one version) → CataloguePage. The same file (SHA-256) is never processed twice in the same scope | Every value points to a version and a page | proposed |
| D23 | Every page has a kind: TEXT, PRICE, SCANNED or EXCLUDED. Only TEXT pages and pages a person cleared reach a prompt | Prices never reach AI | proposed · mixed pages: decide (9) |
| D24 | **Global families are extracted at upload, never on demand.** A workspace's search never triggers a global extraction. Workspace catalogues are extracted at upload by default, and W-1 may switch them to on demand on measured cost | On-demand extraction of global families would be a workspace action writing global tables, and its record would show what workspaces search for | decide (2) |
| D25 | Extraction status: CANDIDATE, VERIFIED or SUPERSEDED. Re-extraction never edits a VERIFIED extraction: it writes a new one and supersedes an unverified one. Which extraction is current for a family is D31 | Stored options and quote lines never lose their variant | proposed · who verifies: decide (3) |
| D26 | Compliance is pure code: PASS, FAIL or UNKNOWN per criterion, each with its value, page, printed text and basis (VERIFIED, MATCHED or NEEDS CHECK). A missing value is UNKNOWN. Ranking is deterministic, in named steps (D33). AI never declares compliance | The same criteria always give the same answer, with evidence | proposed · unchecked values: decide (4) |
| D27 | A quote line, and each stored option, keeps a snapshot: variant, options, specs used, document version, page, printed text, model, prompt version and basis | A new catalogue or a re-extraction never changes a sent quote | proposed |
| D28 | Original documents and their versions are kept. A new version is a new document, and the old one gets `supersededById`. Search reads only the search table, which holds current families only (D32) | Old quotes stay traceable | proposed |
| D29 | The global library takes publicly available manufacturer documents only. Each document records its source URL and the admin's confirmation | Manufacturer terms are respected. A workspace's uploads are its own responsibility (terms of service) | proposed |
| D30 | **Store what is printed.** Family-wide values (IP, IK, CRI, UGR, class, dimming, material…) live once on the extraction, with evidence per field. A variant row holds only what its spec-changing axes change (W, lm, CCT, beam, order code, sometimes dimensions). There's one row per printed performance row, or one per D12 combination when the specs are printed in separate tables (length × CCT in one, beam in another), within `MAX_VARIANTS_PER_FAMILY`. Options that change no spec (colour, accessory, driver) are never multiplied in. The effective variant is the family values overridden by the variant's, merged in code. Claude returns a table as printed (headers, rows of raw cells, page) and code builds the rows. Full order codes are composed at selection from the template (D14), never stored as every combination | A brand with 100k order codes stays at tens of rows per family, evidence isn't repeated per row, and big tables cost fewer output tokens | proposed |
| D31 | **A stable identity per family:** `ProductFamily` (scope, brand, normalized family code or name, `currentExtractionId`). Every `FamilyExtraction`, from a datasheet, a catalogue or a later edition, attaches to one. Search shows only the current extraction. Workspace links point at the identity. The admin can merge or split identities (C-5) | One product shows once, links survive re-extraction, and a brand can later claim its families | proposed · which extraction is current: decide (11) |
| D32 | **Search in three stages.** (1) Indexed SQL on the search table: scope, taxonomy class and its related classes, mounting when given, overlap on the primary band (W or lm), plus text and trigram when the line names a brand, model or code. It returns the top ≈ 100–200 families. (2) One query reads their variants and the workspace's own rows for them. (3) Pure code computes compliance and ranks. Only fields that are almost always present filter in SQL, and a missing value is UNKNOWN in code, never a `WHERE` clause. A whole BOQ is matched in a job with one `LATERAL` query per chunk of ≈ 50 lines | `col >= x OR col IS NULL` on many columns defeats every index on millions of rows | proposed · targets: decide (14) |
| D33 | **Ranking in named steps,** each recorded on the result: compliance (fixed) → technical rank → the workspace's own preferences (preferred brands, recent and frequent use) → *(brand portal, later)* a separate, labelled sponsored slot. No step after compliance changes PASS/FAIL/UNKNOWN, and preferences never lift a FAIL above a PASS | The user can see why an option is first, and paid placement can never bend the technical match | proposed · sponsored slot: decide (15) |
| D34 | **Search is separate from access control.** Global data (evidence, identity, search rows) has no RLS: the app's database role reads it by GRANT and can't write it. A workspace's private search rows live in `WorkspaceFamilySearchRow` (W-1), with RLS. Search reads both with `UNION ALL` | On a table with RLS, Postgres doesn't use GIN or trigram indexes, because those operators aren't leakproof, so every keyword search would scan the global library. F-4 and C-4 prove this with EXPLAIN on Neon | decide (12) |
| D35 | **A controlled taxonomy** in `lib/library/taxonomy.ts`: luminaire classes (with related classes), mountings and applications, each class mapped to an ETIM class id where one exists. The family map picks from it (zod enum) or returns OTHER with a flag, and P-3 maps RFQ lines onto the same list | The class is search's main narrowing key, so library and lines must speak one vocabulary. ETIM ids keep a later structured-feed import a mapping | decide (13) |
| D36 | **One library, owned per brand.** `brandId` sits on every table a brand owns as a unit (Catalogue, CatalogueDocument, ProductFamily, FamilyExtraction, FamilySearchRow), with an index that leads with it. Pages and variants reach the brand through their parent. The partition is logical: there are no Postgres partitions by brand until a brand's full re-load becomes slow or bloats the tables | Brand-scoped replacement and a later brand permission are one check. A search runs across every brand, so physical partitions wouldn't make it faster, and Prisma doesn't manage them | proposed |

## Tables

All proposed. ★ = C-1 to C-5, global only: no `workspaceId` until W-1. Final fields are set against real catalogues in
C-1 and C-2.

Three layers:

- **Evidence:** what each document says, never edited in place, read by id.
- **Identity:** the same product across documents (D31).
- **Search:** one narrow row per current family, the only table search stage 1 reads (D32).

| Table | Key fields | Status | Indexes |
|---|---|---|---|
| ★ **Brand** | name, country, website | | unique(name) |
| ★ **Catalogue** | brand, title, kind (CATALOGUE / DATASHEET). Groups the versions of one publication | | (brandId) |
| ★ **CatalogueDocument** | catalogue, brand (D36), versionLabel, sha256, size, pageCount, fileName, storageKey (null until C-3), sourceUrl, publicConfirmedById/At, excludedPages, uploadedById, errorCode, `supersededById` | UPLOADED → INDEXED → MAPPED → READY · FAILED | unique(sha256) · (catalogueId, createdAt) · (brandId) |
| ★ **CataloguePage** | document, pageNumber, text, links, textCoverage, kind, kindSetById (null = set by code). Its text feeds its family's search row, so users never search pages directly | TEXT · PRICE · SCANNED · EXCLUDED | unique(documentId, pageNumber) |
| ★ **CatalogueFamily** (a map entry, stable per document) | document, name, familyCode, class and mounting (taxonomy, D35), page ranges, shared pages, headline specs, attempts, errorCode | MAPPED → EXTRACTING → EXTRACTED · NEEDS_REVIEW (invalid twice) · SKIPPED (no allowed pages) | (documentId, status) |
| ★ **ProductFamily** (the identity, D31) | brand, key (normalized family code, or name when none), name, `currentExtractionId`, `mergedIntoId` (set when the admin merges two identities) | ACTIVE · MERGED | unique(brandId, key) (per scope from W-1) · (brandId) |
| ★ **FamilyExtraction** (one reading of one family from one document) | brand, productFamily, catalogueFamily, document, name, familyCode, collection, description, class, mounting, applications, material, diffuserMaterial, orderCodeTemplate · the family-wide specs (D30): criMin, ugrMax, ipFront, ipRear, ik, dimming, voltage, powerFactorMin, flickerFree, electricalClass, lifetime, ta, energyClass, warranty · figures, `extraSpecs`, evidence per field, flags, model, promptVersion, verifiedById/At, supersededById | CANDIDATE · VERIFIED · SUPERSEDED | (productFamilyId, createdAt) · (catalogueFamilyId) · (brandId) |
| ★ **ProductOption** | extraction, axis, code, label, sortOrder | | (extractionId, axis) |
| ★ **ProductVariant** (one spec-changing row, D12) | extraction, axis values (JSON), orderCode (only as printed), what its axes change: min/max watts, delivered and chip lumens, CCT, beam, and cut-out or dimensions when the table varies them · `extraSpecs` for other per-row values · evidence: page + the text of the printed row or rows it was built from | from its extraction | (extractionId). Never filtered in bulk: search stage 2 reads by extraction |
| ★ **FamilySearchRow** (global) | productFamily (unique), brand, class, mounting, applications (array), ranges over the current extraction's variants (watts, lumens, CCT, beam), family values (ipMin, ik, criMin, ugrMax, electricalClass, dimming kinds), verified, a `tsvector` (names, codes, collection, description, the family's page text, capped; `simple` config, since catalogues are multilingual), codes text for trigram, updatedAt. Rebuilt by code whenever the family's current extraction changes | | btree on class, mounting and the bands · GIN on the `tsvector` · GIN trigram on codes · (brandId). Checked with EXPLAIN on the C-4 scale seed (decide: 14) |
| ★ **AiUsageLog** → `ai_usage_log` | workspaceId?, feature, model, promptVersion, documentId?, input, output, cache-read and cache-write tokens, durationMs, success, errorCode | | (feature, createdAt) · (workspaceId, createdAt) · (documentId) |
| ★ **EventLog** (CLAUDE.md's event log; first used here) | workspaceId?, entityType, entityId, type, actorId?, data, createdAt | | (entityType, entityId, createdAt) · (workspaceId, createdAt) |
| **WorkspaceProduct** (P-4, W-2) | workspaceId, productFamily, variant key (axis values, or the printed order code), option codes, internalCode, notes, favourite, checkedById/At, useCount, lastUsedAt. A link to the identity, not a copy, so it survives re-extraction. Commercial fields live here, never on shared rows | | unique(workspaceId, productFamilyId, variantKey) · (workspaceId, lastUsedAt) |
| **LineOption** (P-4) | line, variant, options, rank and the step that placed it (D33), compliance, snapshot (D27) | | (lineId) |
| **WorkspaceBrand** (R-1) | workspace, brand, contacts, currency, lead time | | unique(workspaceId, brandId) |
| **Scope** (W-1) | Nullable `workspaceId` on every evidence and identity table. Uniqueness per scope: `@@unique([workspaceId, sha256])`, plus a partial unique index for global rows in the migration SQL | | Read by id, so no index needs to lead with `workspaceId` |
| **WorkspaceFamilySearchRow** (W-1) | FamilySearchRow's columns plus `workspaceId` (NOT NULL). A workspace's own families only, with RLS (D34) | | The same indexes, each leading with `workspaceId` |

## Workflow and permissions

All proposed.

| Step | What happens | Permission | Row |
|---|---|---|---|
| Upload | The admin picks a brand and catalogue, then sets a version label, the source URL, "publicly available" and any excluded page ranges. The register action checks the hash: the same hash in the same scope links to the existing document and starts nothing | `requirePlatformAdminPage` (new, following `requireWorkspacePermissionPage`) · the upload route checks `requirePlatformAdmin` · `createAdminAction` | C-3 |
| Read | Text, links and text coverage per page. Code sets each page's kind. No AI. → INDEXED | Inngest function. It re-reads the document row, and its route verifies Inngest's signature | C-1, C-3 |
| Clear held pages | A person marks a SCANNED page "no prices", or a PRICE page "not prices", after looking at it | `createAdminAction` · from W-1: decide (10) | C-3 |
| Map | One AI pass over allowed text, plus the images of cleared scans → MAPPED | job | C-1, C-3 |
| Extract | Per family: cut pages → Claude → zod → one retry → code (units, D30 rows, evidence, rules) → attached to its ProductFamily (D31) → CANDIDATE. Idempotent per (family, model, promptVersion) | job | C-2, C-3 |
| Index | Code builds the family's search row from its current extraction (`lib/library/search-row.ts`, pure). It runs after an extraction, a verification, a merge or a supersede | job · `createAdminAction` for verify and merge | C-2, C-3 |
| Search | The three stages (D32): indexed SQL on the search table → the top ≈ 100–200 families → one query for their variants and the workspace's own rows. A missing value never filters. No AI | `requireWorkspacePermissionPage(DATA_READ)` · reads in `lib/queries/library.queries.ts` | C-4 |
| Compliance and rank | `lib/discovery/` (pure): PASS / FAIL / UNKNOWN with basis, then the named rank steps (D33) | none | C-4, P-4 |
| Evidence | Opens the PDF at `#page=N`. The file route checks DATA_READ on the workspace in the URL, and that the document is global or that workspace's | the route guards itself | C-3, C-4 |
| Select, save | A selected candidate becomes a `WorkspaceProduct` link to its ProductFamily and variant key, and the option keeps its snapshot | `createWorkspaceAction(DATA_WRITE)` | P-4, W-2 |
| Verify | Global: the admin works beside the page, flagged values first. Corrections go to EventLog → VERIFIED. A workspace user's check is private and never changes global status | `createAdminAction` · `createWorkspaceAction(DATA_WRITE)` | C-5, P-4 |
| New version | A new file for the same catalogue runs the full pipeline. The old document is superseded and kept, and snapshots are untouched | as Upload | C-3 |

## Price pages

All proposed. `lib/library/page-kind.ts`, proven by a test.

1. **Code classifies every page before any AI call:**
   - **PRICE:** money tokens past a threshold: € $ £ QAR AED SAR EUR USD, PVP, Precio, Prix, Preis, Price, Tarif, list
     price. Also a column of decimal amounts beside order codes.
   - **SCANNED:** no text layer, or low text coverage beside large images, since a price table can be an image.
   - **EXCLUDED:** the ranges the uploader names.
2. **Only TEXT pages and cleared pages reach a prompt.** The map gets their text, and a family call gets a cut PDF of
   them alone. A page in doubt is held, never sent.
3. **A spec table with a price column is PRICE.** Values found only on it are UNKNOWN until someone clears the page
   (decide: 9).
4. **Output check:** code drops any value or `otherSpecs` entry with a currency or price label, and raises
   `PRICE_IN_OUTPUT`. The flag means a page slipped through.
5. **The test:** a fixture with a price page and a scanned page proves that neither appears in any request body.

## Security and scale

All proposed.

- **Admin writes:** every one goes through `createAdminAction`. Admin pages use `requirePlatformAdminPage`, and file
  routes check themselves.
- **Uploads:** PDF only (images from W-2), checked by size, type and the file's first bytes (`file-kind.ts`). Every
  input is parsed with zod.
- **AI calls:**
  - Claude gets only allowed pages and the versioned prompt: no workspace, client or supplier names, and no prices.
  - Claude gets no tools. Its output is re-parsed with zod.
  - Every call is logged with its document.
- **Jobs:** one step per family, idempotent and concurrency-limited, so a retry never bills twice.
- **Isolation (D34):**
  - Global library tables carry no RLS. The app's database role has SELECT only on them, by GRANT, and only the admin
    and ingest path's role writes them.
  - A workspace's own library rows and its search rows have RLS.
  - The workspace's own layer (preferred brands, favourites, use counts) is read only for the candidates in stage 2,
    and never copied into shared tables.
  - A brand's team (brand portal, later) writes only rows with its own `brandId` and never sees workspace data.
- **Search (D32):**
  - Stage 1 reads only the search table, and only fields that are almost always present go in its `WHERE`.
  - Stage 2 reads by id. Stage 3 is pure code.
  - It paginates and selects only what the page shows.
  - Its indexes are checked with EXPLAIN on the C-4 scale seed.
  - It makes no AI call. A BOQ is matched with one `LATERAL` query per chunk of lines, never a query per line.
- **CI:** uses recorded AI responses, so it needs no key and spends nothing.

**Cost** (estimates; C-1 and C-2 print the real figures). Assumes a 200-page catalogue with ≈ 60 families of ≈ 3 pages.

| | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|
| Map (page text) | ≈ $0.90 | ≈ $0.45 | ≈ $0.05 |
| One family | ≈ $0.20 | ≈ $0.10 | ≈ $0.01 |
| A whole catalogue | ≈ $12 (≈ $6 by Batches) | ≈ $6 | ≈ $0.40 |

A search costs no AI call. At the design scale (≈ 1,200 catalogues, ≈ 300k pages), the whole library costs ≈ $9k–18k
once per catalogue version on Opus 5.5, paid once for every workspace.

## Open decisions

Each needs the founder before the row named. Recommendations first.

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| 1 | Storage: Vercel Blob or Cloudflare R2 | **Vercel Blob, private,** behind `lib/storage/`, so R2 stays a one-file change. Blob is in the stack, uploads go straight from the browser, and there's one fewer vendor. Storage costs cents either way (≈ $0.023 vs $0.015 per GB-month). R2 wins on egress ($0, against Blob's ≈ $0.05/GB plus function transfer for private files), or if we leave Vercel. It costs another account, presigned URLs and the AWS SDK | C-3 |
| 2 | Extraction timing | **At upload for the global library** (D24): on-demand extraction would break the one-way and no-usage-signal rules. At upload for workspace catalogues too, and W-1 may switch to on demand on measured cost. AI reading pages on every search is dropped: it re-reads catalogues, costs ≈ $15–20 per 100-line BOQ on every run, and can't see icons or drawings | C-3 |
| 3 | Who verifies, and when | **Global:** the platform admin, from C-5, on their own priorities: the golden set first, then the brands the pilot names. Never from usage data. **Workspace users:** they check values privately when they select one, and their check never changes global status | C-5 |
| 4 | Compliance on unchecked values | **Computed from any value with evidence, and always shown with its basis.** A missing value is UNKNOWN. A FAIL on an unverified value ranks a candidate lower, never hides it. A client document says "complies" only for values a person checked, and "to be confirmed" otherwise | C-4, P-6 |
| 5 | When workspace uploads arrive | **W-1 and W-2 after P-4, before L-1.** Local and locally assembled brands rarely publish catalogues, and G3 needs them. If the pilot's past RFQs use only public brands, they move to just after launch | P-4 |
| 6 | Duplicate private uploads | **Deduplicate within a workspace,** and link to a global document on a hash match. Never share between workspaces, even identical bytes: each processes its own copy. Global deduplication never looks at workspace files | W-1 |
| 7 | Image search and embeddings | **Out of the MVP,** unless the pilot's past RFQs show photo-only lines are common. Figure boxes stay in the schema (D19) | L-1 |
| 8 | Internet discovery | **LATER.** Official manufacturer domains only (from `Brand.website`), respecting robots.txt and site terms. Results sit in a separate "From the web" section and never PASS without a stored document. A found document becomes global only through the admin | — |
| 9 | Pages with prices and specs together | **Excluded by default.** The admin clears a page after looking at it, and values found only there are UNKNOWN until then | C-1 |
| 10 | Permission for workspace uploads | **`DATA_WRITE` for a single item.** A new `LIBRARY_MANAGE` for bulk catalogues, held by OWNER and MANAGER, because bulk spends AI credits | W-1 |
| 11 | Stable identity, and which extraction is current (D31) | **Adopt the identity.** The newest publication of the same family is current. A value identical to a verified older extraction (same value, same printed text) keeps its verified basis, found by a diff in code. The admin can merge or split identities (C-5) | C-2 |
| 12 | Isolation of the search path (D34) | **A global search table with no RLS, read-only to the app's role by GRANT, plus a private table with RLS (W-1), read with `UNION ALL`.** One RLS table for everything would lose the full-text and trigram indexes. Marking the operators `LEAKPROOF` needs a superuser, which Neon doesn't give | C-4, F-4 |
| 13 | Taxonomy (D35) | **Our own short list in code, each class mapped to an ETIM class id where one exists.** Not the full ETIM model now. Check ETIM's licence terms before storing its ids | C-1 |
| 14 | Scale targets | **Design for 300 brands and 500k families. Stage 1 p95 ≤ 300 ms per line, and a 100-line BOQ ≤ 10 s.** Proven on a throwaway Neon branch seeded with ≈ 500k synthetic family rows | C-4 |
| 15 | Brand portal: how paid placement may show (D33) | **A separate, labelled "Sponsored" slot beside the top 3–5,** holding only products with no FAIL on the line. It never changes compliance or the technical order, and the workspace's own preferences outrank it. The supplier's trust in the match is the product | The brand portal's design (not a row yet) |
| 16 | Brand portal: what brands may see in return | **Keep the rule as written:** brands pay for placement (by class, region and period) and see only their own data and settings, with no counts drawn from supplier activity. Even impression counts summarize what suppliers searched for. Selling such statistics would need opt-in consent from workspaces, minimum group sizes, and a deliberate rewrite of brief §7 and CLAUDE.md's "no cross-workspace analytics, ever" | The brand portal's design (not a row yet) |

## Sessions

| Row | What | Budget | State |
|---|---|---|---|
| C-1 | Catalogue reader and family map, local script | 1 | tests on disk |
| C-2 | Every family into candidates with evidence, golden set, model comparison | 2 | test and CAVE 03 on disk |
| C-3 | Upload in the browser, Inngest jobs, storage, admin library pages | 2 | |
| C-4 | Discovery: criteria → candidates, page, PASS/FAIL/UNKNOWN | 2 | |
| C-5 | Verify beside the page | 1 | |

### C-1 — A catalogue becomes pages and a family map

- **Founder first:**
  - the catalogues, datasheets and API key from NOW.md
  - Open decision 13 (taxonomy)
  - then `npx prisma migrate dev --name catalogue_library` on the dev branch
- **Tables:** Brand, Catalogue, CatalogueDocument (both with `brandId`, D36), CataloguePage, CatalogueFamily,
  AiUsageLog.
- **Rules, tests first:**
  - `lib/units.ts`, against the test on disk
  - `lib/library/file-kind.ts`, against the test on disk
  - `lib/library/page-kind.ts` + test
  - `lib/library/taxonomy.ts` + test (D35): classes with their related classes, mountings, applications, ETIM ids
  - `lib/library/constants.ts`
- **Reading:** `lib/pdf/read-pdf.ts`. It uses `unpdf` to read text per page, links and text coverage.
- **AI:**
  - `lib/ai/client.ts`: the client plus the `MODEL` and `EFFORT` constants. It warns on a missing key, as
    `lib/auth/secrets.ts` does.
  - `lib/ai/usage.ts`
  - `lib/ai/schemas/family-map.ts` (class and mounting as the taxonomy's enums, plus OTHER with a flag) and
    `lib/ai/prompts/family-map.v1.ts`
  - `lib/ai/map-catalogue.ts` + test, with a fake client
- **Script:** `scripts/catalogue-map.ts`, run as `npm run catalogue:map`. It uses `tsx --conditions=react-server`,
  since `server-only` modules need it, and `--env-file=.env`. It stores the document, pages and map in the dev
  database. No file storage yet.
- **Dependencies:** `@anthropic-ai/sdk`, `unpdf` and `tsx` (dev), on disk.

**Done when:**

- The founder runs `npm run catalogue:map -- <file.pdf> --brand <name>` on 2 real 100–200 page catalogues from 2
  brands.
- It prints each page's kind, the links and the family list (page ranges, class, mounting, headline specs), with tokens
  and cost.
- In 20 pages checked against the PDF, every family is found, its class is right or flagged OTHER, and no price page
  sits in a range.
- A second run of the same file costs nothing.
- A test proves that no price, scanned or excluded page reaches a request.

### C-2 — Every family becomes a candidate with evidence

- **Founder first:** Open decision 11 (which extraction is current).
- **Session 1, the pipeline on CAVE 03:**
  - `lib/ai/schemas/datasheet.ts` (tables returned as printed, D30) and `lib/ai/prompts/datasheet-extraction.v1.ts`
  - `lib/ai/extract-datasheet.ts` + test, with a fake client: one retry, `refusal` and `max_tokens` count as invalid,
    one usage row per attempt
  - `lib/library/draft.ts`, against the test on disk. **One case changes:** "copies the common specs onto every
    variant" becomes "keeps the family-wide specs once on the family", plus a test of the merged effective variant
    (D30). The plan shows the founder this change
  - `lib/library/verify.ts` + test: evidence on the page, and the consistency rules (lumens per watt, delivered ≤ chip
    lumens, cut-out < diameter, …)
  - `lib/library/score.ts` + test
  - `lib/library/identity.ts` + test (D31): the normalized key, attaching an extraction, the current rule
  - `lib/library/search-row.ts` + test: an extraction and its variants → one search row (ranges, family values, text)
  - `lib/pdf/cut-pages.ts`
  - tables: ProductFamily (identity), FamilyExtraction, ProductOption, ProductVariant, FamilySearchRow (its columns;
    C-4 adds the search indexes)
- **Session 2, whole catalogues:**
  - `scripts/catalogue-extract.ts` (`--all`, `--family`)
  - golden set: at least 6 families from 2 brands, including a big variant table and a street or decorative product
  - the same set run on Opus 5.5 and Sonnet 5.5
- **New dependency:** `pdf-lib`.

**Done when:**

- `npm run catalogue:extract -- <documentId>` turns every family of the C-1 catalogues into candidates: options,
  variants (D12, D30), and a page and source for every value, with flags.
- Each family has one identity and one search row. A test proves that the same family in two documents attaches to
  one identity.
- CAVE 03 passes the whole pipeline in a test, with no key.
- The golden set prints a per-field score and the cost per family for each model, and the founder picks the model
  (D3).

### C-3 — Upload in the browser, processed in the background

- **Session 1, upload and pages:**
  - the storage module (decide: 1) and `requirePlatformAdminPage` in `lib/auth/authz.ts`
  - `app/(admin)/admin/library/` in F-2's shell: a documents list, upload, and a document page showing page kinds and
    family statuses
  - the upload route, and a file route that streams a document
  - `registerCatalogueDocument` in `lib/actions/library.actions.ts`, and reads in `lib/queries/library.queries.ts`
  - update ARCHITECTURE → Where things go, and AUTH_REFERENCE
- **Session 2, the jobs:**
  - `lib/jobs/` and `app/api/inngest/route.ts`: read → map → extract each family → rebuild its search row, statuses
    written to EventLog
  - clearing held pages, retrying a FAILED document, superseding the old version on a new upload
- **Build note:** `next.config.ts` turns on `cacheComponents` and `partialPrefetching`, so read
  `node_modules/next/dist/docs/` before writing these pages.
- **New dependencies:** the storage SDK, `inngest`, and any shadcn components the pages need.

**Done when:**

- Signed in as platform admin, the founder uploads a real catalogue in the browser and watches it reach READY, with
  family counts.
- They open any page, clear a held scanned page and see its family extracted.
- They upload the same file again, and nothing runs.
- A non-admin is refused on the pages, both routes and the action.
- A job retried mid-way leaves one usage row per family.

### C-4 — Discovery: the first demo

- **Founder first:**
  - Open decisions 12 and 14
  - a throwaway Neon branch for the scale seed, deleted after the session
- **Session 1, rules and reads:**
  - `lib/discovery/criteria.ts`: the zod object that P-3's lines will also produce
  - `lib/discovery/compliance.ts` + test, and `lib/discovery/rank.ts` + test, with the named steps (D33). The
    workspace-preferences step arrives in P-4
  - the three-stage search reads in `lib/queries/library.queries.ts` (D32)
  - FamilySearchRow's indexes: btree on class, mounting and the bands, GIN on the `tsvector`, and trigram on codes
    (`pg_trgm`, raw SQL in the migration)
  - `scripts/seed-search-scale.ts`: ≈ 500k synthetic family rows on the throwaway branch. It prints EXPLAIN and
    timings
- **Session 2, the page:**
  - `app/(app)/w/[workspaceId]/products/search/`, and the Products route in `lib/workspace/modules.ts`
  - candidate cards with key specs and one row per criterion: result, value, page, printed text, basis
  - keyboard-friendly
- **Ask in the plan:** range semantics: tunable CCT, adjustable watts, a variant's range against a required minimum.
- **Budget:** C-4 is the tightest row. If its plan outgrows 2 sessions, it comes back to the founder.

**Done when:**

- Signed in as a workspace member, the founder enters the criteria of 10 real spec lines from past RFQs.
- Each line returns candidates from the uploaded catalogues, with key specs, PASS/FAIL/UNKNOWN per criterion, the value,
  its page and printed text, labelled unverified.
- The page opens in the PDF.
- The founder notes how many lines have the right product in the top 5.
- A family in two documents shows once.
- A search makes no AI call, lists paginate, and arrows and Enter work.
- On the scale seed, EXPLAIN shows stage 1 using its indexes, and stage 1 meets the p95 target (decide: 14).
- Vitest proves the compliance engine and the rank steps.

### C-5 — Verify beside the page

- **Pages:** `app/(admin)/admin/library/families/[familyId]/`, with the family and its variants beside the PDF page and
  flagged values first.
- **Actions:** `correctFamilyValue`, `verifyFamily`, and `mergeFamilies` / `splitFamily` for identities (D31), all
  through `createAdminAction` and written to EventLog. Each rebuilds the search rows it touches.
- **Ranking:** within the technical rank step, verified families rank first.
- **Script:** `scripts/golden-export.ts` turns a verified family into a golden-set fixture.

**Done when:**

- As platform admin, the founder corrects a wrong value beside its page and verifies the family.
- Search shows the corrected value as verified and ranks it first.
- Merging two identities of the same product leaves one in search.
- The export adds the family to the golden set, and the score test runs on it.

### After P-4: workspace catalogues (decide: 5)

- **W-1, bulk** (budget 2): the same pipeline under the workspace's scope (D17), after F-4.
  - Its search rows go in `WorkspaceFamilySearchRow`, and search reads both tables with `UNION ALL` (D34).
  - The rule for a private upload of a family that's also global is asked in its plan.
  - A file identical to a global document links to it.
  - The workspace's own duplicates cost nothing, and another workspace's identical file is processed for that
    workspace (6).
  - Permission: decide (10).
  - Timing: D24.
- **W-2, one item** (budget 1): on a line with no match, the user adds a datasheet, a photo or typed specs.
  - It's extracted privately and used on that line as a snapshot.
  - "Save to my products?" Yes adds a `WorkspaceProduct` linked to its new private identity; No keeps it on the line
    only.

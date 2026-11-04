# Project Brief — AI Quoting & Submittal Platform for Lighting Projects

> Working name: **[TBD]**
> Owner: Ali
> Status: In development: auth and app shell built, catalogue discovery next
> Purpose of this file: single source of truth for the product idea: the "why". Active work lives in `.docs/NOW.md`.

---

## 1. The problem

Contractors and lighting suppliers work on construction projects of every kind: apartments, villas, schools, hospitals, street and tunnel lighting, decorative lighting for restaurants. Each project's lighting requirements arrive in a different form: general specifications, BOQs in Excel, tender PDFs, consultant schedules, emails, screenshots of WhatsApp messages, even photos of drawings.

How the work really runs:

1. The team receives the project's lighting specification or RFQ, and reads and cleans it (messy formats, merged cells, missing specs).
2. It finds a product, and alternatives, for every lighting item across several brands (Disano, Schréder, Jiso, Philips, local/Chinese brands…), comparing budget vs premium, "equal or better", stock and lead time.
3. It sends a quote to the client for approval.
4. The client changes things because of price or taste, so the team finds new alternatives and revises.
5. It sends a request for quotation to the brands for the selected products.
6. Brand prices come back, the quote is revised and goes back to the client. Steps 4–6 can repeat.
7. It collects datasheets, builds the submittal package for consultant approval, and follows up with the client.

This takes hours to days per project, depends on a few experienced people, and slow replies lose projects.

**A second, often harder problem: inquiries by picture.** Clients and designers often send only a photo or render of a fitting (especially decorative items: pendants, chandeliers, wall lights, special spots) with no brand or code. Finding the same or a similar product across catalogs is done from memory and takes the longest.

## 2. The solution

A web app where a contractor or supplier uploads **any RFQ or specification**, and the platform:

- extracts the line items and required specs, which the user confirms one by one,
- proposes **3–5 matching product options per line** from the uploaded catalogues, each value tied to its page, favoring the company's preferred brands,
- lets the user **just pick**, and keeps the other options ready when a client rejects a product,
- prepares **RFQs to the brands** for the selected products,
- prices the quote deterministically from the prices brands send back,
- generates the **quotation**, its **revisions** and the **datasheet/submittal pack**,
- tracks the quote and helps **follow up**.

### Long-term vision: a light ERP for lighting suppliers

We **start** with one thing done very well: fast, straightforward AI quoting. Over time the platform grows into the company's daily operating system, close to an ERP built for lighting:

| Stage | Modules |
|---|---|
| Now (MVP) | Product library and search, AI quoting with RFQs to brands and client revisions, datasheet/submittal pack |
| Next | Projects & CRM follow-up, quote → sales order |
| Later | Purchase orders to brands, inventory & stock check, deliveries, simple reporting. A brand portal: brands manage their own library data and paid placement (rules to decide: library TODO, Open decisions 15–16) |
| Optional | Integrations (Odoo, Zoho, accounting) instead of rebuilding them |

**Rule: build simple now, design for expansion from day one.** We do not build these modules early, but the foundation must not block them:

- **Project is the central entity** from the start: inquiries, quotes, (later) sales orders, POs, deliveries and follow-ups all hang off a project.
- **Brands/manufacturers are also vendors:** the data model allows a brand to have vendor details (contacts, currency, lead time) for RFQs now and POs later.
- **Quote lines point to real product variants** (not free text), so a won quote converts cleanly into a sales order and then into POs per brand.
- **Document model is generic:** quote, sales order, RFQ, PO share a common structure (number series, status, lines, revisions, PDF output).
- **Status workflows + event log** on documents (draft → sent → won/lost → ordered…), which later feeds CRM and reporting.
- **Stock fields are optional** on workspace product records (in stock / qty / lead time), never on the global library, so inventory can be switched on later without migration pain.
- **Modular code:** each module lives in its own folder with its own doc; modules talk through clear service functions, not direct table access across modules.

Positioning: **the AI quoting and submittal tool built for lighting projects** — multi-brand, any project type, regional brand mix, consultant/authority submittal formats, local pricing, Arabic/English.

## 3. Target users

- **Primary:** contractors and lighting suppliers / distributors / importers working on construction projects, in any market. The GCC (start: Qatar) may be the first market, not the limit.
- **Roles inside a company:** sales engineer (daily user), sales manager (approvals, pipeline), admin (prices, brands, users).
- **Later:** related MEP categories (wiring devices, cables, poles) using the same engine.

## 4. Product parts (build units)

Each part gets a TODO in `.docs/todo/` when its work starts, and a reference in `.docs/references/` once built.

### Part 1 — Global Brand Library (shared)
- Brands → catalogues → document versions → pages, and from them product families → variants (common specs as real columns, the rest in a flexible field, because street, tunnel and decorative products differ). Later: IES/LDT files, images.
- Built once, shared by all suppliers, updated over time: a new catalogue or datasheet version supersedes the old one and never overwrites it.
- Pipeline: the platform admin uploads a PDF catalogue or datasheet → code reads every page and holds price and scanned pages back from AI → a family map (page ranges, type, headline specs) → every family extracted into a fixed JSON schema, each value with its page and printed text → unit normalization in code → **searchable at once, labelled unverified** → a person verifies it beside its page.
- Contains **public technical data from publicly available documents only**, with each document's source recorded. Never prices, never supplier data.
- One library, owned per brand. Each family has a stable identity across datasheets, catalogues and editions, so it shows once in search, and a company's links to it survive a new version. Designed for hundreds of brands and millions of variants.

### Part 2 — Supplier Workspace (private)
- Brands the company prefers (selected from the global library). A preference, not a hard filter: contractors look across brands.
- Private / local brands (e.g. locally assembled products) as a private library.
- Prices and pricing rules (see §6).
- Default matching criteria: preferred brands, stock items, lead times, budget/premium preference.
- Users, roles, company branding for quotes.
- **Own catalogues and items:** a company uploads its own catalogues in bulk, or adds one datasheet, photo or typed product for a line and is asked whether to save it to its products. They go through the same pipeline under the workspace's scope: private, never global, never used for another workspace. When this arrives is still to decide (library TODO).
- **The database grows with use:** a product becomes the company's when it's selected, quoted or saved. Its codes, prices, preferences and suppliers stay private, as links to the product, not copies.
- Request a new brand for the global library: only public technical data is added, by explicit request — never their prices or usage.

### Part 3 — Inquiry Intake & Extraction
- Inputs: Excel/CSV BOQs, PDFs (including scanned), email text, images (including screenshots of WhatsApp messages, read with AI image analysis — no WhatsApp integration needed). Later: forwarded email inbox.
- Output: normalized line items — description, quantity, unit, required specs (W, lm, CCT, CRI, IP, IK, optic, mounting, dimming, class…), reference brand/model if given ("or equal").
- One intake path: Claude reads PDFs and images directly, and code turns Excel into text. Code strips Excel price columns before any prompt.
- User confirms extracted lines one by one, editing them as needed, before matching.

### Part 4 — Search, Matching & Options
- Search and matching are one engine: users can search the library directly, and each RFQ line calls the same search.
- Per line: an indexed search over one row per family (class, mounting, wattage/lumen range), with full-text and code search, narrows to the best ≈ 100–200 families → deterministic compliance per criterion on their variants: PASS, FAIL or UNKNOWN, each with its value, its page and whether a person checked it → ranking in named steps: the technical match first, then the company's own preferences. A later sponsored slot is shown apart and never changes compliance. AI never invents a value and never declares compliance. Later: vector search for soft criteria, and AI ranking and explanations (never with prices).
- Show 3–5 options side by side with key specs and compliance flags (e.g. "IK08 required, option has IK07").
- User selects one option per line (or marks "no match / manual"). All options stay stored, so a client's rejection means picking the next option or searching again, not starting over.
- **Search by image** (after the MVP unless the pilot's RFQs need it: to decide): user uploads a photo/render/screenshot of a fitting → the app finds the same or visually similar products in the library (shape, finish, style), combined with spec filters (W, CCT, IP).
  - How: product images in the library get image embeddings (multimodal embeddings in pgvector); the query image is embedded and compared. Claude vision also describes the item (type, shape, material, mounting) to refine the search with text and specs.
  - Requires product images to be stored during ingestion (Part 1 / Part 2).
  - Works best for decorative items; technical items still rely mainly on specs.
- Every user correction is stored (becomes the accuracy test set).
- **Learns from the supplier's own usage (private to that workspace, no model training):**
  - Ranks recently and frequently selected products higher.
  - Remembers past choices for similar lines ("last time for 'spot 10W IP44' you chose X").
  - Remembers per-client and per-consultant preferences (e.g. client usually wants brand Y).
  - "Recently used" and "favorites" lists for quick picking.
  - Usage data never leaves the workspace and is never used for other suppliers.

### Part 5 — RFQs to Brands & Quote Builder
- Groups selected products by brand into RFQ documents.
- Brand prices are typed in or imported from Excel by code, never read by AI.
- Applies pricing (§6), per-project overrides, terms, validity, currency, VAT.
- Outputs branded PDF and Excel quotation.
- Quote versions (rev A, rev B…), each with its own selections, because clients change things.
- Each quote line keeps a snapshot of its product: specs, document version and page. A new catalogue or a re-extraction never changes a sent quote.

### Part 6 — Datasheet & Submittal Pack
- Collects datasheets of selected products in quote order.
- Cover page, index, optional compliance table, merged into one PDF. The compliance table says "complies" only for values a person checked (to decide).
- Later: templates per consultant/authority format.

### Part 7 — Follow-up & CRM (later)
- Quote status (sent, under review, won, lost), reminders, drafted follow-up emails, simple pipeline.
- Later: export/sync to Odoo, Zoho, HubSpot.

## 4.1 UI / UX structure

**Layout: module sidebar (Odoo-like, but simpler) + project-centered workspace.**

- **Sidebar = modules.** MVP: Home, Projects, Quotes, Products, Clients, Settings. Future modules (Price lists, Sales orders, Purchasing, Inventory, CRM) appear as new sidebar items only when enabled per plan, so the app grows without feeling heavy on day one.
- **Home:** pipeline at a glance — new inquiries, quotes in progress, quotes to follow up, recently won/lost.
- **Global "New inquiry" button** available everywhere: drop a file, paste text, or upload a screenshot/photo.
- **Project workspace** (the main screen) with a 6-step flow shown as a stepper:
  1. **Inquiry** — uploaded files / text / images.
  2. **Lines** — extracted line items, confirmed one by one before matching.
  3. **Options** — the heart of the app: lines list on the left; for the selected line, required specs on top and 3–5 option cards (best match, budget, premium) with compliance flags ("CRI 80, req. 90") and usage hints ("used 8×"). One click selects and jumps to the next line. Image search available per line.
  4. **Brand RFQs** — selected products grouped by brand; the prices they send back are entered here.
  5. **Quote** — pricing, overrides, terms, preview, PDF/Excel export, revisions.
  6. **Submittal** — datasheet pack builder and preview.
- **Products:** global library + private library, search by specs and text (image later), open the catalogue page behind any value, add a catalogue or a datasheet.
- **Price lists (later):** upload, discount rules, landed-cost formulas, versions.

**UX rules (fixed from the start):**
- Keyboard-friendly selection (arrow keys + Enter) — engineers process 100+ lines.
- Quick search (Ctrl/Cmd+K) across projects, products, clients.
- Desktop-first for quoting; mobile for viewing, approvals and follow-ups.
- Arabic/RTL-ready layout (logical CSS properties) even if Arabic ships later.
- Every AI suggestion is editable; nothing is sent to a client without user approval.
- Before coding: clickable design of key screens (Home, Project, Options, Quote preview) tested with a supplier.

## 5. Tech stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Database | Neon Postgres + Prisma |
| Search | Postgres full-text search now; pgvector (inside Neon) later |
| Auth & teams | Auth.js v5 (Google + email magic link); workspaces, members and roles in our own tables |
| AI | Claude API (extraction, matching, reasoning, image description); later Voyage embeddings (text + multimodal for image search) |
| Files | Vercel Blob (private store) recommended, or Cloudflare R2: to decide |
| Background jobs | Inngest (RFQ parsing, catalog ingestion, follow-ups) |
| Excel | SheetJS (read) / ExcelJS (write) |
| PDF | unpdf (reading catalogues), pdf-lib (cutting family pages, merging submittal packs), React-PDF (quotes) |
| Email intake (later) | Postmark or Resend inbound |
| Payments | Stripe (or Paddle / Lemon Squeezy) |
| Hosting | Vercel |
| Monitoring | Sentry + AI token usage log per workspace |

## 6. Pricing data (how companies enter prices)

**Main method, in the MVP: brand replies per project.** The company sends an RFQ to the brands, and the prices that come back are typed in or imported from Excel by code, never read by AI.

Later, for companies that also keep price lists:

1. **Price list upload:** Excel → AI maps columns (headers only, no prices in the prompt) → rows matched to library products by order code first, then by specs → unmatched rows go to review.
2. **Discount rules:** e.g. "Brand X: list − 35%", "Brand Y: cost × 1.4".
3. **Landed cost formula:** ex-works price × FX rate × freight/customs factor × margin, saved per brand.

Plus: editable price grid, per-project overrides, price list versions with validity dates (old quotes keep their prices).

**Rule:** prices are deterministic code, never AI. Prices live only in private supplier tables.

## 7. Data confidentiality (non-negotiable)

Suppliers are very sensitive about prices, projects and decisions. Rules:

- **Tenant isolation** enforced in the database (Postgres row-level security), not only in app code.
- **One-way data flow:** global library → supplier. Nothing from a supplier (prices, projects, clients, selections) flows back into shared data.
- **No cross-supplier analytics**, ever (no "market price" or "what others quoted").
- AI calls receive only what they need — matching never receives prices.
- **Price pages in uploaded documents** are detected by code and never sent to AI; a page in doubt is held until a person looks at it.
- **Supplier activity never changes shared data:** searches, selections and uploads never write to the global library or change what it extracts, verifies or ranks.
- Operator (us) has **no default access** to supplier commercial data; support access only when granted, time-limited and logged.
- Audit log (who viewed/exported what), 2FA, encryption at rest and in transit.
- Full data export and permanent deletion on request.
- Premium option later: dedicated deployment (own database, optionally own AI key).

## 8. Monetization

- Subscription per workspace, tiered by **quotes per month** and **users** (Starter / Pro / Business).
- **Onboarding fee:** we load private/local brands and price lists.
- Add-ons: submittal packs, CRM follow-up, white-label templates, dedicated deployment.
- Overage fee per extra quote above plan.
- First client: pilot supplier at a discount in exchange for feedback and a case study.

## 9. MVP scope

**In:**
- Part 1: PDF catalogues and datasheets uploaded by the platform admin, searchable at once as unverified candidates with the page behind every value, verified beside the page; covering the brands and families the test RFQs need.
- Search by specs and text, with PASS/FAIL/UNKNOWN per criterion. Similar image: to decide, on the pilot's RFQs.
- A company's own catalogues and single items: to decide, before or just after launch.
- Part 3 with any RFQ (Excel, PDF, pasted text, image), confirmed line by line.
- Part 4 matching with options and user selection.
- Part 5: RFQs to brands, prices from brand replies, PDF quote, client revisions.
- Part 6 merged datasheet pack.
- Single workspace, but data model already multi-tenant.

**Out (later):** email inbox intake, team invites, price lists and discount rules, CRM, ERP sync, Arabic UI, billing, dedicated deployments, internet discovery of manufacturer documents.

**MVP success test:** on 10–20 real past RFQs, the system matches ≥ 80% of lines correctly (or flags them), and our part of the work takes under 15 minutes. The time brands take to reply doesn't count.

## 10. Build phases

1. Foundation: repo, auth, roles (built).
2. App shell: sidebar layout, tabs, workspace on first sign-in.
3. Part 1: catalogue reader and family map, family extraction with page evidence, upload and background processing.
4. Discovery: search by specs and text with PASS/FAIL/UNKNOWN per criterion; then verify beside the page.
5. Private data: RLS.
6. Part 3: RFQ intake + line-by-line confirmation.
7. Part 4: matching on the search engine + options UI; then a company's own catalogues and single items (timing to decide).
8. Part 5 + 6: RFQs to brands, brand prices, quote PDF, revisions, datasheet pack.
9. Launch with the first real user → fix → measure.
10. Part 2 full (invites, price list upload, landed cost), Part 7.

## 11. How we build with Claude Code (less vibe coding)

- `CLAUDE.md` (root): project rules — tenant isolation, global vs private data, prices never via AI, human approval before anything is sent, project as central entity, design-for-expansion rules (§2), coding conventions.
- `.docs/NOW.md`: the queue — launch gates and the rows being built. `.docs/todo/LATER.md`: everything deferred, including future modules (sales orders, purchase orders, inventory, CRM), so today's decisions don't block them, but they aren't built until their stage.
- `.docs/guides/`: architecture (where code goes, security and scale rules), workflow, and how references are written.
- `.docs/todo/<PART>_TODO.md`: one spec per part (goal, user flow, data, edge cases, "Done when"), written when its work starts. Once built, it becomes `.docs/references/<PART>_REFERENCE.md`, which also holds that part's data model.
- Decisions: the Decisions table in the part's TODO or reference.
- `tests/fixtures/`: real (anonymized) RFQs, datasheets and expected outputs — the accuracy test set.
- Each session: `/start-session <row>` reads the NOW.md row, its TODO and reference, and plans; the founder approves; build against "Done when"; `/end-session <row>` verifies and updates the docs.

## 12. Competitors & differentiation

- **Parspec** — AI quoting/submittals for lighting & MEP, US-focused. Main reference product.
- **Distro** — AI quoting for electrical distributors, US.
- **Mercura, Hexa, Quotematic** — general RFQ-to-quote automation for distributors.
- **Manufacturer tools** (e.g. Signify Instruct) — single brand only.

Our difference: built for lighting projects of every kind, multi-brand library (European + Chinese + locally assembled), consultant/authority submittal formats, landed-cost pricing, Arabic/English, intake from any format (including WhatsApp screenshots and emails), local onboarding service, strong data-confidentiality design.

## 13. Open questions

- Product name and domain.
- First pilot supplier and first 2 brands to ingest.
- Legal entity and payment provider.
- Which consultant/authority submittal formats to support first.
- Arabic in MVP or later.
- Validate with 5–10 suppliers: what do they use today, what would they pay?

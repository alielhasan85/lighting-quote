# Project Brief — AI Quoting & Submittal Platform for Lighting Suppliers

> Working name: **[TBD]**
> Owner: Ali
> Status: Pre-development (idea → MVP)
> Purpose of this file: single source of truth for the product idea. Claude Code reads this first in every session, together with `CLAUDE.md` and the part docs in `docs/parts/`.

---

## 1. The problem

Lighting suppliers and distributors in the GCC receive project inquiries every day: BOQs in Excel, tender PDFs, consultant schedules, emails, screenshots of WhatsApp messages, even photos of drawings.

For each inquiry, a sales engineer has to:

1. Read and clean the inquiry (messy formats, merged cells, missing specs).
2. Find matching products across several brands (Philips, Schréder, local/Chinese brands…).
3. Compare options (budget vs premium, "equal or better", stock, lead time).
4. Price each line (list price − discount, or landed cost × margin).
5. Build the quotation (PDF/Excel) in company branding.
6. Collect datasheets and build the submittal package for consultant approval.
7. Follow up with the client.

This takes hours to days per inquiry, depends on a few experienced people, and slow replies lose projects.

**A second, often harder problem: inquiries by picture.** Clients and designers often send only a photo or render of a fitting (especially decorative items: pendants, chandeliers, wall lights, special spots) with no brand or code. Finding the same or a similar product across catalogs is done from memory and takes the longest.

## 2. The solution

A web app where a supplier uploads **any inquiry**, and the platform:

- extracts the line items and required specs,
- proposes **3–5 matching product options per line** from the brands the supplier carries,
- lets the user **just pick**,
- applies the supplier's **private pricing rules**,
- generates the **quotation** and the **datasheet/submittal pack**,
- tracks the quote and helps **follow up**.

### Long-term vision: a light ERP for lighting suppliers

We **start** with one thing done very well: fast, straightforward AI quoting. Over time the platform grows into the supplier's daily operating system, close to an ERP built for lighting:

| Stage | Modules |
|---|---|
| Now (MVP) | AI quoting, product library, datasheet/submittal pack |
| Next | Projects & CRM follow-up, quote → sales order |
| Later | RFQ / purchase orders to brands, inventory & stock check, deliveries, simple reporting |
| Optional | Integrations (Odoo, Zoho, accounting) instead of rebuilding them |

**Rule: build simple now, design for expansion from day one.** We do not build these modules early, but the foundation must not block them:

- **Project is the central entity** from the start: inquiries, quotes, (later) sales orders, POs, deliveries and follow-ups all hang off a project.
- **Brands/manufacturers are also vendors:** the data model allows a brand to have vendor details (contacts, currency, lead time) so RFQs/POs can be added later.
- **Quote lines point to real product variants** (not free text), so a won quote converts cleanly into a sales order and then into POs per brand.
- **Document model is generic:** quote, sales order, RFQ, PO share a common structure (number series, status, lines, revisions, PDF output).
- **Status workflows + event log** on documents (draft → sent → won/lost → ordered…), which later feeds CRM and reporting.
- **Stock fields are optional** on products (in stock / qty / lead time) so inventory can be switched on later without migration pain.
- **Modular code:** each module lives in its own folder with its own doc; modules talk through clear service functions, not direct table access across modules.

Positioning: **the AI quoting and submittal tool built for GCC lighting suppliers** — multi-brand, regional brand mix, consultant/authority submittal formats, local pricing, Arabic/English.

## 3. Target users

- **Primary:** lighting suppliers / distributors / importers in the GCC (start: Qatar).
- **Roles inside a supplier:** sales engineer (daily user), sales manager (approvals, pipeline), admin (prices, brands, users).
- **Later:** related MEP categories (wiring devices, cables, poles) using the same engine.

## 4. Product parts (build units)

Each part has its own doc in `docs/parts/` and its own skill for Claude Code sessions.

### Part 1 — Global Brand Library (shared)
- Brands → product families → variants (specs as real columns), datasheets, IES/LDT files, images.
- Built once, shared by all suppliers, updated over time (new products, discontinued items, datasheet versions).
- Ingestion pipeline: source (PDF catalog, datasheet, Excel) → split per family → AI extraction into a fixed JSON schema → unit normalization in code → **human review screen** → save + embed.
- Contains **public technical data only**. Never prices, never supplier data.

### Part 2 — Supplier Workspace (private)
- Brands the supplier carries (selected from the global library).
- Private / local brands (e.g. locally assembled products) as a private library.
- Prices and pricing rules (see §6).
- Default matching criteria: preferred brands, stock items, lead times, budget/premium preference.
- Users, roles, company branding for quotes.
- **Add products anytime:** users upload a datasheet (or enter a product manually) and it goes through the same extraction + review flow into their private library. Library grows continuously.
- Request a new brand for the global library: only public technical data is added, by explicit request — never their prices or usage.

### Part 3 — Inquiry Intake & Extraction
- Inputs: Excel/CSV BOQs, PDFs (including scanned), email text, images (including screenshots of WhatsApp messages, read with AI image analysis — no WhatsApp integration needed). Later: forwarded email inbox.
- Output: normalized line items — description, quantity, unit, required specs (W, lm, CCT, CRI, IP, IK, optic, mounting, dimming, class…), reference brand/model if given ("or equal").
- User reviews/edits extracted lines before matching.

### Part 4 — Matching & Options
- Per line: hard filters in SQL (type, IP ≥, wattage/lumen range, CCT) → vector search for soft criteria → AI ranks top candidates and explains.
- Show 3–5 options side by side with key specs and compliance flags (e.g. "IK08 required, option has IK07").
- User selects one option per line (or marks "no match / manual").
- **Search by image:** user uploads a photo/render/screenshot of a fitting → the app finds the same or visually similar products in the library (shape, finish, style), combined with spec filters (W, CCT, IP).
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

### Part 5 — Quote Builder
- Applies pricing (Part 2), per-project overrides, terms, validity, currency, VAT.
- Outputs branded PDF and Excel quotation.
- Quote versions (rev A, rev B…).

### Part 6 — Datasheet & Submittal Pack
- Collects datasheets of selected products in quote order.
- Cover page, index, optional compliance table, merged into one PDF.
- Later: templates per consultant/authority format.

### Part 7 — Follow-up & CRM (later)
- Quote status (sent, under review, won, lost), reminders, drafted follow-up emails, simple pipeline.
- Later: export/sync to Odoo, Zoho, HubSpot.

## 4.1 UI / UX structure

**Layout: module sidebar (Odoo-like, but simpler) + project-centered workspace.**

- **Sidebar = modules.** MVP: Home, Projects, Quotes, Products, Clients, Price lists, Settings. Future modules (Sales orders, Purchasing, Inventory, CRM) appear as new sidebar items only when enabled per plan, so the app grows without feeling heavy on day one.
- **Home:** pipeline at a glance — new inquiries, quotes in progress, quotes to follow up, recently won/lost.
- **Global "New inquiry" button** available everywhere: drop a file, paste text, or upload a screenshot/photo.
- **Project workspace** (the main screen) with a 5-step flow shown as a stepper:
  1. **Inquiry** — uploaded files / text / images.
  2. **Lines** — extracted line items, editable before matching.
  3. **Options** — the heart of the app: lines list on the left; for the selected line, required specs on top and 3–5 option cards (best match, budget, premium) with compliance flags ("CRI 80, req. 90") and usage hints ("used 8×"). One click selects and jumps to the next line. Image search available per line.
  4. **Quote** — pricing, overrides, terms, preview, PDF/Excel export, revisions.
  5. **Submittal** — datasheet pack builder and preview.
- **Products:** global library + private library, search by text, specs, or image; add product from datasheet.
- **Price lists:** upload, discount rules, landed-cost formulas, versions.

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
| Vector search | pgvector (inside Neon) |
| Auth & teams | Clerk (organizations = supplier workspaces, roles) |
| AI | Claude API (extraction, matching, reasoning, image description) + Voyage embeddings (text + multimodal for image search) |
| Files | Vercel Blob or Cloudflare R2 |
| Background jobs | Inngest (BOQ parsing, catalog ingestion, follow-ups) |
| Excel | SheetJS (read) / ExcelJS (write) |
| PDF | React-PDF (quotes), pdf-lib (merging submittal packs) |
| Email intake (later) | Postmark or Resend inbound |
| Payments | Stripe (or Paddle / Lemon Squeezy) |
| Hosting | Vercel |
| Monitoring | Sentry + AI token usage log per workspace |

## 6. Pricing data (how suppliers enter prices)

Support three methods:

1. **Price list upload** (main): Excel → AI maps columns → rows matched to library products by order code first, then by specs → unmatched rows go to review.
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
- Part 1 with 1–2 brands, 3–5 product families, manual ingestion + review screen.
- Part 3 with Excel BOQs only.
- Part 4 matching with options and user selection.
- Part 5 simple pricing (discount rules) + PDF quote.
- Part 6 merged datasheet pack.
- Single workspace, but data model already multi-tenant.

**Out (later):** screenshot/image intake, email inbox intake, scanned PDFs, CRM, ERP sync, Arabic UI, billing, dedicated deployments.

**MVP success test:** on 10–20 real past BOQs, the system matches ≥ 80% of lines correctly (or flags them), and a quote + datasheet pack is produced in under 15 minutes.

## 10. Build phases

1. Foundation: repo, auth, multi-tenant data model (global vs private tables), RLS, file storage.
2. Part 1: brand library schema + ingestion pipeline + review screen.
3. Part 3: Excel BOQ extraction + review screen.
4. Part 4: matching engine + options UI.
5. Part 5 + 6: pricing rules, quote PDF/Excel, datasheet pack.
6. Pilot with one supplier → fix → measure.
7. Part 2 full (price list upload, landed cost), more formats, Part 7.

## 11. How we build with Claude Code (less vibe coding)

- `CLAUDE.md` (root): project rules — tenant isolation, global vs private data, prices never via AI, human approval before anything is sent, project as central entity, design-for-expansion rules (§2), coding conventions.
- `docs/roadmap.md`: future modules (sales orders, RFQ/PO, inventory, CRM) — referenced so today's decisions don't block them, but not built until their stage.
- `docs/architecture.md`, `docs/data-model.md`, `docs/security.md`: shared references.
- `docs/parts/01-brand-library.md` … `07-crm.md`: one spec per part (goal, user flow, data, APIs, edge cases, acceptance criteria).
- One **skill per part** loaded at the start of each session working on that part.
- `docs/decisions/`: short records of key decisions (ADR style).
- `tests/fixtures/`: real (anonymized) BOQs, datasheets and expected outputs — the accuracy test set.
- Each session: pick one part, read its doc + skill, implement against acceptance criteria, update the doc.

## 12. Competitors & differentiation

- **Parspec** — AI quoting/submittals for lighting & MEP, US-focused. Main reference product.
- **Distro** — AI quoting for electrical distributors, US.
- **Mercura, Hexa, Quotematic** — general RFQ-to-quote automation for distributors.
- **Manufacturer tools** (e.g. Signify Instruct) — single brand only.

Our difference: GCC focus, multi-brand regional library (European + Chinese + locally assembled), consultant/authority submittal formats, landed-cost pricing, Arabic/English, intake from any format (including WhatsApp screenshots and emails), local onboarding service, strong data-confidentiality design.

## 13. Open questions

- Product name and domain.
- First pilot supplier and first 2 brands to ingest.
- Legal entity and payment provider.
- Which consultant/authority submittal formats to support first.
- Arabic in MVP or later.
- Validate with 5–10 suppliers: what do they use today, what would they pay?

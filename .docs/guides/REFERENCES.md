# Reference docs

A reference is the map of one feature **as it is built today.** A session reads it instead of exploring the code, so
it must answer three questions in about 1–3k tokens: **where is it, how does it flow, what must stay true.**

This is where most of the token savings come from. A Quick Reference costs a session 1–2k tokens. Rediscovering the
same feature by opening files costs 20k or more, and it's paid again by every later session.

Template: [_TEMPLATE_REFERENCE.md](../references/_TEMPLATE_REFERENCE.md) · Worked example:
[AUTH_REFERENCE.md](../references/AUTH_REFERENCE.md) · Index: [../README.md](../README.md)

---

## When to write one

- A feature spans **5 or more files**, or **more than one layer** (page → action → query → DB).
- **In the session that builds it,** by `/end-session`, never "later". A reference written afterwards is
  reconstructed from the code, which is exactly the exploring it exists to save.
- **One per feature.** Add a section to the existing reference rather than starting a second one.
- **Split at 300 lines,** by sub-feature (`QUOTES_REFERENCE.md` + `QUOTES_PDF_REFERENCE.md`), and index both.

## The shape: fixed headings, so a grep finds them

| Section | Holds | Size |
|---|---|---|
| **Header** | Status, its TODO, related references | 2 lines |
| **Quick Reference** | File map, one line per file saying what it holds. Then 3–5 key concepts | ~40 lines. Often the only part a session reads |
| **Flow** | The path through the layers, with function names and the permission each action needs | ~20 lines |
| **Rules** | What must stay true: permission per action, workspace scoping, limits, invariants | Bullets |
| **Common tasks** | How to make the usual changes, as numbered steps | Steps |
| **Decisions** | What was chosen and why, so a later session doesn't undo it | One row each |
| **Known issues** | Unfixed only | Bullets |

## Writing rules

1. **Current state only.** No dates, session notes, "recently fixed" or "we tried". Git holds the history.
2. **Name the code, don't paste it:** `lib/actions/quotes.actions.ts → sendQuote`. A snippet only to show a pattern,
   and under about 10 lines.
3. **Spell names exactly as the code does:** functions, permissions, models, routes. Then one grep finds both the
   doc and the code.
4. **Tables and arrows, not paragraphs.**
5. **One fact, one place.** Link to another reference or a guide instead of repeating it. Status lives in NOW.md.
6. **No counts that go stale** ("14 permissions"). The code is the count.
7. **Rules is never empty** for a feature with actions: which permission guards each one, what's workspace-scoped,
   which limits apply. It's the security and scale summary a reviewer checks the diff against.

| Bad | Good |
|---|---|
| "The quote is sent by first validating the lines, then..." | `sendQuote → validateLines → renderPdf → email · status SENT` |
| A 60-line code listing | `lib/quotes/total.ts → quoteTotal` |
| "Fixed the rounding bug (2026-11-02)" | Nothing: delete it from Known issues |
| A status table copied from NOW.md | A link to NOW.md |

## Reading one: every session

1. Find it: the TODO header links it, or search [../README.md](../README.md).
2. Grep its headings (`^#{1,3} `).
3. Read the Quick Reference, then only the sections the change touches, with `offset`/`limit`.
4. Open source files only for what the plan changes, or what the reference doesn't answer.
5. **A wrong reference is a bug.** Fix it in this session.

## Updating one: at the end of every session

`/end-session` does this, in place, for each reference the change touched:

1. **Quick Reference:** a new file gets one line; a deleted or renamed file loses or changes its line.
2. **Flow:** only if the sequence changed.
3. **Rules:** each new action and its permission; any new limit or invariant.
4. **Decisions:** a choice someone might later undo gets one row, with the why.
5. **Known issues:** delete what's fixed; add what's knowingly left.
6. **Index:** a new reference gets one line in [../README.md](../README.md).
7. **Report** `<file>: <before> → <after> lines`. Over 300 → compress (cut prose, merge rows) or split before the
   hand-off.

**Edit the line that's now wrong. Never append.** A reference that grows a section per session becomes the history
log it was meant to replace.

## Files that point at their reference

Every source file opens with a short header: its path, what it is and its reference. Claude reads the first lines
before deciding to read the rest, and the doc and the code point at each other.

```ts
// lib/actions/quotes.actions.ts
// Quote writes: create, revise, send. Reference: .docs/references/QUOTES_REFERENCE.md
```

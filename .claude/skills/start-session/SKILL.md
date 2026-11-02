---
name: start-session
description: Open a work session. Takes a NOW.md row, reads its TODO and reference sections, then plans in plan mode before any code, within the row's budget.
argument-hint: "[NOW.md row, e.g. A-1]"
disable-model-invocation: true
---

# Start a session

Session requested: **$ARGUMENTS**

Read docs before code, and write no code in this skill: it ends at an approved plan.

**Read sections, not files.** Grep a file's headings or the line you need, then Read with `offset`/`limit`. Budget:
about 10–15k tokens of reading before the plan. Run independent reads in parallel.

**Quick lane:** ≤3 files, no schema, auth, money or personal data → say so, skip steps 2–3, and give a 3-line plan in
chat instead of plan mode.

## 1. Scope

Grep `.docs/NOW.md` for the row (`^\| \*{0,2}<row>\*{0,2} \|`) and note its **budget** and **Done when**.

- **No argument:** read the Queue section and propose its first row. Wait for the founder.
- **Not a row:** Grep NOW.md and `.docs/todo/LATER.md` for the topic. In LATER, or on neither → stop, and ask why now
  and what drops.

## 2. Spec

Open the TODO the row links. Read its header, its **Decisions** (don't reopen them) and the session's own section. Quote
its **Done when**.

## 3. Reference

Open the reference the TODO or row links, or find it in `.docs/README.md`. Grep its headings, then read the **Quick
Reference**, **Rules** and the sections the change touches. Open source files only for what the plan changes or the
reference doesn't answer. **No Explore or Plan agents** where a reference exists.

## 4. Working tree

Run `git status --short` and `git branch --show-current`. Flag uncommitted changes, and a branch not named after the row.

## 5. Plan

Enter plan mode. Write the plan under these headings, giving one line ("none") to any that doesn't apply:

1. **Context:** the problem, the row, the outcome.
2. **Files:** what changes, following `.docs/guides/ARCHITECTURE.md` → Where things go. Name the helpers to reuse.
3. **Schema:** changes, plus the exact migration command for the founder.
4. **Security:** the permission each new or changed action needs, how each query is scoped by `workspaceId`, which inputs
   are validated, and anything the client sends that must be re-checked.
5. **Scale:** what grows (rows, requests, file sizes), and how each query stays bounded: pagination, `select`, index,
   no query in a loop. Slow work goes to a background job.
6. **Acceptance criteria:** the Done when, numbered, each marked **test** (logic, proven by Vitest) or **hand** (what a
   person must see: setup → action → expected result).
7. **Tests first:** the failing test for each **test** criterion.
8. **Verification:** the commands from CLAUDE.md → Commands, plus the hand checks.
9. **Docs:** which TODO, reference and NOW.md lines change.
10. **Size:** files and sessions against ~30 files and the row's budget. Over either → AskUserQuestion: cut scope or
    extend the budget. Never split silently.
11. **Found, not doing:** one line each, for `/end-session` to file. Nothing is filed now.

Ask only what's genuinely the founder's to decide, then ExitPlanMode. No code until it's approved.

## 6. Hand checks

Once approved, write the **hand** criteria to `.docs/hand-checks/<row>.md`:

```markdown
# <row> — check by hand

**Run:** `npm run dev` · open <page or URL> · <test account and data>

1. **<what it proves> (<criterion #>).** <setup>.
   - <action> → <what you should see, with the exact text of toasts and labels>
```

Plain words, in the order the founder will walk them. The build keeps this file current if a label or toast changes.

Then show the hand checks, and say: "Plan saved at `<plan path>`. To build: `/clear`, then `implement <plan path>`.
Afterwards: `/clear`, then `/end-session <row>`."

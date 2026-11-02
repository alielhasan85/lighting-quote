# Workflow

How a session runs, how it stays short, and how we avoid vibe coding. Where code goes:
[ARCHITECTURE.md](ARCHITECTURE.md). Reference docs: [REFERENCES.md](REFERENCES.md).

**The test for every change:** if you can't explain the diff to another developer, don't push it.

---

## The session loop

```
/start-session A-1        NOW.md row → its TODO section → reference sections → plan. No code
  founder approves        the cheapest place to fix a mistake
/clear → "implement <plan file>"
  build                   tests first for logic · checks once at the end
  founder tests           .docs/hand-checks/A-1.md
/clear → /end-session A-1 checks → docs → review → file list + commit message
  founder commits
```

One session = one deliverable = one commit, about 5–30 files.

| Lane | When | Process | Review |
|---|---|---|---|
| **Quick** | ≤3 files, no schema, auth, money or personal data | Claude names the files in one line, builds, then `/end-session` | `code-review low` |
| **Standard** | Everything else | The full loop | `code-review medium` |
| **High-risk** | Auth, permissions, money, personal data or the schema | The full loop | `code-review high` + `security-review` |

## Keeping sessions short

Every tool call re-sends the whole conversation, so context size is the cost of everything.

| Do | Because |
|---|---|
| `/clear` between plan, build and close | The build doesn't need the planning reads. The close works from git, the plan file and the docs |
| Read the reference before the code | 1–2k tokens instead of 20k+ of exploring |
| Grep headings, then Read with `offset`/`limit` | References, TODOs and NOW.md are read in sections, never whole |
| Open only the files the plan changes or reuses | The rest is in the reference |
| Read each file once, and independent files in parallel | A re-read costs as much as the first read |
| No Explore or Plan subagents where a reference exists | Each starts cold and re-reads what you already have |
| Run the checks once per task, not per edit | |
| Keep `CLAUDE.md` under 150 lines | It loads in every session |
| Past ~150k context: `/clear` and continue from the plan file | |

Most of the savings come from references that are short and current: [REFERENCES.md](REFERENCES.md).

## Not vibe coding

1. **A plan is approved before code:** files, schema, security and scale, acceptance criteria, and how each is
   verified.
2. **Each acceptance criterion is marked `test` or `hand`.** `test` is logic (prices, permissions, statuses, limits,
   dates, parsing), proven by a Vitest test that's written first and fails first. `hand` is what a person must see,
   written to `.docs/hand-checks/<row>.md`, walked once, then deleted.
3. **Build only the row.** No "while I'm here" changes, no speculative abstractions, nothing the row didn't ask for.
   Whatever turns up goes in [LATER.md](../todo/LATER.md) as one line.
4. **Checks, not promises.** A rule that matters is a type, a lint rule, a test or a script. Zero errors is the
   baseline, so any failure is new and gets fixed.
5. **Review by risk,** as in the lanes table.
6. **The founder reads the diff and lands it.** Claude never commits.

## Checks

| Check | Command | Catches |
|---|---|---|
| Types | `npm run typecheck` | Type errors, stale route types (`next typegen`), a misspelt permission |
| Lint | `npm run lint` | `any`, UI importing the database, files over 500 lines, dead disable comments. Every rule is an error |
| Tests | `npm test` | Logic, the action pipeline, the guards |
| Actions | `npm run check:actions` | A `'use server'` export not built by a factory |

**CI** runs all four on pushes to `dev` and `main`, and on PRs into either. Every step runs even when an earlier one
failed. CI builds on Linux, where imports are case-sensitive: when CI and Windows disagree, CI is right.

## Git

- **One row = one branch,** named after it (`a-1`). Never work on `dev` or `main` directly.
- **Close a row:** `/end-session` → `git add -A` → `git commit -F .commit-msg.txt` → `git push -u origin a-1` → PR into
  `dev` → CI green → **Squash and merge.**
- **Release:** a PR from `dev` into `main`, merged with **Create a merge commit**, never squash.
- **`-F`, never `-m`:** PowerShell 5.1 splits a `-m` message on its double quotes.
- **Never commit `.env`.** Move it between PCs by password manager.

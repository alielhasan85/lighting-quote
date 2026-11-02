---
name: end-session
description: Close a work session. Verify, update the TODO, reference and NOW.md in place, file what wasn't done, run /code-review, then list the changed files and draft the commit message. Never commits.
argument-hint: "[NOW.md row, e.g. A-1]"
disable-model-invocation: true
---

# End a session

Session: **$ARGUMENTS** (if blank, take it from the plan).

The founder runs this after `/clear`, once they've tested. Everything it needs is in git, the plan and the docs. Read
sections, not files. **Never run `git add`, `git commit`, `git push`, amend or rebase.**

## 1. What changed

Run `git status --short` and `git diff HEAD --stat` in parallel. If this conversation doesn't show the session's
files, Grep `~/.claude/plans/` for the row and use that plan's Files section. Files that aren't part of this
deliverable: list them and ask before including them.

## 2. Verify

Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run check:actions` once, in parallel. Fix every error:
there is no backlog, so each one is new. Docs or config only → skip them and say so. Report the results plainly.

## 3. Docs: edit in place, never append

1. **TODO:** the finished session becomes `✅ <date>` in its table, and its section is deleted. All done → move the
   file to `.docs/archive/` and remove its links.
2. **Reference:** follow `.docs/guides/REFERENCES.md` → Updating one: file map, Flow, Rules (each new action and its
   permission), Decisions, Known issues, index line. A feature that now spans 5+ files and has no reference gets one
   from `_TEMPLATE_REFERENCE.md`. Report `<file>: <before> → <after> lines`. Over 300 → compress or split now.
3. **NOW.md:** delete the finished row, and replace the last line with `<date> · <what closed> · next: <row>`.
4. **Hand checks:** ask whether the founder walked `.docs/hand-checks/<row>.md`. Walked → delete it. A failed check is
   fixed now or filed below. Not walked → keep it, and show it in §5.
5. **File what wasn't done** (the plan's "Found, not doing" plus review findings outside this deliverable): a gate
   blocker → ask the founder about a new row. Anything else → one line in `.docs/todo/LATER.md`. Never a new TODO file.

## 4. Review

Always pass a level explicitly:

| The diff | Review |
|---|---|
| Docs or config only | None; say so |
| Quick lane, no risk area | `code-review low` |
| Everything else | `code-review medium` |
| Auth, permissions, money, personal data or the schema | `code-review high`, then `security-review` |

Check the diff against the plan's **Security** and **Scale** sections and the reference's **Rules**. Fix confirmed
findings in this deliverable; file the rest as in §3.5.

## 5. Hand off

1. **Changed files,** grouped by folder, plus any step the founder must run (a migration, an environment variable).
   Not tested yet → show the hand checks in full.
2. **Size:** over ~30 files → say how to split it into commits.
3. **Commit message:** write it to `.commit-msg.txt` (gitignored) and show it:

   ```
   <ROW>: <what changed, under 72 characters>

   - <change and why>, wrapped at 72 characters
   - Verification: <commands and results>
   - Docs: <TODO / reference / NOW.md>

   Co-Authored-By: <the model attribution line from the system prompt>
   ```

   Hand over `git commit -F .commit-msg.txt`, never `-m`: PowerShell 5.1 splits a `-m` message on its double quotes.
4. **Remind:** open the PR into `dev`, and merge only when CI is green.

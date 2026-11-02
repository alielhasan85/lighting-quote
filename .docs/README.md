# .docs — index

Search this file; don't read it whole.

| Tier | Where | Holds | At the end of a session |
|---|---|---|---|
| **Queue** | [NOW.md](NOW.md) | Open work only: gates, rows with budgets | Delete the finished row |
| **Spec** | `todo/<FEATURE>_TODO.md` | What to build next, with "Done when" | Delete what's done; archive the file at 100% |
| **Truth** | `references/<FEATURE>_REFERENCE.md` | What is built today | Update in place: [REFERENCES.md](guides/REFERENCES.md) |
| **Deferred** | [todo/LATER.md](todo/LATER.md) | Everything not now, one line each | Add what the session found |
| **Why** | [PROJECT_BRIEF.md](PROJECT_BRIEF.md) | What we're building and for whom. Not active work | Rarely |

Update order: **TODO → reference → NOW.md,** in the same commit as the code.

## Feature → reference

| Feature | Reference | TODO |
|---|---|---|
| Auth & permissions | [AUTH_REFERENCE.md](references/AUTH_REFERENCE.md) | — |
| App shell & workspace creation | [APP_SHELL_REFERENCE.md](references/APP_SHELL_REFERENCE.md) | — |
| Product library | — | [PRODUCT_LIBRARY_TODO.md](todo/PRODUCT_LIBRARY_TODO.md) |

## Guides

- [WORKFLOW.md](guides/WORKFLOW.md): the session loop, keeping sessions short, not vibe coding, checks, git
- [ARCHITECTURE.md](guides/ARCHITECTURE.md): where code goes, security rules, scale rules
- [REFERENCES.md](guides/REFERENCES.md): how to write, read and update a reference

## Other folders

- `hand-checks/<row>.md`: the founder's test of one row, deleted once walked
- `archive/`: finished TODOs

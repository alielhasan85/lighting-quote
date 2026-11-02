---
paths:
  - "app/**/*.tsx"
  - "components/**"
  - "hooks/**"
---

# UI files

- **Where it goes:** used by one feature → that route's `components/`. Used by two or more → `components/`. shadcn
  primitives → `components/ui/`. Full table: `.docs/guides/ARCHITECTURE.md` → Where things go.
- **Server components by default.** `'use client'` only for state, effects, handlers or browser APIs, and as low in
  the tree as possible: the page stays a server component and passes data down.
- **Guard first:** every `page.tsx` under `(app)` calls `requireWorkspacePermissionPage` before it reads anything. Hiding
  a button is a courtesy, not a check.
- **Data:** pages read through `lib/queries/`. Client components write by calling a server action and handle
  `{ success, error }`. Never import a database value (lint).
- **Errors:** show `result.error` codes as messages. Never render a raw error.
- **Lists** render pages of results, not everything.
- **Styling:** Tailwind classes and shadcn variants, no inline styles.
- Call hooks before any early return. Keep files under 500 lines (lint): split by job.

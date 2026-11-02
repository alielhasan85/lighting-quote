# <Feature> Reference

> **Status:** <Live | In progress> · **TODO:** <link or —> · **Related:** <other references a change here touches>

<One sentence: what this feature does, and for whom.>

<!-- Rules for this file: .docs/guides/REFERENCES.md. Current state only, under 300 lines, names code instead of
     pasting it. Delete these comments. -->

## Quick Reference

```
app/(app)/w/[workspaceId]/<feature>/page.tsx             Server: guard (<PERMISSION>) → <query> → render
app/(app)/.../<feature>/<feature>-client.tsx           Client shell: <what's interactive>
app/(app)/.../<feature>/components/                    <The main components>
lib/actions/<feature>.actions.ts                       <actionA>, <actionB>
lib/queries/<feature>.queries.ts                       <queryA>, <queryB>
lib/<feature>/                                         Pure rules: <what>, with tests
prisma/schema.prisma                                   <Models>
```

**Key concepts**

- <The 3–5 things you must know before changing anything.>

## Flow

```
User does X on <Component>
  └─► <actionA>({ workspaceId, ... })                     <PERMISSION>
        └─► <ruleFn>(...)                              <the rule that matters>
              └─► prisma.<model>.<op>({ where: { workspaceId, ... } })
```

## Rules

- `<actionA>` needs `<PERMISSION>`; `<actionB>` needs `<PERMISSION>`.
- Every query filters by `workspaceId`.
- <Limits, invariants, what must never happen.>

## Common tasks

### <Add a ...>

1. <Step>

## Decisions

| Decision | Why |
|---|---|
| | |

## Known issues

- <Unfixed only: what happens, and where.>

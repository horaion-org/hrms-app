# src/features

One folder per feature (`leave`, `people`, `scheduling`, …), holding everything the app knows about it that a page
composes: its API module, hooks, pure modules and the components no other feature reuses.

## The dependency rule

Imports point one way:

```text
routes → pages → features → components → common
```

- A feature imports `src/components`, `src/common` and other features, never a page or a route. Its page tests
  (`<Name>.test.tsx`) are the exception: they render the page they cover.
- Two features never import each other both ways. Code both need moves to `src/common`, or to the feature that owns
  it.
- A feature imports another feature's module by its file (`@/features/leave/api`), never through a barrel. There is no
  `index.ts` per feature.
- Code outside a component folder imports it through its `index.ts` (`@/features/leave/LeaveRequestDialog`), never a
  file inside it.
- Inside `scheduling`, the lowercase folders are areas (`roster`, `constraints`, `months`, …); two areas never import
  each other both ways either. Files at the top of `scheduling` (`paths.ts`, `periods.ts`) are shared by every area.

`pnpm lint` checks every rule above and names the file and what to do: `scripts/check-import-direction.mjs` and
`scripts/check-feature-cycles.mjs`. Each keeps a list of today's exceptions that only shrinks.

## What a feature holds

| File | Holds | Example |
| --- | --- | --- |
| `api.ts` | Zod schemas, requests, query keys and query options | `scheduling/hours/api.ts` |
| `use<Thing>.ts` | A hook returning one state: pending, error, hidden or ready | `scheduling/hours/useRosterHours.ts` |
| `use<Area>Actions.ts` | The mutations and what each reloads | `scheduling/constraints/useConstraintActions.ts` |
| `<area>Refusal.ts` | The API's refusal codes, named once, mapped to copy | `scheduling/constraints/constraintRefusal.ts` |
| `<thing>.ts` and its `.test.ts` | Pure logic with a table test | `scheduling/schedules/scheduleActions.ts` |
| `fixtures.ts` | API-shaped data for tests and stories | `scheduling/hours/fixtures.ts` |
| `<Component>/` | A component with its story, test and `index.ts` | `leave/LeaveRequestDialog/` |

For a step-by-step recipe of each common change, see [docs/guides](../../docs/guides/README.md).

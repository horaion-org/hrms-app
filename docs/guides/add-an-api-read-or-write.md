# Add an API read or write

How the app reads something from the API and shows each state of the answer, and how it changes something and
explains a refusal. Below, `<area>` is the folder that owns the data (`src/features/scheduling/hours`, or a feature
such as `src/features/leave`), and `X` the thing read (`RosterHours`).

The worked example for a read is the roster's hours: `src/features/scheduling/hours/api.ts` (`rosterHoursSchema`,
`fetchRosterHours`, `rosterHoursKey`, `rosterHoursQuery`) and `src/features/scheduling/hours/useRosterHours.ts`. For a
write it is the constraints: `createConstraint` in `src/features/scheduling/constraints/api.ts`,
`src/features/scheduling/constraints/useConstraintActions.ts` and
`src/features/scheduling/constraints/constraintRefusal.ts`.

## A read

1. **The path.** In scheduling, add a function to `src/features/scheduling/paths.ts`, built on `departmentPath` or
   `companyPath` from `src/common/companyPath.ts`, with a docstring naming what it addresses. Elsewhere, put it beside
   the feature's other paths in its `api.ts`.

2. **The schema and the request, in `<area>/api.ts`.**
   - A zod schema of the answer (`xSchema`) and its type (`export type X = z.infer<typeof xSchema>`). An enum the API
     may grow ends in `.catch("UNKNOWN")` with `"UNKNOWN"` listed, as `src/features/scheduling/months/api.ts` does,
     so a new value does not fail the whole answer.
   - `fetchX(companyId, …, signal?)` calling `apiRequest(path, xSchema, { signal })` from `@/common/api-client`.
   - `xKey(…)`: the query key, starting with the area's root (in scheduling, `scheduleKey(…)` or
     `[SCHEDULING_QUERY_ROOT, companyId, …]`), typed `as const`.
   - `xQuery(…, allowed = true)`: `queryOptions` typed `QueryOptionsFor<X, ReturnType<typeof xKey>>`, with
     `queryFn: allowed ? … : skipToken`, `meta: administrativeMeta(companyId)`, `staleTime: 30_000` and `retry` from
     `@/features/workspace/retry`.

   Copy `src/features/scheduling/hours/api.ts`, lines 150 to 198.

3. **The hook: `<area>/useX.ts`.** It checks the key with `useAccess().can(key, scope)`, asks only when allowed, and
   returns one state: `{ status: "pending" | "error" | "hidden" }` or `{ status: "ready", x }`. A 403 from the API
   reads as `hidden`. Copy `src/features/scheduling/hours/useRosterHours.ts`.

4. **A fixture: `<area>/fixtures.ts`.** One API-shaped answer, for tests and stories. Copy
   `src/features/scheduling/hours/fixtures.ts`.

5. **The test: `<area>/api.test.ts`.** `configureApiClient` in `beforeEach`, `stubApi` to answer the path with
   `envelope(fixture)`, then assert what `fetchX` returns. Copy `src/features/scheduling/hours/api.test.ts`.

## A write

1. **The request, in `<area>/api.ts`.** `createX(companyId, …, body)` calling
   `apiRequest(path, answerSchema, { method: "POST", body })`. Copy `createConstraint` in
   `src/features/scheduling/constraints/api.ts`.

2. **The mutation: `<area>/use<Area>Actions.ts`.** One `useMutation` per write, with
   `meta: { successMessage: "<copy key>" }` and an `onSuccess` that invalidates every query the write changes. Copy
   `src/features/scheduling/constraints/useConstraintActions.ts`.

3. **The refusals: `<area>/<area>Refusal.ts`.** Name every code the API can refuse with once, as
   `"<status> <CODE>"`, in a `const … = { … } as const` table, and map them to copy through `mapRefusal` from
   `src/common/refusal.ts`: `codes` puts a refusal on a form field, `alerts` shows it as the form's message, and
   `forbidden` and `failed` cover the rest. Copy `src/features/scheduling/constraints/constraintRefusal.ts`.
   - A hook or component that must tell one refusal from the others asks this module too: export a predicate that
     compares `refusalCodeOf(error)` (from `src/common/refusal.ts`) with the named code, as `isRosterClash` in
     `src/features/leave/leaveRefusal.ts` does.
   - Nothing else compares `errorCode` with a string or writes a `"409 …"` key: `pnpm lint` (`check-loose-codes`)
     fails on a file outside a refusal module that does, and names it.

4. **Its test: `<area>/<area>Refusal.test.ts`.** One case per code, asserting the field or message it lands on, plus
   a 403 and a network failure. Copy `src/features/leave/leaveRefusal.test.ts`.

5. **The copy, in both locale files** ([Add copy](add-copy.md)): the success message, and for each refusal what
   happened and what to do.

## Prove it

```sh
pnpm exec vitest run --maxWorkers=3 <area> src/common/locales.test.ts
pnpm exec tsc --noEmit
pnpm lint
```

`tsc` fails while a `t("…")` key or a `successMessage` key is missing from the English copy, and
`src/common/locales.test.ts` while the Spanish lacks one. `pnpm lint` fails on a
refusal code spelt outside `<area>Refusal.ts` and names the file.

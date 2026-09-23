# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Components are first-class citizens

React components are the primary unit of work in this codebase. UI is assembled
from named, reusable, independently testable components — never from ad-hoc JSX
written inline at the call site.

### Required workflow for any task that touches UI

**1. Search before you write.**

Before producing a single line of JSX, search for an existing component that
already does the job. Search by concept, not just by exact name — a "status
badge" may already exist as `Badge`, `Chip`, `Tag`, or `Pill`.

```bash
# by name/concept
rg -il '<concept>' src/components src/features src/pages
# by directory
find src/components -type d -maxdepth 3
```

Cover all of `src/components/{ui,forms,layout,charts}`, plus `src/features/*`
for a component that may exist but has not been promoted to shared yet.

**2. If it exists — reuse it.** Extend its props if the new case needs it.
Do not clone, fork, or re-implement a near-duplicate.

**3. If it does not exist — stop and ask.**

Do not silently create the component, and do not work around its absence with
inline JSX. Pause the task and ask, reporting:

- what you searched for and where
- the nearest existing component, if any
- the exact component and path you propose creating
- the files that come with it

Then wait for an answer before continuing. Example:

```text
No existing component matches "status badge".
Searched: src/components/{ui,forms,layout,charts}, src/features/*
Nearest: none

Create src/components/ui/Badge/ first?
  Badge.tsx  Badge.stories.tsx  Badge.test.tsx  index.ts
```

This gate applies even when creating the component looks obvious or trivial.
The point is that component inventory is a decision the human owns.

## Where components go

| Directory                | Holds                                                      |
| ------------------------ | ---------------------------------------------------------- |
| `src/components/ui`      | Generic UI primitives — buttons, badges, modals, inputs     |
| `src/components/forms`   | Form controls and form-specific composites                  |
| `src/components/layout`  | Layout scaffolding — sidebars, headers, shells              |
| `src/components/charts`  | Reusable charts, split into `bar/`, `line/`, `pie/`         |
| `src/components/utils`   | Non-visual helper components (e.g. devtools wrappers)       |
| `src/features/<feature>` | Components bound to one feature and not reused elsewhere    |
| `src/pages`              | Page-level composition only — no primitives defined here    |

Each directory's `README.md` is authoritative for its own conventions; read it
before adding to that directory.

## Component file conventions

One component per folder, named for the component, with a full file set:

```text
src/components/ui/Badge/
  Badge.tsx          # the component
  Badge.stories.tsx  # Storybook story
  Badge.test.tsx     # Testing Library unit test
  index.ts           # re-export; all imports go through this
```

- Named exports, not default exports.
- Return type is `FunctionComponent` from `@/common/types`.
- Import via the `@/` alias (`@/components/ui/Badge`), never deep relative paths.
- Compose subcomponents as nested folders following the same quad (see
  `src/components/layout/README.md`).
- A component promoted from `src/features/*` to `src/components/*` gets the
  stories and test files at promotion time.

## Stack

Vite · React 19 · TypeScript (strict) · TanStack Router/Query/Table · React Hook
Form + Zod · Zustand · Tailwind 4 · i18next · Nivo · Storybook · Vitest +
Testing Library · Playwright.

Routes are file-based under `src/routes`; `src/routeTree.gen.ts` is generated —
never edit it by hand.

## Checks

```bash
pnpm lint          # eslint, zero warnings tolerated
pnpm test:unit     # vitest
pnpm test:e2e      # playwright
pnpm build         # tsc + vite build
```

Run `pnpm lint` and `pnpm test:unit` after changing components.

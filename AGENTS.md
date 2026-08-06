# Project Guidelines

Horaion's web client. It talks to the Horaion API (`../api`), a multi-tenant workforce platform where
identity lives in AWS Cognito, authorization facts live in PostgreSQL, and authorization policy is
evaluated by a Permit.io PDP. Read `CONTEXT.md` for the domain vocabulary before naming anything.

* **Read Before Writing:** Study existing patterns in the same feature or component directory before
  writing code.
* **Strict Adherence:** Follow established patterns exactly (naming, structure, formatting, tests). Do
  not introduce new conventions without explicit approval.
* **Ask When Unsure:** If a pattern is ambiguous, ask for clarification before proceeding.

## Tooling gates

`pnpm lint` runs ESLint with `--max-warnings 0`. `pnpm build` runs `tsc` before Vite. Both must pass.
Run `pnpm format` (Prettier) rather than hand-aligning anything.

## Formatting

Prettier owns this; the settings that surprise people are listed so you write it right the first time.

* **Tabs** for indentation, width 2.
* **Print width 80.**
* **Double quotes**, semicolons, `trailingComma: "es5"`, `arrowParens: "always"`.

## TypeScript

* **Explicit return types on every function and component** (`explicit-function-return-type`,
  `explicit-module-boundary-types`). React components return `FunctionComponent` imported from
  `@/common/types` — it is an alias for `React.ReactElement | null`, not React's own type.
* **`Array<T>`, never `T[]`** (`array-type: generic`). Applies to `ReadonlyArray<T>` too.
* **`import type { ... }`** for type-only imports (`consistent-type-imports`,
  `consistent-type-exports`). Merge value and type imports from the *same* module into one statement —
  `no-duplicate-imports` rejects a second statement for the same path.
* **No void-returning arrow shorthand** in handlers (`no-confusing-void-expression`). Use a block body:
  `onClick={() => { mutate(); }}`, never `onClick={() => mutate()}`.
* **Import through the `@/*` alias** (→ `src/*`), never deep relative paths.
* **No abbreviations** (`unicorn/prevent-abbreviations`). Write `request`, `response`, `parameters`,
  `properties`. A short allow-list exists in `eslint.config.js`; extend it there rather than working
  around the rule.

`tsconfig.json` is strict in ways that change how you write code, not just what compiles:

* `noUncheckedIndexedAccess` — every index access is `T | undefined`. Narrow it; do not assert.
* `noPropertyAccessFromIndexSignature` — reach into index signatures with `object["key"]`.
* `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`.

## JSX

* **Props sorted** (`react/jsx-sort-props`): reserved first, shorthand first, callbacks last, multiline
  last. `pnpm lint:fix` sorts them for you.
* No `React` import needed (`react/react-in-jsx-scope` is off, `jsx: "react-jsx"`).

## Structure

Features are self-contained under `src/features/<feature>/`, each mirroring the root `src` layout as
needed (`components/`, `hooks/`, `api.ts`, `schemas.ts`). Cross-feature concerns live at the root.

```text
src/
├── common/         # types, i18n, shared utilities, generated API types
├── components/
│   ├── ui/         # primitives — one directory each, see below
│   ├── forms/      # form-specific composites
│   ├── layout/     # shell, navigation, page chrome
│   └── charts/     # Nivo wrappers
├── features/       # <feature>/ — one per product area
├── hooks/          # cross-feature hooks
├── pages/          # route-level compositions
├── routes/         # TanStack Router route definitions
└── store/          # Zustand stores
```

**Every component gets its own directory** with the component, a story, a test, and an index barrel:

```text
src/components/ui/Button/
├── Button.tsx
├── Button.stories.tsx
├── Button.test.tsx
└── index.ts
```

## UI primitives

Build primitives on **Headless UI** (`@headlessui/react`) and Tailwind. Do not add a component library.
Headless UI supplies the accessibility and focus management; Tailwind supplies the styling; the wrapper
in `src/components/ui` supplies the project's API and appearance. Icons come from `@heroicons/react`.

## API boundary

* The API speaks **`snake_case`** on the wire, in both request bodies and query parameters. TypeScript
  stays `snake_case` at the boundary types — do not add a camelCase mapping layer.
* Types are **generated** from the API's OpenAPI specification into `src/common/api-types.gen.ts` and
  **committed**, because the API generates its `openapi.json` at runtime and gitignores it. Regenerate
  with `pnpm gen:api` when the API changes; never hand-edit the generated file.
* Zod is for **form input validation only**. Do not re-declare response shapes as Zod schemas.
* Every response is wrapped in an envelope: `{ success, data, message, timestamp, path }`. Unwrap in the
  API client, not in components.
* Errors are **RFC 7807** `ProblemDetail`: `type`, `title`, `status`, `detail`, `instance`, plus an
  `error_code` property. Surface `detail`; branch on `error_code`, never on `detail` text.

## Authorization in the UI

* The Company identifier comes from `GET /api/v1/me` and is held in router context. It **never** appears
  in an app URL — app routes are `/members`, not `/companies/:id/members`.
* What the user may do comes from `GET /api/v1/companies/{companyId}/permissions`, a list of
  `resource:action` keys. Gate every action on a permission key.
* **Never infer permission from a role name.** Roles are tenant-defined; `Company Owner` is the only
  role the platform knows, and even it must be treated as data.
* Hiding an action is a courtesy, not a control. The API enforces every decision and fails closed; the
  UI must handle a 403 on any request it chose to show.

## Authentication

* Cognito is reached directly with `amazon-cognito-identity-js` (SRP). The API issues no tokens and has
  no login endpoint.
* Sign-up goes through `POST /api/v1/public/onboardings`, never through Cognito directly — the API
  creates the Company, the User, and the Owner role in one transaction.
* Handle these Cognito states explicitly: `UserNotConfirmedException` (owner has not confirmed their
  email), `NEW_PASSWORD_REQUIRED` (invited member's first sign-in after an emailed temporary password),
  and `NotAuthorizedException` with a disabled user (deactivated member).
* Tokens live in `localStorage` via the library's default storage. Never log a token, never put one in a
  URL, and never parse one for anything but expiry.

## Testing

* **Vitest** for logic: the API client, auth, route guards, permission gating, form schemas. BDD naming:
  `given_[State]_when_[Action]_then_[Result]`.
* **Storybook** stories, rather than assertions, are the coverage for presentational primitives.
* **Playwright** covers the critical path end to end against the real stack (`make up` in `../api`).

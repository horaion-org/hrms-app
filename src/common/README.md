# src/common

The common directory (also called lib) contains files common to the entire application.

The directory contains:

- `types.ts`: the `FunctionComponent` return type, and the `Heroicon` type that also describes Horaion's own icons.
- `createMemoryRouter.tsx`: the memory router used by tests and stories (below).
- `joinClassNames.ts`: joins the class names that are set, for components that accept a `className`.
- `api-client.ts`: `apiRequest`, the one way the app calls the API. It sends JSON, attaches the
  access pass unless the call is `anonymous`, lets the Session cookie travel only to the Session
  routes, renews the pass once when the API refuses it, and unwraps the `ApiResponse` envelope.
  A refusal is thrown as an `ApiProblemError`.
- `problem.ts`: `ApiProblemError`, the RFC 7807 problem the API answers with: status, `errorCode`,
  per-field errors and, for a `429`, the `Retry-After` seconds.
- `query-client.ts`: the app's single TanStack Query client.
- `i18n.ts`: i18next set up with the English and Spanish resources.
- `testing/`: helpers for unit tests only. `stubApi.ts` stubs `fetch` with a table of canned
  replies keyed by `"<METHOD> <path>"` and records every call; `openApp.ts` renders the whole
  app at a URL.

## Memory router (tests and stories)

`MemoryRouterHarness` from `@/components/utils/MemoryRouterHarness` renders its
children inside a real TanStack Router with memory history. Pass `initialEntry`
(defaults to `/`). Changing the initial entry resets the router to that location.
New children, such as changed Storybook args, re-render in place and keep the
current location. In stories, add the `withMemoryRouter` decorator and set an
`initialEntry` parameter instead of wrapping the story by hand.

The isolated route tree supports `/` and `/example`, matching the app's registered
destinations without loading app screens or changing route registration. For five
Module stories, use `/` for Dashboard with `activeOptions={{ exact: true }}` and
`/example` for the other Modules with `search={{ module: "scheduling" }}` (and
`"leave"`, `"people"`, `"organisation"`). Set the story's initial entry to e.g.
`/example?module=people`. Router search matching distinguishes the items.

For tests that inspect the location, or server/static rendering, use
`createMemoryRouter(children, initialEntry)` from `@/common/createMemoryRouter`.
Await `router.load()`, then render `RouterProvider` with that router. The factory
is browser-independent and has no Testing Library or Storybook dependencies.

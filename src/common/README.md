# src/common

The common directory (also called lib) contains files common to the entire application.

The directory contains:

- `types.ts`: the `FunctionComponent` return type, and the `Heroicon` type that also describes Horaion's own icons.
- `createMemoryRouter.tsx`: the memory router used by tests and stories (below).
- `joinClassNames.ts`: joins the class names that are set, for components that accept a `className`.

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

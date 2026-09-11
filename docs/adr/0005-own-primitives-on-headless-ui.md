# UI primitives are built in-house on Headless UI
Date: 2026-08-06 · Status: Accepted

The console needs a data table, a modal, a dropdown menu, toasts, a file input for the spreadsheet
import, and a grouped checkbox matrix for the nineteen permissions across six catalog resources.

Decided: build these in `src/components/ui`, each in its own directory with a story and a test, on top
of `@headlessui/react` and Tailwind, with icons from `@heroicons/react` and the table built on TanStack
Table. No component library is added.

Both packages are already installed, Storybook is already configured, and Headless UI supplies the
keyboard handling, focus trapping, and ARIA wiring that are the genuinely hard parts. What remains is
appearance and API, which is exactly the part a project should own. It is also the only option that
matches the per-component-directory structure the scaffold documents.

`@headlessui/react` and `@heroicons/react` are currently in `devDependencies`, which is wrong — Vite
bundles them regardless, but the manifest misstates what the application needs at runtime. Move them.

We rejected shadcn/ui, which produces excellent components quickly and leaves you owning the code, but
would add the Radix dependency tree alongside the Headless UI already present and imposes a flat
`components/ui/button.tsx` layout with `cn` and CVA conventions that contradict the documented
structure. We rejected a full library such as Mantine or MUI: it would deliver a finished console
fastest, but it competes with the configured Tailwind setup, adds substantial weight, and bends the
product's appearance toward the library's. We rejected inline utility classes with no primitives layer,
which starts fastest and then produces accessibility hand-rolled per usage and visual drift across
twenty-five screens.

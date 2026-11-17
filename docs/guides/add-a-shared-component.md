# Add a shared component

`src/components` holds what any feature may reuse: buttons, badges, dialogs, form controls, layout and charts. Which
components exist there is the owner's decision, so a new one starts with a question, never with code.

## Steps

1. **Search first.** Look for a component that already does the job, by concept as well as by name (a "status
   badge" may exist as `Badge`, `Chip` or `CountBadge`):

   ```sh
   rg -il '<concept>' src/components src/features src/pages
   find src/components -type d -maxdepth 3
   ```

   Cover `src/components/{ui,forms,layout,charts,utils}` and `src/features/*`, where a component may exist that was
   never promoted. If one fits, reuse it, extending its props if the new case needs it. Stop here.

2. **Ask the owner, and wait.** Report in four parts, as the app's `CLAUDE.md` sets out: what you searched for and
   where, the nearest existing component, the exact folder you propose, and the files that come with it.

   ```text
   No existing component matches "status badge".
   Searched: src/components/{ui,forms,layout,charts}, src/features/*
   Nearest: none

   Create src/components/ui/Badge/ first?
     Badge.tsx  Badge.stories.tsx  Badge.test.tsx  index.ts
   ```

3. **Once the owner says yes, create the four files** in `src/components/<group>/<Name>/`, where `<group>` is `ui`,
   `forms`, `layout`, `charts` or `utils` (`src/components/README.md` and each group's `README.md` say which). Copy
   `src/components/ui/CopyButton/`:
   - `<Name>.tsx`: a named export returning `FunctionComponent` from `@/common/types`, its props type exported as
     `<Name>Props`, a docstring on each. It imports only `src/common` and other components, never a feature: values
     a feature knows come in as props.
   - `index.ts`: `export { <Name>, type <Name>Props } from "./<Name>";`. Every import of the component goes through
     this file (`@/components/<group>/<Name>`).
   - `<Name>.stories.tsx`: `title: "UI/<Name>"` (or the group's prefix), one story per state. When the component
     calls `useTranslation`, the story imports `"@/common/i18n"`.
   - `<Name>.test.tsx`: Testing Library, the public behaviour of each state. When the component calls
     `useTranslation`, the test imports `"@/common/i18n"` as well (`@/features/auth/testingI18n` is a feature, which
     `src/components` may not import).

   A sub-component lives in its own folder inside the parent's, with the same four files (see
   `src/components/layout/README.md`).

4. **Prove it.**

   ```sh
   pnpm exec vitest run --maxWorkers=3 src/components/<group>/<Name>
   pnpm exec tsc --noEmit
   pnpm lint
   ```

   `pnpm lint` fails when the component, its test or its story imports a feature, when anything imports a file
   inside its folder instead of its `index.ts`, and when its story loads no translations for a translated component.
   Nothing checks that all four files exist: check the folder by eye.

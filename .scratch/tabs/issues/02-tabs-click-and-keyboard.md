# 02: Tabs on Headless UI: click and keyboard switching

**What to build:** An HR user sees a row of Tabs. The active tab has an Ink Blue 900 label with a 2px underline. Clicking another tab, or moving with the arrow keys, Home or End, swaps the view below without leaving the page. Screen readers announce a named tab list, the tabs and the panel. This slice builds all five parts (Tabs, Tab list, Tab, Tab panels and Tab panel) as thin Tailwind-styled wrappers around `@headlessui/react`'s Tabs (ADR 0001), with uncontrolled index-based selection. Parent spec: `.scratch/tabs/spec.md` (Tabs module).

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] `@headlessui/react` moves from the development dependencies to the runtime dependencies
- [x] Tabs, Tab list, Tab, Tab panels and Tab panel live as nested folders in the shared UI components area, each with the full component file set, and share one barrel. Named exports, returning the shared `FunctionComponent` type
- [x] Each part wraps the matching Headless UI component and passes `className` and other props through. No behaviour the library already provides is re-implemented
- [x] Tabs takes `defaultIndex`. Without it, the first tab is selected
- [x] Clicking a tab selects it, and only the matching panel (by order) is on the page
- [x] The type rejects a Tab list without `aria-label` or `aria-labelledby` (checked with `expectTypeOf`)
- [x] Tests pin the library's keyboard contract through the composed Tabs: Right and Left select the next and previous tab and wrap at the ends, Home and End select the first and last tab, and Tab moves focus from the tab list into the active panel
- [x] Tests check roles and naming: a named tablist, tabs with `aria-selected`, and a tabpanel named after its tab
- [x] Using a part outside Tabs throws
- [x] Looks are styled through Headless UI's data attributes: the active tab has an Ink Blue 900 label and a 2px underline across the full tab, inactive tabs have a Neutral 600 label that turns Ink Blue 700 on hover, and focus-visible shows a 2px Ink Blue 500 outline with an offset. Sizes: `text-base`, 4px horizontal padding, 40px tall, a 24px gap between tabs and no track line under the row
- [x] A story recreates the design's eight-tab row
- [x] The compiled-stylesheet test covers every colour class the Tabs parts use (including the data-attribute variants)
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass

## Comments

### Implementation and verification — 2026-09-26

- Implemented only ticket 02 in `/tmp/opencode/tab-02`. Each of the five parts has its own nested component/story/test/barrel quad, with a shared `@/components/ui/Tabs` barrel, matching Sidebar's structure.
- Public props use native element types, rather than exposing Headless UI's polymorphic/render-prop API. Tabs supports uncontrolled `defaultIndex`; type checks exclude `selectedIndex`, `onChange`, `manual`, `vertical`, `as`, and panel `static`/`unmount` options as appropriate.
- Tests use the composed public API and real Headless UI. They cover click selection, mounted panel content, naming, native prop/ref forwarding, all four orphan-part errors, arrows with wraparound, Home/End, **PageUp/PageDown**, and Tab into the active panel. No browser stubs were needed.
- Red/green evidence: the first composed click test failed on the missing Tabs export, then passed with the five thin wrappers. TypeScript then failed for missing `defaultIndex`, and separately for allowing an unnamed Tab list; both passed after their public types were implemented. The compiled stylesheet test failed with an empty colour-class list, then passed after data-state styles were added. A further red assertion required `data-focus:outline-solid`, ensuring the focus outline overrides the base `outline-none` style.
- `pnpm install --frozen-lockfile` passed before implementation and after the dependency move. Only the Headless UI importer block moved in `pnpm-lock.yaml`; package versions and resolutions are unchanged. The existing `package-lock.json` predates current dependency versions and was not regenerated.
- Final checks: `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed **14 files / 391 tests**; `pnpm build` passed (TypeScript and Vite); `git diff --check` passed. Focused Tabs + stylesheet checks passed **6 files / 102 tests** during implementation.
- Self-review against this ticket, the full spec, CLAUDE.md and component READMEs found no remaining standards or ticket-02 scope issues. Changes are left unstaged for coordinator integration.

### Notes for successor tickets

- Ticket 03 should add disabled styling and skip/initial-selection tests; native `disabled` already passes through the button props. Extend the hover selector to exclude disabled tabs. Initial disabled-tab selection remains unverified here.
- Ticket 04 should add controlled props and callback tests, and update the current type assertion that excludes `selectedIndex`/`onChange`. No callback filtering or wrapper selection state was introduced.
- Ticket 05 can add Count badge composition in Tab; no count API or render-prop branching was introduced in this slice.
- Ticket 06 owns scrolling, scrollbar hiding, and active-tab visibility. Tab list currently supplies only the row and 24px gap.
- Preserve `data-focus:outline-solid` alongside the outline width/colour/offset: Tailwind's base `outline-none` otherwise leaves the outline style unset for visibility. The compiled-CSS test pins this.
- Stories include an eight-tab profile row and a starting-index example; every subpart story renders composed Tabs. The Hover story follows SidebarItem's forced-class prior art without adding a dependency. The supplied handoff contains the measured design dimensions but no original image/label list, so the row uses representative profile labels. Stories were typechecked; browser visual inspection was not performed.

### Integration verification — 2026-09-26

- Transferred ticket 02 into `/home/vernon/projects/horaion/worktree/tab` using read/apply_patch, preserving integrated ticket 01 and merging both compiled-stylesheet additions.
- Combined checks passed: `pnpm install --frozen-lockfile`, `pnpm lint` (zero warnings), `pnpm test:unit --run` (**15 files / 402 tests**), `pnpm build`, and `git diff --check`.
- Reviewed the combined dependency/stylesheet diff and verified the entire Tabs directory matches the isolated implementation exactly. All changes remain unstaged. Tickets 03, 04 and 06 can proceed from this integrated working tree.

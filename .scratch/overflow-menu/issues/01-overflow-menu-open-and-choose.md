# 01: Overflow menu that opens and runs an action

**What to build:** A developer can compose an `OverflowMenu` with a `label` and `OverflowMenuItem` children, each with an `onClick`, and import both from one shared UI entry point. A user sees a white, bordered header showing the label and a decorative ⋮. Clicking the header, or opening it from the keyboard, turns the header Ink Blue 50 and floats the action list flush beneath it at the same width. Header and list read as one rounded card with Neutral 400 border and dividers and a soft shadow. The user can move through the items with a pointer or the arrow keys, and the highlighted item gets a Neutral 100 fill. Choosing an item runs its action and closes the menu. Escape or clicking outside closes it too, and focus goes back to the header. The menu is built on Headless UI's Menu, which moves from devDependencies to runtime dependencies. Parent spec: `.scratch/overflow-menu/spec.md` (see "Implementation Decisions" for the dimension and colour tables).

This ticket sets up the component's nested file set (`OverflowMenu` and `OverflowMenuItem` folders plus a group entry point, following Sidebar) and its single test seam: the composed public pair driven through Testing Library and user-event.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `@headlessui/react` is a runtime dependency, not a devDependency, and `pnpm build` passes.
- [x] `OverflowMenu`, `OverflowMenuItem` and their props types are importable through the `@/` alias from one entry point. Named exports, `FunctionComponent` return type, each subcomponent with its own component, story, test and index files.
- [x] The header is a button whose accessible name is the label, with `aria-expanded` reflecting open state. The ⋮ (`MoreVerticalIcon`, 24px, doesn't shrink) sits at the trailing edge and is hidden from assistive technology.
- [x] Closed header: white background, Neutral 400 border, `rounded-lg` on all corners, Neutral 100 fill on hover, 48px tall, `px-4`, `text-base` semibold, Neutral 900. Keyboard focus shows an Ink Blue 500 outline, 2px wide with a 2px offset, like Button.
- [x] Open header: Ink Blue 50 fill, only the top corners rounded in normal bottom placement. User-approved collision exception: all corners rounded when the panel flips above (see follow-up below).
- [x] The open list floats over content (no layout shift), normally anchored with no gap under the header and matching its width. There's one shared Neutral 400 border, Neutral 400 dividers between the header and each row, rounded bottom corners, and a soft shadow. User-approved exception: native collision handling may flip or shift the panel; flipped panels use a complete bordered, rounded card.
- [x] Items are `menuitem`s inside a `menu`: 44px tall, `px-4`, `text-sm` regular, Neutral 900. Hover and keyboard highlight give a Neutral 100 fill.
- [x] The menu opens with click, Enter, Space or the Down arrow key. The arrow keys move between items.
- [x] Choosing an item by click or Enter calls its `onClick` once and closes the menu.
- [x] Escape and clicking outside close the menu. Focus returns to the header for Escape/non-focusable outside content; clicking an outside control retains focus on that control, per user-approved Headless UI defaults.
- [x] The root fills its container's width, and a custom `className` lands on the root.
- [x] Open, highlighted and hover looks are driven by Headless UI's state attributes, not extra React state.
- [x] Stories: closed and open, with a `label` control.
- [x] Tests cover everything above through the public pair only. `pnpm lint` (zero warnings) and `pnpm test:unit` pass.

## Comments

### Final integration evidence — 2026-09-26

- Final combined verification: lint passed with zero warnings; 398 unit tests passed across 11 files; production build and diff whitespace check passed. Standards/spec reviews and focused follow-up review are complete.
- Chromium/Storybook inspection confirmed normal flush geometry, token colours, 48px header/44px rows, and actual viewport flipping with full borders and rounded corners. The user approved native collision placement and outside-control focus exceptions; the canonical spec now records them. Designer sign-off and exact shadow review remain non-blocking.
- Cross-runtime skill findings and execution deviations are recorded in the spec's completion comment: Claude Code does not discover either implementation skill despite files being present; Codex runtime discovery cannot be checked because its executable is absent from PATH. OpenCode supplied the implementation workflow.

### Implementation complete — 2026-09-26

- Implemented ticket 01 at `src/components/ui/OverflowMenu/` with nested `OverflowMenu/` and `OverflowMenuItem/` component/story/test/index sets and a group entry point exporting both components and props types. Reused `MoreVerticalIcon` and `joinClassNames`.
- TDD used the approved public composed-pair seam. Observed failures for the missing entry point, missing action callback, header/panel styles, and item styles before implementing each slice. Final targeted run: `pnpm exec vitest run src/components/ui/OverflowMenu` — 2 files, 9 tests passed. Tests cover pointer and keyboard opening/navigation, activation, dismissal/focus return, semantics, state styling, root class placement, and observable floating-panel configuration.
- Moved `@headlessui/react` to runtime dependencies, then ran `pnpm install`; `pnpm-lock.yaml` records the dependency move without a version change.
- Required checks passed: `pnpm lint` (zero warnings), `pnpm test:unit --run` (11 files, 388 tests), and `pnpm build` (TypeScript and Vite production build). Vite's test startup prints an advisory recommending the React plugin instead of SWC; it does not fail the checks.
- Chose stock Tailwind `shadow-md` for the soft shadow. Panel uses Headless UI `anchor="bottom start"`, `--button-width`, and explicit zero anchor gap/offset. Its top border is removed; the header's bottom border provides the divider. Headless UI retains its default collision handling and portalling. Consumer `className` applies to the full-width root, not the portalled panel.
- Styling uses Headless UI `data-open`, `data-hover`, and `data-focus`, without local open/highlight state. The open-plus-hover header remains Ink Blue 50. Item children are typed as plain-text `string`; optional `onClick` uses `MouseEventHandler<HTMLButtonElement>`. Headless UI owns keyboard behavior, dismissal, and focus management; outside-dismissal focus is tested on non-focusable page content, preserving the library's default behavior for focusable outside targets.
- Added a minimal no-layout `ResizeObserver` shim in `vitest.setup.ts` after Headless UI raised an unhandled missing-API error. No menu internals are mocked. jsdom checks configuration/state, not real dimensions or rendered shadow; Storybook stories are available for visual review. Designer/Figma comparison has not been performed and is not an implementation blocker.
- Integration: ticket 02 can extend `OverflowMenuItem/` for disabled items; ticket 03 can extend `OverflowMenu/` for a disabled trigger. Disabled props/stories are intentionally left to those tickets. The parent spec and read-only handoff snapshot are unchanged. No staging, commits, pushes, or review subagents were used; coordinator review remains pending. No implementation blockers.

### Review follow-up: approved native defaults and flipped cards — 2026-09-26

- The user explicitly chose **“Keep library defaults (Recommended)”** after browser review exposed top placement near the viewport bottom. This approves collision-aware placement and native outside-control focus behavior as exceptions to the original unconditional bottom placement/focus-return wording.
- Normal `bottom start` placement keeps its existing flush joined-card styling. For resolved `top` placement, the panel restores its top border and rounds all corners; the header restores its bottom rounding. The flipped presentation is deliberately two complete cards, rather than trying to invert a joined border across a portal. The zero anchor gap remains; adjacent borders/shadows may therefore read as two touching cards.
- Headless UI 2.2.10 has no public resolved-placement render prop. A stable panel callback ref observes only its exposed `data-anchor` attribute and mirrors it onto the trigger as `data-panel-anchor`. Tailwind attribute variants supply the top-placement styling. There is no added React open/highlight state, geometry calculation, anchoring override, or focus override. Observer cleanup removes the mirrored attribute and disconnects on panel detach, including the existing disabled-key reset.
- Horizontal shifting and viewport size constraints remain native defaults too: at constrained viewport edges, exact header/panel edge alignment and a seamless single-card join are not guaranteed. No custom collision detection is introduced to compensate for shifts that do not change the placement attribute.
- Regression coverage uses the public composed pair. The placement test supplies changes to the exposed `data-anchor` in jsdom and checks the mirrored styling state, return to bottom placement, close/reopen cleanup, and isolation from a detached panel. The existing disable-while-open test now also exercises a flipped panel. A separate test confirms an outside Button retains focus after dismissal. These are styling/behavior regressions, not a simulation of browser layout or proof of actual collision placement.
- Validation after this follow-up: `pnpm exec vitest run src/components/ui/OverflowMenu` — **2 files, 19 tests passed**; `pnpm lint` — **passed, zero warnings**; `pnpm test:unit --run` — **11 files, 398 tests passed**; `pnpm build` — **passed**. Existing integrated ticket 02/03 disabled behavior and key-reset fixes are preserved.
- Follow-up changes are limited to `OverflowMenu.tsx`, `OverflowMenu.test.tsx`, and this ticket. Coordinator owns browser verification of normal/flipped rendering and the canonical spec update. No staging, commits, agents, or new components. No implementation blockers.

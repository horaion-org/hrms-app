# Spec: Overflow menu

Status: resolved

## Problem Statement

The Horaion design defines an overflow menu: a labelled header with a ⋮ (more) icon that opens a list of actions directly beneath it. The only design frame (`design/overflow-menu-open.png`) shows it open, with an Ink Blue 50 header, three plain-text rows separated by dividers, and one rounded, bordered card around everything.

The codebase has no menu or dropdown component. The shared UI primitives are only Button and Icon. So whenever a screen needs a set of secondary actions, a developer has to build their own popover. That means they have to reimplement keyboard navigation, focus handling, outside-click dismissal and ARIA menu semantics each time. The menus then drift from the design and from each other, and it's easy to get accessibility wrong.

## Solution

Add a reusable overflow menu to the shared UI components, made of two parts: `OverflowMenu`, the labelled header that opens and closes the menu, and `OverflowMenuItem`, one action row. It's built on Headless UI's Menu, so keyboard navigation, focus management, dismissal and ARIA roles come from a proven library. All styling uses Horaion tokens in Tailwind.

When closed, the menu is a single white, bordered row showing the label and ⋮. When opened, the header fills with Ink Blue 50 (Ink Blue marks active states). The action list floats over page content, flush under the header and the same width, so the two read as one card with a soft shadow. Choosing an item runs its action and closes the menu. Individual items can be disabled, and so can the whole menu.

## User Stories

1. As a developer, I want a shared overflow menu component, so that I stop hand-building popovers for secondary actions.
2. As a developer, I want to import `OverflowMenu` and `OverflowMenuItem` through the `@/` alias from one UI components entry point, so that it follows the same import convention as every other shared component.
3. As a developer, I want to compose the menu from `OverflowMenu` and `OverflowMenuItem` children, so that the call site reads like the menu it renders.
4. As a developer, I want to give the menu a `label`, so that the header names what the actions apply to.
5. As a developer, I want each item to take an `onClick` handler, so that choosing it runs my action.
6. As a developer, I want the menu to close automatically after an item is chosen, so that I don't have to manage open state myself.
7. As a developer, I want to mark an individual item `disabled`, so that I can show an action the user isn't allowed to take right now without removing it.
8. As a developer, I want to disable the whole menu, so that I can show the actions are temporarily unavailable.
9. As a developer, I want the menu to fill its container's width, and the `className` I pass to go on the root, so that I can size and place it in a layout the same way as Input.
10. As a developer, I want the open list to float over surrounding content, so that opening the menu never shifts the page layout, even inside cards or table cells.
11. As a developer, I want the open list to be exactly as wide as the header, so that the pair always looks like one card.
12. As a developer, I want item children to be plain text, so that every menu looks uniform and matches the design.
13. As a user, I want a closed menu to look like a single white, bordered row with a label and a ⋮ icon, so that I can tell there are more actions behind it.
14. As a user, I want the closed header to show a Neutral 100 fill when I hover over it, so that I know it's clickable.
15. As a user, I want to click the header to open the menu, so that I can see the available actions.
16. As a user, I want the header to turn Ink Blue 50 while the menu is open, so that I can see which menu is active.
17. As a user, I want the open list to sit directly under the header with shared borders and dividers between rows, so that it's clear which header the actions belong to.
18. As a user, I want the open menu to cast a soft shadow, so that it reads as floating above the page.
19. As a user, I want the item under my pointer to get a Neutral 100 fill, so that I can see which action I'm about to choose.
20. As a user, I want the item fill to differ from the header's Ink Blue 50, so that a highlighted item never looks like part of the header.
21. As a user, I want a disabled item shown in Neutral 500 text, so that I can see the action is unavailable.
22. As a user, I want clicking a disabled item to do nothing, so that I can't trigger an action I'm not allowed to take.
23. As a user, I want a disabled menu shown with a Neutral 200 background and Neutral 500 text and icon, so that I can tell at a glance it can't be opened, the same way a disabled Input looks.
24. As a user, I want clicking outside an open menu to close it, so that I can back out without choosing anything.
25. As a keyboard user, I want to tab to the header and open the menu with Enter, Space or the Down arrow key, so that I can use it without a mouse.
26. As a keyboard user, I want to move between items with the Up and Down arrow keys, so that I can reach every action.
27. As a keyboard user, I want disabled items skipped while I move with the arrow keys, so that I only land on actions I can take.
28. As a keyboard user, I want the highlighted item to get the same Neutral 100 fill as on hover, so that I can see where I am.
29. As a keyboard user, I want Enter or Space on a highlighted item to run it, so that I can choose actions from the keyboard.
30. As a keyboard user, I want Escape to close the menu and put focus back on the header, so that I don't lose my place.
31. As a keyboard user, I want focus to go back to the header after I choose an item, so that I can carry on from where I was.
32. As a keyboard user, I want a disabled menu skipped when I tab, so that I don't stop on something I can't open.
33. As a keyboard user, I want a visible Ink Blue 500 focus ring on the header, matching Button, so that I always know where focus is.
34. As a screen-reader user, I want the header announced as a button that opens a menu, including whether it's expanded, so that I know what it does.
35. As a screen-reader user, I want the header's accessible name to be its label, with the ⋮ icon hidden from me, so that I hear the meaningful text only once.
36. As a screen-reader user, I want the list announced as a menu and each row as a menu item, so that I understand the structure.
37. As a screen-reader user, I want disabled items announced as unavailable, so that I know why choosing them does nothing.
38. As a touch user, I want each item at least 44px tall, so that it's easy to tap.
39. As a designer, I want the header 48px tall with semibold base-size text and a 24px ⋮, and rows 44px tall with small-size text, all in Neutral 900 on 16px horizontal padding, so that the component matches the frame.
40. As a designer, I want Storybook stories for the closed, open, disabled-item and disabled-menu states, so that I can review the component against the design.
41. As a designer, I want Storybook controls for the label and disabled, so that I can try combinations interactively.
42. As a maintainer, I want the component to follow the standard nested component file set, like Sidebar and SidebarItem, so that it's as easy to find and test as the other shared components.

## Implementation Decisions

- **Name and location:** the component is called overflow menu, after the design file, and lives in the shared UI components. It has two nested subcomponent folders, `OverflowMenu` and `OverflowMenuItem`, each with its own component, story, test and index files. Following the layout README's Sidebar pattern, one entry point for the group re-exports both components and their props types. Named exports, with the shared `FunctionComponent` return type.
- **Dependency:** Headless UI (`@headlessui/react`) is already installed but only as a devDependency. It moves to runtime dependencies. OverflowMenu wraps Headless UI's `Menu`, `MenuButton` and `MenuItems`, and OverflowMenuItem wraps `MenuItem`. Headless UI provides the ARIA roles, keyboard navigation, typeahead, focus return, outside-click and Escape dismissal, and anchoring. We don't reimplement any of it.
- **Semantics:** this is an action menu, not a select. Choosing an item runs its action. The header label is fixed and never reflects a choice. It isn't a form control and doesn't integrate with React Hook Form.
- **OverflowMenu props:**
  - `label: ReactNode`, required. It's the header text and the trigger's accessible name.
  - `children`: the OverflowMenuItem rows.
  - `disabled?: boolean`: the menu can't be opened and gets the disabled look.
  - `className?: string`: goes on the root element.
- **OverflowMenuItem props:**
  - `children`: plain text, the item's label.
  - `onClick?`: runs when the item is chosen, by pointer or keyboard.
  - `disabled?: boolean`: the item can't be chosen, and the keyboard skips it.
- **Header structure:** the header is the trigger button. It holds the label, left-aligned and filling the remaining width, followed by the existing ⋮ (`MoreVerticalIcon`) at the trailing edge. The icon is decorative and hidden from assistive technology. The header is the full width of its container.
- **Panel positioning:** the item list floats over page content, normally anchored to the bottom of the header with no gap and matched to the header's width through Headless UI's anchor width. Opening it never causes layout shift. As clarified during implementation, retain Headless UI's viewport collision handling: the panel may flip above or shift horizontally near viewport edges, taking priority over below-only placement and edge alignment.
- **Card join:** in the normal bottom placement, header and list read as one card. They share a single Neutral 400 border, only the outer corners are rounded (the header's top corners and the list's bottom corners, 8px, `rounded-lg`), and rows are separated from the header and from each other by Neutral 400 dividers. The open card has a soft shadow. When closed, the header alone is fully rounded on all corners. When flipped above, header and panel become two fully bordered, rounded cards; placement styling follows Headless UI's resolved `data-anchor` attribute.
- **Dimensions and type:**

| Part | Height | Padding | Text | Icon |
|---|---|---|---|---|
| Header | 48px (`h-12`) | 16px horizontal (`px-4`) | `text-base`, semibold, Neutral 900 | ⋮ 24px, doesn't shrink |
| Item | 44px (`h-11`) | 16px horizontal (`px-4`) | `text-sm`, regular, Neutral 900 | — |

- **Colour mapping:** only existing Horaion tokens are used.

| Element / state | Background | Border | Text / icon |
|---|---|---|---|
| Header, closed | White | Neutral 400 | Neutral 900 |
| Header, closed, hovered | Neutral 100 | Neutral 400 | Neutral 900 |
| Header, open | Ink Blue 50 | Neutral 400 | Neutral 900 |
| Header, disabled | Neutral 200 | Neutral 400 | Neutral 500 |
| Item, idle | White | Neutral 400 dividers | Neutral 900 |
| Item, highlighted (hover or keyboard) | Neutral 100 | Neutral 400 dividers | Neutral 900 |
| Item, disabled | White | Neutral 400 dividers | Neutral 500 |

- **Focus:** the header shows an Ink Blue 500 focus outline, 2px wide with a 2px offset, matching Button, on keyboard focus. Items show focus with the Neutral 100 highlight fill that Headless UI's active or focus state drives, not with an outline.
- **State styling:** open, highlighted and disabled looks are driven by the state Headless UI exposes (its `data-open`, `data-focus` and `data-disabled` attributes), not by extra React state.
- **Behaviour:** these are Headless UI defaults and are kept:
  - Choosing an item closes the menu.
  - Escape and outside-click close it.
  - Focus goes back to the header after choosing an item, Escape, or clicking non-focusable outside content. Clicking a focusable outside control leaves focus on that control, preserving Headless UI's default behavior as clarified during implementation.
  - Disabled items are skipped by arrow-key navigation.
  - A disabled menu can't be opened and isn't in the tab order.
- **Cursor:** disabled parts show the not-allowed cursor, matching Button and Input.
- **Glossary:** "overflow menu" is a component name, not product or visual-language vocabulary, so the domain glossary isn't changed. The spec uses the existing colour-range terms (Ink Blue, Neutral) and their shade numbers.

## Testing Decisions

- **One seam:** the public `OverflowMenu` + `OverflowMenuItem` pair, rendered together with Testing Library and user-event in Vitest. Tests check only what a consumer can observe: roles, accessible names, ARIA state (`aria-expanded`, `aria-disabled`), which element has focus, whether callbacks were called, and the state classes or attributes on the rendered elements. They don't test Headless UI internals, class-string assembly or private helpers.
- **Test files:** OverflowMenuItem keeps its own test file, following the file-set convention, but always renders inside an OverflowMenu, because an item can't exist outside a menu.
- **Prior art:**
  - Sidebar's test, which drives a composed parent and child pair through user-event and asserts on roles and focus.
  - Input's and Button's tests, for asserting disabled behaviour, `className` placement and state classes.
- **What to cover:**
  - The header renders as a button named by its label, with `aria-expanded="false"`, and the ⋮ icon is hidden from assistive technology.
  - Clicking the header opens a `menu` with one `menuitem` per child, and sets `aria-expanded="true"`.
  - Enter, Space and the Down arrow key open the menu from the keyboard. Arrow keys move the highlight between items and skip disabled ones.
  - Choosing an item by click or by Enter calls its `onClick` once and closes the menu.
  - A disabled item is exposed as disabled and does not call `onClick` when clicked.
  - Escape closes the menu and returns focus to the header. Clicking outside closes it.
  - A disabled menu can't be opened by click or keyboard, gets the disabled look, and is out of the tab order.
  - The header gets the Ink Blue 50 look only while open.
  - A custom `className` lands on the root.
- **jsdom limits:** floating position, anchor width and shadow can't be laid out in jsdom. Tests assert the configuration a consumer can see (open or closed, roles), and manual review of the Storybook stories covers layout.
- **Stories:** stories cover closed, open, a disabled item, and a disabled menu, with controls for `label` and `disabled`. They're for manual visual review against the design frame, not automated assertions.
- **Checks:** `pnpm lint` (zero warnings) and `pnpm test:unit` must pass. `pnpm build` must pass after the dependency move.
- **No Playwright tests** for this component.

## Out of Scope

- An icon-only trigger, a bare ⋮ with no label, for example in table rows. That's a separate visual that needs its own design.
- Selection or listbox behaviour, or React Hook Form integration.
- A destructive (Error-coloured) item tone.
- Leading icons, secondary text, links, dividers, section headings or nested submenus inside items.
- Controlled open state (`open` / `onOpenChange` props).
- Size variants.
- Changes to the domain glossary.
- Playwright or visual-regression tests.
- Adopting the menu anywhere in the app. This spec only delivers the component.

## Further Notes

- The only design frame is a PNG export of the open state (`design/overflow-menu-open.png`). The closed, hover, disabled and focus looks were derived from existing Horaion tokens and the conventions of Button and Input, then confirmed with the user during grilling. The shadow isn't in the frame; it was added because a floating overlay needs a depth cue. If exact Figma values later disagree, update the dimension and colour tables; the component interface doesn't need to change.
- The Ink Blue 50 open-header fill was read from the PNG by eye and matches the `ink-blue-50` token (#e4f2fd).
- Item highlight uses Neutral 100 rather than Ink Blue 50, on purpose, so a highlighted item stays visually distinct from the open header.

## Comments

### Implementation complete — 2026-09-26

- Tickets 01, 02 and 03 are resolved and integrated in the working tree. The public entry point is `@/components/ui/OverflowMenu`, exporting both components and their props types. Each nested component has its component/story/test/index file set. Headless UI is now a runtime dependency, with the lockfile updated by `pnpm install`.
- Execution followed the dependency graph: ticket 01 first, then tickets 02 and 03 concurrently in isolated detached worktrees seeded with ticket 01's uncommitted baseline. Owned files were integrated without staging, commits, merges, or pushes, honoring the user's repository-safety instructions over the snapshot's commit plan.
- Standards and spec reviews were performed on ticket 01 and the newly integrated disabled behavior. Review findings for disabling a highlighted item and disabling an open menu were fixed and regression-tested. Availability changes reset the Headless UI subtree; this also resets descendant DOM identity/state and focus on removed elements. Follow-up review found no remaining issue in those fixes or the placement observer lifecycle.
- The user explicitly selected **Keep library defaults** when review exposed conflicting unconditional placement/focus wording. The implementation decisions above record that clarification. Viewport flipping uses complete borders/corners on both cards; outside focusable controls keep focus. Native horizontal collision shifting can still break exact header/panel edge alignment.
- Final combined checks passed: `pnpm lint` (zero warnings), `pnpm test:unit --run` (**398 tests across 11 files**, including 19 overflow-menu tests), `pnpm build`, and `git diff --check`. Isolated-worktree pnpm dependency verification initially rejected symlinked `node_modules`; equivalent scripts or the invocation-only `--config.verify-deps-before-run=false` option were used there. Final main-worktree commands needed no workaround.
- Chromium launched successfully and Storybook browser inspection passed with no page errors. Measured header height 48px, row height 44px, equal 320px header/panel widths, zero normal anchor gap, unchanged trigger geometry, shared divider, 8px outer corners, and expected open/disabled token colours. A viewport-bottom probe confirmed top flipping, complete top border, rounded header/panel corners and placement cleanup on close. Temporary inspection script/screenshots are under `/tmp/opencode/`; no Playwright or visual-regression test files were added.
- Prerequisites: installed dependencies support all required checks. This component-only scope has no database, backend authorization, migration, or transactional concurrency requirements. Independent ticket edits were isolated; no new credentials or server interfaces were introduced.
- Skill evidence: all seven referenced workflow skill directories, including the `implement-spec` alternative, exist in `~/.claude/skills/`. OpenCode loaded `implement`, `tdd`, and `code-review`. A separate Claude Code runtime probe with the Skill tool enabled discovered `tdd`, `code-review`, `resolving-merge-conflicts`, `pr`, and `domain-modeling`, but **not** `implement` or `implement-spec`, despite their filesystem presence. `codex` is absent from PATH; `~/.codex` has no skills directory and `~/.agents/skills` is absent. Codex installation/discovery therefore could not be confirmed; OpenCode's discovery is not evidence of Codex availability. The implementation workflow was executed in OpenCode. No conflict-resolution, PR, or domain-modeling workflow was needed.
- Visual limitation: the open state was inspected against the supplied PNG, but no Figma comparison, pixel-diff testing, or designer sign-off was performed. Stock Tailwind `shadow-md` remains a designer-review choice. These are non-blocking follow-ups.
- Unrelated tooling follow-ups: Vite recommends switching away from the SWC plugin; Storybook reports its existing missing-MDX pattern and Node module API deprecation. These advisories did not fail checks and were not expanded into this feature's scope.

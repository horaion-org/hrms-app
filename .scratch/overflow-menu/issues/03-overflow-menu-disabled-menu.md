# 03: Disabled overflow menu

**What to build:** A developer can set `disabled` on `OverflowMenu` to show that its actions are temporarily unavailable. The user sees the header with a Neutral 200 background and Neutral 500 label and ⋮, matching a disabled Input, with the not-allowed cursor. It can't be opened by pointer or keyboard, and it's skipped when tabbing. Parent spec: `.scratch/overflow-menu/spec.md` (see "OverflowMenu props" and the colour table).

**Blocked by:** 01 (Overflow menu that opens and runs an action)

**Status:** resolved

- [x] `OverflowMenu` accepts `disabled?: boolean`.
- [x] A disabled header has a Neutral 200 background, Neutral 400 border, Neutral 500 text and ⋮, the not-allowed cursor, and no hover fill.
- [x] Clicking the disabled header, or pressing Enter, Space or the Down arrow key on it, doesn't open the menu. `aria-expanded` stays false.
- [x] A disabled menu isn't in the tab order.
- [x] Story: a disabled menu, plus a `disabled` control.
- [x] Tests go through the public pair. `pnpm lint` (zero warnings) and `pnpm test:unit` pass.

## Comments

### Final integration evidence — 2026-09-26

- Integrated with tickets 01/02 and reviewed. Final main-worktree commands passed without workarounds: `pnpm lint`, `pnpm test:unit --run` (398 tests, 11 files), `pnpm build`, and `git diff --check`.
- Chromium/Storybook inspection confirmed the disabled trigger is a disabled native button with Neutral 200 fill and Neutral 500 text. Open-to-disabled reset and re-enabling passed regression tests and follow-up review. Shared prerequisites and skill-discovery limitations are recorded in the spec completion comment.

- Review follow-up: changing `disabled` to true while open previously only disabled the trigger, leaving Headless UI's open state and actions intact. Added a public-pair rerender regression (open → disabled → re-enabled), observed it fail on the still-present panel, then keyed `Menu` by normalized disabled availability. The test now verifies absent panel/items, collapsed disabled trigger, preserved root classes, and successful reopening after re-enabling.
- Follow-up verification: targeted pair suite passed (2 files, 12 tests); full unit suite passed (11 files, 391 tests); lint passed with zero warnings; production build passed. All pnpm checks use the same invocation-only flag documented below.
- Tradeoff: changing availability remounts the Menu subtree, including its root DOM node, trigger IDs, and descendant state. Root structure and `className` placement remain the same. Focus on a removed node is not preserved or explicitly restored to the disabled trigger. Re-enabling starts closed. This keeps Headless UI responsible for menu behavior without local open state, effects, or custom dismissal/keyboard logic.

- Implemented in isolated worktree `/tmp/opencode/overflow-03`, on the supplied ticket 01 baseline. `disabled` delegates native button semantics and keyboard guards to Headless UI; disabled colours and cursor use its `data-disabled` state. Added the Disabled story and boolean control.
- Red → green evidence: the composed-pair behavior test initially failed because clicking the disabled trigger opened the menu, then passed after forwarding `disabled`. It covers Enter, Space, ArrowDown, unchanged `aria-expanded`, and forward/reverse tab skipping. A second test failed on absent disabled appearance classes, then passed with the state-driven styles; it checks the border, icon's inherited colour, and absence of hover/open state.
- Verification: lint passed with zero warnings; full unit suite passed (11 files, 390 tests); production build passed; targeted composed-pair suite passed (2 files, 11 tests). Appearance is verified via rendered state/classes in jsdom; Storybook visual review remains with the coordinator.
- Environment: bare pnpm attempted automatic dependency installation and rejected the supplied `node_modules` symlink. Checks ran successfully with invocation-only `--config.verify-deps-before-run=false`; no dependency or shared setup changes were required.

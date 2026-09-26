# 02: Disabled overflow menu items

**What to build:** A developer can mark an individual `OverflowMenuItem` as `disabled`, so an action the user isn't allowed to take right now stays visible but can't be chosen. The user sees it in Neutral 500 text with the not-allowed cursor. Clicking it does nothing, arrow-key navigation skips it, and screen readers announce it as unavailable. Parent spec: `.scratch/overflow-menu/spec.md` (see "OverflowMenuItem props" and the colour table).

**Blocked by:** 01 (Overflow menu that opens and runs an action)

**Status:** resolved

- [x] `OverflowMenuItem` accepts `disabled?: boolean`.
- [x] A disabled item is exposed as disabled to assistive technology.
- [x] A disabled item has Neutral 500 text, a white background (no Neutral 100 highlight) and the not-allowed cursor.
- [x] Clicking a disabled item doesn't call its `onClick` and doesn't close the menu.
- [x] Arrow-key navigation skips disabled items.
- [x] Story: a menu with one disabled item among enabled ones.
- [x] Tests go through the public pair. `pnpm lint` (zero warnings) and `pnpm test:unit --run` pass with the command-local `--config.verify-deps-before-run=false` flag.

## Comments

### Final integration evidence — 2026-09-26

- Integrated with tickets 01/03 and reviewed. Final main-worktree commands passed without workarounds: `pnpm lint`, `pnpm test:unit --run` (398 tests, 11 files), `pnpm build`, and `git diff --check`.
- Chromium/Storybook inspection confirmed the disabled item is white with Neutral 500 text and disabled ARIA semantics. The highlighted-to-disabled regression and enabled-only highlight styling passed follow-up review. Shared prerequisites and skill-discovery limitations are recorded in the spec completion comment.

### Implementation and verification — 2026-09-26

- Implemented in isolated worktree `/tmp/opencode/overflow-02`, on the supplied ticket 01 baseline. Item forwards `disabled` to Headless UI and styles its exposed disabled state with Neutral 500 text and the not-allowed cursor. Headless UI prevents disabled highlighting and activation.
- Added a `Disabled` item story using the existing `OverflowMenu` composition, with enabled items on either side and a boolean disabled control.
- Public-pair tests cover disabled ARIA semantics, inert pointer activation with the menu remaining open, no hover highlight, disabled appearance, skipping in both arrow directions, and Enter/Space activation of the enabled action.
- Red/green evidence: the pointer test initially failed because the disabled callback ran; it passed after forwarding `disabled`. The appearance test failed before adding disabled classes. Both keyboard cases failed with forwarding temporarily removed and passed after restoration.
- Verification: `npm run lint` passed with zero warnings; `npm run test:unit -- --run` passed all 392 tests across 11 files; `npm run build` passed TypeScript and Vite. Targeted public-pair tests passed all 13 tests across both files. Prettier check passed for the three changed item files; `git diff --check` passed.
- Environment caveat: attempted `pnpm lint`, `pnpm test:unit --run`, and `pnpm build`; each failed before running its script because this pnpm installation tries to install dependencies and rejects the supplied `node_modules` symlink (`workspace hoist directory is not a real directory`). The npm commands above execute the same existing package scripts. Dependency and shared setup files were not edited.
- Storybook visual review remains with the coordinator; jsdom assertions cover observable state attributes and styling classes, not browser layout.

### Review follow-up — highlighted-to-disabled transition — 2026-09-26

- Corrected the earlier assumption that disabled items always lose their highlight state: Headless UI can retain `data-focus` when a highlighted item becomes disabled. Restricted Neutral 100 styling to `data-focus:not-data-disabled:bg-neutral-100`, leaving the white background effective while disabled even with retained focus state.
- Added a public composed-pair rerender regression: highlight the enabled action with the keyboard, rerender it disabled, verify retained `data-focus` alongside disabled semantics and white-configured styling, then verify clicking keeps the menu open without calling the handler and Enter also cannot invoke it.
- Red/green: the new test failed against the old unrestricted highlight class; after the styling correction all 8 item tests passed.
- Required checks now pass through pnpm using the command-local `--config.verify-deps-before-run=false` flag, with no configuration changes: lint (zero warnings), unit suite (393 tests across 11 files), and TypeScript/Vite production build. Prettier check also passed for the two changed source files. This resolves the earlier pnpm execution blocker.

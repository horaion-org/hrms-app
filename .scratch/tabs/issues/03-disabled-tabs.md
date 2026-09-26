# 03: Disabled tabs

**What to build:** A developer can mark a Tab as disabled. An HR user sees it greyed out, clicking it does nothing, keyboard navigation skips it, and it's never chosen as the starting tab. A screen reader announces it as unavailable. Parent spec: `.scratch/tabs/spec.md` (Tab, Tab looks, Initial selection).

**Blocked by:** 02 (Tabs on Headless UI: click and keyboard switching)

**Status:** completed

- [x] Tab takes `disabled` and passes it to Headless UI, and a disabled tab is exposed as disabled to assistive technology
- [x] A disabled tab has a Neutral 400 label and a not-allowed cursor, and hovering doesn't change it
- [x] Clicking a disabled tab doesn't change the selection
- [x] Left, Right, Home and End skip disabled tabs, including when wrapping
- [x] Without `defaultIndex`, and with the first tab disabled, the first tab that isn't disabled is selected. If Headless UI doesn't do this itself, the wrapper corrects it
- [x] A story shows a row with a disabled tab
- [x] The compiled-stylesheet test covers the new colour classes
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass

## Comments

- Baseline seeded from main's unstaged, integrated tickets 01+02 using read/apply_patch: complete `src/components/ui/Tabs/` and `src/components/ui/CountBadge/` trees, `src/styles/tailwind.test.ts`, `package.json`, and `pnpm-lock.yaml`. All five comparisons via `git diff --no-index` were identical before ticket 03 edits. These are base changes, not ticket 03's delta. Dependencies installed with `pnpm install --frozen-lockfile`.
- Ticket 03 delta is limited to `Tab/Tab.tsx`, `Tab/Tab.test.tsx`, `Tab/Tab.stories.tsx`, the existing compiled-stylesheet test, and this ticket. Tests use the approved composed Tabs seam and real Headless UI.
- Headless UI 2.2.10 discoveries: `TabProps` already inherits native `disabled`; the library renders a native disabled button and `data-disabled`, suppresses hover, and blocks clicks. Its `SetSelectedIndex` reducer filters disabled tabs and chooses the first enabled tab from the requested index. No wrapper correction is needed for first-enabled initial selection. Keyboard navigation uses `focusIn`, advancing past failed native focus attempts, including wrapping and Home/End. Source inspected in `@headlessui/react/dist/headlessui.dev.cjs` (`SetSelectedIndex`, `TabFn`, and `focusIn`).
- jsdom 30.1.0 incorrectly lets `button[disabled][tabindex=-1].focus()` take focus. A minimal native-button probe reproduced this in jsdom; the identical probe in headless Chromium kept focus on the enabled button. The keyboard contract test locally corrects only this native button-focus boundary and restores the spy afterward. The real library still performs all navigation and selection.
- TDD: compiled stylesheet test failed against ticket 02's unguarded selected/hover classes, then passed after adding Neutral 400, not-allowed cursor, and disabled exclusions for selected/hover styling. Native-disabled/click and initial-selection behavior already passed via Headless UI; keyboard assertions passed with the documented browser-boundary correction.
- Verification in `/tmp/opencode/tab-03`: `pnpm lint` passed with zero warnings, `pnpm test:unit --run` passed 404 tests across 15 files, `pnpm build` passed, and `git diff --check` passed. Self-review against component conventions and ticket 03/spec found no outstanding issues.
- Integrated only the four code/test/story deltas into main using `apply_patch`, plus this canonical ticket update. Main verification: `pnpm exec vitest run src/components/ui/Tabs src/styles/tailwind.test.ts` passed 107 tests across 6 files; `pnpm lint` and `git diff --check` passed. Integrated Tab tree and stylesheet test matched the isolated versions via `git diff --no-index`. No staging or commits. Ticket 05 can now build on main's integrated 01+02+03; preserve the disabled guards when adding Count badge state styling.

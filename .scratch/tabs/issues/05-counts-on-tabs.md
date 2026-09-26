# 05: Counts on tabs

**What to build:** A Tab can show a Count badge beside its label, for example pending leave requests, so an HR user can see where work is waiting. The badge's tone follows the tab's state: active, inactive or disabled. A screen reader reads the count as part of the tab's name. Parent spec: `.scratch/tabs/spec.md` (Tab, Count badge module).

**Blocked by:** 01 (Count badge), 03 (Disabled tabs)

**Status:** completed

- [x] Tab takes `count?: number` and renders it through Count badge next to the label, with a small gap
- [x] The badge tone is active on the selected tab, disabled on a disabled tab and inactive otherwise, using Headless UI's selected and disabled state
- [x] A tab's accessible name includes the count (for example "Pending 3"), and a count of 0 adds nothing
- [x] Label and badge never wrap
- [x] A story shows tabs with counts, including `99+` and a disabled tab with a count
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass

## Comments

- Implemented in `/tmp/opencode/tab-05`, seeded via read/apply_patch from stable `/tmp/opencode/tab-03`. CountBadge/Tabs trees, package/lock, and stylesheet test matched the seed before implementation. CountBadge standalone remains unchanged.
- TDD through composed Tabs caught missing counts, then missing label/count whitespace. Boundary coverage includes undefined, 0, 1, 99 and 100; switching views preserves visible-count tab/panel accessible names. The compiled-stylesheet test failed before state styles existed, then passed with all colours, higher-specificity selectors, disabled exclusion, no-wrap and gap declarations. No new mocks or components.
- Named `group/tab` Headless UI data-state variants on CountBadge override its inactive base tone by specificity, not class order. Active requires selected and not disabled. Disabled colours apply even with selected/hover attributes. No render-prop appearance branching.
- Isolated verification passed lint, 411 unit tests across 15 files, build, and diff check. Chromium Storybook verification passed computed active/inactive/disabled colours, click/keyboard transitions, hover, disabled+selected+hover precedence, zero/undefined omission, no-wrap/8px gap, and all standalone CountBadge tones. Probe: `/tmp/opencode/verify-tab-05.mjs`.
- Integrated only ticket 05's delta into main using `apply_patch`: `src/components/ui/Tabs/Tab/Tab.tsx`, `Tab/Tab.test.tsx`, `Tabs/Tabs.stories.tsx`, `src/styles/tailwind.test.ts`, and this ticket. Preserved ticket 06's Tab `shrink-0`, TabList overflow implementation, controlled root API, controlled/overflow stories, and all existing stylesheet tests.
- Final combined verification in `/home/vernon/projects/horaion/worktree/tab`: `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed 421 tests across 15 files; `pnpm build` and `git diff --check` passed. Browser verification was not repeated during integration, as requested. All changes remain unstaged; no commits or push.

- 2026-09-26 (review): Tab now gives Count badge its real `tone` (active, inactive or disabled) from Headless UI's `selected` and `disabled` render-prop state. This replaces the group-state class overrides, so badge colours are defined only in Count badge. A test pins that each tab's badge matches a standalone Count badge of the right tone before and after the selection changes.

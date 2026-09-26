# 02: Select: multi mode with count summary

**What to build:** A developer can pass `multiple` to Select and let a user tick several options in one go. Each row shows a checkbox (the mock's state), the panel stays open while ticking, and the trigger summarises the choice as the label for one option or "N selected" for several. `value` and `onChange` are typed as a string array in this mode, so a mode mismatch is a compile error. Parent spec: `.scratch/select/spec.md`.

**Blocked by:** 01 (Select: single mode, end to end)

**Status:** resolved

- [x] Select's props are a discriminated union on `multiple`. Without it, `value`, `defaultValue` and `onChange` use `string`. With `multiple`, they use `string[]`. Passing a mismatched type fails type-checking.
- [x] In multi mode, ticking and unticking calls `onChange` with the selected values in the same order as `options`, whatever order they were ticked in.
- [x] In multi mode, the panel stays open after each tick. Escape or a click outside closes it. Single mode still closes on pick.
- [x] Selected rows show a filled checkbox in Ink Blue 900 and unselected rows an empty checkbox in Neutral 400 (existing checkbox icons). Every selected row is `aria-selected`.
- [x] The trigger shows `placeholder` for none, the option's label for one, and a translated plural "{{count}} selected" for two or more.
- [x] The English and Spanish translations gain the selected-count plural under a `select` group, using i18next `_one`/`_other` keys.
- [x] `formatSummary(selectedOptions)` replaces the "N selected" text when given.
- [x] Storybook has multi-mode stories matching the mock (two of three ticked), plus none ticked and many ticked, and a `multiple` control.
- [x] Unit tests cover array `onChange` in option order, the panel staying open, checkbox state and `aria-selected`, trigger text for 0, 1 and 2+ selections, and the `formatSummary` override.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

- Implemented in `/tmp/opencode/select-02` on `agent/select-02`, extending the seeded ticket01 snapshot. Ticket02 changes are limited to Select.tsx, Select.test.tsx, Select.stories.tsx, the English/Spanish translations, and this issue.
- TDD at the agreed rendered Select interface: observed failing tests before implementing array callbacks, checkbox indicators, translated summaries, and the custom summary. Added controlled-value, keyboard/dismissal, and public prop-type regression coverage. Type assertions reject mismatched values, defaults, and callbacks in both modes.
- `pnpm exec vitest run src/components/forms/Select/Select.test.tsx`: passed, 22 tests (including all 15 ticket01 tests).
- `pnpm exec tsc --noEmit`: passed, including the public prop-type assertions and stories.
- `pnpm lint`: passed with zero warnings after fixing prop ordering and the Storybook render return type.
- `pnpm test:unit --run`: passed, 10 files / 401 tests. Vite prints its existing recommendation to switch from the SWC plugin; this is informational and did not fail checks.
- Stories include two of three selected, no selections, one selection, all three selected, and a custom summary. The multiple control adapts scalar/array story values and remounts when changing modes. Storybook loads the existing application i18n setup. Storybook browser/geometry review was not performed; it remains with the coordinator.
- Manual standards/spec review found no outstanding ticket02 issues. Preserved the Listbox `as="div" className="contents"` workaround and single-mode interaction. Status/disabled and empty-list work remain in their respective tickets. No new components or Playwright tests were added. All changes remain unstaged and uncommitted.

### Final browser verification — 2026-09-26

- Reviewed `Multiple`, `MultiplePlaceholder`, `MultipleOneSelected`, `ManySelected` and `CustomSummary`. Filled Ink Blue 900 / empty Neutral 400 checkbox icons and `aria-selected` states match; toggles keep the panel open through 2→3→2→1→0 summaries. Escape returns focus and outside click dismisses. Custom summary shows “2 departments”. Browser evidence is recorded in `.scratch/select/verification.md`; ticket02 browser review is complete.

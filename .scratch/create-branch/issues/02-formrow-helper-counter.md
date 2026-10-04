# 02: FormRow and Input: stacked layout, helper text and character counter

**What to build:** Extend `FormRow` so a field can stack its label above the control, as the mock does. Underneath, one line shows helper text on the left and a character or selection counter on the right. An error replaces the helper but keeps the counter, as in mock states 3 and 4. Parent spec: `.scratch/create-branch/spec.md` (D2).

**Blocked by:** none

**Status:** ready-for-human

- [x] `FormRow` gains `layout?: "inline" | "stacked"` (default `"inline"`, so every existing call site is unchanged), `hint?: ReactNode` and `counter?: ReactNode`.
- [x] A required marker is supported as `required?: boolean` (the red asterisk), hidden from assistive technology in favour of the control's `required` / `aria-required`.
- [x] The helper and the error are linked to the control through `aria-describedby`. The error keeps `role="alert"` and shows the error icon from the mock.
- [x] The counter shows "{{count}}/{{max}}" and is `aria-hidden`. The limit is conveyed by the helper text and `maxLength`.
- [x] `Input` needs no visual change. Confirm that `maxLength` passes through, and add a story that shows Input inside a stacked FormRow with a counter.
- [x] Stories: stacked with helper and counter, stacked with error and counter, inline unchanged.
- [x] Unit tests cover the described-by wiring, error-replaces-helper, the counter, and an unchanged inline default.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### Implementation and targeted verification — 2026-10-04

- Extended the existing component rather than introducing a new primitive. Inline remains the default, including its responsive row and fixed desktop field width; no supporting-text container is rendered when all supporting props are absent. Stacked uses a full-width field and the mock's 14px label / 12px supporting text. Required marker and visual counter are hidden from assistive technology.
- `formRowIds(htmlFor)` now adds `hintId` without changing `labelId` or `errorId`. Existing explicit wiring is preserved: the caller supplies `aria-describedby={error ? errorId : hintId}` when a hint exists, or `undefined` when neither exists, plus native `required` / `aria-required` and control error status. FormRow does not clone arbitrary children. Error replaces the hint, retains the counter and `role="alert"`, and reuses the existing decorative circular WarningIcon.
- Read the snapshots and live consumer: GeneralSettingsForm already supplies its own error id. No call-site or Input implementation changes were necessary. Existing Input native-attribute coverage types beyond `maxLength={5}` and verifies truncation, plus `aria-describedby` pass-through. New Input story demonstrates a live 100-character counter; FormRow stories cover stacked helper/counter, stacked error/counter and the unchanged inline mode. Counter wording is caller-owned for translation; no translation files changed.
- Public-component-seam TDD: observed individual red → green cycles for helper/counter description, error replacing and restoring helper, required stacked layout, preserving the empty inline footer, decorative error icon, and stacked label typography. Tests use rendered controls and accessibility assertions; existing layout-class assertions were retained/extended for compatibility.
- `pnpm exec vitest run src/components/forms/FormRow/FormRow.test.tsx src/components/forms/Input/Input.test.tsx src/features/settings/GeneralSettingsForm/GeneralSettingsForm.test.tsx`: **50 tests passed** across 3 files (7 FormRow, 37 Input, 6 existing settings consumer). Existing Select i18next initialization warning remains; no test failures.
- `pnpm exec eslint --max-warnings 0 src/components/forms/FormRow src/components/forms/Input`: **passed** after formatting. Owned-source Prettier and scoped `git diff --check`: **passed**.
- `pnpm exec tsc --noEmit`: **not globally green** at time of this worker's run; only concurrent Button story union-prop errors (lines 127–128) and the Button render in `src/styles/tailwind.test.ts` (line 236) were reported. No errors in owned files. Coordinator notified; full lint/unit/build and snapshots remain coordinator-owned, so the combined-check checkbox stays open.
- Standards/spec self-review: ownership respected, no dependencies, translations, type escapes, new components, branch operations, commits, subagents or snapshot edits. Both helper/error accessible descriptions, counter exclusion, native required state and unchanged settings consumer pass. Design HTML was inspected; the local image tool failed with a filesystem-injection error, so no screenshot comparison is claimed. Coordinator reports Storybook stacked positioning and helper described-by checks passed; final visual review remains pending.


### Parent final integration verification

- All app checks pass: ESLint zero warnings, Vitest **73 files / 1186 tests** (bounded `--maxWorkers=2`), production TypeScript/Vite build, Storybook production build, and **48 Playwright tests** across Chromium, Firefox and WebKit (two workers). No timeout/configuration relaxation. See `../verification.md` for limits and API evidence.

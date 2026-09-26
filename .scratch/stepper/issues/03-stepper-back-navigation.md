# 03: Go back to a completed step

**What to build:** A developer can pass an optional `onStepClick(index)` to `Stepper`. When it's present, completed steps become buttons that call it with their index on click, Enter or Space. Current and upcoming steps are never interactive, and without `onStepClick` no step is. Clickable completed steps respond like a text link. Parent spec: `.scratch/stepper/spec.md` (stories 9, 10, 20-22, 24-26).

**Blocked by:** 01

**Status:** resolved

**Claimed by:** OpenCode — ticket 03 in `/tmp/opencode/stepper-03`.

- [x] With `onStepClick`, each completed step is a button whose accessible name includes its label and "completed". Clicking it, or pressing Enter or Space on it, calls `onStepClick` with its index.
- [x] Current and upcoming steps are never buttons and never call `onStepClick`.
- [x] Without `onStepClick`, no step is a button and none is focusable.
- [x] Tab order visits only the clickable completed steps, in order.
- [x] Hover turns the label and circle Ink Blue 500, press turns them Ink Blue 300, and the cursor is a pointer. Keyboard focus shows an Ink Blue 500 outline, 2px wide with a 2px offset, like Button.
- [x] `aria-current="step"` stays on the current step.
- [x] Story: clickable completed steps, with the click action logged.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

Implemented and self-reviewed in `/tmp/opencode/stepper-03`.

- Added optional `onStepClick(index)` to Stepper props and StepContext; interactivity consumes the existing `status`.
- Completed steps with a callback render native `type="button"` controls. All other steps use inert spans. The connector stays outside the control.
- Preserved name wording (`Step N: Label, completed`), with the name on the button for clickable steps and on the list item otherwise. Visible label/circle remain aria-hidden to avoid duplicate spoken contents; current state remains on the current list item.
- Added group hover/active styles to circle border/text and label, pointer cursor, and Button's focus-visible outline convention. Reviewed tokens in source; no browser visual verification was performed.
- Added `ClickableCompletedSteps` using `fn()` from `storybook/test`, matching existing action-logging stories.
- Three public-seam user-event tests cover click index, Enter/Space, tab order, inert current/upcoming steps, all-completed buttons, and callback removal.

### Check evidence

- Red: click test failed with missing button named `Step 2: Shifts, completed` before implementation. The `test:unit` script includes `src/`, so this initial invocation also ran the rest of the suite (1 failed, 454 passed).
- Targeted green: `pnpm --config.verify-deps-before-run=false exec vitest run src/components/ui/Stepper` — 2 files, 7 tests passed after successive slices.
- Final `pnpm --config.verify-deps-before-run=false lint` — passed, zero warnings.
- Final `pnpm --config.verify-deps-before-run=false test:unit --run` — 14 files, 457 tests passed.
- Final `pnpm --config.verify-deps-before-run=false build` — TypeScript and Vite passed.
- The pnpm override avoids automatic dependency installation into the worktree's seeded symlinked node_modules. No package configuration was changed.
- Self-review: named exports, FunctionComponent return types, public-entry-point test imports, existing nested file structure, status reuse, native semantics, and ticket scope checked. Lint's callback ordering and explicit-return-type findings were fixed before final checks.

### Integration notes

- Apply only changes to `Stepper.context.ts`, `Stepper/Stepper.tsx`, `Stepper/Stepper.test.tsx`, `Stepper/Stepper.stories.tsx`, `StepperStep/StepperStep.tsx`, and this ticket, relative to foundation 01.
- `StepperStep.tsx` wraps the existing circle and label with a dynamic native button/span. Merge ticket 02 completed-state visuals and ticket 04 narrow-label classes into the wrapped spans, retaining the group interaction classes and aria-hidden contents. Preserve connectors outside the button.
- Story additions should be merged alongside the other tickets' stories. The seeded untracked Stepper directory includes foundation files, so do not treat the entire directory as ticket 03's delta.
- No staging, commits, or pushes performed.

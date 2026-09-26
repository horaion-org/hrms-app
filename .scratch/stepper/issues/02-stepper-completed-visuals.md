# 02: Completed steps look finished

**What to build:** Steps before the current one render as completed: an Ink Blue 900 outlined circle with the existing tick icon instead of the number, and a Neutral 900 label. Connectors between completed steps and up to the current step turn Ink Blue, so a user can see how far they've come. Parent spec: `.scratch/stepper/spec.md` (stories 16, 18, 19).

**Blocked by:** 01

**Status:** resolved

Claimed for implementation in `/tmp/opencode/stepper-02`.

- [x] Completed circle: Ink Blue 900 outline with the tick icon (decorative, hidden from assistive technology) and no visible number.
- [x] Completed label is Neutral 900.
- [x] Connectors that lead into a completed or current step are Ink Blue 900. The rest stay Neutral 300.
- [x] With `currentStep` equal to the step count, every step shows the completed look and every connector is Ink Blue 900.
- [x] Completed steps keep "completed" in their accessible name (the rule from 01 isn't regressed).
- [x] Stories: a middle step current (showing completed steps before it) and all steps completed.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Answer

Implemented completed visuals in `src/components/ui/Stepper/StepperStep/StepperStep.tsx` using the existing `StepContext.status` and `TickIcon` from the Icon entry point. Completed steps use an Ink Blue 900 outline and tick instead of the displayed number, with a Neutral 900 label. Each step's outgoing connector uses Ink Blue 900 only when that step is completed; current and upcoming steps keep Neutral 300 outgoing connectors.

Added `AllStepsCompleted` to `src/components/ui/Stepper/Stepper/Stepper.stories.tsx`; the existing `MiddleStepCurrent` story covers mixed statuses.

Added a public-composition regression in `src/components/ui/Stepper/StepperStep/StepperStep.test.tsx`: completed numbers disappear, current/upcoming numbers stay visible, and finishing the sequence preserves exact numbered completed accessible names without exposing an image role. No CSS or internal-context assertions or mocks. The new test failed on the old displayed number before implementation, then passed. Foundation 01's four existing tests continue to cover unchanged status announcements, ordering and inert behavior.

## Verification and self-review

All commands ran in `/tmp/opencode/stepper-02` with `--config.verify-deps-before-run=false`. The default pnpm invocation attempted to install dependencies and rejected the seeded `node_modules` symlink; the command-local setting used the existing dependencies without changing dependency files.

- `pnpm --config.verify-deps-before-run=false exec vitest run src/components/ui/Stepper`: 2 files, 5 tests passed (after confirming the new test failed first).
- `pnpm --config.verify-deps-before-run=false lint`: passed, zero warnings.
- `pnpm --config.verify-deps-before-run=false test:unit --run`: 14 files, 455 tests passed.
- `pnpm --config.verify-deps-before-run=false build`: TypeScript and Vite production build passed.
- Prettier check of all three edited Stepper files: passed.
- Reviewed against CLAUDE.md, relevant READMEs, the spec and this ticket: existing components and tokens reused; named export, FunctionComponent return type and alias imports preserved; status consumed rather than rederived; outgoing-connector ownership preserved; accessibility regression coverage passes.
- Colour/icon rendering reviewed in source against the token definitions; no browser-based visual inspection performed. Stories are available for design review.

## Integration notes

Apply only this ticket file and the three Stepper file deltas listed above on top of integrated foundation 01. Foundation files were seeded as untracked here, so ordinary `git diff` does not show these Stepper deltas. The pre-existing `CONTEXT.md` modification is not part of ticket 02.

Tickets 03/04 may overlap `StepperStep.tsx` and the stories file: preserve the completed circle/label branches and the outgoing connector's `step.status === "completed"` condition when merging their navigation/layout changes. No status/context or public API changes were needed. Nothing staged, committed or pushed.

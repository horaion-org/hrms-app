# 01: Stepper that shows the current and upcoming steps

**What to build:** A developer can compose a `Stepper` with `currentStep` (a zero-based index) and `StepperStep` children, each with a `label`, and import both from one shared UI entry point. A user sees a horizontal row of numbered circles joined by connectors that fill the container width. The current step is a filled Ink Blue 900 circle with a white number and an Ink Blue label. Upcoming steps are Neutral 300 outlined circles with Neutral 500 numbers and labels. Parent spec: `.scratch/stepper/spec.md`. Design: `.scratch/stepper/design/stepper.png`.

This ticket owns the component's nested file set (`Stepper` and `StepperStep` folders plus a group entry point, following OverflowMenu). It also owns the single test seam: the composed pair driven through Testing Library. And it owns the whole status rule, so that later tickets only add visuals and behaviour on top of it.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `Stepper`, `StepperStep` and their props types are importable through the `@/` alias from one entry point. Named exports, `FunctionComponent` return type, each subcomponent with its own component, story, test and index files.
- [x] `StepperStep` has no status or number prop. Both come from its position among the Stepper's children.
- [x] The root is a navigation landmark wrapping an ordered list with one item per step, and the `className` goes on the root.
- [x] Step numbers follow child order, starting at 1.
- [x] Status rule: index < `currentStep` is completed, index === `currentStep` is current, index > `currentStep` is upcoming. A `currentStep` equal to the step count means every step is completed and none is current.
- [x] Exactly the current step carries `aria-current="step"`. Completed steps include "completed" in their accessible name. Until ticket 02 lands, they may temporarily render with upcoming visuals.
- [x] Circles and connectors are hidden from assistive technology, so each step's number and label are announced once.
- [x] Visuals: 48px circles, base-size labels, 1px Neutral 300 connectors that grow to fill the width.
- [x] Stories: first step current, a middle step current, with controls for `currentStep` and the labels.
- [x] Tests cover order and numbering, `aria-current`, completed naming and the all-completed case.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

Implemented ticket 01 only. Self-review against the ticket, CLAUDE.md, README conventions and design frame found no outstanding issues. Both nested component quads and the group entry point are present; `Stepper.context.ts` holds the internal per-step context.

Verification:
- Red: public entry point absent; green: ordered navigation and numbered names (1 test).
- Red: no `aria-current`; green: current state follows controlled index changes (2 tests).
- Red: no completed accessible names; green: preceding steps announced completed (3 tests).
- All-completed boundary passed immediately under the general status rule; final targeted run: 4 tests, 2 files passed.
- `pnpm lint`: passed, zero warnings.
- `pnpm test:unit --run`: 454 tests, 14 files passed.
- `pnpm build`: passed.
- Prettier check for the new Stepper files: passed.

Interface notes for tickets 02–04:
- Public exports: `Stepper`, `StepperProps`, `StepperStep`, `StepperStepProps` from `@/components/ui/Stepper`.
- `Stepper` accepts `currentStep`, optional root `className`, and composed step children. `StepperStep` accepts only `label: string`.
- `Stepper` derives status once and supplies internal `StepContext` with zero-based `index`, `isLast`, and `status` (`completed | current | upcoming`). Reuse this status rather than re-deriving it.
- Accessible names are `Step N: label`, with `, completed` appended for completed steps. The current list item owns `aria-current="step"`; visual text and connectors are hidden from assistive technology to avoid duplicate announcements.
- 02: completed steps currently use upcoming visuals; each non-last step owns its outgoing neutral connector.
- 03: add `onStepClick` and completed-step buttons in that ticket; no callback or interaction is implemented here.
- 04: add the root container query and label visibility rules; `isLast` plus completed status identifies the finished label fallback.
- No staging, commits, pushes, or subagents were used. The preexisting CONTEXT.md edit and other scratch files were preserved.

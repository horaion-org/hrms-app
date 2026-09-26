# 04: Stepper fits a narrow container

**What to build:** When the Stepper's container gets narrow, only the current step's label stays visible next to the circles and connectors, so the stepper stays on one line. This responds to the container (a Tailwind 4 container query on the Stepper root, with the threshold at `@2xl`, 42rem), not the viewport. Hidden labels stay in the accessible name. Parent spec: `.scratch/stepper/spec.md` (stories 12, 23, 30).

**Blocked by:** 01

**Status:** resolved

**Claimed by:** OpenCode, isolated worktree `/tmp/opencode/stepper-04` (2026-09-26).

**Follow-up claim:** OpenCode, main worktree `/home/vernon/projects/horaion/worktree/stepper` — P2 narrow overflow correction; browser verification owned by the main harness.

- [x] The Stepper root is a query container, and the narrow rule responds to its width, not the viewport.
- [x] Below the threshold, the labels of non-current steps are visually hidden but stay in each step's accessible name.
- [x] When every step is completed (no current step), only the last step's label stays visible in the narrow layout.
- [x] A unit test asserts that every label stays in the accessible tree. jsdom can't evaluate container queries, so don't test the hiding itself there.
- [x] Story: "Narrow container", rendering the stepper inside a narrow wrapper for visual review.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Implementation and evidence

- Root: named `@container/stepper`; non-current label spans use `hidden @2xl/stepper:inline` (42rem). A completed last step retains its label, using the existing `StepContext.status` and `isLast` directly.
- Existing list-item accessible names retain every label. Added three public-composition accessibility cases (first current, middle current, finished); these passed before and after the visual change. No artificial red test, class assertion, or jsdom layout assertion.
- Added `NarrowContainer` and `FinishedNarrowContainer` stories sharing a 32rem wrapper. Browser verification was completed after integration (see below); unit results alone do not establish layout correctness.
- Targeted: `pnpm with 10 exec vitest run src/components/ui/Stepper` — 2 files, 7 tests passed.
- Final full checks: `pnpm with 10 lint` — passed, zero warnings; `pnpm with 10 test:unit --run` — 14 files, 457 tests passed; `pnpm with 10 build` — TypeScript and Vite passed. Prettier check passed for all four changed Stepper files.
- The installed default pnpm attempts automatic dependency installation and rejects the seeded `node_modules` symlink. Checks used pnpm 10.34.5 via `pnpm with 10`, preserving that dependency setup.

## Self-review and integration

- Standards: reused the existing component/context, public alias imports and composed test seam; no new component or dependency. Label visibility is CSS-only and container-relative.
- Ticket: all six acceptance items implemented; story-based visual review is available. Completed-state styling and navigation belong to the other tickets.
- Integrate only the ticket-04 changes in `Stepper/Stepper.tsx`, `Stepper/Stepper.test.tsx`, `Stepper/Stepper.stories.tsx`, and `StepperStep/StepperStep.tsx` under `src/components/ui/Stepper/`, plus this issue file. The foundation is seeded untracked here: merge these edits into the integrated foundation rather than replacing concurrent agents' files wholesale.
- Preserve the named root query container and label visibility condition when combining with completed visuals/navigation. Preserve label-bearing accessible names when navigation adds buttons. No context/public API changes are needed for ticket 04.
- No staging, commits, or pushes performed.

## P2 follow-up: 320px/400px overflow

The integrated implementation retained four 24px connector margin pairs and a 20px label margin. With five 48px circles this consumed 356px before any label text. The main spec review identified this real layout failure; the main harness owns browser reproduction and verification, so this follow-up reuses the 11 existing behavior tests rather than inventing a jsdom layout test.

### Changes in main

- `Stepper/Stepper.tsx`: add `min-w-0` to the existing named query-container root.
- `StepperStep/StepperStep.tsx`: narrow connector margins are `mx-1` (8px per connector), restored to `mx-3` at `@2xl/stepper`. Connectors retain a `min-w-px` visible line and `flex-1` growth.
- Replace label margin with content `gap-2`, restored to `gap-5` at 42rem. A hidden label contributes no gap. Content uses `min-w-12` and the circles remain `size-12 shrink-0`.
- Step list items use `min-w-0`. Below 42rem, circle-only steps are `flex-none` and the step retaining its label is `flex-1`; at/above 42rem every step uses `flex-1`, bounding label space even when all labels return. Label spans use `min-w-0 truncate`; full labels remain in the existing accessible names on list items/buttons.
- `isLabelVisibleInNarrow` reuses `StepContext.status` and `isLast` for both visibility and flex allocation. Integrated completed visuals, button navigation, focus styling, and accessible-name logic are preserved.
- `Stepper/Stepper.stories.tsx`: add `NarrowContainer320` and `FinishedNarrowContainer320` with the existing decorator convention and a `w-80 max-w-full` wrapper. The finished variant enables completed-step buttons to expose that layout path too.

### Sizing decision and verification

At the default 16px root size, the five-step narrow fixed budget is 240px circles + 36px connector margins/minimum lines + 8px visible-label gap = 284px. This leaves up to 36px of label space at 320px, or 116px at 400px, with ellipsis when needed. The component does not promise arbitrary-width fitting: circles alone require `stepCount * 48px`, with additional space needed for connectors, gap, and meaningful label text.

- [x] Source and story correction implemented in main; self-reviewed against ticket and component conventions.
- [x] `pnpm exec vitest run src/components/ui/Stepper`: 2 files, all 11 tests passed.
- [x] `pnpm lint`: passed with zero warnings.
- [x] `pnpm build`: TypeScript and Vite passed.
- [x] Main Chromium harness: 48 story/width combinations at 320, 400, 512, 671, 672 and 1112px passed without root overflow, retaining 48px circles and 1px connectors. First/middle/finished states, completed buttons and current/finished label visibility passed. Additional last-current cases and long visible label sizing passed at narrow/wide widths. Wide and 320px screenshots inspected. See `../verification.md` for final evidence.

Only the three source/story files above and this canonical ticket were edited for the follow-up. No components, tests, agents, commits, or staging were added.

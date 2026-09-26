# 05: Select: form integration

**What to build:** A developer can use Select in a native form or with React Hook Form in both modes. Given `name`, Select submits its value through hidden inputs. With React Hook Form, it connects through `Controller`, and a validation error focuses the trigger. Parent spec: `.scratch/select/spec.md`.

**Blocked by:** 01 (Select: single mode, end to end), 02 (Select: multi mode with count summary)

**Status:** resolved

- [x] With `name`, single mode submits one value under that name, and multi mode submits each selected value, so a native `FormData` read gets the selection.
- [x] Without `name`, no hidden inputs render.
- [x] `defaultValue` works uncontrolled in both modes and is what a native form submits before any interaction.
- [x] A React Hook Form `Controller` example submits a string in single mode and a string array in multi mode.
- [x] When the form fails validation, React Hook Form focuses Select's trigger through the forwarded `ref`, and the example shows `status="error"`.
- [x] Storybook has a React Hook Form story with one single and one multi Select and a submit that shows the submitted values.
- [x] Unit tests cover the hidden inputs in both modes, the missing `name` case, `defaultValue` submission, and the Controller example's submitted values and focus on error.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### Integration evidence

- Integrated ticket05 from `/tmp/opencode/select-05` into the dropdown worktree with `apply_patch`: seven additional tests, the `ReactHookForm` story and its imports, and only `name?: string` plus `name={props.name}` in the component.
- Preserved main's 01–04 implementation, tests and stories, including the disabled-membership guard, local uncontrolled state tracking, status controls, empty/long-list stories and locale coverage.
- Reviewed against this ticket and `.scratch/select/spec.md`. Native serialization is delegated to Headless UI: single `department=people`; multi uses indexed names such as `departments[0]=finance`. No duplicate hidden-input implementation.
- Tests exercise default and changed native values, both-mode reset, empty multi reset, no-name and disabled omission, typed Controller submission, invalid-trigger focus/error status, and successful recovery.
- `pnpm exec vitest run src/components/forms/Select/Select.test.tsx`: **50 tests passed** (including all seven ticket05 additions).
- `pnpm exec tsc --noEmit`: **passed** with main's ticket04 locales; the source seed's missing-locale type-check limitation is resolved.
- `pnpm lint`: **passed**, zero warnings. Prettier check for all three Select TSX files and `git diff --check`: **passed**.
- Implementation resolved; the final combined full unit-suite run is deferred as requested, so the combined lint/full-suite checkbox remains open pending that run. No browser review performed. No subagents, staging, commits or pushes.

### Final browser verification — 2026-09-26

- Actual `ReactHookForm` story: empty submit marks both controls invalid and focuses Department; after selecting Finance, another invalid submit focuses Departments. Successful submit displays `{"department":"finance","departments":["people","operations"]}` and clears invalid state. Native FormData contains `department=finance`, `departments[0]=people`, `departments[1]=operations`.
- Browser form behavior passes. The required status focus ring is visually missing despite correct focus; this shared status defect reopens ticket03, with evidence in `.scratch/select/verification.md`. The combined full-suite checkbox above remains pending the coordinator's runtime checks.

### Final review fixes and combined checks — 2026-09-26

- Reproduced the disabled single-default native-reset failure with a new parameterized rendered-interface regression in `Select.test.tsx`: single mode remained People instead of restoring Finance; the multi case already passed. Both modes now restore the disabled default, trigger label, selected ARIA and native FormData, and emit the reset value. Subsequent disabled click/Enter/Space interactions emit nothing and preserve selection.
- Headless UI now owns uncontrolled state and native reset directly. Disabled keyboard activation is prevented at the public options event/ARIA boundary rather than rejecting reset callbacks in `onChange`; disabled click/arrow behavior and multi membership are preserved by the passing existing suite.
- `pnpm exec vitest run src/components/forms/Select/Select.test.tsx`: **52 passed**. The original external reproduction also passes with `pnpm exec vitest run --config /tmp/opencode/select-final-spec.config.mjs` (**1 passed**).
- Own combined checks: `pnpm lint` **passed, zero warnings**; `pnpm test:unit --run` **431 passed across 10 files**; `pnpm exec tsc --noEmit` **passed**; changed-TSX Prettier check **passed**. The combined full-suite checkbox is now complete.
- Focused browser recheck confirms both invalid RHF triggers display the required solid 2px Ink Blue 500 outline with 2px offset. Ticket03 is resolved; detailed evidence is appended to `../verification.md`. Prior valid-submission browser evidence is reused.
- Moved ticket01 implementation checks and this ticket's integration evidence under `## Comments` per tracker conventions. Build and static Storybook rebuild are left to the coordinator as requested. No staging, commits, pushes or subagents.

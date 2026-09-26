# 03: Select: status and disabled states

**What to build:** A developer can show a validation result on Select with the same `status` prop Input uses, and disable either the whole Select or single options. A user sees the same Success and Error borders, focus ring and disabled look as Input, and screen readers announce an Error Select as invalid. Parent spec: `.scratch/select/spec.md`.

**Blocked by:** 01 (Select: single mode, end to end)

**Status:** resolved

- [x] `status` accepts Input's exported status values ("success", "error"). Select doesn't define its own.
- [x] Success and Error put a Success 600 or Error 600 border on the trigger. While focused, the status border stays and a 2px Ink Blue 500 ring appears with a 2px offset (as in Input).
- [x] `status="error"` sets `aria-invalid="true"` on the trigger. An explicit `aria-invalid` from the caller wins. No status, or "success", leaves it unset.
- [x] A disabled Select has a Neutral 200 background, Neutral 400 border, Neutral 500 text and chevron, and a not-allowed cursor. It can't be opened by click or keyboard and is skipped when tabbing.
- [x] Disabled beats status, which beats focus: a disabled Error Select shows no Error border or focus ring but still has `aria-invalid`.
- [x] An option with `disabled: true` has a Neutral 500 label and a Neutral 400 checkbox or tick. It can't be picked by click or keyboard, and arrow keys skip it.
- [x] Storybook has Success, Error, disabled, disabled-with-error and disabled-options stories, with controls for `status` and `disabled`.
- [x] Unit tests cover each status border, `aria-invalid` rules, disabled precedence, a disabled Select not opening, and disabled options being unpickable and skipped.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### Ticket03 source implementation evidence

- Implemented in `/tmp/opencode/select-03`, branch `agent/select-03`, over the seeded ticket01 snapshot. Source changes were limited to Select component/tests/stories and this ticket.
- Reused Input's exported `InputStatus` and `inputStatuses`, and existing icons. Public-interface TDD covered status borders, invalid-state overrides, disabled precedence, opening/tab rejection, disabled-option skipping and selected tick styling.
- Found a Headless UI edge: opening with an already-selected disabled option can leave it active, and Enter emits its value. Added a single-mode callback guard and regression test.
- The trigger's specified `aria-invalid` contract requires a narrowly scoped, explained `jsx-a11y/role-supports-aria-props` exception.
- Source checks: 30 targeted tests, 409 full unit tests across 10 files, TypeScript and zero-warning lint passed. Stories were typechecked; browser visual review was not performed.
- Source left multi-checkbox treatment and the combined change handler pending because ticket02 was absent from its snapshot.

### Integration verification — 2026-09-26

- Merged source additions with main's integrated tickets01+02 using `apply_patch`; preserved multi types, option-order callbacks, summaries, stories, translations and the Storybook Fragment workaround.
- Resolved the pending multi checks with public rendered-interface regressions: both selected and unselected disabled checkboxes are Neutral 400; labels are Neutral 500; click/keyboard cannot pick disabled options; arrows skip them. Enter and Space on the initially selected disabled value cannot deselect it or call `onChange`.
- The combined multi handler rejects changes to disabled-value membership, not arrays merely containing a disabled value. Local uncontrolled state preserves the prior selection on rejected changes. Tests prove enabled additions and deselections still update state and emit option-ordered callbacks with the disabled selection retained.
- Integrated verification: targeted Select suite 43 passed; TypeScript passed; full unit suite 422 passed across 10 files; final lint passed with zero warnings; Prettier and `git diff --check` passed. Initial lint found one multiline-prop ordering issue, corrected before the passing final lint run.
- Integration review covered only merge correctness. Coordinator final visual/standards/spec review remains separate. No name/form integration edits, staging, commits, pushes or subagents.

### Final browser finding — 2026-09-26

- Reopened from resolved: actual `Success` and `Error` stories focus the trigger and preserve the correct border, but the required focus ring is invisible. Computed outline is `rgb(60, 153, 241) none 2px`, offset `2px`, with `box-shadow:none`; `outline-style:none` suppresses rendering. Screenshot inspection confirms this. The same defect appears on the focused invalid trigger in `ReactHookForm`.
- Disabled, disabled-with-error and disabled-options browser checks pass: expected muted colors/precedence, invalid ARIA retained for disabled error, disabled trigger cannot open or receive Tab focus, disabled row click ignored and arrow navigation skips it.
- Reproduce: open `forms-select--error` or `forms-select--success` on Storybook port 6007 and focus Department. `/tmp/opencode/verify-select-final.mjs` finishes all browser checks then exits nonzero for this visual finding. Evidence: `.scratch/select/verification.md` and `/tmp/opencode/select-final-{success,error,rhf-errors}.png`.
- Product files were not changed during browser review. Fix the visible status focus ring and rerun these browser checks before resolving this ticket.

### Final review fixes and browser confirmation — 2026-09-26

- Added `focus:outline-solid` to the status focus classes. The existing rendered-trigger class assertions failed for both statuses before the fix and pass afterwards; disabled precedence excludes this class too.
- Direct Playwright Chromium against the existing Storybook at port 6007, `/tmp/opencode/verify-select-fixes.mjs`, confirms Success, Error, and both invalid RHF triggers have computed `rgb(60, 153, 241) solid 2px` outlines with `2px` offset and their original status borders. Disabled and disabled-with-error remain unfocusable with `outline-style:none` and Neutral borders. Zero browser page errors; Error screenshot inspected and ring visible. Screenshots: `/tmp/opencode/select-fixes-{success,error,rhf-single,rhf-multi}.png`.
- Replaced callback-level disabled rejection and duplicate uncontrolled state with an Enter/Space guard on `ListboxOptions`, using public `aria-activedescendant` / `aria-disabled` semantics. Headless UI retains disabled click/navigation behavior and owns uncontrolled values/reset. Existing tests preserve disabled multi membership while permitting enabled additions/deselections; the browser delta also confirms selected disabled Enter/Space activation is blocked. See ticket05 for the reset regression.
- Final checks: 52 Select tests and the external reset regression passed; full unit suite 431 tests across 10 files passed; zero-warning lint, TypeScript, and changed-TSX Prettier checks passed. Browser finding resolved; earlier unchanged browser evidence is retained in `../verification.md`.

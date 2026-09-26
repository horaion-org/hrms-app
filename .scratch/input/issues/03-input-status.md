# 03: Input: Success and Error status

**What to build:** A developer can set `status="success"` or `status="error"` on Input to show the field's validation result, using the Success and Error colour ranges. Error also marks the field invalid for assistive technology. Disabled always overrides the status visually. Parent spec: `.scratch/input/spec.md`.

**Blocked by:** 01 (Input: base field with neutral, focus and disabled looks)

**Status:** resolved

- [x] Input accepts `status?: "success" | "error"`. Leaving it unset gives the neutral look.
- [x] The allowed values are exported as a list (`inputStatuses`), with the `InputStatus` type derived from it, both from the constants module and re-exported through the index.
- [x] Success shows a Success 600 border. Error shows an Error 600 border. Text stays Neutral 900.
- [x] A status border stays while the field has focus. Focus doesn't replace it with Ink Blue.
- [x] `status="error"` sets `aria-invalid="true"` on the native input. No status and `status="success"` don't. An `aria-invalid` the caller passes is not silently dropped.
- [x] A disabled Input shows the disabled look and no status border, but still has `aria-invalid="true"` when `status="error"`.
- [x] Storybook has stories for Success, Error and disabled-with-error, and a select control for `status` driven by the exported list.
- [x] Unit tests cover each status's border, `aria-invalid` wiring, and disabled overriding status.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

- 2026-09-26: Integrated ticket03 with ticket02 into the canonical Input using `apply_patch`. Retained status constants/type exports, explicit caller ARIA overrides, Error's default invalid meaning even when disabled, and disabled > status > focus visual precedence. All base and both tickets' tests are preserved additively. All six stories retain icon args, status/disabled/placeholder/value controls, and the controlled/defaultValue guard.
- Verification: `pnpm exec vitest run src/components/forms/Input/Input.test.tsx` passed 31 tests; `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed 372 tests across 9 files; `pnpm build` passed; `pnpm exec prettier src/components/forms/Input --check` passed after correcting imported test line wrapping.
- Limitations: focus and precedence checks assert DOM behaviour and state classes, not browser-rendered colours; no browser visual or manual Storybook review was performed. Vitest emitted the Vite React-SWC plugin recommendation. Changes remain unstaged and uncommitted; coordinator two-axis review is pending.

### 2026-09-26 — Final regression and computed-CSS evidence

- Fixed Input's nested textlink Button icon colour using state-specific SVG descendant Neutral classes. Approved-seam regression evidence: **2 failed / 31 passed before the fix**, then **33 Input tests passed**; full suite **374 tests across 9 files passed**. Existing disabled tests were retained.
- Temporary Chromium **153.0.8010.12** verification (`/tmp/opencode/verify-input-final.mjs`) passed **5 state cases** against the main repository: enabled, disabled, disabled+error, Success, Error. Both direct and nested SVGs retain 20px/non-shrinking sizing and Neutral 900, or Neutral 500 when disabled, including actual path stroke colours.
- Disabled+error with both icons has Neutral 400 border (`rgb(205, 206, 211)`), Neutral 200 background (`rgb(241, 243, 248)`), Neutral 500 text/icons and `aria-invalid="true"`; the disabled native input cannot receive focus. Focusing the caller-owned nested Button preserves that disabled appearance. Success 600 (`rgb(52, 141, 125)`) and Error 600 (`rgb(210, 72, 71)`) borders persist during mouse, keyboard and nested-button focus; the enabled status-free field focuses to Ink Blue 900 (`rgb(35, 74, 158)`). Thus disabled > status > focus is verified with computed CSS. No browser page errors or permanent browser tests.
- Final checks passed: full lint (zero warnings), targeted Input tests (**33**), full unit tests (**374**, **9 files**), app build, Input formatting and Storybook build. The initial lint/build overlap caused a transient `dist` ENOENT; lint passed after build completion. Tooling warnings: React-SWC recommendation; Storybook module API deprecation, absent MDX files and large chunks.
- Canonical spec stories 18/25 and ticket01 now use Neutral terminology; approved behaviour is unchanged. Changes remain unstaged and uncommitted.

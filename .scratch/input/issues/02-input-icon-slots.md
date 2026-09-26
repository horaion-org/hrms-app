# 02: Input: leading and trailing icon slots

**What to build:** A developer can pass any React node as `leadingIcon` and/or `trailingIcon`, and it appears before or after the text inside the Input's box. Input sizes and colours whatever is passed, so icons from the Icon set look right without extra classes. Parent spec: `.scratch/input/spec.md`.

**Blocked by:** 01 (Input: base field with neutral, focus and disabled looks)

**Status:** resolved

- [x] `leadingIcon` renders before the native input, and `trailingIcon` renders after it, inside the wrapper.
- [x] Empty slots render nothing and add no extra gap.
- [x] Icons in the slots are 20px and don't shrink.
- [x] Icons are Neutral 900 normally and Neutral 500 when the Input is disabled.
- [x] The slots accept any React node, including interactive elements such as a button.
- [x] Storybook args put a placeholder circle icon in both slots (like Button's stories), matching the mock, with the icon controls turned off.
- [x] Unit tests cover icon order around the input and leaving out empty slots.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

- 2026-09-26: Integrated ticket02 and ticket03 into the canonical Input using `apply_patch`, preserving all base and both tickets' tests additively. Slots render React nodes directly, including zero, with no wrappers for absent nodes; SVGs retain 20px/non-shrinking styling and inherit Neutral colours alongside status precedence. Stories reuse the existing shared `PlaceholderIcon` in both slots and retain both tickets' args and controls.
- Verification: `pnpm exec vitest run src/components/forms/Input/Input.test.tsx` passed 31 tests; `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed 372 tests across 9 files; `pnpm build` passed; `pnpm exec prettier src/components/forms/Input --check` passed after correcting imported test line wrapping.
- Limitations: DOM/class assertions verify slot layout and styling contracts; no browser visual or manual Storybook review was performed. Vitest emitted the Vite React-SWC plugin recommendation. Changes remain unstaged and uncommitted; coordinator two-axis review is pending.

### 2026-09-26 — Final review regression fixed in main repository

- Finding: a nested `Button variant="textlink"` supplies its own Ink Blue colour, overriding Input's inherited Neutral colour. Added state-specific `[&_svg]:text-neutral-900` / `[&_svg]:text-neutral-500` rules to Input, matching its SVG sizing selector.
- TDD at the approved Input rendered public seam: added 2 enabled/disabled nested Button + ViewIcon cases. Before the fix, targeted tests reported **2 failed / 31 passed**; after the fix, **33 passed**. Existing disabled tests were retained.
- Actual computed CSS verified in Chromium **153.0.8010.12** using the temporary Playwright/Vite script `/tmp/opencode/verify-input-final.mjs` against main-repository components and Tailwind CSS. **5 state cases passed**: enabled, disabled, disabled+error, Success, Error. Both the direct SearchIcon and nested ViewIcon have Neutral 900 (`rgb(46, 47, 51)`) or disabled Neutral 500 (`rgb(176, 177, 182)`) colour and path stroke, 20px dimensions and zero shrink. Focus within the nested Button also preserves disabled > status > focus precedence. No browser page errors; no permanent browser tests added.
- Final checks: targeted Input **33 tests passed**; full unit suite **374 tests across 9 files passed**; full lint passed with zero warnings; app build, Input Prettier check and Storybook build passed. Initial lint overlapped build output cleanup and hit an ENOENT in `dist`; the post-build rerun passed. Build tooling emitted the React-SWC recommendation and Storybook's module API deprecation, absent-MDX and large-chunk warnings.
- Terminology only: replaced “grey” with “Neutral” in canonical spec stories 18/25 and ticket01's description, preserving the approved behaviour. Changes remain unstaged and uncommitted.

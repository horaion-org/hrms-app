# 04: Input: visible focus with a status, and fieldset-disabled look

**What to build:** Two fixes from the two-axis code review of tickets 01–03, applied under an amended spec (see the spec's Precedence and Disabled detection decisions, and the 2026-09-26 amendment note). Parent spec: `.scratch/input/spec.md`.

1. A focused Success or Error field had no visible focus indicator, because the status border suppressed the Ink Blue focus border and the native input's outline was removed. A status field now keeps its status border and adds an Ink Blue 500 focus ring (2px, 2px offset, matching Button's focus outline). A status-free field keeps the Ink Blue 900 focus border, with no ring.
2. The disabled look was driven only by the `disabled` prop, so an Input inside a disabled fieldset kept its white background, status border and focus styling. The disabled look now follows the native input's actual disabled state.

**Blocked by:** 01, 02, 03

**Status:** resolved

- [x] A focused Success or Error field shows an Ink Blue 500 focus ring outside its status border.
- [x] A status-free field shows no ring and keeps the Ink Blue 900 focus border.
- [x] An Input disabled by a surrounding fieldset looks identical to one disabled by its prop, whether or not it has a status.
- [x] Disabled still beats status and focus, including the ring and a focused nested control in a slot.
- [x] The native input's outline is hidden in a way that keeps a transparent outline in forced-colours mode.
- [x] Every colour class Input renders compiles in the app stylesheet.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-09-26: Implemented

- TDD at the Input seam. Five new tests failed before the change:
  - fieldset disabled matches prop disabled, for no status, Success and Error;
  - the focus ring appears only when a status is set;
  - the compiled-stylesheet check for Input's colours.
  All pass after the change.
- The disabled look now uses `has-[>input:disabled]:` variants on the wrapper. The compiled CSS shows the precedence comes from specificity, not rule order:

  | Rule | Specificity |
  |---|---|
  | Status border | 0,1,0 |
  | Focus border and ring (`:focus-within`) | 0,2,0 |
  | Disabled (`:has(> input:disabled)`) | 0,2,1 |
  | Icon colour, normal | 0,1,1 |
  | Icon colour, disabled | 0,2,2 |

- The native input moved from `outline-none` to `outline-hidden`.
- Six existing tests asserted that the disabled classes were applied or left off according to the `disabled` prop. They now assert a shared `disabledLook` class list instead, which also removes some duplicated assertions.
- The stylesheet test's `collectMarkupClasses` helper didn't decode HTML entities, so `[&_svg]:…` and `has-[>…]` classes were read as `[&amp;_svg]:…`. This was a latent bug, never hit before because no earlier colour class contained `&` or `>`. The helper now decodes them.
- Checks: `pnpm lint` passes with zero warnings; `pnpm vitest run src/` passes 379 tests across 9 files; `pnpm build` passes; Prettier passes.
- Limitation: no real-browser check of computed colours was run for these two fixes. Precedence was checked from the compiled selectors instead.

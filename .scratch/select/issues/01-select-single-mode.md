# 01: Select: single mode, end to end

**What to build:** A developer can import the shared Select form control, give it a list of options and an accessible name, and let a user pick one value. The trigger has Input's box and shows the placeholder, or the selected option's label after a pick, in Ink Blue 900 with a chevron that flips when open. Clicking or using the keyboard opens an anchored panel of option rows. Picking a row calls `onChange` with its value, shows an Ink Blue tick on that row, and closes the panel. Parent spec: `.scratch/select/spec.md`. Foundation: ADR 0001 (Headless UI for popup controls).

This ticket creates the component's full file set (component, constants, story, test, index re-export) in the shared forms components, following Input's conventions: named export, `FunctionComponent` return type, imports through the `@/` alias. The constants module holds the option type. Later tickets add multi mode, states, the empty list and form integration, so shape the props so that a `multiple` discriminant can be added without breaking callers.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Select renders a trigger button whose accessible name comes from `aria-label` or `aria-labelledby`. The placeholder is not used as the name.
- [x] With no value, the trigger shows `placeholder`. With a value, it shows that option's label, truncating with an ellipsis if space runs out.
- [x] The trigger box matches Input: 44px tall, 16px horizontal padding, 12px gap, 8px radius, 1px Neutral 400 border, white, small text. The text and the 20px chevron are Ink Blue 900.
- [x] While the trigger has focus, its border is Ink Blue 900. When open, only the chevron changes (down to up).
- [x] Clicking the trigger opens a listbox with one option per `options` entry, in order.
- [x] The panel is anchored below the trigger's left edge with a small gap and flips upward when there's no space below. It is at least as wide as the trigger and grows to fit the longest label.
- [x] The panel is white, 8px radius, 1px Neutral 400 border, with a small shadow and vertical padding. It scrolls vertically after about 6 rows.
- [x] Rows are 40px tall with 16px horizontal padding and Neutral 800 labels. The active row (hover or keyboard) has a Neutral 100 background.
- [x] Picking an option calls `onChange` with its string value, closes the panel, marks the option `aria-selected`, and shows an Ink Blue 900 tick (existing tick icon) on that row only.
- [x] Clicking the already-selected row keeps it selected. The control can't clear a single-mode choice.
- [x] `value` (controlled) and `defaultValue` (uncontrolled) both work in single mode.
- [x] Keyboard: Enter, Space or the arrow keys open the panel, arrows move the active row, typing jumps to a matching row, Enter or Space picks, and Escape closes. Focus returns to the trigger on close. A click outside also closes the panel.
- [x] `ref` reaches the trigger button, and `className` goes on the trigger (for example, `w-full` makes it full width). By default the trigger fits its content.
- [x] Storybook has stories for the placeholder, one selected, and a full-width trigger.
- [x] Unit tests (Testing Library + user-event, modelled on Input's) cover the accessible name, placeholder and label text, opening, picking, `onChange`, the keyboard flow, focus return, `ref` and `className` placement.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### Implementation checks

- Implemented in `/tmp/opencode/select-01`, branch `agent/select-01`.
- TDD at the rendered Select interface: 15 targeted tests pass.
- `pnpm lint`: passes with zero warnings.
- `pnpm test:unit --run`: 10 files, 394 tests pass.
- `pnpm exec tsc --noEmit`: passes.
- Initial implementation styling checks recorded tokens/classes only. Integrated browser measurements below now verify anchoring, flip, intrinsic panel width, truncation and the six-row scroll cap.
- Headless UI 2.2.10 needs a Fragment/native-button adapter to preserve caller `aria-labelledby` and open on Enter. Its anchored panel uses `--anchor-max-height` for the scroll cap.
- Test environment: a minimal shared ResizeObserver stub; typeahead's test supplies jsdom's missing innerText only on its rendered option elements.

### Integration and browser verification — 2026-09-26

- Integrated the approved Select file quad plus constants, `vitest.setup.ts`, and this ticket from `/tmp/opencode/select-01` into `feature/dropdown` using `apply_patch`. Before the browser fix, `git diff --no-index` confirmed all seven files matched the source exactly.
- Actual Storybook rendering exposed a ticket01 defect: the dev instrumentation injects `data-tsd-source` on Listbox, whose default Fragment root cannot forward props through its render-prop Fragment. Chromium reproduced `Passing props on "Fragment"!` and no trigger rendered. Fixed only Select's Listbox root with `as="div" className="contents"`; this accepts instrumentation without adding a layout box. The same browser script then rendered all three existing stories successfully. The external browser script exercises this integration regression; no new repository Playwright tests were added.
- Reviewed the running Storybook at `http://127.0.0.1:6007`, using direct Playwright with `executablePath: chromium.executablePath()` and a 1000×720 viewport. Script: `/tmp/opencode/verify-select-01.mjs`. Server log: `/tmp/opencode/select-01-storybook.log`.
- **Bottom-start and intrinsic width:** placeholder trigger `(x=16, y=16, width=200.640625, height=44)`; panel `(x=16, y=64, width=252.78125, height=130)`. Left edges match, the gap is exactly 4px, and the panel grows to fit the longest label.
- **Viewport flip:** moved the existing trigger at runtime to `left:120px; bottom:12px`. Trigger top/bottom were 664/708px; panel top/bottom were 530/660px with matching x=120px. It flips upward with exactly 4px between panel and trigger.
- **Minimum width:** the existing FullWidth story measured 968px for both trigger and panel, preserving the trigger minimum when labels are shorter.
- **Truncation:** selected the real “Operations and administration” option, then constrained the trigger to 150px at runtime. Label client width was 84px versus scroll width 187px, with `overflow:hidden`, `white-space:nowrap`, and `text-overflow:ellipsis`; the screenshot visibly shows the ellipsis and retained chevron.
- **Panel styling and scrolling:** computed white background, 8px radius, 1px `rgb(205, 206, 211)` border, small shadow, 4px top/bottom padding, and 40px rows. Appended runtime-only cloned rows to the existing OneSelected story's panel (12 total) solely to verify geometry ahead of ticket04's long-list story. Panel height capped at 248px; client height 246px versus scroll height 488px; `overflow-y:auto`; scrolling reached `scrollTop=242` and exposed the last rows. These DOM clones were not used to claim React selection behavior.
- Inspected screenshots: `/tmp/opencode/select-01-bottom.png`, `/tmp/opencode/select-01-flip.png`, `/tmp/opencode/select-01-truncation.png`, `/tmp/opencode/select-01-scroll.png`. All browser assertions passed with no page errors after the fix.
- Final integrated checks after the fix: `pnpm exec vitest run src/components/forms/Select/Select.test.tsx` — 15 passed; `pnpm exec tsc --noEmit` — passed; `pnpm lint` — passed with zero warnings; `pnpm test:unit --run` — 10 files / 394 tests passed.
- All ticket01 requirements are satisfied; marked resolved. Coordinator's final standards/spec review remains separate. No staging, commits, or pushes performed.

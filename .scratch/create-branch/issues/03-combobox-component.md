# 03: Combobox: multi choice with async search and Tokens

**What to build:** A generic **Combobox** in `src/components/forms/Combobox` built on Headless UI `Combobox` with `multiple`, matching mock state 2.
- The trigger shows the placeholder, or the chosen values as removable **Tokens**, plus a chevron.
- The panel opens below with its own search input ("Search people"), a list of options with checkboxes, and a footer note.
- Options are fetched by the caller. The Combobox reports the query and renders whatever options it is given.

Parent spec: `.scratch/create-branch/spec.md` (D2, D3, D10).

**Blocked by:** none

**Status:** ready-for-human

- [x] Props as sketched in the spec: `value`, `onChange`, `options`, `getKey`, `getLabel`, `renderOption?`, `query`, `onQueryChange`, `loading?`, `emptyText?`, `footer?`, `maxSelected?`, `placeholder`, `searchPlaceholder`, `status?`, `disabled?`, `aria-label` / `aria-labelledby`, and `ref` to the trigger. Generic over the option type.
- [x] Choosing toggles a value and keeps the panel open. The value order is the order of choosing.
- [x] Each Token shows the label and a × button named "Remove {{label}}" (`combobox.remove`). Removing calls `onChange` without that value. Tokens use the mock's tint and colours from existing tokens.
- [x] Chosen values stay as Tokens even when they are not in the current `options`.
- [x] Backspace in an empty search removes the last Token.
- [x] At `maxSelected`, unchosen options are disabled (`aria-disabled`) and skipped by the keyboard.
- [x] Loading shows `combobox.loading`. No options shows `emptyText` or `combobox.noResults`. Both are translated in English and Spanish.
- [x] `status="error"` sets `aria-invalid` on the trigger and uses Input's error border. A disabled Combobox doesn't open.
- [x] Esc or a click outside closes the panel and focus returns to the trigger. The panel flips upward near the bottom of the viewport and scrolls after about five rows.
- [x] Stories: empty, two chosen (state 2, using Avatar and a Success Badge in `renderOption`), loading, no results, `maxSelected` reached, error, disabled.
- [x] Unit tests cover the items in the spec's Testing Decisions for Combobox. Debouncing is the caller's job and is not tested here.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-10-04 — implementation handoff

- Generic controlled Combobox implemented within the owned folder, with retained removable Tokens and private Search/Trigger/Panel adapters; every component has the required component/story/test/index quad. Caller owns fetching, debouncing, labels, footer and full selected objects. `loadingText`, `id`, `aria-describedby`, `aria-invalid` and `aria-required` are additionally supported. `maxSelected` is optional (caller supplies 20 for Branch heads).
- Thin rendered-interface TDD slices went red then green for selection/query, retained Tokens/removal/Backspace, max/keyboard, loading/empty/error/ref/disabled, and Tab/ARIA linkage. Standalone Token test checks the Spanish translated removal name. Current targeted run: **12 tests across 6 files pass**. Geometry tests include lower-edge flipping, narrow width, height limits and an offscreen trigger.
- Commands (Node supplied through `/home/vernon/.nvm/versions/node/v26.10.0/bin`; plain `pnpm` unavailable on this shell): `node node_modules/vitest/vitest.mjs run src/components/forms/Combobox --maxWorkers=2`; `node node_modules/eslint/bin/eslint.js src/components/forms/Combobox --max-warnings 0`; `node_modules/.bin/tsc --noEmit`. All three pass. Parent owns whole-repository lint/test/build/E2E; the final whole-repository checklist remains unchecked here.
- Accessibility review: trigger is tabbable with externally addressable ID and focus ref, removal buttons are sibling controls rather than nested buttons, inner listbox alone owns multiselect semantics, search controls its actual ID, Headless UI owns active-descendant/navigation/toggling/dismissal. Empty-query Space forwards Enter to the Headless input; ordinary spaces in a query remain typing. Escape/outside returns focus per this ticket; Tab resumes normal order rather than restoring focus after closing.
- Browser review by parent caught development-only Fragment forwarding and Headless anchoring incompatibilities. Root/trigger/panel now use concrete forwarding elements. Headless UI's built-in Combobox anchor is tied to its input, unsuitable when the input lives inside the popup; parent approved a small measured fixed-position adapter instead. It retains Headless portal/interactions and updates on resize, captured scroll and ResizeObserver. Panel sits above Dialog at z-index 60 and the inner list scrolls after about five rows.
- Stories cover all requested states, reuse Avatar + Success Badge, and include a 20-option near-bottom story. **Visual gap:** parent browser rerun after the adapter fix is pending; viewport flipping/scrolling, Dialog hit-testing and fidelity to design need that evidence. `read_image` failed with `cannot get property fs without inject` in this delegated runtime, so no pixel-match claim is made. This leaves the combined positioning criterion unchecked despite passing Escape/outside tests.
- No dependencies, translations, snapshots, environment files or files outside owned scope changed; no commits or branch operations.


### Parent final integration verification

- All app checks pass: ESLint zero warnings, Vitest **73 files / 1186 tests** (bounded `--maxWorkers=2`), production TypeScript/Vite build, Storybook production build, and **48 Playwright tests** across Chromium, Firefox and WebKit (two workers). No timeout/configuration relaxation. See `../verification.md` for limits and API evidence.
- Mobile near-bottom Storybook panel: x17/y154/width356/height327, trigger y485/height42 at390×640; upward flip with4px gap and viewport bounds pass. Keyboard selection, Token, Escape focus return and Dialog pointer hit-testing pass. Screenshot fidelity still requires human review.

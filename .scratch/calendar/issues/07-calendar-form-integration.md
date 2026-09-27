# 07: Calendar: native form and React Hook Form integration

**What to build:** The Calendar takes part in forms like Select does. `name` submits the value through hidden inputs, a native reset restores `defaultValue`, and `ref` lets React Hook Form focus the Calendar on a validation error. Parent spec: `.scratch/calendar/spec.md` (Form integration).

**Blocked by:** 04 (range mode). Prefer landing after 06 if possible, since `ref` targets the grid cell that holds the tab stop. If 06 isn't merged yet, point `ref` at the selected (or else the first selectable) cell and leave a note in Comments.

**Status:** resolved

- [x] With `name`, single mode renders one hidden input named `name` that holds the ISO date, or an empty string when there's no value.
- [x] Range mode renders hidden inputs `name[start]` and `name[end]`. A draft range submits nothing, or empty values.
- [x] A native form reset restores `defaultValue` in both modes, including clearing a draft range.
- [x] `ref` reaches the grid cell that holds the tab stop, and `ref.current.focus()` puts keyboard focus there.
- [x] `aria-label` and `aria-labelledby` give the grid its accessible name.
- [x] Story: a React Hook Form story with a required single date and a required range, using Zod validation. On an invalid submit, focus moves to the Calendar. A valid submit shows the submitted values.
- [x] Tests through the rendered Calendar:
  - [x] FormData contents in both modes, and nothing submitted for a draft range
  - [x] reset restores `defaultValue`
  - [x] `ref` focus
  - [x] a React Hook Form `Controller` submitting and focusing on error, following the prior art in Select's test
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### Resolved on main after coordinator approval — 2026-09-26

Semantically integrated ticket07 with `apply_patch` into the main worktree's
01–06 baseline (618 tests). Changed only:

- `src/components/forms/Calendar/Calendar/Calendar.tsx`
- `src/components/forms/Calendar/Calendar/Calendar.test.tsx`
- `src/components/forms/Calendar/Calendar/Calendar.stories.tsx`
- this ticket

Integration details:

- The public ref now uses `useImperativeHandle` to publish the existing
  keyboard06 `focusedCellRef.current` in the layout phase, after the cell
  mounts. It runs on every render, including every roving change. The
  provisional DOM-query resolver was not brought into main.
- Reset uses the existing `focusedDate`, `visibleMonth`, `view` and
  `focusRequested` state. It clears draft/preview, restores uncontrolled
  defaults and returns to day view on the restored date/range start. Empty
  values fall back to defaultMonth/today using the existing initial-focus
  helper. Controlled values remain caller-owned; reset emits no onChange.
- When focus is inside Calendar, reset moves it to the restored roving cell.
  An external reset button keeps its focus; the public ref and tab stop still
  update to the restored cell. No additional focus architecture was added.
- Existing limit guards, disabled-cell behavior, navigation, keyboard handlers
  and view wiring from 05/06 are preserved. Both hidden range endpoints remain
  empty during a new draft even with a previous completed value.
- The approved RHF/Zod story was merged alongside existing stories. Its test
  now uses keyboard selection and verifies that subsequent validation errors
  focus the current roving cell, rather than the initially focused date.

Public-seam coverage: 13 ticket07 tests added, covering native single/range
FormData, replacement drafts in controlled and uncontrolled modes, unnamed
Calendars, both accessible-name props in every view, empty resets, controlled
ownership, reset from a different year, external reset-button focus, ref
identity/tabIndex/focus through keyboard movement and drilling, ref cleanup,
and RHF/Zod invalid focus/draft rejection/valid JSON.

TDD evidence on the integrated baseline: the public-ref test failed with a
null ref before the layout-phase binding; FormData and reset/view tests then
failed before the native-form merge. Both slices passed after implementation.
The approved story and remaining form coverage passed with the merged behavior.

Final main verification:

- `pnpm lint`: passed, zero warnings.
- `pnpm test:unit --run`: **18 files, 631 tests passed** (618 baseline + 13).
- `pnpm exec tsc --noEmit`: passed.
- Prettier check on the three changed source files: passed.
- `git diff --check` and whitespace checks on the untracked Calendar files:
  passed.

Standards/spec self-review: no outstanding findings or deferred ref work.
All ticket07 acceptance checks are complete. Unrelated docs were untouched;
nothing was staged or committed.

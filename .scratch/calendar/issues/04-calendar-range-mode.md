# 04: Calendar: Date range mode

**What to build:** With `mode="range"`, a user picks a Date range in two clicks, and sees the range previewed before the second click. `onChange` fires once with `{ start, end }` when the range is complete. Parent spec: `.scratch/calendar/spec.md` (Range mode).

**Blocked by:** 02 (Calendar: single-date day view)

**Status:** resolved

- [x] In range mode, `value`, `defaultValue` and `onChange` use `DateRange` (`{ start, end }` as ISO strings). `expectTypeOf` checks show that single mode rejects a `DateRange` and range mode rejects a string.
- [x] The first click starts a draft range that lives only in internal state and doesn't call `onChange`. The second click completes the range and calls `onChange` once with `{ start, end }`.
- [x] If the second pick comes before the first, the two are swapped. Picking the same day twice gives a one-day range.
- [x] Clicking after a complete range starts a new draft.
- [x] While a draft is open, hovering previews the band from the draft start to the hovered day. (Ticket 06 adds the same preview for keyboard focus.)
- [x] The start and end are filled Ink Blue with white text. The days between form a continuous light Ink Blue band, joined across columns and with rounded outer ends. Cells show whether they are the range start, the range end or within the range, both as state and in their accessible description.
- [x] A range may span days from neighbouring months, and picking a neighbouring-month day as the end moves the view to that month.
- [x] Opening with a range value shows the start's month.
- [x] Stories: Range (a complete range within one month), Range across months, and Draft range (the first pick made).
- [x] Tests through the rendered Calendar: no `onChange` on the first click, a single `onChange` on the second, the swap, one-day ranges, the restart on a third click, the hover preview, range cell states and accessible descriptions, and the controlled range value.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-09-26 — implemented, reviewed and integrated

Coordinator approved the range controller/cell and integration. Applied the ten-file ticket04 delta from `/tmp/opencode/calendar-04` to main with `apply_patch`, using immutable `/tmp/opencode/calendar-02` as the ancestor and preserving integrated ticket03 navigation, tests, stories and translation keys. CalendarMonthView and CalendarYearView now receive `selectedDate ?? selectedRange?.start`, so their selected indicators follow the completed value rather than the draft or the visible period.

Evidence:
- Implementation TDD observed red → green for draft/completion, reversed picks with same-day restart, and hover previews. Public tests cover controlled values (including null), uncontrolled defaults, inclusive states, cross-month/year selection, en/es descriptions and range stories. Implementation checks passed: lint, TypeScript and the full unit suite (16 files, 510 tests).
- Integration TDD added a rendered Calendar regression covering range-start month/year indicators, no selection from navigation, a draft surviving month/year drilling, and a completed cross-month range updating those indicators. Observed red before integration and green afterward.
- Main targeted Calendar suite: 6 files, 71 tests passed.
- Main full checks: `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed (18 files, 526 tests); `pnpm exec tsc --noEmit` passed.
- Whitespace checks include the untracked Calendar tree against immutable calendar-03. Standards/spec self-review found no unresolved implementation findings. Browser visual review was not run; designer sign-off for the range appearance remains with final verification.

Architecture handoff:
- **06:** Calendar owns `draftStart` and `previewDate`; `displayedRange` is derived with the internal `dateRange` helper. CalendarDayView exposes `onPreview(IsoDate | null)` and currently uses mouse enter/leave. Reuse this path for keyboard focus preview and coordinate mouse-leave clearing with focused-date preview. Route Enter/Space selection through `pickDay`. Keep full-date accessible names and localized range descriptions; preview-only cells are not `aria-selected`, apart from the picked draft anchor. Roving focus/ref wiring is still to come.
- **07:** `selectedRange` resolves the completed controlled/uncontrolled value; `undefined` means uncontrolled and `null` is a controlled empty value. A new draft overrides display but retains the previous completed value internally. Hidden range inputs must therefore be omitted while `draftStart !== null`, even if `selectedRange` exists. Native reset needs to restore the uncontrolled default and clear both draft/preview state, respecting controlled ownership. No public partial range is emitted.

Immutable calendar-02/calendar-03 and the approved calendar-04 worktree remain unchanged. Ticket05 concerns were not changed. No staging, commits or pushes.

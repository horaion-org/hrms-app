# 05: Calendar: minDate, maxDate and isDateDisabled

**What to build:** A developer limits which dates can be picked with `minDate`, `maxDate` and an `isDateDisabled(date)` callback. Blocked days, months and years are greyed out and can't be picked, and the arrows stop at the limits. Parent spec: `.scratch/calendar/spec.md` (Limits).

**Blocked by:** 03 (month and year views). Coordinate with 04: a range may span disabled days, so if 04 isn't merged yet, the range part of the checklist moves to a follow-up comment on 04.

**Status:** resolved

- [x] A day can't be picked if it falls before `minDate`, after `maxDate`, or `isDateDisabled` returns true for it. Such days are greyed, `aria-disabled`, and clicking does nothing. They stay in the DOM and can still receive focus, so they can be read.
- [x] A month is disabled when none of its days is within `minDate`–`maxDate`, and a year is disabled when none of its months is. `isDateDisabled` affects single days only, not months or years.
- [x] ‹ or › is disabled when the previous or next page (by month, year or 12-year block, depending on the view) has nothing within the limits.
- [x] In range mode, only the start and end must be selectable. Disabled days inside a complete range keep their disabled look within the band.
- [x] Stories: Min/max (with `minDate` and `maxDate` controls), Disabled dates (Weekends disabled through `isDateDisabled`), and Range across a disabled day.
- [x] Tests through the rendered Calendar: day blocking by min, max and the predicate; month and year disabling; arrows disabled at the limits in all three views; a range across a disabled day; and a disabled day that can receive focus but not be picked.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-09-26 — implemented, reviewed and integrated with ticket06

Coordinator approved integration of the eight-file ticket05 delta from `/tmp/opencode/calendar-limits-active`. Applied a semantic merge with `apply_patch` onto main's integrated01–04 + 06, preserving ticket06's roving focus, ref routing, keyboard date maths, clamping, focus-request effect, focus-visible styling, range-focus preview, stories and tests. No staging or commits.

Behavior and integration:

- `isDayDisabled` combines inclusive min/max with the caller's predicate. Calendar guards both single-date selection and range endpoints, including revalidating a draft start after limits change.
- `isPeriodAvailable` checks bounds overlap for a month, year or fixed 12-year block. Month/year cells and header arrows ignore the day predicate; header paging guards both visible-month and focused-date updates.
- Keyboard navigation uses `isSamePeriod` plus `isPeriodAvailable`: movement inside the displayed period always remains possible, including disabled months/years and a whole displayed page made unavailable by updated bounds. Only movement to a different page with no bounds overlap is blocked. Disabled cells retain the existing CalendarCell activation guard and never receive native disabled.
- All 15 original ticket05 limits/story cases retained, including forward/reversed ranges across a disabled day and muted text inside the preview/completed band. Added 22 rendered Calendar integration cases for disabled-cell focus/activation rejection, bounds stops with page keys and edge arrows in every view, partially available destination pages, leap/month-length clamping, header-bound focus preservation, and keyboard range completion across a disabled day.
- Stories: `MinMax` with ISO-text controls, `DisabledDates` for Weekends, and `RangeAcrossDisabledDay`.

Evidence on main after integration:

- TDD: 12 initial bounded-keyboard integration cases failed before the merge and passed afterward.
- Public Calendar test file: **139 tests passed**.
- `pnpm lint`: passed, zero warnings.
- `pnpm test:unit --run`: **18 files / 618 tests passed**.
- `pnpm exec tsc --noEmit`: passed.
- `git diff --check` and `git diff --no-index --check /tmp/opencode/calendar-keyboard-active/src/components/forms/Calendar src/components/forms/Calendar`: passed, including the untracked Calendar tree.
- Standards/spec self-review: no remaining integration findings. Original isolated implementation evidence and seed hashes: `/tmp/opencode/calendar-limits-active-verification.md`.

Ticket07 should preserve the selection guards and composed internal focus route when integrating its form/ref/reset behavior. No public API or translation changes were needed for this integration.

# 06: Calendar: keyboard navigation and screen-reader polish

**What to build:** The Calendar works fully by keyboard, following the WAI-ARIA date-grid pattern. The grid is one Tab stop with roving focus, the keys move by day, week, month and year, focus lands on the matching cell after switching view, and keyboard focus previews a Date range. Parent spec: `.scratch/calendar/spec.md` (Keyboard, Accessibility). See ADR 0002: this is the accessibility-critical code we chose to own.

**Blocked by:** 03 (month and year views), 04 (range mode)

**Status:** resolved

- [x] Tab order is ‹, the title, ›, then the grid. The grid has exactly one tab stop (`tabIndex=0` on the focused cell, `-1` on the others), which starts on the selected date, else today, else the first day of the month.
- [x] In the day view:
  - [x] The left and right arrows move ±1 day, and up and down move ±1 week.
  - [x] Home and End go to Monday or Sunday of that week.
  - [x] PageUp and PageDown move ±1 month, and with Shift ±1 year.
  - [x] Keeping the day of the month but clamping it to that month's length (for example 31 January + PageDown → 28 or 29 February).
  - [x] Moving past the visible month moves the view along with it.
- [x] In the month and year views, the arrow keys move around the 4×3 grid, and moving past its edge pages.
- [x] Enter and Space pick the focused cell, following the same rules as a click (select, go back down to the day or month view, or start or complete a range).
- [x] After switching view, focus lands on the matching cell: the focused month's cell, the focused year's cell, or the same day of the month clamped to that month's length.
- [x] Keyboard focus previews the range band while a draft range is open, the same way hover does.
- [x] Disabled cells can receive focus but can't be picked. Keyboard paging stops at the limits in 05 once that is merged.
- [x] Tests through the rendered Calendar with user-event:
  - [x] one tab stop
  - [x] each key in each view, across month and year boundaries and leap years
  - [x] Enter and Space picks in single and range mode
  - [x] focus after switching view
  - [x] the keyboard range preview
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-09-26 — ticket06 integrated after coordinator review

Applied only the approved nine-file ticket06 delta from `/tmp/opencode/calendar-keyboard-active` via `apply_patch`. Main's Calendar tree matches the reviewed implementation byte-for-byte. No staging or commits.

Integration evidence on main:

- `pnpm exec vitest run src/components/forms/Calendar`: **6 files / 126 tests passed**.
- `pnpm exec tsc --noEmit`: passed.
- Whitespace checked after integration.
- Reused unchanged implementation evidence rather than rerunning broad checks: `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed **18 files / 581 tests**. Standards/spec self-review completed before integration.
- Chromium previously verified Tab order, one grid stop, solid 2px focus outlines, four-column/three-row geometry, keyboard view transitions/edge paging, and range previews/completion. Evidence and detailed integration notes: `/tmp/opencode/calendar-06-verification.md`; script `/tmp/opencode/verify-calendar-06.mjs`; screenshot `/tmp/opencode/calendar-06-focus.png`.

Status remains **in_progress** pending ticket05's bounded keyboard paging and public disabled-cell verification. In `Calendar.tsx`, guard the destination period after `event.preventDefault()` in `onCellKeyDown` and before changing focus/navigation state. Disabled cells on an allowed page must remain focusable; preserve the existing CalendarCell activation guard. Header paging must guard both visible-month and focused-date updates.

Ticket07 can compose its public ref with the internal `focusedCellRef` route to the unique `tabIndex=0` cell. Preserve the focus-request effect; form/reset lifecycle remains ticket07-owned.

### 2026-09-26 — ticket05 bounds integration resolves the final item

Merged the approved ticket05 limits delta with `apply_patch`, preserving the integrated keyboard implementation. `onCellKeyDown` now prevents navigation only when the candidate is in a different displayed period and that period has no min/max overlap. Same-period disabled day/month/year cells remain focusable, even when updated bounds make the entire displayed page unavailable. Day predicates do not affect page availability. CalendarCell continues to suppress activation without native disabled, and header-bound rejection leaves both focus/navigation state intact.

Added 22 rendered Calendar integration cases: focus and Enter/Space/click rejection for disabled days/months/years; intra-page navigation on entirely unavailable pages; PageUp/PageDown and all directional edge-arrow stops in all views; Shift+PageUp/PageDown; permitted paging into partially available periods even when the focused cell is disabled; leap-year/month-length clamping; bounded header paging with preserved roving focus; and keyboard preview/completion across a disabled day. All existing ticket06 tests retained. Twelve initial integration cases were observed red before merging, then green.

Final main checks: `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed **18 files / 618 tests**; `pnpm exec tsc --noEmit` passed; tracked and untracked Calendar whitespace checks passed. Public Calendar file: **139 passing tests**. Standards/spec self-review found no remaining integration issues. Ticket05's comment records the helper interfaces and integration details. No staging or commits.

# 03: Calendar: month and year views with drill navigation

**What to build:** A user clicks the header title to go up from days to months and from months to years, then picks a year and a month to come back down to days. Only picking a day changes the value. Year pages are fixed 12-year blocks. Adds the CalendarMonthView and CalendarYearView subcomponents. Parent spec: `.scratch/calendar/spec.md` (Views and drilling, Year blocks).

**Blocked by:** 02 (Calendar: single-date day view)

**Status:** resolved

- [x] CalendarMonthView and CalendarYearView are created with the full file set and reuse CalendarCell. Both are 4×3 grids.
- [x] The header title is a button. In the day view it's named "Show months" and in the month view "Show years". In the year view it's disabled, or not a button.
- [x] The month view shows the year as its title and localised short month names. The month holding the value is filled Ink Blue.
- [x] The year view shows fixed 12-year blocks, where a block starts at a year with `(year − 2015) mod 12 = 0`. For example, 2026 falls in 2015–2026 and 2027 in 2027–2038. Years before 2015 follow the same rule (2003–2014). The title reads "2015 - 2026", and the year holding the value is filled Ink Blue.
- [x] Picking a year shows that year's months. Picking a month shows its days. Neither calls `onChange`.
- [x] The ‹ › arrows page by one year in the month view and one 12-year block in the year view. Their accessible names change to match: "Previous year" / "Next year" and "Previous 12 years" / "Next 12 years".
- [x] The header title is in a polite live region, so paging and view changes are announced.
- [x] The new labels are added to the en and es translation files.
- [x] Stories: Months (2026 with June selected, as in the mock) and Years (2015–2026 with 2026 selected, as in the mock). They open in those views through the story's own interaction or setup; Calendar gains no public prop to open in a view.
- [x] Tests through the rendered Calendar: title clicks switch views, blocks are aligned for 2026, 2027 and 2014, paging works in each view, picking goes back down without calling `onChange`, the view-specific names are correct, and Spanish month names are shown.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-09-26 — implemented, reviewed and integrated

Coordinator approved the controller/helper and ticket03 integration. Applied only the 17-file ticket03 delta from `/tmp/opencode/calendar-03` to main with `apply_patch`, after confirming all 25 seed hashes still matched. The integrated Calendar tree and en/es translations are byte-identical to the approved worktree. Selection state remains the seeded implementation for the parallel ticket04 integration.

Evidence:
- Targeted TDD observed red → green for month drilling, year drilling and Months/Years story setup. Public tests also cover selected/empty/controlled values, en/es names, navigation without `onChange`, four columns × three rows, and year-block alignment for 2026, 2027, 2014 and 2002.
- Implementation worktree: `pnpm lint` passed with zero warnings; `pnpm test:unit --run` passed (18 files, 507 tests); `pnpm exec tsc --noEmit` passed. Standards/spec self-review had no unresolved findings.
- Main integration: `pnpm exec vitest run src/components/forms/Calendar` passed (6 files, 52 tests); `pnpm exec tsc --noEmit` passed; `git diff --check` and an explicit whitespace check including untracked Calendar files passed.

Ticket05 is unblocked. `/tmp/opencode/calendar-03` is retained unchanged as the immutable wave baseline. Seed hashes and implementation evidence are recorded in `/tmp/opencode/calendar-03-baseline.md` and `/tmp/opencode/calendar-03-verification.md`. No staging, commits or pushes.

# 02: Calendar: single-date day view, end to end

**What to build:** The first working Calendar. A developer imports `Calendar` from `@/components/forms/Calendar` and a user picks one date from a month grid. The ‹ › arrows page by month, and names are localised in en and es. This ticket creates the folder skeleton that every later ticket builds on: the Calendar, CalendarHeader, CalendarCell and CalendarDayView components (each with the full file set), the pure date helper, and the index that exports only Calendar. Parent spec: `.scratch/calendar/spec.md`.

**Blocked by:** 01 (Button: icon-only `icon` variant)

**Status:** resolved

- [x] The folder follows the nested pattern used by Sidebar and OverflowMenu. Calendar, CalendarHeader, CalendarCell and CalendarDayView each have a component, story, test and index file, plus the constants file. Components use named exports, the shared `FunctionComponent` return type and `@/` imports. The folder index exports only `Calendar` and its public types (`CalendarProps`, `IsoDate`, `DateRange`).
- [x] Props are a discriminated union on `mode`, as the spec's type shape describes. This ticket implements only `mode` left out or set to `"single"`. `"range"` may be typed but doesn't need to work yet (ticket 04).
- [x] `value`, `defaultValue` and `onChange` use ISO date strings (`YYYY-MM-DD`). dayjs never appears in the public types.
- [x] The day view shows 7 column headers from Monday to Sunday and always 42 day cells (6 rows). Days from neighbouring months are shown in muted grey.
- [x] Weekend columns (Saturday and Sunday), both their headers and their days, use blue text.
- [x] Today has a subtle marker, separate from the selected look, and `aria-current="date"`. Tests fix the clock with fake system time.
- [x] Clicking a day calls `onChange` with its ISO date and marks it selected (Ink Blue fill, white text, `aria-selected`). Clicking a neighbouring-month day also moves the view to that month.
- [x] Hover shows light Porcelain and pressed shows dark Porcelain with white text. CalendarCell exposes each state so that later tickets can reuse it.
- [x] Controlled and uncontrolled use both work.
- [x] The first month shown is the value's month, else `defaultMonth`, else the current month.
- [x] The CalendarHeader shows the localised title (for example "June 2026"). The ‹ › buttons use Button's `icon` variant with the chevron icons and page by one month, including across year boundaries.
- [x] The dayjs `es` locale is loaded and the dayjs locale follows i18next's current language: "junio 2026" and Spanish weekday headers, with Monday still first.
- [x] The arrow labels ("Previous month" and "Next month") are added to the en and es translation files under a `calendar` group.
- [x] Roles: `grid`, `row`, `columnheader` (named by the full weekday) and `gridcell`. Each day's accessible name is its full localised date (for example "Wednesday, 10 June 2026").
- [x] The panel is about 288px wide with 36px cells, a white background, a 1px Neutral border and rounded corners, as in the mock (`.scratch/calendar/design/calendar-mock.png`). `className` is applied to the panel.
- [x] Stories: Days (10 June 2026 selected, as in the mock), No value, and Spanish. The subcomponent stories show each CalendarCell state.
- [x] Tests go through the rendered public Calendar: Monday-first headers, 42 cells, Weekend styling, today, single-date `onChange`, picking a neighbouring-month day, paging across December to January, leap Februaries, the first month shown, and Spanish names. Subcomponent tests stay thin (render with props, check roles and state). The date helper gets no test file of its own.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-09-26 — Ticket 02 integrated after coordinator approval

- Implemented and self-reviewed in `/tmp/opencode/calendar-02`; coordinator inspected the controller, date helper, cell, day view and public types and approved integration.
- Integrated only the 19-file `src/components/forms/Calendar/` tree and the `calendar` groups in the en/es translations using `apply_patch`. Main had no overlapping Calendar files or translation groups. Button was already integrated and was not edited.
- Verified the integrated Calendar tree matches the approved worktree exactly with `git diff --no-index`; verified Button still matches its seeded baseline.
- Main verification: `pnpm exec vitest run src/components/forms/Calendar` passed (4 files, 37 tests); `pnpm exec tsc --noEmit` passed; `git diff --check` passed.
- Prior isolated-worktree verification: lint passed with zero warnings; full unit suite passed (16 files, 492 tests); TypeScript passed. Those commands used `--config.verify-deps-before-run=false` because the isolated worktree links main's installed dependencies.
- Public-seam coverage includes controlled/uncontrolled single dates, Monday-first 42-cell layout, visual/ARIA states, adjacent-month selection, year boundaries, leap-year and century cases, initial-month precedence, en/es language switching, union types and story renders. Subcomponent tests remain thin; no helper test file.
- Selection and displayed month are independent state for tickets 03/04. Range behavior, additional views, limits, roving keyboard focus and form integration remain assigned to subsequent tickets.
- Browser visual review was not performed. Designer approval of the today marker and native-speaker Spanish review remain pending as noted in the handoff. No files were staged or committed.

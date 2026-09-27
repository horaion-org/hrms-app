# Spec: Calendar

Status: ready-for-agent

## Problem Statement

The Horaion design includes a panel for choosing dates. It has a header with the period title and previous/next arrows, and three views: a month of days, the twelve months of a year, and a block of twelve years. Scheduling and Leave both need people to pick a single date or a Date range, such as the first and last day of a leave request. The codebase has no such component. `dayjs` is installed but unused, and Headless UI, the foundation for popup controls, has no calendar primitive.

Without a shared **Calendar**, each screen would build its own date grid. Week layout, weekend colouring, keyboard support, localisation and date handling would drift, and timezone bugs could move a chosen day by one.

## Solution

Add a reusable **Calendar** (see `CONTEXT.md`) to the shared forms components. It is an always-visible panel that selects either a single date or a **Date range**, set by a `mode` prop.

Users browse by day, and click the header title to move up to months and then to years. Picking a year moves back down to months, and picking a month moves down to days. Only picking a day changes the value.

Dates cross the public interface as plain ISO date strings with no time or timezone. The grid is built in-house on the WAI-ARIA date-grid pattern, with dayjs doing the date maths (see `docs/adr/0002-hand-rolled-calendar-on-dayjs.md`).

The **Date picker**, a field that opens the Calendar in a popup, comes later and wraps this component.

## User Stories

1. As a developer, I want a shared Calendar, so that I stop building one-off date grids.
2. As a developer, I want to import Calendar through the `@/` alias from the shared forms components, so that it follows the shared import convention.
3. As a developer, I want single-date mode by default and Date range mode with `mode="range"`, so that one component covers both.
4. As a developer, I want `value` and `onChange` typed as an ISO date string in single mode and as `{ start, end }` in range mode, so that the compiler catches mode mismatches.
5. As a developer, I want dates as `YYYY-MM-DD` strings, not `Date` or dayjs objects, so that a chosen day never shifts across timezones and my code doesn't depend on dayjs.
6. As a developer, I want `defaultValue` for uncontrolled use, so that simple forms need no state.
7. As a developer, I want `name` to submit the value with a native form, so that Calendar works without a form library.
8. As a developer, I want range mode to submit `name[start]` and `name[end]`, so that a server receives both ends.
9. As a developer, I want `ref` to reach the grid's focusable cell, so that React Hook Form can focus the Calendar on a validation error.
10. As a developer, I want to connect Calendar to React Hook Form through `Controller`, so that form wiring matches Select.
11. As a developer, I want `onChange` in range mode to fire only when both ends are chosen, so that I never handle a half-finished range.
12. As a developer, I want `minDate` and `maxDate`, so that I can limit choices to a window such as the current leave year.
13. As a developer, I want an `isDateDisabled(date)` callback, so that I can block individual days such as public holidays or blackout dates.
14. As a developer, I want `defaultMonth` to choose the month shown first, so that I can open on a relevant period when there's no value.
15. As a developer, I want `className` to override the panel width, so that I can fit the Calendar into a wider layout.
16. As a developer, I want `aria-label` or `aria-labelledby`, so that the Calendar has an accessible name in context.
17. As a user, I want to see a month as a grid of days under Monday-to-Sunday labels, so that I can find a date by its weekday.
18. As a user, I want weekend days and their labels in blue, so that I can tell working days from the Weekend at a glance.
19. As a user, I want today marked subtly, so that I can orient myself without confusing it with my selection.
20. As a user, I want my selected day filled in Ink Blue, so that my choice is obvious.
21. As a user, I want a light Porcelain highlight on hover and dark Porcelain while pressing, so that I know what I'm about to pick.
22. As a user, I want days from the previous and next months shown in grey, so that each week row is complete.
23. As a user, I want to click a grey day from a neighbouring month and have the Calendar move to that month, so that I can cross month boundaries quickly.
24. As a user, I want the day grid to always have six rows, so that the panel doesn't change height as I page.
25. As a user, I want the ‹ and › arrows to move by one month, one year or one twelve-year block depending on the view, so that one pair of controls always pages.
26. As a user, I want to click the header title to switch from days to months and from months to years, so that I can jump far without clicking many times.
27. As a user, I want picking a year to show that year's months and picking a month to show its days, so that I can drill back down to a date.
28. As a user, I want year pages in fixed twelve-year blocks (for example 2015–2026, then 2027–2038), so that the pages always look the same.
29. As a user, I want the selected month and year filled in Ink Blue in their views, so that I can see where my value is.
30. As a user, I want the Calendar to open on the month of my selected date or range start, or on the current month when nothing is selected, so that I start where I need to be.
31. As a user picking a Date range, I want my first click to set the start and my second to set the end, so that picking a range takes two clicks.
32. As a user picking a Date range, I want the days between the start and my pointer previewed before the second click, so that I can see the range I'm about to choose.
33. As a user picking a Date range, I want the start and end swapped if I click an end before the start, so that I can't make a backwards range.
34. As a user picking a Date range, I want a third click to start a new range, so that I can easily start over.
35. As a user, I want the range's start and end filled in Ink Blue with a continuous light Ink Blue band between them, so that I can see the whole range.
36. As a user, I want a range to be able to span disabled days, so that a leave request can cross a public holiday.
37. As a user, I want disabled days, months and years greyed out and unclickable, so that I don't try to choose them.
38. As a user, I want an arrow disabled when the next or previous page has nothing I can pick, so that I don't page into dead ends.
39. As a user, I want month and weekday names in my language, such as "junio 2026" and "lun" in Spanish, so that the Calendar reads naturally.
40. As a keyboard user, I want to Tab into the grid once and move within it with the arrow keys, so that the grid is one tab stop.
41. As a keyboard user, I want the arrow keys to move by day and week, Home and End to go to the start or end of the week, and PageUp/PageDown to change month (with Shift, year), so that I can reach any date quickly.
42. As a keyboard user, I want the arrow keys to move around the four-by-three month and year grids, so that those views are keyboard-accessible too.
43. As a keyboard user, I want Enter or Space to pick the focused cell, so that I don't need a mouse.
44. As a keyboard user, I want focus to land on the matching cell when I switch between days, months and years, so that I don't lose my place.
45. As a keyboard user, I want keyboard focus to preview a Date range the same way hovering does, so that I get the same feedback without a mouse.
46. As a keyboard user, I want arrow keys to land on disabled days as well, so that I can still read them even though I can't pick them.
47. As a screen-reader user, I want grid, row, column-header and cell roles, with each day labelled by its full date (for example "Wednesday, 10 June 2026"), so that I know which date I'm on.
48. As a screen-reader user, I want selected, today and disabled states announced, so that I know each day's status.
49. As a screen-reader user, I want the header title announced when the period changes, so that I know where paging took me.
50. As a screen-reader user, I want the arrows and the title button to have clear names, such as "Previous month" or "Show years", so that I know what they do.
51. As a touch user, I want cells large enough to tap reliably, so that I don't pick the wrong day.
52. As a designer, I want Storybook stories for every view and state, so that I can review them against the mock.
53. As a maintainer, I want the Calendar split into the header, the cell and the three views, each with its own file set, so that each piece is easy to find and review.
54. As a maintainer, I want the icon-only arrow buttons to be a Button variant, so that icon buttons don't get re-implemented elsewhere.

## Implementation Decisions

- **Name and location:** the component is called Calendar, the glossary term, and lives in the shared forms components next to Select. It has nested subcomponents, following the Sidebar and OverflowMenu folder pattern. Each gets the full file set: component, story, test and index. Creating them was approved under the CLAUDE.md component gate:
  - **Calendar:** the public component. It owns the mode, value, draft range, visible view, visible period and focused date.
  - **CalendarHeader:** the ‹ title › row. The title is a button that moves up a level. It is disabled in the year view.
  - **CalendarCell:** one cell used by all three views. It shows the states default, Weekend, outside month, disabled, selected, today, hover, pressed, range start, range middle and range end.
  - **CalendarDayView:** the weekday column headers and the 6×7 grid of days. Weekday labels are table headers inside this view, not their own component.
  - **CalendarMonthView:** a 4×3 grid of months.
  - **CalendarYearView:** a 4×3 grid of years.
- **Public export:** only Calendar and its prop and value types are exported through the folder's index.
- **Date logic:** building the day grid, finding the twelve-year block, checking limits and deciding whether an arrow can page live in one pure helper module inside the Calendar folder. It uses dayjs and never leaks it through the public interface.
- **Foundation:** the grid is hand-rolled on the WAI-ARIA date-grid pattern, with no new dependency. See ADR 0002. ADR 0001 still governs popups, so the future Date picker uses Headless UI's Popover.
- **Props:** a discriminated union on `mode`:

  ```ts
  type IsoDate = string; // "YYYY-MM-DD"
  type DateRange = { start: IsoDate; end: IsoDate };

  type SharedProps = {
    minDate?: IsoDate;
    maxDate?: IsoDate;
    isDateDisabled?: (date: IsoDate) => boolean;
    defaultMonth?: IsoDate; // any day in the month to show first
    name?: string;
    className?: string;
    ref?: Ref<HTMLElement>; // reaches the focusable grid cell
    "aria-label"?: string;
    "aria-labelledby"?: string;
  };

  type CalendarProps = SharedProps &
    (
      | { mode?: "single"; value?: IsoDate | null; defaultValue?: IsoDate | null; onChange?: (value: IsoDate) => void }
      | { mode: "range"; value?: DateRange | null; defaultValue?: DateRange | null; onChange?: (value: DateRange) => void }
    );
  ```

- **Week and Weekend:** the week always starts on Monday, and Saturday and Sunday are the Weekend. This doesn't change with locale.
- **Day view:** always 6 rows of 7 days. Days from neighbouring months appear in grey but can be selected, and picking one also moves to that month. Weekend days and their column headers use blue text. Today gets a subtle marker, separate from the selected look, and `aria-current="date"`.
- **Views and drilling:** the header title moves up a level, from days to months to years. Picking a year goes down to the month view, and picking a month goes down to the day view. Only picking a day changes the value.
- **What the arrows page by:** one month in the day view, one year in the month view, and one twelve-year block in the year view.
- **Year blocks:** fixed twelve-year blocks aligned so that 2015–2026 is one block. A block starts at a year where `(year − 2015) mod 12 = 0`, and this also holds for years before 2015. The header title reads "2015 - 2026".
- **Initial month:** the selected date's month, or in range mode the start's month. Failing that, `defaultMonth`, and failing that, the current month. The Calendar always opens in the day view.
- **Single mode:** picking a selectable day calls `onChange` with its ISO date and marks it selected.
- **Range mode:**
  - The first pick starts a draft range, which lives only in internal state.
  - The second pick completes it. If the second date comes before the first, the two are swapped. `onChange` then fires once with `{ start, end }`, and a range where start equals end is allowed.
  - Picking again after a complete range starts a new draft.
  - While a draft is open, the pointer or the keyboard-focused day previews the band.
  - Only the start and end must be selectable. Disabled days inside the range are allowed and keep their disabled look within the band.
- **Limits:** a day can't be picked if it falls before `minDate`, after `maxDate`, or `isDateDisabled` returns true for it.
  - A month is disabled when none of its days is within `minDate`–`maxDate`, and a year is disabled when none of its months is. `isDateDisabled` doesn't disable months or years.
  - Disabled cells use `aria-disabled` and can still receive focus, so a screen reader can read them, but they can't be picked.
  - An arrow is disabled when the previous or next page contains nothing within the limits, and keyboard paging stops at the limits too.
- **Keyboard:**
  - The grid is one tab stop with roving focus, and the header buttons come before it in Tab order.
  - In the day view:
    - The left and right arrows move ±1 day, and up and down move ±1 week.
    - Home and End go to Monday or Sunday of that week.
    - PageUp and PageDown move ±1 month, and with Shift they move ±1 year.
    - Moving focus past the visible month moves the view along with it.
  - In the month and year views, the arrow keys move around the 4×3 grid.
  - Enter or Space picks the focused cell.
  - After switching view, focus lands on the matching cell: the focused month's cell, the focused year's cell, or the same day of the month clamped to that month's length.
- **Accessibility:**
  - The day view uses `grid`, `row`, `columnheader` and `gridcell` roles. Column headers carry the full weekday name as their accessible name.
  - Each day's accessible name is its full localised date.
  - Selected cells use `aria-selected`, and range cells describe their role (start, end, within).
  - The header title is in a polite live region, so paging is announced.
  - The arrows are named by view, for example "Previous month", "Next year" and "Previous 12 years". The title button is named "Show months" or "Show years".
- **Localisation:** month and weekday names, day labels and the header title come from dayjs locales. The `es` dayjs locale is loaded, and the dayjs locale follows i18next's current language. Only the Calendar's own action labels (the arrows and the title button) go in the `en` and `es` translation files.
- **Form integration:**
  - The Calendar works controlled or uncontrolled, like Select.
  - With `name`, it renders hidden inputs: `name` in single mode, and `name[start]` and `name[end]` in range mode. A draft range submits nothing.
  - A native form reset restores `defaultValue`.
  - `ref` reaches the grid cell that currently holds the roving tab stop.
- **Button change:** Button gains an `icon` variant: a square, transparent button holding only an icon, in Neutral with an Ink Blue hover. It keeps the shared focus ring and disabled look. The variant is typed so that an accessible name (`aria-label` or `aria-labelledby`) is required. The Calendar header arrows use it.
- **Visual:**
  - The panel is about 288px wide with 36px cells, a white background, a 1px Neutral border and rounded corners, as in the mock. `className` can widen it.
  - Selected cells and range ends are square-rounded Ink Blue with white text. Hover is light Porcelain and pressed is dark Porcelain with white text.
  - The range middle is a continuous light Ink Blue band. Outside-month and disabled cells use muted Neutral text.
  - The month and year views use the same states, apart from Weekend.

## Testing Decisions

- **One behaviour seam (confirmed with the user):** the rendered public Calendar, tested with Testing Library and user-event in Vitest.
  - Tests check roles, accessible names, `aria-selected`, `aria-current`, `aria-disabled`, the header text, callbacks, hidden form inputs and state classes. They never check the date helper or the internal state.
  - Today is fixed with fake system time, and the en/es i18n setup is copied from Select's test.
  - The date helper has no test file of its own. Leap years, year boundaries, 12-year block alignment and limits are all tested through rendered cells.
- **Subcomponent tests:** the file set required for each nested subcomponent includes a test. These stay thin: each renders its component with props and checks the resulting roles, text and states. They don't repeat Calendar's behaviour tests.
- **Button:** the `icon` variant is covered in Button's existing test (accessible name, disabled, and className passthrough).
- **Prior art:** Select's test (the i18n instance per language, React Hook Form `Controller`, hidden inputs, `composeStories` for story smoke tests, `expectTypeOf` for the mode union). Button's test, for rendering by role.
- **Not tested in jsdom:** exact pixel sizes, colours and how the band looks across week rows. These are reviewed in Storybook.
- **What to cover:**
  - The day view for June 2026 shows Monday-first headers, 42 cells, the neighbouring-month days, and blue Weekend columns.
  - Today has `aria-current="date"`. A value or `defaultValue` opens on its month, and no value opens on today's month or `defaultMonth`.
  - The ‹ and › arrows move the month, and the title updates.
  - Titles are right across year boundaries (December → January) and leap Februaries.
  - Clicking the title shows the months and then the years. The 12-year block for 2026 is 2015–2026, and blocks page by 12 in both directions, including before 2015.
  - Picking a year shows its months, and picking a month shows its days, with no `onChange` call.
  - Single mode: clicking a day calls `onChange` with its ISO date and marks it selected. Clicking a neighbouring-month day also moves to that month.
  - Range mode:
    - The first click doesn't call `onChange`, and the second calls it once with `{ start, end }`.
    - A reversed pick is swapped, and a same-day range is allowed.
    - A third click starts a new draft.
    - The hover and keyboard previews mark the days in between.
    - A range may cross an `isDateDisabled` day.
  - Limits: days outside `minDate`/`maxDate`, or rejected by `isDateDisabled`, can't be picked and are `aria-disabled`. Months and years with no days in range are disabled. Arrows are disabled at the bounds.
  - Keyboard: one tab stop; the arrow keys, Home/End and PageUp/PageDown (with and without Shift) move to the expected dates across month boundaries; Enter and Space pick; focus lands on the matching cell after switching view.
  - Accessible names: full-date cell names, weekday column headers, and view-specific arrow and title-button names in both en and es.
  - Spanish: "junio 2026", Spanish weekday headers, and the week still starts on Monday.
  - Forms:
    - `name` renders hidden inputs, `name` in single mode and `name[start]`/`name[end]` in range mode, and a draft range submits nothing.
    - A native form reset restores `defaultValue`.
    - `ref` reaches the focusable cell, and a React Hook Form `Controller` example submits and focuses the Calendar on error.
  - Types: `expectTypeOf` shows single mode rejects a `DateRange` value and range mode rejects a string.
  - Every Storybook story renders without errors.
- **Stories:**
  - Days (the mock's state, with 10 June 2026 selected), Months, Years and No value.
  - Range, Draft range, a range across a disabled day, and Min/max.
  - Disabled dates (Weekends disabled through `isDateDisabled`), Spanish, and a React Hook Form example.
  - Controls for `mode`, `minDate` and `maxDate`.
- **Checks:** `pnpm lint` (zero warnings) and `pnpm test:unit` must pass. `pnpm build` and the Storybook build should also pass.

## Out of Scope

- The **Date picker**: a text field plus a Headless UI Popover around the Calendar. It gets its own spec next.
- Several separate dates, or choosing a whole month or year as the value. Month and year views only navigate.
- Showing two months side by side for ranges.
- Time selection and timezones.
- A week start or Weekend that depends on locale or organisation.
- Preset ranges such as "This week" or "Last 30 days", and a clear or "today" button.
- Holiday data. Callers supply it through `isDateDisabled`.
- Moving existing screens over to the Calendar.
- Playwright visual regression tests.

## Further Notes

- The mock is a PNG export in the design folder beside this spec. It shows the header, a weekday label, the day-cell and month-cell states, and the three views with 10 June 2026 selected.
- These states were decided in the grilling session, not taken from the mock. A designer needs to confirm them:
  - the today marker
  - the range band and range ends
  - the disabled year cells
  - the icon-button hover
- Reading of the mock's six day-cell states, confirmed with the user, from left to right: default, Weekend (blue), outside month or disabled (grey), selected (Ink Blue), pressed (dark Porcelain), hover (light Porcelain). The month cells use the same states without Weekend.
- The mock's June 2026 happens to need only five rows. The fixed six-row grid is a deliberate choice so that the panel height stays stable.
- A native speaker still needs to review the Spanish, as with Select.
- Glossary: **Calendar**, **Date picker**, **Date range** and **Weekend** were added to `CONTEXT.md` under "Controls". ADR 0002 records the hand-rolled grid decision.

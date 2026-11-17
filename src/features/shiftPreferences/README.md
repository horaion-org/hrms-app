# Shift preferences

The shifts a member would like on a day, and what a roster made of them. Every member states their own, a week at a
time, through `/companies/{c}/me/shift-preferences` with nothing granted; a Branch's or Department's members are
read through `shift_preference:read`, and one member's week is read and a day of it replaced through
`/companies/{c}/member-profiles/{membershipId}/shift-preferences` (`shift_preference:update` for the write, ADR-0127 of
the API). They are weighed when a roster is generated, never promised. The parts are
shown on their own `/shift-preferences` route (`src/pages/ShiftPreferences.tsx`, in everyone's menu): **My
preferences** for everyone, and **Team** for holders of the read key, listing the header's Branch and the Department
chosen in Filters. A part-timer is warned of the open days they have no availability on (read from
`features/availability`), since they are never scheduled on them. Everything comes from the API
(`features/shiftPreferences/api.ts`); nothing is kept in page state beyond the open day and the list's page.

## Shape

- `api.ts` — the zod schemas, the caller's week (`myPreferenceWeekQuery`) and the replacing of one of its days, a
  Branch's or Department's members for one week a page at a time (`teamPreferencesQuery`, `TEAM_PAGE_SIZE`; a removed member's
  name is null), one member's week (`memberPreferenceWeekQuery`, the own week's shape) and the replacing of one of its
  days, and the shape of a roster's outcomes, all under `shiftPreferencesRoot`,
  `["shiftPreferences", companyId]`.
- `useShiftPreferences.ts` — `useMyPreferenceWeek`, `useTeamPreferences` (`hidden` when the read key is held
  nowhere or the API refuses with a 403: the one place that decides access) and `useReplaceMyPreferenceDay`, which
  reads only that week again; `useMemberPreferenceWeek` and `useReplaceMemberPreferenceDay`, which reads that member's
  week and every team page again.
- `preferenceLimit.ts` — the pure rules of a day's limit: which shifts are chosen, whether another may be, and the
  set after a tap.
- `preferenceOutcome.ts` — what a roster made of a preference, without rendering: each outcome's Badge tone and
  words, a reason's words, the preferred shifts as one phrase ("Morning or Late"), and a lookup by person and day.
- `shiftPreferenceRefusal.ts` — API codes to frontend-owned copy for a refused save, of the caller's own day or a
  member's (a member no longer in reach is said apart).
- `shiftPreferencesSearch.ts` — what belongs in the page's URL (`view`, `branch`, `department`, `week` as its
  Monday, `day`), the tabs a person has, and the team view's unit rules for the header.
- `availabilityGaps.ts` — the open days of a week that fall on a weekday with no availability, for a part-timer's
  warning.
- `PreferredShiftsCell` — one day of a week grid: a `Chip` per preferred shift, keyed by shift id, or the icon set's
  minus read as "No preference"; the whole cell is one button when the day can be changed.
- `MyShiftPreferences` — the caller's week as a one-row `WeekGrid`, with a note when the week has ended or some days
  are outside today to eight weeks ahead, and, for a part-timer, a warning naming the open days without
  availability; an open day opens `ShiftPreferenceDialog`, which saves straight away.
- `ShiftPreferenceDialog` — one day's choosable shifts as boxes, with the count against the day's limit and the
  day's availability warning when given.
- `MemberShiftPreferencesDialog` — a colleague's week as a list of days, opened from the team list; an open day opens
  `ShiftPreferenceDialog` in place of the week, which saves straight away through the member's routes.
- `TeamShiftPreferences` — a Branch's or Department's members and their week under its own heading, with an edit
  control on each row the page says may be changed (opening `MemberShiftPreferencesDialog`), paged; the page starts again at the first when the Branch, Department or week changes.
- `fixtures.ts` — API-shaped weeks, team pages and outcomes for stories and component tests.

A roster's outcomes are read on the roster's side (`features/scheduling/preferenceOutcomes`) and shown in the roster
cell panel (`CellNow`) and `ShiftDetailsPanel`.

## Permissions

A member's own week needs nothing granted. The team list needs `shift_preference:read` somewhere; the API lists
only the members of the units where it is held and checks every request regardless. A row's edit control shows when
the week has not ended, the member has not been removed, and `shift_preference:update` is held where the member is
filed: their Department, or the company for a member filed at none (`recordScope`), as availability decides it.

## Verification

```sh
pnpm lint
pnpm test:unit --run src/features/shiftPreferences
pnpm build
```

# Shift preferences

The shifts a member would like on a day, and what a roster made of them. Every member states their own, a week at a
time, through `/companies/{c}/me/shift-preferences` with nothing granted; a Department's members are read through
`shift_preference:read`. They are weighed when a roster is generated, never promised. The parts are shown on the
`/availability` route (`src/pages/Availability.tsx`): a **Shift preferences** tab for everyone, and a chosen
Department's list beneath the **Team** grid. Everything comes from the API (`features/shiftPreferences/api.ts`);
nothing is kept in page state beyond the open day and the list's page.

## Shape

- `api.ts` — the zod schemas, the caller's week (`myPreferenceWeekQuery`) and the replacing of one of its days, a
  Department's members for one week a page at a time (`teamPreferencesQuery`, `TEAM_PAGE_SIZE`; a removed member's
  name is null), and the shape of a roster's outcomes, all under `shiftPreferencesRoot`,
  `["shiftPreferences", companyId]`.
- `useShiftPreferences.ts` — `useMyPreferenceWeek`, `useTeamPreferences` (`hidden` when the read key is held
  nowhere or the API refuses with a 403: the one place that decides access) and `useReplaceMyPreferenceDay`, which
  reads only that week again.
- `preferenceLimit.ts` — the pure rules of a day's limit: which shifts are chosen, whether another may be, and the
  set after a tap.
- `preferenceOutcome.ts` — what a roster made of a preference, without rendering: each outcome's Badge tone and
  words, a reason's words, the preferred shifts as one phrase ("Morning or Late"), and a lookup by person and day.
- `shiftPreferenceRefusal.ts` — API codes to frontend-owned copy for a refused save.
- `PreferredShiftsCell` — one day of a week grid: a `Chip` per preferred shift, keyed by shift id, or the icon set's
  minus read as "No preference"; the whole cell is one button when the day can be changed.
- `MyShiftPreferences` — the caller's week as a one-row `WeekGrid`, with a note when the week has ended or some days
  are outside today to eight weeks ahead; an open day opens `ShiftPreferenceDialog`, which saves straight away.
- `ShiftPreferenceDialog` — one day's choosable shifts as boxes, with the count against the day's limit.
- `TeamShiftPreferences` — a Department's members and their week, read-only, under its own heading, paged; the page
  starts again at the first when the Department or week changes.
- `fixtures.ts` — API-shaped weeks, team pages and outcomes for stories and component tests.

A roster's outcomes are read on the roster's side (`features/scheduling/preferenceOutcomes`) and shown in the roster
cell panel (`CellNow`) and `ShiftDetailsPanel`.

## Permissions

A member's own week needs nothing granted. The team list needs `shift_preference:read` somewhere; the API lists
only the members of the units where it is held and checks every request regardless.

## Verification

```sh
pnpm lint
pnpm test:unit --run src/features/shiftPreferences
pnpm build
```

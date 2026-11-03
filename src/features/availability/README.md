# Availability

The authenticated `/availability` route: the hours part-time members can work, as a weekly default pattern and,
for any week from this one on, an override in its place (ADR-0053 of the API). Two tabs, offered from data and
never from roles. **Mine** is a part-timer's own week and pattern, read and changed through
`/companies/{c}/me/availability` with nothing granted. **Team** is a Branch's part-timers for one week, read
through the person's grants, with editing on the rows they may change. Everything comes from the API
(`features/availability/api.ts`); nothing is kept in page state beyond the open editor.

## Shape

- `api.ts` — the zod schemas, the reads and writes of a pattern and of one week for a member or the caller
  (`AvailabilityOwner`), the company's list of part-timers for one week inside one Branch (`availabilityListQuery`, `GET /companies/{c}/availability`), a Department's readiness for the Schedule
  wizard, and every query's options, all under `availabilityRoot`, `["availability", companyId]`, as leave roots its own.
- `availabilitySearch.ts` — what belongs in the URL (`view`, `branch`, `department`, `week` as its Monday), the
  tabs a person has, and the list asked for (`availabilityQueryOf`). A week left out is the one today is in, worked out on every render, so a page left open
  across a Monday moves on.
- `availabilityModel.ts` — the pure rules: windows by day (`byDay`, and `windowsByDay` for a week's dated windows),
  the editor's rows and their validation (overlaps on the week as a circle, at most four starts a day), what the
  editor opens on (`defaultEditTarget`), whether a week has ended (`isPastWeek`), dated windows as weekly ones.
- `useAvailability.ts` — `useAvailabilityViews` (the tabs, for the page and the sidebar), the read hooks
  (`useMyAvailability`, `useMemberAvailability`, `useAvailabilityList`, each with `useLeaveRequests`'
  `pending`/`error`/`hidden`/`ready` states) and the writes for a member or the caller, each reloading every
  availability entry of the company.
- `availabilityRefusal.ts` — API codes to frontend-owned copy, on the editor's rows or as its alert.
- `WeekGrid` — a week laid out as the roster lays one out: a column per day with its weekday and date, a row each,
  every day's windows as chips. Its parts, each a quad of its own: `WeekGridRow` (an optional heading, seven
  cells, an optional action), `AvailabilityCell` (one day: its chips, or a muted dash read as "Not available") and
  `WindowChip` ("09:00–13:00"). Shared by both tabs.
- `MyAvailability` — the caller's week as a one-row `WeekGrid`, "Custom" when it has hours of its own, a warning
  when nothing is set, and one Edit. A week that has ended is shown with a note and no Edit.
- `TeamAvailability` — a `WeekGrid` row per part-timer (name, their Department when no Department is chosen,
  "Custom" for an overridden week) with an edit button on the rows the person may change.
- `AvailabilityDialog` — the one editor: "This week only" / "Every week" (`RadioCard`s) at the top, then rows of
  windows on any days; "Not available this week" and "Reset to default" for the week. It opens on the week when it
  has hours of its own, on every week when nothing is set at all, otherwise on the week; choosing the other shows
  what is saved for it.
- `MemberAvailabilityDialog` — the editor for a colleague: a week on the pattern is the pattern, so it is read only
  for an overridden week, and "Every week" waits for it (or stays off when it can't be read).
- `fixtures.ts` — API-shaped rows and patterns for stories and component tests.

`src/pages/Availability.tsx` composes them and owns the tabs, the selectors, the week (the shared
`components/ui/WeekNavigator`: previous, next, "This week" and the dates; any week can be read, and editing is
offered only from this week on) and the colleague's editor. The
Schedule wizard's warning about part-timers without availability is `scheduling/PartTimeReadinessCallout`, fed by
`partTimeReadinessQuery`.

## Permissions

The sidebar offers the Module to a part-timer (from their own profile's employment type) and to anyone holding
`work_availability:read` anywhere; nobody else sees it. Mine needs nothing granted. Team appears with the read key
held anywhere and offers the Branches where it is held at the Branch or a Department beneath it; the API lists only
the part-timers of the units where it is held, so a Department-only grant lists that Department. Editing a row needs
`work_availability:update` at that member's Department (or the company, for a member filed at none). The API
checks every request regardless.

## Verification

```sh
pnpm lint
pnpm test:unit --run src/features/availability src/common
pnpm build
```

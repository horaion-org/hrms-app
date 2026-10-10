# Scheduling

The Create Schedule steps at `/scheduling/new` (Setup, Shifts, Constraints, Forecast, Generate). Completing Setup
creates the schedule on the API as a DRAFT, and from then on the URL names it with its department
(`?step=…&scheduleId=…&departmentId=…`), so a refresh or a link reopens the same draft. A schedule owns its shifts,
which are read and changed under their own `shift` keys and routes. The page ticks the shifts the API keeps as
included once they load and keeps the ticks until Save Draft sends them; constraints, allocations and demand stay in
the page until their API exists, and Generate stays disabled.

## Shape

- `paths.ts` — the department and schedule paths every scheduling request is built from, and the query root
  (`["scheduling", companyId, …]`).
- `schedules/api.ts` — the zod schema and requests for a schedule's setup (create, read, replace), at the
  department's routes. It knows nothing of shifts.
- `schedules/useSchedule.ts` — `useSchedule` (`hidden` when `schedule:read` is held nowhere or the API refuses,
  `missing` on a 404 or an unknown id) and `useScheduleActions`, whose saves cache the answer and reload every
  scheduling query of the company.
- `schedules/scheduleRefusal.ts` — the schedules API's codes to frontend-owned copy, on a setup field or as one
  message.
- `schedules/fixtures.ts` — an API-shaped draft (`s-1`), for stories and tests.
- `shifts/api.ts` — the shift schema and the shift requests under a schedule (list, create, replace, delete, and
  setting which are included, which answers with the whole list); `shiftsQuery` is cached under
  `["scheduling", companyId, "schedules", scheduleId, "shifts"]`, below the schedule's own key.
- `shifts/useShifts.ts` — `useShifts` (`hidden` when `shift:read` is held nowhere or the API refuses), like
  `useLeaveRequests`.
- `shifts/useShiftActions.ts` — the shift mutations, including `includeShifts`; each success reloads the shifts.
- `shifts/shiftRefusal.ts` — API codes to frontend-owned copy, on a field or as one message (adding, editing,
  deleting, and saving the inclusion).
- `shifts/shiftColours.ts` — the twenty colours a shift may be given, in the picker's order.
- `shifts/fixtures.ts` — API-shaped shift rows for stories and component tests; `scheduleShiftsFixture` is s-1's
  list with `INCLUDED_SHIFT_IDS` included.
- `shifts/ShiftDialog` — add or change a shift of the schedule: name, group (`Combobox` with its create row; a
  group is a plain name), colour (`SwatchPicker`), start and end time, days and roles (`Select` with its select-all
  row).
- `shifts/ShiftsStep` — the schedule's shifts under a tab per group (`Tabs`: "All" plus one per group, with counts),
  ticking what the schedule includes.
- `scheduleDraft.ts` — what the page holds: the setup, the saved draft (id and department, which never changes),
  the included shift and constraint ids, the allocations per shift and job title, and the demand per time slot;
  plus the stand-in constraints. `fromSchedule` rebuilds the setup and the saved draft from a schedule the API
  answers; `shiftsLoaded` ticks the included shifts from the first list after that, and later lists keep the ticks.
  `TIME_STEP_MINUTES` is the one grain shift times and demand slots share.
- `ConstraintsStep`, `ForecastStep`, `GenerateStep`, `ScheduleSetupStep`, `StepActions` — the other steps;
  `ShiftAllocationTable` and `TimeBlockGrid` are the two forecast views.

`src/pages/CreateSchedule.tsx` composes the steps and owns the draft, the saves and the shift dialog.

## Draft flow

1. Setup, no draft yet: Next `POST`s the setup fields to the chosen department's schedules and opens Shifts with the
   new `scheduleId` in the URL.
2. Setup with a draft: the department is shown but fixed; Next `PUT`s the setup fields.
3. A step after Setup without both `scheduleId` and `departmentId` returns to Setup (one without the other counts as
   neither). With both the page takes the branch from the department among the active ones it lists, loads the
   draft and starts from its setup, then lists its shifts (`GET …/schedules/{s}/shifts`) and ticks the `included`
   ones; while the draft loads, or when it can't be shown (unknown department or schedule, or no permission), the
   page says so under Back to Overview.
4. Shifts: Add, Edit and Delete write under the schedule; a new shift comes back included. Next needs at least one
   included shift. Without `shift:read` the step says the shifts are hidden.
5. Save Draft, on every step after Setup, `PUT`s the setup, then, when the ticks differ from what the API keeps,
   `PUT …/shifts/inclusion` with the ticked ids; each only when the person may make it.

## Permissions

All held at the schedule's department: `schedule:read` reads a draft; `schedule:create` creates one;
`schedule:update` saves its setup (without it Next on Setup moves on without saving). `shift:read` lists its shifts;
`shift:create` offers Add, `shift:update` Edit and saving the ticks, `shift:delete` Delete. Save Draft shows with
`schedule:update` or `shift:update` and sends only what is held. Ticking itself stays open to anyone who sees the
shifts, since the later steps read the ticks from the page. The API checks every request regardless.

## Verification

```sh
pnpm lint
pnpm test:unit --run src/features/scheduling src/pages
pnpm build
```

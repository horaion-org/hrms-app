# Scheduling

The Create Schedule steps at `/scheduling/new` (Setup, Shifts, Constraints, Forecast, Generate). Completing Setup
creates the schedule on the API as a DRAFT, and from then on the URL names it with its department
(`?step=…&scheduleId=…&departmentId=…`), so a refresh or a link reopens the same draft. Shifts belong to the
department: one live set per department, changed under their own `shift` keys and routes, and a draft only remembers
which of them are ticked. Generating a draft freezes the ticked shifts into it; a generated schedule always shows the
shifts it was generated with. The contract is §2.4 of the API's `docs/implementation/2026-10-11-shifts-module.md`.
Constraints, allocations and demand stay in the page until their API exists.

## Shape

- `paths.ts` — the department, shift and schedule paths every scheduling request is built from, and the query root
  (`["scheduling", companyId, …]`).
- `departmentUnit.ts` — the Branch and Department a route names, for a Department the workspace offers under the
  given keys; nothing for one out of reach.
- `shifts/api.ts` — the live shift schema and requests at the department's routes (create, replace, delete) and the
  role options (`shift-role-options`: the department's ACTIVE job titles, read under `shift:read`, so a shift editor
  never needs `job_title:read`).
- `shifts/useShiftActions.ts` — the shift mutations; each success reloads every scheduling query of the company,
  since a live shift shows in every draft of its department.
- `shifts/useShiftRoleOptions.ts` — the role options for the dialog (`hidden` without `shift:read` at the
  department).
- `shifts/shiftRefusal.ts` — the shifts API's codes to frontend-owned copy, on a field or as one message.
- `shifts/shiftColours.ts` — the twenty colours a shift may be given, in the picker's order.
- `shifts/fixtures.ts` — API-shaped rows for stories and tests: draft s-1's shifts (`INCLUDED_SHIFT_IDS` ticked),
  a generated schedule's frozen copies, a live shift and the role options.
- `shifts/ShiftDialog` — add or change one of the department's shifts: name, group (`Combobox` with its create row;
  a group is a plain name), colour (`SwatchPicker`), start and end time on the 30-minute grid, days and roles
  (`Select` with its select-all row), Reset and Save.
- `shifts/ShiftsStep` — the schedule's shifts under a tab per group ("All" plus one per group, with counts) above
  the table, ticking what the schedule includes; a generated schedule's frozen copies are listed read-only.
- `schedules/api.ts` — the schedule schema (DRAFT or GENERATION_REQUESTED, its ticked `includedShiftIds`) and its
  requests: create, read, replace (setup and ticks together), request generation, and the schedule's shifts (a
  draft's live shifts with `included`, or the frozen copies).
- `schedules/useSchedule.ts` — `useSchedule` (`hidden` without `schedule:read` at the department or on a 403,
  `missing` on a 404) and `useScheduleActions` (create, update, generate).
- `schedules/useScheduleShifts.ts` — the schedule's shifts as the steps show them (`hidden` without `shift:read` at
  the department or on a 403).
- `schedules/scheduleRefusal.ts` — the schedules API's codes to copy, for a save and for a generation
  (`SCHEDULE_HAS_NO_SHIFTS`, `SCHEDULE_NOT_DRAFT`).
- `schedules/fixtures.ts` — draft s-1 and its generated twin, and a workspace for company c-1.
- `scheduleDraft.ts` — what the page holds: the setup, the saved schedule (id, department and status, which never
  change in the page), the ticks, the stand-in constraints, the allocations per shift and job title, and the demand
  per time slot. `shiftRowsOf` gives a frozen copy whose source was deleted a local id; `tickedOf` drops ticks of
  shifts no longer listed. `TIME_STEP_MINUTES` is the one grain shift times and demand slots share.
- `schedulingNotice.ts` — the confirmation the Scheduling page shows after a generation, carried in history state.
- `ConstraintsStep`, `ForecastStep`, `GenerateStep`, `ScheduleSetupStep`, `StepActions` — the other steps;
  `ShiftAllocationTable` and `TimeBlockGrid` are the two forecast views.

`src/pages/CreateSchedule.tsx` composes the steps and owns the draft, the saves, generation and the shift dialog.

## Draft flow

1. Setup, no draft yet: the department comes from the workspace `DepartmentSelector`, keyed on `schedule:create`
   and offering ACTIVE departments only. Next `POST`s the setup (no ticks) to that department's schedules and opens
   Shifts with the new `scheduleId` and `departmentId` in the URL.
2. Setup with a draft: the department is shown but fixed; Next `PUT`s the setup with the ticks.
3. A step after Setup without both `scheduleId` and `departmentId` returns to Setup. With both, the page takes the
   branch from the department among those the workspace offers under `schedule:read`, loads the schedule and starts
   from its setup and ticks, then lists its shifts (`GET …/schedules/{s}/shifts`) and ticks the `included` ones.
   While it loads, or when it can't be shown (unknown department or schedule, or no permission), the page says so
   under Back to overview.
4. Shifts: Add, Edit and Delete write the department's live shifts; a shift added here is ticked for this draft.
   Next needs at least one ticked shift. Without `shift:read` the step says the shifts are hidden.
5. Save draft, on every step after Setup, `PUT`s the setup with the ticked ids, the whole set.
6. Generate saves first (when the person may), then `POST …/generation`, and returns to `/scheduling`, which
   confirms it. A refusal (`SCHEDULE_HAS_NO_SHIFTS`, `SCHEDULE_NOT_DRAFT`, …) is explained in place.
7. A generated schedule reopened shows a notice, its setup read-only and its frozen shifts with nothing to tick, add,
   edit or delete; Save draft and Generate are not offered.

## Permissions

Every check goes through `useAccess` at the schedule's department (`departmentScope`): `schedule:read` reads a draft;
`schedule:create` decides which departments Setup offers; `schedule:update` saves (without it the setup is read-only
and Save draft is not offered); `schedule:generate` offers Generate. `shift:read` lists the shifts and the role
options; `shift:create` offers Add, `shift:update` Edit and `shift:delete` Delete. The Scheduling page offers Create
schedule when `schedule:create` is held anywhere. The API checks every request regardless.

## Verification

```sh
pnpm lint
pnpm exec vitest run src/features/scheduling src/pages --testTimeout=30000 --maxWorkers=2
pnpm build
```

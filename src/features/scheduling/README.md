# Scheduling

The Create Schedule steps at `/scheduling/new` (Setup, Shifts, Constraints, Forecast, Generate). Completing Setup
creates the schedule on the API as a DRAFT, and from then on the URL names it with its department
(`?step=…&scheduleId=…&departmentId=…`), so a refresh or a link reopens the same draft. Shifts and constraints belong
to the department: one live set of each per department, changed under their own `shift` and `constraint` keys and
routes, and a draft only remembers which of them are ticked. Generating a draft freezes the ticked shifts and
constraints into it; a generated schedule always shows the shifts and constraints it was generated with. The
contracts are §2.4 of the API's `docs/implementation/2026-10-11-shifts-module.md` and §4.5 of its
`docs/implementation/2026-10-12-scheduling-constraints.md` (ADR-0050). Allocations and demand stay in the page until
their API exists.

## Shape

- `ShiftDetailsPanel/ReassignRosterShiftDialog.tsx` — reassigns to active API members of the shift's exact branch
  and department. Sample shifts without ids require a unit selection first. Uses the existing profile list under
  `member_profile:read`, reads every branch-filtered page and matches department ids locally; no sample people are
  offered. Selected members absent from the preview roster are added to their department group in memory.

- `ShiftDetailsPanel/ApiRosterShiftDialog.tsx` — the roster preview's Edit shift choices: active branches and
  departments from the workspace under `shift:read`, then active job titles from the department's
  `shift-role-options` API. Location is a branch; role choices are department-specific. Changing the unit clears
  the role, and saving requires a valid API choice. The preview retains the selected ids and labels in memory;
  it does not persist roster assignments to the API.

- `schedules/useSchedules.ts` — the overview's permission-aware company-wide history. Reads every page of
  `GET /api/v1/companies/{companyId}/schedules`, with API names, dates, departments and statuses; search covers
  every returned row. View opens the saved draft or frozen schedule in the existing steps.

- `paths.ts` — the department, shift, constraint and schedule paths every scheduling request is built from, and the
  query root (`["scheduling", companyId, …]`).
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
- `constraints/api.ts` — the live constraint schema and requests at the department's routes (list, create, replace,
  delete) and the constraint options (`constraint-options`, read under `constraint:read`: every constraint type with
  its category, whether it takes a requirement (Must or Should), whether a department holds only one, and its fields,
  each with its kind, how many values and a number's range; plus the department's live shifts and ACTIVE job titles,
  so a constraint editor never needs `shift:read` or `job_title:read`). A constraint is
  `{ name, type, requirement, status, values: [{ field, value }] }`, one value row per value, `value` always text.
  Types, categories and fields are enums only so their copy is typed; one the app doesn't know yet (a type, category,
  field, kind, requirement or status) fails the whole answer it comes in, so the step says the constraints couldn't
  load and the dialog that the types couldn't, until it is added here with its copy.
- `constraints/useConstraintActions.ts` — the constraint mutations; each success reloads every scheduling query of
  the company.
- `constraints/useConstraintOptions.ts` — the constraint options for the dialog (`hidden` without `constraint:read`
  at the department).
- `constraints/constraintRefusal.ts` — the constraints API's codes to frontend-owned copy: a taken name on the name,
  a second constraint of a once-only type on the type, the rest as one message.
- `constraints/constraintSentence.ts` — a constraint read as its type's sentence: `sentenceSlotsOf` (the requirement
  and each field the type takes) and `constraintWords` (each slot in words: names for job titles and shifts,
  comparisons and weekdays in words). Each type has one sentence in the copy, `scheduling.constraints.sentences.<TYPE>`,
  with a tag per slot.
- `constraints/fixtures.ts` — API-shaped rows for stories and tests: every type as `constraint-options` declares it,
  the department's constraints (one of each type, one inactive), draft s-1's ticks (`INCLUDED_CONSTRAINT_IDS`) and a
  generated schedule's frozen copies.
- `constraints/ConstraintDialog` — add or change one of the department's constraints: name, type (labelled by its
  category), Must or Should when the type takes one, status, then one row per field of the type's spec, by kind: a
  number box in its range, a Select for a field of one value, a multi-choice Select (weekdays Monday first, job
  titles, shifts) for a field of several. `ConstraintDialog/schema.ts` builds the zod schema from the spec per check
  (counts, ranges, the requirement, and the API's two cross-field checks) and yields the API's body. A new type the
  API adds needs only its name in `constraints/api.ts` and its copy.
- `constraints/ConstraintPreview` — the constraint read back live in the dialog as its type's sentence, each part
  marked as filled in or still to choose.
- `constraints/ConstraintTypeTag` — a constraint category with its colour key; hovering says what it covers.
- `constraints/ConstraintsStep` — the department's constraints ticked as the schedule applies them: name, category tag
  and type, the constraint as a sentence, Must or Should (or the type's fixed meaning), status, and Edit and Delete.
  An inactive constraint is listed but never ticked. A generated schedule's frozen copies are listed read-only.
- `schedules/api.ts` — the schedule schema (DRAFT or GENERATION_REQUESTED, its ticked `includedShiftIds` and
  `includedConstraintIds`) and its requests: create, read, replace (setup and ticks together), request generation,
  the schedule's shifts (a draft's live shifts with `included`, or the frozen copies) and its constraints (a draft's
  live ACTIVE constraints with `included`, or the frozen copies).
- `schedules/useSchedule.ts` — `useSchedule` (`hidden` without `schedule:read` at the department or on a 403,
  `missing` on a 404) and `useScheduleActions` (create, update, generate).
- `schedules/useScheduleShifts.ts` — the schedule's shifts as the steps show them (`hidden` without `shift:read` at
  the department or on a 403).
- `schedules/useScheduleConstraints.ts` — the constraints the Constraints step lists: for a draft the department's
  live constraints, inactive ones included (`GET …/constraints`); once generated, the frozen copies
  (`GET …/schedules/{s}/constraints`). `hidden` without `constraint:read` at the department or on a 403.
- `schedules/scheduleRefusal.ts` — the schedules API's codes to copy, for a save (`CONSTRAINT_NOT_FOUND`,
  `CONSTRAINT_INACTIVE`, …) and for a generation (`SCHEDULE_HAS_NO_SHIFTS`, `SCHEDULE_CONSTRAINT_UNUSABLE`,
  `SCHEDULE_NOT_DRAFT`).
- `schedules/fixtures.ts` — draft s-1 and its generated twin, and a workspace for company c-1.
- `scheduleDraft.ts` — what the page holds: the setup, the saved schedule (id, department and status, which never
  change in the page), the shift and constraint ticks, the allocations per shift and job title, and the demand per
  time slot. A frozen copy has its own id, never sent to a shift or constraint route; `tickedOf` drops ticks of shifts
  no longer listed and `tickedConstraintsOf` of constraints no longer listed or no longer ACTIVE.
  `ListProblem` is why a step's list is not shown, for the Shifts and Constraints steps alike. `TIME_STEP_MINUTES` is
  the one grain shift times and demand slots share.
- `schedulingNotice.ts` — the confirmation the Scheduling page shows after a generation, carried in history state.
- `ForecastStep`, `GenerateStep`, `ScheduleSetupStep`, `StepActions` — the other steps; `ShiftAllocationTable` and
  `TimeBlockGrid` are the two forecast views.

`src/pages/CreateSchedule.tsx` composes the steps and owns the draft, the saves, generation and the shift and
constraint dialogs.

## Draft flow

1. Setup, no draft yet: the department comes from the workspace `DepartmentSelector`, keyed on `schedule:create`
   and offering ACTIVE departments only. Next `POST`s the setup (no ticks) to that department's schedules and opens
   Shifts with the new `scheduleId` and `departmentId` in the URL.
2. Setup with a draft: the department is shown but fixed; Next `PUT`s the setup with the ticks.
3. A step after Setup without both `scheduleId` and `departmentId` returns to Setup. With both, the page takes the
   branch from the department among those the workspace offers under `schedule:read`, loads the schedule and starts
   from its setup and ticks, then lists its shifts (`GET …/schedules/{s}/shifts`) and ticks the `included` ones; its
   constraint ticks are the schedule's `includedConstraintIds`.
   While it loads, or when it can't be shown (unknown department or schedule, or no permission), the page says so
   under Back to overview.
4. Shifts: Add, Edit and Delete write the department's live shifts; a shift added here is ticked for this draft.
   Next needs at least one ticked shift. Without `shift:read` the step says the shifts are hidden.
5. Constraints: the department's live constraints (`GET …/constraints`), active and inactive, ticked as the draft
   keeps them. Add, Edit and Delete write the department's live constraints; a constraint added here as ACTIVE is
   ticked for this draft. An inactive constraint is never ticked (the API refuses it), and ticks of constraints deleted
   or deactivated since drop out once the constraints reload. Without `constraint:read` the step says the constraints
   are hidden, and the ticks are sent back as the schedule keeps them.
6. Save draft, on every step after Setup, `PUT`s the setup with the ticked shift and constraint ids, each the whole
   set.
7. Generate saves first (when the person may), then `POST …/generation`, and returns to `/scheduling`, which
   confirms it. A refusal (`SCHEDULE_HAS_NO_SHIFTS`, `SCHEDULE_CONSTRAINT_UNUSABLE`, `SCHEDULE_NOT_DRAFT`, …) is
   explained in place.
8. A generated schedule reopened shows a notice, its setup read-only and its frozen shifts and constraints
   (`GET …/schedules/{s}/constraints`) with nothing to tick, add, edit or delete; Save draft and Generate are not
   offered.

## Permissions

Every check goes through `useAccess` at the schedule's department (`departmentScope`): `schedule:read` reads a draft;
`schedule:create` decides which departments Setup offers; `schedule:update` saves (without it the setup is read-only
and Save draft is not offered); `schedule:generate` offers Generate. `shift:read` lists the shifts and the role
options; `shift:create` offers Add, `shift:update` Edit and `shift:delete` Delete. `constraint:read` lists the
constraints (a draft's and a generated schedule's) and the constraint options; `constraint:create` offers Add
constraint, `constraint:update` Edit and `constraint:delete` Delete. Ticking a constraint needs only
`schedule:update`, as ticking a shift does. The Scheduling page offers Create schedule when `schedule:create` is held
anywhere. The API checks every request regardless.

## Verification

```sh
pnpm lint
pnpm exec vitest run src/features/scheduling src/pages --testTimeout=30000 --maxWorkers=2
pnpm build
```

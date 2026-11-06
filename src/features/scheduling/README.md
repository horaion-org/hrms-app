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

- `schedules/useSchedules.ts` — the overview's permission-aware company-wide history. Reads every page of
  `GET /api/v1/companies/{companyId}/schedules`, with API names, dates, departments and statuses; search covers
  every returned row.
- `ScheduleCard` — one API schedule on the overview, grouped by period: branch and department, status, what it
  includes (`ScheduleSummary`) and View.
- `schedules.ts` — each status's badge tone and the period's weeks and days (`mondayOf`, `weeksOf`, `daysOf`).

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
- `schedules/api.ts` — the schedule schema (its status, ticked `includedShiftIds` and `includedConstraintIds`, the
  branch's `timeZone` and its newest `generation` run with the engine's findings) and its requests: create, read,
  replace (setup and ticks together), request generation, the schedule's shifts (a draft's live shifts with
  `included`, or the frozen copies), its constraints (a draft's live ACTIVE constraints with `included`, or the
  frozen copies), its roster (`GET …/assignments`), regeneration, delete, publish (`…/approval`), reject
  (`…/rejection` with a reason) and the roster export (`…/export`, an `.xlsx`).
- `schedules/useSchedule.ts` — `useSchedule` (`hidden` without `schedule:read` at the department or on a 403,
  `missing` on a 404), `useCompanySchedule` (the same by the schedule's id alone) and `useScheduleActions` (create,
  update, generate, regenerate, remove, publish, reject).
- `schedules/useScheduleShifts.ts` — the schedule's shifts as the steps show them (`hidden` without `shift:read` at
  the department or on a 403).
- `schedules/useScheduleConstraints.ts` — the constraints the Constraints step lists: for a draft the department's
  live constraints, inactive ones included (`GET …/constraints`); once generated, the frozen copies
  (`GET …/schedules/{s}/constraints`). `hidden` without `constraint:read` at the department or on a 403.
- `schedules/scheduleRefusal.ts` — the schedules API's codes to copy, every code named once in
  `SCHEDULE_REFUSAL_CODES`: for a save (`CONSTRAINT_NOT_FOUND`, `CONSTRAINT_INACTIVE`, …), a generation
  (`SCHEDULE_HAS_NO_SHIFTS`, `SCHEDULE_CONSTRAINT_UNUSABLE`, `SCHEDULE_NOT_DRAFT`), a delete, a regeneration and a
  decision (`INVALID_REJECTION_REASON` lands on the reason field).
- `schedules/fixtures.ts` — draft s-1 and its generated twin (with the run its status implies), the engine's
  findings as the API serves them (`generationFindingsFixture`, `findingsOfEveryKindFixture`,
  `emptyFindingsFixture`), the 21-row roster of its three members, and a workspace for company c-1.
- `scheduleDraft.ts` — what the page holds: the setup, the saved schedule (id, department and status, which never
  change in the page), the shift and constraint ticks, the allocations per shift and job title, and the demand per
  time slot. A frozen copy has its own id, never sent to a shift or constraint route; `tickedOf` drops ticks of shifts
  no longer listed and `tickedConstraintsOf` of constraints no longer listed or no longer ACTIVE.
  `ListProblem` is why a step's list is not shown, for the Shifts and Constraints steps alike. `TIME_STEP_MINUTES` is
  the one grain shift times and demand slots share.
- `schedulingNotice.ts` — the confirmation the Scheduling page shows after a generation, carried in history state.
- `ForecastStep`, `GenerateStep`, `ScheduleSetupStep`, `StepActions` — the other steps; `ShiftAllocationTable` and
  `TimeBlockGrid` are the two forecast views. `GenerateStep` takes a `startingPoint` slot, filled with
  `StartingContextSection`.
- `periods.ts` — the weeks Setup offers (`selectablePeriods`: `PAST_WEEKS` back, this week, `FUTURE_WEEKS` ahead,
  each told whether it is last, this or next week and whether it has started), `defaultPeriod` and `withPeriod` for a
  reopened draft whose week has left the offered ones.
- `stepCompletion.ts` — which steps the Stepper ticks, from the draft's data (saved, ticked shifts and constraints,
  frozen) rather than from being behind the current step.
- `constraints/NoConstraintsDialog` — asks before leaving Constraints with nothing ticked; a warning only.
- `startingContext/` — the week before the period (T3-12, the API's ADR-0056). `api.ts` reads and replaces a draft's
  `starting-days` and reads the `starting-context` frozen at generation; `startingGrid.ts` is the dialog's pure state
  (entries by member and date, `shiftCellValue`, `fillEmpty`, the save body, `runsByMember` for the roster's badge).
  `StartingContextSection` owns the query and the save; `StartingContextCallout` is its one line on the Generate
  step and `StartingDaysDialog` the members-by-days grid. An empty day means "not known", never worked or off.

`src/pages/CreateSchedule.tsx` composes the steps and owns the draft, the saves, generation and the shift and
constraint dialogs.

## Roster page

`/scheduling/$scheduleId` shows a schedule past DRAFT, read-only. The contract is the API's
`docs/implementation/2026-10-27-roster-read-model.md`. Read it top to bottom:

1. Route `src/routes/_authenticated._app.scheduling_.$scheduleId.ts` — the URL names the schedule only; older links
   with `?branchId&departmentId` still open and the values are not used. The loader warms the workspace and, where
   `schedule:read` is held anywhere, `companyScheduleQuery` (`GET /companies/{c}/schedules/{s}`, same cache key as
   `scheduleQuery`).
2. Page `src/pages/ScheduleDetail.tsx` — hooks and composition only:
   `useCompanySchedule(…, { pollWhileGenerating: true })`, which reads the schedule by its id; the schedule's
   `branchId`/`departmentId` then name the department routes. `useScheduleAssignments` once the schedule is GENERATED with no open run, and `useScheduleShifts` /
   `useScheduleConstraints` (frozen copies, only to name the findings; empty when not readable). Under `RosterHeader` it shows, by
   state: a generating note (read again every 15 s), `GenerationFailurePanel`, `GeneratedRoster`, or a draft's note.
   Once there is a roster it also reads the `starting-context`, for the "Day N of a run" badges and a warning when
   members' starting points changed since generation. The header's actions are View setup, Regenerate and
   `ScheduleMenu`; `ScheduleDecisionPanel` sits under the header.
3. Queries `schedules/api.ts` — `scheduleQuery` (`refetchInterval` while `generationInProgress`) and
   `scheduleAssignmentsQuery` → `fetchScheduleAssignments`.
4. Pure mappers `roster/` — no I/O. They turn API rows into what the components draw.
5. Components, plain props only — `RosterHeader`, `GenerationFailurePanel` (with `MemberNotes`), `GeneratedRoster`
   (stat cards, `FindingsSummary` and `FindingsPanel`, `RosterWeekBar`, `RosterGrid` → `RosterShift` and
   `FindingsMarker`, and `ShiftDetailsPanel` read-only for a chosen day). Someone holding `schedule:edit_shift` on a
   GENERATED roster awaiting its decision, or a PUBLISHED one (`rosterEditable`), gets `editing`: any day opens
   `RosterCellPanel` beside the grid instead (another shift, a day off, or a same-day swap; a preview with
   `RosterChangeChecks`; Apply), and `LastRosterChange` offers Undo in a toast and above the grid (hrms-backend-v2
   docs/adr/0062). On a PUBLISHED roster (`editing.notifiesMembers`, docs/adr/0063) Apply and Undo first ask in a
   `ConfirmDialog` how many people will be told (`peopleTold`), and the remark hint says those people see it. Days
   changed by hand carry a dot wherever the rows carry a `lastChange`. A published schedule is never deleted
   (`deletable`): `ScheduleMenu` leaves Delete out. The member's own roster (`pages/MyRoster.tsx`) lists their days
   changed after publication with the remark (`MyRosterChanges`); the API sends no other change to a member.
   The editor reads the frozen shifts it offers from `…/roster-changes/shifts` (`rosterChangeShiftsQuery`) under
   the same key, so it needs neither `schedule:update` nor `shift:read`.

- `schedules/scheduleViewLink.ts` — View on a card or history row: a DRAFT reopens at the wizard's Setup, any other
  status opens the roster; `scheduleSetupLink` is the roster's "View setup".
- `schedules/useScheduleAssignments.ts` — the roster rows of one run at one revision, asked for only when enabled
  (`hidden` without `schedule:read` at the department or on a 403). A hand change moves the revision, so the rows
  are read again; a change made here seeds the new revision's rows at once.
- `rosterChanges/` — hand changes to a generated or published roster: `api.ts` (preview, apply, undo, latest; the API checks
  plain facts and never re-checks scheduling rules), `rosterEdit.ts` (pure: the cells a choice sends, shift and
  swap choices, what the checks ask before Apply, the roster with changed rows in place), `checkSentence.ts`,
  `rosterChangeRefusal.ts` and `useRosterChangeActions.ts` (apply and undo, caching the landed change).
- `roster/roster.ts` — `rosterFromAssignments` (one row per member, each day a shift, off or leave; a row whose
  member is gone keyed by its assignment), `hoursOf`/`hoursInDays` (via `shiftHours`), `weekDays`, `legendOf`,
  `rosterStats`, and `isoDateIn`/`dateTimeFormatIn` for the branch's time zone.
- `roster/findingsByMember.ts` — a failed run's errors grouped by member, named through `findings.members`.
- `roster/findings/` — the engine's findings on a generated roster, in three levels (summary, panel, grid markers):
  - `finding.ts` — `Finding`, the one unit the panel and the markers list (a conflict, a message, a diagnostic); its
    family (roster note or setup issue) and tone (roster notes error; a diagnostic by `severity`, unknown → warning).
  - `findingCounts.ts` — roster notes (each conflict and each message) and setup issues (each diagnostic).
  - `findingNames.ts` — the names the findings' ids stand for: members, frozen shifts, job titles and frozen
    constraints, from the findings, the roster and the schedule's setup.
  - `ruleLabel.ts` — a rule's name: its frozen constraint's (`sourceRuleId`), else its type's via the engine rule
    name (mirrors the API's `ConstraintType`), else "Forecast demand", else the engine name made readable.
  - `diagnostics.ts` — diagnostics grouped by code, with the app's label and sentence for the engine's four codes
    (`UNCOVERABLE_DEMAND`, `RULE_REFERENCES_MISSING_ENTITY`, `UNASSIGNABLE_EMPLOYEE`, `DEAD_SHIFT`) and a readable
    fallback for any other.
  - `rosterNotes.ts` — the roster notes on the days in view, by day and then by member.
  - `findingsOnGrid.ts` — where the grid marks them: a member's day (`assignmentMessages`), a member's row (their
    errors, their conflicts, `UNASSIGNABLE_EMPLOYEE`) or a day's header (the day's errors and conflicts). Setup
    diagnostics and members who no longer resolve stay in the panel.
  - `conflictTimes.ts` — a conflict's span as clock times (the engine writes datetimes).
- `roster/generationFailure.ts` — a FAILED run's `errorCode` in the app's words (the closed set,
  `engine_http_<status>`, then a generic fallback), or INFEASIBLE.
- `rosterLooks.ts` — the classes of a day off and of leave, and `shiftTileStyle` for a frozen shift's colour.
- `periods.ts` `formatDay` — "Mon, 12 Oct" for a finding's day.
- `RosterHeader` — department, period, status badge, time zone, requested by/at and finished at; `actions` at the right.
- `GenerationFailurePanel` — a failed run's copy and code, the engine's reason quoted, and its errors by member.
- `MemberNotes` — a failed run's errors grouped by member, each message quoted.
- `FindingsSummary` — the warning callout: how many roster notes and setup issues, and the panel's toggle.
- `FindingsPanel` — setup issues by code (fix in the setup), then roster notes by day and by member.
- `FindingsMarker` — a 24 px mark on a cell, row or day header in its most serious tone, with a count from two; its
  popover lists that place's findings and can open the panel.
- `FindingList` — one list of findings, shared by the panel and the popover.
- `GeneratedRoster` — the roster's figures, findings summary and panel, week bar, grid and chosen day's panel; owns
  only the shown week, the chosen day and whether the findings panel is open.
- `ScheduleCard` — shows "N setup issues" beside the status when its newest run's findings have diagnostics.
- `ScheduleMenu` — the "More actions" menu on a history row and the roster header: Export roster (header only, once
  there is a roster) and Delete. It owns the export mutation and opens `DeleteScheduleDialog`.
- `DeleteScheduleDialog`, `RegenerateDialog` — `ConfirmDialog`s in the `danger` tone (a failed run's retry is not,
  as there is nothing to replace); each refusal shows inside the dialog.
- `ScheduleDecisionPanel` — a GENERATED roster waits for Publish or Reject; a decided one says who decided, when and,
  for a rejection, why. `scheduleDecision.ts` reads that off the status alone. `PublishScheduleDialog` and
  `RejectScheduleDialog` (reason required, as rejecting leave) make the decision.

Engine prose (failure reason, errors, conflicts, diagnostics) is shown quoted, never as the app's own copy
(ADR-0003). The four known diagnostic codes also get the app's own sentence, with the engine's quoted beneath.

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
and Save draft is not offered); `schedule:generate` offers Generate and Regenerate; `schedule:publish` offers Publish
and Reject on a GENERATED roster; `schedule:delete` offers Delete in `ScheduleMenu`, and Export roster needs only
`schedule:read`. `shift:read` lists the shifts and the role options; `shift:create` offers Add, `shift:update`
Edit and `shift:delete` Delete. `constraint:read` lists the constraints (a draft's and a generated schedule's) and the
constraint options; `constraint:create` offers Add constraint, `constraint:update` Edit and `constraint:delete`
Delete. Ticking a constraint, and adding last week's days, needs only `schedule:update`, as ticking a shift does. The Scheduling page offers Create schedule when `schedule:create` is held
anywhere. The API checks every request regardless.

## Verification

```sh
pnpm lint
pnpm exec vitest run src/features/scheduling src/pages --testTimeout=30000 --maxWorkers=2
pnpm build
```

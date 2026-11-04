# Leave

The authenticated `/leave` route, in three tabs. **My leave** is every member's own requests and their own
applications (`/companies/{c}/me/leave-requests`), with nothing to grant. **Team requests** and **Team
timeline** are the company's requests one Branch at a time, read through the person's grants, with applying
on a member's behalf, approving and rejecting. Everything comes from the API (`features/leave/api.ts`); nothing
is sampled or kept in page state beyond the timeline's window.

## Shape

- `api.ts` — the zod schemas, `leaveRequestsQuery` (one entry per page, sort, filter and window), the
  active-Branches query that drives the country and Branch filters, `activeLeaveTypesQuery` (the company's
  active leave types, asked for once an application opens), and the writes: apply (own or on behalf, with
  remarks, required when the leave type asks for a reason), approve (with an optional comment) and reject (with
  a reason). A request's `leaveType` is any code: a company names its own types.
- `leaveTypeLabel.ts` — what a request's leave type is called: the company's name, or the app's words for a code
  of the old fixed list when an older API sends no name, or "Leave".
- `leaveTypeOptions.ts` — the applicable leave types (active, never the scheduler's day off) as Select options,
  grouped by Grant kind in the company's order.
- `leaveSearch.ts` — what belongs in the URL (`view`, `branch`, `status`, `sort`, `page`) and the API queries
  built from it; `timelineQueryOf` asks for one window of up to 200 rows.
- `useLeaveRequests.ts` — the list hook (`hidden` when the key is held nowhere, or the API refuses) and the
  mutations, each reloading every list and window of the company.
- `leaveRefusal.ts` — API codes to frontend-owned copy, on a field or as the dialog's alert.
- `LeaveRequests` — one server page: sorting, the status filter and paging are handed to the caller.
- `LeaveTimeline` — rows per person, bars per pending or approved request clipped to the window, weekends
  hatched; the window is the caller's.
- `LeaveRequestDialog` — review a request with its remarks; approve with an optional comment or reject with a
  reason, each confirmed in a second step; or apply for yourself or someone found through the People search,
  choosing from the grouped leave types, with remarks that become a required Reason when the type asks for one.
- `fixtures.ts` — API-shaped rows for stories and component tests.

`src/pages/Leave.tsx` composes them and owns the dialog, the decisions and the status line.

## Permissions

The Module is offered to everyone, for their own leave. The team tabs appear for anyone holding
`leave_request:read` anywhere; the API lists only the requests of people in the units where it is held. Apply appears with `leave_request:create` held anywhere and offers only
the people it is held for; Approve and Reject appear on a pending request only with `leave_request:review` at
that person's Department. The API checks every request regardless.

## Verification

```sh
pnpm lint
pnpm test:unit --run src/features/leave src/pages
pnpm build
pnpm test:e2e e2e/leave.spec.ts --project=chromium --reporter=list
```

The browser tests stub the API like `e2e/session.ts` does and capture each state in Playwright's output.

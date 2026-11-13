# Leave

The authenticated `/leave` route, in three tabs. **My leave** is every member's own requests and their own
applications (`/companies/{c}/me/leave-requests`), with nothing to grant. **Team requests** and **Team
timeline** are the company's requests one Branch at a time, read through the person's grants, with applying
on a member's behalf, recording approved leave, approving, rejecting, changing and cancelling. Everything comes from the API (`features/leave/api.ts`); nothing
is sampled or kept in page state beyond the timeline's window.

## Shape

- `api.ts` — the zod schemas, `leaveRequestsQuery` (one entry per page, sort, filter and window), the
  active-Branches query that drives the country and Branch filters, `leaveOptionsQuery` (the leave types that
  apply to the person an application is for, read by the apply form once that person is known), and the writes: apply (own or on behalf, with
  remarks, required when the leave type asks for a reason), approve (with an optional comment) and reject (with
  a reason), plus withdraw, record, change and cancel, the history and the rostered days. A request's `leaveType` is any code: a company names its own types. Its admins manage them under
  Settings › Leave (`features/leaveTypes`, `features/settings/LeaveTypesSettings`); every change there reloads
  the `leave-types` and `leave` queries.
- `leaveTypeLabel.ts` — what a request's leave type is called: the company's name, or the app's words for a code
  of the old fixed list when an older API sends no name, or "Leave".
- `leaveTypeOptions.ts` — the applicable leave types (active, never the scheduler's day off) as Select options,
  grouped by Grant kind in the company's order.
- `leaveSearch.ts` — what belongs in the URL (`view`, `branch`, `status`, `sort`, `page`) and the API queries
  built from it; `timelineQueryOf` asks for one window of up to 200 rows.
- `types.ts` — the request types re-exported from `api.ts`, and each status's Badge tone.
- `dates.ts` — the timeline's window (`defaultRange`, `shiftRange`, `rangeDays`), a request's period as one
  line, and the calendar day of an instant in the Branch's time zone.
- `useLeaveRequests.ts` — the reads: the team list hook (`hidden` when the key is held nowhere, or the API
  refuses), the caller's own requests, the pending count for the Team requests tab, and `useLeaveTurns` (whose
  turn it is to decide which request).
- `useLeaveActions.ts` — the writes, one hook per job: `useLeaveDecisionActions` (approve, reject),
  `useLeaveApplyActions` (apply, apply for oneself, record) and `useLeaveLifecycleActions` (change, cancel,
  withdraw). Each success runs `reloadLeave`: every list and window of the company, the notifications and the
  approvals.
- `useLeaveDecision.ts` — deciding from any screen: the decision mutations, whose turn it is, the refusal and
  the line that tells the reviewer what happened. `reviewOf(request)` is the dialog's `review` prop; the host
  only decides what to do with the line (the Leave page's status line, the Dashboard's toast, closing a linked
  request).
- `leaveApproval.ts` — leave under an approval flow, as pure rules: which stage a decision is (`single`,
  `middle`, `last`), whether it approves the leave, the approvals waiting on the caller, the "waiting for"
  line, `canDecideLeave` and the approved message (a middle step only moves the request on).
- `leaveRefusal.ts` — API codes to frontend-owned copy, on a field or as the dialog's alert;
  `leaveDecisionRefusal` also words the approvals API's refusals for a request under a flow.
- `LeaveRequests` — one server page: sorting, the status filter and paging are handed to the caller.
- `LeaveStatusFilter` — the status choice in the toolbar's Filters; `LeaveRangeNavigator` — the timeline's
  previous/next window and its date range.
- `LeaveTimeline` — rows per person, bars per pending or approved request clipped to the window, weekends
  hatched; the window is the caller's.
- `LeaveRequestDialog` — takes `review` (from `useLeaveDecision`) to offer a decision and `applyForm` for an
  application; without `review` a request is only read. It reviews a request with its remarks; approve with
  an optional comment or reject with a reason, each confirmed in a second step; or apply for yourself or
  someone found through the People search, choosing from the grouped leave types, with remarks that become a
  required Reason when the type asks for one.
  The shell holds the review (its step and both notes) and the footer; its parts are `LeaveRequestDetails`
  (what the request says), `LeaveDecisionStep` (the reason or comment being confirmed) and `LeaveApplyForm`
  (a new application, with its own state and footer). `RosteredDaysNotice` names the days that hold a shift;
  a reviewer must tick it, and nothing can be confirmed until those days are read. `LeaveRequestLifecycle` is
  the history, Withdraw on one's own pending request, and Change and Cancel on approved leave.
- `LinkedLeaveRequest` — the request a notification links to (`?requestId=`), opened over any Leave tab and
  closed after a decision.
- `fixtures.ts` — API-shaped rows for stories and component tests.

`src/pages/Leave.tsx` composes them and owns the dialog, the application and the status line.

## Approval flows

A request a company's leave flow governs carries `approval` (its instance, open step and step count). It is
decided on that open step through the approvals API (`features/approvals`), not the leave review routes:
`useLeaveDecisionActions` picks the route, the dialog limits the note to the approvals API's 500 characters
(`APPROVAL_COMMENT_MAX_LENGTH`; the leave routes keep 2,000, `LEAVE_APPROVAL_COMMENT_MAX_LENGTH`), and the
roster check and the comment on past leave apply only at the last step. `useLeaveTurns` reads the caller's
pending approvals to know whose turn it is; a reviewer holding `approval:read` sees the steps
(`ApprovalTrail`).

## Permissions

The Module is offered to everyone, for their own leave. The team tabs appear for anyone holding
`leave_request:read` anywhere; the API lists only the requests of people in the units where it is held. Apply appears with `leave_request:create` held anywhere and offers only
the people it is held for; Approve and Reject appear on a pending request, and Change and Cancel on approved leave, only with
`leave_request:review` at that person's Department. Record appears with that key held anywhere. Withdraw needs no
key: it is the member's own pending request. The API checks every request regardless.

## Verification

```sh
pnpm lint
pnpm test:unit --run src/features/leave src/pages
pnpm build
pnpm test:e2e e2e/leave.spec.ts --project=chromium --reporter=list
```

The browser tests stub the API like `e2e/session.ts` does and capture each state in Playwright's output.

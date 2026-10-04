# Leave overview

The authenticated `/leave` route implements the supplied Desktop-1 through
Desktop-4 SVG references: requests, timeline, request review, and rejection.

## Preview data

There are no leave endpoints in the current API. `sampleData.ts` supplies 24
fictional requests for the Singapore main branch. The page explicitly labels
these as sample data. Approval, rejection, and sample applications update React
state only and reset when the page is unmounted. No requests are persisted or
sent to the API. Other location filters demonstrate the empty state.

`LeaveOverview` owns the shared request state. `LeaveRequests` sorts the entire
filtered result before paginating. `LeaveTimeline` groups requests by employee,
clips bars to the selected inclusive date range, and omits rejected requests.
Hatched weekend columns represent blocked days in this preview. The initial
range starts on Monday, 18 May 2026, matching the reference's visible grid.

The sample application uses inclusive calendar-day duration. A future API
integration must supply authoritative balances, working-day calculations,
permissions, attachment handling, and mutation results.

## Components and verification

Shared components: `Modal`, `Pagination`, `Textarea`, and `DatePicker`.
The date picker composes the existing range `Calendar`; dialogs use Headless UI
for focus containment, Escape dismissal, and focus restoration.

Each added component includes a Storybook story and unit test. Interactive
screen preview: **Features / Leave / LeaveOverview / Default**.

```sh
pnpm lint
pnpm test:unit --run
pnpm build
pnpm test:e2e e2e/leave.spec.ts --project=chromium --reporter=list
```

The browser tests exercise the authenticated route at desktop and narrow-screen
sizes and capture each reference state in Playwright's test output directory.

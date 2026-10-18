# Notifications

The shared header bell opens a Headless UI notification panel with five recent entries per audience. Opening the
panel keeps the current route; **View all notifications** opens `/notifications`, and an entry opens its leave request.
Both links close the panel. Escape, outside click and the close button dismiss it; a company/membership change resets
it. The panel's list is mounted only while open. Its width is bounded by the viewport and longer content scrolls.

The panel and inbox share **For you** (`PERSONAL`) and **Needs review** (`REVIEW`) views. The dashboard previews personal
outcomes and labels its existing actionable leave queue separately.

During development, **Show demo data** previews sixty fictional notifications (forty personal, twenty review), including
read and unread entries. Example read actions are in-memory, detail links are absent, and the bell count continues to
represent real notifications. **Show live notifications** returns to the API-backed list. The toggle is gated by
`import.meta.env.DEV` and does not appear in production builds.

API calls use direct response records under `/companies/{companyId}/me/notifications`, validated with Zod. The
caller never supplies a recipient. Keys include company, membership and audience; personal queries use `selfMeta`,
review queries use `administrativeMeta`. Review data is withdrawn on permission shrink; membership revocation and
logout clear both through the existing session coordinator. Previous-page data never crosses identity or audience.

Counts and mounted inbox pages poll every 30 seconds while visible and refresh on focus/reconnect. Read mutations
invalidate lists and counts. Leave decisions also invalidate notification queries. Unknown/unavailable counts are
not presented as zero. Acknowledgement is explicit; opening a target alone does not mark it read.

Notifications carry only a type, identifiers and timestamps. Locales own the wording. A typed link selects a request
on `/leave`; `LinkedLeaveRequest` fetches the individual owned/scoped detail endpoint, independent of list pagination,
then reuses the existing dialog and guarded decision mutations. An unavailable target is explained in translated copy.

Tests: `Notifications.test.tsx`, notification row Storybook states, and `e2e/notifications.spec.ts`. Backend delivery
and tenant isolation are exercised in the API tests, including a full controller-to-database leave workflow.

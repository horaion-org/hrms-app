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

Each entry shows its type's icon and colour, a category label ("Leave", "Schedule"), and when it happened: "Just now",
then minutes, hours and days up to six days, then the date, with the exact time in the `title`. Times refresh every
minute while the list is mounted. `notificationTypes.ts` is the one map from type code to icon, tone, category and
copy, and `presentNotification` adjusts it by payload (a finished import turns red and carries its counts).
`notificationTarget` opens a leave request on `/leave`, a schedule at `/scheduling/{id}` or an import at
`/settings/data/import-people?import={id}`; `notificationLink` turns that target into the title link's props. **Needs review** shows for holders of `leave_request:review` or `schedule:publish`
(`reviewAccess.ts`). The API's `type` is parsed as
any string, so a code this build does not know renders plainly with a neutral icon instead of failing the page.

The panel offers **Mark all as read** for the open tab when it has unread entries. **Delete** (always visible, no
confirmation, no undo) hides an entry for the caller only; the API soft-deletes that recipient's row. A 404 means it
was already gone and is not shown as an error. Focus moves to the entry that took its place, and deleting the last
entry on a later page steps back one page.

Notifications carry only a type, identifiers and timestamps. Locales own the wording. A typed link selects a request
on `/leave`; `LinkedLeaveRequest` fetches the individual owned/scoped detail endpoint, independent of list pagination,
then reuses the existing dialog and guarded decision mutations. An unavailable target is explained in translated copy.

Tests: `Notifications.test.tsx`, notification row Storybook states, and `e2e/notifications.spec.ts`. Backend delivery
and tenant isolation are exercised in the API tests, including a full controller-to-database leave workflow.

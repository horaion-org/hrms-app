# Editing an access role never changes what it cannot show

Status: Proposed — Moses is asked to accept this decision in the PR before merge.

The system role editor sends a role's whole permission set on every save, because the API's `PUT` replaces the set. Three rules keep that save from changing authority the person did not see or could not have granted.

A permission key the role holds that is not in the app's copy of the catalog (`features/workspace/permissionKeys.ts`) cannot be shown as a checkbox. The editor keeps such keys aside and sends them back unchanged with every save. Dropping them would silently remove a permission from everyone holding the role whenever the app is a release behind the API.

A role is shown read-only when it is the Company Owner role, when the person lacks `access_role:update` at the company, or when the role holds any permission the person does not hold at the company. The last case mirrors the API's permission subset rule (API ADR-0017), which checks the union of the role's current and requested permissions and so refuses every change to such a role, a rename included. Following ADR-0005, this is a courtesy drawn from the workspace, not a control: the API still decides, and a save it refuses with a 403 is explained in the app's own words.

Ticking any permission of a resource also ticks that resource's view permission, and clearing view clears the resource. The API does not require this. It is a default that stops a role being given a change it cannot see, and it applies only to what the person ticks: a role that already holds an edit permission without view is shown as it is and is not altered by opening it.

We rejected hiding or disabling single checkboxes the person cannot grant, which lets them build a change the API will then refuse. We also rejected asking the API which permissions the person may grant: the workspace already carries their company-level keys, and the API's answer on save is the one that counts.

## Consequences

After a save the app reloads the workspace as well as the Organisation lists, because the role may be one the person holds. The API's decision engine takes a moment to pick up changed roles, so the reloaded workspace can briefly still show the old permissions.

Two people editing the same role overwrite each other, the later save winning. The API has no version check on access roles; adding one is an API decision.

The role is fetched again on every visit to the editor and is never read from a cache, so an edit always starts from the role as it is now.

## Amended 2026-10-09: the catalogue comes from the API's contract

The app's catalogue is now generated from the API's permission contract (ADR-0005), which also declares each key's prerequisites. A key the role holds that the generated catalogue does not know is now shown, ticked and locked, in a "Not recognised" row with a notice that the app needs updating, and is still sent back unchanged with every save. Ticking follows the contract's `prerequisites` instead of a hand-coded "every write needs its resource's view" rule (today the two are the same), and a key whose prerequisite the person cannot grant is disabled with the reason. The rule still applies only to what the person ticks: an existing role holding a write without its prerequisite is shown as it is and not altered by opening it.

## Amended 2026-11-09: ticking also ticks what a permission's screens use

Some screens read another resource besides their own: the schedule wizard lists shifts (`shift:read`), the person form lists job titles (`job_title:read`). The API does not require these, since a prerequisite is always the same resource, so the app keeps its own list of such pairs (`PERMISSION_USES` in `features/workspace/permissionKeys.ts`), each only where its code makes the call. Ticking a permission also ticks what it uses, when the person may give it, and says what was added and why. Unlike a prerequisite this never cascades back: clearing a used permission leaves what uses it ticked, and those rows warn what their holders will miss. As before, it applies only to what the person ticks; opening a role never changes it. (Ported from the unmerged `permission-clarity` work of 2026-10-12.)

## Amended 2026-11-09: the editor groups permissions by what people do

The checklist now shows the API contract's modules (People, Leave, Scheduling, Approvals, Organisation, Company settings, Access and activity) as sections, with each resource's row inside its section, and names each permission as a plain sentence with a one-line hint (UX note 2026-11-09, `.review-fixes/ux-notes/2026-11-09-roles-permissions-grouping.md`). A role's kind is asked first, as "Where can this role be used?". Summaries (the roles list, the assign and deactivate dialogs, a person's Access card) read a role section by section as View, Manage or Full, computed from its keys; that level is never an input, so editing stays key by key and every rule above still holds.

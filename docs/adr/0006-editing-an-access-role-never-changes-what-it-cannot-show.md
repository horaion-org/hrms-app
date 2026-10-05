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

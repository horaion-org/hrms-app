# The workspace decides what is shown; the API decides what is allowed

Status: Proposed — Moses is asked to accept this decision in the PR before merge.

The app shows, hides and disables navigation entries and controls from one source: the permission keys in `GET /api/v1/me/workspace`, read through `useCan`, `useCanAnywhere` and `<Can>` in `features/workspace`. A grant reaches everything beneath it, so a key held at the company applies at every Branch and Department, and a key held at a Branch applies at its Departments. A Module is offered in the Sidebar when any of its read keys is held at any scope. This follows API ADR-0022, where the workspace is the shadow of a person's grant scopes.

This is a courtesy to the person, not a control. Nothing in the browser is trusted: the API checks every request, and a control shown by mistake still ends in a 403. For that reason the keys are never stored outside the in-memory query cache, and no route or component treats "the workspace says yes" as permission to skip a request's own failure handling.

We rejected deriving visibility from role names, which would duplicate the API's role-to-permission mapping in the app and drift from it. We also rejected decoding permissions from the access pass: grants are scoped to units and change without a new Session.

## Consequences

The workspace can be out of date when grants change during a Session. Any 403 from the API, other than a revoked membership (which the Session wiring handles) or the workspace request itself, reloads the workspace, so a control the person should no longer see disappears after the first refusal instead of staying until the next sign-in.

Until the workspace has loaded, every answer is "no": controls appear once it arrives, and never flash and vanish.

Permission keys are a typed list in `features/workspace/permissionKeys.ts` mirroring the API's catalog. A key the API adds must be added there before the app can gate on it; an unknown key in a response is harmless.

The company-wide lists of Branches, Departments and Job titles are filtered by the API to the units where the person holds the list's read key (API ADR-0037), so the app shows such a list whenever the key is held anywhere in the company and never trims rows itself. A row the API returns is one the person may read. System roles and the activity feed have no unit and still need their key at company level. (Amended 2026-10-06; before this, these lists were hidden unless the key was held at company level.)

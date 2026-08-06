# Horaion App

The web client for the Horaion API. The API's `CONTEXT.md` is the authority on the domain; this file
records how those terms surface in the interface, and where the UI is deliberately allowed to differ.

## Translation rules

The API's vocabulary is precise because it has to be. The UI's vocabulary is for people who do not know
the model. Where they differ, the API term stays in code — types, routes, query keys — and the UI term
appears only in rendered copy and translation files.

| API term | UI copy | Notes |
| --- | --- | --- |
| Company Membership | Member | A person's place in the company. Code keeps `membership`. |
| Role Assignment | Access, or "has role" | Never "permission" — a Role Assignment grants a Role. |
| Custom Role | Role | Users create only Custom Roles, so the qualifier means nothing to them. |
| Company Owner | Owner | The one protected role. Shown as a badge, never as an editable role. |
| Permission Catalog | Permissions | The checkbox matrix on the role form. |
| Permission Delegation | Delegated access | Temporary, revocable, and time-boxed — say so in copy. |
| Membership Import | Import members | The spreadsheet upload. |
| Onboarding | Create your company | The public sign-up flow. |
| Offboarding | Close company | Irreversible; belongs in a danger zone. |
| Subdomain | Workspace address | Display only. Never used for routing or authorization. |

## Client concepts

**Session**:
The Cognito tokens plus the decoded subject, held by the auth layer and persisted in `localStorage`.
Distinct from Identity: a valid Session does not imply the API will serve you, because Membership status
is checked on every request.

**Bootstrap**:
The `GET /api/v1/me` call made once after sign-in. It yields the User and their Company Memberships,
and is the only way the client learns a Company identifier. Nothing company-scoped may be requested
before it resolves.

**Active Company**:
The Company whose identifier is injected into every company-scoped request. Held in router context, not
in the URL. Today a User has exactly one Membership, so this is chosen for them; the shape anticipates a
switcher without one existing.

**Effective Permissions**:
The `resource:action` key list from `GET /api/v1/companies/{companyId}/permissions`, answered by the
PDP. It already accounts for Role Assignments, Permission Delegations, and validity windows. It is a
rendering input, never an authorization decision — the API decides, the UI only chooses what to offer.

**Permission Gate**:
The single place a permission key is checked before rendering an action. Actions are gated, never
routes-only, because a route with every action hidden is worse than an absent route.

**Guarded Route**:
A route beneath `_authenticated`, which resolves the Session, runs Bootstrap, and provides Active
Company. Everything else is a public route: sign-in, sign-up, confirm, password reset.

**Challenge**:
A Cognito state that blocks sign-in until resolved, each with its own screen — an unconfirmed email
after sign-up, or the temporary password an invited member is emailed. Not an error; a step.

## Deliberate omissions

**No client-side authority.** The client never computes whether something is allowed. It asks, renders,
and handles refusal.

**No camelCase boundary.** Payloads stay `snake_case` all the way into components. A mapping layer would
be one more thing to drift from the generated types.

**No role-name logic.** Roles are tenant data. Branching on the string `Company Owner` is a bug, even
though that role is platform-seeded — use the `owner` flag from Bootstrap.

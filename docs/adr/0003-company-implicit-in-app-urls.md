# The Company is implicit in app URLs and explicit in API calls

Every company-scoped API route names its tenant: `/api/v1/companies/{companyId}/members`. The obvious
client mirror is `/companies/:companyId/members`, and it is the wrong shape for this product.

Decided: app routes omit the Company entirely — `/members`, `/roles`, `/branches/:branchId`. The
Company identifier is resolved once by `GET /api/v1/me`, provided through the `_authenticated` route
context, and injected into requests by the API client.

A User has exactly one Company Membership, and not as a soft rule: `MemberService` refuses any email
already registered anywhere, so a person belonging to one Company can never be added to another. A URL
segment that can only ever hold one value for a given user is noise they can nonetheless mistype, and
mirroring it would force every route to re-validate a pasted identifier against their Memberships.

The shape survives the rule relaxing. Bootstrap returns a list of Memberships rather than a scalar, and
the identifier already lives in one context rather than in thirty route definitions, so multi-company
support means adding a switcher and a redirect rather than rewriting the route tree.

We rejected mirroring the API path, which would make deep links unambiguous and multi-company work
immediately, at the cost of exposing a UUID that is meaningless to the person reading it. We rejected
subdomain-per-tenant: the API's `CONTEXT.md` defines Subdomain as a lookup and display concern that is
never an authorization or routing identity, and a subdomain names a Company without establishing that
the visitor belongs to it.

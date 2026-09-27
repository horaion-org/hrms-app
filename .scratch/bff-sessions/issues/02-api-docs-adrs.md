# 02: API: ADR-0029, ADR-0030 and doc updates

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Implementation Decisions → Supersessions and records, Unconfirmed registrations).

**What to build:** Record the decisions in the api repo's ADR format (`docs/adr/README.md` template; one decision per ADR).

**Blocked by:** None. Can start immediately.

**Status:** resolved

- [ ] `docs/adr/0029-first-party-sign-in-through-the-bff.md` (Proposed): Context, Decision (routes, cookies, forgery controls, confidential client, lifetimes, audit), Alternatives (hosted pages, in-browser SRP, separate BFF service, cookie-authenticated API), Consequences (API sees passwords, same-site deployment constraint, new config).
- [ ] `docs/adr/0030-unverified-registrations-are-hard-deleted.md` (Proposed): same-email replacement, 72 h purge, why hard deletion (full-table uniqueness), audit survives, single-instance scheduling caveat.
- [ ] README index rows for 0029 and 0030.
- [ ] ADR-0019: `Related: ADR-0029`, hosted-UI alternative marked decided by 0029, cookie named with `__Secure-` prefix.
- [ ] `docs/concepts/04-authentication.md`: the "API is never involved in login" statements and the login round trip describe the BFF.
- [ ] `.env.example` documents the new Cognito variables (names chosen in ticket 03 are authoritative; coordinate by reading it if merged first).

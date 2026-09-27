# 05: API: sign-up confirmation and unconfirmed registrations

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Public API contract, Unconfirmed registrations; ADR-0030).

**Blocked by:** 03

**Status:** resolved

- [ ] `POST /api/v1/public/sign-up-confirmations` and `.../resend` per the contract (resend always 202), rate-limited and audited.
- [ ] Onboarding: an existing email whose identity is unconfirmed is hard-deleted (identity, User, Membership, Company, the Company's access roles and assignments) before proceeding; confirmed emails still 409.
- [ ] Hourly scheduled purge of registrations older than 72 h, identity unconfirmed, User only owner of a `PENDING_VERIFICATION` Company; each purge audited; audit rows survive.
- [ ] Tests: controller slice for the routes; replacement and purge with the fake port and a real database (follow existing persistence tests).
- [ ] `./mvnw verify` passes.

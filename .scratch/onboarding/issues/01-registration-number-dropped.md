# 01: Registration number is collected but dropped

**Repo:** app, and possibly api. **Origin:** found while specifying `.scratch/login/spec.md` (Out of Scope).

**What to build:** A founder who types their Company's Registration number during Onboarding either has it kept, or is not asked for it. Today it is asked for and then silently discarded.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

Findings:
- The Onboarding form collects a Registration number, but the request it sends leaves it out, and a unit test asserts that it is left out.
- The API's Onboarding request has no such field.
- The auth end-to-end test expects the Registration number in the request body, so it probably fails today.
- The README says the field is sent as snake_case `registration_number`, and the API is camelCase.

Decision needed from the owner: **keep it** (a new, validated API field and column, with a Flyway migration and a Bruno update) or **drop it** (remove it from the form).

- [ ] The decision is recorded here.
- [ ] The form, the request, the unit test and the end-to-end test agree with the decision.
- [ ] The README describes the Onboarding request as it is actually sent, in camelCase.
- [ ] `pnpm lint`, `pnpm test:unit` and `pnpm test:e2e` pass; if the API changes, the Maven verify build passes too.

## Comments

- 2026-09-29: Confirmed on `feature/login` at `eada804`, before any login work: `e2e/auth.spec.ts` "registration submits the onboarding contract and requires email verification" fails in chromium, firefox and webkit at the "verify your email" status assertion. Every other auth e2e test passes.

# 01: API: stop logging rejected values (R15)

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Implementation Decisions → Forgery and abuse controls; Testing Decisions → R15).

**What to build:** Validation and database failure logs carry field names and error codes only, never rejected values (passwords, emails, row values). Retire R15 in `docs/security/accepted-risks.md`.

**Blocked by:** None. Can start immediately.

**Status:** resolved

- [ ] Global exception handling and service-operation logging emit field names and codes only.
- [ ] Log-capture tests prove a rejected password, email and a constraint-violating row value never reach log output.
- [ ] R15 marked retired with date and pointer to the change.
- [ ] `./mvnw verify` passes.

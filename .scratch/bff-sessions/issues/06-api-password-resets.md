# 06: API: password resets

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Public API contract).

**Blocked by:** 03

**Status:** resolved

- [ ] `POST /api/v1/public/password-resets` (always 202) and `.../confirm` (204, then sign out everywhere).
- [ ] Rate-limited per address and hashed email; audited; requests redact secrets.
- [ ] Controller slice tests with the fake port; `./mvnw verify` passes.

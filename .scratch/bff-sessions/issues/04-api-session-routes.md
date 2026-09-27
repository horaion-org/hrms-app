# 04: API: Session routes (sign in, new-password Challenge, refresh, sign out)

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Public API contract, Cookies, Forgery and abuse controls, Audit).

**Blocked by:** 03

**Status:** resolved

- [ ] `POST/DELETE /api/v1/public/sessions`, `POST .../sessions/challenge` (new password required), `POST .../sessions/refresh` per the contract table, including error codes.
- [ ] Session and Challenge cookies with the specified attributes, written and cleared by one component; cookie cleared on `SESSION_EXPIRED`; refresh replaces the cookie when Cognito returns a new refresh token.
- [ ] Cookie-authenticated routes refuse a foreign or missing `Origin` and non-JSON content type (403).
- [ ] Rate-limit keys for these routes (ADR-0026 limiter).
- [ ] Audit events with outcome, subject when known, reason code; request objects redact secrets in `toString`.
- [ ] ID token never returned.
- [ ] Web-slice tests through MockMvc with the fake identity port: success, 400s, 401s, 429, origin refusal, cookie attributes.
- [ ] `./mvnw verify` passes.

# 07: API: optional TOTP MFA

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Authenticated MFA contract, Operations).

**Blocked by:** 04

**Status:** resolved

- [ ] Session Challenge route handles software-token MFA.
- [ ] Authenticated routes under the current-user path: start enrolment (secret + otpauth URI), verify enrolment (turns MFA on), turn off / replace (password + code; re-runs sign-in through the MFA Challenge before changing anything).
- [ ] Verify early and note in the ticket: access tokens carry the scope needed to associate a TOTP device.
- [ ] Operator script to turn off a person's MFA via the admin API, plus a runbook in `docs/` (identity checks, audit entry).
- [ ] Audit events for enrol, remove, operator reset.
- [ ] Tests with the fake port; `./mvnw verify` passes.

## Note: access-token scope for TOTP (2026-09-27, bff/07-mfa)

`AssociateSoftwareToken`, `VerifySoftwareToken`, `SetUserMFAPreference` and `GetUser` need an access token
with the `aws.cognito.signin.user.admin` scope. Per the AWS Cognito docs, access tokens issued by the
API auth flows (`InitiateAuth`/`AdminInitiateAuth`, which the BFF uses via `ADMIN_USER_PASSWORD_AUTH`, and
refresh) always carry that scope; only managed-login/OAuth tokens depend on the client's allowed scopes.
Not checked against the live pool: no AWS CLI or credentials in the implementing environment. Confirm
once on a real pool by decoding a BFF-issued access token (`scope` claim) or by calling
`POST /api/v1/me/mfa/totp` in dev.

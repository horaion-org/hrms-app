# 03: API: confidential Cognito client and identity port extension

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Implementation Decisions → Cognito, Identity port).

**What to build:** The foundation every Session route uses.

**Blocked by:** None. Can start immediately.

**Status:** resolved

- [ ] Configuration for the confidential client id and secret, and a development-only list of additional accepted client ids; `CognitoAccessTokenValidator` accepts the confidential client plus that list.
- [ ] Every Cognito call made with the confidential client carries the secret hash.
- [ ] `IdentityProvider` gains: authenticate (admin password flow, request context), respond to challenge, refresh, revoke, confirm sign-up, resend confirmation, forgot password, confirm forgot password, sign out everywhere, associate TOTP, verify TOTP, set MFA preference. Domain records only (Session tokens; pending Challenge with kind + opaque session); domain exceptions for invalid credentials, not confirmed, expired/invalid code, password policy, throttled.
- [ ] Cognito adapter implements all of them; fallback fails closed for all.
- [ ] Onboarding's `registerUser` uses the confidential client.
- [ ] An in-memory fake `IdentityProvider` in test sources, reusable by later tickets (confirm users, issue challenges, expire tokens, refuse passwords).
- [ ] Adapter tests against a mocked SDK client (secret hash, challenge mapping, error translation); validator tests.
- [ ] `./mvnw verify` passes.

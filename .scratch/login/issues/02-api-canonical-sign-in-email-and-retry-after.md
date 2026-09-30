# 02: API: sign-in canonicalises the email, Retry-After is readable

**Repo:** api (`fix/onboarding-errors`). **Parent spec:** `.scratch/login/spec.md` (API changes, Security Considerations).

**What to build:** A person logs in with "Alice@Acme.com " exactly as with "alice@acme.com". The app, served from a different host on the same site, can read `Retry-After` on a 429 and say when to try again. The API's documentation and wording match what it actually sends.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The sign-in request canonicalises its email (trim, then lowercase in the root locale, per ADR-0005), exactly as the sign-up confirmation request does. The Session service passes the canonical email to the identity port.
- [x] No log line or audit entry contains the email, before or after canonicalisation.
- [x] CORS exposes `Retry-After`. A cross-origin response from an allowed origin carries it in `Access-Control-Expose-Headers`.
- [x] The Challenge validation message names `newPassword`, not `new_password`, and the MFA controller's Javadoc names `totpEnabled`.
- [x] ADR-0029 says errors carry `errorCode`, not `code`.
- [x] The authentication concept doc shows the sign-in response under the `data` envelope. It states that an access token stays valid after Log out until it expires (up to 15 minutes), because the revocation filter checks membership, not the Session.
- [x] Tests:
  - The Session controller and service tests, using the in-memory identity provider fake, show that a mixed-case, padded email reaches the port canonicalised and logs in the person Onboarding created.
  - The security configuration test shows `Retry-After` is exposed.
- [x] Bruno's Sessions requests still work unchanged.
- [x] The Maven verify build passes.

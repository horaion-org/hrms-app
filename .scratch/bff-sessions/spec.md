# Spec: Sessions through the API's BFF

Status: ready-for-agent

## Problem Statement

People can sign up and sign in on the `feature/signin` branch, but the Session lives in the browser. `amazon-cognito-identity-js` talks to Cognito directly, and the Cognito tokens, including a long-lived refresh token, sit in `localStorage` (app ADR 0003 and 0004). One successful cross-site-scripting injection would let an attacker copy that refresh token and act as the person from their own machine until it expires, with nothing the person can see. That contradicts the API's ADR-0019, which puts the refresh token in an httpOnly cookie held by a backend-for-frontend.

Several flows are also missing or incomplete:
- **Account recovery and MFA.** A founder who mistypes their email at Onboarding, or never confirms it, can hold that email and that Workspace address forever. Nobody can protect their account with a second factor. Nobody can recover a lost authenticator.
- **Current Company.** A person who belongs to more than one Company has no way to say which one they are working in.

## Solution

Sign in moves behind the API. The app keeps its own screens (sign-up, sign-in, email confirmation, password reset, Challenges), but every credential exchange goes through new public API routes that talk to Cognito on the server:
- The API keeps the Session as an httpOnly, `SameSite=Strict` cookie for seven days.
- The app holds only a short-lived access pass in memory and renews it silently from the cookie.
- Reloading the page or opening a new tab keeps the person signed in. Signing out ends the Session on this device.

Around that core, this spec adds:
- **Email confirmation after Onboarding.** It lands on sign-in with the email prefilled.
- **Taking back an unconfirmed Onboarding.** Signing up again with the same email replaces a registration that was never confirmed. Unconfirmed registrations are deleted after 72 hours, which frees their Workspace address.
- **Password reset.** Completing a reset signs the person out everywhere.
- **Optional TOTP MFA.** A person can turn on an authenticator app from their settings. Turning it off or changing the device requires their password and a current code. An operator runbook covers lost devices.
- **Current Company.** After sign-in, the app opens the Company the person used last. If that Company no longer works, it opens their only Company, or asks them to choose when they have several.

Delivery is in vertical slices, each spanning the API and the app:
1. Stop logging rejected values (R15).
2. Documentation and glossary.
3. Sign in, refresh, sign out, email confirmation, unconfirmed Onboarding handling.
4. Password reset.
5. MFA.

## User Stories

1. As a founder, I want to sign up my Company with my name, email, password, company name and Workspace address, so that I can start using Horaion.
2. As a founder, I want to be taken to an email confirmation screen right after sign-up, so that I know what to do next.
3. As a founder, I want to enter the code emailed to me to confirm my email, so that I can sign in.
4. As a founder, I want to ask for a new confirmation code, so that I can finish even if the first email expired or never arrived.
5. As a founder, I want the confirmation screen to answer the same way whether or not an email is registered when I ask for a new code, so that nobody can use it to discover who has an account.
6. As a founder, I want to land on sign-in with my email already filled in after confirming, so that I only need to type my password.
7. As a founder who never confirmed my email, I want to sign up again with the same email and replace my earlier attempt, so that a typo or lost email does not lock me out.
8. As a founder, I want a Workspace address held by someone else's unconfirmed sign-up to become available again within 72 hours, so that squatters cannot hold names indefinitely.
9. As a person, I want to sign in with my email and password on Horaion's own page, so that the experience matches the rest of the app.
10. As a person, I want a single "email or password is incorrect" message for either mistake, so that my account's existence is not revealed to others.
11. As a person whose email is not yet confirmed, I want sign-in to send me to email confirmation, so that I can finish setup instead of seeing a dead end.
12. As a person, I want to stay signed in when I reload the page, so that I do not lose my place.
13. As a person, I want to stay signed in when I open Horaion in a new tab, so that I can work in several views at once.
14. As a person, I want my Session to last seven days without re-entering my password, so that daily use is smooth.
15. As a person, I want to be asked to sign in again after seven days, so that a forgotten device does not stay signed in forever.
16. As a person, I want my requests to keep working when my short-lived access expires mid-task, so that I never see an error for something that renews silently.
17. As a person, I want to be sent to sign-in, and returned to where I was afterwards, when my Session has truly ended, so that I can continue my work.
18. As a person, I want signing out in one tab to sign me out in my other tabs, so that I do not leave a signed-in tab behind by accident.
19. As a person, I want signing out to end my Session on this device only, so that my other devices keep working.
20. As a person who was given a temporary password, I want to choose my own password at first sign-in, so that only I know it.
21. As a person, I want to be told when I have made too many attempts and when I can try again, so that I understand why sign-in is refused.
22. As a person, I want to request a password reset by email, so that I can recover my account when I forget my password.
23. As a person, I want the reset request to answer the same way whether or not my email is registered, so that nobody can use it to discover accounts.
24. As a person, I want to set a new password with the emailed code, so that I can sign in again.
25. As a person who reset my password, I want every device signed out, so that anyone who knew my old password loses access.
26. As a person, I want to turn on an authenticator app from my settings by scanning a QR code, so that my account needs more than a password.
27. As a person, I want to see the secret as text as well as a QR code, so that I can add it to an authenticator without a camera.
28. As a person, I want to confirm the first code before MFA takes effect, so that a failed scan cannot lock me out.
29. As a person with MFA on, I want to be asked for my authenticator code after my password at sign-in, so that a stolen password alone is not enough.
30. As a person with MFA on, I want to turn it off or move it to a new device only after giving my password and a current code, so that someone at my unlocked screen cannot remove it.
31. As a person who lost my authenticator, I want support to be able to turn off my MFA after verifying who I am, so that I can get back in.
32. As a support operator, I want a documented, audited procedure to turn off a person's MFA, so that recovery is consistent and traceable.
33. As a person who belongs to one Company, I want to go straight into it after sign-in, so that I never see a needless choice.
34. As a person who belongs to several Companies, I want Horaion to open the Company I used last, so that I resume where I left off.
35. As a person who belongs to several Companies, I want to choose one when my last Company is no longer available, so that I am never sent into a Company I cannot use.
36. As a person whose access to every Company was removed, I want a clear message instead of a broken page, so that I know to contact my Company.
37. As a security reviewer, I want no credential in `localStorage` or `sessionStorage`, so that script injection cannot steal a durable credential.
38. As a security reviewer, I want the Session cookie to be httpOnly, Secure, `SameSite=Strict` and scoped to the Session routes, so that scripts cannot read it and other sites and routes never receive it.
39. As a security reviewer, I want the Session routes to refuse requests from origins other than the app, so that cross-site request forgery cannot use the cookie.
40. As a security reviewer, I want sign-in, confirmation and reset routes rate-limited per address and per email, so that password guessing and email bombing are bounded.
41. As a security reviewer, I want every sign-in, refresh, sign-out, confirmation, reset and MFA change audited with the subject and outcome only, so that incidents can be traced without logging personal data.
42. As a security reviewer, I want passwords, codes, emails and tokens never to appear in logs, so that log access does not become account access.
43. As a security reviewer, I want only the API to hold the Cognito client secret, so that nobody can bypass the API's rate limits and audit by calling Cognito directly.
44. As a developer, I want the ID token never sent to the browser, with names and emails coming from the current-user endpoint, so that profile data has one source.
45. As a developer, I want a single request helper that attaches the access pass, renews it once on expiry and retries, so that features never handle authentication themselves.
46. As a developer, I want concurrent renewals collapsed into one, across tabs as well, so that parallel requests do not race to renew.
47. As a developer, I want a local way to get an API token for Bruno and scripts in development, so that manual API testing still works.
48. As an operator, I want unconfirmed Onboarding records cleaned up automatically and audited, so that the database and user pool do not accumulate dead registrations.

## Implementation Decisions

**Supersessions and records**
- App ADR 0003 (in-app Cognito) and 0004 (tokens in `localStorage`) are superseded by a new app ADR: Sessions through the API's BFF.
- API ADR-0029 records sign-in through the BFF. API ADR-0030 records the hard deletion of unconfirmed registrations. API ADR-0019 gains a link to ADR-0029, and its cookie name moves to the `__Secure-` prefix.
- The API's authentication concept doc stops saying the API is never involved in login.
- Glossary:
  - **Session** becomes "a signed-in person's standing with Horaion, kept by the API for up to seven days; the app holds only a short-lived access pass derived from it".
  - **Current Company** is added.
  - Sign in / Sign out is the canonical wording.

**Cognito**
- A new confidential app client is used by the API for sign-in, refresh, sign-up and all recovery calls. Every call carries the secret hash, and the secret exists only in API configuration.
- Sign-in uses the admin password flow, so that request context can be forwarded for Cognito's threat signals.
- The access-token validator expects the new client. The old public client is accepted in development only, through an explicit list of additional client ids.
- Lifetimes: access 15 minutes, refresh 7 days.
- Refresh-token rotation is enabled if the pool's plan supports it. When it is on, a refresh also replaces the cookie.

**Identity port (ADR-0011)**
- The port grows these operations: authenticate, respond to challenge, refresh, revoke, confirm sign-up, resend confirmation, forgot password, confirm forgot password, sign out everywhere, associate TOTP, verify TOTP, set MFA preference.
- Results are domain records: Session tokens, or a pending Challenge with its kind. SDK types never leave the adapter.
- The fallback implementation keeps failing closed.

**Public API contract** (all JSON, snake_case, RFC 7807 errors with a `code`; paths revised to nouns after code review, see the api wire contract)

| Route | Request | Success | Other outcomes |
| --- | --- | --- | --- |
| `POST /api/v1/public/sessions` | email, password | access token and expiry, plus the Session cookie; or a Challenge kind, plus a short-lived Challenge cookie | `INVALID_CREDENTIALS` (401, same for unknown email), `EMAIL_NOT_VERIFIED` (403), 429 |
| `POST /api/v1/public/sessions/challenge` | code, or new password | as for sign-in | Challenge expired (401), wrong code (401) |
| `POST /api/v1/public/sessions/refreshes` | cookie only | access token and expiry | `SESSION_EXPIRED` (401, cookie cleared) |
| `DELETE /api/v1/public/sessions` | cookie only | 204, idempotent | — |
| `POST /api/v1/public/sign-up-confirmations` | email, code | 204 | wrong or expired code (400) |
| `POST /api/v1/public/sign-up-confirmation-codes` | email | always 202 | 429 |
| `POST /api/v1/public/password-resets` | email | always 202 | 429 |
| `POST /api/v1/public/password-resets/completions` | email, code, new password | 204, all Sessions of that person ended | wrong code or password policy (400) |

Challenge kinds handled: new password required, and software-token MFA.

**Authenticated MFA contract** (bearer access pass, under the current-user path)
- **Start enrolment**: returns the TOTP secret and an otpauth URI.
- **Verify enrolment** with a code: turns MFA on.
- **Turn off or replace**: takes password and code. The API re-runs sign-in through the MFA Challenge before changing anything.

**Cookies**

| Cookie | Attributes |
| --- | --- |
| Session | `__Secure-` prefix; HttpOnly, Secure, `SameSite=Strict`; path limited to the Session routes; host-only on the API; max age seven days |
| Challenge | Same attributes; path limited to the Challenge route; three minutes |

- The app and the API share a registrable domain in every environment, which is what makes a `SameSite=Strict` cookie usable.

**Forgery and abuse controls**
- Cookie-authenticated routes accept a request only when its `Origin` is one of the configured app origins and its content type is JSON.
- The public rate limiter (ADR-0026) gains keys for the new routes: per address and per hashed email for sign-in, Challenge, confirmation and reset; per address for refresh.
- Request objects redact passwords, codes and emails in their string form.
- R15 is closed first: validation and database failures log field names and codes only.

**Audit**
- Events: sign-in, Challenge, refresh, sign-out, sign-up confirmation, password reset, MFA enrol, MFA remove, operator MFA reset, unconfirmed-registration purge.
- Each event carries outcome, the subject when known, and a reason code. Never an email, password, code or token.

**Unconfirmed registrations (ADR-0030)**
- **Replacing an earlier attempt.** When Onboarding meets an existing email whose Cognito identity is unconfirmed, it hard-deletes that earlier registration first: the identity, the User, the Membership, the Company, and the Company's access roles and assignments. Then it proceeds.
- **Other people's registrations are not replaced.** A Workspace address held by someone else's unconfirmed registration is not taken over; it frees up at cleanup.
- **Hourly cleanup.** A scheduled job purges registrations older than 72 hours whose identity is still unconfirmed and whose User is only the owner of a `PENDING_VERIFICATION` Company.
- **Single instance.** It runs on one API instance; a distributed lock is a stated follow-up for scaling out.
- **Why hard deletion.** Uniqueness on email and Workspace address covers soft-deleted rows, so only hard deletion frees them. The audit table has no foreign keys to these rows, so its history survives.

**App**
- **Removed**: the in-browser Cognito library and its storage, the "Remember me" option, and the Node `global` shim.
- **Session holder**: an in-memory access pass with its expiry, never persisted. Renewal is single-flight within a tab, serialised across tabs with a Web Lock, and happens proactively about a minute before expiry. Sign-out is broadcast to other tabs.
- **Request helper**:
  - Attaches the access pass to API requests.
  - On a 401, renews once and retries; failing that, signs out and redirects to sign-in with a return path.
  - Calls to the Session routes include credentials.
  - Sign-out clears the query cache.
- **Guarded routes**: before loading, a Guarded route renews the Session if it holds no access pass, then loads the current user and settles the Current Company.
- **Current Company**: the id of the last Company chosen is kept in `localStorage`. It is not a credential. It is ignored when it is not among the person's active Memberships.
- **Pages**:
  - Sign-up, sign-in, email confirmation, new password and password reset keep their screens and switch to the BFF.
  - The MFA Challenge uses the shared `Input` with a numeric one-time-code input mode.
  - New error codes get English and Spanish messages.
- **New components** (approved 2026-09-27): a Company picker and a TOTP enrolment panel, both inside the auth feature.
- **New dependency**: `qrcode`, used to render the otpauth URI locally.

**Operations**
- A script turns off a person's MFA through the admin API and writes an audit entry. A runbook describes identity checks before using it.
- Creating the confidential app client is a manual AWS step, documented alongside the environment variables it produces.

## Testing Decisions

- **What makes a good test here.** Tests assert only what a caller can observe: status codes, response bodies, `Set-Cookie` attributes, redirects, rendered text, and the absence of sensitive values in logs and storage. They do not assert which internal function was called.

**API**
- **Main seam: HTTP in, identity port out.** Controller tests drive the real controllers, services, cookie handling, origin checks and rate limiting through MockMvc. They replace Cognito with an in-memory fake of the identity port that can confirm users, issue Challenges, expire tokens and refuse passwords.
- **Prior art**:
  - `OnboardingControllerTest`: a web slice with the security configuration imported, run unauthenticated for public routes.
  - `OnboardingServiceTest`: port doubles.
- **Second seam: the Cognito adapter.** It is tested against a mocked SDK client, following `CognitoIdentityProviderAdapterTest`. This covers the secret hash, challenge mapping and error translation.
- **Unconfirmed registrations.** Replacement at Onboarding and the 72-hour purge are tested with the same fake and the real database, following the existing repository and persistence tests. The tests assert that every owned row is gone and that audit rows survive.
- **R15.** Log-capture tests assert that rejected passwords, emails and row values never reach the log output.
- **Routes to cover**: every new route's success path, its 400 validation cases, its 429 case, the cookie-origin refusal, cookie clearing on expiry, and the public-route security matrix.

**App**
- **Main seam: the network.** Unit tests stub `fetch` (prior art: the request helper's tests on the branch) and render real pages and routes through the memory-router harness. They no longer mock internal auth modules.
- **Covered in unit tests**:
  - The Session holder's single-flight renewal and proactive refresh.
  - The request helper's renew-once-and-retry.
  - Guarded-route redirects with a return path.
  - Current Company fallback rules.
  - Every page's success path and mapped error codes.
- **End-to-end.** Playwright mocks the BFF routes at the network layer. This replaces seeding Cognito tokens into `localStorage`. The tests cover sign-up → confirmation → sign-in → reload stays signed in → sign-out in one tab signs out another. They assert that no token is ever present in web storage.
- **Components.** New components follow the four-file convention with stories and Testing Library tests.

## Out of Scope

- Hosted Cognito pages and social or enterprise identity providers.
- Mandatory MFA, SMS or email one-time codes, and self-service recovery codes.
- "Sign out of all devices" as a button. It happens only after a password reset.
- "Remember me" and configurable Session lengths.
- Invitations and member creation (which would use temporary passwords). This spec only makes sure the new-password Challenge works.
- Company owners resetting their members' MFA.
- Taking over a Workspace address held by another person's unconfirmed registration before cleanup.
- A shared rate-limit store and a distributed lock for multiple API instances.
- Changing uniqueness rules to partial indexes.

## Further Notes

- **Where the work happens.** The API work continues on `fix/onboarding-errors`, which already holds ADR-0028 and the Onboarding error changes this spec builds on. The app work continues on `feature/signin`, whose components (auth layout, password input, form field, link, toaster) are reused.
- **To verify at the start of implementation**:
  - Whether the pool's plan supports refresh-token rotation.
  - That access passes carry the scope needed to associate a TOTP device.
  - The pool's password policy.
- **Lifecycle of the Session cookie.** The browser discards it after seven days. The API also clears it whenever Cognito rejects it.
- **What stays in place.** The instant revocation filter still decides whether a signed-in person may act. Sign-in does not check Membership status, so a person whose access was removed can sign in but is refused on their next request.

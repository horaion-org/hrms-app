# Spec: Login module

Status: ready-for-agent

## Problem Statement

A founder can create a Company through Onboarding, but nobody can use Horaion afterwards:
- **Log in is a stub.** Submitting it says logging in is not available yet, and there is no logged-in area, because the home page was removed.
- **Onboarding dead-ends.** It ends on "Check your email" with nowhere to enter the emailed code. Without Email confirmation the founder can never log in.
- **No recovery.** Forgot password is a stub. A person given a temporary password, or with an authenticator app turned on, cannot finish logging in.
- **No Company choice.** A person who belongs to several Companies cannot say which one they are working in.

The API already serves every route this needs (ADR-0029). A complete app-side build exists on the `feature/signin` branch, but it cannot be merged as it is:
- It branched off before the Onboarding screens were finished and has its own, different auth screens.
- It sends snake_case JSON, and the API now speaks camelCase.
- It puts the person's email in the URL.
- It sends people to Log in whenever the API cannot be reached.
- It does nothing when a person's access to a Company is removed.

## Solution

People log in on Horaion's own screens, in the same design as Onboarding, and every credential exchange goes through the API's backend-for-frontend:
- **Log in.** A person logs in with their email and password and completes any Challenge (choosing a new password, or entering an authenticator code). They land on a home page inside the Sidebar showing their Current Company.
- **The Session.** It lasts seven days. Reloading or opening a new tab keeps the person logged in, and renewal is silent. Log out ends the Session on this device and in every open tab.
- **Onboarding to Log in.** Onboarding leads straight to Email confirmation. Confirming leads to Log in with the email already filled in.
- **Password reset.** A forgotten password is recovered with an emailed code, which also logs the person out everywhere.
- **Several Companies.** A person with several Companies lands in the one they used last, or their only one, or chooses. They can switch from the home page.
- **Failures get clear answers:**
  - Too many attempts: says when to try again.
  - The API cannot be reached: offers a retry instead of logging the person out.
  - Access removed: moves the person to a Company they can still use, or explains that they have none.

This is done by porting `feature/signin`'s session engine onto `integration`, rebuilding its screens in `integration`'s design, and making three small API fixes.

## User Stories

**Onboarding and Email confirmation**

1. As a founder who just completed Onboarding, I want to be taken straight to Email confirmation, so that I know what to do next.
2. As a founder, I want my email already filled in on Email confirmation, so that I only need to type the code.
3. As a founder, I want to enter the code emailed to me, so that I can log in.
4. As a founder, I want to ask for a new code, so that I can finish even if the first email expired or never arrived.
5. As a founder, I want asking for a new code to answer the same way whether or not the email is registered, so that nobody can use it to discover who has an account.
6. As a founder, I want to be told when a code is wrong or expired and be allowed to try again, so that a typo does not stall me.
7. As a founder, I want to land on Log in with my email filled in after confirming, so that I only type my password.
8. As a founder who opened Email confirmation in a new tab or from a bookmark, I want to type my email myself, so that the screen still works on its own.
9. As a person, I want my email never to appear in the address bar, so that it is not kept in browser history, shared links, or server logs.

**Log in**

10. As a person, I want to log in with my email and password on Horaion's own page, so that the experience matches the rest of the app.
11. As a person, I want a single "email or password is incorrect" message for either mistake, so that my account's existence is not revealed to others.
12. As a person whose email is not yet confirmed, I want Log in to send me to Email confirmation with my email filled in, so that I can finish setup instead of hitting a dead end.
13. As a person, I want my email accepted whatever its capitalisation or surrounding spaces, so that "Alice@Acme.com " logs me in the same as "alice@acme.com".
14. As a person, I want to show and hide my password while typing, so that I can check what I typed.
15. As a person, I want to be told which field is missing or malformed before I submit, so that I do not wait for the server to tell me.
16. As a person, I want to be returned to the page I was trying to reach after logging in, so that I can carry on.
17. As a person, I want that return to stay inside Horaion, so that a crafted link cannot send me to another site after I log in.
18. As a person already logged in in this tab, I want opening Log in to take me home, so that I do not log in twice.
19. As a person, I want no "Remember me" option, so that the form does not offer a choice it cannot honour (every Session lasts seven days).

**Challenges**

20. As a person given a temporary password, I want to choose my own at my first log in, so that only I know it.
21. As a person choosing a new password, I want the password rules checked before I submit, so that I get it right the first time.
22. As a person with an authenticator app, I want to be asked for its code after my password, so that a stolen password alone is not enough.
23. As a person entering an authenticator code on a phone, I want a numeric keypad and one-time-code autofill, so that entry is quick.
24. As a person who mistypes the authenticator code, I want to try again without re-entering my password, so that a typo does not restart logging in.
25. As a person who took too long on a Challenge, I want to be told it expired and be taken back to Log in, so that I know to start again.
26. As a person who must choose a new password and then enter an authenticator code, I want one step to lead straight into the next, so that I finish in one go.

**Session**

27. As a person, I want to stay logged in when I reload the page, so that I do not lose my place.
28. As a person, I want to stay logged in when I open Horaion in a new tab, so that I can work in several views at once.
29. As a person, I want my Session to last seven days without re-entering my password, so that daily use is smooth.
30. As a person, I want to be asked to log in again after seven days, so that a forgotten device does not stay logged in forever.
31. As a person, I want my requests to keep working when my short-lived access expires mid-task, so that I never see an error for something that renews silently.
32. As a person whose Session has truly ended, I want to be sent to Log in and returned to where I was afterwards, so that I can continue my work.
33. As a person, I want logging out in one tab to log me out in my other tabs, so that I do not leave a logged-in tab behind by accident.
34. As a person, I want logging out to end my Session on this device only, so that my other devices keep working.
35. As a person, I want Log out always within reach once I am logged in, so that I can end my Session on a shared device.
36. As a person whose network drops, or whose Horaion is briefly down, when I reload, I want a "We can't reach Horaion" screen with a way to try again, so that an outage does not look like being logged out.
37. As a person, I want nothing from my Session left in the app after I log out, so that the next person at this device sees nothing of mine.

**Too many attempts**

38. As a person who made too many attempts, I want to be told roughly when I can try again, so that I understand why I am refused and for how long.
39. As a person who made too many attempts, I want the submit button held until then and released on its own, so that I do not waste attempts.
40. As a screen reader user, I want that message announced once rather than as a ticking countdown, so that I am not interrupted every second.

**Password reset**

41. As a person, I want to request a password reset by email, so that I can recover my account when I forget my password.
42. As a person, I want the reset request to answer the same way whether or not my email is registered, so that nobody can use it to discover accounts.
43. As a person, I want to set a new password with the emailed code, so that I can log in again.
44. As a person, I want to ask for another reset code, so that I can finish when the first one expired or never arrived.
45. As a person who reset my password, I want every device logged out, so that anyone who knew my old password loses access.
46. As a person who reset my password, I want to land on Log in with my email filled in, so that I only type the new password.

**Current Company**

47. As a person who belongs to one Company, I want to go straight into it after logging in, so that I never see a needless choice.
48. As a person who belongs to several Companies, I want Horaion to open the Company I used last, so that I resume where I left off.
49. As a person whose last Company is no longer available, I want to go into my only remaining Company, or choose when I have several, so that I am never sent into a Company I cannot use.
50. As a person who belongs to several Companies, I want to switch Company from the home page, so that I am not stuck in the one I used last.
51. As a person whose access to my Current Company is removed while I am working, I want to be moved to a Company I can still use, or asked to choose one, without logging in again, so that losing one Company does not cost me the others.
52. As a person whose access to every Company was removed, I want a clear message and a way to log out instead of a broken page, so that I know to contact my Company.
53. As a person, I want to see my Current Company's name on the home page, so that I know which Company I am working in.

**Accessibility and wording**

54. As a keyboard or screen reader user, I want focus moved to the first rejected field, or to the message, after a failed submit, so that I know what to fix.
55. As a keyboard user, I want every screen usable without a mouse, so that I can log in however I work.
56. As a person on a phone, I want every screen to work at a 375-pixel width, so that I can log in on the go.
57. As a person, I want every screen to use the same words as the rest of Horaion (Log in, Log out, Email confirmation, Company), so that nothing reads as a different product.
58. As a future translator, I want every word on these screens to come from the translation file, so that adding a language means translating one file.

**Security review**

59. As a security reviewer, I want no credential ever written to `localStorage` or `sessionStorage`, so that injected script cannot steal a durable credential.
60. As a security reviewer, I want the app never to display the API's `detail`, `title` or `message` text, so that server wording and internals never reach the screen.
61. As a security reviewer, I want calls to the Session routes sent with credentials and a JSON body, so that the API's origin and content-type checks can refuse forged requests.
62. As a security reviewer, I want the app able to read `Retry-After` across origins, so that the rate-limit message is based on the server's answer, not a guess.
63. As a security reviewer, I want sign-in to canonicalise the email as confirmation and reset already do, so that the same person is counted and audited the same way across every credential route.
64. As Moses, I want the Sessions decision recorded as an app ADR on `integration`, and the PR to ask me to accept ADR-0019, ADR-0029 and that ADR before merge, so that the trail of who decided what is complete.

**Development**

65. As a developer, I want a single request helper that attaches the access pass, renews once on expiry and retries, so that features never handle authentication themselves.
66. As a developer, I want concurrent renewals collapsed into one, across tabs as well, so that parallel requests do not race to renew, or spend the 30-per-minute refresh budget.
67. As a developer, I want each auth screen to be its own small form, so that each can be read, changed and tested on its own.
68. As a developer, I want one component for the auth screens' form-level message, so that errors and confirmations look and are announced the same everywhere.

## Implementation Decisions

**Starting point**
- **Branches.** App work happens on `feature/login`, cut from `integration`. API work continues on `fix/onboarding-errors`, where the Session routes live.
- **Ported from `feature/signin`** (logic only, then adapted):
  - the Session holder, request helper and Guarded routes
  - the return-path check
  - Current Company settling and the Company picker
  - error mapping, zod schemas, and their tests
- **Adapted in two ways:**
  - All JSON is camelCase, and successful responses are read from the envelope's `data`.
  - Every behaviour decided below takes precedence over the ported code.
- **Screens are rebuilt** in `integration`'s design with its auth layout, field, input and button components. They are not ported.
- **After merge**, `feature/signin` and its worktree are deleted. Confirm with the owner first.

**Routes**

| Route | Kind | What it shows |
| --- | --- | --- |
| `/login` | public | Log in. `/sign-in` keeps redirecting here. |
| `/register` | public | Onboarding, unchanged apart from its success step. `/sign-up` keeps redirecting here. |
| `/confirm-email` | public | Email confirmation |
| `/new-password` | public | New-password Challenge |
| `/mfa` | public | Authenticator-code Challenge |
| `/forgot-password` | public | Password reset: request, then code and new password |
| `/` | Guarded | Placeholder home (it no longer redirects to `/login`) |

Every Guarded route sits beneath one guard. The return path travels as a `redirect` search parameter: it is a path, never personal data, and it is accepted only when it is a same-origin relative path.

**Wire contract** (API, camelCase; errors are RFC 7807 with `errorCode`; success bodies sit under `data`)

| Route | Request | Success | Other outcomes |
| --- | --- | --- | --- |
| `POST /api/v1/public/sessions` | `email`, `password` | `accessToken` and `expiresIn`, plus the Session cookie; or `challenge` (`NEW_PASSWORD_REQUIRED` / `SOFTWARE_TOKEN_MFA`), plus the Challenge cookie | 401 `INVALID_CREDENTIALS`, 403 `EMAIL_NOT_VERIFIED`, 400 validation, 429 `RATE_LIMITED`, 403 `ORIGIN_REFUSED` |
| `POST /api/v1/public/sessions/challenge` | exactly one of `code` (6 digits) or `newPassword` | as for Log in; may lead to another Challenge | 400 `INVALID_CODE` (Challenge kept), 400 `PASSWORD_POLICY_VIOLATION`, 401 `CHALLENGE_EXPIRED`, 429 |
| `POST /api/v1/public/sessions/refreshes` | cookie only; body `{}` | `accessToken`, `expiresIn` | 401 `SESSION_EXPIRED` (cookie cleared), 429 |
| `DELETE /api/v1/public/sessions` | cookie only; body `{}` | 204, idempotent | 429 |
| `POST /api/v1/public/sign-up-confirmations` | `email`, `code` | 204 | 400 `INVALID_CODE`, 429 |
| `POST /api/v1/public/sign-up-confirmation-codes` | `email` | always 202 | 429 |
| `POST /api/v1/public/password-resets` | `email` | always 202 | 429 |
| `POST /api/v1/public/password-resets/completions` | `email`, `code`, `newPassword` | 204; every Session of that person ended | 400 `INVALID_CODE`, 400 `PASSWORD_POLICY_VIOLATION`, 429 |
| `GET /api/v1/me` | bearer | person and memberships (company id, name, Workspace address, company status, membership status) | 401, 403 `MEMBERSHIP_REVOKED` / `AUTHORIZATION_DENIED` when no active membership remains |

- **Cookie routes:** the four `/sessions` routes need `credentials: "include"`, an `Origin` in the API's allowed list, and `Content-Type: application/json`. That includes refresh and log out, which send `{}`.
- **Bearer 401:** it carries no `errorCode`.

**Session holder**
- **Storage:** it holds the access pass and its expiry in memory only, never in web storage or a readable cookie.
- **When it renews:**
  - Renewal is single-flight within a tab and serialised across tabs with a Web Lock.
  - It happens proactively about a minute before expiry, timed from `expiresIn`, never from a hard-coded 15 minutes.
  - A pass that has already expired is renewed before it is sent.
- **Pending Challenge:** its kind is held in memory. Opening a Challenge route with no pending Challenge sends the person to Log in.
- **Log out:**
  - It calls the log-out route.
  - Whatever the route answers, it clears the pass, the query cache and any pending Challenge, then broadcasts to other tabs, which clear theirs and go to Log in.

**Request helper**
- **Every API call:** it attaches the bearer access pass.
- **On a 401:** it renews once and retries.
  - If renewal answers `SESSION_EXPIRED` (or 401), it ends the Session and sends the person to Log in with a return path.
  - If renewal fails with a network error or 5xx, the person is not logged out. The Guarded route shows the "We can't reach Horaion" screen instead.
- **On 403 `MEMBERSHIP_REVOKED`:** it starts re-settling the Current Company (below).
- **Error parsing:** it turns an RFC 7807 body into a typed error carrying:
  - the status, `errorCode`, and validation field errors
  - `Retry-After` in seconds when present

  A missing or non-JSON body is tolerated. Network failure and timeout become an "unreachable" error.

**Guarded routes**
- **Before loading:** with no access pass, the guard renews from the cookie.
  - `SESSION_EXPIRED` or 401 → Log in, with a return path.
  - Network error or 5xx → a "We can't reach Horaion" screen whose Try again re-runs the guard.
- **With a Session:** it loads `/me`, cached until Log out, and settles the Current Company.
- **When `/me` itself is refused** with 403 (`MEMBERSHIP_REVOKED` or `AUTHORIZATION_DENIED`), a "You no longer have access to any company" screen offers Log out. The Session is not ended automatically.

**Log in screen**
- **Before rendering:** if this tab already holds an access pass, the screen redirects home without calling the API. Otherwise it shows the form and makes no API call until the person submits.
- **Outcomes:**
  - Success: go to the return path, or home.
  - `challenge` → `/new-password` or `/mfa`, keeping the return path.
  - `INVALID_CREDENTIALS` → one message for either mistake.
  - `EMAIL_NOT_VERIFIED` → Email confirmation, with the email in history state.
  - 400 → field errors.
  - `ORIGIN_REFUSED` and anything unexpected → a generic message.
- **Form:**
  - The email is trimmed before sending.
  - The password uses the password input with show and hide.
  - There is no "Remember me".
  - There is a link to Password reset.

**Challenge screens**
- **New password:** a new password and Confirm password, checked to match (following Onboarding's pattern). The pool policy is checked before sending: 8–128 characters with lowercase, uppercase, a digit and a symbol.
- **Authenticator code:** the shared input with a numeric input mode, `autocomplete="one-time-code"`, and six digits.
- **Outcomes:**
  - Success → the return path, or home.
  - A further Challenge → that screen.
  - `INVALID_CODE` → a field error, and the person stays on the screen.
  - `PASSWORD_POLICY_VIOLATION` → a field error.
  - `CHALLENGE_EXPIRED` → Log in, with a message that the step expired.

**Email confirmation screen**
- **Entry points:**
  - Onboarding success, which replaces the inline "Check your email" message.
  - `EMAIL_NOT_VERIFIED` at Log in.
  - Direct visits.
- **Fields:** email (filled in from history state when present) and code.
- **Outcomes:**
  - Success → Log in, with the email in history state and a status message that the email is confirmed.
  - `INVALID_CODE` → a field error.
- **Send a new code:** calls the resend route and always shows the same neutral status message, whether or not the email is registered.

**Password reset screen**
- **Step one:** the email. It always moves on to step two with a neutral status message.
- **Step two:**
  - Code, new password and Confirm password, checked against the pool policy.
  - Success → Log in, with the email in history state and a status message that every device was logged out.
  - `INVALID_CODE` and `PASSWORD_POLICY_VIOLATION` → field errors.
  - "Send a new code" repeats step one's call.

**Carrying the email**
- The email moves between screens only in the router's navigation history state. It is tab-scoped, survives a reload, and is never in a URL, a query parameter, or web storage.
- Every screen that needs the email shows an email field, filled in when the state has one.

**Too many attempts (429)**
- **Message:** "Try again in about N minutes", with N rounded up from `Retry-After`. Under a minute, it says about a minute.
- **Behaviour:** submit stays disabled until the time passes, then re-enables on its own. The message is announced once (`role="alert"`), with no live countdown.
- **Without `Retry-After`:** a generic "try again later" message, and no hold.

**Current Company**
- **Settling:** a Company is usable when both the membership and the company are active in `/me`. The Current Company is:
  1. the last chosen Company, while it is still usable;
  2. otherwise the only usable Company;
  3. otherwise the one the person chooses in the ported Company picker.
- **Remembering:** the last chosen Company id is kept in `localStorage`. It is not a credential, and it is ignored when that Company is not usable.
- **Switching:** the home page offers "Switch company" when more than one Company is usable. It opens the picker, and the choice is remembered.
- **On `MEMBERSHIP_REVOKED` from any request:**
  - Drop the cached `/me`, reload it, and settle again.
  - If `/me` is refused, show the no-access screen.
  - The Session is kept either way.

**Placeholder home**
- The Guarded index route renders inside the Sidebar and shows:
  - the Current Company's name
  - "Switch company" when applicable
  - Log out
- The Sidebar gains a footer slot for Log out, as a new prop on the existing component.
- The Dashboard module replaces this home later.

**Components**
- **Password input:** ported into the shared form components with its four files. Onboarding's two inline show and hide toggles switch to it.
- **Company picker:** ported into the auth feature with its four files (approved 2026-09-27).
- **Form-level message:** a new component in the auth feature, with four files. It has an error kind (`role="alert"`) and a status kind (`role="status"`), is used by every auth screen, and replaces Onboarding's inline error box.
- **Sidebar:** a new footer slot.
- **Links** use the router's link, styled as Onboarding's links are.
- **Not added:** a Toaster or a Link component.
- **Anything else:** any other new component needs the owner's approval first (app `CLAUDE.md`).

**Onboarding changes (only these)**
- The combined auth form loses its login mode and "Remember me", and stays the Onboarding form.
- Success navigates to Email confirmation, with the email in history state.
- Its password toggles use the password input, and its form-level error uses the new message component.

**Copy and errors**
- **Keys:**
  - Every word on the new screens comes from `auth.*` keys in the English translation file. English only, per `.scratch/i18n/spec.md`; there are no Spanish strings.
  - Copy is sentence case and uses the glossary's words.
- **Mapping:**
  - Errors map from `errorCode` to a typed reason, then to a key, with a translated fallback for each status and one for "unreachable".
  - Validation field errors map to fields.
  - The API's `detail`, `title` and `message` are never displayed (app ADR 0003).
- **Codes handled:**
  - `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `INVALID_CODE`, `PASSWORD_POLICY_VIOLATION`
  - `CHALLENGE_EXPIRED`, `SESSION_EXPIRED`, `RATE_LIMITED`, `ORIGIN_REFUSED`
  - `MEMBERSHIP_REVOKED`, `AUTHORIZATION_DENIED`

**API changes (`fix/onboarding-errors`)**
- **CORS** exposes `Retry-After`, so the app, served from a different host on the same site, can read it.
- **Sign-in canonicalises the email** (trim, then lowercase in the root locale, per ADR-0005), exactly as the confirmation and reset requests do. This happens before the identity port, the rate limiter's view and audit are involved. Audit still never records the email.
- **Documentation and wording:**
  - ADR-0029 says errors carry `errorCode`, not `code`.
  - ADR-0029's citation "app ADR 0003 and 0004" is reworded to describe the in-browser Cognito approach explored on `feature/signin`, because on `integration` those numbers mean something else.
  - The authentication concept doc shows the sign-in response under `data`. It also states correctly that an access pass stays valid after Log out until it expires (up to 15 minutes), because the revocation filter checks membership, not the Session.
  - The Challenge validation message names `newPassword`, and the MFA controller's Javadoc names `totpEnabled`.
- **Unchanged:** no new endpoints, and no change to the public allowlist.

**Records**
- **App ADR 0004, "Sessions go through the API's backend-for-frontend":**
  - Ported from `feature/signin`'s ADR 0005 and reworded, so that it cites no ADR that does not exist on `integration`.
  - It gains today's decisions:
    - the email travels in history state, never the URL
    - only an expired Session sends a person to Log in; an unreachable API does not
    - removed access re-settles the Current Company and keeps the Session
- **Glossary:** the Access section of `CONTEXT.md` (Onboarding, Email confirmation, Log in, Challenge, Session, Current Company, and the revised Workspace address) is already written on `feature/login`.
- **README:** it stops saying logging in is not connected, and describes these flows.
- **Sign-off:** the PR asks Moses to accept ADR-0019, ADR-0029 and app ADR 0004 before merge.

## Security Considerations

- **Data classification.**
  - No new stored fields on either side.
  - Emails, passwords and codes are PII or secrets in transit only.
  - The email is held in tab-scoped router history state, never in a URL or web storage.
  - `localStorage` holds only the last chosen Company id: an opaque identifier, neither a credential nor personal data.
- **Authorization model.**
  - No new endpoints. Guarded routes and the Company picker are UX only.
  - The API enforces access on every request through the bearer token, the revocation filter and the permission guard.
  - The cookie routes stay protected by `SameSite=Strict`, the `Origin` allowlist and the JSON content-type requirement.
- **Audit.** The API already audits Log in, Challenge, refresh, Log out, Email confirmation and password reset, with outcome and subject only. Canonicalising the sign-in email must not add the email to any audit or log line.
- **Retention.**
  - The Session is a fixed seven days and the Challenge three minutes.
  - The access pass lasts 15 minutes and lives only in memory.
  - Log out clears the pass, the query cache and any pending Challenge in every tab.
- **Threats and mitigations:**
  - **Script injection stealing a credential:** only a memory-held, short-lived access pass is reachable, and the Session cookie is HttpOnly.
  - **Cross-site request forgery:** `SameSite=Strict`, the Origin allowlist and the JSON requirement cover the cookie routes; bearer tokens cover everything else.
  - **Account enumeration:** one message for either credential mistake, and neutral 202 answers for new codes and reset requests.
  - **Password guessing and email bombing:** the API's per-address and per-email rate limits, and the app holding submit until `Retry-After` passes.
  - **Open redirect:** the return path is accepted only as a same-origin relative path.
  - **PII in URLs and logs:** the email is carried in history state.
  - **Stale access after removal:** the revocation filter refuses the request, and the app re-settles the Current Company.
  - **Shared devices:** Log out clears every tab, and the Session is capped at seven days.
- **Known gaps to keep flagging.**
  - An access pass stays valid until it expires after Log out (up to 15 minutes).
  - Rate limits are counted per API instance.
  - `AuditorAware` still resolves to "system".
  - Onboarding's 409 is an accepted enumeration risk (R1).
  - WebKit may refuse `__Secure-` cookies on `http://localhost` in development.

## Testing Decisions

- **What makes a good test here.** Tests assert only what a caller can observe:
  - rendered text and focus
  - where the person is sent
  - the requests sent: path, method, body, `credentials`
  - response statuses, bodies and headers
  - the absence of credentials in web storage and of emails in URLs

  They do not assert which internal function was called, and no internal auth module is mocked.
- **App: one seam, the network boundary.** Tests render real routes and pages through the memory router harness with English translations, and stub `fetch` for the Session, confirmation, reset and `/me` routes. They cover:
  - the Session holder's single-flight, cross-tab and proactive renewal
  - the request helper's renew-once-and-retry
  - `SESSION_EXPIRED` versus unreachable during renewal
  - Guarded-route redirects with a return path, and refusal of external return paths
  - Log in when a pass is already held
  - every screen's success path and each mapped error code
  - chained Challenges
  - the email carried in history state and falling back to the field
  - the 429 message and submit hold, with and without `Retry-After`
  - Current Company settling, switching, and re-settling on `MEMBERSHIP_REVOKED`
  - the no-access screen
  - Onboarding success leading to Email confirmation
  - **Prior art:**
    - `feature/signin`'s Session holder tests and page tests, with their render helper
    - `integration`'s Onboarding API tests with a stubbed `fetch`
    - the memory router harness tests
- **App end to end.** Playwright mocks the BFF routes with `page.route`, as `integration`'s auth end-to-end spec already does for Onboarding. It covers:
  - Onboarding → Email confirmation → Log in → reload stays logged in → Log out in one tab logs out a second page in the same context, following `feature/signin`'s two-tab spec
  - that web storage never holds a token, and that no URL ever contains the email
  - the existing test that pins the Log in stub is replaced
- **Components.** The password input, Company picker and form-level message each come with stories and Testing Library tests, following the four-file convention.
- **API: one seam, HTTP in with the identity port faked.**
  - Sign-in canonicalisation is covered in the existing Session controller and service tests with the in-memory identity provider fake: a mixed-case, padded email reaches the port canonicalised, and no log or audit line contains it.
  - `Retry-After` exposure is covered in the existing security configuration test.
- **Gates:**
  - App: `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.
  - API: the Maven verify build passes.

## Out of Scope

- The MFA settings page for turning TOTP on or off, and the `qrcode` dependency. The API routes exist; this waits for a logged-in app shell.
- The Onboarding problems found during research, recorded as separate issues:
  - the registration number is collected and silently dropped
  - the auth end-to-end test expects it in the request
  - the README describes a snake_case field
  - the form says "Workspace name" where the glossary says Workspace address
  - the Onboarding API call keeps its registration-flavoured name
- The i18n foundation and translating Onboarding's copy (`.scratch/i18n` issues 01–04).
- The Dashboard module, the real app shell, and the workspace permission bootstrap (`/me/workspace` and permission checks in the UI). The placeholder home needs none of them.
- Routing by Workspace address (a host per Company).
- "Remember me", configurable Session lengths, and a "Log out of all devices" button.
- Mapping unexpected Cognito challenges to a coded error. They remain a 500 while MFA stays optional.
- Hosted Cognito pages, social or enterprise identity providers, and SMS or email one-time codes.
- A shared rate-limit store across API instances.

## Further Notes

- **Order of work.** The issues that follow this spec slice it vertically:
  1. API fixes.
  2. The Session engine, Log in, Log out and the placeholder home.
  3. Email confirmation, including Onboarding's success step.
  4. Challenges.
  5. Password reset.
  6. Current Company: switching, removed access, and the no-access screen.
  7. The ADR and README.

  The Onboarding problems get their own issues.
- **Development setup.**
  - The Vite proxy makes `/api` same-origin, and the API's allowed origins must include the dev server's origin.
  - Because the cookies carry the `__Secure-` prefix, manual testing in WebKit on `http://localhost` may fail to keep the Session. End-to-end tests mock the routes, so they are unaffected.
- **Refresh budget.** Refresh and Log out share one budget of 30 requests per minute per address. The cross-tab Web Lock is what keeps many open tabs from spending it.
- **Revocation.** A valid Session does not mean the API will serve the person. Log in does not check membership, so a person whose access was removed can log in and is refused on their next request, which the no-access screen then explains.

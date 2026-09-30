# Log in, Sessions and Current Company

`feature/login` → `integration`

Horaion now supports Log in through the API's backend-for-frontend, Email confirmation after Onboarding, temporary-password and authenticator Challenges, password reset, and a guarded home showing the Current Company. Sessions recover after reloads and in new tabs; Log out clears all open tabs. Company selection, switching and removed-access handling keep the Session separate from Company access. Auth forms share password controls, translated messages, validation and rate-limit holds. Emails move through tab-scoped history state, and access passes stay in memory.

The API changes live on the API's **`fix/onboarding-errors`** branch. They include sign-in email canonicalisation, CORS exposure of `Retry-After`, and contract/documentation corrections. API ADR-0029 already describes the earlier in-browser Cognito approach and points to app ADR 0004; no API files are changed by this documentation ticket.

## Tickets resolved

- Login [01: shared auth building blocks](issues/01-shared-auth-building-blocks.md).
- Login [02: canonical sign-in email and readable Retry-After](issues/02-api-canonical-sign-in-email-and-retry-after.md), delivered in the API branch.
- Login [03: Log in, home and Log out](issues/03-log-in-home-log-out.md).
- Login [04: Log in failures and retry](issues/04-when-things-go-wrong-at-log-in.md).
- Login [05: Email confirmation](issues/05-email-confirmation.md).
- Login [06: Challenges](issues/06-challenges.md).
- Login [07: password reset](issues/07-password-reset.md).
- Login [08: Current Company](issues/08-current-company.md).
- Login [09: records and sign-off](issues/09-records.md), with ADR acceptance requested below.

Login [10: retire feature/signin](issues/10-retire-feature-signin.md) remains a human task after merge and the owner's go-ahead. Onboarding issues and deferred MFA settings, Dashboard, workspace permissions and routing by Workspace address remain outside this branch.

## Manual testing

1. Run the API from `fix/onboarding-errors` with its Cognito client configured, then run `pnpm dev` in the app. Vite proxies `/api` to `http://localhost:8080` unless `API_PROXY_TARGET` overrides it. Include `http://localhost:5173` in the API's `CORS_ALLOWED_ORIGINS`. Use Chromium or Firefox; WebKit may reject the `__Secure-` cookies on HTTP localhost.
2. Sign up at `/register`, complete Email confirmation, and check that Log in has the email filled in. Try a wrong confirmation code and request another. Open `/confirm-email` directly in a fresh tab and enter the email manually. Check that no URL contains the email.
3. Log in with a confirmed account; try an incorrect password first and check the single credential-error message. Check password visibility, rejected-field focus, and the absence of "Remember me". Visit `/?tab=2` while logged out and verify the return path after Log in. An external `redirect` supplied to `/login` must fall back to home.
4. Reload home and open another tab in the same browser context: both should recover the Session. Log out in one tab and check that both reach Log in. Inspect storage without copying credentials: authentication must not persist a token or email; the Company preference and existing locale cache are described below.
5. With appropriate test accounts, complete a temporary-password Challenge, an authenticator Challenge, and a chained Challenge. Try an incorrect authenticator code without re-entering the password. Let the Challenge expire and submit; check the message at Log in. Reloading a Challenge also returns to Log in because its pending kind is held in memory.
6. Follow "Having trouble logging in?", request and resend a reset code, try an invalid code, then set a matching new password. Confirm the email and success message at Log in and log in with the new password. Other devices should fail their next Session renewal; their already-held access passes and screens are not cleared immediately by this app.
7. Test accounts with one, several and no usable Companies. Choose and switch Companies, then reload. A removed or inactive Company must not be selected. For live removal, provoke a fresh bearer request after the membership change: `MEMBERSHIP_REVOKED` re-fetches `/me`, selects an available Company or asks for a choice, and otherwise shows the no-access screen with Log out. The placeholder home caches `/me` and does not poll for changes.
8. Stop the API and reload home: the retry screen must retain the route. Restore it and select "Try again". With a controlled 429 response and `Retry-After`, check a single rounded retry message and that submission unlocks when the hold ends. Test keyboard navigation and a 375-pixel viewport.

Playwright mocks the network, including a Session shared between pages via `context.route`; it does not exercise real cookies or Cognito. Individual specs cover confirmation, Challenges, reset, Company switching and failures. The two-tab Session journey and Onboarding-to-home journey are separate tests.

## Validation and pre-existing failure

Verified on the integrated `feature/login` (after tickets 01–08 were merged):

- `pnpm lint` and `pnpm exec tsc --noEmit`: pass.
- `pnpm test:unit`: 1,015 tests, all pass.
- `pnpm build`: passes.
- `pnpm test:e2e`: 42 pass and 3 fail, in Chromium, Firefox and WebKit. The 3 failures are the one pre-existing test below. A Firefox reload flake in the reset journey (`NS_BINDING_ABORTED`) was fixed and then held for five runs with retries off.
- API `./mvnw verify` on `fix/onboarding-errors`: passes with `-DskipPolicyTests=true`, because `opa` is not installed on the build machine. The OPA policy files are unchanged by this work.
- Across the branch's diff, no `any`, `as` assertions, non-null `!`, `@ts-ignore`, `@ts-expect-error` or `eslint-disable` were added, apart from the generator-owned `as any` in `routeTree.gen.ts`.

Known pre-existing failure: [Onboarding issue 01](../onboarding/issues/01-registration-number-dropped.md), `e2e/auth.spec.ts` — "registration submits the onboarding contract and requires email verification". The issue records failure on `feature/login` at `eada804`, before the login work, in Chromium, Firefox and WebKit at the former email-verification status assertion. The shipped test now expects navigation to Email confirmation, but still requires `registrationNumber` in the request, which `registerCompany` omits. The collect-or-remove decision and test repair remain outside this ticket. The README now describes the actual camelCase request and omission.

## Differences from the spec found in the shipped app

- **Storage:** the auth flow stores only `horaion.currentCompanyId`, but the existing i18next language detector also caches `i18nextLng` in `localStorage`. The spec's app-wide Company-id-only claim is therefore not yet true. Neither value is a credential. The i18n foundation is explicitly deferred.
- **Renewal across tabs:** concurrent callers share one renewal within a tab. Web Locks serialise renewals across tabs, but each tab still sends its own request; user story 66's cross-tab collapse into one request is not implemented. Without Web Locks there is no cross-tab serialisation; without BroadcastChannel there is no cross-tab Log out notification.
- **Renewal timing and failures:** access passes within five seconds of expiry are treated as expired. Lifetimes below two minutes renew halfway through rather than a minute before expiry. All renewal failures except 401/`SESSION_EXPIRED` become "unreachable", including 429, 403 and malformed successes, without a `Retry-After` hold. A proactive failure retries after 30 seconds and on the next authenticated request; it does not immediately replace an already-rendered home with the retry screen. The guard uses that screen for all otherwise-unhandled loading errors, including a repeated bearer 401 after successful renewal. A refused retry does not itself end a successfully renewed Session.
- **Public requests:** the helper deliberately omits the bearer for anonymous credential routes. Onboarding retains its separate fetch implementation. Thus the spec's literal "Every API call" attaching a bearer does not describe these public calls.
- **Navigation:** opening Log in with an access pass follows a supplied safe return path, rather than always going home. Normal Log in and Challenges preserve the return path; the Email confirmation and password-reset detours drop it, so the next Log in defaults to home.
- **Company preference:** only an explicit choice is remembered, not automatic selection of the sole usable Company. The glossary now says "last one they chose" rather than "one they used last". A tab's in-memory choice also takes precedence over another tab's subsequent stored choice until reload. Revocation is detected on a refused request; the cached home has no background membership polling.
- **Log out availability and failure:** the unreachable screen offers only "Try again", so Log out is not always within reach after logging in. A failed Log out request still clears local state and broadcasts, as specified, but cannot guarantee server revocation; a later guarded visit may recover from a surviving cookie.
- **Password reset:** completion clears this tab and relies on the API for global sign-out. It does not broadcast a local Log out to other tabs, which can retain their current screen and access pass until renewal or another refusal. The success message is not evidence of immediate clearing on every device.
- **Confirmation resend:** every HTTP error except 429 is masked by the neutral resend status, including 5xx. Network failures and timeouts still show an error. This extends the spec's account-enumeration protection beyond its neutral 202 response contract.
- **Validation and wording:** Challenges map `INVALID_CODE` and `PASSWORD_POLICY_VIOLATION` to fields, but generic 400 field-error arrays become a form-level fallback. New-password Challenges accept any non-ASCII-alphanumeric, non-whitespace character as a symbol, whereas reset and Onboarding use a fixed symbol list that includes space. These checks do not implement one shared password-policy rule. Several HTTP statuses share the same translated generic fallback rather than having distinct wording per status.
- **Onboarding and coverage:** pre-existing Onboarding still uses "Workspace name", hard-coded copy, a generic 429 without a timed hold, and no focus transfer to form-level errors. These remain outside the limited Onboarding changes; registration-number handling is tracked separately. Browser coverage splits the proposed combined Onboarding → confirmation → Log in → reload → two-tab Log out journey into separate tests. It models cookies in test state and cannot establish real seven-day expiry, cookie acceptance or global revocation.

## Known security gaps

The spec's Security Considerations remain open about these limitations:

- An access pass remains valid after Log out until expiry, up to 15 minutes.
- Rate limits are counted per API instance, without a shared store.
- `AuditorAware` still resolves to "system".
- Onboarding's 409 remains an accepted account-enumeration risk (R1).
- WebKit may refuse `__Secure-` cookies on `http://localhost` in development.

The app's guard and Company choice are navigation controls; the API remains responsible for authorisation on each request. Session cookies require `SameSite=Strict`, an allowed Origin and JSON bodies. No credential is stored in web storage.

## Acceptance before merge

**Moses: please accept API ADR-0019, "Browser token handling — access token in memory, refresh token in an httpOnly cookie"; API ADR-0029, "People sign in on Horaion's own pages, through a backend-for-frontend in the api"; and [app ADR 0004, "Sessions go through the API's backend-for-frontend"](../../docs/adr/0004-sessions-through-the-api-bff.md) before merge.** App ADR 0004 remains Proposed pending that acceptance. Please review the implementation differences and known gaps above alongside those decisions.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

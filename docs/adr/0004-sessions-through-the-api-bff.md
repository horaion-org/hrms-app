# Sessions go through the API's backend-for-frontend

Status: Proposed — Moses is asked to accept this decision in the PR before merge.

Every credential exchange goes through the Horaion API's backend-for-frontend (BFF), which calls Cognito with a confidential client whose secret stays in API configuration. Horaion keeps its own screens. The API holds the Session in an HttpOnly, Secure, `SameSite=Strict` cookie scoped to the Session routes; the app holds a short-lived access pass in memory only. "Remember me" is removed and every Session lasts seven days unless ended earlier. This follows API ADR-0019, "Browser token handling — access token in memory, refresh token in an httpOnly cookie", and API ADR-0029, "People sign in on Horaion's own pages, through a backend-for-frontend in the api".

We rejected the in-browser Cognito library holding tokens in `localStorage`: a script injection could copy a long-lived refresh token and use it from another machine, and a public Cognito client bypasses the API's rate limits and audit. Moving only the refresh token into a cookie would leave that public client callable. The API already provides the BFF, so no separate service is needed. Hosted Cognito pages would leave Horaion's own Onboarding and Challenge flow.

The email travels between auth screens in tab-scoped history state, surviving reloads but never entering a URL or web storage. During Session recovery, only an expired Session sends a person to Log in; an unreachable API shows a retry screen. Removed access to a Company re-settles the Current Company and keeps the Session, including when no usable Company remains. For authentication, the last chosen Company id is the only thing in `localStorage`; it is a preference, not a credential, and is ignored when the Company or membership is inactive.

## Consequences

The app and API must share a registrable domain for `SameSite=Strict` cookies. Cookie routes require an allowed Origin and JSON bodies for CSRF protection. The API sees passwords in transit and owns credential exchange, rate limiting and audit. The ID token never reaches the browser; the person's details come from `/me`.

The shared request helper attaches the access pass to authenticated calls, renews once on a bearer 401 and retries. Renewal is single-flight within a tab and serialised across tabs with a Web Lock where available. Reloads and new tabs recover through the cookie. Log out clears the pass, query cache and pending Challenge and broadcasts to other tabs even if the API call fails; server-side revocation still requires that call to succeed. Browser tests mock these routes, rather than storing tokens. The existing language detector also caches a locale in `localStorage`; the PR records this gap against the spec's Company-id-only storage rule.

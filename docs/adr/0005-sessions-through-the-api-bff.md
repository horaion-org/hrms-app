# Sessions go through the API's backend-for-frontend

Supersedes [ADR 0003](0003-in-app-cognito-authentication.md) and [ADR 0004](0004-tokens-in-local-storage.md).

The app no longer talks to Cognito. Every credential exchange (sign-in, Challenges, refresh, sign-out, email confirmation and password reset) goes through public routes on the Horaion API, which calls Cognito with a confidential app client whose secret exists only in API configuration. The API keeps the Session as an httpOnly, Secure, `SameSite=Strict` cookie, scoped to the Session routes and lasting seven days. The app holds only a short-lived access pass in memory, renews it from the cookie before it expires, and never writes a credential to `localStorage` or `sessionStorage`. The app keeps its own screens for sign-up, sign-in, email confirmation, password reset and every Challenge, so the experience does not change.

ADR 0004 accepted tokens in web storage because the API was stateless and a backend-for-frontend meant a new service, CSRF protection and session handling. That trade no longer holds. A single script injection could copy the long-lived refresh token out of `localStorage` and use it from another machine until it expired, and the API's ADR-0019 already chose an httpOnly cookie held by a backend-for-frontend. The API now serves that role itself, as recorded in its ADR-0029, so no new deployable is needed. Moving the exchange server-side also lets the API rate-limit and audit every sign-in, confirmation and reset, which a public client talking straight to Cognito could bypass.

We rejected keeping `amazon-cognito-identity-js` and only moving the refresh token into a cookie, because the in-browser library would still hold passwords and tokens in script-reachable memory and the public client would stay callable without the API's controls. We rejected the Hosted UI for the reasons in ADR 0003: Onboarding must go through the API, and the temporary-password Challenge cannot be finished part-way through a hosted page.

## Consequences

- The app and the API must share a registrable domain in every environment, or a `SameSite=Strict` cookie never reaches the API.
- Cookie-authenticated routes accept only the configured app origins and JSON bodies; that, with `SameSite=Strict`, is the CSRF defence.
- A single request helper attaches the access pass, renews once on a 401 and retries, and otherwise signs out and sends the person to sign in with a return path. Renewal is single-flight within a tab and serialised across tabs with a Web Lock; sign-out is broadcast to other tabs.
- Reloading the page or opening a new tab stays signed in, because the first Guarded route renews from the cookie.
- "Remember me", the Cognito library and the Node `global` shim in `vite.config.ts` are removed. Every Session lasts seven days.
- The ID token never reaches the browser; names and emails come from the current-user endpoint.
- The last Current Company is kept in `localStorage`. It is not a credential, and it is ignored when it is not among the person's active Memberships.
- End-to-end tests mock the Session routes at the network layer instead of seeding tokens into `localStorage`, and assert that web storage never holds a token.

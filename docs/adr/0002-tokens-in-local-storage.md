# Cognito tokens in localStorage, bounded by CSP and instant revocation

Tokens obtained in the browser have to live somewhere, and every option trades cross-site scripting
exposure against usability. Decided: the library's default `localStorage` storage, paired with a strict
Content-Security-Policy and a shortened refresh token lifetime in the user pool.

The reasoning is that the damage window is already bounded by the API rather than by the browser. The
API re-checks User, Membership, and Company status on every single request through its instant
revocation filter, with no cache, so deactivating a member blocks their very next request whether or
not their token is still cryptographically valid — and deactivation additionally triggers
`AdminUserGlobalSignOut`. A stolen token is therefore revocable in a way a stolen password is not.

The pairing is not optional. A strict CSP is the actual control here; `localStorage` is only acceptable
because script injection is being prevented rather than merely survived. Cognito's default 30-day
refresh token lifetime should be shortened, since it otherwise defines the persistence an attacker
gains.

We rejected in-memory-only storage, which is genuinely stronger but forces a full re-login on every
page refresh and new tab — unacceptable for a console people keep open all day. We rejected splitting
the access token into memory while persisting the refresh token, because an attacker with script
execution simply mints a new access token from the refresh token, so the split adds complexity without
moving the boundary. We rejected a backend-for-frontend holding tokens in httpOnly cookies: it is the
strongest answer and the right one if this app ever handles more sensitive operations, but it means a
new deployable service, CSRF protection, and session handling that the deliberately stateless API does
not have.

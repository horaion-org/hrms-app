# Cognito tokens live in localStorage, bounded by CSP and instant revocation

Tokens obtained in the browser must live somewhere, and each option trades cross-site-scripting exposure against usability. We use the library's default `localStorage`, paired with a strict Content-Security-Policy and a shortened refresh token lifetime in the user pool. When a person unticks "Remember me", that sign-in is kept in `sessionStorage` instead, so it ends with the tab.

The damage window is bounded by the API rather than the browser. The API re-checks User, Membership and Company status on every request with no cache, so deactivating someone blocks their next request whether or not their token is still valid. A stolen token is therefore revocable in a way a stolen password is not.

We rejected in-memory-only storage, which is stronger but forces a fresh sign-in on every refresh and new tab, which is unacceptable for a console people keep open all day. We rejected keeping the access token in memory while persisting the refresh token, because script execution can mint a new access token from the refresh token, so the split adds complexity without moving the boundary. We rejected a backend-for-frontend holding tokens in httpOnly cookies. It is the strongest answer and the right one if the app ever handles more sensitive operations, but it means a new deployable service, CSRF protection and session handling that the stateless API does not have.

## Consequences

The pairing is not optional: `localStorage` is acceptable only because script injection is prevented rather than survived. The app does not ship a CSP yet; adding one to the hosting configuration is a prerequisite for production. Cognito's default 30-day refresh token lifetime should be shortened, since it sets how long a stolen session persists.

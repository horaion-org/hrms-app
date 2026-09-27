# Authentication runs in the app against Cognito with amazon-cognito-identity-js

Superseded by [ADR 0005](0005-sessions-through-the-api-bff.md).

The Horaion API is a pure resource server. It validates a Cognito access token (issuer, `client_id` and `token_use`) and issues nothing: no login endpoint, no refresh endpoint, no session cookie. Every credential interaction is therefore the app's job. We talk to Cognito directly through `amazon-cognito-identity-js` using SRP, and own every screen: sign-in, email confirmation, the forced new-password challenge, password reset, refresh and sign-out.

Two constraints force this. Self-service sign-up must go through `POST /api/v1/public/onboardings`, because that endpoint creates the Company, the User and the Owner role assignment in one transaction; a sign-up made straight against Cognito, hosted or not, would leave a Cognito identity with no Company behind it, and `GET /api/v1/me` refuses such an identity. And a person created with `AdminCreateUser` gets an emailed temporary password and must answer `NEW_PASSWORD_REQUIRED` on first sign-in, which cannot be finished without leaving a hosted page part-way. Since the app already owns the sign-up and challenge screens, hosting only sign-in elsewhere buys inconsistency, not simplicity.

We rejected the Hosted UI with Authorization Code and PKCE for those reasons, though it is the better answer if sign-up ever moves behind an API redirect. We rejected `aws-amplify/auth` because its configuration surface and weight buy little once the challenge screens are written anyway. We rejected hand-rolled calls to the Cognito endpoint: `USER_PASSWORD_AUTH` puts the password on the wire, and implementing SRP by hand is not worth a saved dependency.

## Consequences

The app client must be public, with no client secret, and have `ALLOW_USER_SRP_AUTH` enabled; `amazon-cognito-identity-js` cannot compute a `SECRET_HASH`. The app and the API must use the same app client, because the API checks the token's `client_id`. The library expects Node's `global`, so `vite.config.ts` defines it as `globalThis`. The sign-up form mirrors the API's validation and the pool's password policy so people see mistakes before the request, but the API and Cognito stay the authority.

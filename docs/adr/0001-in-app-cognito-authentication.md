# In-app Cognito authentication with amazon-cognito-identity-js
Date: 2026-08-06 · Status: Accepted

The Horaion API is a pure resource server. It validates a Cognito access token — checking issuer,
`client_id`, and `token_use` — and issues nothing. There is no login endpoint, no refresh endpoint, and
no session cookie. Every credential interaction is therefore the client's responsibility.

Decided: the app talks to Cognito directly through `amazon-cognito-identity-js` using SRP, and owns
every screen: sign-in, email confirmation, the forced new-password challenge, password reset, refresh,
and sign-out.

The choice is forced by two constraints rather than preference. Self-service sign-up must go through
`POST /api/v1/public/onboardings`, because that endpoint creates the Company, the User, and the Owner
Role Assignment in one transaction; a Cognito Hosted UI sign-up would produce a Cognito identity with no
Company behind it. And invited members are created with `AdminCreateUser`, which emails a temporary
password and forces a `NEW_PASSWORD_REQUIRED` challenge on first sign-in — a flow that cannot be
completed without leaving a hosted page mid-onboarding. Since the app already owns the sign-up screen
and must own the challenge screen, hosting only sign-in elsewhere buys inconsistency rather than
simplicity.

This requires a public Cognito app client with no client secret and `ALLOW_USER_SRP_AUTH` enabled.
`amazon-cognito-identity-js` cannot compute a `SECRET_HASH`, so a client configured with a secret makes
this decision unimplementable.

We rejected Hosted UI with Authorization Code and PKCE for the reasons above, though it remains the
better answer if sign-up ever moves behind the API's own redirect. We rejected `aws-amplify/auth`
because its configuration surface and dependency weight buy little once the challenge screens are
written anyway. We rejected hand-rolled requests to the Cognito IDP endpoint: `USER_PASSWORD_AUTH`
would put the password on the wire in exchange for saving a dependency, and implementing SRP by hand is
not a trade worth making.

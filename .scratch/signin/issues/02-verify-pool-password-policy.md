# 02: Check the pool's password policy against the sign-up form

**What to build:** `src/features/auth/schemas.ts` assumes the Cognito default policy (8+ characters with upper case, lower case, a digit and a symbol). Nobody could read the real pool's policy while this was built, because no AWS credentials were available. Run `aws cognito-idp describe-user-pool` on the pool the API uses and align `newPasswordSchema` and the `auth.signUp.passwordHint` copy with it. Also consider shortening the refresh-token lifetime (ADR 0004).

**Blocked by:** None

**Status:** ready-for-human

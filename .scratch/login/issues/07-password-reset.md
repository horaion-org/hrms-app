# 07: Password reset

**Repo:** app (`feature/login`). **Parent spec:** `.scratch/login/spec.md` (Password reset screen, Carrying the email).

**What to build:** A person who forgot their password asks for a reset code by email, sets a new password with it, and lands on Log in with their email filled in. They are told that every device was logged out. The request answers the same way whether or not the email is registered.

**Blocked by:** 03 (Log in, home, Log out)

**Status:** resolved

- [x] **`/forgot-password` replaces the stub.**
  - **Step one** takes the email, filled in from history state when present, and calls the password-resets route. On 202 it always moves on to step two with the same neutral status message.
  - **Step two** takes the code, the new password and Confirm password, using the password input, matched and checked against the pool policy. It calls the completions route.
- [x] **Outcomes:**
  - Success (204) → Log in, with the email in history state and a status message that every device was logged out.
  - `INVALID_CODE` and `PASSWORD_POLICY_VIOLATION` → field errors.
  - 400 validation → field errors.
  - 429 → the hold from ticket 04, once that has landed.
- [x] **"Send a new code"** on step two repeats step one's call, with the same neutral answer.
- [x] **Log in's password reset link** goes here and carries the typed email in history state. The email never appears in a URL.
- [x] **Unit tests at the network seam:**
  - the neutral answer for any email
  - completion success
  - each mapped error
  - "send a new code"
  - Log in pre-filled afterwards
- [x] **End to end:** Log in → password reset → Log in with the email filled in, with mocked routes.
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.

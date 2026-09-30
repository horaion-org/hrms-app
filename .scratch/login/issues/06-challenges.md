# 06: Challenges

**Repo:** app (`feature/login`). **Parent spec:** `.scratch/login/spec.md` (Challenge screens, Session holder, Wire contract).

**What to build:** A person given a temporary password chooses their own at their first log in. A person with an authenticator app enters its code after their password. When both apply, one step leads straight into the next. A mistyped code can be retried without starting over. A Challenge that took too long sends the person back to Log in with an explanation.

**Blocked by:** 03 (Log in, home, Log out)

**Status:** resolved

- [x] **Kicking off a Challenge.** A Log in answer carrying `challenge` records the pending Challenge kind in memory, then goes to `/new-password` (`NEW_PASSWORD_REQUIRED`) or `/mfa` (`SOFTWARE_TOKEN_MFA`), keeping the return path.
- [x] **New password.** It has new password and Confirm password fields, using the password input and checked to match. The pool policy is checked before sending: 8–128 characters with lowercase, uppercase, a digit and a symbol. It sends `{ newPassword }`.
- [x] **Authenticator code.** It uses the shared input with a numeric input mode, `autocomplete="one-time-code"` and six digits, and sends `{ code }`.
- [x] **Outcomes:**
  - Success → the return path, or home.
  - A further Challenge → that screen.
  - `INVALID_CODE` → a field error, and the person stays on the screen.
  - `PASSWORD_POLICY_VIOLATION` → a field error.
  - `CHALLENGE_EXPIRED` → Log in, with a message that the step expired.
  - 429 → the hold from ticket 04, once that has landed.
- [x] **No pending Challenge.** Opening either Challenge route with none in memory (a direct visit, or a reload) sends the person to Log in.
- [x] **Copy** comes from `auth.*` keys, and never calls a Challenge an error.
- [x] **Unit tests at the network seam:**
  - each kind
  - chaining new password → authenticator code
  - retry after `INVALID_CODE`
  - expiry
  - a direct visit with no pending Challenge
- [x] **End to end:** Log in → authenticator code → home, with mocked routes.
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.

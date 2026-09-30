# 05: Email confirmation

**Repo:** app (`feature/login`). **Parent spec:** `.scratch/login/spec.md` (Email confirmation screen, Carrying the email, Onboarding changes).

**What to build:** A founder who completes Onboarding is taken straight to Email confirmation with their email filled in. They enter the emailed code, or ask for a new one, and land on Log in with their email filled in. A person whose email is not confirmed is sent to the same screen when they try to log in. The email never appears in a URL.

**Blocked by:** 03 (Log in, home, Log out)

**Status:** resolved

- [x] **Email confirmation at `/confirm-email`.** It has email and code fields, and the email is filled in from router history state when present.
  - Success (204) → Log in, with the email in history state and a status message that the email is confirmed.
  - `INVALID_CODE` → a field error on the code.
  - 400 validation → field errors.
- [x] **"Send a new code."** It calls the confirmation-codes route and always shows the same neutral status message, whether or not the email is registered.
- [x] **Onboarding success.** It navigates to Email confirmation with the email in history state, replacing the inline "Check your email" message.
- [x] **`EMAIL_NOT_VERIFIED` at Log in.** It navigates to Email confirmation with the email in history state.
- [x] **Log in with the email in history state.** Log in fills in the email field.
- [x] **Where the email lives.** It is never put in a URL, a query parameter or web storage. A direct visit, a new tab or a pasted link shows an empty, working email field.
- [x] **429 on either call.** It uses the hold from ticket 04, once that has landed; until then, a generic message.
- [x] **Copy** comes from `auth.*` keys and uses "Email confirmation", never "verification".
- [x] **Unit tests at the network seam:**
  - both entry points
  - the email carried and the field fallback
  - success, `INVALID_CODE`, and the neutral answer on resend
  - Log in pre-filled afterwards
- [x] **End to end:** Onboarding → Email confirmation → Log in → home, with mocked routes. No URL in the journey contains the email.
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.

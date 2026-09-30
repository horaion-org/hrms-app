# 03: Log in, home, Log out

**Repo:** app (`feature/login`). **Parent spec:** `.scratch/login/spec.md` (Starting point, Routes, Wire contract, Session holder, Request helper, Guarded routes, Log in screen, Placeholder home).

**What to build:** This is the tracer bullet. A person logs in with their email and password on the new Log in screen and lands on a home page inside the Sidebar. They stay logged in when they reload or open a new tab, keep working as their access silently renews, and are sent to Log in, then back, once their Session has truly ended. Log out ends the Session on this device and in every open tab.

**Blocked by:** 01 (Shared auth building blocks)

**Status:** resolved

- [x] **Session holder and request helper.** Both are ported from `feature/signin` and switched to camelCase JSON. Success bodies are read from the envelope's `data`.
  - The holder keeps the access pass and its expiry in memory only.
  - Renewal is single-flight within a tab and serialised across tabs with a Web Lock. It happens proactively about a minute before expiry, timed from `expiresIn`.
  - Log out calls the log-out route. Whatever it answers, it clears the pass and the query cache, then broadcasts so every other tab does the same and goes to Log in.
  - The helper attaches the bearer pass. On a 401 it renews once and retries. If renewal answers `SESSION_EXPIRED` or 401, it ends the Session and sends the person to Log in with a return path.
  - Session routes send `credentials: "include"` and a JSON content type. Refresh and Log out send `{}`.
  - RFC 7807 bodies become a typed error carrying the status, `errorCode`, field errors and `Retry-After`, and a missing or non-JSON body is tolerated. Network failure and timeout become "unreachable".
- [x] **Guarded `/` route.**
  - With no pass, it renews from the cookie. `SESSION_EXPIRED` or 401 sends the person to Log in with a `redirect` return path.
  - With a Session, it loads `/me`, cached until Log out.
  - `/` no longer redirects to `/login`.
- [x] **Return path.** It is accepted only when it is a same-origin relative path; anything else goes home.
- [x] **Log in screen at `/login`.** `/sign-in` still redirects to it.
  - Built in Onboarding's design with the auth layout and fields, react-hook-form and the ported zod schema, the password input and the message component.
  - The email is trimmed before sending. There is no "Remember me". It links to Password reset.
  - Success → the return path, or home.
  - `INVALID_CREDENTIALS` → one message for either mistake.
  - 400 → field errors, with focus on the first rejected field.
  - Any unhandled code, such as `EMAIL_NOT_VERIFIED`, `challenge` or 429, shows a generic message until tickets 04–06 handle it.
- [x] **Placeholder home.** It renders inside the Sidebar and shows the logged-in person's display name from `/me` and Log out. The Sidebar gains a footer slot, a new prop on the existing component, with a story and a test.
- [x] **Onboarding's form.** It loses its login mode and "Remember me"; Onboarding itself is unchanged.
- [x] **Copy.** All of it comes from `auth.*` keys in the English translation file, in sentence case, with the glossary's words (Log in, Log out). Errors map from `errorCode` to keys; the API's `detail` and `title` are never shown.
- [x] **Unit tests at the network seam** (stubbed `fetch`, real routes through the memory router harness):
  - the Session holder's single-flight, cross-tab and proactive renewal
  - renew-once-and-retry
  - `SESSION_EXPIRED` leading to Log in with a return path
  - refusal of external return paths
  - Log in success and each mapped error
  - Log out clearing state in this tab and a broadcast one
- [x] **End to end.** The test that pins the Log in stub is replaced. With `page.route` mocking the Session routes and `/me`, the tests cover:
  - Log in → home → reload stays logged in → Log out in one tab logs out a second page in the same context
  - web storage never holding a token
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.

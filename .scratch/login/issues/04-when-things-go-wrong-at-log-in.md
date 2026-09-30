# 04: When things go wrong at Log in

**Repo:** app (`feature/login`). **Parent spec:** `.scratch/login/spec.md` (Guarded routes, Too many attempts, Log in screen).

**What to build:**
- **Outage on reload:** a person who reloads during a network drop or outage sees "We can't reach Horaion" with Try again, instead of being logged out.
- **Too many attempts:** they are told roughly when they can try again, and submit stays held until then.
- **Already logged in:** someone who already holds an access pass in this tab and opens Log in is taken home.

**Blocked by:** 03 (Log in, home, Log out)

**Status:** resolved

- [x] **Renewal failures:**
  - A network error or 5xx while a Guarded route renews shows a "We can't reach Horaion" screen. Its Try again re-runs the guard.
  - The person is not logged out, and web storage is untouched.
  - Only `SESSION_EXPIRED` or 401 sends them to Log in.
- [x] **429 on Log in:**
  - The message reads "Try again in about N minutes", with N rounded up from `Retry-After`, or "about a minute" under one minute.
  - Submit is disabled until the time passes, then re-enables on its own.
  - The message is announced once through the message component's alert kind, with no live countdown.
- [x] **429 without `Retry-After`:** a generic "try again later" message, and no hold.
- [x] **Hold for later screens:** the hold is a reusable behaviour of the auth screens, so tickets 05–07 get it without duplication.
- [x] **Opening `/login`:** when this tab already holds an access pass, it redirects home without calling the API. Otherwise the form renders, and no API call is made until the person submits.
- [x] **Unit tests at the network seam:**
  - unreachable versus expired during renewal
  - Try again recovering once the API answers
  - the 429 message and hold, with and without `Retry-After`, using fake timers
  - `/login` with and without a held pass
- [x] **End to end:** a mocked 429 with `Retry-After` shows the message and disables submit. A mocked network failure on the refresh route during reload shows the retry screen.
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.
